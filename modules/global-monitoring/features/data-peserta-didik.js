// modules/global-monitoring/features/data-peserta-didik.js
// =========================================
// SUB-FITUR 1: DATA PESERTA DIDIK
// =========================================

import { db } from '../../../js/firebase-config.js';
import { getDatabase, ref, get, push, set, update, remove } 
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
const database = getDatabase();

// Konstanta CSS
const CSS_PATH = '../../../css/modules/data-peserta-didik.css';
const CSS_ID = 'data-peserta-didik-css';

// State
let allSiswaData = [];
let filteredData = [];
let editMode = false;
let editRowIndex = -1;

/**
 * Fungsi init - Dipanggil oleh main.js
 */
export async function init(container, db) {
  loadFeatureCSS();
  renderUI(container);
  attachEventListeners(container);
  await loadDataSiswa();
}

export function cleanup() {
  const cssLink = document.getElementById(CSS_ID);
  if (cssLink) cssLink.remove();
}

function loadFeatureCSS() {
  if (document.getElementById(CSS_ID)) return;
  const cssLink = document.createElement('link');
  cssLink.rel = 'stylesheet';
  cssLink.href = CSS_PATH;
  cssLink.id = CSS_ID;
  document.head.appendChild(cssLink);
}

/**
 * Render UI Utama
 */
