// modules/admin-pembelajaran/features/kisi-kisi.js
// =========================================
// FITUR: PEMBUAT KISI-KISI SOAL - V2 FIX
// Update: Tema+SubTema, Bentuk Isian, TP Master Data ala RPM
// =========================================

import { db } from '../../../js/firebase-config.js';
import { 
  collection, addDoc, query, where, orderBy, 
  onSnapshot, doc, updateDoc, deleteDoc, serverTimestamp, getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';
let groqApiKey = null;

const CSS_ID = 'kisi-kisi-css';
let currentEditId = null;
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
  { id: 'bta', nama: 'BTA', singkatan: 'BTA', icon: '📿' }
];

export async function init(container, db) {
  loadCSS();
  await loadGroqApiKey();
  await loadMataPelajaran();
  renderUI(container);
  attachEvents(container);
  loadKisiList(container);
}

export function cleanup() {
  const css = document.getElementById(CSS_ID);
  if (css) css.remove();
}

async function loadGroqApiKey() {
  try {
    const { doc, getDoc } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
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
    select.kisi-form-control { cursor: pointer; }
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
    .kisi-empty { text-align: center; padding: 30px; color: #64748b; background: white; border-radius: 10px; }
    .kisi-loading { text-align: center; padding: 20px; color: #831843; }
    .kisi-badge { display: inline-block; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; }
    .kisi-badge-ready { background: #dbeafe; color: #1e40af; }
    .kisi-toast { position: fixed; top: 20px; right: 20px; padding: 14px 24px; border-radius: 10px; z-index: 10001; color: white; font-weight: 600; box-shadow: 0 4px 16px rgba(0,0,0,0.15); animation: kisiSlideIn 0.3s ease; }
    .kisi-toast-success { background: linear-gradient(135deg, #10b981 0%, #059669 100%); }
    .kisi-toast-error { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); }
    @keyframes kisiSlideIn { from { transform: translateX(400px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    .kisi-preview-table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 13px; }
    .kisi-preview-table th { background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); color: white; padding: 10px 8px; text-align: center; font-weight: 700; border: 1px solid #e2e8f0; }
    .kisi-preview-table td { padding: 10px 8px; border: 1px solid #e2e8f0; text-align: left; vertical-align: top; }
    .kisi-preview-table tr:nth-child(even) { background: #fff1f2; }
    .level-badge { display: inline-block; padding: 3px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; }
    .level-lots { background: #dcfce7; color: #166534; }
    .level-mots { background: #fef3c7; color: #92400e; }
    .level-hots { background: #fee2e2; color: #991b1b; }
    .method-options { display: flex; gap: 15px; margin-bottom: 10px; flex-wrap: wrap; }
    .method-option { font-weight: 600; font-size: 13px; cursor: pointer; background: #fdf2f8; padding: 8px 12px; border-radius: 6px; border: 1px solid #fbcfe8; }
    .method-option input { margin-right: 5px; }
    .tp-method-content { margin-top: 10px; }
    @media (max-width: 768px) { .kisi-form-grid { grid-template-columns: 1fr; } .kisi-actions { flex-direction: column; } .kisi-btn { width: 100%; justify-content: center; } .kisi-preview-table { font-size: 11px; } }
  `;
  document.head.appendChild(style);
}

function renderUI(container) {
  const aiReady = groqApiKey ? '✅ AI Siap' : '⚠️ API Key Belum Aktif';
  const aiStatusClass = groqApiKey ? 'kisi-badge-ready' : '';
  
  let mapelOptions = '<option value="">-- Pilih Mapel --</option>';
  dataMapel.forEach(m => {
    mapelOptions += `<option value="${m.nama}">${m.icon} ${m.singkatan}</option>`;
  });

  container.innerHTML = `
    <div class="kisi-container">
      <div class="kisi-header">
        <h2>📋 Pembuat Kisi-Kisi Soal</h2>
        <p>Perencanaan Asesmen Berbasis AI - Format Standar Kemendikbudristek 
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
              <select id="kisi-kelas" class="kisi-form-control">
                <option value="">-- Pilih --</option>
                <option value="1|A">Kelas 1 (Fase A)</option>
                <option value="2|A">Kelas 2 (Fase A)</option>
                <option value="3|B">Kelas 3 (Fase B)</option>
                <option value="4|B">Kelas 4 (Fase B)</option>
                <option value="5|C">Kelas 5 (Fase C)</option>
                <option value="6|C">Kelas 6 (Fase C)</option>
              </select>
            </div>
          </div>
          <div class="kisi-form-grid">
            <div class="kisi-form-group">
              <label>🗂️ Tema / Topik</label>
              <input type="text" id="kisi-tema" class="kisi-form-control" placeholder="Contoh: Tumbuhan di Sekitarku">
            </div>
            <div class="kisi-form-group">
              <label>📖 Sub Tema / Materi</label>
              <input type="text" id="kisi-subtema" class="kisi-form-control" placeholder="Contoh: Bagian Tubuh Tumbuhan">
            </div>
          </div>
          <div class="kisi-form-grid">
            <div class="kisi-form-group">
              <label>📅 Jenis Asesmen</label>
              <select id="kisi-jenis" class="kisi-form-control">
                <option value="Formatif">Asesmen Formatif</option>
                <option value="Sumatif">Asesmen Sumatif</option>
                <option value="Diagnostik">Asesmen Diagnostik</option>
                <option value="PTS">PTS (Penilaian Tengah Semester)</option>
                <option value="PAS">PAS (Penilaian Akhir Semester)</option>
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
              <option value="Isian + Pilihan Ganda">a. Isian + Pilihan Ganda</option>
              <option value="Isian + Esai">b. Isian + Esai</option>
              <option value="Pilihan Ganda + Esai">c. Pilihan Ganda + Esai</option>
              <option value="Isian + Pilihan Ganda + Esai">d. Isian + Pilihan Ganda + Esai (Lengkap)</option>
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
              <button type="button" id="btnLoadMasterTP" class="kisi-btn kisi-btn-primary" style="width: 100%; margin-bottom: 10px; font-size: 13px; padding: 10px;">
                🔄 Muat TP dari Master Data (Mapel, Kelas, Tema & Sub Tema)
              </button>
              <select id="selectMasterTP" class="kisi-form-control" multiple size="5" style="min-height: 120px; display: none;"></select>
              <small id="masterTPHint" style="color: #64748b; display: none; font-size: 12px;">💡 Tahan Ctrl untuk pilih lebih dari satu TP. TP terpilih akan otomatis masuk ke textarea di bawah.</small>
            </div>
            <div id="tpMethodAI" class="tp-method-content" style="display: none;">
              <button type="button" id="btnGenerateTP" class="kisi-btn kisi-btn-primary" style="width: 100%; margin-bottom: 10px; font-size: 13px; padding: 10px;">✨ Generate TP dengan AI</button>
              <textarea id="inpTujuanAI" class="kisi-form-control" rows="3" readonly placeholder="TP akan muncul di sini..."></textarea>
            </div>
            <div id="tpMethodManual" class="tp-method-content" style="display: none;">
              <textarea id="inpTujuanManual" class="kisi-form-control" rows="3" placeholder="Tulis manual..."></textarea>
            </div>
            <textarea id="kisi-tp" class="kisi-form-control" rows="4" placeholder="1. Siswa mampu mengidentifikasi bagian tubuh tumbuhan&#10;2. Siswa mampu menjelaskan fungsi akar, batang, dan daun&#10;3. Siswa mampu menganalisis hubungan antara bagian tumbuhan dengan fungsinya" style="margin-top:10px;"></textarea>
            <p style="font-size: 12px; color: #64748b; margin-top: 5px;">💡 AI akan memetakan TP ini ke level kognitif (LOTS/MOTS/HOTS) secara otomatis. Bisa dari Master Data juga.</p>
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

  // TP Method Switching
  container.querySelectorAll('input[name="tpMethod"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      const method = e.target.value;
      container.querySelector('#tpMethodMaster').style.display = method === 'master' ? 'block' : 'none';
      container.querySelector('#tpMethodAI').style.display = method === 'ai' ? 'block' : 'none';
      container.querySelector('#tpMethodManual').style.display = method === 'manual' ? 'block' : 'none';
    });
  });

  // Load Master TP
  const btnLoadTP = container.querySelector('#btnLoadMasterTP');
  if (btnLoadTP) btnLoadTP.addEventListener('click', () => loadMasterTP(container));

  const selectTP = container.querySelector('#selectMasterTP');
  if (selectTP) selectTP.addEventListener('change', () => syncTPSelection(container));

  // Generate TP AI (optional)
  const btnGenTP = container.querySelector('#btnGenerateTP');
  if (btnGenTP) btnGenTP.addEventListener('click', () => generateTPAI(container));

  container.querySelector('#btn-generate-ai').addEventListener('click', () => handleGenerateAI(container));
  container.querySelector('#btn-simpan').addEventListener('click', () => handleSimpan(container));
  container.querySelector('#btn-export').addEventListener('click', () => handleExportWord(container));
  container.querySelector('#btn-reset').addEventListener('click', () => {
    if (confirm('🔄 Reset semua form?')) {
      currentEditId = null;
      container.querySelectorAll('input[type="text"], textarea').forEach(el => {
        if (el.id === 'kisi-guru') el.value = currentUser.displayName || 'Hasriandi Basir SP.d';
        else if (el.id === 'kisi-sekolah') el.value = currentUser.namaSekolah || 'SDN 139 LAMANDA';
        else if (el.id !== 'kisi-tp') el.value = '';
      });
      container.querySelector('#kisi-tp').value = '';
      container.querySelector('#kisi-preview-section').style.display = 'none';
      container.querySelector('#selectMasterTP').style.display = 'none';
      container.querySelector('#masterTPHint').style.display = 'none';
      showToast('🔄 Form direset!');
    }
  });
}

function getTemaSubTema(container) {
  const tema = container.querySelector('#kisi-tema')?.value.trim() || '';
  const subTema = container.querySelector('#kisi-subtema')?.value.trim() || '';
  const combined = [tema, subTema].filter(Boolean).join(' - ');
  return { tema, subTema, combined };
}

// ===== LOAD TP DARI MASTER DATA - STRICT TEMA/SUBTEMA ONLY =====
async function loadMasterTP(container) {
  const mapel = container.querySelector('#kisi-mapel')?.value || '';
  const kelasVal = container.querySelector('#kisi-kelas')?.value || '';
  const { tema, subTema } = getTemaSubTema(container);
  const temaLower = tema.toLowerCase().trim();
  const subTemaLower = subTema.toLowerCase().trim();
  const combinedLower = `${tema} ${subTema}`.toLowerCase().trim();

  console.log('[KISI] Filter diminta:', { mapel, kelasVal, tema, subTema });

  if (!mapel) {
    showToast('⚠️ Pilih Mata Pelajaran dulu!', 'error');
    return;
  }
  if (!tema && !subTema) {
    showToast('⚠️ Isi Tema atau Sub Tema dulu biar filter berjalan!', 'error');
    return;
  }

  const btn = container.querySelector('#btnLoadMasterTP');
  const selectEl = container.querySelector('#selectMasterTP');
  const hintEl = container.querySelector('#masterTPHint');

  if (btn) {
    btn.disabled = true;
    btn.textContent = '⏳ Mencari TP...';
  }

  try {
    // Ambil semua data_tp milik user ini
    const q = query(collection(db, 'data_tp'), where('userId', '==', currentUser.uid));
    const snap = await getDocs(q);

    console.log('[KISI] Total doc data_tp:', snap.size);

    let allTP = [];
    snap.forEach(docSnap => {
      const d = docSnap.data();
      let tpList = [];
      if (d.tujuan_pembelajaran) {
        if (Array.isArray(d.tujuan_pembelajaran)) tpList = d.tujuan_pembelajaran;
        else tpList = d.tujuan_pembelajaran.toString().split('
').filter(Boolean);
      }
      tpList.forEach(tpRaw => {
        const text = (typeof tpRaw === 'string' ? tpRaw : (tpRaw.deskripsi || '')).trim();
        if (!text) return;
        allTP.push({
          text,
          mapel: (d.mapel || '').toLowerCase(),
          mapelOriginal: d.mapel || '',
          kelas: (d.kelas || '').toString().toLowerCase(),
          topik: (d.topik || d.tema || '').toLowerCase(),
          topikOriginal: d.topik || d.tema || ''
        });
      });
    });

    console.log('[KISI] Total TP mentah:', allTP.length, allTP.slice(0,2));

    // 1. Filter Mapel dulu - WAJIB sama
    let step1 = allTP.filter(item => {
      if (!item.mapel) return false;
      return item.mapel === mapel.toLowerCase() || item.mapel.includes(mapel.toLowerCase()) || mapel.toLowerCase().includes(item.mapel);
    });

    console.log('[KISI] Setelah filter Mapel:', step1.length);

    if (step1.length === 0) {
      showToast(`⚠️ Tidak ada TP dengan mapel "${mapel}" di Master Data`, 'error');
      selectEl.style.display = 'none';
      if (hintEl) hintEl.style.display = 'none';
      return;
    }

    // 2. Filter Kelas jika dipilih
    let step2 = step1;
    if (kelasVal) {
      const [kelasNum] = kelasVal.split('|');
      step2 = step1.filter(item => {
        if (!item.kelas) return true;
        return item.kelas.includes(kelasNum.toLowerCase());
      });
      console.log('[KISI] Setelah filter Kelas:', step2.length);
    }

    // 3. Filter TEMA / SUB TEMA - SUPER KETAT, tidak fallback ke semua
    // Syarat: topik ATAU teks TP mengandung kata tema/subtema
    let finalFiltered = step2.filter(item => {
      const haystack = `${item.topik} ${item.text}`.toLowerCase();
      const matchTema = temaLower ? haystack.includes(temaLower) : false;
      const matchSubTema = subTemaLower ? haystack.includes(subTemaLower) : false;
      
      if (temaLower && subTemaLower) {
        return matchTema || matchSubTema;
      } else if (temaLower) {
        return matchTema;
      } else if (subTemaLower) {
        return matchSubTema;
      }
      return false;
    });

    console.log('[KISI] Final filtered by Tema/SubTema:', finalFiltered.length, finalFiltered);

    if (finalFiltered.length === 0) {
      showToast(`⚠️ Tidak ada TP yang cocok. Tema "${tema}" / Sub "${subTema}" tidak ditemukan di topik/isi TP mapel ${mapel}. Coba kata kunci lebih pendek.`, 'error');
      selectEl.style.display = 'none';
      if (hintEl) {
        hintEl.style.display = 'block';
        hintEl.textContent = `🔍 Mencari: Tema "${tema}" / Sub "${subTema}" di ${step2.length} TP mapel ${mapel}. Tidak ada yang cocok. Coba kurangi kata, misal "Tumbuhan" saja.`;
      }
      return;
    }

    // Render hanya yang cocok
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
      hintEl.textContent = `✅ Ditemukan ${finalFiltered.length} TP dari ${step2.length} TP mapel ${mapel} yang mengandung kata "${tema} / ${subTema}".`;
    }
    showToast(`✅ ${finalFiltered.length} TP sesuai ditemukan!`);

  } catch (err) {
    console.error('[KISI] Error:', err);
    showToast('❌ Gagal: ' + err.message, 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = '🔄 Muat TP dari Master Data (Mapel, Kelas, Tema & Sub Tema)';
    }
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
  const mapel = container.querySelector('#kisi-mapel')?.value;
  const kelas = container.querySelector('#kisi-kelas')?.value;
  const { combined } = getTemaSubTema(container);
  if (!mapel || !kelas || !combined) {
    showToast('⚠️ Lengkapi Mapel, Kelas, Tema & Sub Tema dulu!', 'error');
    return;
  }
  if (!groqApiKey) { showToast('⚠️ API Key belum aktif!', 'error'); return; }
  const btn = container.querySelector('#btnGenerateTP');
  btn.disabled = true; btn.textContent = '⏳ Generating...';
  try {
    const prompt = `Buatkan 3-5 Tujuan Pembelajaran (TP) untuk ${mapel} Kelas ${kelas} dengan tema "${combined}". Format: nomor + deskripsi singkat.`;
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

// ===== GENERATE KISI AI =====
async function handleGenerateAI(container) {
  const { tema, subTema, combined } = getTemaSubTema(container);
  const sekolah = container.querySelector('#kisi-sekolah')?.value;
  const guru = container.querySelector('#kisi-guru')?.value;
  const mapel = container.querySelector('#kisi-mapel')?.value;
  const kelas = container.querySelector('#kisi-kelas')?.value;
  const jenis = container.querySelector('#kisi-jenis')?.value;
  const jumlah = container.querySelector('#kisi-jumlah')?.value;
  const bentuk = container.querySelector('#kisi-bentuk')?.value;
  const tp = container.querySelector('#kisi-tp')?.value;

  if (!mapel || !kelas || !tema || !tp) {
    showToast('⚠️ Lengkapi Mapel, Kelas, Tema, dan TP dulu!', 'error');
    return;
  }
  if (!groqApiKey) { showToast('⚠️ API Key belum aktif!', 'error'); return; }

  const btn = container.querySelector('#btn-generate-ai');
  btn.disabled = true; btn.textContent = '⏳ AI Sedang Berpikir...';
  const previewSection = container.querySelector('#kisi-preview-section');
  const previewContent = container.querySelector('#kisi-preview-content');
  previewContent.innerHTML = '<div class="kisi-loading">🤖 AI sedang menyusun kisi-kisi...</div>';
  previewSection.style.display = 'block';

  try {
    const prompt = `
Buatkan kisi-kisi soal untuk:
- Mapel: ${mapel}
- Kelas/Fase: ${kelas}
- Tema: ${tema}
- Sub Tema/Materi: ${subTema}
- Jenis: ${jenis}
- Jumlah Soal: ${jumlah}
- Bentuk Soal: ${bentuk}
- TP/Indikator:
${tp}

Kembalikan dalam JSON array dengan format per item:
{
  "nomor": 1,
  "tujuan_pembelajaran": "...",
  "indikator_soal": "...",
  "materi": "...",
  "bentuk_soal": "Pilihan Ganda / Isian / Esai / Campuran",
  "level_kognitif": "LOTS/MOTS/HOTS",
  "nomor_soal": "1",
  "media_gambar": "Tidak ada / Ada"
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
    // Clean markdown code block
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    let kisiData = [];
    try { kisiData = JSON.parse(text); } catch (e) {
      // Fallback parse
      const jsonMatch = text.match(/\[.*\]/s);
      if (jsonMatch) kisiData = JSON.parse(jsonMatch[0]);
    }

    if (!Array.isArray(kisiData) || kisiData.length === 0) throw new Error('Format AI tidak valid');

    let html = `<table class="kisi-preview-table"><thead><tr>
      <th>No</th><th>Tujuan Pembelajaran</th><th>Indikator Soal</th>
      <th>Materi</th><th>Bentuk</th><th>Level</th><th>No. Soal</th><th>Media</th>
    </tr></thead><tbody>`;
    kisiData.forEach(item => {
      const levelClass = item.level_kognitif === 'LOTS' ? 'level-lots' : item.level_kognitif === 'MOTS' ? 'level-mots' : 'level-hots';
      const mediaIcon = item.media_gambar && item.media_gambar !== 'Tidak ada' ? '🖼️ Ada' : '➖';
      html += `<tr>
        <td style="text-align: center;">${item.nomor}</td>
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
  const { tema, subTema, combined } = getTemaSubTema(container);
  const informasi = {
    sekolah: container.querySelector('#kisi-sekolah')?.value,
    guru: container.querySelector('#kisi-guru')?.value,
    mapel: container.querySelector('#kisi-mapel')?.value,
    kelas: container.querySelector('#kisi-kelas')?.value.split('|')[0],
    fase: container.querySelector('#kisi-kelas')?.value.split('|')[1],
    tema,
    sub_tema: subTema,
    subtema: subTema,
    topik: combined,
    topik_materi: combined,
    jenis_asesmen: container.querySelector('#kisi-jenis')?.value,
    jumlah_soal: container.querySelector('#kisi-jumlah')?.value,
    bentuk_soal: container.querySelector('#kisi-bentuk')?.value,
    tujuan_pembelajaran: container.querySelector('#kisi-tp')?.value
  };

  if (!informasi.mapel || !informasi.kelas || !informasi.tema || !informasi.tujuan_pembelajaran) {
    showToast('⚠️ Lengkapi Tema, Mapel, Kelas, dan TP!', 'error');
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
      const div = document.createElement('div');
      div.className = 'kisi-item';
      div.innerHTML = `
        <div class="kisi-item-header">
          <div>
            <div class="kisi-item-title">📚 ${info.mapel || '-'} - ${info.tema || info.topik || '-'} ${info.sub_tema ? ' / '+info.sub_tema : ''}</div>
            <div class="kisi-item-meta">${info.kelas ? 'Kelas '+info.kelas : ''} | ${info.jenis_asesmen || ''} | ${info.bentuk_soal || ''} | ${info.jumlah_soal || 0} soal</div>
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
    const { doc, getDoc } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
    const docRef = doc(db, 'kisi_kisi', id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) { showToast('❌ Data tidak ditemukan!', 'error'); return; }
    const d = docSnap.data();
    currentEditId = id;
    document.querySelector('#kisi-sekolah').value = d.informasi?.sekolah || '';
    document.querySelector('#kisi-guru').value = d.informasi?.guru || '';
    document.querySelector('#kisi-mapel').value = d.informasi?.mapel || '';
    document.querySelector('#kisi-kelas').value = `${d.informasi?.kelas}|${d.informasi?.fase}` || '';
    document.querySelector('#kisi-tema').value = d.informasi?.tema || d.informasi?.topik?.split(' - ')[0] || '';
    document.querySelector('#kisi-subtema').value = d.informasi?.sub_tema || d.informasi?.subtema || d.informasi?.topik?.split(' - ')[1] || '';
    document.querySelector('#kisi-jenis').value = d.informasi?.jenis_asesmen || 'Formatif';
    document.querySelector('#kisi-jumlah').value = d.informasi?.jumlah_soal || 10;
    document.querySelector('#kisi-bentuk').value = d.informasi?.bentuk_soal || 'Pilihan Ganda';
    document.querySelector('#kisi-tp').value = d.informasi?.tujuan_pembelajaran || '';

    const previewContent = document.querySelector('#kisi-preview-content');
    if (d.kisi_kisi && d.kisi_kisi.length > 0) {
      let html = `<table class="kisi-preview-table"><thead><tr>
        <th style="width: 40px;">No</th><th>Tujuan Pembelajaran</th><th>Indikator Soal</th>
        <th>Materi</th><th style="width: 80px;">Bentuk</th><th style="width: 80px;">Level</th>
        <th style="width: 60px;">No. Soal</th><th style="width: 100px;">Media</th>
      </tr></thead><tbody>`;
      d.kisi_kisi.forEach(item => {
        const levelClass = item.level_kognitif === 'LOTS' ? 'level-lots' : item.level_kognitif === 'MOTS' ? 'level-mots' : 'level-hots';
        const mediaIcon = item.media_gambar && item.media_gambar !== 'Tidak ada' ? '🖼️ Ada' : '➖';
        html += `<tr>
          <td style="text-align: center;">${item.nomor}</td>
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
  const sekolah = container.querySelector('#kisi-sekolah').value;
  const guru = container.querySelector('#kisi-guru').value;
  const mapel = container.querySelector('#kisi-mapel').value;
  const kelas = container.querySelector('#kisi-kelas').value;
  const tema = container.querySelector('#kisi-tema').value;
  const subTema = container.querySelector('#kisi-subtema').value;
  const jenis = container.querySelector('#kisi-jenis').value;
  const jumlah = container.querySelector('#kisi-jumlah').value;
  const bentuk = container.querySelector('#kisi-bentuk').value;
  const [kelasNum, fase] = kelas.split('|');

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
    <h2 style="text-align: center; border: none;">${tema} ${subTema ? ' - '+subTema : ''}</h2>
    <table class="header-table">
      <tr><td style="width: 30%;"><strong>Sekolah</strong></td><td>: ${sekolah}</td></tr>
      <tr><td><strong>Guru</strong></td><td>: ${guru}</td></tr>
      <tr><td><strong>Mata Pelajaran</strong></td><td>: ${mapel}</td></tr>
      <tr><td><strong>Kelas/Fase</strong></td><td>: ${kelasNum} (Fase ${fase})</td></tr>
      <tr><td><strong>Jenis Asesmen</strong></td><td>: ${jenis}</td></tr>
      <tr><td><strong>Jumlah Soal</strong></td><td>: ${jumlah}</td></tr>
      <tr><td><strong>Bentuk Soal</strong></td><td>: ${bentuk}</td></tr>
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
  link.download = `KisiKisi_${mapel}_${tema.replace(/\s+/g, '_')}.doc`;
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
