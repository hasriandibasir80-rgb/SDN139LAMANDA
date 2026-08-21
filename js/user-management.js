// V6 FINAL - Jika kamu lihat ini di Console berarti file sudah terbaru - Build: 2026-08-16 23:00
// ==========================================
// USER MANAGEMENT - FINAL ANTI-TIPU V5
// Fix: Pesan hijau palsu + Firestore tidak ke-update
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

const secondaryApp = initializeApp(firebaseConfig, "SecondaryAdminApp");
const secondaryAuth = getAuth(secondaryApp);

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

function getDefaultHakAksesByRole(role) {
  const defaults = {
    admin: Object.values(semuaFitur).flat().map(f => f.nama),
    kepsek: Object.values(semuaFitur).flat().map(f => f.nama),
    guru: ['CP, TP, & ATP', 'Program Tahunan', 'Program Semester', 'lckh', 'Jurnal Harian', 'Analisis KKTP', 'Rumus 8-3-3-4', 'Refleksi Guru', 'Kalender Pendidikan', 'Jadwal Pembelajaran', 'Presensi Siswa', 'LKPD', 'Penilaian', 'Pembuat Soal', 'Pembuat Kisi-kisi', 'Bank RPM', 'RPM Spesifik', 'Bantuan AI'],
    staf: ['Kalender Pendidikan', 'Jadwal Pembelajaran', 'Presensi Siswa', 'Bank Soal'],
    siswa: ['Jadwal Pembelajaran', 'Kalender Pendidikan'],
    ortu: ['Jadwal Pembelajaran', 'Kalender Pendidikan', 'Presensi Siswa']
  };
  return defaults[role] || [];
}

const container = document.getElementById('daftarUserContainer');
const btnTambah = document.getElementById('btnTambahUser');
const btnSimpan = document.getElementById('btnSimpanUser');
const statusEl = document.getElementById('adminStatus');

let userData = [];
let unsubscribe = null;
let activeEditId = null;

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

