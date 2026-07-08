// modules/global-monitoring/features/data-peserta-didik.js
// =========================================
// SUB-FITUR 1: DATA PESERTA DIDIK
// DENGAN PRESTASI CRUD & PAGINATION
// =========================================

import { db } from '../../../js/firebase-config.js';
import { getDatabase, ref, get, push, set, update, remove } 
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
const database = getDatabase();

// Konstanta CSS
const CSS_PATH = '../../css/modules/data-peserta-didik.css';
const CSS_ID = 'data-peserta-didik-css';

// State
let allSiswaData = [];
let filteredData = [];
let allPrestasiData = [];
let editMode = false;
let editRowIndex = -1;
let currentPage = 1;
const itemsPerPage = 20;

// Prestasi State
let prestasiEditMode = false;
let prestasiEditId = null;

/**
 * Fungsi init - Dipanggil oleh main.js
 */
export async function init(container, db) {
  loadFeatureCSS();
  renderUI(container);
  attachEventListeners(container);
  await Promise.all([loadDataSiswa(), loadPrestasi()]);
}

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
    .dps-container {
      background: linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%) !important;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(236, 72, 153, 0.15);
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      padding: 20px;
    }
    .dps-header {
      background: #1e3a8a;
      color: white;
      padding: 20px 30px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    .header-title { display: flex; align-items: center; gap: 15px; }
    .header-icon { font-size: 32px; }
    .header-title h1 { margin: 0; font-size: 28px; font-weight: 800; }
    .header-title h1 span { color: #fbbf24; }
    .header-actions { display: flex; gap: 10px; }
    .btn-icon {
      background: rgba(255,255,255,0.2);
      border: none;
      color: white;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      font-size: 18px;
      cursor: pointer;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 15px;
      margin-bottom: 20px;
    }
    .stat-card {
      display: flex;
      align-items: center;
      gap: 15px;
      padding: 15px;
      border-radius: 8px;
      background: white;
      border: 1px solid #e2e8f0;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }
    .stat-icon { font-size: 32px; }
    .stat-info { display: flex; flex-direction: column; }
    .stat-label { font-size: 13px; color: #64748b; font-weight: 600; }
    .stat-value { font-size: 24px; font-weight: 800; color: #1e3a8a; }
    .main-grid {
      display: grid;
      grid-template-columns: 1fr 350px;
      gap: 20px;
    }
    .table-section {
      background: white;
      border-radius: 8px;
      padding: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    }
    .search-bar { display: flex; gap: 10px; margin-bottom: 20px; }
    .search-input-wrapper { flex: 1; position: relative; }
    .search-icon { position: absolute; left: 15px; top: 50%; transform: translateY(-50%); }
    .form-input {
      width: 100%;
      padding: 12px 15px 12px 45px;
      border: 2px solid #e2e8f0;
      border-radius: 8px;
      font-size: 14px;
      box-sizing: border-box;
    }
    .form-input:focus { outline: none; border-color: #3b82f6; }
    .btn-filter {
      background: #1e3a8a;
      color: white;
      border: none;
      padding: 12px 25px;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
    }
    .table-responsive { overflow-x: auto; }
    .data-table { width: 100%; border-collapse: collapse; font-size: 13px; background: white; }
    .data-table th {
      background: #e0f2fe;
      color: #1e3a8a;
      padding: 12px 10px;
      text-align: left;
      font-weight: 700;
      border-bottom: 2px solid #bae6fd;
      position: sticky;
      top: 0;
      z-index: 10;
    }
    .data-table td { padding: 12px 10px; border-bottom: 1px solid #f1f5f9; color: #334155; }
    .data-table tbody tr:hover { background: #f8fafc; }
    .btn-small {
      padding: 6px 10px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      margin: 0 2px;
    }
    .btn-edit { background: #fbbf24; }
    .btn-delete { background: #ef4444; }
    .sidebar-section { display: flex; flex-direction: column; gap: 20px; }
    .sidebar-card {
      background: white;
      border-radius: 8px;
      padding: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    }
    .sidebar-card h3 { 
      margin: 0 0 15px 0; 
      color: #1e3a8a; 
      font-size: 16px; 
      border-bottom: 2px solid #f1f5f9; 
      padding-bottom: 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .btn-add-prestasi {
      background: #10b981;
      color: white;
      border: none;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
    }
    .btn-add-prestasi:hover { background: #059669; }
    .prestasi-list { 
      list-style: none; 
      padding: 0; 
      margin: 0; 
      display: flex; 
      flex-direction: column; 
      gap: 12px; 
      max-height: 400px;
      overflow-y: auto;
    }
    .prestasi-item { 
      display: flex; 
      flex-direction: column;
      gap: 8px;
      padding: 12px; 
      background: #f8fafc; 
      border-radius: 6px; 
      border-left: 4px solid #fbbf24;
      position: relative;
    }
    .prestasi-item-header {
      display: flex;
      justify-content: space-between;
      align-items: start;
    }
    .prestasi-item-title {
      font-weight: 700;
      color: #1e3a8a;
      font-size: 14px;
      margin: 0;
    }
    .prestasi-item-actions {
      display: flex;
      gap: 5px;
    }
    .prestasi-item-actions button {
      padding: 4px 8px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
    }
    .btn-prestasi-edit { background: #fbbf24; }
    .btn-prestasi-delete { background: #ef4444; color: white; }
    .prestasi-item-details {
      font-size: 12px;
      color: #64748b;
    }
    .prestasi-item-details span {
      display: block;
      margin-bottom: 3px;
    }
    .prestasi-empty {
      text-align: center;
      color: #94a3b8;
      padding: 20px;
      font-size: 13px;
    }
    .footer-actions {
      background: white;
      padding: 20px 30px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid #e2e8f0;
      border-radius: 8px;
      margin-top: 20px;
      flex-wrap: wrap;
      gap: 10px;
    }
    .footer-left, .footer-right { display: flex; gap: 10px; flex-wrap: wrap; }
    .btn-action {
      padding: 12px 20px;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 14px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .btn-add { background: #1e3a8a; color: white; }
    .btn-save { background: #10b981; color: white; }
    .btn-export { background: #059669; color: white; }
    .btn-download { background: #3b82f6; color: white; }
    .btn-cancel { background: #6b7280; color: white; }
    .modal {
      display: none;
      position: fixed;
      z-index: 1000;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0,0,0,0.5);
      justify-content: center;
      align-items: center;
    }
    .modal-content {
      background: white;
      border-radius: 12px;
      width: 90%;
      max-width: 600px;
      max-height: 90vh;
      overflow-y: auto;
    }
    .modal-header {
      background: #1e3a8a;
      color: white;
      padding: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-radius: 12px 12px 0 0;
    }
    .modal-header h3 { margin: 0; font-size: 18px; }
    .modal-close { background: none; border: none; color: white; font-size: 28px; cursor: pointer; }
    .modal-body { padding: 20px; }
    .form-group { margin-bottom: 15px; }
    .form-group label { display: block; margin-bottom: 6px; font-weight: 600; color: #1e3a8a; font-size: 13px; }
    .form-input-full {
      width: 100%;
      padding: 10px 12px;
      border: 2px solid #e2e8f0;
      border-radius: 6px;
      font-size: 14px;
      box-sizing: border-box;
    }
    .form-input-full:focus { outline: none; border-color: #3b82f6; }
    .form-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
    .modal-footer { padding: 15px 20px; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 10px; }
    
    /* Pagination */
    .pagination {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 10px;
      margin-top: 20px;
      padding: 15px;
      background: white;
      border-radius: 8px;
    }
    .pagination button {
      padding: 8px 16px;
      border: 2px solid #e2e8f0;
      background: white;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.3s;
    }
    .pagination button:hover:not(:disabled) {
      background: #1e3a8a;
      color: white;
      border-color: #1e3a8a;
    }
    .pagination button:disabled { opacity: 0.5; cursor: not-allowed; }
    .pagination-info { font-size: 13px; color: #64748b; }
    
    /* Mobile Card View */
    .mobile-cards { display: none; }
    .student-card {
      background: white;
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 12px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
      border-left: 4px solid #3b82f6;
    }
    .student-card-header {
      display: flex;
      justify-content: space-between;
      align-items: start;
      margin-bottom: 10px;
    }
    .student-card-name { font-size: 16px; font-weight: 700; color: #1e3a8a; margin: 0; }
    .student-card-nisn { font-size: 12px; color: #64748b; }
    .student-card-body {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-bottom: 12px;
    }
    .student-card-info { font-size: 13px; }
    .student-card-info strong { color: #64748b; font-weight: 600; }
    .student-card-actions { display: flex; gap: 8px; justify-content: flex-end; }
    .student-card-actions button {
      flex: 1;
      padding: 8px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
      font-size: 13px;
    }
    .btn-card-edit { background: #fbbf24; color: white; }
    .btn-card-delete { background: #ef4444; color: white; }
    
    @media (max-width: 1024px) { 
      .main-grid { grid-template-columns: 1fr; } 
      .stats-grid { grid-template-columns: repeat(2, 1fr); } 
    }
    @media (max-width: 768px) { 
      .stats-grid { grid-template-columns: 1fr; } 
      .footer-actions { flex-direction: column; align-items: stretch; } 
      .footer-left, .footer-right { justify-content: center; }
      .table-responsive { display: none; }
      .mobile-cards { display: block; }
    }
  `;
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
          <span class="stat-icon">👦</span>
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

          <!-- Desktop Table View -->
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

          <!-- Mobile Card View -->
          <div class="mobile-cards" id="mobileCards"></div>

          <!-- Pagination -->
          <div class="pagination" id="pagination"></div>
        </div>

        <!-- Right: Sidebar -->
        <div class="sidebar-section">
          <!-- Riwayat Prestasi (CRUD) -->
          <div class="sidebar-card prestasi-card">
            <h3>
              🏆 Riwayat Prestasi
              <button class="btn-add-prestasi" id="btnTambahPrestasi">➕ Tambah</button>
            </h3>
            <ul class="prestasi-list" id="prestasiList">
              <li class="prestasi-empty">Memuat data prestasi...</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Footer Actions -->
      <div class="footer-actions">
        <div class="footer-left">
          <button class="btn-action btn-add" id="btnTambah">➕ Tambah Siswa</button>
          <button class="btn-action btn-save" id="btnSimpan"> Simpan</button>
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
          <button class="btn-action btn-save" id="btnSimpanModal">💾 Simpan</button>
        </div>
      </div>
    </div>

    <!-- Modal Tambah/Edit Prestasi -->
    <div id="modalPrestasi" class="modal" style="display:none;">
      <div class="modal-content">
        <div class="modal-header">
          <h3 id="modalPrestasiTitle">Tambah Prestasi</h3>
          <button class="modal-close" id="modalPrestasiClose">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Judul Prestasi</label>
            <input type="text" id="inputPrestasiJudul" class="form-input-full" placeholder="Contoh: Juara 1 Lomba Matematika">
          </div>
          <div class="form-row-2">
            <div class="form-group">
              <label>Nama Siswa</label>
              <input type="text" id="inputPrestasiSiswa" class="form-input-full" placeholder="Nama siswa">
            </div>
            <div class="form-group">
              <label>Kelas</label>
              <input type="text" id="inputPrestasiKelas" class="form-input-full" placeholder="Contoh: 5A">
            </div>
          </div>
          <div class="form-row-2">
            <div class="form-group">
              <label>Tanggal</label>
              <input type="date" id="inputPrestasiTanggal" class="form-input-full">
            </div>
            <div class="form-group">
              <label>Tingkat</label>
              <select id="inputPrestasiTingkat" class="form-input-full">
                <option value="Sekolah">Sekolah</option>
                <option value="Kecamatan">Kecamatan</option>
                <option value="Kabupaten">Kabupaten</option>
                <option value="Provinsi">Provinsi</option>
                <option value="Nasional">Nasional</option>
                <option value="Internasional">Internasional</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label>Keterangan (Opsional)</label>
            <textarea id="inputPrestasiKeterangan" class="form-input-full" rows="2" placeholder="Keterangan tambahan"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-action btn-cancel" id="btnPrestasiBatal">Batal</button>
          <button class="btn-action btn-save" id="btnSimpanPrestasi">💾 Simpan</button>
        </div>
      </div>
    </div>
  `;
}

/**
 * Load Data Siswa dari Firebase
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
    currentPage = 1;

    updateStats(allSiswaData.length, kelasSet.size, totalL, totalP);
    renderTable();
    renderMobileCards();
    renderPagination();

  } catch (error) {
    console.error('Error loading siswa:', error);
  }
}

/**
 * Load Prestasi dari Firebase
 */
async function loadPrestasi() {
  try {
    const snapshot = await get(ref(database, 'prestasi'));
    allPrestasiData = [];

    if (snapshot.exists()) {
      snapshot.forEach(prestasiSnap => {
        allPrestasiData.push({
          id: prestasiSnap.key,
          ...prestasiSnap.val()
        });
      });
    }

    // Sort by tanggal (terbaru dulu)
    allPrestasiData.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));
    
    renderPrestasi();

  } catch (error) {
    console.error('Error loading prestasi:', error);
    document.getElementById('prestasiList').innerHTML = 
      '<li class="prestasi-empty">Gagal memuat data prestasi</li>';
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
 * Get Current Page Data
 */
function getCurrentPageData() {
  const start = (currentPage - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  return filteredData.slice(start, end);
}

/**
 * Render Tabel (Desktop)
 */
function renderTable() {
  const tbody = document.getElementById('tabelBody');
  tbody.innerHTML = '';

  const pageData = getCurrentPageData();

  if (pageData.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding: 20px;">Tidak ada data ditemukan</td></tr>';
    return;
  }

  pageData.forEach((siswa, index) => {
    const globalIndex = (currentPage - 1) * itemsPerPage + index;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${globalIndex + 1}</td>
      <td>${siswa.nisn}</td>
      <td><strong>${siswa.nama}</strong></td>
      <td>${siswa.kelas}</td>
      <td>${siswa.jk === 'L' ? 'Laki-laki' : 'Perempuan'}</td>
      <td>${siswa.tglLahir}</td>
      <td>${siswa.alamat}</td>
      <td>${siswa.ortu}</td>
      <td>
        <button class="btn-small btn-edit" data-id="${siswa.id}" data-index="${globalIndex}">✏️</button>
        <button class="btn-small btn-delete" data-id="${siswa.id}">️</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  attachTableButtonEvents();
}

/**
 * Render Mobile Cards
 */
function renderMobileCards() {
  const container = document.getElementById('mobileCards');
  if (!container) return;
  container.innerHTML = '';

  const pageData = getCurrentPageData();

  if (pageData.length === 0) {
    container.innerHTML = '<p style="text-align:center; padding: 20px; color: #64748b;">Tidak ada data ditemukan</p>';
    return;
  }

  pageData.forEach((siswa, index) => {
    const globalIndex = (currentPage - 1) * itemsPerPage + index;
    const card = document.createElement('div');
    card.className = 'student-card';
    card.innerHTML = `
      <div class="student-card-header">
        <div>
          <h4 class="student-card-name">${siswa.nama}</h4>
          <span class="student-card-nisn">NISN: ${siswa.nisn}</span>
        </div>
      </div>
      <div class="student-card-body">
        <div class="student-card-info"><strong>Kelas:</strong> ${siswa.kelas}</div>
        <div class="student-card-info"><strong>JK:</strong> ${siswa.jk === 'L' ? 'Laki-laki' : 'Perempuan'}</div>
        <div class="student-card-info"><strong>Tgl Lahir:</strong> ${siswa.tglLahir}</div>
        <div class="student-card-info"><strong>Ortu:</strong> ${siswa.ortu}</div>
      </div>
      <div class="student-card-actions">
        <button class="btn-card-edit" data-id="${siswa.id}" data-index="${globalIndex}">✏️ Edit</button>
        <button class="btn-card-delete" data-id="${siswa.id}">️ Hapus</button>
      </div>
    `;
    container.appendChild(card);
  });

  attachMobileCardEvents();
}

/**
 * Render Pagination
 */
function renderPagination() {
  const container = document.getElementById('pagination');
  if (!container) return;

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  
  if (totalPages <= 1) {
    container.style.display = 'none';
    return;
  }

  container.style.display = 'flex';
  container.innerHTML = `
    <button id="btnPrev" ${currentPage === 1 ? 'disabled' : ''}>← Prev</button>
    <span class="pagination-info">Halaman ${currentPage} dari ${totalPages}</span>
    <button id="btnNext" ${currentPage === totalPages ? 'disabled' : ''}>Next →</button>
  `;

  document.getElementById('btnPrev')?.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      renderTable();
      renderMobileCards();
      renderPagination();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });

  document.getElementById('btnNext')?.addEventListener('click', () => {
    if (currentPage < totalPages) {
      currentPage++;
      renderTable();
      renderMobileCards();
      renderPagination();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });
}

/**
 * Render Prestasi List
 */
function renderPrestasi() {
  const list = document.getElementById('prestasiList');
  if (!list) return;

  if (allPrestasiData.length === 0) {
    list.innerHTML = '<li class="prestasi-empty">Belum ada data prestasi. Klik "Tambah" untuk menambah.</li>';
    return;
  }

  list.innerHTML = allPrestasiData.map(p => `
    <li class="prestasi-item">
      <div class="prestasi-item-header">
        <h4 class="prestasi-item-title">${p.judul}</h4>
        <div class="prestasi-item-actions">
          <button class="btn-prestasi-edit" data-id="${p.id}">✏️</button>
          <button class="btn-prestasi-delete" data-id="${p.id}">🗑️</button>
        </div>
      </div>
      <div class="prestasi-item-details">
        <span>👤 ${p.siswa} - Kelas ${p.kelas}</span>
        <span>📅 ${formatTanggal(p.tanggal)} | 🏆 Tingkat: ${p.tingkat}</span>
        ${p.keterangan ? `<span> ${p.keterangan}</span>` : ''}
      </div>
    </li>
  `).join('');

  attachPrestasiButtonEvents();
}

/**
 * Format Tanggal
 */
function formatTanggal(tanggal) {
  if (!tanggal) return '-';
  const date = new Date(tanggal);
  return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
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
 * Attach Event untuk Mobile Cards
 */
function attachMobileCardEvents() {
  document.querySelectorAll('.btn-card-edit').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.id;
      const index = parseInt(e.currentTarget.dataset.index);
      openEditModal(id, index);
    });
  });

  document.querySelectorAll('.btn-card-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.id;
      deleteSiswa(id);
    });
  });
}

/**
 * Attach Event untuk Tombol Prestasi
 */
function attachPrestasiButtonEvents() {
  document.querySelectorAll('.btn-prestasi-edit').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.id;
      openEditPrestasiModal(id);
    });
  });

  document.querySelectorAll('.btn-prestasi-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.id;
      deletePrestasi(id);
    });
  });
}

/**
 * Modal Siswa Functions
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
 * Modal Prestasi Functions
 */
function openAddPrestasiModal() {
  prestasiEditMode = false;
  prestasiEditId = null;
  document.getElementById('modalPrestasiTitle').textContent = 'Tambah Prestasi';
  clearPrestasiForm();
  document.getElementById('modalPrestasi').style.display = 'flex';
}

function openEditPrestasiModal(id) {
  const prestasi = allPrestasiData.find(p => p.id === id);
  if (!prestasi) return;

  prestasiEditMode = true;
  prestasiEditId = id;
  
  document.getElementById('modalPrestasiTitle').textContent = 'Edit Prestasi';
  document.getElementById('inputPrestasiJudul').value = prestasi.judul || '';
  document.getElementById('inputPrestasiSiswa').value = prestasi.siswa || '';
  document.getElementById('inputPrestasiKelas').value = prestasi.kelas || '';
  document.getElementById('inputPrestasiTanggal').value = prestasi.tanggal || '';
  document.getElementById('inputPrestasiTingkat').value = prestasi.tingkat || 'Sekolah';
  document.getElementById('inputPrestasiKeterangan').value = prestasi.keterangan || '';
  
  document.getElementById('modalPrestasi').style.display = 'flex';
}

function closePrestasiModal() {
  document.getElementById('modalPrestasi').style.display = 'none';
  clearPrestasiForm();
}

function clearPrestasiForm() {
  document.getElementById('inputPrestasiJudul').value = '';
  document.getElementById('inputPrestasiSiswa').value = '';
  document.getElementById('inputPrestasiKelas').value = '';
  document.getElementById('inputPrestasiTanggal').value = '';
  document.getElementById('inputPrestasiTingkat').value = 'Sekolah';
  document.getElementById('inputPrestasiKeterangan').value = '';
}

/**
 * Simpan Siswa
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
      const siswa = filteredData[editRowIndex];
      await update(ref(database, `siswa/${siswa.kelas}/${siswa.id}`), dataSiswa);
      showToast('✅ Data siswa berhasil diupdate!');
    } else {
      const newRef = push(ref(database, `siswa/${kelas}`));
      dataSiswa.createdAt = Date.now();
      await set(newRef, dataSiswa);
      showToast('✅ Siswa baru berhasil ditambahkan!');
    }

    closeEditModal();
    await loadDataSiswa();

  } catch (error) {
    console.error('Error saving:', error);
    alert('Gagal menyimpan data: ' + error.message);
  }
}

/**
 * Simpan Prestasi
 */
async function simpanPrestasi() {
  const judul = document.getElementById('inputPrestasiJudul').value.trim();
  const siswa = document.getElementById('inputPrestasiSiswa').value.trim();
  const kelas = document.getElementById('inputPrestasiKelas').value.trim();
  const tanggal = document.getElementById('inputPrestasiTanggal').value;
  const tingkat = document.getElementById('inputPrestasiTingkat').value;
  const keterangan = document.getElementById('inputPrestasiKeterangan').value.trim();

  if (!judul || !siswa || !kelas) {
    alert('Judul, Nama Siswa, dan Kelas wajib diisi!');
    return;
  }

  try {
    const dataPrestasi = {
      judul,
      siswa,
      kelas,
      tanggal: tanggal || new Date().toISOString().split('T')[0],
      tingkat,
      keterangan: keterangan || '',
      updatedAt: Date.now()
    };

    if (prestasiEditMode && prestasiEditId) {
      await update(ref(database, `prestasi/${prestasiEditId}`), dataPrestasi);
      showToast('✅ Prestasi berhasil diupdate!');
    } else {
      dataPrestasi.createdAt = Date.now();
      const newRef = push(ref(database, 'prestasi'));
      await set(newRef, dataPrestasi);
      showToast('✅ Prestasi baru berhasil ditambahkan!');
    }

    closePrestasiModal();
    await loadPrestasi();

  } catch (error) {
    console.error('Error saving prestasi:', error);
    alert('Gagal menyimpan prestasi: ' + error.message);
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
 * Hapus Prestasi
 */
async function deletePrestasi(id) {
  if (!confirm('Yakin ingin menghapus prestasi ini?')) return;

  try {
    await remove(ref(database, `prestasi/${id}`));
    showToast('️ Prestasi berhasil dihapus!');
    await loadPrestasi();
  } catch (error) {
    console.error('Error deleting prestasi:', error);
    alert('Gagal menghapus prestasi: ' + error.message);
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
  currentPage = 1;
  renderTable();
  renderMobileCards();
  renderPagination();
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
      loadDataSiswa();
      showToast('✅ Data tersinkronisasi dengan database!');
    }
  });
  if (btnExport) btnExport.addEventListener('click', exportToExcel);
  if (btnDownload) btnDownload.addEventListener('click', downloadData);

  // Modal Siswa buttons
  const modalClose = container.querySelector('#modalClose');
  const btnBatal = container.querySelector('#btnBatal');
  const btnSimpanModal = container.querySelector('#btnSimpanModal');

  if (modalClose) modalClose.addEventListener('click', closeEditModal);
  if (btnBatal) btnBatal.addEventListener('click', closeEditModal);
  if (btnSimpanModal) btnSimpanModal.addEventListener('click', simpanSiswa);

  const modalSiswa = container.querySelector('#modalSiswa');
  if (modalSiswa) {
    modalSiswa.addEventListener('click', (e) => {
      if (e.target === modalSiswa) closeEditModal();
    });
  }

  // Modal Prestasi buttons
  const btnTambahPrestasi = container.querySelector('#btnTambahPrestasi');
  const modalPrestasiClose = container.querySelector('#modalPrestasiClose');
  const btnPrestasiBatal = container.querySelector('#btnPrestasiBatal');
  const btnSimpanPrestasi = container.querySelector('#btnSimpanPrestasi');

  if (btnTambahPrestasi) btnTambahPrestasi.addEventListener('click', openAddPrestasiModal);
  if (modalPrestasiClose) modalPrestasiClose.addEventListener('click', closePrestasiModal);
  if (btnPrestasiBatal) btnPrestasiBatal.addEventListener('click', closePrestasiModal);
  if (btnSimpanPrestasi) btnSimpanPrestasi.addEventListener('click', simpanPrestasi);

  const modalPrestasi = container.querySelector('#modalPrestasi');
  if (modalPrestasi) {
    modalPrestasi.addEventListener('click', (e) => {
      if (e.target === modalPrestasi) closePrestasiModal();
    });
  }
}
