/**
 * Auth Login Module - Rumah Anak
 * Fitur: Email/Password + User ID login, device session management
 * Compatible: ES6 Module, Firebase v10.12.2
 */

// ✅ Import dari firebase-config.js (PATH DIPERBAIKI!)
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
} from './js/firebase-config.js';  // ← PERBAIKI DI SINI

// === CONFIG: Demo Credentials (Plain Text per Request) ===
const DEMO_CREDENTIALS = {
  username: 'Andi',
  password: '1981'
};

// === SESSION MANAGEMENT: Device Limit via Realtime Database ===
async function registerSession(userId, deviceId) {
  try {
    const sessionRef = ref(rtdb, `sessions/${userId}/${deviceId}`);
    const sessionData = {
      lastActive: Date.now(),
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString()
    };
    
    // Set session + auto-remove saat user logout/tab closed
    await set(sessionRef, sessionData);
    onDisconnect(sessionRef).remove();
    
    console.log('✅ Session registered:', deviceId);
    return true;
  } catch (error) {
    console.error('❌ Session registration failed:', error);
    return false;
  }
}

// === 1. Handle Email/Password Login ===
async function handleEmailLogin(email, password) {
  try {
    // Cek demo credentials (plain text per request)
    if (email === DEMO_CREDENTIALS.username && password === DEMO_CREDENTIALS.password) {
      console.log('✅ Demo login berhasil');
      // Simpan session demo di localStorage (bukan Firebase untuk demo)
      localStorage.setItem('currentUser', JSON.stringify({
        uid: 'demo-andi',
        email: 'andi@demo.local',
        displayName: 'Andi (Demo)',
        isDemo: true
      }));
      // Redirect ke dashboard
      window.location.href = './dashboard.html';
      return { uid: 'demo-andi', isDemo: true };
    }
    
    // Firebase Auth login
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    console.log('✅ Firebase login berhasil:', user.email);
    
    // Register session untuk device limit
    const deviceId = localStorage.getItem('deviceId') || crypto.randomUUID();
    localStorage.setItem('deviceId', deviceId);
    await registerSession(user.uid, deviceId);
    
    // Redirect ke dashboard
    window.location.href = './dashboard.html';
    return user;
    
  } catch (error) {
    console.error('❌ Login error:', error.code, error.message);
    // Throw dengan message user-friendly
    const messages = {
      'auth/invalid-email': 'Format email tidak valid',
      'auth/user-disabled': 'Akun dinonaktifkan',
      'auth/user-not-found': 'Email tidak terdaftar',
      'auth/wrong-password': 'Password salah',
      'auth/too-many-requests': 'Terlalu banyak percobaan. Coba lagi nanti'
    };
    throw new Error(messages[error.code] || 'Login gagal. Periksa koneksi atau kredensial.');
  }
}

// === 2. Handle User ID Login (Custom Lookup) ===
async function handleUserIdLogin(userId) {
  try {
    if (!userId || userId.trim() === '') {
      throw new Error('User ID tidak boleh kosong');
    }
    
    // Lookup user di Realtime Database (contoh struktur)
    const userRef = ref(rtdb, `users/${userId.trim()}`);
    const snapshot = await get(userRef);
    
    if (!snapshot.exists()) {
      throw new Error('User ID tidak ditemukan');
    }
    
    const userData = snapshot.val();
    
    // Simpan session sederhana di localStorage
    localStorage.setItem('currentUser', JSON.stringify({
      uid: userId.trim(),
      displayName: userData.displayName || userId.trim(),
      isCustomId: true
    }));
    
    console.log('✅ User ID login berhasil:', userId);
    
    // Redirect ke dashboard
    window.location.href = `./dashboard.html?uid=${encodeURIComponent(userId.trim())}`;
    return { uid: userId.trim(), ...userData };
    
  } catch (error) {
    console.error('❌ UserID login error:', error);
    throw error; // Re-throw untuk ditangani UI
  }
}

// === 3. Handle Logout (SULU) ===
async function handleLogout() {
  try {
    // Hapus session dari Realtime Database jika ada
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const deviceId = localStorage.getItem('deviceId');
    
    if (currentUser.uid && deviceId && !currentUser.isDemo) {
      try {
        const sessionRef = ref(rtdb, `sessions/${currentUser.uid}/${deviceId}`);
        await remove(sessionRef);
        console.log('✅ Session removed');
      } catch (e) {
        console.warn('⚠️ Gagal hapus session (non-critical):', e);
      }
    }
    
    // Firebase sign out (jika pakai Firebase Auth)
    if (!currentUser.isDemo && !currentUser.isCustomId) {
      await signOut(auth);
      console.log('✅ Firebase signOut berhasil');
    }
    
    // Clear local state
    localStorage.removeItem('currentUser');
    // deviceId dipertahankan untuk konsistensi device tracking
    
    console.log('✅ Logout berhasil');
    
    // Redirect ke login page
    window.location.href = './index.html';
    
  } catch (error) {
    console.error('❌ Logout error:', error);
    throw new Error('Gagal logout: ' + (error.message || 'Silakan coba lagi'));
  }
}

// === 4. Auth State Listener (Update UI Otomatis) ===
onAuthStateChanged(auth, (user) => {
  const logoutBtn = document.getElementById('logoutBtn');
  
  if (user) {
    // User sudah login via Firebase Auth
    console.log('🔐 Auth state: logged in as', user.email);
    if (logoutBtn) logoutBtn.classList.remove('hidden');
    
    // Opsional: auto-redirect jika di halaman login
    if (window.location.pathname.includes('index.html')) {
      // window.location.href = './dashboard.html';
    }
  } else {
    // Cek juga demo/custom login dari localStorage
    const localUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    if (localUser.uid) {
      console.log('🔐 Auth state: logged in via local (demo/custom)', localUser.uid);
      if (logoutBtn) logoutBtn.classList.remove('hidden');
    } else {
      // Benar-benar belum login
      console.log('🔐 Auth state: not logged in');
      if (logoutBtn) logoutBtn.classList.add('hidden');
    }
  }
});

// === EXPORT: Ekspos fungsi ke window untuk inline script ===
// Karena module scope terpisah, perlu ekspos eksplisit agar bisa dipanggil dari HTML inline script
if (typeof window !== 'undefined') {
  window.handleEmailLogin = handleEmailLogin;
  window.handleUserIdLogin = handleUserIdLogin;
  window.handleLogout = handleLogout;
  console.log('✅ Auth functions exposed to window');
}

console.log('🔐 auth-login.js loaded as ES6 module');
