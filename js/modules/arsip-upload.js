// =========================================
// MODUL: ARSIP UPLOAD (REFACTORED & STABLE)
// =========================================

import { db } from '../firebase-config.js';
import { collection, addDoc, query, where, orderBy, limit, getDocs, serverTimestamp, deleteDoc, doc } 
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// URL Web App Google Apps Script
const APP_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyFEttY-1C1uPvblg5nOZVl55kvPDV6zH6wd2zc1lORS2A_hHyq5tQQI-dnQqLhN_DjAQ/exec"

// 1. KEAMANAN: Cek Admin
const userRole = localStorage.getItem('userRole');
if (userRole !== 'admin') {
  alert('⛔ Akses Ditolak: Fitur ini hanya untuk Administrator.');
  window.location.href = '../../dashboard.html';
}

const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');

// Validasi User
if (!currentUser.uid) {
  alert('⚠️ Sesi user tidak valid. Silakan login ulang.');
  window.location.href = '../../index.html';
}

// 2. DOM Elements
const form = document.getElementById('formUpload');
const fileInput = document.getElementById('fileInput');
const dropZone = document.getElementById('dropZone');
const fileInfo = document.getElementById('fileInfo');
const btnUpload = document.getElementById('btnUpload');
const btnText = document.getElementById('btnText');
const statusDiv = document.getElementById('uploadStatus');

// 3. STATE
let uploadAborted = false;
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
    showStatus('error', '⚠️ File terlalu besar! Maksimal 50MB.');
    fileInput.value = '';
    fileInfo.style.display = 'none';
  }
}

// 5. PROSES UPLOAD LANGSUNG (TANPA POSTMESSAGE)
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

  uploadAborted = false;
  btnUpload.disabled = true;
  btnText.textContent = '⏳ Menyiapkan upload...';
  showStatus('loading', '📤 Memulai upload...');

  try {
    // Step 1: Init upload session
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

    // Step 2: Upload per chunk
    let finalResult = null;

    for (let i = 0; i < totalChunks; i++) {
      if (uploadAborted) throw new Error('Upload dibatalkan');

      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const chunk = file.slice(start, end);
      const base64Chunk = await blobToBase64(chunk);

      btnText.textContent = `⏳ Upload ${i+1}/${totalChunks}`;
      showStatus('loading', `☁️ Mengunggah chunk ${i+1} dari ${totalChunks}... (${(end/file.size*100).toFixed(1)}%)`);

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

      // Simpan hasil chunk terakhir
      if (i === totalChunks - 1) {
        finalResult = chunkResult;
      }
    }

    // Step 3: LANGSUNG SIMPAN METADATA (Tanpa postMessage)
    if (finalResult && (finalResult.status === 'complete' || finalResult.status === 'success')) {
      console.log('✅ Upload ke Drive selesai. Menyimpan metadata...');
      await simpanMetadata({
        namaDokumen, kategori, levelAkses, deskripsi, file,
        url: finalResult.url,
        id: finalResult.id,
        name: finalResult.name
      });
    } else {
      throw new Error('Upload chunk selesai tapi status tidak valid dari Apps Script.');
    }

  } catch (error) {
    console.error(' Upload error:', error);
    showStatus('error', `❌ Gagal upload: ${error.message}`);
    cleanupUpload();
  }
});

