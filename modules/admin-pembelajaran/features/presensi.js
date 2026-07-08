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
}

/**
 * Cleanup
 */
export function cleanup() {
  const cssLink = document.getElementById(CSS_ID);
  if (cssLink) cssLink.remove();
}

/**
 * Load CSS
 */
function loadFeatureCSS() {
  if (document.getElementById(CSS_ID)) return;
  const cssLink = document.createElement('link');
  cssLink.rel = 'stylesheet';
  cssLink.href = CSS_PATH;
  cssLink.id = CSS_ID;
  document.head.appendChild(cssLink);
}

/**
 * Render UI - SIMPEL DIRECT INPUT
 */
function renderAbsensiUI(container) {
  container.innerHTML = `
    <div class="feature-container absensi-container">
      <div class="feature-header">
        <h2>📋 Absensi Siswa</h2>
        <p>SDN 139 LAMANDA - Rekap Absensi Bulanan</p>
      </div>

      <div class="absensi-form">
        <div class="form-row">
          <div class="form-group">
            <label>📅 Tahun Pelajaran</label>
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
        ⏳ Memuat data...
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
            <br><br><br>
            <p>(<span id="namaWali">................................................</span>)</p>
            <p>NIP. <span id="nipWali">........................................</span></p>
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
    <td><input type="text" class="input-nama" placeholder="Nama siswa..." style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 6px;"></td>
    <td>
      <select class="input-lp" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 6px;">
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
               data-tanggal="${i}"
               style="width: 28px; height: 28px; text-align: center; border: 1px solid #d1d5db; border-radius: 4px; font-size: 11px; font-weight: bold;">
      </td>
    `;
  }
  return inputs;
}

function attachRowEvents(row) {
  // Event untuk input absensi
  const inputs = row.querySelectorAll('.input-absensi');
  inputs.forEach(input => {
    input.addEventListener('change', handleInputChange);
    input.addEventListener('focus', () => input.select());
  });

  // Event untuk tombol hapus
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

function handleInputChange(e) {
  const input = e.target;
  const value = input.value.toUpperCase();

  // Validasi
  if (!['H', 'I', 'S', 'A', 'B', ''].includes(value)) {
    alert('Hanya boleh mengisi H, I, S, A, atau B!');
    input.value = '';
    input.className = 'input-absensi';
    return;
  }

  // Update class untuk warna
  input.className = `input-absensi ${value ? 'status-' + value : ''}`;

  // Update jumlah
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

  // Update kolom jumlah
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

  if (addRowBtn) addRowBtn.addEventListener('click', tambahBarisSiswa);
  if (saveBtn) saveBtn.addEventListener('click', simpanAbsensi);
  if (resetBtn) resetBtn.addEventListener('click', resetAbsensi);
  if (printBtn) printBtn.addEventListener('click', cetakAbsensi);
}

/**
 * Simpan Absensi ke Realtime Database
 */
async function simpanAbsensi() {
  const tahunPelajaran = document.getElementById('tahunPelajaran').value;
  const kelas = document.getElementById('pilihKelas').value;
  const bulan = document.getElementById('pilihBulan').value;
  const tahun = document.getElementById('pilihTahun').value;

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

    rows.forEach((row, index) => {
      const namaInput = row.querySelector('.input-nama');
      const lpSelect = row.querySelector('.input-lp');
      const absensiInputs = row.querySelectorAll('.input-absensi');

      const nama = namaInput.value.trim();
      const lp = lpSelect.value;

      if (nama) {
        // Generate ID unik untuk siswa
        const siswaId = `siswa_${index}_${Date.now()}`;

        // Simpan data siswa
        updates[`siswa/${kelas}/${siswaId}`] = {
          nama: nama,
          jenisKelamin: lp,
          updatedAt: Date.now()
        };

        // Simpan data absensi
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

  // Tambah 5 baris kosong
  for (let i = 0; i < 5; i++) {
    tambahBarisSiswa();
  }

  showToast('🔄 Form telah direset.');
}

/**
 * Cetak / Print
 */
function cetakAbsensi() {
  window.print();
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
