// js/dashboard.js

// === 🌟 PUSAT KONFIGURASI FITUR 🌟 ===
// Cukup tambah/edit di sini, kartu akan otomatis muncul di dashboard!
const konfigurasiFitur = {
  'layanan-portal': [
    { 
      nama: 'SIAGA Pendis (Login)', 
      icon: 'https://siagapendis.kemenag.go.id/favicon.ico',
      link: 'modules/siaga-pendis.html',
      isExternal: true
    },
    { 
      nama: 'SIMPKB (Portal Guru)', 
      icon: 'https://portal.simpkb.id/favicon.ico',
      link: 'modules/simpkb.html',
      isExternal: true
    }
  ],
  'dokumen-arsip': [
    { nama: 'Sub-Fitur 1 (Placeholder)', icon: '📁', link: 'dokumen-arsip/sub-1.html' },
    { nama: 'Sub-Fitur 2 (Placeholder)', icon: '📁', link: 'dokumen-arsip/sub-2.html' }
  ],
  'data-statistik': [
    { 
      nama: 'Demografi Sekolah', 
      icon: '👥', 
      link: 'modules/statistik/demografi.html' 
    },
    { 
      nama: 'Kehadiran & Absensi', 
      icon: '📈', 
      link: 'modules/statistik/kehadiran.html' 
    },
    { 
      nama: 'Prestasi & Akademik', 
      icon: '🏆', 
      link: 'modules/statistik/prestasi.html' 
    }
  ],
  'admin-pembelajaran': [
    { nama: 'Sub-Fitur 1 (Placeholder)', icon: '📚', link: 'admin-pembelajaran/sub-1.html' }
  ],
  'kolaborasi-global': [
    { nama: 'Sub-Fitur 1 (Placeholder)', icon: '🤝', link: 'kolaborasi/sub-1.html' }
  ],
  'monitoring': [
    { nama: 'Sub-Fitur 1 (Placeholder)', icon: '👁️', link: 'monitoring/sub-1.html' }
  ]
};

// === ✅ BARU: KONFIGURASI CONTROL CENTER (KHUSUS ADMIN) ===
const controlCenterFitur = {
  'control-center': [
    { nama: 'Manajemen Pengguna', icon: '👥', link: 'modules/control-center/manajemen-pengguna.html' },
    { nama: 'Data & Statistik', icon: '📊', link: 'modules/control-center/data-statistik.html' },
    { nama: 'Keamanan & Log', icon: '🔒', link: 'modules/control-center/keamanan-log.html' },
    { nama: 'Pengaturan Situs', icon: '⚙️', link: 'modules/control-center/pengaturan-situs.html' },
    { nama: 'Monitoring', icon: '📡', link: 'modules/control-center/monitoring.html' }
  ]
};

const layananSelect = document.getElementById('layananSelect');
const saveLayananBtn = document.getElementById('saveLayananBtn');
const resetBtn = document.getElementById('resetBtn');
const statusEl = document.getElementById('status');
const contentArea = document.getElementById('contentArea');

// === ✅ BARU: CEK ROLE USER DAN INJEKSI CONTROL CENTER JIKA ADMIN ===
function injectControlCenterIfAdmin() {
  const userRole = localStorage.getItem('userRole');
  
  if (userRole === 'admin') {
    // 1. Tambahkan opsi ke dropdown
    const newOption = document.createElement('option');
    newOption.value = 'control-center';
    newOption.textContent = '🛡️ Control Center (Admin)';
    layananSelect.appendChild(newOption);
    
    // 2. Gabungkan konfigurasi Control Center ke konfigurasi utama
    Object.assign(konfigurasiFitur, controlCenterFitur);
    
    console.log('✅ Control Center diaktifkan untuk Admin');
  } else {
    console.log('ℹ️ User bukan Admin, Control Center tidak ditampilkan');
  }
}

