// modules/admin-pembelajaran/features/modul-ajar.js
// =========================================
// FITUR: GENERATOR MODUL AJAR (AI POWERED)
// API Key otomatis dari Firestore
// =========================================

import { db } from '../../../js/firebase-config.js';
import { getDatabase, ref, get } 
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { getFirestore, doc, getDoc } 
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
const database = getDatabase();
const firestore = getFirestore();

// State
const CSS_ID = 'modul-ajar-gen-css';
let storedApiKey = '';

/**
 * Init
 */
export async function init(container, db) {
  loadCSS();
  renderUI(container);
  attachEvents();
  await loadApiKeyFromFirestore();
}

export function cleanup() {
  const css = document.getElementById(CSS_ID);
  if (css) css.remove();
}

/**
 * Load API Key dari Firestore
 * Path: config/apiKeys -> sama seperti alur ct-tp-atp
 */
async function loadApiKeyFromFirestore() {
  const statusEl = document.getElementById('apiStatus');
  const btnGenerate = document.getElementById('btnGenerate');
  
  if (!statusEl) return;
  
  try {
    // Coba path 1: config/apiKeys (global)
    const configRef = doc(firestore, 'config', 'apiKeys');
    const configSnap = await getDoc(configRef);
    
    if (configSnap.exists()) {
      const data = configSnap.data();
      storedApiKey = data.openai || data.gemini || data.ai || '';
    }
    
    // Jika kosong, coba path 2: users/{uid}/settings
    if (!storedApiKey && currentUser.uid) {
      const userRef = doc(firestore, 'users', currentUser.uid, 'settings', 'apiKeys');
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        storedApiKey = userSnap.data().key || '';
      }
    }
    
    // Jika masih kosong, coba RTDB sebagai fallback
    if (!storedApiKey) {
      const rtdbSnap = await get(ref(database, 'config/apiKey'));
      if (rtdbSnap.exists()) {
        storedApiKey = rtdbSnap.val();
      }
    }
    
    if (storedApiKey) {
      statusEl.innerHTML = '✅ <span style="color:#10b981; font-weight:600;">API Key terhubung otomatis dari sistem</span>';
      if (btnGenerate) btnGenerate.disabled = false;
    } else {
      statusEl.innerHTML = '⚠️ <span style="color:#f59e0b; font-weight:600;">API Key belum dikonfigurasi. Hubungi Admin untuk setup di Control Center.</span>';
      if (btnGenerate) btnGenerate.disabled = true;
    }
  } catch (error) {
    console.error('Error load API Key:', error);
    statusEl.innerHTML = '❌ <span style="color:#ef4444;">Gagal memuat API Key: ' + error.message + '</span>';
    if (btnGenerate) btnGenerate.disabled = true;
  }
}

