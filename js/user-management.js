// ==========================================
// 1. IMPORTS
// ==========================================
import { 
  db, 
  firebaseConfig, 
  initializeApp, 
  getAuth, 
  createUserWithEmailAndPassword, 
  setDoc,
  doc
} from './firebase-config.js';

import { 
  collection, 
  onSnapshot, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { konfigurasiFitur, controlCenterFitur } from './config/service-menu.js';

// ==========================================
// 2. SECONDARY APP SETUP (Agar Admin Tidak Logout)
// ==========================================
const secondaryApp = initializeApp(firebaseConfig, "SecondaryAdminApp");
const secondaryAuth = getAuth(secondaryApp);

// ==========================================
// 3. VALIDASI & KONFIGURASI
// ==========================================
const userRole = localStorage.getItem('userRole');
if (userRole !== 'admin') {
  alert('⛔ Akses Ditolak: Halaman ini hanya untuk Administrator.');
  window.location.href = '../dashboard.html'; 
}

const NAMA_SEKOLAH = 'SDN 139 LAMANDA';
const PASSWORD_DEFAULT = 'bilal2011'; 
const LOGIN_URL = 'https://hasriandibasi80-rgb.github.io/SDN139LAMANDA/dashboard.html';
const PROFIL_URL = 'https://hasriandibasi80-rgb.github.io/SDN139LAMANDA/modules/profil-user.html';
const USERS_COLLECTION = 'users';

const semuaFitur = { ...konfigurasiFitur, ...controlCenterFitur };

// ==========================================
// 4. INISIALASI DOM & STATE
// ==========================================
const container = document.getElementById('daftarUserContainer');
const btnTambah = document.getElementById('btnTambahUser');
const btnSimpan = document.getElementById('btnSimpanUser');
const statusEl = document.getElementById('adminStatus');

let userData = [];
let unsubscribe = null;
let activeEditId = null; // untuk accordion

// ==========================================
// 5. FUNGSI HELPER
// ==========================================
function formatNomorWA(nomor) {
  if (!nomor) return '';
  let clean = nomor.replace(/\D/g, '');
  if (clean.startsWith('0')) {
    clean = '62' + clean.substring(1);
  } else if (!clean.startsWith('62')) {
    clean = '62' + clean;
  }
  return clean;
}

function formatTanggal(timestamp) {
  if (!timestamp) return '-';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function getInisial(nama) {
  if (!nama) return '?';
  return nama.trim().split(' ').slice(0,2).map(n=>n[0].toUpperCase()).join('');
}

function renderHakAksesCheckboxes(hakAksesSaatIni) {
  let html = '';
  for (const [fiturKey, subFiturList] of Object.entries(semuaFitur)) {
    const namaFiturUtama = fiturKey.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    const semuaSubFiturTerpilih = subFiturList.every(sub => hakAksesSaatIni.includes(sub.nama));
    html += `<div style="margin-bottom:16px; border:1px solid #e2e8f0; border-radius:8px; padding:12px; background:#ffffff;">`;
    html += `<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; border-bottom:1px solid #f1f5f9; padding-bottom:8px;">`;
    html += `<strong style="font-size:14px; color:#1e3c72;">${namaFiturUtama}</strong>`;
    html += `<label style="font-size:12px; color:#3b82f6; cursor:pointer; display:flex; align-items:center; gap:4px;"><input type="checkbox" class="check-all-group" data-group="${fiturKey}" ${semuaSubFiturTerpilih ? 'checked' : ''}> Pilih Semua</label>`;
    html += `</div>`;
    html += `<div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(180px,1fr)); gap:8px;">`;
    subFiturList.forEach(sub => {
      const isChecked = hakAksesSaatIni.includes(sub.nama) ? 'checked' : '';
      html += `<label style="display:flex; align-items:flex-start; gap:8px; font-size:13px; color:#334155; cursor:pointer; padding:4px; border-radius:4px;"><input type="checkbox" class="hak-akses-cb" data-group="${fiturKey}" value="${sub.nama}" ${isChecked} style="margin-top:3px; accent-color:#2563eb; width:16px; height:16px; cursor:pointer;"><span>${sub.nama}</span></label>`;
    });
    html += `</div></div>`;
  }
  return html;
}

// ==========================================
// 6. FUNGSI RENDER - VERSI BARU HANYA NAMA
// ==========================================
function renderForm() {
  container.innerHTML = '';

  // Tambah search bar jika ada user
  if (userData.length > 0) {
    const searchWrapper = document.createElement('div');
    searchWrapper.style.cssText = 'margin-bottom:16px;';
    searchWrapper.innerHTML = `<input type="text" id="searchUser" placeholder="🔍 Cari nama user..." style="width:100%; padding:10px 14px; border:1px solid #cbd5e1; border-radius:8px; font-size:14px;">`;
    container.appendChild(searchWrapper);
    
    searchWrapper.querySelector('#searchUser').addEventListener('input', (e) => {
      const keyword = e.target.value.toLowerCase();
      document.querySelectorAll('.user-item').forEach(el => {
        const nama = el.dataset.nama.toLowerCase();
        el.style.display = nama.includes(keyword) ? 'block' : 'none';
      });
    });
  }

  if (userData.length === 0) {
    const emptyMsg = document.createElement('div');
    emptyMsg.className = 'helper-text';
    emptyMsg.style.textAlign = 'center';
    emptyMsg.style.padding = '20px';
    emptyMsg.textContent = 'Belum ada data pengguna. Klik "Tambah Pengguna Baru" untuk memulai.';
    container.appendChild(emptyMsg);
  } else {
    userData.forEach((item, index) => {
      const el = buatUserItem(
        item.id,
        item.nama || '',
        item.email || '',
        item.noWA || '',
        item.role || 'guru',
        item.status || 'aktif',
        item.hakAkses || [],
        item.passwordChanged || false,
        item.createdAt,
        index
      );
      container.appendChild(el);
    });
  }
}

// ==========================================
// 7. FUNGSI BUAT ITEM USER - MODE LIST NAMA + ACCORDION EDIT
// ==========================================
function buatUserItem(id, nama, email, noWA, role, status, hakAkses, passwordChanged, createdAt, index) {
  const wrapper = document.createElement('div');
  wrapper.className = 'user-item';
  wrapper.dataset.nama = nama || '';
  wrapper.dataset.id = id;
  wrapper.style.cssText = 'border:1px solid #e2e8f0; border-radius:12px; margin-bottom:12px; background:#ffffff; overflow:hidden; transition:all 0.2s;';

  const statusBadge = status === 'aktif' 
    ? '<span style="background:#dcfce7; color:#16a34a; font-size:11px; padding:3px 8px; border-radius:12px; font-weight:600;">● Aktif</span>'
    : '<span style="background:#fee2e2; color:#dc2626; font-size:11px; padding:3px 8px; border-radius:12px; font-weight:600;">● Non-Aktif</span>';

  const passBadge = passwordChanged
    ? '<span style="color:#16a34a; font-size:11px;">✅</span>'
    : '<span style="color:#f59e0b; font-size:11px;" title="Password masih default">⚠️</span>';

  const checkboxHTML = renderHakAksesCheckboxes(hakAkses);

  const isTemp = id && id.startsWith('temp_');
  const deleteBtnHTML = !isTemp ? `<button class="btn-hapus-user" data-id="${id}" style="background:#fee2e2; color:#dc2626; border:none; border-radius:6px; padding:6px 10px; cursor:pointer; font-size:12px;">🗑️</button>` : '';

  // Tampilkan list terbuka jika ini user baru (temp)
  const isOpenByDefault = isTemp;
  if (isOpenByDefault) activeEditId = id;

  wrapper.innerHTML = `
    <!-- HEADER: HANYA NAMA (KLIK UNTUK EDIT) -->
    <div class="user-summary" style="display:flex; align-items:center; justify-content:space-between; padding:14px 16px; cursor:pointer; user-select:none; background:${isOpenByDefault ? '#f8fafc' : 'white'};">
      <div style="display:flex; align-items:center; gap:12px; flex:1;">
        <div style="width:40px; height:40px; border-radius:50%; background:${isTemp ? '#fef3c7' : '#dbeafe'}; color:${isTemp ? '#d97706' : '#1e40af'}; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:14px;">${getInisial(nama) || '?'}</div>
        <div style="flex:1;">
          <div style="font-weight:600; color:#1e293b; font-size:15px; display:flex; align-items:center; gap:6px;">
            ${nama || '<span style="color:#94a3b8; font-style:italic;">Nama belum diisi</span>'} ${passBadge}
          </div>
          <div style="font-size:12px; color:#64748b; margin-top:2px;">${role.toUpperCase()} • ${email || 'email kosong'} ${isTemp ? '• <span style="color:#d97706; font-weight:600;">BARU - KLIK UNTUK LENGKAPI</span>' : ''}</div>
        </div>
      </div>
      <div style="display:flex; align-items:center; gap:8px;">
        ${statusBadge}
        <span class="chevron" style="color:#94a3b8; font-size:18px; transition:transform 0.2s; transform:${isOpenByDefault ? 'rotate(180deg)' : 'rotate(0deg)'};">▾</span>
      </div>
    </div>

    <!-- DETAIL: FORM EDITING (TERSEMBUNYI SAMPAI DI-KLIK) -->
    <div class="user-detail" style="display:${isOpenByDefault ? 'block' : 'none'}; padding:20px; border-top:1px solid #e2e8f0; background:#fcfdfe;">
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px,1fr)); gap:12px; margin-bottom:12px;">
        <div class="admin-form-group">
          <label style="display:block; font-size:13px; font-weight:600; color:#475569; margin-bottom:4px;">Nama Lengkap *</label>
          <input type="text" class="admin-input input-nama" value="${nama}" placeholder="Contoh: Budi Santoso" style="width:100%; padding:8px 12px; border:1px solid #cbd5e1; border-radius:6px; font-size:14px;">
        </div>
        <div class="admin-form-group">
          <label style="display:block; font-size:13px; font-weight:600; color:#475569; margin-bottom:4px;">Email *</label>
          <input type="email" class="admin-input input-email" value="${email}" placeholder="user@sekolah.id" style="width:100%; padding:8px 12px; border:1px solid #cbd5e1; border-radius:6px; font-size:14px;">
        </div>
        <div class="admin-form-group">
          <label style="display:block; font-size:13px; font-weight:600; color:#475569; margin-bottom:4px;">Nomor WhatsApp *</label>
          <input type="tel" class="admin-input input-nowa" value="${noWA}" placeholder="08123456789" style="width:100%; padding:8px 12px; border:1px solid #cbd5e1; border-radius:6px; font-size:14px;">
        </div>
        <div class="admin-form-group">
          <label style="display:block; font-size:13px; font-weight:600; color:#475569; margin-bottom:4px;">Peran (Role)</label>
          <select class="admin-input input-role" style="width:100%; padding:8px 12px; border:1px solid #cbd5e1; border-radius:6px; font-size:14px; cursor:pointer; background:white;">
            <option value="admin" ${role === 'admin' ? 'selected' : ''}>Administrator</option>
            <option value="kepsek" ${role === 'kepsek' ? 'selected' : ''}>Kepala Sekolah</option>
            <option value="guru" ${role === 'guru' ? 'selected' : ''}>Guru</option>
            <option value="staf" ${role === 'staf' ? 'selected' : ''}>Staf / Tata Usaha</option>
            <option value="siswa" ${role === 'siswa' ? 'selected' : ''}>Peserta Didik</option>
            <option value="ortu" ${role === 'ortu' ? 'selected' : ''}>Orang Tua</option>
          </select>
        </div>
        <div class="admin-form-group">
          <label style="display:block; font-size:13px; font-weight:600; color:#475569; margin-bottom:4px;">Status</label>
          <select class="admin-input input-status" style="width:100%; padding:8px 12px; border:1px solid #cbd5e1; border-radius:6px; font-size:14px; cursor:pointer; background:white;">
            <option value="aktif" ${status === 'aktif' ? 'selected' : ''}>✅ Aktif</option>
            <option value="non-aktif" ${status === 'non-aktif' ? 'selected' : ''}>⛔ Non-Aktif</option>
          </select>
        </div>
      </div>

      <div style="display:flex; gap:12px; margin-top:16px; align-items:flex-end; flex-wrap:wrap;">
        <div style="flex:1; min-width:200px;">
          <label style="display:block; font-size:13px; font-weight:600; color:#475569; margin-bottom:4px;">Password Default</label>
          <input type="text" value="${PASSWORD_DEFAULT}" readonly style="width:100%; padding:8px 12px; border:1px solid #cbd5e1; border-radius:6px; background:#f1f5f9; color:#64748b; font-size:14px;">
        </div>
        <div style="flex:1; min-width:200px; display:flex; gap:8px;">
          <button type="button" class="btn-kirim-wa" style="flex:1; padding:10px; background:#25D366; color:white; border:none; border-radius:6px; cursor:pointer; font-weight:bold; font-size:13px;">📱 Kirim WA</button>
          ${deleteBtnHTML}
        </div>
      </div>

      <div class="hak-akses-section" style="margin-top:20px;">
        <label style="display:block; font-size:14px; font-weight:700; color:#1e3c72; margin-bottom:8px;">🔐 Hak Akses Fitur</label>
        <div class="hak-akses-checkbox-container" style="max-height:350px; overflow-y:auto; border:1px solid #e2e8f0; border-radius:8px; padding:12px; background:#f8fafc;">
          ${checkboxHTML}
        </div>
      </div>

      <div style="margin-top:16px; font-size:11px; color:#94a3b8; text-align:right;">Dibuat: ${formatTanggal(createdAt)} | ID: ${id}</div>
    </div>
  `;

  // Event toggle accordion
  const summary = wrapper.querySelector('.user-summary');
  const detail = wrapper.querySelector('.user-detail');
  const chevron = wrapper.querySelector('.chevron');

  summary.addEventListener('click', (e) => {
    if (e.target.closest('.btn-hapus-user')) return; // jangan toggle kalau klik hapus
    
    const isCurrentlyOpen = detail.style.display === 'block';
    
    // Tutup semua yang lain (mode accordion)
    document.querySelectorAll('.user-detail').forEach(d => d.style.display = 'none');
    document.querySelectorAll('.chevron').forEach(c => c.style.transform = 'rotate(0deg)');
    document.querySelectorAll('.user-summary').forEach(s => s.style.background = 'white');

    if (!isCurrentlyOpen) {
      detail.style.display = 'block';
      chevron.style.transform = 'rotate(180deg)';
      summary.style.background = '#f8fafc';
      activeEditId = id;
    } else {
      activeEditId = null;
    }
  });

  // Sync data
  const syncData = () => {
    if (index !== null && userData[index]) {
      userData[index].nama = wrapper.querySelector('.input-nama').value.trim();
      userData[index].email = wrapper.querySelector('.input-email').value.trim();
      userData[index].noWA = wrapper.querySelector('.input-nowa').value.trim();
      userData[index].role = wrapper.querySelector('.input-role').value;
      userData[index].status = wrapper.querySelector('.input-status').value;
      const checkedBoxes = wrapper.querySelectorAll('.hak-akses-cb:checked');
      userData[index].hakAkses = Array.from(checkedBoxes).map(cb => cb.value);
      
      // Update tampilan nama di header
      const labelNamaEl = wrapper.querySelector('.user-summary div div');
      // update inisial dan nama ringkas
      wrapper.dataset.nama = userData[index].nama;
      wrapper.querySelector('.user-summary').querySelector('div div').innerHTML = `
        <div style="font-weight:600; color:#1e293b; font-size:15px; display:flex; align-items:center; gap:6px;">
          ${userData[index].nama || '<span style="color:#94a3b8; font-style:italic;">Nama belum diisi</span>'} ${passBadge}
        </div>
        <div style="font-size:12px; color:#64748b; margin-top:2px;">${userData[index].role.toUpperCase()} • ${userData[index].email || 'email kosong'}</div>
      `;
      wrapper.querySelector('.user-summary div').firstElementChild.textContent = getInisial(userData[index].nama);
    }
  };

  wrapper.querySelectorAll('input, select').forEach(element => {
    element.addEventListener('input', syncData);
    element.addEventListener('change', syncData);
  });

  wrapper.querySelectorAll('.check-all-group').forEach(masterCb => {
    masterCb.addEventListener('change', (e) => {
      const groupName = e.target.dataset.group;
      const childCbs = wrapper.querySelectorAll(`.hak-akses-cb[data-group="${groupName}"]`);
      childCbs.forEach(childCb => { childCb.checked = e.target.checked; });
      syncData();
    });
  });

  // Hapus
  if (id && !id.startsWith('temp_')) {
    const btnHapus = wrapper.querySelector('.btn-hapus-user');
    if (btnHapus) {
      btnHapus.addEventListener('click', async (e) => {
        e.stopPropagation();
        if(confirm(`Yakin ingin menghapus pengguna "${nama}"?`)) {
          try {
            await deleteDoc(doc(db, USERS_COLLECTION, id));
          } catch (error) {
            console.error('Error deleting user:', error);
            alert('❌ Gagal menghapus pengguna!');
          }
        }
      });
    }
  }

  // Kirim WA
  wrapper.querySelector('.btn-kirim-wa').addEventListener('click', () => {
    syncData(); 
    const user = userData[index];
    if (!user.nama || !user.email || !user.noWA) {
      alert('⚠️ Nama, Email, dan Nomor WhatsApp wajib diisi!');
      return;
    }
    const nomorWA = formatNomorWA(user.noWA);
    if (nomorWA.length < 10) {
      alert('⚠️ Nomor WhatsApp tidak valid!');
      return;
    }
    const roleLabels = { admin: 'Administrator', kepsek: 'Kepala Sekolah', guru: 'Guru / Pendidik', staf: 'Staf / Tata Usaha', siswa: 'Peserta Didik', ortu: 'Orang Tua' };
    const roleNama = roleLabels[user.role] || user.role;
    let hakAksesFormat = '- Akses Penuh (Admin)';
    if (user.role !== 'admin' && user.hakAkses.length > 0) {
      hakAksesFormat = user.hakAkses.map(h => `  • ${h}`).join('\n');
    } else if (user.role !== 'admin') {
      hakAksesFormat = '- Tidak ada akses spesifik';
    }
    const pesan = `Halo *${user.nama}*,\n\nAnda telah didaftarkan sebagai *${roleNama}* di platform digital *${NAMA_SEKOLAH}*.\n\nBerikut adalah informasi akun Anda:\n📧 Email: ${user.email}\n🔑 Password Default: *${PASSWORD_DEFAULT}*\n\n🔐 *Hak Akses Fitur:*\n${hakAksesFormat}\n\nSilakan masuk ke akun Anda melalui tautan berikut:\n🔗 ${LOGIN_URL}\n\n*PENTING:* Demi keamanan, mohon segera ubah password default Anda pada halaman profil setelah berhasil masuk:\n🔗 ${PROFIL_URL}\n\nTerima kasih.`;
    const encodedPesan = encodeURIComponent(pesan);
    window.open(`https://wa.me/${nomorWA}?text=${encodedPesan}`, '_blank');
  });

  return wrapper;
}

// ==========================================
// 8. EVENT LISTENER: TAMBAH USER BARU
// ==========================================
if (btnTambah) {
  btnTambah.addEventListener('click', () => {
    const defaultHakAkses = []; 
    userData.unshift({
      id: `temp_${Date.now()}`,
      nama: '',
      email: '',
      noWA: '',
      role: 'guru',
      status: 'aktif',
      hakAkses: defaultHakAkses,
      passwordChanged: false,
      createdAt: new Date()
    });
    renderForm();
  });
}

// ==========================================
// 9. EVENT LISTENER: SIMPAN SEMUA PERUBAHAN
// ==========================================
if (btnSimpan) {
  btnSimpan.addEventListener('click', async () => {
    const rows = container.querySelectorAll('.user-item');
    let isValid = true;

    rows.forEach((row) => {
      const detail = row.querySelector('.user-detail');
      if (!detail) return;
      const nama = detail.querySelector('.input-nama').value.trim();
      const email = detail.querySelector('.input-email').value.trim();
      const noWA = detail.querySelector('.input-nowa').value.trim();
      if (!nama || !email || !noWA) {
        isValid = false;
        row.style.border = '2px solid #ef4444';
        detail.style.display = 'block';
      } else {
        row.style.border = '1px solid #e2e8f0';
      }
    });

    if (!isValid) {
      alert('⚠️ Nama, Email, dan Nomor WhatsApp wajib diisi untuk semua pengguna!');
      return;
    }

    btnSimpan.disabled = true;
    btnSimpan.innerHTML = '⏳ Mendaftarkan & Menyimpan...';
    statusEl.className = 'admin-status';
    statusEl.style.display = 'none';

    try {
      for (let index = 0; index < rows.length; index++) {
        const user = userData[index];
        let isUserNew = false; 
        
        if (user.id && user.id.startsWith('temp_')) {
          try {
            const userCredential = await createUserWithEmailAndPassword(secondaryAuth, user.email, PASSWORD_DEFAULT);
            const newUid = userCredential.user.uid; 
            user.id = newUid; 
            isUserNew = true; 
          } catch (authError) {
            if (authError.code === 'auth/email-already-in-use') {
              alert(`⚠️ Email "${user.email}" sudah terdaftar di sistem.`);
              throw new Error('Email sudah digunakan');
            }
            throw authError;
          }
        }

        const dataToSave = {
          nama: user.nama,
          email: user.email,
          noWA: user.noWA,
          role: user.role,
          status: user.status,
          hakAkses: user.hakAkses || [],
          password: PASSWORD_DEFAULT,
          passwordChanged: user.passwordChanged || false,
          updatedAt: serverTimestamp()
        };

        if (isUserNew) {
          dataToSave.createdAt = serverTimestamp();
          await setDoc(doc(db, USERS_COLLECTION, user.id), dataToSave);
        } else if (user.id) {
          await updateDoc(doc(db, USERS_COLLECTION, user.id), dataToSave);
        }
      }

      statusEl.textContent = '✅ Semua perubahan berhasil disimpan!';
      statusEl.className = 'admin-status success';
      statusEl.style.display = 'block';

    } catch (error) {
      console.error('Error saving:', error);
      statusEl.textContent = '❌ Gagal: ' + error.message;
      statusEl.className = 'admin-status error';
      statusEl.style.display = 'block';
    } finally {
      btnSimpan.disabled = false;
      btnSimpan.innerHTML = '💾 Simpan Semua Perubahan';
    }
  });
}

// ==========================================
// 10. REALTIME LISTENER (FIRESTORE)
// ==========================================
function startListening() {
  const q = query(collection(db, USERS_COLLECTION), orderBy('createdAt', 'desc'));
  
  unsubscribe = onSnapshot(q, (snapshot) => {
    userData = snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    }));
    renderForm();
  }, (error) => {
    console.error('Error listening to users:', error);
    container.innerHTML = '<div class="helper-text" style="text-align: center; padding: 20px; color: #dc2626;">❌ Gagal memuat data. Periksa koneksi atau aturan Firestore.</div>';
  });
}

startListening();

window.addEventListener('beforeunload', () => {
  if (unsubscribe) {
    unsubscribe();
  }
});
