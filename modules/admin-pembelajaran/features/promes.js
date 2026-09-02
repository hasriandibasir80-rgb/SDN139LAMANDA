// modules/admin-pembelajaran/features/promes.js
// =========================================
// FITUR: PROGRAM SEMESTER (PROMES)
// TERINTEGRASI: Firebase (cp_tp_atp & data_promes) + Groq AI
// =========================================
import { db } from '../../../js/firebase-config.js';
import {
  collection, addDoc, getDocs, query, where,
  onSnapshot, doc, updateDoc, deleteDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
const CSS_ID = 'promes-css';

// Konfigurasi Groq AI
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'openai/gpt-oss-20b';
let groqApiKey = null;

let currentEditId = null;
let dataMapel = [];
let promesRows = [];

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
  { id: 'bta', nama: 'BTA', singkatan: 'BTA', icon: '' }
];

export async function init(container, db) {
  loadCSS();
  await loadMataPelajaran();
  await loadGroqApiKey();
  renderUI(container);
  attachEvents(container);
  loadSavedPromes(container);
}

export function cleanup() {
  const css = document.getElementById(CSS_ID);
  if (css) css.remove();
}

async function loadMataPelajaran() {
  try {
    const response = await fetch('../../../assets/data-mapel.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    dataMapel = data.mataPelajaran || [];
  } catch (error) {
    dataMapel = FALLBACK_MAPEL;
  }
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

function escapeHtml(s) { return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function escapeAttr(s) { return String(s ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'); }

function loadCSS() {
  if (document.getElementById(CSS_ID)) return;
  const style = document.createElement('style');
  style.id = CSS_ID;
  style.textContent = `
    .promes-container { background: linear-gradient(135deg, #fce7f3 0%, #fbcfe8 50%, #e0e7ff 100%); border-radius: 16px; padding: 25px; font-family: 'Segoe UI', sans-serif; max-width: 1400px; margin: 0 auto; box-shadow: 0 8px 24px rgba(236, 72, 153, 0.15); }
    .promes-header { background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); color: white; padding: 30px; border-radius: 12px; margin-bottom: 25px; box-shadow: 0 4px 12px rgba(236, 72, 153, 0.3); }
    .promes-header h2 { margin: 0 0 8px 0; font-size: 28px; font-weight: 700; }
    .promes-header p { margin: 0; opacity: 0.95; font-size: 15px; }
    .promes-section { background: white; padding: 25px; border-radius: 12px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(236, 72, 153, 0.1); }
    .promes-section-title { font-size: 18px; font-weight: 700; color: #be185d; margin: 0 0 15px 0; padding-bottom: 10px; border-bottom: 3px solid #fce7f3; }
    .promes-form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 15px; }
    .promes-form-group { margin-bottom: 15px; }
    .promes-form-group label { display: block; margin-bottom: 6px; font-weight: 600; font-size: 13px; color: #831843; }
    .promes-form-control { width: 100%; padding: 12px 14px; border: 2px solid #fbcfe8; border-radius: 8px; font-size: 14px; box-sizing: border-box; background: white; color: #831843; font-family: inherit; }
    .promes-form-control:focus { outline: none; border-color: #ec4899; box-shadow: 0 0 0 3px rgba(236, 72, 153, 0.15); }
    .promes-btn { padding: 12px 24px; border: none; border-radius: 8px; font-weight: 600; font-size: 14px; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; transition: all 0.2s; color: white; }
    .promes-btn:hover { transform: translateY(-2px); }
    .promes-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
    .promes-btn-primary { background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); }
    .promes-btn-success { background: linear-gradient(135deg, #10b981 0%, #059669 100%); }
    .promes-btn-warning { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); }
    .promes-btn-info { background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%); }
    .promes-btn-secondary { background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%); }
    .promes-btn-danger { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); }
    .promes-actions { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 20px; justify-content: center; }
    .promes-table-wrap { overflow-x: auto; border-radius: 8px; margin-top: 15px; }
    .promes-table { width: 100%; border-collapse: collapse; background: white; font-size: 13px; }
    .promes-table th { background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); color: white; padding: 12px 8px; font-size: 12px; text-align: center; border: 1px solid #d8b4fe; vertical-align: middle; }
    .promes-table td { border: 1px solid #fbcfe8; padding: 8px; vertical-align: top; }
    .promes-table td input, .promes-table td textarea { width: 100%; box-sizing: border-box; border: 1px solid #e9d5ff; border-radius: 4px; padding: 6px 8px; font-size: 12px; font-family: inherit; color: #831843; background: #fdf4ff; resize: vertical; }
    .promes-table td input:focus, .promes-table td textarea:focus { outline: none; border-color: #ec4899; box-shadow: 0 0 0 2px rgba(236,72,153,.15); }
    .promes-table td textarea { min-height: 60px; }
    .promes-empty { text-align: center; padding: 30px; color: #64748b; background: white; border-radius: 10px; }
    .promes-toast { position: fixed; top: 20px; right: 20px; padding: 14px 24px; border-radius: 10px; z-index: 10001; color: white; font-weight: 600; box-shadow: 0 4px 16px rgba(0,0,0,0.15); animation: promesSlideIn 0.3s ease; }
    .promes-toast-success { background: linear-gradient(135deg, #10b981 0%, #059669 100%); }
    .promes-toast-error { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); }
    .promes-toast-warning { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); }
    @keyframes promesSlideIn { from { transform: translateX(400px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    @media (max-width: 768px) { .promes-form-grid { grid-template-columns: 1fr; } .promes-actions { flex-direction: column; } .promes-btn { width: 100%; justify-content: center; } }
  `;
  document.head.appendChild(style);
}

function renderUI(container) {
  let mapelOptions = '<option value="">-- Pilih Mapel --</option>';
  dataMapel.forEach(m => {
    mapelOptions += `<option value="${m.nama}">${m.icon} ${m.singkatan}</option>`;
  });

  container.innerHTML = `
    <div class="promes-container">
      <div class="promes-header">
        <h2>📅 Program Semester (Promes)</h2>
        <p>Penyusunan Program Semester berbasis Deep Learning - Kurikulum Merdeka</p>
      </div>

      <div class="promes-section">
        <h3 class="promes-section-title">📥 1. Load Data dari Master TP (Firebase)</h3>
        <div class="promes-form-grid">
          <div class="promes-form-group">
            <label>🎓 Kelas</label>
            <select id="promes-kelas" class="promes-form-control">
              <option value="">-- Pilih Kelas --</option>
              <option value="1">Kelas 1</option><option value="2">Kelas 2</option>
              <option value="3">Kelas 3</option><option value="4">Kelas 4</option>
              <option value="5">Kelas 5</option><option value="6">Kelas 6</option>
            </select>
          </div>
          <div class="promes-form-group">
            <label>📚 Mata Pelajaran</label>
            <select id="promes-mapel" class="promes-form-control">${mapelOptions}</select>
          </div>
          <div class="promes-form-group">
            <label>📅 Semester</label>
            <select id="promes-semester" class="promes-form-control">
              <option value="1">Semester 1 (Ganjil)</option>
              <option value="2">Semester 2 (Genap)</option>
            </select>
          </div>
        </div>
        <div class="promes-actions" style="justify-content: flex-start;">
          <button class="promes-btn promes-btn-primary" id="btn-load-tp">🔄 Load Data TP</button>
          <button class="promes-btn promes-btn-success" id="btn-generate-ai" style="display: none;">✨ Generate Alokasi, Jadwal, Strategi & Asesmen (AI)</button>
        </div>
        <div id="promes-tp-info" style="margin-top: 15px; padding: 10px; border-radius: 6px; display: none;">
          <p style="margin: 0; font-size: 13px;"></p>
        </div>
      </div>

      <div class="promes-section">
        <h3 class="promes-section-title">📋 2. Informasi Dokumen</h3>
        <div class="promes-form-grid">
          <div class="promes-form-group">
            <label>🏫 Nama Sekolah</label>
            <input type="text" id="promes-sekolah" class="promes-form-control" value="${currentUser.namaSekolah || 'SDN 139 LAMANDA'}">
          </div>
          <div class="promes-form-group">
            <label> Tahun Ajaran</label>
            <input type="text" id="promes-tahun" class="promes-form-control" value="2026/2027">
          </div>
          <div class="promes-form-group">
            <label>👩‍ Nama Guru</label>
            <input type="text" id="promes-guru" class="promes-form-control" value="${currentUser.namaLengkap || ''}">
          </div>
          <div class="promes-form-group">
            <label>💡 Pendekatan</label>
            <input type="text" id="promes-pendekatan" class="promes-form-control" value="Pembelajaran Mendalam (Deep Learning) - Kurikulum Merdeka">
          </div>
        </div>
      </div>

      <div class="promes-section">
        <h3 class="promes-section-title">📝 3. Tabel Program Semester</h3>
        <div class="promes-table-wrap">
          <table class="promes-table" id="promes-table">
            <thead>
              <tr>
                <th style="width: 5%;">No</th>
                <th style="width: 10%;">Elemen</th>
                <th style="width: 15%;">Konten / Materi Esensial</th>
                <th style="width: 20%;">Tujuan Pembelajaran (TP)</th>
                <th style="width: 8%;">Alokasi Waktu</th>
                <th style="width: 12%;">Bulan / Minggu</th>
                <th style="width: 20%;">Strategi & Aktivitas Pembelajaran</th>
                <th style="width: 10%;">Bentuk Asesmen Otentik</th>
              </tr>
            </thead>
            <tbody id="promes-tbody">
              <tr><td colspan="8" style="text-align: center; padding: 30px; color: #64748b;">Klik "Load Data TP" untuk memuat data dari Firebase</td></tr>
            </tbody>
          </table>
        </div>
        <button type="button" class="promes-btn promes-btn-primary" id="btn-add-row" style="margin-top: 15px;">➕ Tambah Baris Manual</button>
      </div>

      <div class="promes-section">
        <h3 class="promes-section-title">⚙️ 4. Aksi</h3>
        <div class="promes-actions">
          <button class="promes-btn promes-btn-success" id="btn-simpan">💾 Simpan</button>
          <button class="promes-btn promes-btn-warning" id="btn-export">📥 Export Word</button>
          <button class="promes-btn promes-btn-info" id="btn-import">📤 Import File</button>
          <input type="file" id="promes-import-file" accept=".json" style="display: none;">
          <button class="promes-btn promes-btn-secondary" id="btn-print">️ Print</button>
          <button class="promes-btn promes-btn-danger" id="btn-reset">🔄 Reset</button>
        </div>
      </div>

      <div class="promes-section">
        <h3 class="promes-section-title">📚 Daftar Promes Tersimpan</h3>
        <div id="promes-list-container">
          <div class="promes-empty">⏳ Memuat data...</div>
        </div>
      </div>
    </div>
  `;
}

function attachEvents(container) {
  container.querySelector('#btn-load-tp').addEventListener('click', () => handleLoadTP(container));
  container.querySelector('#btn-generate-ai').addEventListener('click', () => handleGenerateWithAI(container));
  container.querySelector('#btn-add-row').addEventListener('click', () => addEmptyRow(container));
  container.querySelector('#btn-simpan').addEventListener('click', () => handleSimpan(container));
  container.querySelector('#btn-export').addEventListener('click', () => handleExport(container));
  container.querySelector('#btn-import').addEventListener('click', () => container.querySelector('#promes-import-file').click());
  container.querySelector('#promes-import-file').addEventListener('change', (e) => handleImport(e, container));
  container.querySelector('#btn-print').addEventListener('click', () => handlePrint(container));
  container.querySelector('#btn-reset').addEventListener('click', () => handleReset(container));
}

// ========== 1. LOAD DATA DARI cp_tp_atp ==========
async function handleLoadTP(container) {
  const kelas = container.querySelector('#promes-kelas').value;
  const mapel = container.querySelector('#promes-mapel').value;
  const semester = container.querySelector('#promes-semester').value;

  if (!kelas || !mapel) {
    showToast('⚠️ Pilih Kelas dan Mata Pelajaran terlebih dahulu!', 'error');
    return;
  }

  const infoDiv = container.querySelector('#promes-tp-info');
  infoDiv.style.display = 'block';
  infoDiv.querySelector('p').textContent = '⏳ Memuat data TP dari Firebase...';
  infoDiv.style.background = '#f0f9ff';
  infoDiv.querySelector('p').style.color = '#0369a1';

  try {
    const q = query(
      collection(db, 'cp_tp_atp'),
      where('kelas', '==', kelas),
      where('mapel', '==', mapel),
      where('semester', '==', semester)
    );
    
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      infoDiv.querySelector('p').textContent = `⚠️ Tidak ada data TP untuk Kelas ${kelas} - ${mapel}. Silakan generate di menu CP, TP & ATP terlebih dahulu.`;
      infoDiv.style.background = '#fef3c7';
      infoDiv.querySelector('p').style.color = '#92400e';
      container.querySelector('#btn-generate-ai').style.display = 'none';
      return;
    }

    promesRows = [];
    let no = 1;

    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      // Parsing JSON string dari Firebase
      const cpArray = JSON.parse(data.cp || '[]');
      
      if (cpArray.length > 0) {
        cpArray.forEach((item) => {
          promesRows.push({
            no: no++,
            elemen: data.topik || '', // Topik -> Elemen
            konten: item.subTema || '', // SubTema -> Materi Esensial
            tp: item.deskripsi || '', // Deskripsi -> TP
            alokasi: '',
            bulanMinggu: '',
            strategi: '',
            asesmen: ''
          });
        });
      } else {
        // Fallback jika array cp kosong
        promesRows.push({
          no: no++,
          elemen: data.topik || '',
          konten: '',
          tp: '',
          alokasi: '',
          bulanMinggu: '',
          strategi: '',
          asesmen: ''
        });
      }
    });

    renderPromesTable(container);
    infoDiv.querySelector('p').textContent = `✅ Berhasil memuat ${promesRows.length} baris data dari Firebase.`;
    infoDiv.style.background = '#dcfce7';
    infoDiv.querySelector('p').style.color = '#166534';
    
    // Tampilkan tombol AI jika API Key ada
    if (groqApiKey) {
      container.querySelector('#btn-generate-ai').style.display = 'inline-flex';
    } else {
      showToast('⚠️ API Key Groq belum aktif. Tombol AI disembunyikan.', 'warning');
    }
    
    showToast(`✅ ${promesRows.length} baris TP berhasil dimuat!`, 'success');

  } catch (error) {
    console.error('Error loading TP:', error);
    infoDiv.querySelector('p').textContent = '❌ Gagal memuat data: ' + error.message;
    infoDiv.style.background = '#fee2e2';
    infoDiv.querySelector('p').style.color = '#991b1b';
    showToast('❌ Gagal memuat data TP!', 'error');
  }
}

// ========== 2. GENERATE DENGAN GROQ AI ==========
async function handleGenerateWithAI(container) {
  if (promesRows.length === 0) {
    showToast('⚠️ Load data TP terlebih dahulu!', 'error');
    return;
  }

  const btnGenerate = container.querySelector('#btn-generate-ai');
  const originalText = btnGenerate.textContent;
  btnGenerate.textContent = ' AI Sedang Bekerja...';
  btnGenerate.disabled = true;

  try {
    const mapel = container.querySelector('#promes-mapel').value;
    const kelas = container.querySelector('#promes-kelas').value;
    const semester = container.querySelector('#promes-semester').value;
    const tahun = container.querySelector('#promes-tahun').value;
    const labelSemester = semester === '1' ? 'Ganjil' : 'Genap';
    const rentangBulan = semester === '1' ? 'Juli - Desember' : 'Januari - Juni';

    let prompt = `Bertindaklah sebagai ahli kurikulum dan pembelajaran mendalam (Deep Learning). \n`;
    prompt += `Buatkan "Alokasi Waktu", "Bulan / Minggu", "Strategi & Aktivitas Pembelajaran", dan "Bentuk Asesmen Otentik" untuk mata pelajaran ${mapel} Kelas ${kelas} Semester ${labelSemester} Tahun Ajaran ${tahun}.\n\n`;
    prompt += `Berikut adalah data yang harus Anda lengkapi:\n`;
    
    promesRows.forEach((row, idx) => {
      prompt += `${idx + 1}. Elemen/Topik: ${row.elemen}\n`;
      prompt += `   Materi Esensial: ${row.konten}\n`;
      prompt += `   Tujuan Pembelajaran: ${row.tp}\n\n`;
    });

    prompt += `ATURAN OUTPUT:\n`;
    prompt += `1. Berikan jawaban HANYA dalam bentuk JSON array yang valid, tanpa teks tambahan di luar JSON.\n`;
    prompt += `2. Setiap item memiliki properti: "no" (angka), "alokasi" (string singkat, contoh: "4 JP"), "bulanMinggu" (string singkat, contoh: "Juli: M1-M2"), "strategi" (string, gunakan <br> untuk baris baru), dan "asesmen" (string, gunakan <br> untuk baris baru).\n`;
    prompt += `3. Susun "bulanMinggu" secara berurutan dan TIDAK tumpang tindih antar baris, mengikuti kalender semester ${labelSemester} (${rentangBulan}), dengan total alokasi waktu yang realistis untuk satu semester (± 16-18 minggu efektif dibagi sesuai jumlah baris data).\n`;
    prompt += `4. Strategi harus berpusat pada siswa (4C: Critical Thinking, Collaboration, Communication, Creativity).\n`;
    prompt += `5. Asesmen harus otentik (Formatif & Sumatif).\n`;
    prompt += `Contoh format:\n[\n  {"no": 1, "alokasi": "4 JP", "bulanMinggu": "Juli: M1-M2", "strategi": "Diskusi kelompok...", "asesmen": "Formatif: Observasi..."},\n  ...\n]`;

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqApiKey}` },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: 'Anda adalah ahli kurikulum yang hanya merespons dalam format JSON valid.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 4000
      })
    });

    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    // Parsing JSON dari AI
    let generatedData;
    try {
      const jsonMatch = aiResponse.match(/```json\s*([\s\S]*?)```/) || aiResponse.match(/\[[\s\S]*\]/);
      generatedData = JSON.parse(jsonMatch ? jsonMatch[1] || jsonMatch[0] : aiResponse);
    } catch (e) {
      throw new Error('AI menghasilkan format yang tidak valid.');
    }

    // Update baris (alokasi, bulan/minggu, strategi, asesmen)
    generatedData.forEach((item) => {
      const idx = item.no - 1;
      if (promesRows[idx]) {
        promesRows[idx].alokasi = item.alokasi || promesRows[idx].alokasi || '';
        promesRows[idx].bulanMinggu = item.bulanMinggu || promesRows[idx].bulanMinggu || '';
        promesRows[idx].strategi = item.strategi || '';
        promesRows[idx].asesmen = item.asesmen || '';
      }
    });

    renderPromesTable(container);
    showToast(`✅ Berhasil generate ${generatedData.length} baris (alokasi, jadwal, strategi & asesmen) dengan AI!`, 'success');

  } catch (error) {
    console.error('Error generating with AI:', error);
    showToast('❌ Gagal generate: ' + error.message, 'error');
  } finally {
    btnGenerate.textContent = originalText;
    btnGenerate.disabled = false;
  }
}

function renderPromesTable(container) {
  const tbody = container.querySelector('#promes-tbody');
  tbody.innerHTML = '';

  if (promesRows.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 30px; color: #64748b;">Klik "Load Data TP" untuk memuat data</td></tr>';
    return;
  }

  promesRows.forEach((row, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="text-align: center; font-weight: bold;">${row.no}</td>
      <td><input type="text" data-field="elemen" data-idx="${idx}" value="${escapeAttr(row.elemen)}"></td>
      <td><textarea data-field="konten" data-idx="${idx}">${escapeHtml(row.konten)}</textarea></td>
      <td><textarea data-field="tp" data-idx="${idx}">${escapeHtml(row.tp)}</textarea></td>
      <td><input type="text" data-field="alokasi" data-idx="${idx}" value="${escapeAttr(row.alokasi)}" placeholder="15 JP"></td>
      <td><input type="text" data-field="bulanMinggu" data-idx="${idx}" value="${escapeAttr(row.bulanMinggu)}" placeholder="Juli: M1, M2"></td>
      <td><textarea data-field="strategi" data-idx="${idx}">${escapeHtml(row.strategi)}</textarea></td>
      <td><textarea data-field="asesmen" data-idx="${idx}">${escapeHtml(row.asesmen)}</textarea></td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('input, textarea').forEach(el => {
    el.addEventListener('input', (e) => {
      const idx = parseInt(e.target.dataset.idx);
      const field = e.target.dataset.field;
      if (promesRows[idx]) promesRows[idx][field] = e.target.value;
    });
  });
}

function addEmptyRow(container) {
  const idx = promesRows.length;
  promesRows.push({ no: idx + 1, elemen: '', konten: '', tp: '', alokasi: '', bulanMinggu: '', strategi: '', asesmen: '' });
  renderPromesTable(container);
}

// ========== 3. SIMPAN KE FIREBASE ==========
async function handleSimpan(container) {
  if (promesRows.length === 0) { showToast('⚠️ Tidak ada data!', 'error'); return; }

  const kelas = container.querySelector('#promes-kelas').value;
  const mapel = container.querySelector('#promes-mapel').value;
  const semester = container.querySelector('#promes-semester').value;
  const sekolah = container.querySelector('#promes-sekolah').value;
  const tahun = container.querySelector('#promes-tahun').value;
  const guru = container.querySelector('#promes-guru').value;
  const pendekatan = container.querySelector('#promes-pendekatan').value;

  if (!kelas || !mapel) { showToast('⚠️ Pilih Kelas dan Mapel!', 'error'); return; }

  try {
    const promesData = {
      userId: currentUser.uid, kelas, mapel, semester, sekolah,
      tahunAjaran: tahun, guru, pendekatan, rows: promesRows,
      createdAt: serverTimestamp(), updatedAt: serverTimestamp()
    };

    if (currentEditId) {
      await updateDoc(doc(db, 'data_promes', currentEditId), promesData);
      showToast('✅ Promes berhasil diupdate!', 'success');
      currentEditId = null;
    } else {
      await addDoc(collection(db, 'data_promes'), promesData);
      showToast('✅ Promes berhasil disimpan!', 'success');
    }
    loadSavedPromes(container);
  } catch (error) {
    showToast('❌ Gagal menyimpan: ' + error.message, 'error');
  }
}

function loadSavedPromes(container) {
  const listContainer = container.querySelector('#promes-list-container');
  const q = query(collection(db, 'data_promes'), where('userId', '==', currentUser.uid));

  onSnapshot(q, (snapshot) => {
    if (snapshot.empty) {
      listContainer.innerHTML = '<div class="promes-empty">📭 Belum ada Promes tersimpan.</div>';
      return;
    }
    const docs = [];
    snapshot.forEach(docSnap => docs.push({ id: docSnap.id, ...docSnap.data() }));
    docs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

    listContainer.innerHTML = docs.map(d => `
      <div style="background: linear-gradient(135deg, #fff1f2 0%, #fce7f3 100%); padding: 15px; border-radius: 10px; margin-bottom: 10px; border-left: 4px solid #ec4899;">
        <div style="display: flex; justify-content: space-between; align-items: start; flex-wrap: wrap; gap: 10px;">
          <div>
            <div style="font-weight: 700; color: #be185d; font-size: 15px;">${d.mapel} - Kelas ${d.kelas} | Semester ${d.semester}</div>
            <div style="font-size: 12px; color: #64748b;">${d.sekolah} | ${d.tahunAjaran} | ${d.rows?.length || 0} baris</div>
          </div>
          <div style="display: flex; gap: 5px;">
            <button onclick="editPromes('${d.id}')" style="background: #3b82f6; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px;">✏️ Edit</button>
            <button onclick="deletePromes('${d.id}')" style="background: #ef4444; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px;">🗑️ Hapus</button>
          </div>
        </div>
      </div>
    `).join('');
  });
}

window.editPromes = async function(id) {
  try {
    const { getDoc, doc } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
    const docSnap = await getDoc(doc(db, 'data_promes', id));
    if (!docSnap.exists()) { showToast('❌ Data tidak ditemukan!', 'error'); return; }

    const d = docSnap.data();
    currentEditId = id;
    document.querySelector('#promes-kelas').value = d.kelas || '';
    document.querySelector('#promes-mapel').value = d.mapel || '';
    document.querySelector('#promes-semester').value = d.semester || '1';
    document.querySelector('#promes-sekolah').value = d.sekolah || '';
    document.querySelector('#promes-tahun').value = d.tahunAjaran || '';
    document.querySelector('#promes-guru').value = d.guru || '';
    document.querySelector('#promes-pendekatan').value = d.pendekatan || '';
    promesRows = d.rows || [];
    renderPromesTable(document.querySelector('.promes-container'));
    showToast('✅ Data dimuat untuk diedit!', 'success');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (error) { showToast('❌ Gagal memuat!', 'error'); }
};

window.deletePromes = async function(id) {
  if (!confirm('️ Yakin hapus?')) return;
  try { await deleteDoc(doc(db, 'data_promes', id)); showToast('✅ Berhasil dihapus!', 'success'); }
  catch (error) { showToast('❌ Gagal menghapus!', 'error'); }
};

// ========== 4. EXPORT WORD (FORMAT RAPI, LANDSCAPE FIT-PAGE) ==========
function handleExport(container) {
  if (promesRows.length === 0) { showToast('⚠️ Tidak ada data!', 'error'); return; }

  const mapel = container.querySelector('#promes-mapel').value;
  const kelas = container.querySelector('#promes-kelas').value;
  const semester = container.querySelector('#promes-semester').value;
  const sekolah = container.querySelector('#promes-sekolah').value;
  const tahun = container.querySelector('#promes-tahun').value;
  const guru = container.querySelector('#promes-guru').value;
  const pendekatan = container.querySelector('#promes-pendekatan').value;
  const labelSemester = semester === '1' ? 'Ganjil' : 'Genap';

  // Catatan teknis: Word (saat membuka file .doc hasil export HTML) TIDAK membaca
  // CSS "@page { size: A4 landscape; }" biasa. Word butuh @page bernama (Section1)
  // yang di-bind ke elemen <div class="Section1">, ditambah lebar kolom tabel yang
  // TETAP (colgroup + table-layout:fixed) supaya tabel tidak meluber ke luar halaman.
  let html = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset='utf-8'><title>Promes_${mapel}_Kelas${kelas}</title>
    <!--[if gte mso 9]>
    <xml>
      <w:WordDocument>
        <w:View>Print</w:View>
        <w:Zoom>90</w:Zoom>
        <w:DoNotOptimizeForBrowser/>
      </w:WordDocument>
    </xml>
    <![endif]-->
    <style>
      @page Section1 {
        size: 29.7cm 21cm;
        mso-page-orientation: landscape;
        margin: 1.3cm 1.2cm 1.3cm 1.2cm;
        mso-header-margin: .5cm;
        mso-footer-margin: .5cm;
      }
      div.Section1 { page: Section1; }
      body { font-family: 'Times New Roman', Times, serif; font-size: 10.5pt; line-height: 1.35; color: #000; margin: 0; }
      h1 { text-align: center; font-size: 14pt; font-weight: bold; margin: 0; text-transform: uppercase; }
      h2 { text-align: center; font-size: 12pt; font-weight: bold; margin: 4px 0 14px 0; }
      .info-table { width: 100%; border: none; margin-bottom: 14px; font-size: 11pt; }
      .info-table td { border: none; padding: 2px 0; vertical-align: top; }
      table.data-table { border-collapse: collapse; width: 100%; table-layout: fixed; margin-top: 8px; font-size: 9.5pt; }
      table.data-table th { background-color: #e6e6e6 !important; border: 1px solid #000 !important; padding: 6px 4px; text-align: center !important; font-weight: bold; vertical-align: middle; -webkit-print-color-adjust: exact; mso-shading: #e6e6e6; }
      table.data-table td { border: 1px solid #000 !important; padding: 5px; vertical-align: top !important; word-wrap: break-word; overflow-wrap: break-word; }
      .col-no, .col-elemen, .col-alokasi, .col-bulan { text-align: center !important; font-weight: bold; background-color: #f5f5f5 !important; mso-shading: #f5f5f5; }
      .col-konten, .col-tp, .col-strategi, .col-asesmen { text-align: justify !important; }
      table.data-table thead { display: table-header-group; }
      tr { page-break-inside: avoid; }
      .signature { margin-top: 26px; text-align: right; font-size: 11pt; }
    </style></head><body>
    <div class="Section1">
      <h1>PROGRAM SEMESTER (PROMES) ${mapel.toUpperCase()}</h1>
      <h2>Kurikulum Merdeka - Pembelajaran Mendalam (Deep Learning)</h2>
      <table class="info-table">
        <tr><td width="120"><strong>Satuan Pendidikan</strong></td><td width="10">:</td><td>${sekolah}</td></tr>
        <tr><td><strong>Kelas / Semester</strong></td><td>:</td><td>${kelas} / ${labelSemester}</td></tr>
        <tr><td><strong>Tahun Ajaran</strong></td><td>:</td><td>${tahun}</td></tr>
        <tr><td><strong>Pendekatan</strong></td><td>:</td><td>${pendekatan}</td></tr>
      </table>
      <table class="data-table">
        <colgroup>
          <col style="width:5%">
          <col style="width:11%">
          <col style="width:15%">
          <col style="width:19%">
          <col style="width:7%">
          <col style="width:11%">
          <col style="width:21%">
          <col style="width:11%">
        </colgroup>
        <thead><tr>
          <th class="col-no">No</th><th class="col-elemen">Elemen</th>
          <th class="col-konten">Konten / Materi Esensial</th><th class="col-tp">Tujuan Pembelajaran</th>
          <th class="col-alokasi">Alokasi Waktu</th><th class="col-bulan">Bulan / Minggu</th>
          <th class="col-strategi">Strategi & Aktivitas</th><th class="col-asesmen">Asesmen Otentik</th>
        </tr></thead><tbody>`;

  promesRows.forEach(row => {
    html += `<tr>
      <td class="col-no">${row.no}</td><td class="col-elemen">${escapeHtml(row.elemen)}</td>
      <td class="col-konten">${escapeHtml(row.konten)}</td><td class="col-tp">${escapeHtml(row.tp)}</td>
      <td class="col-alokasi">${escapeHtml(row.alokasi)}</td><td class="col-bulan">${escapeHtml(row.bulanMinggu)}</td>
      <td class="col-strategi">${escapeHtml(row.strategi)}</td><td class="col-asesmen">${escapeHtml(row.asesmen)}</td>
    </tr>`;
  });

  html += `</tbody></table>
      <div class="signature"><p>${sekolah}, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
      <p style="margin-top: 60px;"><strong><u>${guru}</u></strong></p></div>
    </div></body></html>`;

  const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = `Promes_${mapel.replace(/\s+/g, '_')}_Kelas${kelas}_Sem${semester}.doc`;
  document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url);
  showToast('✅ File Word berhasil diunduh!', 'success');
}

// ========== 5. IMPORT, PRINT, RESET ==========
function handleImport(event, container) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const imported = JSON.parse(e.target.result);
      if (!imported.rows) throw new Error('Format tidak valid!');
      promesRows = imported.rows;
      if (imported.kelas) container.querySelector('#promes-kelas').value = imported.kelas;
      if (imported.mapel) container.querySelector('#promes-mapel').value = imported.mapel;
      renderPromesTable(container);
      showToast(`✅ ${promesRows.length} baris diimport!`, 'success');
    } catch (error) { showToast('❌ Gagal import!', 'error'); }
  };
  reader.readAsText(file);
  event.target.value = '';
}

