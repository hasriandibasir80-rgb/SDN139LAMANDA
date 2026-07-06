// =========================================
// MODUL: SIMPAN FILE - MATCHING PERFECT GS (FIXED MULTIPART & FIRESTORE)
// =========================================

import { db } from '../firebase-config.js';
// FIX PRESISI: Mengembalikan URL lengkap SDK Firebase agar tidak memicu CORS Error
import { collection, addDoc, serverTimestamp }
  from "https://gstatic.com";

// SINKRONISASI: Menyelaraskan URL Apps Script Anda yang aktif
const APP_SCRIPT_URL = "https://google.com";
const FOLDER_URL = "https://google.com";
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
  if (!file) return;
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
  const file = fileInput.files[0]; // FIX: Membaca index ke-0 agar stabil

  if (!kategori || !namaDokumen || !file) {
    return showStatus('error', '⚠️ Lengkapi semua field wajib dan pilih file!');
  }

  const fileName = `${Date.now()}_${file.name}`;
  btnUpload.disabled = true;
  btnText.textContent = '⏳ Memproses...';

  try {
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

    showStatus('info', '🔑 Memulai session upload...');
    const initResult = await sendToAppsScript('initUpload', {
      fileName: fileName,
      mimeType: file.type,
      folderName: 'Arsip Digital', 
      totalSize: file.size
    });

    if (initResult.status !== 'ready') {
      throw new Error('Gagal init: ' + JSON.stringify(initResult));
    }

    const uploadId = initResult.uploadId;
    let finalDriveUrl = '';
    let finalDriveId = '';

    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      
      const fileChunk = file.slice(start, end);
      showStatus('info', `📦 Mengupload bagian ${i + 1} dari ${totalChunks}...`);
      
      const chunkBase64 = await fileToBase64(fileChunk);

      const chunkResult = await sendToAppsScript('uploadChunk', {
        uploadId: uploadId,
        chunkIndex: i,
        totalChunks: totalChunks,
        data: chunkBase64 
      });

      console.log(`Chunk ${i} Result:`, chunkResult);

      // FIX TELITI: Tangkap tautan & ID file unik dari respons Google di akhir proses
      if (i === totalChunks - 1) {
        console.log('🏁 Chunk terakhir selesai dikirim.');
        finalDriveUrl = chunkResult?.url || '';
        finalDriveId = chunkResult?.id || '';
      } else if (chunkResult.status === 'error') {
        throw new Error('Chunk error: ' + chunkResult.message);
      }

      await new Promise(resolve => setTimeout(resolve, 300));
    }

    showStatus('info', '💾 Menyimpan metadata ke database...');
    
    // Mengirimkan payload lengkap berkas beserta link spesifik Drive-nya
    await simpanKeFirestore({ 
      namaDokumen, 
      kategori, 
      deskripsi, 
      file, 
      fileName,
      googleDriveUrl: finalDriveUrl,
      googleDriveId: finalDriveId
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
      ukuranFile: data.file.size,
      tipeFile: data.file.type,
      // FIX TELITI: Menyimpan properti fileUrl & fileId agar terbaca oleh arsip-katalog.js
      fileUrl: data.googleDriveUrl || FOLDER_URL, 
      fileId: data.googleDriveId || '',
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

// Fungsi pembantu pembuat status visual teks
function showStatus(type, message) {
  statusDiv.className = `upload-status ${type}`;
  statusDiv.innerHTML = message;
}
