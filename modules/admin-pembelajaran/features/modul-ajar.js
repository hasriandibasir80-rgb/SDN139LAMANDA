// modules/admin-pembelajaran/features/modul-ajar.js
// =========================================
// SUB-FITUR: MODUL AJAR (KURIKULUM MERDEKA)
// =========================================

import { db } from '../../../js/firebase-config.js';
import { getDatabase, ref, get, push, set, update, remove } 
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
const database = getDatabase();

// Konstanta CSS
const CSS_PATH = '../../../css/modules/modul-ajar.css';
const CSS_ID = 'modul-ajar-css';

// State
let allModulData = [];
let filteredData = [];

/**
 * Fungsi init
 */
export async function init(container, db) {
  loadFeatureCSS();
  renderUI(container);
  attachEventListeners(container);
  await loadDataModul();
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
  
  // Fallback inline CSS jika file eksternal gagal
  cssLink.onerror = () => {
    const inlineCSS = document.createElement('style');
    inlineCSS.id = CSS_ID + '-inline';
    inlineCSS.textContent = getInlineCSS();
    document.head.appendChild(inlineCSS);
  };
  document.head.appendChild(cssLink);
}

function getInlineCSS() {
  return `
    .ma-container { background: linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%); border-radius: 16px; padding: 20px; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.1); font-family: 'Segoe UI', sans-serif; }
    .ma-header { background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%); color: white; padding: 20px 30px; border-radius: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
    .ma-header h2 { margin: 0; font-size: 24px; font-weight: 700; }
    .ma-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px; }
    .ma-stat-card { background: white; padding: 15px; border-radius: 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); display: flex; align-items: center; gap: 15px; }
    .ma-stat-icon { font-size: 28px; background: #e0e7ff; padding: 10px; border-radius: 8px; }
    .ma-stat-info h4 { margin: 0; font-size: 12px; color: #6b7280; text-transform: uppercase; }
    .ma-stat-info p { margin: 5px 0 0; font-size: 20px; font-weight: bold; color: #4f46e5; }
    .ma-toolbar { background: white; padding: 15px; border-radius: 10px; margin-bottom: 20px; display: flex; gap: 10px; flex-wrap: wrap; align-items: center; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }
    .ma-search { flex: 1; min-width: 200px; padding: 10px 15px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; }
    .ma-btn { padding: 10px 20px; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: 0.2s; }
    .ma-btn-primary { background: #4f46e5; color: white; }
    .ma-btn-primary:hover { background: #4338ca; }
    .ma-btn-secondary { background: #e5e7eb; color: #374151; }
    .ma-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
    .ma-card { background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); transition: transform 0.2s; border: 1px solid #e5e7eb; display: flex; flex-direction: column; }
    .ma-card:hover { transform: translateY(-5px); box-shadow: 0 10px 15px rgba(0,0,0,0.1); }
    .ma-card-header { background: #f3f4f6; padding: 15px; border-bottom: 1px solid #e5e7eb; }
    .ma-card-title { margin: 0 0 5px 0; font-size: 16px; font-weight: 700; color: #1f2937; }
    .ma-card-subtitle { margin: 0; font-size: 13px; color: #6b7280; }
    .ma-card-body { padding: 15px; flex: 1; }
    .ma-badge { display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; margin-right: 5px; margin-bottom: 5px; }
    .badge-kelas { background: #dbeafe; color: #1e40af; }
    .badge-fase { background: #fce7f3; color: #9d174d; }
    .ma-card-footer { padding: 15px; border-top: 1px solid #e5e7eb; display: flex; justify-content: flex-end; gap: 10px; background: #f9fafb; }
    .ma-btn-sm { padding: 6px 12px; font-size: 12px; border-radius: 6px; border: none; cursor: pointer; }
    .btn-edit { background: #fbbf24; color: white; }
    .btn-delete { background: #ef4444; color: white; }
    .ma-empty { text-align: center; padding: 40px; color: #6b7280; background: white; border-radius: 12px; grid-column: 1 / -1; }
    
    /* Modal Styles */
    .ma-modal { display: none; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); justify-content: center; align-items: center; }
    .ma-modal-content { background: white; border-radius: 12px; width: 90%; max-width: 700px; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 25px rgba(0,0,0,0.1); }
    .ma-modal-header { background: #4f46e5; color: white; padding: 20px; display: flex; justify-content: space-between; align-items: center; border-radius: 12px 12px 0 0; }
    .ma-modal-header h3 { margin: 0; }
    .ma-close { background: none; border: none; color: white; font-size: 24px; cursor: pointer; }
    .ma-modal-body { padding: 20px; }
    .ma-form-group { margin-bottom: 15px; }
    .ma-form-group label { display: block; margin-bottom: 5px; font-weight: 600; font-size: 13px; color: #374151; }
    .ma-input, .ma-select, .ma-textarea { width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; box-sizing: border-box; font-family: inherit; }
    .ma-input:focus, .ma-select:focus, .ma-textarea:focus { outline: none; border-color: #4f46e5; box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1); }
    .ma-row { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
    .ma-modal-footer { padding: 15px 20px; border-top: 1px solid #e5e7eb; display: flex; justify-content: flex-end; gap: 10px; background: #f9fafb; border-radius: 0 0 12px 12px; }
    
    @media (max-width: 768px) { .ma-row { grid-template-columns: 1fr; } .ma-toolbar { flex-direction: column; align-items: stretch; } }
  `;
}