function handlePrint(container) {
  if (promesRows.length === 0) { showToast('⚠️ Tidak ada data!', 'error'); return; }
  const printWindow = window.open('', '_blank');
  const mapel = container.querySelector('#promes-mapel').value;
  const kelas = container.querySelector('#promes-kelas').value;
  const semester = container.querySelector('#promes-semester').value;
  const sekolah = container.querySelector('#promes-sekolah').value;
  const tahun = container.querySelector('#promes-tahun').value;
  const guru = container.querySelector('#promes-guru').value;
  const pendekatan = container.querySelector('#promes-pendekatan').value;
  const labelSemester = semester === '1' ? 'Ganjil' : 'Genap';

  let html = `<html><head><title>Promes</title><style>
    @page { size: A4 landscape; margin: 1.5cm; }
    body { font-family: 'Times New Roman', serif; font-size: 11pt; }
    h1 { text-align: center; font-size: 14pt; margin: 0; } h2 { text-align: center; font-size: 13pt; margin: 5px 0 15px 0; }
    .info-table { width: 100%; border: none; margin-bottom: 15px; } .info-table td { border: none; padding: 3px 0; }
    table.data-table { border-collapse: collapse; width: 100%; font-size: 10pt; }
    th { background: #e6e6e6 !important; border: 1px solid #000 !important; padding: 8px; text-align: center !important; -webkit-print-color-adjust: exact; }
    td { border: 1px solid #000 !important; padding: 6px; vertical-align: top !important; }
    .col-no, .col-elemen, .col-alokasi, .col-bulan { text-align: center !important; background: #f5f5f5 !important; -webkit-print-color-adjust: exact; }
    .col-konten, .col-tp, .col-strategi, .col-asesmen { text-align: justify !important; }
  </style></head><body>
    <h1>PROGRAM SEMESTER (PROMES) ${mapel.toUpperCase()}</h1><h2>Kurikulum Merdeka - Deep Learning</h2>
    <table class="info-table"><tr><td><strong>Satuan Pendidikan</strong></td><td>: ${sekolah}</td></tr>
    <tr><td><strong>Kelas / Semester</strong></td><td>: ${kelas} / ${labelSemester}</td></tr>
    <tr><td><strong>Tahun Ajaran</strong></td><td>: ${tahun}</td></tr>
    <tr><td><strong>Pendekatan</strong></td><td>: ${pendekatan}</td></tr></table>
    <table class="data-table"><thead><tr>
      <th class="col-no" style="width:5%">No</th><th class="col-elemen" style="width:10%">Elemen</th>
      <th class="col-konten" style="width:15%">Konten</th><th class="col-tp" style="width:20%">TP</th>
      <th class="col-alokasi" style="width:8%">Alokasi</th><th class="col-bulan" style="width:12%">Bulan/Minggu</th>
      <th class="col-strategi" style="width:20%">Strategi</th><th class="col-asesmen" style="width:10%">Asesmen</th>
    </tr></thead><tbody>`;

  promesRows.forEach(row => {
    html += `<tr><td class="col-no">${row.no}</td><td class="col-elemen">${escapeHtml(row.elemen)}</td>
      <td class="col-konten">${escapeHtml(row.konten)}</td><td class="col-tp">${escapeHtml(row.tp)}</td>
      <td class="col-alokasi">${escapeHtml(row.alokasi)}</td><td class="col-bulan">${escapeHtml(row.bulanMinggu)}</td>
      <td class="col-strategi">${escapeHtml(row.strategi)}</td><td class="col-asesmen">${escapeHtml(row.asesmen)}</td></tr>`;
  });
  html += `</tbody></table><div style="margin-top:30px; text-align:right;"><p>${sekolah}, ${new Date().toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'})}</p><p style="margin-top:60px;"><strong><u>${guru}</u></strong></p></div></body></html>`;

  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => { printWindow.print(); }, 500);
}

function handleReset(container) {
  if (!confirm('🔄 Reset semua data?')) return;
  currentEditId = null;
  promesRows = [];
  container.querySelector('#promes-kelas').value = '';
  container.querySelector('#promes-mapel').value = '';
  container.querySelector('#promes-semester').value = '1';
  container.querySelector('#promes-sekolah').value = currentUser.namaSekolah || 'SDN 139 LAMANDA';
  container.querySelector('#promes-tahun').value = '2026/2027';
  container.querySelector('#promes-guru').value = currentUser.namaLengkap || '';
  container.querySelector('#btn-generate-ai').style.display = 'none';
  renderPromesTable(container);
  showToast('✅ Form direset!', 'success');
}

function showToast(msg, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `promes-toast promes-toast-${type}`;
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0'; toast.style.transform = 'translateX(400px)'; toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
