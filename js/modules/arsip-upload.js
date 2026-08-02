// FIX v2 - TIDAK BUTUH INDEX FIRESTORE - LANGSUNG MUNCUL
import { db } from '../firebase-config.js';
import { collection, addDoc, query, where, getDocs, serverTimestamp } 
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
  fileInfo.innerHTML = `✅ <strong>${file.name}</strong><br>📦 Ukuran: ${ukuranMB} MB`;
  fileInfo.style.display = 'block';
}

window.addEventListener('message', async (event) => {
  const result = event.data;
  if (!result || !result.status) return;
  if (result.status === 'success') {
    try {
      showStatus('loading', '💾 Menyimpan metadata...');
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
      showStatus('success', '✅ Berhasil diunggah!');
      form.reset();
      fileInfo.style.display = 'none';
      setTimeout(() => muatRecentUploads(), 1000);
    } catch (error) {
      showStatus('warning', `⚠️ File terupload tapi gagal simpan metadata: ${error.message}`);
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
  if (!file) { showStatus('error', '⚠️ Pilih file!'); return; }
  currentUploadData = { namaDokumen, kategori, levelAkses, deskripsi, file };
  uploadAborted = false;
  btnUpload.disabled = true;
  btnText.textContent = '⏳ Menyiapkan...';
  showStatus('loading', '📤 Memulai upload...');
  try {
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
    if (sessionData.status !== 'ready') throw new Error(sessionData.message);
    const { uploadId, fileId } = sessionData;
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    for (let i = 0; i < totalChunks; i++) {
      if (uploadAborted) throw new Error('Dibatalkan');
      const chunk = file.slice(i * CHUNK_SIZE, Math.min((i+1)*CHUNK_SIZE, file.size));
      const base64Chunk = await blobToBase64(chunk);
      btnText.textContent = `⏳ Upload ${i+1}/${totalChunks}`;
      showStatus('loading', `☁️ Chunk ${i+1}/${totalChunks} ${( (i+1)/totalChunks*100).toFixed(0)}%`);
      const chunkRes = await fetch(APP_SCRIPT_URL + '?action=uploadChunk', {
        method: 'POST',
        body: JSON.stringify({ uploadId, fileId, chunkIndex: i, totalChunks, data: base64Chunk.split(',')[1] })
      });
      const chunkResult = await chunkRes.json();
      if (chunkResult.status === 'error') throw new Error(chunkResult.message);
      if (i === totalChunks - 1 && chunkResult.status === 'complete') {
        window.postMessage({ status: 'success', url: chunkResult.url, id: chunkResult.id, name: chunkResult.name }, '*');
        return;
      }
    }
  } catch (error) {
    showStatus('error', `❌ Gagal: ${error.message}`);
    cleanupUpload();
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
function cleanupUpload() { btnUpload.disabled = false; btnText.textContent = '💾 Upload & Simpan Metadata'; }
function showStatus(type, message) { status.className = `upload-status ${type}`; status.textContent = message; }

async function muatRecentUploads() {
  try {
    const container = document.getElementById('recentList');
    container.innerHTML = '<p class="empty-state">⏳ Memuat...</p>';
    
    // V2: Query SIMPLE tanpa orderBy dan tanpa sumber - TIDAK BUTUH INDEX
    const q = query(collection(db, 'documents'), where('uploaderUid', '==', currentUser.uid));
    const snapshot = await getDocs(q);
    
    let docs = [];
    snapshot.forEach(docSnap => {
      const d = docSnap.data();
      d._id = docSnap.id;
      // Filter di client: hanya yang dari upload-dokumen ATAU data lama tanpa sumber tapi kategori-nya bukan dari simpan-file
      // Untuk fix total, kita tampilkan SEMUA dulu, lalu sort
      if (d.sumber === 'upload-dokumen' || !d.sumber) {
        // Jika ada sumber simpan-file, skip (ini fix kasus 1)
        if (d.sumber === 'simpan-file') return;
        docs.push(d);
      }
    });
    
    // Sort di client, bukan di server (jadi tidak butuh index)
    docs.sort((a,b) => {
      const tA = a.tanggalUpload?.toDate ? a.tanggalUpload.toDate().getTime() : 0;
      const tB = b.tanggalUpload?.toDate ? b.tanggalUpload.toDate().getTime() : 0;
      return tB - tA;
    });
    docs = docs.slice(0,5);
    
    console.log('Recent docs:', docs.length, docs);

    if (docs.length === 0) {
      container.innerHTML = '<p class="empty-state">Belum ada dokumen yang diupload.</p>';
      return;
    }
    
    container.innerHTML = '';
    docs.forEach(data => {
      const tanggal = data.tanggalUpload?.toDate ? data.tanggalUpload.toDate().toLocaleDateString('id-ID') : 'Baru saja';
      const iconMap = { 'application/pdf': '📕', 'image/jpeg': '🖼️', 'image/png': '🖼️' };
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
    document.getElementById('recentList').innerHTML = `<p style="color:red">Error: ${error.message}</p>`;
  }
}

document.addEventListener('DOMContentLoaded', () => { 
  console.log('✅ Modul Upload v2 NO-INDEX dimuat');
  muatRecentUploads(); 
});
