/**
 * Firebase Configuration - Minimal & Clean
 * Version: 10.12.2 (Modular SDK)
 * Location: js/firebase-config.js - Sumber tunggal inisialisasi
 * Fungsi: HANYA inisialisasi, tidak ada logic bisnis
 */

// ✅ Import Firebase App Core
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// ✅ Konfigurasi Firebase Project - SDN 139 LAMANDA
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
  
  if (typeof window !== 'undefined' && 
      (window.location.hostname === 'localhost' || 
       window.location.hostname === '127.0.0.1')) {
    console.log('✅ Firebase v10.12.2 initialized successfully');
  }
} catch (error) {
  console.error('❌ Firebase initialization failed:', error);
  
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
        <strong>⚠ Koneksi Firebase Gagal</strong><br>
        <small>Tidak dapat terhubung ke database. Periksa koneksi internet Anda atau hubungi admin.</small>
      `;
      document.body.appendChild(errorBox);
      setTimeout(() => errorBox.remove(), 10000);
    });
  }
  
  throw new Error('Firebase failed to initialize: ' + error.message);
}

// =========================================
// ✅ EXPORT MINIMAL - HANYA YANG DIBUTUHKAN UNTUK INIT
// =========================================
// ✅ Secondary App untuk admin create user tanpa logout (agar kompatibel dengan V6)
let secondaryApp = null;
let secondaryAuth = null;
try {
  secondaryApp = initializeApp(firebaseConfig, "SecondaryAdminApp");
  secondaryAuth = getAuth(secondaryApp);
} catch (e) {
  // Jika sudah ada, gunakan auth utama sebagai fallback
  secondaryApp = app;
  secondaryAuth = auth;
}

// =========================================
// ✅ EXPORT MINIMAL + SECONDARY (untuk kompatibilitas V6)
// =========================================
export { 
  firebaseConfig,
  initializeApp,
  getAuth,
  app, 
  auth, 
  db, 
  rtdb, 
  googleProvider,
  secondaryApp,
  secondaryAuth
};
