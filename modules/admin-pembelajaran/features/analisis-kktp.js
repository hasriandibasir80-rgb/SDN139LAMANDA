// modules/admin-pembelajaran/features/analisis-kktp.js
// =========================================
// FITUR: ANALISIS KKTP (Kurikulum Merdeka)
// Filosofi: Mendampingi, bukan menghakimi
// CSS: Terpisah di /css/modules/analisis-kktp.css
// =========================================

import { db } from '../../../js/firebase-config.js';
import { getDatabase, ref, get, set, push } 
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
const database = getDatabase();

// Konstanta CSS
const CSS_PATH = '../../../css/modules/analisis-kktp.css';
const CSS_ID = 'analisis-kktp-css';

// State
let dataSiswa = [];
let analisisResult = null;

/**
 * Init
 */
export async function init(container, db) {
  loadCSS();
  renderUI(container);
  attachEvents();
  loadSavedData();
}

export function cleanup() {
  const css = document.getElementById(CSS_ID);
  if (css) css.remove();
}

/**
 * Load CSS - Eksternal dengan fallback inline
 */
function loadCSS() {
  if (document.getElementById(CSS_ID)) return;
  
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = CSS_PATH;
  link.id = CSS_ID;
  
  // Fallback: jika CSS eksternal gagal, inject inline
  link.onerror = () => {
    console.warn('⚠️ CSS eksternal gagal, menggunakan inline CSS');
    const style = document.createElement('style');
    style.id = CSS_ID + '-inline';
    style.textContent = getInlineCSS();
    document.head.appendChild(style);
  };
  
  document.head.appendChild(link);
}

