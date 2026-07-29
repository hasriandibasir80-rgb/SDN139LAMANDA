// modules/profil-user/profil-user.js
// =========================================
// FITUR: PROFIL USER - MODULAR & BERDIRI SENDIRI
// - Tampil sebagai "layanan khusus" di dashboard
// - Edit nama profil
// - Ubah password
// - Auto hide saat layanan lain aktif
// =========================================

import { getAuth, updateProfile, updatePassword, EmailAuthProvider, reauthenticateWithCredential } 
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const auth = getAuth();

const CSS_PATH = '../../css/modules/profil-user.css';
const CSS_ID = 'profil-user-css';

// State
let currentUserData = null;

export async function init() {
  console.log('🚀 Modul Profil User initialized');
  loadCSS();
  
  // Tunggu auth state ready
  auth.onAuthStateChanged((user) => {
    if (user) {
      currentUserData = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || ''
      };
      console.log('✅ User data loaded:', currentUserData.displayName);
      renderProfilButton();
    } else {
      console.warn('⚠️ User tidak login');
    }
  });
}

export function cleanup() {
  // Hapus CSS
  const css = document.getElementById(CSS_ID);
  if (css) css.remove();
  
  // Hapus tombol profil
  const btnContainer = document.getElementById('profilBtnContainer');
  if (btnContainer) btnContainer.remove();
  
  // Hapus container profil
  const profilView = document.getElementById('profilViewContainer');
  if (profilView) profilView.remove();
}

function loadCSS() {
  if (document.getElementById(CSS_ID)) return;
  
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = CSS_PATH;
  link.id = CSS_ID;
  
  link.onerror = () => {
    console.warn('⚠️ CSS profil-user gagal dimuat');
  };
  
  document.head.appendChild(link);
}

/**
 * Render tombol profil dengan nama user
 */
function renderProfilButton() {
  // Jangan render 2x
  if (document.getElementById('profilBtnContainer')) return;
  
  const displayName = currentUserData.displayName || currentUserData.email || 'User';
  
  const btnContainer = document.createElement('div');
  btnContainer.id = 'profilBtnContainer';
  btnContainer.style.cssText = 'margin: 15px 0;';
  
  const btn = document.createElement('button');
  btn.className = 'profil-btn';
  btn.innerHTML = `👤 ${displayName}`;
  btn.onclick = showProfilView;
  
  btnContainer.appendChild(btn);
  
  // Insert setelah userInfo (atau di awal container jika userInfo dihapus)
  const userInfo = document.getElementById('userInfo');
  const logoutBtn = document.getElementById('logoutBtn');
  
  if (userInfo) {
    userInfo.parentNode.insertBefore(btnContainer, logoutBtn);
  } else if (logoutBtn) {
    logoutBtn.parentNode.insertBefore(btnContainer, logoutBtn);
  }
  
  console.log('✅ Tombol profil dirender dengan nama:', displayName);
}

/**
 * Tampilkan tampilan profil khusus
 */
function showProfilView() {
  // Sembunyikan tombol profil
  const btnContainer = document.getElementById('profilBtnContainer');
  if (btnContainer) btnContainer.style.display = 'none';
  
  // Hapus container lama jika ada
  const oldView = document.getElementById('profilViewContainer');
  if (oldView) oldView.remove();
  
  // Buat container profil baru
  const profilView = document.createElement('div');
  profilView.id = 'profilViewContainer';
  profilView.innerHTML = `
    <div class="profil-container">
      <h2>👤 Profil User</h2>
      
      <div class="profil-section">
        <h3>📋 Informasi Akun</h3>
        <div class="form-group">
          <label>🆔 UID</label>
          <input type="text" class="form-control" value="${currentUserData.uid}" disabled>
        </div>
        <div class="form-group">
          <label>📧 Email</label>
          <input type="email" class="form-control" value="${currentUserData.email}" disabled>
        </div>
        <div class="form-group">
          <label>👤 Nama Lengkap</label>
          <input type="text" id="profilNamaInput" class="form-control" value="${currentUserData.displayName || ''}" placeholder="Masukkan nama lengkap">
        </div>
        <div class="profil-actions">
          <button class="btn-profil-save" onclick="window.profilSaveProfile()">💾 Simpan Perubahan</button>
          <button class="btn-profil-close" onclick="window.profilHideView()">✖️ Tutup</button>
        </div>
      </div>
      
      <div class="profil-section password-section">
        <h3>🔑 Ubah Password</h3>
        <div class="alert alert-info">🔒 Untuk keamanan, masukkan password lama Anda sebelum mengubah password.</div>
        <div class="form-group">
          <label>🔑 Password Lama</label>
          <input type="password" id="oldPassword" class="form-control" placeholder="Masukkan password lama">
        </div>
        <div class="form-group">
          <label>🔑 Password Baru</label>
          <input type="password" id="newPassword" class="form-control" placeholder="Min. 6 karakter">
        </div>
        <div class="form-group">
          <label>🔑 Konfirmasi Password Baru</label>
          <input type="password" id="confirmPassword" class="form-control" placeholder="Ulangi password baru">
        </div>
        <div class="profil-actions">
          <button class="btn-profil-save" onclick="window.profilChangePassword()"> Ubah Password</button>
        </div>
      </div>
    </div>
  `;
  
  // Insert setelah tombol profil
  const btnContainer = document.getElementById('profilBtnContainer');
  if (btnContainer) {
    btnContainer.parentNode.insertBefore(profilView, btnContainer.nextSibling);
  }
  
  // Scroll ke profil
  profilView.scrollIntoView({ behavior: 'smooth', block: 'start' });
  
  console.log('✅ Tampilan profil dibuka');
}

