// modules/admin-pembelajaran/features/lkpd.js
// =========================================
// FITUR: GENERATOR LKPD (AI POWERED)
// 6 TEMPLATE: Isian, PG, Praktik, Observasi, Proyek, Diskusi
// OUTPUT: Versi Siswa + Versi Guru (dengan kunci jawaban)
// =========================================

import { db } from '../../../js/firebase-config.js';
import { getDatabase, ref, get, push, set } 
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { getFirestore, doc, getDoc } 
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
const database = getDatabase();
const firestore = getFirestore();

// Groq API Configuration
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

// State
const CSS_ID = 'lkpd-css';
let storedApiKey = null;
let currentLkpdData = { siswa: '', guru: '' };

// Default data tanda tangan
const DEFAULT_TTD = {
  namaKepsek: 'Imam munandar SP.d',
  nipKepsek: '-',
  namaGuru: 'Hasriandi basir SP.d',
  nipGuru: '-'
};

// 6 Template LKPD
const TEMPLATE_LKPD = [
  { id: 'isian', icon: '', nama: 'Isian Singkat', deskripsi: 'Soal isian dengan ruang jawab' },
  { id: 'pg', icon: '🔘', nama: 'Pilihan Ganda', deskripsi: 'Format kuis dengan 4 opsi' },
  { id: 'praktik', icon: '🔬', nama: 'Praktik/Eksperimen', deskripsi: 'Langkah kerja + tabel observasi' },
  { id: 'observasi', icon: '️', nama: 'Observasi', deskripsi: 'Tabel pengamatan' },
  { id: 'proyek', icon: '🏗️', nama: 'Proyek', deskripsi: 'Tugas proyek dengan tahapan' },
  { id: 'diskusi', icon: '💬', nama: 'Diskusi Kelompok', deskripsi: 'Format kolaboratif' }
];

/**
 * Init
 */
export async function init(container, db) {
  loadCSS();
  renderUI(container);
  attachEvents();
  await loadApiKeyFromFirestore();
  loadTTDDefaults();
}

export function cleanup() {
  const css = document.getElementById(CSS_ID);
  if (css) css.remove();
}

/**
 * Load CSS - INLINE
 */