/**
 * Fallback CSS inline (jika file eksternal gagal)
 */
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
    .threshold-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 20px; }
    .threshold-card { background: #fff1f2; padding: 15px; border-radius: 8px; text-align: center; border: 2px solid #fce7f3; }
    .threshold-card label { font-size: 12px; font-weight: 700; color: #831843; margin-bottom: 8px; display: block; }
    .threshold-card input { width: 60px; padding: 8px; border: 2px solid #fbcfe8; border-radius: 6px; text-align: center; font-size: 16px; font-weight: 700; color: #be185d; }
    .threshold-card .desc { font-size: 11px; color: #64748b; margin-top: 5px; }
    .btn-action { padding: 12px 24px; border: none; border-radius: 8px; font-weight: 600; font-size: 15px; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; box-shadow: 0 2px 6px rgba(0,0,0,0.1); transition: all 0.2s; }
    .btn-action:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
    .btn-analyze { background: #10b981; color: white; }
    .btn-save { background: #3b82f6; color: white; }
    .btn-export { background: #8b5cf6; color: white; }
    .btn-reset { background: #6b7280; color: white; }
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
    .chart-label { width: 150px; font-weight: 600; color: #831843; font-size: 14px; }
    .chart-bar-bg { flex: 1; background: #e2e8f0; border-radius: 8px; overflow: hidden; height: 35px; }
    .chart-bar-fill { height: 100%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; transition: width 0.8s ease; font-size: 14px; min-width: 40px; }
    .chart-bar-fill.perlu { background: linear-gradient(90deg, #ef4444, #f87171); }
    .chart-bar-fill.cukup { background: linear-gradient(90deg, #f59e0b, #fbbf24); }
    .chart-bar-fill.baik { background: linear-gradient(90deg, #10b981, #34d399); }
    .chart-bar-fill.sangat { background: linear-gradient(90deg, #3b82f6, #60a5fa); }
    .siswa-table { width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .siswa-table th { background: linear-gradient(135deg, #ec4899 0%, #f472b6 100%); color: white; padding: 12px 8px; text-align: center; font-weight: 700; }
    .siswa-table td { padding: 10px 8px; border: 1px solid #e2e8f0; text-align: center; }
    .siswa-table tr:nth-child(even) { background: #fff1f2; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 700; }
    .badge-perlu { background: #fee2e2; color: #991b1b; }
    .badge-cukup { background: #fef3c7; color: #92400e; }
    .badge-baik { background: #d1fae5; color: #065f46; }
    .badge-sangat { background: #dbeafe; color: #1e40af; }
    .recommendation { background: #fffbeb; border-left: 4px solid #f59e0b; padding: 20px; border-radius: 8px; margin-top: 20px; }
    .recommendation h4 { margin: 0 0 15px 0; color: #92400e; font-size: 16px; }
    .recommendation ul { margin: 0; padding-left: 20px; color: #78350f; }
    .recommendation li { margin-bottom: 10px; line-height: 1.6; }
    .student-list { background: #fef3c7; padding: 10px 15px; border-radius: 6px; margin: 10px 0; font-size: 13px; color: #78350f; }
    @media (max-width: 768px) { .kktp-container { padding: 15px; } .kktp-header { padding: 20px; } .kktp-header h2 { font-size: 22px; } .kktp-form { padding: 20px; } .form-grid { grid-template-columns: 1fr; gap: 15px; } .threshold-grid { grid-template-columns: 1fr 1fr; } .btn-action { width: 100%; justify-content: center; } .summary-grid { grid-template-columns: 1fr 1fr; } .chart-label { width: 100px; font-size: 12px; } }
  `;
}

function renderUI(container) {
  container.innerHTML = `
    <div class="kktp-container">
      <div class="kktp-header">
        <h2>📊 Analisis KKTP</h2>
        <p>Kriteria Ketercapaian Tujuan Pembelajaran - Kurikulum Merdeka</p>
      </div>

      <div class="info-box">
        <strong>💡 Tentang KKTP:</strong> KKTP digunakan untuk memetakan ketercapaian tujuan pembelajaran siswa. 
        Hasil analisis ini membantu guru memberikan tindak lanjut yang tepat untuk setiap siswa. 
        Tidak ada siswa yang "gagal" - setiap siswa memiliki kecepatan belajar yang berbeda.
      </div>

      <div class="kktp-form">
        <div class="form-section-title"> 1. Informasi Umum</div>
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
              <option value="Matematika">Matematika</option>
              <option value="Bahasa Indonesia">Bahasa Indonesia</option>
              <option value="IPA">IPA</option>
              <option value="IPS">IPS</option>
              <option value="PJOK">PJOK</option>
              <option value="Seni Budaya">Seni Budaya</option>
              <option value="Bahasa Inggris">Bahasa Inggris</option>
              <option value="Pendidikan Agama">Pendidikan Agama</option>
              <option value="PPKn">PPKn</option>
            </select>
          </div>
        </div>
        <div class="form-grid">
          <div class="form-group">
            <label> Topik / Tujuan Pembelajaran</label>
            <input type="text" id="inpTopik" class="form-control" placeholder="Contoh: Memahami pecahan sederhana">
          </div>
          <div class="form-group">
            <label> Periode Asesmen</label>
            <select id="inpPeriode" class="form-control">
              <option value="Formatif 1">Asesmen Formatif 1</option>
              <option value="Formatif 2">Asesmen Formatif 2</option>
              <option value="Formatif 3">Asesmen Formatif 3</option>
              <option value="Sumatif">Asesmen Sumatif</option>
            </select>
          </div>
        </div>

        <div class="form-section-title"> 2. Kriteria KKTP (Bisa Disesuaikan)</div>
        <div class="threshold-grid">
          <div class="threshold-card">
            <label>Perlu Bimbingan</label>
            <input type="number" id="thrPerlu" value="70" min="0" max="100">
            <div class="desc">Di bawah nilai ini</div>
          </div>
          <div class="threshold-card">
            <label>Cukup</label>
            <input type="number" id="thrCukup" value="80" min="0" max="100">
            <div class="desc">S.d. nilai ini</div>
          </div>
          <div class="threshold-card">
            <label>Baik</label>
            <input type="number" id="thrBaik" value="90" min="0" max="100">
            <div class="desc">S.d. nilai ini</div>
          </div>
          <div class="threshold-card">
            <label>Sangat Baik</label>
            <input type="number" id="thrSangat" value="100" min="0" max="100" disabled>
            <div class="desc">Di atas 90</div>
          </div>
        </div>

        <div class="form-section-title">👥 3. Data Nilai Siswa</div>
        <div class="form-group">
          <label>📝 Input Nilai (satu siswa per baris: Nama, Nilai)</label>
          <textarea id="inpDataSiswa" class="form-control" placeholder="Contoh:
Andi Pratama, 85
Budi Santoso, 72
Citra Lestari, 90
Diana Putri, 68
Eka Wijaya, 78"></textarea>
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
          <h4>📊 Distribusi Ketercapaian KKTP</h4>
          <div id="chartBars"></div>
        </div>
        
        <div class="form-section-title">📋 Detail Hasil Per Siswa</div>
        <div style="overflow-x: auto;">
          <table class="siswa-table" id="resultTable">
            <thead>
              <tr>
                <th>No</th>
                <th>Nama Siswa</th>
                <th>Nilai</th>
                <th>Kategori KKTP</th>
                <th>Tindak Lanjut</th>
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
  // Auto-save threshold ke localStorage
  ['thrPerlu', 'thrCukup', 'thrBaik'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('change', () => {
        const thresholds = {
          perluBimbingan: parseInt(document.getElementById('thrPerlu').value),
          cukup: parseInt(document.getElementById('thrCukup').value),
          baik: parseInt(document.getElementById('thrBaik').value)
        };
        localStorage.setItem('kktp_thresholds', JSON.stringify(thresholds));
      });
    }
  });
}

function loadSavedData() {
  const savedThresholds = localStorage.getItem('kktp_thresholds');
  if (savedThresholds) {
    try {
      const t = JSON.parse(savedThresholds);
      setTimeout(() => {
        if (t.perluBimbingan) document.getElementById('thrPerlu').value = t.perluBimbingan;
        if (t.cukup) document.getElementById('thrCukup').value = t.cukup;
        if (t.baik) document.getElementById('thrBaik').value = t.baik;
      }, 100);
    } catch (e) {}
  }
}

/**
 * Analisis KKTP
 */
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
    alert('️ Input data nilai siswa terlebih dahulu!');
    return;
  }
  
  // Parse data siswa
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
  const thresholds = {
    perluBimbingan: parseInt(document.getElementById('thrPerlu').value) || 70,
    cukup: parseInt(document.getElementById('thrCukup').value) || 80,
    baik: parseInt(document.getElementById('thrBaik').value) || 90
  };
  
  const totalSiswa = data.length;
  const totalNilai = data.reduce((sum, s) => sum + s.nilai, 0);
  const rataRata = totalNilai / totalSiswa;
  const nilaiTertinggi = Math.max(...data.map(s => s.nilai));
  const nilaiTerendah = Math.min(...data.map(s => s.nilai));
  
  const kategori = {
    perlu: data.filter(s => s.nilai < thresholds.perluBimbingan),
    cukup: data.filter(s => s.nilai >= thresholds.perluBimbingan && s.nilai < thresholds.cukup),
    baik: data.filter(s => s.nilai >= thresholds.cukup && s.nilai < thresholds.baik),
    sangat: data.filter(s => s.nilai >= thresholds.baik)
  };
  
  data.forEach(siswa => {
    if (siswa.nilai < thresholds.perluBimbingan) {
      siswa.kategori = 'Perlu Bimbingan';
      siswa.badge = 'perlu';
      siswa.tindakLanjut = 'Bimbingan khusus';
    } else if (siswa.nilai < thresholds.cukup) {
      siswa.kategori = 'Cukup';
      siswa.badge = 'cukup';
      siswa.tindakLanjut = 'Pendampingan';
    } else if (siswa.nilai < thresholds.baik) {
      siswa.kategori = 'Baik';
      siswa.badge = 'baik';
      siswa.tindakLanjut = 'Pengayaan';
    } else {
      siswa.kategori = 'Sangat Baik';
      siswa.badge = 'sangat';
      siswa.tindakLanjut = 'Pengayaan lanjut';
    }
  });
  
  return {
    totalSiswa,
    rataRata: rataRata.toFixed(2),
    nilaiTertinggi,
    nilaiTerendah,
    thresholds,
    kategori,
    data,
    persentase: {
      perlu: ((kategori.perlu.length / totalSiswa) * 100).toFixed(1),
      cukup: ((kategori.cukup.length / totalSiswa) * 100).toFixed(1),
      baik: ((kategori.baik.length / totalSiswa) * 100).toFixed(1),
      sangat: ((kategori.sangat.length / totalSiswa) * 100).toFixed(1)
    }
  };
}

function tampilkanHasil(analisis) {
  const resultSection = document.getElementById('resultSection');
  resultSection.classList.add('show');
  
  // Summary Cards
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
      <h3>Nilai Tertinggi</h3>
      <div class="value">${analisis.nilaiTertinggi}</div>
      <div class="label">poin</div>
    </div>
    <div class="summary-card">
      <h3>Nilai Terendah</h3>
      <div class="value">${analisis.nilaiTerendah}</div>
      <div class="label">poin</div>
    </div>
  `;
  
  // Chart Bars
  const chartBars = document.getElementById('chartBars');
  chartBars.innerHTML = `
    <div class="chart-bar">
      <div class="chart-label">Perlu Bimbingan</div>
      <div class="chart-bar-bg">
        <div class="chart-bar-fill perlu" style="width: ${Math.max(analisis.persentase.perlu, 5)}%">
          ${analisis.kategori.perlu.length} siswa (${analisis.persentase.perlu}%)
        </div>
      </div>
    </div>
    <div class="chart-bar">
      <div class="chart-label">Cukup</div>
      <div class="chart-bar-bg">
        <div class="chart-bar-fill cukup" style="width: ${Math.max(analisis.persentase.cukup, 5)}%">
          ${analisis.kategori.cukup.length} siswa (${analisis.persentase.cukup}%)
        </div>
      </div>
    </div>
    <div class="chart-bar">
      <div class="chart-label">Baik</div>
      <div class="chart-bar-bg">
        <div class="chart-bar-fill baik" style="width: ${Math.max(analisis.persentase.baik, 5)}%">
          ${analisis.kategori.baik.length} siswa (${analisis.persentase.baik}%)
        </div>
      </div>
    </div>
    <div class="chart-bar">
      <div class="chart-label">Sangat Baik</div>
      <div class="chart-bar-bg">
        <div class="chart-bar-fill sangat" style="width: ${Math.max(analisis.persentase.sangat, 5)}%">
          ${analisis.kategori.sangat.length} siswa (${analisis.persentase.sangat}%)
        </div>
      </div>
    </div>
  `;
  
  // Result Table
  const resultTableBody = document.getElementById('resultTableBody');
  resultTableBody.innerHTML = analisis.data.map((siswa, index) => `
    <tr>
      <td>${index + 1}</td>
      <td style="text-align: left; padding-left: 15px;"><strong>${siswa.nama}</strong></td>
      <td><strong>${siswa.nilai}</strong></td>
      <td><span class="badge badge-${siswa.badge}">${siswa.kategori}</span></td>
      <td style="font-size: 13px;">${siswa.tindakLanjut}</td>
    </tr>
  `).join('');
  
  // Recommendation
  const recommendation = document.getElementById('recommendation');
  let recHTML = '<h4>💡 Rekomendasi Tindak Lanjut Pembelajaran</h4><ul>';
  
  if (analisis.kategori.perlu.length > 0) {
    recHTML += `<li><strong>🤝 Bimbingan Khusus:</strong> ${analisis.kategori.perlu.length} siswa perlu pendampingan tambahan untuk mencapai tujuan pembelajaran: 
      <div class="student-list"><strong>Nama:</strong> ${analisis.kategori.perlu.map(s => s.nama).join(', ')}</div>
    </li>`;
  }
  
  if (analisis.kategori.cukup.length > 0) {
    recHTML += `<li><strong>📚 Pendampingan:</strong> ${analisis.kategori.cukup.length} siswa sudah mencapai tujuan dengan bimbingan, perlu latihan lebih mandiri: 
      <div class="student-list"><strong>Nama:</strong> ${analisis.kategori.cukup.map(s => s.nama).join(', ')}</div>
    </li>`;
  }
  
  if (analisis.kategori.baik.length > 0 || analisis.kategori.sangat.length > 0) {
    recHTML += `<li><strong>⭐ Pengayaan:</strong> Berikan tantangan lebih untuk ${analisis.kategori.baik.length + analisis.kategori.sangat.length} siswa yang sudah mencapai/melampaui tujuan pembelajaran</li>`;
  }
  
  if (parseFloat(analisis.rataRata) < 75) {
    recHTML += `<li><strong> Refleksi Metode:</strong> Rata-rata kelas di bawah 75, pertimbangkan untuk mengevaluasi strategi pembelajaran dan memberikan asesmen diagnostik</li>`;
  } else if (parseFloat(analisis.rataRata) >= 85) {
    recHTML += `<li><strong>🎉 Apresiasi:</strong> Rata-rata kelas sangat baik! Pertahankan metode pembelajaran yang sudah efektif</li>`;
  }
  
  recHTML += `<li><strong>📝 Asesmen Lanjutan:</strong> Lakukan asesmen formatif berikutnya untuk memantau perkembangan setiap siswa</li>`;
  recHTML += `<li><strong>🤝 Kolaborasi:</strong> Diskusikan hasil ini dengan rekan sejawat untuk berbagi strategi pembelajaran</li>`;
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
      totalSiswa: analisisResult.totalSiswa,
      rataRata: parseFloat(analisisResult.rataRata),
      nilaiTertinggi: analisisResult.nilaiTertinggi,
      nilaiTerendah: analisisResult.nilaiTerendah,
      thresholds: analisisResult.thresholds,
      persentase: analisisResult.persentase,
      data: dataSiswa,
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
  
  if (!kelas || !mapel || !topik || dataSiswa.length === 0) {
    alert('️ Lakukan analisis terlebih dahulu!');
    return;
  }
  
  if (!analisisResult) {
    analisisResult = hitungAnalisis(dataSiswa);
  }
  
  let tableHTML = `<table border="1" cellpadding="8" cellspacing="0" style="width: 100%; border-collapse: collapse;">
    <thead>
      <tr style="background: #ec4899; color: white;">
        <th>No</th>
        <th>Nama Siswa</th>
        <th>Nilai</th>
        <th>Kategori KKTP</th>
        <th>Tindak Lanjut</th>
      </tr>
    </thead>
    <tbody>`;
  
  analisisResult.data.forEach((siswa, index) => {
    tableHTML += `<tr>
      <td style="text-align: center;">${index + 1}</td>
      <td>${siswa.nama}</td>
      <td style="text-align: center; font-weight: bold;">${siswa.nilai}</td>
      <td style="text-align: center;">${siswa.kategori}</td>
      <td style="text-align: center;">${siswa.tindakLanjut}</td>
    </tr>`;
  });
  
  tableHTML += `</tbody></table>`;
  
  const htmlContent = `<html><head><meta charset="utf-8"></head>
    <body style="font-family: 'Times New Roman', serif; margin: 2cm;">
      <div style="text-align: center; margin-bottom: 30px; border-bottom: 3px double #000; padding-bottom: 15px;">
        <h1 style="margin: 0; font-size: 18pt;">ANALISIS KKTP</h1>
        <h2 style="margin: 10px 0; font-size: 14pt;">${topik}</h2>
        <p style="margin: 5px 0;"><strong>Kelas:</strong> ${kelas} | <strong>Mapel:</strong> ${mapel}</p>
        <p style="margin: 5px 0;"><strong>Periode:</strong> ${periode} | <strong>Tahun Ajaran:</strong> 2026/2027</p>
      </div>
      
      <div style="margin-bottom: 20px;">
        <h3 style="color: #be185d;">📊 Ringkasan Hasil</h3>
        <table style="width: 60%; border: none;">
          <tr><td style="width: 50%;"><strong>Total Siswa:</strong></td><td>${analisisResult.totalSiswa} peserta didik</td></tr>
          <tr><td><strong>Rata-rata Kelas:</strong></td><td>${analisisResult.rataRata}</td></tr>
          <tr><td><strong>Nilai Tertinggi:</strong></td><td>${analisisResult.nilaiTertinggi}</td></tr>
          <tr><td><strong>Nilai Terendah:</strong></td><td>${analisisResult.nilaiTerendah}</td></tr>
        </table>
      </div>
      
      <h3 style="color: #be185d;">📈 Distribusi Ketercapaian KKTP</h3>
      <ul>
        <li><strong>Perlu Bimbingan:</strong> ${analisisResult.kategori.perlu.length} siswa (${analisisResult.persentase.perlu}%)</li>
        <li><strong>Cukup:</strong> ${analisisResult.kategori.cukup.length} siswa (${analisisResult.persentase.cukup}%)</li>
        <li><strong>Baik:</strong> ${analisisResult.kategori.baik.length} siswa (${analisisResult.persentase.baik}%)</li>
        <li><strong>Sangat Baik:</strong> ${analisisResult.kategori.sangat.length} siswa (${analisisResult.persentase.sangat}%)</li>
      </ul>
      
      <h3 style="color: #be185d;">📋 Detail Nilai Siswa</h3>
      ${tableHTML}
      
      <div style="margin-top: 30px; padding: 15px; background: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 8px;">
        <h4 style="margin: 0 0 10px 0; color: #92400e;">💡 Rekomendasi Tindak Lanjut</h4>
        <ul style="margin: 0; padding-left: 20px;">
          ${analisisResult.kategori.perlu.length > 0 ? `<li><strong>Bimbingan Khusus:</strong> ${analisisResult.kategori.perlu.length} siswa perlu pendampingan tambahan</li>` : ''}
          ${analisisResult.kategori.cukup.length > 0 ? `<li><strong>Pendampingan:</strong> ${analisisResult.kategori.cukup.length} siswa perlu latihan lebih mandiri</li>` : ''}
          <li><strong>Pengayaan:</strong> Berikan tantangan lebih untuk siswa yang sudah mencapai/melampaui TP</li>
          <li><strong>Asesmen Lanjutan:</strong> Lakukan asesmen formatif berikutnya</li>
        </ul>
      </div>
      
      <div style="margin-top: 40px; text-align: right; font-size: 9pt; font-style: italic; color: #666;">
        SDN 139 LAMANDA | ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
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
  
  showToast(' File Word berhasil diunduh!');
};

window.resetForm = function() {
  if (confirm('🔄 Reset semua data?')) {
    document.getElementById('inpKelas').value = '';
    document.getElementById('inpMapel').value = '';
    document.getElementById('inpTopik').value = '';
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
