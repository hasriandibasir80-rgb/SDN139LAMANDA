import { rtdb } from './firebase-config.js';
import { ref, onValue, set } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// 1. Validasi Admin
const userRole = localStorage.getItem('userRole');
if (userRole !== 'admin') {
  alert('⛔ Akses Ditolak: Halaman ini hanya untuk Administrator.');
  window.location.href = '../dashboard.html'; 
}

// 2. Konfigurasi
const NAMA_SEKOLAH = 'SDN 139 LAMANDA';
const PASSWORD_DEFAULT = 'sdn139lamanda2024';
const LOGIN_URL = 'https://hasriandibasi80-rgb.github.io/SDN139LAMANDA/dashboard.html';
const PROFIL_URL = 'https://hasriandibasi80-rgb.github.io/SDN139LAMANDA/modules/profil-user.html';

// 3. Inisialisasi Elemen DOM
const container = document.getElementById('daftarUserContainer');
const btnTambah = document.getElementById('btnTambahUser');
const btnSimpan = document.getElementById('btnSimpanUser');
const statusEl = document.getElementById('adminStatus');
const userRef = ref(rtdb, 'config/users');

let userData = [];

// 4. Fungsi Format Nomor WA
function formatNomorWA(nomor) {
  if (!nomor) return '';
  let clean = nomor.replace(/\D/g, ''); // Hapus semua non-angka
  if (clean.startsWith('0')) {
    clean = '62' + clean.substring(1);
  } else if (!clean.startsWith('62')) {
    clean = '62' + clean;
  }
  return clean;
}

// 5. Fungsi Render
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
        item.noWA || '',       // <-- TAMBAHAN: Field No WA
        item.password, 
        item.role, 
        item.status, 
        item.hakAkses || [], 
        index
      );
    });
  }
}

// 6. Fungsi Tambah Baris (dengan field No. WA & Tombol WA)
function tambahRow(nama = '', email = '', noWA = '', password = '', role = 'guru', status = 'aktif', hakAkses = [], index = null) {
  const row = document.createElement('div');
  row.className = 'user-row';
  
  const deleteBtn = index !== null 
    ? `<button type="button" class="btn-hapus-user" data-index="${index}">✕</button>`
    : '';

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
    
    <!-- Baris 2: No. WhatsApp, Role, Status -->
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

    <!-- Baris 3: Info Password & Tombol Kirim WA -->
    <div style="display: flex; gap: 16px; margin-top: 12px; align-items: flex-end; flex-wrap: wrap;">
      <div style="flex: 1; min-width: 200px;">
        <label style="display: block; margin-bottom: 6px; font-weight: 600; font-size: 14px; color: #334155;">Password Default</label>
        <input type="text" class="admin-input" value="${PASSWORD_DEFAULT}" readonly style="background: #f1f5f9; cursor: not-allowed;">
        <p class="helper-text">User wajib ganti setelah login pertama</p>
      </div>
      <div style="flex: 2; min-width: 250px;">
        <button type="button" class="btn-kirim-wa" style="width: 100%; padding: 10px; background: #25D366; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; display: flex; align-items: center; justify-content: center; gap: 6px; transition: all 0.2s;">
          📱 Kirim Undangan via WhatsApp
        </button>
      </div>
    </div>

    <!-- Baris 4: Hak Akses (Textarea Manual) -->
    <div class="hak-akses-section">
      <div class="hak-akses-header">
        <label>🔐 Hak Akses Fitur (Input Manual)</label>
        <span class="hak-akses-hint">Satu fitur per baris. Kosongkan = tidak ada akses.</span>
      </div>
      <textarea class="admin-textarea-hak-akses input-hak-akses" placeholder="Contoh:&#10;Admin Pembelajaran&#10;LKPD&#10;RPM Spesifik">${hakAksesText}</textarea>
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

  // Event listener untuk tombol Kirim WhatsApp
  row.querySelector('.btn-kirim-wa').addEventListener('click', () => {
    const namaUser = row.querySelector('.input-nama').value.trim();
    const emailUser = row.querySelector('.input-email').value.trim();
    const noWAUser = row.querySelector('.input-nowa').value.trim();
    const roleUser = row.querySelector('.input-role').value;
    const hakAksesText = row.querySelector('.input-hak-akses').value.trim();
    const hakAksesList = hakAksesText ? hakAksesText.split('\n').map(h => h.trim()).filter(h => h.length > 0) : [];

    if (!namaUser || !emailUser || !noWAUser) {
      alert('⚠️ Nama, Email, dan Nomor WhatsApp wajib diisi sebelum mengirim undangan!');
      return;
    }

    const nomorWA = formatNomorWA(noWAUser);
    if (nomorWA.length < 10) {
      alert('⚠️ Nomor WhatsApp tidak valid!');
      return;
    }

    const roleLabels = {
      admin: 'Administrator',
      kepsek: 'Kepala Sekolah',
      guru: 'Guru',
      staf: 'Staf / Tata Usaha',
      siswa: 'Peserta Didik',
      ortu: 'Orang Tua'
    };

    let pesan = `Assalamu'alaikum Wr. Wb.\n\n`;
    pesan += `Yth. Bapak/Ibu *${namaUser}*,\n\n`;
    pesan += `Dengan hormat, kami mengundang Anda untuk bergabung di sistem informasi *${NAMA_SEKOLAH}*.\n\n`;
    pesan += `Berikut detail akun Anda:\n`;
    pesan += `━━━━━━━━━━━━━━━━━━\n`;
    pesan += `👤 Nama: ${namaUser}\n`;
    pesan += `📧 Email: ${emailUser}\n`;
    pesan += `🔑 Password: ${PASSWORD_DEFAULT}\n`;
    pesan += `🎯 Peran: ${roleLabels[roleUser] || roleUser}\n`;
    if (hakAksesList.length > 0) {
      pesan += `🔐 Hak Akses:\n`;
      hakAksesList.forEach((hak, idx) => {
        pesan += `   ${idx + 1}. ${hak}\n`;
      });
    }
    pesan += `━━━━━━━━━━━━━━━━━━\n\n`;
    pesan += `🔗 Link Login:\n${LOGIN_URL}\n\n`;
    pesan += `⚠️ *PENTING - WAJIB DILAKUKAN:*\n`;
    pesan += `1. Login dengan email dan password di atas\n`;
    pesan += `2. Setelah login, buka menu "Profil Saya"\n`;
    pesan += `3. Ganti password default dengan password pribadi Anda\n`;
    pesan += `4. Password baru minimal 6 karakter\n\n`;
    pesan += `🔗 Link Profil & Ganti Password:\n${PROFIL_URL}\n\n`;
    pesan += `Jika mengalami kendala, silakan hubungi Administrator.\n\n`;
    pesan += `Terima kasih atas perhatian dan kerjasamanya.\n\n`;
    pesan += `Wassalamu'alaikum Wr. Wb.\n\n`;
    pesan += `Hormat kami,\n*Administrator ${NAMA_SEKOLAH}*`;

    const pesanEncoded = encodeURIComponent(pesan);
    const waURL = `https://wa.me/${nomorWA}?text=${pesanEncoded}`;

    if (confirm(`Kirim undangan WhatsApp ke:\n\n📱 ${noWAUser}\n👤 ${namaUser}\n\nWhatsApp akan terbuka dengan pesan yang sudah terisi.`)) {
      window.open(waURL, '_blank');
    }
  });
}

