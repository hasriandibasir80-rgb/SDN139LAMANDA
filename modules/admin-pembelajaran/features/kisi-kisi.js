// modules/admin-pembelajaran/features/kisi-kisi.js
// =========================================
// FITUR: PEMBUAT KISI-KISI SOAL - V3 REVISI DINAMIS
// Update: Tambah Topik & Tambah Sub Topik Dinamis, Kelas Fase C fix, Pakai data-mapel.js Single Source
// =========================================

import { db } from '../../../js/firebase-config.js';
import { 
  collection, addDoc, query, where, orderBy, 
  onSnapshot, doc, updateDoc, deleteDoc, serverTimestamp, getDocs, getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ✅ MASTER MAPEL - Single Source of Truth
let dataMapelMaster = [];
try {
  const mod = await import('../../../js/config/data-mapel.js');
  dataMapelMaster = mod.dataMapel || mod.default || [];
} catch(e) {
  console.log('Fallback mapel, tidak bisa import data-mapel.js', e);
}
const FALLBACK_MAPEL = [
  { id: 'paibd', nama: 'Pendidikan Agama Islam dan Budi Pekerti', singkatan: 'PAIBD', icon: '🕌' },
  { id: 'matematika', nama: 'Matematika', singkatan: 'Matematika', icon: '🔢' },
  { id: 'ipas', nama: 'IPAS', singkatan: 'IPAS', icon: '🔬' },
  { id: 'pjok', nama: 'PJOK', singkatan: 'PJOK', icon: '⚽' },
  { id: 'bahasa-indonesia', nama: 'Bahasa Indonesia', singkatan: 'Bhs.Indonesia', icon: '📖' },
  { id: 'pendidikan-pancasila', nama: 'Pendidikan Pancasila', singkatan: 'Pancasila', icon: '🇮🇩' },
  { id: 'seni-budaya', nama: 'Seni dan Budaya', singkatan: 'Seni Budaya', icon: '🎨' },
  { id: 'bahasa-inggris', nama: 'Bahasa Inggris', singkatan: 'Bhs.Inggris', icon: '🇬🇧' },
  { id: 'coding-kka', nama: 'Coding/KKA', singkatan: 'Coding/KKA', icon: '💻' },
  { id: 'bahasa-ibu', nama: 'Bahasa Ibu', singkatan: 'Bhs.Ibu', icon: '🗣️' },
  { id: 'bta', nama: 'BTA', singkatan: 'BTA', icon: '📿' }
];

const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';
let groqApiKey = null;
const CSS_ID = 'kisi-kisi-css';
let currentEditId = null;
let dataMapel = dataMapelMaster.length ? dataMapelMaster : FALLBACK_MAPEL;
let topikCounter = 0;

// Kelas Fase Merdeka
const KELAS_FASE = [
  { id: '1|A', label: 'Kelas 1 / Fase A' },
  { id: '2|A', label: 'Kelas 2 / Fase A' },
  { id: '3|B', label: 'Kelas 3 / Fase B' },
  { id: '4|B', label: 'Kelas 4 / Fase B' },
  { id: '5|C', label: 'Kelas 5 / Fase C' },
  { id: '6|C', label: 'Kelas 6 / Fase C' },
];

export async function init(container, db) {
  loadCSS();
  await loadGroqApiKey();
  await loadMataPelajaran();
  renderUI(container);
  attachEvents(container);
  loadKisiList(container);
  // init dengan 1 topik default
  setTimeout(() => addTopik(container), 100);
}

export function cleanup() {
  const css = document.getElementById(CSS_ID);
  if (css) css.remove();
}

async function loadGroqApiKey() {
  try {
    const docRef = doc(db, 'settings', 'api_key');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data.keys) {
        const activeKeys = Object.values(data.keys).filter(k => k.active === true);
        if (activeKeys.length > 0) groqApiKey = activeKeys[0].value;
      }
    }
  } catch (error) {
    console.error('Error loading API key:', error);
  }
}

async function loadMataPelajaran() {
  if(dataMapelMaster.length) {
    dataMapel = dataMapelMaster;
    return;
  }
  // fallback fetch json lama
  const possiblePaths = ['../../../assets/data-mapel.json','/SDN139LAMANDA/assets/data-mapel.json','/assets/data-mapel.json'];
  for (const path of possiblePaths) {
    try {
      const response = await fetch(path);
      if (!response.ok) continue;
      const data = await response.json();
      dataMapel = data.mataPelajaran || [];
      if (dataMapel.length > 0) return;
    } catch (error) { continue; }
  }
  dataMapel = FALLBACK_MAPEL;
}

