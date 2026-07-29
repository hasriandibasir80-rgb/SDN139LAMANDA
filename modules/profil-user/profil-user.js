// modules/profil-user/profil-user.js
// =========================================
// FITUR: PROFIL USER & UBAH PASSWORD
// Versi: Simple & Robust
// =========================================

import { getAuth, updateProfile, updatePassword, EmailAuthProvider, reauthenticateWithCredential, sendPasswordResetEmail } 
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getDatabase, ref, get, set } 
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const auth = getAuth();
const database = getDatabase();

export async function init() {
  console.log('✅ Modul Profil User initialized');
  loadCSS();
}

export function cleanup() {
  const css = document.getElementById('profil-user-css');
  if (css) css.remove();
  
  const modal = document.getElementById('profilModal');
  if (modal) modal.remove();
}

function loadCSS() {
  if (document.getElementById('profil-user-css')) return;
  
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'css/modules/profil-user.css';
  link.id = 'profil-user-css';
  
  link.onerror = () => {
    console.warn('⚠️ CSS profil-user gagal dimuat, menggunakan inline CSS');
    const style = document.createElement('style');
    style.id = 'profil-user-css-inline';
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
      padding: 10px 20px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
      transition: all 0.2s;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      margin: 5px;
    }
    .profil-btn:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4); }
    .profil-btn.password { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); }
    .profil-btn.password:hover { box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4); }
    .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 10000; display: flex; justify-content: center; align-items: center; }
    .modal-content { background: white; border-radius: 16px; padding: 30px; max-width: 500px; width: 90%; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
    .modal-header { font-size: 22px; font-weight: 700; color: #1e293b; margin-bottom: 20px; border-bottom: 3px solid #fce7f3; padding-bottom: 12px; }
    .form-group { margin-bottom: 18px; }
    .form-group label { display: block; margin-bottom: 8px; font-weight: 600; font-size: 14px; color: #475569; }
    .form-control { width: 100%; padding: 12px 16px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 15px; box-sizing: border-box; }
    .form-control:focus { outline: none; border-color: #3b82f6; }
    .form-control:disabled { background: #f1f5f9; cursor: not-allowed; }
    .modal-footer { display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px; }
    .btn-modal { padding: 12px 24px; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; }
    .btn-modal-save { background: #10b981; color: white; }
    .btn-modal-cancel { background: #64748b; color: white; }
    .alert { padding: 12px 16px; border-radius: 8px; margin-bottom: 15px; font-size: 14px; }
    .alert-info { background: #dbeafe; color: #1e40af; border-left: 4px solid #3b82f6; }
  `;
}

/**
 * Tampilkan Tombol Edit Profil di Dashboard
 */
export function showEditProfileButtons() {
  console.log('🔍 Mencari element #userInfo...');
  
  const userInfoBox = document.getElementById('userInfo');
  
  if (!userInfoBox) {
    console.error(' Element #userInfo TIDAK DITEMUKAN di dashboard');
    return;
  }
  
  console.log('✅ Element #userInfo ditemukan');
  
  // Cek apakah tombol sudah ada
  if (document.getElementById('profilButtonsContainer')) {
    console.log('⚠️ Tombol profil sudah ada, skip');
    return;
  }
  
  // Buat container untuk tombol
  const buttonContainer = document.createElement('div');
  buttonContainer.id = 'profilButtonsContainer';
  buttonContainer.style.cssText = 'display: flex; gap: 10px; margin: 15px 0; flex-wrap: wrap;';
  
  // Tombol Edit Profil
  const editBtn = document.createElement('button');
  editBtn.className = 'profil-btn';
  editBtn.innerHTML = '✏️ Edit Profil';
  editBtn.onclick = openEditProfileModal;
  
  // Tombol Ubah Password
  const passwordBtn = document.createElement('button');
  passwordBtn.className = 'profil-btn password';
  passwordBtn.innerHTML = ' Ubah Password';
  passwordBtn.onclick = openChangePasswordModal;
  
  buttonContainer.appendChild(editBtn);
  buttonContainer.appendChild(passwordBtn);
  
  // Insert setelah userInfo, sebelum logout button
  const logoutBtn = document.getElementById('logoutBtn');
  
  if (logoutBtn) {
    userInfoBox.parentNode.insertBefore(buttonContainer, logoutBtn);
    console.log('✅ Tombol profil berhasil ditambahkan sebelum tombol Logout');
  } else {
    userInfoBox.parentNode.appendChild(buttonContainer);
    console.log('✅ Tombol profil berhasil ditambahkan (fallback)');
  }
}

/**
 * Buka Modal Edit Profil
 */
window.openEditProfileModal = function() {
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
      <div class="modal-header">👤 Edit Profil User</div>
      <div class="modal-body">
        <div class="alert alert-info">💡 Update informasi profil Anda di bawah ini.</div>
        <div class="form-group">
          <label>📧 Email (Tidak dapat diubah)</label>
          <input type="email" id="profilEmail" class="form-control" value="${user.email}" disabled>
        </div>
        <div class="form-group">
          <label> Nama Lengkap</label>
          <input type="text" id="profilNama" class="form-control" placeholder="Masukkan nama lengkap" value="${user.displayName || ''}">
        </div>
        <div class="form-group">
          <label> Nomor HP / WhatsApp</label>
          <input type="tel" id="profilHp" class="form-control" placeholder="08xx-xxxx-xxxx">
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-modal btn-modal-cancel" onclick="closeModal()">Batal</button>
        <button class="btn-modal btn-modal-save" onclick="saveProfile()">💾 Simpan Perubahan</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Load data dari database
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
      <div class="modal-header">🔑 Ubah Password</div>
      <div class="modal-body">
        <div class="alert alert-info">🔒 Untuk keamanan, masukkan password lama Anda sebelum mengubah password.</div>
        <div class="form-group">
          <label> Password Lama</label>
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
        <button class="btn-modal btn-modal-save" onclick="changePassword()"> Ubah Password</button>
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
    console.log('✅ Modal ditutup');
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
        const hpInput = document.getElementById('profilHp');
        if (hpInput) hpInput.value = data.noHP;
      }
    }
  } catch (error) {
    console.error(' Gagal load data user:', error);
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
    showToast('⚠️ Nama lengkap harus diisi!', 'error');
    return;
  }
  
  try {
    // Update Firebase Auth Profile
    await updateProfile(user, {
      displayName: nama
    });
    
    // Update data di Realtime Database
    await set(ref(database, `users/${user.uid}`), {
      uid: user.uid,
      email: user.email,
      displayName: nama,
      noHP: noHP,
      updatedAt: Date.now()
    });
    
    showToast('✅ Profil berhasil diupdate!');
    closeModal();
    
    // Update tampilan
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
    const credential = EmailAuthProvider.credential(user.email, oldPassword);
    await reauthenticateWithCredential(user, credential);
    await updatePassword(user, newPassword);
    
    showToast('✅ Password berhasil diubah! Silakan login ulang.');
    closeModal();
    
    setTimeout(async () => {
      await auth.signOut();
      window.location.href = 'index.html';
    }, 2000);
    
  } catch (error) {
    console.error(' Gagal ubah password:', error);
    
    if (error.code === 'auth/wrong-password') {
      showToast('❌ Password lama salah!', 'error');
    } else if (error.code === 'auth/weak-password') {
      showToast('⚠️ Password terlalu lemah!', 'error');
    } else {
      showToast('❌ Gagal ubah password: ' + error.message, 'error');
    }
  }
}

/**
 * Lupa Password
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
  `;
  
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}
