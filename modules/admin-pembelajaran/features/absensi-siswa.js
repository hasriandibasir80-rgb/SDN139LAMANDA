// modules/admin-pembelajaran/features/absensi-siswa.js
// =========================================
// FITUR: ABSENSI SISWA (REALTIME DATABASE)
// =========================================

import { db } from '../../../js/firebase-config.js';
import { getDatabase, ref, set, get, child, update } 
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database-compat.js";

const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
const database = getDatabase();

// Konstanta CSS
const CSS_PATH = '../../../css/modules/absensi-siswa.css';
const CSS_ID = 'absensi-siswa-css';

// State
let dataSiswa = [];
let dataAbsensi = {};
let modeEdit = false;
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
 * Cleanup - Hapus CSS saat keluar dari fitur
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
 * Render UI
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
            <label>Tahun Ajaran</label>
            <select id="tahunAjaran" class="form-control">
              <option value="2024-2025">2024/2025</option>
              <option value="2025-2026">2025/2026</option>
              <option value="2026-2027">2026/2027</option>
            </select>
          </div>
          <div class="form-group">
            <label>Kelas</label>
            <select id="pilihKelas" class="form-control">
              <option value="">-- Pilih Kelas --</option>
              <option value="kelas1">Kelas 1</option>
              <option value="kelas2">Kelas 2</option>
              <option value="kelas3">Kelas 3</option>
              <option value="kelas4">Kelas 4</option>
              <option value="kelas5">Kelas 5</option>
              <option value="kelas6">Kelas 6</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Bulan</label>
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
            <label>Tahun</label>
            <select id="pilihTahun" class="form-control">
              <option value="2025">2025</option>
              <option value="2026">2026</option>
              <option value="2027">2027</option>
            </select>
          </div>
          <div class="form-group" style="display: flex; align-items: flex-end;">
            <button id="loadBtn" class="btn btn-primary" style="flex: 1;">
              📥 Load Data
            </button>
          </div>
        </div>
      </div>

      <div id="loading" class="loading" style="display: none;">
        ⏳ Memuat data...
      </div>

      <div id="error" class="error" style="display: none;"></div>

      <div id="kontenAbsensi" style="display: none;">
        <div class="table-responsive">
          <table class="absensi-table" id="tabelAbsensi">
            <thead>
              <tr>
                <th rowspan="2">No</th>
                <th rowspan="2">Nama Siswa</th>
                <th rowspan="2">L/P</th>
                <th colspan="31">Tanggal</th>
                <th colspan="5">Jumlah</th>
              </tr>
              <tr class="sub-header">
                ${generateTanggalHeaders()}
                <th>H</th><th>I</th><th>S</th><th>A</th><th>B</th>
              </tr>
            </thead>
            <tbody id="tabelBody">
              <!-- Data siswa akan dimuat di sini -->
            </tbody>
          </table>
        </div>

        <div class="action-bar">
          <button id="saveBtn" class="btn btn-save">💾 Simpan</button>
          <button id="editBtn" class="btn btn-secondary">️ Edit</button>
          <button id="resetBtn" class="btn btn-reset">🔄 Reset</button>
          <button id="printBtn" class="btn btn-primary">🖨️ Print</button>
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
}

function generateTanggalHeaders() {
  let headers = '';
  for (let i = 1; i <= 31; i++) {
    headers += `<th>${i}</th>`;
  }
  return headers;
}

/**
 * Attach Event Listeners
 */
function attachEventListeners(container) {
  const loadBtn = container.querySelector('#loadBtn');
  const saveBtn = container.querySelector('#saveBtn');
  const editBtn = container.querySelector('#editBtn');
  const resetBtn = container.querySelector('#resetBtn');
  const printBtn = container.querySelector('#printBtn');

  if (loadBtn) loadBtn.addEventListener('click', loadDataAbsensi);
  if (saveBtn) saveBtn.addEventListener('click', simpanAbsensi);
  if (editBtn) editBtn.addEventListener('click', toggleEdit);
  if (resetBtn) resetBtn.addEventListener('click', resetAbsensi);
  if (printBtn) printBtn.addEventListener('click', cetakAbsensi);
}

/**
 * Load Data Absensi
 */