function loadCSS() {
  if (document.getElementById(CSS_ID)) return;
  const style = document.createElement('style');
  style.id = CSS_ID;
  style.textContent = `
    .kisi-container { background: linear-gradient(135deg, #fce7f3 0%, #fbcfe8 50%, #e0e7ff 100%); border-radius: 16px; padding: 25px; font-family: 'Segoe UI', sans-serif; max-width: 1200px; margin: 0 auto; box-shadow: 0 8px 24px rgba(236, 72, 153, 0.15); }
    .kisi-header { background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); color: white; padding: 30px; border-radius: 12px; margin-bottom: 25px; box-shadow: 0 4px 12px rgba(236, 72, 153, 0.3); }
    .kisi-header h2 { margin: 0 0 8px 0; font-size: 28px; font-weight: 700; }
    .kisi-header p { margin: 0; opacity: 0.95; font-size: 15px; }
    .kisi-tabs { display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap; }
    .kisi-tab { padding: 12px 24px; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 14px; background: white; color: #be185d; transition: all 0.2s; }
    .kisi-tab.active { background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); color: white; }
    .kisi-section { background: white; padding: 25px; border-radius: 12px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(236, 72, 153, 0.1); }
    .kisi-section-title { font-size: 18px; font-weight: 700; color: #be185d; margin: 0 0 15px 0; padding-bottom: 10px; border-bottom: 3px solid #fce7f3; }
    .kisi-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px; }
    .kisi-form-group { margin-bottom: 15px; }
    .kisi-form-group label { display: block; margin-bottom: 6px; font-weight: 600; font-size: 13px; color: #831843; }
    .kisi-form-control { width: 100%; padding: 12px 14px; border: 2px solid #fbcfe8; border-radius: 8px; font-size: 14px; box-sizing: border-box; background: white; color: #831843; font-family: inherit; }
    .kisi-form-control:focus { outline: none; border-color: #ec4899; box-shadow: 0 0 0 3px rgba(236, 72, 153, 0.15); }
    .topik-card { background: #fff1f2; border: 2px dashed #f9a8d4; border-radius: 12px; padding: 16px; margin-bottom: 16px; position: relative; }
    .topik-card-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; }
    .topik-card-title { font-weight:700; color:#be185d; font-size:14px; }
    .subtopik-list { display:flex; flex-direction:column; gap:8px; margin-top:10px; }
    .subtopik-item { display:flex; gap:8px; align-items:center; }
    .subtopik-item input { flex:1; }
    .btn-mini { padding:6px 10px; border:none; border-radius:6px; cursor:pointer; font-size:11px; font-weight:600; }
    .btn-mini-danger { background:#fee2e2; color:#991b1b; } .btn-mini-primary { background:#dbeafe; color:#1e40af; } .btn-mini-success { background:#dcfce7; color:#166534; }
    .kisi-btn { padding: 12px 24px; border: none; border-radius: 8px; font-weight: 600; font-size: 14px; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; transition: all 0.2s; color: white; }
    .kisi-btn:hover { transform: translateY(-2px); }
    .kisi-btn-primary { background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); }
    .kisi-btn-success { background: linear-gradient(135deg, #10b981 0%, #059669 100%); }
    .kisi-btn-warning { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); }
    .kisi-btn-danger { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); }
    .kisi-btn-secondary { background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%); }
    .kisi-actions { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 20px; justify-content: center; }
    .kisi-item { background: linear-gradient(135deg, #fff1f2 0%, #fce7f3 100%); padding: 15px; border-radius: 10px; margin-bottom: 10px; border-left: 4px solid #ec4899; }
    .kisi-item-header { display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px; flex-wrap: wrap; gap: 5px; }
    .kisi-item-title { font-weight: 700; color: #be185d; font-size: 15px; }
    .kisi-item-meta { font-size: 12px; color: #64748b; }
    .kisi-item-actions { display: flex; gap: 5px; }
    .kisi-item-actions button { padding: 6px 12px; font-size: 12px; border: none; border-radius: 6px; cursor: pointer; color: white; }
    .kisi-toast { position: fixed; top: 20px; right: 20px; padding: 14px 24px; border-radius: 10px; z-index: 10001; color: white; font-weight: 600; box-shadow: 0 4px 16px rgba(0,0,0,0.15); animation: kisiSlideIn 0.3s ease; }
    .kisi-toast-success { background: linear-gradient(135deg, #10b981 0%, #059669 100%); }
    .kisi-toast-error { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); }
    @keyframes kisiSlideIn { from { transform: translateX(400px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    .kisi-preview-table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 13px; }
    .kisi-preview-table th { background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); color: white; padding: 10px 8px; text-align: center; font-weight: 700; border: 1px solid #e2e8f0; }
    .kisi-preview-table td { padding: 10px 8px; border: 1px solid #e2e8f0; text-align: left; vertical-align: top; }
    .kisi-preview-table tr:nth-child(even) { background: #fff1f2; }
    .level-badge { display: inline-block; padding: 3px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; }
    .level-lots { background: #dcfce7; color: #166534; } .level-mots { background: #fef3c7; color: #92400e; } .level-hots { background: #fee2e2; color: #991b1b; }
    .method-options { display: flex; gap: 15px; margin-bottom: 10px; flex-wrap: wrap; }
    .method-option { font-weight: 600; font-size: 13px; cursor: pointer; background: #fdf2f8; padding: 8px 12px; border-radius: 6px; border: 1px solid #fbcfe8; }
    .method-option input { margin-right: 5px; }
    @media (max-width: 768px) { .kisi-form-grid { grid-template-columns: 1fr; } }
  `;
  document.head.appendChild(style);
}

