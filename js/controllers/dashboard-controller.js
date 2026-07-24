// js/controllers/dashboard-controller.js
import { konfigurasiFitur, controlCenterFitur } from '../config/service-menu.js';

export class DashboardController {
  constructor() {
    this.layananSelect = document.getElementById('layananSelect');
    this.saveLayananBtn = document.getElementById('saveLayananBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.statusEl = document.getElementById('status');
    this.contentArea = document.getElementById('contentArea');
    
    // Gabungkan konfigurasi
    this.allConfig = { ...konfigurasiFitur };
    
    // ✅ BARU: Ambil data hak akses dan role dari localStorage
    this.hakAkses = JSON.parse(localStorage.getItem('userHakAkses') || '[]');
    this.userRole = localStorage.getItem('userRole') || 'user';
    
    console.log('🔐 User Role:', this.userRole);
    console.log('🔐 User Hak Akses:', this.hakAkses);
  }

  init() {
    // ✅ BARU: Filter menu berdasarkan hak akses SEBELUM merender
    this.filterMenuByAccess();
    this.loadSavedLayanan();
    this.attachEventListeners();
  }

  // ✅ BARU: Fungsi untuk mengecek apakah user punya akses ke fitur tertentu
  hasAccess(featureKey) {
    // Jika admin atau memiliki akses wildcard '*', izinkan semua
    if (this.userRole === 'admin' || this.hakAkses.includes('*')) {
      return true;
    }
    // Cek apakah featureKey ada di dalam array hakAkses user
    return this.hakAkses.includes(featureKey);
  }

  // ✅ BARU: Filter dropdown dan konfigurasi berdasarkan hak akses
  filterMenuByAccess() {
    if (!this.layananSelect) return;

    const options = Array.from(this.layananSelect.options);
    
    options.forEach(option => {
      const featureKey = option.value;
      
      // Jangan hapus opsi default (nilai kosong)
      if (featureKey === '') return;

      // Jika user TIDAK punya akses, hapus opsi dari dropdown
      if (!this.hasAccess(featureKey)) {
        option.remove();
        console.log(`⛔ Fitur "${featureKey}" disembunyikan dari user.`);
      } else {
        console.log(`✅ Fitur "${featureKey}" diizinkan untuk user.`);
      }
    });

    // Khusus Control Center: Pastikan masuk ke allConfig jika user punya akses
    if (this.hasAccess('control-center')) {
      Object.assign(this.allConfig, controlCenterFitur);
      console.log('✅ Control Center diaktifkan untuk user ini.');
    }
  }

  loadSavedLayanan() {
    const savedLayanan = localStorage.getItem('layananAktif');
    
    // ✅ BARU: Validasi apakah layanan yang tersimpan masih diizinkan untuk user ini
    if (savedLayanan && this.allConfig[savedLayanan] && this.hasAccess(savedLayanan)) {
      this.layananSelect.value = savedLayanan;
      this.renderFiturInternal(savedLayanan);
      this.showStatus('✅ Layanan aktif: ' + this.layananSelect.options[this.layananSelect.selectedIndex].text, 'success');
    } else {
      // Jika tidak diizinkan atau tidak valid, reset
      localStorage.removeItem('layananAktif');
      this.layananSelect.value = '';
      this.contentArea.innerHTML = '<p style="text-align:center; color:#6b7280; padding:20px;">Silakan pilih dan simpan layanan untuk melihat fitur internal.</p>';
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
    
    // ✅ BARU: Double check keamanan sebelum menyimpan
    if (!this.hasAccess(selected)) {
      this.showStatus('⛔ Anda tidak memiliki izin untuk mengakses layanan ini.', 'error');
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
      const card = document.createElement('a');
      card.href = item.link;
      card.className = 'internal-card';
      
      if (item.isExternal) {
        card.target = '_blank';
        card.rel = 'noopener noreferrer';
      }

      if (item.icon && item.icon.startsWith('http')) {
        card.innerHTML = '<img src="' + item.icon + '" alt="logo" style="width: 32px; height: 32px; margin-right: 8px; object-fit: contain;" onerror="this.style.display=\'none\'; this.nextElementSibling.style.display=\'inline\';"><span style="display:none;">🔗</span> ' + item.nama;
      } else {
        card.innerHTML = (item.icon || '🔗') + ' ' + item.nama;
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
