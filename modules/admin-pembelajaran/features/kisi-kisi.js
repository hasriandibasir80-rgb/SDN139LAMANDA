// modules/admin-pembelajaran/features/kisi-kisi.js
// =========================================
// FITUR: PEMBUAT KISI-KISI SOAL
// PERENCANAAN ASESMEN BERBASIS AI
// TERINTEGRASI: Firestore, AI Groq, Data Mapel JSON
// =========================================

import { db } from '../../../js/firebase-config.js';
import { 
  collection, addDoc, query, where, orderBy, 
  onSnapshot, doc, updateDoc, deleteDoc, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');

// Groq API Configuration
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';
let groqApiKey = null;

const CSS_ID = 'kisi-kisi-css';
let currentEditId = null;
let dataMapel = [];

// Fallback Data Mapel
const FALLBACK_MAPEL = [
  { id: 'paibd', nama: 'Pendidikan Agama Islam dan Budi Pekerti', singkatan: 'PAIBD', icon: '🕌' },
  { id: 'matematika', nama: 'Matematika', singkatan: 'Matematika', icon: '' },
  { id: 'ipas', nama: 'IPAS', singkatan: 'IPAS', icon: '🔬' },
  { id: 'pjok', nama: 'PJOK', singkatan: 'PJOK', icon: '⚽' },
  { id: 'bahasa-indonesia', nama: 'Bahasa Indonesia', singkatan: 'Bhs.Indonesia', icon: '📖' },
  { id: 'pendidikan-pancasila', nama: 'Pendidikan Pancasila', singkatan: 'Pendidikan Pancasila', icon: '🇩' },
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
      if (dataMapel.length > 0) {
        console.log(`✅ Data mapel berhasil dimuat: ${dataMapel.length} mapel`);
        return;
      }
    } catch (error) {
      continue;
    }
  }
  
  console.warn('⚠️ Menggunakan data mapel fallback');
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
    @media (max-width: 768px) { .kisi-form-grid { grid-template-columns: 1fr; } .kisi-actions { flex-direction: column; } .kisi-btn { width: 100%; justify-content: center; } .kisi-preview-table { font-size: 11px; } }
  `;
  document.head.appendChild(style);
}

function renderUI(container) {
  const aiReady = groqApiKey ? '✅ AI Siap' : '️ API Key Belum Aktif';
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
        <button class="kisi-tab" data-tab="list"> Kisi-Kisi Tersimpan</button>
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
              <input type="text" id="kisi-guru" class="kisi-form-control" value="Hasriandi Basir SP.d">
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
              <label>📝 Topik / Materi</label>
              <input type="text" id="kisi-topik" class="kisi-form-control" placeholder="Contoh: Bagian Tubuh Tumbuhan">
            </div>
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
          </div>
          <div class="kisi-form-grid">
            <div class="kisi-form-group">
              <label>🔢 Jumlah Soal</label>
              <input type="number" id="kisi-jumlah" class="kisi-form-control" value="10" min="1" max="50">
            </div>
            <div class="kisi-form-group">
              <label>📝 Bentuk Soal</label>
              <select id="kisi-bentuk" class="kisi-form-control">
                <option value="Pilihan Ganda">Pilihan Ganda</option>
                <option value="Esai">Esai / Uraian</option>
                <option value="Campuran">Campuran (PG + Esai)</option>
              </select>
            </div>
          </div>
          <div class="kisi-form-group">
            <label>🎯 Tujuan Pembelajaran (TP) / Indikator (satu per baris)</label>
            <textarea id="kisi-tp" class="kisi-form-control" rows="4" placeholder="1. Siswa mampu mengidentifikasi bagian tubuh tumbuhan&#10;2. Siswa mampu menjelaskan fungsi akar, batang, dan daun&#10;3. Siswa mampu menganalisis hubungan antara bagian tumbuhan dengan fungsinya"></textarea>
            <p style="font-size: 12px; color: #64748b; margin-top: 5px;">💡 AI akan memetakan TP ini ke level kognitif (LOTS/MOTS/HOTS) secara otomatis</p>
          </div>
        </div>

        <div class="kisi-actions">
          <button class="kisi-btn kisi-btn-primary" id="btn-generate-ai">✨ Generate Kisi-Kisi dengan AI</button>
          <button class="kisi-btn kisi-btn-success" id="btn-simpan">💾 Simpan ke Database</button>
          <button class="kisi-btn kisi-btn-warning" id="btn-export"> Export Word</button>
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
          <div id="kisi-list-container">
            <div class="kisi-loading">⏳ Memuat data...</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function attachEvents(container) {
  // Tab switching
  container.querySelectorAll('.kisi-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      container.querySelectorAll('.kisi-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const target = tab.dataset.tab;
      container.querySelector('#kisi-form-section').style.display = target === 'form' ? 'block' : 'none';
      container.querySelector('#kisi-list-section').style.display = target === 'list' ? 'block' : 'none';
    });
  });

  // Generate AI
  container.querySelector('#btn-generate-ai').addEventListener('click', () => handleGenerateAI(container));

  // Simpan
  container.querySelector('#btn-simpan').addEventListener('click', () => handleSimpan(container));

  // Export Word
  container.querySelector('#btn-export').addEventListener('click', () => handleExportWord(container));

  // Reset
  container.querySelector('#btn-reset').addEventListener('click', () => {
    if (confirm('🔄 Reset semua form?')) {
      currentEditId = null;
      container.querySelectorAll('input[type="text"], textarea').forEach(el => {
        if (el.id === 'kisi-guru') {
          el.value = 'Hasriandi Basir SP.d';
        } else if (el.id === 'kisi-sekolah') {
          el.value = currentUser.namaSekolah || 'SDN 139 LAMANDA';
        } else if (el.id === 'kisi-jumlah') {
          el.value = '10';
        } else {
          el.value = '';
        }
      });
      container.querySelector('#kisi-preview-section').style.display = 'none';
      showToast('✅ Form direset!');
    }
  });
}

async function handleGenerateAI(container) {
  if (!groqApiKey) {
    showToast('⚠️ API Key belum aktif!', 'error');
    return;
  }

  const mapel = container.querySelector('#kisi-mapel').value;
  const kelas = container.querySelector('#kisi-kelas').value;
  const topik = container.querySelector('#kisi-topik').value;
  const jumlah = container.querySelector('#kisi-jumlah').value;
  const bentuk = container.querySelector('#kisi-bentuk').value;
  const tp = container.querySelector('#kisi-tp').value;

  if (!mapel || !kelas || !topik || !jumlah || !tp) {
    showToast('⚠️ Lengkapi semua field terlebih dahulu!', 'error');
    return;
  }

  const [kelasNum, fase] = kelas.split('|');
  
  const prompt = `Bertindaklah sebagai Ahli Kurikulum Merdeka dan Pengembang Asesmen profesional.