function renderUI(container) {
  const aiReady = groqApiKey ? '✅ AI Siap' : '⚠️ API Key Belum Aktif';
  const aiStatusClass = groqApiKey ? 'kisi-badge-ready' : '';
  
  let mapelOptions = '<option value="">-- Pilih Mapel --</option>';
  dataMapel.forEach(m => {
    // value pakai id biar sinkron dengan data-mapel.js, tapi tampilkan nama lengkap
    mapelOptions += `<option value="${m.id}">${m.icon || '📘'} ${m.nama}</option>`;
  });

  let kelasOptions = '<option value="">-- Pilih Kelas / Fase --</option>';
  KELAS_FASE.forEach(k => {
    kelasOptions += `<option value="${k.id}">${k.label}</option>`;
  });

  container.innerHTML = `
    <div class="kisi-container">
      <div class="kisi-header">
        <h2>📋 Pembuat Kisi-Kisi Soal</h2>
        <p>Perencanaan Asesmen Berbasis AI - ${dataMapel.length} Mapel Terhubung
          <span class="kisi-badge ${aiStatusClass}" style="margin-left: 10px;">${aiReady}</span>
        </p>
      </div>

      <div class="kisi-tabs">
        <button class="kisi-tab active" data-tab="form">📝 Buat Kisi-Kisi</button>
        <button class="kisi-tab" data-tab="list">📚 Kisi-Kisi Tersimpan</button>
      </div>

      <div id="kisi-form-section">
        <div class="kisi-section">
          <h3 class="kisi-section-title">📋 1. Informasi Asesmen</h3>
          <div class="kisi-form-grid">
            <div class="kisi-form-group">
              <label>🏫 Sekolah</label>
              <input type="text" id="kisi-sekolah" class="kisi-form-control" value="${currentUser.namaSekolah || 'SDN 139 LAMANDA'}">
            </div>
            <div class="kisi-form-group">
              <label>👩‍🏫 Nama Guru</label>
              <input type="text" id="kisi-guru" class="kisi-form-control" value="${currentUser.displayName || 'Hasriandi Basir SP.d'}">
            </div>
          </div>
          <div class="kisi-form-grid">
            <div class="kisi-form-group">
              <label>📚 Mata Pelajaran</label>
              <select id="kisi-mapel" class="kisi-form-control">${mapelOptions}</select>
            </div>
            <div class="kisi-form-group">
              <label>🎓 Kelas / Fase</label>
              <select id="kisi-kelas" class="kisi-form-control">${kelasOptions}</select>
            </div>
          </div>

          <div class="kisi-form-group">
            <label>🗂️ Tema / Topik & Sub Tema (Dinamis)</label>
            <div id="topik-container"></div>
            <button type="button" id="btnTambahTopik" class="kisi-btn kisi-btn-secondary" style="margin-top:10px; width:100%;">➕ Tambah Topik Baru</button>
            <small style="color:#64748b; font-size:12px; display:block; margin-top:6px;">💡 Bisa tambah banyak Topik. Tiap Topik bisa punya banyak Sub Topik/Materi. Ini yang akan dipakai AI untuk mapping TP & buat kisi yang presisi.</small>
          </div>

          <div class="kisi-form-grid">
            <div class="kisi-form-group">
              <label>📅 Jenis Asesmen</label>
              <select id="kisi-jenis" class="kisi-form-control">
                <option value="Formatif">Asesmen Formatif</option>
                <option value="Sumatif">Asesmen Sumatif</option>
                <option value="Diagnostik">Asesmen Diagnostik</option>
                <option value="PTS">PTS</option>
                <option value="PAS">PAS</option>
              </select>
            </div>
            <div class="kisi-form-group">
              <label>🔢 Jumlah Soal</label>
              <input type="number" id="kisi-jumlah" class="kisi-form-control" value="10" min="1" max="50">
            </div>
          </div>
          <div class="kisi-form-group">
            <label>📝 Bentuk Soal</label>
            <select id="kisi-bentuk" class="kisi-form-control">
              <option value="Pilihan Ganda">Pilihan Ganda</option>
              <option value="Isian Singkat">Isian Singkat</option>
              <option value="Esai">Esai / Uraian</option>
              <option value="Campuran">Campuran (Otomatis AI)</option>
              <option value="Pilihan Ganda + Esai">Pilihan Ganda + Esai</option>
              <option value="Isian + Pilihan Ganda + Esai">Isian + Pilihan Ganda + Esai (Lengkap)</option>
            </select>
          </div>

          <div class="kisi-form-group">
            <label>🎯 Tujuan Pembelajaran (TP) / Indikator</label>
            <div class="method-options">
              <label class="method-option"><input type="radio" name="tpMethod" value="master" checked> 1. Master Data</label>
              <label class="method-option"><input type="radio" name="tpMethod" value="ai"> 2. Generate AI</label>
              <label class="method-option"><input type="radio" name="tpMethod" value="manual"> 3. Input Manual</label>
            </div>
            <div id="tpMethodMaster" class="tp-method-content">
              <button type="button" id="btnLoadMasterTP" class="kisi-btn kisi-btn-primary" style="width: 100%; margin-bottom: 10px; font-size: 13px; padding: 10px;">🔄 Muat TP dari Master Data (Mapel, Kelas, Tema & Sub Tema)</button>
              <select id="selectMasterTP" class="kisi-form-control" multiple size="5" style="min-height: 120px; display: none;"></select>
              <small id="masterTPHint" style="color: #64748b; display: none; font-size: 12px;">💡 Tahan Ctrl untuk pilih lebih dari satu TP.</small>
            </div>
            <div id="tpMethodAI" class="tp-method-content" style="display: none;">
              <button type="button" id="btnGenerateTP" class="kisi-btn kisi-btn-primary" style="width: 100%; margin-bottom: 10px; font-size: 13px; padding: 10px;">✨ Generate TP dengan AI</button>
              <textarea id="inpTujuanAI" class="kisi-form-control" rows="3" readonly placeholder="TP akan muncul di sini..."></textarea>
            </div>
            <div id="tpMethodManual" class="tp-method-content" style="display: none;">
              <textarea id="inpTujuanManual" class="kisi-form-control" rows="3" placeholder="Tulis manual..."></textarea>
            </div>
            <textarea id="kisi-tp" class="kisi-form-control" rows="4" placeholder="1. Siswa mampu..."></textarea>
          </div>
        </div>

        <div class="kisi-actions">
          <button class="kisi-btn kisi-btn-primary" id="btn-generate-ai">✨ Generate Kisi-Kisi dengan AI</button>
          <button class="kisi-btn kisi-btn-success" id="btn-simpan">💾 Simpan ke Database</button>
          <button class="kisi-btn kisi-btn-warning" id="btn-export">📥 Export Word</button>
          <button class="kisi-btn kisi-btn-secondary" id="btn-reset">🔄 Reset Form</button>
        </div>

        <div class="kisi-section" id="kisi-preview-section" style="display: none;">
          <h3 class="kisi-section-title">👁️ Preview Kisi-Kisi</h3>
          <div id="kisi-preview-content"></div>
        </div>
      </div>

      <div id="kisi-list-section" style="display: none;">
        <div class="kisi-section">
          <h3 class="kisi-section-title">📚 Daftar Kisi-Kisi Tersimpan</h3>
          <div id="kisi-list-container"><div class="kisi-loading">⏳ Memuat data...</div></div>
        </div>
      </div>
    </div>
  `;
}

