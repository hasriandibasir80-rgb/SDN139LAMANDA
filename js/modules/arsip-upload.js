// =========================================
// MODUL: ARSIP UPLOAD (CHUNKED UPLOAD)
// METODE: Chunked Fetch + Apps Script Router
// =========================================

import { db } from '../firebase-config.js';
import { collection, addDoc, query, where, orderBy, limit, getDocs, serverTimestamp } 
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ✅ URL Web App Google Apps Script (VERSI CHUNKED)
const APP_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyFEttY-1C1uPvblg5nOZVl55kvPDV6zH6wd2zc1lORS2A_hHyq5tQQI-dnQqLhN_DjAQ/exec"

// 1. KEAMANAN: Cek Admin
const userRole = localStorage.getItem('userRole');
if (userRole !== 'admin') {
  alert('⛔ Akses Ditolak: Fitur ini hanya untuk Administrator.');
  window.location.href = '../../dashboard.html';
}

const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');

// 2. DOM Elements
const form = document.getElementById('formUpload');
const fileInput = document.getElementById('fileInput');
const dropZone = document.getElementById('dropZone');
const fileInfo = document.getElementById('fileInfo');
const btnUpload = document.getElementById('btnUpload');
const btnText = document.getElementById('btnText');
const status = document.getElementById('uploadStatus');

// 3. STATE
let currentUploadData = {};
let uploadAborted = false;
let uploadTimeoutId = null; // ✅ BARU: Untuk track timeout
const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB per chunk

// 4. DRAG & DROP Handler
['dragenter', 'dragover'].forEach(evt => {
  dropZone.addEventListener(evt, (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
});
['dragleave', 'drop'].forEach(evt => {
  dropZone.addEventListener(evt, (e) => { e.preventDefault(); dropZone.classList.remove('dragover'); });
});

dropZone.addEventListener('drop', (e) => {
  const files = e.dataTransfer.files;
  if (files.length > 0) { fileInput.files = files; tampilkanInfoFile(files[0]); }
});

fileInput.addEventListener('change', (e) => {
  if (e.target.files.length > 0) { tampilkanInfoFile(e.target.files[0]); }
});

function tampilkanInfoFile(file) {
  const ukuranMB = (file.size / (1024 * 1024)).toFixed(2);
  fileInfo.innerHTML = `✅ <strong>${file.name}</strong><br>📦 Ukuran: ${ukuranMB} MB | 📎 Tipe: ${file.type || 'Unknown'}`;
  fileInfo.style.display = 'block';
  
  if (file.size > 50 * 1024 * 1024) {
    showStatus('error', '⚠️ File terlalu besar! Maksimal 50MB untuk metode ini.');
    fileInput.value = '';
    fileInfo.style.display = 'none';
  }
}

// 5. LISTENER postMessage (untuk trigger simpan metadata)
window.addEventListener('message', async (event) => {
  const result = event.data;
  
  if (!result || !result.status) return;
  
  console.log('✅ Pesan diterima:', result);

  // ✅ BARU: Clear timeout jika ada response
  if (uploadTimeoutId) {
    clearTimeout(uploadTimeoutId);
    uploadTimeoutId = null;
  }

  if (result.status === 'success') {
    try {
      showStatus('loading', '💾 Menyimpan metadata ke database...');
      
      const metadata = {
        namaDokumen: currentUploadData.namaDokumen,
        kategori: currentUploadData.kategori,
        levelAkses: currentUploadData.levelAkses,
        deskripsi: currentUploadData.deskripsi,
        namaFile: currentUploadData.file.name,
        ukuranFile: currentUploadData.file.size,
        tipeFile: currentUploadData.file.type || 'unknown',
        urlFile: result.url,
        driveId: result.id,
        uploaderUid: currentUser.uid,
        uploaderEmail: currentUser.email,
        tanggalUpload: serverTimestamp(),
        versi: 1,
        status: 'aktif'
      };
      
      await addDoc(collection(db, 'documents'), metadata);
      
      showStatus('success', '✅ Dokumen berhasil diunggah ke Google Drive dan disimpan!');
      form.reset();
      fileInfo.style.display = 'none';
      muatRecentUploads();
      
    } catch (error) {
      console.error('Error saving metadata:', error);
      showStatus('warning', `⚠️ File berhasil upload tapi gagal simpan metadata: ${error.message}. Silakan screenshot URL file untuk dokumentasi.`);
    } finally {
      cleanupUpload();
    }
  } else {
    showStatus('error', `❌ Gagal upload: ${result.message}`);
    cleanupUpload();
  }
});

// 6. PROSES UPLOAD VIA CHUNKED FETCH
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const namaDokumen = document.getElementById('namaDokumen').value.trim();
  const kategori = document.getElementById('kategori').value;
  const levelAkses = document.getElementById('levelAkses').value;
  const deskripsi = document.getElementById('deskripsi').value.trim();
  const file = fileInput.files[0];

  if (!file) {
    showStatus('error', '⚠️ Silakan pilih file terlebih dahulu.');
    return;
  }

  currentUploadData = { namaDokumen, kategori, levelAkses, deskripsi, file };
  uploadAborted = false;

  btnUpload.disabled = true;
  btnText.textContent = '⏳ Menyiapkan upload...';
  showStatus('loading', '📤 Memulai upload chunk...');

  try {
    // Step 1: Init upload session di Apps Script
    showStatus('loading', '📤 Menginisialisasi session upload...');
    
    const sessionRes = await fetch(APP_SCRIPT_URL + '?action=initUpload', {
      method: 'POST',
      body: JSON.stringify({
        fileName: `${Date.now()}_${file.name.replace(/\s+/g, '_')}`,
        mimeType: file.type || 'application/octet-stream',
        folderName: kategori,
        totalSize: file.size
      })
    });
    
    const sessionData = await sessionRes.json();

    if (sessionData.status !== 'ready') {
      throw new Error(sessionData.message || 'Gagal inisialisasi upload');
    }
    
    const { uploadId, fileId } = sessionData;
    console.log('✅ Upload session dibuat:', uploadId);

    // Step 2: Upload per chunk
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    console.log('📦 Total chunk:', totalChunks);

    for (let i = 0; i < totalChunks; i++) {
      if (uploadAborted) throw new Error('Upload dibatalkan');

      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const chunk = file.slice(start, end);
      const base64Chunk = await blobToBase64(chunk);

      btnText.textContent = `⏳ Upload ${i+1}/${totalChunks}`;
      showStatus('loading', `☁️ Mengunggah chunk ${i+1} dari ${totalChunks}... ${(end/file.size*100).toFixed(1)}%`);

      const chunkRes = await fetch(APP_SCRIPT_URL + '?action=uploadChunk', {
        method: 'POST',
        body: JSON.stringify({
          uploadId,
          fileId,
          chunkIndex: i,
          totalChunks,
          data: base64Chunk.split(',')[1] // buang prefix "data:...;base64,"
        })
      });

      const chunkResult = await chunkRes.json();
      
      if (chunkResult.status === 'error') {
        throw new Error(chunkResult.message || 'Gagal upload chunk');
      }

      // Kalau chunk terakhir, trigger simpan metadata
      if (i === totalChunks - 1 && chunkResult.status === 'complete') {
        console.log('✅ Upload selesai, URL:', chunkResult.url);
        
        // Trigger listener postMessage manual
        window.postMessage({
          status: 'success',
          url: chunkResult.url,
          id: chunkResult.id,
          name: chunkResult.name
        }, '*');
        return;
      }
    }

  } catch (error) {
    console.error('Upload error:', error);
    
    // ✅ BARU: Error handling yang lebih pintar
    const errorMessage = error.message.toLowerCase();
    
    // Jika error terkait authorization/DriveApp, tampilkan pesan yang lebih helpful
    if (errorMessage.includes('akses ditolak') || errorMessage.includes('driveapp')) {
      showStatus('warning', 
        `⚠️ File kemungkinan besar SUDAH terupload ke Google Drive, tapi terjadi masalah sinkronisasi.
        
        📌 Langkah yang perlu dilakukan:
        1. Buka Google Drive Anda
        2. Cek folder "ARSIP DARI SITUS SDN 139 LAMANDA"
        3. Jika file ada, screenshot URL file untuk dokumentasi
        4. Hubungi admin jika metadata tidak tersimpan`
      );
      
      // Auto cleanup setelah 10 detik
      setTimeout(() => {
        cleanupUpload();
        form.reset();
        fileInfo.style.display = 'none';
      }, 10000);
      
    } else if (errorMessage.includes('timeout') || errorMessage.includes('network')) {
      // Jika timeout/network error, file mungkin sudah terupload
      showStatus('warning', 
        `⚠️ Upload memakan waktu lebih lama dari biasanya. File mungkin SUDAH berhasil terupload.
        
        📌 Silakan:
        1. Cek Google Drive Anda
        2. Lihat folder "ARSIP DARI SITUS SDN 139 LAMANDA"
        3. Refresh halaman jika file sudah ada`
      );
      
      // Set timeout untuk cleanup
      setTimeout(() => {
        cleanupUpload();
      }, 10000);
      
    } else {
      // Error lainnya
      showStatus('error', `❌ Gagal upload: ${error.message}`);
      cleanupUpload();
    }
  }
});

