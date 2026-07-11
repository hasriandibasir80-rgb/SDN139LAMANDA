// modules/admin-pembelajaran/features/kktp.js
// =========================================
// FITUR: ANALISIS KKTP (Kurikulum Merdeka)
// Format: Standar Kemendikbudristek
// Kop Sekolah: Editable & tersimpan di localStorage
// Data Mapel: Load dari assets/data-mapel.json
// =========================================

import { db } from '../../../js/firebase-config.js';
import { getDatabase, ref, get, set, push } 
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
const database = getDatabase();

const CSS_PATH = '../../../css/modules/analisis-kktp.css';
const CSS_ID = 'analisis-kktp-css';

let dataSiswa = [];
let analisisResult = null;

// Default Kop Settings
const DEFAULT_KOP = {
  kabupaten: 'BULUKUMBA',
  dinas: 'DINAS PENDIDIKAN DAN KEBUDAYAAN',
  sekolah: 'SDN 139 LAMANDA',
  alamat: 'Dusun Batu Assung, Desa Lamanda, Kec. [Kecamatan], Kab. Bulukumba'
};

// ⭐ Data Mapel Fallback (jika JSON gagal dimuat)
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
  { id: 'bta', nama: 'BTA', singkatan: 'BTA', icon: '📿' }
];

export async function init(container, db) {
  loadCSS();
  renderUI(container);
  attachEvents();
  loadKopSettings();
  
  // ⭐ Load data mapel dari JSON
  await loadMataPelajaran();
}

export function cleanup() {
  const css = document.getElementById(CSS_ID);
  if (css) css.remove();
}

/**
 * ⭐ LOAD DATA MATA PELAJARAN DARI JSON
 * Mengambil data dari assets/data-mapel.json
 */
async function loadMataPelajaran() {
  try {
    const response = await fetch('../../../assets/data-mapel.json');
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    
    const selectMapel = document.getElementById('inpMapel');
    if (!selectMapel) return;
    
    selectMapel.innerHTML = '<option value="">-- Pilih Mapel --</option>';
    
    data.mataPelajaran.forEach(mapel => {
      const option = document.createElement('option');
      option.value = mapel.nama;
      option.textContent = `${mapel.icon} ${mapel.singkatan || mapel.nama}`;
      selectMapel.appendChild(option);
    });
    
    console.log(`✅ Data mapel berhasil dimuat: ${data.mataPelajaran.length} mapel`);
  } catch (error) {
    console.error('❌ Gagal memuat data mapel dari JSON:', error);
    console.log('🔄 Menggunakan data mapel fallback');
    loadFallbackMapel();
  }
}

/**
 * ⭐ FALLBACK: Jika JSON gagal dimuat, pakai data hardcoded
 */
function loadFallbackMapel() {
  const selectMapel = document.getElementById('inpMapel');
  if (!selectMapel) return;
  
  selectMapel.innerHTML = '<option value="">-- Pilih Mapel --</option>';
  
  FALLBACK_MAPEL.forEach(mapel => {
    const option = document.createElement('option');
    option.value = mapel.nama;
    option.textContent = `${mapel.icon} ${mapel.singkatan}`;
    selectMapel.appendChild(option);
  });
  
  console.log(`✅ Data mapel fallback dimuat: ${FALLBACK_MAPEL.length} mapel`);
}

function loadCSS() {
  if (document.getElementById(CSS_ID)) return;
  
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = CSS_PATH;
  link.id = CSS_ID;
  
  link.onerror = () => {
    console.warn('⚠️ CSS eksternal gagal');
    const style = document.createElement('style');
    style.id = CSS_ID + '-inline';
    style.textContent = getInlineCSS();
    document.head.appendChild(style);
  };
  
  document.head.appendChild(link);
}

