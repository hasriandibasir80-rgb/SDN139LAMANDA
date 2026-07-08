// modules/global-monitoring/main.js
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

// ✅ DAFTAR 5 SUB-FITUR MONITORING
const MENU_ITEMS = [
  { 
    id: 'data-peserta-didik', 
    icon: '👨‍🎓', 
    title: 'Data Peserta Didik', 
    path: './features/data-peserta-didik.js',
    status: 'ready'
  },
  { 
    id: 'supervisi-akademik', 
    icon: '🎓', 
    title: 'Supervisi Akademik', 
    path: './features/supervisi-akademik.js',
    status: 'soon'
  },
  { 
    id: 'aset-sarana', 
    icon: '🏫', 
    title: 'Aset Sarana', 
    path: './features/aset-sarana.js',
    status: 'soon'
  },
  { 
    id: 'program-rencana', 
    icon: '📝', 
    title: 'Program Rencana', 
    path: './features/program-rencana.js',
    status: 'soon'
  },
  { 
    id: 'evaluasi-mandiri', 
    icon: '📈', 
    title: 'Evaluasi Mandiri', 
    path: './features/evaluasi-mandiri.js',
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
      </div>
    `;
    return;
  }

  // Loading state
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
        <h3>❌ Gagal Memuat Modul</h3>
        <p>Error: ${error.message}</p>
      </div>
    `;
  }
}

// ✅ FUNGSI GLOBAL: Kembali ke Menu
window.backToMenu = function() {
  const menuContainer = document.getElementById('subMenuContainer');
  const contentDiv = document.getElementById('dynamicContent');
  const btnBack = document.getElementById('btnBackToMenu');

  menuContainer.style.display = 'grid';
  if (btnBack) btnBack.style.display = 'none';
  
  contentDiv.innerHTML = `
    <div class="empty-state">
      👆 Silakan pilih salah satu sub-fitur di atas untuk memulai.
    </div>
  `;
};