function renderForm() {
  container.innerHTML = '';
  if (userData.length > 0) {
    const searchWrapper = document.createElement('div');
    searchWrapper.style.cssText = 'margin-bottom:16px; display:flex; gap:8px;';
    searchWrapper.innerHTML = `
      <input type="text" id="searchUser" placeholder="🔍 Cari nama / email / role..." style="flex:1; padding:10px 14px; border:1px solid #cbd5e1; border-radius:8px; font-size:14px;">
      <span style="background:#f1f5f9; padding:10px 12px; border-radius:8px; font-size:12px; color:#64748b;">Total: ${userData.length} user (Firestore)</span>
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
          <label style="display:block; font-size:13px; font-weight:600; color:#475569; margin-bottom:4px;">Email *</label>
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

  const btnHapus = wrapper.querySelector('.btn-hapus-user');
  if (btnHapus) {
    btnHapus.addEventListener('click', async (e) => {
      e.stopPropagation();
      if(!confirm(`Yakin hapus "${nama}"?`)) return;
      try { await deleteDoc(doc(db, USERS_COLLECTION, id)); alert(`Firestore "${nama}" terhapus. Hapus manual di Authentication.`); } 
      catch (error) { alert('Gagal: ' + error.message); }
    });
  }

  wrapper.querySelector('.btn-kirim-wa').addEventListener('click', () => {
    const namaVal = wrapper.querySelector('.input-nama').value.trim();
    const emailVal = wrapper.querySelector('.input-email').value.trim();
    const noWAVal = wrapper.querySelector('.input-nowa').value.trim();
    const roleVal = wrapper.querySelector('.input-role').value;
    const hakAksesVal = [...detail.querySelectorAll('.hak-akses-cb:checked')].map(cb => cb.value);
    if (!namaVal || !emailVal || !noWAVal) { alert('Nama, Email, WA wajib!'); return; }
    const nomorWA = formatNomorWA(noWAVal);
    const roleLabels = { admin: 'Administrator', kepsek: 'Kepala Sekolah', guru: 'Guru', staf: 'Staf', siswa: 'Peserta Didik', ortu: 'Orang Tua' };
    let hakAksesFormat = hakAksesVal.length > 0 ? hakAksesVal.map(h => `  • ${h}`).join('\n') : '- Tidak ada';
    const pesan = `Halo *${namaVal}*, Anda terdaftar sebagai *${roleLabels[roleVal]||roleVal}* di ${NAMA_SEKOLAH}. Email: ${emailVal} Password: *${PASSWORD_DEFAULT}* Hak Akses:\n${hakAksesFormat} Link: ${LOGIN_URL}`;
    window.open(`https://wa.me/${nomorWA}?text=${encodeURIComponent(pesan)}`, '_blank');
  });

  return wrapper;
}

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
// 9. SIMPAN - FINAL V5 - ANTI TIPU + LOG LENGKAP
// ==========================================
if (btnSimpan) {
  btnSimpan.addEventListener('click', async () => {
    const rows = container.querySelectorAll('.user-item');
    let isValid = true;

    // Validasi
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
      alert('⚠️ Nama, Email, dan Nomor WhatsApp wajib diisi!');
      return;
    }

    // MATIKAN LISTENER BIAR TIDAK BENTROK PAS SIMPAN (INI KUNCI!)
    if (unsubscribe) {
      console.log('🔕 Mematikan realtime listener sementara...');
      unsubscribe();
      unsubscribe = null;
    }

    btnSimpan.disabled = true;
    btnSimpan.innerHTML = '⏳ Menyimpan ke Firestore...';
    statusEl.style.display = 'none';

    let successCount = 0;
    let failCount = 0;
    let logs = [];

    try {
      for (const row of rows) {
        const docId = row.dataset.id;
        if (!docId) continue;
        
        const detail = row.querySelector('.user-detail');
        if (!detail) continue;

        // BACA LANGSUNG DARI DOM - PALING FRESH
        const nama = detail.querySelector('.input-nama').value.trim();
        const email = detail.querySelector('.input-email').value.trim().toLowerCase();
        const noWA = formatNomorWA(detail.querySelector('.input-nowa').value.trim());
        const role = detail.querySelector('.input-role').value;
        const status = detail.querySelector('.input-status').value;
        const hakAkses = [...detail.querySelectorAll('.hak-akses-cb:checked')].map(cb => cb.value);

        const isNew = docId.startsWith('temp_');
        let finalId = docId;

        console.log(`📝 Akan simpan: ${email} | Role: ${role} | HakAkses: ${hakAkses.length} item`, hakAkses);
        logs.push(`- ${email}: ${hakAkses.length} akses`);

        // Jika user baru, buat Auth dulu
        if (isNew) {
          try {
            const methods = await fetchSignInMethodsForEmail(secondaryAuth, email).catch(() => []);
            if (methods && methods.length > 0) throw { code: 'auth/email-already-in-use' };
            const cred = await createUserWithEmailAndPassword(secondaryAuth, email, PASSWORD_DEFAULT);
            finalId = cred.user.uid;
            console.log(`✅ Auth baru: ${email} -> ${finalId}`);
          } catch (authError) {
            if (authError.code === 'auth/email-already-in-use') {
              if (!confirm(`Email "${email}" sudah ada di Auth. Tetap buat dokumen Firestore?`)) continue;
              finalId = `recovery_${Date.now()}`;
            } else {
              console.error('❌ Auth error:', authError);
              failCount++;
              alert(`Gagal buat Auth untuk ${email}: ${authError.message}`);
              continue;
            }
          }
        }

        const oldData = userData.find(u => u.id === docId) || {};
        const finalHakAkses = hakAkses.length > 0 ? hakAkses : getDefaultHakAksesByRole(role);

        const dataToSave = {
          nama: nama,
          email: email,
          noWA: noWA,
          role: role,
          status: status,
          hakAkses: finalHakAkses,
          updatedAt: serverTimestamp(),
          ...(isNew ? { password: PASSWORD_DEFAULT, passwordChanged: false, createdAt: serverTimestamp() } : { passwordChanged: oldData.passwordChanged || false })
        };

        // SIMPAN KE FIRESTORE - INI YANG SEBELUMNYA GAGAL DIAM-DIAM
        try {
          if (isNew) {
            await setDoc(doc(db, USERS_COLLECTION, finalId), dataToSave);
            console.log(`✅ setDoc BERHASIL untuk ${email} dengan ID ${finalId}`);
          } else {
            try { await updateDoc(doc(db, USERS_COLLECTION, docId), dataToSave); } catch(e) { console.warn('updateDoc gagal, coba setDoc merge', e); await setDoc(doc(db, USERS_COLLECTION, docId), dataToSave, {merge: true}); }
            console.log(`✅ updateDoc BERHASIL untuk ${email} (${docId}) - Role: ${role} - Hak:`, finalHakAkses);
          }
          successCount++;
        } catch (firestoreError) {
          console.error(`❌ Firestore error untuk ${email}:`, firestoreError);
          failCount++;
          alert(`❌ GAGAL simpan ${email} ke Firestore:\n${firestoreError.message}\n\nCek Rules Firestore kamu!`);
          throw firestoreError; // Stop loop agar tidak kasih pesan sukses palsu
        }
      }

      // Jika sampai sini berarti semua berhasil
      statusEl.textContent = `✅ Berhasil simpan ${successCount} user ke Firestore!\n` + logs.join('\n') + '\n\nCek di Firebase Console > Firestore > users untuk pastikan Data Perpustakaan ada.';
      statusEl.className = 'admin-status success';
      statusEl.style.display = 'block';
      statusEl.style.cssText = 'display:block; background:#dcfce7; color:#166534; padding:12px; border-radius:8px; margin-top:12px; font-weight:600; white-space:pre-wrap;';

    } catch (error) {
      console.error('Error saving:', error);
      statusEl.textContent = `❌ GAGAL total: ${error.message}\n\n${failCount} gagal, ${successCount} berhasil.\nCek Console (F12) untuk detail.`;
      statusEl.className = 'admin-status error';
      statusEl.style.display = 'block';
      statusEl.style.cssText = 'display:block; background:#fee2e2; color:#991b1b; padding:12px; border-radius:8px; margin-top:12px; white-space:pre-wrap;';
    } finally {
      btnSimpan.disabled = false;
      btnSimpan.innerHTML = '💾 Simpan Semua Perubahan';
      
      // NYALAKAN LAGI LISTENER SETELAH 1 DETIK
      setTimeout(() => {
        console.log('🔔 Menyalakan kembali realtime listener...');
        startListening();
      }, 1000);
    }
  });
}

function startListening() {
  const q = query(collection(db, USERS_COLLECTION), orderBy('createdAt', 'desc'));
  unsubscribe = onSnapshot(q, (snapshot) => {
    userData = snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    }));
    console.log(`📡 Firestore snapshot: ${userData.length} users`);
    renderForm();
  }, (error) => {
    console.error('Error listening to users:', error);
    container.innerHTML = '<div class="helper-text" style="text-align: center; padding: 20px; color: #dc2626;">❌ Gagal memuat data. Periksa koneksi atau aturan Firestore.</div>';
  });
}
startListening();
window.addEventListener('beforeunload', () => { if (unsubscribe) unsubscribe(); });
