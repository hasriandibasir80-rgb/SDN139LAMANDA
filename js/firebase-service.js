/**
 * Firebase Service - Business Logic & Helper Functions
 * Version: 10.12.2 (Modular SDK)
 * Location: js/firebase-service.js - Semua logic Firebase terpusat
 * Dibuat dari pecahan firebase-config.js yang gemuk (aturan no 2: tidak mengurangi)
 */

import { 
  firebaseConfig,
  initializeApp,
  getAuth,
  app, 
  auth, 
  db, 
  rtdb, 
  googleProvider
} from './firebase-config.js';

// ✅ Import Auth Functions
import { 
  signInWithEmailAndPassword, 
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  updateProfile,
  sendPasswordResetEmail,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  fetchSignInMethodsForEmail
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// ✅ Import Firestore Functions
import { 
  getFirestore,
  collection,
  setDoc,
  addDoc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  where
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ✅ Import Realtime Database Functions
import {
  ref,
  set,
  get,
  remove,
  onDisconnect,
  serverTimestamp as rtdbTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// =========================================
// ✅ SECONDARY APP UNTUK ADMIN (TIDAK LOGOUT SAAT BUAT USER)
// =========================================
let secondaryApp = null;
let secondaryAuth = null;

try {
  if (firebaseConfig) {
    secondaryApp = initializeApp(firebaseConfig, "SecondaryAdminApp");
    secondaryAuth = getAuth(secondaryApp);
  }
} catch (e) {
  // Jika sudah ada, gunakan yang existing
  secondaryAuth = auth;
  console.warn('Secondary app already exists, using primary auth as fallback');
}

// =========================================
// ✅ CONSTANTS
// =========================================
const USER_COLLECTION = 'users';
const SEKOLAH_COLLECTION = 'sekolah';
const PASSWORD_DEFAULT = 'bilal2011';

// =========================================
// ✅ HELPER FUNCTIONS
// =========================================

function formatNomorWA(nomor) {
  if (!nomor) return '';
  let c = nomor.replace(/\D/g, '');
  if (c.startsWith('0')) c = '62' + c.substring(1);
  else if (!c.startsWith('62')) c = '62' + c;
  return c;
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).toLowerCase());
}

function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem('currentUser') || '{}');
  } catch {
    return {};
  }
}

function getCurrentNPSN() {
  const input = document.getElementById('um-npsn')?.value?.trim();
  const user = getCurrentUser();
  return input || user.idSekolah || user.npsn || '';
}

function getUserQuery() {
  const npsn = getCurrentNPSN();
  if (npsn) {
    return { path: `${SEKOLAH_COLLECTION}/${npsn}/${USER_COLLECTION}`, npsn };
  }
  return { path: USER_COLLECTION, npsn: '' };
}

// =========================================
// ✅ AUTH SERVICE - UID AUTH TERSIMPAN DI AUTH FIREBASE
// =========================================

async function checkEmailExists(email) {
  try {
    const methods = await fetchSignInMethodsForEmail(secondaryAuth || auth, email).catch(() => []);
    return methods && methods.length > 0;
  } catch {
    return false;
  }
}

async function createUserInAuth(email, password = PASSWORD_DEFAULT) {
  const exists = await checkEmailExists(email);
  if (exists) {
    throw { code: 'auth/email-already-in-use', message: 'Email sudah ada di Auth' };
  }
  const cred = await createUserWithEmailAndPassword(secondaryAuth || auth, email, password);
  return {
    uid: cred.user.uid,
    email: cred.user.email,
    credential: cred
  };
}

// =========================================
// ✅ FIRESTORE SERVICE - SIMPAN SESUAI FOLDER NPSN
// =========================================

