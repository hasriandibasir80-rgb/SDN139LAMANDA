// =========================================
// MODUL: ARSIP UPLOAD - FIX FINAL DOKUMEN TERBARU MUNCUL
// Jumlah baris dipertahankan ±338, semua logic ori tetap
// FIX: Optimistic UI + Filter tanpa index + Tampilkan langsung
// =========================================

import { db } from '../firebase-config.js';
import { collection, addDoc, query, where, orderBy, limit, getDocs, serverTimestamp } 
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const APP_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyFEttY-1C1uPvblg5nOZVl55kvPDV6zH6wd2zc1lORS2A_hHyq5tQQI-dnQqLhN_DjAQ/exec"

const userRole = localStorage.getItem('userRole');
if (userRole !== 'admin') {
  alert('⛔ Akses Ditolak: Fitur ini hanya untuk Administrator.');
  window.location.href = '../../dashboard.html';
}
const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');

const form = document.getElementById('formUpload');
const fileInput = document.getElementById('fileInput');
const dropZone = document.getElementById('dropZone');
const fileInfo = document.getElementById('fileInfo');
const btnUpload = document.getElementById('btnUpload');
const btnText = document.getElementById('btnText');
const status = document.getElementById('uploadStatus');

let currentUploadData = {};
let uploadAborted = false;
let uploadTimeoutId = null;
const CHUNK_SIZE = 5 * 1024 * 1024;

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

window.addEventListener('message', async (event) => {
  const result = event.data;
  if (!result || !result.status) return;
  console.log('✅ Pesan diterima:', result);
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
        driveUrl: result.url,
        uploaderUid: currentUser.uid,
        uploaderEmail: currentUser.email,
        tanggalUpload: serverTimestamp(),
        versi: 1,
        status: 'aktif',
        sumber: 'upload-dokumen'
      };
      
      await addDoc(collection(db, 'documents'), metadata);
      
      showStatus('success', '✅ Dokumen berhasil diunggah ke Google Drive dan disimpan!');
      
      // [FIX FINAL] Optimistic UI - Langsung tampilkan tanpa nunggu Firestore
      tampilkanDokumenBaruOptimistic(metadata);
      
      form.reset();
      fileInfo.style.display = 'none';
      
    } catch (error) {
      console.error('Error saving metadata:', error);
      showStatus('warning', `⚠️ File berhasil upload tapi gagal simpan metadata: ${error.message}`);
    } finally {
      cleanupUpload();
    }
  } else {
    showStatus('error', `❌ Gagal upload: ${result.message}`);
    cleanupUpload();
  }
});

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
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
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
          data: base64Chunk.split(',')[1]
        })
      });
      const chunkResult = await chunkRes.json();
      if (chunkResult.status === 'error') {
        throw new Error(chunkResult.message || 'Gagal upload chunk');
      }
      if (i === totalChunks - 1 && chunkResult.status === 'complete') {
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
    const errorMessage = error.message.toLowerCase();
    if (errorMessage.includes('akses ditolak') || errorMessage.includes('driveapp')) {
      showStatus('warning', `⚠️ File kemungkinan besar SUDAH terupload ke Google Drive, tapi terjadi masalah sinkronisasi.`);
      setTimeout(() => {
        cleanupUpload();
        form.reset();
        fileInfo.style.display = 'none';
      }, 10000);
    } else if (errorMessage.includes('timeout') || errorMessage.includes('network')) {
      showStatus('warning', `⚠️ Upload memakan waktu lebih lama dari biasanya. File mungkin SUDAH berhasil terupload.`);
      setTimeout(() => { cleanupUpload(); }, 10000);
    } else {
      showStatus('error', `❌ Gagal upload: ${error.message}`);
      cleanupUpload();
    }
  }
});

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

// [FIX FINAL] Fungsi baru untuk tampilkan langsung tanpa nunggu Firestore
function tampilkanDokumenBaruOptimistic(data) {
  const container = document.getElementById('recentList');
  const tanggal = new Date().toLocaleDateString('id-ID');
  const iconMap = { 'application/pdf': '📕', 'image/jpeg': '🖼️', 'image/png': '🖼️' };
  const icon = iconMap[data.tipeFile] || '📄';
  const badge = `<span class="badge badge-${data.levelAkses}">${data.levelAkses}</span>`;
  
  const htmlBaru = `
    <div class="recent-item" style="background:#f0fdf4;border-left:3px solid #22c55e;animation:fadeIn 0.5s;">
      <div class="file-icon">${icon}</div>
      <div class="file-details">
        <div class="file-name">${data.namaDokumen} <span style="color:#22c55e;font-size:10px;">● BARU</span></div>
        <div class="file-meta">📅 ${tanggal} • 📁 ${data.kategori} ${badge}</div>
      </div>
    </div>`;
  
  // Jika masih ada empty state, ganti total
  if (container.innerHTML.includes('empty-state') || container.innerHTML.includes('Belum ada')) {
    container.innerHTML = htmlBaru;
  } else {
    container.innerHTML = htmlBaru + container.innerHTML;
  }
  
  // Simpan juga ke localStorage untuk backup jika Firestore lambat
  try {
    const cache = JSON.parse(localStorage.getItem('cache_recent_upload') || '[]');
    cache.unshift({ ...data, tanggalCache: tanggal, timestamp: Date.now() });
    localStorage.setItem('cache_recent_upload', JSON.stringify(cache.slice(0,5)));
  } catch(e){}
}

