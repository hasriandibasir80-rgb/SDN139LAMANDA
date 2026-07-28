// modules/profil-user/profil-user.js
// =========================================
// FITUR: PROFIL USER & UBAH PASSWORD
// - Edit Profil (Nama, No HP)
// - Ubah Password
// - Integrasi Firebase Auth
// =========================================

import { getAuth, updateProfile, updatePassword, EmailAuthProvider, reauthenticateWithCredential, sendPasswordResetEmail } 
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getDatabase, ref, get, set } 
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const auth = getAuth();
const database = getDatabase();

const CSS_PATH = '../../../css/modules/profil-user.css';
const CSS_ID = 'profil-user-css';

export async function init() {
  loadCSS();
  attachEvents();
}

export function cleanup() {
  const css = document.getElementById(CSS_ID);
  if (css) css.remove();
  
  // Remove modal jika ada
  const modal = document.getElementById('profilModal');
  if (modal) modal.remove();
}

function loadCSS() {
  if (document.getElementById(CSS_ID)) return;
  
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = CSS_PATH;
  link.id = CSS_ID;
  
  link.onerror = () => {
    console.warn('⚠️ CSS eksternal gagal');
    const style = document.createElement('style');
    style.id = CSS_ID + '-inline';
    style.textContent = getInlineCSS();
    document.head.appendChild(style);
  };
  
  document.head.appendChild(link);
}

function getInlineCSS() {
  return `
    .profil-btn {
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 600;
      transition: all 0.2s;
      margin-left: 10px;
    }
    .profil-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
    }
    .profil-btn.password {
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
    }
    .profil-btn.password:hover {
      box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);
    }
    
    /* Modal Styles */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.6);
      z-index: 10000;
      display: flex;
      justify-content: center;
      align-items: center;
      backdrop-filter: blur(4px);
    }
    .modal-content {
      background: white;
      border-radius: 16px;
      padding: 30px;
      max-width: 500px;
      width: 90%;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      animation: modalSlideIn 0.3s ease;
    }
    @keyframes modalSlideIn {
      from { transform: translateY(-50px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    .modal-header {
      font-size: 22px;
      font-weight: 700;
      color: #1e293b;
      margin-bottom: 20px;
      border-bottom: 3px solid #e2e8f0;
      padding-bottom: 10px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .modal-body {
      margin-bottom: 25px;
    }
    .form-group {
      margin-bottom: 18px;
    }
    .form-group label {
      display: block;
      margin-bottom: 8px;
      font-weight: 600;
      font-size: 14px;
      color: #475569;
    }
    .form-control {
      width: 100%;
      padding: 12px 16px;
      border: 2px solid #e2e8f0;
      border-radius: 8px;
      font-size: 15px;
      box-sizing: border-box;
      transition: all 0.2s;
    }
    .form-control:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }
    .form-control:disabled {
      background: #f1f5f9;
      cursor: not-allowed;
    }
    .modal-footer {
      display: flex;
      gap: 10px;
      justify-content: flex-end;
    }
    .btn-modal {
      padding: 12px 24px;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 15px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-modal-save {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
    }
    .btn-modal-save:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
    }
    .btn-modal-cancel {
      background: #64748b;
      color: white;
    }
    .btn-modal-cancel:hover {
      background: #475569;
    }
    .user-info-box {
      background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
      border-left: 4px solid #3b82f6;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    .user-info-box strong {
      color: #0369a1;
    }
    .alert {
      padding: 12px 16px;
      border-radius: 8px;
      margin-bottom: 15px;
      font-size: 14px;
    }
    .alert-success {
      background: #d1fae5;
      color: #065f46;
      border-left: 4px solid #10b981;
    }
    .alert-error {
      background: #fee2e2;
      color: #991b1b;
      border-left: 4px solid #ef4444;
    }
    .alert-info {
      background: #dbeafe;
      color: #1e40af;
      border-left: 4px solid #3b82f6;
    }
    @media (max-width: 600px) {
      .modal-content { padding: 20px; }
      .modal-header { font-size: 18px; }
      .modal-footer { flex-direction: column; }
      .btn-modal { width: 100%; }
    }
  `;
}

