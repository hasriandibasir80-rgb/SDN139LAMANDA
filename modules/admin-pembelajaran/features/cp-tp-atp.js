// modules/admin-pembelajaran/features/cp-tp-atp.js
// =========================================
// FITUR: CP, TP, & ATP GENERATOR (UNIVERSAL)
// MANDIRI - TIDAK BERGANTUNG CSS PARENT
// INPUT: Topik (WAJIB) + Elemen per topik (OPSIONAL)
// OUTPUT: 3 Tabel Terpisah (CP, TP, ATP)
// =========================================

import { db } from '../../../js/firebase-config.js';
import { collection, addDoc, query, where, orderBy, onSnapshot, doc, getDoc, serverTimestamp } 
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');

// Konfigurasi Groq API
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';
let groqApiKey = null;

// Konstanta CSS
const CSS_PATH = '../../../css/modules/cp-generator.css';
const CSS_ID = 'cp-generator-css';

/**
 * Init - Dipanggil oleh main.js
 */
export async function init(container, db) {
  loadFeatureCSS();
  await loadGroqApiKey();
  renderCTAGenerator(container);
  attachEventListeners(container);
  loadCTAData(container);
}

function loadFeatureCSS() {
  if (document.getElementById(CSS_ID)) return;
  
  const cssLink = document.createElement('link');
  cssLink.rel = 'stylesheet';
  cssLink.href = CSS_PATH;
  cssLink.id = CSS_ID;
  
  // Fallback inline CSS jika eksternal gagal
  cssLink.onerror = () => {
    console.warn('️ CSS eksternal gagal, menggunakan inline');
    const style = document.createElement('style');
    style.id = CSS_ID + '-inline';
    style.textContent = getInlineCSS();
    document.head.appendChild(style);
  };
  
  document.head.appendChild(cssLink);
}

