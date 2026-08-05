// modules/admin-pembelajaran/features/promes.js
// =========================================
// FITUR: PROGRAM SEMESTER (PROMES)
// SDN 139 LAMANDA - Firestore: promes
// =========================================

import { doc, getDoc, setDoc, serverTimestamp } 
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let dbInstance = null;
let currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');

const CSS_ID = 'promes-css';

const BULAN_GANJIL = ['Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const BULAN_GENAP  = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni'];

const TEMPLATE_MAPEL = [
  { mapel: 'Pendidikan Agama & Budi Pekerti', jp: 3 },
  { mapel: 'Pendidikan Pancasila', jp: 4 },
  { mapel: 'Bahasa Indonesia', jp: 6 },
  { mapel: 'Matematika', jp: 4 },
  { mapel: 'IPAS', jp: 4 },
  { mapel: 'Bahasa Inggris', jp: 2 },
  { mapel: 'Seni dan Budaya', jp: 3 },
  { mapel: 'PJOK', jp: 3 }
];

/**
 * Fungsi init - Dipanggil oleh main.js
 */
export async function init(container, db) {
  dbInstance = db;
  loadFeatureCSS();
  renderPromesUI(container);
  attachEventListeners(container);
  console.log('✅ promes.js dimuat: Program Semester');
}

export function cleanup() {
  const css = document.getElementById(CSS_ID);
  if (css) css.remove();
}

function loadFeatureCSS() {
  if (document.getElementById(CSS_ID)) return;
  const style = document.createElement('style');
  style.id = CSS_ID;
  style.textContent = getInlineCSS();
  document.head.appendChild(style);
}

function getInlineCSS() {
  return `
    .promes-container{width:100%;background:linear-gradient(135deg,#eff6ff 0%,#dbeafe 100%);border-radius:16px;padding:20px;box-sizing:border-box;}
    .promes-header{background:linear-gradient(135deg,#2563eb,#3b82f6);color:#fff;padding:20px 25px;border-radius:12px;margin-bottom:16px;}
    .promes-header h2{margin:0 0 4px;font-size:22px;}
    .promes-header p{margin:0;font-size:13px;opacity:.95;}
    .promes-form{background:#fff;padding:16px 20px;border-radius:12px;margin-bottom:16px;box-shadow:0 1px 4px rgba(0,0,0,.08);}
    .form-row{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;}
    .form-group label{display:block;font-size:12px;font-weight:600;margin-bottom:6px;color:#1e3a8a;}
    .form-control{width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:8px;font-size:14px;box-sizing:border-box;}
    .table-responsive{overflow-x:auto;background:#fff;border-radius:12px;padding:12px;}
    .promes-table{width:100%;border-collapse:collapse;font-size:12px;min-width:900px;}
    .promes-table th{background:#2563eb;color:#fff;padding:10px 6px;border:1px solid #1d4ed8;font-size:11px;text-align:center;}
    .promes-table td{border:1px solid #e2e8f0;padding:6px;text-align:center;vertical-align:middle;}
    .input-mapel{width:100%;min-width:160px;padding:8px;border:1px solid #cbd5e1;border-radius:6px;font-size:12px;box-sizing:border-box;}
    .input-jp,.input-mg{width:50px;padding:6px;border:1px solid #cbd5e1;border-radius:6px;text-align:center;font-size:12px;}
    .total-mg{font-weight:700;background:#eff6ff;}
    .total-jp{font-weight:700;background:#dcfce7;color:#166534;}
    .btn-hapus{background:#ef4444;color:#fff;border:none;border-radius:6px;padding:6px 10px;cursor:pointer;}
    .action-bar{display:flex;gap:10px;flex-wrap:wrap;margin:16px 0;}
    .btn{padding:10px 18px;border:none;border-radius:8px;font-weight:600;font-size:13px;cursor:pointer;color:#fff;}
    .btn-load{background:#f59e0b;}.btn-secondary{background:#3b82f6;}.btn-primary{background:#8b5cf6;}
    .btn-save{background:#10b981;}.btn-reset{background:#6b7280;}.btn-print{background:#0ea5e9;}
    .promes-footer{display:flex;justify-content:space-around;background:#fff;border-radius:12px;padding:20px;margin-top:16px;flex-wrap:wrap;gap:16px;}
    .ttd-section{text-align:center;min-width:220px;font-size:13px;color:#1e3a8a;}
    .ttd-section p{margin:4px 0;}
    .input-ttd{width:100%;padding:8px;border:1px solid #cbd5e1;border-radius:6px;margin-top:6px;text-align:center;font-size:13px;box-sizing:border-box;}
    .promes-loading,.promes-info{padding:10px;border-radius:8px;margin:10px 0;font-size:13px;text-align:center;}
    .promes-loading{background:#fef9c3;color:#854d0e;}
    .promes-info{background:#dbeafe;color:#1e40af;}
    @media (max-width:768px){.form-row{grid-template-columns:1fr;}}
    @media print{
      .action-bar,.btn-hapus,.col-aksi,.promes-form,.promes-header{display:none !important;}
      .input-mapel,.input-jp,.input-mg,.input-ttd{border:none;background:transparent;}
      .promes-container{background:#fff;}
    }
  `;
}