function loadCSS() {
  if (document.getElementById(CSS_ID)) return;
  
  const style = document.createElement('style');
  style.id = CSS_ID;
  style.textContent = `
    .lkpd-container { 
      background: linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%);
      border-radius: 16px; 
      padding: 25px; 
      font-family: 'Segoe UI', sans-serif; 
      max-width: 1200px; 
      margin: 0 auto;
      box-shadow: 0 8px 24px rgba(236, 72, 153, 0.15);
    }
    .lkpd-header { 
      background: linear-gradient(135deg, #ec4899 0%, #f472b6 100%); 
      color: white; 
      padding: 30px; 
      border-radius: 12px; 
      margin-bottom: 25px; 
      box-shadow: 0 4px 12px rgba(236, 72, 153, 0.3); 
    }
    .lkpd-header h2 { margin: 0 0 8px 0; font-size: 28px; font-weight: 700; }
    .lkpd-header p { margin: 0; opacity: 0.95; font-size: 15px; }
    .lkpd-form { 
      background: white; 
      padding: 30px; 
      border-radius: 12px; 
      box-shadow: 0 2px 8px rgba(236, 72, 153, 0.1); 
    }
    .form-section-title { 
      font-size: 18px; 
      font-weight: 700; 
      color: #be185d; 
      margin: 25px 0 18px 0; 
      border-bottom: 3px solid #fce7f3; 
      padding-bottom: 8px; 
    }
    .form-section-title:first-child { margin-top: 0; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 15px; }
    .form-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-bottom: 15px; }
    .form-group { margin-bottom: 18px; }
    .form-group label { display: block; margin-bottom: 8px; font-weight: 600; font-size: 14px; color: #831843; }
    .form-control { 
      width: 100%; 
      padding: 14px 16px; 
      border: 2px solid #fbcfe8; 
      border-radius: 8px; 
      font-size: 15px; 
      box-sizing: border-box; 
      transition: all 0.2s;
      background: white;
      color: #831843;
    }
    .form-control:focus { outline: none; border-color: #ec4899; box-shadow: 0 0 0 3px rgba(236, 72, 153, 0.15); }
    textarea.form-control { resize: vertical; min-height: 100px; font-family: inherit; }
    select.form-control { cursor: pointer; }
    
    /* Template Selection */
    .template-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 15px;
      margin-bottom: 20px;
    }
    .template-card {
      background: white;
      border: 2px solid #fce7f3;
      border-radius: 10px;
      padding: 15px;
      cursor: pointer;
      transition: all 0.2s;
      text-align: center;
    }
    .template-card:hover {
      border-color: #ec4899;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(236, 72, 153, 0.2);
    }
    .template-card.selected {
      border-color: #ec4899;
      background: #fff1f2;
      box-shadow: 0 0 0 3px rgba(236, 72, 153, 0.2);
    }
    .template-icon { font-size: 32px; margin-bottom: 8px; }
    .template-name { font-weight: 700; color: #831843; font-size: 14px; margin-bottom: 4px; }
    .template-desc { font-size: 11px; color: #64748b; }
    
    .gen-action { margin-top: 30px; text-align: center; }
    .btn-generate { 
      background: linear-gradient(135deg, #ec4899 0%, #f472b6 100%); 
      color: white; 
      border: none; 
      padding: 18px 50px; 
      border-radius: 10px; 
      font-size: 18px; 
      font-weight: 700; 
      cursor: pointer; 
      box-shadow: 0 4px 16px rgba(236, 72, 153, 0.4); 
      transition: all 0.2s; 
      display: inline-flex; 
      align-items: center; 
      gap: 12px; 
    }
    .btn-generate:hover:not(:disabled) { transform: translateY(-3px); box-shadow: 0 6px 20px rgba(236, 72, 153, 0.5); }
    .btn-generate:disabled { opacity: 0.5; cursor: not-allowed; background: #9ca3af; box-shadow: none; }
    .loading-overlay { 
      display: none; 
      text-align: center; 
      padding: 50px; 
      background: white; 
      border-radius: 12px; 
      margin-top: 25px;
      box-shadow: 0 2px 8px rgba(236, 72, 153, 0.1);
    }
    .spinner { 
      border: 5px solid #fce7f3; 
      border-top: 5px solid #ec4899; 
      border-radius: 50%; 
      width: 50px; 
      height: 50px; 
      animation: spin 1s linear infinite; 
      margin: 0 auto 20px; 
    }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    
    .output-area { 
      display: none; 
      margin-top: 25px; 
      background: white; 
      border-radius: 12px; 
      padding: 35px; 
      box-shadow: 0 4px 12px rgba(236, 72, 153, 0.15); 
      border: 2px solid #fce7f3; 
    }
    .output-tabs {
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
      border-bottom: 2px solid #fce7f3;
      padding-bottom: 10px;
    }
    .tab-btn {
      padding: 10px 20px;
      border: none;
      background: #f1f5f9;
      border-radius: 8px 8px 0 0;
      cursor: pointer;
      font-weight: 600;
      font-size: 14px;
      color: #64748b;
      transition: all 0.2s;
    }
    .tab-btn.active {
      background: #ec4899;
      color: white;
    }
    .tab-content { display: none; }
    .tab-content.active { display: block; }
    
    .output-header { 
      display: flex; 
      justify-content: space-between; 
      align-items: center; 
      margin-bottom: 25px; 
      border-bottom: 3px solid #fce7f3; 
      padding-bottom: 15px; 
      flex-wrap: wrap; 
      gap: 10px; 
    }
    .output-header h3 { margin: 0; color: #831843; font-size: 20px; }
    .output-content { 
      line-height: 1.8; 
      color: #334155; 
      font-size: 15px; 
      white-space: pre-wrap; 
      font-family: 'Segoe UI', sans-serif; 
      background: #fff1f2;
      padding: 20px;
      border-radius: 8px;
      border-left: 4px solid #ec4899;
      min-height: 300px;
    }
    .output-content h1 { font-size: 22px; color: #be185d; border-bottom: 2px solid #fbcfe8; padding-bottom: 10px; margin-top: 20px; }
    .output-content h2 { font-size: 18px; color: #ec4899; margin-top: 25px; }
    .output-content h3 { font-size: 16px; color: #db2777; margin-top: 18px; }
    .output-content ul, .output-content ol { padding-left: 30px; }
    .output-content li { margin-bottom: 8px; }
    
    .ttd-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #fce7f3;
    }
    .ttd-box {
      text-align: center;
      padding: 15px;
      background: #fff1f2;
      border-radius: 8px;
    }
    .ttd-label { font-size: 13px; color: #831843; font-weight: 600; margin-bottom: 8px; }
    .ttd-role { font-size: 16px; font-weight: 700; color: #be185d; margin-bottom: 60px; min-height: 80px; }
    .ttd-name { font-size: 15px; font-weight: 700; color: #1e293b; margin-bottom: 4px; border-bottom: 1px solid #831843; padding-bottom: 4px; }
    .ttd-nip { font-size: 13px; color: #64748b; }
    
    .output-actions-bar { 
      display: flex; 
      gap: 12px; 
      margin-top: 30px; 
      padding-top: 25px; 
      border-top: 3px solid #fce7f3; 
      flex-wrap: wrap; 
      justify-content: center;
    }
    .btn-action { 
      padding: 12px 24px; 
      border: none; 
      border-radius: 8px; 
      font-weight: 600; 
      font-size: 15px; 
      cursor: pointer; 
      display: inline-flex; 
      align-items: center; 
      gap: 8px; 
      transition: all 0.2s;
      box-shadow: 0 2px 6px rgba(0,0,0,0.1);
    }
    .btn-action:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
    .btn-print { background: #8b5cf6; color: white; }
    .btn-print:hover { background: #7c3aed; }
    .btn-save { background: #10b981; color: white; }
    .btn-save:hover { background: #059669; }
    .btn-edit { background: #f59e0b; color: white; }
    .btn-edit:hover { background: #d97706; }
    .btn-edit.active { background: #dc2626; }
    .btn-download { background: #3b82f6; color: white; }
    .btn-download:hover { background: #2563eb; }
    .output-content.editing { 
      border: 3px dashed #f59e0b; 
      padding: 20px; 
      border-radius: 8px; 
      background: #fffbeb; 
      outline: none;
    }
    
    /* Checkbox custom */
    .checkbox-group {
      display: flex;
      gap: 20px;
      flex-wrap: wrap;
    }
    .checkbox-item {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      font-size: 14px;
      color: #831843;
    }
    .checkbox-item input[type="checkbox"] {
      width: 18px;
      height: 18px;
      cursor: pointer;
    }
    
    @media print {
      body * { visibility: hidden; }
      .output-area, .output-area * { visibility: visible; }
      .output-area { position: absolute; left: 0; top: 0; width: 100%; padding: 20px; box-shadow: none; border: none; background: white !important; }
      .output-actions-bar, .output-header, .output-tabs { display: none !important; }
      .output-content { border: none; background: white; }
      .ttd-section { page-break-inside: avoid; }
    }
    @media (max-width: 768px) { 
      .lkpd-container { padding: 15px; }
      .lkpd-header { padding: 20px; }
      .lkpd-header h2 { font-size: 22px; }
      .lkpd-form { padding: 20px; }
      .form-grid, .form-grid-3 { grid-template-columns: 1fr; gap: 15px; } 
      .template-grid { grid-template-columns: 1fr 1fr; }
      .output-header { flex-direction: column; align-items: flex-start; }
      .output-actions-bar { flex-direction: column; }
      .btn-action { width: 100%; justify-content: center; }
      .form-control { font-size: 14px; padding: 12px 14px; }
      .ttd-section { grid-template-columns: 1fr; gap: 20px; }
    }
  `;
  document.head.appendChild(style);
}

