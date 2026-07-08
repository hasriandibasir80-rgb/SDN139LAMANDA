// modules/admin-pembelajaran/features/presensi.js
// =========================================
// FITUR: ABSENSI SISWA (SIMPEL - DIRECT INPUT)
// =========================================

import { db } from '../../../js/firebase-config.js';
import { getDatabase, ref, set, get, child, update } 
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
const database = getDatabase();

// Konstanta CSS
const CSS_PATH = '../../../css/modules/absensi-siswa.css';
const CSS_ID = 'absensi-siswa-css';

// State
let dataAbsensi = {};
let tahunAjaranAktif = '';
let kelasAktif = '';
let bulanAktif = '';
let tahunAktif = '';

/**
 * Fungsi init - Dipanggil oleh main.js
 */
export async function init(container, db) {
  loadFeatureCSS();
  renderAbsensiUI(container);
  attachEventListeners(container);
  loadWaliKelas();
}

/**
 * Cleanup
 */
export function cleanup() {
  const cssLink = document.getElementById(CSS_ID);
  if (cssLink) cssLink.remove();
}

/**
 * Load CSS dengan fallback inline
 */
function loadFeatureCSS() {
  if (document.getElementById(CSS_ID)) return;
  
  const cssLink = document.createElement('link');
  cssLink.rel = 'stylesheet';
  cssLink.href = CSS_PATH;
  cssLink.id = CSS_ID;
  
  // Fallback: jika file eksternal gagal, inject inline CSS
  cssLink.onerror = () => {
    console.warn('⚠️ CSS eksternal gagal, menggunakan inline CSS');
    const inlineCSS = document.createElement('style');
    inlineCSS.id = CSS_ID + '-inline';
    inlineCSS.textContent = getInlineCSS();
    document.head.appendChild(inlineCSS);
  };
  
  document.head.appendChild(cssLink);
}

/**
 * Fallback CSS inline
 */