function getInlineCSS() {
  return `
    .kktp-container { background: linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%); border-radius: 16px; padding: 25px; font-family: 'Segoe UI', sans-serif; max-width: 1200px; margin: 0 auto; box-shadow: 0 8px 24px rgba(236, 72, 153, 0.15); }
    .kktp-header { background: linear-gradient(135deg, #ec4899 0%, #f472b6 100%); color: white; padding: 30px; border-radius: 12px; margin-bottom: 25px; box-shadow: 0 4px 12px rgba(236, 72, 153, 0.3); }
    .kktp-header h2 { margin: 0 0 8px 0; font-size: 28px; font-weight: 700; }
    .kktp-header p { margin: 0; opacity: 0.95; font-size: 15px; }
    .info-box { background: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 8px; margin-bottom: 20px; font-size: 14px; color: #78350f; }
    .info-box strong { color: #92400e; }
    .kktp-form { background: white; padding: 30px; border-radius: 12px; box-shadow: 0 2px 8px rgba(236, 72, 153, 0.1); margin-bottom: 25px; }
    .form-section-title { font-size: 18px; font-weight: 700; color: #be185d; margin: 25px 0 18px 0; border-bottom: 3px solid #fce7f3; padding-bottom: 8px; }
    .form-section-title:first-child { margin-top: 0; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 15px; }
    .form-group { margin-bottom: 18px; }
    .form-group label { display: block; margin-bottom: 8px; font-weight: 600; font-size: 14px; color: #831843; }
    .form-control { width: 100%; padding: 14px 16px; border: 2px solid #fbcfe8; border-radius: 8px; font-size: 15px; box-sizing: border-box; background: white; color: #831843; }
    .form-control:focus { outline: none; border-color: #ec4899; box-shadow: 0 0 0 3px rgba(236, 72, 153, 0.15); }
    textarea.form-control { resize: vertical; min-height: 120px; font-family: inherit; }
    select.form-control { cursor: pointer; }
    .kop-settings { background: #f0f9ff; border: 2px dashed #3b82f6; border-radius: 12px; padding: 20px; margin-bottom: 20px; }
    .kop-preview { background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-top: 15px; text-align: center; font-family: 'Times New Roman', serif; }
    .kop-preview .kop-line { margin: 3px 0; font-size: 14px; color: #1e293b; }
    .kop-preview .kop-line.sekolah { font-size: 18px; font-weight: 700; margin: 8px 0; }
    .kop-preview .kop-line.alamat { font-size: 12px; font-style: italic; color: #64748b; }
    .kop-preview .kop-divider { border: none; border-top: 3px double #1e293b; margin: 10px 0; }
    .interval-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 20px; }
    .interval-card { padding: 15px; border-radius: 8px; text-align: center; border: 2px solid; }
    .interval-card.belum-total { background: #fee2e2; border-color: #ef4444; }
    .interval-card.belum-sebagian { background: #fef3c7; border-color: #f59e0b; }
    .interval-card.sudah { background: #d1fae5; border-color: #10b981; }
    .interval-card.pengayaan { background: #dbeafe; border-color: #3b82f6; }
    .interval-card .range { font-size: 18px; font-weight: 700; margin-bottom: 8px; }
    .interval-card.belum-total .range { color: #991b1b; }
    .interval-card.belum-sebagian .range { color: #92400e; }
    .interval-card.sudah .range { color: #065f46; }
    .interval-card.pengayaan .range { color: #1e40af; }
    .interval-card .label { font-size: 12px; font-weight: 600; color: #475569; margin-bottom: 5px; }
    .interval-card .desc { font-size: 11px; color: #64748b; }
    .btn-action { padding: 12px 24px; border: none; border-radius: 8px; font-weight: 600; font-size: 15px; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; box-shadow: 0 2px 6px rgba(0,0,0,0.1); transition: all 0.2s; }
    .btn-action:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
    .btn-analyze { background: #10b981; color: white; }
    .btn-save { background: #3b82f6; color: white; }
    .btn-export { background: #8b5cf6; color: white; }
    .btn-reset { background: #6b7280; color: white; }
    .btn-kop { background: #0ea5e9; color: white; }
    .gen-action { margin-top: 30px; display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; }
    .result-section { background: white; padding: 30px; border-radius: 12px; box-shadow: 0 2px 8px rgba(236, 72, 153, 0.1); margin-top: 25px; display: none; }
    .result-section.show { display: block; animation: fadeIn 0.5s ease; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 25px; }
    .summary-card { background: linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%); padding: 20px; border-radius: 12px; text-align: center; box-shadow: 0 2px 8px rgba(236, 72, 153, 0.1); }
    .summary-card h3 { margin: 0 0 10px 0; font-size: 14px; color: #831843; font-weight: 600; }
    .summary-card .value { font-size: 32px; font-weight: 700; color: #be185d; }
    .summary-card .label { font-size: 12px; color: #64748b; margin-top: 5px; }
    .chart-container { background: #fff1f2; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
    .chart-bar { display: flex; align-items: center; margin-bottom: 12px; }
    .chart-label { width: 180px; font-weight: 600; color: #831843; font-size: 13px; }
    .chart-bar-bg { flex: 1; background: #e2e8f0; border-radius: 8px; overflow: hidden; height: 35px; }
    .chart-bar-fill { height: 100%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; transition: width 0.8s ease; font-size: 13px; min-width: 40px; }
    .chart-bar-fill.belum-total { background: linear-gradient(90deg, #ef4444, #f87171); }
    .chart-bar-fill.belum-sebagian { background: linear-gradient(90deg, #f59e0b, #fbbf24); }
    .chart-bar-fill.sudah { background: linear-gradient(90deg, #10b981, #34d399); }
    .chart-bar-fill.pengayaan { background: linear-gradient(90deg, #3b82f6, #60a5fa); }
    .siswa-table { width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); margin-bottom: 20px; }
    .siswa-table th { background: linear-gradient(135deg, #ec4899 0%, #f472b6 100%); color: white; padding: 12px 8px; text-align: center; font-weight: 700; font-size: 14px; }
    .siswa-table td { padding: 12px 8px; border: 1px solid #e2e8f0; text-align: center; font-size: 14px; }
    .siswa-table tr:nth-child(even) { background: #fff1f2; }
    .siswa-table .nama-cell { text-align: left; padding-left: 15px; font-weight: 600; }
    .siswa-table .tindak-lanjut-cell { text-align: left; padding: 8px 15px; font-size: 13px; line-height: 1.5; }
    .badge-interval { display: inline-block; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 700; }
    .badge-belum-total { background: #fee2e2; color: #991b1b; }
    .badge-belum-sebagian { background: #fef3c7; color: #92400e; }
    .badge-sudah { background: #d1fae5; color: #065f46; }
    .badge-pengayaan { background: #dbeafe; color: #1e40af; }
    .recommendation { background: #fffbeb; border-left: 4px solid #f59e0b; padding: 20px; border-radius: 8px; margin-top: 20px; }
    .recommendation h4 { margin: 0 0 15px 0; color: #92400e; font-size: 16px; }
    .recommendation ul { margin: 0; padding-left: 20px; color: #78350f; }
    .recommendation li { margin-bottom: 10px; line-height: 1.6; }
    .student-list { background: #fef3c7; padding: 10px 15px; border-radius: 6px; margin: 10px 0; font-size: 13px; color: #78350f; }
    @media (max-width: 768px) { .kktp-container { padding: 15px; } .kktp-header { padding: 20px; } .kktp-header h2 { font-size: 22px; } .kktp-form { padding: 20px; } .form-grid { grid-template-columns: 1fr; gap: 15px; } .interval-grid { grid-template-columns: 1fr 1fr; } .btn-action { width: 100%; justify-content: center; } .summary-grid { grid-template-columns: 1fr 1fr; } .chart-label { width: 120px; font-size: 11px; } }
  `;
}

