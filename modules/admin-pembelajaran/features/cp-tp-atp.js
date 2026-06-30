// modules/admin-pembelajaran/features/cp-tp-atp.js
// =========================================
// FITUR: CP, TP, & ATP GENERATOR (UNIVERSAL)
// INPUT: Topik (WAJIB) + Elemen per topik (OPSIONAL)
// OUTPUT: 3 Tabel Terpisah (CP, TP, ATP)
// DOWNLOAD: Format Word (.doc)
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
const CSS_PATH = '../../../css/modules/cp-tp-atp.css';
const CSS_ID = 'cp-tp-atp-css';

/**
 * Fungsi init - Dipanggil oleh main.js
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
  document.head.appendChild(cssLink);
}

export function cleanup() {
  const cssLink = document.getElementById(CSS_ID);
  if (cssLink) cssLink.remove();
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
 * RENDER UI GENERATOR (UNIVERSAL)
 */
function renderCTAGenerator(container) {
  const aiReady = groqApiKey ? true : false;
  const userNama = currentUser.namaLengkap || '';
  const userSekolah = currentUser.namaSekolah || 'SDN 139 LAMANDA';

  container.innerHTML = `
    <div class="cta-generator-form">
      <h2>📄 Generator CP, TP, & ATP</h2>
      <p class="subtitle">Buat Perangkat Pembelajaran Universal dengan AI 
        ${aiReady ? '<span class="status-badge status-ready">✅ AI Siap</span>' : '<span class="status-badge status-warning">⚠️ API Key Belum Aktif</span>'}
      </p>

      <form id="cta-form">
        <div class="section-title">1. Informasi Dasar</div>
        
        <div class="form-group">
          <label for="kop-sekolah">Nama Sekolah</label>
          <input type="text" id="kop-sekolah" value="${userSekolah}" class="${userSekolah ? 'auto-filled' : ''}" required>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="kop-tahun">Tahun Ajaran</label>
            <input type="text" id="kop-tahun" value="2026/2027">
          </div>
          <div class="form-group">
            <label for="cta-guru">Nama Guru</label>
            <input type="text" id="cta-guru" value="${userNama}" class="${userNama ? 'auto-filled' : ''}">
          </div>
        </div>

        <div class="form-row-3">
          <div class="form-group">
            <label for="cta-jenjang">Jenjang</label>
            <select id="cta-jenjang" required>
              <option value="">Pilih</option>
              <option value="sd">SD</option>
            </select>
          </div>
          <div class="form-group">
            <label for="cta-kelas">Kelas</label>
            <select id="cta-kelas" required>
              <option value="">Pilih</option>
              <option value="1">1</option><option value="2">2</option><option value="3">3</option>
              <option value="4">4</option><option value="5">5</option><option value="6">6</option>
            </select>
          </div>
          <div class="form-group">
            <label for="cta-semester">Semester</label>
            <select id="cta-semester" required>
              <option value="">Pilih</option>
              <option value="1">1 (Ganjil)</option>
              <option value="2">2 (Genap)</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label for="cta-mapel">Mata Pelajaran</label>
          <input type="text" id="cta-mapel" placeholder="Contoh: Matematika, PAI, Bahasa Indonesia, PJOK" required>
        </div>

        <div class="section-title">2. Input Topik & Elemen</div>
        <p style="font-size: 13px; color: #6b7280; margin-bottom: 15px;">
          Setiap <strong style="color: #2563eb;">Topik</strong> memiliki <strong style="color: #059669;">Elemen</strong> sendiri. 
          Tambahkan topik sebanyak yang diperlukan, elemen boleh dikosongkan.
        </p>
        
        <div id="topik-container">
          <!-- Topik items akan ditambahkan di sini secara dinamis -->
        </div>

        <button type="button" id="btn-tambah-topik" class="btn-tambah-topik-main" style="margin-top: 15px;">
          ➕ Tambah Topik Baru
        </button>

        <button type="button" id="btn-generate" class="btn-generate" style="margin-top: 20px;">✨ Generate CP, TP, & ATP dengan AI</button>
      </form>

      <div id="cta-result" class="result-section hidden">
        <h3>📋 Hasil Generate</h3>
        <div id="result-table-container">
          <!-- 3 Tabel hasil akan dirender di sini -->
        </div>

        <div class="action-buttons">
          <button type="button" id="btn-print" class="btn-print">🖨️ Print</button>
          <button type="button" id="btn-download" class="btn-download">💾 Download Word</button>
          <button type="button" id="btn-save" class="btn-save">💾 Simpan Manual</button>
          <button type="button" id="btn-regenerate" class="btn-secondary">🔄 Ulang</button>
        </div>
      </div>

      <div class="saved-documents">
        <h3>📚 Dokumen Tersimpan (<span id="saved-count">0</span>)</h3>
        <div id="cta-list" class="document-list">
          <p class="loading">Memuat data...</p>
        </div>
      </div>
    </div>
  `;

  tambahTopikBaru();
}