function renderUI(container) {
  container.innerHTML = `
    <div class="dps-container">
      <!-- Header -->
      <div class="dps-header">
        <div class="header-title">
          <span class="header-icon">🏫</span>
          <h1>DATA <span>SISWA</span></h1>
        </div>
        <div class="header-actions">
          <button class="btn-icon" id="btnSearchHeader" title="Cari">🔍</button>
          <button class="btn-icon" id="btnSettings" title="Pengaturan">⚙️</button>
        </div>
      </div>

      <!-- Stats Cards -->
      <div class="stats-grid">
        <div class="stat-card stat-total">
          <span class="stat-icon">🏠</span>
          <div class="stat-info">
            <span class="stat-label">Jumlah Siswa:</span>
            <span class="stat-value" id="statTotal">0</span>
          </div>
        </div>
        <div class="stat-card stat-kelas">
          <span class="stat-icon">📖</span>
          <div class="stat-info">
            <span class="stat-label">Kelas:</span>
            <span class="stat-value" id="statKelas">0</span>
          </div>
        </div>
        <div class="stat-card stat-l">
          <span class="stat-icon"></span>
          <div class="stat-info">
            <span class="stat-label">Laki-laki:</span>
            <span class="stat-value" id="statL">0</span>
          </div>
        </div>
        <div class="stat-card stat-p">
          <span class="stat-icon">👧</span>
          <div class="stat-info">
            <span class="stat-label">Perempuan:</span>
            <span class="stat-value" id="statP">0</span>
          </div>
        </div>
      </div>

      <!-- Main Content Grid -->
      <div class="main-grid">
        <!-- Left: Table Section -->
        <div class="table-section">
          <div class="search-bar">
            <div class="search-input-wrapper">
              <span class="search-icon">🔍</span>
              <input type="text" id="searchInput" class="form-input" placeholder="Cari Siswa...">
            </div>
            <button class="btn-filter" id="btnFilter">Filter</button>
          </div>

          <div class="table-responsive">
            <table class="data-table" id="tabelSiswa">
              <thead>
                <tr>
                  <th>No</th>
                  <th>NISN</th>
                  <th>Nama Lengkap</th>
                  <th>Kelas</th>
                  <th>Jenis Kelamin</th>
                  <th>Tanggal Lahir</th>
                  <th>Alamat</th>
                  <th>Orang Tua</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody id="tabelBody">
                <tr><td colspan="9" style="text-align:center; padding: 20px;">Memuat data...</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Right: Sidebar -->
        <div class="sidebar-section">
          <!-- Chart Kehadiran -->
          <div class="sidebar-card chart-card">
            <h3>Grafik Kehadiran</h3>
            <div class="chart-wrapper">
              <div class="pie-chart" id="pieChart"></div>
              <div class="chart-center" id="chartCenterText">0%</div>
            </div>
            <div class="chart-legend" id="chartLegend"></div>
          </div>

          <!-- Riwayat Prestasi -->
          <div class="sidebar-card prestasi-card">
            <h3>Riwayat Prestasi</h3>
            <ul class="prestasi-list" id="prestasiList">
              <li class="prestasi-item">
                <span class="prestasi-dot"></span>
                <span>Memuat data prestasi...</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Footer Actions -->
      <div class="footer-actions">
        <div class="footer-left">
          <button class="btn-action btn-add" id="btnTambah">➕ Tambah Siswa</button>
          <button class="btn-action btn-save" id="btnSimpan">💾 Simpan</button>
        </div>
        <div class="footer-right">
          <button class="btn-action btn-export" id="btnExport">📊 Export Excel</button>
          <button class="btn-action btn-download" id="btnDownload">⬇️ Unduh Data</button>
        </div>
      </div>
    </div>

    <!-- Modal Tambah/Edit Siswa -->
    <div id="modalSiswa" class="modal" style="display:none;">
      <div class="modal-content">
        <div class="modal-header">
          <h3 id="modalTitle">Tambah Siswa Baru</h3>
          <button class="modal-close" id="modalClose">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>NISN</label>
            <input type="text" id="inputNisn" class="form-input-full" placeholder="Nomor NISN">
          </div>
          <div class="form-group">
            <label>Nama Lengkap</label>
            <input type="text" id="inputNama" class="form-input-full" placeholder="Nama lengkap siswa">
          </div>
          <div class="form-row-2">
            <div class="form-group">
              <label>Kelas</label>
              <select id="inputKelas" class="form-input-full">
                <option value="">-- Pilih Kelas --</option>
                <option value="1">Kelas 1</option>
                <option value="2">Kelas 2</option>
                <option value="3">Kelas 3</option>
                <option value="4">Kelas 4</option>
                <option value="5">Kelas 5</option>
                <option value="6">Kelas 6</option>
              </select>
            </div>
            <div class="form-group">
              <label>Jenis Kelamin</label>
              <select id="inputJk" class="form-input-full">
                <option value="L">Laki-laki</option>
                <option value="P">Perempuan</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label>Tanggal Lahir</label>
            <input type="date" id="inputTglLahir" class="form-input-full">
          </div>
          <div class="form-group">
            <label>Alamat</label>
            <textarea id="inputAlamat" class="form-input-full" rows="3" placeholder="Alamat lengkap"></textarea>
          </div>
          <div class="form-group">
            <label>Nama Orang Tua</label>
            <input type="text" id="inputOrtu" class="form-input-full" placeholder="Nama orang tua/wali">
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-action btn-cancel" id="btnBatal">Batal</button>
          <button class="btn-action btn-save" id="btnSimpanModal"> Simpan</button>
        </div>
      </div>
    </div>
  `;
}

/**
 * Load Data dari Firebase
 */
async function loadDataSiswa() {
  try {
    const snapshot = await get(ref(database, 'siswa'));
    allSiswaData = [];
    let totalL = 0, totalP = 0;
    const kelasSet = new Set();

    if (snapshot.exists()) {
      snapshot.forEach(kelasSnap => {
        const kelas = kelasSnap.key;
        kelasSet.add(kelas);
        
        kelasSnap.forEach(siswaSnap => {
          const data = siswaSnap.val();
          allSiswaData.push({
            id: siswaSnap.key,
            kelas: kelas,
            nisn: data.nisn || '-',
            nama: data.nama || 'Tanpa Nama',
            jk: data.jenisKelamin || data.jk || '-',
            tglLahir: data.tanggalLahir || data.tglLahir || '-',
            alamat: data.alamat || '-',
            ortu: data.ortu || data.orangTua || '-'
          });

          if (data.jenisKelamin === 'L' || data.jk === 'L') totalL++;
          else if (data.jenisKelamin === 'P' || data.jk === 'P') totalP++;
        });
      });
    }

    allSiswaData.sort((a, b) => a.nama.localeCompare(b.nama));
    filteredData = [...allSiswaData];

    updateStats(allSiswaData.length, kelasSet.size, totalL, totalP);
    renderTable();
    renderChart();
    loadPrestasiDummy();

  } catch (error) {
    console.error('Error loading data:', error);
    document.getElementById('tabelBody').innerHTML = 
      `<tr><td colspan="9" style="text-align:center; color:red;">Gagal memuat data: ${error.message}</td></tr>`;
  }
}

