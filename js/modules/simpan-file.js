// =========================================
// MODUL: SIMPAN FILE (GENERAL USER)
// VERSI: UI Only (Koneksi Drive belum aktif)
// =========================================

import { db } from '../../js/firebase-config.js';

// 1. KEAMANAN: Cek User Login
const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
if (!currentUser.uid) {
  alert('⚠️ Anda harus login untuk menggunakan fitur ini.');
  window.location.href = '../../index.html';
}

console.log('✅ Simpan File dimuat. User:', currentUser.email);

// 2. DOM Elements
const form = document.getElementById('formSimpanFile');
const fileInput = document.getElementById('fileInput');
const dropZone = document.getElementById('dropZone');
const fileInfo = document.getElementById('fileInfo');
const btnUpload = document.getElementById('btnUpload');
const btnText = document.getElementById('btnText');
const statusDiv = document.getElementById('uploadStatus');

// 3. DRAG & DROP Handler
['dragenter', 'dragover'].forEach(evt => {
  dropZone.addEventListener(evt, (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });
});

['dragleave', 'drop'].forEach(evt => {
  dropZone.addEventListener(evt, (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
  });
});

dropZone.addEventListener('drop', (e) => {
  const files = e.dataTransfer.files;
  if (files.length > 0) {
    fileInput.files = files;
    tampilkanInfoFile(files[0]);
  }
});

fileInput.addEventListener('change', (e) => {
  if (e.target.files.length > 0) {
    tampilkanInfoFile(e.target.files[0]);
  }
});

// 4. Tampilkan Info File
function tampilkanInfoFile(file) {
  const ukuranMB = (file.size / (1024 * 1024)).toFixed(2);
  fileInfo.innerHTML = `
    ✅ <strong>${file.name}</strong><br>
    📦 Ukuran: ${ukuranMB} MB | 📎 Tipe: ${file.type || 'Unknown'}
  `;
  fileInfo.style.display = 'block';
  
  // Validasi ukuran file
  if (file.size > 10 * 1024 * 1024) {
    showStatus('error', '⚠️ File terlalu besar! Maksimal 10MB.');
    fileInput.value = '';
    fileInfo.style.display = 'none';
  }
}

// 5. FORM SUBMIT HANDLER
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const kategori = document.getElementById('kategori').value;
  const namaDokumen = document.getElementById('namaDokumen').value.trim();
  const deskripsi = document.getElementById('deskripsi').value.trim();
  const file = fileInput.files[0];

  // Validasi
  if (!kategori) {
    showStatus('error', '⚠️ Pilih jenis dokumen terlebih dahulu.');
    return;
  }

  if (!namaDokumen) {
    showStatus('error', '⚠️ Isi nama/judul dokumen.');
    return;
  }

  if (!file) {
    showStatus('error', '⚠️ Pilih file yang akan diupload.');
    return;
  }

  if (file.size > 10 * 1024 * 1024) {
    showStatus('error', '⚠️ File terlalu besar! Maksimal 10MB.');
    return;
  }

  // Tampilkan loading
  btnUpload.disabled = true;
  btnText.textContent = '⏳ Memproses...';
  showStatus('loading', '📤 Menyiapkan upload...');

  try {
    // ============================================
    // TAHAP 2: UI READY, KONEKSI DRIVE BELUM AKTIF
    // ============================================
    
    // Simulasi proses upload (2 detik)
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Tampilkan pesan bahwa fitur akan segera aktif
    showStatus('success', `
      ✅ Form berhasil divalidasi!<br><br>
      <strong>Data yang akan disimpan:</strong><br>
      📁 Kategori: ${kategori}<br>
      📝 Nama: ${namaDokumen}<br>
      📎 File: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)<br>
      ${deskripsi ? `📄 Keterangan: ${deskripsi}<br>` : ''}
      <br>
      <em style="color: #6b7280; font-size: 12px;">
        💡 Fitur upload ke Google Drive akan segera diaktifkan.
      </em>
    `);

    // Reset form setelah 3 detik
    setTimeout(() => {
      form.reset();
      fileInfo.style.display = 'none';
      btnUpload.disabled = false;
      btnText.textContent = '💾 Simpan File';
      statusDiv.innerHTML = '';
    }, 5000);

  } catch (error) {
    console.error('Error:', error);
    showStatus('error', `❌ Terjadi kesalahan: ${error.message}`);
    btnUpload.disabled = false;
    btnText.textContent = '💾 Simpan File';
  }
});

// 6. HELPER FUNCTIONS
function showStatus(type, message) {
  statusDiv.className = `upload-status ${type}`;
  statusDiv.innerHTML = message;
}

// 7. INIT
document.addEventListener('DOMContentLoaded', () => {
  console.log('✅ Modul Simpan File (UI Only) dimuat');
});
