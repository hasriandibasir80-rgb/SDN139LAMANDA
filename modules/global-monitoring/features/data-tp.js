// modules/global-monitoring/features/data-tp.js
// =========================================
// FITUR: DATA TP, CP & ATP (MASTER DATA)
// FUNGSI: Single Source of Truth untuk seluruh sub-fitur Admin Pembelajaran
// TERINTEGRASI: Firestore (Collection: 'data_tp', 'data_cp', 'data_atp')
// UPDATE: Penambahan Master ATP (Input ATP & Daftar ATP) - 06/08/2026
// CATATAN: Semua logic lama TP & CP dipertahankan 100%
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

const FALLBACK_MAPEL = [
  { id: 'paibd', nama: 'Pendidikan Agama Islam dan Budi Pekerti', singkatan: 'PAIBD', icon: '🕌' },
  { id: 'matematika', nama: 'Matematika', singkatan: 'Matematika', icon: '🔢' },
  { id: 'ipas', nama: 'IPAS', singkatan: 'IPAS', icon: '🔬' },
  { id: 'pjok', nama: 'PJOK', singkatan: 'PJOK', icon: '⚽' },
  { id: 'bahasa-indonesia', nama: 'Bahasa Indonesia', singkatan: 'Bhs.Indonesia', icon: '📖' },
  { id: 'pendidikan-pancasila', nama: 'Pendidikan Pancasila', singkatan: 'Pendidikan Pancasila', icon: '🇮🇩' },
  { id: 'seni-budaya', nama: 'Seni dan Budaya', singkatan: 'Seni dan Budaya', icon: '🎨' },
  { id: 'bahasa-inggris', nama: 'Bahasa Inggris', singkatan: 'Bhs.Inggris', icon: '🇬🇧' },
  { id: 'coding-kka', nama: 'Coding/KKA', singkatan: 'Coding/KKA', icon: '💻' },
  { id: 'bahasa-ibu', nama: 'Bahasa Ibu', singkatan: 'Bhs.Ibu', icon: '🗣️' },
  { id: 'bta', nama: 'BTA', singkatan: 'BTA', icon: '📚' }
];

