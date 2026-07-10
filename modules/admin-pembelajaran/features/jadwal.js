// modules/admin-pembelajaran/features/jadwal.js
// =========================================
// FITUR: JADWAL PEMBELAJARAN (MANUAL INPUT)
// GRID: Senin-Jumat, 8 JP
// CUSTOM: Warna per mapel, editable langsung
// BEL OTOMATIS: Mulai, Istirahat, Lanjut, Pulang
// OUTPUT: Print & Download Word
// =========================================

import { db } from '../../../js/firebase-config.js';
import { getDatabase, ref, get, push, set, update } 
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { getFirestore, doc, getDoc } 
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
const database = getDatabase();
const firestore = getFirestore();

// Konstanta CSS
const CSS_PATH = '../../../css/modules/jadwal.css';
const CSS_ID = 'jadwal-css';

// State
const HARI_LIST = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'];
const JP_LIST = Array.from({length: 8}, (_, i) => `JP ${i + 1}`);

// Default data
const DEFAULT_JADWAL = {
  kelas: '',
  data: {},
  warnaMapel: {
    'Matematika': '#3b82f6',
    'Bahasa Indonesia': '#10b981',
    'IPA': '#f59e0b',
    'IPS': '#8b5cf6',
    'PJOK': '#ef4444',
    'Seni Budaya': '#ec4899',
    'Bahasa Inggris': '#06b6d4',
    'Agama': '#84cc16',
    'PKn': '#f97316',
    '': '#94a3b8'
  }
};

// Default data tanda tangan
const DEFAULT_TTD = {
  namaKepsek: 'Imam munandar SP.d',
  nipKepsek: '-',
  namaGuru: 'Hasriandi basir SP.d',
  nipGuru: '-'
};

// Audio Context untuk bel
let audioContext = null;
let belInterval = null;

/**
 * Init
 */
export async function init(container, db) {
  loadCSS();
  renderUI(container);
  attachEvents();
  loadTTDDefaults();
}

export function cleanup() {
  const css = document.getElementById(CSS_ID);
  if (css) css.remove();
  stopBelOtomatis();
}

/**
 * Load CSS - Eksternal dengan fallback inline
 */
function loadCSS() {
  if (document.getElementById(CSS_ID)) return;
  
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = CSS_PATH;
  link.id = CSS_ID;
  
  // Fallback: jika CSS eksternal gagal, inject inline
  link.onerror = () => {
    console.warn('⚠️ CSS eksternal gagal, menggunakan inline CSS');
    const style = document.createElement('style');
    style.id = CSS_ID + '-inline';
    style.textContent = getInlineCSS();
    document.head.appendChild(style);
  };
  
  document.head.appendChild(link);
}

/**
 * Fallback CSS inline (jika file eksternal gagal)
 */
