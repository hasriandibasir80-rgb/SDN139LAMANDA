import { rtdb } from './firebase-config.js';
import { ref, onValue, set } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const userRole = localStorage.getItem('userRole');
if (userRole !== 'admin') {
  alert('⛔ Akses Ditolak: Halaman ini hanya untuk Administrator.');
  window.location.href = '../dashboard.html'; 
}

const form = document.getElementById('formPengaturanSitus');
const textarea = document.getElementById('teksPengumuman');
const btnSimpan = document.getElementById('btnSimpanPengumuman');
const statusEl = document.getElementById('adminStatus');

const pengumumanRef = ref(rtdb, 'config/pengumuman_login');

onValue(pengumumanRef, (snapshot) => {
  const data = snapshot.val();
  if (data && data.teks !== undefined) {
    textarea.value = data.teks;
  } else {
    textarea.value = "";
  }
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const teksBaru = textarea.value.trim();
  
  btnSimpan.disabled = true;
  btnSimpan.innerHTML = '⏳ Menyimpan...';
  statusEl.className = 'admin-status';
  statusEl.style.display = 'none';

  try {
    await set(pengumumanRef, {
      teks: teksBaru,
      terakhirDiupdate: new Date().toISOString()
    });

    statusEl.textContent = '✅ Pengumuman berhasil diperbarui secara real-time!';
    statusEl.className = 'admin-status success';
    
  } catch (error) {
    console.error('Error saving to RTDB:', error);
    statusEl.textContent = '❌ Gagal menyimpan. Periksa koneksi internet Anda.';
    statusEl.className = 'admin-status error';
  } finally {
    btnSimpan.disabled = false;
    btnSimpan.innerHTML = '💾 Simpan Perubahan';
  }
});
