import { rtdb } from './firebase-config.js';
import { ref, onValue, set } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const userRole = localStorage.getItem('userRole');
if (userRole !== 'admin') {
  alert('⛔ Akses Ditolak: Halaman ini hanya untuk Administrator.');
  window.location.href = '../dashboard.html'; 
}

const container = document.getElementById('daftarPengumumanContainer');
const btnTambah = document.getElementById('btnTambahPengumuman');
const btnSimpan = document.getElementById('btnSimpanPengumuman');
const statusEl = document.getElementById('adminStatus');
const pengumumanRef = ref(rtdb, 'config/pengumuman_login');

let pengumumanData = [];

function renderForm() {
  container.innerHTML = '';
  if (pengumumanData.length === 0) {
    tambahRow('', '');
  } else {
    pengumumanData.forEach((item, index) => {
      tambahRow(item.judul, item.isi, index);
    });
  }
}

function tambahRow(judul = '', isi = '', index = null) {
  const row = document.createElement('div');
  row.className = 'pengumuman-row';
  row.style.cssText = 'background: #f8fafc; padding: 16px; border-radius: 8px; margin-bottom: 12px; border: 1px solid #e2e8f0; position: relative;';
  
  const deleteBtn = index !== null 
    ? `<button type="button" class="btn-hapus-row" data-index="${index}" style="position: absolute; top: 12px; right: 12px; background: #fee2e2; color: #991b1b; border: none; width: 28px; height: 28px; border-radius: 50%; cursor: pointer; font-weight: bold;">✕</button>`
    : '';

  row.innerHTML = `
    ${deleteBtn}
    <div style="margin-bottom: 12px;">
      <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 4px;">Judul Pengumuman</label>
      <input type="text" class="input-judul" value="${judul}" placeholder="Contoh: 📢 Informasi PPDB" style="width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px;">
    </div>
    <div>
      <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 4px;">Isi Pengumuman</label>
      <textarea class="input-isi" placeholder="Tulis detail pengumuman di sini..." style="width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px; min-height: 80px; resize: vertical;">${isi}</textarea>
    </div>
  `;

  container.appendChild(row);

  if (index !== null) {
    row.querySelector('.btn-hapus-row').addEventListener('click', () => {
      pengumumanData.splice(index, 1);
      renderForm();
    });
  }
}

btnTambah.addEventListener('click', () => {
  tambahRow();
});

onValue(pengumumanRef, (snapshot) => {
  const data = snapshot.val();
  if (data && data.daftar && Array.isArray(data.daftar)) {
    pengumumanData = data.daftar;
  } else {
    pengumumanData = [];
  }
  renderForm();
});

btnSimpan.addEventListener('click', async () => {
  const rows = container.querySelectorAll('.pengumuman-row');
  const newData = [];
  
  rows.forEach(row => {
    const judul = row.querySelector('.input-judul').value.trim();
    const isi = row.querySelector('.input-isi').value.trim();
    if (judul || isi) {
      newData.push({ judul, isi });
    }
  });

  btnSimpan.disabled = true;
  btnSimpan.innerHTML = '⏳ Menyimpan...';
  statusEl.className = 'admin-status';
  statusEl.style.display = 'none';

  try {
    await set(pengumumanRef, {
      aktif: true,
      daftar: newData
    });

    pengumumanData = newData;
    statusEl.textContent = '✅ Pengumuman berhasil diperbarui secara real-time!';
    statusEl.className = 'admin-status success';
  } catch (error) {
    console.error('Error saving to RTDB:', error);
    statusEl.textContent = '❌ Gagal menyimpan. Periksa koneksi internet Anda.';
    statusEl.className = 'admin-status error';
  } finally {
    btnSimpan.disabled = false;
    btnSimpan.innerHTML = '💾 Simpan Semua Perubahan';
  }
});