// ===== DINAMIS TOPIK & SUBTOPIK =====
function addTopik(container, data = { tema: '', subTemas: [''] }) {
  topikCounter++;
  const id = topikCounter;
  const containerEl = container.querySelector('#topik-container');
  if(!containerEl) return;

  const div = document.createElement('div');
  div.className = 'topik-card';
  div.dataset.topikId = id;
  div.innerHTML = `
    <div class="topik-card-header">
      <span class="topik-card-title">📂 Topik ${id}</span>
      <button type="button" class="btn-mini btn-mini-danger btnHapusTopik">🗑️ Hapus Topik</button>
    </div>
    <div class="kisi-form-group" style="margin-bottom:8px;">
      <input type="text" class="kisi-form-control input-tema" placeholder="Contoh: Aku Cinta Al-Quran / Tumbuhan di Sekitarku" value="${data.tema || ''}">
    </div>
    <label style="font-size:12px; font-weight:600; color:#831843;">📖 Sub Tema / Materi:</label>
    <div class="subtopik-list"></div>
    <button type="button" class="btn-mini btn-mini-success btnTambahSub" style="margin-top:8px;">➕ Tambah Sub Topik</button>
  `;
  containerEl.appendChild(div);

  const subList = div.querySelector('.subtopik-list');
  (data.subTemas && data.subTemas.length ? data.subTemas : ['']).forEach(st => {
    addSubTopikInput(subList, st);
  });

  div.querySelector('.btnHapusTopik').addEventListener('click', () => {
    if(containerEl.children.length <= 1){
      showToast('⚠️ Minimal harus ada 1 Topik','error');
      return;
    }
    div.remove();
  });
  div.querySelector('.btnTambahSub').addEventListener('click', () => addSubTopikInput(subList, ''));
}

function addSubTopikInput(subListEl, value='') {
  const item = document.createElement('div');
  item.className = 'subtopik-item';
  item.innerHTML = `
    <input type="text" class="kisi-form-control input-subtema" placeholder="Contoh: Alquran adalah kitabku / Bagian tubuh tumbuhan" value="${value}">
    <button type="button" class="btn-mini btn-mini-danger btnHapusSub">✕</button>
  `;
  subListEl.appendChild(item);
  item.querySelector('.btnHapusSub').addEventListener('click', () => {
    if(subListEl.children.length <= 1){
      item.querySelector('input').value = '';
      showToast('💡 Sub tema dikosongkan, bukan dihapus (minimal 1)','success');
    } else {
      item.remove();
    }
  });
}

function getTopikData(container) {
  const cards = container.querySelectorAll('.topik-card');
  const result = [];
  cards.forEach(card => {
    const tema = card.querySelector('.input-tema')?.value.trim() || '';
    const subInputs = card.querySelectorAll('.input-subtema');
    const subTemas = Array.from(subInputs).map(i => i.value.trim()).filter(Boolean);
    if(tema || subTemas.length){
      result.push({ tema, subTemas });
    }
  });
  return result;
}

function getTemaSubTema(container) {
  const all = getTopikData(container);
  if(all.length === 0) return { tema: '', subTema: '', combined: '', allTopik: [] };
  // For backward compatibility: tema pertama, subtema pertama
  const first = all[0];
  const tema = first.tema;
  const subTema = first.subTemas[0] || '';
  const combined = all.map(t => {
    if(t.subTemas.length) return `${t.tema} - ${t.subTemas.join(', ')}`;
    return t.tema;
  }).join(' | ');
  return { tema, subTema, combined, allTopik: all };
}

function attachEvents(container) {
  container.querySelectorAll('.kisi-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      container.querySelectorAll('.kisi-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const target = tab.dataset.tab;
      container.querySelector('#kisi-form-section').style.display = target === 'form' ? 'block' : 'none';
      container.querySelector('#kisi-list-section').style.display = target === 'list' ? 'block' : 'none';
    });
  });

  container.querySelector('#btnTambahTopik').addEventListener('click', () => addTopik(container));

  container.querySelectorAll('input[name="tpMethod"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      const method = e.target.value;
      container.querySelector('#tpMethodMaster').style.display = method === 'master' ? 'block' : 'none';
      container.querySelector('#tpMethodAI').style.display = method === 'ai' ? 'block' : 'none';
      container.querySelector('#tpMethodManual').style.display = method === 'manual' ? 'block' : 'none';
    });
  });

  const btnLoadTP = container.querySelector('#btnLoadMasterTP');
  if (btnLoadTP) btnLoadTP.addEventListener('click', () => loadMasterTP(container));
  const selectTP = container.querySelector('#selectMasterTP');
  if (selectTP) selectTP.addEventListener('change', () => syncTPSelection(container));
  const btnGenTP = container.querySelector('#btnGenerateTP');
  if (btnGenTP) btnGenTP.addEventListener('click', () => generateTPAI(container));

  container.querySelector('#btn-generate-ai').addEventListener('click', () => handleGenerateAI(container));
  container.querySelector('#btn-simpan').addEventListener('click', () => handleSimpan(container));
  container.querySelector('#btn-export').addEventListener('click', () => handleExportWord(container));
  container.querySelector('#btn-reset').addEventListener('click', () => {
    if (confirm('🔄 Reset semua form?')) {
      currentEditId = null;
      container.querySelector('#topik-container').innerHTML = '';
      topikCounter = 0;
      addTopik(container);
      container.querySelectorAll('#kisi-sekolah, #kisi-guru, #kisi-tp, #inpTujuanAI, #inpTujuanManual').forEach(el => {
        if(el.id === 'kisi-guru') el.value = currentUser.displayName || 'Hasriandi Basir SP.d';
        else if(el.id === 'kisi-sekolah') el.value = currentUser.namaSekolah || 'SDN 139 LAMANDA';
        else el.value = '';
      });
      container.querySelector('#kisi-preview-section').style.display = 'none';
      container.querySelector('#selectMasterTP').style.display = 'none';
      container.querySelector('#masterTPHint').style.display = 'none';
      showToast('🔄 Form direset!');
    }
  });
}

