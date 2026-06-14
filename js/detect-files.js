/**
 * File Detector - Deteksi file penting yang gagal dimuat
 * Lokasi: js/detect-files.js
 * Cara pakai: Tambahkan <script src="js/detect-files.js"></script> di index.html
 */

(function() {
  'use strict';

  // Daftar file penting yang harus ada
  const CRITICAL_FILES = [
    { path: './js/firebase-config.js', desc: 'Konfigurasi Firebase', critical: true },
    { path: './auth-login.js', desc: 'Logika Login', critical: true },
    { path: './js/script.js', desc: 'Script Utama', critical: false },
    { path: './css/style.css', desc: 'Style Utama', critical: false }
  ];

  const WARN_STYLE = `
    position: fixed;
    top: 10px;
    right: 10px;
    background: #fff3cd;
    border-left: 4px solid #ffc107;
    color: #856404;
    padding: 12px 16px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 9999;
    font-family: Arial, sans-serif;
    font-size: 13px;
    max-width: 320px;
    animation: slideIn 0.3s ease-out;
  `;

  const ERROR_STYLE = `
    position: fixed;
    top: 10px;
    right: 10px;
    background: #f8d7da;
    border-left: 4px solid #f44336;
    color: #721c24;
    padding: 12px 16px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 9999;
    font-family: Arial, sans-serif;
    font-size: 13px;
    max-width: 320px;
    animation: slideIn 0.3s ease-out;
  `;

  // Cek apakah file ada
  async function checkFile(path) {
    try {
      const response = await fetch(path, { method: 'HEAD' });
      return response.ok;
    } catch (e) {
      return false;
    }
  }

  // Tampilkan notifikasi
  function showNotification(message, isError = false) {
    // Hapus notifikasi lama
    const old = document.getElementById('file-detector-notice');
    if (old) old.remove();

    const div = document.createElement('div');
    div.id = 'file-detector-notice';
    div.style.cssText = isError ? ERROR_STYLE : WARN_STYLE;
    div.innerHTML = `
      <div style="font-weight:bold; margin-bottom:6px;">
        ${isError ? '❌ Error File Terdeteksi!' : '⚠️ Peringatan File'}
      </div>
      <div style="font-size:12px; line-height:1.5;">${message}</div>
      <button onclick="this.parentElement.remove()" style="
        margin-top:8px; padding:4px 12px; background:rgba(0,0,0,0.1);
        border:none; border-radius:4px; cursor:pointer; font-size:11px;
      ">Tutup</button>
    `;
    document.body.appendChild(div);

    // Auto-hide setelah 15 detik
    setTimeout(() => {
      if (div.parentElement) div.remove();
    }, 15000);
  }

  // Jalankan deteksi
  async function runDetection() {
    console.group('🔍 File Detector - Pemeriksaan File Penting');
    
    const missing = [];
    const criticalMissing = [];

    for (const file of CRITICAL_FILES) {
      const exists = await checkFile(file.path);
      const status = exists ? '✅' : '❌';
      console.log(`${status} ${file.path} - ${file.desc}`);
      
      if (!exists) {
        missing.push(file);
        if (file.critical) criticalMissing.push(file);
      }
    }

    console.groupEnd();

    // Tampilkan notifikasi jika ada file hilang
    if (criticalMissing.length > 0) {
      const msg = criticalMissing.map(f => 
        `• <code>${f.path}</code> (${f.desc})`
      ).join('<br>');
      showNotification(
        `<strong>File KRITIS hilang:</strong><br>${msg}<br><br>` +
        `<small>Login mungkin tidak berfungsi. Buka <a href="404.html" style="color:#721c24">404.html</a> untuk diagnosa.</small>`,
        true
      );
      console.error('🚨 File kritikal hilang:', criticalMissing);
    } else if (missing.length > 0) {
      const msg = missing.map(f => `• ${f.path}`).join('<br>');
      showNotification(
        `<strong>File berikut tidak ditemukan:</strong><br>${msg}`,
        false
      );
    } else {
      console.log('✅ Semua file penting ditemukan!');
    }
  }

  // Jalankan saat DOM siap
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runDetection);
  } else {
    runDetection();
  }

  // Tangani error global (script yang gagal dimuat)
  window.addEventListener('error', function(e) {
    if (e.target && (e.target.tagName === 'SCRIPT' || e.target.tagName === 'LINK')) {
      console.error('❌ Gagal memuat:', e.target.src || e.target.href);
      showNotification(
        `<strong>Gagal memuat:</strong><br><code>${e.target.src || e.target.href}</code><br>` +
        `<small>Periksa path file di HTML.</small>`,
        true
      );
    }
  }, true);

  // Export untuk penggunaan manual
  window.FileDetector = {
    run: runDetection,
    check: checkFile,
    files: CRITICAL_FILES
  };

  console.log('🔍 File Detector aktif. Ketik FileDetector.run() untuk cek manual.');
})();
