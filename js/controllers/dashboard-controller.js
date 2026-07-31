// js/controllers/dashboard-controller.js - VERSI UPDATE DENGAN RESET PASSWORD
import { konfigurasiFitur, controlCenterFitur } from '../config/service-menu.js';

function normalizeString(str) {
  if (!str) return '';
  return str.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
}

export class DashboardController {
  constructor() {
    this.layananSelect = document.getElementById('layananSelect');
    this.saveLayananBtn = document.getElementById('saveLayananBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.statusEl = document.getElementById('status');
    this.contentArea = document.getElementById('contentArea');
    this.userNameEl = document.getElementById('userNameDisplay'); // <- ID untuk nama user
    
    this.allConfig = { ...konfigurasiFitur };
    const hakAksesRaw = JSON.parse(localStorage.getItem('userHakAkses') || '[]');
    this.hakAksesNormalized = hakAksesRaw.map(item => normalizeString(item));
    this.isFullAccess = this.hakAksesNormalized.includes('*') || localStorage.getItem('userRole') === 'admin';
  }

  init() {
    this.injectUserActions(); // <--- FITUR BARU: inject tombol reset
    this.injectControlCenterIfAllowed();
    this.injectResetPasswordModal(); // <--- FITUR BARU: inject modal
    this.loadSavedLayanan();
    this.attachEventListeners();
    this.displayUserName();
  }

  // ==========================================
  // FITUR BARU: TAMPILKAN NAMA USER + TOMBOL RESET DI SAMPING USER
  // ==========================================
  displayUserName() {
    const username = localStorage.getItem('userName') || localStorage.getItem('username') || 'andi';
    if (this.userNameEl) {
      this.userNameEl.textContent = username;
    }
  }

  injectUserActions() {
    // Cari container tempat tombol user berada (dari screenshot)
    // Kita akan cari elemen biru "andi" dan bungkus dengan flex
    const userBtn = document.querySelector('.btn-user') || document.getElementById('userNameDisplay')?.parentElement;
    
    // Jika struktur HTML belum ada wrapper, kita buat wrapper otomatis
    const headerArea = document.querySelector('.dashboard-header') || document.body;
    
    // Buat container aksi user jika belum ada
    let actionContainer = document.getElementById('userActionContainer');
    if (!actionContainer) {
      actionContainer = document.createElement('div');
      actionContainer.id = 'userActionContainer';
      actionContainer.style.cssText = 'display:flex; gap:10px; align-items:center; margin-bottom:12px; flex-wrap:wrap;';
      
      // Pindahkan tombol user yang ada ke dalam container ini jika ada
      const existingUserEl = document.getElementById('userNameDisplay');
      if (existingUserEl && existingUserEl.parentElement.id !== 'userActionContainer') {
        // Sisipkan container sebelum tombol logout
        const logoutBtn = document.querySelector('[onclick*="logout"]') || document.getElementById('logoutBtn');
        if (logoutBtn && logoutBtn.parentNode) {
          logoutBtn.parentNode.insertBefore(actionContainer, logoutBtn);
          // Pindahkan tombol user ke dalam
          if(existingUserEl.parentElement.classList.contains('btn-user')) {
             actionContainer.appendChild(existingUserEl.parentElement);
          }
        }
      }
    }

    // Buat tombol Reset Password jika belum ada
    if (!document.getElementById('btnResetPassword')) {
      const resetPassBtn = document.createElement('button');
      resetPassBtn.id = 'btnResetPassword';
      resetPassBtn.innerHTML = '🔑 Reset Password';
      resetPassBtn.style.cssText = 'background:#f59e0b; color:white; padding:10px 18px; border:none; border-radius:8px; font-weight:600; cursor:pointer; font-size:14px; transition:0.2s;';
      resetPassBtn.onmouseenter = () => resetPassBtn.style.background = '#d97706';
      resetPassBtn.onmouseleave = () => resetPassBtn.style.background = '#f59e0b';
      resetPassBtn.onclick = () => this.bukaModalReset();
      
      actionContainer.appendChild(resetPassBtn);

      // Pastikan container ada di DOM
      const logoutBtn = document.querySelector('[onclick*="logout"]') || document.getElementById('logoutBtn') || document.querySelector('.logout-btn');
      if (logoutBtn && !document.getElementById('userActionContainer')) {
        logoutBtn.parentNode.insertBefore(actionContainer, logoutBtn);
      }
    }
  }

  // ==========================================
  // FITUR BARU: MODAL RESET PASSWORD
  // ==========================================
  injectResetPasswordModal() {
    if (document.getElementById('modalReset')) return;

    const modalHTML = `
    <div id="modalReset" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.5); z-index:9999; justify-content:center; align-items:center; padding:16px;">
      <div style="background:white; padding:24px; border-radius:16px; width:100%; max-width:420px; box-shadow:0 10px 30px rgba(0,0,0,0.2);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
          <h3 style="margin:0; font-size:18px;">🔑 Reset Password</h3>
          <button id="closeModalReset" style="background:#f3f4f6; border:none; width:32px; height:32px; border-radius:50%; cursor:pointer;">✕</button>
        </div>
        <p style="font-size:13px; color:#6b7280; margin:0 0 16px 0;">Masukkan password lama dan password baru Anda.</p>
        
        <label style="font-size:13px; font-weight:600;">Password Lama</label>
        <input type="password" id="oldPass" placeholder="Password lama" style="width:100%; padding:10px 12px; margin:6px 0 14px 0; border-radius:8px; border:1px solid #d1d5db;">

        <label style="font-size:13px; font-weight:600;">Password Baru (min. 6 karakter)</label>
        <input type="password" id="newPass" placeholder="Password baru" style="width:100%; padding:10px 12px; margin:6px 0 14px 0; border-radius:8px; border:1px solid #d1d5db;">

        <label style="font-size:13px; font-weight:600;">Konfirmasi Password Baru</label>
        <input type="password" id="confirmPass" placeholder="Ulangi password baru" style="width:100%; padding:10px 12px; margin:6px 0 16px 0; border-radius:8px; border:1px solid #d1d5db;">

        <p id="msgReset" style="margin:0 0 12px 0; font-size:13px; min-height:18px;"></p>

        <div style="display:flex; gap:10px;">
          <button id="btnProsesReset" style="flex:1; background:#10b981; color:white; border:none; padding:12px; border-radius:8px; font-weight:700; cursor:pointer;">Simpan Password</button>
          <button id="btnBatalReset" style="flex:1; background:#e5e7eb; color:#374151; border:none; padding:12px; border-radius:8px; font-weight:700; cursor:pointer;">Batal</button>
        </div>
      </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Event listeners modal
    document.getElementById('closeModalReset').onclick = () => this.tutupModalReset();
    document.getElementById('btnBatalReset').onclick = () => this.tutupModalReset();
    document.getElementById('btnProsesReset').onclick = () => this.prosesResetPassword();
    document.getElementById('modalReset').onclick = (e) => {
      if (e.target.id === 'modalReset') this.tutupModalReset();
    };
  }

  bukaModalReset() {
    document.getElementById('modalReset').style.display = 'flex';
  }

  tutupModalReset() {
    document.getElementById('modalReset').style.display = 'none';
    document.getElementById('msgReset').textContent = '';
    ['oldPass','newPass','confirmPass'].forEach(id => document.getElementById(id).value = '');
  }

  prosesResetPassword() {
    const oldPass = document.getElementById('oldPass').value.trim();
    const newPass = document.getElementById('newPass').value.trim();
    const confirmPass = document.getElementById('confirmPass').value.trim();
    const msg = document.getElementById('msgReset');

    const username = localStorage.getItem('userName') || localStorage.getItem('username') || 'andi';

    if (!oldPass || !newPass || !confirmPass) {
      msg.style.color = '#ef4444';
      msg.textContent = '⚠️ Semua field wajib diisi!';
      return;
    }
    if (newPass.length < 6) {
      msg.style.color = '#ef4444';
      msg.textContent = '⚠️ Password baru minimal 6 karakter!';
      return;
    }
    if (newPass !== confirmPass) {
      msg.style.color = '#ef4444';
      msg.textContent = '⚠️ Konfirmasi password tidak sama!';
      return;
    }

    // --- LOGIKA 1: CEK VIA localStorage (Untuk Github Pages) ---
    // Sesuaikan key ini dengan sistem login kamu
    // Contoh: kamu simpan di localStorage 'dataUsers' atau 'usersList'
    let users = JSON.parse(localStorage.getItem('dataUsers') || localStorage.getItem('users') || '[]');
    let currentUser = JSON.parse(localStorage.getItem('userLogin') || 'null');
    
    // Jika ada array users
    if (users.length > 0) {
      const idx = users.findIndex(u => u.username === username || u.email === username);
      if (idx === -1) {
        msg.style.color = '#ef4444';
        msg.textContent = '❌ User tidak ditemukan di localStorage';
        return;
      }
      if (users[idx].password !== oldPass) {
        msg.style.color = '#ef4444';
        msg.textContent = '❌ Password lama salah!';
        return;
      }
      users[idx].password = newPass;
      localStorage.setItem('dataUsers', JSON.stringify(users));
      localStorage.setItem('users', JSON.stringify(users));
      
      msg.style.color = '#10b981';
      msg.textContent = '✅ Password berhasil diubah!';
      setTimeout(() => {
        this.tutupModalReset();
        alert('Password berhasil di-reset. Silakan login ulang dengan password baru.');
        // opsional: logout
        // window.location.href = 'index.html';
      }, 1000);
      return;
    }

    // --- LOGIKA 2: FALLBACK JIKA PAKAI SINGLE USER (localStorage sederhana) ---
    // Jika kamu cuma simpan password di 'userPassword'
    const storedPass = localStorage.getItem('userPassword') || localStorage.getItem('password');
    if (storedPass) {
      if (storedPass !== oldPass) {
        msg.style.color = '#ef4444';
        msg.textContent = '❌ Password lama salah!';
        return;
      }
      localStorage.setItem('userPassword', newPass);
      localStorage.setItem('password', newPass);
      msg.style.color = '#10b981';
      msg.textContent = '✅ Password berhasil diubah!';
      setTimeout(() => this.tutupModalReset(), 1000);
      return;
    }

    // --- LOGIKA 3: JIKA SUDAH PAKAI BACKEND / GOOGLE APPS SCRIPT ---
    // Uncomment dan ganti URL jika kamu punya API
    /*
    fetch('https://script.google.com/macros/s/YOUR_ID/exec?action=resetPassword', {
      method: 'POST',
      body: JSON.stringify({ username, oldPassword: oldPass, newPassword: newPass })
    })
    .then(r => r.json())
    .then(res => {
      if(res.success) {
        msg.style.color = '#10b981';
        msg.textContent = '✅ ' + res.message;
      } else {
        msg.style.color = '#ef4444';
        msg.textContent = '❌ ' + res.message;
      }
    });
    */

    // Jika tidak ada data user sama sekali (untuk demo di GitHub Pages)
    // Kita anggap berhasil untuk UI
    msg.style.color = '#10b981';
    msg.textContent = '✅ Password berhasil diubah! (Mode Demo - localStorage)';
    console.log(`[DEMO] Reset password untuk ${username}: ${oldPass} -> ${newPass}`);
    localStorage.setItem('userPassword', newPass);
    setTimeout(() => this.tutupModalReset(), 1000);
  }

  // ==========================================
  // FUNGSI LAMA (TETAP)
  // ==========================================
  injectControlCenterIfAllowed() {
    if (this.isFullAccess || this.hakAksesNormalized.includes('control-center')) {
      if (!this.layananSelect.querySelector('option[value="control-center"]')) {
        const newOption = document.createElement('option');
        newOption.value = 'control-center';
        newOption.textContent = '🛡️ Control Center (Admin)';
        this.layananSelect.appendChild(newOption);
        Object.assign(this.allConfig, controlCenterFitur);
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

  renderFiturInternal(featureKey) {
    this.contentArea.innerHTML = '';
    if (!featureKey || !this.allConfig[featureKey]) {
      this.contentArea.innerHTML = '<p style="text-align:center; color:#6b7280; padding:20px;">Silakan pilih dan simpan layanan untuk melihat fitur internal.</p>';
      return;
    }
    const subFiturList = this.allConfig[featureKey];
    const featureTitle = this.layananSelect.options[this.layananSelect.selectedIndex].text;
    const mainFeatureNormalized = normalizeString(featureTitle);
    const hasMainFeatureAccess = this.hakAksesNormalized.includes(mainFeatureNormalized);
    const allowedSubFitur = this.isFullAccess || hasMainFeatureAccess ? subFiturList : subFiturList.filter(item => this.hakAksesNormalized.includes(normalizeString(item.nama)));

    if (allowedSubFitur.length === 0) {
      this.contentArea.innerHTML = `<div style="text-align:center; padding:40px; color:#6b7280;"><div style="font-size:48px; margin-bottom:16px;">🔒</div><h3 style="color:#374151;">Akses Ditolak</h3><p>Anda tidak memiliki izin untuk "${featureTitle}".</p></div>`;
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
    allowedSubFitur.forEach(item => {
      const card = document.createElement('a');
      card.href = item.link;
      card.className = 'internal-card';
      if (item.isExternal) { card.target = '_blank'; card.rel = 'noopener noreferrer'; }
      let iconHtml = '';
      if (item.icon && item.icon.startsWith('http')) {
        iconHtml = '<img src="' + item.icon + '" alt="logo" style="width: 32px; height: 32px; margin-right: 8px; object-fit: contain;">';
      } else { iconHtml = (item.icon || '🔗') + ' '; }
      card.innerHTML = iconHtml + item.nama;
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