// ===== LOAD TP DARI MASTER DATA - FILTER MULTI TOPIK =====
async function loadMasterTP(container) {
  const mapelId = container.querySelector('#kisi-mapel')?.value || '';
  const kelasVal = container.querySelector('#kisi-kelas')?.value || '';
  const { allTopik, combined } = getTemaSubTema(container);
  
  const allKeywords = allTopik.flatMap(t => [t.tema, ...t.subTemas]).join(' ').toLowerCase().trim();
  
  if (!mapelId) { showToast('⚠️ Pilih Mata Pelajaran dulu!', 'error'); return; }
  if (!allKeywords) { showToast('⚠️ Isi minimal 1 Tema dulu!', 'error'); return; }

  const btn = container.querySelector('#btnLoadMasterTP');
  const selectEl = container.querySelector('#selectMasterTP');
  const hintEl = container.querySelector('#masterTPHint');

  if (btn) { btn.disabled = true; btn.textContent = '⏳ Mencari TP...'; }

  try {
    const q = query(collection(db, 'data_tp'), where('userId', '==', currentUser.uid));
    const snap = await getDocs(q);

    let allTP = [];
    snap.forEach(docSnap => {
      const d = docSnap.data();
      let tpList = [];
      if (d.tujuan_pembelajaran) {
        if (Array.isArray(d.tujuan_pembelajaran)) tpList = d.tujuan_pembelajaran;
        else tpList = d.tujuan_pembelajaran.toString().split('\n').filter(Boolean);
      }
      tpList.forEach(tpRaw => {
        const text = (typeof tpRaw === 'string' ? tpRaw : (tpRaw.deskripsi || '')).trim();
        if (!text) return;
        allTP.push({
          text,
          mapel: (d.mapel || d.mapelId || '').toLowerCase(),
          mapelOriginal: d.mapel || d.mapelId || '',
          kelas: (d.kelas || '').toString().toLowerCase(),
          topik: (d.topik || d.tema || '').toLowerCase(),
          topikOriginal: d.topik || d.tema || ''
        });
      });
    });

    // Filter Mapel by ID or nama
    let step1 = allTP.filter(item => {
      if (!item.mapel) return false;
      const selectedMapel = dataMapel.find(m => m.id === mapelId);
      const namaLower = selectedMapel ? selectedMapel.nama.toLowerCase() : '';
      return item.mapel.includes(mapelId.toLowerCase()) || (namaLower && item.mapel.includes(namaLower)) || mapelId.toLowerCase().includes(item.mapel);
    });

    if (step1.length === 0) {
      showToast(`⚠️ Tidak ada TP dengan mapel "${mapelId}" di Master Data`, 'error');
      selectEl.style.display = 'none';
      return;
    }

    if (kelasVal) {
      const [kelasNum] = kelasVal.split('|');
      step1 = step1.filter(item => !item.kelas || item.kelas.includes(kelasNum.toLowerCase()));
    }

    // Filter by keywords dari semua topik
    const keywordsArr = allKeywords.split(/\s+/).filter(k => k.length > 2);
    let finalFiltered = step1.filter(item => {
      const haystack = `${item.topik} ${item.text}`.toLowerCase();
      return keywordsArr.some(kw => haystack.includes(kw));
    });

    if (finalFiltered.length === 0) finalFiltered = step1.slice(0, 20); // fallback tampilkan 20 jika tidak ada yang cocok persis

    selectEl.innerHTML = '';
    finalFiltered.forEach((item, idx) => {
      const opt = document.createElement('option');
      opt.value = item.text;
      opt.textContent = `${idx+1}. ${item.text.substring(0,110)}... [Topik: ${item.topikOriginal}]`;
      selectEl.appendChild(opt);
    });
    selectEl.style.display = 'block';
    if (hintEl) {
      hintEl.style.display = 'block';
      hintEl.textContent = `✅ Ditemukan ${finalFiltered.length} TP dari ${step1.length} TP mapel tersebut. Filter: ${combined}`;
    }
    showToast(`✅ ${finalFiltered.length} TP ditemukan!`);

  } catch (err) {
    console.error(err);
    showToast('❌ Gagal: ' + err.message, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '🔄 Muat TP dari Master Data (Mapel, Kelas, Tema & Sub Tema)'; }
  }
}

function syncTPSelection(container) {
  const selectEl = container.querySelector('#selectMasterTP');
  const tpTextarea = container.querySelector('#kisi-tp');
  if (!selectEl || !tpTextarea) return;
  const selected = Array.from(selectEl.selectedOptions).map(o => o.value);
  if (selected.length > 0) {
    tpTextarea.value = selected.map((t, i) => `${i+1}. ${t}`).join('\n');
  }
}