function getInlineCSS() {
  return `
    .jadwal-container { background: linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%); border-radius: 16px; padding: 25px; font-family: 'Segoe UI', sans-serif; max-width: 1200px; margin: 0 auto; box-shadow: 0 8px 24px rgba(236, 72, 153, 0.15); }
    .jadwal-header { background: linear-gradient(135deg, #ec4899 0%, #f472b6 100%); color: white; padding: 30px; border-radius: 12px; margin-bottom: 25px; box-shadow: 0 4px 12px rgba(236, 72, 153, 0.3); }
    .jadwal-header h2 { margin: 0 0 8px 0; font-size: 28px; font-weight: 700; }
    .jadwal-header p { margin: 0; opacity: 0.95; font-size: 15px; }
    .jadwal-form { background: white; padding: 30px; border-radius: 12px; box-shadow: 0 2px 8px rgba(236, 72, 153, 0.1); }
    .form-section-title { font-size: 18px; font-weight: 700; color: #be185d; margin: 25px 0 18px 0; border-bottom: 3px solid #fce7f3; padding-bottom: 8px; }
    .form-section-title:first-child { margin-top: 0; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 15px; }
    .form-group { margin-bottom: 18px; }
    .form-group label { display: block; margin-bottom: 8px; font-weight: 600; font-size: 14px; color: #831843; }
    .form-control { width: 100%; padding: 14px 16px; border: 2px solid #fbcfe8; border-radius: 8px; font-size: 15px; box-sizing: border-box; transition: all 0.2s; background: white; color: #831843; }
    .form-control:focus { outline: none; border-color: #ec4899; box-shadow: 0 0 0 3px rgba(236, 72, 153, 0.15); }
    select.form-control { cursor: pointer; }
    .jadwal-grid-wrapper { overflow-x: auto; margin: 20px 0; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .jadwal-table { width: 100%; border-collapse: collapse; background: white; min-width: 800px; }
    .jadwal-table th { background: linear-gradient(135deg, #ec4899 0%, #f472b6 100%); color: white; padding: 12px 8px; text-align: center; font-weight: 700; border: 1px solid #ec4899; }
    .jadwal-table td { padding: 10px 8px; border: 1px solid #e2e8f0; text-align: center; vertical-align: top; min-width: 120px; }
    .jadwal-table tr:nth-child(even) { background: #fff1f2; }
    .jadwal-table tr:nth-child(odd) { background: white; }
    .jp-cell { font-weight: 600; color: #831843; background: #fce7f3; }
    .mapel-cell { padding: 8px; border-radius: 6px; cursor: pointer; transition: all 0.2s; min-height: 60px; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 4px; }
    .mapel-cell:hover { transform: scale(1.05); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
    .mapel-cell.istirahat { background: #94a3b8; color: white; font-style: italic; }
    .mapel-name { font-weight: 700; font-size: 13px; }
    .mapel-guru { font-size: 11px; color: #475569; }
    .mapel-cell.empty { background: #f1f5f9; color: #94a3b8; }
    .color-picker-wrapper { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 10px; }
    .color-option { width: 30px; height: 30px; border-radius: 50%; cursor: pointer; border: 3px solid transparent; transition: all 0.2s; }
    .color-option:hover { transform: scale(1.2); }
    .color-option.selected { border-color: #1e293b; box-shadow: 0 0 0 2px white, 0 0 0 4px #1e293b; }
    .gen-action { margin-top: 30px; text-align: center; }
    .btn-action { padding: 12px 24px; border: none; border-radius: 8px; font-weight: 600; font-size: 15px; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; transition: all 0.2s; box-shadow: 0 2px 6px rgba(0,0,0,0.1); margin: 0 5px; }
    .btn-action:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
    .btn-save { background: #10b981; color: white; }
    .btn-save:hover { background: #059669; }
    .btn-print { background: #8b5cf6; color: white; }
    .btn-print:hover { background: #7c3aed; }
    .btn-download { background: #3b82f6; color: white; }
    .btn-download:hover { background: #2563eb; }
    .btn-reset { background: #6b7280; color: white; }
    .btn-reset:hover { background: #4b5563; }
    .ttd-section { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-top: 40px; padding-top: 20px; border-top: 2px solid #fce7f3; }
    .ttd-box { text-align: center; padding: 15px; background: #fff1f2; border-radius: 8px; }
    .ttd-label { font-size: 13px; color: #831843; font-weight: 600; margin-bottom: 8px; }
    .ttd-role { font-size: 16px; font-weight: 700; color: #be185d; margin-bottom: 60px; min-height: 80px; }
    .ttd-name { font-size: 15px; font-weight: 700; color: #1e293b; margin-bottom: 4px; border-bottom: 1px solid #831843; padding-bottom: 4px; }
    .ttd-nip { font-size: 13px; color: #64748b; }
    @keyframes bellPulse { 0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; } 50% { transform: translate(-50%, -50%) scale(1.1); } 100% { transform: translate(-50%, -50%) scale(1); opacity: 1; } }
    .bell-notif-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 9999; }
    .bell-notif-content { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: linear-gradient(135deg, #ec4899 0%, #f472b6 100%); color: white; padding: 40px 60px; border-radius: 20px; box-shadow: 0 20px 60px rgba(236, 72, 153, 0.4); z-index: 10000; text-align: center; animation: bellPulse 1s ease; }
    .bell-notif-icon { font-size: 48px; margin-bottom: 15px; }
    .bell-notif-title { font-size: 24px; font-weight: 700; margin-bottom: 10px; }
    .bell-notif-time { font-size: 14px; opacity: 0.9; }
    @media print { body * { visibility: hidden; } .jadwal-container, .jadwal-container * { visibility: visible; } .jadwal-container { position: absolute; left: 0; top: 0; width: 100%; padding: 20px; box-shadow: none; border: none; background: white !important; } .gen-action, .form-section-title { display: none !important; } .jadwal-grid-wrapper { overflow: visible; } .ttd-section { page-break-inside: avoid; } }
    @media (max-width: 768px) { .jadwal-container { padding: 15px; } .jadwal-header { padding: 20px; } .jadwal-header h2 { font-size: 22px; } .jadwal-form { padding: 20px; } .form-grid { grid-template-columns: 1fr; gap: 15px; } .ttd-section { grid-template-columns: 1fr; gap: 20px; } .btn-action { width: 100%; justify-content: center; margin: 5px 0; } }
  `;
}

/**
 * Load Data Tanda Tangan Default dari localStorage
 */