Buatkan KISI-KISI SOAL (BUKAN soal jadi) dengan format JSON valid berdasarkan data:
- Mata Pelajaran: ${mapel}
- Kelas: ${kelasNum} (Fase ${fase})
- Topik: ${topik}
- Jenis Asesmen: ${container.querySelector('#kisi-jenis').value}
- Jumlah Soal: ${jumlah}
- Bentuk Soal: ${bentuk}
- Tujuan Pembelajaran: ${tp}

WAJIB output dalam format JSON berikut (tanpa markdown tambahan):
{
  "informasi": {
    "sekolah": "SDN 139 LAMANDA",
    "mapel": "${mapel}",
    "kelas": "${kelasNum}",
    "fase": "${fase}",
    "topik": "${topik}",
    "jenis_asesmen": "${container.querySelector('#kisi-jenis').value}",
    "jumlah_soal": ${jumlah},
    "bentuk_soal": "${bentuk}"
  },
  "kisi_kisi": [
    {
      "nomor": 1,
      "tujuan_pembelajaran": "TP yang diukur...",
      "indikator_soal": "Indikator spesifik yang dapat diukur...",
      "materi": "Materi yang diujikan...",
      "bentuk_soal": "PG/Esai",
      "level_kognitif": "LOTS/MOTS/HOTS",
      "nomor_soal": "1",
      "media_gambar": "URL gambar dari Wikimedia Commons atau Unsplash yang relevan (jika diperlukan), atau 'Tidak ada' jika tidak perlu gambar"
    }
  ],
  "distribusi_level": {
    "LOTS": "jumlah soal LOTS",
    "MOTS": "jumlah soal MOTS",
    "HOTS": "jumlah soal HOTS"
  }
}