async function saveUserToFirestore(finalId, dataToSave, npsn, isNew = true) {
  const adminUser = getCurrentUser();
  const adminUid = auth.currentUser ? auth.currentUser.uid : (adminUser.uid || '');
  
  const enrichedData = {
    uid: finalId,
    userId: finalId,
    authUid: finalId,
    id: finalId,
    ...dataToSave,
    idSekolah: npsn,
    npsn: npsn,
    createdBy: adminUid,
    createdByAdmin: adminUid,
    createdByEmail: auth.currentUser ? auth.currentUser.email : adminUser.email,
    updatedAt: serverTimestamp(),
    ...(isNew ? { 
      createdAt: serverTimestamp(), 
      passwordChanged: false, 
      authCreated: true,
      password: PASSWORD_DEFAULT
    } : {})
  };

  // Simpan ke 2 lokasi: global + folder NPSN
  const mainRef = doc(db, USER_COLLECTION, finalId);
  const npsnRef = doc(db, SEKOLAH_COLLECTION, npsn, USER_COLLECTION, finalId);

  if (isNew) {
    await setDoc(mainRef, enrichedData);
    await setDoc(npsnRef, enrichedData);
  } else {
    try { await updateDoc(mainRef, enrichedData); } catch { await setDoc(mainRef, enrichedData, { merge: true }); }
    try { await updateDoc(npsnRef, enrichedData); } catch { await setDoc(npsnRef, enrichedData, { merge: true }); }
  }

  return { mainRef, npsnRef, data: enrichedData };
}

async function getUserById(userId, npsn = null) {
  const targetNPSN = npsn || getCurrentNPSN();
  let snap = null;
  
  if (targetNPSN) {
    try { snap = await getDoc(doc(db, SEKOLAH_COLLECTION, targetNPSN, USER_COLLECTION, userId)); } catch (e) { snap = null; }
  }
  
  if (!snap || !snap.exists()) {
    snap = await getDoc(doc(db, USER_COLLECTION, userId));
  }
  
  return snap && snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

async function deleteUserBoth(userId, npsn = null) {
  const targetNPSN = npsn || getCurrentNPSN();
  if (targetNPSN) {
    await deleteDoc(doc(db, SEKOLAH_COLLECTION, targetNPSN, USER_COLLECTION, userId)).catch(() => {});
  }
  await deleteDoc(doc(db, USER_COLLECTION, userId));
}

async function getAllUsersByNPSN(npsn = null) {
  const targetNPSN = npsn || getCurrentNPSN();
  let colRef;
  
  if (targetNPSN) {
    colRef = collection(db, SEKOLAH_COLLECTION, targetNPSN, USER_COLLECTION);
  } else {
    colRef = collection(db, USER_COLLECTION);
  }
  
  const snap = await getDocs(query(colRef, orderBy('createdAt', 'desc')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

function listenUsersByNPSN(callback, npsn = null) {
  const targetNPSN = npsn || getCurrentNPSN();
  let colRef;
  
  if (targetNPSN) {
    colRef = collection(db, SEKOLAH_COLLECTION, targetNPSN, USER_COLLECTION);
  } else {
    colRef = collection(db, USER_COLLECTION);
  }
  
  const q = query(colRef, orderBy('createdAt', 'desc'));
  return onSnapshot(q, snapshot => {
    const users = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(users);
  });
}

// =========================================
// ✅ EXPORT SEMUA SERVICE
// =========================================
export { 
  // Instances dari config (re-export biar kompatibel)
  app, auth, db, rtdb, googleProvider,
  firebaseConfig, secondaryApp, secondaryAuth,
  PASSWORD_DEFAULT, USER_COLLECTION, SEKOLAH_COLLECTION,
  
  // Auth functions
  signInWithEmailAndPassword, 
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  updateProfile,
  sendPasswordResetEmail,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  fetchSignInMethodsForEmail,
  checkEmailExists,
  createUserInAuth,
  
  // Firestore functions
  collection, setDoc, addDoc, getDocs, getDoc, updateDoc, deleteDoc, doc,
  query, orderBy, onSnapshot, serverTimestamp, where,
  
  // Realtime Database functions
  ref, set, get, remove, onDisconnect, rtdbTimestamp,
  
  // Custom service functions
  formatNomorWA,
  validateEmail,
  getCurrentUser,
  getCurrentNPSN,
  getUserQuery,
  saveUserToFirestore,
  getUserById,
  deleteUserBoth,
  getAllUsersByNPSN,
  listenUsersByNPSN
};
