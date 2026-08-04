// =========================================
// FITUR: KALENDER PENDIDIKAN - FIX UNTUK main.js
// Lokasi: modules/admin-pembelajaran/features/kalender.js
// Sesuai main.js: export function init(container, db)
// Prinsip: Base64 jujur, tombol lengkap, tanpa tipu-tipu
// =========================================

import { doc, getDoc, setDoc, serverTimestamp } 
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let dbInstance = null;
let containerEl = null;
let fileInput, previewImg, previewWrapper, statusEl;
let base64Gambar = null;
let existingData = null;

function getTemplate() {
  return `
  <div class="kalender-pendidikan-wrapper" style="max-width:900px;margin:0 auto;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
      <h2 style="margin:0;">📅 Kalender Pendidikan</h2>
      <button id="btnKembaliMenuKalender" class="btn" style="padding:8px 16px;border-radius:8px;cursor:pointer;background:#6b7280;color:white;border:none;">
        ← Kembali ke Menu
      </button>
    </div>

    <div style="background:white;padding:16px;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.1);margin-bottom:20px;">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div>
          <label style="font-weight:600;font-size:13px;">Tahun Ajaran</label>
          <input type="text" id="tahunAjaran" placeholder="Contoh: 2025/2026" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;margin-top:4px;">
        </div>
        <div>
          <label style="font-weight:600;font-size:13px;">Semester</label>
          <select id="semester" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;margin-top:4px;">
            <option value="Ganjil">Ganjil</option>
            <option value="Genap">Genap</option>
          </select>
        </div>
      </div>
    </div>

    <div style="background:white;padding:20px;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.1);margin-bottom:20px;">
      <label style="font-weight:600;display:block;margin-bottom:8px;">Upload Gambar Kalender (JPG/PNG, Auto-Compress ke Base64)</label>
      
      <div id="dropZoneKalender" style="border:2px dashed #cbd5e1;border-radius:12px;padding:24px;text-align:center;cursor:pointer;background:#f8fafc;">
        <div style="font-size:36px;">🖼️</div>
        <div style="font-weight:600;margin:8px 0;">Klik atau seret gambar ke sini</div>
        <div style="font-size:12px;color:#64748b;">Max 5MB sebelum kompres • Hasil disimpan sebagai Base64 di Firestore</div>
        <input type="file" id="fileKalender" accept="image/*" style="display:none;">
      </div>

      <div id="previewWrapper" style="display:none;margin-top:20px;text-align:center;">
        <div style="font-weight:600;margin-bottom:8px;">Pratinjau:</div>
        <img id="previewImg" style="max-width:100%;max-height:600px;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);border:1px solid #e2e8f0;">
        <div id="infoBase64" style="font-size:11px;color:#64748b;margin-top:8px;word-break:break-all;"></div>
      </div>

      <div id="statusKalender" style="margin-top:12px;"></div>
    </div>

    <div style="display:flex;gap:12px;justify-content:flex-end;">
      <button id="btnEditKalender" style="display:none;padding:10px 20px;border-radius:8px;border:none;background:#f59e0b;color:white;font-weight:600;cursor:pointer;">
        ✏️ Edit
      </button>
      <button id="btnSimpanKalender" style="padding:10px 24px;border-radius:8px;border:none;background:#2563eb;color:white;font-weight:600;cursor:pointer;">
        💾 Simpan Kalender
      </button>
    </div>

    <div style="margin-top:16px;font-size:11px;color:#94a3b8;text-align:center;">
      Koleksi: <code>kalender_pendidikan / tahun-aktif</code> • Field: <code>gambarBase64</code> (jujur tanpa Drive)
    </div>
  </div>
  `;
}

function fileToBase64Compressed(file, maxWidth = 1200, quality = 0.65) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const base64 = canvas.toDataURL('image/jpeg', quality);
        resolve(base64);
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function showStatus(type, msg) {
  if (!statusEl) return;
  const colors = { success: '#dcfce7', error: '#fee2e2', info: '#dbeafe', warning: '#fef3c7' };
  statusEl.innerHTML = `<div style="padding:10px;border-radius:8px;background:${colors[type] || '#f1f5f9'};font-size:13px;">${msg}</div>`;
}

function tampilkanPreview(base64, isExisting = false) {
  if (!previewWrapper || !previewImg) return;
  previewImg.src = base64;
  previewWrapper.style.display = 'block';
  const sizeKB = Math.round((base64.length * 3/4) / 1024);
  document.getElementById('infoBase64').textContent = `${isExisting ? 'Tersimpan' : 'Baru'} • ~${sizeKB} KB`;
}

