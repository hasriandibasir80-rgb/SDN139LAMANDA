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
  }

  init() {
    this.injectControlCenterIfAdmin();
    this.loadSavedLayanan();
    this.attachEventListeners();
  }

  injectControlCenterIfAdmin() {
    const userRole = localStorage.getItem('userRole');
    if (userRole === 'admin') {
      const newOption = document.createElement('option');
      newOption.value = 'control-center';
      newOption.textContent = '🛡️ Control Center (Admin)';
      this.layananSelect.appendChild(newOption);
      
      Object.assign(this.allConfig, controlCenterFitur);
      console.log('✅ Control Center diaktifkan untuk Admin');
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
    this.contentArea.innerHTML = '';
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

      if (item.icon.startsWith('http')) {
        card.innerHTML = '<img src="' + item.icon + '" alt="logo" style="width: 32px; height: 32px; margin-right: 8px; object-fit: contain;" onerror="this.style.display=\'none\'; this.nextElementSibling.style.display=\'inline\';"><span style="display:none;">🔗</span> ' + item.nama;
      } else {
        card.innerHTML = item.icon + ' ' + item.nama;
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