function getInlineCSS() {
  return `
    .absensi-container { width: 100%; max-width: 100%; margin: 0 auto; background: linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%); border-radius: 16px; box-shadow: 0 8px 24px rgba(236, 72, 153, 0.15); overflow: hidden; padding: 20px; box-sizing: border-box; }
    .feature-header { background: linear-gradient(135deg, #ec4899 0%, #f472b6 100%); color: white; padding: 25px 30px; border-radius: 12px; margin-bottom: 20px; box-shadow: 0 4px 12px rgba(236, 72, 153, 0.3); }
    .feature-header h2 { margin: 0 0 5px 0; font-size: 24px; font-weight: bold; color: white; }
    .feature-header p { margin: 0; font-size: 14px; opacity: 0.95; color: white; }
    .absensi-form { background: white; padding: 25px 30px; border-radius: 12px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(236, 72, 153, 0.1); }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 15px; }
    .form-group label { display: block; margin-bottom: 8px; font-weight: 600; font-size: 14px; color: #831843; }
    .form-control { width: 100%; padding: 12px 15px; border: 2px solid #fbcfe8; border-radius: 8px; font-size: 14px; background: white; color: #831843; box-sizing: border-box; }
    .form-control:focus { outline: none; border-color: #ec4899; box-shadow: 0 0 0 3px rgba(236, 72, 153, 0.15); }
    .table-responsive { overflow-x: auto; margin: 20px 0; background: white; border-radius: 12px; padding: 15px; box-shadow: 0 2px 8px rgba(236, 72, 153, 0.1); }
    .absensi-table { width: 100%; border-collapse: collapse; font-size: 12px; min-width: 1200px; }
    .absensi-table thead { background: #fce7f3; position: sticky; top: 0; z-index: 10; }
    .absensi-table th { background: #fbcfe8; color: #831843; font-weight: 600; padding: 12px 8px; text-align: center; border: 1px solid #f9a8d4; font-size: 11px; }
    .absensi-table th[colspan="31"] { background: linear-gradient(135deg, #ec4899 0%, #f472b6 100%); color: white; font-size: 13px; border-color: #ec4899; }
    .absensi-table th[colspan="5"] { background: linear-gradient(135deg, #db2777 0%, #ec4899 100%); color: white; border-color: #db2777; }
    .sub-header th { background: #fce7f3; padding: 8px 5px; font-size: 10px; color: #831843; }
    .absensi-table td { border: 1px solid #fbcfe8; padding: 8px 5px; text-align: center; vertical-align: middle; }
    .input-nama { width: 100%; min-width: 150px; padding: 8px 10px; border: 1px solid #fbcfe8; border-radius: 6px; font-size: 13px; background: white; }
    .input-nama:focus { outline: none; border-color: #ec4899; box-shadow: 0 0 0 3px rgba(236, 72, 153, 0.15); }
    .input-lp { width: 100%; padding: 8px 10px; border: 1px solid #fbcfe8; border-radius: 6px; font-size: 13px; background: white; }
    .input-absensi { width: 28px; height: 28px; text-align: center; border: 1px solid #fbcfe8; border-radius: 4px; font-size: 11px; font-weight: bold; background: white; }
    .input-absensi:focus { outline: none; border-color: #ec4899; background: #fff1f2; transform: scale(1.1); }
    .status-H { background: #d1fae5 !important; color: #065f46; border-color: #10b981; }
    .status-I { background: #fef3c7 !important; color: #92400e; border-color: #f59e0b; }
    .status-S { background: #fed7aa !important; color: #9a3412; border-color: #f97316; }
    .status-A { background: #fecaca !important; color: #991b1b; border-color: #ef4444; }
    .status-B { background: #e9d5ff !important; color: #6b21a8; border-color: #a855f7; }
    .jumlah-H, .jumlah-I, .jumlah-S, .jumlah-A, .jumlah-B { font-weight: bold; font-size: 13px; padding: 8px 5px; }
    .jumlah-H { background: #d1fae5; color: #065f46; }
    .jumlah-I { background: #fef3c7; color: #92400e; }
    .jumlah-S { background: #fed7aa; color: #9a3412; }
    .jumlah-A { background: #fecaca; color: #991b1b; }
    .jumlah-B { background: #e9d5ff; color: #6b21a8; }
    .btn-hapus { background: #ef4444; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 14px; }
    .action-bar { display: flex; gap: 12px; padding: 20px 0; flex-wrap: wrap; }
    .action-bar .btn { padding: 12px 24px; border: none; border-radius: 8px; font-weight: 600; font-size: 14px; cursor: pointer; display: flex; align-items: center; gap: 8px; }
    .btn-primary { background: linear-gradient(135deg, #ec4899 0%, #f472b6 100%); color: white; }
    .btn-save { background: linear-gradient(135deg, #10b981 0%, #34d399 100%); color: white; }
    .btn-reset { background: linear-gradient(135deg, #6b7280 0%, #9ca3af 100%); color: white; }
    .btn-secondary { background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%); color: white; }
    .absensi-footer { padding: 30px; display: flex; justify-content: flex-end; background: white; border-radius: 12px; margin-top: 20px; }
    .ttd-section { text-align: center; min-width: 250px; }
    .ttd-section p { margin: 5px 0; font-size: 14px; color: #831843; }
    .input-wali { width: 100%; padding: 8px 12px; border: 2px solid #fbcfe8; border-radius: 6px; font-size: 14px; text-align: center; background: white; margin-bottom: 8px; }
    .input-wali:focus { outline: none; border-color: #ec4899; box-shadow: 0 0 0 3px rgba(236, 72, 153, 0.15); }
    .loading { text-align: center; padding: 20px; background: #fff1f2; color: #be185d; margin: 20px 0; border-radius: 8px; border-left: 4px solid #ec4899; }
    .error { text-align: center; padding: 20px; background: #fff1f2; color: #991b1b; margin: 20px 0; border-radius: 8px; border-left: 4px solid #ef4444; }
    @media screen and (max-width: 768px) { .absensi-container { padding: 10px; } .form-row { grid-template-columns: 1fr; } .action-bar { flex-direction: column; } .action-bar .btn { width: 100%; justify-content: center; } .absensi-table { font-size: 10px; } .input-absensi { width: 22px; height: 22px; font-size: 9px; } .input-nama { min-width: 100px; font-size: 11px; } }
  `;
}

/**
 * Render UI - SIMPEL DIRECT INPUT
 */