async function loadExisting() {
  try {
    const ref = doc(dbInstance, 'kalender_pendidikan', 'tahun-aktif');
    const snap = await getDoc(ref);
    if (snap.exists()) {
      existingData = snap.data();
      document.getElementById('tahunAjaran').value = existingData.tahunAjaran || '';
      document.getElementById('semester').value = existingData.semester || 'Ganjil';
      if (existingData.gambarBase64) {
        base64Gambar = existingData.gambarBase64;
        tampilkanPreview(base64Gambar, true);
        document.getElementById('btnEditKalender').style.display = 'inline-block';
        document.getElementById('btnSimpanKalender').textContent = '💾 Update Kalender';
        showStatus('info', `✅ Data tahun ${existingData.tahunAjaran} sudah ada.`);
      }
    }
  } catch (err) {
    console.error('Gagal load:', err);
    showStatus('error', 'Gagal memuat: ' + err.message);
  }
}

function initEvents() {
  document.getElementById('btnKembaliMenuKalender').addEventListener('click', () => {
    if (window.backToMenu) window.backToMenu();
    else window.location.href = './adm-pembelajaran.html';
  });

  const dropZone = document.getElementById('dropZoneKalender');
  fileInput = document.getElementById('fileKalender');
  previewImg = document.getElementById('previewImg');
  previewWrapper = document.getElementById('previewWrapper');
  statusEl = document.getElementById('statusKalender');

  dropZone.addEventListener('click', () => fileInput.click());
  ['dragenter', 'dragover'].forEach(evt => {
    dropZone.addEventListener(evt, (e) => { e.preventDefault(); dropZone.style.borderColor = '#2563eb'; });
  });
  ['dragleave', 'drop'].forEach(evt => {
    dropZone.addEventListener(evt, (e) => { e.preventDefault(); dropZone.style.borderColor = '#cbd5e1'; });
  });
  dropZone.addEventListener('drop', async (e) => {
    const files = e.dataTransfer.files;
    if (files.length > 0) await prosesFile(files[0]);
  });
  fileInput.addEventListener('change', async (e) => {
    if (e.target.files.length > 0) await prosesFile(e.target.files[0]);
  });

  async function prosesFile(file) {
    if (!file.type.startsWith('image/')) {
      showStatus('error', 'Hanya gambar!');
      return;
    }
    showStatus('info', '⏳ Mengompres ke Base64...');
    try {
      const base64 = await fileToBase64Compressed(file);
      if (base64.length > 900000) {
        showStatus('error', 'Hasil masih >900KB, pakai gambar lebih kecil.');
        return;
      }
      base64Gambar = base64;
      tampilkanPreview(base64);
      showStatus('success', '✅ Siap disimpan sebagai Base64.');
    } catch (err) {
      showStatus('error', 'Gagal: ' + err.message);
    }
  }

  document.getElementById('btnEditKalender').addEventListener('click', () => {
    showStatus('info', '✏️ Mode Edit aktif, upload gambar baru lalu Simpan.');
  });

  document.getElementById('btnSimpanKalender').addEventListener('click', async () => {
    const tahunAjaran = document.getElementById('tahunAjaran').value.trim();
    const semester = document.getElementById('semester').value;
    if (!tahunAjaran) { showStatus('error', 'Isi Tahun Ajaran!'); return; }
    if (!base64Gambar) { showStatus('error', 'Upload gambar dulu!'); return; }

    const btn = document.getElementById('btnSimpanKalender');
    btn.disabled = true;
    btn.textContent = '⏳ Menyimpan...';
    showStatus('info', '💾 Menyimpan Base64 ke Firestore...');

    try {
      const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
      const ref = doc(dbInstance, 'kalender_pendidikan', 'tahun-aktif');
      await setDoc(ref, {
        tahunAjaran,
        semester,
        gambarBase64: base64Gambar,
        ukuranKB: Math.round((base64Gambar.length * 3/4) / 1024),
        uploaderUid: currentUser.uid || '',
        uploaderEmail: currentUser.email || '',
        tanggalUpdate: serverTimestamp(),
        status: 'aktif'
      }, { merge: true });

      showStatus('success', `✅ Kalender ${tahunAjaran} ${semester} tersimpan jujur sebagai Base64!`);
      btn.textContent = '✅ Tersimpan';
      setTimeout(() => { btn.textContent = '💾 Update Kalender'; btn.disabled = false; }, 2000);
    } catch (err) {
      showStatus('error', '❌ Gagal: ' + err.message);
      btn.disabled = false;
      btn.textContent = '💾 Simpan Kalender';
    }
  });
}

// EXPORT WAJIB UNTUK main.js - INI YANG KEMARIN HILANG
export function init(container, db) {
  containerEl = container;
  dbInstance = db;
  containerEl.innerHTML = getTemplate();
  initEvents();
  loadExisting();
  console.log('✅ kalender.js init() berhasil dimuat - Base64 mode');
}