/**
 * Update Statistik
 */
function updateStats(total, kelas, l, p) {
  document.getElementById('statTotal').textContent = total;
  document.getElementById('statKelas').textContent = kelas;
  document.getElementById('statL').textContent = l;
  document.getElementById('statP').textContent = p;
}

/**
 * Render Tabel dengan Tombol Edit/Hapus
 */
function renderTable() {
  const tbody = document.getElementById('tabelBody');
  tbody.innerHTML = '';

  if (filteredData.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding: 20px;">Tidak ada data ditemukan</td></tr>';
    return;
  }

  filteredData.forEach((siswa, index) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${index + 1}</td>
      <td>${siswa.nisn}</td>
      <td><strong>${siswa.nama}</strong></td>
      <td>${siswa.kelas}</td>
      <td>${siswa.jk === 'L' ? 'Laki-laki' : 'Perempuan'}</td>
      <td>${siswa.tglLahir}</td>
      <td>${siswa.alamat}</td>
      <td>${siswa.ortu}</td>
      <td>
        <button class="btn-small btn-edit" data-id="${siswa.id}" data-index="${index}">✏️</button>
        <button class="btn-small btn-delete" data-id="${siswa.id}">🗑️</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Attach event untuk tombol edit/hapus
  attachTableButtonEvents();
}

/**
 * Attach Event untuk Tombol di Tabel
 */
function attachTableButtonEvents() {
  document.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.id;
      const index = parseInt(e.currentTarget.dataset.index);
      openEditModal(id, index);
    });
  });

  document.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.id;
      deleteSiswa(id);
    });
  });
}

/**
 * Render Chart Kehadiran
 */
function renderChart() {
  const hadir = 85, izin = 8, sakit = 5, alfa = 2;
  const total = hadir + izin + sakit + alfa;

  const hDeg = (hadir / total) * 360;
  const iDeg = hDeg + (izin / total) * 360;
  const sDeg = iDeg + (sakit / total) * 360;

  const chart = document.getElementById('pieChart');
  if (chart) {
    chart.style.background = `conic-gradient(
      #3b82f6 0deg ${hDeg}deg, 
      #fbbf24 ${hDeg}deg ${iDeg}deg, 
      #f97316 ${iDeg}deg ${sDeg}deg, 
      #ef4444 ${sDeg}deg 360deg
    )`;
  }

  const centerText = document.getElementById('chartCenterText');
  if (centerText) centerText.textContent = `${hadir}%`;

  const legend = document.getElementById('chartLegend');
  if (legend) {
    legend.innerHTML = `
      <div class="legend-item"><span class="legend-color" style="background:#3b82f6"></span> Hadir (${hadir}%)</div>
      <div class="legend-item"><span class="legend-color" style="background:#fbbf24"></span> Izin (${izin}%)</div>
      <div class="legend-item"><span class="legend-color" style="background:#f97316"></span> Sakit (${sakit}%)</div>
      <div class="legend-item"><span class="legend-color" style="background:#ef4444"></span> Alfa (${alfa}%)</div>
    `;
  }
}

/**
 * Load Prestasi Dummy
 */
