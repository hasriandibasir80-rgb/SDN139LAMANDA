// modules/global-monitoring/features/data-tp.js
// =========================================
// FITUR: DATA TP, CP & ATP (MASTER DATA)
// FUNGSI: Single Source of Truth untuk seluruh sub-fitur Admin Pembelajaran
// TERINTEGRASI: Firestore (Collection: 'data_tp', 'data_cp', 'data_atp')
// UPDATE 06/08/2026:
//  - Input CP/TP/ATP diubah menjadi MODEL TABEL (Elemen | CP/TP/ATP | Materi)
//    dengan tombol "+ TAMBAH BARIS" (sesuai permintaan user)
//  - Penambahan FILTER SEMESTER di Form CP serta Daftar TP/CP/ATP
//  - Export Word berbentuk tabel (Elemen | CP/TP/ATP | Materi)
// UPDATE 07/08/2026:
//  - Penambahan KOLOM KELAS sebelum kolom ELEMEN pada seluruh tabel
//    (Form TP/CP/ATP, Daftar TP/CP/ATP, dan Export Word)
// CATATAN: Seluruh logic lama (CRUD, snapshot, edit, hapus, export, toast)
//          dipertahankan 100%. Field lama (tujuan_pembelajaran & alur berupa
//          array string) TETAP disimpan agar fitur lain (RPM, KKTP, LKPD,
//          Kisi-kisi, Prota, Promes) tetap kompatibel.
// =========================================
import { db } from '../../../js/firebase-config.js';
import {
  collection, addDoc, getDocs, query, where,
  onSnapshot, doc, updateDoc, deleteDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
const CSS_ID = 'data-tp-css';

let currentEditId = null;
let currentEditCPId = null;
let currentEditATPId = null;
let dataMapel = [];
let lastTPData = [];
let lastCPData = [];
let lastATPData = [];

const PH_TP = 'Contoh: Siswa mampu mengidentifikasi bagian tubuh tumbuhan';
const PH_CP = 'Deskripsi capaian pembelajaran';
const PH_ATP = 'Contoh: Siswa mampu memahami hakikat IPA dan metode ilmiah';

const FALLBACK_MAPEL = [
  { id: 'paibd', nama: 'Pendidikan Agama Islam dan Budi Pekerti', singkatan: 'PAIBD', icon: '🕌' },
  { id: 'matematika', nama: 'Matematika', singkatan: 'Matematika', icon: '🔢' },
  { id: 'ipas', nama: 'IPAS', singkatan: 'IPAS', icon: '🔬' },
  { id: 'pjok', nama: 'PJOK', singkatan: 'PJOK', icon: '⚽' },
  { id: 'bahasa-indonesia', nama: 'Bahasa Indonesia', singkatan: 'Bhs.Indonesia', icon: '📖' },
  { id: 'pendidikan-pancasila', nama: 'Pendidikan Pancasila', singkatan: 'Pendidikan Pancasila', icon: '🇮' },
  { id: 'seni-budaya', nama: 'Seni dan Budaya', singkatan: 'Seni dan Budaya', icon: '🎨' },
  { id: 'bahasa-inggris', nama: 'Bahasa Inggris', singkatan: 'Bhs.Inggris', icon: '🇬' },
  { id: 'coding-kka', nama: 'Coding/KKA', singkatan: 'Coding/KKA', icon: '💻' },
  { id: 'bahasa-ibu', nama: 'Bahasa Ibu', singkatan: 'Bhs.Ibu', icon: '🗣️' },
  { id: 'bta', nama: 'BTA', singkatan: 'BTA', icon: '📚' }
];

export async function init(container, db) {
  loadCSS();
  await loadMataPelajaran();
  renderUI(container);
  attachEvents(container);
  // Baris awal kosong untuk ketiga tabel
  addTableRow('dtp-tbody', 'tp', PH_TP);
  addTableRow('dcp-tbody', 'deskripsi', PH_CP);
  addTableRow('datp-tbody', 'atp', PH_ATP);
  loadDataTP(container);
  loadDataCP(container);
  loadDataATP(container);
}

export function cleanup() {
  const css = document.getElementById(CSS_ID);
  if (css) css.remove();
}

async function loadMataPelajaran() {
  try {
    const response = await fetch('../../../assets/data-mapel.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    dataMapel = data.mataPelajaran || [];
  } catch (error) {
    console.warn('⚠️ Menggunakan data mapel fallback');
    dataMapel = FALLBACK_MAPEL;
  }
}

// ========== UTILITAS ==========
function escapeHtml(s) { return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function escapeAttr(s) { return String(s ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'); }

// ========== TABEL DINAMIS (MODEL BARU + KOLOM KELAS) ==========
function addTableRow(tbodyId, midField, midPlaceholder, values = {}) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  const tr = document.createElement('tr');
  tr.innerHTML = `<td><input type="text" class="dtp-cell" data-field="kelas" placeholder="Kelas" value="${escapeAttr(values.kelas || '')}"></td> <td><input type="text" class="dtp-cell" data-field="elemen" placeholder="Nama elemen" value="${escapeAttr(values.elemen || '')}"></td> <td><textarea class="dtp-cell" data-field="${midField}" placeholder="${midPlaceholder}">${escapeHtml(values[midField] || '')}</textarea></td> <td><input type="text" class="dtp-cell" data-field="materi" placeholder="Materi pembelajaran" value="${escapeAttr(values.materi || '')}"></td> <td style="text-align:center;"><button type="button" class="dtp-row-del" title="Hapus baris">✖</button></td>`;
  tr.querySelector('.dtp-row-del').addEventListener('click', () => tr.remove());
  tbody.appendChild(tr);
}

function readTableRows(tbodyId, midField) {
  const rows = [];
  document.querySelectorAll(`#${tbodyId} tr`).forEach(tr => {
    const kelas = (tr.querySelector('[data-field="kelas"]')?.value || '').trim();
    const elemen = (tr.querySelector('[data-field="elemen"]')?.value || '').trim();
    const mid = (tr.querySelector(`[data-field="${midField}"]`)?.value || '').trim();
    const materi = (tr.querySelector('[data-field="materi"]')?.value || '').trim();
    if (kelas || elemen || mid || materi) rows.push({ kelas, elemen, [midField]: mid, materi });
  });
  return rows;
}

function resetTable(tbodyId, midField, midPlaceholder) {
  const tbody = document.getElementById(tbodyId);
  if (tbody) tbody.innerHTML = '';
  addTableRow(tbodyId, midField, midPlaceholder);
}

function tableViewHTML(rows, midHeader, isATP = false) {
  const body = (rows || []).map(r =>
    `<tr><td>${escapeHtml(r.kelas || '')}</td><td>${escapeHtml(r.elemen || '')}</td><td>${escapeHtml(r[midHeader.toLowerCase()] ?? r[midHeader] ?? '')}</td><td>${escapeHtml(r.materi || '')}</td></tr>`
  ).join('');
  return `<div class="dtp-table-wrap"><table class="dtp-table view ${isATP ? 'atp' : ''}"><thead><tr><th style="width:10%">Kelas</th><th style="width:22%">Elemen</th><th style="width:46%">${midHeader}</th><th style="width:22%">Materi</th></tr></thead><tbody>${body}</tbody></table></div>`;
}

// Normalisasi data lama -> baris tabel (data lama tanpa kelas tetap aman)
function normalizeTPRows(d) {
  if (Array.isArray(d.tp_rows) && d.tp_rows.length) return d.tp_rows;
  return (d.tujuan_pembelajaran || []).map(t => ({ kelas: '', elemen: '', tp: t, materi: '' }));
}
function normalizeCPRows(d) {
  if (Array.isArray(d.elemen_cp) && d.elemen_cp.length) return d.elemen_cp; // {kelas?, elemen, deskripsi, materi?}
  return [];
}
function normalizeATPRows(d) {
  if (Array.isArray(d.atp_rows) && d.atp_rows.length) return d.atp_rows;
  return (d.alur || []).map(t => ({ kelas: '', elemen: '', atp: t, materi: '' }));
}

function loadCSS() {
  if (document.getElementById(CSS_ID)) return;
  const style = document.createElement('style');
  style.id = CSS_ID;
  style.textContent = `.dtp-container { background: linear-gradient(135deg, #fce7f3 0%, #fbcfe8 50%, #e0e7ff 100%); border-radius: 16px; padding: 25px; font-family: 'Segoe UI', sans-serif; max-width: 1200px; margin: 0 auto; box-shadow: 0 8px 24px rgba(236, 72, 153, 0.15); } .dtp-header { background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); color: white; padding: 30px; border-radius: 12px; margin-bottom: 25px; box-shadow: 0 4px 12px rgba(236, 72, 153, 0.3); } .dtp-header h2 { margin: 0 0 8px 0; font-size: 28px; font-weight: 700; } .dtp-header p { margin: 0; opacity: 0.95; font-size: 15px; } .dtp-tabs { display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap; } .dtp-tab { padding: 12px 20px; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 13px; background: white; color: #be185d; transition: all 0.2s; } .dtp-tab.active { background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); color: white; } .dtp-tab.atp-tab { color: #4338ca; } .dtp-tab.atp-tab.active { background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); } .dtp-section { background: white; padding: 25px; border-radius: 12px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(236, 72, 153, 0.1); } .dtp-section-title { font-size: 18px; font-weight: 700; color: #be185d; margin: 0 0 15px 0; padding-bottom: 10px; border-bottom: 3px solid #fce7f3; } .dtp-section-title.atp { color: #4338ca; border-bottom-color: #ddd6fe; } .dtp-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px; } .dtp-form-group { margin-bottom: 15px; } .dtp-form-group label { display: block; margin-bottom: 6px; font-weight: 600; font-size: 13px; color: #831843; } .dtp-form-control { width: 100%; padding: 12px 14px; border: 2px solid #fbcfe8; border-radius: 8px; font-size: 14px; box-sizing: border-box; background: white; color: #831843; font-family: inherit; } .dtp-form-control:focus { outline: none; border-color: #ec4899; box-shadow: 0 0 0 3px rgba(236, 72, 153, 0.15); } .dtp-form-control.atp { border-color: #c7d2fe; color: #3730a3; } .dtp-form-control.atp:focus { border-color: #4f46e5; box-shadow: 0 0 0 3px rgba(79,70,229,.15); } textarea.dtp-form-control { resize: vertical; min-height: 120px; } select.dtp-form-control { cursor: pointer; } .dtp-btn { padding: 12px 24px; border: none; border-radius: 8px; font-weight: 600; font-size: 14px; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; transition: all 0.2s; color: white; } .dtp-btn:hover { transform: translateY(-2px); } .dtp-btn-primary { background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); } .dtp-btn-indigo { background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); } .dtp-btn-success { background: linear-gradient(135deg, #10b981 0%, #059669 100%); } .dtp-btn-warning { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); } .dtp-btn-danger { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); } .dtp-btn-secondary { background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%); } .dtp-btn-add { margin-top: 10px; background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%); padding: 10px 18px; font-size: 13px; } .dtp-actions { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 20px; justify-content: center; } .dtp-item { background: linear-gradient(135deg, #fff1f2 0%, #fce7f3 100%); padding: 15px; border-radius: 10px; margin-bottom: 10px; border-left: 4px solid #ec4899; } .dtp-item.atp-item { background: linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%); border-left-color: #4f46e5; } .dtp-item-header { display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px; flex-wrap: wrap; gap: 5px; } .dtp-item-title { font-weight: 700; color: #be185d; font-size: 15px; } .dtp-item-title.atp { color: #4338ca; } .dtp-item-meta { font-size: 12px; color: #64748b; } .dtp-item-actions { display: flex; gap: 5px; } .dtp-item-actions button { padding: 6px 12px; font-size: 12px; border: none; border-radius: 6px; cursor: pointer; color: white; } .dtp-empty { text-align: center; padding: 30px; color: #64748b; background: white; border-radius: 10px; } .dtp-loading { text-align: center; padding: 20px; color: #831843; } .dtp-toast { position: fixed; top: 20px; right: 20px; padding: 14px 24px; border-radius: 10px; z-index: 10001; color: white; font-weight: 600; box-shadow: 0 4px 16px rgba(0,0,0,0.15); animation: dtpSlideIn 0.3s ease; } .dtp-toast-success { background: linear-gradient(135deg, #10b981 0%, #059669 100%); } .dtp-toast-error { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); } @keyframes dtpSlideIn { from { transform: translateX(400px); opacity: 0; } to { transform: translateX(0); opacity: 1; } } .dtp-table-wrap { overflow-x: auto; border-radius: 8px; margin-top: 5px; } .dtp-table { width: 100%; border-collapse: collapse; background: white; } .dtp-table th { background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); color: white; padding: 10px 8px; font-size: 13px; text-align: left; border: 1px solid #d8b4fe; } .dtp-table.atp th { background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); } .dtp-table td { border: 2px solid #fbcfe8; padding: 6px; vertical-align: top; } .dtp-table.atp td { border-color: #c7d2fe; } .dtp-table.view td { border-width: 1px; border-color: #e2e8f0; font-size: 13px; color: #334155; padding: 8px; } .dtp-cell { width: 100%; box-sizing: border-box; border: 1px solid #e9d5ff; border-radius: 6px; padding: 8px 10px; font-size: 13px; font-family: inherit; color: #831843; background: #fdf4ff; } .dtp-cell:focus { outline: none; border-color: #ec4899; box-shadow: 0 0 0 2px rgba(236,72,153,.15); } textarea.dtp-cell { min-height: 56px; resize: vertical; } .dtp-row-del { background: #ef4444; color: white; border: none; border-radius: 6px; width: 28px; height: 28px; cursor: pointer; font-size: 12px; } .dtp-row-del:hover { background: #dc2626; } .dtp-filters { display: flex; gap: 10px; margin-bottom: 15px; flex-wrap: wrap; } .dtp-filters select, .dtp-filters input { padding: 10px; border: 2px solid #fbcfe8; border-radius: 8px; font-size: 14px; } .dtp-filters.atp select, .dtp-filters.atp input { border-color: #c7d2fe; } @media (max-width: 768px) { .dtp-form-grid { grid-template-columns: 1fr; } .dtp-actions { flex-direction: column; } .dtp-btn { width: 100%; justify-content: center; } .dtp-filters { flex-direction: column; } }`;
  document.head.appendChild(style);
}

function renderUI(container) {
  let mapelOptions = '<option value="">-- Pilih Mapel --</option>';
  dataMapel.forEach(m => {
    mapelOptions += `<option value="${m.nama}">${m.icon} ${m.singkatan}</option>`;
  });
  const semesterOptions = `<option value="1">Semester 1 (Ganjil)</option><option value="2">Semester 2 (Genap)</option>`;
  const filterSemesterOptions = `<option value="">Semua Semester</option><option value="1">Semester 1</option><option value="2">Semester 2</option>`;

  container.innerHTML = `
  <div class="dtp-container">
    <div class="dtp-header">
      <h2>🎯 Master Data CP, TP & ATP</h2>
      <p>Database Terpusat Capaian, Tujuan & Alur Tujuan Pembelajaran untuk Konsistensi Administrasi Kurikulum</p>
    </div>
    <div class="dtp-tabs">
      <button class="dtp-tab active" data-tab="tp-form">📋 Input TP</button>
      <button class="dtp-tab" data-tab="tp-list">📚 Daftar TP</button>
      <button class="dtp-tab" data-tab="cp-form">📝 Input CP</button>
      <button class="dtp-tab" data-tab="cp-list">📖 Daftar CP</button>
      <button class="dtp-tab atp-tab" data-tab="atp-form">🔗 Input ATP</button>
      <button class="dtp-tab atp-tab" data-tab="atp-list">🗂️ Daftar ATP</button>
    </div>

    <!-- FORM TP -->
    <div id="dtp-form-section">
      <div class="dtp-section">
        <h3 class="dtp-section-title">📋 Informasi Master TP</h3>
        <div class="dtp-form-grid">
          <div class="dtp-form-group">
            <label>🎓 Kelas</label>
            <select id="dtp-kelas" class="dtp-form-control">
              <option value="">-- Pilih Kelas --</option>
              <option value="1">Kelas 1</option><option value="2">Kelas 2</option>
              <option value="3">Kelas 3</option><option value="4">Kelas 4</option>
              <option value="5">Kelas 5</option><option value="6">Kelas 6</option>
            </select>
          </div>
          <div class="dtp-form-group">
            <label>📚 Mata Pelajaran</label>
            <select id="dtp-mapel" class="dtp-form-control">${mapelOptions}</select>
          </div>
        </div>
        <div class="dtp-form-grid">
          <div class="dtp-form-group">
            <label>📅 Semester</label>
            <select id="dtp-semester" class="dtp-form-control">${semesterOptions}</select>
          </div>
          <div class="dtp-form-group">
            <label>📝 Topik Pembelajaran</label>
            <input type="text" id="dtp-topik" class="dtp-form-control" placeholder="Contoh: Bagian Tubuh Tumbuhan">
          </div>
        </div>
        <div class="dtp-form-group">
          <label>🎯 Tabel Kelas, Elemen, TP & Materi</label>
          <div class="dtp-table-wrap">
            <table class="dtp-table">
              <thead><tr><th style="width:10%">Kelas</th><th style="width:22%">Elemen</th><th style="width:42%">TP</th><th style="width:20%">Materi</th><th style="width:6%">❌</th></tr></thead>
              <tbody id="dtp-tbody"></tbody>
            </table>
          </div>
          <button type="button" class="dtp-btn dtp-btn-add" id="btn-add-row-tp">➕ Tambah Baris</button>
          <p style="font-size: 12px; color: #64748b; margin-top: 5px;">💡 Data ini akan menjadi master data yang bisa dipilih oleh fitur RPM, KKTP, LKPD, dan Kisi-kisi.</p>
        </div>
      </div>
      <div class="dtp-actions">
        <button class="dtp-btn dtp-btn-success" id="btn-simpan-tp">💾 Simpan TP</button>
        <button class="dtp-btn dtp-btn-warning" id="btn-export-tp">📥 Export Word</button>
        <button class="dtp-btn dtp-btn-secondary" id="btn-reset-tp">🔄 Reset</button>
      </div>
    </div>

    <!-- LIST TP -->
    <div id="dtp-list-section" style="display: none;">
      <div class="dtp-section">
        <h3 class="dtp-section-title">🔍 Filter Data TP</h3>
        <div class="dtp-filters">
          <select id="filter-kelas" class="dtp-form-control" style="flex: 1;">
            <option value="">Semua Kelas</option>
            <option value="1">Kelas 1</option><option value="2">Kelas 2</option>
            <option value="3">Kelas 3</option><option value="4">Kelas 4</option>
            <option value="5">Kelas 5</option><option value="6">Kelas 6</option>
          </select>
          <select id="filter-semester" class="dtp-form-control" style="flex: 1;">${filterSemesterOptions}</select>
          <select id="filter-mapel" class="dtp-form-control" style="flex: 2;">
            <option value="">Semua Mapel</option>
            ${mapelOptions}
          </select>
          <input type="text" id="filter-topik" class="dtp-form-control" style="flex: 2;" placeholder="Cari topik...">
        </div>
        <h3 class="dtp-section-title">📚 Daftar Master TP Tersimpan</h3>
        <div id="dtp-list-container">
          <div class="dtp-loading">⏳ Memuat data...</div>
        </div>
      </div>
    </div>

    <!-- FORM CP -->
    <div id="dtp-cp-form-section" style="display: none;">
      <div class="dtp-section">
        <h3 class="dtp-section-title">📝 Informasi Capaian Pembelajaran (CP)</h3>
        <div class="dtp-form-grid">
          <div class="dtp-form-group">
            <label>🎓 Fase</label>
            <select id="dcp-fase" class="dtp-form-control">
              <option value="">-- Pilih Fase --</option>
              <option value="A">Fase A (Kelas 1-2)</option>
              <option value="B">Fase B (Kelas 3-4)</option>
              <option value="C">Fase C (Kelas 5-6)</option>
            </select>
          </div>
          <div class="dtp-form-group">
            <label>📚 Mata Pelajaran</label>
            <select id="dcp-mapel" class="dtp-form-control">${mapelOptions}</select>
          </div>
        </div>
        <div class="dtp-form-grid">
          <div class="dtp-form-group">
            <label>📅 Semester</label>
            <select id="dcp-semester" class="dtp-form-control">${semesterOptions}</select>
          </div>
          <div class="dtp-form-group"></div>
        </div>
        <div class="dtp-form-group">
          <label>📋 Tabel Kelas, Elemen, CP & Materi</label>
          <div class="dtp-table-wrap">
            <table class="dtp-table">
              <thead><tr><th style="width:10%">Kelas</th><th style="width:22%">Elemen</th><th style="width:42%">CP</th><th style="width:20%">Materi</th><th style="width:6%">❌</th></tr></thead>
              <tbody id="dcp-tbody"></tbody>
            </table>
          </div>
          <button type="button" class="dtp-btn dtp-btn-add" id="btn-add-row-cp">➕ Tambah Baris</button>
          <p style="font-size: 12px; color: #64748b; margin-top: 5px;">💡 Isi satu baris untuk setiap elemen CP. Gunakan tombol "➕ Tambah Baris" untuk menambah elemen.</p>
        </div>
      </div>
      <div class="dtp-actions">
        <button class="dtp-btn dtp-btn-success" id="btn-simpan-cp">💾 Simpan CP</button>
        <button class="dtp-btn dtp-btn-warning" id="btn-export-cp">📥 Export Word</button>
        <button class="dtp-btn dtp-btn-secondary" id="btn-reset-cp">🔄 Reset</button>
      </div>
    </div>

    <!-- LIST CP -->
    <div id="dtp-cp-list-section" style="display: none;">
      <div class="dtp-section">
        <h3 class="dtp-section-title">🔍 Filter Data CP</h3>
        <div class="dtp-filters">
          <select id="filter-cp-fase" class="dtp-form-control" style="flex: 1;">
            <option value="">Semua Fase</option>
            <option value="A">Fase A</option><option value="B">Fase B</option><option value="C">Fase C</option>
          </select>
          <select id="filter-cp-semester" class="dtp-form-control" style="flex: 1;">${filterSemesterOptions}</select>
          <select id="filter-cp-mapel" class="dtp-form-control" style="flex: 2;">
            <option value="">Semua Mapel</option>
            ${mapelOptions}
          </select>
        </div>
        <h3 class="dtp-section-title">📖 Daftar Capaian Pembelajaran (CP)</h3>
        <div id="dcp-list-container">
          <div class="dtp-loading">⏳ Memuat data...</div>
        </div>
      </div>
    </div>

    <!-- FORM ATP -->
    <div id="dtp-atp-form-section" style="display: none;">
      <div class="dtp-section">
        <h3 class="dtp-section-title atp">🔗 Informasi Alur Tujuan Pembelajaran (ATP)</h3>
        <div class="dtp-form-grid">
          <div class="dtp-form-group">
            <label>🎓 Kelas</label>
            <select id="datp-kelas" class="dtp-form-control atp">
              <option value="">-- Pilih Kelas --</option>
              <option value="1">Kelas 1</option><option value="2">Kelas 2</option>
              <option value="3">Kelas 3</option><option value="4">Kelas 4</option>
              <option value="5">Kelas 5</option><option value="6">Kelas 6</option>
            </select>
          </div>
          <div class="dtp-form-group">
            <label>📚 Mata Pelajaran</label>
            <select id="datp-mapel" class="dtp-form-control atp">${mapelOptions}</select>
          </div>
        </div>
        <div class="dtp-form-grid">
          <div class="dtp-form-group">
            <label>🎓 Fase</label>
            <select id="datp-fase" class="dtp-form-control atp">
              <option value="">-- Pilih Fase --</option>
              <option value="A">Fase A (Kelas 1-2)</option>
              <option value="B">Fase B (Kelas 3-4)</option>
              <option value="C">Fase C (Kelas 5-6)</option>
            </select>
          </div>
          <div class="dtp-form-group">
            <label>📅 Semester</label>
            <select id="datp-semester" class="dtp-form-control atp">${semesterOptions}</select>
          </div>
        </div>
        <div class="dtp-form-group">
          <label>📌 Judul / Topik ATP</label>
          <input type="text" id="datp-judul" class="dtp-form-control atp" placeholder="Contoh: Alur Tujuan Pembelajaran IPAS Kelas 4 - Makhluk Hidup">
        </div>
        <div class="dtp-form-group">
          <label>🔗 Tabel Kelas, Elemen, ATP & Materi</label>
          <div class="dtp-table-wrap">
            <table class="dtp-table atp">
              <thead><tr><th style="width:10%">Kelas</th><th style="width:22%">Elemen</th><th style="width:42%">ATP</th><th style="width:20%">Materi</th><th style="width:6%">❌</th></tr></thead>
              <tbody id="datp-tbody"></tbody>
            </table>
          </div>
          <button type="button" class="dtp-btn dtp-btn-add" id="btn-add-row-atp">➕ Tambah Baris</button>
          <p style="font-size: 12px; color: #6366f1; margin-top: 5px;">💡 ATP adalah urutan logis TP yang disusun dari yang sederhana ke kompleks. Data ini akan otomatis bisa dipilih di Prota, Promes, dan RPM.</p>
        </div>
        <div class="dtp-form-group">
          <label>📝 Catatan / Rasional ATP (Opsional)</label>
          <textarea id="datp-catatan" class="dtp-form-control atp" rows="3" placeholder="Contoh: ATP ini disusun berdasarkan CP Fase B dengan pendekatan inkuiri..."></textarea>
        </div>
      </div>
      <div class="dtp-actions">
        <button class="dtp-btn dtp-btn-indigo" id="btn-simpan-atp">💾 Simpan ATP</button>
        <button class="dtp-btn dtp-btn-warning" id="btn-export-atp">📥 Export Word</button>
        <button class="dtp-btn dtp-btn-secondary" id="btn-reset-atp">🔄 Reset</button>
      </div>
    </div>

    <!-- LIST ATP -->
    <div id="dtp-atp-list-section" style="display: none;">
      <div class="dtp-section">
        <h3 class="dtp-section-title atp">🔍 Filter Data ATP</h3>
        <div class="dtp-filters atp">
          <select id="filter-atp-kelas" class="dtp-form-control atp" style="flex: 1;">
            <option value="">Semua Kelas</option>
            <option value="1">Kelas 1</option><option value="2">Kelas 2</option>
            <option value="3">Kelas 3</option><option value="4">Kelas 4</option>
            <option value="5">Kelas 5</option><option value="6">Kelas 6</option>
          </select>
          <select id="filter-atp-semester" class="dtp-form-control atp" style="flex: 1;">${filterSemesterOptions}</select>
          <select id="filter-atp-fase" class="dtp-form-control atp" style="flex: 1;">
            <option value="">Semua Fase</option>
            <option value="A">Fase A</option><option value="B">Fase B</option><option value="C">Fase C</option>
          </select>
          <select id="filter-atp-mapel" class="dtp-form-control atp" style="flex: 2;">
            <option value="">Semua Mapel</option>
            ${mapelOptions}
          </select>
          <input type="text" id="filter-atp-judul" class="dtp-form-control atp" style="flex: 2;" placeholder="Cari judul ATP...">
        </div>
        <h3 class="dtp-section-title atp">🗂️ Daftar Alur Tujuan Pembelajaran (ATP)</h3>
        <div id="datp-list-container">
          <div class="dtp-loading">⏳ Memuat data ATP...</div>
        </div>
      </div>
    </div>
  </div>
  `;
}

function attachEvents(container) {
  container.querySelectorAll('.dtp-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      container.querySelectorAll('.dtp-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const target = tab.dataset.tab;
      container.querySelector('#dtp-form-section').style.display = 'none';
      container.querySelector('#dtp-list-section').style.display = 'none';
      container.querySelector('#dtp-cp-form-section').style.display = 'none';
      container.querySelector('#dtp-cp-list-section').style.display = 'none';
      container.querySelector('#dtp-atp-form-section').style.display = 'none';
      container.querySelector('#dtp-atp-list-section').style.display = 'none';
      if (target === 'tp-form') container.querySelector('#dtp-form-section').style.display = 'block';
      else if (target === 'tp-list') container.querySelector('#dtp-list-section').style.display = 'block';
      else if (target === 'cp-form') container.querySelector('#dtp-cp-form-section').style.display = 'block';
      else if (target === 'cp-list') container.querySelector('#dtp-cp-list-section').style.display = 'block';
      else if (target === 'atp-form') container.querySelector('#dtp-atp-form-section').style.display = 'block';
      else if (target === 'atp-list') container.querySelector('#dtp-atp-list-section').style.display = 'block';
    });
  });

  // Tombol tambah baris (MODEL BARU)
  container.querySelector('#btn-add-row-tp').addEventListener('click', () => addTableRow('dtp-tbody', 'tp', PH_TP));
  container.querySelector('#btn-add-row-cp').addEventListener('click', () => addTableRow('dcp-tbody', 'deskripsi', PH_CP));
  container.querySelector('#btn-add-row-atp').addEventListener('click', () => addTableRow('datp-tbody', 'atp', PH_ATP));

  container.querySelector('#btn-simpan-tp').addEventListener('click', () => handleSimpanTP(container));
  container.querySelector('#btn-export-tp').addEventListener('click', () => handleExportTP(container));
  container.querySelector('#btn-reset-tp').addEventListener('click', () => {
    if (confirm('🔄 Reset form TP?')) {
      currentEditId = null;
      container.querySelector('#dtp-kelas').value = '';
      container.querySelector('#dtp-mapel').value = '';
      container.querySelector('#dtp-semester').value = '1';
      container.querySelector('#dtp-topik').value = '';
      resetTable('dtp-tbody', 'tp', PH_TP);
      showToast('✅ Form TP direset!');
    }
  });

  container.querySelector('#btn-simpan-cp').addEventListener('click', () => handleSimpanCP(container));
  container.querySelector('#btn-export-cp').addEventListener('click', () => handleExportCP(container));
  container.querySelector('#btn-reset-cp').addEventListener('click', () => {
    if (confirm('🔄 Reset form CP?')) {
      currentEditCPId = null;
      container.querySelector('#dcp-fase').value = '';
      container.querySelector('#dcp-mapel').value = '';
      container.querySelector('#dcp-semester').value = '1';
      resetTable('dcp-tbody', 'deskripsi', PH_CP);
      showToast('✅ Form CP direset!');
    }
  });

  container.querySelector('#btn-simpan-atp').addEventListener('click', () => handleSimpanATP(container));
  container.querySelector('#btn-export-atp').addEventListener('click', () => handleExportATP(container));
  container.querySelector('#btn-reset-atp').addEventListener('click', () => {
    if (confirm('🔄 Reset form ATP?')) {
      currentEditATPId = null;
      container.querySelector('#datp-kelas').value = '';
      container.querySelector('#datp-mapel').value = '';
      container.querySelector('#datp-fase').value = '';
      container.querySelector('#datp-semester').value = '1';
      container.querySelector('#datp-judul').value = '';
      container.querySelector('#datp-catatan').value = '';
      resetTable('datp-tbody', 'atp', PH_ATP);
      showToast('✅ Form ATP direset!');
    }
  });

  ['filter-kelas', 'filter-semester', 'filter-mapel', 'filter-topik'].forEach(id => {
    const el = container.querySelector(`#${id}`);
    if (el) el.addEventListener('input', () => loadDataTP(container));
    if (el && el.tagName === 'SELECT') el.addEventListener('change', () => loadDataTP(container));
  });
  ['filter-cp-fase', 'filter-cp-semester', 'filter-cp-mapel'].forEach(id => {
    const el = container.querySelector(`#${id}`);
    if (el) el.addEventListener('change', () => loadDataCP(container));
  });
  ['filter-atp-kelas', 'filter-atp-semester', 'filter-atp-fase', 'filter-atp-mapel', 'filter-atp-judul'].forEach(id => {
    const el = container.querySelector(`#${id}`);
    if (el) el.addEventListener('input', () => loadDataATP(container));
    if (el && el.tagName === 'SELECT') el.addEventListener('change', () => loadDataATP(container));
  });
}

// ========== FUNGSI TP (LOGIC LAMA DIPERTAHANKAN + MODEL TABEL + KOLOM KELAS) ==========
async function handleSimpanTP(container) {
  const kelas = container.querySelector('#dtp-kelas').value;
  const mapel = container.querySelector('#dtp-mapel').value;
  const semester = container.querySelector('#dtp-semester').value;
  const topik = container.querySelector('#dtp-topik').value.trim();
  const rows = readTableRows('dtp-tbody', 'tp').filter(r => r.tp);
  if (!kelas || !mapel || !topik || rows.length === 0) {
    showToast('⚠️ Lengkapi semua field (Kelas, Mapel, Topik, dan tabel TP)!', 'error');
    return;
  }
  // Field lama (array string) tetap disimpan utk kompatibilitas fitur lain
  const tujuan_pembelajaran = rows.map(r => r.tp);
  try {
    if (currentEditId) {
      const docRef = doc(db, 'data_tp', currentEditId);
      await updateDoc(docRef, { kelas, mapel, semester, topik, tujuan_pembelajaran, tp_rows: rows, updatedAt: serverTimestamp() });
      showToast('✅ Data TP berhasil diupdate!');
      currentEditId = null;
    } else {
      await addDoc(collection(db, 'data_tp'), { userId: currentUser.uid, kelas, mapel, semester, topik, tujuan_pembelajaran, tp_rows: rows, createdAt: serverTimestamp() });
      showToast('✅ Data TP berhasil disimpan!');
    }
    container.querySelector('#btn-reset-tp').click();
    container.querySelector('[data-tab="tp-list"]').click();
  } catch (error) {
    console.error('Error saving TP:', error);
    showToast('❌ Gagal menyimpan: ' + error.message, 'error');
  }
}

function loadDataTP(container) {
  const listContainer = container.querySelector('#dtp-list-container');
  const filterKelas = container.querySelector('#filter-kelas')?.value || '';
  const filterSemester = container.querySelector('#filter-semester')?.value || '';
  const filterMapel = container.querySelector('#filter-mapel')?.value || '';
  const filterTopik = container.querySelector('#filter-topik')?.value.toLowerCase() || '';
  const q = query(collection(db, 'data_tp'), where('userId', '==', currentUser.uid));
  onSnapshot(q, (snapshot) => {
    if (snapshot.empty) {
      lastTPData = [];
      listContainer.innerHTML = '<div class="dtp-empty">📭 Belum ada Data TP tersimpan.</div>';
      return;
    }
    let allData = [];
    snapshot.forEach(docSnap => { allData.push({ id: docSnap.id, ...docSnap.data() }); });
    let filteredData = allData.filter(item => {
      const matchKelas = !filterKelas || item.kelas === filterKelas;
      const matchSemester = !filterSemester || String(item.semester || '') === filterSemester;
      const matchMapel = !filterMapel || item.mapel === filterMapel;
      const matchTopik = !filterTopik || (item.topik || '').toLowerCase().includes(filterTopik);
      return matchKelas && matchSemester && matchMapel && matchTopik;
    });
    filteredData.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    lastTPData = filteredData;
    if (filteredData.length === 0) {
      listContainer.innerHTML = '<div class="dtp-empty">🔍 Tidak ada data yang cocok dengan filter.</div>';
      return;
    }
    listContainer.innerHTML = filteredData.map(d => {
      const rows = normalizeTPRows(d);
      return `<div class="dtp-item"> <div class="dtp-item-header"> <div> <div class="dtp-item-title">${d.mapel} - Kelas ${d.kelas} | Semester ${d.semester}</div> <div class="dtp-item-meta">${d.topik} - ${rows.length} TP</div> </div> <div class="dtp-item-actions"> <button onclick="editDataTP('${d.id}')" style="background: #3b82f6;">✏️ Edit</button> <button onclick="deleteDataTP('${d.id}')" style="background: #ef4444;">🗑️ Hapus</button> </div> </div> ${tableViewHTML(rows, 'TP')} </div>`;
    }).join('');
  }, (error) => {
    console.warn('Error loading data TP:', error);
    listContainer.innerHTML = '<div class="dtp-empty">❌ Gagal memuat data.</div>';
  });
}

window.editDataTP = async function (id) {
  try {
    const { getDoc, doc } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
    const docRef = doc(db, 'data_tp', id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) { showToast('❌ Data tidak ditemukan!', 'error'); return; }
    const d = docSnap.data();
    currentEditId = id;
    document.querySelector('#dtp-kelas').value = d.kelas || '';
    document.querySelector('#dtp-mapel').value = d.mapel || '';
    document.querySelector('#dtp-semester').value = d.semester || '1';
    document.querySelector('#dtp-topik').value = d.topik || '';
    const tbody = document.querySelector('#dtp-tbody');
    tbody.innerHTML = '';
    normalizeTPRows(d).forEach(r => addTableRow('dtp-tbody', 'tp', PH_TP, r));
    if (!tbody.querySelector('tr')) addTableRow('dtp-tbody', 'tp', PH_TP);
    document.querySelector('[data-tab="tp-form"]').click();
    showToast('✅ Data TP dimuat untuk diedit!');
  } catch (error) {
    console.error('Error loading data TP:', error);
    showToast('❌ Gagal memuat data!', 'error');
  }
};

window.deleteDataTP = async function (id) {
  if (!confirm('⚠️ Yakin hapus Data TP ini?')) return;
  try { await deleteDoc(doc(db, 'data_tp', id)); showToast('✅ Data TP berhasil dihapus!'); }
  catch (error) { console.error('Error deleting:', error); showToast('❌ Gagal menghapus!', 'error'); }
};

function handleExportTP(container) {
  const filterKelas = container.querySelector('#filter-kelas')?.value || 'Semua';
  const filterSemester = container.querySelector('#filter-semester')?.value || 'Semua';
  const filterMapel = container.querySelector('#filter-mapel')?.value || 'Semua';
  if (lastTPData.length === 0) { showToast('⚠️ Tidak ada data untuk diexport!', 'error'); return; }
  let html = `<html><head><meta charset="utf-8"><title>Master Data TP</title><style>body{font-family:'Times New Roman',serif;margin:2cm;line-height:1.6;}h1{text-align:center;font-size:16pt;}table{border-collapse:collapse;width:100%;margin-top:10px;}th,td{border:1px solid #000;padding:6px 8px;font-size:11pt;text-align:left;vertical-align:top;}th{background:#eeeeee;}.item{margin-bottom:25px;page-break-inside:avoid;}.item-header{font-weight:bold;font-size:12pt;margin-bottom:4px;color:#7c3aed;}.meta{font-size:11pt;color:#64748b;}</style></head><body><h1>MASTER DATA TUJUAN PEMBELAJARAN (TP)</h1><p style="text-align:center;">SDN 139 LAMANDA | Filter: Kelas ${filterKelas} | Semester ${filterSemester} | Mapel ${filterMapel}</p><hr>`;
  lastTPData.forEach(d => {
    const rows = normalizeTPRows(d);
    html += `<div class="item"><div class="item-header">${escapeHtml(d.mapel)} - Kelas ${escapeHtml(d.kelas)} | Semester ${escapeHtml(d.semester)}</div><div class="meta">${escapeHtml(d.topik)}</div><table><tr><th style="width:10%">Kelas</th><th style="width:22%">Elemen</th><th style="width:40%">TP</th><th style="width:28%">Materi</th></tr>${rows.map(r => `<tr><td>${escapeHtml(r.kelas || '')}</td><td>${escapeHtml(r.elemen || '')}</td><td>${escapeHtml(r.tp || '')}</td><td>${escapeHtml(r.materi || '')}</td></tr>`).join('')}</table></div>`;
  });
  html += `</body></html>`;
  const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href = url; link.download = `Master_Data_TP_Kelas${filterKelas}_${filterMapel}.doc`;
  document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url);
  showToast('📥 Word berhasil diunduh!');
}