function renderAbsensiUI(container) {
  container.innerHTML = `
    <div class="feature-container absensi-container">
      <div class="feature-header">
        <h2> Absensi Siswa</h2>
        <p>SDN 139 LAMANDA - Rekap Absensi Bulanan</p>
      </div>

      <div class="absensi-form">
        <div class="form-row">
          <div class="form-group">
            <label> Tahun Pelajaran</label>
            <input type="text" id="tahunPelajaran" class="form-control" placeholder="2026/2027">
          </div>
          <div class="form-group">
            <label>🏫 Kelas</label>
            <select id="pilihKelas" class="form-control">
              <option value="">-- Pilih Kelas --</option>
              <option value="1">Kelas 1</option>
              <option value="2">Kelas 2</option>
              <option value="3">Kelas 3</option>
              <option value="4">Kelas 4</option>
              <option value="5">Kelas 5</option>
              <option value="6">Kelas 6</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>📆 Bulan</label>
            <select id="pilihBulan" class="form-control">
              <option value="">-- Pilih Bulan --</option>
              <option value="Januari">Januari</option>
              <option value="Februari">Februari</option>
              <option value="Maret">Maret</option>
              <option value="April">April</option>
              <option value="Mei">Mei</option>
              <option value="Juni">Juni</option>
              <option value="Juli">Juli</option>
              <option value="Agustus">Agustus</option>
              <option value="September">September</option>
              <option value="Oktober">Oktober</option>
              <option value="November">November</option>
              <option value="Desember">Desember</option>
            </select>
          </div>
          <div class="form-group">
            <label>📅 Tahun</label>
            <input type="text" id="pilihTahun" class="form-control" placeholder="2026">
          </div>
        </div>
      </div>

      <div id="loading" class="loading" style="display: none;">
         Memuat data...
      </div>

      <div id="error" class="error" style="display: none;"></div>

      <div id="kontenAbsensi">
        <div class="table-responsive">
          <table class="absensi-table" id="tabelAbsensi">
            <thead>
              <tr>
                <th style="width: 50px;">No</th>
                <th style="width: 200px;">Nama Siswa</th>
                <th style="width: 60px;">L/P</th>
                <th colspan="31">Tanggal</th>
                <th colspan="5">Jumlah</th>
                <th style="width: 60px;">Aksi</th>
              </tr>
              <tr class="sub-header">
                <td></td><td></td><td></td>
                ${generateTanggalHeaders()}
                <th>H</th><th>I</th><th>S</th><th>A</th><th>B</th>
                <td></td>
              </tr>
            </thead>
            <tbody id="tabelBody">
              <!-- Baris akan ditambahkan dinamis -->
            </tbody>
          </table>
        </div>

        <div class="action-bar">
          <button id="addRowBtn" class="btn btn-primary">➕ Tambah Siswa</button>
          <button id="saveBtn" class="btn btn-save">💾 Simpan</button>
          <button id="resetBtn" class="btn btn-reset">🔄 Reset</button>
          <button id="printBtn" class="btn btn-secondary">🖨️ Print</button>
        </div>

        <div class="absensi-footer">
          <div class="ttd-section">
            <p>Mengetahui,</p>
            <p>Wali Kelas</p>
            <br>
            <input type="text" id="namaWali" class="input-wali" placeholder="Nama Lengkap Wali Kelas">
            <input type="text" id="nipWali" class="input-wali" placeholder="NIP Wali Kelas">
          </div>
        </div>
      </div>
    </div>
  `;

  // Tambah 5 baris kosong default
  for (let i = 0; i < 5; i++) {
    tambahBarisSiswa();
  }
}

function generateTanggalHeaders() {
  let headers = '';
  for (let i = 1; i <= 31; i++) {
    headers += `<th>${i}</th>`;
  }
  return headers;
}

/**
 * Tambah Baris Siswa Baru
 */