/**
 * Sembunyikan tampilan profil
 */
function hideProfilView() {
  const profilView = document.getElementById('profilViewContainer');
  if (profilView) profilView.remove();
  
  const btnContainer = document.getElementById('profilBtnContainer');
  if (btnContainer) btnContainer.style.display = 'block';
  
  console.log('✅ Tampilan profil ditutup');
}

/**
 * Simpan perubahan profil
 */
async function saveProfile() {
  const user = auth.currentUser;
  if (!user) {
    showToast('❌ User tidak login!', 'error');
    return;
  }
  
  const nama = document.getElementById('profilNamaInput').value.trim();
  
  if (!nama) {
    showToast('️ Nama lengkap harus diisi!', 'error');
    return;
  }
  
  try {
    await updateProfile(user, { displayName: nama });
    
    // Update localStorage
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    currentUser.displayName = nama;
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    
    // Update state
    currentUserData.displayName = nama;
    
    showToast('✅ Profil berhasil diupdate!', 'success');
    
    // Refresh halaman untuk update tombol dengan nama baru
    setTimeout(() => location.reload(), 1500);
    
  } catch (error) {
    console.error('❌ Gagal update profil:', error);
    showToast('❌ Gagal update profil: ' + error.message, 'error');
  }
}

/**
 * Ubah password
 */
async function changePassword() {
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
    
    showToast('✅ Password berhasil diubah! Silakan login ulang.', 'success');
    
    // Clear form
    document.getElementById('oldPassword').value = '';
    document.getElementById('newPassword').value = '';
    document.getElementById('confirmPassword').value = '';
    
    setTimeout(async () => {
      await auth.signOut();
      window.location.href = 'index.html';
    }, 2000);
    
  } catch (error) {
    console.error('❌ Gagal ubah password:', error);
    
    if (error.code === 'auth/wrong-password') {
      showToast(' Password lama salah!', 'error');
    } else if (error.code === 'auth/weak-password') {
      showToast('⚠️ Password terlalu lemah!', 'error');
    } else {
      showToast('❌ Gagal ubah password: ' + error.message, 'error');
    }
  }
}

/**
 * Sembunyikan profil saat layanan aktif
 */
export function hideOnServiceActive() {
  const btnContainer = document.getElementById('profilBtnContainer');
  const profilView = document.getElementById('profilViewContainer');
  
  if (btnContainer) btnContainer.style.display = 'none';
  if (profilView) profilView.style.display = 'none';
  
  console.log(' Profil disembunyikan (layanan aktif)');
}

/**
 * Tampilkan profil saat tidak ada layanan
 */
export function showOnNoService() {
  const btnContainer = document.getElementById('profilBtnContainer');
  const profilView = document.getElementById('profilViewContainer');
  
  if (btnContainer) btnContainer.style.display = 'block';
  if (profilView) profilView.style.display = 'none';
  
  console.log('🔓 Profil ditampilkan (tidak ada layanan)');
}

/**
 * Toast notification
 */
function showToast(message, type = 'success') {
  const existing = document.querySelector('.toast-notification');
  if (existing) existing.remove();
  
  const toast = document.createElement('div');
  toast.className = `toast-notification ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// Expose functions ke window untuk onclick handler
window.profilSaveProfile = saveProfile;
window.profilChangePassword = changePassword;
window.profilHideView = hideProfilView;