function loadTTDDefaults() {
  const saved = localStorage.getItem('jadwal_ttd');
  let ttdData = { ...DEFAULT_TTD };
  
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      ttdData = { ...ttdData, ...parsed };
    } catch (e) {
      console.warn('Gagal parse TTD data:', e);
    }
  }
  
  const fields = {
    inpKepsek: ttdData.namaKepsek,
    inpNipKepsek: ttdData.nipKepsek,
    inpGuruPengampu: ttdData.namaGuru,
    inpNipGuru: ttdData.nipGuru
  };
  
  Object.entries(fields).forEach(([id, value]) => {
    const el = document.getElementById(id);
    if (el) el.value = value;
  });
  
  updateTTDPreview();
}

/**
 * Save Data Tanda Tangan ke localStorage
 */
function saveTTDDefaults() {
  const ttdData = {
    namaKepsek: document.getElementById('inpKepsek')?.value || DEFAULT_TTD.namaKepsek,
    nipKepsek: document.getElementById('inpNipKepsek')?.value || DEFAULT_TTD.nipKepsek,
    namaGuru: document.getElementById('inpGuruPengampu')?.value || DEFAULT_TTD.namaGuru,
    nipGuru: document.getElementById('inpNipGuru')?.value || DEFAULT_TTD.nipGuru
  };
  
  localStorage.setItem('jadwal_ttd', JSON.stringify(ttdData));
}

