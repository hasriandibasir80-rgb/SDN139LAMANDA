/**
 * Auth Login Module - SDN 139 LAMANDA
 * Fitur: Email/Password Login & Device Session Management (100% REAL FIREBASE)
 * Compatible: ES6 Module, Firebase v10.12.2
 */

import { 
  auth, 
  rtdb, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  ref,
  set,
  get,
  remove,
  onDisconnect
} from './firebase-config.js'; 

// === SESSION MANAGEMENT: Device Limit via Realtime Database ===
async function registerSession(userId, deviceId) {
  try {
    const sessionRef = ref(rtdb, `sessions/${userId}/${deviceId}`);
    const sessionData = {
      lastActive: Date.now(),
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString()
    };
    
    await set(sessionRef, sessionData);
    onDisconnect(sessionRef).remove();
    console.log('✅ Session registered di Realtime Database:', deviceId);
    return true;
  } catch (error) {
    console.error('❌ Session registration failed:', error);
    return false;
  }
}

// === ✅ BARU: Fungsi untuk membaca role user dari Firebase ===
async function getUserRole(uid) {
  try {
    const roleRef = ref(rtdb, `users/${uid}/role`);
    const snapshot = await get(roleRef);
    
    if (snapshot.exists()) {
      const role = snapshot.val();
      console.log('✅ Role user ditemukan:', role);
      return role;
    } else {
      console.log('ℹ️ Role tidak ditemukan, default ke "user"');
      return 'user';
    }
  } catch (error) {
    console.warn('⚠️ Gagal membaca role dari Firebase:', error);
    return 'user'; // Fallback ke user biasa jika ada error
  }
}

// === 1. Handle Email/Password Login (REAL FIREBASE ONLY) ===
async function handleEmailLogin(email, password) {
  try {
    // LANGSUNG KE FIREBASE AUTH. TIDAK ADA SIMULASI.
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    console.log('✅ Firebase login BERHASIL untuk:', user.email);
    console.log('✅ UID Asli dari Firebase:', user.uid);
    
    // ✅ BARU: Baca role user dari Firebase Realtime Database
    const userRole = await getUserRole(user.uid);
    console.log('✅ Role user:', userRole);
    
    // Simpan data user ASLI dari Firebase ke localStorage agar dashboard bisa membacanya
    localStorage.setItem('currentUser', JSON.stringify({
      uid: user.uid, 
      email: user.email,
      displayName: user.displayName || email.split('@')[0],
      role: userRole // ✅ BARU: Simpan role di currentUser juga
    }));
    
    // ✅ BARU: Simpan role secara terpisah untuk akses cepat oleh dashboard.js
    localStorage.setItem('userRole', userRole);
    
    // Register session device di Realtime Database
    const deviceId = localStorage.getItem('deviceId') || crypto.randomUUID();
    localStorage.setItem('deviceId', deviceId);
    await registerSession(user.uid, deviceId);
    
    // Redirect ke dashboard
    window.location.href = './dashboard.html';
    return user;
    
  } catch (error) {
    console.error('❌ Firebase Login Error:', error.code, error.message);
    
    const messages = {
      'auth/invalid-email': 'Format email tidak valid.',
      'auth/user-disabled': 'Akun ini telah dinonaktifkan oleh admin.',
      'auth/user-not-found': 'Email tidak terdaftar di sistem kami.',
      'auth/wrong-password': 'Password yang Anda masukkan salah.',
      'auth/too-many-requests': 'Terlalu banyak percobaan gagal. Akun dikunci sementara.',
      'auth/invalid-credential': 'Email atau password salah.'
    };
    
    throw new Error(messages[error.code] || 'Login gagal. Periksa koneksi atau kredensial Anda.');
  }
}

// === 2. Handle Logout (REAL) ===
async function handleLogout() {
  try {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const deviceId = localStorage.getItem('deviceId');
    
    if (currentUser.uid && deviceId) {
      try {
        const sessionRef = ref(rtdb, `sessions/${currentUser.uid}/${deviceId}`);
        await remove(sessionRef);
      } catch (e) {
        console.warn('⚠️ Gagal hapus session RTDB:', e);
      }
    }
    
    await signOut(auth);
    localStorage.removeItem('currentUser');
    localStorage.removeItem('userRole'); // ✅ BARU: Hapus role saat logout
    
    console.log('✅ Logout berhasil');
    window.location.href = './index.html';
  } catch (error) {
    console.error('❌ Logout error:', error);
    throw new Error('Gagal logout: ' + error.message);
  }
}

// === 3. Auth State Listener ===
onAuthStateChanged(auth, (user) => {
  const logoutBtn = document.getElementById('logoutBtn');
  if (user) {
    console.log('🔐 Auth state: logged in as', user.email);
    if (logoutBtn) logoutBtn.classList.remove('hidden');
  } else {
    console.log('🔐 Auth state: not logged in');
    if (logoutBtn) logoutBtn.classList.add('hidden');
  }
});

// === EXPORT ke window agar bisa dipanggil script.js ===
if (typeof window !== 'undefined') {
  window.handleEmailLogin = handleEmailLogin;
  window.handleLogout = handleLogout;
  console.log('✅ Auth functions (REAL) exposed to window');
}

console.log('🔐 auth-login.js (REAL VERSION) loaded');
