// modules/admin-pembelajaran/features/modul-ajar.js
// =========================================
// FITUR: GENERATOR MODUL AJAR (AI POWERED)
// STRUKTUR: A. Informasi Umum, B. Komponen Inti, C. Penutup, D. Lampiran
// TANDA TANGAN: Default persisten (localStorage), bisa diedit
// KOLOM TERPISAH: Tema/Topik dan Judul Modul
// MATA PELAJARAN: Dropdown dari data-mapel.json
// PROFIL LULUSAN: 8 Dimensi (AI pilih 3-4 yang relevan)
// DOWNLOAD WORD: Konversi Markdown proper dengan paragraf & list
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
const CSS_ID = 'modul-ajar-css';
let storedApiKey = null;
let dataMapel = [];

// Default data tanda tangan
const DEFAULT_TTD = {
  namaKepsek: 'Imam Munandar SP.d',
  nipKepsek: '198512192011011007',
  namaGuru: 'Hasriandi Basir SP.d',
  nipGuru: '198110182025211059'
};

// 8 Dimensi Profil Lulusan
const DIMENSI_PROFIL_LULUSAN = [
  'Keimanan dan Ketakwaan kepada Tuhan Yang Maha Esa',
  'Kewargaan',
  'Penalaran Kritis',
  'Kreatif',
  'Kolaborasi',
  'Kemandirian',
  'Kesehatan',
  'Komunikasi'
];

/**
 * Init
 */