// ========== FUNGSI CP (LOGIC LAMA DIPERTAHANKAN + MODEL TABEL + SEMESTER + KOLOM KELAS) ==========
async function handleSimpanCP(container) {
  const fase = container.querySelector('#dcp-fase').value;
  const mapel = container.querySelector('#dcp-mapel').value;
  const semester = container.querySelector('#dcp-semester').value;
  const rows = readTableRows('dcp-tbody', 'deskripsi').filter(r => r.elemen && r.deskripsi);
  if (!fase || !mapel || rows.length === 0) { showToast('⚠️ Lengkapi semua field (Fase, Mapel, dan tabel CP)!', 'error'); return; }
  try {
    if (currentEditCPId) {
      const docRef = doc(db, 'data_cp', currentEditCPId);
      await updateDoc(docRef, { fase, mapel, semester, elemen_cp: rows, updatedAt: serverTimestamp() });
      showToast('✅ Data CP berhasil diupdate!'); currentEditCPId = null;
    } else {
      await addDoc(collection(db, 'data_cp'), { userId: currentUser.uid, fase, mapel, semester, elemen_cp: rows, createdAt: serverTimestamp() });
      showToast('✅ Data CP berhasil disimpan!');
    }
    container.querySelector('#btn-reset-cp').click();
    container.querySelector('[data-tab="cp-list"]').click();
  } catch (error) { console.error('Error saving CP:', error); showToast('❌ Gagal menyimpan: ' + error.message, 'error'); }
}