function renderUI(container) {
  // Generate header tabel
  const headerRow = `
    <tr>
      <th style="width: 80px;">Jam</th>
      ${HARI_LIST.map(hari => `<th>${hari}</th>`).join('')}
    </tr>
  `;
  
  // Generate rows
  let rows = '';
  for (let jp = 1; jp <= 8; jp++) {
    rows += `
      <tr>
        <td class="jp-cell">JP ${jp}</td>
        ${HARI_LIST.map(hari => `
          <td data-hari="${hari}" data-jp="${jp}">
            <div class="mapel-cell empty" onclick="editJadwal('${hari}', ${jp})">
              <span class="mapel-name">-</span>
              <span class="mapel-guru">-</span>
            </div>
          </td>
        `).join('')}
      </tr>
    `;
  }
  
  container.innerHTML = `
    <div class="jadwal-container">
      <div class="jadwal-header">
        <h2> Jadwal Pembelajaran</h2>
        <p>Input jadwal pembelajaran per kelas secara manual. Klik cell untuk edit.</p>
      </div>

      <div class="jadwal-form">
        <div class="form-section-title">📋 1. Pilih Kelas</div>
        <div class="form-grid">
          <div class="form-group">
            <label>🎓 Kelas / Fase</label>
            <select id="inpKelas" class="form-control">
              <option value="">-- Pilih Kelas --</option>
              <option value="1 (Fase A)">Kelas 1 (Fase A)</option>
              <option value="2 (Fase A)">Kelas 2 (Fase A)</option>
              <option value="3 (Fase B)">Kelas 3 (Fase B)</option>
              <option value="4 (Fase B)">Kelas 4 (Fase B)</option>
              <option value="5 (Fase C)">Kelas 5 (Fase C)</option>
              <option value="6 (Fase C)">Kelas 6 (Fase C)</option>
            </select>
          </div>
          <div class="form-group">
            <label> Wali Kelas</label>
            <input type="text" id="inpWaliKelas" class="form-control" placeholder="Nama Wali Kelas">
          </div>
        </div>

        <div class="form-section-title">🎨 2. Warna Per Mapel (Opsional)</div>
        <div class="form-group">
          <label>Pilih warna untuk setiap mata pelajaran:</label>
          <div class="color-picker-wrapper" id="colorPicker">
            ${Object.entries(DEFAULT_JADWAL.warnaMapel).map(([mapel, warna]) => `
              <div class="color-option" style="background: ${warna}" data-mapel="${mapel}" data-warna="${warna}" onclick="selectColor('${mapel}', '${warna}')"></div>
            `).join('')}
          </div>
          <p style="font-size: 12px; color: #64748b; margin-top: 8px;">Klik warna untuk mengubah warna mapel</p>
        </div>

        <div class="form-section-title">🔔 3. Pengaturan Bel Otomatis</div>
        <div class="form-grid">
          <div class="form-group">
            <label>🔔 Aktifkan Bel Otomatis</label>
            <select id="optBelOtomatis" class="form-control">
              <option value="yes">✅ Ya, aktifkan bel</option>
              <option value="no">❌ Tidak</option>
            </select>
          </div>
          <div class="form-group">
            <label>🔊 Volume Bel</label>
            <input type="range" id="inpVolumeBel" min="0" max="100" value="70" class="form-control">
            <div style="text-align: center; margin-top: 5px; font-size: 12px;">
              <span id="volumeValue">70</span>%
            </div>
          </div>
        </div>
        
        <div class="form-section-title" style="margin-top: 20px; font-size: 16px; color: #db2777;">⏰ Waktu Bel</div>
        <div class="form-grid">
          <div class="form-group">
            <label>🔔 Bel Mulai Belajar</label>
            <input type="time" id="inpBelMulai" class="form-control" value="07:00">
          </div>
          <div class="form-group">
            <label> Bel Istirahat 1</label>
            <input type="time" id="inpBelIstirahat1" class="form-control" value="09:00">
          </div>
        </div>
        <div class="form-grid">
          <div class="form-group">
            <label>📚 Bel Lanjut Belajar</label>
            <input type="time" id="inpBelLanjut" class="form-control" value="09:30">
          </div>
          <div class="form-group">
            <label>🏠 Bel Pulang</label>
            <input type="time" id="inpBelPulang" class="form-control" value="13:00">
          </div>
        </div>
        
        <div class="form-section-title">✍️ 4. Tanda Tangan (Default - Bisa Diedit)</div>
        <div class="form-grid">
          <div class="form-group">
            <label>‍💼 Nama Kepala Sekolah</label>
            <input type="text" id="inpKepsek" class="form-control" placeholder="Nama lengkap Kepala Sekolah">
          </div>
          <div class="form-group">
            <label>🔢 NIP Kepala Sekolah</label>
            <input type="text" id="inpNipKepsek" class="form-control" placeholder="NIP Kepala Sekolah">
          </div>
        </div>
        <div class="form-grid">
          <div class="form-group">
            <label>👩🏫 Nama Guru Pengampu</label>
            <input type="text" id="inpGuruPengampu" class="form-control" placeholder="Nama Guru Pengampu">
          </div>
          <div class="form-group">
            <label> NIP Guru Pengampu</label>
            <input type="text" id="inpNipGuru" class="form-control" placeholder="NIP Guru Pengampu">
          </div>
        </div>

        <div class="gen-action">
          <button class="btn-action btn-save" id="btnSave" onclick="saveJadwal()">💾 Simpan Jadwal</button>
          <button class="btn-action btn-print" id="btnPrint" onclick="printJadwal()">🖨️ Print</button>
          <button class="btn-action btn-download" id="btnDownload" onclick="downloadWord()">📥 Download Word</button>
          <button class="btn-action btn-reset" id="btnReset" onclick="resetJadwal()">🔄 Reset</button>
          <button class="btn-action" id="btnTestBel" onclick="testBel()" style="background: #f59e0b; color: white;">🔔 Test Bel</button>
        </div>
      </div>

      <div class="jadwal-grid-wrapper">
        <table class="jadwal-table" id="jadwalTable">
          ${headerRow}
          ${rows}
        </table>
      </div>

      <!-- Tanda Tangan Section -->
      <div class="ttd-section" id="ttdSection">
        <div class="ttd-box">
          <div class="ttd-label">Mengetahui,</div>
          <div class="ttd-role">Kepala Sekolah<br>SDN 139 LAMANDA</div>
          <div class="ttd-name" id="ttdNamaKepsek">_______________________</div>
          <div class="ttd-nip" id="ttdNipKepsek">NIP: -</div>
        </div>
        <div class="ttd-box">
          <div class="ttd-label">Wali Kelas,</div>
          <div class="ttd-role">Guru Kelas</div>
          <div class="ttd-name" id="ttdNamaGuru">_______________________</div>
          <div class="ttd-nip" id="ttdNipGuru">NIP: -</div>
        </div>
      </div>

      <!-- Bel Indicator -->
      <div style="margin-top: 20px; padding: 15px; background: linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%); border-radius: 8px; text-align: center;" id="belIndicator">
        <div style="font-size: 14px; color: #831843; margin-bottom: 5px;">🔔 Status Bel Otomatis</div>
        <div style="font-size: 18px; font-weight: 700; color: #be185d;" id="belStatus">⏸️ Non-aktif</div>
        <div style="font-size: 12px; color: #64748b; margin-top: 5px;" id="belNextTime">Bel berikutnya: -</div>
      </div>
    </div>
  `;
}

function attachEvents() {
  // Auto-update tanda tangan + auto-save
  const ttdInputs = ['inpKepsek', 'inpNipKepsek', 'inpGuruPengampu', 'inpNipGuru'];
  ttdInputs.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', () => {
        updateTTDPreview();
        saveTTDDefaults();
      });
    }
  });
  
  // Load jadwal saat kelas dipilih
  document.getElementById('inpKelas').addEventListener('change', loadJadwal);
  
  // Update volume display
  document.getElementById('inpVolumeBel')?.addEventListener('input', updateVolumeDisplay);
  
  // Start/Stop bel otomatis
  document.getElementById('optBelOtomatis')?.addEventListener('change', (e) => {
    if (e.target.value === 'yes') {
      startBelOtomatis();
    } else {
      stopBelOtomatis();
    }
  });
  
  // Update next bel time saat waktu berubah
  ['inpBelMulai', 'inpBelIstirahat1', 'inpBelLanjut', 'inpBelPulang'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', updateNextBelTime);
  });
}