function renderUI(container) {
  container.innerHTML = `
    <div class="kktp-container">
      <div class="kktp-header">
        <h2>📊 Analisis KKTP</h2>
        <p>Kriteria Ketercapaian Tujuan Pembelajaran - Format Standar Kemendikbudristek</p>
      </div>

      <div class="info-box">
        <strong>📋 Format Analisis KKTP:</strong> Analisis ini menggunakan interval capaian persentase sesuai standar Kurikulum Merdeka. 
        Setiap siswa akan dipetakan ke dalam 4 interval: 0-40%, 41-65%, 66-85%, 86-100% dengan tindak lanjut yang sesuai.
      </div>

      <div class="kktp-form">
        <div class="form-section-title">🏫 Pengaturan Kop Surat (Editable)</div>
        <div class="kop-settings">
          <div class="form-grid">
            <div class="form-group">
              <label>🏛️ Nama Kabupaten</label>
              <input type="text" id="kopKabupaten" class="form-control" placeholder="Contoh: BULUKUMBA">
            </div>
            <div class="form-group">
              <label>🏢 Dinas</label>
              <input type="text" id="kopDinas" class="form-control" placeholder="Contoh: DINAS PENDIDIKAN DAN KEBUDAYAAN">
            </div>
          </div>
          <div class="form-grid">
            <div class="form-group">
              <label>🏫 Nama Sekolah</label>
              <input type="text" id="kopSekolah" class="form-control" placeholder="Contoh: SDN 139 LAMANDA">
            </div>
            <div class="form-group">
              <label>📍 Alamat Lengkap</label>
              <input type="text" id="kopAlamat" class="form-control" placeholder="Contoh: Dusun Batu Assung, Desa Lamanda">
            </div>
          </div>
          <button class="btn-action btn-kop" onclick="saveKopSettings()" style="width: 100%;">💾 Simpan Pengaturan Kop</button>
          
          <div class="kop-preview" id="kopPreview">
            <div class="kop-line">PEMERINTAH KABUPATEN <span id="previewKabupaten">BULUKUMBA</span></div>
            <div class="kop-line"><span id="previewDinas">DINAS PENDIDIKAN DAN KEBUDAYAAN</span></div>
            <div class="kop-line sekolah"><span id="previewSekolah">SDN 139 LAMANDA</span></div>
            <div class="kop-line alamat"><span id="previewAlamat">Dusun Batu Assung, Desa Lamanda</span></div>
            <hr class="kop-divider">
          </div>
        </div>

        <div class="form-section-title">📋 1. Informasi Umum</div>
        <div class="form-grid">
          <div class="form-group">
            <label>🎓 Kelas / Fase</label>
            <select id="inpKelas" class="form-control">
              <option value="">-- Pilih Kelas --</option>
              <option value="1 (Fase A)">Kelas 1 (Fase A)</option>
              <option value="2 (Fase A)">Kelas 2 (Fase A)</option>
              <option value="3 (Fase B)">Kelas 3 (Fase B)</option>
              <option value="4 (Fase B)">Kelas 4 (Fase B)</option>
              <option value="5 (Fase C)">Kelas 5 (Fase C)</option>
              <option value="6 (Fase C)">Kelas 6 (Fase C)</option>
            </select>
          </div>
          <div class="form-group">
            <label>📚 Mata Pelajaran</label>
            <select id="inpMapel" class="form-control">
              <option value="">-- Pilih Mapel --</option>
              <!-- ⭐ Opsi akan di-generate dari assets/data-mapel.json -->
            </select>
          </div>
        </div>
        <div class="form-grid">
          <div class="form-group">
            <label>📝 Topik / Tujuan Pembelajaran</label>
            <input type="text" id="inpTopik" class="form-control" placeholder="Contoh: Memahami pecahan sederhana">
          </div>
          <div class="form-group">
            <label>📅 Periode Asesmen</label>
            <select id="inpPeriode" class="form-control">
              <option value="Formatif 1">Asesmen Formatif 1</option>
              <option value="Formatif 2">Asesmen Formatif 2</option>
              <option value="Formatif 3">Asesmen Formatif 3</option>
              <option value="Sumatif">Asesmen Sumatif</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label>📅 Tanggal Asesmen</label>
          <input type="date" id="inpTanggal" class="form-control">
        </div>

        <div class="form-section-title">🎯 2. Interval Capaian (Standar Kemendikbudristek)</div>
        <div class="interval-grid">
          <div class="interval-card belum-total">
            <div class="range">0 - 40%</div>
            <div class="label">Belum Mencapai</div>
            <div class="desc">Remedial di seluruh bagian</div>
          </div>
          <div class="interval-card belum-sebagian">
            <div class="range">41 - 65%</div>
            <div class="label">Belum Mencapai</div>
            <div class="desc">Remedial di bagian yang diperlukan</div>
          </div>
          <div class="interval-card sudah">
            <div class="range">66 - 85%</div>
            <div class="label">Sudah Mencapai</div>
            <div class="desc">Tidak perlu remedial</div>
          </div>
          <div class="interval-card pengayaan">
            <div class="range">86 - 100%</div>
            <div class="label">Sudah Mencapai</div>
            <div class="desc">Perlu pengayaan</div>
          </div>
        </div>

        <div class="form-section-title">👥 3. Data Nilai Siswa</div>
        <div class="form-group">
          <label>📝 Input Nilai (satu siswa per baris: Nama, Nilai)</label>
          <textarea id="inpDataSiswa" class="form-control" placeholder="Contoh:
Eka, 55
Fani, 88
Andi, 72
Budi, 45
Citra, 92"></textarea>
          <p style="font-size: 12px; color: #64748b; margin-top: 5px;">
            Format: <strong>Nama, Nilai</strong> (pisahkan dengan koma). Nilai 0-100.
          </p>
        </div>

        <div class="gen-action">
          <button class="btn-action btn-analyze" onclick="analyzeKKTP()">📊 Analisis KKTP</button>
          <button class="btn-action btn-save" onclick="saveToDatabase()">💾 Simpan ke Database</button>
          <button class="btn-action btn-export" onclick="exportToWord()">📥 Export Word</button>
          <button class="btn-action btn-reset" onclick="resetForm()">🔄 Reset</button>
        </div>
      </div>

      <div class="result-section" id="resultSection">
        <div class="form-section-title">📈 4. Hasil Analisis</div>
        
        <div class="summary-grid" id="summaryGrid"></div>
        
        <div class="chart-container">
          <h4>📊 Distribusi Interval Capaian</h4>
          <div id="chartBars"></div>
        </div>
        
        <div class="form-section-title">📋 Tabel Analisis KKTP Siswa</div>
        <div style="overflow-x: auto;">
          <table class="siswa-table" id="resultTable">
            <thead>
              <tr>
                <th style="width: 50px;">No</th>
                <th>Nama Siswa</th>
                <th>Topik / TP</th>
                <th style="width: 100px;">Nilai Asesmen</th>
                <th style="width: 120px;">Interval Capaian</th>
                <th>Hasil Tindak Lanjut</th>
              </tr>
            </thead>
            <tbody id="resultTableBody"></tbody>
          </table>
        </div>
        
        <div class="recommendation" id="recommendation"></div>
      </div>
    </div>
  `;
}

