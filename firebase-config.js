// modules/firebase-config.js
// Firebase Configuration

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";

// ✅ Import semua Auth functions yang dibutuhkan
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  // ✅ Functions untuk register & reset password:
  createUserWithEmailAndPassword,
  sendEmailVerification,
  updateProfile,
  sendPasswordResetEmail,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";

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
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
const firebaseConfig = {
  apiKey: "AIzaSyDyRS8oVmg6euIvCo20cGpDSilDXe04Bl0",
  authDomain: "ddi-quis.firebaseapp.com",
  databaseURL: "https://ddi-quis-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "ddi-quis",
  storageBucket: "ddi-quis.firebasestorage.app",
  messagingSenderId: "907614060325",
  appId: "1:907614060325:web:f29dd9a35d9d79623ee4cc"
};


const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// ✅ Export semua instances dan functions yang dibutuhkan module lain
export { 
  auth, 
  googleProvider,
  // Auth sign in/out
  signInWithEmailAndPassword, 
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  // Auth functions untuk register & reset password
  createUserWithEmailAndPassword,
  sendEmailVerification,
  updateProfile,
  sendPasswordResetEmail,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  // Firestore instances & functions
  db,
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
};

console.log('✅ Firebase initialized');