function loadPrestasiDummy() {
  const list = document.getElementById('prestasiList');
  if (!list) return;
  list.innerHTML = `
    <li class="prestasi-item"><span class="prestasi-dot"></span> Juara 1 Lomba Matematika</li>
    <li class="prestasi-item"><span class="prestasi-dot"></span> Juara 2 Cerdas Cermat</li>
    <li class="prestasi-item"><span class="prestasi-dot"></span> Juara 3 Lomba Pidato</li>
  `;
}

/**
 * Modal Functions
 */
function openAddModal() {
  editMode = false;
  editRowIndex = -1;
  document.getElementById('modalTitle').textContent = 'Tambah Siswa Baru';
  clearModalForm();
  document.getElementById('modalSiswa').style.display = 'flex';
}

function openEditModal(id, index) {
  editMode = true;
  editRowIndex = index;
  const siswa = filteredData[index];
  
  document.getElementById('modalTitle').textContent = 'Edit Data Siswa';
  document.getElementById('inputNisn').value = siswa.nisn !== '-' ? siswa.nisn : '';
  document.getElementById('inputNama').value = siswa.nama;
  document.getElementById('inputKelas').value = siswa.kelas;
  document.getElementById('inputJk').value = siswa.jk;
  document.getElementById('inputTglLahir').value = siswa.tglLahir !== '-' ? siswa.tglLahir : '';
  document.getElementById('inputAlamat').value = siswa.alamat !== '-' ? siswa.alamat : '';
  document.getElementById('inputOrtu').value = siswa.ortu !== '-' ? siswa.ortu : '';
  
  document.getElementById('modalSiswa').style.display = 'flex';
}

function closeEditModal() {
  document.getElementById('modalSiswa').style.display = 'none';
  clearModalForm();
}

function clearModalForm() {
  document.getElementById('inputNisn').value = '';
  document.getElementById('inputNama').value = '';
  document.getElementById('inputKelas').value = '';
  document.getElementById('inputJk').value = 'L';
  document.getElementById('inputTglLahir').value = '';
  document.getElementById('inputAlamat').value = '';
  document.getElementById('inputOrtu').value = '';
}

/**
 * Simpan Siswa (Tambah atau Edit)
 */
async function simpanSiswa() {
  const nisn = document.getElementById('inputNisn').value.trim();
  const nama = document.getElementById('inputNama').value.trim();
  const kelas = document.getElementById('inputKelas').value;
  const jk = document.getElementById('inputJk').value;
  const tglLahir = document.getElementById('inputTglLahir').value;
  const alamat = document.getElementById('inputAlamat').value.trim();
  const ortu = document.getElementById('inputOrtu').value.trim();

  if (!nama || !kelas) {
    alert('Nama dan Kelas wajib diisi!');
    return;
  }

  try {
    const dataSiswa = {
      nisn: nisn || '-',
      nama: nama,
      jenisKelamin: jk,
      tanggalLahir: tglLahir || '-',
      alamat: alamat || '-',
      orangTua: ortu || '-',
      updatedAt: Date.now()
    };

    if (editMode && editRowIndex >= 0) {
      // UPDATE existing
      const siswa = filteredData[editRowIndex];
      await update(ref(database, `siswa/${siswa.kelas}/${siswa.id}`), dataSiswa);
      showToast('✅ Data siswa berhasil diupdate!');
    } else {
      // CREATE new
      const newRef = push(ref(database, `siswa/${kelas}`));
      dataSiswa.createdAt = Date.now();
      await set(newRef, dataSiswa);
      showToast('✅ Siswa baru berhasil ditambahkan!');
    }

    closeEditModal();
    await loadDataSiswa(); // Reload data

  } catch (error) {
    console.error('Error saving:', error);
    alert('Gagal menyimpan data: ' + error.message);
  }
}

/**
 * Hapus Siswa
 */
async function deleteSiswa(id) {
  if (!confirm('Yakin ingin menghapus data siswa ini?')) return;

  try {
    const siswa = allSiswaData.find(s => s.id === id);
    if (siswa) {
      await remove(ref(database, `siswa/${siswa.kelas}/${id}`));
      showToast('🗑️ Data siswa berhasil dihapus!');
      await loadDataSiswa();
    }
  } catch (error) {
    console.error('Error deleting:', error);
    alert('Gagal menghapus data: ' + error.message);
  }
}