function renderUI(container) {
  container.innerHTML = `
    <div class="ma-container">
      <div class="ma-header">
        <div>
          <h2>📘 Modul Ajar</h2>
          <p style="margin: 5px 0 0; opacity: 0.9; font-size: 14px;">Manajemen Modul Ajar Kurikulum Merdeka</p>
        </div>
      </div>

      <div class="ma-stats">
        <div class="ma-stat-card">
          <div class="ma-stat-icon">📚</div>
          <div class="ma-stat-info">
            <h4>Total Modul</h4>
            <p id="statTotal">0</p>
          </div>
        </div>
        <div class="ma-stat-card">
          <div class="ma-stat-icon"></div>
          <div class="ma-stat-info">
            <h4>Kelas Terdaftar</h4>
            <p id="statKelas">0</p>
          </div>
        </div>
      </div>

      <div class="ma-toolbar">
        <input type="text" id="searchInput" class="ma-search" placeholder="Cari judul modul atau kelas...">
        <button class="ma-btn ma-btn-primary" id="btnTambah"> Tambah Modul</button>
      </div>

      <div class="ma-grid" id="modulGrid">
        <div class="ma-empty">⏳ Memuat data modul ajar...</div>
      </div>
    </div>

    <!-- Modal Form -->
    <div id="modalForm" class="ma-modal">
      <div class="ma-modal-content">
        <div class="ma-modal-header">
          <h3 id="modalTitle">Tambah Modul Ajar</h3>
          <button class="ma-close" id="btnClose">&times;</button>
        </div>
        <div class="ma-modal-body">
          <input type="hidden" id="inputId">
          
          <div class="ma-form-group">
            <label>Judul Modul / Topik</label>
            <input type="text" id="inputJudul" class="ma-input" placeholder="Contoh: Bilangan Cacah sampai 100">
          </div>
          
          <div class="ma-row">
            <div class="ma-form-group">
              <label>Mata Pelajaran</label>
              <input type="text" id="inputMapel" class="ma-input" placeholder="Contoh: Matematika">
            </div>
            <div class="ma-form-group">
              <label>Kelas</label>
              <select id="inputKelas" class="ma-select">
                <option value="1">Kelas 1</option>
                <option value="2">Kelas 2</option>
                <option value="3">Kelas 3</option>
                <option value="4">Kelas 4</option>
                <option value="5">Kelas 5</option>
                <option value="6">Kelas 6</option>
              </select>
            </div>
          </div>

          <div class="ma-row">
            <div class="ma-form-group">
              <label>Fase</label>
              <select id="inputFase" class="ma-select">
                <option value="A">Fase A (Kelas 1-2)</option>
                <option value="B">Fase B (Kelas 3-4)</option>
                <option value="C">Fase C (Kelas 5-6)</option>
              </select>
            </div>
            <div class="ma-form-group">
              <label>Alokasi Waktu</label>
              <input type="text" id="inputWaktu" class="ma-input" placeholder="Contoh: 2 x 35 Menit">
            </div>
          </div>

          <div class="ma-form-group">
            <label>Capaian Pembelajaran (CP)</label>
            <textarea id="inputCP" class="ma-textarea" rows="3" placeholder="Deskripsi CP..."></textarea>
          </div>

          <div class="ma-form-group">
            <label>Tujuan Pembelajaran (TP)</label>
            <textarea id="inputTP" class="ma-textarea" rows="3" placeholder="Deskripsi TP..."></textarea>
          </div>
        </div>
        <div class="ma-modal-footer">
          <button class="ma-btn ma-btn-secondary" id="btnBatal">Batal</button>
          <button class="ma-btn ma-btn-primary" id="btnSimpan">💾 Simpan</button>
        </div>
      </div>
    </div>
  `;
}