export async function init(container, db) {
  loadCSS();
  await loadMataPelajaran();
  renderUI(container);
  attachEvents(container);
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

function loadCSS() {
  if (document.getElementById(CSS_ID)) return;
  const style = document.createElement('style');
  style.id = CSS_ID;
  style.textContent = `
    .dtp-container { background: linear-gradient(135deg, #fce7f3 0%, #fbcfe8 50%, #e0e7ff 100%); border-radius: 16px; padding: 25px; font-family: 'Segoe UI', sans-serif; max-width: 1200px; margin: 0 auto; box-shadow: 0 8px 24px rgba(236, 72, 153, 0.15); }
    .dtp-header { background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); color: white; padding: 30px; border-radius: 12px; margin-bottom: 25px; box-shadow: 0 4px 12px rgba(236, 72, 153, 0.3); }
    .dtp-header h2 { margin: 0 0 8px 0; font-size: 28px; font-weight: 700; }
    .dtp-header p { margin: 0; opacity: 0.95; font-size: 15px; }
    .dtp-tabs { display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap; }
    .dtp-tab { padding: 12px 20px; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 13px; background: white; color: #be185d; transition: all 0.2s; }
    .dtp-tab.active { background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); color: white; }
    .dtp-tab.atp-tab { color: #4338ca; }
    .dtp-tab.atp-tab.active { background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); }
    .dtp-section { background: white; padding: 25px; border-radius: 12px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(236, 72, 153, 0.1); }
    .dtp-section-title { font-size: 18px; font-weight: 700; color: #be185d; margin: 0 0 15px 0; padding-bottom: 10px; border-bottom: 3px solid #fce7f3; }
    .dtp-section-title.atp { color: #4338ca; border-bottom-color: #ddd6fe; }
    .dtp-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px; }
    .dtp-form-group { margin-bottom: 15px; }
    .dtp-form-group label { display: block; margin-bottom: 6px; font-weight: 600; font-size: 13px; color: #831843; }
    .dtp-form-control { width: 100%; padding: 12px 14px; border: 2px solid #fbcfe8; border-radius: 8px; font-size: 14px; box-sizing: border-box; background: white; color: #831843; font-family: inherit; }
    .dtp-form-control:focus { outline: none; border-color: #ec4899; box-shadow: 0 0 0 3px rgba(236, 72, 153, 0.15); }
    .dtp-form-control.atp { border-color: #c7d2fe; color: #3730a3; }
    .dtp-form-control.atp:focus { border-color: #4f46e5; box-shadow: 0 0 0 3px rgba(79,70,229,.15); }
    textarea.dtp-form-control { resize: vertical; min-height: 120px; }
    select.dtp-form-control { cursor: pointer; }
    .dtp-btn { padding: 12px 24px; border: none; border-radius: 8px; font-weight: 600; font-size: 14px; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; transition: all 0.2s; color: white; }
    .dtp-btn:hover { transform: translateY(-2px); }
    .dtp-btn-primary { background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); }
    .dtp-btn-indigo { background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); }
    .dtp-btn-success { background: linear-gradient(135deg, #10b981 0%, #059669 100%); }
    .dtp-btn-warning { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); }
    .dtp-btn-danger { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); }
    .dtp-btn-secondary { background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%); }
    .dtp-actions { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 20px; justify-content: center; }
    .dtp-item { background: linear-gradient(135deg, #fff1f2 0%, #fce7f3 100%); padding: 15px; border-radius: 10px; margin-bottom: 10px; border-left: 4px solid #ec4899; }
    .dtp-item.atp-item { background: linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%); border-left-color: #4f46e5; }
    .dtp-item-header { display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px; flex-wrap: wrap; gap: 5px; }
    .dtp-item-title { font-weight: 700; color: #be185d; font-size: 15px; }
    .dtp-item-title.atp { color: #4338ca; }
    .dtp-item-meta { font-size: 12px; color: #64748b; }
    .dtp-item-actions { display: flex; gap: 5px; }
    .dtp-item-actions button { padding: 6px 12px; font-size: 12px; border: none; border-radius: 6px; cursor: pointer; color: white; }
    .dtp-empty { text-align: center; padding: 30px; color: #64748b; background: white; border-radius: 10px; }
    .dtp-loading { text-align: center; padding: 20px; color: #831843; }
    .dtp-toast { position: fixed; top: 20px; right: 20px; padding: 14px 24px; border-radius: 10px; z-index: 10001; color: white; font-weight: 600; box-shadow: 0 4px 16px rgba(0,0,0,0.15); animation: dtpSlideIn 0.3s ease; }
    .dtp-toast-success { background: linear-gradient(135deg, #10b981 0%, #059669 100%); }
    .dtp-toast-error { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); }
    @keyframes dtpSlideIn { from { transform: translateX(400px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    .dtp-tp-list { background: #f8fafc; padding: 15px; border-radius: 8px; margin-top: 10px; }
    .dtp-tp-list ol { margin: 0; padding-left: 20px; color: #334155; font-size: 14px; line-height: 1.6; }
    .dtp-atp-timeline { background: #f5f3ff; padding: 15px; border-radius: 8px; margin-top: 10px; border: 1px solid #ddd6fe; }
    .dtp-atp-timeline ol { margin: 0; padding-left: 20px; color: #4338ca; font-size: 14px; line-height: 1.8; }
    .dtp-atp-timeline li { margin-bottom: 6px; }
    .dtp-filters { display: flex; gap: 10px; margin-bottom: 15px; flex-wrap: wrap; }
    .dtp-filters select, .dtp-filters input { padding: 10px; border: 2px solid #fbcfe8; border-radius: 8px; font-size: 14px; }
    .dtp-filters.atp select, .dtp-filters.atp input { border-color: #c7d2fe; }
    .dtp-cp-elemen { background: #ede9fe; padding: 10px; border-radius: 6px; margin: 8px 0; border-left: 3px solid #8b5cf6; }
    .dtp-cp-elemen strong { color: #7c3aed; display: block; margin-bottom: 4px; }
    .dtp-cp-elemen p { margin: 0; color: #5b21b6; font-size: 14px; line-height: 1.5; }
    @media (max-width: 768px) { .dtp-form-grid { grid-template-columns: 1fr; } .dtp-actions { flex-direction: column; } .dtp-btn { width: 100%; justify-content: center; } .dtp-filters { flex-direction: column; } }
  `;
  document.head.appendChild(style);
}

function renderUI(container) {
  let mapelOptions = '<option value="">-- Pilih Mapel --</option>';
  dataMapel.forEach(m => {
    mapelOptions += `<option value="${m.nama}">${m.icon} ${m.singkatan}</option>`;
  });

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
                <option value="1">Kelas 1</option>
                <option value="2">Kelas 2</option>
                <option value="3">Kelas 3</option>
                <option value="4">Kelas 4</option>
                <option value="5">Kelas 5</option>
                <option value="6">Kelas 6</option>
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
              <select id="dtp-semester" class="dtp-form-control">
                <option value="1">Semester 1 (Ganjil)</option>
                <option value="2">Semester 2 (Genap)</option>
              </select>
            </div>
            <div class="dtp-form-group">
              <label>📝 Topik Pembelajaran</label>
              <input type="text" id="dtp-topik" class="dtp-form-control" placeholder="Contoh: Bagian Tubuh Tumbuhan">
            </div>
          </div>
          <div class="dtp-form-group">
            <label>🎯 Daftar Tujuan Pembelajaran (TP)</label>
            <textarea id="dtp-list-tp" class="dtp-form-control" placeholder="1. Siswa mampu mengidentifikasi bagian tubuh tumbuhan&#10;2. Siswa mampu menjelaskan fungsi akar, batang, dan daun&#10;(Pisahkan setiap TP dengan baris baru / Enter)"></textarea>
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
              <option value="1">Kelas 1</option>
              <option value="2">Kelas 2</option>
              <option value="3">Kelas 3</option>
              <option value="4">Kelas 4</option>
              <option value="5">Kelas 5</option>
              <option value="6">Kelas 6</option>
            </select>
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
          <div class="dtp-form-group">
            <label>📋 Elemen & Deskripsi CP</label>
            <textarea id="dcp-list-cp" class="dtp-form-control" rows="8" placeholder="Elemen: [Nama Elemen]&#10;Deskripsi: [Deskripsi capaian pembelajaran]&#10;&#10;Elemen: [Nama Elemen 2]&#10;Deskripsi: [Deskripsi capaian pembelajaran 2]&#10;&#10;(Pisahkan setiap elemen dengan baris kosong)"></textarea>
            <p style="font-size: 12px; color: #64748b; margin-top: 5px;">💡 Format: Tulis "Elemen: [nama]" diikuti "Deskripsi: [deskripsi]" untuk setiap elemen CP.</p>
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
              <option value="A">Fase A</option>
              <option value="B">Fase B</option>
              <option value="C">Fase C</option>
            </select>
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

      <!-- FORM ATP - BARU -->
      <div id="dtp-atp-form-section" style="display: none;">
        <div class="dtp-section">
          <h3 class="dtp-section-title atp">🔗 Informasi Alur Tujuan Pembelajaran (ATP)</h3>
          <div class="dtp-form-grid">
            <div class="dtp-form-group">
              <label>🎓 Kelas</label>
              <select id="datp-kelas" class="dtp-form-control atp">
                <option value="">-- Pilih Kelas --</option>
                <option value="1">Kelas 1</option>
                <option value="2">Kelas 2</option>
                <option value="3">Kelas 3</option>
                <option value="4">Kelas 4</option>
                <option value="5">Kelas 5</option>
                <option value="6">Kelas 6</option>
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
              <select id="datp-semester" class="dtp-form-control atp">
                <option value="1">Semester 1 (Ganjil)</option>
                <option value="2">Semester 2 (Genap)</option>
              </select>
            </div>
          </div>
          <div class="dtp-form-group">
            <label>📌 Judul / Topik ATP</label>
            <input type="text" id="datp-judul" class="dtp-form-control atp" placeholder="Contoh: Alur Tujuan Pembelajaran IPAS Kelas 4 - Makhluk Hidup">
          </div>
          <div class="dtp-form-group">
            <label>🔗 Urutan Alur Tujuan Pembelajaran</label>
            <textarea id="datp-alur" class="dtp-form-control atp" rows="10" placeholder="1. Siswa mampu memahami hakikat IPA dan metode ilmiah&#10;2. Siswa mampu mengidentifikasi bagian tumbuhan dan fungsinya&#10;3. Siswa mampu menjelaskan proses fotosintesis&#10;4. Siswa mampu membedakan makhluk hidup dan tak hidup&#10;5. Siswa mampu menjelaskan siklus hidup makhluk hidup&#10;&#10;(Tulis berurutan dari awal sampai akhir semester - Pisahkan dengan Enter)"></textarea>
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

      <!-- LIST ATP - BARU -->
      <div id="dtp-atp-list-section" style="display: none;">
        <div class="dtp-section">
          <h3 class="dtp-section-title atp">🔍 Filter Data ATP</h3>
          <div class="dtp-filters atp">
            <select id="filter-atp-kelas" class="dtp-form-control atp" style="flex: 1;">
              <option value="">Semua Kelas</option>
              <option value="1">Kelas 1</option>
              <option value="2">Kelas 2</option>
              <option value="3">Kelas 3</option>
              <option value="4">Kelas 4</option>
              <option value="5">Kelas 5</option>
              <option value="6">Kelas 6</option>
            </select>
            <select id="filter-atp-fase" class="dtp-form-control atp" style="flex: 1;">
              <option value="">Semua Fase</option>
              <option value="A">Fase A</option>
              <option value="B">Fase B</option>
              <option value="C">Fase C</option>
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

  container.querySelector('#btn-simpan-tp').addEventListener('click', () => handleSimpanTP(container));
  container.querySelector('#btn-export-tp').addEventListener('click', () => handleExportTP(container));
  container.querySelector('#btn-reset-tp').addEventListener('click', () => {
    if (confirm('🔄 Reset form TP?')) {
      currentEditId = null;
      container.querySelector('#dtp-kelas').value = '';
      container.querySelector('#dtp-mapel').value = '';
      container.querySelector('#dtp-semester').value = '1';
      container.querySelector('#dtp-topik').value = '';
      container.querySelector('#dtp-list-tp').value = '';
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
      container.querySelector('#dcp-list-cp').value = '';
      showToast('✅ Form CP direset!');
    }
  });

  // ATP Events - BARU
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
      container.querySelector('#datp-alur').value = '';
      container.querySelector('#datp-catatan').value = '';
      showToast('✅ Form ATP direset!');
    }
  });

  ['filter-kelas', 'filter-mapel', 'filter-topik'].forEach(id => {
    const el = container.querySelector(`#${id}`);
    if (el) el.addEventListener('input', () => loadDataTP(container));
  });
  ['filter-cp-fase', 'filter-cp-mapel'].forEach(id => {
    const el = container.querySelector(`#${id}`);
    if (el) el.addEventListener('change', () => loadDataCP(container));
  });
  ['filter-atp-kelas', 'filter-atp-fase', 'filter-atp-mapel', 'filter-atp-judul'].forEach(id => {
    const el = container.querySelector(`#${id}`);
    if (el) el.addEventListener('input', () => loadDataATP(container));
    if (el && el.tagName === 'SELECT') el.addEventListener('change', () => loadDataATP(container));
  });
}

