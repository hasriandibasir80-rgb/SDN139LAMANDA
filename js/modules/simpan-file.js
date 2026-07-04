// =========================================
// MODUL: SIMPAN FILE (GENERAL USER)
// Koneksi: Google Apps Script + Firestore
// Mode: no-cors (paling reliable untuk Apps Script)
// FIX: Promise wrapper untuk FileReader agar error tertangkap
// =========================================

import { db } from '../firebase-config.js';
import { collection, addDoc, serverTimestamp } 
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// URL APPS SCRIPT & FOLDER
const APP_SCRIPT_URL = "https://script.google.com/macros/s/AKfycby2J3v7J-qQREY7pNsITzExSMEX1eaDaTfAgr4IZ15548auxyQ3pScZnT3X9LuH3pkl/exec";
const FOLDER_URL = "https://drive.google.com/drive/folders/1kxmr2eqt50QLbWZBE14buYTC82eLglZS";

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

// 5. ✅ FIX UTAMA: Promise wrapper untuk FileReader
// Ini memastikan error asinkron bisa ditangkap oleh try-catch
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = () => {
      try {
        // Ambil base64 murni (hapus prefix data:xxx;base64,)
        const base64String = reader.result.split(',')[1];
        resolve(base64String);
      } catch (err) {
        reject(new Error('Gagal mengkonversi file ke Base64: ' + err.message));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Gagal membaca file. File mungkin rusak atau tidak bisa diakses.'));
    };
    
    reader.onabort = () => {
      reject(new Error('Pembacaan file dibatalkan.'));
    };
    
    reader.readAsDataURL(file);
  });
}

// 6. FORM SUBMIT HANDLER (LOGIKA UTAMA - SUDAH DIPERBAIKI)
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

  // Generate nama file unik dengan timestamp
  const fileName = `${Date.now()}_${file.name}`;

  // Tampilkan loading
  btnUpload.disabled = true;
  btnText.textContent = '⏳ Mengupload...';
  showStatus('loading', '📤 Mengirim file ke Google Drive...');

  // ✅ SEMUA LOGIKA ASINKRON DALAM SATU TRY-CATCH
  try {
    // A. Convert file ke Base64 (dengan Promise wrapper)
    showStatus('loading', '🔄 Mengkonversi file...');
    const base64String = await fileToBase64(file);
    
    // B. Kirim ke Apps Script dengan mode: 'no-cors'
    showStatus('loading', '📤 Mengirim file ke Google Drive...');
    await fetch(APP_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors', // ← KUNCI: Tidak trigger preflight CORS
      headers: {
        'Content-Type': 'text/plain;charset=utf-8', // ← Sudah benar
      },
      body: JSON.stringify({
        fileName: fileName,
        mimeType: file.type,
        fileData: base64String,
        namaDokumen: namaDokumen,
        kategori: kategori
      })
    });

    // Karena mode: 'no-cors', response tidak bisa dibaca
    // Tapi jika tidak ada error, asumsikan sukses
    showStatus('success', '✅ File berhasil diupload! Menyimpan data ke database...');
    
    // C. Simpan Metadata ke Firestore
    await simpanKeFirestore({
      namaDokumen, 
      kategori, 
      deskripsi, 
      file,
      fileName,
      folderUrl: FOLDER_URL
    });

  } catch (error) {
    // ✅ SEKARANG SEMUA ERROR TERTANGKAP DI SINI
    console.error('❌ Error lengkap:', error);
    showStatus('error', '❌ Gagal upload: ' + error.message);
    btnUpload.disabled = false;
    btnText.textContent = '💾 Simpan File';
  }
});

// 7. SIMPAN KE FIRESTORE
async function simpanKeFirestore(data) {
  try {
    await addDoc(collection(db, 'documents'), {
      namaDokumen: data.namaDokumen,
      kategori: data.kategori,
      levelAkses: 'publik',
      deskripsi: data.deskripsi,
      namaFile: data.fileName,
      ukuranFile: data.file.size,
      tipeFile: data.file.type,
      folderUrl: data.folderUrl,
      uploaderUid: currentUser.uid,
      uploaderEmail: currentUser.email,
      uploaderNama: currentUser.namaLengkap || 'Guru/Staff',
      tanggalUpload: serverTimestamp(),
      status: 'aktif'
    });

    showStatus('success', '🎉 Berhasil! File dan data arsip telah disimpan.');
    alert('✅ File berhasil disimpan!\n\n📁 Cek folder Google Drive: ARSIP DIGITAL SDN 139 LAMANDA\n📋 Cek menu: Katalog Arsip');
    
    form.reset();
    fileInfo.style.display = 'none';
    btnUpload.disabled = false;
    btnText.textContent = '💾 Simpan File';

  } catch (err) {
    console.error('❌ Firestore error:', err);
    showStatus('error', '❌ Gagal simpan ke database: ' + err.message);
    btnUpload.disabled = false;
    btnText.textContent = '💾 Simpan File';
  }
}

// 8. HELPER FUNCTIONS
function showStatus(type, message) {
  statusDiv.className = `upload-status ${type}`;
  statusDiv.innerHTML = message;
}