function tambahBarisSiswa() {
  const tabelBody = document.getElementById('tabelBody');
  if (!tabelBody) return;

  const row = document.createElement('tr');
  const rowCount = tabelBody.querySelectorAll('tr').length + 1;

  row.innerHTML = `
    <td>${rowCount}</td>
    <td><input type="text" class="input-nama" placeholder="Nama siswa..."></td>
    <td>
   <td>
  <select class="input-lp" style="min-width: 50px; font-size: 14px; font-weight: 600; color: #831843; text-align: center; padding: 8px 10px;">
    <option value="L">L</option>
    <option value="P">P</option>
  </select>
</td> 
    ${generateTanggalInputs()}
    <td class="jumlah-H">0</td>
    <td class="jumlah-I">0</td>
    <td class="jumlah-S">0</td>
    <td class="jumlah-A">0</td>
    <td class="jumlah-B">0</td>
    <td><button type="button" class="btn-hapus">🗑️</button></td>
  `;

  tabelBody.appendChild(row);
  updateNomorUrut();
  attachRowEvents(row);
}

function generateTanggalInputs() {
  let inputs = '';
  for (let i = 1; i <= 31; i++) {
    inputs += `
      <td>
        <input type="text" 
               class="input-absensi" 
               maxlength="1" 
               data-tanggal="${i}">
      </td>
    `;
  }
  return inputs;
}

function attachRowEvents(row) {
  const inputs = row.querySelectorAll('.input-absensi');
  inputs.forEach(input => {
    input.addEventListener('change', (e) => handleInputChange(e, row));
    input.addEventListener('focus', () => input.select());
  });

  const btnHapus = row.querySelector('.btn-hapus');
  if (btnHapus) {
    btnHapus.addEventListener('click', () => {
      if (confirm('Hapus baris ini?')) {
        row.remove();
        updateNomorUrut();
      }
    });
  }
}

function handleInputChange(e, row) {
  const input = e.target;
  const value = input.value.toUpperCase();

  if (!['H', 'I', 'S', 'A', 'B', ''].includes(value)) {
    alert('Hanya boleh mengisi H, I, S, A, atau B!');
    input.value = '';
    input.className = 'input-absensi';
    return;
  }

  input.className = `input-absensi ${value ? 'status-' + value : ''}`;
  updateJumlah(row);
}

function updateJumlah(row) {
  const inputs = row.querySelectorAll('.input-absensi');
  let jumlahH = 0, jumlahI = 0, jumlahS = 0, jumlahA = 0, jumlahB = 0;

  inputs.forEach(input => {
    const value = input.value;
    if (value === 'H') jumlahH++;
    else if (value === 'I') jumlahI++;
    else if (value === 'S') jumlahS++;
    else if (value === 'A') jumlahA++;
    else if (value === 'B') jumlahB++;
  });

  row.querySelector('.jumlah-H').textContent = jumlahH;
  row.querySelector('.jumlah-I').textContent = jumlahI;
  row.querySelector('.jumlah-S').textContent = jumlahS;
  row.querySelector('.jumlah-A').textContent = jumlahA;
  row.querySelector('.jumlah-B').textContent = jumlahB;
}

function updateNomorUrut() {
  const rows = document.querySelectorAll('#tabelBody tr');
  rows.forEach((row, index) => {
    row.querySelector('td:first-child').textContent = index + 1;
  });
}

/**
 * Attach Event Listeners
 */
function attachEventListeners(container) {
  const addRowBtn = container.querySelector('#addRowBtn');
  const saveBtn = container.querySelector('#saveBtn');
  const resetBtn = container.querySelector('#resetBtn');
  const printBtn = container.querySelector('#printBtn');
  const namaWaliInput = container.querySelector('#namaWali');
  const nipWaliInput = container.querySelector('#nipWali');

  if (addRowBtn) addRowBtn.addEventListener('click', tambahBarisSiswa);
  if (saveBtn) saveBtn.addEventListener('click', simpanAbsensi);
  if (resetBtn) resetBtn.addEventListener('click', resetAbsensi);
  if (printBtn) printBtn.addEventListener('click', cetakAbsensi);
  
  if (namaWaliInput) {
    namaWaliInput.addEventListener('change', saveWaliKelas);
    namaWaliInput.addEventListener('blur', saveWaliKelas);
  }
  
  if (nipWaliInput) {
    nipWaliInput.addEventListener('change', saveWaliKelas);
    nipWaliInput.addEventListener('blur', saveWaliKelas);
  }
}

/**
 * Load Data Wali Kelas dari LocalStorage
 */
