/**
 * Auth Login Module - SDN 139 LAMANDA
 * Fitur: Email/Password Login, Device Session Management (RTDB), Data Check (Firestore), & Auto-Login Sync
 * Compatible: ES6 Module, Firebase v10.12.2
 */

import { 
  auth, 
  rtdb, 
  db, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  ref,
  set,
  get,
  remove,
  onDisconnect,
  doc,      
  getDoc    
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

// === ✅ FUNGSI: Membaca role DAN hakAkses user dari FIRESTORE ===
async function getUserData(uid) {
  try {
    const userDocRef = doc(db, "users", uid); 
    const userSnap = await getDoc(userDocRef);
    
    if (userSnap.exists()) {
      const data = userSnap.data();
      console.log('✅ Data user ditemukan di Firestore:', data);
      return {
        role: data.role || "user",
        hakAkses: data.hakAkses || [] 
      };
    } else {
      console.log('ℹ️ Dokumen user belum ada di Firestore, default ke "user"');
      return { role: "user", hakAkses: [] }; 
    }
  } catch (error) {
    console.warn('⚠️ Gagal membaca data dari Firestore:', error);
    return { role: "user", hakAkses: [] }; 
  }
}

// === 1. Handle Email/Password Login ===
async function handleEmailLogin(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    console.log('✅ Firebase login BERHASIL untuk:', user.email);
    console.log('✅ UID Asli dari Firebase:', user.uid);
    
    // Baca role DAN hakAkses user dari Firestore
    const userData = await getUserData(user.uid);
    console.log('✅ Role user:', userData.role, '| Hak Akses:', userData.hakAkses);
    
    // Simpan data user ke localStorage
    localStorage.setItem('currentUser', JSON.stringify({
      uid: user.uid, 
      email: user.email,
      displayName: user.displayName || email.split('@')[0],
      role: userData.role,
      hakAkses: userData.hakAkses 
    }));
    
    // Simpan secara terpisah untuk akses cepat
    localStorage.setItem('userRole', userData.role);
    localStorage.setItem('userHakAkses', JSON.stringify(userData.hakAkses)); 
    
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

// === 2. Handle Logout ===
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
    localStorage.removeItem('userRole'); 
    localStorage.removeItem('userHakAkses'); 
    localStorage.removeItem('layananAktif'); // Reset pilihan layanan saat logout
    
    console.log('✅ Logout berhasil');
    window.location.href = './index.html';
  } catch (error) {
    console.error('❌ Logout error:', error);
    throw new Error('Gagal logout: ' + error.message);
  }
}

// === 3. Auth State Listener (AUTO-LOGIN & STATE SYNC) ===
onAuthStateChanged(auth, async (user) => {
  const logoutBtn = document.getElementById('logoutBtn');
  
  if (user) {
    console.log('🔐 Auth state: logged in as', user.email);
    if (logoutBtn) logoutBtn.classList.remove('hidden');
    
    // ✅ AUTO-LOGIN SYNC: Pastikan hakAkses ada di localStorage saat refresh halaman
    const existingHakAkses = localStorage.getItem('userHakAkses');
    if (!existingHakAkses || existingHakAkses === 'null') {
      console.log('🔄 Menyinkronkan ulang data hak akses dari Firestore...');
      try {
        const userData = await getUserData(user.uid);
        localStorage.setItem('currentUser', JSON.stringify({
          uid: user.uid, 
          email: user.email,
          displayName: user.displayName || user.email.split('@')[0],
          role: userData.role,
          hakAkses: userData.hakAkses
        }));
        localStorage.setItem('userRole', userData.role);
        localStorage.setItem('userHakAkses', JSON.stringify(userData.hakAkses));
        console.log('✅ Sinkronisasi hak akses berhasil!');
      } catch (error) {
        console.warn('⚠️ Gagal sinkronisasi hak akses:', error);
      }
    }
  } else {
    console.log('🔐 Auth state: not logged in');
    if (logoutBtn) logoutBtn.classList.add('hidden');
  }
});

// === EXPORT ke window agar bisa dipanggil oleh controller lain ===
if (typeof window !== 'undefined') {
  window.handleEmailLogin = handleEmailLogin;
  window.handleLogout = handleLogout;
  console.log('✅ Auth functions (REAL) exposed to window');
}

console.log('🔐 auth-login.js (FINAL WITH AUTO-SYNC) loaded');
