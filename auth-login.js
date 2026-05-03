// auth-login.js
// Device Limit Login System with Heartbeat & Session Management
// Import semua dependencies dari firebase-config.js (tidak import ulang dari CDN)

import { 
  // === INSTANCES ===
  app, auth, rtdb, db,
  
  // === AUTH FUNCTIONS ===
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  
  // === FIRESTORE FUNCTIONS ===
  doc, 
  updateDoc, 
  setDoc, 
  serverTimestamp as fsTimestamp,
  
  // === REALTIME DATABASE FUNCTIONS ===
  ref, 
  set, 
  get, 
  remove, 
  onDisconnect, 
  rtdbTimestamp
} from './modules/firebase-config.js';

// ✅ Konstanta konfigurasi session
const MAX_DEVICE = 2;                    // Maksimal perangkat aktif per user
const HEARTBEAT_INTERVAL = 30000;        // Heartbeat tiap 30 detik
const SESSION_TIMEOUT = 60000;           // Session dianggap expired setelah 60 detik tidak ada heartbeat
let heartbeatTimer = null;
const sessionId = crypto.randomUUID();   // Unique ID untuk session ini

// ✅ Fungsi utama: Login dengan validasi limit device
export async function loginWithDeviceLimit(email, password) {
    try {
        // 1. Authenticate user dengan Firebase Auth
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const uid = userCredential.user.uid;

        // 2. Cek dan register device di Realtime Database
        const canLogin = await checkAndRegisterDeviceRTDB(uid);
        if (!canLogin) {
            // Jika melebihi limit, logout dan throw error
            await signOut(auth);
            throw new Error(`Maksimal ${MAX_DEVICE} perangkat aktif. Logout dari perangkat lain dulu.`);
        }

        // 3. Update data user di Firestore (last login, device info, active sessions)
        await updateDoc(doc(db, 'users', uid), {
            lastLoginAt: fsTimestamp(),
            lastDevice: navigator.userAgent.substring(0, 100),
            activeSessions: await getActiveSessionCount(uid)
        }).catch(async () => {
            // Jika dokumen belum ada, buat baru
            await setDoc(doc(db, 'users', uid), {
                email: email,
                lastLoginAt: fsTimestamp(),
                createdAt: fsTimestamp(),
                activeSessions: 1
            });
        });

        // 4. Mulai heartbeat untuk menjaga session tetap aktif
        startHeartbeat(uid);
        
        return userCredential;
        
    } catch (err) {
        console.error('❌ Login error:', err);
        throw err; // Re-throw agar bisa ditangani UI
    }
}

// ✅ Fungsi: Cek session aktif & register device baru di Realtime Database
async function checkAndRegisterDeviceRTDB(uid) {
    const sessionsRef = ref(rtdb, `users/${uid}/sessions`);
    const snapshot = await get(sessionsRef);
    const sessions = snapshot.val() || {};

    const now = Date.now();
    const activeSessions = {};
    
    // Filter session yang masih aktif (belum timeout)
    for (const [sid, data] of Object.entries(sessions)) {
        if (now - data.lastSeen < SESSION_TIMEOUT) {
            activeSessions[sid] = data;
        } else {
            // Hapus session yang sudah expired
            await remove(ref(rtdb, `users/${uid}/sessions/${sid}`));
        }
    }

    // Jika sudah mencapai limit, tolak login
    if (Object.keys(activeSessions).length >= MAX_DEVICE) {
        return false;
    }

    // Register session baru
    const mySessionRef = ref(rtdb, `users/${uid}/sessions/${sessionId}`);
    await set(mySessionRef, {
        lastSeen: rtdbTimestamp(),
        loginTime: rtdbTimestamp(),
        userAgent: navigator.userAgent.substring(0, 100)
    });

    // Auto-remove session ketika tab/browser ditutup
    onDisconnect(mySessionRef).remove();
    
    return true;
}

// ✅ Fungsi: Heartbeat untuk memperbarui lastSeen session
function startHeartbeat(uid) {
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    
    heartbeatTimer = setInterval(async () => {
        try {
            const mySessionRef = ref(rtdb, `users/${uid}/sessions/${sessionId}`);
            await set(mySessionRef, { 
                lastSeen: rtdbTimestamp() 
            }, { merge: true });
        } catch (err) {
            console.warn('⚠️ Heartbeat failed:', err);
        }
    }, HEARTBEAT_INTERVAL);
}

// ✅ Fungsi: Hitung jumlah session aktif untuk user
async function getActiveSessionCount(uid) {
    const sessionsRef = ref(rtdb, `users/${uid}/sessions`);
    const snapshot = await get(sessionsRef);
    const sessions = snapshot.val() || {};
    const now = Date.now();
    
    return Object.values(sessions).filter(s => 
        now - s.lastSeen < SESSION_TIMEOUT
    ).length;
}

// ✅ Fungsi: Force logout + cleanup session
export async function forceLogout() {
    // Stop heartbeat
    if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
    }
    
    const user = auth.currentUser;
    if (user) {
        try {
            // Hapus session dari Realtime Database
            await remove(ref(rtdb, `users/${user.uid}/sessions/${sessionId}`));
            
            // Update activeSessions count di Firestore
            await updateDoc(doc(db, 'users', user.uid), {
                activeSessions: await getActiveSessionCount(user.uid),
                lastLogoutAt: fsTimestamp()
            });
        } catch (err) {
            console.warn('⚠️ Cleanup session error:', err);
        }
    }
    
    // Logout dari Firebase Auth
    await signOut(auth);
}

// ✅ Listener: Auto-cleanup jika user logout dari tempat lain
onAuthStateChanged(auth, (user) => {
    if (!user && heartbeatTimer) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
        console.log('🧹 Heartbeat stopped - user logged out');
    }
});

// ✅ Listener: Cleanup session ketika halaman/tab ditutup
window.addEventListener('beforeunload', () => {
    if (auth.currentUser) {
        remove(ref(rtdb, `users/${auth.currentUser.uid}/sessions/${sessionId}`))
            .catch(err => console.warn('⚠️ beforeunload cleanup error:', err));
    }
});

// ✅ Export tambahan untuk keperluan UI/testing
export { 
    auth, 
    signOut, 
    onAuthStateChanged,
    getActiveSessionCount 
};

console.log('✅ auth-login.js loaded - Device Limit System ready');
