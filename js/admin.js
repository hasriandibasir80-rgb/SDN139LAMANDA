// js/admin.js

// 1. Import Firebase (Sesuaikan versi dengan config Anda)
import { db } from './firebase-config.js';
import { ref, onValue, set } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// 2. KEAMANAN: Cek apakah user adalah Admin
const userRole = localStorage.getItem('userRole');
if (userRole !== 'admin') {
  // Jika bukan admin, tendang kembali ke halaman login atau dashboard
  alert('⛔ Akses Ditolak: Halaman ini hanya untuk Administrator.');
  window.location.href = '../dashboard.html'; 
}

// 3. Ambil elemen DOM
const form = document.getElementById('formPengaturanSitus');
const textarea = document.getElementById('teksPengumuman');
const btnSimpan = document.getElementById('btnSimpanPengumuman');
const statusEl = document.getElementById('adminStatus');

// 4. Referensi Database Firebase
const pengumumanRef = ref(db, 'config/pengumuman_login');

// 5. FUNGSI BACA: Ambil data saat halaman dimuat
onValue(pengumumanRef, (snapshot) => {
  const data = snapshot.val();
  if (data && data.teks !== undefined) {
    textarea.value = data.teks;
  } else {
    textarea.value = ""; // Kosong jika belum ada data
  }
});

// 6. FUNGSI SIMPAN: Ketika form di-submit
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const teksBaru = textarea.value.trim();
  
  // UI Loading State
  btnSimpan.disabled = true;
  btnSimpan.innerHTML = '⏳ Menyimpan...';
  statusEl.className = 'admin-status'; // Reset class
  statusEl.style.display = 'none';

  try {
    // Simpan ke Firebase
    await set(pengumumanRef, {
      teks: teksBaru,
      terakhirDiupdate: new Date().toISOString()
    });

    // UI Success State
    statusEl.textContent = '✅ Pengumuman berhasil diperbarui! Cek halaman login untuk melihat perubahan.';
    statusEl.className = 'admin-status success';
    
  } catch (error) {
    // UI Error State
    console.error('Error saving data:', error);
    statusEl.textContent = '❌ Gagal menyimpan. Periksa koneksi internet Anda.';
    statusEl.className = 'admin-status error';
  } finally {
    // Kembalikan tombol ke kondisi semula
    btnSimpan.disabled = false;
    btnSimpan.innerHTML = '💾 Simpan Perubahan';
  }
});