function loadDataCP(container) {
  const listContainer = container.querySelector('#dcp-list-container');
  const filterFase = container.querySelector('#filter-cp-fase')?.value || '';
  const filterSemester = container.querySelector('#filter-cp-semester')?.value || '';
  const filterMapel = container.querySelector('#filter-cp-mapel')?.value || '';
  const q = query(collection(db, 'data_cp'), where('userId', '==', currentUser.uid));
  onSnapshot(q, (snapshot) => {
    if (snapshot.empty) { lastCPData = []; listContainer.innerHTML = '<div class="dtp-empty">📭 Belum ada Data CP tersimpan.</div>'; return; }
    let allData = []; snapshot.forEach(docSnap => { allData.push({ id: docSnap.id, ...docSnap.data() }); });
    let filteredData = allData.filter(item => {
      const matchFase = !filterFase || item.fase === filterFase;
      const matchSemester = !filterSemester || String(item.semester || '') === filterSemester;
      const matchMapel = !filterMapel || item.mapel === filterMapel;
      return matchFase && matchSemester && matchMapel;
    });
    filteredData.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    lastCPData = filteredData;
    if (filteredData.length === 0) { listContainer.innerHTML = '<div class="dtp-empty">🔍 Tidak ada data yang cocok dengan filter.</div>'; return; }
    listContainer.innerHTML = filteredData.map(d => {
      const rows = normalizeCPRows(d);
      return `<div class="dtp-item"> <div class="dtp-item-header"> <div> <div class="dtp-item-title">${d.mapel} - Fase ${d.fase}</div> <div class="dtp-item-meta">${rows.length} Elemen CP | Semester ${d.semester || '-'}</div> </div> <div class="dtp-item-actions"> <button onclick="editDataCP('${d.id}')" style="background: #3b82f6;">✏️ Edit</button> <button onclick="deleteDataCP('${d.id}')" style="background: #ef4444;">🗑️ Hapus</button> </div> </div> ${tableViewHTML(rows, 'CP')} </div>`;
    }).join('');
  }, (error) => { console.warn('Error loading data CP:', error); listContainer.innerHTML = '<div class="dtp-empty">❌ Gagal memuat data.</div>'; });
}

