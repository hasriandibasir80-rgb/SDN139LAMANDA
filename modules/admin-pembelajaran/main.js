// modules/admin-pembelajaran/main.js - FIXED LCKH
// =========================================
// MAIN CONTROLLER: Pengatur Menu & Routing Modular
// =========================================

import { db } from '../../js/firebase-config.js';

// Cek login
const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
if (!currentUser.uid) {
  alert('Sesi berakhir. Silakan login kembali.');
  window.location.href = '../../index.html';
}

// ✅ DAFTAR SEMUA SUB-FITUR (18 Fitur) - FIXED
const MENU_ITEMS = [
  { 
    id: 'cp-tp-atp', 
    icon: '🎯', 
    title: 'CP, TP, & ATP', 
    path: './features/cp-tp-atp.js',
    status: 'ready'
  },
  { 
    id: 'prota', 
    icon: '📅', 
    title: 'Program Tahunan', 
    path: './features/prota.js',
    status: 'ready'
  },
  { 
    id: 'promes', 
    icon: '🗓️', 
    title: 'Program Semester', 
    path: './features/promes.js',
    status: 'soon'
  },
  { 
    id: 'lckh',
    icon: '📁', 
    title: 'LCKH', 
    path: './features/lckh.js',
    status: 'ready'
  },
  { 
    id: 'jurnal', 
    icon: '📝', 
    title: 'Jurnal Harian', 
    path: './features/jurnal.js',
    status: 'ready'
  },
  { 
    id: 'bank-soal', 
    icon: '❓', 
    title: 'Bank Soal', 
    path: './features/bank-soal.js',
    status: 'ready'
  },
  { 
    id: 'kktp', 
    icon: '📊', 
    title: 'Analisis KKTP', 
    path: './features/kktp.js',
    status: 'ready'
  },
  { 
    id: 'rumus-8-3-3-4', 
    icon: '🔢', 
    title: 'Rumus 8-3-3-4', 
    path: './features/rumus-8-3-3-4.js',
    status: 'ready' 
  },
  { 
    id: 'refleksi', 
    icon: '🔍', 
    title: 'Refleksi Guru', 
    path: './features/refleksi.js',
    status: 'soon'
  },
  { 
    id: 'kalender', 
    icon: '📆', 
    title: 'Kalender Pendidikan', 
    path: './features/kalender.js',
    status: 'soon'
  },
  { 
    id: 'jadwal', 
    icon: '⏰', 
    title: 'Jadwal Pembelajaran', 
    path: './features/jadwal.js',
    status: 'ready'
  },
  { 
    id: 'presensi', 
    icon: '✅', 
    title: 'Presensi Siswa', 
    path: './features/presensi.js',
    status: 'ready'
  },
  { 
    id: 'lkpd', 
    icon: '📄', 
    title: 'LKPD', 
    path: './features/lkpd.js',
    status: 'ready'
  },
  { 
    id: 'penilaian', 
    icon: '📈', 
    title: 'Penilaian', 
    path: './features/penilaian.js',
    status: 'ready'
  },
  { 
    id: 'pembuat-soal', 
    icon: '✍️', 
    title: 'Pembuat Soal', 
    path: './features/pembuat-soal.js',
    status: 'ready'
  },
  { 
    id: 'kisi-kisi', 
    icon: '📋', 
    title: 'Pembuat Kisi-kisi', 
    path: './features/kisi-kisi.js',
    status: 'ready'
  },
  { 
    id: 'coming-soon', 
    icon: '📝', 
    title: 'comong-soon', 
    path: './features/rpm-standar.js',
    status: 'soon'
  },
  { 
    id: 'rpm-spesifik', 
    icon: '🎯', 
    title: 'RPM Spesifik', 
    path: './features/rpm-spesifik.js',
    status: 'ready'
  }
];

