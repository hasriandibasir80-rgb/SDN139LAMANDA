// modules/admin-pembelajaran/features/cp-tp-atp.js
// =========================================
// FITUR: CP, TP, & ATP GENERATOR (UNIVERSAL)
// INPUT: Elemen (OPSIONAL) & Topik/Materi (WAJIB)
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
const CSS_PATH = '../../../css/modules/cp-tp-atp.css';
const CSS_ID = 'cp-tp-atp-css';

/**
 * Fungsi init - Dipanggil oleh main.js
 * ✅ TIDAK DIUBAH - Dipertahankan 100%
 */
export async function init(container, db) {
  loadFeatureCSS();
  await loadGroqApiKey();
  renderCTAGenerator(container);
  attachEventListeners(container);
  loadCTAData(container);
}

/**
 * ✅ TIDAK DIUBAH - Dipertahankan 100%
 */
function loadFeatureCSS() {
  if (document.getElementById(CSS_ID)) return;
  const cssLink = document.createElement('link');
  cssLink.rel = 'stylesheet';
  cssLink.href = CSS_PATH;
  cssLink.id = CSS_ID;
  document.head.appendChild(cssLink);
}

/**
 * ✅ TIDAK DIUBAH - Dipertahankan 100%
 */
export function cleanup() {
  const cssLink = document.getElementById(CSS_ID);
  if (cssLink) cssLink.remove();
}

/**
 * ✅ TIDAK DIUBAH - Dipertahankan 100%
 */
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
 * ✅ UPDATE: Penjelasan visual Elemen (opsional) vs Topik (wajib)
 */