function attachEvents() {
  // Live preview kop
  ['kopKabupaten', 'kopDinas', 'kopSekolah', 'kopAlamat'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', updateKopPreview);
    }
  });
}

function loadKopSettings() {
  const saved = localStorage.getItem('kktp_kop_settings');
  let kop = DEFAULT_KOP;
  
  if (saved) {
    try {
      kop = { ...DEFAULT_KOP, ...JSON.parse(saved) };
    } catch (e) {}
  }
  
  setTimeout(() => {
    document.getElementById('kopKabupaten').value = kop.kabupaten;
    document.getElementById('kopDinas').value = kop.dinas;
    document.getElementById('kopSekolah').value = kop.sekolah;
    document.getElementById('kopAlamat').value = kop.alamat;
    updateKopPreview();
  }, 100);
}

function updateKopPreview() {
  const kabupaten = document.getElementById('kopKabupaten')?.value || 'BULUKUMBA';
  const dinas = document.getElementById('kopDinas')?.value || 'DINAS PENDIDIKAN DAN KEBUDAYAAN';
  const sekolah = document.getElementById('kopSekolah')?.value || 'SDN 139 LAMANDA';
  const alamat = document.getElementById('kopAlamat')?.value || 'Dusun Batu Assung, Desa Lamanda';
  
  document.getElementById('previewKabupaten').textContent = kabupaten.toUpperCase();
  document.getElementById('previewDinas').textContent = dinas.toUpperCase();
  document.getElementById('previewSekolah').textContent = sekolah.toUpperCase();
  document.getElementById('previewAlamat').textContent = alamat;
}

window.saveKopSettings = function() {
  const kop = {
    kabupaten: document.getElementById('kopKabupaten').value,
    dinas: document.getElementById('kopDinas').value,
    sekolah: document.getElementById('kopSekolah').value,
    alamat: document.getElementById('kopAlamat').value
  };
  
  localStorage.setItem('kktp_kop_settings', JSON.stringify(kop));
  showToast('✅ Pengaturan kop berhasil disimpan!');
};