function getInlineCSS() {
  return `
    #cp-generator-root { background: linear-gradient(135deg, #fce7f3 0%, #fbcfe8 50%, #e0e7ff 100%); min-height: 100vh; padding: 30px 20px; font-family: 'Segoe UI', sans-serif; }
    #cp-generator-root * { box-sizing: border-box; }
    .cp-card { background: rgba(255,255,255,0.98); padding: 30px; border-radius: 20px; box-shadow: 0 10px 40px rgba(236,72,153,0.15); max-width: 950px; margin: 0 auto; border: 2px solid rgba(236,72,153,0.2); }
    .cp-header-title { text-align: center; margin: 0 0 10px 0; font-size: 28px; font-weight: 800; color: #be185d; }
    .cp-subtitle { text-align: center; color: #6b7280; margin-bottom: 30px; font-size: 15px; }
    .cp-section-title { font-size: 18px; font-weight: 700; color: #be185d; margin: 30px 0 20px 0; padding: 12px 18px; background: linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%); border-radius: 10px; border-left: 4px solid #ec4899; }
    .cp-section-title:first-of-type { margin-top: 0; }
    .cp-form-group { margin-bottom: 18px; }
    .cp-form-row { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin: 15px 0; }
    .cp-form-row-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin: 15px 0; }
    .cp-label { display: block; margin-bottom: 8px; font-weight: 600; color: #831843; font-size: 14px; }
    .cp-input, .cp-select, .cp-textarea { width: 100%; padding: 14px 16px; border-radius: 12px; border: 2px solid #fbcfe8; font-size: 14px; font-family: inherit; background: #ffffff; color: #831843; transition: all 0.3s ease; }
    .cp-input:focus, .cp-select:focus, .cp-textarea:focus { outline: none; border-color: #ec4899; box-shadow: 0 0 0 4px rgba(236,72,153,0.15); }
    .cp-select { cursor: pointer; appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23be185d' d='M6 9L1 4h10z'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 16px center; padding-right: 40px; }
    .cp-textarea { resize: vertical; min-height: 100px; line-height: 1.5; }
    .cp-topik-container { display: flex; flex-direction: column; gap: 20px; margin-top: 15px; }
    .cp-topik-item { background: linear-gradient(135deg, #fff1f2 0%, #fce7f3 100%); border: 3px solid #ec4899; border-radius: 16px; padding: 25px; box-shadow: 0 4px 16px rgba(236,72,153,0.1); }
    .cp-topik-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px dashed #fbcfe8; }
    .cp-topik-badge { background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); color: white; padding: 8px 18px; border-radius: 20px; font-size: 14px; font-weight: 700; }
    .cp-btn-hapus { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; border: none; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 600; }
    .cp-topik-label, .cp-elemen-label { display: block; font-weight: 700; font-size: 14px; margin-bottom: 10px; }
    .cp-topik-label { color: #be185d; }
    .cp-elemen-label { color: #7c3aed; }
    .cp-topik-input { width: 100%; min-height: 70px; padding: 14px; border: 2px solid #ec4899; border-radius: 12px; font-size: 14px; background: #ffffff; font-family: inherit; line-height: 1.5; resize: vertical; }
    .cp-elemen-input { width: 100%; min-height: 120px; padding: 14px; border: 2px solid #8b5cf6; border-radius: 12px; font-size: 14px; background: #ffffff; font-family: inherit; line-height: 1.5; resize: vertical; }
    .cp-elemen-group { margin-top: 20px; padding-top: 20px; border-top: 2px dashed #fbcfe8; }
    .cp-btn { padding: 14px 30px; border: none; border-radius: 12px; cursor: pointer; font-size: 15px; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 10px; color: white; transition: all 0.3s ease; width: 100%; margin-top: 15px; }
    .cp-btn-tambah, .cp-btn-generate { background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); box-shadow: 0 6px 20px rgba(236,72,153,0.3); }
    .cp-btn-tambah:hover, .cp-btn-generate:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(236,72,153,0.4); }
    .cp-btn-save { background: linear-gradient(135deg, #10b981 0%, #059669 100%); }
    .cp-btn-print { background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%); }
    .cp-btn-download { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); }
    .cp-btn-secondary { background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); }
    .cp-btn:hover { transform: translateY(-2px); }
    .cp-result-section { margin-top: 30px; background: rgba(255,255,255,0.98); padding: 25px; border-radius: 16px; border: 2px solid #fbcfe8; }
    .cp-result-title { color: #be185d; margin: 0 0 20px 0; font-size: 22px; font-weight: 700; }
    .cp-hasil-header { text-align: center; margin-bottom: 30px; padding: 20px; background: linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%); border-radius: 12px; }
    .cp-hasil-header h2 { color: #be185d; margin: 0 0 8px 0; font-size: 24px; font-weight: 800; }
    .cp-hasil-header p { color: #831843; font-size: 15px; font-weight: 600; margin: 0; }
    .cp-tabel-title { font-size: 17px; font-weight: 700; color: #be185d; margin: 25px 0 15px 0; padding: 12px 18px; background: linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%); border-radius: 10px; border-left: 4px solid #ec4899; }
    .cp-table { width: 100%; border-collapse: collapse; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(236,72,153,0.1); margin-bottom: 25px; }
    .cp-table th { background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); color: white; padding: 14px 12px; text-align: left; font-weight: 700; font-size: 14px; text-transform: uppercase; }
    .cp-table td { padding: 12px; border-bottom: 1px solid #fbcfe8; vertical-align: top; font-size: 13px; line-height: 1.6; color: #1f2937; background: #ffffff; }
    .cp-table tr:last-child td { border-bottom: none; }
    .cp-table tr:hover td { background: #fff1f2; }
    .cp-col-elemen { width: 150px; background: #fce7f3 !important; font-weight: 700; color: #be185d; }
    .cp-col-no { width: 80px; text-align: center; font-weight: 700; background: #fce7f3 !important; color: #be185d; }
    .cp-status-badge { display: inline-block; padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 600; margin-left: 10px; }
    .cp-status-ready { background: #dcfce7; color: #166534; }
    .cp-status-warning { background: #fef3c7; color: #92400e; }
    .cp-saved-section { margin-top: 30px; background: rgba(255,255,255,0.98); padding: 25px; border-radius: 16px; border: 2px solid #fbcfe8; }
    .cp-saved-title { color: #be185d; margin: 0 0 20px 0; font-size: 20px; font-weight: 700; }
    .cp-document-item { background: linear-gradient(135deg, #fff1f2 0%, #fce7f3 100%); padding: 20px; margin-top: 15px; border-radius: 12px; border: 2px solid #fbcfe8; }
    .cp-document-header { display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px; }
    .cp-document-date { color: #9ca3af; font-size: 12px; }
    .cp-action-buttons { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-top: 20px; }
    .cp-action-buttons .cp-btn { margin-top: 0; }
    .cp-toast { position: fixed; top: 20px; right: 20px; padding: 16px 24px; border-radius: 12px; z-index: 99999; color: white; font-weight: 600; box-shadow: 0 4px 16px rgba(0,0,0,0.15); animation: cpSlideIn 0.3s ease; }
    .cp-toast-success { background: linear-gradient(135deg, #10b981 0%, #059669 100%); }
    .cp-toast-error { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); }
    .cp-toast-warning { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); }
    @keyframes cpSlideIn { from { transform: translateX(400px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    .cp-hidden { display: none !important; }
    .cp-empty-state, .cp-loading, .cp-error { text-align: center; padding: 30px; color: #6b7280; background: rgba(255,255,255,0.98); border-radius: 12px; }
    .cp-error { color: #ef4444; }
    @media (max-width: 768px) { .cp-form-row, .cp-form-row-3 { grid-template-columns: 1fr; } .cp-action-buttons { grid-template-columns: 1fr; } .cp-topik-header { flex-direction: column; gap: 10px; } .cp-btn-hapus { width: 100%; } }
  `;
}

