// modules/admin-pembelajaran/features/cp-tp-atp.js
// =========================================
// FITUR: CP, TP, & ATP GENERATOR (MODULAR)
// FORMAT: TABEL ELEMEN-NO-TP (SEPERTI CONTOH)
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

// State untuk input dinamis
let elemenList = [];

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
        if (activeKeys.length > 0) {
          groqApiKey = activeKeys[0].value;
        }
      }
    }
  } catch (error) {
    console.error('Error loading API key:', error);
  }
}

/**
 * RENDER UI GENERATOR (FORMAT TABEL ELEMEN-NO-TP)
 */
function renderCTAGenerator(container) {
  const aiReady = groqApiKey ? true : false;
  const userNama = currentUser.namaLengkap || '';
  const userSekolah = currentUser.namaSekolah || '';

  container.innerHTML = `
    <div class="cta-generator-form">
      <h2>📄 Generator TP per Elemen</h2>
      <p class="subtitle">Buat Tujuan Pembelajaran terstruktur per elemen
        ${aiReady ? '<span class="status-badge status-ready">✅ AI Siap</span>' : '<span class="status-badge status-warning">️ API Key Belum Aktif</span>'}
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
            <input type="text" id="kop-tahun" value="2025/2026">
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
              <option value="smp">SMP</option>
              <option value="sma">SMA</option>
            </select>
          </div>
          <div class="form-group">
            <label for="cta-kelas">Kelas</label>
            <select id="cta-kelas" required>
              <option value="">Pilih</option>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
              <option value="5">5</option>
              <option value="6">6</option>
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
          <input type="text" id="cta-mapel" placeholder="Contoh: PAI dan Budi Pekerti" required>
        </div>

        <div class="section-title">2. Input Elemen & Tujuan Pembelajaran</div>
        
        <div id="elemen-container">
          <!-- Elemen akan ditambahkan di sini secara dinamis -->
        </div>

        <button type="button" id="btn-tambah-elemen" class="btn-secondary" style="margin-top: 15px;">
          ➕ Tambah Elemen Baru
        </button>

        <button type="button" id="btn-generate" class="btn-generate">✨ Generate dengan AI</button>
      </form>

      <div id="cta-result" class="result-section hidden">
        <h3>📋 Hasil Generate</h3>
        <div id="result-table-container">
          <!-- Tabel hasil akan dirender di sini -->
        </div>

        <div class="action-buttons">
          <button type="button" id="btn-print" class="btn-print">🖨️ Print</button>
          <button type="button" id="btn-download" class="btn-download">💾 Download</button>
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

  // Inisialisasi dengan 1 elemen kosong
  tambahElemenBaru();
}

/**
 * TAMBAH ELEMEN BARU (DINAMIS)
 */
function tambahElemenBaru() {
  const container = document.getElementById('elemen-container');
  if (!container) return;

  const elemenId = Date.now();
  const elemenDiv = document.createElement('div');
  elemenDiv.className = 'elemen-item';
  elemenDiv.dataset.id = elemenId;
  
  elemenDiv.innerHTML = `
    <div class="elemen-header">
      <input type="text" class="elemen-nama" placeholder="Nama Elemen (contoh: Al-Qur'an & Hadis)" required>
      <button type="button" class="btn-hapus-elemen" onclick="hapusElemen(${elemenId})">🗑️</button>
    </div>
    <div class="tp-list" id="tp-list-${elemenId}">
      <!-- TP items akan ditambahkan di sini -->
    </div>
    <button type="button" class="btn-tambah-tp" onclick="tambahTP(${elemenId})">
      ➕ Tambah TP
    </button>
  `;

  container.appendChild(elemenDiv);
  
  // Tambah 1 TP default
  tambahTP(elemenId);
}

/**
 * TAMBAH TP KE ELEMEN
 */
window.tambahTP = function(elemenId) {
  const tpList = document.getElementById(`tp-list-${elemenId}`);
  if (!tpList) return;

  const tpId = Date.now() + Math.random();
  const tpDiv = document.createElement('div');
  tpDiv.className = 'tp-item';
  tpDiv.dataset.id = tpId;
  
  tpDiv.innerHTML = `
    <textarea class="tp-deskripsi" placeholder="Tujuan Pembelajaran..." rows="2"></textarea>
    <button type="button" class="btn-hapus-tp" onclick="hapusTP(${tpId})">🗑️</button>
  `;

  tpList.appendChild(tpDiv);
};

/**
 * HAPUS ELEMEN
 */
window.hapusElemen = function(elemenId) {
  const elemen = document.querySelector(`.elemen-item[data-id="${elemenId}"]`);
  if (elemen) {
    if (confirm('Hapus elemen ini?')) {
      elemen.remove();
    }
  }
};

/**
 * HAPUS TP
 */
window.hapusTP = function(tpId) {
  const tp = document.querySelector(`.tp-item[data-id="${tpId}"]`);
  if (tp) {
    tp.remove();
  }
};

function attachEventListeners(container) {
  const btnTambahElemen = container.querySelector('#btn-tambah-elemen');
  if (btnTambahElemen) btnTambahElemen.addEventListener('click', tambahElemenBaru);

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
  if (!currentUser.uid) {
    showToast('⚠️ Silakan login dulu!', 'error');
    return;
  }

  const jenjang = container.querySelector('#cta-jenjang')?.value;
  const kelas = container.querySelector('#cta-kelas')?.value;
  const semester = container.querySelector('#cta-semester')?.value;
  const mapel = container.querySelector('#cta-mapel')?.value.trim();
  const sekolah = container.querySelector('#kop-sekolah')?.value;
  const tahun = container.querySelector('#kop-tahun')?.value;
  const guru = container.querySelector('#cta-guru')?.value;

  // Validasi
  if (!jenjang || !kelas || !semester || !mapel) {
    showToast('⚠️ Lengkapi informasi dasar!', 'error');
    return;
  }

  // Kumpulkan data elemen & TP
  const elemenItems = container.querySelectorAll('.elemen-item');
  if (elemenItems.length === 0) {
    showToast('⚠️ Tambahkan minimal 1 elemen!', 'error');
    return;
  }

  const dataElemen = [];
  elemenItems.forEach((elemen, idx) => {
    const nama = elemen.querySelector('.elemen-nama')?.value.trim();
    const tpItems = elemen.querySelectorAll('.tp-item');
    const tpList = [];
    
    tpItems.forEach(tp => {
      const deskripsi = tp.querySelector('.tp-deskripsi')?.value.trim();
      if (deskripsi) tpList.push(deskripsi);
    });

    if (nama && tpList.length > 0) {
      dataElemen.push({ nama, tp: tpList });
    }
  });

  if (dataElemen.length === 0) {
    showToast('⚠️ Lengkapi nama elemen dan minimal 1 TP!', 'error');
    return;
  }

  if (!groqApiKey) {
    showToast('️ API Key Groq belum aktif. Hubungi admin.', 'error');
    return;
  }

  // Show result section
  const resultDiv = container.querySelector('#cta-result');
  if (resultDiv) resultDiv.classList.remove('hidden');

  const resultContainer = container.querySelector('#result-table-container');
  resultContainer.innerHTML = '<p class="loading"> Generating...</p>';

  try {
    // Build prompt untuk AI
    const prompt = buildPrompt(dataElemen, { sekolah, jenjang, kelas, semester, mapel, guru, tahun });
    
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqApiKey}`
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: 'Anda adalah ahli kurikulum Merdeka. Perbaiki dan lengkapi Tujuan Pembelajaran (TP) yang diberikan user agar sesuai dengan kurikulum Indonesia.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 2048
      })
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    // Parse response AI dan render tabel
    const parsedData = parseAIResponse(aiResponse, dataElemen);
    renderTabelHasil(resultContainer, parsedData, { sekolah, jenjang, kelas, semester, mapel, guru, tahun });

    // Auto save
    await autoSaveToFirestore(container, parsedData, { sekolah, jenjang, kelas, semester, mapel, guru, tahun });

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
function buildPrompt(dataElemen, metadata) {
  let prompt = `Perbaiki dan lengkapi Tujuan Pembelajaran (TP) berikut untuk:\n`;
  prompt += `- Sekolah: ${metadata.sekolah}\n`;
  prompt += `- Jenjang: ${metadata.jenjang.toUpperCase()}\n`;
  prompt += `- Kelas: ${metadata.kelas}\n`;
  prompt += `- Semester: ${metadata.semester}\n`;
  prompt += `- Mata Pelajaran: ${metadata.mapel}\n\n`;
  
  prompt += `Data yang diberikan:\n`;
  dataElemen.forEach((elemen, idx) => {
    prompt += `\n${idx + 1}. ${elemen.nama}\n`;
    elemen.tp.forEach((tp, tpIdx) => {
      prompt += `   ${idx + 1}.${tpIdx + 1}. ${tp}\n`;
    });
  });

  prompt += `\n\nFormat output yang diinginkan:\n`;
  prompt += `Pertahankan struktur elemen dan nomor yang sama, tapi perbaiki/redaksi TP agar lebih sesuai kurikulum.\n`;
  prompt += `Jika ada yang kurang, tambahkan saran TP yang relevan.\n\n`;
  prompt += `Kembalikan dalam format JSON:\n`;
  prompt += `\`\`\`json\n`;
  prompt += `[\n`;
  prompt += `  {\n`;
  prompt += `    "elemen": "Nama Elemen",\n`;
  prompt += `    "tp": ["TP 1", "TP 2", ...]\n`;
  prompt += `  }\n`;
  prompt += `]\n`;
  prompt += `\`\`\``;

  return prompt;
}

