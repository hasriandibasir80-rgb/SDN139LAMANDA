/**
 * Firebase Configuration - Unified Export Module
 * Version: 10.12.2 (Modular SDK)
 * Location: js/firebase-config.js (sumber tunggal)
 */

// ✅ Import Firebase App
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js"; // Ditambahkan untuk secondary app

// ✅ Import Firebase Auth + Functions
import { 
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

// ✅ Import Firebase Firestore + Functions
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

// ✅ Import Firebase Realtime Database
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

// =========================================
// ✅ INISIALISASI DENGAN ERROR HANDLING
// =========================================
let app, auth, db, rtdb, googleProvider;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  rtdb = getDatabase(app);
  googleProvider = new GoogleAuthProvider();
  
  // Log hanya muncul di localhost (development)
  if (typeof window !== 'undefined' && 
      (window.location.hostname === 'localhost' || 
       window.location.hostname === '127.0.0.1')) {
    console.log('✅ Firebase v10.12.2 initialized successfully');
  }
} catch (error) {
  console.error('❌ Firebase initialization failed:', error);
  
  // Tampilkan pesan yang jelas ke user
  if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
      const errorBox = document.createElement('div');
      errorBox.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #fee2e2;
        color: #991b1b;
        padding: 16px 24px;
        border-radius: 8px;
        border: 2px solid #dc2626;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 9999;
        font-family: system-ui, sans-serif;
        max-width: 90%;
      `;
      errorBox.innerHTML = `
        <strong>⚠️ Koneksi Firebase Gagal</strong><br>
        <small>Tidak dapat terhubung ke database. Periksa koneksi internet Anda atau hubungi admin.</small>
      `;
      document.body.appendChild(errorBox);
      
      // Hilangkan otomatis setelah 10 detik
      setTimeout(() => errorBox.remove(), 10000);
    });
  }
  
  throw new Error('Firebase failed to initialize: ' + error.message);
}

// =========================================
// ✅ EXPORT SEMUA INSTANCES DAN FUNCTIONS
// =========================================
export { 
  // === CONFIGURATION (BARU: Diperlukan untuk Secondary App di user-management) ===
  firebaseConfig,
  initializeApp,
  getAuth,

  // === INSTANCES ===
  app, auth, db, rtdb, googleProvider,
  
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
  collection, setDoc, addDoc, getDocs, getDoc, updateDoc, deleteDoc, doc,
  query, orderBy, onSnapshot, serverTimestamp, where,
  
  // === REALTIME DATABASE FUNCTIONS ===
  ref, set, get, remove, onDisconnect, rtdbTimestamp
};
