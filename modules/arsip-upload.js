// =========================================
// MODUL: ARSIP UPLOAD (GOOGLE DRIVE BRIDGE)
// =========================================

import { db } from '../firebase-config.js';
import { collection, addDoc, query, where, orderBy, limit, getDocs, serverTimestamp } 
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ⚠️ GANTI URL INI DENGAN URL WEB APP DARI LANGKAH 3 DI ATAS
const APP_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx.../exec'; 

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

// 3. DRAG & DROP Handler
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
  
  if (file.size > 50 * 1024 * 1024) { // Limit 50MB untuk Apps Script
    showStatus('error', '⚠️ File terlalu besar! Maksimal 50MB untuk metode ini.');
    fileInput.value = '';
    fileInfo.style.display = 'none';
  }
}

// 4. PROSES UPLOAD KE GOOGLE DRIVE VIA APPS SCRIPT
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const namaDokumen = document.getElementById('namaDokumen').value.trim();
  const kategori = document.getElementById('kategori').value;
  const levelAkses = document.getElementById('levelAkses').value;
  const deskripsi = document.getElementById('deskripsi').value.trim();
  const file = fileInput.files[0];
  
  if (!file) { showStatus('error', '⚠️ Silakan pilih file terlebih dahulu.'); return; }
  
  btnUpload.disabled = true;
  btnText.textContent = '⏳ Memproses file...';
  showStatus('loading', '📤 Mengonversi dan mengirim file ke Google Drive...');
  
  try {
    // A. Baca file sebagai Base64
    const base64String = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    // B. Kirim ke Google Apps Script
    showStatus('loading', '☁️ Mengunggah ke Google Drive (mohon tunggu, ini mungkin memakan waktu 10-30 detik)...');
    
    const response = await fetch(APP_SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify({
        fileName: `${Date.now()}_${file.name.replace(/\s+/g, '_')}`,
        folderName: kategori,
        file: base64String
      })
    });
    
    const result = await response.json();
    
    if (result.status !== 'success') {
      throw new Error(result.message || 'Gagal upload ke Drive');
    }

    // C. Simpan Metadata ke Firestore
    showStatus('loading', '💾 Menyimpan metadata ke database...');
    
    const metadata = {
      namaDokumen,
      kategori,
      levelAkses,
      deskripsi,
      namaFile: file.name,
      ukuranFile: file.size,
      tipeFile: file.type || 'unknown',
      urlFile: result.url, // URL dari Google Drive
      driveFileId: result.id,
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
    console.error('Upload error:', error);
    showStatus('error', `❌ Gagal upload: ${error.message}`);
  } finally {
    btnUpload.disabled = false;
    btnText.textContent = '💾 Upload & Simpan Metadata';
  }
});

function showStatus(type, message) {
  status.className = `upload-status ${type}`;
  status.textContent = message;
}

// 5. MUAT RECENT UPLOADS (Sama seperti sebelumnya)
async function muatRecentUploads() {
  try {
    const q = query(collection(db, 'documents'), where('uploaderUid', '==', currentUser.uid), orderBy('tanggalUpload', 'desc'), limit(5));
    const snapshot = await getDocs(q);
    const container = document.getElementById('recentList');
    
    if (snapshot.empty) {
      container.innerHTML = '<p class="empty-state">Belum ada dokumen yang diupload.</p>';
      return;
    }
    
    container.innerHTML = '';
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const tanggal = data.tanggalUpload ? new Date(data.tanggalUpload.toDate()).toLocaleDateString('id-ID') : '-';
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
  } catch (error) { console.error('Error loading recent:', error); }
}

document.addEventListener('DOMContentLoaded', () => { muatRecentUploads(); });
