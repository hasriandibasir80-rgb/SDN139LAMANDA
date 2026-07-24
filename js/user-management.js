import { rtdb } from './firebase-config.js';
import { ref, onValue, set } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// 1. Validasi Admin
const userRole = localStorage.getItem('userRole');
if (userRole !== 'admin') {
  alert('⛔ Akses Ditolak: Halaman ini hanya untuk Administrator.');
  window.location.href = '../dashboard.html'; 
}

// 2. Inisialisasi Elemen DOM
const container = document.getElementById('daftarUserContainer');
const btnTambah = document.getElementById('btnTambahUser');
const btnSimpan = document.getElementById('btnSimpanUser');
const statusEl = document.getElementById('adminStatus');
const userRef = ref(rtdb, 'config/users');

let userData = [];

// 3. Fungsi Render
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
        item.nama, 
        item.email, 
        item.password, 
        item.role, 
        item.status, 
        item.hakAkses || [], 
        index
      );
    });
  }
}

// 4. Fungsi Tambah Baris (dengan field Hak Akses)
function tambahRow(nama = '', email = '', password = '', role = 'guru', status = 'aktif', hakAkses = [], index = null) {
  const row = document.createElement('div');
  row.className = 'user-row';
  
  const deleteBtn = index !== null 
    ? `<button type="button" class="btn-hapus-user" data-index="${index}">✕</button>`
    : '';

  // Convert array hakAkses menjadi string (satu per baris) untuk textarea
  const hakAksesText = Array.isArray(hakAkses) ? hakAkses.join('\n') : '';

  row.innerHTML = `
    ${deleteBtn}
    
    <!-- Baris 1: Nama & Email -->
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
    
    <!-- Baris 2: Password, Role, Status -->
    <div class="user-row-grid-3">
      <div class="admin-form-group" style="margin-bottom: 0;">
        <label>Password</label>
        <input type="text" class="admin-input input-password" value="${password || '123456'}" placeholder="Default: 123456">
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

    <!-- Baris 3: Hak Akses (Textarea Manual) -->
    <div class="hak-akses-section">
      <div class="hak-akses-header">
        <label>🔐 Hak Akses Fitur (Input Manual)</label>
        <span class="hak-akses-hint">Satu fitur per baris. Kosongkan = tidak ada akses.</span>
      </div>
      <textarea class="admin-textarea-hak-akses input-hak-akses" placeholder="Contoh:&#10;Admin Pembelajaran&#10;LKPD&#10;RPM Spesifik&#10;Global Monitoring">${hakAksesText}</textarea>
    </div>
  `;

  container.appendChild(row);

  // Event listener untuk tombol hapus
  if (index !== null) {
    row.querySelector('.btn-hapus-user').addEventListener('click', () => {
      if(confirm('Yakin ingin menghapus pengguna ini?')) {
        userData.splice(index, 1);
        renderForm();
      }
    });
  }
}

// 5. Event Listeners
btnTambah.addEventListener('click', () => {
  if (userData.length === 0) {
    container.innerHTML = '';
  }
  tambahRow();
});

// 6. Realtime Listener
onValue(userRef, (snapshot) => {
  const data = snapshot.val();
  if (data && data.daftar && Array.isArray(data.daftar)) {
    userData = data.daftar;
  } else {
    userData = [];
  }
  renderForm();
});

// 7. Fungsi Simpan
btnSimpan.addEventListener('click', async () => {
  const rows = container.querySelectorAll('.user-row');
  const newData = [];
  let isValid = true;
  
  rows.forEach(row => {
    const nama = row.querySelector('.input-nama').value.trim();
    const email = row.querySelector('.input-email').value.trim();
    const password = row.querySelector('.input-password').value.trim();
    const role = row.querySelector('.input-role').value;
    const status = row.querySelector('.input-status').value;
    
    // Ambil hak akses dari textarea (split per baris, filter yang kosong)
    const hakAksesText = row.querySelector('.input-hak-akses').value.trim();
    const hakAkses = hakAksesText 
      ? hakAksesText.split('\n').map(h => h.trim()).filter(h => h.length > 0)
      : [];
    
    if (!nama || !email) {
      isValid = false;
      row.style.border = '2px solid #ef4444';
    } else {
      row.style.border = '1px solid #e2e8f0';
      newData.push({ 
        nama, 
        email, 
        password, 
        role, 
        status,
        hakAkses  // Array fitur yang bisa diakses
      });
    }
  });

  if (!isValid) {
    alert('⚠️ Nama dan Email wajib diisi untuk semua pengguna!');
    return;
  }

  // UI Loading State
  btnSimpan.disabled = true;
  btnSimpan.innerHTML = ' Menyimpan...';
  statusEl.className = 'admin-status';
  statusEl.style.display = 'none';

  try {
    await set(userRef, {
      aktif: true,
      daftar: newData
    });

    userData = newData;
    statusEl.textContent = `✅ Berhasil menyimpan ${newData.length} data pengguna secara real-time!`;
    statusEl.className = 'admin-status success';
    statusEl.style.display = 'block';
  } catch (error) {
    console.error('Error saving to RTDB:', error);
    statusEl.textContent = '❌ Gagal menyimpan. Periksa koneksi internet Anda.';
    statusEl.className = 'admin-status error';
    statusEl.style.display = 'block';
  } finally {
    btnSimpan.disabled = false;
    btnSimpan.innerHTML = '💾 Simpan Semua Perubahan';
  }
});