function renderPromesUI(container) {
  container.innerHTML = `
    <div class="promes-container">
      <div class="promes-header">
        <h2>🗓️ Program Semester (Promes)</h2>
        <p>SDN 139 LAMANDA - Pemetaan JP & Minggu Efektif per Semester</p>
      </div>

      <div class="promes-form">
        <div class="form-row">
          <div class="form-group">
            <label>📅 Tahun Ajaran</label>
            <input type="text" id="promesTA" class="form-control" placeholder="2026-2027">
          </div>
          <div class="form-group">
            <label>📘 Semester</label>
            <select id="promesSemester" class="form-control">
              <option value="Ganjil">Ganjil</option>
              <option value="Genap">Genap</option>
            </select>
          </div>
          <div class="form-group">
            <label>🏫 Kelas</label>
            <select id="promesKelas" class="form-control">
              <option value="">-- Pilih Kelas --</option>
              ${[1,2,3,4,5,6].map(k => `<option value="${k}">Kelas ${k}</option>`).join('')}
            </select>
          </div>
        </div>
      </div>

      <div id="promesLoading" class="promes-loading" style="display:none;">⏳ Memuat data...</div>
      <div id="promesInfo" class="promes-info" style="display:none;"></div>

      <div class="table-responsive">
        <table class="promes-table">
          <thead id="promesThead"></thead>
          <tbody id="promesTbody"></tbody>
        </table>
      </div>

      <div class="action-bar">
        <button id="btnMuatPromes" class="btn btn-load">📥 Muat Data</button>
        <button id="btnTemplate" class="btn btn-secondary">📚 Template Mapel</button>
        <button id="btnTambahBaris" class="btn btn-primary">➕ Tambah Baris</button>
        <button id="btnSimpanPromes" class="btn btn-save">💾 Simpan</button>
        <button id="btnResetPromes" class="btn btn-reset">🔄 Reset</button>
        <button id="btnPrintPromes" class="btn btn-print">🖨️ Print</button>
      </div>

      <div class="promes-footer">
        <div class="ttd-section">
          <p>Mengetahui,</p>
          <p>Kepala Sekolah</p>
          <br><br>
          <input type="text" id="kepsekNama" class="input-ttd" placeholder="Nama Kepala Sekolah">
          <input type="text" id="kepsekNip" class="input-ttd" placeholder="NIP Kepala Sekolah">
        </div>
        <div class="ttd-section">
          <p>Guru Kelas</p>
          <br><br><br>
          <input type="text" id="guruNama" class="input-ttd" placeholder="Nama Guru Kelas">
          <input type="text" id="guruNip" class="input-ttd" placeholder="NIP Guru">
        </div>
      </div>
    </div>
  `;

  setDefaultForm();
  renderHeaderBulan();
  for (let i = 0; i < 3; i++) tambahBaris();
}