// 7. Event Listeners
btnTambah.addEventListener('click', () => {
  if (userData.length === 0) {
    container.innerHTML = '';
  }
  tambahRow();
});

// 8. Realtime Listener
onValue(userRef, (snapshot) => {
  const data = snapshot.val();
  if (data && data.daftar && Array.isArray(data.daftar)) {
    userData = data.daftar;
  } else {
    userData = [];
  }
  renderForm();
});

// 9. Fungsi Simpan
btnSimpan.addEventListener('click', async () => {
  const rows = container.querySelectorAll('.user-row');
  const newData = [];
  let isValid = true;
  
  rows.forEach(row => {
    const nama = row.querySelector('.input-nama').value.trim();
    const email = row.querySelector('.input-email').value.trim();
    const noWA = row.querySelector('.input-nowa').value.trim(); // <-- TAMBAHAN: Ambil No WA
    const role = row.querySelector('.input-role').value;
    const status = row.querySelector('.input-status').value;
    
    const hakAksesText = row.querySelector('.input-hak-akses').value.trim();
    const hakAkses = hakAksesText 
      ? hakAksesText.split('\n').map(h => h.trim()).filter(h => h.length > 0)
      : [];
    
    // Validasi: Nama, Email, DAN No WA wajib diisi
    if (!nama || !email || !noWA) {
      isValid = false;
      row.style.border = '2px solid #ef4444';
    } else {
      row.style.border = '1px solid #e2e8f0';
      newData.push({ 
        nama, 
        email, 
        noWA,                // <-- TAMBAHAN: Simpan No WA
        password: PASSWORD_DEFAULT, // Password otomatis default
        role, 
        status,
        hakAkses
      });
    }
  });

  if (!isValid) {
    alert('⚠️ Nama, Email, dan Nomor WhatsApp wajib diisi untuk semua pengguna!');
    return;
  }

  // UI Loading State
  btnSimpan.disabled = true;
  btnSimpan.innerHTML = '⏳ Menyimpan...';
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