function attachEvents() {
  // Event listeners akan di-attach saat tombol diklik
}

/**
 * Tampilkan Tombol Edit Profil di Dashboard
 */
export function showEditProfileButtons() {
  // Cari box info user di dashboard
  const userInfoBox = document.querySelector('.user-info-box') || 
                      document.querySelector('[id*="user"]') ||
                      document.querySelector('div[class*="user"]');
  
  if (!userInfoBox) {
    console.warn('⚠️ User info box tidak ditemukan');
    return;
  }
  
  // Tambah tombol Edit Profil
  const editBtn = document.createElement('button');
  editBtn.className = 'profil-btn';
  editBtn.innerHTML = '✏️ Edit Profil';
  editBtn.onclick = openEditProfileModal;
  
  // Tambah tombol Ubah Password
  const passwordBtn = document.createElement('button');
  passwordBtn.className = 'profil-btn password';
  passwordBtn.innerHTML = '🔑 Ubah Password';
  passwordBtn.onclick = openChangePasswordModal;
  
  // Insert setelah user info box
  const buttonContainer = document.createElement('div');
  buttonContainer.style.marginTop = '15px';
  buttonContainer.style.display = 'flex';
  buttonContainer.style.gap = '10px';
  buttonContainer.style.flexWrap = 'wrap';
  buttonContainer.appendChild(editBtn);
  buttonContainer.appendChild(passwordBtn);
  
  userInfoBox.parentNode.insertBefore(buttonContainer, userInfoBox.nextSibling);
  
  console.log('✅ Tombol profil berhasil ditambahkan');
}

/**
 * Buka Modal Edit Profil
 */
window.openEditProfileModal = function() {
  const user = auth.currentUser;
  if (!user) {
    showToast(' User tidak login!', 'error');
    return;
  }
  
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'profilModal';
  
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        👤 Edit Profil User
      </div>
      <div class="modal-body">
        <div class="alert alert-info">
          💡 Update informasi profil Anda di bawah ini.
        </div>
        <div class="form-group">
          <label>📧 Email (Tidak dapat diubah)</label>
          <input type="email" id="profilEmail" class="form-control" value="${user.email}" disabled>
        </div>
        <div class="form-group">
          <label>👤 Nama Lengkap</label>
          <input type="text" id="profilNama" class="form-control" placeholder="Masukkan nama lengkap" value="${user.displayName || ''}">
        </div>
        <div class="form-group">
          <label>📱 Nomor HP / WhatsApp</label>
          <input type="tel" id="profilHp" class="form-control" placeholder="08xx-xxxx-xxxx" value="">
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-modal btn-modal-cancel" onclick="closeModal()">Batal</button>
        <button class="btn-modal btn-modal-save" onclick="saveProfile()">💾 Simpan Perubahan</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Load data tambahan dari database
  loadUserData(user.uid);
}

/**
 * Buka Modal Ubah Password
 */
window.openChangePasswordModal = function() {
  const user = auth.currentUser;
  if (!user) {
    showToast('❌ User tidak login!', 'error');
    return;
  }
  
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'profilModal';
  
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        🔑 Ubah Password
      </div>
      <div class="modal-body">
        <div class="alert alert-info">
          🔒 Untuk keamanan, masukkan password lama Anda sebelum mengubah password.
        </div>
        <div class="form-group">
          <label>🔑 Password Lama</label>
          <input type="password" id="oldPassword" class="form-control" placeholder="Masukkan password lama">
        </div>
        <div class="form-group">
          <label>🔑 Password Baru</label>
          <input type="password" id="newPassword" class="form-control" placeholder="Masukkan password baru (min. 6 karakter)">
        </div>
        <div class="form-group">
          <label>🔑 Konfirmasi Password Baru</label>
          <input type="password" id="confirmPassword" class="form-control" placeholder="Ulangi password baru">
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-modal btn-modal-cancel" onclick="closeModal()">Batal</button>
        <button class="btn-modal btn-modal-save" onclick="changePassword()">🔑 Ubah Password</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
}

/**
 * Tutup Modal
 */
window.closeModal = function() {
  const modal = document.getElementById('profilModal');
  if (modal) {
    modal.remove();
  }
}