async function loadDataModul() {
  try {
    const snapshot = await get(ref(database, 'modulAjar'));
    allModulData = [];
    const kelasSet = new Set();

    if (snapshot.exists()) {
      snapshot.forEach(child => {
        const data = child.val();
        allModulData.push({ id: child.key, ...data });
        if (data.kelas) kelasSet.add(data.kelas);
      });
    }

    // Sort terbaru di atas
    allModulData.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    filteredData = [...allModulData];

    document.getElementById('statTotal').textContent = allModulData.length;
    document.getElementById('statKelas').textContent = kelasSet.size;

    renderGrid();
  } catch (error) {
    console.error('Error load modul:', error);
    document.getElementById('modulGrid').innerHTML = `<div class="ma-empty" style="color:red;">Gagal memuat data: ${error.message}</div>`;
  }
}

function renderGrid() {
  const grid = document.getElementById('modulGrid');
  grid.innerHTML = '';

  if (filteredData.length === 0) {
    grid.innerHTML = '<div class="ma-empty">📭 Belum ada data modul ajar. Klik "Tambah Modul" untuk memulai.</div>';
    return;
  }

  filteredData.forEach(item => {
    const card = document.createElement('div');
    card.className = 'ma-card';
    card.innerHTML = `
      <div class="ma-card-header">
        <h3 class="ma-card-title">${item.judul || 'Tanpa Judul'}</h3>
        <p class="ma-card-subtitle">${item.mapel || '-'}</p>
      </div>
      <div class="ma-card-body">
        <span class="ma-badge badge-kelas">Kelas ${item.kelas}</span>
        <span class="ma-badge badge-fase">Fase ${item.fase}</span>
        <p style="margin: 10px 0 0; font-size: 12px; color: #6b7280;">️ ${item.waktu || '-'}</p>
      </div>
      <div class="ma-card-footer">
        <button class="ma-btn-sm btn-edit" data-id="${item.id}">✏️ Edit</button>
        <button class="ma-btn-sm btn-delete" data-id="${item.id}">🗑️ Hapus</button>
      </div>
    `;
    grid.appendChild(card);
  });

  // Attach events
  document.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', (e) => openModal(e.currentTarget.dataset.id));
  });
  document.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', (e) => deleteModul(e.currentTarget.dataset.id));
  });
}