async function loadDataAbsensi() {
  const container = document.querySelector('.absensi-container');
  const tahunAjaran = container.querySelector('#tahunAjaran').value;
  const kelas = container.querySelector('#pilihKelas').value;
  const bulan = container.querySelector('#pilihBulan').value;
  const tahun = container.querySelector('#pilihTahun').value;

  if (!kelas || !bulan || !tahun) {
    showError('Mohon pilih Kelas, Bulan, dan Tahun terlebih dahulu!');
    return;
  }

  showLoading(true);
  hideError();

  try {
    tahunAjaranAktif = tahunAjaran;
    kelasAktif = kelas;
    bulanAktif = bulan;
    tahunAktif = tahun;

    await loadSiswa(kelas);
    await loadAbsensi(tahunAjaran, kelas, bulan, tahun);
    renderTabel();

    document.getElementById('kontenAbsensi').style.display = 'block';
    showToast('✅ Data berhasil dimuat!');

  } catch (error) {
    showError('Gagal memuat data: ' + error.message);
    console.error('Error:', error);
  } finally {
    showLoading(false);
  }
}

/**
 * Load Data Siswa dari Realtime Database
 */
async function loadSiswa(kelas) {
  const snapshot = await get(child(ref(database), `siswa/${kelas}`));
  dataSiswa = [];

  if (snapshot.exists()) {
    snapshot.forEach(childSnapshot => {
      dataSiswa.push({
        id: childSnapshot.key,
        ...childSnapshot.val()
      });
    });

    // Urutkan berdasarkan nama
    dataSiswa.sort((a, b) => a.nama.localeCompare(b.nama));
  } else {
    showToast('⚠️ Belum ada data siswa untuk kelas ini');
  }
}

/**
 * Load Data Absensi dari Realtime Database
 */
async function loadAbsensi(tahunAjaran, kelas, bulan, tahun) {
  const bulanTahun = `${bulan}-${tahun}`;
  const snapshot = await get(child(ref(database), `absensi/${tahunAjaran}/${kelas}/${bulanTahun}`));
  
  dataAbsensi = {};

  if (snapshot.exists()) {
    const data = snapshot.val();
    
    Object.keys(data).forEach(tanggal => {
      dataAbsensi[tanggal] = {};
      
      Object.keys(data[tanggal]).forEach(siswaId => {
        dataAbsensi[tanggal][siswaId] = data[tanggal][siswaId].status;
      });
    });
  }
}

/**
 * Render Tabel
 */
function renderTabel() {
  const tabelBody = document.getElementById('tabelBody');
  tabelBody.innerHTML = '';

  // Tentukan jumlah hari dalam bulan
  const jumlahHari = new Date(tahunAktif, getBulanIndex(bulanAktif) + 1, 0).getDate();

  dataSiswa.forEach((siswa, index) => {
    const row = document.createElement('tr');

    // No
    const cellNo = document.createElement('td');
    cellNo.textContent = index + 1;
    row.appendChild(cellNo);

    // Nama
    const cellNama = document.createElement('td');
    cellNama.textContent = siswa.nama;
    row.appendChild(cellNama);

    // L/P
    const cellLP = document.createElement('td');
    cellLP.textContent = siswa.jenisKelamin || '-';
    row.appendChild(cellLP);

    // Tanggal 1-31
    let jumlahH = 0, jumlahI = 0, jumlahS = 0, jumlahA = 0, jumlahB = 0;

    for (let tgl = 1; tgl <= 31; tgl++) {
      const cell = document.createElement('td');

      if (tgl <= jumlahHari) {
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'input-absensi';
        input.maxLength = 1;
        input.dataset.siswaId = siswa.id;
        input.dataset.tanggal = tgl;

        // Isi dengan data yang sudah ada
        if (dataAbsensi[tgl] && dataAbsensi[tgl][siswa.id]) {
          const status = dataAbsensi[tgl][siswa.id];
          input.value = status;
          input.classList.add(`status-${status}`);

          // Hitung jumlah
          if (status === 'H') jumlahH++;
          else if (status === 'I') jumlahI++;
          else if (status === 'S') jumlahS++;
          else if (status === 'A') jumlahA++;
          else if (status === 'B') jumlahB++;
        }

        input.readOnly = !modeEdit;

        // Event listener untuk validasi
        if (modeEdit) {
          input.addEventListener('change', handleInputChange);
          input.addEventListener('focus', () => input.select());
        }

        cell.appendChild(input);
      }

      row.appendChild(cell);
    }

    // Jumlah H/I/S/A/B
    const cellH = createJumlahCell(jumlahH);
    const cellI = createJumlahCell(jumlahI);
    const cellS = createJumlahCell(jumlahS);
    const cellA = createJumlahCell(jumlahA);
    const cellB = createJumlahCell(jumlahB);

    row.appendChild(cellH);
    row.appendChild(cellI);
    row.appendChild(cellS);
    row.appendChild(cellA);
    row.appendChild(cellB);

    tabelBody.appendChild(row);
  });
}

