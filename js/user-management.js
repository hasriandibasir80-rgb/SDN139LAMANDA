import { db } from './firebase-config.js';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc,
  serverTimestamp,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ==========================================
// 1. VALIDASI & KONFIGURASI
// ==========================================
const userRole = localStorage.getItem('userRole');
if (userRole !== 'admin') {
  alert('⛔ Akses Ditolak: Halaman ini hanya untuk Administrator.');
  window.location.href = '../dashboard.html'; 
}

const NAMA_SEKOLAH = 'SDN 139 LAMANDA';
const PASSWORD_DEFAULT = 'sdn139lamanda2024';
const LOGIN_URL = 'https://hasriandibasi80-rgb.github.io/SDN139LAMANDA/dashboard.html';
const PROFIL_URL = 'https://hasriandibasi80-rgb.github.io/SDN139LAMANDA/modules/profil-user.html';
const USERS_COLLECTION = 'users'; // Nama collection di Firestore

// ==========================================
// 2. INISIALISASI DOM & STATE
// ==========================================
const container = document.getElementById('daftarUserContainer');
const btnTambah = document.getElementById('btnTambahUser');
const btnSimpan = document.getElementById('btnSimpanUser');
const statusEl = document.getElementById('adminStatus');

let userData = [];
let unsubscribe = null; // Untuk menghentikan listener saat halaman ditutup

// ==========================================
// 3. FUNGSI HELPER
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