/**
 * Search & Filter
 */
function doSearch() {
  const query = document.getElementById('searchInput').value.toLowerCase();
  filteredData = allSiswaData.filter(s => 
    s.nama.toLowerCase().includes(query) || 
    s.nisn.toLowerCase().includes(query) ||
    s.kelas.toLowerCase().includes(query)
  );
  renderTable();
}

/**
 * Export Excel (CSV)
 */
function exportToExcel() {
  if (filteredData.length === 0) {
    alert('Tidak ada data untuk diexport!');
    return;
  }

  let csv = 'No,NISN,Nama Lengkap,Kelas,Jenis Kelamin,Tanggal Lahir,Alamat,Orang Tua\n';
  filteredData.forEach((s, i) => {
    csv += `${i+1},"${s.nisn}","${s.nama}","${s.kelas}","${s.jk === 'L' ? 'Laki-laki' : 'Perempuan'}","${s.tglLahir}","${s.alamat}","${s.ortu}"\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `data-siswa-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  
  showToast('📊 Data berhasil diexport!');
}

/**
 * Unduh Data (JSON)
 */
function downloadData() {
  if (filteredData.length === 0) {
    alert('Tidak ada data untuk diunduh!');
    return;
  }

  const dataStr = JSON.stringify(filteredData, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `data-siswa-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
  
  showToast('️ Data berhasil diunduh!');
}

/**
 * Toast Notification
 */
function showToast(msg) {
  const toast = document.createElement('div');
  toast.textContent = msg;
  toast.style.cssText = `
    position: fixed; top: 20px; right: 20px; background: #22c55e; color: white;
    padding: 12px 20px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 10000; animation: slideIn 0.3s ease;
  `;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

/**
 * Attach Event Listeners
 */
function attachEventListeners(container) {
  // Search
  const searchInput = container.querySelector('#searchInput');
  const btnFilter = container.querySelector('#btnFilter');
  const btnSearchHeader = container.querySelector('#btnSearchHeader');
  
  if (searchInput) searchInput.addEventListener('input', doSearch);
  if (btnFilter) btnFilter.addEventListener('click', doSearch);
  if (btnSearchHeader) btnSearchHeader.addEventListener('click', () => {
    searchInput?.focus();
  });

  // Settings button
  const btnSettings = container.querySelector('#btnSettings');
  if (btnSettings) btnSettings.addEventListener('click', () => {
    alert('Pengaturan akan segera hadir!');
  });

  // Footer buttons
  const btnTambah = container.querySelector('#btnTambah');
  const btnSimpan = container.querySelector('#btnSimpan');
  const btnExport = container.querySelector('#btnExport');
  const btnDownload = container.querySelector('#btnDownload');

  if (btnTambah) btnTambah.addEventListener('click', openAddModal);
  if (btnSimpan) btnSimpan.addEventListener('click', () => {
    if (confirm('Simpan semua perubahan ke database?')) {
      loadDataSiswa(); // Reload dari database
      showToast('✅ Data tersinkronisasi dengan database!');
    }
  });
  if (btnExport) btnExport.addEventListener('click', exportToExcel);
  if (btnDownload) btnDownload.addEventListener('click', downloadData);

  // Modal buttons
  const modalClose = container.querySelector('#modalClose');
  const btnBatal = container.querySelector('#btnBatal');
  const btnSimpanModal = container.querySelector('#btnSimpanModal');

  if (modalClose) modalClose.addEventListener('click', closeEditModal);
  if (btnBatal) btnBatal.addEventListener('click', closeEditModal);
  if (btnSimpanModal) btnSimpanModal.addEventListener('click', simpanSiswa);

  // Close modal saat klik di luar
  const modal = container.querySelector('#modalSiswa');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeEditModal();
    });
  }
}