// 7. HELPER FUNCTIONS
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function cleanupUpload() {
  uploadAborted = true;
  
  // ✅ BARU: Clear timeout jika ada
  if (uploadTimeoutId) {
    clearTimeout(uploadTimeoutId);
    uploadTimeoutId = null;
  }
  
  btnUpload.disabled = false;
  btnText.textContent = '💾 Upload & Simpan Metadata';
}

function showStatus(type, message) {
  status.className = `upload-status ${type}`;
  status.textContent = message;
}

// 8. MUAT RECENT UPLOADS
async function muatRecentUploads() {
  try {
    const q = query(
      collection(db, 'documents'), 
      where('uploaderUid', '==', currentUser.uid), 
      orderBy('tanggalUpload', 'desc'), 
      limit(5)
    );
    const snapshot = await getDocs(q);
    const container = document.getElementById('recentList');
    
    if (snapshot.empty) {
      container.innerHTML = '<p class="empty-state">Belum ada dokumen yang diupload.</p>';
      return;
    }
    
    container.innerHTML = '';
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const tanggal = data.tanggalUpload 
        ? new Date(data.tanggalUpload.toDate()).toLocaleDateString('id-ID') 
        : '-';
      const iconMap = { 
        'application/pdf': '📕', 
        'image/jpeg': '🖼️', 
        'image/png': '🖼️' 
      };
      const icon = iconMap[data.tipeFile] || '📄';
      const badge = `<span class="badge badge-${data.levelAkses}">${data.levelAkses}</span>`;
      
      container.innerHTML += `
        <div class="recent-item">
          <div class="file-icon">${icon}</div>
          <div class="file-details">
            <div class="file-name">${data.namaDokumen}</div>
            <div class="file-meta">📅 ${tanggal} • 📁 ${data.kategori} ${badge}</div>
          </div>
        </div>`;
    });
  } catch (error) { 
    console.error('Error loading recent:', error); 
  }
}

// 9. INIT
document.addEventListener('DOMContentLoaded', () => { 
  console.log('✅ Modul Arsip Upload (Chunked) dimuat');
  muatRecentUploads(); 
});
