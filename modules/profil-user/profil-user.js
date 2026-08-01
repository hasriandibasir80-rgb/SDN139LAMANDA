// modules/profil-user/profil-user.js
// =========================================
// FITUR: PROFIL USER - VERSI CLOUD FIRESTORE
// Semua data user disimpan di Firestore collection 'users'
// =========================================

import { getAuth, updateProfile, updatePassword, EmailAuthProvider, reauthenticateWithCredential, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const auth = getAuth();
const db = getFirestore(); // ⭐ Menggunakan Firestore, bukan Realtime Database

let currentUserData = {};
let isEditing = false;

export async function init() {
  console.log('🚀 Modul Profil User (Firestore) initialized');
  loadCSS();
  
  auth.onAuthStateChanged(async (user) => {
    if (user) {
      currentUserData.uid = user.uid;
      currentUserData.email = user.email;
      currentUserData.displayName = user.displayName || '';
      
      // ⭐ Ambil data tambahan dari Firestore
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

// ⭐ FUNGSI LOAD DATA DARI FIRESTORE
async function loadUserData(uid) {
  try {
    const docRef = doc(db, "users", uid);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      currentUserData = { ...currentUserData, ...docSnap.data() };
      console.log('✅ Data user berhasil dimuat dari Firestore');
    } else {
      console.log('ℹ️ Dokumen user belum ada di Firestore, menggunakan data default Auth');
    }
  } catch (error) {
    console.error('❌ Gagal memuat data user dari Firestore:', error);
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
  
  isEditing = false; 
  
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

        <div class="profil-actions" id="viewModeButtons">
          <button class="btn-profil-edit" onclick="window.toggleEditMode(true)">✏️ Edit Data</button>
        </div>
        
        <div class="profil-actions" id="editModeButtons" style="display: none;">
          <button class="btn-profil-save" onclick="window.saveProfileData()">💾 Simpan Perubahan</button>
          <button class="btn-profil-close" onclick="window.toggleEditMode(false)">❌ Batal</button>
        </div>
      </div>

      <!-- ===== FITUR BARU: GANTI PASSWORD ===== -->
      <div class="profil-section" style="margin-top:20px; border-top:2px solid #e2e8f0; padding-top:20px;">
        <h3>🔑 Keamanan & Password</h3>
        <div id="statusPasswordInfo" style="background:#f8fafc; padding:10px; border-radius:6px; margin-bottom:12px; font-size:13px;"></div>

        <div class="form-group">
          <label>🔒 Password Lama</label>
          <input type="password" id="oldPassword" class="form-control" placeholder="Masukkan password lama">
        </div>
        <div class="form-group">
          <label>🆕 Password Baru (min 6 karakter)</label>
          <input type="password" id="newPassword" class="form-control" placeholder="Password baru">
        </div>
        <div class="form-group">
          <label>✅ Konfirmasi Password Baru</label>
          <input type="password" id="confirmPassword" class="form-control" placeholder="Ulangi password baru">
        </div>

        <div class="profil-actions" style="display:flex; gap:10px; flex-wrap:wrap;">
          <button class="btn-profil-save" onclick="window.handleGantiPassword()" style="background:#1e3a8a;">🔑 Ganti Password</button>
          <button class="btn-profil-edit" onclick="window.handleLupaPassword()" style="background:#3b82f6;">📧 Kirim Email Reset</button>
        </div>
        <div id="passwordStatus" style="margin-top:12px; display:none; padding:10px; border-radius:6px; font-size:13px;"></div>
      </div>

    </div>
  `;
  
  const currentBtnContainer = document.getElementById('profilBtnContainer');
  if (currentBtnContainer) {
    currentBtnContainer.parentNode.insertBefore(profilView, currentBtnContainer.nextSibling);
  }
  
  profilView.scrollIntoView({ behavior: 'smooth', block: 'start' });
  setTimeout(() => updatePasswordInfo(), 100);
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
    document.getElementById('profilNama').value = currentUserData.displayName || '';
    document.getElementById('profilSekolah').value = currentUserData.sekolah || '';
    document.getElementById('profilKelas').value = currentUserData.kelas || '';
    document.getElementById('profilNip').value = currentUserData.nip || '';
    document.getElementById('profilKontak').value = currentUserData.kontak || '';
  }
};

// ⭐ FUNGSI SIMPAN KE FIRESTORE
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
    // 1. Update Firebase Auth (untuk nama tampilan)
    if (nama !== user.displayName) {
      await updateProfile(user, { displayName: nama });
    }
    
    // 2. Siapkan data untuk Firestore
    // ⚠️ Field-field ini SUDAH diizinkan oleh rules Firestore Anda (hasOnly)
    const newData = {
      uid: user.uid,
      email: user.email,
      displayName: nama,
      sekolah: sekolah,
      kelas: kelas,
      nip: nip,
      kontak: kontak,
      updatedAt: new Date().toISOString() // Format timestamp Firestore yang aman
    };
    
    // 3. Simpan ke Firestore dengan merge: true (update jika ada, buat jika belum)
    const userDocRef = doc(db, "users", user.uid);
    await setDoc(userDocRef, newData, { merge: true });
    
    console.log('✅ Data berhasil disimpan ke Firestore!');
    
    // 4. Update LocalStorage agar dashboard langsung sinkron
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    Object.assign(currentUser, newData);
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    
    // 5. Update state lokal
    currentUserData = { ...currentUserData, ...newData };
    
    showToast('✅ Data profil berhasil diperbarui!', 'success');
    
    // 6. Kembali ke mode lihat
    window.toggleEditMode(false);
    
    // 7. Refresh tombol di dashboard agar nama baru muncul
    setTimeout(() => {
      const btn = document.querySelector('#profilBtnContainer .profil-btn');
      if (btn) btn.innerHTML = `👤 ${nama}`;
    }, 500);
    
  } catch (error) {
    console.error('❌ Gagal update profil di Firestore:', error);
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


// ===== FITUR BARU: GANTI PASSWORD USER SENDIRI =====
window.handleGantiPassword = async function() {
  const oldPass = document.getElementById('oldPassword')?.value.trim();
  const newPass = document.getElementById('newPassword')?.value.trim();
  const confirmPass = document.getElementById('confirmPassword')?.value.trim();
  const statusEl = document.getElementById('passwordStatus');
  
  if (!oldPass || !newPass || !confirmPass) {
    showPasswordStatus('⚠️ Semua field password wajib diisi!', 'error');
    return;
  }
  if (newPass.length < 6) {
    showPasswordStatus('❌ Password baru minimal 6 karakter!', 'error');
    return;
  }
  if (newPass !== confirmPass) {
    showPasswordStatus('❌ Konfirmasi password tidak cocok!', 'error');
    return;
  }
  
  const user = auth.currentUser;
  if (!user) {
    showPasswordStatus('❌ Anda belum login!', 'error');
    return;
  }
  
  const btn = document.querySelector('[onclick="window.handleGantiPassword()"]');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Memproses...'; }
  
  try {
    // 1. Re-authenticate (wajib Firebase)
    const credential = EmailAuthProvider.credential(user.email, oldPass);
    await reauthenticateWithCredential(user, credential);
    
    // 2. Update password di Auth
    await updatePassword(user, newPass);
    
    // 3. Update di Firestore
    const userRef = doc(db, "users", user.uid);
    await updateDoc(userRef, {
      password: newPass,
      passwordChanged: true,
      mustChangePassword: false,
      lastPasswordChange: serverTimestamp(),
      updatedAt: new Date().toISOString()
    });
    
    showPasswordStatus('✅ Password berhasil diganti! Password baru sudah aktif.', 'success');
    document.getElementById('oldPassword').value = '';
    document.getElementById('newPassword').value = '';
    document.getElementById('confirmPassword').value = '';
    
    // Update local cache
    currentUserData.passwordChanged = true;
    updatePasswordInfo();
    
  } catch (error) {
    console.error('Ganti password error:', error);
    let msg = error.message;
    if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') msg = 'Password lama salah!';
    else if (error.code === 'auth/requires-recent-login') msg = 'Sesi login lama, logout lalu login ulang dulu.';
    else if (error.code === 'auth/weak-password') msg = 'Password baru terlalu lemah!';
    showPasswordStatus('❌ Gagal: ' + msg, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '🔑 Ganti Password'; }
  }
};

window.handleLupaPassword = async function() {
  const user = auth.currentUser;
  if (!user?.email) {
    showPasswordStatus('❌ Email tidak ditemukan!', 'error');
    return;
  }
  if (!confirm(`Kirim email reset password ke ${user.email}?`)) return;
  try {
    await sendPasswordResetEmail(auth, user.email);
    showPasswordStatus(`✅ Email reset dikirim ke ${user.email}. Cek inbox/spam!`, 'success');
  } catch (e) {
    showPasswordStatus('❌ Gagal kirim email: ' + e.message, 'error');
  }
};

function updatePasswordInfo() {
  const infoEl = document.getElementById('statusPasswordInfo');
  if (!infoEl) return;
  const changed = currentUserData.passwordChanged;
  const mustChange = currentUserData.mustChangePassword;
  let html = `<strong>Status:</strong> ${changed ? '✅ Sudah pernah diganti' : '⚠️ Masih pakai password default'}`;
  if (mustChange) html += `<br><span style="color:#dc2626; font-weight:bold;">🔒 Admin meminta Anda segera ganti password!</span>`;
  if (currentUserData.lastPasswordChange) html += `<br><small>Terakhir ganti: ${new Date(currentUserData.lastPasswordChange.seconds ? currentUserData.lastPasswordChange.seconds*1000 : currentUserData.lastPasswordChange).toLocaleString('id-ID')}</small>`;
  infoEl.innerHTML = html;
  infoEl.style.background = mustChange ? '#fee2e2' : (changed ? '#dcfce7' : '#fef3c7');
}

function showPasswordStatus(msg, type) {
  const el = document.getElementById('passwordStatus');
  if (!el) return;
  el.style.display = 'block';
  el.textContent = msg;
  el.style.background = type === 'success' ? '#dcfce7' : '#fee2e2';
  el.style.color = type === 'success' ? '#166534' : '#991b1b';
  el.style.border = `1px solid ${type === 'success' ? '#bbf7d0' : '#fecaca'}`;
}

// Hook after showProfilView to update password info
const originalShowProfilView = null;


function showToast(message, type = 'success') {
  const existing = document.querySelector('.toast-notification');
  if (existing) existing.remove();
  
  const toast = document.createElement('div');
  toast.className = `toast-notification ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}