/**
 * Load API Key dari Firestore
 */
async function loadApiKeyFromFirestore() {
  try {
    const docRef = doc(firestore, 'settings', 'api_key');
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data.keys) {
        const activeKeys = Object.values(data.keys).filter(k => k.active === true);
        if (activeKeys.length > 0) {
          storedApiKey = activeKeys[0].value;
        }
      }
    }
    
    const btnGenerate = document.getElementById('btnGenerate');
    if (btnGenerate) {
      btnGenerate.disabled = !storedApiKey;
    }
    
    console.log('✅ API Key loaded:', storedApiKey ? 'Available' : 'Not found');
  } catch (error) {
    console.error('❌ Error load API key:', error);
  }
}

/**
 * Load Data Tanda Tangan Default dari localStorage
 */
function loadTTDDefaults() {
  const saved = localStorage.getItem('lkpd_ttd');
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
  
  localStorage.setItem('lkpd_ttd', JSON.stringify(ttdData));
}

function renderUI(container) {
  const aiReady = storedApiKey ? true : false;
  
  // Generate template cards HTML
  const templateCards = TEMPLATE_LKPD.map((t, idx) => `
    <div class="template-card ${idx === 0 ? 'selected' : ''}" data-template="${t.id}">
      <div class="template-icon">${t.icon}</div>
      <div class="template-name">${t.nama}</div>
      <div class="template-desc">${t.deskripsi}</div>
    </div>
  `).join('');
  
  container.innerHTML = `
    <div class="lkpd-container">
      <div class="lkpd-header">
        <h2>📋 Generator LKPD AI</h2>
        <p>Buat Lembar Kerja Peserta Didik profesional dengan 6 template berbeda.
          ${aiReady ? '<span style="display:inline-block; margin-left:10px; padding:4px 12px; background:rgba(255,255,255,0.2); border-radius:20px; font-size:13px; font-weight:600;">✅ AI Siap</span>' : '<span style="display:inline-block; margin-left:10px; padding:4px 12px; background:rgba(255,255,255,0.2); border-radius:20px; font-size:13px; font-weight:600;">⚠️ API Key Belum Aktif</span>'}
        </p>
      </div>

      <div class="lkpd-form">
        <div class="form-section-title">🎨 1. Pilih Template LKPD</div>
        <div class="template-grid" id="templateGrid">
          ${templateCards}
        </div>
        <input type="hidden" id="inpTemplate" value="isian">

        <div class="form-section-title">📋 2. Informasi Umum</div>
        <div class="form-grid">
          <div class="form-group">
            <label>👤 Nama Guru / Penyusun</label>
            <input type="text" id="inpGuru" class="form-control" placeholder="Nama Anda" value="${currentUser.namaLengkap || currentUser.nama || 'Hasriandi basir SP.d'}">
          </div>
          <div class="form-group">
            <label>🏫 Satuan Pendidikan</label>
            <input type="text" id="inpSekolah" class="form-control" value="${currentUser.namaSekolah || 'SDN 139 LAMANDA'}">
          </div>
        </div>
        <div class="form-grid">
          <div class="form-group">
            <label> Mata Pelajaran</label>
            <input type="text" id="inpMapel" class="form-control" placeholder="Contoh: Matematika">
          </div>
          <div class="form-group">
            <label>🎓 Semester</label>
            <select id="inpSemester" class="form-control">
              <option value="1">Semester 1 (Ganjil)</option>
              <option value="2">Semester 2 (Genap)</option>
            </select>
          </div>
        </div>
        <div class="form-grid-3">
          <div class="form-group">
            <label>🎓 Kelas / Fase</label>
            <select id="inpKelas" class="form-control">
              <option value="1 (Fase A)">Kelas 1 (Fase A)</option>
              <option value="2 (Fase A)">Kelas 2 (Fase A)</option>
              <option value="3 (Fase B)">Kelas 3 (Fase B)</option>
              <option value="4 (Fase B)">Kelas 4 (Fase B)</option>
              <option value="5 (Fase C)">Kelas 5 (Fase C)</option>
              <option value="6 (Fase C)">Kelas 6 (Fase C)</option>
            </select>
          </div>
          <div class="form-group">
            <label>📝 Topik / Materi</label>
            <input type="text" id="inpTopik" class="form-control" placeholder="Contoh: Pecahan Sederhana">
          </div>
          <div class="form-group">
            <label>⏰ Alokasi Waktu</label>
            <input type="text" id="inpWaktu" class="form-control" placeholder="Contoh: 35 Menit">
          </div>
        </div>
        <div class="form-grid">
          <div class="form-group">
            <label>👥 Jenis Pekerjaan</label>
            <select id="inpJenisKerja" class="form-control">
              <option value="Individu">Individu</option>
              <option value="Berpasangan">Berpasangan</option>
              <option value="Kelompok (3-4 siswa)">Kelompok (3-4 siswa)</option>
              <option value="Kelompok (5-6 siswa)">Kelompok (5-6 siswa)</option>
            </select>
          </div>
          <div class="form-group">
            <label>🎯 Tujuan Pembelajaran</label>
            <input type="text" id="inpTujuan" class="form-control" placeholder="Contoh: Siswa mampu menjumlahkan pecahan">
          </div>
        </div>

        <div class="form-section-title">✍️ 3. Tanda Tangan (Default - Bisa Diedit)</div>
        <div class="form-grid">
          <div class="form-group">
            <label>👨‍💼 Nama Kepala Sekolah</label>
            <input type="text" id="inpKepsek" class="form-control" placeholder="Nama lengkap Kepala Sekolah">
          </div>
          <div class="form-group">
            <label> NIP Kepala Sekolah</label>
            <input type="text" id="inpNipKepsek" class="form-control" placeholder="NIP Kepala Sekolah">
          </div>
        </div>
        <div class="form-grid">
          <div class="form-group">
            <label>👩‍🏫 Nama Guru Pengampu</label>
            <input type="text" id="inpGuruPengampu" class="form-control" placeholder="Nama Guru Pengampu">
          </div>
          <div class="form-group">
            <label> NIP Guru Pengampu</label>
            <input type="text" id="inpNipGuru" class="form-control" placeholder="NIP Guru Pengampu">
          </div>
        </div>

        <div class="form-section-title">️ 4. Opsi Output</div>
        <div class="checkbox-group">
          <label class="checkbox-item">
            <input type="checkbox" id="optVersiGuru" checked>
            <span>📗 Sertakan Versi Guru (dengan kunci jawaban & rubrik)</span>
          </label>
        </div>

        <div class="gen-action">
          <button class="btn-generate" id="btnGenerate" ${!storedApiKey ? 'disabled' : ''}>
            <span>✨</span> Generate LKPD
          </button>
        </div>
      </div>

      <div class="loading-overlay" id="loadingState">
        <div class="spinner"></div>
        <h3 style="color:#ec4899; margin-bottom:10px;">Sedang Menyusun LKPD...</h3>
        <p style="color:#64748b; font-size:14px;">AI sedang membuat LKPD sesuai template yang dipilih.<br>Mohon tunggu 20-40 detik.</p>
      </div>

      <div class="output-area" id="outputArea">
        <div class="output-header">
          <h3> Hasil Generate LKPD</h3>
          <span id="editIndicator" style="display:none; background:#fbbf24; color:#1e293b; padding:6px 14px; border-radius:20px; font-size:13px; font-weight:600;">✏️ Mode Edit Aktif</span>
        </div>
        
        <!-- Tabs untuk Versi Siswa & Guru -->
        <div class="output-tabs" id="outputTabs">
          <button class="tab-btn active" data-tab="siswa">📘 Versi Siswa</button>
          <button class="tab-btn" data-tab="guru" id="tabGuru" style="display:none;">📗 Versi Guru</button>
        </div>
        
        <div class="tab-content active" id="tabSiswa">
          <div class="output-content" id="outputSiswa"></div>
        </div>
        <div class="tab-content" id="tabGuru">
          <div class="output-content" id="outputGuru"></div>
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
            <div class="ttd-label">Guru Pengampu,</div>
            <div class="ttd-role">Guru Mata Pelajaran</div>
            <div class="ttd-name" id="ttdNamaGuru">_______________________</div>
            <div class="ttd-nip" id="ttdNipGuru">NIP: -</div>
          </div>
        </div>
        
        <div class="output-actions-bar">
          <button class="btn-action btn-print" id="btnPrint">🖨️ Print</button>
          <button class="btn-action btn-save" id="btnSaveDb">💾 Simpan ke DB</button>
          <button class="btn-action btn-edit" id="btnEdit">✏️ Edit</button>
          <button class="btn-action btn-download" id="btnDownload">📥 Download Word</button>
        </div>
      </div>
    </div>
  `;
}