export function cleanup() {
  const cssLink = document.getElementById(CSS_ID);
  if (cssLink) cssLink.remove();
  const inlineCSS = document.getElementById(CSS_ID + '-inline');
  if (inlineCSS) inlineCSS.remove();
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

/**
 * RENDER UI GENERATOR
 */
function renderCTAGenerator(container) {
  const aiReady = groqApiKey ? true : false;
  const userNama = currentUser.namaLengkap || '';
  const userSekolah = currentUser.namaSekolah || 'SDN 139 LAMANDA';

  container.innerHTML = `
    <div id="cp-generator-root">
      <div class="cp-card">
        <h2 class="cp-header-title">📄 Generator CP, TP, & ATP</h2>
        <p class="cp-subtitle">Buat Perangkat Pembelajaran Universal dengan AI 
          ${aiReady 
            ? '<span class="cp-status-badge cp-status-ready">✅ AI Siap</span>' 
            : '<span class="cp-status-badge cp-status-warning">️ API Key Belum Aktif</span>'}
        </p>

        <form id="cp-form">
          <div class="cp-section-title">📋 1. Informasi Dasar</div>
          
          <div class="cp-form-group">
            <label class="cp-label" for="cp-kop-sekolah">🏫 Nama Sekolah</label>
            <input type="text" id="cp-kop-sekolah" value="${userSekolah}" class="cp-input ${userSekolah ? 'cp-auto-filled' : ''}" required>
          </div>

          <div class="cp-form-row">
            <div class="cp-form-group">
              <label class="cp-label" for="cp-kop-tahun">📅 Tahun Ajaran</label>
              <input type="text" id="cp-kop-tahun" value="2026/2027" class="cp-input">
            </div>
            <div class="cp-form-group">
              <label class="cp-label" for="cp-guru">👩🏫 Nama Guru</label>
              <input type="text" id="cp-guru" value="${userNama}" class="cp-input ${userNama ? 'cp-auto-filled' : ''}">
            </div>
          </div>

          <div class="cp-form-row-3">
            <div class="cp-form-group">
              <label class="cp-label" for="cp-jenjang">🎓 Jenjang</label>
              <select id="cp-jenjang" class="cp-select" required>
                <option value="">Pilih</option>
                <option value="sd">SD</option>
              </select>
            </div>
            <div class="cp-form-group">
              <label class="cp-label" for="cp-kelas"> Kelas</label>
              <select id="cp-kelas" class="cp-select" required>
                <option value="">Pilih</option>
                <option value="1">1</option><option value="2">2</option><option value="3">3</option>
                <option value="4">4</option><option value="5">5</option><option value="6">6</option>
              </select>
            </div>
            <div class="cp-form-group">
              <label class="cp-label" for="cp-semester"> Semester</label>
              <select id="cp-semester" class="cp-select" required>
                <option value="">Pilih</option>
                <option value="1">1 (Ganjil)</option>
                <option value="2">2 (Genap)</option>
              </select>
            </div>
          </div>

          <div class="cp-form-group">
            <label class="cp-label" for="cp-mapel"> Mata Pelajaran</label>
            <input type="text" id="cp-mapel" class="cp-input" placeholder="Contoh: Matematika, PAI, Bahasa Indonesia, PJOK" required>
          </div>

          <div class="cp-section-title">✏️ 2. Input Topik & Elemen</div>
          <p style="font-size: 13px; color: #6b7280; margin-bottom: 15px;">
            Setiap <strong style="color: #be185d;">Topik</strong> memiliki <strong style="color: #7c3aed;">Elemen</strong> sendiri. 
            Tambahkan topik sebanyak yang diperlukan, elemen boleh dikosongkan.
          </p>
          
          <div id="cp-topik-container" class="cp-topik-container">
            <!-- Topik items ditambahkan dinamis -->
          </div>

          <button type="button" id="cp-btn-tambah-topik" class="cp-btn cp-btn-tambah">
            ➕ Tambah Topik Baru
          </button>

          <button type="button" id="cp-btn-generate" class="cp-btn cp-btn-generate">
            ✨ Generate CP, TP, & ATP dengan AI
          </button>
        </form>

        <div id="cp-result" class="cp-result-section cp-hidden">
          <h3 class="cp-result-title">📋 Hasil Generate</h3>
          <div id="cp-result-table-container">
            <!-- 3 Tabel hasil dirender di sini -->
          </div>

          <div class="cp-action-buttons">
            <button type="button" id="cp-btn-print" class="cp-btn cp-btn-print">🖨️ Print</button>
            <button type="button" id="cp-btn-download" class="cp-btn cp-btn-download">💾 Download Word</button>
            <button type="button" id="cp-btn-save" class="cp-btn cp-btn-save">💾 Simpan Manual</button>
            <button type="button" id="cp-btn-regenerate" class="cp-btn cp-btn-secondary">🔄 Ulang</button>
          </div>
        </div>

        <div class="cp-saved-section">
          <h3 class="cp-saved-title"> Dokumen Tersimpan (<span id="cp-saved-count">0</span>)</h3>
          <div id="cp-list" class="cp-document-list">
            <p class="cp-loading">Memuat data...</p>
          </div>
        </div>
      </div>
    </div>
  `;

  tambahTopikBaru();
}

/**
 * TAMBAH TOPIK BARU
 */
function tambahTopikBaru() {
  const container = document.getElementById('cp-topik-container');
  if (!container) return;

  const topikId = Date.now() + Math.random();
  const topikDiv = document.createElement('div');
  topikDiv.className = 'cp-topik-item';
  topikDiv.dataset.id = topikId;
  
  const topikNumber = container.querySelectorAll('.cp-topik-item').length + 1;
  
  topikDiv.innerHTML = `
    <div class="cp-topik-header">
      <span class="cp-topik-badge">Topik ${topikNumber}</span>
      <button type="button" class="cp-btn-hapus" onclick="hapusTopikItem(${topikId})">🗑️ Hapus</button>
    </div>
    
    <div class="cp-form-group">
      <label class="cp-topik-label">📝 Topik/Materi <span style="color: #ef4444;">*</span></label>
      <textarea class="cp-topik-input" placeholder="Contoh: Penjumlahan, Senam Lantai, Surat Al-Fatihah" rows="2" required></textarea>
    </div>
    
    <div class="cp-elemen-group">
      <label class="cp-elemen-label">📁 Elemen <span style="color: #6b7280; font-weight: normal;">(Opsional)</span></label>
      <textarea class="cp-elemen-input" placeholder="Contoh: Bilangan, Gerak Dasar, Al-Qur'an & Hadis (boleh dikosongkan)" rows="4"></textarea>
    </div>
  `;

  container.appendChild(topikDiv);
}

/**
 * HAPUS TOPIK ITEM
 */
window.hapusTopikItem = function(topikId) {
  const item = document.querySelector(`.cp-topik-item[data-id="${topikId}"]`);
  if (item) {
    if (confirm('Hapus topik ini?')) {
      item.remove();
      updateNomorTopik();
    }
  }
};

function updateNomorTopik() {
  const topikItems = document.querySelectorAll('.cp-topik-item');
  topikItems.forEach((item, idx) => {
    const badge = item.querySelector('.cp-topik-badge');
    if (badge) {
      badge.textContent = `Topik ${idx + 1}`;
    }
  });
}

function attachEventListeners(container) {
  const btnTambahTopik = container.querySelector('#cp-btn-tambah-topik');
  if (btnTambahTopik) btnTambahTopik.addEventListener('click', tambahTopikBaru);

  const btnGenerate = container.querySelector('#cp-btn-generate');
  if (btnGenerate) btnGenerate.addEventListener('click', () => handleGenerate(container));

  const btnPrint = container.querySelector('#cp-btn-print');
  if (btnPrint) btnPrint.addEventListener('click', () => {
    const resultContainer = container.querySelector('#cp-result-table-container');
    if (!resultContainer || resultContainer.innerHTML.trim() === '') {
      showToast('⚠️ Generate data dulu sebelum print!', 'warning');
      return;
    }
    window.print();
  });

  const btnDownload = container.querySelector('#cp-btn-download');
  if (btnDownload) btnDownload.addEventListener('click', () => downloadCTAResult(container));

  const btnSave = container.querySelector('#cp-btn-save');
  if (btnSave) btnSave.addEventListener('click', () => handleSave(container));

  const btnRegenerate = container.querySelector('#cp-btn-regenerate');
  if (btnRegenerate) btnRegenerate.addEventListener('click', () => handleGenerate(container));
}

/**
 * HANDLE GENERATE
 */
async function handleGenerate(container) {
  if (!currentUser.uid) { showToast('⚠️ Silakan login dulu!', 'error'); return; }

  const jenjang = container.querySelector('#cp-jenjang')?.value;
  const kelas = container.querySelector('#cp-kelas')?.value;
  const semester = container.querySelector('#cp-semester')?.value;
  const mapel = container.querySelector('#cp-mapel')?.value.trim();
  const sekolah = container.querySelector('#cp-kop-sekolah')?.value;
  const tahun = container.querySelector('#cp-kop-tahun')?.value;
  const guru = container.querySelector('#cp-guru')?.value;

  if (!jenjang || !kelas || !semester || !mapel) {
    showToast('⚠️ Lengkapi informasi dasar (Jenjang, Kelas, Semester, Mapel)!', 'error'); 
    return;
  }

  const topikItems = container.querySelectorAll('.cp-topik-item');
  if (topikItems.length === 0) { 
    showToast('⚠️ Tambahkan minimal 1 topik!', 'error'); 
    return; 
  }

  const dataTopik = [];
  let totalTopikValid = 0;

  topikItems.forEach(item => {
    const topikNama = item.querySelector('.cp-topik-input')?.value.trim();
    const elemenNama = item.querySelector('.cp-elemen-input')?.value.trim();
    
    if (topikNama) {
      dataTopik.push({ 
        topik: topikNama,
        elemen: elemenNama || 'Umum'
      });
      totalTopikValid++;
    }
  });

  if (totalTopikValid === 0) { 
    showToast('⚠️ Minimal isi 1 Topik/Materi!', 'error'); 
    return; 
  }

  if (!groqApiKey) { 
    showToast('⚠️ API Key Groq belum aktif.', 'error'); 
    return; 
  }

  const resultDiv = container.querySelector('#cp-result');
  if (resultDiv) resultDiv.classList.remove('cp-hidden');
  const resultContainer = container.querySelector('#cp-result-table-container');
  resultContainer.innerHTML = '<p class="cp-loading">⏳ AI sedang membuat CP, TP, dan ATP...</p>';

  try {
    const prompt = buildPrompt(dataTopik, { sekolah, jenjang, kelas, semester, mapel, guru, tahun });
    
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqApiKey}` },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: 'Anda adalah ahli kurikulum Merdeka Indonesia. Tugas Anda adalah membuat Capaian Pembelajaran (CP), Tujuan Pembelajaran (TP), dan Alur Tujuan Pembelajaran (ATP) berdasarkan Topik dan Elemen yang diberikan. Output HARUS berupa JSON valid.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 3000
      })
    });

    if (!response.ok) throw new Error(`API Error: ${response.status}`);

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    const parsedData = parseAIResponse(aiResponse);
    
    if (!parsedData || !parsedData.cp || !parsedData.tp || !parsedData.atp) {
      throw new Error('Format respons AI tidak valid. Coba lagi.');
    }

    render3TabelHasil(resultContainer, parsedData, { mapel, kelas, semester });
    await autoSaveToFirestore(container, parsedData, { sekolah, tahun, jenjang, kelas, semester, mapel, guru });
    showToast('✅ Berhasil generate & tersimpan!', 'success');

  } catch (error) {
    console.error('Error generating:', error);
    resultContainer.innerHTML = `<p class="cp-error">❌ Error: ${error.message}</p>`;
    showToast('❌ Gagal generate: ' + error.message, 'error');
  }
}

function buildPrompt(dataTopik, metadata) {
  let prompt = `Buatkan CP, TP, dan ATP untuk:\n`;
  prompt += `- Mata Pelajaran: ${metadata.mapel}\n`;
  prompt += `- Jenjang: ${metadata.jenjang.toUpperCase()}\n`;
  prompt += `- Kelas: ${metadata.kelas}\n`;
  prompt += `- Semester: ${metadata.semester}\n\n`;
  
  prompt += `Data Topik dan Elemen:\n`;
  dataTopik.forEach((item, idx) => {
    const nomorTopik = idx + 1;
    prompt += `TOPIK ${nomorTopik}: ${item.topik}\n`;
    prompt += `  Elemen: ${item.elemen}\n`;
    prompt += `  → Untuk TP dan ATP, gunakan penomoran ${nomorTopik}.1, ${nomorTopik}.2, dst (nomor depan = ${nomorTopik})\n\n`;
  });

  prompt += `PENTING - ATURAN PENOMORAN:\n`;
  prompt += `1. CP: Gunakan format "CP-1", "CP-2", dst untuk setiap elemen\n`;
  prompt += `2. TP: Nomor depan MENGIKUTI NOMOR TOPIK. Contoh:\n`;
  prompt += `   - Topik 1 (elemen 1.a, 1.b, 1.c) → TP bernomor 1.1, 1.2, 1.3, 1.4, 1.5, 1.6\n`;
  prompt += `   - Topik 2 (elemen 2.a, 2.b) → TP bernomor 2.1, 2.2, 2.3, 2.4\n`;
  prompt += `3. ATP: Sama seperti TP, nomor depan MENGIKUTI NOMOR TOPIK\n\n`;
  
  prompt += `Format output HARUS JSON valid seperti ini (tanpa markdown tambahan):\n`;
  prompt += `{\n`;
  prompt += `  "cp": [{"elemen": "Nama Elemen", "deskripsi": "Deskripsi CP..."}],\n`;
  prompt += `  "tp": [{"elemen": "Nama Elemen", "items": ["1.1 TP pertama...", "1.2 TP kedua...", "1.3 TP ketiga..."]}],\n`;
  prompt += `  "atp": [{"elemen": "Nama Elemen", "items": ["1.1 ATP pertama...", "1.2 ATP kedua...", "1.3 ATP ketiga..."]}]}\n`;
  prompt += `Kelompokkan TP dan ATP berdasarkan Elemen. Pastikan nomor depan sesuai dengan nomor topik!`;

  return prompt;
}

function parseAIResponse(aiResponse) {
  try {
    const jsonMatch = aiResponse.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) return JSON.parse(jsonMatch[1]);
    return JSON.parse(aiResponse);
  } catch (error) {
    console.warn('Failed to parse JSON:', error);
    return null;
  }
}

function render3TabelHasil(container, data, metadata) {
  const labelSemester = metadata.semester === '1' ? 'Ganjil' : 'Genap';

  let html = `
    <div class="cp-hasil-header">
      <h2>Perangkat Pembelajaran: ${metadata.mapel}</h2>
      <p>Kelas ${metadata.kelas} | Semester ${labelSemester}</p>
    </div>
  `;

  // TABEL 1: CP
  html += `<h3 class="cp-tabel-title">🎯 1. Capaian Pembelajaran (CP)</h3>`;
  html += `<table class="cp-table">
    <thead><tr><th class="cp-col-elemen">Elemen</th><th>Capaian Pembelajaran</th></tr></thead><tbody>`;
  
  data.cp.forEach(item => {
    html += `<tr><td class="cp-col-elemen">${item.elemen}</td><td>${item.deskripsi}</td></tr>`;
  });
  html += `</tbody></table>`;

  // TABEL 2: TP
  html += `<h3 class="cp-tabel-title">🏁 2. Tujuan Pembelajaran (TP)</h3>`;
  html += `<table class="cp-table">
    <thead><tr><th class="cp-col-elemen">Elemen</th><th class="cp-col-no">No</th><th>Tujuan Pembelajaran</th></tr></thead><tbody>`;
  
  data.tp.forEach((item, idx) => {
    const rowspan = item.items.length;
    item.items.forEach((tp, tpIdx) => {
      html += `<tr>`;
      if (tpIdx === 0) html += `<td class="cp-col-elemen" rowspan="${rowspan}">${item.elemen}</td>`;
      html += `<td class="cp-col-no">${idx + 1}.${tpIdx + 1}</td>`;
      html += `<td>${tp}</td>`;
      html += `</tr>`;
    });
  });
  html += `</tbody></table>`;

  // TABEL 3: ATP
  html += `<h3 class="cp-tabel-title">📊 3. Alur Tujuan Pembelajaran (ATP)</h3>`;
  html += `<table class="cp-table">
    <thead><tr><th class="cp-col-elemen">Elemen</th><th class="cp-col-no">No</th><th>Alur Tujuan Pembelajaran</th></tr></thead><tbody>`;
  
  data.atp.forEach((item, idx) => {
    const rowspan = item.items.length;
    item.items.forEach((atp, atpIdx) => {
      html += `<tr>`;
      if (atpIdx === 0) html += `<td class="cp-col-elemen" rowspan="${rowspan}">${item.elemen}</td>`;
      html += `<td class="cp-col-no">${idx + 1}.${atpIdx + 1}</td>`;
      html += `<td>${atp}</td>`;
      html += `</tr>`;
    });
  });
  html += `</tbody></table>`;

  container.innerHTML = html;
}

async function autoSaveToFirestore(container, result, metadata) {
  try {
    await addDoc(collection(db, 'cp_tp_atp'), {
      userId: currentUser.uid,
      userEmail: currentUser.email,
      userName: currentUser.namaLengkap || 'Guru',
      ...metadata,
      topik: result.tp.map(e => e.elemen).join(', '),
      cp: JSON.stringify(result.cp),
      tp: JSON.stringify(result.tp),
      atp: JSON.stringify(result.atp),
      mode: 'AI-Generated',
      createdAt: serverTimestamp()
    });
    loadCTAData(container);
  } catch (error) {
    console.warn('⚠️ Auto-save gagal:', error);
  }
}

function downloadCTAResult(container) {
  const resultContainer = container.querySelector('#cp-result-table-container');
  if (!resultContainer || resultContainer.innerHTML.trim() === '') {
    showToast('⚠️ Generate data dulu sebelum download!', 'warning'); 
    return;
  }

  const mapel = container.querySelector('#cp-mapel')?.value || 'Mapel';
  const kelas = container.querySelector('#cp-kelas')?.value || '';
  const semester = container.querySelector('#cp-semester')?.value || '';
  const sekolah = container.querySelector('#cp-kop-sekolah')?.value || '';
  const tahun = container.querySelector('#cp-kop-tahun')?.value || '';
  const guru = container.querySelector('#cp-guru')?.value || '';
  const labelSemester = semester === '1' ? 'Ganjil' : 'Genap';

  let htmlContent = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' 
          xmlns:w='urn:schemas-microsoft-com:office:word' 
          xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset='utf-8'>
      <title>CP_TP_ATP_${mapel}_Kelas${kelas}</title>
      <style>
        @page { size: A4; margin: 2cm; }
        body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; margin: 2cm; line-height: 1.5; }
        h1 { text-align: center; font-size: 16pt; font-weight: bold; margin-bottom: 5px; text-transform: uppercase; }
        h2 { text-align: center; font-size: 14pt; font-weight: bold; margin: 5px 0 20px 0; }
        h3 { font-size: 12pt; font-weight: bold; margin-top: 25px; margin-bottom: 10px; border-bottom: 2px solid #000; padding-bottom: 5px; }
        table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
        th { background-color: #f0f0f0; border: 1px solid #000; padding: 8px; text-align: left; font-weight: bold; font-size: 11pt; }
        td { border: 1px solid #000; padding: 8px; vertical-align: top; font-size: 11pt; }
        .col-elemen { width: 18%; font-weight: bold; background-color: #f9f9f9; }
        .col-no { width: 8%; text-align: center; font-weight: bold; background-color: #f9f9f9; }
        .col-deskripsi { width: 74%; }
        .page-break { page-break-after: always; }
      </style>
    </head>
    <body>
      <div style="text-align: center; margin-bottom: 30px;">
        <h1>PERANGKAT PEMBELAJARAN</h1>
        <h2>${mapel.toUpperCase()}</h2>
        <table style="margin: 15px auto; border: none;">
          <tr><td style="border: none;"><strong>Sekolah</strong></td><td style="border: none;">: ${sekolah}</td></tr>
          <tr><td style="border: none;"><strong>Tahun Ajaran</strong></td><td style="border: none;">: ${tahun}</td></tr>
          <tr><td style="border: none;"><strong>Kelas / Semester</strong></td><td style="border: none;">: ${kelas} / ${labelSemester}</td></tr>
          <tr><td style="border: none;"><strong>Guru Pengampu</strong></td><td style="border: none;">: ${guru}</td></tr>
        </table>
      </div>
  `;

  const tables = resultContainer.querySelectorAll('.cp-table');
  const titles = ['🎯 1. CAPAIAN PEMBELAJARAN (CP)', '🏁 2. TUJUAN PEMBELAJARAN (TP)', '📊 3. ALUR TUJUAN PEMBELAJARAN (ATP)'];

  tables.forEach((table, idx) => {
    if (idx > 0) htmlContent += '<div class="page-break"></div>';
    
    htmlContent += `<h3>${titles[idx]}</h3>`;
    htmlContent += '<table>';
    
    const headers = table.querySelectorAll('thead th');
    if (headers.length > 0) {
      htmlContent += '<thead><tr>';
      headers.forEach(th => { htmlContent += `<th>${th.textContent}</th>`; });
      htmlContent += '</tr></thead>';
    }
    
    htmlContent += '<tbody>';
    const rows = table.querySelectorAll('tbody tr');
    rows.forEach(row => {
      htmlContent += '<tr>';
      const cells = row.querySelectorAll('td');
      cells.forEach(cell => {
        const rowspan = cell.getAttribute('rowspan');
        const className = cell.className;
        const rowspanAttr = rowspan ? ` rowspan="${rowspan}"` : '';
        htmlContent += `<td class="${className}"${rowspanAttr}>${cell.innerHTML}</td>`;
      });
      htmlContent += '</tr>';
    });
    htmlContent += '</tbody></table>';
  });

  htmlContent += `
    <div style="margin-top: 30px; text-align: right; font-size: 10pt; color: #666;">
      <p>Dokumen ini dibuat secara otomatis oleh Sistem Administrasi Pembelajaran</p>
      <p>SDN 139 LAMANDA | ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
    </div>
    </body>
    </html>
  `;

  const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `CP_TP_ATP_${mapel}_Kelas${kelas}_Sem${semester}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  showToast('✅ File Word berhasil diunduh!', 'success');
}

async function handleSave(container) {
  const resultContainer = container.querySelector('#cp-result-table-container');
  if (!resultContainer || resultContainer.innerHTML.trim() === '') {
    showToast('⚠️ Generate data dulu!', 'warning'); return;
  }
  showToast('✅ Data sudah otomatis tersimpan saat generate!', 'success');
}

function loadCTAData(container) {
  const list = container.querySelector('#cp-list');
  const countSpan = container.querySelector('#cp-saved-count');
  if (!list) return;

  const q = query(collection(db, 'cp_tp_atp'), where('userId', '==', currentUser.uid), orderBy('createdAt', 'desc'));

  onSnapshot(q, (snapshot) => {
    if (snapshot.empty) {
      list.innerHTML = '<p class="cp-empty-state">Belum ada dokumen tersimpan</p>';
      if (countSpan) countSpan.textContent = '0';
      return;
    }
    if (countSpan) countSpan.textContent = snapshot.docs.length;
    list.innerHTML = snapshot.docs.map(docSnap => {
      const d = docSnap.data();
      const date = d.createdAt?.toDate?.()?.toLocaleString('id-ID') || '-';
      return `
        <div class="cp-document-item">
          <div class="cp-document-header">
            <div><strong>${d.mapel?.toUpperCase() || '-'} - Kelas ${d.kelas}</strong><br><small>${d.userName} • ${d.sekolah || '-'}</small></div>
            <small class="cp-document-date">${date}</small>
          </div>
          <p><strong>📋 Elemen:</strong> ${d.topik || '-'}</p>
        </div>
      `;
    }).join('');
  });
}

function showToast(msg, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `cp-toast cp-toast-${type}`;
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}