window.editDataCP = async function (id) {
  try {
    const { getDoc, doc } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
    const docRef = doc(db, 'data_cp', id); const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) { showToast('❌ Data tidak ditemukan!', 'error'); return; }
    const d = docSnap.data(); currentEditCPId = id;
    document.querySelector('#dcp-fase').value = d.fase || '';
    document.querySelector('#dcp-mapel').value = d.mapel || '';
    document.querySelector('#dcp-semester').value = d.semester || '1';
    const tbody = document.querySelector('#dcp-tbody');
    tbody.innerHTML = '';
    normalizeCPRows(d).forEach(r => addTableRow('dcp-tbody', 'deskripsi', PH_CP, r));
    if (!tbody.querySelector('tr')) addTableRow('dcp-tbody', 'deskripsi', PH_CP);
    document.querySelector('[data-tab="cp-form"]').click(); showToast('✅ Data CP dimuat untuk diedit!');
  } catch (error) { console.error('Error loading data CP:', error); showToast('❌ Gagal memuat data!', 'error'); }
};

window.deleteDataCP = async function (id) {
  if (!confirm('⚠️ Yakin hapus Data CP ini?')) return;
  try { await deleteDoc(doc(db, 'data_cp', id)); showToast('✅ Data CP berhasil dihapus!'); }
  catch (error) { console.error('Error deleting:', error); showToast('❌ Gagal menghapus!', 'error'); }
};

