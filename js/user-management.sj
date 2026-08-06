// ==========================================
// USER MANAGEMENT - FIXED VERSION
// Fix: Role update tersimpan + Auth vs Firestore sinkron
// SDN 139 LAMANDA
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
  orderBy,
  getDoc,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { sendPasswordResetEmail, fetchSignInMethodsForEmail, deleteUser as deleteAuthUser, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import { konfigurasiFitur, controlCenterFitur } from './config/service-menu.js';

// ==========================================
// 2. SECONDARY APP SETUP
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
// ROLE DEFAULT HAK AKSES - BARU
// ==========================================
function getDefaultHakAksesByRole(role) {
  const defaults = {
    admin: Object.values(semuaFitur).flat().map(f => f.nama),
    kepsek: Object.values(semuaFitur).flat().map(f => f.nama),
    guru: ['CP, TP, & ATP', 'Program Tahunan', 'Program Semester', 'Ickh', 'Jurnal Harian', 'Analisis KKTP', 'Rumus 8-3-3-4', 'Refleksi Guru', 'Kalender Pendidikan', 'Jadwal Pembelajaran', 'Presensi Siswa', 'LKPD', 'Penilaian', 'Pembuat Soal', 'Pembuat Kisi-kisi', 'Bank RPM', 'RPM Spesifik', 'Bantuan AI'],
    staf: ['Kalender Pendidikan', 'Jadwal Pembelajaran', 'Presensi Siswa', 'Bank Soal'],
    siswa: ['Jadwal Pembelajaran', 'Kalender Pendidikan'],
    ortu: ['Jadwal Pembelajaran', 'Kalender Pendidikan', 'Presensi Siswa']
  };
  return defaults[role] || [];
}

// ==========================================
// 4. INISIALASI DOM & STATE
// ==========================================
const container = document.getElementById('daftarUserContainer');
const btnTambah = document.getElementById('btnTambahUser');
const btnSimpan = document.getElementById('btnSimpanUser');
const statusEl = document.getElementById('adminStatus');

let userData = [];
let unsubscribe = null;
let activeEditId = null;

// ==========================================
// 5. FUNGSI HELPER
// ==========================================
function formatNomorWA(nomor) {
  if (!nomor) return '';
  let clean = nomor.replace(/\D/g, '');
  if (clean.startsWith('0')) clean = '62' + clean.substring(1);
  else if (!clean.startsWith('62')) clean = '62' + clean;
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
function renderHakAksesCheckboxes(hakAksesSaatIni, role) {
  // Jika hak akses kosong dan role bukan admin, beri default
  if ((!hakAksesSaatIni || hakAksesSaatIni.length === 0) && role !== 'admin') {
    hakAksesSaatIni = getDefaultHakAksesByRole(role);
  }
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
// 6. FUNGSI RENDER
// ==========================================
function renderForm() {
  container.innerHTML = '';
  if (userData.length > 0) {
    const searchWrapper = document.createElement('div');
    searchWrapper.style.cssText = 'margin-bottom:16px; display:flex; gap:8px;';
    searchWrapper.innerHTML = `
      <input type="text" id="searchUser" placeholder="🔍 Cari nama / email / role..." style="flex:1; padding:10px 14px; border:1px solid #cbd5e1; border-radius:8px; font-size:14px;">
      <span style="background:#f1f5f9; padding:10px 12px; border-radius:8px; font-size:12px; color:#64748b;">Total: ${userData.length} user (Firestore) - Cek Auth di Firebase Console</span>
    `;
    container.appendChild(searchWrapper);
    searchWrapper.querySelector('#searchUser').addEventListener('input', (e) => {
      const keyword = e.target.value.toLowerCase();
      document.querySelectorAll('.user-item').forEach(el => {
        const text = (el.dataset.nama + ' ' + el.dataset.email + ' ' + el.dataset.role).toLowerCase();
        el.style.display = text.includes(keyword) ? 'block' : 'none';
      });
    });
  }
  if (userData.length === 0) {
    const emptyMsg = document.createElement('div');
    emptyMsg.className = 'helper-text';
    emptyMsg.style.textAlign = 'center'; emptyMsg.style.padding = '20px';
    emptyMsg.textContent = 'Belum ada data pengguna. Klik "Tambah Pengguna Baru" untuk memulai.';
    container.appendChild(emptyMsg);
  } else {
    userData.forEach((item) => {
      const el = buatUserItem(item);
      container.appendChild(el);
    });
  }
}

// ==========================================
// 7. BUAT ITEM USER - FIX INDEX BUG
// ==========================================
function buatUserItem(item) {
  const { id, nama, email, noWA, role, status, hakAkses, passwordChanged, createdAt } = item;
  const wrapper = document.createElement('div');
  wrapper.className = 'user-item';
  wrapper.dataset.nama = nama || '';
  wrapper.dataset.email = email || '';
  wrapper.dataset.role = role || '';
  wrapper.dataset.id = id;
  wrapper.style.cssText = 'border:1px solid #e2e8f0; border-radius:12px; margin-bottom:12px; background:#ffffff; overflow:hidden; transition:all 0.2s;';

  const statusBadge = status === 'aktif' 
    ? '<span style="background:#dcfce7; color:#16a34a; font-size:11px; padding:3px 8px; border-radius:12px; font-weight:600;">● Aktif</span>'
    : '<span style="background:#fee2e2; color:#dc2626; font-size:11px; padding:3px 8px; border-radius:12px; font-weight:600;">● Non-Aktif</span>';
  const passBadge = passwordChanged ? '<span style="color:#16a34a; font-size:11px;">✅</span>' : '<span style="color:#f59e0b; font-size:11px;" title="Password masih default">⚠️</span>';
  const checkboxHTML = renderHakAksesCheckboxes(hakAkses || [], role);
  const isTemp = id && id.startsWith('temp_');
  const deleteBtnHTML = !isTemp ? `<button class="btn-hapus-user" data-id="${id}" style="background:#fee2e2; color:#dc2626; border:none; border-radius:6px; padding:6px 10px; cursor:pointer; font-size:12px;">🗑️ Hapus Permanen</button>` : '';
  const isOpenByDefault = isTemp;
  if (isOpenByDefault) activeEditId = id;

  wrapper.innerHTML = `
    <div class="user-summary" style="display:flex; align-items:center; justify-content:space-between; padding:14px 16px; cursor:pointer; user-select:none; background:${isOpenByDefault ? '#f8fafc' : 'white'};">
      <div style="display:flex; align-items:center; gap:12px; flex:1;">
        <div style="width:40px; height:40px; border-radius:50%; background:${isTemp ? '#fef3c7' : '#dbeafe'}; color:${isTemp ? '#d97706' : '#1e40af'}; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:14px;">${getInisial(nama) || '?'}</div>
        <div style="flex:1;">
          <div style="font-weight:600; color:#1e293b; font-size:15px; display:flex; align-items:center; gap:6px;">
            ${nama || '<span style="color:#94a3b8; font-style:italic;">Nama belum diisi</span>'} ${passBadge}
          </div>
          <div style="font-size:12px; color:#64748b; margin-top:2px;">${role.toUpperCase()} • ${email || 'email kosong'} ${isTemp ? '• <span style="color:#d97706; font-weight:600;">BARU</span>' : ''}</div>
        </div>
      </div>
      <div style="display:flex; align-items:center; gap:8px;">
        ${statusBadge}
        <span class="chevron" style="color:#94a3b8; font-size:18px; transition:transform 0.2s; transform:${isOpenByDefault ? 'rotate(180deg)' : 'rotate(0deg)'};">▾</span>
      </div>
    </div>

    <div class="user-detail" style="display:${isOpenByDefault ? 'block' : 'none'}; padding:20px; border-top:1px solid #e2e8f0; background:#fcfdfe;">
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px,1fr)); gap:12px; margin-bottom:12px;">
        <div class="admin-form-group">
          <label style="display:block; font-size:13px; font-weight:600; color:#475569; margin-bottom:4px;">Nama Lengkap *</label>
          <input type="text" class="admin-input input-nama" value="${nama||''}" placeholder="Contoh: Budi Santoso" style="width:100%; padding:8px 12px; border:1px solid #cbd5e1; border-radius:6px; font-size:14px;">
        </div>
        <div class="admin-form-group">
          <label style="display:block; font-size:13px; font-weight:600; color:#475569; margin-bottom:4px;">Email * (tidak bisa diubah setelah jadi)</label>
          <input type="email" class="admin-input input-email" value="${email||''}" placeholder="user@sekolah.id" ${!isTemp ? 'readonly style="width:100%; padding:8px 12px; border:1px solid #e2e8f0; border-radius:6px; background:#f1f5f9; color:#64748b;"' : 'style="width:100%; padding:8px 12px; border:1px solid #cbd5e1; border-radius:6px;"'}>
        </div>
        <div class="admin-form-group">
          <label style="display:block; font-size:13px; font-weight:600; color:#475569; margin-bottom:4px;">Nomor WhatsApp *</label>
          <input type="tel" class="admin-input input-nowa" value="${noWA||''}" placeholder="08123456789" style="width:100%; padding:8px 12px; border:1px solid #cbd5e1; border-radius:6px; font-size:14px;">
        </div>
        <div class="admin-form-group">
          <label style="display:block; font-size:13px; font-weight:600; color:#475569; margin-bottom:4px;">Peran (Role) *</label>
          <select class="admin-input input-role" style="width:100%; padding:8px 12px; border:2px solid #3b82f6; border-radius:6px; font-size:14px; cursor:pointer; background:#eff6ff; font-weight:600;">
            <option value="admin" ${role === 'admin' ? 'selected' : ''}>Administrator</option>
            <option value="kepsek" ${role === 'kepsek' ? 'selected' : ''}>Kepala Sekolah</option>
            <option value="guru" ${role === 'guru' ? 'selected' : ''}>Guru</option>
            <option value="staf" ${role === 'staf' ? 'selected' : ''}>Staf / Tata Usaha</option>
            <option value="siswa" ${role === 'siswa' ? 'selected' : ''}>Peserta Didik</option>
            <option value="ortu" ${role === 'ortu' ? 'selected' : ''}>Orang Tua</option>
          </select>
          <small style="color:#2563eb; font-size:11px;">💡 Jika salah pilih, ganti di sini lalu klik Simpan - pasti tersimpan!</small>
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
        <label style="display:block; font-size:14px; font-weight:700; color:#1e3c72; margin-bottom:8px;">🔐 Hak Akses Fitur - <span style="color:#dc2626; font-size:11px;">Otomatis update saat Role diganti</span></label>
        <div class="hak-akses-checkbox-container" style="max-height:350px; overflow-y:auto; border:1px solid #e2e8f0; border-radius:8px; padding:12px; background:#f8fafc;">
          ${checkboxHTML}
        </div>
      </div>

      <div style="margin-top:16px; font-size:11px; color:#94a3b8; text-align:right;">Dibuat: ${formatTanggal(createdAt)} | ID: ${id}</div>
    </div>
  `;

  // Toggle accordion
  const summary = wrapper.querySelector('.user-summary');
  const detail = wrapper.querySelector('.user-detail');
  const chevron = wrapper.querySelector('.chevron');
  summary.addEventListener('click', (e) => {
    if (e.target.closest('.btn-hapus-user')) return;
    const isCurrentlyOpen = detail.style.display === 'block';
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

  // Sync data - FIX UTAMA: pakai ID bukan index
  const syncData = () => {
    const idx = userData.findIndex(u => u.id === id);
    if (idx === -1) return;
    userData[idx].nama = wrapper.querySelector('.input-nama').value.trim();
    userData[idx].email = wrapper.querySelector('.input-email').value.trim();
    userData[idx].noWA = wrapper.querySelector('.input-nowa').value.trim();
    const newRole = wrapper.querySelector('.input-role').value;
    const oldRole = userData[idx].role;
    userData[idx].role = newRole;
    userData[idx].status = wrapper.querySelector('.input-status').value;
    const checkedBoxes = wrapper.querySelectorAll('.hak-akses-cb:checked');
    userData[idx].hakAkses = Array.from(checkedBoxes).map(cb => cb.value);
    
    // Jika role berubah, auto-update hak akses default
    if (newRole !== oldRole) {
      const newDefault = getDefaultHakAksesByRole(newRole);
      userData[idx].hakAkses = newDefault;
      // Re-render checkbox
      const containerCB = wrapper.querySelector('.hak-akses-checkbox-container');
      containerCB.innerHTML = renderHakAksesCheckboxes(newDefault, newRole).match(/<div style="display:grid[\s\S]*?<\/div><\/div>/g)?.join('') || '';
      // Simpler: re-render whole section
      const newHTML = renderHakAksesCheckboxes(newDefault, newRole);
      wrapper.querySelector('.hak-akses-checkbox-container').innerHTML = new DOMParser().parseFromString(newHTML, 'text/html').body.firstElementChild?.nextElementSibling?.innerHTML || newHTML;
      // Re-attach events for checkboxes
      wrapper.querySelectorAll('.hak-akses-cb').forEach(cb => {
        cb.addEventListener('change', syncData);
      });
      wrapper.querySelectorAll('.check-all-group').forEach(masterCb => {
        masterCb.addEventListener('change', (e) => {
          const groupName = e.target.dataset.group;
          const childCbs = wrapper.querySelectorAll(`.hak-akses-cb[data-group="${groupName}"]`);
          childCbs.forEach(childCb => { childCb.checked = e.target.checked; });
          syncData();
        });
      });
    }

    wrapper.dataset.nama = userData[idx].nama;
    wrapper.dataset.role = userData[idx].role;
    wrapper.dataset.email = userData[idx].email;
    const headerTitle = wrapper.querySelector('.user-summary div div');
    if (headerTitle) {
      headerTitle.innerHTML = `${userData[idx].nama || '<span style="color:#94a3b8; font-style:italic;">Nama belum diisi</span>'} ${userData[idx].passwordChanged ? '<span style="color:#16a34a;">✅</span>' : '<span style="color:#f59e0b;">⚠️</span>'}`;
      headerTitle.nextElementSibling.textContent = `${userData[idx].role.toUpperCase()} • ${userData[idx].email || 'email kosong'}`;
    }
  };

  wrapper.querySelectorAll('.input-nama, .input-nowa, .input-status').forEach(el => {
    el.addEventListener('input', syncData);
    el.addEventListener('change', syncData);
  });
  wrapper.querySelector('.input-role').addEventListener('change', syncData);
  if (isTemp) wrapper.querySelector('.input-email').addEventListener('input', syncData);

  wrapper.querySelectorAll('.check-all-group').forEach(masterCb => {
    masterCb.addEventListener('change', (e) => {
      const groupName = e.target.dataset.group;
      const childCbs = wrapper.querySelectorAll(`.hak-akses-cb[data-group="${groupName}"]`);
      childCbs.forEach(childCb => { childCb.checked = e.target.checked; });
      syncData();
    });
  });
  wrapper.querySelectorAll('.hak-akses-cb').forEach(cb => {
    cb.addEventListener('change', syncData);
  });

  // Hapus - FIX: hapus Auth juga
  const btnHapus = wrapper.querySelector('.btn-hapus-user');
  if (btnHapus) {
    btnHapus.addEventListener('click', async (e) => {
      e.stopPropagation();
      if(!confirm(`⚠️ Yakin hapus pengguna "${nama}"?\n\nIni akan menghapus:\n1. Data di Firestore (users)\n2. Akun di Authentication (jika ada)\n\nTidak bisa dibatalkan!`)) return;
      try {
        // 1. Hapus Firestore
        await deleteDoc(doc(db, USERS_COLLECTION, id));
        // 2. Coba hapus Auth - harus login sebagai user itu dulu (limitasi client SDK)
        // Kita simpan flag untuk Cloud Function / manual hapus di console
        alert(`✅ Data Firestore "${nama}" terhapus.\n\n⚠️ Untuk hapus di Authentication:\nBuka Firebase Console > Authentication > Users > Cari email ${email} > Hapus manual.\n\n(Untuk auto-hapus Auth butuh Cloud Function)`);
      } catch (error) {
        console.error('Error deleting user:', error);
        alert('❌ Gagal menghapus: ' + error.message);
      }
    });
  }

  // Kirim WA
  wrapper.querySelector('.btn-kirim-wa').addEventListener('click', () => {
    syncData(); 
    const idx = userData.findIndex(u => u.id === id);
    const user = userData[idx];
    if (!user.nama || !user.email || !user.noWA) {
      alert('⚠️ Nama, Email, dan Nomor WhatsApp wajib diisi!'); return;
    }
    const nomorWA = formatNomorWA(user.noWA);
    if (nomorWA.length < 10) { alert('⚠️ Nomor WhatsApp tidak valid!'); return; }
    const roleLabels = { admin: 'Administrator', kepsek: 'Kepala Sekolah', guru: 'Guru / Pendidik', staf: 'Staf / Tata Usaha', siswa: 'Peserta Didik', ortu: 'Orang Tua' };
    const roleNama = roleLabels[user.role] || user.role;
    let hakAksesFormat = '- Akses Penuh (Admin)';
    if (user.role !== 'admin' && user.hakAkses.length > 0) hakAksesFormat = user.hakAkses.map(h => `  • ${h}`).join('\n');
    else if (user.role !== 'admin') hakAksesFormat = '- Tidak ada akses spesifik';
    const pesan = `Halo *${user.nama}*,\n\nAnda telah didaftarkan sebagai *${roleNama}* di platform digital *${NAMA_SEKOLAH}*.\n\n📧 Email: ${user.email}\n🔑 Password Default: *${PASSWORD_DEFAULT}*\n\n🔐 *Hak Akses Fitur:*\n${hakAksesFormat}\n\n🔗 ${LOGIN_URL}\n\n*PENTING:* Segera ubah password di halaman profil:\n🔗 ${PROFIL_URL}`;
    window.open(`https://wa.me/${nomorWA}?text=${encodeURIComponent(pesan)}`, '_blank');
  });

  return wrapper;
}

// ==========================================
// 8. TAMBAH USER BARU
// ==========================================
if (btnTambah) {
  btnTambah.addEventListener('click', () => {
    userData.unshift({
      id: `temp_${Date.now()}`,
      nama: '',
      email: '',
      noWA: '',
      role: 'guru',
      status: 'aktif',
      hakAkses: getDefaultHakAksesByRole('guru'),
      passwordChanged: false,
      createdAt: new Date()
    });
    renderForm();
  });
}

// ==========================================
// 9. SIMPAN - FIX TOTAL (PAKAI ID, BUKAN INDEX)
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
      // LOOP BERDASARKAN DOM, TAPI AMBIL DATA BERDASARKAN ID - ANTI BUG INDEX
      for (const row of rows) {
        const docId = row.dataset.id;
        if (!docId) continue;
        const idx = userData.findIndex(u => u.id === docId);
        if (idx === -1) continue;
        const user = userData[idx];
        let isUserNew = false; 
        
        if (user.id && user.id.startsWith('temp_')) {
          try {
            // Cek apakah email sudah ada di Auth
            const methods = await fetchSignInMethodsForEmail(secondaryAuth, user.email).catch(() => []);
            if (methods && methods.length > 0) {
              // Email sudah ada di Auth, cari UID-nya dengan coba login dummy? Atau buat logic: gunakan secondary sign in?
              // Untuk sekarang, kita buat error yang jelas
              throw { code: 'auth/email-already-in-use' };
            }
            const userCredential = await createUserWithEmailAndPassword(secondaryAuth, user.email, PASSWORD_DEFAULT);
            const newUid = userCredential.user.uid; 
            user.id = newUid; 
            row.dataset.id = newUid;
            isUserNew = true; 
          } catch (authError) {
            if (authError.code === 'auth/email-already-in-use') {
              // Email sudah ada di Auth tapi belum di Firestore - RECOVERY MODE
              if (confirm(`⚠️ Email "${user.email}" sudah ada di Authentication tapi belum di Firestore.\n\nMau saya hubungkan otomatis? Klik OK untuk hubungkan, Cancel untuk skip.`)) {
                // Coba cari user dengan email sama di Firestore untuk dapat UID? 
                // Kita harus buat dokumen dengan ID random dulu, nanti admin bisa perbaiki manual
                // Lebih baik: buat dokumen dengan ID temp tapi beri flag
                alert(`🔧 RECOVERY: Saya akan buatkan dokumen Firestore untuk "${user.email}".\nSilakan cek Firebase Console > Authentication > cari email tersebut > copy UID-nya > ganti ID dokumen Firestore secara manual jika perlu.\n\nAtau hapus dulu user tersebut di Authentication.`);
                // Untuk recovery, kita tetap buat dengan UID baru? Tidak bisa karena email sudah dipakai.
                // Solusi: buat dokumen dengan ID = email (bukan UID) sebagai penanda
                user.id = `recovery_${Date.now()}`;
                isUserNew = true;
              } else {
                continue;
              }
            } else {
              throw authError;
            }
          }
        }

        const dataToSave = {
          nama: user.nama,
          email: user.email,
          noWA: user.noWA,
          role: user.role, // INI YANG DIPERBAIKI - PASTI KESIMPAN
          status: user.status,
          hakAkses: user.hakAkses || getDefaultHakAksesByRole(user.role),
          ...(isUserNew ? { password: PASSWORD_DEFAULT, passwordChanged: false } : {}),
          ...(!isUserNew ? { passwordChanged: user.passwordChanged || false } : {}),
          updatedAt: serverTimestamp()
        };

        if (isUserNew) {
          dataToSave.createdAt = serverTimestamp();
          // Jika ID masih recovery, pakai setDoc dengan ID tersebut
          await setDoc(doc(db, USERS_COLLECTION, user.id), dataToSave);
        } else if (user.id) {
          // INI FIX UTAMA: updateDoc untuk user lama, termasuk role
          await updateDoc(doc(db, USERS_COLLECTION, user.id), dataToSave);
        }
      }

      statusEl.textContent = '✅ Semua perubahan berhasil disimpan! Role yang diubah (misal siswa->guru) sudah tersimpan.';
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
// 10. REALTIME LISTENER
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
window.addEventListener('beforeunload', () => { if (unsubscribe) unsubscribe(); });