// 6. FUNGSI SIMPAN METADATA (DIPISAHKAN AGAR RAPI)
async function simpanMetadata(uploadData) {
  try {
    showStatus('loading', '💾 Menyimpan metadata ke Firestore...');
    
    const metadata = {
      namaDokumen: uploadData.namaDokumen,
      kategori: uploadData.kategori,
      levelAkses: uploadData.levelAkses,
      deskripsi: uploadData.deskripsi,
      namaFile: uploadData.file.name,
      ukuranFile: uploadData.file.size,
      tipeFile: uploadData.file.type || 'unknown',
      urlFile: uploadData.url,
      driveFileId: uploadData.id,
      uploaderUid: currentUser.uid, // Pastikan ini ada!
      uploaderEmail: currentUser.email || 'unknown',
      tanggalUpload: serverTimestamp(),
      versi: 1,
      status: 'aktif'
    };
    
    console.log('📝 Data yang akan disimpan:', metadata);
    
    const docRef = await addDoc(collection(db, 'documents'), metadata);
    console.log('✅ Metadata berhasil disimpan dengan ID:', docRef.id);
    
    showStatus('success', '✅ Dokumen berhasil diunggah ke Google Drive dan disimpan!');
    form.reset();
    fileInfo.style.display = 'none';
    
    // Muat ulang daftar dokumen terbaru
    await muatRecentUploads();
    
  } catch (error) {
    console.error('❌ Error saving metadata:', error);
    showStatus('warning', `⚠️ File terupload ke Drive, tapi GAGAL simpan ke Firestore: ${error.message}`);
  } finally {
    cleanupUpload();
  }
}

// 7. MUAT RECENT UPLOADS
async function muatRecentUploads() {
  const container = document.getElementById('recentList');
  container.innerHTML = '<p class="loading-state">⏳ Memuat dokumen terbaru...</p>';
  
  try {
    const q = query(
      collection(db, 'documents'), 
      where('uploaderUid', '==', currentUser.uid), 
      orderBy('tanggalUpload', 'desc'), 
      limit(5)
    );
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      container.innerHTML = `
        <div class="empty-state-enhanced">
          <div style="font-size: 40px; margin-bottom: 10px;">📭</div>
          <p>Belum ada dokumen yang Anda upload.</p>
        </div>
      `;
      return;
    }
    
    container.innerHTML = '';
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const tanggal = data.tanggalUpload 
        ? new Date(data.tanggalUpload.toDate()).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) 
        : '-';
      
      const iconMap = { 'application/pdf': '📕', 'image/jpeg': '🖼️', 'image/png': '🖼️' };
      const icon = iconMap[data.tipeFile] || '📄';
      const ukuranMB = data.ukuranFile ? (data.ukuranFile / (1024 * 1024)).toFixed(2) : '?';
      
      const itemEl = document.createElement('div');
      itemEl.className = 'recent-item';
      itemEl.innerHTML = `
        <div class="file-icon">${icon}</div>
        <div class="file-details">
          <div class="file-name">${data.namaDokumen}</div>
          <div class="file-meta">📅 ${tanggal} •  ${ukuranMB}MB • 📁 ${data.kategori}</div>
        </div>
        <div class="file-actions">
          ${data.urlFile ? `<button class="btn-action btn-view" onclick="window.open('${data.urlFile}', '_blank')" title="Lihat File">👁️</button>` : ''}
          <button class="btn-action btn-delete" onclick="hapusDokumen('${docSnap.id}', '${data.namaFile}')" title="Hapus">🗑️</button>
        </div>
      `;
      container.appendChild(itemEl);
    });
    
  } catch (error) { 
    console.error('❌ Error loading recent:', error);
    container.innerHTML = `<div class="error-state">Gagal memuat: ${error.message}</div>`;
  }
}

// 8. FUNGSI HAPUS DOKUMEN
window.hapusDokumen = async function(docId, namaFile) {
  if (!confirm(`Hapus metadata dokumen "${namaFile}"?\n\n(File fisik di Google Drive tidak akan terhapus)`)) return;
  
  try {
    await deleteDoc(doc(db, 'documents', docId));
    alert('✅ Metadata berhasil dihapus!');
    muatRecentUploads();
  } catch (error) {
    alert('❌ Gagal menghapus: ' + error.message);
  }
};

// 9. HELPER FUNCTIONS
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
  btnUpload.disabled = false;
  btnText.textContent = '💾 Upload & Simpan Metadata';
}

function showStatus(type, message) {
  statusDiv.className = `upload-status ${type}`;
  statusDiv.textContent = message;
}

// 10. INIT
document.addEventListener('DOMContentLoaded', () => { 
  console.log('✅ Modul Arsip Upload dimuat. User UID:', currentUser.uid);
  muatRecentUploads(); 
});