// ==========================================
// 4. FUNGSI RENDER
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
// 5. FUNGSI TAMBAH BARIS (CORE UI)
// ==========================================
function tambahRow(id, nama, email, noWA, role, status, hakAkses, passwordChanged, createdAt, index) {
  const row = document.createElement('div');
  row.className = 'user-row';
  
  // Gunakan ID untuk hapus, bukan index
  const deleteBtn = id && !id.startsWith('temp_')
    ? `<button type="button" class="btn-hapus-user" data-id="${id}">✕</button>`
    : '';

  const hakAksesText = Array.isArray(hakAkses) ? hakAkses.join('\n') : '';
  const statusBadge = passwordChanged 
    ? '<span style="color: #16a34a; font-weight: 600; font-size: 12px;">✅ Password Sudah Diganti</span>'
    : '<span style="color: #dc2626; font-weight: 600; font-size: 12px;">⚠️ Masih Password Default</span>';

  row.innerHTML = `
    ${deleteBtn}
    
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px dashed #cbd5e1;">
      <div>
        <strong style="color: #1e3c72; font-size: 15px;" class="label-nama">${nama || 'Nama belum diisi'}</strong>
        <div style="font-size: 12px; color: #64748b;" class="label-email">${email || 'Email belum diisi'}</div>
      </div>
      <div style="text-align: right;">
        <div style="margin-bottom: 4px;">${statusBadge}</div>
        <div style="font-size: 11px; color: #94a3b8;">Dibuat: ${formatTanggal(createdAt)}</div>
      </div>
    </div>
    
    <div class="user-row-grid-2">
      <div class="admin-form-group" style="margin-bottom: 0;">
        <label>Nama Lengkap *</label>
        <input type="text" class="admin-input input-nama" value="${nama}" placeholder="Contoh: Budi Santoso">
      </div>
      <div class="admin-form-group" style="margin-bottom: 0;">
        <label>Email *</label>
        <input type="email" class="admin-input input-email" value="${email}" placeholder="user@sekolah.id">
      </div>
    </div>
    
    <div class="user-row-grid-3">
      <div class="admin-form-group" style="margin-bottom: 0;">
        <label>Nomor WhatsApp *</label>
        <input type="tel" class="admin-input input-nowa" value="${noWA}" placeholder="08123456789">
      </div>
      <div class="admin-form-group" style="margin-bottom: 0;">
        <label>Peran (Role)</label>
        <select class="admin-input input-role" style="cursor: pointer;">
          <option value="admin" ${role === 'admin' ? 'selected' : ''}>Administrator</option>
          <option value="kepsek" ${role === 'kepsek' ? 'selected' : ''}>Kepala Sekolah</option>
          <option value="guru" ${role === 'guru' ? 'selected' : ''}>Guru</option>
          <option value="staf" ${role === 'staf' ? 'selected' : ''}>Staf / Tata Usaha</option>
          <option value="siswa" ${role === 'siswa' ? 'selected' : ''}>Peserta Didik</option>
          <option value="ortu" ${role === 'ortu' ? 'selected' : ''}>Orang Tua</option>
        </select>
      </div>
      <div class="admin-form-group" style="margin-bottom: 0;">
        <label>Status</label>
        <select class="admin-input input-status" style="cursor: pointer;">
          <option value="aktif" ${status === 'aktif' ? 'selected' : ''}>✅ Aktif</option>
          <option value="non-aktif" ${status === 'non-aktif' ? 'selected' : ''}>⛔ Non-Aktif</option>
        </select>
      </div>
    </div>

    <div style="display: flex; gap: 16px; margin-top: 12px; align-items: flex-end; flex-wrap: wrap;">
      <div style="flex: 1; min-width: 200px;">
        <label style="display: block; margin-bottom: 6px; font-weight: 600; font-size: 14px; color: #334155;">Password Default</label>
        <input type="text" class="admin-input" value="${PASSWORD_DEFAULT}" readonly style="background: #f1f5f9; cursor: not-allowed; color: #64748b;">
        <p class="helper-text">Tidak dapat diubah manual di sini</p>
      </div>
      <div style="flex: 2; min-width: 250px;">
        <button type="button" class="btn-kirim-wa" style="width: 100%; padding: 10px; background: #25D366; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; display: flex; align-items: center; justify-content: center; gap: 6px; transition: all 0.2s;">
          📱 Kirim Undangan via WhatsApp
        </button>
      </div>
    </div>

    <div class="hak-akses-section">
      <div class="hak-akses-header">
        <label>🔐 Hak Akses Fitur (Input Manual)</label>
        <span class="hak-akses-hint">Satu fitur per baris. Kosongkan = tidak ada akses.</span>
      </div>
      <textarea class="admin-textarea-hak-akses input-hak-akses" placeholder="Contoh:\nAdmin Pembelajaran\nLKPD">${hakAksesText}</textarea>
    </div>
  `;

  container.appendChild(row);

  // --- LOGIKA SYNC DATA REAL-TIME ---
  const syncData = () => {
    if (index !== null && userData[index]) {
      userData[index].nama = row.querySelector('.input-nama').value.trim();
      userData[index].email = row.querySelector('.input-email').value.trim();
      userData[index].noWA = row.querySelector('.input-nowa').value.trim();
      userData[index].role = row.querySelector('.input-role').value;
      userData[index].status = row.querySelector('.input-status').value;
      
      const haText = row.querySelector('.input-hak-akses').value.trim();
      userData[index].hakAkses = haText ? haText.split('\n').map(h => h.trim()).filter(h => h.length > 0) : [];
      
      row.querySelector('.label-nama').textContent = userData[index].nama || 'Nama belum diisi';
      row.querySelector('.label-email').textContent = userData[index].email || 'Email belum diisi';
    }
  };

  row.querySelectorAll('input, select, textarea').forEach(element => {
    element.addEventListener('input', syncData);
    element.addEventListener('change', syncData);
  });

  // --- EVENT LISTENER: HAPUS (Menggunakan ID Dokumen) ---
  if (id && !id.startsWith('temp_')) {
    row.querySelector('.btn-hapus-user').addEventListener('click', async () => {
      if(confirm('Yakin ingin menghapus pengguna ini dari database?')) {
        try {
          await deleteDoc(doc(db, USERS_COLLECTION, id));
          // Data akan otomatis ter-update via onSnapshot
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
    const hakAksesFormat = user.hakAkses.length > 0 ? user.hakAkses.map(h => `- ${h}`).join('\n') : '- Tidak ada akses spesifik';

    const pesan = `Halo *${user.nama}*,\n\nAnda telah didaftarkan sebagai *${roleNama}* di platform digital *${NAMA_SEKOLAH}*.\n\nBerikut adalah informasi akun Anda:\n📧 Email: ${user.email}\n🔑 Password Default: *${PASSWORD_DEFAULT}*\n\n🔐 *Hak Akses Fitur:*\n${hakAksesFormat}\n\nSilakan masuk ke akun Anda melalui tautan berikut:\n🔗 ${LOGIN_URL}\n\n*PENTING:* Demi keamanan, mohon segera ubah password default Anda pada halaman profil setelah berhasil masuk:\n🔗 ${PROFIL_URL}\n\nTerima kasih.`;

    const encodedPesan = encodeURIComponent(pesan);
    window.open(`https://wa.me/${nomorWA}?text=${encodedPesan}`, '_blank');
  });
}

// ==========================================
// 6. EVENT LISTENER: TAMBAH USER BARU
// ==========================================
if (btnTambah) {
  btnTambah.addEventListener('click', () => {
    // Tambahkan objek sementara ke array agar langsung ter-render
    userData.unshift({
      id: `temp_${Date.now()}`, // ID sementara
      nama: '',
      email: '',
      noWA: '',
      role: 'guru',
      status: 'aktif',
      hakAkses: [],
      passwordChanged: false,
      createdAt: new Date()
    });
    renderForm();
  });
}

// ==========================================
// 7. EVENT LISTENER: SIMPAN SEMUA PERUBAHAN
// ==========================================
if (btnSimpan) {
  btnSimpan.addEventListener('click', async () => {
    const rows = container.querySelectorAll('.user-row');
    let isValid = true;
    let hasChanges = false;

    // Validasi UI terlebih dahulu
    rows.forEach((row, index) => {
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
    btnSimpan.innerHTML = '⏳ Menyimpan...';
    statusEl.className = 'admin-status';
    statusEl.style.display = 'none';

    try {
      // Proses simpan ke Firestore
      for (let index = 0; index < rows.length; index++) {
        const row = rows[index];
        const user = userData[index];
        
        const dataToSave = {
          nama: user.nama,
          email: user.email,
          noWA: user.noWA,
          role: user.role,
          status: user.status,
          hakAkses: user.hakAkses,
          password: PASSWORD_DEFAULT,
          passwordChanged: user.passwordChanged,
          updatedAt: serverTimestamp()
        };

        // Jika ID dimulai dengan 'temp_', berarti ini user baru -> addDoc
        if (user.id && user.id.startsWith('temp_')) {
          dataToSave.createdAt = serverTimestamp();
          const docRef = await addDoc(collection(db, USERS_COLLECTION), dataToSave);
          user.id = docRef.id; // Update ID sementara menjadi ID asli dari Firestore
        } 
        // Jika sudah punya ID asli -> updateDoc
        else if (user.id) {
          await updateDoc(doc(db, USERS_COLLECTION, user.id), dataToSave);
        }
        
        hasChanges = true;
      }

      if (hasChanges) {
        statusEl.textContent = '✅ Data pengguna berhasil disimpan ke Firestore!';
        statusEl.className = 'admin-status success';
        statusEl.style.display = 'block';
      } else {
        statusEl.textContent = 'ℹ️ Tidak ada perubahan yang perlu disimpan.';
        statusEl.className = 'admin-status';
        statusEl.style.display = 'block';
      }

    } catch (error) {
      console.error('Error saving to Firestore:', error);
      statusEl.textContent = '❌ Gagal menyimpan. Periksa konsol untuk detail error.';
      statusEl.className = 'admin-status error';
      statusEl.style.display = 'block';
    } finally {
      btnSimpan.disabled = false;
      btnSimpan.innerHTML = '💾 Simpan Semua Perubahan';
    }
  });
}

// ==========================================
// 8. REALTIME LISTENER (FIRESTORE)
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

// Mulai listening saat halaman dimuat
startListening();

// Bersihkan listener saat halaman ditutup untuk mencegah memory leak
window.addEventListener('beforeunload', () => {
  if (unsubscribe) {
    unsubscribe();
  }
});