function loadWaliKelas() {
  const savedNama = localStorage.getItem('waliKelas_nama');
  const savedNIP = localStorage.getItem('waliKelas_nip');
  
  const namaInput = document.getElementById('namaWali');
  const nipInput = document.getElementById('nipWali');
  
  if (namaInput && savedNama) {
    namaInput.value = savedNama;
  }
  
  if (nipInput && savedNIP) {
    nipInput.value = savedNIP;
  }
}

/**
 * Save Data Wali Kelas ke LocalStorage
 */
function saveWaliKelas() {
  const namaInput = document.getElementById('namaWali');
  const nipInput = document.getElementById('nipWali');
  
  if (namaInput) {
    localStorage.setItem('waliKelas_nama', namaInput.value);
  }
  
  if (nipInput) {
    localStorage.setItem('waliKelas_nip', nipInput.value);
  }
}

/**
 * Simpan Absensi ke Realtime Database
 */
async function simpanAbsensi() {
  const tahunPelajaran = document.getElementById('tahunPelajaran').value;
  const kelas = document.getElementById('pilihKelas').value;
  const bulan = document.getElementById('pilihBulan').value;
  const tahun = document.getElementById('pilihTahun').value;
  const namaWali = document.getElementById('namaWali')?.value || '';
  const nipWali = document.getElementById('nipWali')?.value || '';

  if (!tahunPelajaran || !kelas || !bulan || !tahun) {
    alert('Mohon lengkapi Tahun Pelajaran, Kelas, Bulan, dan Tahun!');
    return;
  }

  if (!confirm('Yakin ingin menyimpan data absensi ini?')) {
    return;
  }

  showLoading(true);

  try {
    const rows = document.querySelectorAll('#tabelBody tr');
    const bulanTahun = `${bulan}-${tahun}`;
    const updates = {};

    updates[`waliKelas/${kelas}`] = {
      nama: namaWali,
      nip: nipWali,
      updatedAt: Date.now()
    };

    rows.forEach((row, index) => {
      const namaInput = row.querySelector('.input-nama');
      const lpSelect = row.querySelector('.input-lp');
      const absensiInputs = row.querySelectorAll('.input-absensi');

      const nama = namaInput.value.trim();
      const lp = lpSelect.value;

      if (nama) {
        const siswaId = `siswa_${index}_${Date.now()}`;

        updates[`siswa/${kelas}/${siswaId}`] = {
          nama: nama,
          jenisKelamin: lp,
          updatedAt: Date.now()
        };

        absensiInputs.forEach(input => {
          const tanggal = input.dataset.tanggal;
          const status = input.value;

          if (status) {
            updates[`absensi/${tahunPelajaran}/${kelas}/${bulanTahun}/${tanggal}/${siswaId}`] = {
              status: status,
              timestamp: Date.now()
            };
          }
        });
      }
    });

    await update(ref(database), updates);
    saveWaliKelas();

    showToast('✅ Data absensi berhasil disimpan!');

  } catch (error) {
    showError('Gagal menyimpan data: ' + error.message);
    console.error('Error:', error);
  } finally {
    showLoading(false);
  }
}

/**
 * Reset Form
 */
function resetAbsensi() {
  if (!confirm('Yakin ingin mereset semua data? Semua input akan dihapus.')) {
    return;
  }

  const tabelBody = document.getElementById('tabelBody');
  tabelBody.innerHTML = '';

  for (let i = 0; i < 5; i++) {
    tambahBarisSiswa();
  }

  showToast(' Form telah direset.');
}

/**
 * Cetak / Print
 */
function cetakAbsensi() {
  saveWaliKelas();
  setTimeout(() => {
    window.print();
  }, 300);
}

/**
 * Utility Functions
 */
function showLoading(show) {
  const loadingDiv = document.getElementById('loading');
  if (loadingDiv) {
    loadingDiv.style.display = show ? 'block' : 'none';
  }
}

function showError(message) {
  const errorDiv = document.getElementById('error');
  if (errorDiv) {
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
  }
}

function hideError() {
  const errorDiv = document.getElementById('error');
  if (errorDiv) {
    errorDiv.style.display = 'none';
    errorDiv.textContent = '';
  }
}

function showToast(msg) {
  const toast = document.createElement('div');
  toast.className = 'toast toast-success';
  toast.textContent = msg;
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #22c55e;
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 10000;
    animation: slideIn 0.3s ease;
  `;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