// ========== FUNGSI TP - ORIGINAL DIPERTAHANKAN ==========
async function handleSimpanTP(container) {
  const kelas = container.querySelector('#dtp-kelas').value;
  const mapel = container.querySelector('#dtp-mapel').value;
  const semester = container.querySelector('#dtp-semester').value;
  const topik = container.querySelector('#dtp-topik').value.trim();
  const tpText = container.querySelector('#dtp-list-tp').value.trim();

  if (!kelas || !mapel || !topik || !tpText) {
    showToast('⚠️ Lengkapi semua field (Kelas, Mapel, Topik, dan TP)!', 'error');
    return;
  }

  const tujuan_pembelajaran = tpText.split('\n').map(t => t.trim()).filter(t => t.length > 0);

  try {
    if (currentEditId) {
      const docRef = doc(db, 'data_tp', currentEditId);
      await updateDoc(docRef, { kelas, mapel, semester, topik, tujuan_pembelajaran, updatedAt: serverTimestamp() });
      showToast('✅ Data TP berhasil diupdate!');
      currentEditId = null;
    } else {
      await addDoc(collection(db, 'data_tp'), { userId: currentUser.uid, kelas, mapel, semester, topik, tujuan_pembelajaran, createdAt: serverTimestamp() });
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
  const filterMapel = container.querySelector('#filter-mapel')?.value || '';
  const filterTopik = container.querySelector('#filter-topik')?.value.toLowerCase() || '';

  const q = query(collection(db, 'data_tp'), where('userId', '==', currentUser.uid));

  onSnapshot(q, (snapshot) => {
    if (snapshot.empty) {
      listContainer.innerHTML = '<div class="dtp-empty">📭 Belum ada Data TP tersimpan.</div>';
      return;
    }
    let allData = [];
    snapshot.forEach(docSnap => { allData.push({ id: docSnap.id, ...docSnap.data() }); });
    let filteredData = allData.filter(item => {
      const matchKelas = !filterKelas || item.kelas === filterKelas;
      const matchMapel = !filterMapel || item.mapel === filterMapel;
      const matchTopik = !filterTopik || (item.topik || '').toLowerCase().includes(filterTopik);
      return matchKelas && matchMapel && matchTopik;
    });
    filteredData.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    if (filteredData.length === 0) {
      listContainer.innerHTML = '<div class="dtp-empty">🔍 Tidak ada data yang cocok dengan filter.</div>';
      return;
    }
    listContainer.innerHTML = filteredData.map(d => `
        <div class="dtp-item">
          <div class="dtp-item-header">
            <div>
              <div class="dtp-item-title">${d.mapel} - Kelas ${d.kelas} | Semester ${d.semester}</div>
              <div class="dtp-item-meta">${d.topik} - ${(d.tujuan_pembelajaran || []).length} TP</div>
            </div>
            <div class="dtp-item-actions">
              <button onclick="editDataTP('${d.id}')" style="background: #3b82f6;">✏️ Edit</button>
              <button onclick="deleteDataTP('${d.id}')" style="background: #ef4444;">🗑️ Hapus</button>
            </div>
          </div>
          <div class="dtp-tp-list"><ol>${(d.tujuan_pembelajaran || []).map(tp => `<li>${tp}</li>`).join('')}</ol></div>
        </div>
      `).join('');
  }, (error) => {
    console.warn('Error loading data TP:', error);
    listContainer.innerHTML = '<div class="dtp-empty">❌ Gagal memuat data.</div>';
  });
}

window.editDataTP = async function(id) {
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
    document.querySelector('#dtp-list-tp').value = (d.tujuan_pembelajaran || []).join('\n');
    document.querySelector('[data-tab="tp-form"]').click();
    showToast('✅ Data TP dimuat untuk diedit!');
  } catch (error) {
    console.error('Error loading data TP:', error);
    showToast('❌ Gagal memuat data!', 'error');
  }
};

window.deleteDataTP = async function(id) {
  if (!confirm('⚠️ Yakin hapus Data TP ini?')) return;
  try { await deleteDoc(doc(db, 'data_tp', id)); showToast('✅ Data TP berhasil dihapus!'); }
  catch (error) { console.error('Error deleting:', error); showToast('❌ Gagal menghapus!', 'error'); }
};

function handleExportTP(container) {
  const filterKelas = container.querySelector('#filter-kelas')?.value || 'Semua';
  const filterMapel = container.querySelector('#filter-mapel')?.value || 'Semua';
  const items = container.querySelectorAll('#dtp-list-container .dtp-item');
  if (items.length === 0) { showToast('⚠️ Tidak ada data untuk diexport!', 'error'); return; }
  let html = `<html><head><meta charset="utf-8"><title>Master Data TP</title><style>body{font-family:'Times New Roman',serif;margin:2cm;line-height:1.6;}h1{text-align:center;font-size:16pt;}h2{font-size:13pt;border-bottom:2px solid #000;padding-bottom:5px;margin-top:20px;}.item{margin-bottom:25px;page-break-inside:avoid;border:1px solid #ddd;padding:15px;border-radius:8px;}.item-header{font-weight:bold;font-size:12pt;margin-bottom:10px;color:#7c3aed;}ol{margin:10px 0;padding-left:20px;}li{margin:5px 0;}</style></head><body><h1>MASTER DATA TUJUAN PEMBELAJARAN (TP)</h1><p style="text-align:center;">SDN 139 LAMANDA | Filter: Kelas ${filterKelas} | Mapel ${filterMapel}</p><hr>`;
  items.forEach(item => {
    const header = item.querySelector('.dtp-item-title').textContent;
    const meta = item.querySelector('.dtp-item-meta').textContent;
    const tpList = item.querySelector('.dtp-tp-list').innerHTML;
    html += `<div class="item"><div class="item-header">${header}</div><div style="font-size:11pt;color:#64748b;margin-bottom:10px;">${meta}</div>${tpList}</div>`;
  });
  html += `</body></html>`;
  const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href = url; link.download = `Master_Data_TP_Kelas${filterKelas}_${filterMapel}.doc`;
  document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url);
  showToast('📥 Word berhasil diunduh!');
}