function updateTTDPreview() {
  const namaKepsek = document.getElementById('inpKepsek')?.value || '';
  const nipKepsek = document.getElementById('inpNipKepsek')?.value || '';
  const namaGuru = document.getElementById('inpGuruPengampu')?.value || '';
  const nipGuru = document.getElementById('inpNipGuru')?.value || '';
  
  const ttdNamaKepsek = document.getElementById('ttdNamaKepsek');
  const ttdNipKepsek = document.getElementById('ttdNipKepsek');
  const ttdNamaGuru = document.getElementById('ttdNamaGuru');
  const ttdNipGuru = document.getElementById('ttdNipGuru');
  
  if (ttdNamaKepsek) ttdNamaKepsek.textContent = namaKepsek || '_______________________';
  if (ttdNipKepsek) ttdNipKepsek.textContent = nipKepsek ? `NIP: ${nipKepsek}` : 'NIP: -';
  if (ttdNamaGuru) ttdNamaGuru.textContent = namaGuru || '_______________________';
  if (ttdNipGuru) ttdNipGuru.textContent = nipGuru ? `NIP: ${nipGuru}` : 'NIP: -';
}

/**
 * Select Color untuk mapel
 */
window.selectColor = function(mapel, warna) {
  document.querySelectorAll('.color-option').forEach(el => el.classList.remove('selected'));
  const selected = document.querySelector(`.color-option[data-mapel="${mapel}"]`);
  if (selected) selected.classList.add('selected');
  
  DEFAULT_JADWAL.warnaMapel[mapel] = warna;
  showToast(`🎨 Warna ${mapel} diubah`);
};

/**
 * Edit Jadwal - Muncul prompt
 */
window.editJadwal = function(hari, jp) {
  const kelas = document.getElementById('inpKelas').value;
  if (!kelas) {
    alert('⚠️ Pilih kelas terlebih dahulu!');
    return;
  }
  
  // Cek apakah ini jam istirahat (JP 4-5)
  if (jp === 4 || jp === 5) {
    const confirmIstirahat = confirm(`Jam ${jp} (${hari}) adalah jam istirahat. Kosongkan?`);
    if (confirmIstirahat) {
      updateCell(hari, jp, '', '', true);
    }
    return;
  }
  
  // Get current data
  const cell = document.querySelector(`td[data-hari="${hari}"][data-jp="${jp}"] .mapel-cell`);
  const currentMapel = cell.querySelector('.mapel-name').textContent;
  const currentGuru = cell.querySelector('.mapel-guru').textContent;
  
  // Prompt input
  const mapel = prompt('Mata Pelajaran:', currentMapel === '-' ? '' : currentMapel);
  if (mapel === null) return; // Cancel
  
  const guru = prompt('Nama Guru:', currentGuru === '-' ? '' : currentGuru);
  if (guru === null) return; // Cancel
  
  updateCell(hari, jp, mapel.trim(), guru.trim());
};

/**
 * Update cell tampilan
 */
function updateCell(hari, jp, mapel, guru, isIstirahat = false) {
  const cell = document.querySelector(`td[data-hari="${hari}"][data-jp="${jp}"] .mapel-cell`);
  
  if (isIstirahat) {
    cell.className = 'mapel-cell istirahat';
    cell.innerHTML = `
      <span class="mapel-name">🕐 ISTIRAHAT</span>
      <span class="mapel-guru">-</span>
    `;
    cell.onclick = null; // Disable edit
    return;
  }
  
  if (!mapel) {
    cell.className = 'mapel-cell empty';
    cell.innerHTML = `
      <span class="mapel-name">-</span>
      <span class="mapel-guru">-</span>
    `;
  } else {
    const warna = DEFAULT_JADWAL.warnaMapel[mapel] || '#94a3b8';
    cell.className = 'mapel-cell';
    cell.style.background = warna + '20'; // 20% opacity
    cell.style.border = `2px solid ${warna}`;
    cell.innerHTML = `
      <span class="mapel-name" style="color: ${warna}">${mapel}</span>
      <span class="mapel-guru">${guru || '-'}</span>
    `;
  }
  
  cell.onclick = () => editJadwal(hari, jp);
}

/**
 * Load jadwal dari Firebase
 */
