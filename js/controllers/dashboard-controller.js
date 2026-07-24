// js/controllers/dashboard-controller.js
import { konfigurasiFitur, controlCenterFitur } from '../config/service-menu.js';

// ==========================================
// FUNGSI HELPER: NORMALISASI TEKS (OPSI 2)
// Mengubah "Administrasi Pembelajaran" atau "admin pembelajaran" 
// menjadi "administrasi-pembelajaran" agar pencocokan 100% akurat.
// ==========================================
function normalizeString(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')      // Ganti spasi dengan strip
    .replace(/[^a-z0-9-]/g, ''); // Hapus karakter khusus
}

export class DashboardController {
  constructor() {
    this.layananSelect = document.getElementById('layananSelect');
    this.saveLayananBtn = document.getElementById('saveLayananBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.statusEl = document.getElementById('status');
    this.contentArea = document.getElementById('contentArea');
    
    // Gabungkan konfigurasi
    this.allConfig = { ...konfigurasiFitur };

    // ✅ BARU: Ambil dan normalisasi hak akses user dari localStorage
    const hakAksesRaw = JSON.parse(localStorage.getItem('userHakAkses') || '[]');
    this.hakAksesNormalized = hakAksesRaw.map(item => normalizeString(item));
    
    // Cek apakah user adalah Admin atau punya akses penuh ('*')
    this.isFullAccess = this.hakAksesNormalized.includes('*') || localStorage.getItem('userRole') === 'admin';
    
    console.log('🔐 Hak Akses User (Normalized):', this.hakAksesNormalized);
    console.log('🔐 Full Access:', this.isFullAccess);
  }

  init() {
    this.injectControlCenterIfAllowed();
    this.loadSavedLayanan();
    this.attachEventListeners();
  }

  // ✅ DIPERBAIKI: Cek berdasarkan hakAkses, bukan hanya userRole
  injectControlCenterIfAllowed() {
    // Tampilkan Control Center jika user punya akses '*' atau 'control-center'
    if (this.isFullAccess || this.hakAksesNormalized.includes('control-center')) {
      // Cek agar tidak double inject jika sudah ada
      if (!this.layananSelect.querySelector('option[value="control-center"]')) {
        const newOption = document.createElement('option');
        newOption.value = 'control-center';
        newOption.textContent = '🛡️ Control Center (Admin)';
        this.layananSelect.appendChild(newOption);
        
        Object.assign(this.allConfig, controlCenterFitur);
        console.log('✅ Control Center diaktifkan untuk user ini');
      }
    }
  }

  loadSavedLayanan() {
    const savedLayanan = localStorage.getItem('layananAktif');
    if (savedLayanan && this.allConfig[savedLayanan]) {
      this.layananSelect.value = savedLayanan;
      this.renderFiturInternal(savedLayanan);
      this.showStatus('✅ Layanan aktif: ' + this.layananSelect.options[this.layananSelect.selectedIndex].text, 'success');
    }
  }

  attachEventListeners() {
    this.saveLayananBtn.addEventListener('click', () => this.saveLayanan());
    this.resetBtn.addEventListener('click', () => this.resetLayanan());
  }

  saveLayanan() {
    const selected = this.layananSelect.value;
    if (!selected) {
      this.showStatus('⚠️ Pilih layanan terlebih dahulu.', 'error');
      return;
    }
    
    localStorage.setItem('layananAktif', selected);
    this.renderFiturInternal(selected);
    this.showStatus('✅ Layanan "' + this.layananSelect.options[this.layananSelect.selectedIndex].text + '" berhasil disimpan.', 'success');
  }

  resetLayanan() {
    localStorage.removeItem('layananAktif');
    this.layananSelect.value = '';
    this.contentArea.innerHTML = '<p style="text-align:center; color:#6b7280; padding:20px;">Silakan pilih dan simpan layanan untuk melihat fitur internal.</p>';
    this.showStatus('⚠️ Tampilan direset. Silakan pilih layanan baru.', 'error');
    
    setTimeout(() => this.clearStatus(), 3000);
  }

  // ✅ INTI PERUBAHAN: Render dengan logika Terkunci vs Aktif
  renderFiturInternal(featureKey) {
    this.contentArea.innerHTML = '';

    if (!featureKey || !this.allConfig[featureKey]) {
      this.contentArea.innerHTML = '<p style="text-align:center; color:#6b7280; padding:20px;">Silakan pilih dan simpan layanan untuk melihat fitur internal.</p>';
      return;
    }

    const subFiturList = this.allConfig[featureKey];
    const featureTitle = this.layananSelect.options[this.layananSelect.selectedIndex].text;

    const titleEl = document.createElement('h3');
    titleEl.textContent = '📌 Fitur Internal: ' + featureTitle;
    titleEl.style.marginBottom = '16px';
    titleEl.style.color = '#2c3e50';
    titleEl.style.borderBottom = '2px solid #e5e7eb';
    titleEl.style.paddingBottom = '8px';
    this.contentArea.appendChild(titleEl);

    const gridEl = document.createElement('div');
    gridEl.className = 'internal-grid';

    subFiturList.forEach(item => {
      // 1. Normalisasi nama sub-fitur untuk pencocokan
      const normalizedNama = normalizeString(item.nama);
      
      // 2. Cek apakah user punya akses ke sub-fitur ini
      const hasAccess = this.isFullAccess || this.hakAksesNormalized.includes(normalizedNama);

      // 3. Buat elemen: <a> jika diizinkan, <div> jika terkunci
      const card = document.createElement(hasAccess ? 'a' : 'div');
      
      // Tambahkan class 'locked-card' jika tidak diizinkan (untuk styling CSS)
      card.className = 'internal-card' + (hasAccess ? '' : ' locked-card');
      
      if (hasAccess) {
        card.href = item.link;
        if (item.isExternal) {
          card.target = '_blank';
          card.rel = 'noopener noreferrer';
        }
      } else {
        // Styling inline untuk keadaan terkunci (fallback jika CSS belum ada)
        card.style.cursor = 'not-allowed';
        card.style.opacity = '0.5';
        card.style.backgroundColor = '#f3f4f6';
        card.title = 'Anda tidak memiliki akses untuk fitur ini';
      }

      // 4. Render konten kartu
      let iconHtml = '';
      if (item.icon && item.icon.startsWith('http')) {
        iconHtml = '<img src="' + item.icon + '" alt="logo" style="width: 32px; height: 32px; margin-right: 8px; object-fit: contain;" onerror="this.style.display=\'none\'; this.nextElementSibling.style.display=\'inline\';"><span style="display:none;">🔗</span>';
      } else {
        iconHtml = (item.icon || '🔗') + ' ';
      }

      if (hasAccess) {
        card.innerHTML = iconHtml + item.nama;
      } else {
        card.innerHTML = iconHtml + item.nama + ' <span style="font-size: 0.8em; margin-left: 4px;">🔒</span>';
      }
      
      gridEl.appendChild(card);
    });

    this.contentArea.appendChild(gridEl);
  }

  showStatus(message, type) {
    this.statusEl.textContent = message;
    this.statusEl.className = type || '';
  }

  clearStatus() {
    this.statusEl.textContent = '';
    this.statusEl.className = '';
  }
}