function handleExportCP(container) {
  const filterFase = container.querySelector('#filter-cp-fase')?.value || 'Semua';
  const filterSemester = container.querySelector('#filter-cp-semester')?.value || 'Semua';
  const filterMapel = container.querySelector('#filter-cp-mapel')?.value || 'Semua';
  if (lastCPData.length === 0) { showToast('⚠️ Tidak ada data untuk diexport!', 'error'); return; }
  let html = `<html><head><meta charset="utf-8"><title>Master Data CP</title><style>body{font-family:'Times New Roman',serif;margin:2cm;line-height:1.6;}h1{text-align:center;font-size:16pt;margin-bottom:5px;}table{border-collapse:collapse;width:100%;margin-top:10px;}th,td{border:1px solid #000;padding:6px 8px;font-size:11pt;text-align:left;vertical-align:top;}th{background:#eeeeee;}.item{margin-bottom:25px;page-break-inside:avoid;}.item-header{font-weight:bold;font-size:12pt;margin-bottom:4px;color:#7c3aed;}.meta{font-size:11pt;color:#64748b;}</style></head><body><h1>MASTER DATA CAPAIAN PEMBELAJARAN (CP)</h1><p style="text-align:center;">SDN 139 LAMANDA | Filter: Fase ${filterFase} | Semester ${filterSemester} | Mapel ${filterMapel}</p><hr>`;
  lastCPData.forEach(d => {
    const rows = normalizeCPRows(d);
    html += `<div class="item"><div class="item-header">${escapeHtml(d.mapel)} - Fase ${escapeHtml(d.fase)} | Semester ${escapeHtml(d.semester || '-')}</div><table><tr><th style="width:10%">Kelas</th><th style="width:22%">Elemen</th><th style="width:40%">CP</th><th style="width:28%">Materi</th></tr>${rows.map(r => `<tr><td>${escapeHtml(r.kelas || '')}</td><td>${escapeHtml(r.elemen || '')}</td><td>${escapeHtml(r.deskripsi || '')}</td><td>${escapeHtml(r.materi || '')}</td></tr>`).join('')}</table></div>`;
  });
  html += `</body></html>`;
  const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href = url; link.download = `Master_Data_CP_Fase${filterFase}_${filterMapel}.doc`;
  document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url);
  showToast('📥 Word berhasil diunduh!');
}