/**
 * Load Data User dari Database
 */
async function loadUserData(uid) {
  try {
    const snapshot = await get(ref(database, `users/${uid}`));
    if (snapshot.exists()) {
      const data = snapshot.val();
      if (data.noHP) {
        document.getElementById('profilHp').value = data.noHP;
      }
    }
  } catch (error) {
    console.error('❌ Gagal load data user:', error);
  }
}

/**
 * Simpan Perubahan Profil
 */
window.saveProfile = async function() {
  const user = auth.currentUser;
  if (!user) {
    showToast('❌ User tidak login!', 'error');
    return;
  }
  
  const nama = document.getElementById('profilNama').value.trim();
  const noHP = document.getElementById('profilHp').value.trim();
  
  if (!nama) {
    showToast('️ Nama lengkap harus diisi!', 'error');
    return;
  }
  
  try {
    // Update Firebase Auth Profile
    await updateProfile(user, {
      displayName: nama
    });
    
    // Update data tambahan di Realtime Database
    await set(ref(database, `users/${uid}`), {
      uid: user.uid,
      email: user.email,
      displayName: nama,
      noHP: noHP,
      updatedAt: Date.now()
    });
    
    showToast('✅ Profil berhasil diupdate!');
    closeModal();
    
    // Refresh tampilan jika perlu
    setTimeout(() => {
      location.reload();
    }, 1500);
    
  } catch (error) {
    console.error('❌ Gagal update profil:', error);
    showToast('❌ Gagal update profil: ' + error.message, 'error');
  }
}

/**
 * Ubah Password
 */
window.changePassword = async function() {
  const user = auth.currentUser;
  if (!user) {
    showToast('❌ User tidak login!', 'error');
    return;
  }
  
  if (!user.email) {
    showToast('❌ Email user tidak ditemukan!', 'error');
    return;
  }
  
  const oldPassword = document.getElementById('oldPassword').value;
  const newPassword = document.getElementById('newPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;
  
  // Validasi
  if (!oldPassword || !newPassword || !confirmPassword) {
    showToast('⚠️ Semua field harus diisi!', 'error');
    return;
  }
  
  if (newPassword.length < 6) {
    showToast('⚠️ Password baru minimal 6 karakter!', 'error');
    return;
  }
  
  if (newPassword !== confirmPassword) {
    showToast('❌ Password baru tidak cocok!', 'error');
    return;
  }
  
  try {
    // Reauthenticate user dengan password lama
    const credential = EmailAuthProvider.credential(user.email, oldPassword);
    await reauthenticateWithCredential(user, credential);
    
    // Update password
    await updatePassword(user, newPassword);
    
    showToast('✅ Password berhasil diubah! Silakan login ulang dengan password baru.');
    closeModal();
    
    // Logout setelah 2 detik
    setTimeout(async () => {
      await auth.signOut();
      window.location.href = 'index.html';
    }, 2000);
    
  } catch (error) {
    console.error('❌ Gagal ubah password:', error);
    
    if (error.code === 'auth/wrong-password') {
      showToast('❌ Password lama salah!', 'error');
    } else if (error.code === 'auth/weak-password') {
      showToast(' Password terlalu lemah!', 'error');
    } else {
      showToast('❌ Gagal ubah password: ' + error.message, 'error');
    }
  }
}

/**
 * Lupa Password (untuk halaman login)
 */
export async function forgotPassword(email) {
  if (!email) {
    throw new Error('Email harus diisi!');
  }
  
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true, message: 'Email reset password telah dikirim!' };
  } catch (error) {
    console.error('❌ Gagal kirim email reset:', error);
    throw error;
  }
}

/**
 * Show Toast Notification
 */
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${type === 'error' ? '#ef4444' : '#10b981'};
    color: white;
    padding: 14px 24px;
    border-radius: 10px;
    z-index: 10001;
    font-weight: 600;
    box-shadow: 0 4px 16px rgba(0,0,0,0.2);
    animation: slideIn 0.3s ease;
  `;
  
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from { transform: translateX(400px); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  `;
  document.head.appendChild(style);
  
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