// ========== FUNGSI CP - ORIGINAL DIPERTAHANKAN ==========
async function handleSimpanCP(container) {
  const fase = container.querySelector('#dcp-fase').value;
  const mapel = container.querySelector('#dcp-mapel').value;
  const cpText = container.querySelector('#dcp-list-cp').value.trim();
  if (!fase || !mapel || !cpText) { showToast('⚠️ Lengkapi semua field (Fase, Mapel, dan CP)!', 'error'); return; }
  const elemen_cp = [];
  const blocks = cpText.split('\n\n').filter(b => b.trim());
  blocks.forEach(block => {
    const lines = block.split('\n');
    let elemen = '', deskripsi = '';
    lines.forEach(line => {
      if (line.toLowerCase().startsWith('elemen:')) elemen = line.substring(7).trim();
      else if (line.toLowerCase().startsWith('deskripsi:')) deskripsi = line.substring(10).trim();
    });
    if (elemen && deskripsi) elemen_cp.push({ elemen, deskripsi });
  });
  if (elemen_cp.length === 0) { showToast('⚠️ Format CP tidak valid! Gunakan format Elemen: [nama] dan Deskripsi: [deskripsi]', 'error'); return; }
  try {
    if (currentEditCPId) {
      const docRef = doc(db, 'data_cp', currentEditCPId);
      await updateDoc(docRef, { fase, mapel, elemen_cp, updatedAt: serverTimestamp() });
      showToast('✅ Data CP berhasil diupdate!'); currentEditCPId = null;
    } else {
      await addDoc(collection(db, 'data_cp'), { userId: currentUser.uid, fase, mapel, elemen_cp, createdAt: serverTimestamp() });
      showToast('✅ Data CP berhasil disimpan!');
    }
    container.querySelector('#btn-reset-cp').click();
    container.querySelector('[data-tab="cp-list"]').click();
  } catch (error) { console.error('Error saving CP:', error); showToast('❌ Gagal menyimpan: ' + error.message, 'error'); }
}

