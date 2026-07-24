// js/controllers/dashboard-controller.js
import { konfigurasiFitur, controlCenterFitur } from '../config/service-menu.js';

// ==========================================
// FUNGSI HELPER: NORMALISASI TEKS (OPSI 2)
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

  injectControlCenterIfAllowed() {
    if (this.isFullAccess || this.hakAksesNormalized.includes('control-center')) {
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
    this.showStatus('️ Tampilan direset. Silakan pilih layanan baru.', 'error');
    
    setTimeout(() => this.clearStatus(), 3000);
  }

  // ✅ REVISI KETAT: Filter sub-fitur berdasarkan hakAkses
  renderFiturInternal(featureKey) {
    this.contentArea.innerHTML = '';

    if (!featureKey || !this.allConfig[featureKey]) {
      this.contentArea.innerHTML = '<p style="text-align:center; color:#6b7280; padding:20px;">Silakan pilih dan simpan layanan untuk melihat fitur internal.</p>';
      return;
    }

    const subFiturList = this.allConfig[featureKey];
    const featureTitle = this.layananSelect.options[this.layananSelect.selectedIndex].text;

    // ✅ FILTER: Hanya ambil sub-fitur yang user punya akses (kecuali full access)
    const allowedSubFitur = this.isFullAccess 
      ? subFiturList 
      : subFiturList.filter(item => {
          const normalizedNama = normalizeString(item.nama);
          return this.hakAksesNormalized.includes(normalizedNama);
        });

    // Jika tidak ada sub-fitur yang diizinkan
    if (allowedSubFitur.length === 0) {
      this.contentArea.innerHTML = `
        <div style="text-align:center; padding:40px; color:#6b7280;">
          <div style="font-size:48px; margin-bottom:16px;">🔒</div>
          <h3 style="color:#374151; margin-bottom:8px;">Akses Ditolak</h3>
          <p>Anda tidak memiliki izin untuk mengakses sub-fitur apapun di bagian "${featureTitle}".</p>
          <p style="font-size:14px; margin-top:16px;">Silakan hubungi administrator untuk meminta akses.</p>
        </div>
      `;
      return;
    }

    const titleEl = document.createElement('h3');
    titleEl.textContent = '📌 Fitur Internal: ' + featureTitle;
    titleEl.style.marginBottom = '16px';
    titleEl.style.color = '#2c3e50';
    titleEl.style.borderBottom = '2px solid #e5e7eb';
    titleEl.style.paddingBottom = '8px';
    this.contentArea.appendChild(titleEl);

    const gridEl = document.createElement('div');
    gridEl.className = 'internal-grid';

    // ✅ HANYA render sub-fitur yang diizinkan
    allowedSubFitur.forEach(item => {
      const card = document.createElement('a');
      card.href = item.link;
      card.className = 'internal-card';
      
      if (item.isExternal) {
        card.target = '_blank';
        card.rel = 'noopener noreferrer';
      }

      let iconHtml = '';
      if (item.icon && item.icon.startsWith('http')) {
        iconHtml = '<img src="' + item.icon + '" alt="logo" style="width: 32px; height: 32px; margin-right: 8px; object-fit: contain;" onerror="this.style.display=\'none\'; this.nextElementSibling.style.display=\'inline\';"><span style="display:none;">🔗</span>';
      } else {
        iconHtml = (item.icon || '🔗') + ' ';
      }

      card.innerHTML = iconHtml + item.nama;
      gridEl.appendChild(card);
    });

    this.contentArea.appendChild(gridEl);
    
    // Tampilkan info berapa sub-fitur yang bisa diakses
    const infoEl = document.createElement('p');
    infoEl.style.textAlign = 'center';
    infoEl.style.color = '#6b7280';
    infoEl.style.fontSize = '12px';
    infoEl.style.marginTop = '16px';
    infoEl.textContent = `Menampilkan ${allowedSubFitur.length} dari ${subFiturList.length} sub-fitur yang tersedia`;
    this.contentArea.appendChild(infoEl);
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
