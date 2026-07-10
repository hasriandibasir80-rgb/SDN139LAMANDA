// modules/admin-pembelajaran/features/modul-ajar.js
// =========================================
// FITUR: GENERATOR MODUL AJAR (AI POWERED)
// API Key otomatis dari Firestore
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
const CSS_PATH = '../../../css/modules/modul-ajar.css';
const CSS_ID = 'modul-ajar-css';
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
 * Load CSS Eksternal
 */
function loadCSS() {
  if (document.getElementById(CSS_ID)) return;
  
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = CSS_PATH;
  link.id = CSS_ID;
  document.head.appendChild(link);
}

/**
 * Load API Key dari Firestore (Clean & Direct)
 */
async function loadApiKeyFromFirestore() {
  try {
    // Ambil dari path config/apiKeys di Firestore
    const configRef = doc(firestore, 'config', 'apiKeys');
    const configSnap = await getDoc(configRef);
    
    if (configSnap.exists()) {
      const data = configSnap.data();
      storedApiKey = data.openai || data.gemini || data.ai || '';
    }
    
    // Jika API key ditemukan, aktifkan tombol generate
    const btnGenerate = document.getElementById('btnGenerate');
    if (btnGenerate) {
      btnGenerate.disabled = !storedApiKey;
    }
    
    console.log('✅ API Key loaded:', storedApiKey ? 'Available' : 'Not found');
  } catch (error) {
    console.error('Error load API Key:', error);
  }
}

function renderUI(container) {
  container.innerHTML = `
    <div class="gen-container">
      <div class="gen-header">
        <h2>🤖 Generator Modul Ajar AI</h2>
        <p>Isi parameter di bawah, biarkan AI menyusun draf Modul Ajar Kurikulum Merdeka untuk Anda.</p>
      </div>

      <!-- Form Input (Format Baku) -->
      <div class="gen-form">
        <div class="form-section-title"> 1. Informasi Umum</div>
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
          <span id="editIndicator" style="display:none; background:#fbbf24; color:#1e293b; padding:4px 12px; border-radius:20px; font-size:12px; font-weight:600;">✏️ Mode Edit Aktif</span>
        </div>
        <div class="output-content" id="outputContent"></div>
        
        <!-- Action Buttons di Bawah Output -->
        <div class="output-actions-bar">
          <button class="btn-action btn-print" id="btnPrint">🖨️ Print</button>
          <button class="btn-action btn-save" id="btnSaveDb">💾 Simpan ke DB</button>
          <button class="btn-action btn-edit" id="btnEdit">✏️ Edit</button>
          <button class="btn-action btn-download" id="btnDownload">⬇️ Unduh</button>
        </div>
      </div>
    </div>
  `;
}

function attachEvents() {
  // Generate Action
  document.getElementById('btnGenerate').addEventListener('click', handleGenerate);

  // Print Action
  document.getElementById('btnPrint').addEventListener('click', handlePrint);

  // Save to DB Action
  document.getElementById('btnSaveDb').addEventListener('click', saveToDatabase);

  // Edit Action (Toggle)
  document.getElementById('btnEdit').addEventListener('click', toggleEditMode);

  // Download Action
  document.getElementById('btnDownload').addEventListener('click', handleDownload);
}

async function handleGenerate() {
  if (!storedApiKey) {
    alert('⚠️ API Key tidak tersedia.');
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

  // Construct Prompt
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
    alert(' Error: ' + error.message);
    console.error(error);
  } finally {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('btnGenerate').disabled = false;
  }
}

/**
 * Print Modul Ajar
 */
function handlePrint() {
  const content = document.getElementById('outputContent').innerText;
  if (!content) {
    alert('Tidak ada konten untuk dicetak!');
    return;
  }
  
  // Exit edit mode jika aktif
  exitEditMode();
  
  window.print();
}

/**
 * Toggle Edit Mode (Content Editable)
 */
function toggleEditMode() {
  const contentEl = document.getElementById('outputContent');
  const editBtn = document.getElementById('btnEdit');
  const indicator = document.getElementById('editIndicator');
  
  if (contentEl.isContentEditable) {
    // Exit Edit Mode
    exitEditMode();
    showToast('✅ Perubahan disimpan (lokal)');
  } else {
    // Enter Edit Mode
    contentEl.contentEditable = true;
    contentEl.classList.add('editing');
    contentEl.focus();
    editBtn.innerHTML = '✅ Selesai Edit';
    editBtn.classList.add('active');
    indicator.style.display = 'inline-block';
    showToast('✏️ Mode Edit aktif. Klik "Selesai Edit" setelah selesai.');
  }
}

/**
 * Exit Edit Mode
 */
function exitEditMode() {
  const contentEl = document.getElementById('outputContent');
  const editBtn = document.getElementById('btnEdit');
  const indicator = document.getElementById('editIndicator');
  
  contentEl.contentEditable = false;
  contentEl.classList.remove('editing');
  editBtn.innerHTML = '✏️ Edit';
  editBtn.classList.remove('active');
  indicator.style.display = 'none';
}

/**
 * Download Modul Ajar (Format .txt)
 */
function handleDownload() {
  const content = document.getElementById('outputContent').innerText;
  if (!content) {
    alert('Tidak ada konten untuk diunduh!');
    return;
  }

  // Exit edit mode jika aktif
  exitEditMode();

  const topik = document.getElementById('inpTopik').value || 'Modul-Ajar';
  const mapel = document.getElementById('inpMapel').value || 'Umum';
  const kelas = document.getElementById('inpKelas').value.split(' ')[0] || 'X';
  
  // Buat konten dengan header
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
  
  // Buat blob dan download
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
      kelas: kelas.split(' ')[0],
      fase: kelas.includes('A') ? 'A' : kelas.includes('B') ? 'B' : 'C',
      guru: guru,
      sekolah: document.getElementById('inpSekolah').value,
      model: document.getElementById('inpModel').value,
      konten: content,
      createdAt: Date.now(),
      createdBy: currentUser.uid || 'unknown'
    });

    showToast(' Modul ajar berhasil disimpan ke database!');
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