/**
 * PARSE RESPONSE AI
 */
function parseAIResponse(aiResponse, originalData) {
  try {
    // Coba extract JSON dari response
    const jsonMatch = aiResponse.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[1]);
      return parsed;
    }
  } catch (error) {
    console.warn('Failed to parse JSON, using original data');
  }

  // Fallback: gunakan data original
  return originalData.map(e => ({ elemen: e.nama, tp: e.tp }));
}

/**
 * RENDER TABEL HASIL (FORMAT SEPERTI GAMBAR)
 */
function renderTabelHasil(container, data, metadata) {
  const labelJenjang = {sd:'SD', smp:'SMP', sma:'SMA'}[metadata.jenjang] || metadata.jenjang.toUpperCase();
  const labelSemester = metadata.semester === '1' ? 'Ganjil' : 'Genap';

  let html = `
    <div class="hasil-header">
      <h2>Tujuan Pembelajaran (TP) ${metadata.mapel}</h2>
      <p>KELAS ${metadata.kelas} SEMESTER ${labelSemester}</p>
      <p class="hasil-subheader">Kelas ${metadata.kelas} Semester ${metadata.semester}</p>
    </div>

    <table class="hasil-table">
      <thead>
        <tr>
          <th class="col-elemen">Elemen</th>
          <th class="col-no">No</th>
          <th class="col-tp">Tujuan Pembelajaran (TP)</th>
        </tr>
      </thead>
      <tbody>
  `;

  let globalNo = 1;
  data.forEach((item, idx) => {
    const rowspan = item.tp.length;
    
    item.tp.forEach((tp, tpIdx) => {
      html += `<tr>`;
      
      // Kolom Elemen (hanya di baris pertama)
      if (tpIdx === 0) {
        html += `<td class="col-elemen" rowspan="${rowspan}">${item.elemen}</td>`;
      }
      
      // Kolom No
      html += `<td class="col-no">${idx + 1}.${tpIdx + 1}</td>`;
      
      // Kolom TP
      html += `<td class="col-tp">${tp}</td>`;
      
      html += `</tr>`;
      globalNo++;
    });
  });

  html += `
      </tbody>
    </table>
  `;

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
      sekolah: metadata.sekolah,
      tahun: metadata.tahun,
      jenjang: metadata.jenjang,
      kelas: metadata.kelas,
      semester: metadata.semester,
      mapel: metadata.mapel,
      guru: metadata.guru,
      topik: result.map(e => e.elemen).join(', '),
      cp: '',
      tp: JSON.stringify(result),
      atp: '',
      mode: 'AI-Generated',
      createdAt: serverTimestamp()
    });

    console.log('✅ Auto-saved to cp_tp_atp');
    loadCTAData(container);
    return true;
  } catch (error) {
    console.warn('⚠️ Auto-save gagal:', error);
    return false;
  }
}