// ⭐ Default Tahun Ajaran & Semester dari tanggal hari ini
function setDefaultForm() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth(); // 0-11
  const tpStart = (m >= 6) ? y : y - 1; // Juli ke atas = TA baru
  document.getElementById('promesTA').value = `${tpStart}-${tpStart + 1}`;
  document.getElementById('promesSemester').value = (m >= 6) ? 'Ganjil' : 'Genap';
}

function bulanAktif() {
  return document.getElementById('promesSemester').value === 'Ganjil' ? BULAN_GANJIL : BULAN_GENAP;
}

function renderHeaderBulan() {
  const bulan = bulanAktif();
  document.getElementById('promesThead').innerHTML = `
    <tr>
      <th style="width:40px;">No</th>
      <th>Mapel / Tema Pembelajaran</th>
      <th style="width:70px;">JP/Minggu</th>
      ${bulan.map(b => `<th>${b}<br><small>(Mg Efektif)</small></th>`).join('')}
      <th style="width:55px;">Σ Mg</th>
      <th style="width:70px;">Total JP</th>
      <th class="col-aksi" style="width:50px;">Aksi</th>
    </tr>
  `;
}

function escapeHtml(s = '') {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function tambahBaris(item = null) {
  const tbody = document.getElementById('promesTbody');
  if (!tbody) return;
  const row = document.createElement('tr');
  const minggu = (item && Array.isArray(item.minggu)) ? item.minggu : [0,0,0,0,0,0];

  row.innerHTML = `
    <td class="col-no"></td>
    <td><input type="text" class="input-mapel" placeholder="Nama mapel / tema..." value="${item ? escapeHtml(item.mapel) : ''}"></td>
    <td><input type="number" class="input-jp" min="0" max="20" value="${item ? item.jp : ''}"></td>
    ${minggu.map((mg, i) => `<td><input type="number" class="input-mg" data-bulan="${i}" min="0" max="6" value="${mg || ''}"></td>`).join('')}
    <td class="total-mg">0</td>
    <td class="total-jp">0</td>
    <td class="col-aksi"><button type="button" class="btn-hapus">🗑️</button></td>
  `;

  tbody.appendChild(row);
  row.querySelectorAll('input').forEach(inp => inp.addEventListener('input', () => hitungRow(row)));
  row.querySelector('.btn-hapus').addEventListener('click', () => { row.remove(); updateNomor(); });
  hitungRow(row);
  updateNomor();
}

function hitungRow(row) {
  const jp = parseFloat(row.querySelector('.input-jp').value) || 0;
  let totalMg = 0;
  row.querySelectorAll('.input-mg').forEach(i => totalMg += (parseFloat(i.value) || 0));
  row.querySelector('.total-mg').textContent = totalMg;
  row.querySelector('.total-jp').textContent = jp * totalMg;
}

function updateNomor() {
  document.querySelectorAll('#promesTbody tr').forEach((row, i) => {
    row.querySelector('.col-no').textContent = i + 1;
  });
}

function collectItems() {
  const items = [];
  document.querySelectorAll('#promesTbody tr').forEach(row => {
    const mapel = row.querySelector('.input-mapel').value.trim();
    if (!mapel) return;
    const jp = parseFloat(row.querySelector('.input-jp').value) || 0;
    const minggu = [];
    row.querySelectorAll('.input-mg').forEach(i => minggu.push(parseFloat(i.value) || 0));
    items.push({ mapel, jp, minggu });
  });
  return items;
}

function getTA() {
  return document.getElementById('promesTA').value.trim().replace(/\//g, '-');
}

function attachEventListeners(container) {
  const kelasSel = container.querySelector('#promesKelas');
  const semSel   = container.querySelector('#promesSemester');

  container.querySelector('#btnMuatPromes').addEventListener('click', loadPromes);
  container.querySelector('#btnSimpanPromes').addEventListener('click', simpanPromes);
  container.querySelector('#btnTambahBaris').addEventListener('click', () => tambahBaris());
  container.querySelector('#btnPrintPromes').addEventListener('click', () => window.print());
  container.querySelector('#btnTemplate').addEventListener('click', muatTemplate);
  container.querySelector('#btnResetPromes').addEventListener('click', () => {
    if (!confirm('Reset tabel? Data yang belum disimpan akan hilang.')) return;
    document.getElementById('promesTbody').innerHTML = '';
    for (let i = 0; i < 3; i++) tambahBaris();
  });

  // ⭐ Auto-load saat kelas dipilih
  kelasSel.addEventListener('change', () => { if (kelasSel.value) loadPromes(); });

  // ⭐ Ganti semester → ganti kolom bulan + auto-load
  semSel.addEventListener('change', () => {
    renderHeaderBulan();
    if (kelasSel.value) loadPromes();
  });
}

function muatTemplate() {
  if (!confirm('Muat template mapel default? Baris saat ini akan diganti.')) return;
  document.getElementById('promesTbody').innerHTML = '';
  TEMPLATE_MAPEL.forEach(t => tambahBaris({ mapel: t.mapel, jp: t.jp, minggu: [0,0,0,0,0,0] }));
  showInfo(' Template mapel dimuat. Silakan isi minggu efektif per bulan.');
}

async function loadPromes() {
  const ta = getTA();
  const semester = document.getElementById('promesSemester').value;
  const kelas = document.getElementById('promesKelas').value;

  if (!kelas) { showInfo('⚠️ Pilih kelas terlebih dahulu.'); return; }

  showLoading(true);
  try {
    const id = `promes-${kelas}-${ta}-${semester}`;
    const snap = await getDoc(doc(dbInstance, 'promes', id));
    const tbody = document.getElementById('promesTbody');
    tbody.innerHTML = '';

    if (snap.exists()) {
      const d = snap.data();
      (d.items || []).forEach(it => tambahBaris(it));
      if (!(d.items || []).length) tambahBaris();

      document.getElementById('kepsekNama').value = d.kepsekNama || '';
      document.getElementById('kepsekNip').value  = d.kepsekNip || '';
      document.getElementById('guruNama').value   = d.guruNama || '';
      document.getElementById('guruNip').value    = d.guruNip || '';

      showInfo(`✅ Data Promes ${semester} Kelas ${kelas} berhasil dimuat.`);
    } else {
      for (let i = 0; i < 3; i++) tambahBaris();
      showInfo('ℹ️ Belum ada data tersimpan untuk filter ini. Silakan isi manual atau gunakan Template Mapel.');
    }
  } catch (e) {
    showInfo('❌ Gagal memuat data: ' + e.message);
  } finally {
    showLoading(false);
  }
}

async function simpanPromes() {
  const ta = getTA();
  const semester = document.getElementById('promesSemester').value;
  const kelas = document.getElementById('promesKelas').value;

  if (!kelas) { alert('Pilih kelas terlebih dahulu!'); return; }
  const items = collectItems();
  if (!items.length) { alert('Isi minimal satu baris mapel!'); return; }
  if (!confirm('Simpan Program Semester ke database?')) return;

  showLoading(true);
  try {
    const id = `promes-${kelas}-${ta}-${semester}`;
    await setDoc(doc(dbInstance, 'promes', id), {
      tahunAjaran: ta,
      semester,
      kelas,
      items,
      kepsekNama: document.getElementById('kepsekNama').value.trim(),
      kepsekNip:  document.getElementById('kepsekNip').value.trim(),
      guruNama:   document.getElementById('guruNama').value.trim(),
      guruNip:    document.getElementById('guruNip').value.trim(),
      uploaderUid: currentUser.uid || 'anon',
      createdBy:   currentUser.uid || 'anon',
      updatedAt: serverTimestamp()
    }, { merge: true });

    showInfo('✅ Program Semester berhasil disimpan!');
  } catch (e) {
    showInfo('❌ Gagal menyimpan: ' + e.message);
  } finally {
    showLoading(false);
  }
}

function showLoading(show) {
  const el = document.getElementById('promesLoading');
  if (el) el.style.display = show ? 'block' : 'none';
}

function showInfo(msg) {
  const el = document.getElementById('promesInfo');
  if (el) { el.textContent = msg; el.style.display = 'block'; }
}
