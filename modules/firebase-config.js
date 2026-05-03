// modules/firebase-config.js
// Firebase Configuration - Unified Export Module
// Version: 10.12.2 (Modular SDK)

// ✅ Import Firebase App
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

// ✅ Import Firebase Auth + Semua Functions yang dibutuhkan
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  updateProfile,
  sendPasswordResetEmail,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// ✅ Import Firebase Firestore + Semua Functions
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

// ✅ Import Firebase Realtime Database (untuk session management)
import {
  getDatabase,
  ref,
  set,
  get,
  remove,
  onDisconnect,
  serverTimestamp as rtdbTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// ✅ Konfigurasi Firebase Project
const firebaseConfig = {
  apiKey: "AIzaSyDyRS8oVmg6euIvCo20cGpDSilDXe04Bl0",
  authDomain: "ddi-quis.firebaseapp.com",
  databaseURL: "https://ddi-quis-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "ddi-quis",
  storageBucket: "ddi-quis.firebasestorage.app",
  messagingSenderId: "907614060325",
  appId: "1:907614060325:web:f29dd9a35d9d79623ee4cc"
};

// ✅ Inisialisasi Firebase Instances
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const rtdb = getDatabase(app);
const googleProvider = new GoogleAuthProvider();

// ✅ Export SEMUA instances dan functions untuk digunakan module lain
export { 
  // === INSTANCES ===
  app,              // ← ✅ PENTING: Ditambahkan agar bisa di-import di auth-login.js
  auth, 
  db, 
  rtdb,             // ← ✅ Untuk session management via Realtime Database
  googleProvider,
  
  // === AUTH FUNCTIONS ===
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
  
  // === FIRESTORE FUNCTIONS ===
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
  where,
  
  // === REALTIME DATABASE FUNCTIONS ===
  ref,
  set,
  get,
  remove,
  onDisconnect,
  rtdbTimestamp
};

console.log('✅ Firebase v10.12.2 initialized successfully');
