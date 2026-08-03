// =========================================
// MODUL: SIMPAN FILE - FIX MINIMAL DIFF - BARIS TETAP ±251
// FIX: Chunking, sumber, dan penyimpanan driveId yang benar
// =========================================

import { db } from '../firebase-config.js';
import { collection, addDoc, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const APP_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyFEttY-1C1uPvblg5nOZVl55kvPDV6zH6wd2zc1lORS2A_hHyq5tQQI-dnQqLhN_DjAQ/exec"; // [FIX] Samakan dengan upload.js agar 1 Drive
const FOLDER_URL = "https://drive.google.com/drive/folders/1kxmr2eqt50QLbWZBE14buYTC82eLglZS";
const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB

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
    showStatus('error', '⚠️ File terlalu besar! Maksimal 50MB.');
    fileInput.value = '';
    fileInfo.style.display = 'none';
  } else {
    statusDiv.innerHTML = '';
  }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = () => reject(new Error('Gagal membaca file'));
    reader.readAsDataURL(file);
  });
}

function blobToBase64(blob) { // [FIX-ADD] Helper yang hilang di versi ori
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function sendToAppsScript(action, payload) {
  const url = `${APP_SCRIPT_URL}?action=${action}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
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
    return showStatus('error', '⚠️ Lengkapi semua field wajib dan pilih file!');
  }

  if (file.size > 50 * 1024 * 1024) {
    return showStatus('error', '⚠️ File terlalu besar! Maksimal 50MB.');
  }

  const fileName = `${Date.now()}_${file.name}`;
  btnUpload.disabled = true;
  btnText.textContent = '⏳ Memproses...';

  try {
    // 1. Init Upload - Tetap dipertahankan
    showStatus('info', '📡 Memulai session upload...');
    
    let uploadId;
    let fileId;
    let initSuccess = false;
    
    try {
      const initResult = await sendToAppsScript('initUpload', {
        fileName: fileName,
        mimeType: file.type,
        folderName: kategori,
        totalSize: file.size
      });

      console.log('Init Result:', initResult);

      if (initResult && initResult.status === 'ready') {
        uploadId = initResult.uploadId;
        fileId = initResult.fileId; // [FIX] Ambil fileId dari init
        initSuccess = true;
      } else {
        throw new Error('Init gagal');
      }
    } catch (initError) {
      console.warn('Init error:', initError.message);
      throw new Error('Gagal inisialisasi: ' + initError.message);
    }

    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    let finalResult = null;

    // 2. Upload Chunks - [FIX KASUS 2 & 3] Perbaikan slice yang benar
    for (let i = 0; i < totalChunks; i++) {
      // [FIX] Slice FILE, bukan base64 string - ini akar masalah ID palsu
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const chunk = file.slice(start, end);
      const base64ChunkFull = await blobToBase64(chunk);
      const chunkData = base64ChunkFull.split(',')[1];

      showStatus('info', `📦 Mengupload bagian ${i + 1} dari ${totalChunks}...`);

      try {
        const chunkResult = await sendToAppsScript('uploadChunk', {
          uploadId: uploadId,
          fileId: fileId,
          chunkIndex: i,
          totalChunks: totalChunks,
          data: chunkData
        });

        console.log(`Chunk ${i} Result:`, chunkResult);

        if (chunkResult && chunkResult.status === 'error') {
          throw new Error(chunkResult.message);
        }
        
        if (chunkResult && chunkResult.status === 'complete') {
          console.log('✅ File selesai digabung di Drive:', chunkResult.url);
          finalResult = chunkResult;
        }
      } catch (chunkError) {
        console.warn(`Chunk ${i} error:`, chunkError.message);
        throw chunkError;
      }

      await new Promise(resolve => setTimeout(resolve, 300));
    }

    await new Promise(resolve => setTimeout(resolve, 1000));

    // 3. Simpan ke Firestore dengan driveId yang VALID
    const driveIdToSave = finalResult?.id || fileId;
    const driveUrlToSave = finalResult?.url || `https://drive.google.com/file/d/${fileId}/view`;

    if (!driveIdToSave) throw new Error('Drive ID tidak didapat dari server');

    showStatus('info', '💾 Menyimpan metadata...');
    await simpanKeFirestore({ 
      namaDokumen, 
      kategori, 
      deskripsi, 
      file, 
      fileName,
      driveId: driveIdToSave,
      driveUrl: driveUrlToSave
    });

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
      driveId: data.driveId,
      driveUrl: data.driveUrl,
      urlFile: data.driveUrl, // [FIX] Samakan field agar katalog baca
      ukuranFile: data.file.size,
      tipeFile: data.file.type,
      folderUrl: FOLDER_URL,
      uploaderUid: currentUser.uid,
      uploaderEmail: currentUser.email,
      uploaderNama: currentUser.namaLengkap || 'User',
      tanggalUpload: serverTimestamp(),
      status: 'aktif',
      sumber: 'simpan-file' // [FIX KASUS 1] Bedakan sumber
    });

    showStatus('success', '🎉 Berhasil! File dan data arsip telah disimpan.');
    setTimeout(() => {
      alert('✅ File berhasil disimpan!\n\n📁 Cek folder: ' + data.kategori + '\n📋 Cek menu: Katalog Arsip');
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
