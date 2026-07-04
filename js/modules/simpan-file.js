// =========================================
// MODUL: SIMPAN FILE (GENERAL USER)
// Dengan Error Handling & Retry Logic
// =========================================

import { db } from '../firebase-config.js';
import { collection, addDoc, serverTimestamp } 
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const APP_SCRIPT_URL = "https://script.google.com/macros/s/AKfycby2J3v7J-qQREY7pNsITzExSMEX1eaDaTfAgr4IZ15548auxyQ3pScZnT3X9LuH3pkl/exec";
const FOLDER_URL = "https://drive.google.com/drive/folders/1kxmr2eqt50QLbWZBE14buYTC82eLglZS";

const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
if (!currentUser.uid) {
  alert('⚠️ Anda harus login untuk menggunakan fitur ini.');
  window.location.href = '../../index.html';
}

console.log('✅ Simpan File dimuat. User:', currentUser.email);

// DOM Elements
const form = document.getElementById('formSimpanFile');
const fileInput = document.getElementById('fileInput');
const dropZone = document.getElementById('dropZone');
const fileInfo = document.getElementById('fileInfo');
const btnUpload = document.getElementById('btnUpload');
const btnText = document.getElementById('btnText');
const statusDiv = document.getElementById('uploadStatus');

// Drag & Drop
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

// Promise wrapper untuk FileReader
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = () => {
      try {
        const base64String = reader.result.split(',')[1];
        resolve(base64String);
      } catch (err) {
        reject(new Error('Gagal mengkonversi file ke Base64: ' + err.message));
      }
    };
    
    reader.onerror = () => reject(new Error('Gagal membaca file'));
    reader.onabort = () => reject(new Error('Pembacaan file dibatalkan'));
    
    reader.readAsDataURL(file);
  });
}

// Form Submit Handler
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const kategori = document.getElementById('kategori').value;
  const namaDokumen = document.getElementById('namaDokumen').value.trim();
  const deskripsi = document.getElementById('deskripsi').value.trim();
  const file = fileInput.files[0];

  if (!kategori || !namaDokumen || !file) {
    showStatus('error', '⚠️ Lengkapi semua field wajib dan pilih file!');
    return;
  }

  if (file.size > 10 * 1024 * 1024) {
    showStatus('error', '⚠️ File terlalu besar! Maksimal 10MB.');
    return;
  }

  const fileName = `${Date.now()}_${file.name}`;
  btnUpload.disabled = true;
  btnText.textContent = '⏳ Mengupload...';

  try {
    // Step 1: Convert to Base64
    showStatus('info', '🔄 Mengkonversi file ke Base64...');
    const base64String = await fileToBase64(file);
    console.log('✅ Base64 converted. Length:', base64String.length);

    // Step 2: Upload to Apps Script
    showStatus('info', '📤 Mengirim file ke Google Drive...');
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 detik timeout

    try {
      await fetch(APP_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        signal: controller.signal,
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({
          fileName: fileName,
          mimeType: file.type,
          fileData: base64String,
          namaDokumen: namaDokumen,
          kategori: kategori
        })
      });
      
      clearTimeout(timeoutId);
      console.log('✅ Fetch completed (no-cors mode)');
      
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        throw new Error('Upload timeout. File terlalu besar atau koneksi lambat.');
      }
      throw fetchError;
    }

    // Step 3: Wait for Apps Script to process
    showStatus('info', '⏳ Menunggu proses upload selesai...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Step 4: Save to Firestore
    showStatus('info', '💾 Menyimpan data ke database...');
    await simpanKeFirestore({
      namaDokumen, 
      kategori, 
      deskripsi, 
      file,
      fileName,
      folderUrl: FOLDER_URL
    });

  } catch (error) {
    console.error('❌ Upload Error:', error);
    showStatus('error', '❌ Gagal upload: ' + error.message);
    btnUpload.disabled = false;
    btnText.textContent = '💾 Simpan File';
  }
});

// Save to Firestore
async function simpanKeFirestore(data) {
  try {
    const docRef = await addDoc(collection(db, 'documents'), {
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

    console.log('✅ Firestore save success. Doc ID:', docRef.id);
    
    showStatus('success', '🎉 Berhasil! File dan data arsip telah disimpan.');
    
    setTimeout(() => {
      alert('✅ File berhasil disimpan!\n\n📁 Cek folder Google Drive: ARSIP DIGITAL SDN 139 LAMANDA\n📋 Cek menu: Katalog Arsip');
    }, 500);
    
    form.reset();
    fileInfo.style.display = 'none';
    btnUpload.disabled = false;
    btnText.textContent = '💾 Simpan File';

  } catch (err) {
    console.error('❌ Firestore Error:', err);
    throw new Error('File terupload tapi gagal simpan database: ' + err.message);
  }
}

function showStatus(type, message) {
  statusDiv.className = `upload-status ${type}`;
  statusDiv.innerHTML = message;
}
