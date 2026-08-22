// modules/data-statistik/main.js - ADOPSI POLA ADM-PEMBELAJARAN
// =========================================
// MAIN CONTROLLER: Data Statistik SDN 139 LAMANDA
// Pengganti: Kehadiran & Absensi -> Statistik GTK & Analisis Kehadiran
// =========================================

import { db } from '../../js/firebase-config.js';

const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
if (!currentUser.uid) {
  alert('Sesi berakhir. Silakan login kembali.');
  window.location.href = '../../index.html';
}

// ✅ DAFTAR SUB-FITUR DATA STATISTIK (6 Fitur) - SUDAH DIPERBARUI
const MENU_ITEMS = [
  { 
    id: 'demografi', 
    icon: '🏫', 
    title: 'Demografi Sekolah', 
    path: './features/demografi.js',
    status: 'ready'
  },
  { 
    id: 'peserta-didik', 
    icon: '👨‍🎓', 
    title: 'Statistik Peserta Didik', 
    path: './features/peserta-didik.js',
    status: 'ready'
  },
  { 
    id: 'gtk', 
    icon: '👩‍🏫', 
    title: 'Statistik GTK', 
    path: './features/gtk.js',
    status: 'ready',
    desc: 'Pengganti Kehadiran & Absensi - lebih analitik'
  },
  { 
    id: 'kehadiran-statistik', 
    icon: '📊', 
    title: 'Analisis Kehadiran', 
    path: './features/kehadiran-statistik.js',
    status: 'ready'
  },
  { 
    id: 'prestasi', 
    icon: '🏆', 
    title: 'Prestasi & Akademik', 
    path: './features/prestasi.js',
    status: 'ready'
  },
  { 
    id: 'rapor-pendidikan', 
    icon: '📈', 
    title: 'Rapor Pendidikan', 
    path: './features/rapor-pendidikan.js',
    status: 'ready'
  }
];

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const targetFiturId = urlParams.get('fitur');

  if (targetFiturId) {
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

function renderMenu() {
  const container = document.getElementById('subMenuContainer');
  if (!container) return;
  container.innerHTML = '';

  MENU_ITEMS.forEach(item => {
    const btn = document.createElement('button');
    btn.className = 'sub-menu-btn';
    btn.innerHTML = `<span class="sub-menu-icon">${item.icon}</span>${item.title}${item.desc ? `<span style="font-size:10px; color:#94a3b8; margin-top:4px; font-weight:400;">${item.desc}</span>` : ''}`;
    btn.onclick = () => loadFeature(item, btn);
    container.appendChild(btn);
  });
}

async function loadFeature(feature, clickedBtn) {
  const contentDiv = document.getElementById('dynamicContent');
  const menuContainer = document.getElementById('subMenuContainer');
  const btnBack = document.getElementById('btnBackToMenu');

  if (feature.status === 'soon') {
    contentDiv.innerHTML = `
      <div class="empty-state">
        <h3>🚧 ${feature.title}</h3>
        <p>Fitur ini sedang dalam tahap pengembangan.</p>
      </div>
    `;
    menuContainer.style.display = 'none';
    if (btnBack) btnBack.style.display = 'inline-block';
    return;
  }

  contentDiv.innerHTML = '<div class="empty-state">⏳ Memuat data statistik...</div>';

  try {
    const module = await import(feature.path);
    if (typeof module.init === 'function') {
      menuContainer.style.display = 'none';
      if (btnBack) btnBack.style.display = 'inline-block';
      module.init(contentDiv, db);
    } else {
      throw new Error('Fungsi init() tidak ditemukan');
    }
  } catch (error) {
    console.error(`Gagal memuat ${feature.title}:`, error);
    contentDiv.innerHTML = `
      <div class="empty-state">
        <h3>❌ Gagal Memuat Modul</h3>
        <p>Tidak dapat memuat "${feature.title}".</p>
        <p style="font-size:12px; color:#ef4444;">Error: ${error.message}</p>
        <p style="font-size:12px; color:#6b7280;">Path: ${feature.path}</p>
      </div>
    `;
    menuContainer.style.display = 'none';
    if (btnBack) btnBack.style.display = 'inline-block';
  }
}

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
        📊 Silakan pilih salah satu sub-fitur statistik di atas untuk melihat data analitik sekolah.
      </div>
    `;
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
};
