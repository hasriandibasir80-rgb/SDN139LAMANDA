// modules/admin-pembelajaran/features/rumus-8-3-3-4.js
// =========================================
// FITUR: RUMUS 8-3-3-4 (KERANGKA PEMBELAJARAN MENDALAM)
// MANDIRI - TIDAK BERGANTUNG CSS PARENT
// =========================================

const CSS_ID = 'rumus-8334-css';

export async function init(container, db) {
  loadCSS();
  renderUI(container);
  attachEvents(container);
  loadCatatanGuru();
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
    .rumus-container { 
      background: linear-gradient(135deg, #fce7f3 0%, #fbcfe8 50%, #e0e7ff 100%);
      border-radius: 16px; 
      padding: 30px; 
      font-family: 'Segoe UI', sans-serif; 
      max-width: 1200px; 
      margin: 0 auto;
      box-shadow: 0 8px 24px rgba(236, 72, 153, 0.15);
    }
    .rumus-header { 
      background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); 
      color: white; 
      padding: 30px; 
      border-radius: 12px; 
      margin-bottom: 25px; 
      text-align: center;
      box-shadow: 0 4px 12px rgba(236, 72, 153, 0.3); 
    }
    .rumus-header h2 { margin: 0 0 10px 0; font-size: 28px; font-weight: 800; }
    .rumus-header p { margin: 0; opacity: 0.95; font-size: 15px; }
    
    .rumus-grid { 
      display: grid; 
      grid-template-columns: repeat(2, 1fr); 
      gap: 25px; 
      margin-bottom: 30px;
    }
    
    .rumus-card { 
      background: rgba(255, 255, 255, 0.95); 
      border-radius: 16px; 
      padding: 25px; 
      box-shadow: 0 4px 16px rgba(236, 72, 153, 0.1);
      border-top: 5px solid #ec4899;
      transition: transform 0.2s;
    }
    .rumus-card:hover { transform: translateY(-3px); }
    .rumus-card.prinsip { border-top-color: #10b981; }
    .rumus-card.pengalaman { border-top-color: #f59e0b; }
    .rumus-card.kerangka { border-top-color: #3b82f6; }
    
    .rumus-card-title { 
      font-size: 20px; 
      font-weight: 800; 
      color: #1e293b; 
      margin: 0 0 20px 0; 
      display: flex; 
      align-items: center; 
      gap: 10px;
    }
    .rumus-card-title .badge {
      background: #ec4899;
      color: white;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
    }
    .rumus-card.prinsip .badge { background: #10b981; }
    .rumus-card.pengalaman .badge { background: #f59e0b; }
    .rumus-card.kerangka .badge { background: #3b82f6; }
    
    .rumus-list { list-style: none; padding: 0; margin: 0; }
    .rumus-list li { 
      padding: 12px 15px; 
      margin-bottom: 10px; 
      background: #fff1f2; 
      border-radius: 8px; 
      border-left: 4px solid #ec4899;
      font-size: 14px;
      line-height: 1.5;
      color: #334155;
    }
    .rumus-card.prinsip .rumus-list li { background: #f0fdf4; border-left-color: #10b981; }
    .rumus-card.pengalaman .rumus-list li { background: #fffbeb; border-left-color: #f59e0b; }
    .rumus-card.kerangka .rumus-list li { background: #eff6ff; border-left-color: #3b82f6; }
    
    .rumus-list strong { color: #1e293b; display: block; margin-bottom: 4px; font-size: 15px; }
    
    .rumus-notes {
      background: white;
      border-radius: 16px;
      padding: 25px;
      box-shadow: 0 4px 16px rgba(236, 72, 153, 0.1);
      margin-top: 20px;
    }
    .rumus-notes h3 { margin: 0 0 15px 0; color: #be185d; font-size: 18px; }
    .rumus-textarea {
      width: 100%;
      min-height: 120px;
      padding: 15px;
      border: 2px solid #fbcfe8;
      border-radius: 12px;
      font-family: inherit;
      font-size: 14px;
      resize: vertical;
      box-sizing: border-box;
    }
    .rumus-textarea:focus { outline: none; border-color: #ec4899; box-shadow: 0 0 0 3px rgba(236, 72, 153, 0.15); }
    
    .rumus-actions {
      display: flex;
      gap: 15px;
      margin-top: 25px;
      justify-content: center;
      flex-wrap: wrap;
    }
    .rumus-btn {
      padding: 12px 24px;
      border: none;
      border-radius: 10px;
      font-weight: 600;
      font-size: 15px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      color: white;
      transition: all 0.2s;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }
    .rumus-btn:hover { transform: translateY(-2px); }
    .rumus-btn-print { background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); }
    .rumus-btn-save { background: linear-gradient(135deg, #10b981 0%, #059669 100%); }
    
    @media print {
      body * { visibility: hidden; }
      .rumus-container, .rumus-container * { visibility: visible; }
      .rumus-container { position: absolute; left: 0; top: 0; width: 100%; padding: 20px; background: white !important; box-shadow: none; }
      .rumus-actions, .rumus-notes { display: none !important; }
      .rumus-grid { grid-template-columns: 1fr 1fr; gap: 15px; }
      .rumus-card { break-inside: avoid; border: 1px solid #ccc; }
    }
    @media (max-width: 768px) {
      .rumus-container { padding: 15px; }
      .rumus-grid { grid-template-columns: 1fr; }
      .rumus-actions { flex-direction: column; }
      .rumus-btn { width: 100%; justify-content: center; }
    }
  `;
  document.head.appendChild(style);
}

function renderUI(container) {
  container.innerHTML = `
    <div class="rumus-container">
      <div class="rumus-header">
        <h2>🔢 Rumus 8-3-3-4</h2>
        <p>Kerangka Kerja Pembelajaran Mendalam (Deep Learning) untuk Menciptakan Profil Lulusan Abad 21</p>
      </div>

      <div class="rumus-grid">
        <!-- 8 Dimensi -->
        <div class="rumus-card">
          <div class="rumus-card-title">
            <span class="badge">8</span> Dimensi Profil Lulusan
          </div>
          <ul class="rumus-list">
            <li><strong>🕌 Beriman & Bertakwa</strong> kepada Tuhan Yang Maha Esa.</li>
            <li><strong>🇮 Kewargaan</strong> yang baik dan cinta tanah air.</li>
            <li><strong>🧠 Penalaran Kritis</strong> dalam menganalisis dan memecahkan masalah.</li>
            <li><strong>💡 Kreativitas</strong> dalam menghasilkan ide orisinal.</li>
            <li><strong>🤝 Kolaborasi</strong> atau kemampuan bekerja sama.</li>
            <li><strong>🚀 Kemandirian</strong> dalam proses belajar.</li>
            <li><strong>❤️ Kesehatan</strong> fisik dan mental.</li>
            <li><strong>🗣️ Komunikasi</strong> yang efektif.</li>
          </ul>
        </div>

        <!-- 3 Prinsip -->
        <div class="rumus-card prinsip">
          <div class="rumus-card-title">
            <span class="badge">3</span> Prinsip Pembelajaran
          </div>
          <ul class="rumus-list">
            <li><strong>🧘 Berkesadaran (Mindful)</strong><br>Siswa memahami tujuan belajar dan terlibat secara aktif (bukan sekadar menggugurkan kewajiban).</li>
            <li><strong>🎯 Bermakna</strong><br>Materi relevan dan terhubung langsung dengan kehidupan nyata siswa.</li>
            <li><strong>😊 Menggembirakan</strong><br>Suasana kelas menyenangkan dan membangkitkan motivasi intrinsik anak.</li>
          </ul>
        </div>

        <!-- 3 Pengalaman -->
        <div class="rumus-card pengalaman">
          <div class="rumus-card-title">
            <span class="badge">3</span> Pengalaman Belajar
          </div>
          <ul class="rumus-list">
            <li><strong> 1. Memahami</strong><br>Menginternalisasi informasi dan konsep baru.</li>
            <li><strong>🛠️ 2. Mengaplikasikan</strong><br>Menerapkan pengetahuan tersebut dalam situasi atau masalah dunia nyata.</li>
            <li><strong>🔄 3. Merefleksikan</strong><br>Menilai kembali pengalaman belajar untuk menarik makna baru.</li>
          </ul>
        </div>

        <!-- 4 Kerangka -->
        <div class="rumus-card kerangka">
          <div class="rumus-card-title">
            <span class="badge">4</span> Kerangka Pembelajaran
          </div>
          <ul class="rumus-list">
            <li><strong>🍎 Praktik Pedagogik</strong><br>Metode pengajaran adaptif dan berpusat pada murid.</li>
            <li><strong> Lingkungan Pembelajaran</strong><br>Suasana kelas dan sekolah yang aman, nyaman, serta inklusif.</li>
            <li><strong>💻 Pemanfaatan Digital</strong><br>Penggunaan teknologi yang tepat guna untuk memperluas wawasan.</li>
            <li><strong>🤝 Kemitraan Pembelajaran</strong><br>Kolaborasi erat antara sekolah, orang tua, dan masyarakat.</li>
          </ul>
        </div>
      </div>

      <!-- Catatan Guru -->
      <div class="rumus-notes">
        <h3> Catatan Penerapan Guru</h3>
        <p style="font-size: 13px; color: #64748b; margin-bottom: 10px;">Gunakan area ini untuk mencatat bagaimana Anda menerapkan rumus 8-3-3-4 dalam modul ajar atau proyek kelas Anda. (Tersimpan otomatis di perangkat ini)</p>
        <textarea id="rumusCatatan" class="rumus-textarea" placeholder="Tuliskan catatan atau ide penerapan rumus 8-3-3-4 di kelas Anda di sini..."></textarea>
      </div>

      <div class="rumus-actions">
        <button class="rumus-btn rumus-btn-save" id="btnSimpanCatatan">💾 Simpan Catatan</button>
        <button class="rumus-btn rumus-btn-print" id="btnCetak">🖨️ Cetak / Simpan PDF</button>
      </div>
    </div>
  `;
}

function attachEvents(container) {
  const btnSimpan = container.querySelector('#btnSimpanCatatan');
  const btnCetak = container.querySelector('#btnCetak');
  const textarea = container.querySelector('#rumusCatatan');

  if (btnSimpan) {
    btnSimpan.addEventListener('click', () => {
      const catatan = textarea.value;
      localStorage.setItem('rumus_8334_catatan', catatan);
      showToast('✅ Catatan berhasil disimpan!');
    });
  }

  if (btnCetak) {
    btnCetak.addEventListener('click', () => {
      window.print();
    });
  }
}

function loadCatatanGuru() {
  const textarea = document.getElementById('rumusCatatan');
  if (textarea) {
    const saved = localStorage.getItem('rumus_8334_catatan');
    if (saved) {
      textarea.value = saved;
    }
  }
}

function showToast(msg) {
  const toast = document.createElement('div');
  toast.textContent = msg;
  toast.style.cssText = `position: fixed; top: 20px; right: 20px; background: #10b981; color: white; padding: 14px 24px; border-radius: 10px; z-index: 10001; box-shadow: 0 4px 16px rgba(16, 185, 129, 0.4); font-weight: 600; font-size: 14px; animation: slideIn 0.3s ease;`;
  document.body.appendChild(toast);
  setTimeout(() => { 
    toast.style.animation = 'slideOut 0.3s ease'; 
    setTimeout(() => toast.remove(), 300); 
  }, 3000);
}