function loadCSS() {
  if (document.getElementById(CSS_ID)) return;
  const style = document.createElement('style');
  style.id = CSS_ID;
  style.textContent = `
    .gen-container { background: #f8fafc; border-radius: 12px; padding: 20px; font-family: 'Segoe UI', sans-serif; max-width: 1000px; margin: 0 auto; }
    .gen-header { background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: white; padding: 25px; border-radius: 12px; margin-bottom: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    .gen-header h2 { margin: 0 0 5px 0; font-size: 24px; }
    .gen-header p { margin: 0; opacity: 0.9; font-size: 14px; }
    
    /* API Status Bar */
    .api-status-bar { background: white; padding: 12px 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #10b981; font-size: 13px; display: flex; align-items: center; gap: 10px; }
    
    /* Form Layout */
    .gen-form { background: white; padding: 25px; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
    .form-section-title { font-size: 16px; font-weight: 700; color: #4f46e5; margin: 20px 0 15px 0; border-bottom: 2px solid #e0e7ff; padding-bottom: 5px; }
    .form-section-title:first-child { margin-top: 0; }
    
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px; }
    .form-group { margin-bottom: 15px; }
    .form-group label { display: block; margin-bottom: 6px; font-weight: 600; font-size: 13px; color: #334155; }
    .form-control { width: 100%; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px; box-sizing: border-box; transition: border-color 0.2s; }
    .form-control:focus { outline: none; border-color: #4f46e5; box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1); }
    textarea.form-control { resize: vertical; min-height: 80px; }
    
    /* Action Button */
    .gen-action { margin-top: 25px; text-align: center; }
    .btn-generate { background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: white; border: none; padding: 15px 40px; border-radius: 8px; font-size: 16px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3); transition: transform 0.2s; display: inline-flex; align-items: center; gap: 10px; }
    .btn-generate:hover:not(:disabled) { transform: translateY(-2px); }
    .btn-generate:disabled { opacity: 0.5; cursor: not-allowed; background: #9ca3af; box-shadow: none; }
    
    /* Loading */
    .loading-overlay { display: none; text-align: center; padding: 40px; background: white; border-radius: 12px; margin-top: 20px; }
    .spinner { border: 4px solid #f3f3f3; border-top: 4px solid #4f46e5; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto 15px; }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    
    /* Output Area */
    .output-area { display: none; margin-top: 20px; background: white; border-radius: 12px; padding: 30px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; }
    .output-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 2px solid #f1f5f9; padding-bottom: 15px; flex-wrap: wrap; gap: 10px; }
    .output-actions { display: flex; gap: 10px; }
    .output-content { line-height: 1.7; color: #334155; font-size: 14px; white-space: pre-wrap; font-family: 'Segoe UI', sans-serif; }
    .output-content h1 { font-size: 20px; color: #1e293b; border-bottom: 2px solid #4f46e5; padding-bottom: 8px; }
    .output-content h2 { font-size: 17px; color: #4f46e5; margin-top: 20px; }
    .output-content h3 { font-size: 15px; color: #6366f1; margin-top: 15px; }
    .output-content ul, .output-content ol { padding-left: 25px; }
    .output-content li { margin-bottom: 5px; }
    .btn-copy { background: #0ea5e9; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 13px; }
    .btn-copy:hover { background: #0284c7; }
    .btn-save-db { background: #10b981; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 13px; }
    .btn-save-db:hover { background: #059669; }
    
    @media (max-width: 768px) { 
      .form-grid { grid-template-columns: 1fr; } 
      .output-header { flex-direction: column; align-items: flex-start; }
    }
  `;
  document.head.appendChild(style);
}