async function generateTPAI(container) {
  const mapelId = container.querySelector('#kisi-mapel')?.value;
  const kelas = container.querySelector('#kisi-kelas')?.value;
  const { combined } = getTemaSubTema(container);
  if (!mapelId || !kelas || !combined) {
    showToast('⚠️ Lengkapi Mapel, Kelas, dan minimal 1 Tema!', 'error');
    return;
  }
  if (!groqApiKey) { showToast('⚠️ API Key belum aktif!', 'error'); return; }
  const btn = container.querySelector('#btnGenerateTP');
  btn.disabled = true; btn.textContent = '⏳ Generating...';
  try {
    const mapelInfo = dataMapel.find(m => m.id === mapelId);
    const mapelNama = mapelInfo ? mapelInfo.nama : mapelId;
    const prompt = `Buatkan 3-5 Tujuan Pembelajaran (TP) untuk ${mapelNama} Kelas ${kelas} dengan topik "${combined}". Format: nomor + deskripsi singkat.`;
    const res = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqApiKey}` },
      body: JSON.stringify({ model: GROQ_MODEL, messages: [{ role: 'user', content: prompt }], temperature: 0.7 })
    });
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || '';
    container.querySelector('#inpTujuanAI').value = text;
    container.querySelector('#kisi-tp').value = text;
    showToast('✅ TP berhasil di-generate AI!');
  } catch (e) {
    showToast('❌ Gagal generate TP: '+e.message, 'error');
  } finally { btn.disabled = false; btn.textContent = '✨ Generate TP dengan AI'; }
}

async function handleGenerateAI(container) {
  const { combined, allTopik } = getTemaSubTema(container);
  const sekolah = container.querySelector('#kisi-sekolah')?.value;
  const guru = container.querySelector('#kisi-guru')?.value;
  const mapelId = container.querySelector('#kisi-mapel')?.value;
  const kelas = container.querySelector('#kisi-kelas')?.value;
  const jenis = container.querySelector('#kisi-jenis')?.value;
  const jumlah = container.querySelector('#kisi-jumlah')?.value;
  const bentuk = container.querySelector('#kisi-bentuk')?.value;
  const tp = container.querySelector('#kisi-tp')?.value;

  if (!mapelId || !kelas || allTopik.length === 0 || !tp) {
    showToast('⚠️ Lengkapi Mapel, Kelas, minimal 1 Tema, dan TP!', 'error');
    return;
  }
  if (!groqApiKey) { showToast('⚠️ API Key belum aktif!', 'error'); return; }

  const btn = container.querySelector('#btn-generate-ai');
  btn.disabled = true; btn.textContent = '⏳ AI Sedang Berpikir...';
  const previewSection = container.querySelector('#kisi-preview-section');
  const previewContent = container.querySelector('#kisi-preview-content');
  previewContent.innerHTML = '<div class="kisi-loading">🤖 AI sedang menyusun kisi-kisi untuk '+allTopik.length+' topik...</div>';
  previewSection.style.display = 'block';

  try {
    const mapelInfo = dataMapel.find(m => m.id === mapelId);
    const mapelNama = mapelInfo ? mapelInfo.nama : mapelId;
    const topikDetail = allTopik.map((t,i) => `Topik ${i+1}: ${t.tema} | Sub: ${t.subTemas.join(', ')}`).join('\n');

    const prompt = `
Buatkan kisi-kisi soal untuk:
- Mapel: ${mapelNama} (${mapelId})
- Kelas/Fase: ${kelas}
- Daftar Topik & Sub Topik:
${topikDetail}
- Jenis: ${jenis}
- Jumlah Soal: ${jumlah}
- Bentuk Soal: ${bentuk}
- TP/Indikator:
${tp}

Bagi jumlah soal secara proporsional ke semua topik.
Kembalikan dalam JSON array dengan format per item:
{
  "nomor": 1,
  "tujuan_pembelajaran": "...",
  "indikator_soal": "...",
  "materi": "diambil dari sub topik yang relevan",
  "bentuk_soal": "Pilihan Ganda / Isian / Esai / Campuran",
  "level_kognitif": "LOTS/MOTS/HOTS",
  "nomor_soal": "1",
  "media_gambar": "Tidak ada / Ada",
  "topik_asal": "nama topik asalnya"
}
Hanya kembalikan JSON array valid, tanpa penjelasan tambahan.
`;
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqApiKey}` },
      body: JSON.stringify({ model: GROQ_MODEL, messages: [{ role: 'user', content: prompt }], temperature: 0.7, max_tokens: 4000 })
    });
    const data = await response.json();
    let text = data.choices?.[0]?.message?.content || '';
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    let kisiData = [];
    try { kisiData = JSON.parse(text); } catch (e) {
      const jsonMatch = text.match(/\[.*\]/s);
      if (jsonMatch) kisiData = JSON.parse(jsonMatch[0]);
    }

    if (!Array.isArray(kisiData) || kisiData.length === 0) throw new Error('Format AI tidak valid');

    let html = `<table class="kisi-preview-table"><thead><tr>
      <th>No</th><th>Topik Asal</th><th>Tujuan Pembelajaran</th><th>Indikator Soal</th>
      <th>Materi</th><th>Bentuk</th><th>Level</th><th>No. Soal</th><th>Media</th>
    </tr></thead><tbody>`;
    kisiData.forEach(item => {
      const levelClass = item.level_kognitif === 'LOTS' ? 'level-lots' : item.level_kognitif === 'MOTS' ? 'level-mots' : 'level-hots';
      const mediaIcon = item.media_gambar && item.media_gambar !== 'Tidak ada' ? '🖼️ Ada' : '➖';
      html += `<tr>
        <td style="text-align: center;">${item.nomor}</td>
        <td style="font-size:11px;">${item.topik_asal || ''}</td>
        <td>${item.tujuan_pembelajaran}</td>
        <td>${item.indikator_soal}</td>
        <td>${item.materi}</td>
        <td style="text-align: center;">${item.bentuk_soal}</td>
        <td style="text-align: center;"><span class="level-badge ${levelClass}">${item.level_kognitif}</span></td>
        <td style="text-align: center;">${item.nomor_soal}</td>
        <td style="text-align: center;">${mediaIcon}</td>
      </tr>`;
    });
    html += '</tbody></table>';
    previewContent.innerHTML = html;
    previewContent.dataset.kisiJson = JSON.stringify(kisiData);
    showToast('✅ Kisi-kisi berhasil di-generate!');

  } catch (error) {
    console.error(error);
    previewContent.innerHTML = `<div class="kisi-empty">❌ Gagal: ${error.message}</div>`;
    showToast('❌ Gagal generate: '+error.message, 'error');
  } finally {
    btn.disabled = false; btn.textContent = '✨ Generate Kisi-Kisi dengan AI';
  }
}