async function loadJadwal() {
  const kelas = document.getElementById('inpKelas').value;
  if (!kelas) return;
  
  try {
    const snapshot = await get(ref(database, `jadwal/${kelas.replace(/\s+/g, '_')}`));
    if (snapshot.exists()) {
      const data = snapshot.val();
      
      // Isi wali kelas
      if (data.waliKelas) {
        document.getElementById('inpWaliKelas').value = data.waliKelas;
      }
      
      // Isi jadwal
      Object.entries(data.data || {}).forEach(([key, value]) => {
        const [hari, jp] = key.split('_');
        if (value.istirahat) {
          updateCell(hari, parseInt(jp), '', '', true);
        } else {
          updateCell(hari, parseInt(jp), value.mapel || '', value.guru || '');
        }
      });
      
      showToast('✅ Jadwal berhasil dimuat!');
    } else {
      // Reset tabel
      resetJadwalTable();
    }
  } catch (error) {
    console.error('Error load jadwal:', error);
    alert('❌ Gagal memuat jadwal: ' + error.message);
  }
}

/**
 * Save jadwal ke Firebase
 */
window.saveJadwal = async function() {
  const kelas = document.getElementById('inpKelas').value;
  if (!kelas) {
    alert('⚠️ Pilih kelas terlebih dahulu!');
    return;
  }
  
  const waliKelas = document.getElementById('inpWaliKelas').value;
  if (!waliKelas) {
    alert('⚠️ Isi nama wali kelas!');
    return;
  }
  
  // Collect data dari tabel
  const jadwalData = {};
  HARI_LIST.forEach(hari => {
    for (let jp = 1; jp <= 8; jp++) {
      const cell = document.querySelector(`td[data-hari="${hari}"][data-jp="${jp}"] .mapel-cell`);
      const mapel = cell.querySelector('.mapel-name').textContent;
      const guru = cell.querySelector('.mapel-guru').textContent;
      
      if (mapel !== '-' && mapel !== '🕐 ISTIRAHAT') {
        jadwalData[`${hari}_${jp}`] = {
          mapel: mapel,
          guru: guru === '-' ? '' : guru
        };
      } else if (mapel === '🕐 ISTIRAHAT') {
        jadwalData[`${hari}_${jp}`] = { istirahat: true };
      }
    }
  });
  
  try {
    await set(ref(database, `jadwal/${kelas.replace(/\s+/g, '_')}`), {
      kelas: kelas,
      waliKelas: waliKelas,
      data: jadwalData,
      updatedAt: Date.now(),
      updatedBy: currentUser.uid || 'unknown'
    });
    
    // Simpan pengaturan bel
    const belSettings = {
      aktif: document.getElementById('optBelOtomatis')?.value === 'yes',
      volume: document.getElementById('inpVolumeBel')?.value || 70,
      waktu: {
        mulai: document.getElementById('inpBelMulai')?.value || '07:00',
        istirahat1: document.getElementById('inpBelIstirahat1')?.value || '09:00',
        lanjut: document.getElementById('inpBelLanjut')?.value || '09:30',
        pulang: document.getElementById('inpBelPulang')?.value || '13:00'
      }
    };
    
    await set(ref(database, `jadwal_settings/${kelas.replace(/\s+/g, '_')}`), belSettings);
    
    showToast('✅ Jadwal berhasil disimpan!');
  } catch (error) {
    console.error('Error save jadwal:', error);
    alert('❌ Gagal menyimpan jadwal: ' + error.message);
  }
};

/**
 * Reset tabel
 */
window.resetJadwal = function() {
  if (confirm('🔄 Reset semua jadwal? Data yang belum tersimpan akan hilang.')) {
    resetJadwalTable();
  }
};

function resetJadwalTable() {
  HARI_LIST.forEach(hari => {
    for (let jp = 1; jp <= 8; jp++) {
      updateCell(hari, jp, '', '');
    }
  });
}

/**
 * Print jadwal
 */
window.printJadwal = function() {
  const kelas = document.getElementById('inpKelas').value;
  if (!kelas) {
    alert('⚠️ Pilih kelas terlebih dahulu!');
    return;
  }
  window.print();
};

/**
 * Download Word
 */