function loadDataCP(container) {
  const listContainer = container.querySelector('#dcp-list-container');
  const filterFase = container.querySelector('#filter-cp-fase')?.value || '';
  const filterMapel = container.querySelector('#filter-cp-mapel')?.value || '';
  const q = query(collection(db, 'data_cp'), where('userId', '==', currentUser.uid));
  onSnapshot(q, (snapshot) => {
    if (snapshot.empty) { listContainer.innerHTML = '<div class="dtp-empty">📭 Belum ada Data CP tersimpan.</div>'; return; }
    let allData = []; snapshot.forEach(docSnap => { allData.push({ id: docSnap.id, ...docSnap.data() }); });
    let filteredData = allData.filter(item => { const matchFase = !filterFase || item.fase === filterFase; const matchMapel = !filterMapel || item.mapel === filterMapel; return matchFase && matchMapel; });
    filteredData.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    if (filteredData.length === 0) { listContainer.innerHTML = '<div class="dtp-empty">🔍 Tidak ada data yang cocok dengan filter.</div>'; return; }
    listContainer.innerHTML = filteredData.map(d => {
      const cpElementsHtml = (d.elemen_cp || []).map(el => `<div class="dtp-cp-elemen"><strong>${el.elemen}</strong><p>${el.deskripsi}</p></div>`).join('');
      return `<div class="dtp-item"><div class="dtp-item-header"><div><div class="dtp-item-title">${d.mapel} - Fase ${d.fase}</div><div class="dtp-item-meta">${(d.elemen_cp || []).length} Elemen CP</div></div><div class="dtp-item-actions"><button onclick="editDataCP('${d.id}')" style="background: #3b82f6;">✏️ Edit</button><button onclick="deleteDataCP('${d.id}')" style="background: #ef4444;">🗑️ Hapus</button></div></div>${cpElementsHtml}</div>`;
    }).join('');
  }, (error) => { console.warn('Error loading data CP:', error); listContainer.innerHTML = '<div class="dtp-empty">❌ Gagal memuat data.</div>'; });
}

