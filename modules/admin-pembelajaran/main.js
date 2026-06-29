// modules/admin-pembelajaran/main.js
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

// ✅ DAFTAR SEMUA SUB-FITUR (Menu + Path Script)
const MENU_ITEMS = [
  { 
    id: 'cp-tp-atp', 
    icon: '🎯', 
    title: 'CP, TP, & ATP', 
    path: './features/cp-tp-atp.js',
    status: 'soon'
  },
  { 
    id: 'prota', 
    icon: '📅', 
    title: 'Program Tahunan', 
    path: './features/prota.js',
    status: 'soon'
  },
  { 
    id: 'promes', 
    icon: '🗓️', 
    title: 'Program Semester', 
    path: './features/promes.js',
    status: 'soon'
  },
  { 
    id: 'modul-ajar', 
    icon: '📖', 
    title: 'Modul Ajar', 
    path: './features/modul-ajar.js',
    status: 'soon'
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
    status: 'soon'
  },
  { 
    id: 'kktp', 
    icon: '📊', 
    title: 'Analisis KKTP', 
    path: './features/kktp.js',
    status: 'soon'
  },
  { 
    id: 'p5', 
    icon: '🤝', 
    title: 'Modul P5', 
    path: './features/p5.js',
    status: 'soon'
  },
  { 
    id: 'refleksi', 
    icon: '🔍', 
    title: 'Refleksi Guru', 
    path: './features/refleksi.js',
    status: 'soon'
  }
];

// ✅ INISIALISASI
document.addEventListener('DOMContentLoaded', () => {
  renderMenu();
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

  // Jika fitur belum dibuat
  if (feature.status === 'soon') {
    contentDiv.innerHTML = `
      <div class="empty-state">
        <h3>🚧 ${feature.title}</h3>
        <p>Fitur ini sedang dalam tahap pengembangan dan akan segera tersedia.</p>
        <p style="margin-top:10px; font-size:13px; color:#9ca3af;">Silakan coba fitur <strong>Jurnal Harian</strong> yang sudah siap digunakan.</p>
      </div>
    `;
    return;
  }

  // Loading state
  contentDiv.innerHTML = '<div class="empty-state">⏳ Memuat modul...</div>';

  try {
    // Dynamic import script fitur
    const module = await import(feature.path);
    
    if (typeof module.init === 'function') {
      // ✅ HIDE MENU, SHOW TOMBOL KEMBALI
      menuContainer.style.display = 'none';
      if (btnBack) btnBack.style.display = 'inline-block';
      
      // Init fitur
      module.init(contentDiv, db);
    } else {
      throw new Error('Fungsi init() tidak ditemukan di modul');
    }
  } catch (error) {
    console.error(`Gagal memuat ${feature.title}:`, error);
    contentDiv.innerHTML = `
      <div class="empty-state">
        <h3>❌ Gagal Memuat Modul</h3>
        <p>Tidak dapat memuat fitur "${feature.title}".</p>
        <p style="font-size:12px; color:#ef4444; margin-top:10px;">Error: ${error.message}</p>
      </div>
    `;
  }
}

// ✅ FUNGSI GLOBAL: Kembali ke Menu
window.backToMenu = function() {
  const menuContainer = document.getElementById('subMenuContainer');
  const contentDiv = document.getElementById('dynamicContent');
  const btnBack = document.getElementById('btnBackToMenu');

  // ✅ SHOW MENU, HIDE TOMBOL KEMBALI
  menuContainer.style.display = 'grid';
  if (btnBack) btnBack.style.display = 'none';
  
  // Reset konten
  contentDiv.innerHTML = `
    <div class="empty-state">
      👆 Silakan pilih salah satu sub-fitur di atas untuk memulai.
    </div>
  `;
};
