// =========================================
// MODUL: SIMPAN FILE (GENERAL USER)
// Koneksi: Google Apps Script + Firestore
// =========================================

import { db } from '../firebase-config.js';
import { collection, addDoc, serverTimestamp } 
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ✅ URL APPS SCRIPT (SUDAH TERISI)
const APP_SCRIPT_URL = "https://script.google.com/macros/s/AKfycby2J3v7J-qQREY7pNsITzExSMEX1eaDaTfAgr4IZ15548auxyQ3pScZnT3X9LuH3pkl/exec"; 

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
  
  if (file.size > 10 * 1024 * 1024) {
    showStatus('error', '⚠️ File terlalu besar! Maksimal 10MB.');
    fileInput.value = '';
    fileInfo.style.display = 'none';
  } else {
    statusDiv.innerHTML = '';
  }
}

// 5. FORM SUBMIT HANDLER (LOGIKA UTAMA)
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const kategori = document.getElementById('kategori').value;
  const namaDokumen = document.getElementById('namaDokumen').value.trim();
  const deskripsi = document.getElementById('deskripsi').value.trim();
  const file = fileInput.files[0];

  // Validasi
  if (!kategori || !namaDokumen || !file) {
    showStatus('error', '⚠️ Lengkapi semua field wajib dan pilih file!');
    return;
  }

  if (file.size > 10 * 1024 * 1024) {
    showStatus('error', '⚠️ File terlalu besar! Maksimal 10MB.');
    return;
  }

  // Tampilkan loading
  btnUpload.disabled = true;
  btnText.textContent = '⏳ Mengupload...';
  showStatus('loading', '📤 Mengirim file ke Google Drive...');

  try {
    // A. Convert file ke Base64
    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onload = async () => {
      const base64String = reader.result.split(',')[1]; // Ambil base64 murni

      // B. Kirim ke Apps Script
      const response = await fetch(APP_SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify({
          fileName: `${Date.now()}_${file.name}`, // Tambah timestamp agar nama unik
          mimeType: file.type,
          fileData: base64String
        })
      });

      const result = await response.json();

      if (result.status === 'success') {
        showStatus('success', '✅ File berhasil diupload! Menyimpan data...');
        
        // C. Simpan Metadata ke Firestore
        await simpanKeFirestore({
          namaDokumen, kategori, deskripsi, file,
          url: result.url,
          id: result.id
        });
      } else {
        throw new Error(result.message);
      }
    };

  } catch (error) {
    console.error(error);
    showStatus('error', '❌ Gagal upload: ' + error.message);
    btnUpload.disabled = false;
    btnText.textContent = '💾 Simpan File';
  }
});

// 6. SIMPAN KE FIRESTORE
async function simpanKeFirestore(data) {
  try {
    await addDoc(collection(db, 'documents'), {
      namaDokumen: data.namaDokumen,
      kategori: data.kategori,
      levelAkses: 'publik',
      deskripsi: data.deskripsi,
      namaFile: data.file.name,
      ukuranFile: data.file.size,
      tipeFile: data.file.type,
      urlFile: data.url,
      driveFileId: data.id,
      uploaderUid: currentUser.uid,
      uploaderEmail: currentUser.email,
      uploaderNama: currentUser.namaLengkap || 'Guru/Staff',
      tanggalUpload: serverTimestamp(),
      status: 'aktif'
    });

    showStatus('success', '🎉 Berhasil! File dan data arsip telah disimpan.');
    alert('✅ File berhasil disimpan dan masuk ke Katalog Arsip!');
    
    form.reset();
    fileInfo.style.display = 'none';
    btnUpload.disabled = false;
    btnText.textContent = '💾 Simpan File';

  } catch (err) {
    showStatus('error', 'File terupload ke Drive, tapi gagal simpan ke database: ' + err.message);
    btnUpload.disabled = false;
    btnText.textContent = '💾 Simpan File';
  }
}

// 7. HELPER FUNCTIONS
function showStatus(type, message) {
  statusDiv.className = `upload-status ${type}`;
  statusDiv.innerHTML = message;
}