function createJumlahCell(value) {
  const cell = document.createElement('td');
  cell.className = 'jumlah-cell';
  cell.textContent = value;
  return cell;
}

function getBulanIndex(namaBulan) {
  const bulan = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
                 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  return bulan.indexOf(namaBulan);
}

/**
 * Handle Input Change
 */
function handleInputChange(e) {
  const input = e.target;
  const value = input.value.toUpperCase();

  // Validasi
  if (!['H', 'I', 'S', 'A', 'B'].includes(value)) {
    alert('Hanya boleh mengisi H, I, S, A, atau B!');
    input.value = '';
    input.className = 'input-absensi';
    return;
  }

  // Update class untuk warna
  input.className = `input-absensi status-${value}`;

  // Simpan ke dataAbsensi (temporary)
  const siswaId = input.dataset.siswaId;
  const tanggal = input.dataset.tanggal;

  if (!dataAbsensi[tanggal]) {
    dataAbsensi[tanggal] = {};
  }
  dataAbsensi[tanggal][siswaId] = value;

  // Update jumlah
  updateJumlah();
}

function updateJumlah() {
  const rows = document.querySelectorAll('#tabelBody tr');

  rows.forEach(row => {
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
    const jumlahCells = row.querySelectorAll('.jumlah-cell');
    jumlahCells[0].textContent = jumlahH;
    jumlahCells[1].textContent = jumlahI;
    jumlahCells[2].textContent = jumlahS;
    jumlahCells[3].textContent = jumlahA;
    jumlahCells[4].textContent = jumlahB;
  });
}

/**
 * Simpan Absensi ke Realtime Database
 */
async function simpanAbsensi() {
  if (!modeEdit) {
    alert('Aktifkan mode Edit terlebih dahulu!');
    return;
  }

  if (!confirm('Yakin ingin menyimpan data absensi ini?')) {
    return;
  }

  showLoading(true);

  try {
    const bulanTahun = `${bulanAktif}-${tahunAktif}`;
    const updates = {};

    // Simpan setiap tanggal yang ada data
    for (const tanggal in dataAbsensi) {
      for (const siswaId in dataAbsensi[tanggal]) {
        const status = dataAbsensi[tanggal][siswaId];
        const path = `absensi/${tahunAjaranAktif}/${kelasAktif}/${bulanTahun}/${tanggal}/${siswaId}`;

        updates[path] = {
          status: status,
          timestamp: Date.now()
        };
      }
    }

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
 * Toggle Edit Mode
 */
function toggleEdit() {
  modeEdit = !modeEdit;

  const inputs = document.querySelectorAll('.input-absensi');
  const editBtn = document.getElementById('editBtn');

  inputs.forEach(input => {
    input.readOnly = !modeEdit;
    if (modeEdit) {
      input.addEventListener('change', handleInputChange);
    } else {
      input.removeEventListener('change', handleInputChange);
    }
  });

  if (modeEdit) {
    editBtn.textContent = '✖️ Batal Edit';
    editBtn.classList.remove('btn-secondary');
    editBtn.classList.add('btn-reset');
    showToast('ℹ️ Mode Edit aktif. Silakan isi absensi (H/I/S/A/B)');
  } else {
    editBtn.textContent = '✏️ Edit';
    editBtn.classList.remove('btn-reset');
    editBtn.classList.add('btn-secondary');
    hideError();
  }
}

/**
 * Reset Absensi
 */
function resetAbsensi() {
  if (!confirm('Yakin ingin mereset semua data? Perubahan yang belum disimpan akan hilang.')) {
    return;
  }

  dataAbsensi = {};
  renderTabel();
  showToast('️ Data telah direset. Silakan load ulang untuk mendapatkan data dari database.');
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