async function handleSimpan(container) {
  const { combined, allTopik } = getTemaSubTema(container);
  const firstTema = allTopik[0]?.tema || '';
  const firstSub = allTopik[0]?.subTemas[0] || '';

  const informasi = {
    sekolah: container.querySelector('#kisi-sekolah')?.value,
    guru: container.querySelector('#kisi-guru')?.value,
    mapel: container.querySelector('#kisi-mapel')?.value,
    mapelId: container.querySelector('#kisi-mapel')?.value,
    kelas: container.querySelector('#kisi-kelas')?.value.split('|')[0],
    fase: container.querySelector('#kisi-kelas')?.value.split('|')[1],
    tema: firstTema,
    sub_tema: firstSub,
    subtema: firstSub,
    topik: combined,
    topik_materi: combined,
    topik_list: allTopik, // NEW: array presisi
    jenis_asesmen: container.querySelector('#kisi-jenis')?.value,
    jumlah_soal: container.querySelector('#kisi-jumlah')?.value,
    bentuk_soal: container.querySelector('#kisi-bentuk')?.value,
    tujuan_pembelajaran: container.querySelector('#kisi-tp')?.value
  };

  if (!informasi.mapel || !informasi.kelas || allTopik.length === 0 || !informasi.tujuan_pembelajaran) {
    showToast('⚠️ Lengkapi Mapel, Kelas, minimal 1 Tema, dan TP!', 'error');
    return;
  }

  const previewContent = container.querySelector('#kisi-preview-content');
  let kisi_kisi = [];
  if (previewContent?.dataset?.kisiJson) {
    try { kisi_kisi = JSON.parse(previewContent.dataset.kisiJson); } catch(e) {}
  }

  try {
    const payload = {
      userId: currentUser.uid,
      informasi,
      kisi_kisi,
      updatedAt: serverTimestamp()
    };
    if (currentEditId) {
      await updateDoc(doc(db, 'kisi_kisi', currentEditId), payload);
      showToast('✅ Kisi-kisi berhasil diupdate!');
    } else {
      payload.createdAt = serverTimestamp();
      await addDoc(collection(db, 'kisi_kisi'), payload);
      showToast('✅ Kisi-kisi berhasil disimpan!');
    }
    currentEditId = null;
  } catch (error) {
    console.error(error);
    showToast('❌ Gagal simpan: '+error.message, 'error');
  }
}

function loadKisiList(container) {
  const listContainer = container.querySelector('#kisi-list-container');
  if (!listContainer) return;
  const q = query(collection(db, 'kisi_kisi'), where('userId', '==', currentUser.uid), orderBy('createdAt', 'desc'));
  onSnapshot(q, (snapshot) => {
    if (snapshot.empty) {
      listContainer.innerHTML = '<div class="kisi-empty">📭 Belum ada kisi-kisi tersimpan.</div>';
      return;
    }
    listContainer.innerHTML = '';
    snapshot.forEach(docSnap => {
      const d = docSnap.data();
      const info = d.informasi || {};
      const topikCount = info.topik_list?.length || 1;
      const subCount = info.topik_list?.reduce((a,b) => a + (b.subTemas?.length||0),0) || 1;
      const div = document.createElement('div');
      div.className = 'kisi-item';
      div.innerHTML = `
        <div class="kisi-item-header">
          <div>
            <div class="kisi-item-title">📚 ${info.mapel || info.mapelId || '-'} - ${info.tema || '-'} ${topikCount>1 ? `(+${topikCount-1} topik lain)` : ''}</div>
            <div class="kisi-item-meta">Kelas ${info.kelas} Fase ${info.fase} | ${topikCount} Topik, ${subCount} Sub | ${info.jenis_asesmen || ''} | ${info.jumlah_soal || 0} soal</div>
          </div>
          <div class="kisi-item-actions">
            <button onclick="editKisi('${docSnap.id}')" style="background: #3b82f6;">✏️ Edit</button>
            <button onclick="deleteKisi('${docSnap.id}')" style="background: #ef4444;">🗑️ Hapus</button>
          </div>
        </div>
        <div style="font-size:12px; color:#64748b; margin-top:5px;">${(info.tujuan_pembelajaran || '').substring(0,120)}...</div>
      `;
      listContainer.appendChild(div);
    });
  }, (error) => {
    listContainer.innerHTML = `<div class="kisi-empty">❌ Gagal memuat: ${error.message}</div>`;
  });
}