function attachEvents() {
  // Template selection
  document.querySelectorAll('.template-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.template-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      document.getElementById('inpTemplate').value = card.dataset.template;
    });
  });

  document.getElementById('btnGenerate').addEventListener('click', handleGenerate);
  document.getElementById('btnPrint').addEventListener('click', handlePrint);
  document.getElementById('btnSaveDb').addEventListener('click', saveToDatabase);
  document.getElementById('btnEdit').addEventListener('click', toggleEditMode);
  document.getElementById('btnDownload').addEventListener('click', handleDownloadWord);

  // Tab switching
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab' + capitalize(btn.dataset.tab)).classList.add('active');
    });
  });

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
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
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
 * Build prompt berdasarkan template yang dipilih
 */
function buildPrompt(template, data) {
  const baseInfo = `
    DATA INPUT:
    - Penyusun: ${data.guru}
    - Sekolah: ${data.sekolah}
    - Mata Pelajaran: ${data.mapel}
    - Kelas/Fase: ${data.kelas}
    - Semester: ${data.semester}
    - Topik/Materi: ${data.topik}
    - Alokasi Waktu: ${data.waktu}
    - Jenis Pekerjaan: ${data.jenisKerja}
    - Tujuan Pembelajaran: ${data.tujuan}
  `;

  const prompts = {
    isian: `
      Buatkan LKPD tipe ISIAN SINGKAT berdasarkan data di atas.

      STRUKTUR WAJIB (Versi Siswa):
      # LEMBAR KERJA PESERTA DIDIK (LKPD)
      ## Identitas LKPD
      - Mata Pelajaran, Kelas/Semester, Topik, Alokasi Waktu, Jenis Pekerjaan
      ## Identitas Siswa
      - Nama, Kelas, Tanggal, Kelompok (jika berkelompok)
      ## Tujuan Pembelajaran
      ## Petunjuk Pengerjaan
      ## Soal Isian (10-15 soal)
      Format setiap soal:
      Nomor. Pertanyaan/soal
      Jawab: _______________________________
      ## Refleksi Diri (2-3 pertanyaan reflektif)

      STRUKTUR WAJIB (Versi Guru - TERPISAH):
      # KUNCI JAWABAN & RUBRIK PENILAIAN
      ## Kunci Jawaban (semua soal)
      ## Rubrik Penilaian
      - Skor per soal
      - Kriteria penilaian
      - Skor maksimal
      ## Pedoman Penskoran
    `,

    pg: `
      Buatkan LKPD tipe PILIHAN GANDA berdasarkan data di atas.

      STRUKTUR WAJIB (Versi Siswa):
      # LEMBAR KERJA PESERTA DIDIK (LKPD)
      ## Identitas LKPD
      ## Identitas Siswa
      ## Tujuan Pembelajaran
      ## Petunjuk Pengerjaan
      ## Soal Pilihan Ganda (10-15 soal)
      Format setiap soal:
      Nomor. Pertanyaan
      A. Opsi A
      B. Opsi B
      C. Opsi C
      D. Opsi D
      ## Refleksi Diri

      STRUKTUR WAJIB (Versi Guru - TERPISAH):
      # KUNCI JAWABAN & RUBRIK PENILAIAN
      ## Kunci Jawaban (dengan pembahasan singkat)
      ## Rubrik Penilaian
      ## Pedoman Penskoran
    `,

    praktik: `
      Buatkan LKPD tipe PRAKTIK/EKSPERIMEN berdasarkan data di atas.

      STRUKTUR WAJIB (Versi Siswa):
      # LEMBAR KERJA PESERTA DIDIK (LKPD) - PRAKTIK
      ## Identitas LKPD
      ## Identitas Siswa
      ## Tujuan Pembelajaran
      ## Alat dan Bahan
      ## Langkah Kerja (step-by-step, detail)
      ## Tabel Pengamatan/Observasi
      Format tabel dengan kolom yang sesuai topik
      ## Pertanyaan Analisis (3-5 pertanyaan)
      ## Kesimpulan
      ## Refleksi Diri

      STRUKTUR WAJIB (Versi Guru - TERPISAH):
      # PANDUAN GURU
      ## Tujuan Praktikum
      ## Alat dan Bahan (lengkap)
      ## Prosedur Detail
      ## Hasil yang Diharapkan
      ## Kunci Jawaban Pertanyaan Analisis
      ## Rubrik Penilaian Praktikum
      ## Kriteria Keamanan
    `,

    observasi: `
      Buatkan LKPD tipe OBSERVASI berdasarkan data di atas.

      STRUKTUR WAJIB (Versi Siswa):
      # LEMBAR KERJA PESERTA DIDIK (LKPD) - OBSERVASI
      ## Identitas LKPD
      ## Identitas Siswa
      ## Tujuan Observasi
      ## Lokasi/Waktu Observasi
      ## Petunjuk Observasi
      ## Tabel Observasi
      Format tabel dengan kolom: No, Aspek yang Diamati, Hasil Pengamatan, Keterangan
      ## Pertanyaan Analisis (3-5 pertanyaan)
      ## Kesimpulan
      ## Refleksi Diri

      STRUKTUR WAJIB (Versi Guru - TERPISAH):
      # PANDUAN GURU
      ## Tujuan Observasi
      ## Aspek yang Dinilai
      ## Kunci Jawaban Pertanyaan Analisis
      ## Rubrik Penilaian Observasi
      ## Pedoman Penskoran
    `,

    proyek: `
      Buatkan LKPD tipe PROYEK berdasarkan data di atas.

      STRUKTUR WAJIB (Versi Siswa):
      # LEMBAR KERJA PESERTA DIDIK (LKPD) - PROYEK
      ## Identitas LKPD
      ## Identitas Siswa/Kelompok
      ## Tujuan Proyek
      ## Deskripsi Proyek
      ## Tahapan Pengerjaan
      - Tahap 1: Perencanaan
      - Tahap 2: Pelaksanaan
      - Tahap 3: Penyajian/Produk
      ## Checklist Kelengkapan
      ## Rubrik Self-Assessment
      ## Refleksi Proyek

      STRUKTUR WAJIB (Versi Guru - TERPISAH):
      # PANDUAN GURU
      ## Tujuan Proyek
      ## Kriteria Produk Akhir
      ## Rubrik Penilaian Proyek (dengan skala 1-4)
      ## Aspek yang Dinilai:
      - Perencanaan
      - Pelaksanaan
      - Kerjasama
      - Produk Akhir
      - Presentasi
      ## Pedoman Penskoran
    `,

    diskusi: `
      Buatkan LKPD tipe DISKUSI KELOMPOK berdasarkan data di atas.

      STRUKTUR WAJIB (Versi Siswa):
      # LEMBAR KERJA PESERTA DIDIK (LKPD) - DISKUSI KELOMPOK
      ## Identitas LKPD
      ## Identitas Kelompok
      - Nama Anggota (4-6 siswa dengan peran: ketua, sekretaris, anggota)
      ## Tujuan Diskusi
      ## Topik/Masalah yang Didiskusikan
      ## Pertanyaan Pemantik (3-5 pertanyaan)
      ## Format Diskusi
      - Pendapat Anggota 1
      - Pendapat Anggota 2
      - dst
      ## Kesimpulan Kelompok
      ## Presentasi Hasil
      ## Refleksi Kelompok

      STRUKTUR WAJIB (Versi Guru - TERPISAH):
      # PANDUAN GURU
      ## Tujuan Diskusi
      ## Pembagian Peran dalam Kelompok
      ## Kunci Jawaban/Pedoman Diskusi
      ## Rubrik Penilaian Diskusi
      - Keaktifan
      - Kerjasama
      - Kedalaman Analisis
      - Presentasi
      ## Pedoman Penskoran
    `
  };

  return baseInfo + '\n\n' + prompts[template];
}

