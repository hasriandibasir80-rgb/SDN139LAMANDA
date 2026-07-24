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

// Validasi Admin
const userRole = localStorage.getItem('userRole');
if (userRole !== 'admin') {
  alert('Akses Ditolak: Halaman ini hanya untuk Administrator.');
  window.location.href = '../dashboard.html'; 
}

// Konfigurasi
const LOGIN_URL = 'https://hasriandibasi80-rgb.github.io/SDN139LAMANDA/dashboard.html';
const PROFIL_URL = 'https://hasriandibasi80-rgb.github.io/SDN139LAMANDA/modules/profil-user.html';
const NAMA_SEKOLAH = 'SDN 139 LAMANDA';
const PASSWORD_DEFAULT = 'sdn139lamanda2024';
const USERS_COLLECTION = 'users';

// Elemen DOM
const container = document.getElementById('daftarUserContainer');
const btnTambah = document.getElementById('btnTambahUser');
const btnSimpan = document.getElementById('btnSimpanUser');
const statusEl = document.getElementById('adminStatus');

let userData = [];
let unsubscribe = null;

// Fungsi Render
function renderForm() {
  container.innerHTML = '';
  if (userData.length === 0) {
    const emptyMsg = document.createElement('div');
    emptyMsg.style.cssText = 'text-align: center; padding: 20px; color: #64748b;';
    emptyMsg.textContent = 'Belum ada data pengguna. Klik "Tambah Pengguna Baru" untuk memulai.';
    container.appendChild(emptyMsg);
  } else {
    userData.forEach((item) => {
      tambahRow(item);
    });
  }
}

// Fungsi Format Nomor WA
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

// Fungsi Format Tanggal
function formatTanggal(timestamp) {
  if (!timestamp) return '-';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('id-ID', { 
    day: '2-digit', 
    month: 'short', 
    year: 'numeric'
  });
}