// ========== FUNGSI ATP (LOGIC LAMA DIPERTAHANKAN + MODEL TABEL + KOLOM KELAS) ==========
async function handleSimpanATP(container) {
  const kelas = container.querySelector('#datp-kelas').value;
  const mapel = container.querySelector('#datp-mapel').value;
  const fase = container.querySelector('#datp-fase').value;
  const semester = container.querySelector('#datp-semester').value;
  const judul = container.querySelector('#datp-judul').value.trim();
  const catatan = container.querySelector('#datp-catatan').value.trim();
  const rows = readTableRows('datp-tbody', 'atp').filter(r => r.atp);
  if (!kelas || !mapel || !fase || !judul || rows.length === 0) {
    showToast('⚠️ Lengkapi Kelas, Mapel, Fase, Judul dan tabel ATP!', 'error');
    return;
  }
  // Field lama (alur array string) tetap disimpan utk kompatibilitas Prota/Promes/RPM
  const alur = rows.map(r => r.atp);
  try {
    if (currentEditATPId) {
      const docRef = doc(db, 'data_atp', currentEditATPId);
      await updateDoc(docRef, { kelas, mapel, fase, semester, judul, alur, atp_rows: rows, catatan, updatedAt: serverTimestamp() });
      showToast('✅ Data ATP berhasil diupdate!');
      currentEditATPId = null;
    } else {
      await addDoc(collection(db, 'data_atp'), { userId: currentUser.uid, kelas, mapel, fase, semester, judul, alur, atp_rows: rows, catatan, createdAt: serverTimestamp() });
      showToast('✅ Data ATP berhasil disimpan!');
    }
    container.querySelector('#btn-reset-atp').click();
    container.querySelector('[data-tab="atp-list"]').click();
  } catch (error) {
    console.error('Error saving ATP:', error);
    showToast('❌ Gagal menyimpan ATP: ' + error.message, 'error');
  }
}

