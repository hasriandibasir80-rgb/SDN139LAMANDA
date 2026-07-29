// modules/profil-user/profil-user.js
// =========================================
// FITUR: PROFIL USER - DENGAN DATA LENGKAP & MODE EDIT
// =========================================

import { getAuth, updateProfile } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getDatabase, ref, get, set } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const auth = getAuth();
const db = getDatabase();
let currentUserData = {};
let isEditing = false;

export async function init() {
  console.log('🚀 Modul Profil User initialized');
  loadCSS();
  
  auth.onAuthStateChanged(async (user) => {
    if (user) {
      currentUserData.uid = user.uid;
      currentUserData.email = user.email;
      currentUserData.displayName = user.displayName || '';
      
      // Ambil data tambahan dari Firebase RTDB
      await loadUserData(user.uid);
      renderProfilButton();
    }
  });
}

export function cleanup() {
  const btnContainer = document.getElementById('profilBtnContainer');
  if (btnContainer) btnContainer.remove();
  const profilView = document.getElementById('profilViewContainer');
  if (profilView) profilView.remove();
}

function loadCSS() {
  if (document.getElementById('profil-user-css')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'css/modules/profil-user.css';
  link.id = 'profil-user-css';
  document.head.appendChild(link);
}

async function loadUserData(uid) {
  try {
    const snapshot = await get(ref(db, `users/${uid}`));
    if (snapshot.exists()) {
      const data = snapshot.val();
      currentUserData = { ...currentUserData, ...data };
    }
  } catch (error) {
    console.warn('⚠️ Gagal memuat data user dari DB, menggunakan default:', error);
  }
}

function renderProfilButton() {
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
  
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.parentNode.insertBefore(btnContainer, logoutBtn);
  }
}

