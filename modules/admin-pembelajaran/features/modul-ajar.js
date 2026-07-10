// modules/admin-pembelajaran/features/modul-ajar.js
// =========================================
// FITUR: GENERATOR MODUL AJAR (AI POWERED)
// TEMA: PINK ELEGANT
// API KEY: Menggunakan struktur yang sama dengan cp-tp-atp.js
// =========================================

import { db } from '../../../js/firebase-config.js';
import { getDatabase, ref, get, push, set } 
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { getFirestore, doc, getDoc } 
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
const database = getDatabase();
const firestore = getFirestore();

// State
const CSS_ID = 'modul-ajar-css';
let storedApiKey = null; // Sama seperti groqApiKey di cp-tp-atp.js

/**
 * Init
 */
export async function init(container, db) {
  loadCSS();
  renderUI(container);
  attachEvents();
  await loadApiKeyFromFirestore(); // Sama seperti loadGroqApiKey
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
    /* =========================================
       MODUL AJAR GENERATOR - TEMA PINK
       ========================================= */
    
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

    .gen-header h2 { 
      margin: 0 0 8px 0; 
      font-size: 28px; 
      font-weight: 700;
    }

    .gen-header p { 
      margin: 0; 
      opacity: 0.95; 
      font-size: 15px; 
    }

    /* Form Layout */
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

    .form-section-title:first-child { 
      margin-top: 0; 
    }

    .form-grid { 
      display: grid; 
      grid-template-columns: 1fr 1fr; 
      gap: 20px; 
      margin-bottom: 15px; 
    }

    .form-group { 
      margin-bottom: 18px; 
    }

    .form-group label { 
      display: block; 
      margin-bottom: 8px; 
      font-weight: 600; 
      font-size: 14px; 
      color: #831843; 
    }

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

    .form-control:focus { 
      outline: none; 
      border-color: #ec4899; 
      box-shadow: 0 0 0 3px rgba(236, 72, 153, 0.15); 
    }

    textarea.form-control { 
      resize: vertical; 
      min-height: 100px; 
      font-family: inherit;
    }

    select.form-control {
      cursor: pointer;
    }

    /* Action Button */
    .gen-action { 
      margin-top: 30px; 
      text-align: center; 
    }

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

    .btn-generate:hover:not(:disabled) { 
      transform: translateY(-3px); 
      box-shadow: 0 6px 20px rgba(236, 72, 153, 0.5);
    }

    .btn-generate:disabled { 
      opacity: 0.5; 
      cursor: not-allowed; 
      background: #9ca3af; 
      box-shadow: none; 
    }

    /* Loading */
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

    @keyframes spin { 
      0% { transform: rotate(0deg); } 
      100% { transform: rotate(360deg); } 
    }

    /* Output Area */
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

    .output-header h3 {
      margin: 0;
      color: #831843;
      font-size: 20px;
    }

    .output-actions { 
      display: flex; 
      gap: 10px; 
    }

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

    .output-content h1 { 
      font-size: 22px; 
      color: #be185d; 
      border-bottom: 2px solid #fbcfe8; 
      padding-bottom: 10px; 
      margin-top: 20px;
    }

    .output-content h2 { 
      font-size: 18px; 
      color: #ec4899; 
      margin-top: 25px; 
    }

    .output-content h3 { 
      font-size: 16px; 
      color: #db2777; 
      margin-top: 18px; 
    }

    .output-content ul, 
    .output-content ol { 
      padding-left: 30px; 
    }

    .output-content li { 
      margin-bottom: 8px; 
    }

    /* Action Bar di Bawah Output */
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

    .btn-action:hover { 
      transform: translateY(-2px); 
      box-shadow: 0 4px 12px rgba(0,0,0,0.15); 
    }

    .btn-print { background: #8b5cf6; color: white; }
    .btn-print:hover { background: #7c3aed; }
    .btn-save { background: #10b981; color: white; }
    .btn-save:hover { background: #059669; }
    .btn-edit { background: #f59e0b; color: white; }
    .btn-edit:hover { background: #d97706; }
    .btn-edit.active { background: #dc2626; }
    .btn-download { background: #3b82f6; color: white; }
    .btn-download:hover { background: #2563eb; }

    /* Edit Mode */
    .output-content.editing { 
      border: 3px dashed #f59e0b; 
      padding: 20px; 
      border-radius: 8px; 
      background: #fffbeb; 
      outline: none;
      min-height: 300px;
    }

    /* Print Styles */
    @media print {
      body * { visibility: hidden; }
      .output-area, .output-area * { visibility: visible; }
      .output-area { 
        position: absolute; 
        left: 0; 
        top: 0; 
        width: 100%; 
        padding: 20px;
        box-shadow: none;
        border: none;
        background: white !important;
      }
      .output-actions-bar, .output-header { display: none !important; }
      .output-content { border: none; background: white; }
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
    }
  `;
  document.head.appendChild(style);
}

/**
 * Load API Key dari Firestore
 * STRUKTUR SAMA PERSIS DENGAN cp-tp-atp.js
 */
async function loadApiKeyFromFirestore() {
  try {
    // Path yang sama: settings/api_key
    const docRef = doc(firestore, 'settings', 'api_key');
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data.keys) {
        // Ambil semua keys yang active === true
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
    if (storedApiKey) {
      console.log('🔑 API Key prefix:', storedApiKey.substring(0, 10) + '...');
    }
  } catch (error) {
    console.error('❌ Error load API key:', error);
  }
}

function renderUI(container) {
  const aiReady = storedApiKey ? true : false;
  
  container.innerHTML = `
    <div class="gen-container">
      <div class="gen-header">
        <h2>🤖 Generator Modul Ajar AI</h2>
        <p>Isi parameter di bawah, biarkan AI menyusun draf Modul Ajar Kurikulum Merdeka untuk Anda.
          ${aiReady ? '<span style="display:inline-block; margin-left:10px; padding:4px 12px; background:rgba(255,255,255,0.2); border-radius:20px; font-size:13px; font-weight:600;">✅ AI Siap</span>' : '<span style="display:inline-block; margin-left:10px; padding:4px 12px; background:rgba(255,255,255,0.2); border-radius:20px; font-size:13px; font-weight:600;">⚠️ API Key Belum Aktif</span>'}
        </p>
      </div>

      <!-- Form Input -->
      <div class="gen-form">
        <div class="form-section-title">📋 1. Informasi Umum</div>
        <div class="form-grid">
          <div class="form-group">
            <label>👤 Nama Guru / Penyusun</label>
            <input type="text" id="inpGuru" class="form-control" placeholder="Nama Anda" value="${currentUser.namaLengkap || currentUser.nama || ''}">
          </div>
          <div class="form-group">
            <label>🏫 Satuan Pendidikan</label>
            <input type="text" id="inpSekolah" class="form-control" value="${currentUser.namaSekolah || 'SDN 139 LAMANDA'}">
          </div>
        </div>
        <div class="form-grid">
          <div class="form-group">
            <label>📚 Mata Pelajaran</label>
            <input type="text" id="inpMapel" class="form-control" placeholder="Contoh: Matematika">
          </div>
          <div class="form-group">
            <label> Kelas / Fase</label>
            <select id="inpKelas" class="form-control">
              <option value="1 (Fase A)">Kelas 1 (Fase A)</option>
              <option value="2 (Fase A)">Kelas 2 (Fase A)</option>
              <option value="3 (Fase B)">Kelas 3 (Fase B)</option>
              <option value="4 (Fase B)">Kelas 4 (Fase B)</option>
              <option value="5 (Fase C)">Kelas 5 (Fase C)</option>
              <option value="6 (Fase C)">Kelas 6 (Fase C)</option>
            </select>
          </div>
        </div>
        <div class="form-grid">
          <div class="form-group">
            <label>📝 Topik / Judul Modul</label>
            <input type="text" id="inpTopik" class="form-control" placeholder="Contoh: Bilangan Cacah sampai 100">
          </div>
          <div class="form-group">
            <label>⏰ Alokasi Waktu</label>
            <input type="text" id="inpWaktu" class="form-control" placeholder="Contoh: 4 x 35 Menit">
          </div>
        </div>

        <div class="form-section-title">📚 2. Komponen Inti</div>
        <div class="form-group">
          <label> Capaian Pembelajaran (CP) - <i>Opsional, AI bisa generate jika kosong</i></label>
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

      <!-- Loading State -->
      <div class="loading-overlay" id="loadingState">
        <div class="spinner"></div>
        <h3 style="color:#ec4899; margin-bottom:10px;">Sedang Menyusun Modul Ajar...</h3>
        <p style="color:#64748b; font-size:14px;">AI sedang menganalisis parameter dan menulis draf lengkap.<br>Mohon tunggu 15-45 detik.</p>
      </div>

      <!-- Output Result -->
      <div class="output-area" id="outputArea">
        <div class="output-header">
          <h3> Hasil Generate</h3>
          <span id="editIndicator" style="display:none; background:#fbbf24; color:#1e293b; padding:6px 14px; border-radius:20px; font-size:13px; font-weight:600;">️ Mode Edit Aktif</span>
        </div>
        <div class="output-content" id="outputContent"></div>
        
        <!-- Action Buttons di Bawah Output -->
        <div class="output-actions-bar">
          <button class="btn-action btn-print" id="btnPrint">️ Print</button>
          <button class="btn-action btn-save" id="btnSaveDb">💾 Simpan ke DB</button>
          <button class="btn-action btn-edit" id="btnEdit">✏️ Edit</button>
          <button class="btn-action btn-download" id="btnDownload">⬇️ Unduh</button>
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
  document.getElementById('btnDownload').addEventListener('click', handleDownload);
}

async function handleGenerate() {
  if (!storedApiKey) {
    alert('️ API Key tidak tersedia. Periksa konfigurasi di Firestore.');
    return;
  }

  const data = {
    guru: document.getElementById('inpGuru').value || '[Nama Guru]',
    sekolah: document.getElementById('inpSekolah').value || 'SDN 139 LAMANDA',
    mapel: document.getElementById('inpMapel').value,
    kelas: document.getElementById('inpKelas').value,
    topik: document.getElementById('inpTopik').value,
    waktu: document.getElementById('inpWaktu').value,
    cp: document.getElementById('inpCP').value || 'Sesuaikan dengan fase dan kelas yang dipilih.',
    model: document.getElementById('inpModel').value,
    karakteristik: document.getElementById('inpKarakteristik').value || 'Siswa reguler dengan kemampuan beragam.'
  };

  if (!data.mapel || !data.topik) {
    alert('⚠️ Mata Pelajaran dan Topik wajib diisi!');
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
    - Topik: ${data.topik}
    - Alokasi Waktu: ${data.waktu}
    - Model Pembelajaran: ${data.model}
    - Capaian Pembelajaran (CP): ${data.cp}
    - Karakteristik Siswa: ${data.karakteristik}

    INSTRUKSI OUTPUT:
    Buatkan modul ajar dengan struktur berikut (gunakan format Markdown dengan heading yang jelas):

    # MODUL AJAR: ${data.topik.toUpperCase()}

    ## A. INFORMASI UMUM
    1. Identitas Modul (Nama penyusun, institusi, tahun, mata pelajaran, kelas/fase, alokasi waktu)
    2. Kompetensi Awal
    3. Profil Pelajar Pancasila (PILIH 2-3 dimensi yang PALING RELEVAN dengan topik ini, jelaskan alasannya)
    4. Sarana dan Prasarana
    5. Target Peserta Didik
    6. Model Pembelajaran: ${data.model}

    ## B. KOMPONEN INTI
    1. Tujuan Pembelajaran (3-5 tujuan spesifik, terukur)
    2. Pemahaman Bermakna
    3. Pertanyaan Pemantik (3-5 pertanyaan esensial)
    4. Kegiatan Pembelajaran:
       - Pertemuan 1: (Pendahuluan 10 menit, Inti 50 menit, Penutup 10 menit) - JELaskan detail aktivitas guru dan siswa
       - Pertemuan 2: (jika alokasi waktu > 1x pertemuan)
    5. Asesmen (Diagnostik, Formatif, Sumatif)
    6. Pengayaan dan Remedial

    ## C. LAMPIRAN
    1. Lembar Kerja Peserta Didik (LKPD) - Buatkan 1 contoh LKPD sederhana
    2. Bahan Bacaan Guru dan Peserta Didik
    3. Glosarium (5-10 istilah penting)
    4. Daftar Pustaka

    CATATAN PENTING:
    - Gunakan bahasa Indonesia formal dan edukatif
    - Sesuaikan dengan fase perkembangan siswa (${data.kelas})
    - Kegiatan pembelajaran harus AKTIF, kreatif, dan berpusat pada siswa
    - Asesmen harus autentik dan beragam
    - Pastikan alur kegiatan logis dan terukur waktunya
  `;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${storedApiKey}`
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
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
  if (!content) {
    alert('Tidak ada konten untuk dicetak!');
    return;
  }
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
    showToast('✏️ Mode Edit aktif. Klik "Selesai Edit" setelah selesai.');
  }
}

function exitEditMode() {
  const contentEl = document.getElementById('outputContent');
  const editBtn = document.getElementById('btnEdit');
  const indicator = document.getElementById('editIndicator');
  
  contentEl.contentEditable = false;
  contentEl.classList.remove('editing');
  editBtn.innerHTML = '️ Edit';
  editBtn.classList.remove('active');
  indicator.style.display = 'none';
}

function handleDownload() {
  const content = document.getElementById('outputContent').innerText;
  if (!content) {
    alert('Tidak ada konten untuk diunduh!');
    return;
  }

  exitEditMode();

  const topik = document.getElementById('inpTopik').value || 'Modul-Ajar';
  const mapel = document.getElementById('inpMapel').value || 'Umum';
  const kelas = document.getElementById('inpKelas').value.split(' ')[0] || 'X';
  
  const header = `
===============================================
MODUL AJAR KURIKULUM MERDEKA
===============================================
Mata Pelajaran : ${mapel}
Kelas/Fase     : ${kelas}
Topik          : ${topik}
Sekolah        : ${document.getElementById('inpSekolah').value}
Penyusun       : ${document.getElementById('inpGuru').value}
Tanggal Generate: ${new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
===============================================

`;

  const fullContent = header + content;
  const blob = new Blob([fullContent], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Modul-Ajar-${mapel}-Kelas${kelas}-${topik.replace(/\s+/g, '-')}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  showToast('📥 File berhasil diunduh!');
}

async function saveToDatabase() {
  const content = document.getElementById('outputContent').innerText;
  if (!content) {
    alert('Tidak ada konten untuk disimpan!');
    return;
  }

  const mapel = document.getElementById('inpMapel').value || 'Umum';
  const topik = document.getElementById('inpTopik').value || 'Tanpa Judul';
  const kelas = document.getElementById('inpKelas').value;
  const guru = document.getElementById('inpGuru').value || currentUser.nama || 'Anonim';

  if (!confirm(`Simpan modul ajar ini ke database?\n\nMapel: ${mapel}\nTopik: ${topik}\nKelas: ${kelas}`)) {
    return;
  }

  try {
    const newRef = push(ref(database, 'modulAjar'));
    await set(newRef, {
      judul: topik,
      mapel: mapel,
      kelas: kelas.split(' ')[0],
      fase: kelas.includes('A') ? 'A' : kelas.includes('B') ? 'B' : 'C',
      guru: guru,
      sekolah: document.getElementById('inpSekolah').value,
      model: document.getElementById('inpModel').value,
      konten: content,
      createdAt: Date.now(),
      createdBy: currentUser.uid || 'unknown'
    });

    showToast('💾 Modul ajar berhasil disimpan ke database!');
  } catch (error) {
    alert('Gagal menyimpan: ' + error.message);
  }
}

function showToast(msg) {
  const toast = document.createElement('div');
  toast.textContent = msg;
  toast.style.cssText = `position: fixed; top: 20px; right: 20px; background: #ec4899; color: white; padding: 14px 24px; border-radius: 10px; z-index: 10001; box-shadow: 0 4px 16px rgba(236, 72, 153, 0.4); font-weight: 600; font-size: 14px; animation: slideIn 0.3s ease;`;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