/**
 * TAMBAH TOPIK BARU (dengan Elemen otomatis)
 */
function tambahTopikBaru() {
  const container = document.getElementById('topik-container');
  if (!container) return;

  const topikId = Date.now() + Math.random();
  const topikDiv = document.createElement('div');
  topikDiv.className = 'topik-item-new';
  topikDiv.dataset.id = topikId;
  
  const topikNumber = container.querySelectorAll('.topik-item-new').length + 1;
  
  topikDiv.innerHTML = `
    <div class="topik-item-header">
      <span class="topik-number-badge">Topik ${topikNumber}</span>
      <button type="button" class="btn-hapus-topik-new" onclick="hapusTopikItem(${topikId})">🗑️ Hapus</button>
    </div>
    
    <div class="topik-input-group">
      <label class="topik-label-new">📝 Topik/Materi <span style="color: #ef4444;">*</span></label>
      <textarea class="topik-nama-new" placeholder="Contoh: Penjumlahan, Senam Lantai, Surat Al-Fatihah" rows="2" required></textarea>
    </div>
    
    <div class="elemen-input-group">
      <label class="elemen-label-new">📁 Elemen <span style="color: #6b7280; font-weight: normal;">(Opsional)</span></label>
      <textarea class="elemen-nama-new" placeholder="Contoh: Bilangan, Gerak Dasar, Al-Qur'an & Hadis (boleh dikosongkan)" rows="4"></textarea>
    </div>
  `;

  container.appendChild(topikDiv);
}

/**
 * HAPUS TOPIK ITEM
 */
window.hapusTopikItem = function(topikId) {
  const item = document.querySelector(`.topik-item-new[data-id="${topikId}"]`);
  if (item) {
    if (confirm('Hapus topik ini?')) {
      item.remove();
      updateNomorTopik();
    }
  }
};

/**
 * Update nomor topik secara otomatis
 */
function updateNomorTopik() {
  const topikItems = document.querySelectorAll('.topik-item-new');
  topikItems.forEach((item, idx) => {
    const badge = item.querySelector('.topik-number-badge');
    if (badge) {
      badge.textContent = `Topik ${idx + 1}`;
    }
  });
}

function attachEventListeners(container) {
  const btnTambahTopik = container.querySelector('#btn-tambah-topik');
  if (btnTambahTopik) btnTambahTopik.addEventListener('click', tambahTopikBaru);

  const btnGenerate = container.querySelector('#btn-generate');
  if (btnGenerate) btnGenerate.addEventListener('click', () => handleGenerate(container));

  const btnPrint = container.querySelector('#btn-print');
  if (btnPrint) btnPrint.addEventListener('click', () => {
    const resultContainer = container.querySelector('#result-table-container');
    if (!resultContainer || resultContainer.innerHTML.trim() === '') {
      showToast('⚠️ Generate data dulu sebelum print!', 'warning');
      return;
    }
    window.print();
  });

  const btnDownload = container.querySelector('#btn-download');
  if (btnDownload) btnDownload.addEventListener('click', () => downloadCTAResult(container));

  const btnSave = container.querySelector('#btn-save');
  if (btnSave) btnSave.addEventListener('click', () => handleSave(container));

  const btnRegenerate = container.querySelector('#btn-regenerate');
  if (btnRegenerate) btnRegenerate.addEventListener('click', () => handleGenerate(container));
}

/**
 * HANDLE GENERATE
 */