function showProfilView() {
  const btnContainer = document.getElementById('profilBtnContainer');
  if (btnContainer) btnContainer.style.display = 'none';
  
  const oldView = document.getElementById('profilViewContainer');
  if (oldView) oldView.remove();
  
  isEditing = false; // Reset ke mode lihat
  
  const profilView = document.createElement('div');
  profilView.id = 'profilViewContainer';
  profilView.innerHTML = `
    <div class="profil-container">
      <h2>👤 Profil User</h2>
      
      <div class="profil-section">
        <h3>📋 Informasi Akun & Data Diri</h3>
        
        <div class="form-group">
          <label>🆔 UID (Tidak dapat diubah)</label>
          <input type="text" id="profilUid" class="form-control" value="${currentUserData.uid}" disabled>
        </div>
        <div class="form-group">
          <label>📧 Email (Tidak dapat diubah)</label>
          <input type="email" id="profilEmail" class="form-control" value="${currentUserData.email}" disabled>
        </div>
        <div class="form-group">
          <label>👤 Nama Lengkap</label>
          <input type="text" id="profilNama" class="form-control" value="${currentUserData.displayName || ''}" disabled>
        </div>
        <div class="form-group">
          <label>🏫 Nama Sekolah</label>
          <input type="text" id="profilSekolah" class="form-control" value="${currentUserData.sekolah || ''}" disabled>
        </div>
        <div class="form-group">
          <label>🎓 Kelas / Fase</label>
          <input type="text" id="profilKelas" class="form-control" value="${currentUserData.kelas || ''}" disabled>
        </div>
        <div class="form-group">
          <label>🔢 NIP / NUPTK</label>
          <input type="text" id="profilNip" class="form-control" value="${currentUserData.nip || ''}" disabled>
        </div>
        <div class="form-group">
          <label>📱 Kontak / No. WhatsApp</label>
          <input type="text" id="profilKontak" class="form-control" value="${currentUserData.kontak || ''}" disabled>
        </div>

        <!-- Tombol Aksi -->
        <div class="profil-actions" id="viewModeButtons">
          <button class="btn-profil-edit" onclick="window.toggleEditMode(true)">✏️ Edit Data</button>
        </div>
        
        <div class="profil-actions" id="editModeButtons" style="display: none;">
          <button class="btn-profil-save" onclick="window.saveProfileData()">💾 Simpan Perubahan</button>
          <button class="btn-profil-close" onclick="window.toggleEditMode(false)">❌ Batal</button>
        </div>
      </div>
    </div>
  `;
  
  const currentBtnContainer = document.getElementById('profilBtnContainer');
  if (currentBtnContainer) {
    currentBtnContainer.parentNode.insertBefore(profilView, currentBtnContainer.nextSibling);
  }
  
  profilView.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// --- FUNGSI GLOBAL UNTUK ONCLICK ---

window.toggleEditMode = function(enable) {
  isEditing = enable;
  const inputs = document.querySelectorAll('#profilViewContainer .form-control:not([id="profilUid"]):not([id="profilEmail"])');
  const viewBtns = document.getElementById('viewModeButtons');
  const editBtns = document.getElementById('editModeButtons');
  
  inputs.forEach(input => {
    input.disabled = !enable;
    if (enable) input.style.background = '#ffffff';
    else input.style.background = '#f1f5f9';
  });
  
  if (enable) {
    viewBtns.style.display = 'none';
    editBtns.style.display = 'flex';
    document.getElementById('profilNama').focus();
  } else {
    viewBtns.style.display = 'flex';
    editBtns.style.display = 'none';
    // Reset nilai ke data asli jika batal
    document.getElementById('profilNama').value = currentUserData.displayName || '';
    document.getElementById('profilSekolah').value = currentUserData.sekolah || '';
    document.getElementById('profilKelas').value = currentUserData.kelas || '';
    document.getElementById('profilNip').value = currentUserData.nip || '';
    document.getElementById('profilKontak').value = currentUserData.kontak || '';
  }
};

window.saveProfileData = async function() {
  const user = auth.currentUser;
  if (!user) {
    showToast('❌ User tidak login!', 'error');
    return;
  }
  
  const nama = document.getElementById('profilNama').value.trim();
  const sekolah = document.getElementById('profilSekolah').value.trim();
  const kelas = document.getElementById('profilKelas').value.trim();
  const nip = document.getElementById('profilNip').value.trim();
  const kontak = document.getElementById('profilKontak').value.trim();
  
  if (!nama) {
    showToast('⚠️ Nama lengkap wajib diisi!', 'error');
    return;
  }
  
  try {
    // 1. Update Firebase Auth (untuk nama)
    if (nama !== user.displayName) {
      await updateProfile(user, { displayName: nama });
    }
    
    // 2. Update Firebase Realtime Database
    const newData = {
      uid: user.uid,
      email: user.email,
      displayName: nama,
      sekolah: sekolah,
      kelas: kelas,
      nip: nip,
      kontak: kontak,
      updatedAt: Date.now()
    };
    
    await set(ref(db, `users/${user.uid}`), newData);
    
    // 3. Update LocalStorage agar dashboard langsung update
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    Object.assign(currentUser, newData);
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    
    // 4. Update state lokal
    currentUserData = { ...currentUserData, ...newData };
    
    showToast('✅ Data profil berhasil diperbarui!', 'success');
    
    // 5. Kembali ke mode lihat
    window.toggleEditMode(false);
    
    // 6. Refresh tombol di dashboard agar nama baru muncul
    setTimeout(() => {
      const btn = document.querySelector('#profilBtnContainer .profil-btn');
      if (btn) btn.innerHTML = `👤 ${nama}`;
    }, 500);
    
  } catch (error) {
    console.error('❌ Gagal update profil:', error);
    showToast('❌ Gagal menyimpan: ' + error.message, 'error');
  }
};

window.profilHideView = function() {
  const profilView = document.getElementById('profilViewContainer');
  if (profilView) profilView.remove();
  
  const btnContainer = document.getElementById('profilBtnContainer');
  if (btnContainer) btnContainer.style.display = 'block';
};

export function hideOnServiceActive() {
  const btnContainer = document.getElementById('profilBtnContainer');
  const profilView = document.getElementById('profilViewContainer');
  if (btnContainer) btnContainer.style.display = 'none';
  if (profilView) profilView.style.display = 'none';
}

export function showOnNoService() {
  const btnContainer = document.getElementById('profilBtnContainer');
  const profilView = document.getElementById('profilViewContainer');
  if (btnContainer) btnContainer.style.display = 'block';
  if (profilView) profilView.style.display = 'none';
}

function showToast(message, type = 'success') {
  const existing = document.querySelector('.toast-notification');
  if (existing) existing.remove();
  
  const toast = document.createElement('div');
  toast.className = `toast-notification ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}