async function handleGenerate() {
  if (!storedApiKey) {
    alert('⚠️ API Key tidak tersedia.');
    return;
  }

  const template = document.getElementById('inpTemplate').value;
  const semester = document.getElementById('inpSemester').value;
  const labelSemester = semester === '1' ? '1 (Ganjil)' : '2 (Genap)';

  const data = {
    guru: document.getElementById('inpGuru').value || '[Nama Guru]',
    sekolah: document.getElementById('inpSekolah').value || 'SDN 139 LAMANDA',
    mapel: document.getElementById('inpMapel').value,
    kelas: document.getElementById('inpKelas').value,
    semester: labelSemester,
    topik: document.getElementById('inpTopik').value,
    waktu: document.getElementById('inpWaktu').value,
    jenisKerja: document.getElementById('inpJenisKerja').value,
    tujuan: document.getElementById('inpTujuan').value || 'Sesuai dengan kurikulum yang berlaku.'
  };

  if (!data.mapel || !data.topik) {
    alert('️ Mata Pelajaran dan Topik wajib diisi!');
    return;
  }

  document.getElementById('loadingState').style.display = 'block';
  document.getElementById('outputArea').style.display = 'none';
  document.getElementById('btnGenerate').disabled = true;

  const includeGuru = document.getElementById('optVersiGuru').checked;

  const prompt = `
    Anda adalah guru ahli Kurikulum Merdeka di Indonesia.
    
    ${buildPrompt(template, data)}
    
    CATATAN PENTING:
    - Gunakan bahasa Indonesia formal dan edukatif
    - Sesuaikan dengan fase perkembangan siswa (${data.kelas})
    - Buat konten yang AKTIF, kreatif, dan berpusat pada siswa
    - Jika opsi Versi Guru diminta, BUAT TERPISAH dengan heading yang jelas
    - Untuk Versi Siswa: JANGAN sertakan kunci jawaban
    - Untuk Versi Guru: SERTAKAN kunci jawaban lengkap dan rubrik penilaian detail
  `;

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${storedApiKey}`
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: "system", content: "Anda adalah ahli pendidikan dan pengembang LKPD Kurikulum Merdeka di Indonesia." },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 5000
      })
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error?.message || 'Gagal menghubungi API');
    }

    const result = await response.json();
    const aiText = result.choices[0].message.content;

    // Parse output menjadi versi siswa dan guru
    parseAIOutput(aiText, includeGuru);

    document.getElementById('outputArea').style.display = 'block';
    updateTTDPreview();
    document.getElementById('outputArea').scrollIntoView({ behavior: 'smooth', block: 'start' });

  } catch (error) {
    alert('❌ Error: ' + error.message);
    console.error(error);
  } finally {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('btnGenerate').disabled = false;
  }
}

/**
 * Parse output AI menjadi versi siswa dan guru
 */
function parseAIOutput(aiText, includeGuru) {
  // Cari pemisah antara versi siswa dan guru
  const guruMarkers = [
    'KUNCI JAWABAN & RUBRIK PENILAIAN',
    'PANDUAN GURU',
    'VERSI GURU',
    '## KUNCI JAWABAN',
    '## PANDUAN GURU'
  ];

  let siswaText = aiText;
  let guruText = '';

  if (includeGuru) {
    // Cari posisi marker versi guru
    let guruStart = -1;
    for (const marker of guruMarkers) {
      const idx = aiText.indexOf(marker);
      if (idx !== -1 && (guruStart === -1 || idx < guruStart)) {
        guruStart = idx;
      }
    }

    if (guruStart !== -1) {
      siswaText = aiText.substring(0, guruStart).trim();
      guruText = aiText.substring(guruStart).trim();
    } else {
      // Jika tidak ada pemisah jelas, pakai semua sebagai versi siswa
      siswaText = aiText;
    }
  }

  currentLkpdData = { siswa: siswaText, guru: guruText };

  document.getElementById('outputSiswa').innerText = siswaText;
  document.getElementById('outputGuru').innerText = guruText || 'Versi Guru tidak tersedia.';

  // Show/hide tab guru
  const tabGuru = document.getElementById('tabGuru');
  if (tabGuru) {
    tabGuru.style.display = includeGuru && guruText ? 'inline-block' : 'none';
  }

  // Reset ke tab siswa
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  document.querySelector('[data-tab="siswa"]').classList.add('active');
  document.getElementById('tabSiswa').classList.add('active');
}

function handlePrint() {
  const activeTab = document.querySelector('.tab-content.active .output-content');
  if (!activeTab || !activeTab.innerText.trim()) { 
    alert('Tidak ada konten untuk dicetak!'); 
    return; 
  }
  exitEditMode();
  window.print();
}

function toggleEditMode() {
  const activeContent = document.querySelector('.tab-content.active .output-content');
  if (!activeContent) return;
  
  const editBtn = document.getElementById('btnEdit');
  const indicator = document.getElementById('editIndicator');
  
  if (activeContent.isContentEditable) {
    exitEditMode();
    showToast('✅ Perubahan disimpan (lokal)');
  } else {
    activeContent.contentEditable = true;
    activeContent.classList.add('editing');
    activeContent.focus();
    editBtn.innerHTML = '✅ Selesai Edit';
    editBtn.classList.add('active');
    indicator.style.display = 'inline-block';
    showToast('✏️ Mode Edit aktif.');
  }
}

function exitEditMode() {
  document.querySelectorAll('.output-content').forEach(el => {
    el.contentEditable = false;
    el.classList.remove('editing');
  });
  const editBtn = document.getElementById('btnEdit');
  const indicator = document.getElementById('editIndicator');
  if (editBtn) editBtn.innerHTML = '✏️ Edit';
  if (editBtn) editBtn.classList.remove('active');
  if (indicator) indicator.style.display = 'none';
}

/**
 * Download sebagai Word Document (.doc)
 */
function handleDownloadWord() {
  const includeGuru = document.getElementById('optVersiGuru').checked;
  const siswaContent = document.getElementById('outputSiswa').innerText;
  const guruContent = document.getElementById('outputGuru').innerText;
  
  if (!siswaContent) { 
    alert('Tidak ada konten untuk diunduh!'); 
    return; 
  }
  exitEditMode();

  const topik = document.getElementById('inpTopik').value || 'LKPD';
  const mapel = document.getElementById('inpMapel').value || 'Umum';
  const kelas = document.getElementById('inpKelas').value.split(' ')[0] || 'X';
  const semester = document.getElementById('inpSemester').value;
  const labelSemester = semester === '1' ? 'Ganjil' : 'Genap';
  const sekolah = document.getElementById('inpSekolah').value || 'SDN 139 LAMANDA';
  const namaGuru = document.getElementById('inpGuru').value || 'Guru';
  const namaKepsek = document.getElementById('inpKepsek').value || '_______________________';
  const nipKepsek = document.getElementById('inpNipKepsek').value || '-';
  const namaGuruPengampu = document.getElementById('inpGuruPengampu').value || '_______________________';
  const nipGuruPengampu = document.getElementById('inpNipGuru').value || '-';
  const waktu = document.getElementById('inpWaktu').value || '-';
  const jenisKerja = document.getElementById('inpJenisKerja').value;
  
  let htmlContent = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' 
          xmlns:w='urn:schemas-microsoft-com:office:word' 
          xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset='utf-8'>
      <title>LKPD - ${topik}</title>
      <!--[if gte mso 9]>
      <xml>
        <w:WordDocument>
          <w:View>Print</w:View>
          <w:Zoom>100</w:Zoom>
          <w:DoNotOptimizeForBrowser/>
        </w:WordDocument>
      </xml>
      <![endif]-->
      <style>
        @page { size: A4; margin: 2cm 2cm 2cm 2cm; }
        body { 
          font-family: 'Times New Roman', Times, serif; 
          font-size: 12pt; 
          margin: 0; 
          line-height: 1.6;
          text-align: justify;
        }
        .header-info {
          text-align: center;
          margin-bottom: 20px;
          padding-bottom: 10px;
          border-bottom: 3px double #000;
        }
        .header-info h1 {
          font-size: 16pt;
          font-weight: bold;
          margin: 0 0 3px 0;
          text-transform: uppercase;
        }
        .header-info h2 {
          font-size: 13pt;
          font-weight: bold;
          margin: 3px 0 10px 0;
          text-transform: uppercase;
        }
        .header-info table { 
          border: none; 
          width: 90%; 
          margin: 5px auto; 
          font-size: 11pt;
        }
        .header-info td { 
          border: none; 
          padding: 2px 5px; 
          text-align: left;
        }
        .header-info td:first-child {
          width: 35%;
          font-weight: bold;
        }
        .identitas-siswa {
          border: 1px solid #000;
          padding: 10px;
          margin: 15px 0;
          background: #f9f9f9;
        }
        .identitas-siswa table {
          width: 100%;
          border: none;
        }
        .identitas-siswa td {
          padding: 3px 5px;
          border: none;
        }
        h2 { 
          font-size: 13pt; 
          font-weight: bold; 
          margin: 20px 0 10px 0;
          border-bottom: 1px solid #000;
          padding-bottom: 3px;
        }
        h3 { 
          font-size: 12pt; 
          font-weight: bold; 
          margin: 15px 0 8px 0;
        }
        p { margin: 5px 0; }
        ul { margin: 8px 0; padding-left: 30px; }
        li { margin: 4px 0; line-height: 1.5; }
        table.data-table {
          width: 100%;
          border-collapse: collapse;
          margin: 10px 0;
        }
        table.data-table th, table.data-table td {
          border: 1px solid #000;
          padding: 6px 8px;
          text-align: left;
        }
        table.data-table th {
          background: #f0f0f0;
          font-weight: bold;
        }
        .ttd-section { 
          margin-top: 40px; 
          margin-bottom: 20px;
          page-break-inside: avoid;
        }
        .ttd-table {
          width: 100%;
          border: none;
          border-collapse: collapse;
        }
        .ttd-table td {
          width: 50%;
          vertical-align: top;
          text-align: center;
          padding: 10px;
          border: none;
        }
        .ttd-label { font-size: 11pt; margin-bottom: 5px; }
        .ttd-role { font-weight: bold; font-size: 11pt; margin-bottom: 60px; line-height: 1.4; }
        .ttd-name {
          font-weight: bold;
          font-size: 11pt;
          border-bottom: 1px solid #000;
          display: inline-block;
          min-width: 200px;
          margin-bottom: 5px;
          padding-bottom: 2px;
        }
        .ttd-nip { font-size: 10pt; }
        .footer-note {
          margin-top: 30px;
          font-size: 9pt;
          color: #666;
          text-align: right;
          font-style: italic;
        }
        .page-break { page-break-before: always; }
        .guru-section {
          border: 2px dashed #666;
          padding: 15px;
          margin-top: 20px;
          background: #f5f5f5;
        }
        .guru-section h2 {
          color: #d32f2f;
          border-bottom-color: #d32f2f;
        }
      </style>
    </head>
    <body>
  `;

  // VERSI SISWA
  htmlContent += `
    <div class="header-info">
      <h1>LEMBAR KERJA PESERTA DIDIK</h1>
      <h2>${topik.toUpperCase()}</h2>
      <table>
        <tr><td>Mata Pelajaran</td><td>: ${mapel}</td></tr>
        <tr><td>Kelas/Semester</td><td>: ${kelas} / Semester ${labelSemester}</td></tr>
        <tr><td>Alokasi Waktu</td><td>: ${waktu}</td></tr>
        <tr><td>Jenis Pekerjaan</td><td>: ${jenisKerja}</td></tr>
        <tr><td>Guru Pengampu</td><td>: ${namaGuru}</td></tr>
      </table>
    </div>

    <div class="identitas-siswa">
      <table>
        <tr><td style="width:25%"><strong>Nama</strong></td><td>: .......................................</td><td style="width:25%"><strong>Kelas</strong></td><td>: ${kelas}</td></tr>
        <tr><td><strong>Tanggal</strong></td><td>: .......................................</td><td><strong>Kelompok</strong></td><td>: .......................................</td></tr>
      </table>
    </div>
  `;

  // Convert markdown ke HTML untuk versi siswa
  let formattedSiswa = convertMarkdownToHTML(siswaContent);
  htmlContent += formattedSiswa;

  // VERSI GURU (jika ada)
  if (includeGuru && guruContent && guruContent !== 'Versi Guru tidak tersedia.') {
    htmlContent += `
      <div class="page-break"></div>
      <div class="guru-section">
        <h2>📗 VERSI GURU (KUNCI JAWABAN & RUBRIK)</h2>
        <p style="font-style: italic; color: #666;">Dokumen ini hanya untuk pegangan guru</p>
    `;
    let formattedGuru = convertMarkdownToHTML(guruContent);
    htmlContent += formattedGuru;
    htmlContent += `</div>`;
  }

  // Tanda Tangan
  htmlContent += `
    <div class="ttd-section">
      <table class="ttd-table">
        <tr>
          <td>
            <div class="ttd-label">Mengetahui,</div>
            <div class="ttd-role">Kepala Sekolah<br>${sekolah}</div>
            <div class="ttd-name">${namaKepsek}</div>
            <div class="ttd-nip">NIP: ${nipKepsek}</div>
          </td>
          <td>
            <div class="ttd-label">Guru Pengampu,</div>
            <div class="ttd-role">Guru Mata Pelajaran</div>
            <div class="ttd-name">${namaGuruPengampu}</div>
            <div class="ttd-nip">NIP: ${nipGuruPengampu}</div>
          </td>
        </tr>
      </table>
    </div>

    <div class="footer-note">
      Dokumen ini dibuat secara otomatis oleh Sistem Administrasi Pembelajaran<br>
      ${sekolah} | ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
    </div>
    </body>
    </html>
  `;

  const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `LKPD_${mapel}_Kelas${kelas}_Sem${semester}_${topik.replace(/\s+/g, '_')}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  showToast('📥 File Word berhasil diunduh!');
}

/**
 * Convert Markdown ke HTML
 */
function convertMarkdownToHTML(content) {
  let html = content
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^# (.*$)/gim, '')
    .replace(/^[-•] (.*$)/gim, '<ul><li>$1</li></ul>')
    .replace(/\n/gim, '<br>');

  // Bersihkan duplikasi <ul>
  html = html.replace(/<\/ul>\s*<ul>/gim, '');
  
  return html;
}

async function saveToDatabase() {
  const content = currentLkpdData.siswa;
  if (!content) { 
    alert('Tidak ada konten untuk disimpan!'); 
    return; 
  }

  const mapel = document.getElementById('inpMapel').value || 'Umum';
  const topik = document.getElementById('inpTopik').value || 'Tanpa Judul';
  const kelas = document.getElementById('inpKelas').value;
  const semester = document.getElementById('inpSemester').value;
  const template = document.getElementById('inpTemplate').value;
  const guru = document.getElementById('inpGuru').value || currentUser.nama || 'Anonim';

  if (!confirm(`Simpan LKPD ini?\n\nMapel: ${mapel}\nTopik: ${topik}\nTemplate: ${template}`)) return;

  try {
    const newRef = push(ref(database, 'lkpd'));
    await set(newRef, {
      judul: topik,
      mapel: mapel,
      kelas: kelas.split(' ')[0],
      semester: semester,
      fase: kelas.includes('A') ? 'A' : kelas.includes('B') ? 'B' : 'C',
      template: template,
      guru: guru,
      sekolah: document.getElementById('inpSekolah').value,
      jenisKerja: document.getElementById('inpJenisKerja').value,
      tujuan: document.getElementById('inpTujuan').value,
      versiSiswa: content,
      versiGuru: currentLkpdData.guru || '',
      tandaTangan: {
        kepalaSekolah: {
          nama: document.getElementById('inpKepsek').value,
          nip: document.getElementById('inpNipKepsek').value
        },
        guruPengampu: {
          nama: document.getElementById('inpGuruPengampu').value,
          nip: document.getElementById('inpNipGuru').value
        }
      },
      createdAt: Date.now(),
      createdBy: currentUser.uid || 'unknown'
    });
    showToast(' LKPD berhasil disimpan!');
  } catch (error) {
    alert('Gagal menyimpan: ' + error.message);
  }
}

function showToast(msg) {
  const toast = document.createElement('div');
  toast.textContent = msg;
  toast.style.cssText = `position: fixed; top: 20px; right: 20px; background: #ec4899; color: white; padding: 14px 24px; border-radius: 10px; z-index: 10001; box-shadow: 0 4px 16px rgba(236, 72, 153, 0.4); font-weight: 600; font-size: 14px; animation: slideIn 0.3s ease;`;
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.animation = 'slideOut 0.3s ease'; setTimeout(() => toast.remove(), 300); }, 3000);
}