window.editKisi = async function(id) {
  try {
    const docRef = doc(db, 'kisi_kisi', id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) { showToast('❌ Data tidak ditemukan!', 'error'); return; }
    const d = docSnap.data();
    currentEditId = id;
    document.querySelector('#kisi-sekolah').value = d.informasi?.sekolah || '';
    document.querySelector('#kisi-guru').value = d.informasi?.guru || '';
    document.querySelector('#kisi-mapel').value = d.informasi?.mapelId || d.informasi?.mapel || '';
    document.querySelector('#kisi-kelas').value = `${d.informasi?.kelas}|${d.informasi?.fase}` || '';
    document.querySelector('#kisi-jenis').value = d.informasi?.jenis_asesmen || 'Formatif';
    document.querySelector('#kisi-jumlah').value = d.informasi?.jumlah_soal || 10;
    document.querySelector('#kisi-bentuk').value = d.informasi?.bentuk_soal || 'Pilihan Ganda';
    document.querySelector('#kisi-tp').value = d.informasi?.tujuan_pembelajaran || '';

    // Restore topik_list dinamis
    const container = document.querySelector('.kisi-container');
    const topikContainer = container.querySelector('#topik-container');
    topikContainer.innerHTML = '';
    topikCounter = 0;
    const list = d.informasi?.topik_list && d.informasi.topik_list.length ? d.informasi.topik_list : [{ tema: d.informasi?.tema || '', subTemas: [d.informasi?.sub_tema || ''] }];
    list.forEach(t => addTopik(container, t));

    const previewContent = document.querySelector('#kisi-preview-content');
    if (d.kisi_kisi && d.kisi_kisi.length > 0) {
      let html = `<table class="kisi-preview-table"><thead><tr>
        <th>No</th><th>Topik Asal</th><th>TP</th><th>Indikator</th>
        <th>Materi</th><th>Bentuk</th><th>Level</th><th>No. Soal</th><th>Media</th>
      </tr></thead><tbody>`;
      d.kisi_kisi.forEach(item => {
        const levelClass = item.level_kognitif === 'LOTS' ? 'level-lots' : item.level_kognitif === 'MOTS' ? 'level-mots' : 'level-hots';
        const mediaIcon = item.media_gambar && item.media_gambar !== 'Tidak ada' ? '🖼️ Ada' : '➖';
        html += `<tr>
          <td style="text-align: center;">${item.nomor}</td>
          <td style="font-size:11px;">${item.topik_asal || ''}</td>
          <td>${item.tujuan_pembelajaran}</td>
          <td>${item.indikator_soal}</td>
          <td>${item.materi}</td>
          <td style="text-align: center;">${item.bentuk_soal}</td>
          <td style="text-align: center;"><span class="level-badge ${levelClass}">${item.level_kognitif}</span></td>
          <td style="text-align: center;">${item.nomor_soal}</td>
          <td style="text-align: center;">${mediaIcon}</td>
        </tr>`;
      });
      html += '</tbody></table>';
      previewContent.innerHTML = html;
      previewContent.dataset.kisiJson = JSON.stringify(d.kisi_kisi);
      document.querySelector('#kisi-preview-section').style.display = 'block';
    }
    document.querySelector('[data-tab="form"]').click();
    showToast('✅ Kisi-kisi dimuat untuk edit!');
  } catch (error) {
    console.error('Error loading kisi:', error);
    showToast('❌ Gagal memuat kisi-kisi!', 'error');
  }
};

window.deleteKisi = async function(id) {
  if (!confirm('⚠️ Yakin hapus kisi-kisi ini?')) return;
  try {
    await deleteDoc(doc(db, 'kisi_kisi', id));
    showToast('✅ Kisi-kisi berhasil dihapus!');
  } catch (error) {
    console.error('Error deleting:', error);
    showToast('❌ Gagal menghapus!', 'error');
  }
};

function handleExportWord(container) {
  const previewContent = container.querySelector('#kisi-preview-content');
  if (!previewContent.innerHTML.trim()) {
    showToast('⚠️ Generate kisi-kisi terlebih dahulu!', 'error');
    return;
  }
  const { allTopik, combined } = getTemaSubTema(container);
  const sekolah = container.querySelector('#kisi-sekolah').value;
  const guru = container.querySelector('#kisi-guru').value;
  const mapelId = container.querySelector('#kisi-mapel').value;
  const mapelInfo = dataMapel.find(m => m.id === mapelId);
  const mapel = mapelInfo ? mapelInfo.nama : mapelId;
  const kelas = container.querySelector('#kisi-kelas').value;
  const jenis = container.querySelector('#kisi-jenis').value;
  const jumlah = container.querySelector('#kisi-jumlah').value;
  const bentuk = container.querySelector('#kisi-bentuk').value;
  const [kelasNum, fase] = kelas.split('|');

  let topikHtml = allTopik.map((t,i) => `<tr><td><strong>Topik ${i+1}</strong></td><td>: ${t.tema} ${t.subTemas.length ? ' (Sub: '+t.subTemas.join(', ')+')' : ''}</td></tr>`).join('');

  let html = `
    <html><head><meta charset="utf-8"><title>Kisi-Kisi - ${mapel}</title>
    <style>
      body { font-family: 'Times New Roman', serif; margin: 2cm; line-height: 1.6; }
      h1 { text-align: center; font-size: 16pt; margin-bottom: 5px; }
      h2 { font-size: 13pt; border-bottom: 2px solid #000; padding-bottom: 5px; margin-top: 20px; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 11pt; }
      th, td { border: 1px solid #000; padding: 8px; text-align: left; vertical-align: top; }
      th { background: #f0f0f0; font-weight: bold; }
      .header-table { border: none; margin-bottom: 20px; }
      .header-table td { border: none; padding: 5px; }
    </style></head><body>
    <h1>KISI-KISI SOAL</h1>
    <h2 style="text-align: center; border: none;">${combined}</h2>
    <table class="header-table">
      <tr><td style="width: 30%;"><strong>Sekolah</strong></td><td>: ${sekolah}</td></tr>
      <tr><td><strong>Guru</strong></td><td>: ${guru}</td></tr>
      <tr><td><strong>Mata Pelajaran</strong></td><td>: ${mapel}</td></tr>
      <tr><td><strong>Kelas/Fase</strong></td><td>: ${kelasNum} (Fase ${fase})</td></tr>
      <tr><td><strong>Jenis Asesmen</strong></td><td>: ${jenis}</td></tr>
      <tr><td><strong>Jumlah Soal</strong></td><td>: ${jumlah}</td></tr>
      <tr><td><strong>Bentuk Soal</strong></td><td>: ${bentuk}</td></tr>
      ${topikHtml}
    </table>
    <h2>Kisi-Kisi Soal</h2>
    ${previewContent.innerHTML}
    <div style="margin-top: 50px; text-align: right;">
      <p style="margin: 5px 0;">Lamanda, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
      <p style="margin: 5px 0;">Guru Mata Pelajaran</p>
      <br><br><br>
      <p style="margin: 5px 0; border-bottom: 1px solid #000; display: inline-block; min-width: 200px;">(${guru})</p>
    </div>
    </body></html>
  `;

  const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `KisiKisi_${mapelId}_${(allTopik[0]?.tema||'topik').replace(/\s+/g, '_')}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  showToast('📥 Word berhasil diunduh!');
}

function showToast(msg, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `kisi-toast kisi-toast-${type}`;
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(400px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
