// modules/admin-pembelajaran/features/modul-ajar.js
// =========================================
// FITUR: GENERATOR MODUL AJAR (AI POWERED)
// =========================================

import { db } from '../../../js/firebase-config.js';

// State
const CSS_ID = 'modul-ajar-gen-css';
let isGenerating = false;

/**
 * Init
 */
export async function init(container, db) {
  loadCSS();
  renderUI(container);
  attachEvents();
  loadSavedApiKey();
}

export function cleanup() {
  const css = document.getElementById(CSS_ID);
  if (css) css.remove();
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
    
    /* API Key Section */
    .api-section { background: white; padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #e2e8f0; display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
    .api-input { flex: 1; min-width: 200px; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; }
    .api-save-btn { background: #10b981; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: 600; }
    
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
    
    /* Checkbox Group */
    .checkbox-group { display: flex; flex-wrap: wrap; gap: 10px; }
    .checkbox-item { display: flex; align-items: center; gap: 6px; background: #f1f5f9; padding: 6px 12px; border-radius: 20px; font-size: 13px; cursor: pointer; }
    .checkbox-item input { cursor: pointer; }
    
    /* Action Button */
    .gen-action { margin-top: 25px; text-align: center; }
    .btn-generate { background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: white; border: none; padding: 15px 40px; border-radius: 8px; font-size: 16px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3); transition: transform 0.2s; display: inline-flex; align-items: center; gap: 10px; }
    .btn-generate:hover:not(:disabled) { transform: translateY(-2px); }
    .btn-generate:disabled { opacity: 0.7; cursor: not-allowed; }
    
    /* Loading */
    .loading-overlay { display: none; text-align: center; padding: 40px; background: white; border-radius: 12px; margin-top: 20px; }
    .spinner { border: 4px solid #f3f3f3; border-top: 4px solid #4f46e5; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto 15px; }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    
    /* Output Area */
    .output-area { display: none; margin-top: 20px; background: white; border-radius: 12px; padding: 30px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; }
    .output-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 2px solid #f1f5f9; padding-bottom: 15px; }
    .output-content { line-height: 1.6; color: #334155; font-size: 14px; white-space: pre-wrap; }
    .output-content h1, .output-content h2, .output-content h3 { color: #1e293b; margin-top: 20px; }
    .btn-copy { background: #0ea5e9; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: 600; }
    
    @media (max-width: 768px) { .form-grid { grid-template-columns: 1fr; } }
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

      <!-- API Key Config -->
      <div class="api-section">
        <label style="font-weight:600; font-size:13px;"> API Key (OpenAI/Gemini):</label>
        <input type="password" id="apiKeyInput" class="api-input" placeholder="sk-... atau AIza...">
        <button class="api-save-btn" id="btnSaveKey">Simpan Key</button>
      </div>

      <!-- Form Input (Format Baku) -->
      <div class="gen-form">
        <div class="form-section-title">1. Informasi Umum</div>
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

        <div class="form-section-title">2. Komponen Inti & Profil Pelajar Pancasila</div>
        <div class="form-group">
          <label>Capaian Pembelajaran (CP) - <i>Opsional, AI bisa generate jika kosong</i></label>
          <textarea id="inpCP" class="form-control" rows="3" placeholder="Paste CP dari kurikulum atau biarkan kosong..."></textarea>
        </div>
        
        <div class="form-group">
          <label>Dimensi Profil Pelajar Pancasila (Pilih yang relevan)</label>
          <div class="checkbox-group">
            <label class="checkbox-item"><input type="checkbox" value="Beriman, Bertakwa kepada Tuhan YME, dan Berakhlak Mulia"> Beriman & Bertakwa</label>
            <label class="checkbox-item"><input type="checkbox" value="Berkebinekaan Global"> Berkebinekaan Global</label>
            <label class="checkbox-item"><input type="checkbox" value="Bergotong Royong"> Bergotong Royong</label>
            <label class="checkbox-item"><input type="checkbox" value="Mandiri"> Mandiri</label>
            <label class="checkbox-item"><input type="checkbox" value="Bernalar Kritis"> Bernalar Kritis</label>
            <label class="checkbox-item"><input type="checkbox" value="Kreatif"> Kreatif</label>
          </div>
        </div>

        <div class="form-group">
          <label>Model Pembelajaran</label>
          <select id="inpModel" class="form-control">
            <option value="Problem Based Learning (PBL)">Problem Based Learning (PBL)</option>
            <option value="Project Based Learning (PjBL)">Project Based Learning (PjBL)</option>
            <option value="Discovery Learning">Discovery Learning</option>
            <option value="Inquiry Learning">Inquiry Learning</option>
            <option value="Tatap Muka Klasikal">Tatap Muka Klasikal</option>
          </select>
        </div>

        <div class="gen-action">
          <button class="btn-generate" id="btnGenerate">
            <span>✨</span> Generate Modul Ajar
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div class="loading-overlay" id="loadingState">
        <div class="spinner"></div>
        <h3 style="color:#4f46e5; margin-bottom:10px;">Sedang Menyusun Modul Ajar...</h3>
        <p style="color:#64748b; font-size:13px;">AI sedang menganalisis parameter dan menulis draf lengkap.<br>Mohon tunggu 10-30 detik.</p>
      </div>

      <!-- Output Result -->
      <div class="output-area" id="outputArea">
        <div class="output-header">
          <h3 style="margin:0; color:#1e293b;">📄 Hasil Generate</h3>
          <button class="btn-copy" id="btnCopy">📋 Salin Teks</button>
        </div>
        <div class="output-content" id="outputContent"></div>
      </div>
    </div>
  `;
}

function attachEvents() {
  // Save API Key
  document.getElementById('btnSaveKey').addEventListener('click', () => {
    const key = document.getElementById('apiKeyInput').value.trim();
    if (key) {
      localStorage.setItem('ai_api_key', key);
      alert('✅ API Key disimpan di browser Anda.');
    }
  });

  // Generate Action
  document.getElementById('btnGenerate').addEventListener('click', handleGenerate);

  // Copy Action
  document.getElementById('btnCopy').addEventListener('click', () => {
    const text = document.getElementById('outputContent').innerText;
    navigator.clipboard.writeText(text).then(() => {
      alert('✅ Teks berhasil disalin!');
    });
  });
}

function loadSavedApiKey() {
  const savedKey = localStorage.getItem('ai_api_key');
  if (savedKey) {
    document.getElementById('apiKeyInput').value = savedKey;
  }
}

async function handleGenerate() {
  const apiKey = document.getElementById('apiKeyInput').value.trim();
  if (!apiKey) {
    alert('️ Masukkan API Key terlebih dahulu!');
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
    cp: document.getElementById('inpCP').value || 'Biarkan AI yang menyesuaikan dengan fase.',
    model: document.getElementById('inpModel').value,
    profil: Array.from(document.querySelectorAll('.checkbox-group input:checked')).map(cb => cb.value).join(', ')
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
    Buatkan draf MODUL AJAR lengkap berdasarkan data berikut:
    
    - Penyusun: ${data.guru}
    - Sekolah: ${data.sekolah}
    - Mata Pelajaran: ${data.mapel}
    - Kelas/Fase: ${data.kelas}
    - Topik: ${data.topik}
    - Alokasi Waktu: ${data.waktu}
    - Model Pembelajaran: ${data.model}
    - Profil Pelajar Pancasila: ${data.profil || 'Pilih yang paling relevan'}
    - Capaian Pembelajaran (CP): ${data.cp}

    Format output harus terstruktur dengan jelas (gunakan Markdown/Heading) mencakup:
    1. INFORMASI UMUM (Identitas, Kompetensi Awal, Profil Pelajar Pancasila, Sarana Prasarana, Target Peserta Didik).
    2. KOMPONEN INTI (Tujuan Pembelajaran, Pemahaman Bermakna, Pertanyaan Pemantik, Kegiatan Pembelajaran [Pendahuluan, Inti, Penutup], Asesmen, Pengayaan & Remedial).
    3. LAMPIRAN (LKPD sederhana, Bahan Bacaan, Glosarium, Daftar Pustaka).
    
    Pastikan bahasa Indonesia yang digunakan formal, edukatif, dan sesuai kaidah kurikulum.
  `;

  try {
    // Call AI (Using OpenAI Compatible Format - Works for OpenAI, Groq, etc.)
    // Note: If using Gemini, the endpoint and payload structure differs slightly.
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo", // Or gpt-4o-mini
        messages: [
          { role: "system", content: "Anda adalah ahli pendidikan dan pengembang kurikulum." },
          { role: "user", content: prompt }
        ],
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error?.message || 'Gagal menghubungi API');
    }

    const result = await response.json();
    const aiText = result.choices[0].message.content;

    // Render Output
    document.getElementById('outputContent').innerText = aiText; // Using innerText to preserve formatting safely
    document.getElementById('outputArea').style.display = 'block';

  } catch (error) {
    alert('❌ Error: ' + error.message);
    console.error(error);
  } finally {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('btnGenerate').disabled = false;
  }
}