async function handleGenerate(container) {
  if (!currentUser.uid) { showToast('⚠️ Silakan login dulu!', 'error'); return; }

  const jenjang = container.querySelector('#cta-jenjang')?.value;
  const kelas = container.querySelector('#cta-kelas')?.value;
  const semester = container.querySelector('#cta-semester')?.value;
  const mapel = container.querySelector('#cta-mapel')?.value.trim();
  const sekolah = container.querySelector('#kop-sekolah')?.value;
  const tahun = container.querySelector('#kop-tahun')?.value;
  const guru = container.querySelector('#cta-guru')?.value;

  if (!jenjang || !kelas || !semester || !mapel) {
    showToast('⚠️ Lengkapi informasi dasar (Jenjang, Kelas, Semester, Mapel)!', 'error'); 
    return;
  }

  const topikItems = container.querySelectorAll('.topik-item-new');
  if (topikItems.length === 0) { 
    showToast('⚠️ Tambahkan minimal 1 topik!', 'error'); 
    return; 
  }

  const dataTopik = [];
  let totalTopikValid = 0;

  topikItems.forEach(item => {
    const topikNama = item.querySelector('.topik-nama-new')?.value.trim();
    const elemenNama = item.querySelector('.elemen-nama-new')?.value.trim();
    
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

  const resultDiv = container.querySelector('#cta-result');
  if (resultDiv) resultDiv.classList.remove('hidden');
  const resultContainer = container.querySelector('#result-table-container');
  resultContainer.innerHTML = '<p class="loading">⏳ AI sedang membuat CP, TP, dan ATP...</p>';

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
    resultContainer.innerHTML = `<p class="error">❌ Error: ${error.message}</p>`;
    showToast('❌ Gagal generate: ' + error.message, 'error');
  }
}

/**
 * BUILD PROMPT UNTUK AI
 */
function buildPrompt(dataTopik, metadata) {
  let prompt = `Buatkan CP, TP, dan ATP untuk:\n`;
  prompt += `- Mata Pelajaran: ${metadata.mapel}\n`;
  prompt += `- Jenjang: ${metadata.jenjang.toUpperCase()}\n`;
  prompt += `- Kelas: ${metadata.kelas}\n`;
  prompt += `- Semester: ${metadata.semester}\n\n`;
  
  prompt += `Data Topik dan Elemen:\n`;
  dataTopik.forEach((item, idx) => {
    prompt += `${idx + 1}. Topik: ${item.topik}\n`;
    prompt += `   Elemen: ${item.elemen}\n\n`;
  });

  prompt += `Format output HARUS JSON valid seperti ini (tanpa markdown tambahan):\n`;
  prompt += `{\n`;
  prompt += `  "cp": [{"elemen": "Nama Elemen", "deskripsi": "Deskripsi CP..."}],\n`;
  prompt += `  "tp": [{"elemen": "Nama Elemen", "items": ["TP 1...", "TP 2..."]}],\n`;
  prompt += `  "atp": [{"elemen": "Nama Elemen", "items": ["ATP 1...", "ATP 2..."]}]}\n`;
  prompt += `Kelompokkan TP dan ATP berdasarkan Elemen yang sama.`;

  return prompt;
}

/**
 * PARSE RESPONSE AI (Extract JSON)
 */
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

/**
 * RENDER 3 TABEL HASIL (CP, TP, ATP)
 */
function render3TabelHasil(container, data, metadata) {
  const labelSemester = metadata.semester === '1' ? 'Ganjil' : 'Genap';

  let html = `
    <div class="hasil-header">
      <h2>Perangkat Pembelajaran: ${metadata.mapel}</h2>
      <p>Kelas ${metadata.kelas} | Semester ${labelSemester}</p>
    </div>
  `;

  // TABEL 1: CP
  html += `<h3 class="tabel-title">🎯 1. Capaian Pembelajaran (CP)</h3>`;
  html += `<table class="hasil-table">
    <thead><tr><th class="col-elemen">Elemen</th><th class="col-deskripsi">Capaian Pembelajaran</th></tr></thead><tbody>`;
  
  data.cp.forEach(item => {
    html += `<tr><td class="col-elemen">${item.elemen}</td><td class="col-deskripsi">${item.deskripsi}</td></tr>`;
  });
  html += `</tbody></table>`;

  // TABEL 2: TP
  html += `<h3 class="tabel-title">🏁 2. Tujuan Pembelajaran (TP)</h3>`;
  html += `<table class="hasil-table">
    <thead><tr><th class="col-elemen">Elemen</th><th class="col-no">No</th><th class="col-deskripsi">Tujuan Pembelajaran</th></tr></thead><tbody>`;
  
  data.tp.forEach((item, idx) => {
    const rowspan = item.items.length;
    item.items.forEach((tp, tpIdx) => {
      html += `<tr>`;
      if (tpIdx === 0) html += `<td class="col-elemen" rowspan="${rowspan}">${item.elemen}</td>`;
      html += `<td class="col-no">${idx + 1}.${tpIdx + 1}</td>`;
      html += `<td class="col-deskripsi">${tp}</td>`;
      html += `</tr>`;
    });
  });
  html += `</tbody></table>`;

  // TABEL 3: ATP
  html += `<h3 class="tabel-title">📊 3. Alur Tujuan Pembelajaran (ATP)</h3>`;
  html += `<table class="hasil-table">
    <thead><tr><th class="col-elemen">Elemen</th><th class="col-no">No</th><th class="col-deskripsi">Alur Tujuan Pembelajaran</th></tr></thead><tbody>`;
  
  data.atp.forEach((item, idx) => {
    const rowspan = item.items.length;
    item.items.forEach((atp, atpIdx) => {
      html += `<tr>`;
      if (atpIdx === 0) html += `<td class="col-elemen" rowspan="${rowspan}">${item.elemen}</td>`;
      html += `<td class="col-no">${idx + 1}.${atpIdx + 1}</td>`;
      html += `<td class="col-deskripsi">${atp}</td>`;
      html += `</tr>`;
    });
  });
  html += `</tbody></table>`;

  container.innerHTML = html;
}

/**
 * AUTO SAVE KE FIRESTORE
 */
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

/**
 * DOWNLOAD HASIL - FORMAT WORD (.doc)
 */
function downloadCTAResult(container) {
  const resultContainer = container.querySelector('#result-table-container');
  if (!resultContainer || resultContainer.innerHTML.trim() === '') {
    showToast('⚠️ Generate data dulu sebelum download!', 'warning'); 
    return;
  }

  const mapel = container.querySelector('#cta-mapel')?.value || 'Mapel';
  const kelas = container.querySelector('#cta-kelas')?.value || '';
  const semester = container.querySelector('#cta-semester')?.value || '';
  const sekolah = container.querySelector('#kop-sekolah')?.value || '';
  const tahun = container.querySelector('#kop-tahun')?.value || '';
  const guru = container.querySelector('#cta-guru')?.value || '';
  const labelSemester = semester === '1' ? 'Ganjil' : 'Genap';

  let htmlContent = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' 
          xmlns:w='urn:schemas-microsoft-com:office:word' 
          xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset='utf-8'>
      <title>CP_TP_ATP_${mapel}_Kelas${kelas}</title>
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
        .header-info table { border: none; width: auto; margin: 0 auto; }
        .header-info td { border: none; padding: 3px 5px; font-size: 11pt; }
        .page-break { page-break-after: always; }
      </style>
    </head>
    <body>
      <div class="header-info" style="text-align: center; margin-bottom: 30px;">
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

  const tables = resultContainer.querySelectorAll('.hasil-table');
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

/**
 * SAVE MANUAL
 */
async function handleSave(container) {
  const resultContainer = container.querySelector('#result-table-container');
  if (!resultContainer || resultContainer.innerHTML.trim() === '') {
    showToast('⚠️ Generate data dulu!', 'warning'); return;
  }
  showToast('✅ Data sudah otomatis tersimpan saat generate!', 'success');
}

/**
 * LOAD DATA TERSIMPAN
 */
function loadCTAData(container) {
  const list = container.querySelector('#cta-list');
  const countSpan = container.querySelector('#saved-count');
  if (!list) return;

  const q = query(collection(db, 'cp_tp_atp'), where('userId', '==', currentUser.uid), orderBy('createdAt', 'desc'));

  onSnapshot(q, (snapshot) => {
    if (snapshot.empty) {
      list.innerHTML = '<p class="empty-state">Belum ada dokumen tersimpan</p>';
      if (countSpan) countSpan.textContent = '0';
      return;
    }
    if (countSpan) countSpan.textContent = snapshot.docs.length;
    list.innerHTML = snapshot.docs.map(docSnap => {
      const d = docSnap.data();
      const date = d.createdAt?.toDate?.()?.toLocaleString('id-ID') || '-';
      return `
        <div class="cta-item">
          <div class="cta-item-header">
            <div><strong>${d.mapel?.toUpperCase() || '-'} - Kelas ${d.kelas}</strong><br><small>${d.userName} • ${d.sekolah || '-'}</small></div>
            <small class="date">${date}</small>
          </div>
          <p><strong>📋 Elemen:</strong> ${d.topik || '-'}</p>
        </div>
      `;
    }).join('');
  });
}

function showToast(msg, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}