function openModal(id = null) {
  const modal = document.getElementById('modalForm');
  const title = document.getElementById('modalTitle');
  
  // Reset form
  document.getElementById('inputId').value = '';
  document.getElementById('inputJudul').value = '';
  document.getElementById('inputMapel').value = '';
  document.getElementById('inputKelas').value = '1';
  document.getElementById('inputFase').value = 'A';
  document.getElementById('inputWaktu').value = '';
  document.getElementById('inputCP').value = '';
  document.getElementById('inputTP').value = '';

  if (id) {
    title.textContent = 'Edit Modul Ajar';
    const item = allModulData.find(d => d.id === id);
    if (item) {
      document.getElementById('inputId').value = item.id;
      document.getElementById('inputJudul').value = item.judul || '';
      document.getElementById('inputMapel').value = item.mapel || '';
      document.getElementById('inputKelas').value = item.kelas || '1';
      document.getElementById('inputFase').value = item.fase || 'A';
      document.getElementById('inputWaktu').value = item.waktu || '';
      document.getElementById('inputCP').value = item.cp || '';
      document.getElementById('inputTP').value = item.tp || '';
    }
  } else {
    title.textContent = 'Tambah Modul Ajar';
  }

  modal.style.display = 'flex';
}

function closeModal() {
  document.getElementById('modalForm').style.display = 'none';
}

async function simpanModul() {
  const id = document.getElementById('inputId').value;
  const data = {
    judul: document.getElementById('inputJudul').value.trim(),
    mapel: document.getElementById('inputMapel').value.trim(),
    kelas: document.getElementById('inputKelas').value,
    fase: document.getElementById('inputFase').value,
    waktu: document.getElementById('inputWaktu').value.trim(),
    cp: document.getElementById('inputCP').value.trim(),
    tp: document.getElementById('inputTP').value.trim(),
    updatedAt: Date.now()
  };

  if (!data.judul || !data.mapel) {
    alert('Judul dan Mata Pelajaran wajib diisi!');
    return;
  }

  try {
    if (id) {
      await update(ref(database, `modulAjar/${id}`), data);
      showToast('✅ Modul berhasil diupdate!');
    } else {
      data.createdAt = Date.now();
      const newRef = push(ref(database, 'modulAjar'));
      await set(newRef, data);
      showToast('✅ Modul baru berhasil ditambahkan!');
    }
    closeModal();
    await loadDataModul();
  } catch (error) {
    alert('Gagal menyimpan: ' + error.message);
  }
}

async function deleteModul(id) {
  if (!confirm('Yakin ingin menghapus modul ini?')) return;
  try {
    await remove(ref(database, `modulAjar/${id}`));
    showToast('🗑️ Modul dihapus!');
    await loadDataModul();
  } catch (error) {
    alert('Gagal menghapus: ' + error.message);
  }
}

function showToast(msg) {
  const toast = document.createElement('div');
  toast.textContent = msg;
  toast.style.cssText = `position: fixed; top: 20px; right: 20px; background: #10b981; color: white; padding: 12px 20px; border-radius: 8px; z-index: 10001; box-shadow: 0 4px 12px rgba(0,0,0,0.15);`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function attachEventListeners(container) {
  document.getElementById('btnTambah').addEventListener('click', () => openModal());
  document.getElementById('btnClose').addEventListener('click', closeModal);
  document.getElementById('btnBatal').addEventListener('click', closeModal);
  document.getElementById('btnSimpan').addEventListener('click', simpanModul);
  
  document.getElementById('searchInput').addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    filteredData = allModulData.filter(d => 
      (d.judul && d.judul.toLowerCase().includes(q)) || 
      (d.mapel && d.mapel.toLowerCase().includes(q)) ||
      (d.kelas && d.kelas.includes(q))
    );
    renderGrid();
  });

  // Close modal on outside click
  document.getElementById('modalForm').addEventListener('click', (e) => {
    if (e.target.id === 'modalForm') closeModal();
  });
}