function renderCTAGenerator(container) {
  const aiReady = groqApiKey ? true : false;
  const userNama = currentUser.namaLengkap || '';
  const userSekolah = currentUser.namaSekolah || '';

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
              <option value="1">1</option><option value="2">2</option><option value="3">3</option>
              <option value="4">4</option><option value="5">5</option><option value="6">6</option>
              <option value="7">7</option><option value="8">8</option><option value="9">9</option>
              <option value="10">10</option><option value="11">11</option><option value="12">12</option>
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

        <div class="section-title">2. Input Elemen & Topik/Materi</div>
        
        <!-- ✅ UPDATE: Penjelasan visual yang jelas -->
        <div class="info-box" style="background: #f0f9ff; border-left: 4px solid #0891b2; padding: 12px; border-radius: 6px; margin-bottom: 15px; font-size: 13px; line-height: 1.6;">
          <strong>📖 Panduan Pengisian:</strong><br>
          🟢 <strong style="color: #059669;">Elemen</strong> = Kategori besar mata pelajaran <span style="background: #fef3c7; padding: 2px 6px; border-radius: 3px; font-size: 11px;">OPSIONAL</span> (boleh dikosongkan)<br>
          🔵 <strong style="color: #2563eb;">Topik/Materi</strong> = Materi spesifik yang diajarkan <span style="background: #fee2e2; padding: 2px 6px; border-radius: 3px; font-size: 11px; color: #991b1b;">WAJIB DIISI</span>
        </div>
        
        <div id="elemen-container">
          <!-- Elemen akan ditambahkan di sini secara dinamis -->
        </div>

        <button type="button" id="btn-tambah-elemen" class="btn-secondary" style="margin-top: 15px; width: auto; padding: 10px 20px;">
          ➕ Tambah Elemen Baru
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
 * ✅ UPDATE: Elemen sekarang OPSIONAL (hapus 'required', update placeholder)
 */
function tambahElemenBaru() {
  const container = document.getElementById('elemen-container');
  if (!container) return;

  const elemenId = Date.now();
  const elemenDiv = document.createElement('div');
  elemenDiv.className = 'elemen-item';
  elemenDiv.dataset.id = elemenId;
  
  // ✅ UPDATE: Hapus 'required', placeholder lebih deskriptif
  elemenDiv.innerHTML = `
    <div class="elemen-header">
      <input type="text" class="elemen-nama" placeholder="Nama Elemen (OPSIONAL - contoh: Bilangan, Gerak Dasar)">
      <button type="button" class="btn-hapus-elemen" onclick="hapusElemen(${elemenId})">🗑️ Hapus</button>
    </div>
    <div class="topik-list" id="topik-list-${elemenId}">
      <!-- Topik items akan ditambahkan di sini -->
    </div>
    <button type="button" class="btn-tambah-topik" onclick="tambahTopik(${elemenId})">
      ➕ Tambah Topik/Materi
    </button>
  `;

  container.appendChild(elemenDiv);
  tambahTopik(elemenId); // Tambah 1 topik default
}

/**
 * TAMBAH TOPIK KE ELEMEN
 * ✅ UPDATE: Topik WAJIB (pertahankan 'required'), placeholder lebih deskriptif
 */
window.tambahTopik = function(elemenId) {
  const topikList = document.getElementById(`topik-list-${elemenId}`);
  if (!topikList) return;

  const topikId = Date.now() + Math.random();
  const topikDiv = document.createElement('div');
  topikDiv.className = 'topik-item';
  topikDiv.dataset.id = topikId;
  
  // ✅ UPDATE: Pertahankan 'required', placeholder lebih jelas
  topikDiv.innerHTML = `
    <input type="text" class="topik-nama" placeholder="Topik/Materi (WAJIB - contoh: Penjumlahan, Senam Lantai)" required>
    <button type="button" class="btn-hapus-topik" onclick="hapusTopik(${topikId})">🗑️</button>
  `;

  topikList.appendChild(topikDiv);
};

/**
 * ✅ TIDAK DIUBAH - Dipertahankan 100%
 */
window.hapusElemen = function(elemenId) {
  const elemen = document.querySelector(`.elemen-item[data-id="${elemenId}"]`);
  if (elemen) {
    if (confirm('Hapus elemen ini beserta semua topiknya?')) elemen.remove();
  }
};

/**
 * ✅ TIDAK DIUBAH - Dipertahankan 100%
 */
window.hapusTopik = function(topikId) {
  const topik = document.querySelector(`.topik-item[data-id="${topikId}"]`);
  if (topik) topik.remove();
};

/**
 * ✅ TIDAK DIUBAH - Dipertahankan 100%
 */
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
 * ✅ UPDATE: Validasi baru - Elemen opsional, Topik wajib
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

  // ✅ UPDATE: Validasi info dasar (tidak berubah)
  if (!jenjang || !kelas || !semester || !mapel) {
    showToast('⚠️ Lengkapi informasi dasar (Jenjang, Kelas, Semester, Mapel)!', 'error'); 
    return;
  }

  // ✅ UPDATE: Kumpulkan data dengan logika baru
  const elemenItems = container.querySelectorAll('.elemen-item');
  if (elemenItems.length === 0) { 
    showToast('⚠️ Tambahkan minimal 1 grup elemen/topik!', 'error'); 
    return; 
  }

  const dataElemen = [];
  let totalTopikValid = 0;

  elemenItems.forEach((elemen) => {
    // ✅ UPDATE: Elemen boleh kosong (tidak pakai trim + validasi)
    const nama = elemen.querySelector('.elemen-nama')?.value.trim();
    const topikItems = elemen.querySelectorAll('.topik-item');
    const topikList = [];
    
    topikItems.forEach(topik => {
      const namaTopik = topik.querySelector('.topik-nama')?.value.trim();
      if (namaTopik) {
        topikList.push(namaTopik);
        totalTopikValid++;
      }
    });

    // ✅ UPDATE: Simpan jika ada topik, meskipun elemen kosong
    // Jika elemen kosong, pakai "Umum" sebagai default
    if (topikList.length > 0) {
      dataElemen.push({ 
        nama: nama || 'Umum', 
        topik: topikList 
      });
    }
  });

  // ✅ UPDATE: Validasi baru - minimal 1 topik wajib diisi
  if (totalTopikValid === 0) { 
    showToast('⚠️ Minimal isi 1 Topik/Materi! (Elemen boleh dikosongkan)', 'error'); 
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
    const prompt = buildPrompt(dataElemen, { sekolah, jenjang, kelas, semester, mapel, guru, tahun });
    
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqApiKey}` },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: 'Anda adalah ahli kurikulum Merdeka Indonesia. Tugas Anda adalah membuat Capaian Pembelajaran (CP), Tujuan Pembelajaran (TP), dan Alur Tujuan Pembelajaran (ATP) berdasarkan Elemen dan Topik yang diberikan. Output HARUS berupa JSON valid.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 3000
      })
    });

    if (!response.ok) throw new Error(`API Error: ${response.status}`);

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    // Parse JSON dari response AI
    const parsedData = parseAIResponse(aiResponse);
    
    if (!parsedData || !parsedData.cp || !parsedData.tp || !parsedData.atp) {
      throw new Error('Format respons AI tidak valid. Coba lagi.');
    }

    // Render 3 Tabel
    render3TabelHasil(resultContainer, parsedData, { mapel, kelas, semester });

    // Auto save
    await autoSaveToFirestore(container, parsedData, { sekolah, tahun, jenjang, kelas, semester, mapel, guru });
    showToast('✅ Berhasil generate & tersimpan!', 'success');

  } catch (error) {
    console.error('Error generating:', error);
    resultContainer.innerHTML = `<p class="error">❌ Error: ${error.message}</p>`;
    showToast('❌ Gagal generate: ' + error.message, 'error');
  }
}

/**
 * ✅ TIDAK DIUBAH - Dipertahankan 100%
 */
function buildPrompt(dataElemen, metadata) {
  let prompt = `Buatkan CP, TP, dan ATP untuk:\n`;
  prompt += `- Mata Pelajaran: ${metadata.mapel}\n`;
  prompt += `- Jenjang: ${metadata.jenjang.toUpperCase()}\n`;
  prompt += `- Kelas: ${metadata.kelas}\n`;
  prompt += `- Semester: ${metadata.semester}\n\n`;
  
  prompt += `Data Elemen dan Topik:\n`;
  dataElemen.forEach((elemen, idx) => {
    prompt += `${idx + 1}. Elemen: ${elemen.nama}\n`;
    prompt += `   Topik: ${elemen.topik.join(', ')}\n\n`;
  });

  prompt += `Format output HARUS JSON valid seperti ini (tanpa markdown tambahan):\n`;
  prompt += `{\n`;
  prompt += `  "cp": [{"elemen": "Nama Elemen", "deskripsi": "Deskripsi CP..."}],\n`;
  prompt += `  "tp": [{"elemen": "Nama Elemen", "items": ["TP 1...", "TP 2..."]}],\n`;
  prompt += `  "atp": [{"elemen": "Nama Elemen", "items": ["ATP 1...", "ATP 2..."]}]}\n`;
  prompt += `Pastikan jumlah item di TP dan ATP sesuai dengan jumlah topik yang relevan.`;

  return prompt;
}

/**
 * ✅ TIDAK DIUBAH - Dipertahankan 100%
 */
function parseAIResponse(aiResponse) {
  try {
    // Coba extract JSON dari code block ```json ... ```
    const jsonMatch = aiResponse.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) return JSON.parse(jsonMatch[1]);
    
    // Fallback: coba parse langsung
    return JSON.parse(aiResponse);
  } catch (error) {
    console.warn('Failed to parse JSON:', error);
    return null;
  }
}

/**
 * ✅ TIDAK DIUBAH - Dipertahankan 100%
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
 * ✅ TIDAK DIUBAH - Dipertahankan 100%
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
 * ✅ TIDAK DIUBAH - Dipertahankan 100%
 */
function downloadCTAResult(container) {
  const resultContainer = container.querySelector('#result-table-container');
  if (!resultContainer || resultContainer.innerHTML.trim() === '') {
    showToast('⚠️ Generate data dulu sebelum download!', 'warning'); return;
  }

  const mapel = container.querySelector('#cta-mapel')?.value || 'Mapel';
  const kelas = container.querySelector('#cta-kelas')?.value || '';
  
  let content = `PERANGKAT PEMBELAJARAN: ${mapel.toUpperCase()}\nKelas ${kelas}\n${'='.repeat(50)}\n\n`;
  
  // Extract text dari tabel
  const tables = resultContainer.querySelectorAll('.hasil-table');
  const titles = ['CAPAIAN PEMBELAJARAN (CP)', 'TUJUAN PEMBELAJARAN (TP)', 'ALUR TUJUAN PEMBELAJARAN (ATP)'];
  
  tables.forEach((table, idx) => {
    content += `${titles[idx]}\n${'-'.repeat(50)}\n`;
    const rows = table.querySelectorAll('tbody tr');
    let currentElemen = '';
    rows.forEach(row => {
      const elemenCell = row.querySelector('.col-elemen');
      const noCell = row.querySelector('.col-no');
      const deskCell = row.querySelector('.col-deskripsi');
      
      if (elemenCell) currentElemen = elemenCell.textContent;
      const no = noCell ? noCell.textContent + '. ' : '';
      content += `[${currentElemen}] ${no}${deskCell.textContent}\n`;
    });
    content += '\n\n';
  });

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `CP_TP_ATP_${mapel}_Kelas${kelas}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * ✅ TIDAK DIUBAH - Dipertahankan 100%
 */
async function handleSave(container) {
  const resultContainer = container.querySelector('#result-table-container');
  if (!resultContainer || resultContainer.innerHTML.trim() === '') {
    showToast('⚠️ Generate data dulu!', 'warning'); return;
  }
  showToast('✅ Data sudah otomatis tersimpan saat generate!', 'success');
}

/**
 * ✅ TIDAK DIUBAH - Dipertahankan 100%
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

/**
 * ✅ TIDAK DIUBAH - Dipertahankan 100%
 */
function showToast(msg, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}