export async function init(container, db) {
  loadCSS();
  
  // Load data mapel DULU sebelum renderUI
  await loadMataPelajaran();
  
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
 * LOAD DATA MATA PELAJARAN DARI JSON
 */
async function loadMataPelajaran() {
  const possiblePaths = [
    '../../../assets/data-mapel.json',
    '/SDN139LAMANDA/assets/data-mapel.json',
    '/assets/data-mapel.json',
    './assets/data-mapel.json',
    '../assets/data-mapel.json',
    '../../assets/data-mapel.json'
  ];
  
  for (const path of possiblePaths) {
    try {
      console.log(`🔄 Mencoba load dari: ${path}`);
      const response = await fetch(path);
      
      if (!response.ok) {
        console.warn(`❌ Path ${path} gagal: ${response.status}`);
        continue;
      }
      
      const data = await response.json();
      dataMapel = data.mataPelajaran || [];
      
      if (dataMapel.length > 0) {
        console.log(`✅ Data mapel berhasil dimuat dari ${path}: ${dataMapel.length} mapel`);
        return;
      }
    } catch (error) {
      console.warn(`❌ Error load dari ${path}:`, error.message);
      continue;
    }
  }
  
  // FALLBACK: Gunakan data hardcoded jika semua path gagal
  console.warn('⚠️ Menggunakan data mapel fallback');
  dataMapel = [
    { id: 'paibd', nama: 'Pendidikan Agama Islam dan Budi Pekerti', singkatan: 'PAIBD', icon: '🕌' },
    { id: 'matematika', nama: 'Matematika', singkatan: 'Matematika', icon: '🔢' },
    { id: 'ipas', nama: 'IPAS', singkatan: 'IPAS', icon: '' },
    { id: 'pjok', nama: 'PJOK', singkatan: 'PJOK', icon: '⚽' },
    { id: 'bahasa-indonesia', nama: 'Bahasa Indonesia', singkatan: 'Bhs.Indonesia', icon: '📖' },
    { id: 'pendidikan-kewarganegaraan', nama: 'Pendidikan kewarganegaraan', singkatan: 'Pendidikan kewarganegaraan', icon: '🇮🇩' },
    { id: 'seni-budaya', nama: 'Seni dan Budaya', singkatan: 'Seni dan Budaya', icon: '' },
    { id: 'bahasa-inggris', nama: 'Bahasa Inggris', singkatan: 'Bhs.Inggris', icon: '🇧' },
    { id: 'coding-kka', nama: 'Coding/KKA', singkatan: 'Coding/KKA', icon: '💻' },
    { id: 'bahasa-ibu', nama: 'Bahasa Ibu', singkatan: 'Bhs.Ibu', icon: '🗣️' },
    { id: 'bta', nama: 'BTA', singkatan: 'BTA', icon: '📿' }
  ];
  console.log(`✅ Data mapel fallback dimuat: ${dataMapel.length} mapel`);
}

/**
 * Load CSS - INLINE
 */
function loadCSS() {
  if (document.getElementById(CSS_ID)) return;
  
  const style = document.createElement('style');
  style.id = CSS_ID;
  style.textContent = `
    .gen-container { 
      background: linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%);
      border-radius: 16px; 
      padding: 25px; 
      font-family: 'Segoe UI', sans-serif; 
      max-width: 1100px; 
      margin: 0 auto;
      box-shadow: 0 8px 24px rgba(236, 72, 153, 0.15);
    }
    .gen-header { 
      background: linear-gradient(135deg, #ec4899 0%, #f472b6 100%); 
      color: white; 
      padding: 30px; 
      border-radius: 12px; 
      margin-bottom: 25px; 
      box-shadow: 0 4px 12px rgba(236, 72, 153, 0.3); 
    }
    .gen-header h2 { margin: 0 0 8px 0; font-size: 28px; font-weight: 700; }
    .gen-header p { margin: 0; opacity: 0.95; font-size: 15px; }
    .gen-form { 
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
    .ttd-label {
      font-size: 13px;
      color: #831843;
      font-weight: 600;
      margin-bottom: 8px;
    }
    .ttd-role {
      font-size: 16px;
      font-weight: 700;
      color: #be185d;
      margin-bottom: 60px;
      min-height: 80px;
    }
    .ttd-name {
      font-size: 15px;
      font-weight: 700;
      color: #1e293b;
      margin-bottom: 4px;
      border-bottom: 1px solid #831843;
      padding-bottom: 4px;
    }
    .ttd-nip {
      font-size: 13px;
      color: #64748b;
    }
    
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
      min-height: 300px;
    }
    @media print {
      body * { visibility: hidden; }
      .output-area, .output-area * { visibility: visible; }
      .output-area { position: absolute; left: 0; top: 0; width: 100%; padding: 20px; box-shadow: none; border: none; background: white !important; }
      .output-actions-bar, .output-header { display: none !important; }
      .output-content { border: none; background: white; }
      .ttd-section { page-break-inside: avoid; }
    }
    @media (max-width: 768px) { 
      .gen-container { padding: 15px; }
      .gen-header { padding: 20px; }
      .gen-header h2 { font-size: 22px; }
      .gen-form { padding: 20px; }
      .form-grid { grid-template-columns: 1fr; gap: 15px; } 
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
  const saved = localStorage.getItem('modulAjar_ttd');
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
  
  console.log('✅ TTD defaults loaded:', ttdData);
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
  
  localStorage.setItem('modulAjar_ttd', JSON.stringify(ttdData));
}

function renderUI(container) {
  const aiReady = storedApiKey ? true : false;
  
  // Generate options untuk dropdown mapel
  let mapelOptions = '<option value="">-- Pilih Mata Pelajaran --</option>';
  dataMapel.forEach(mapel => {
    mapelOptions += `<option value="${mapel.nama}">${mapel.icon} ${mapel.singkatan}</option>`;
  });
  
  container.innerHTML = `
    <div class="gen-container">
      <div class="gen-header">
        <h2>📚 Generator Modul Ajar AI</h2>
        <p>Isi parameter di bawah, biarkan AI menyusun draf Modul Ajar Kurikulum Merdeka untuk Anda.
          ${aiReady ? '<span style="display:inline-block; margin-left:10px; padding:4px 12px; background:rgba(255,255,255,0.2); border-radius:20px; font-size:13px; font-weight:600;">✅ AI Siap</span>' : '<span style="display:inline-block; margin-left:10px; padding:4px 12px; background:rgba(255,255,255,0.2); border-radius:20px; font-size:13px; font-weight:600;">️ API Key Belum Aktif</span>'}
        </p>
      </div>

      <div class="gen-form">
        <div class="form-section-title">📋 1. Informasi Umum</div>
        <div class="form-grid">
          <div class="form-group">
            <label>👤 Nama Guru / Penyusun</label>
            <input type="text" id="inpGuru" class="form-control" placeholder="Nama Anda" value="${currentUser.namaLengkap || currentUser.nama || 'Hasriandi Basir SP.d'}">
          </div>
          <div class="form-group">
            <label>🏫 Satuan Pendidikan</label>
            <input type="text" id="inpSekolah" class="form-control" value="${currentUser.namaSekolah || 'SDN 139 LAMANDA'}">
          </div>
        </div>
        <div class="form-grid">
          <div class="form-group">
            <label>📚 Mata Pelajaran</label>
            <select id="inpMapel" class="form-control">
              ${mapelOptions}
            </select>
          </div>
          <div class="form-group">
            <label>🎓 Semester</label>
            <select id="inpSemester" class="form-control">
              <option value="1">Semester 1 (Ganjil)</option>
              <option value="2">Semester 2 (Genap)</option>
            </select>
          </div>
        </div>
        <div class="form-grid">
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
            <label>📝 Tema / Topik</label>
            <input type="text" id="inpTema" class="form-control" placeholder="Contoh: Bilangan Cacah">
          </div>
        </div>
        <div class="form-group">
          <label>📖 Judul Modul</label>
          <input type="text" id="inpJudulModul" class="form-control" placeholder="Contoh: Bilangan Cacah sampai 100">
        </div>
        <div class="form-group">
          <label>⏰ Alokasi Waktu</label>
          <input type="text" id="inpWaktu" class="form-control" placeholder="Contoh: 4 x 35 Menit">
        </div>

        <div class="form-section-title">✍️ 2. Tanda Tangan (Default - Bisa Diedit)</div>
        <div class="form-grid">
          <div class="form-group">
            <label>👨‍💼 Nama Kepala Sekolah</label>
            <input type="text" id="inpKepsek" class="form-control" placeholder="Nama lengkap Kepala Sekolah">
          </div>
          <div class="form-group">
            <label>🔢 NIP Kepala Sekolah</label>
            <input type="text" id="inpNipKepsek" class="form-control" placeholder="NIP Kepala Sekolah">
          </div>
        </div>
        <div class="form-grid">
          <div class="form-group">
            <label>👩‍ Nama Guru Pengampu</label>
            <input type="text" id="inpGuruPengampu" class="form-control" placeholder="Nama Guru Pengampu">
          </div>
          <div class="form-group">
            <label>🔢 NIP Guru Pengampu</label>
            <input type="text" id="inpNipGuru" class="form-control" placeholder="NIP Guru Pengampu">
          </div>
        </div>

        <div class="form-section-title">📚 3. Komponen Inti</div>
        <div class="form-group">
          <label> Tujuan Pembelajaran (TP) - <i>Opsional</i></label>
          <textarea id="inpCP" class="form-control" rows="4" placeholder="Paste CP dari kurikulum atau biarkan kosong..."></textarea>
        </div>
        
        <div class="form-group">
          <label> Model Pembelajaran</label>
          <select id="inpModel" class="form-control">
            <option value="Problem Based Learning (PBL)">Problem Based Learning (PBL)</option>
            <option value="Project Based Learning (PjBL)">Project Based Learning (PjBL)</option>
            <option value="Discovery Learning">Discovery Learning</option>
            <option value="Inquiry Learning">Inquiry Learning</option>
            <option value="Tatap Muka Klasikal">Tatap Muka Klasikal</option>
            <option value="Cooperative Learning">Cooperative Learning</option>
          </select>
        </div>

        <div class="form-group">
          <label>👥 Karakteristik Siswa (Opsional)</label>
          <textarea id="inpKarakteristik" class="form-control" rows="3" placeholder="Contoh: Siswa aktif, suka bermain, kemampuan beragam..."></textarea>
        </div>

        <div class="gen-action">
          <button class="btn-generate" id="btnGenerate" ${!storedApiKey ? 'disabled' : ''}>
            <span>✨</span> Generate Modul Ajar
          </button>
        </div>
      </div>

      <div class="loading-overlay" id="loadingState">
        <div class="spinner"></div>
        <h3 style="color:#ec4899; margin-bottom:10px;">Sedang Menyusun Modul Ajar...</h3>
        <p style="color:#64748b; font-size:14px;">AI sedang menganalisis parameter dan menulis draf lengkap.<br>Mohon tunggu 15-45 detik.</p>
      </div>

      <div class="output-area" id="outputArea">
        <div class="output-header">
          <h3>📄 Hasil Generate</h3>
          <span id="editIndicator" style="display:none; background:#fbbf24; color:#1e293b; padding:6px 14px; border-radius:20px; font-size:13px; font-weight:600;">✏️ Mode Edit Aktif</span>
        </div>
        <div class="output-content" id="outputContent"></div>
        
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
  document.getElementById('btnGenerate').addEventListener('click', handleGenerate);
  document.getElementById('btnPrint').addEventListener('click', handlePrint);
  document.getElementById('btnSaveDb').addEventListener('click', saveToDatabase);
  document.getElementById('btnEdit').addEventListener('click', toggleEditMode);
  document.getElementById('btnDownload').addEventListener('click', handleDownloadWord);
  
  // Auto-update tanda tangan saat input berubah + auto-save ke localStorage
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

async function handleGenerate() {
  if (!storedApiKey) {
    alert('⚠️ API Key belum tersedia. Hubungi administrator.');
    return;
  }

  const semester = document.getElementById('inpSemester').value;
  const labelSemester = semester === '1' ? '1 (Ganjil)' : '2 (Genap)';

  const tema = document.getElementById('inpTema').value || '';
  const judulModul = document.getElementById('inpJudulModul').value || '';
  const topikLengkap = tema && judulModul ? `${tema} - ${judulModul}` : (tema || judulModul || '[Topik]');

  const data = {
    guru: document.getElementById('inpGuru').value || '[Nama Guru]',
    sekolah: document.getElementById('inpSekolah').value || 'SDN 139 LAMANDA',
    mapel: document.getElementById('inpMapel').value,
    kelas: document.getElementById('inpKelas').value,
    semester: labelSemester,
    tema: tema,
    judulModul: judulModul,
    topik: topikLengkap,
    waktu: document.getElementById('inpWaktu').value,
    cp: document.getElementById('inpCP').value || 'Sesuaikan dengan fase dan kelas yang dipilih.',
    model: document.getElementById('inpModel').value,
    karakteristik: document.getElementById('inpKarakteristik').value || 'Siswa reguler dengan kemampuan beragam.'
  };

  if (!data.mapel || (!data.tema && !data.judulModul)) {
    alert('️ Mata Pelajaran dan Tema/Judul Modul wajib diisi!');
    return;
  }

  document.getElementById('loadingState').style.display = 'block';
  document.getElementById('outputArea').style.display = 'none';
  document.getElementById('btnGenerate').disabled = true;

  const prompt = `
    Bertindaklah sebagai Guru Ahli Kurikulum Merdeka di Indonesia. 
    Buatkan draf MODUL AJAR lengkap dan profesional berdasarkan data berikut:
    
    DATA INPUT:
    - Penyusun: ${data.guru}
    - Sekolah: ${data.sekolah}
    - Mata Pelajaran: ${data.mapel}
    - Kelas/Fase: ${data.kelas}
    - Semester: ${data.semester}
    - Tema: ${data.tema}
    - Judul Modul: ${data.judulModul}
    - Alokasi Waktu: ${data.waktu}
    - Model Pembelajaran: ${data.model}
    - Capaian Pembelajaran (CP): ${data.cp}
    - Karakteristik Siswa: ${data.karakteristik}

    INSTRUKSI OUTPUT:
    WAJIB gunakan struktur berikut dengan heading yang JELAS:

    # MODUL AJAR

    ## A. INFORMASI UMUM
    - Nama Sekolah: ${data.sekolah}
    - Penyusun: ${data.guru}
    - Mata Pelajaran: ${data.mapel}
    - Tema: ${data.tema}
    - Judul Modul: ${data.judulModul}
    - Semester: ${data.semester}
    - Kelas/Fase: ${data.kelas}
    - Alokasi Waktu: ${data.waktu}
    - Kompetensi Awal: (jelaskan kompetensi yang harus dimiliki siswa)
    - Profil Lulusan: (PILIH 3-4 DIMENSI YANG PALING RELEVAN dari 8 dimensi berikut:
      1. Keimanan dan Ketakwaan kepada Tuhan Yang Maha Esa
      2. Kewargaan
      3. Penalaran Kritis
      4. Kreatif
      5. Kolaborasi
      6. Kemandirian
      7. Kesehatan
      8. Komunikasi
      Jelaskan kompetensi yang dikembangkan untuk setiap dimensi yang dipilih)
    - Sarana dan Prasarana: (sebutkan yang dibutuhkan)
    - Target Peserta Didik: (sesuaikan dengan: ${data.karakteristik})
    - Model Pembelajaran: ${data.model}

    ## B. KOMPONEN INTI
    - Tujuan Pembelajaran: (3-5 tujuan spesifik, terukur)
    - Pemahaman Bermakna: (manfaat dalam kehidupan sehari-hari)
    - Pertanyaan Pemantik: (3-5 pertanyaan esensial)
    - Kegiatan Pembelajaran:
      * Pertemuan 1:
        · Pendahuluan (10 menit)
        · Inti (50 menit) - JELaskan detail aktivitas sesuai model ${data.model}
        · Penutup (10 menit)
      * Pertemuan 2: (jika alokasi waktu > 1x pertemuan)
    - Asesmen:
      · Asesmen Diagnostik
      · Asesmen Formatif
      · Asesmen Sumatif
    - Pengayaan dan Remedial

    ## C. PENUTUP
    - Kesimpulan pembelajaran
    - Refleksi guru dan siswa
    - Tindak lanjut
    - Catatan khusus untuk guru

    ## D. LAMPIRAN
    - Lembar Kerja Peserta Didik (LKPD) - 1 contoh sederhana
    - Bahan Bacaan Guru dan Peserta Didik
    - Glosarium (5-10 istilah penting)
    - Daftar Pustaka

    CATATAN PENTING:
    - Gunakan bahasa Indonesia formal dan edukatif
    - Sesuaikan dengan fase perkembangan siswa (${data.kelas})
    - Kegiatan pembelajaran harus AKTIF, kreatif, dan berpusat pada siswa
    - Asesmen harus autentik dan beragam
    - Pastikan alur kegiatan logis dan terukur waktunya
    - Untuk Profil Lulusan, PILIH 3-4 dimensi yang PALING RELEVAN dengan mata pelajaran ${data.mapel} dan topik ${data.topik}
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
          { role: "system", content: "Anda adalah ahli pendidikan dan pengembang kurikulum Kurikulum Merdeka di Indonesia." },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 4000
      })
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error?.message || 'Gagal menghubungi API');
    }

    const result = await response.json();
    const aiText = result.choices[0].message.content;

    document.getElementById('outputContent').innerText = aiText;
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

function handlePrint() {
  const content = document.getElementById('outputContent').innerText;
  if (!content) { alert('Tidak ada konten untuk dicetak!'); return; }
  exitEditMode();
  window.print();
}

function toggleEditMode() {
  const contentEl = document.getElementById('outputContent');
  const editBtn = document.getElementById('btnEdit');
  const indicator = document.getElementById('editIndicator');
  
  if (contentEl.isContentEditable) {
    exitEditMode();
    showToast('✅ Perubahan disimpan (lokal)');
  } else {
    contentEl.contentEditable = true;
    contentEl.classList.add('editing');
    contentEl.focus();
    editBtn.innerHTML = '✅ Selesai Edit';
    editBtn.classList.add('active');
    indicator.style.display = 'inline-block';
    showToast('✏️ Mode Edit aktif.');
  }
}

function exitEditMode() {
  const contentEl = document.getElementById('outputContent');
  const editBtn = document.getElementById('btnEdit');
  const indicator = document.getElementById('editIndicator');
  
  contentEl.contentEditable = false;
  contentEl.classList.remove('editing');
  editBtn.innerHTML = '✏️ Edit';
  editBtn.classList.remove('active');
  indicator.style.display = 'none';
}

/**
 * Download sebagai Word Document (.doc) - VERSI PERBAIKAN
 * Dengan konversi Markdown yang proper
 */
function handleDownloadWord() {
  const content = document.getElementById('outputContent').innerText;
  if (!content) { alert('Tidak ada konten untuk diunduh!'); return; }
  exitEditMode();

  const tema = document.getElementById('inpTema').value || 'Modul-Ajar';
  const judulModul = document.getElementById('inpJudulModul').value || '';
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
  
  const namaFileTopik = (tema && judulModul) ? `${tema}_${judulModul}` : (tema || judulModul || 'Modul');
  
  // ⭐ Konversi Markdown ke HTML yang proper
  const htmlContent = convertMarkdownToHTML(content);
  
  let wordHTML = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' 
          xmlns:w='urn:schemas-microsoft-com:office:word' 
          xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset='utf-8'>
      <title>Modul Ajar - ${namaFileTopik}</title>
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
        @page { 
          size: A4; 
          margin: 2.5cm 2cm 2cm 2cm;
        }
        body { 
          font-family: 'Times New Roman', Times, serif; 
          font-size: 12pt; 
          margin: 0; 
          line-height: 1.5;
          text-align: justify;
          color: #000;
        }
        .header-info {
          text-align: center;
          margin-bottom: 30px;
          padding-bottom: 15px;
          border-bottom: 3px double #000;
        }
        .header-info h1 {
          font-size: 16pt;
          font-weight: bold;
          margin: 0 0 5px 0;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .header-info h2 {
          font-size: 13pt;
          font-weight: bold;
          margin: 5px 0 15px 0;
          text-transform: uppercase;
        }
        .header-info table { 
          border: none; 
          width: 85%; 
          margin: 10px auto; 
          font-size: 11pt;
          text-align: left;
        }
        .header-info td { 
          border: none; 
          padding: 3px 5px; 
        }
        .header-info td:first-child {
          width: 35%;
          font-weight: bold;
        }
        h1 { 
          font-size: 16pt; 
          font-weight: bold; 
          margin: 20px 0 10px 0;
          text-transform: uppercase;
          text-align: center;
        }
        h2 { 
          font-size: 13pt; 
          font-weight: bold; 
          margin: 18px 0 10px 0;
          border-bottom: 2px solid #000;
          padding-bottom: 3px;
          text-transform: uppercase;
        }
        h3 { 
          font-size: 12pt; 
          font-weight: bold; 
          margin: 15px 0 8px 0;
        }
        p { 
          margin: 8px 0; 
          text-indent: 0;
          line-height: 1.5;
        }
        ul, ol { 
          margin: 8px 0; 
          padding-left: 30px; 
          line-height: 1.5;
        }
        li { 
          margin: 4px 0; 
          line-height: 1.5;
        }
        .ttd-section { 
          margin-top: 50px; 
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
        .ttd-label {
          font-size: 11pt;
          margin-bottom: 5px;
        }
        .ttd-role {
          font-weight: bold;
          font-size: 11pt;
          margin-bottom: 70px;
          line-height: 1.4;
        }
        .ttd-name {
          font-weight: bold;
          font-size: 11pt;
          border-bottom: 1px solid #000;
          display: inline-block;
          min-width: 200px;
          margin-bottom: 5px;
          padding-bottom: 2px;
        }
        .ttd-nip {
          font-size: 10pt;
        }
        .footer-note {
          margin-top: 30px;
          font-size: 9pt;
          color: #666;
          text-align: right;
          font-style: italic;
          border-top: 1px solid #ccc;
          padding-top: 10px;
        }
        strong { font-weight: bold; }
        em { font-style: italic; }
      </style>
    </head>
    <body>
      <div class="header-info">
        <h1>MODUL AJAR</h1>
        <h2>${(tema && judulModul) ? `${tema} - ${judulModul}`.toUpperCase() : (tema || judulModul || 'MODUL AJAR').toUpperCase()}</h2>
        <table>
          <tr><td>Sekolah</td><td>: ${sekolah}</td></tr>
          <tr><td>Mata Pelajaran</td><td>: ${mapel}</td></tr>
          <tr><td>Kelas/Semester</td><td>: ${kelas} / Semester ${labelSemester}</td></tr>
          <tr><td>Alokasi Waktu</td><td>: ${waktu}</td></tr>
          <tr><td>Guru Pengampu</td><td>: ${namaGuru}</td></tr>
          ${tema ? `<tr><td>Tema</td><td>: ${tema}</td></tr>` : ''}
          ${judulModul ? `<tr><td>Judul Modul</td><td>: ${judulModul}</td></tr>` : ''}
        </table>
      </div>
      
      ${htmlContent}
      
      <div class="ttd-section">
        <table class="ttd-table">
          <tr>
            <td>
              <div class="ttd-label">Mengetahui,</div>
              <div class="ttd-role">Kepala Sekolah<br>SDN 139 LAMANDA</div>
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
        SDN 139 LAMANDA | ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
      </div>
    </body>
    </html>
  `;

  const blob = new Blob(['\ufeff', wordHTML], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Modul_Ajar_${mapel}_Kelas${kelas}_Sem${semester}_${namaFileTopik.replace(/\s+/g, '_')}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  showToast('📥 File Word berhasil diunduh!');
}

/**
 * ⭐ FUNGSI BARU: Konversi Markdown ke HTML yang Proper untuk Word
 */
function convertMarkdownToHTML(markdown) {
  const lines = markdown.split('\n');
  let html = '';
  let inList = false;
  let inOrderedList = false;
  let inParagraph = false;
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    
    // Skip empty lines - close any open tags
    if (line.trim() === '') {
      if (inList) { html += '</ul>'; inList = false; }
      if (inOrderedList) { html += '</ol>'; inOrderedList = false; }
      if (inParagraph) { html += '</p>'; inParagraph = false; }
      continue;
    }
    
    // Heading 1: # Title
    if (line.match(/^# (.*$)/)) {
      if (inList) { html += '</ul>'; inList = false; }
      if (inOrderedList) { html += '</ol>'; inOrderedList = false; }
      if (inParagraph) { html += '</p>'; inParagraph = false; }
      const title = line.replace(/^# (.*$)/, '$1');
      html += `<h1>${processInlineFormatting(title)}</h1>`;
      continue;
    }
    
    // Heading 2: ## Title
    if (line.match(/^## (.*$)/)) {
      if (inList) { html += '</ul>'; inList = false; }
      if (inOrderedList) { html += '</ol>'; inOrderedList = false; }
      if (inParagraph) { html += '</p>'; inParagraph = false; }
      const title = line.replace(/^## (.*$)/, '$1');
      html += `<h2>${processInlineFormatting(title)}</h2>`;
      continue;
    }
    
    // Heading 3: ### Title
    if (line.match(/^### (.*$)/)) {
      if (inList) { html += '</ul>'; inList = false; }
      if (inOrderedList) { html += '</ol>'; inOrderedList = false; }
      if (inParagraph) { html += '</p>'; inParagraph = false; }
      const title = line.replace(/^### (.*$)/, '$1');
      html += `<h3>${processInlineFormatting(title)}</h3>`;
      continue;
    }
    
    // Unordered list: - item atau • item
    if (line.match(/^[-•]\s+(.*$)/)) {
      if (inOrderedList) { html += '</ol>'; inOrderedList = false; }
      if (inParagraph) { html += '</p>'; inParagraph = false; }
      const item = line.replace(/^[-•]\s+(.*$)/, '$1');
      if (!inList) { html += '<ul>'; inList = true; }
      html += `<li>${processInlineFormatting(item)}</li>`;
      continue;
    }
    
    // Ordered list: 1. item, 2. item, dst
    if (line.match(/^\d+\.\s+(.*$)/)) {
      if (inList) { html += '</ul>'; inList = false; }
      if (inParagraph) { html += '</p>'; inParagraph = false; }
      const item = line.replace(/^\d+\.\s+(.*$)/, '$1');
      if (!inOrderedList) { html += '<ol>'; inOrderedList = true; }
      html += `<li>${processInlineFormatting(item)}</li>`;
      continue;
    }
    
    // Regular paragraph text
    if (inList) { html += '</ul>'; inList = false; }
    if (inOrderedList) { html += '</ol>'; inOrderedList = false; }
    if (!inParagraph) { html += '<p>'; inParagraph = true; }
    else { html += '<br>'; }
    html += processInlineFormatting(line);
  }
  
  // Close any remaining open tags
  if (inList) html += '</ul>';
  if (inOrderedList) html += '</ol>';
  if (inParagraph) html += '</p>';
  
  return html;
}

/**
 * ⭐ Proses inline formatting: **bold**, *italic*
 */
function processInlineFormatting(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/_(.*?)_/g, '<em>$1</em>');
}

async function saveToDatabase() {
  const content = document.getElementById('outputContent').innerText;
  if (!content) { alert('Tidak ada konten untuk disimpan!'); return; }

  const mapel = document.getElementById('inpMapel').value || 'Umum';
  const tema = document.getElementById('inpTema').value || '';
  const judulModul = document.getElementById('inpJudulModul').value || '';
  const kelas = document.getElementById('inpKelas').value;
  const semester = document.getElementById('inpSemester').value;
  const guru = document.getElementById('inpGuru').value || currentUser.nama || 'Anonim';

  if (!confirm(`Simpan modul ajar ini?\n\nMapel: ${mapel}\nTema: ${tema}\nJudul: ${judulModul}\nKelas: ${kelas}`)) return;

  try {
    const newRef = push(ref(database, 'modulAjar'));
    await set(newRef, {
      tema: tema,
      judulModul: judulModul,
      judul: (tema && judulModul) ? `${tema} - ${judulModul}` : (tema || judulModul),
      mapel: mapel,
      kelas: kelas.split(' ')[0],
      semester: semester,
      fase: kelas.includes('A') ? 'A' : kelas.includes('B') ? 'B' : 'C',
      guru: guru,
      sekolah: document.getElementById('inpSekolah').value,
      model: document.getElementById('inpModel').value,
      konten: content,
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
    showToast('💾 Modul ajar berhasil disimpan!');
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