window.downloadWord = function() {
  const kelas = document.getElementById('inpKelas').value;
  if (!kelas) {
    alert('⚠️ Pilih kelas terlebih dahulu!');
    return;
  }
  
  const waliKelas = document.getElementById('inpWaliKelas').value || '_______________________';
  const namaKepsek = document.getElementById('inpKepsek').value || '_______________________';
  const nipKepsek = document.getElementById('inpNipKepsek').value || '-';
  const namaGuru = document.getElementById('inpGuruPengampu').value || '_______________________';
  const nipGuru = document.getElementById('inpNipGuru').value || '-';
  
  // Build HTML table
  let tableHTML = `
    <table border="1" cellpadding="8" cellspacing="0" style="width: 100%; border-collapse: collapse; font-family: 'Times New Roman', serif; font-size: 12pt;">
      <thead>
        <tr style="background: #ec4899; color: white;">
          <th style="width: 80px; padding: 10px;">Jam</th>
          ${HARI_LIST.map(h => `<th style="padding: 10px;">${h}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
  `;
  
  for (let jp = 1; jp <= 8; jp++) {
    tableHTML += `<tr>`;
    tableHTML += `<td style="text-align: center; font-weight: bold; background: #fce7f3;">JP ${jp}</td>`;
    
    HARI_LIST.forEach(hari => {
      const cell = document.querySelector(`td[data-hari="${hari}"][data-jp="${jp}"] .mapel-cell`);
      const mapel = cell.querySelector('.mapel-name').textContent;
      const guru = cell.querySelector('.mapel-guru').textContent;
      
      if (mapel === '🕐 ISTIRAHAT') {
        tableHTML += `<td style="text-align: center; background: #94a3b8; color: white; font-style: italic;">ISTIRAHAT</td>`;
      } else if (mapel === '-') {
        tableHTML += `<td style="text-align: center; background: #f1f5f9;">-</td>`;
      } else {
        const warna = DEFAULT_JADWAL.warnaMapel[mapel] || '#94a3b8';
        tableHTML += `
          <td style="text-align: center; background: ${warna}20; border: 2px solid ${warna};">
            <strong style="color: ${warna}">${mapel}</strong><br>
            <small>${guru}</small>
          </td>
        `;
      }
    });
    
    tableHTML += `</tr>`;
  }
  
  tableHTML += `
      </tbody>
    </table>
  `;
  
  // Full HTML document
  const htmlContent = `
    <html>
    <head>
      <meta charset="utf-8">
      <title>Jadwal Pembelajaran - ${kelas}</title>
    </head>
    <body style="font-family: 'Times New Roman', serif; margin: 2cm;">
      <div style="text-align: center; margin-bottom: 30px; border-bottom: 3px double #000; padding-bottom: 15px;">
        <h1 style="margin: 0; font-size: 18pt; text-transform: uppercase;">JADWAL PEMBELAJARAN</h1>
        <h2 style="margin: 5px 0; font-size: 14pt; text-transform: uppercase;">${kelas}</h2>
        <p style="margin: 5px 0; font-size: 11pt;">Tahun Ajaran 2026/2027</p>
      </div>
      
      <div style="margin-bottom: 20px;">
        <table style="width: 60%; margin: 0 auto;">
          <tr>
            <td style="width: 35%;"><strong>Wali Kelas</strong></td>
            <td>: ${waliKelas}</td>
          </tr>
        </table>
      </div>
      
      ${tableHTML}
      
      <div style="margin-top: 40px; display: table; width: 100%;">
        <div style="display: table-cell; width: 50%; text-align: center; vertical-align: top;">
          <div>Mengetahui,</div>
          <div style="font-weight: bold; margin-bottom: 80px;">Kepala Sekolah<br>SDN 139 LAMANDA</div>
          <div style="border-bottom: 1px solid #000; display: inline-block; min-width: 200px; margin-bottom: 5px;"><strong>${namaKepsek}</strong></div>
          <div>NIP: ${nipKepsek}</div>
        </div>
        <div style="display: table-cell; width: 50%; text-align: center; vertical-align: top;">
          <div>Wali Kelas,</div>
          <div style="font-weight: bold; margin-bottom: 80px;">Guru Kelas</div>
          <div style="border-bottom: 1px solid #000; display: inline-block; min-width: 200px; margin-bottom: 5px;"><strong>${namaGuru}</strong></div>
          <div>NIP: ${nipGuru}</div>
        </div>
      </div>
      
      <div style="margin-top: 30px; text-align: right; font-size: 9pt; font-style: italic; color: #666;">
        Dokumen ini dibuat secara otomatis oleh Sistem Administrasi Pembelajaran<br>
        SDN 139 LAMANDA | ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
      </div>
    </body>
    </html>
  `;
  
  const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Jadwal_Pembelajaran_${kelas.replace(/\s+/g, '_')}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  
  showToast('📥 File Word berhasil diunduh!');
};

/**
 * Test Bel - Putar suara bel
 */
window.testBel = function() {
  playBelSound();
  showToast('🔔 Test bel berhasil!');
};

/**
 * Play Bel Sound - Menggunakan Web Audio API
 */
function playBelSound() {
  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Frekuensi bel sekolah (sekitar 800-1000 Hz)
    oscillator.frequency.value = 880;
    oscillator.type = 'sine';
    
    // Volume
    const volume = document.getElementById('inpVolumeBel')?.value || 70;
    gainNode.gain.value = volume / 100;
    
    // Durasi bel (2 detik)
    oscillator.start();
    setTimeout(() => {
      oscillator.stop();
    }, 2000);
    
  } catch (error) {
    console.error('Error play bel:', error);
  }
}

/**
 * Start Bel Otomatis
 */
function startBelOtomatis() {
  const aktif = document.getElementById('optBelOtomatis')?.value === 'yes';
  if (!aktif) return;
  
  // Clear interval sebelumnya
  if (belInterval) {
    clearInterval(belInterval);
  }
  
  // Check setiap detik
  belInterval = setInterval(() => {
    checkBelTime();
  }, 1000);
  
  // Update status
  const statusEl = document.getElementById('belStatus');
  const nextEl = document.getElementById('belNextTime');
  if (statusEl) {
    statusEl.textContent = '✅ Aktif';
    statusEl.style.color = '#10b981';
  }
  if (nextEl) {
    updateNextBelTime();
  }
  
  showToast('🔔 Bel otomatis aktif!');
}

/**
 * Stop Bel Otomatis
 */
function stopBelOtomatis() {
  if (belInterval) {
    clearInterval(belInterval);
    belInterval = null;
  }
  
  // Update status
  const statusEl = document.getElementById('belStatus');
  if (statusEl) {
    statusEl.textContent = '⏸️ Non-aktif';
    statusEl.style.color = '#be185d';
  }
}

/**
 * Check waktu bel
 */
function checkBelTime() {
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const currentSecond = now.getSeconds();
  
  // Hanya check di detik ke-0
  if (currentSecond !== 0) return;
  
  const belMulai = document.getElementById('inpBelMulai')?.value || '07:00';
  const belIstirahat1 = document.getElementById('inpBelIstirahat1')?.value || '09:00';
  const belLanjut = document.getElementById('inpBelLanjut')?.value || '09:30';
  const belPulang = document.getElementById('inpBelPulang')?.value || '13:00';
  
  let belName = '';
  
  if (currentTime === belMulai) {
    belName = '🔔 Mulai Belajar';
  } else if (currentTime === belIstirahat1) {
    belName = '☕ Istirahat 1';
  } else if (currentTime === belLanjut) {
    belName = '📚 Lanjut Belajar';
  } else if (currentTime === belPulang) {
    belName = '🏠 Waktu Pulang';
  }
  
  if (belName) {
    playBelSound();
    showBelNotification(belName);
    updateNextBelTime();
  }
}

/**
 * Show Bel Notification
 */
function showBelNotification(message) {
  // Buat notifikasi
  const notif = document.createElement('div');
  notif.innerHTML = `
    <div class="bell-notif-overlay"></div>
    <div class="bell-notif-content">
      <div class="bell-notif-icon">🔔</div>
      <div class="bell-notif-title">${message}</div>
      <div class="bell-notif-time">${new Date().toLocaleTimeString('id-ID')}</div>
    </div>
  `;
  
  document.body.appendChild(notif);
  
  // Hapus setelah 3 detik
  setTimeout(() => {
    notif.remove();
  }, 3000);
}

/**
 * Update Next Bel Time
 */
function updateNextBelTime() {
  const belMulai = document.getElementById('inpBelMulai')?.value || '07:00';
  const belIstirahat1 = document.getElementById('inpBelIstirahat1')?.value || '09:00';
  const belLanjut = document.getElementById('inpBelLanjut')?.value || '09:30';
  const belPulang = document.getElementById('inpBelPulang')?.value || '13:00';
  
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  
  const belTimes = [
    { time: belMulai, name: 'Mulai Belajar' },
    { time: belIstirahat1, name: 'Istirahat 1' },
    { time: belLanjut, name: 'Lanjut Belajar' },
    { time: belPulang, name: 'Pulang' }
  ];
  
  let nextBel = '-';
  for (const bel of belTimes) {
    if (bel.time > currentTime) {
      nextBel = `${bel.name} (${bel.time})`;
      break;
    }
  }
  
  const nextEl = document.getElementById('belNextTime');
  if (nextEl) {
    nextEl.textContent = `Bel berikutnya: ${nextBel}`;
  }
}

/**
 * Update volume display
 */
function updateVolumeDisplay() {
  const volume = document.getElementById('inpVolumeBel')?.value || 70;
  const volumeValue = document.getElementById('volumeValue');
  if (volumeValue) {
    volumeValue.textContent = volume;
  }
}

function showToast(msg) {
  const toast = document.createElement('div');
  toast.textContent = msg;
  toast.style.cssText = `position: fixed; top: 20px; right: 20px; background: #ec4899; color: white; padding: 14px 24px; border-radius: 10px; z-index: 10001; box-shadow: 0 4px 16px rgba(236, 72, 153, 0.4); font-weight: 600; font-size: 14px; animation: slideIn 0.3s ease;`;
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.animation = 'slideOut 0.3s ease'; setTimeout(() => toast.remove(), 300); }, 3000);
}