// Fungsi Tambah Baris
function tambahRow(user) {
  const id = user.id || '';
  const nama = user.nama || '';
  const email = user.email || '';
  const noWA = user.noWA || '';
  const role = user.role || 'guru';
  const status = user.status || 'aktif';
  const hakAkses = user.hakAkses || [];
  const passwordChanged = user.passwordChanged || false;
  const createdAt = user.createdAt || null;

  const row = document.createElement('div');
  row.className = 'user-row';
  row.style.cssText = 'background: #f8fafc; padding: 20px; border-radius: 12px; margin-bottom: 16px; border: 1px solid #e2e8f0; position: relative;';
  
  const deleteBtn = id ? '<button type="button" class="btn-hapus-user" data-id="' + id + '" style="position: absolute; top: 16px; right: 16px; background: #fee2e2; color: #991b1b; border: none; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; font-weight: bold;">✕</button>' : '';

  const passwordStatus = passwordChanged 
    ? '<span style="color: #16a34a; font-weight: 600; font-size: 12px;">✅ Sudah Diganti</span>'
    : '<span style="color: #dc2626; font-weight: 600; font-size: 12px;">⚠️ Password Default</span>';

  const hakAksesText = Array.isArray(hakAkses) ? hakAkses.join('\n') : '';

  row.innerHTML = deleteBtn + 
    '<div style="margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px dashed #cbd5e1;">' +
      '<div style="display: flex; justify-content: space-between; align-items: center;">' +
        '<div style="display: flex; align-items: center; gap: 12px;">' +
          '<div style="width: 44px; height: 44px; background: #1e3c72; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 18px;">' + (nama || email || 'U').charAt(0).toUpperCase() + '</div>' +
          '<div>' +
            '<strong style="color: #1e3c72; font-size: 15px;">' + (nama || 'Nama belum diisi') + '</strong>' +
            '<div style="font-size: 12px; color: #64748b;">' + (email || 'Email belum diisi') + '</div>' +
          '</div>' +
        '</div>' +
        '<div style="text-align: right;">' +
          '<div style="margin-bottom: 4px;">' + passwordStatus + '</div>' +
          '<div style="font-size: 11px; color: #94a3b8;">Dibuat: ' + formatTanggal(createdAt) + '</div>' +
        '</div>' +
      '</div>' +
    '</div>' +
    
    '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">' +
      '<div>' +
        '<label style="display: block; margin-bottom: 6px; font-weight: 600; font-size: 14px; color: #334155;">Nama Lengkap *</label>' +
        '<input type="text" class="admin-input input-nama" value="' + nama + '" placeholder="Contoh: Budi Santoso" style="width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px;">' +
      '</div>' +
      '<div>' +
        '<label style="display: block; margin-bottom: 6px; font-weight: 600; font-size: 14px; color: #334155;">Email *</label>' +
        '<input type="email" class="admin-input input-email" value="' + email + '" placeholder="user@sekolah.id" style="width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px;">' +
      '</div>' +
    '</div>' +

    '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">' +
      '<div>' +
        '<label style="display: block; margin-bottom: 6px; font-weight: 600; font-size: 14px; color: #334155;">Nomor WhatsApp *</label>' +
        '<input type="tel" class="admin-input input-nowa" value="' + noWA + '" placeholder="08123456789" style="width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px;">' +
        '<p style="font-size: 12px; color: #64748b; margin-top: 4px;">Format: 08xxx atau 62xxx</p>' +
      '</div>' +
      '<div>' +
        '<label style="display: block; margin-bottom: 6px; font-weight: 600; font-size: 14px; color: #334155;">Peran (Role)</label>' +
        '<select class="admin-input input-role" style="width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px; cursor: pointer;">' +
          '<option value="admin"' + (role === 'admin' ? ' selected' : '') + '>Administrator</option>' +
          '<option value="kepsek"' + (role === 'kepsek' ? ' selected' : '') + '>Kepala Sekolah</option>' +
          '<option value="guru"' + (role === 'guru' ? ' selected' : '') + '>Guru</option>' +
          '<option value="staf"' + (role === 'staf' ? ' selected' : '') + '>Staf / Tata Usaha</option>' +
          '<option value="siswa"' + (role === 'siswa' ? ' selected' : '') + '>Peserta Didik</option>' +
          '<option value="ortu"' + (role === 'ortu' ? ' selected' : '') + '>Orang Tua</option>' +
        '</select>' +
      '</div>' +
    '</div>' +

    '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">' +
      '<div>' +
        '<label style="display: block; margin-bottom: 6px; font-weight: 600; font-size: 14px; color: #334155;">Password</label>' +
        '<input type="text" class="admin-input" value="' + PASSWORD_DEFAULT + '" readonly style="width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px; background: #f1f5f9;">' +
        '<p style="font-size: 12px; color: #64748b; margin-top: 4px;">Password default: ' + PASSWORD_DEFAULT + '</p>' +
      '</div>' +
      '<div>' +
        '<label style="display: block; margin-bottom: 6px; font-weight: 600; font-size: 14px; color: #334155;">Status</label>' +
        '<select class="admin-input input-status" style="width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px; cursor: pointer;">' +
          '<option value="aktif"' + (status === 'aktif' ? ' selected' : '') + '>✅ Aktif</option>' +
          '<option value="non-aktif"' + (status === 'non-aktif' ? ' selected' : '') + '> Non-Aktif</option>' +
        '</select>' +
      '</div>' +
    '</div>' +

    '<button type="button" class="btn-kirim-wa" style="width: 100%; padding: 12px; background: #25D366; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 14px; margin-bottom: 16px;">📱 Kirim Undangan via WhatsApp</button>' +

    '<div style="margin-top: 16px; padding-top: 16px; border-top: 2px dashed #cbd5e1;">' +
      '<label style="display: block; margin-bottom: 6px; font-weight: 600; font-size: 14px; color: #334155;">🔐 Hak Akses Fitur (Input Manual)</label>' +
      '<p style="font-size: 12px; color: #64748b; margin-bottom: 8px;">Satu fitur per baris. Kosongkan = tidak ada akses.</p>' +
      '<textarea class="admin-input input-hak-akses" placeholder="Contoh:&#10;Admin Pembelajaran&#10;LKPD" style="width: 100%; min-height: 80px; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; font-family: monospace; resize: vertical;">' + hakAksesText + '</textarea>' +
    '</div>';

  container.appendChild(row);

  // Event listener hapus
  if (id) {
    row.querySelector('.btn-hapus-user').addEventListener('click', async function() {
      if(confirm('Yakin ingin menghapus pengguna ini?')) {
        try {
          await deleteDoc(doc(db, USERS_COLLECTION, id));
        } catch (error) {
          console.error('Error deleting user:', error);
          alert('Gagal menghapus pengguna!');
        }
      }
    });
  }

  // Event listener Kirim WhatsApp
  row.querySelector('.btn-kirim-wa').addEventListener('click', function() {
    const namaUser = row.querySelector('.input-nama').value.trim();
    const emailUser = row.querySelector('.input-email').value.trim();
    const noWAUser = row.querySelector('.input-nowa').value.trim();
    const roleUser = row.querySelector('.input-role').value;
    const hakAksesText = row.querySelector('.input-hak-akses').value.trim();
    const hakAksesList = hakAksesText ? hakAksesText.split('\n').map(h => h.trim()).filter(h => h.length > 0) : [];

    if (!namaUser || !emailUser || !noWAUser) {
      alert('⚠️ Nama, Email, dan Nomor WhatsApp wajib diisi!');
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

    let pesan = 'Assalamu\'alaikum Wr. Wb.\n\n';
    pesan += 'Yth. Bapak/Ibu *' + namaUser + '*,\n\n';
    pesan += 'Dengan hormat, kami mengundang Anda untuk bergabung di sistem informasi *' + NAMA_SEKOLAH + '*.\n\n';
    pesan += 'Berikut detail akun Anda:\n';
    pesan += '━━━━━━━━━━━━━━━━━━\n';
    pesan += '👤 Nama: ' + namaUser + '\n';
    pesan += '📧 Email: ' + emailUser + '\n';
    pesan += '🔑 Password: ' + PASSWORD_DEFAULT + '\n';
    pesan += '🎯 Peran: ' + (roleLabels[roleUser] || roleUser) + '\n';
    if (hakAksesList.length > 0) {
      pesan += '🔐 Hak Akses:\n';
      hakAksesList.forEach(function(hak, idx) {
        pesan += '   ' + (idx + 1) + '. ' + hak + '\n';
      });
    }
    pesan += '━━━━━━━━━━━━━━━━━━\n\n';
    pesan += '🔗 Link Login:\n' + LOGIN_URL + '\n\n';
    pesan += '⚠️ *PENTING - WAJIB DILAKUKAN:*\n';
    pesan += '1. Login dengan email dan password di atas\n';
    pesan += '2. Setelah login, buka menu "Profil Saya"\n';
    pesan += '3. Ganti password default dengan password pribadi Anda\n';
    pesan += '4. Password baru minimal 6 karakter\n\n';
    pesan += '🔗 Link Profil & Ganti Password:\n' + PROFIL_URL + '\n\n';
    pesan += 'Jika mengalami kendala, silakan hubungi Administrator.\n\n';
    pesan += 'Terima kasih atas perhatian dan kerjasamanya.\n\n';
    pesan += 'Wassalamu\'alaikum Wr. Wb.\n\n';
    pesan += 'Hormat kami,\n*Administrator ' + NAMA_SEKOLAH + '*';

    const pesanEncoded = encodeURIComponent(pesan);
    const waURL = 'https://wa.me/' + nomorWA + '?text=' + pesanEncoded;

    if (confirm('Kirim undangan WhatsApp ke:\n\n📱 ' + noWAUser + '\n👤 ' + namaUser + '\n\nWhatsApp akan terbuka dengan pesan yang sudah terisi.')) {
      window.open(waURL, '_blank');
    }
  });
}

// Event Listeners
btnTambah.addEventListener('click', function() {
  tambahRow({});
});

// Firestore Realtime Listener
function startListening() {
  const q = query(collection(db, USERS_COLLECTION), orderBy('createdAt', 'desc'));
  
  unsubscribe = onSnapshot(q, function(snapshot) {
    userData = snapshot.docs.map(function(docSnap) {
      return {
        id: docSnap.id,
        ...docSnap.data()
      };
    });
    renderForm();
  }, function(error) {
    console.error('Error listening to users:', error);
    container.innerHTML = '<div style="text-align: center; padding: 20px; color: #dc2626;">❌ Gagal memuat data pengguna. Periksa koneksi internet Anda.</div>';
  });
}

// Fungsi Simpan
btnSimpan.addEventListener('click', async function() {
  const rows = container.querySelectorAll('.user-row');
  let isValid = true;
  let hasChanges = false;
  
  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];
    const nama = row.querySelector('.input-nama').value.trim();
    const email = row.querySelector('.input-email').value.trim();
    const noWA = row.querySelector('.input-nowa').value.trim();
    const role = row.querySelector('.input-role').value;
    const status = row.querySelector('.input-status').value;
    const hakAksesText = row.querySelector('.input-hak-akses').value.trim();
    const hakAkses = hakAksesText ? hakAksesText.split('\n').map(h => h.trim()).filter(h => h.length > 0) : [];
    
    if (!nama || !email || !noWA) {
      isValid = false;
      row.style.border = '2px solid #ef4444';
    } else {
      row.style.border = '1px solid #e2e8f0';
      
      const existingUser = userData[index];
      const isChanged = !existingUser || 
          existingUser.nama !== nama || 
          existingUser.email !== email || 
          existingUser.noWA !== noWA || 
          existingUser.role !== role || 
          existingUser.status !== status ||
          JSON.stringify(existingUser.hakAkses || []) !== JSON.stringify(hakAkses);
      
      if (isChanged) {
        hasChanges = true;
        
        const userDataObj = {
          nama: nama,
          email: email,
          noWA: noWA,
          role: role,
          status: status,
          hakAkses: hakAkses,
          password: existingUser ? existingUser.password : PASSWORD_DEFAULT,
          passwordChanged: existingUser ? existingUser.passwordChanged : false,
          updatedAt: serverTimestamp()
        };
        
        if (existingUser) {
          await updateDoc(doc(db, USERS_COLLECTION, existingUser.id), userDataObj);
        } else {
          userDataObj.createdAt = serverTimestamp();
          await addDoc(collection(db, USERS_COLLECTION), userDataObj);
        }
      }
    }
  }

  if (!isValid) {
    alert('⚠️ Nama, Email, dan Nomor WhatsApp wajib diisi!');
    return;
  }

  if (!hasChanges) {
    statusEl.textContent = 'ℹ️ Tidak ada perubahan yang perlu disimpan.';
    statusEl.className = 'admin-status';
    statusEl.style.display = 'block';
    return;
  }

  btnSimpan.disabled = true;
  btnSimpan.innerHTML = '⏳ Menyimpan...';
  statusEl.style.display = 'none';

  try {
    statusEl.textContent = '✅ Data pengguna berhasil disimpan!';
    statusEl.className = 'admin-status success';
    statusEl.style.display = 'block';
  } catch (error) {
    console.error(error);
    statusEl.textContent = '❌ Gagal menyimpan.';
    statusEl.className = 'admin-status error';
    statusEl.style.display = 'block';
  } finally {
    btnSimpan.disabled = false;
    btnSimpan.innerHTML = '💾 Simpan Semua Perubahan';
  }
});

// Cleanup
window.addEventListener('beforeunload', function() {
  if (unsubscribe) unsubscribe();
});

// Mulai listening
startListening();