function loadDataATP(container) {
  const listContainer = container.querySelector('#datp-list-container');
  const filterKelas = container.querySelector('#filter-atp-kelas')?.value || '';
  const filterSemester = container.querySelector('#filter-atp-semester')?.value || '';
  const filterFase = container.querySelector('#filter-atp-fase')?.value || '';
  const filterMapel = container.querySelector('#filter-atp-mapel')?.value || '';
  const filterJudul = container.querySelector('#filter-atp-judul')?.value.toLowerCase() || '';
  const q = query(collection(db, 'data_atp'), where('userId', '==', currentUser.uid));
  onSnapshot(q, (snapshot) => {
    if (snapshot.empty) {
      lastATPData = [];
      listContainer.innerHTML = '<div class="dtp-empty">📭 Belum ada Data ATP tersimpan.<br><small>Silakan buat ATP pertama Anda di tab Input ATP.</small></div>';
      return;
    }
    let allData = [];
    snapshot.forEach(docSnap => { allData.push({ id: docSnap.id, ...docSnap.data() }); });
    let filteredData = allData.filter(item => {
      const matchKelas = !filterKelas || item.kelas === filterKelas;
      const matchSemester = !filterSemester || String(item.semester || '') === filterSemester;
      const matchFase = !filterFase || item.fase === filterFase;
      const matchMapel = !filterMapel || item.mapel === filterMapel;
      const matchJudul = !filterJudul || (item.judul || '').toLowerCase().includes(filterJudul);
      return matchKelas && matchSemester && matchFase && matchMapel && matchJudul;
    });
    filteredData.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    lastATPData = filteredData;
    if (filteredData.length === 0) {
      listContainer.innerHTML = '<div class="dtp-empty">🔍 Tidak ada data ATP yang cocok dengan filter.</div>';
      return;
    }
    listContainer.innerHTML = filteredData.map(d => {
      const rows = normalizeATPRows(d);
      return `<div class="dtp-item atp-item"> <div class="dtp-item-header"> <div> <div class="dtp-item-title atp">${d.judul || `${d.mapel} - Kelas ${d.kelas}`}</div> <div class="dtp-item-meta">${d.mapel} | Kelas ${d.kelas} | Fase ${d.fase} | Semester ${d.semester} | ${rows.length} Alur</div> </div> <div class="dtp-item-actions"> <button onclick="editDataATP('${d.id}')" style="background: #4f46e5;">✏️ Edit</button> <button onclick="deleteDataATP('${d.id}')" style="background: #ef4444;">🗑️ Hapus</button> </div> </div> ${tableViewHTML(rows, 'ATP', true)} ${d.catatan ? `<div style="margin-top:10px; font-size:12px; color:#6366f1; font-style:italic;">📝 ${escapeHtml(d.catatan)}</div>` : ''} </div>`;
    }).join('');
  }, (error) => {
    console.warn('Error loading data ATP:', error);
    listContainer.innerHTML = '<div class="dtp-empty">❌ Gagal memuat data ATP. Pastikan rules Firestore untuk koleksi data_atp sudah ditambahkan.<br><small>' + error.message + '</small></div>';
  });
}

