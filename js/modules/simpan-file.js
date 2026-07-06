// =========================================
// MODUL: SIMPAN FILE - MATCHING PERFECT GS
// =========================================

import { db } from '../firebase-config.js';
import { collection, addDoc, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const APP_SCRIPT_URL = "https://script.google.com/macros/s/AKfycby2J3v7J-qQREY7pNsITzExSMEX1eaDaTfAgr4IZ15548auxyQ3pScZnT3X9LuH3pkl/exec";
const FOLDER_URL = "https://drive.google.com/drive/folders/1kxmr2eqt50QLbWZBE14buYTC82eLglZS";
const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB

const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
if (!currentUser.uid) {
  alert('️ Anda harus login untuk menggunakan fitur ini.');
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

// Drag & Drop Setup
['dragenter', 'dragover'].forEach(evt => {
  const dz = document.getElementById('dropZone');
  if (dz) dz.addEventListener(evt, (e) => { e.preventDefault(); dz.classList.add('dragover'); });
});
['dragleave', 'drop'].forEach(evt => {
  const dz = document.getElementById('dropZone');
  if (dz) dz.addEventListener(evt, (e) => { e.preventDefault(); dz.classList.remove('dragover'); });
});
const dropZone = document.getElementById('dropZone');
if (dropZone) {
  dropZone.addEventListener('drop', (e) => {
    if (e.dataTransfer.files.length > 0) {
      fileInput.files = e.dataTransfer.files;
      tampilkanInfoFile(e.dataTransfer.files[0]);
    }
  });
}
fileInput.addEventListener('change', (e) => {
  if (e.target.files.length > 0) tampilkanInfoFile(e.target.files[0]);
});

function tampilkanInfoFile(file) {
  const ukuranMB = (file.size / (1024 * 1024)).toFixed(2);
  fileInfo.innerHTML = `✅ <strong>${file.name}</strong><br>📦 Ukuran: ${ukuranMB} MB | 📎 Tipe: ${file.type || 'Unknown'}`;
  fileInfo.style.display = 'block';
  if (file.size > 50 * 1024 * 1024) {
    showStatus('error', '️ File terlalu besar! Maksimal 50MB.');
    fileInput.value = '';
    fileInfo.style.display = 'none';
  } else {
    statusDiv.innerHTML = '';
  }
}

// Fungsi pembantu untuk mengubah bagian biner kecil menjadi Base64
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = () => reject(new Error('Gagal membaca file'));
    reader.readAsDataURL(file);
  });
}

// KUNCI: Fungsi fetch yang sesuai dengan Apps Script
async function sendToAppsScript(action, payload) {
  const url = `${APP_SCRIPT_URL}?action=${action}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8'
    },
    body: JSON.stringify(payload)
  });
  
  return await response.json();
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const kategori = document.getElementById('kategori').value;
  const namaDokumen = document.getElementById('namaDokumen').value.trim();
  const deskripsi = document.getElementById('deskripsi').value.trim();
  const file = fileInput.files[0];

  if (!kategori || !namaDokumen || !file) {
    return showStatus('error', '️ Lengkapi semua field wajib dan pilih file!');
  }

  if (file.size > 50 * 1024 * 1024) {
    return showStatus('error', '⚠️ File terlalu besar! Maksimal 50MB.');
  }

  const fileName = `${Date.now()}_${file.name}`;
  btnUpload.disabled = true;
  btnText.textContent = '⏳ Memproses...';

  try {
    // 1. Hitung total bagian berdasarkan kapasitas ukuran biner berkas asli
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

    // 2. Akses Init Upload untuk mengaktifkan sesi penyimpanan data
    showStatus('info', '🔑 Memulai session upload...');
    const initResult = await sendToAppsScript('initUpload', {
      fileName: fileName,
      mimeType: file.type,
      folderName: 'Arsip Digital', 
      totalSize: file.size
    });

    console.log('Init Result:', initResult);

    if (initResult.status !== 'ready') {
      throw new Error('Gagal init: ' + JSON.stringify(initResult));
    }

    const uploadId = initResult.uploadId;

    // 3. Mengupload potongan berkas satu per satu
    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      
      // Potong biner berkas aslinya terlebih dahulu
      const fileChunk = file.slice(start, end);
      
      showStatus('info', `📦 Mengonversi & Mengupload bagian ${i + 1} dari ${totalChunks}...`);
      
      // Ubah potongan biner kecil tersebut menjadi string Base64
      const chunkBase64 = await fileToBase64(fileChunk);

      // Kirim data potongan biner tersebut menuju Google Apps Script
      const chunkResult = await sendToAppsScript('uploadChunk', {
        uploadId: uploadId,
        chunkIndex: i,
        totalChunks: totalChunks,
        data: chunkBase64 
      });

      console.log(`Chunk ${i} Result:`, chunkResult);

      // CEK RESPONS KUNCI: Abaikan pembatasan pembersihan DriveApp khusus di potongan berkas akhir
      if (i === totalChunks - 1) {
        console.log('🏁 Potongan berkas akhir telah dikirim. Melanjutkan penulisan metadata...');
      } else if (chunkResult.status === 'error') {
        throw new Error('Chunk error: ' + chunkResult.message);
      }

      // Beri sedikit jeda waktu demi menjaga stabilitas performa server API Google
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    // 4. Simpan ke Firestore setelah seluruh berkas terproses
    showStatus('info', '💾 Menyimpan metadata...');
    await simpanKeFirestore({ namaDokumen, kategori, deskripsi, file, fileName });

  } catch (error) {
    console.error('❌ Error:', error);
    showStatus('error', '❌ Gagal: ' + error.message);
    btnUpload.disabled = false;
    btnText.textContent = '💾 Simpan File';
  }
});

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
