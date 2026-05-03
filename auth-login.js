// === auth-login.js (ringkasan fungsi yang diperlukan) ===

// Firebase imports (sesuaikan dengan versi SDK Anda)
import { auth, db } from './firebase-config.js';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';

// 1. Handle Email/Password Login
async function handleEmailLogin(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log('✅ Login berhasil:', userCredential.user.email);
    window.location.href = './dashboard.html'; // Redirect setelah login
    return userCredential.user;
  } catch (error) {
    console.error('❌ Login error:', error.code, error.message);
    throw new Error(error.message);
  }
}

// 2. Handle User ID Login (opsional, sesuai request Anda)
async function handleUserIdLogin(userId) {
  // Implementasi sesuai kebutuhan: bisa custom token, atau lookup ke database
  // Contoh sederhana: cek userId di Realtime Database
  try {
    const userRef = db.ref('users/' + userId);
    const snapshot = await userRef.once('value');
    if (!snapshot.exists()) {
      throw new Error('User ID tidak ditemukan');
    }
    // Lanjutkan dengan custom auth atau redirect
    window.location.href = `./dashboard.html?uid=${userId}`;
  } catch (error) {
    console.error('❌ UserID login error:', error);
    throw error;
  }
}

// 3. Handle Logout (SULU)
async function handleLogout() {
  try {
    await signOut(auth);
    console.log('✅ Logout berhasil');
    window.location.href = './index.html';
  } catch (error) {
    console.error('❌ Logout error:', error);
    throw error;
  }
}

// 4. Auth State Listener (untuk update UI otomatis)
onAuthStateChanged(auth, (user) => {
  const logoutBtn = document.getElementById('logoutBtn');
  if (user) {
    // User sudah login: tampilkan tombol SULU
    if (logoutBtn) logoutBtn.style.display = 'block';
    // Opsional: auto-redirect ke dashboard jika sudah login
    if (window.location.pathname.includes('index.html')) {
      // window.location.href = './dashboard.html';
    }
  } else {
    // User belum login: sembunyikan SULU
    if (logoutBtn) logoutBtn.style.display = 'none';
  }
});

// Export fungsi agar bisa dipanggil dari index.html
window.handleEmailLogin = handleEmailLogin;
window.handleUserIdLogin = handleUserIdLogin;
window.handleLogout = handleLogout;
