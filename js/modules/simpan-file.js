// =========================================
// MODUL: SIMPAN FILE - FINAL VERSION
// Apps Script simpan ke Firestore langsung
// =========================================

import { db } from '../firebase-config.js';
import { collection, query, where, orderBy, onSnapshot }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const APP_SCRIPT_URL = "https://script.google.com/macros/s/AKfycby2J3v7J-qQREY7pNsITzExSMEX1eaDaTfAgr4IZ15548auxyQ3pScZnT3X9LuH3pkl/exec";

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

// Drag & Drop (kode Anda)
// ...

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = () => reject(new Error('Gagal membaca file'));
    reader.readAsDataURL(file);
  });
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

  if (file.size > 10 * 1024 * 1024) {
    return showStatus('error', '⚠️ File terlalu besar! Maksimal 10MB.');
  }

  const fileName = `${Date.now()}_${file.name}`;
  btnUpload.disabled = true;
  btnText.textContent = '⏳ Mengupload...';

  try {
    // Step 1: Convert to Base64
    showStatus('info', '🔄 Mengkonversi file...');
    const base64String = await fileToBase64(file);
    console.log('✅ Base64 length:', base64String.length);

    // Step 2: Kirim ke Apps Script dengan mode: 'no-cors'
    showStatus('info', '📤 Mengirim ke Google Drive...');
    
    await fetch(APP_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors', // ← KUNCI: Agar request sampai
      headers: {
        'Content-Type': 'text/plain;charset=utf-8', // ← Tidak trigger preflight
      },
      body: JSON.stringify({
        fileName: fileName,
        mimeType: file.type,
        fileData: base64String,
        namaDokumen: namaDokumen,
        kategori: kategori,
        deskripsi: deskripsi,
        uploaderEmail: currentUser.email,
        uploaderNama: currentUser.namaLengkap || 'User',
        uploaderUid: currentUser.uid
      })
    });

    console.log('✅ Fetch completed (no-cors mode)');

    // Step 3: Tunggu Apps Script proses + simpan ke Firestore
    showStatus('info', '⏳ Menunggu proses upload...');
    await new Promise(resolve => setTimeout(resolve, 5000)); // 5 detik

    // Step 4: Listen ke Firestore untuk dokumen baru
    showStatus('info', '🔍 Memverifikasi upload...');
    await verifyUpload(fileName);

  } catch (error) {
    console.error('❌ Error:', error);
    showStatus('error', '❌ Gagal: ' + error.message);
    btnUpload.disabled = false;
    btnText.textContent = '💾 Simpan File';
  }
});

// Verifikasi upload dengan listen Firestore
function verifyUpload(fileName) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      unsubscribe();
      reject(new Error('Timeout: File tidak terverifikasi dalam 30 detik. Cek folder Drive secara manual.'));
    }, 30000);

    const q = query(
      collection(db, 'documents'),
      where('namaFile', '==', fileName),
      orderBy('tanggalUpload', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        clearTimeout(timeout);
        unsubscribe();
        
        const doc = snapshot.docs[0];
        const data = doc.data();
        
        console.log('✅ Upload verified!', data);
        
        showStatus('success', '🎉 Berhasil! File tersimpan di Drive dan database.');
        
        setTimeout(() => {
          alert(`✅ File berhasil disimpan!\n\n📁 Nama: ${data.namaFile}\n🔗 Drive: ${data.driveUrl}\n📋 Kategori: ${data.kategori}`);
          form.reset();
          fileInfo.style.display = 'none';
          btnUpload.disabled = false;
          btnText.textContent = '💾 Simpan File';
        }, 500);
        
        resolve();
      }
    }, (error) => {
      clearTimeout(timeout);
      unsubscribe();
      reject(error);
    });
  });
}

function showStatus(type, message) {
  statusDiv.className = `upload-status ${type}`;
  statusDiv.innerHTML = message;
}
