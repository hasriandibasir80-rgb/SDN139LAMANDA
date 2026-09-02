// modules/global-monitoring/main.js
import { db } from '../../js/firebase-config.js';

const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
if (!currentUser.uid) {
  alert('Sesi berakhir. Silakan login kembali.');
  window.location.href = '../../index.html';
}

const MENU_ITEMS = [
  { 
    id: 'data-peserta-didik', 
    icon: '👨🎓', 
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
    icon: '', 
    title: 'Aset Sarana', 
    path: './features/aset-sarana.js',
    status: 'soon'
  },
  { 
    id: 'master-data', 
    icon: '📝', 
    title: 'Master Data', 
    path: './features/master-data.js',
    status: 'ready'
  },
  { 
    id: 'evaluasi-mandiri', 
    icon: '📈', 
    title: 'Evaluasi Mandiri', 
    path: './features/evaluasi-mandiri.js',
    status: 'soon'
  },
  { 
    id: 'data-tp', 
    icon: '🎯', 
    title: 'Data TP', 
    path: './features/data-tp.js',
    status: 'ready' 
  },
  { 
    id: 'KOP', 
    icon: '🏛️', 
    title: 'Tambah Kop',  // ✅ Label yang lebih jelas
    path: './features/kop.js',
    status: 'ready',
    isKop: true  // ✅ Flag untuk styling khusus
  }
];

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const targetFiturId = urlParams.get('fitur');

  if (targetFiturId) {
    const targetItem = MENU_ITEMS.find(item => 
      item.id.toLowerCase() === targetFiturId.toLowerCase()
    );
    
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
    
    // ✅ Tambahkan class khusus untuk tombol KOP
    if (item.isKop) {
      btn.classList.add('kop-btn');
    }
    
    btn.innerHTML = `<span class="sub-menu-icon">${item.icon}</span>${item.title}`;
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
        <p>Fitur ini sedang dalam tahap pengembangan dan akan segera tersedia.</p>
      </div>
    `;
    return;
  }

  contentDiv.innerHTML = '<div class="empty-state"> Memuat modul...</div>';

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