function getKopSettings() {
  const saved = localStorage.getItem('kktp_kop_settings');
  if (saved) {
    try {
      return { ...DEFAULT_KOP, ...JSON.parse(saved) };
    } catch (e) {}
  }
  return DEFAULT_KOP;
}

window.analyzeKKTP = function() {
  const kelas = document.getElementById('inpKelas').value;
  const mapel = document.getElementById('inpMapel').value;
  const topik = document.getElementById('inpTopik').value;
  const dataInput = document.getElementById('inpDataSiswa').value;
  
  if (!kelas || !mapel || !topik) {
    alert('⚠️ Lengkapi informasi umum terlebih dahulu!');
    return;
  }
  
  if (!dataInput.trim()) {
    alert('⚠️ Input data nilai siswa terlebih dahulu!');
    return;
  }
  
  dataSiswa = [];
  const lines = dataInput.trim().split('\n');
  
  lines.forEach(line => {
    const parts = line.split(',').map(s => s.trim());
    if (parts.length >= 2) {
      const nama = parts[0];
      const nilai = parseFloat(parts[1]);
      if (nama && !isNaN(nilai) && nilai >= 0 && nilai <= 100) {
        dataSiswa.push({ nama, nilai });
      }
    }
  });
  
  if (dataSiswa.length === 0) {
    alert('⚠️ Format data tidak valid! Gunakan format: Nama, Nilai');
    return;
  }
  
  analisisResult = hitungAnalisis(dataSiswa);
  tampilkanHasil(analisisResult);
  
  showToast('✅ Analisis KKTP selesai!');
};

function hitungAnalisis(data) {
  const totalSiswa = data.length;
  const totalNilai = data.reduce((sum, s) => sum + s.nilai, 0);
  const rataRata = totalNilai / totalSiswa;
  const nilaiTertinggi = Math.max(...data.map(s => s.nilai));
  const nilaiTerendah = Math.min(...data.map(s => s.nilai));
  
  const kategori = {
    belumTotal: data.filter(s => s.nilai <= 40),
    belumSebagian: data.filter(s => s.nilai > 40 && s.nilai <= 65),
    sudah: data.filter(s => s.nilai > 65 && s.nilai <= 85),
    pengayaan: data.filter(s => s.nilai > 85)
  };
  
  const topik = document.getElementById('inpTopik').value;
  
  data.forEach(siswa => {
    siswa.topik = topik;
    
    if (siswa.nilai <= 40) {
      siswa.kategori = 'Belum Mencapai';
      siswa.interval = '0 - 40%';
      siswa.badge = 'belum-total';
      siswa.tindakLanjut = '<strong>Remedial</strong> khusus materi-materi yang salah';
    } else if (siswa.nilai <= 65) {
      siswa.kategori = 'Belum Mencapai';
      siswa.interval = '41 - 65%';
      siswa.badge = 'belum-sebagian';
      siswa.tindakLanjut = '<strong>Remedial</strong> di bagian yang diperlukan';
    } else if (siswa.nilai <= 85) {
      siswa.kategori = 'Sudah Mencapai';
      siswa.interval = '66 - 85%';
      siswa.badge = 'sudah';
      siswa.tindakLanjut = '<strong>Tuntas</strong>, tidak perlu remedial';
    } else {
      siswa.kategori = 'Sudah Mencapai';
      siswa.interval = '86 - 100%';
      siswa.badge = 'pengayaan';
      siswa.tindakLanjut = '<strong>Tuntas</strong>, diberikan tugas pengayaan';
    }
  });
  
  return {
    totalSiswa,
    rataRata: rataRata.toFixed(2),
    nilaiTertinggi,
    nilaiTerendah,
    kategori,
    data,
    persentase: {
      belumTotal: ((kategori.belumTotal.length / totalSiswa) * 100).toFixed(1),
      belumSebagian: ((kategori.belumSebagian.length / totalSiswa) * 100).toFixed(1),
      sudah: ((kategori.sudah.length / totalSiswa) * 100).toFixed(1),
      pengayaan: ((kategori.pengayaan.length / totalSiswa) * 100).toFixed(1)
    }
  };
}