// ✅ INISIALISASI DENGAN AUTO-LOAD DARI URL PARAMETER - FIXED CASE INSENSITIVE
document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const targetFiturId = urlParams.get('fitur');

  if (targetFiturId) {
    // FIX: cari dengan lowercase biar ?fitur=LCKH atau lckh atau Laporan... tetap ketemu
    const normalizedId = targetFiturId.toLowerCase().trim();
    const targetItem = MENU_ITEMS.find(item => item.id.toLowerCase() === normalizedId);
    
    if (targetItem) {
      const menuContainer = document.getElementById('subMenuContainer');
      const btnBack = document.getElementById('btnBackToMenu');
      if (menuContainer) menuContainer.style.display = 'none';
      if (btnBack) btnBack.style.display = 'inline-block';
      loadFeature(targetItem, null);
    } else {
      renderMenu();
    }
  } else {
    renderMenu();
  }
});

// ✅ RENDER MENU GRID
function renderMenu() {
  const container = document.getElementById('subMenuContainer');
  if (!container) return;
  container.innerHTML = '';

  MENU_ITEMS.forEach(item => {
    const btn = document.createElement('button');
    btn.className = 'sub-menu-btn';
    btn.innerHTML = `<span class="sub-menu-icon">${item.icon}</span>${item.title}`;
    btn.onclick = () => loadFeature(item, btn);
    container.appendChild(btn);
  });
}

// ✅ LOAD FITUR (Dynamic Import)
async function loadFeature(feature, clickedBtn) {
  const contentDiv = document.getElementById('dynamicContent');
  const menuContainer = document.getElementById('subMenuContainer');
  const btnBack = document.getElementById('btnBackToMenu');

  if (feature.status === 'soon') {
    contentDiv.innerHTML = `
      <div class="empty-state">
        <h3>🚧 ${feature.title}</h3>
        <p>Fitur ini sedang dalam tahap pengembangan dan akan segera tersedia.</p>
        <p style="margin-top:10px; font-size:13px; color:#9ca3af;">Silakan coba fitur lain yang sudah siap digunakan.</p>
      </div>
    `;
    // Tetap hide menu untuk konsistensi
    menuContainer.style.display = 'none';
    if (btnBack) btnBack.style.display = 'inline-block';
    return;
  }

  contentDiv.innerHTML = '<div class="empty-state">⏳ Memuat modul...</div>';

  try {
    const module = await import(feature.path);
    
    if (typeof module.init === 'function') {
      menuContainer.style.display = 'none';
      if (btnBack) btnBack.style.display = 'inline-block';
      module.init(contentDiv, db);
    } else {
      throw new Error('Fungsi init() tidak ditemukan di modul');
    }
  } catch (error) {
    console.error(`Gagal memuat ${feature.title}:`, error);
    contentDiv.innerHTML = `
      <div class="empty-state">
        <h3> Gagal Memuat Modul</h3>
        <p>Tidak dapat memuat fitur "${feature.title}".</p>
        <p style="font-size:12px; color:#ef4444; margin-top:10px;">Error: ${error.message}</p>
        <p style="font-size:12px; color:#6b7280; margin-top:5px;">Pastikan file ada di: ${feature.path}</p>
      </div>
    `;
    // Tetap tampilkan tombol kembali
    menuContainer.style.display = 'none';
    if (btnBack) btnBack.style.display = 'inline-block';
  }
}

// ✅ FUNGSI GLOBAL: Kembali ke Menu - FIXED
window.backToMenu = function() {
  const menuContainer = document.getElementById('subMenuContainer');
  const contentDiv = document.getElementById('dynamicContent');
  const btnBack = document.getElementById('btnBackToMenu');

  if (window.history && window.history.replaceState) {
    const cleanUrl = window.location.pathname;
    window.history.replaceState({}, document.title, cleanUrl);
  }

  renderMenu();

  if (menuContainer) menuContainer.style.display = 'grid';
  if (btnBack) btnBack.style.display = 'none';
  
  if (contentDiv) {
    contentDiv.innerHTML = `
      <div class="empty-state">
        👆 Silakan pilih salah satu sub-fitur di atas untuk memulai.
      </div>
    `;
  }
  
  window.scrollTo({ top: 0, behavior: 'smooth' });
};