window.editDataCP = async function(id) {
  try {
    const { getDoc, doc } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
    const docRef = doc(db, 'data_cp', id); const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) { showToast('❌ Data tidak ditemukan!', 'error'); return; }
    const d = docSnap.data(); currentEditCPId = id;
    document.querySelector('#dcp-fase').value = d.fase || '';
    document.querySelector('#dcp-mapel').value = d.mapel || '';
    const cpText = (d.elemen_cp || []).map(el => `Elemen: ${el.elemen}\nDeskripsi: ${el.deskripsi}`).join('\n\n');
    document.querySelector('#dcp-list-cp').value = cpText;
    document.querySelector('[data-tab="cp-form"]').click(); showToast('✅ Data CP dimuat untuk diedit!');
  } catch (error) { console.error('Error loading data CP:', error); showToast('❌ Gagal memuat data!', 'error'); }
};

window.deleteDataCP = async function(id) {
  if (!confirm('⚠️ Yakin hapus Data CP ini?')) return;
  try { await deleteDoc(doc(db, 'data_cp', id)); showToast('✅ Data CP berhasil dihapus!'); }
  catch (error) { console.error('Error deleting:', error); showToast('❌ Gagal menghapus!', 'error'); }
};

function handleExportCP(container) {
  const filterFase = container.querySelector('#filter-cp-fase')?.value || 'Semua';
  const filterMapel = container.querySelector('#filter-cp-mapel')?.value || 'Semua';
  const items = container.querySelectorAll('#dcp-list-container .dtp-item');
  if (items.length === 0) { showToast('⚠️ Tidak ada data untuk diexport!', 'error'); return; }
  let html = `<html><head><meta charset="utf-8"><title>Master Data CP</title><style>body{font-family:'Times New Roman',serif;margin:2cm;line-height:1.6;}h1{text-align:center;font-size:16pt;margin-bottom:5px;}h2{font-size:13pt;border-bottom:2px solid #000;padding-bottom:5px;margin-top:20px;}.item{margin-bottom:25px;page-break-inside:avoid;border:1px solid #ddd;padding:15px;border-radius:8px;}.item-header{font-weight:bold;font-size:12pt;margin-bottom:10px;color:#7c3aed;}.elemen{margin:10px 0;padding:10px;background:#f3f0ff;border-left:4px solid #8b5cf6;border-radius:4px;}.elemen strong{display:block;margin-bottom:5px;color:#6d28d9;}.elemen p{margin:0;color:#5b21b6;}</style></head><body><h1>MASTER DATA CAPAIAN PEMBELAJARAN (CP)</h1><p style="text-align:center;">SDN 139 LAMANDA | Filter: Fase ${filterFase} | Mapel ${filterMapel}</p><hr>`;
  items.forEach(item => {
    const header = item.querySelector('.dtp-item-title').textContent;
    const elemenBlocks = item.querySelectorAll('.dtp-cp-elemen');
    html += `<div class="item"><div class="item-header">${header}</div>`;
    elemenBlocks.forEach(el => { const strong = el.querySelector('strong').textContent; const p = el.querySelector('p').textContent; html += `<div class="elemen"><strong>${strong}</strong><p>${p}</p></div>`; });
    html += `</div>`;
  });
  html += `</body></html>`;
  const blob = new Blob(['\ufeff', html], { type: 'application/msword' }); const url = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href = url; link.download = `Master_Data_CP_Fase${filterFase}_${filterMapel}.doc`;
  document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url);
  showToast('📥 Word berhasil diunduh!');
}