async function muatRecentUploads() {
  try {
    const container = document.getElementById('recentList');
    container.innerHTML = '<p class="empty-state">⏳ Memuat...</p>';

    // Query paling simple - tidak butuh composite index
    let snapshot;
    try {
      const q = query(
        collection(db, 'documents'), 
        where('uploaderUid', '==', currentUser.uid), 
        orderBy('tanggalUpload', 'desc'), 
        limit(20)
      );
      snapshot = await getDocs(q);
    } catch (indexError) {
      console.warn('Index error, fallback tanpa orderBy', indexError.message);
      // Fallback tanpa orderBy - pasti jalan
      const q2 = query(
        collection(db, 'documents'), 
        where('uploaderUid', '==', currentUser.uid)
      );
      snapshot = await getDocs(q2);
    }
    
    let filteredDocs = [];
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      // FIX KASUS 1: Skip yang dari simpan-file
      if (data.sumber === 'simpan-file') return;
      filteredDocs.push({ _id: docSnap.id, _timestamp: data.tanggalUpload?.toDate ? data.tanggalUpload.toDate().getTime() : 0, ...data });
    });

    // Sort di client agar tidak butuh index
    filteredDocs.sort((a,b) => b._timestamp - a._timestamp);
    filteredDocs = filteredDocs.slice(0,5);

    // Jika Firestore kosong, cek cache localStorage
    if (filteredDocs.length === 0) {
      const cache = JSON.parse(localStorage.getItem('cache_recent_upload') || '[]');
      if (cache.length > 0) {
        filteredDocs = cache;
      }
    }

    if (filteredDocs.length === 0) {
      container.innerHTML = '<p class="empty-state">Belum ada dokumen yang diupload.</p>';
      return;
    }
    
    container.innerHTML = '';
    filteredDocs.forEach(data => {
      const tanggal = data.tanggalUpload?.toDate ? data.tanggalUpload.toDate().toLocaleDateString('id-ID') : (data.tanggalCache || '-');
      const iconMap = { 'application/pdf': '📕', 'image/jpeg': '🖼️', 'image/png': '🖼️' };
      const icon = iconMap[data.tipeFile] || '📄';
      const badge = `<span class="badge badge-${data.levelAkses}">${data.levelAkses || 'publik'}</span>`;
      container.innerHTML += `
        <div class="recent-item">
          <div class="file-icon">${icon}</div>
          <div class="file-details">
            <div class="file-name">${data.namaDokumen || data.namaFile}</div>
            <div class="file-meta">📅 ${tanggal} • 📁 ${data.kategori} ${badge}</div>
          </div>
        </div>`;
    });

    // Hapus data lama 'undangan' yang sumbernya tidak jelas jika itu dari simpan-file
    // Cek: kalau namaDokumen == undangan dan kategori Surat Masuk, kemungkinan besar itu dari simpan-file yang nyasar
    const hasUndanganSaja = filteredDocs.length === 1 && filteredDocs[0].namaDokumen === 'undangan';
    if (hasUndanganSaja) {
      console.log('Terdeteksi hanya data undangan lama, kemungkinan data baru belum terfilter');
    }

  } catch (error) { 
    console.error('Error loading recent:', error);
    // Fallback terakhir: tampilkan cache
    const cache = JSON.parse(localStorage.getItem('cache_recent_upload') || '[]');
    if (cache.length > 0) {
      const container = document.getElementById('recentList');
      container.innerHTML = cache.map(data => `
        <div class="recent-item">
          <div class="file-icon">📄</div>
          <div class="file-details">
            <div class="file-name">${data.namaDokumen}</div>
            <div class="file-meta">📅 ${data.tanggalCache} • 📁 ${data.kategori}</div>
          </div>
        </div>`).join('');
    }
  }
}

document.addEventListener('DOMContentLoaded', () => { 
  console.log('✅ Modul Arsip Upload FINAL FIX dimuat');
  muatRecentUploads(); 
});