// === FUNGSI UNTUK MERENDER KARTU FITUR ===
function renderFiturInternal(featureKey) {
  // 1. Kosongkan area konten dulu
  contentArea.innerHTML = '';

  // 2. Jika tidak ada fitur yang dipilih, tampilkan pesan default
  if (!featureKey || !konfigurasiFitur[featureKey]) {
    contentArea.innerHTML = '<p style="text-align:center; color:#6b7280; padding:20px;">Silakan pilih dan simpan layanan untuk melihat fitur internal.</p>';
    return;
  }

  // 3. Ambil data sub-fitur berdasarkan key yang dipilih
  const subFiturList = konfigurasiFitur[featureKey];
  const featureTitle = layananSelect.options[layananSelect.selectedIndex].text;

  // 4. Buat elemen judul
  const titleEl = document.createElement('h3');
  titleEl.textContent = '📌 Fitur Internal: ' + featureTitle;
  titleEl.style.marginBottom = '16px';
  titleEl.style.color = '#2c3e50';
  titleEl.style.borderBottom = '2px solid #e5e7eb';
  titleEl.style.paddingBottom = '8px';
  contentArea.appendChild(titleEl);

  // 5. Buat container grid
  const gridEl = document.createElement('div');
  gridEl.className = 'internal-grid';

  // 6. Loop dan buat kartu untuk setiap sub-fitur (INILAH YANG MEMBUATNYA OTOMATIS)
  subFiturList.forEach(item => {
    const card = document.createElement('a');
    card.href = item.link;
    card.className = 'internal-card';
    
    // ✅ DIPERTAHANKAN: Jika link eksternal, buka di tab baru
    if (item.isExternal) {
      card.target = '_blank';
      card.rel = 'noopener noreferrer';
    }

    // ✅ DIPERTAHANKAN: Cek apakah icon adalah URL (untuk logo) atau emoji biasa
    if (item.icon.startsWith('http')) {
      // Jika URL, buat elemen <img> dengan fallback
      card.innerHTML = '<img src="' + item.icon + '" alt="logo" style="width: 32px; height: 32px; margin-right: 8px; object-fit: contain;" onerror="this.style.display=\'none\'; this.nextElementSibling.style.display=\'inline\';"><span style="display:none;">🔗</span> ' + item.nama;
    } else {
      // Jika emoji, tampilkan seperti biasa
      card.innerHTML = item.icon + ' ' + item.nama;
    }
    
    gridEl.appendChild(card);
  });

  contentArea.appendChild(gridEl);
}

// === MUAT LAYANAN AKTIF SAAT HALAMAN DIMUAT ===
document.addEventListener('DOMContentLoaded', () => {
  // ✅ BARU: Injeksi Control Center JIKA user adalah Admin
  injectControlCenterIfAdmin();
  
  const savedLayanan = localStorage.getItem('layananAktif');
  if (savedLayanan && konfigurasiFitur[savedLayanan]) {
    layananSelect.value = savedLayanan;
    renderFiturInternal(savedLayanan);
    statusEl.textContent = '✅ Layanan aktif: ' + layananSelect.options[layananSelect.selectedIndex].text;
    statusEl.className = '';
  }
});

// === SIMPAN LAYANAN (Pemicu Render) ===
saveLayananBtn.addEventListener('click', () => {
  const selected = layananSelect.value;
  if (!selected) {
    statusEl.textContent = '⚠️ Pilih layanan terlebih dahulu.';
    statusEl.className = 'error';
    return;
  }
  
  localStorage.setItem('layananAktif', selected);
  renderFiturInternal(selected); // <-- Di sini kartu dibuat secara otomatis
  
  statusEl.textContent = '✅ Layanan "' + layananSelect.options[layananSelect.selectedIndex].text + '" berhasil disimpan dan ditampilkan.';
  statusEl.className = '';
});

// === RESET PILIHAN LAYANAN ===
resetBtn.addEventListener('click', () => {
  localStorage.removeItem('layananAktif');
  layananSelect.value = '';
  contentArea.innerHTML = ''; // Kosongkan tampilan
  statusEl.textContent = '⚠️ Tampilan direset. Silakan pilih layanan baru.';
  statusEl.className = 'error';
  
  setTimeout(() => {
    statusEl.textContent = '';
    statusEl.className = '';
  }, 3000);
});