// ========== FUNGSI ATP - BARU DITAMBAHKAN ==========
async function handleSimpanATP(container) {
  const kelas = container.querySelector('#datp-kelas').value;
  const mapel = container.querySelector('#datp-mapel').value;
  const fase = container.querySelector('#datp-fase').value;
  const semester = container.querySelector('#datp-semester').value;
  const judul = container.querySelector('#datp-judul').value.trim();
  const alurText = container.querySelector('#datp-alur').value.trim();
  const catatan = container.querySelector('#datp-catatan').value.trim();

  if (!kelas || !mapel || !fase || !judul || !alurText) {
    showToast('⚠️ Lengkapi Kelas, Mapel, Fase, Judul dan Alur ATP!', 'error');
    return;
  }

  const alur = alurText.split('\n').map(t => t.trim()).filter(t => t.length > 0);

  try {
    if (currentEditATPId) {
      const docRef = doc(db, 'data_atp', currentEditATPId);
      await updateDoc(docRef, { kelas, mapel, fase, semester, judul, alur, catatan, updatedAt: serverTimestamp() });
      showToast('✅ Data ATP berhasil diupdate!');
      currentEditATPId = null;
    } else {
      await addDoc(collection(db, 'data_atp'), {
        userId: currentUser.uid,
        kelas, mapel, fase, semester, judul, alur, catatan,
        createdAt: serverTimestamp()
      });
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
  const filterFase = container.querySelector('#filter-atp-fase')?.value || '';
  const filterMapel = container.querySelector('#filter-atp-mapel')?.value || '';
  const filterJudul = container.querySelector('#filter-atp-judul')?.value.toLowerCase() || '';

  const q = query(collection(db, 'data_atp'), where('userId', '==', currentUser.uid));

  onSnapshot(q, (snapshot) => {
    if (snapshot.empty) {
      listContainer.innerHTML = '<div class="dtp-empty">📭 Belum ada Data ATP tersimpan.<br><small>Silakan buat ATP pertama Anda di tab Input ATP.</small></div>';
      return;
    }

    let allData = [];
    snapshot.forEach(docSnap => { allData.push({ id: docSnap.id, ...docSnap.data() }); });

    let filteredData = allData.filter(item => {
      const matchKelas = !filterKelas || item.kelas === filterKelas;
      const matchFase = !filterFase || item.fase === filterFase;
      const matchMapel = !filterMapel || item.mapel === filterMapel;
      const matchJudul = !filterJudul || (item.judul || '').toLowerCase().includes(filterJudul);
      return matchKelas && matchFase && matchMapel && matchJudul;
    });

    filteredData.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

    if (filteredData.length === 0) {
      listContainer.innerHTML = '<div class="dtp-empty">🔍 Tidak ada data ATP yang cocok dengan filter.</div>';
      return;
    }

    listContainer.innerHTML = filteredData.map(d => `
        <div class="dtp-item atp-item">
          <div class="dtp-item-header">
            <div>
              <div class="dtp-item-title atp">${d.judul || `${d.mapel} - Kelas ${d.kelas}`}</div>
              <div class="dtp-item-meta">${d.mapel} | Kelas ${d.kelas} | Fase ${d.fase} | Semester ${d.semester} | ${(d.alur || []).length} Alur</div>
            </div>
            <div class="dtp-item-actions">
              <button onclick="editDataATP('${d.id}')" style="background: #4f46e5;">✏️ Edit</button>
              <button onclick="deleteDataATP('${d.id}')" style="background: #ef4444;">🗑️ Hapus</button>
            </div>
          </div>
          <div class="dtp-atp-timeline"><ol>${(d.alur || []).map(atp => `<li>${atp}</li>`).join('')}</ol></div>
          ${d.catatan ? `<div style="margin-top:10px; font-size:12px; color:#6366f1; font-style:italic;">📝 ${d.catatan}</div>` : ''}
        </div>
      `).join('');
  }, (error) => {
    console.warn('Error loading data ATP:', error);
    listContainer.innerHTML = '<div class="dtp-empty">❌ Gagal memuat data ATP. Pastikan rules Firestore untuk koleksi data_atp sudah ditambahkan.<br><small>' + error.message + '</small></div>';
  });
}

window.editDataATP = async function(id) {
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
    document.querySelector('#datp-alur').value = (d.alur || []).join('\n');
    document.querySelector('#datp-catatan').value = d.catatan || '';
    document.querySelector('[data-tab="atp-form"]').click();
    showToast('✅ Data ATP dimuat untuk diedit!');
  } catch (error) {
    console.error('Error loading ATP:', error);
    showToast('❌ Gagal memuat data ATP!', 'error');
  }
};

window.deleteDataATP = async function(id) {
  if (!confirm('⚠️ Yakin hapus Data ATP ini?')) return;
  try { await deleteDoc(doc(db, 'data_atp', id)); showToast('✅ Data ATP berhasil dihapus!'); }
  catch (error) { console.error('Error deleting ATP:', error); showToast('❌ Gagal menghapus ATP!', 'error'); }
};

function handleExportATP(container) {
  const filterKelas = container.querySelector('#filter-atp-kelas')?.value || 'Semua';
  const filterMapel = container.querySelector('#filter-atp-mapel')?.value || 'Semua';
  const items = container.querySelectorAll('#datp-list-container .atp-item');
  if (items.length === 0) { showToast('⚠️ Tidak ada data ATP untuk diexport!', 'error'); return; }
  let html = `<html><head><meta charset="utf-8"><title>Master Data ATP</title><style>body{font-family:'Times New Roman',serif;margin:2cm;line-height:1.6;}h1{text-align:center;font-size:16pt;margin-bottom:5px;}h2{font-size:13pt;border-bottom:2px solid #000;padding-bottom:5px;margin-top:20px;}.item{margin-bottom:25px;page-break-inside:avoid;border:1px solid #ddd;padding:15px;border-radius:8px;}.item-header{font-weight:bold;font-size:12pt;margin-bottom:10px;color:#4338ca;}ol{margin:10px 0;padding-left:20px;}li{margin:5px 0;}.catatan{margin-top:10px;font-style:italic;color:#6366f1;}</style></head><body><h1>MASTER DATA ALUR TUJUAN PEMBELAJARAN (ATP)</h1><p style="text-align:center;">SDN 139 LAMANDA | Filter: Kelas ${filterKelas} | Mapel ${filterMapel}</p><hr>`;
  items.forEach(item => {
    const header = item.querySelector('.dtp-item-title').textContent;
    const meta = item.querySelector('.dtp-item-meta').textContent;
    const timeline = item.querySelector('.dtp-atp-timeline').innerHTML;
    const catatanEl = item.querySelector('div[style*="italic"]');
    const catatan = catatanEl ? catatanEl.textContent : '';
    html += `<div class="item"><div class="item-header">${header}</div><div style="font-size:11pt;color:#64748b;margin-bottom:10px;">${meta}</div>${timeline}${catatan ? `<div class="catatan">${catatan}</div>` : ''}</div>`;
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
