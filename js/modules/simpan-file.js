// =========================================
// MODUL: SIMPAN FILE - CHUNKED UPLOAD
// Tanpa no-cors, bisa baca response!
// =========================================

import { db } from '../firebase-config.js';
import { collection, addDoc, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const APP_SCRIPT_URL = "https://script.google.com/macros/s/AKfycby2J3v7J-qQREY7pNsITzExSMEX1eaDaTfAgr4IZ15548auxyQ3pScZnT3X9LuH3pkl/exec";
const FOLDER_URL = "https://drive.google.com/drive/folders/1kxmr2eqt50QLbWZBE14buYTC82eLglZS";
const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB per chunk

const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
if (!currentUser.uid) {
  alert('⚠️ Anda harus login untuk menggunakan fitur ini.');
  window.location.href = '../../index.html';
}

console.log('✅ Simpan File dimuat. User:', currentUser.email);

// DOM Elements
const form = document.getElementById('formSimpanFile');
const fileInput = document.getElementById('fileInput');
const fileInfo = document.getElementById('fileInfo');
const btnUpload = document.getElementById('btnUpload');
const btnText = document.getElementById('btnText');
const statusDiv = document.getElementById('uploadStatus');

// Drag & Drop
['dragenter', 'dragover'].forEach(evt => {
  const dz = document.getElementById('dropZone');
  if (dz) {
    dz.addEventListener(evt, (e) => {
      e.preventDefault();
      dz.classList.add('dragover');
    });
  }
});

['dragleave', 'drop'].forEach(evt => {
  const dz = document.getElementById('dropZone');
  if (dz) {
    dz.addEventListener(evt, (e) => {
      e.preventDefault();
      dz.classList.remove('dragover');
    });
  }
});

const dropZone = document.getElementById('dropZone');
if (dropZone) {
  dropZone.addEventListener('drop', (e) => {
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      fileInput.files = files;
      tampilkanInfoFile(files[0]);
    }
  });
}

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
  
  if (file.size > 50 * 1024 * 1024) {
    showStatus('error', '⚠️ File terlalu besar! Maksimal 50MB.');
    fileInput.value = '';
    fileInfo.style.display = 'none';
  } else {
    statusDiv.innerHTML = '';
  }
}

// Convert file ke Base64
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        resolve(reader.result.split(',')[1]);
      } catch (err) {
        reject(new Error('Gagal konversi Base64: ' + err.message));
      }
    };
    reader.onerror = () => reject(new Error('Gagal membaca file'));
    reader.onabort = () => reject(new Error('Pembacaan dibatalkan'));
    reader.readAsDataURL(file);
  });
}

// 🎯 KUNCI: Kirim data sebagai form-urlencoded (tidak trigger preflight!)
async function sendToAppsScript(data) {
  const formData = new URLSearchParams();
  formData.append('data', JSON.stringify(data));
  
  const response = await fetch(APP_SCRIPT_URL, {
    method: 'POST',
    // TIDAK pakai mode: 'no-cors'
    // TIDAK pakai Content-Type: application/json
    // Pakai form-urlencoded (simple, no preflight)
    body: formData.toString()
  });
  
  if (!response.ok) {
    throw new Error('HTTP error: ' + response.status);
  }
  
  return await response.json();
}

// Form Submit Handler
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const kategori = document.getElementById('kategori').value;
  const namaDokumen = document.getElementById('namaDokumen').value.trim();
  const deskripsi = document.getElementById('deskripsi').value.trim();
  const file = fileInput.files[0];

  if (!kategori || !namaDokumen || !file) {
    return showStatus('error', '⚠️ Lengkapi semua field wajib dan pilih file!');
  }

  if (file.size > 50 * 1024 * 1024) {
    return showStatus('error', '⚠️ File terlalu besar! Maksimal 50MB.');
  }

  const fileName = `${Date.now()}_${file.name}`;
  btnUpload.disabled = true;
  btnText.textContent = '⏳ Memproses...';

  try {
    // Step 1: Convert to Base64
    showStatus('info', '🔄 Mengkonversi file ke Base64...');
    const base64String = await fileToBase64(file);
    console.log('✅ Base64 length:', base64String.length);

    // Step 2: Init Upload
    showStatus('info', ' Memulai upload session...');
    const initResult = await sendToAppsScript({
      action: 'init',
      fileName: fileName,
      mimeType: file.type,
      totalSize: file.size
    });

    console.log('✅ Init response:', initResult);

    if (initResult.status !== 'ready') {
      throw new Error('Gagal init upload: ' + JSON.stringify(initResult));
    }

    const uploadId = initResult.uploadId;
    const totalChunks = initResult.totalChunks;
    console.log(' Upload ID:', uploadId);
    console.log('📦 Total chunks:', totalChunks);

    // Step 3: Upload chunks
    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, base64String.length);
      const chunkData = base64String.slice(start, end);

      showStatus('info', `📤 Mengupload chunk ${i + 1}/${totalChunks}...`);
      console.log(`📦 Chunk ${i + 1}/${totalChunks}: ${chunkData.length} chars`);

      const chunkResult = await sendToAppsScript({
        action: 'chunk',
        uploadId: uploadId,
        chunkIndex: i,
        totalChunks: totalChunks,
        chunkData: chunkData
      });

      console.log(`✅ Chunk ${i + 1} response:`, chunkResult);

      if (chunkResult.status === 'error') {
        throw new Error('Chunk error: ' + chunkResult.message);
      }

      // Delay kecil agar Apps Script tidak overload
      if (i < totalChunks - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // Step 4: Simpan ke Firestore
    showStatus('info', '💾 Menyimpan metadata ke database...');
    await simpanKeFirestore({
      namaDokumen,
      kategori,
      deskripsi,
      file,
      fileName
    });

  } catch (error) {
    console.error('❌ Error:', error);
    showStatus('error', '❌ Gagal: ' + error.message);
    btnUpload.disabled = false;
    btnText.textContent = '💾 Simpan File';
  }
});

// Simpan ke Firestore
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
      folderUrl: FOLDER_URL,
      uploaderUid: currentUser.uid,
      uploaderEmail: currentUser.email,
      uploaderNama: currentUser.namaLengkap || 'User',
      tanggalUpload: serverTimestamp(),
      status: 'aktif'
    });

    console.log('✅ Firestore save success');
    
    showStatus('success', '🎉 Berhasil! File dan data arsip telah disimpan.');
    
    setTimeout(() => {
      alert('✅ File berhasil disimpan!\n\n📁 Cek folder: ARSIP DIGITAL SDN 139 LAMANDA\n📋 Cek menu: Katalog Arsip');
      form.reset();
      fileInfo.style.display = 'none';
      btnUpload.disabled = false;
      btnText.textContent = '💾 Simpan File';
    }, 500);

  } catch (err) {
    console.error('❌ Firestore Error:', err);
    throw new Error('File terupload tapi gagal simpan database: ' + err.message);
  }
}

function showStatus(type, message) {
  statusDiv.className = `upload-status ${type}`;
  statusDiv.innerHTML = message;
}