PENTING:
- Distribusikan level kognitif secara proporsional (30% LOTS, 40% MOTS, 30% HOTS)
- Untuk soal yang membutuhkan gambar (misal: IPA, Matematika geometri), sertakan URL gambar edukatif dari Wikimedia Commons atau Unsplash
- Indikator soal harus SPESIFIK dan dapat diukur
- Jumlah item di array kisi_kisi HARUS sama dengan jumlah_soal
- Gunakan bahasa Indonesia formal dan edukatif`;

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqApiKey}`
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: 'Anda adalah ahli kurikulum Merdeka Indonesia. Output HARUS JSON valid.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 4000
      })
    });

    if (!response.ok) throw new Error(`API Error: ${response.status}`);

    const data = await response.json();
    const aiText = data.choices[0].message.content;
    
    let parsed;
    const jsonMatch = aiText.match(/```json\s*([\s\S]*?)\s*```/) || aiText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);
    } else {
      parsed = JSON.parse(aiText);
    }

    // Tampilkan preview
    tampilkanPreview(container, parsed);
    showToast('✅ Kisi-kisi berhasil di-generate dengan AI!');
  } catch (error) {
    console.error('Error AI:', error);
    showToast('❌ Gagal generate: ' + error.message, 'error');
  }
}

function tampilkanPreview(container, data) {
  const previewSection = container.querySelector('#kisi-preview-section');
  const previewContent = container.querySelector('#kisi-preview-content');
  
  if (!data.kisi_kisi || data.kisi_kisi.length === 0) {
    previewContent.innerHTML = '<div class="kisi-empty">❌ Data kisi-kisi tidak valid</div>';
    previewSection.style.display = 'block';
    return;
  }

  let html = `
    <div style="margin-bottom: 20px; padding: 15px; background: #f0f9ff; border-radius: 8px; border-left: 4px solid #3b82f6;">
      <h4 style="margin: 0 0 10px 0; color: #1e40af;"> Distribusi Level Kognitif</h4>
      <div style="display: flex; gap: 15px; flex-wrap: wrap;">
        <span class="level-badge level-lots">LOTS: ${data.distribusi_level?.LOTS || 0} soal</span>
        <span class="level-badge level-mots">MOTS: ${data.distribusi_level?.MOTS || 0} soal</span>
        <span class="level-badge level-hots">HOTS: ${data.distribusi_level?.HOTS || 0} soal</span>
      </div>
    </div>
    <table class="kisi-preview-table">
      <thead>
        <tr>
          <th style="width: 40px;">No</th>
          <th>Tujuan Pembelajaran</th>
          <th>Indikator Soal</th>
          <th>Materi</th>
          <th style="width: 80px;">Bentuk</th>
          <th style="width: 80px;">Level</th>
          <th style="width: 60px;">No. Soal</th>
          <th style="width: 100px;">Media</th>
        </tr>
      </thead>
      <tbody>
  `;

  data.kisi_kisi.forEach(item => {
    const levelClass = item.level_kognitif === 'LOTS' ? 'level-lots' : 
                       item.level_kognitif === 'MOTS' ? 'level-mots' : 'level-hots';
    const mediaIcon = item.media_gambar && item.media_gambar !== 'Tidak ada' ? '🖼️ Ada' : '➖';
    
    html += `
      <tr>
        <td style="text-align: center;">${item.nomor}</td>
        <td>${item.tujuan_pembelajaran}</td>
        <td>${item.indikator_soal}</td>
        <td>${item.materi}</td>
        <td style="text-align: center;">${item.bentuk_soal}</td>
        <td style="text-align: center;"><span class="level-badge ${levelClass}">${item.level_kognitif}</span></td>
        <td style="text-align: center;">${item.nomor_soal}</td>
        <td style="text-align: center;">${mediaIcon}</td>
      </tr>
    `;
  });

  html += `</tbody></table>`;
  
  previewContent.innerHTML = html;
  previewSection.style.display = 'block';
  
  // Scroll ke preview
  setTimeout(() => {
    previewSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);
}

async function handleSimpan(container) {
  const mapel = container.querySelector('#kisi-mapel').value;
  const kelas = container.querySelector('#kisi-kelas').value;
  const topik = container.querySelector('#kisi-topik').value;

  if (!mapel || !kelas || !topik) {
    showToast('⚠️ Lengkapi informasi asesmen terlebih dahulu!', 'error');
    return;
  }

  // Ambil data dari preview (jika sudah di-generate)
  const previewContent = container.querySelector('#kisi-preview-content');
  if (!previewContent.innerHTML.trim()) {
    showToast('⚠️ Generate kisi-kisi dengan AI terlebih dahulu!', 'error');
    return;
  }

  // Kumpulkan data dari form
  const [kelasNum, fase] = kelas.split('|');
  
  const dataKisi = {
    jenis: 'kisi-kisi',
    informasi: {
      sekolah: container.querySelector('#kisi-sekolah').value,
      guru: container.querySelector('#kisi-guru').value,
      mapel,
      kelas: kelasNum,
      fase,
      topik,
      jenis_asesmen: container.querySelector('#kisi-jenis').value,
      jumlah_soal: parseInt(container.querySelector('#kisi-jumlah').value),
      bentuk_soal: container.querySelector('#kisi-bentuk').value,
      tujuan_pembelajaran: container.querySelector('#kisi-tp').value
    },
    kisi_kisi: extractKisiFromPreview(previewContent),
    createdAt: serverTimestamp(),
    userId: currentUser.uid
  };

  try {
    if (currentEditId) {
      const docRef = doc(db, 'kisi_kisi', currentEditId);
      await updateDoc(docRef, dataKisi);
      showToast('✅ Kisi-kisi berhasil diupdate!');
      currentEditId = null;
    } else {
      await addDoc(collection(db, 'kisi_kisi'), dataKisi);
      showToast('✅ Kisi-kisi berhasil disimpan!');
    }
  } catch (error) {
    console.error('Error saving:', error);
    showToast('❌ Gagal menyimpan: ' + error.message, 'error');
  }
}

function extractKisiFromPreview(previewContent) {
  // Extract data dari tabel preview (simplified)
  const rows = previewContent.querySelectorAll('tbody tr');
  const kisiArray = [];
  
  rows.forEach((row, idx) => {
    const cells = row.querySelectorAll('td');
    if (cells.length >= 7) {
      const levelBadge = cells[5].querySelector('.level-badge');
      kisiArray.push({
        nomor: idx + 1,
        tujuan_pembelajaran: cells[1].textContent,
        indikator_soal: cells[2].textContent,
        materi: cells[3].textContent,
        bentuk_soal: cells[4].textContent,
        level_kognitif: levelBadge ? levelBadge.textContent : 'MOTS',
        nomor_soal: cells[6].textContent,
        media_gambar: cells[7].textContent.includes('🖼️') ? 'Ada' : 'Tidak ada'
      });
    }
  });
  
  return kisiArray;
}

function loadKisiList(container) {
  const listContainer = container.querySelector('#kisi-list-container');
  
  const q = query(
    collection(db, 'kisi_kisi'),
    where('userId', '==', currentUser.uid),
    orderBy('createdAt', 'desc')
  );

  onSnapshot(q, (snapshot) => {
    if (snapshot.empty) {
      listContainer.innerHTML = '<div class="kisi-empty">📭 Belum ada kisi-kisi tersimpan</div>';
      return;
    }

    listContainer.innerHTML = snapshot.docs.map(docSnap => {
      const d = docSnap.data();
      const date = d.createdAt?.toDate?.()?.toLocaleString('id-ID') || '-';
      return `
        <div class="kisi-item">
          <div class="kisi-item-header">
            <div>
              <div class="kisi-item-title">${d.informasi?.mapel || '-'} - ${d.informasi?.topik || '-'}</div>
              <div class="kisi-item-meta">Kelas ${d.informasi?.kelas || '-'} | ${d.informasi?.jenis_asesmen || '-'} | ${d.informasi?.jumlah_soal || 0} soal | ${date}</div>
            </div>
            <div class="kisi-item-actions">
              <button onclick="editKisi('${docSnap.id}')" style="background: #3b82f6;">✏️ Edit</button>
              <button onclick="deleteKisi('${docSnap.id}')" style="background: #ef4444;">️ Hapus</button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }, (error) => {
    console.warn('Error loading kisi list:', error);
    if (error.code === 'failed-precondition') {
      listContainer.innerHTML = '<div class="kisi-empty">️ Index Firestore sedang diproses. Silakan tunggu beberapa menit.</div>';
    } else {
      listContainer.innerHTML = '<div class="kisi-empty">❌ Gagal memuat data</div>';
    }
  });
}

window.editKisi = async function(id) {
  try {
    const { getDoc, doc } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
    const docRef = doc(db, 'kisi_kisi', id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      showToast('❌ Data tidak ditemukan!', 'error');
      return;
    }

    const d = docSnap.data();
    currentEditId = id;

    document.querySelector('#kisi-sekolah').value = d.informasi?.sekolah || '';
    document.querySelector('#kisi-guru').value = d.informasi?.guru || '';
    document.querySelector('#kisi-mapel').value = d.informasi?.mapel || '';
    document.querySelector('#kisi-kelas').value = `${d.informasi?.kelas}|${d.informasi?.fase}` || '';
    document.querySelector('#kisi-topik').value = d.informasi?.topik || '';
    document.querySelector('#kisi-jenis').value = d.informasi?.jenis_asesmen || 'Formatif';
    document.querySelector('#kisi-jumlah').value = d.informasi?.jumlah_soal || 10;
    document.querySelector('#kisi-bentuk').value = d.informasi?.bentuk_soal || 'Pilihan Ganda';
    document.querySelector('#kisi-tp').value = d.informasi?.tujuan_pembelajaran || '';

    // Tampilkan preview dari data tersimpan
    const previewContent = document.querySelector('#kisi-preview-content');
    if (d.kisi_kisi && d.kisi_kisi.length > 0) {
      let html = `<table class="kisi-preview-table"><thead><tr>
        <th style="width: 40px;">No</th><th>Tujuan Pembelajaran</th><th>Indikator Soal</th>
        <th>Materi</th><th style="width: 80px;">Bentuk</th><th style="width: 80px;">Level</th>
        <th style="width: 60px;">No. Soal</th><th style="width: 100px;">Media</th>
      </tr></thead><tbody>`;
      
      d.kisi_kisi.forEach(item => {
        const levelClass = item.level_kognitif === 'LOTS' ? 'level-lots' : 
                           item.level_kognitif === 'MOTS' ? 'level-mots' : 'level-hots';
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
  const topik = container.querySelector('#kisi-topik').value;
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
    <h2 style="text-align: center; border: none;">${topik}</h2>
    
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
  link.download = `KisiKisi_${mapel}_${topik.replace(/\s+/g, '_')}.doc`;
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