window.editDataATP = async function (id) {
  try {
    const { getDoc, doc } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
    const docRef = doc(db, 'data_atp', id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) { showToast('❌ Data ATP tidak ditemukan!', 'error'); return; }
    const d = docSnap.data();
    currentEditATPId = id;
    document.querySelector('#datp-kelas').value = d.kelas || '';
    document.querySelector('#datp-mapel').value = d.mapel || '';
    document.querySelector('#datp-fase').value = d.fase || '';
    document.querySelector('#datp-semester').value = d.semester || '1';
    document.querySelector('#datp-judul').value = d.judul || '';
    document.querySelector('#datp-catatan').value = d.catatan || '';
    const tbody = document.querySelector('#datp-tbody');
    tbody.innerHTML = '';
    normalizeATPRows(d).forEach(r => addTableRow('datp-tbody', 'atp', PH_ATP, r));
    if (!tbody.querySelector('tr')) addTableRow('datp-tbody', 'atp', PH_ATP);
    document.querySelector('[data-tab="atp-form"]').click();
    showToast('✅ Data ATP dimuat untuk diedit!');
  } catch (error) {
    console.error('Error loading ATP:', error);
    showToast('❌ Gagal memuat data ATP!', 'error');
  }
};

window.deleteDataATP = async function (id) {
  if (!confirm('⚠️ Yakin hapus Data ATP ini?')) return;
  try { await deleteDoc(doc(db, 'data_atp', id)); showToast('✅ Data ATP berhasil dihapus!'); }
  catch (error) { console.error('Error deleting ATP:', error); showToast('❌ Gagal menghapus ATP!', 'error'); }
};

function handleExportATP(container) {
  const filterKelas = container.querySelector('#filter-atp-kelas')?.value || 'Semua';
  const filterSemester = container.querySelector('#filter-atp-semester')?.value || 'Semua';
  const filterMapel = container.querySelector('#filter-atp-mapel')?.value || 'Semua';
  if (lastATPData.length === 0) { showToast('⚠️ Tidak ada data ATP untuk diexport!', 'error'); return; }
  let html = `<html><head><meta charset="utf-8"><title>Master Data ATP</title><style>body{font-family:'Times New Roman',serif;margin:2cm;line-height:1.6;}h1{text-align:center;font-size:16pt;margin-bottom:5px;}table{border-collapse:collapse;width:100%;margin-top:10px;}th,td{border:1px solid #000;padding:6px 8px;font-size:11pt;text-align:left;vertical-align:top;}th{background:#eeeeee;}.item{margin-bottom:25px;page-break-inside:avoid;}.item-header{font-weight:bold;font-size:12pt;margin-bottom:4px;color:#4338ca;}.meta{font-size:11pt;color:#64748b;}.catatan{margin-top:8px;font-style:italic;color:#6366f1;}</style></head><body><h1>MASTER DATA ALUR TUJUAN PEMBELAJARAN (ATP)</h1><p style="text-align:center;">SDN 139 LAMANDA | Filter: Kelas ${filterKelas} | Semester ${filterSemester} | Mapel ${filterMapel}</p><hr>`;
  lastATPData.forEach(d => {
    const rows = normalizeATPRows(d);
    html += `<div class="item"><div class="item-header">${escapeHtml(d.judul || `${d.mapel} - Kelas ${d.kelas}`)}</div><div class="meta">${escapeHtml(d.mapel)} | Kelas ${escapeHtml(d.kelas)} | Fase ${escapeHtml(d.fase)} | Semester ${escapeHtml(d.semester)}</div><table><tr><th style="width:10%">Kelas</th><th style="width:22%">Elemen</th><th style="width:40%">ATP</th><th style="width:28%">Materi</th></tr>${rows.map(r => `<tr><td>${escapeHtml(r.kelas || '')}</td><td>${escapeHtml(r.elemen || '')}</td><td>${escapeHtml(r.atp || '')}</td><td>${escapeHtml(r.materi || '')}</td></tr>`).join('')}</table>${d.catatan ? `<div class="catatan">📝 ${escapeHtml(d.catatan)}</div>` : ''}</div>`;
  });
  html += `</body></html>`;
  const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href = url; link.download = `Master_Data_ATP_Kelas${filterKelas}_${filterMapel}.doc`;
  document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url);
  showToast('📥 Word ATP berhasil diunduh!');
}

function showToast(msg, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `dtp-toast dtp-toast-${type}`;
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(400px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
