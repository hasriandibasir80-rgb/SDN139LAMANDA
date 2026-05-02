import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getDatabase, ref, set, get, remove, onDisconnect, serverTimestamp as rtdbTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { getFirestore, doc, setDoc, updateDoc, serverTimestamp as fsTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { app } from '../firebase-config.js';

const auth = getAuth(app);
const rtdb = getDatabase(app);
const firestore = getFirestore(app);

const MAX_DEVICE = 2;
const HEARTBEAT_INTERVAL = 30000;
const SESSION_TIMEOUT = 60000;
let heartbeatTimer = null;
const sessionId = crypto.randomUUID();

export async function loginWithDeviceLimit(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const uid = userCredential.user.uid;

        const canLogin = await checkAndRegisterDeviceRTDB(uid);
        if (!canLogin) {
            await signOut(auth);
            throw new Error(`Maksimal ${MAX_DEVICE} perangkat aktif. Logout dari perangkat lain dulu.`);
        }

        await updateDoc(doc(firestore, 'users', uid), {
            lastLoginAt: fsTimestamp(),
            lastDevice: navigator.userAgent.substring(0, 100),
            activeSessions: await getActiveSessionCount(uid)
        }).catch(async () => {
            await setDoc(doc(firestore, 'users', uid), {
                email: email,
                lastLoginAt: fsTimestamp(),
                createdAt: fsTimestamp(),
                activeSessions: 1
            });
        });

        startHeartbeat(uid);
        return userCredential;
    } catch (err) {
        throw err;
    }
}

async function checkAndRegisterDeviceRTDB(uid) {
    const sessionsRef = ref(rtdb, `users/${uid}/sessions`);
    const snapshot = await get(sessionsRef);
    const sessions = snapshot.val() || {};

    const now = Date.now();
    const activeSessions = {};
    for (const [sid, data] of Object.entries(sessions)) {
        if (now - data.lastSeen < SESSION_TIMEOUT) {
            activeSessions[sid] = data;
        } else {
            remove(ref(rtdb, `users/${uid}/sessions/${sid}`));
        }
    }

    if (Object.keys(activeSessions).length >= MAX_DEVICE) return false;

    const mySessionRef = ref(rtdb, `users/${uid}/sessions/${sessionId}`);
    await set(mySessionRef, {
        lastSeen: rtdbTimestamp(),
        loginTime: rtdbTimestamp(),
        userAgent: navigator.userAgent.substring(0, 100)
    });

    onDisconnect(mySessionRef).remove();
    return true;
}

function startHeartbeat(uid) {
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    heartbeatTimer = setInterval(async () => {
        const mySessionRef = ref(rtdb, `users/${uid}/sessions/${sessionId}`);
        await set(mySessionRef, { lastSeen: rtdbTimestamp() }, { merge: true });
    }, HEARTBEAT_INTERVAL);
}

async function getActiveSessionCount(uid) {
    const sessionsRef = ref(rtdb, `users/${uid}/sessions`);
    const snapshot = await get(sessionsRef);
    const sessions = snapshot.val() || {};
    const now = Date.now();
    return Object.values(sessions).filter(s => now - s.lastSeen < SESSION_TIMEOUT).length;
}

export async function forceLogout() {
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    const user = auth.currentUser;
    if (user) {
        await remove(ref(rtdb, `users/${user.uid}/sessions/${sessionId}`));
        await updateDoc(doc(firestore, 'users', user.uid), {
            activeSessions: await getActiveSessionCount(user.uid),
            lastLogoutAt: fsTimestamp()
        });
    }
    await signOut(auth);
}

onAuthStateChanged(auth, (user) => {
    if (!user && heartbeatTimer) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
    }
});

window.addEventListener('beforeunload', () => {
    if (auth.currentUser) {
        remove(ref(rtdb, `users/${auth.currentUser.uid}/sessions/${sessionId}`));
    }
});