function tampilkanHasil(analisis) {
  const resultSection = document.getElementById('resultSection');
  resultSection.classList.add('show');
  
  const summaryGrid = document.getElementById('summaryGrid');
  summaryGrid.innerHTML = `
    <div class="summary-card">
      <h3>Total Siswa</h3>
      <div class="value">${analisis.totalSiswa}</div>
      <div class="label">peserta didik</div>
    </div>
    <div class="summary-card">
      <h3>Rata-rata Kelas</h3>
      <div class="value">${analisis.rataRata}</div>
      <div class="label">dari 100</div>
    </div>
    <div class="summary-card">
      <h3>Sudah Mencapai TP</h3>
      <div class="value">${analisis.kategori.sudah.length + analisis.kategori.pengayaan.length}</div>
      <div class="label">siswa (${(parseFloat(analisis.persentase.sudah) + parseFloat(analisis.persentase.pengayaan)).toFixed(1)}%)</div>
    </div>
    <div class="summary-card">
      <h3>Perlu Remedial</h3>
      <div class="value">${analisis.kategori.belumTotal.length + analisis.kategori.belumSebagian.length}</div>
      <div class="label">siswa (${(parseFloat(analisis.persentase.belumTotal) + parseFloat(analisis.persentase.belumSebagian)).toFixed(1)}%)</div>
    </div>
  `;
  
  const chartBars = document.getElementById('chartBars');
  chartBars.innerHTML = `
    <div class="chart-bar">
      <div class="chart-label">0-40% (Belum Mencapai)</div>
      <div class="chart-bar-bg">
        <div class="chart-bar-fill belum-total" style="width: ${Math.max(analisis.persentase.belumTotal, 5)}%">
          ${analisis.kategori.belumTotal.length} siswa (${analisis.persentase.belumTotal}%)
        </div>
      </div>
    </div>
    <div class="chart-bar">
      <div class="chart-label">41-65% (Belum Mencapai)</div>
      <div class="chart-bar-bg">
        <div class="chart-bar-fill belum-sebagian" style="width: ${Math.max(analisis.persentase.belumSebagian, 5)}%">
          ${analisis.kategori.belumSebagian.length} siswa (${analisis.persentase.belumSebagian}%)
        </div>
      </div>
    </div>
    <div class="chart-bar">
      <div class="chart-label">66-85% (Sudah Mencapai)</div>
      <div class="chart-bar-bg">
        <div class="chart-bar-fill sudah" style="width: ${Math.max(analisis.persentase.sudah, 5)}%">
          ${analisis.kategori.sudah.length} siswa (${analisis.persentase.sudah}%)
        </div>
      </div>
    </div>
    <div class="chart-bar">
      <div class="chart-label">86-100% (Perlu Pengayaan)</div>
      <div class="chart-bar-bg">
        <div class="chart-bar-fill pengayaan" style="width: ${Math.max(analisis.persentase.pengayaan, 5)}%">
          ${analisis.kategori.pengayaan.length} siswa (${analisis.persentase.pengayaan}%)
        </div>
      </div>
    </div>
  `;
  
  const resultTableBody = document.getElementById('resultTableBody');
  resultTableBody.innerHTML = analisis.data.map((siswa, index) => `
    <tr>
      <td>${index + 1}</td>
      <td class="nama-cell">${siswa.nama}</td>
      <td style="text-align: left; padding: 8px 15px; font-size: 13px;">${siswa.topik}</td>
      <td><strong>${siswa.nilai}</strong></td>
      <td><span class="badge-interval badge-${siswa.badge}">${siswa.interval}</span></td>
      <td class="tindak-lanjut-cell">${siswa.tindakLanjut}</td>
    </tr>
  `).join('');
  
  const recommendation = document.getElementById('recommendation');
  let recHTML = '<h4>💡 Rekomendasi Tindak Lanjut Pembelajaran</h4><ul>';
  
  if (analisis.kategori.belumTotal.length > 0) {
    recHTML += `<li><strong>🔴 Remedial Menyeluruh:</strong> ${analisis.kategori.belumTotal.length} siswa perlu remedial di seluruh bagian materi: 
      <div class="student-list"><strong>Nama:</strong> ${analisis.kategori.belumTotal.map(s => s.nama).join(', ')}</div>
    </li>`;
  }
  
  if (analisis.kategori.belumSebagian.length > 0) {
    recHTML += `<li><strong>🟡 Remedial Sebagian:</strong> ${analisis.kategori.belumSebagian.length} siswa perlu remedial di bagian yang diperlukan: 
      <div class="student-list"><strong>Nama:</strong> ${analisis.kategori.belumSebagian.map(s => s.nama).join(', ')}</div>
    </li>`;
  }
  
  if (analisis.kategori.sudah.length > 0) {
    recHTML += `<li><strong>🟢 Tuntas:</strong> ${analisis.kategori.sudah.length} siswa sudah mencapai tujuan pembelajaran, tidak perlu remedial</li>`;
  }
  
  if (analisis.kategori.pengayaan.length > 0) {
    recHTML += `<li><strong>🔵 Pengayaan:</strong> ${analisis.kategori.pengayaan.length} siswa perlu diberikan tugas pengayaan: 
      <div class="student-list"><strong>Nama:</strong> ${analisis.kategori.pengayaan.map(s => s.nama).join(', ')}</div>
    </li>`;
  }
  
  if (parseFloat(analisis.rataRata) < 65) {
    recHTML += `<li><strong>🔄 Refleksi Metode:</strong> Rata-rata kelas di bawah 65%, pertimbangkan untuk mengevaluasi strategi pembelajaran</li>`;
  } else if (parseFloat(analisis.rataRata) >= 85) {
    recHTML += `<li><strong>🎉 Apresiasi:</strong> Rata-rata kelas sangat baik! Pertahankan metode pembelajaran yang sudah efektif</li>`;
  }
  
  recHTML += `<li><strong>📝 Asesmen Lanjutan:</strong> Lakukan asesmen formatif berikutnya untuk memantau perkembangan setiap siswa</li>`;
  recHTML += '</ul>';
  
  recommendation.innerHTML = recHTML;
  
  setTimeout(() => {
    resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);
}

window.saveToDatabase = async function() {
  const kelas = document.getElementById('inpKelas').value;
  const mapel = document.getElementById('inpMapel').value;
  const topik = document.getElementById('inpTopik').value;
  const periode = document.getElementById('inpPeriode').value;
  const tanggal = document.getElementById('inpTanggal').value;
  
  if (!kelas || !mapel || !topik || dataSiswa.length === 0) {
    alert('⚠️ Lakukan analisis terlebih dahulu!');
    return;
  }
  
  if (!analisisResult) {
    analisisResult = hitungAnalisis(dataSiswa);
  }
  
  try {
    const newRef = push(ref(database, `analisis_kktp/${kelas.replace(/\s+/g, '_')}/${mapel.replace(/\s+/g, '_')}`));
    
    await set(newRef, {
      kelas,
      mapel,
      topik,
      periode,
      tanggalAsesmen: tanggal,
      totalSiswa: analisisResult.totalSiswa,
      rataRata: parseFloat(analisisResult.rataRata),
      nilaiTertinggi: analisisResult.nilaiTertinggi,
      nilaiTerendah: analisisResult.nilaiTerendah,
      persentase: analisisResult.persentase,
      data: dataSiswa,
      kop: getKopSettings(),
      createdAt: Date.now(),
      createdBy: currentUser.uid || 'unknown'
    });
    
    showToast('✅ Data berhasil disimpan ke database!');
  } catch (error) {
    console.error('Error save:', error);
    alert('❌ Gagal menyimpan: ' + error.message);
  }
};

window.exportToWord = function() {
  const kelas = document.getElementById('inpKelas').value;
  const mapel = document.getElementById('inpMapel').value;
  const topik = document.getElementById('inpTopik').value;
  const periode = document.getElementById('inpPeriode').value;
  const tanggal = document.getElementById('inpTanggal').value;
  
  if (!kelas || !mapel || !topik || dataSiswa.length === 0) {
    alert('⚠️ Lakukan analisis terlebih dahulu!');
    return;
  }
  
  if (!analisisResult) {
    analisisResult = hitungAnalisis(dataSiswa);
  }
  
  const kop = getKopSettings();
  
  let tanggalFormatted = '-';
  if (tanggal) {
    const dateObj = new Date(tanggal);
    const bulan = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    tanggalFormatted = `${dateObj.getDate()} ${bulan[dateObj.getMonth()]} ${dateObj.getFullYear()}`;
  }
  
  let tableHTML = `<table border="1" cellpadding="8" cellspacing="0" style="width: 100%; border-collapse: collapse;">
    <thead>
      <tr style="background: #ec4899; color: white;">
        <th style="width: 50px;">No</th>
        <th>Nama Siswa</th>
        <th>Topik / TP</th>
        <th style="width: 100px;">Nilai Asesmen</th>
        <th style="width: 120px;">Interval Capaian</th>
        <th>Hasil Tindak Lanjut</th>
      </tr>
    </thead>
    <tbody>`;
  
  analisisResult.data.forEach((siswa, index) => {
    tableHTML += `<tr>
      <td style="text-align: center;">${index + 1}</td>
      <td>${siswa.nama}</td>
      <td style="text-align: left; padding: 8px;">${siswa.topik}</td>
      <td style="text-align: center; font-weight: bold;">${siswa.nilai}</td>
      <td style="text-align: center;">${siswa.interval}</td>
      <td style="text-align: left; padding: 8px;">${siswa.tindakLanjut.replace(/<[^>]*>/g, '')}</td>
    </tr>`;
  });
  
  tableHTML += `</tbody></table>`;
  
  const htmlContent = `<html><head><meta charset="utf-8"></head>
    <body style="font-family: 'Times New Roman', serif; margin: 2cm;">
      <div style="text-align: center; border-bottom: 3px double #000; padding-bottom: 15px; margin-bottom: 20px;">
        <div style="font-size: 14pt; font-weight: bold; margin: 3px 0;">PEMERINTAH KABUPATEN ${kop.kabupaten.toUpperCase()}</div>
        <div style="font-size: 13pt; font-weight: bold; margin: 3px 0;">${kop.dinas.toUpperCase()}</div>
        <div style="font-size: 16pt; font-weight: bold; margin: 8px 0;">${kop.sekolah.toUpperCase()}</div>
        <div style="font-size: 11pt; font-style: italic; margin: 3px 0;">${kop.alamat}</div>
      </div>
      
      <div style="text-align: center; margin-bottom: 25px;">
        <h1 style="margin: 0; font-size: 16pt; text-decoration: underline;">ANALISIS KKTP</h1>
        <h2 style="margin: 5px 0; font-size: 12pt;">Kriteria Ketercapaian Tujuan Pembelajaran</h2>
        <p style="margin: 5px 0; font-size: 11pt;">Kurikulum Merdeka - Tahun Ajaran 2026/2027</p>
      </div>
      
      <div style="margin-bottom: 20px;">
        <table style="width: 100%; border: none;">
          <tr><td style="width: 30%;"><strong>Kelas</strong></td><td>: ${kelas}</td></tr>
          <tr><td><strong>Mata Pelajaran</strong></td><td>: ${mapel}</td></tr>
          <tr><td><strong>Periode Asesmen</strong></td><td>: ${periode}</td></tr>
          <tr><td><strong>Topik / Tujuan Pembelajaran</strong></td><td>: ${topik}</td></tr>
          <tr><td><strong>Tanggal Asesmen</strong></td><td>: ${tanggalFormatted}</td></tr>
        </table>
      </div>
      
      <h3 style="color: #be185d; border-bottom: 2px solid #ec4899; padding-bottom: 5px;">📊 Ringkasan Hasil</h3>
      <table style="width: 60%; border: none; margin-bottom: 20px;">
        <tr><td style="width: 50%;"><strong>Total Siswa:</strong></td><td>${analisisResult.totalSiswa} peserta didik</td></tr>
        <tr><td><strong>Rata-rata Kelas:</strong></td><td>${analisisResult.rataRata}</td></tr>
        <tr><td><strong>Sudah Mencapai TP:</strong></td><td>${analisisResult.kategori.sudah.length + analisisResult.kategori.pengayaan.length} siswa (${(parseFloat(analisisResult.persentase.sudah) + parseFloat(analisisResult.persentase.pengayaan)).toFixed(1)}%)</td></tr>
        <tr><td><strong>Perlu Remedial:</strong></td><td>${analisisResult.kategori.belumTotal.length + analisisResult.kategori.belumSebagian.length} siswa (${(parseFloat(analisisResult.persentase.belumTotal) + parseFloat(analisisResult.persentase.belumSebagian)).toFixed(1)}%)</td></tr>
      </table>
      
      <h3 style="color: #be185d; border-bottom: 2px solid #ec4899; padding-bottom: 5px;">📈 Distribusi Interval Capaian</h3>
      <ul style="margin-bottom: 20px;">
        <li><strong>0-40% (Belum Mencapai):</strong> ${analisisResult.kategori.belumTotal.length} siswa (${analisisResult.persentase.belumTotal}%)</li>
        <li><strong>41-65% (Belum Mencapai):</strong> ${analisisResult.kategori.belumSebagian.length} siswa (${analisisResult.persentase.belumSebagian}%)</li>
        <li><strong>66-85% (Sudah Mencapai):</strong> ${analisisResult.kategori.sudah.length} siswa (${analisisResult.persentase.sudah}%)</li>
        <li><strong>86-100% (Perlu Pengayaan):</strong> ${analisisResult.kategori.pengayaan.length} siswa (${analisisResult.persentase.pengayaan}%)</li>
      </ul>
      
      <h3 style="color: #be185d; border-bottom: 2px solid #ec4899; padding-bottom: 5px;">📋 Tabel Analisis KKTP Siswa</h3>
      ${tableHTML}
      
      <div style="margin-top: 30px; padding: 15px; background: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 8px;">
        <h4 style="margin: 0 0 10px 0; color: #92400e;">💡 Rekomendasi Tindak Lanjut Pembelajaran</h4>
        <ul style="margin: 0; padding-left: 20px;">
          ${analisisResult.kategori.belumTotal.length > 0 ? `<li><strong>Remedial Menyeluruh:</strong> ${analisisResult.kategori.belumTotal.length} siswa perlu remedial di seluruh bagian</li>` : ''}
          ${analisisResult.kategori.belumSebagian.length > 0 ? `<li><strong>Remedial Sebagian:</strong> ${analisisResult.kategori.belumSebagian.length} siswa perlu remedial di bagian yang diperlukan</li>` : ''}
          <li><strong>Pengayaan:</strong> Berikan tugas pengayaan untuk siswa yang sudah mencapai TP</li>
          <li><strong>Asesmen Lanjutan:</strong> Lakukan asesmen formatif berikutnya</li>
        </ul>
      </div>
      
      <div style="margin-top: 50px; text-align: right;">
        <p style="margin: 5px 0;">Lamanda, ${tanggalFormatted}</p>
        <p style="margin: 5px 0;">Guru Kelas</p>
        <br><br><br>
        <p style="margin: 5px 0; border-bottom: 1px solid #000; display: inline-block; min-width: 200px;">(_____________________________)</p>
        <p style="margin: 5px 0;">NIP. _________________________</p>
      </div>
    </body></html>`;
  
  const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Analisis_KKTP_${mapel}_${kelas.replace(/\s+/g, '_')}_${Date.now()}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  
  showToast('📥 File Word berhasil diunduh!');
};

window.resetForm = function() {
  if (confirm('🔄 Reset semua data?')) {
    document.getElementById('inpKelas').value = '';
    document.getElementById('inpMapel').value = '';
    document.getElementById('inpTopik').value = '';
    document.getElementById('inpPeriode').value = 'Formatif 1';
    document.getElementById('inpTanggal').value = '';
    document.getElementById('inpDataSiswa').value = '';
    document.getElementById('resultSection').classList.remove('show');
    dataSiswa = [];
    analisisResult = null;
    showToast('✅ Form direset!');
  }
};

function showToast(msg) {
  const toast = document.createElement('div');
  toast.textContent = msg;
  toast.style.cssText = `position: fixed; top: 20px; right: 20px; background: #ec4899; color: white; padding: 14px 24px; border-radius: 10px; z-index: 10001; font-weight: 600; box-shadow: 0 4px 16px rgba(236, 72, 153, 0.4);`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}