/**
 * DOWNLOAD HASIL
 */
function downloadCTAResult(container) {
  const resultContainer = container.querySelector('#result-table-container');
  if (!resultContainer || resultContainer.innerHTML.trim() === '') {
    showToast('⚠️ Generate data dulu sebelum download!', 'warning');
    return;
  }

  const mapel = container.querySelector('#cta-mapel')?.value || '';
  const kelas = container.querySelector('#cta-kelas')?.value || '';
  const semester = container.querySelector('#cta-semester')?.value || '';

  let content = `TUJUAN PEMBELAJARAN (TP)\n`;
  content += `${mapel}\n`;
  content += `KELAS ${kelas} SEMESTER ${semester === '1' ? 'GANJIL' : 'GENAP'}\n\n`;
  content += `${'='.repeat(80)}\n\n`;

  // Extract data dari tabel yang sudah dirender
  const rows = resultContainer.querySelectorAll('tbody tr');
  let currentElemen = '';
  
  rows.forEach(row => {
    const elemenCell = row.querySelector('.col-elemen');
    const noCell = row.querySelector('.col-no');
    const tpCell = row.querySelector('.col-tp');

    if (elemenCell) currentElemen = elemenCell.textContent;
    
    content += `${currentElemen}\n`;
    content += `  ${noCell.textContent}. ${tpCell.textContent}\n\n`;
  });

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `TP_${mapel}_Kelas${kelas}_Sem${semester}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * SAVE MANUAL
 */
async function handleSave(container) {
  const resultContainer = container.querySelector('#result-table-container');
  if (!resultContainer || resultContainer.innerHTML.trim() === '') {
    showToast('⚠️ Generate data dulu!', 'warning');
    return;
  }

  try {
    // Extract data dari tabel
    const data = [];
    const rows = resultContainer.querySelectorAll('tbody tr');
    let currentElemen = '';
    
    rows.forEach(row => {
      const elemenCell = row.querySelector('.col-elemen');
      const tpCell = row.querySelector('.col-tp');

      if (elemenCell) currentElemen = elemenCell.textContent;
      
      let existing = data.find(e => e.elemen === currentElemen);
      if (!existing) {
        existing = { elemen: currentElemen, tp: [] };
        data.push(existing);
      }
      existing.tp.push(tpCell.textContent);
    });

    await addDoc(collection(db, 'cp_tp_atp'), {
      userId: currentUser.uid,
      userEmail: currentUser.email,
      userName: currentUser.namaLengkap || 'Guru',
      sekolah: container.querySelector('#kop-sekolah')?.value,
      tahun: container.querySelector('#kop-tahun')?.value,
      jenjang: container.querySelector('#cta-jenjang')?.value,
      kelas: container.querySelector('#cta-kelas')?.value,
      semester: container.querySelector('#cta-semester')?.value,
      mapel: container.querySelector('#cta-mapel')?.value,
      guru: container.querySelector('#cta-guru')?.value,
      topik: data.map(e => e.elemen).join(', '),
      cp: '',
      tp: JSON.stringify(data),
      atp: '',
      mode: 'Manual-Save',
      createdAt: serverTimestamp()
    });

    showToast('✅ Berhasil disimpan!', 'success');
    loadCTAData(container);
  } catch (error) {
    showToast('❌ Gagal simpan: ' + error.message, 'error');
  }
}

/**
 * LOAD DATA TERSIMPAN
 */
function loadCTAData(container) {
  const list = container.querySelector('#cta-list');
  const countSpan = container.querySelector('#saved-count');

  if (!list) return;

  const q = query(
    collection(db, 'cp_tp_atp'),
    where('userId', '==', currentUser.uid),
    orderBy('createdAt', 'desc')
  );

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
            <div>
              <strong>${d.mapel?.toUpperCase() || '-'} - Kelas ${d.kelas}</strong><br>
              <small>${d.userName} • ${d.sekolah || '-'}</small>
            </div>
            <small class="date">${date}</small>
          </div>
          <p><strong> Elemen:</strong> ${d.topik || '-'}</p>
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
