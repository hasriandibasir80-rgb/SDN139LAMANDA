import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { forceLogout } from '../modules/auth-login.js';
import { app } from '../firebase-config.js';

const auth = getAuth(app);
const firestore = getFirestore(app);
const rtdb = getDatabase(app);

let currentUser = null;

// Cek Auth
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.replace('./index.html');
        return;
    }
    
    currentUser = user;
    await loadDashboard(user.uid);
    document.getElementById('loadingScreen').classList.add('hidden');
});

async function loadDashboard(uid) {
    // 1. Ambil data user dari Firestore
    const userDoc = await getDoc(doc(firestore, 'users', uid));
    const userData = userDoc.data() || {};
    
    document.getElementById('userName').textContent = userData.nama || userData.email || 'Guru';
    document.getElementById('welcomeName').textContent = userData.nama || 'Guru';
    document.getElementById('userRole').textContent = userData.role || 'Guru';
    
    // Format lastLogin
    if (userData.lastLoginAt) {
        const date = userData.lastLoginAt.toDate();
        document.getElementById('lastLogin').textContent = date.toLocaleDateString('id-ID', {
            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
        });
    }

    // 2. Ambil jumlah device aktif dari RTDB
    const sessionsRef = ref(rtdb, `users/${uid}/sessions`);
    const snapshot = await get(sessionsRef);
    const sessions = snapshot.val() || {};
    const now = Date.now();
    const activeCount = Object.values(sessions).filter(s => now - s.lastSeen < 60000).length;
    document.getElementById('activeDevices').textContent = activeCount;

    // 3. Load statistik dari Firestore
    await loadStats(uid);
}

async function loadStats(uid) {
    try {
        // Total Siswa
        const siswaQuery = query(collection(firestore, 'siswa'), where('guruId', '==', uid));
        const siswaSnap = await getDocs(siswaQuery);
        document.getElementById('totalSiswa').textContent = siswaSnap.size;

        // Total Nilai
        const nilaiQuery = query(collection(firestore, 'nilai'), where('guruId', '==', uid));
        const nilaiSnap = await getDocs(nilaiQuery);
        document.getElementById('totalNilai').textContent = nilaiSnap.size;

        // Total Modul Ajar
        const modulQuery = query(collection(firestore, 'adm_pembelajaran'), where('guruId', '==', uid));
        const modulSnap = await getDocs(modulQuery);
        document.getElementById('totalModul').textContent = modulSnap.size;

        // Total Absensi bulan ini
        const now = new Date();
        const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const absenQuery = query(
            collection(firestore, 'absensi'), 
            where('guruId', '==', uid),
            where('tanggal', '>=', startMonth)
        );
        const absenSnap = await getDocs(absenQuery);
        document.getElementById('totalAbsen').textContent = absenSnap.size;

    } catch (err) {
        console.error('Error load stats:', err);
    }
}

// Logout
document.getElementById('btnLogout').addEventListener('click', async () => {
    if (confirm('Yakin mau logout?')) {
        await forceLogout();
        window.location.replace('./index.html');
    }
});

// Load Module Dinamis
document.querySelectorAll('.menu-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
        const moduleName = btn.dataset.module;
        await loadModule(moduleName);
    });
});

async function loadModule(moduleName) {
    const container = document.getElementById('moduleContainer');
    container.innerHTML = '<div class="text-center py-12"><p class="text-gray-500">Memuat modul...</p></div>';
    container.classList.remove('hidden');
    
    container.scrollIntoView({ behavior: 'smooth' });

    try {
        const module = await import(`../modules/${moduleName}/${moduleName}.js`);
        if (module.renderModule) {
            container.innerHTML = '';
            module.renderModule(container, currentUser.uid);
        } else {
            container.innerHTML = `<div class="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-lg">Modul ${moduleName} belum siap.</div>`;
        }
    } catch (err) {
        container.innerHTML = `<div class="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">Gagal load modul: ${err.message}</div>`;
    }
}
