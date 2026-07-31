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

// ✅ BARU: Import konfigurasi fitur untuk membuat checkbox dinamis
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
// ✅ DIPERBAIKI: Konsistensi password default
const PASSWORD_DEFAULT = 'bilal2011'; 
const LOGIN_URL = 'https://hasriandibasi80-rgb.github.io/SDN139LAMANDA/dashboard.html';
const PROFIL_URL = 'https://hasriandibasi80-rgb.github.io/SDN139LAMANDA/modules/profil-user.html';
const USERS_COLLECTION = 'users';

// Gabungkan semua fitur untuk referensi checkbox
const semuaFitur = { ...konfigurasiFitur, ...controlCenterFitur };

// ==========================================
// 4. INISIALISASI DOM & STATE
// ==========================================
const container = document.getElementById('daftarUserContainer');
const btnTambah = document.getElementById('btnTambahUser');
const btnSimpan = document.getElementById('btnSimpanUser');
const statusEl = document.getElementById('adminStatus');

let userData = [];
let unsubscribe = null;

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

// ✅ BARU: Fungsi untuk merender Checkbox Hak Akses
function renderHakAksesCheckboxes(hakAksesSaatIni, index) {
  let html = '';
  
  for (const [fiturKey, subFiturList] of Object.entries(semuaFitur)) {
    // Cari nama fitur utama (misal: 'admin-pembelajaran' -> 'Administrasi Pembelajaran')
    // Kita ambil dari opsi select role atau hardcode mapping sederhana, 
    // tapi untuk aman, kita gunakan nama yang mudah dibaca dari key atau kita buat mapping.
    // Agar simpel, kita gunakan nama fitur dari service-menu.js jika ada, atau capitalize key.
    const namaFiturUtama = fiturKey.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    
    // Cek apakah SEMUA sub-fitur di kategori ini sudah diceklis
    const semuaSubFiturTerpilih = subFiturList.every(sub => hakAksesSaatIni.includes(sub.nama));

    html += `<div style="margin-bottom: 16px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; background: #ffffff;">`;
    html += `<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px;">`;
    html += `<strong style="font-size: 14px; color: #1e3c72;">${namaFiturUtama}</strong>`;
    html += `<label style="font-size: 12px; color: #3b82f6; cursor: pointer; display: flex; align-items: center; gap: 4px;">`;
    html += `<input type="checkbox" class="check-all-group" data-group="${fiturKey}" ${semuaSubFiturTerpilih ? 'checked' : ''}> Pilih Semua`;
    html += `</label>`;
    html += `</div>`;
    
    html += `<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 8px;">`;
    subFiturList.forEach(sub => {
      const isChecked = hakAksesSaatIni.includes(sub.nama) ? 'checked' : '';
      html += `
        <label style="display: flex; align-items: flex-start; gap: 8px; font-size: 13px; color: #334155; cursor: pointer; padding: 4px; border-radius: 4px; transition: background 0.2s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='transparent'">
          <input type="checkbox" class="hak-akses-cb" data-group="${fiturKey}" value="${sub.nama}" ${isChecked} style="margin-top: 3px; accent-color: #2563eb; width: 16px; height: 16px; cursor: pointer;">
          <span>${sub.nama}</span>
        </label>
      `;
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
  if (userData.length === 0) {
    const emptyMsg = document.createElement('div');
    emptyMsg.className = 'helper-text';
    emptyMsg.style.textAlign = 'center';
    emptyMsg.style.padding = '20px';
    emptyMsg.textContent = 'Belum ada data pengguna. Klik "Tambah Pengguna Baru" untuk memulai.';
    container.appendChild(emptyMsg);
  } else {
    userData.forEach((item, index) => {
      tambahRow(
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
    });
  }
}

// ==========================================
// 7. FUNGSI TAMBAH BARIS
// ==========================================
function tambahRow(id, nama, email, noWA, role, status, hakAkses, passwordChanged, createdAt, index) {
  const row = document.createElement('div');
  row.className = 'user-row';
  row.style.border = '1px solid #e2e8f0';
  row.style.borderRadius = '12px';
  row.style.padding = '16px';
  row.style.marginBottom = '16px';
  row.style.background = '#ffffff';
  
  const deleteBtn = id && !id.startsWith('temp_')
    ? `<button type="button" class="btn-hapus-user" data-id="${id}" style="position: absolute; top: 16px; right: 16px; background: #fee2e2; color: #dc2626; border: none; border-radius: 50%; width: 32px; height: 32px; cursor: pointer; font-weight: bold; display: flex; align-items: center; justify-content: center;">✕</button>`
    : '';

  const statusBadge = passwordChanged 
    ? '<span style="color: #16a34a; font-weight: 600; font-size: 12px; background: #dcfce7; padding: 4px 8px; border-radius: 12px;">✅ Password Sudah Diganti</span>'
    : '<span style="color: #dc2626; font-weight: 600; font-size: 12px; background: #fee2e2; padding: 4px 8px; border-radius: 12px;">⚠️ Masih Default</span>';

  // ✅ GENERATE CHECKBOX HAK AKSES
  const checkboxHTML = renderHakAksesCheckboxes(hakAkses, index);

  row.innerHTML = `
    ${deleteBtn}
    
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px dashed #cbd5e1;">
      <div>
        <strong style="color: #1e3c72; font-size: 16px;" class="label-nama">${nama || 'Nama belum diisi'}</strong>
        <div style="font-size: 13px; color: #64748b; margin-top: 4px;" class="label-email">${email || 'Email belum diisi'}</div>
      </div>
      <div style="text-align: right;">
        <div style="margin-bottom: 4px;">${statusBadge}</div>
        <div style="font-size: 11px; color: #94a3b8;">Dibuat: ${formatTanggal(createdAt)}</div>
      </div>
    </div>
    
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-bottom: 12px;">
      <div class="admin-form-group">
        <label style="display: block; font-size: 13px; font-weight: 600; color: #475569; margin-bottom: 4px;">Nama Lengkap *</label>
        <input type="text" class="admin-input input-nama" value="${nama}" placeholder="Contoh: Budi Santoso" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px;">
      </div>
      <div class="admin-form-group">
        <label style="display: block; font-size: 13px; font-weight: 600; color: #475569; margin-bottom: 4px;">Email *</label>
        <input type="email" class="admin-input input-email" value="${email}" placeholder="user@sekolah.id" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px;">
      }
      <div class="admin-form-group">
        <label style="display: block; font-size: 13px; font-weight: 600; color: #475569; margin-bottom: 4px;">Nomor WhatsApp *</label>
        <input type="tel" class="admin-input input-nowa" value="${noWA}" placeholder="08123456789" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px;">
      </div>
      <div class="admin-form-group">
        <label style="display: block; font-size: 13px; font-weight: 600; color: #475569; margin-bottom: 4px;">Peran (Role)</label>
        <select class="admin-input input-role" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px; cursor: pointer; background: white;">
          <option value="admin" ${role === 'admin' ? 'selected' : ''}>Administrator</option>
          <option value="kepsek" ${role === 'kepsek' ? 'selected' : ''}>Kepala Sekolah</option>
          <option value="guru" ${role === 'guru' ? 'selected' : ''}>Guru</option>
          <option value="staf" ${role === 'staf' ? 'selected' : ''}>Staf / Tata Usaha</option>
          <option value="siswa" ${role === 'siswa' ? 'selected' : ''}>Peserta Didik</option>
          <option value="ortu" ${role === 'ortu' ? 'selected' : ''}>Orang Tua</option>
        </select>
      </div>
      <div class="admin-form-group">
        <label style="display: block; font-size: 13px; font-weight: 600; color: #475569; margin-bottom: 4px;">Status</label>
        <select class="admin-input input-status" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px; cursor: pointer; background: white;">
          <option value="aktif" ${status === 'aktif' ? 'selected' : ''}>✅ Aktif</option>
          <option value="non-aktif" ${status === 'non-aktif' ? 'selected' : ''}>⛔ Non-Aktif</option>
        </select>
      </div>
    </div>

    <div style="display: flex; gap: 12px; margin-top: 16px; align-items: flex-end; flex-wrap: wrap;">
      <div style="flex: 1; min-width: 200px;">
        <label style="display: block; font-size: 13px; font-weight: 600; color: #475569; margin-bottom: 4px;">Password Default</label>
        <input type="text" class="admin-input" value="${PASSWORD_DEFAULT}" readonly style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; background: #f1f5f9; cursor: not-allowed; color: #64748b; font-size: 14px;">
        <p class="helper-text" style="font-size: 11px; color: #64748b; margin-top: 4px;">Tidak dapat diubah manual di sini</p>
      </div>
      <div style="flex: 2; min-width: 250px;">
        <button type="button" class="btn-kirim-wa" style="width: 100%; padding: 10px; background: #25D366; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; display: flex; align-items: center; justify-content: center; gap: 6px; transition: all 0.2s; font-size: 14px;">
          📱 Kirim Undangan via WhatsApp
        </button>
      </div>
    </div>

    <div class="hak-akses-section" style="margin-top: 20px;">
      <div class="hak-akses-header" style="margin-bottom: 12px;">
        <label style="display: block; font-size: 15px; font-weight: 700; color: #1e3c72; margin-bottom: 4px;">🔐 Hak Akses Fitur</label>
        <span class="hak-akses-hint" style="font-size: 12px; color: #64748b;">Ceklis sub-fitur yang diizinkan untuk diakses oleh pengguna ini.</span>
      </div>
      
      <!-- ✅ CONTAINER CHECKBOX DINAMIS (Scrollable di Mobile) -->
      <div class="hak-akses-checkbox-container" style="max-height: 350px; overflow-y: auto; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; background: #f8fafc;">
        ${checkboxHTML}
      </div>
    </div>
  `;

  container.appendChild(row);

  // --- LOGIKA SYNC DATA REAL-TIME (DIPERBAIKI UNTUK CHECKBOX) ---
  const syncData = () => {
    if (index !== null && userData[index]) {
      userData[index].nama = row.querySelector('.input-nama').value.trim();
      userData[index].email = row.querySelector('.input-email').value.trim();
      userData[index].noWA = row.querySelector('.input-nowa').value.trim();
      userData[index].role = row.querySelector('.input-role').value;
      userData[index].status = row.querySelector('.input-status').value;
      
      // ✅ BARU: Ambil semua checkbox yang DICENTANG, lalu ambil 'value'-nya
      const checkedBoxes = row.querySelectorAll('.hak-akses-cb:checked');
      userData[index].hakAkses = Array.from(checkedBoxes).map(cb => cb.value);
      
      row.querySelector('.label-nama').textContent = userData[index].nama || 'Nama belum diisi';
      row.querySelector('.label-email').textContent = userData[index].email || 'Email belum diisi';
    }
  };

  // Attach event listener ke semua input, select, DAN checkbox
  row.querySelectorAll('input, select').forEach(element => {
    element.addEventListener('input', syncData);
    element.addEventListener('change', syncData);
  });

  // ✅ LOGIKA "PILIH SEMUA" PER GRUP FITUR
  row.querySelectorAll('.check-all-group').forEach(masterCb => {
    masterCb.addEventListener('change', (e) => {
      const groupName = e.target.dataset.group;
      const childCbs = row.querySelectorAll(`.hak-akses-cb[data-group="${groupName}"]`);
      childCbs.forEach(childCb => {
        childCb.checked = e.target.checked;
      });
      syncData(); // Sinkronkan data setelah perubahan massal
    });
  });

  // --- EVENT LISTENER: HAPUS ---
  if (id && !id.startsWith('temp_')) {
    row.querySelector('.btn-hapus-user').addEventListener('click', async () => {
      if(confirm('Yakin ingin menghapus pengguna ini dari database?')) {
        try {
          await deleteDoc(doc(db, USERS_COLLECTION, id));
        } catch (error) {
          console.error('Error deleting user:', error);
          alert('❌ Gagal menghapus pengguna!');
        }
      }
    });
  }

  // --- EVENT LISTENER: KIRIM WHATSAPP ---
  row.querySelector('.btn-kirim-wa').addEventListener('click', () => {
    syncData(); 
    const user = userData[index];

    if (!user.nama || !user.email || !user.noWA) {
      alert('⚠️ Nama, Email, dan Nomor WhatsApp wajib diisi sebelum mengirim undangan!');
      return;
    }

    const nomorWA = formatNomorWA(user.noWA);
    if (nomorWA.length < 10) {
      alert('⚠️ Nomor WhatsApp tidak valid! Pastikan minimal 10 digit.');
      return;
    }

    const roleLabels = {
      admin: 'Administrator',
      kepsek: 'Kepala Sekolah',
      guru: 'Guru / Pendidik',
      staf: 'Staf / Tata Usaha',
      siswa: 'Peserta Didik',
      ortu: 'Orang Tua'
    };

    const roleNama = roleLabels[user.role] || user.role;
    
    // Format hak akses untuk pesan WA (lebih rapi)
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
}

// ==========================================
// 8. EVENT LISTENER: TAMBAH USER BARU
// ==========================================
if (btnTambah) {
  btnTambah.addEventListener('click', () => {
    // ✅ DEFAULT: Berikan akses ke fitur utama, atau biarkan kosong agar admin menceklis manual
    // Kita biarkan kosong agar admin benar-benar memilih, atau beri default minimal
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
    const rows = container.querySelectorAll('.user-row');
    let isValid = true;

    // 1. Validasi UI
    rows.forEach((row) => {
      const nama = row.querySelector('.input-nama').value.trim();
      const email = row.querySelector('.input-email').value.trim();
      const noWA = row.querySelector('.input-nowa').value.trim();
      
      if (!nama || !email || !noWA) {
        isValid = false;
        row.style.border = '2px solid #ef4444';
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
      // 2. Loop untuk memproses setiap baris
      for (let index = 0; index < rows.length; index++) {
        const user = userData[index];
        let isUserNew = false; 
        
        // LANGKAH A: Jika User Baru (ID masih temp_), daftarkan ke Auth dulu
        if (user.id && user.id.startsWith('temp_')) {
          try {
            console.log('🔄 Mendaftarkan user baru ke Auth:', user.email);
            const userCredential = await createUserWithEmailAndPassword(secondaryAuth, user.email, PASSWORD_DEFAULT);
            const newUid = userCredential.user.uid; 
            
            user.id = newUid; 
            isUserNew = true; 
            console.log('✅ User berhasil didaftarkan di Auth dengan UID:', newUid);
            
          } catch (authError) {
            if (authError.code === 'auth/email-already-in-use') {
              alert(`⚠️ Email "${user.email}" sudah terdaftar di sistem.`);
              throw new Error('Email sudah digunakan');
            }
            throw authError;
          }
        }

        // LANGKAH B: Siapkan Data untuk Firestore
        const dataToSave = {
          nama: user.nama,
          email: user.email,
          noWA: user.noWA,
          role: user.role,
          status: user.status,
          hakAkses: user.hakAkses || [], // ✅ Array ini sekarang berisi nama sub-fitur yang dicentang
          password: PASSWORD_DEFAULT,
          passwordChanged: user.passwordChanged || false,
          updatedAt: serverTimestamp()
        };

        // LANGKAH C: Simpan ke Firestore
        if (isUserNew) {
          dataToSave.createdAt = serverTimestamp();
          await setDoc(doc(db, USERS_COLLECTION, user.id), dataToSave);
          console.log('✅ CREATE: Dokumen user baru dibuat di Firestore.');
        } else if (user.id) {
          await updateDoc(doc(db, USERS_COLLECTION, user.id), dataToSave);
          console.log('✅ UPDATE: Dokumen user lama diperbarui di Firestore.');
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