function renderUI(container) {
  container.innerHTML = `
    <div class="gen-container">
      <div class="gen-header">
        <h2>🤖 Generator Modul Ajar AI</h2>
        <p>Isi parameter di bawah, biarkan AI menyusun draf Modul Ajar Kurikulum Merdeka untuk Anda.</p>
      </div>

      <!-- API Status (Auto-load dari Firestore) -->
      <div class="api-status-bar" id="apiStatus">
        ⏳ Memeriksa koneksi API Key...
      </div>

      <!-- Form Input (Format Baku) -->
      <div class="gen-form">
        <div class="form-section-title">📋 1. Informasi Umum</div>
        <div class="form-grid">
          <div class="form-group">
            <label>Nama Guru / Penyusun</label>
            <input type="text" id="inpGuru" class="form-control" placeholder="Nama Anda">
          </div>
          <div class="form-group">
            <label>Satuan Pendidikan</label>
            <input type="text" id="inpSekolah" class="form-control" value="SDN 139 LAMANDA">
          </div>
        </div>
        <div class="form-grid">
          <div class="form-group">
            <label>Mata Pelajaran</label>
            <input type="text" id="inpMapel" class="form-control" placeholder="Contoh: Matematika">
          </div>
          <div class="form-group">
            <label>Kelas / Fase</label>
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
            <label>Topik / Judul Modul</label>
            <input type="text" id="inpTopik" class="form-control" placeholder="Contoh: Bilangan Cacah sampai 100">
          </div>
          <div class="form-group">
            <label>Alokasi Waktu</label>
            <input type="text" id="inpWaktu" class="form-control" placeholder="Contoh: 4 x 35 Menit">
          </div>
        </div>

        <div class="form-section-title"> 2. Komponen Inti</div>
        <div class="form-group">
          <label>Capaian Pembelajaran (CP) - <i>Opsional, AI bisa generate jika kosong</i></label>
          <textarea id="inpCP" class="form-control" rows="3" placeholder="Paste CP dari kurikulum atau biarkan kosong..."></textarea>
        </div>
        
        <div class="form-group">
          <label>Model Pembelajaran</label>
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
          <label>Karakteristik Siswa (Opsional)</label>
          <textarea id="inpKarakteristik" class="form-control" rows="2" placeholder="Contoh: Siswa aktif, suka bermain, kemampuan beragam..."></textarea>
        </div>

        <div class="gen-action">
          <button class="btn-generate" id="btnGenerate" disabled>
            <span>✨</span> Generate Modul Ajar
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div class="loading-overlay" id="loadingState">
        <div class="spinner"></div>
        <h3 style="color:#4f46e5; margin-bottom:10px;">Sedang Menyusun Modul Ajar...</h3>
        <p style="color:#64748b; font-size:13px;">AI sedang menganalisis parameter dan menulis draf lengkap.<br>Mohon tunggu 15-45 detik.</p>
      </div>

      <!-- Output Result -->
      <div class="output-area" id="outputArea">
        <div class="output-header">
          <h3 style="margin:0; color:#1e293b;">📄 Hasil Generate</h3>
          <div class="output-actions">
            <button class="btn-save-db" id="btnSaveDb">💾 Simpan ke DB</button>
            <button class="btn-copy" id="btnCopy">📋 Salin Teks</button>
          </div>
        </div>
        <div class="output-content" id="outputContent"></div>
      </div>
    </div>
  `;
}

function attachEvents() {
  // Generate Action
  document.getElementById('btnGenerate').addEventListener('click', handleGenerate);

  // Copy Action
  document.getElementById('btnCopy').addEventListener('click', () => {
    const text = document.getElementById('outputContent').innerText;
    navigator.clipboard.writeText(text).then(() => {
      showToast('✅ Teks berhasil disalin ke clipboard!');
    });
  });

  // Save to DB Action
  document.getElementById('btnSaveDb').addEventListener('click', saveToDatabase);
}

async function handleGenerate() {
  if (!storedApiKey) {
    alert('⚠️ API Key belum tersedia. Hubungi Admin untuk konfigurasi.');
    return;
  }

  // Gather Data
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

  // UI Loading
  document.getElementById('loadingState').style.display = 'block';
  document.getElementById('outputArea').style.display = 'none';
  document.getElementById('btnGenerate').disabled = true;

  // Construct Prompt (Profil Pancasila dihapus dari input, AI auto-select)
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
    // Call AI (OpenAI Compatible Format)
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

    // Render Output
    document.getElementById('outputContent').innerText = aiText;
    document.getElementById('outputArea').style.display = 'block';
    
    // Scroll ke output
    document.getElementById('outputArea').scrollIntoView({ behavior: 'smooth', block: 'start' });

  } catch (error) {
    alert('❌ Error: ' + error.message);
    console.error(error);
  } finally {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('btnGenerate').disabled = false;
  }
}

/**
 * Simpan hasil generate ke Firebase RTDB
 */
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
      kelas: kelas.split(' ')[0], // Ambil angka kelas saja
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
  toast.style.cssText = `position: fixed; top: 20px; right: 20px; background: #10b981; color: white; padding: 12px 20px; border-radius: 8px; z-index: 10001; box-shadow: 0 4px 12px rgba(0,0,0,0.15); animation: slideIn 0.3s ease;`;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
