// modules/admin-pembelajaran/features/penilaian.js
// CLEAN REBUILD - Versi Sempurna dari Nol
// Fitur: KurMer + Pembelajaran Mendalam (Sadar, Makna, Gembira)
// Mapel: js/data-mapel.js | Kelas: 1-6 terpisah | Siswa: RTDB | Simpan: localStorage + Firestore 'penilaian' (guruId)
// Export: Word DOM + CSV
// FIX: exportWord() sekarang bersumber dari dataSiswa (roster lengkap dari RTDB)
//      supaya SEMUA nama yang ada di tabel selalu ikut ter-export ke Word,
//      bukan hanya baris yang berhasil terbaca dataset-nya dari DOM.

import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { getFirestore, doc, writeBatch } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { app } from "../../../js/firebase-config.js";

const database = getDatabase(app);
const firestore = getFirestore(app);
const FS_COLLECTION = 'penilaian'; // sesuai firestore.rules kamu - isOwner cek guruId
const LS_KEY = 'sdn139_penilaian_final';

const CSS_PATH = '../../../css/modules/analisis-kktp.css';
const CSS_ID = 'penilaian-kurmer-css';

let dataSiswa = [];
let dataPenilaian = JSON.parse(localStorage.getItem(LS_KEY) || '[]');
let editMode = true;

const FALLBACK_MAPEL = [
  { id: 'paibd', nama: 'Pendidikan Agama Islam dan Budi Pekerti', singkatan: 'PAI', icon: '🕌' },
  { id: 'matematika', nama: 'Matematika', singkatan: 'MTK', icon: '🔢' },
  { id: 'ipas', nama: 'IPAS', singkatan: 'IPAS', icon: '🔬' },
  { id: 'pjok', nama: 'PJOK', singkatan: 'PJOK', icon: '⚽' },
  { id: 'bahasa-indonesia', nama: 'Bahasa Indonesia', singkatan: 'BIN', icon: '📖' },
  { id: 'pendidikan-pancasila', nama: 'Pendidikan Pancasila', singkatan: 'PP', icon: '🇮🇩' },
  { id: 'seni-budaya', nama: 'Seni dan Budaya', singkatan: 'SB', icon: '🎨' },
  { id: 'bahasa-inggris', nama: 'Bahasa Inggris', singkatan: 'BING', icon: '🇬🇧' },
];

export async function init(container, db) {
  loadCSS();
  renderUI(container);
  attachEvents();
  await loadMataPelajaran();
  loadMasterTP();
}

export function cleanup() {
  const css = document.getElementById(CSS_ID);
  if (css) css.remove();
  const inline = document.getElementById(CSS_ID + '-inline');
  if (inline) inline.remove();
}

function loadCSS() {
  if (document.getElementById(CSS_ID)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = CSS_PATH;
  link.id = CSS_ID;
  link.onerror = () => {
    const style = document.createElement('style');
    style.id = CSS_ID + '-inline';
    style.textContent = `
      .kktp-container{max-width:1250px;margin:0 auto;font-family:'Segoe UI',sans-serif}
      .btn-action{padding:10px 18px;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-size:13px;transition:all .2s}
      .btn-action:hover{transform:translateY(-1px);box-shadow:0 4px 12px rgba(0,0,0,.15)}
      .form-control{width:100%;padding:10px 12px;border:1px solid #cbd5e1;border-radius:8px;font-size:13px;box-sizing:border-box}
      .siswa-table{width:100%;border-collapse:collapse;background:white;border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.06)}
      .siswa-table th{background:linear-gradient(135deg,#e11d48,#be185d);color:white;padding:12px 10px;font-size:12px;text-transform:uppercase}
      .siswa-table td{padding:10px;border-bottom:1px solid #f1f5f9;text-align:center;font-size:13px}
      .siswa-table .nama-cell{text-align:left;font-weight:700;color:#1e293b}
      .nilai-cell{cursor:pointer;background:#f8fafc;border-radius:6px;font-weight:700;color:#2563eb;transition:.2s}
      .nilai-cell:hover{background:#dbeafe}
      .predikat-cell{font-size:11px;line-height:1.3}
      .badge-pred{padding:4px 8px;border-radius:12px;font-weight:700;font-size:10px;display:inline-block}
      .badge-BB{background:#fee2e2;color:#991b1b} .badge-MB{background:#fef3c7;color:#92400e}
      .badge-BSH{background:#d1fae5;color:#065f46} .badge-BSB{background:#dbeafe;color:#1e40af}
      .card{background:white;padding:20px;border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,.07);margin-bottom:18px;border:1px solid #f1f5f9}
      .grid-3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px}
      .grid-2{display:grid;grid-template-columns:2fr 1fr;gap:14px}
      @media(max-width:900px){.grid-3,.grid-2{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  };
  document.head.appendChild(link);
}

// ============ MAPEL dari js/data-mapel.js ============
async function loadMataPelajaran() {
  const sel = document.getElementById('inpMapelPenilaian');
  if (!sel) return;

  const tryImport = async (path) => {
    try {
      const mod = await import(path);
      const list = mod.default || mod.DATA_MAPEL || mod.dataMapel || mod.mataPelajaran || mod.daftarMapel || mod.MAPEL || [];
      if (Array.isArray(list) && list.length) return list;
    } catch (e) {}
    return null;
  };

  let list = await tryImport('../../../js/data-mapel.js');
  if (!list) list = await tryImport('../../../js/config/data-mapel.js');
  
  if (list && list.length) {
    console.log('✅ Mapel loaded:', list.length, 'dari js/data-mapel.js');
    populateMapel(list);
  } else {
    console.log('⚠️ Pakai FALLBACK_MAPEL');
    populateMapel(FALLBACK_MAPEL);
  }
}

function populateMapel(list) {
  const sel = document.getElementById('inpMapelPenilaian');
  if (!sel) return;
  sel.innerHTML = '<option value="">-- Pilih Mapel --</option>';
  list.forEach(m => {
    const nama = typeof m === 'string' ? m : (m.nama || m.name || m.singkatan || m.kode || '');
    const singkatan = typeof m === 'object' ? (m.singkatan || nama) : nama;
    const icon = typeof m === 'object' ? (m.icon || '📚') : '📚';
    if (!nama) return;
    const opt = document.createElement('option');
    opt.value = nama;
    opt.textContent = `${icon} ${singkatan}`;
    sel.appendChild(opt);
  });
}

function getMasterTP() {
  const keys = ['data-tp', 'master-tp', 'sdn139_data_tp', 'cp-tp-atp', 'rpm-spesifik-data-tp'];
  for (let k of keys) {
    try {
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      const arr = Array.isArray(parsed) ? parsed : (parsed.data || parsed.tp || []);
      if (arr.length) return arr;
    } catch {}
  }
  return [];
}

function loadMasterTP() {
  const master = getMasterTP();
  const sel = document.getElementById('inpTP');
  if (!sel) return;
  if (!master.length) {
    sel.innerHTML = '<option value="">-- TP belum ada di Master, ketik manual --</option><option value="__manual__">Ketik Manual</option>';
    return;
  }
}

// ============ UI CLEAN ============
function renderUI(container) {
  container.innerHTML = `
    <div class="kktp-container">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:10px">
        <button onclick="window.location.href='adm-pembelajaran.html'" style="background:#0f172a;color:white;padding:9px 14px;border:none;border-radius:8px;cursor:pointer;font-weight:700;font-size:13px">← Dashboard</button>
        <div style="font-size:11px;background:#eff6ff;border:1px solid #bfdbfe;padding:6px 12px;border-radius:20px;color:#1e40af">🧠 KurMer + Pembelajaran Mendalam • Sadar • Makna • Gembira • Kelas 1-6 Terpisah</div>
      </div>

      <div style="background:linear-gradient(135deg,#2563eb,#7c3aed);color:white;padding:20px 22px;border-radius:14px;margin-bottom:16px">
        <h2 style="margin:0;font-size:20px">📎 Penilaian Kurikulum Merdeka - CLEAN REBUILD</h2>
        <p style="margin:6px 0 0;opacity:.92;font-size:12px">RTDB: Data Peserta Didik • Mapel: js/data-mapel.js • TP: Master TP • Simpan: localStorage + Firestore 'penilaian' (guruId) • Export: Word DOM + CSV</p>
      </div>

      <div class="card">
        <div class="grid-3">
          <div>
            <label style="font-size:11px;font-weight:800;color:#475569">🎓 KELAS (1-6 Terpisah)</label>
            <select id="inpKelasPenilaian" class="form-control">
              <option value="">-- Pilih Kelas --</option>
              <option value="1">Kelas 1 / Fase A</option>
              <option value="2">Kelas 2 / Fase A</option>
              <option value="3">Kelas 3 / Fase B</option>
              <option value="4">Kelas 4 / Fase B</option>
              <option value="5">Kelas 5 / Fase C</option>
              <option value="6">Kelas 6 / Fase C</option>
            </select>
          </div>
          <div>
            <label style="font-size:11px;font-weight:800;color:#475569">📚 MATA PELAJARAN (data-mapel.js)</label>
            <select id="inpMapelPenilaian" class="form-control"><option>-- Memuat... --</option></select>
          </div>
          <div>
            <label style="font-size:11px;font-weight:800;color:#475569">📝 JENIS PENILAIAN</label>
            <select id="inpJenisPenilaian" class="form-control">
              <option value="formatif">Formatif</option>
              <option value="sumatif">Sumatif</option>
              <option value="diagnostik">Diagnostik</option>
            </select>
          </div>
        </div>

        <div class="grid-2" style="margin-top:14px">
          <div>
            <label style="font-size:11px;font-weight:800;color:#475569">🎯 TUJUAN PEMBELAJARAN (dari Master TP)</label>
            <select id="inpTP" class="form-control"><option>-- Pilih TP --</option></select>
            <input id="inpTPManual" placeholder="Ketik TP manual jika belum ada di Master" class="form-control" style="margin-top:8px;display:none">
          </div>
          <div>
            <label style="font-size:11px;font-weight:800;color:#475569">KKTP & PRINSIP PM</label>
            <input id="inpKKTP" type="number" value="70" class="form-control">
            <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap">
              <label style="font-size:11px;background:#dbeafe;padding:5px 10px;border-radius:20px;cursor:pointer"><input type="checkbox" id="pmSadar" checked> 🧘 Sadar</label>
              <label style="font-size:11px;background:#dcfce7;padding:5px 10px;border-radius:20px;cursor:pointer"><input type="checkbox" id="pmMakna" checked> 🔗 Makna</label>
              <label style="font-size:11px;background:#fef9c3;padding:5px 10px;border-radius:20px;cursor:pointer"><input type="checkbox" id="pmGembira" checked> 😊 Gembira</label>
            </div>
          </div>
        </div>

        <div id="infoSiswaBox" style="margin-top:14px;background:#fffbeb;border-left:4px solid #f59e0b;padding:10px 12px;border-radius:8px;font-size:12px;display:none">
          ✅ Data siswa RTDB: <b><span id="infoSiswaCount">0</span> siswa</b> | Klik angka Nilai untuk edit langsung | Fase otomatis sesuai Kelas (Kelas 1-2 = Fase A, 3-4 = B, 5-6 = C, terpisah)
        </div>
      </div>

      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:10px">
          <h4 style="margin:0;font-size:14px">👥 Daftar Nilai Peserta Didik</h4>
          <button id="btnTarikSiswa" class="btn-action" style="background:#0ea5e9;color:white">🔄 Tarik Data Peserta Didik dari RTDB</button>
        </div>

        <div style="overflow:auto;max-height:60vh">
          <table class="siswa-table" id="tabelPenilaian">
            <thead><tr><th style="width:40px">No</th><th>Nama Peserta Didik</th><th style="width:120px">Kelas / Fase</th><th style="width:130px">Nilai (Klik Edit)</th><th>Predikat & Tindak Lanjut PM</th></tr></thead>
            <tbody id="tbodyPenilaian"><tr><td colspan="5" style="padding:24px;color:#64748b">👆 Pilih Kelas 1-6 dulu, lalu klik Tarik Data Peserta Didik</td></tr></tbody>
          </table>
        </div>

        <div style="display:flex;gap:10px;justify-content:center;margin-top:18px;flex-wrap:wrap">
          <button id="btnSimpanPenilaian" class="btn-action" style="background:#2563eb;color:white">💾 Simpan Penilaian (LS + Firestore)</button>
          <button id="btnEditMode" class="btn-action" style="background:#f59e0b;color:white">✏️ Mode Edit: ON</button>
          <button id="btnUnduhPenilaian" class="btn-action" style="background:#10b981;color:white">⬇ Unduh CSV</button>
          <button id="btnExportWord" class="btn-action" style="background:#8b5cf6;color:white">📄 Export Word (DOM)</button>
        </div>
      </div>
    </div>
  `;
}

function attachEvents() {
  document.getElementById('inpKelasPenilaian')?.addEventListener('change', e => {
    if (e.target.value) loadSiswaPenilaian(e.target.value);
  });
  document.getElementById('btnTarikSiswa')?.addEventListener('click', tarikDataPesertaDidik);

  document.getElementById('inpMapelPenilaian')?.addEventListener('change', function() {
    const mapel = this.value;
    const tpSel = document.getElementById('inpTP');
    const master = getMasterTP();
    const filtered = master.filter(t => !mapel || (t.mapel && t.mapel.toLowerCase().includes(mapel.toLowerCase())) || (t.mata_pelajaran && t.mata_pelajaran.toLowerCase().includes(mapel.toLowerCase())));
    tpSel.innerHTML = '<option value="">-- Pilih TP --</option>';
    if (filtered.length) {
      filtered.forEach(t => {
        const txt = t.tp || t.tujuan || t.deskripsi || '';
        const opt = document.createElement('option');
        opt.value = txt;
        opt.textContent = txt.substring(0, 90) + (txt.length > 90 ? '...' : '');
        tpSel.appendChild(opt);
      });
      tpSel.innerHTML += '<option value="__manual__">+ Ketik Manual</option>';
    } else {
      tpSel.innerHTML += '<option value="__manual__">TP belum ada, ketik manual</option>';
    }
  });

  document.getElementById('inpTP')?.addEventListener('change', function() {
    const manual = document.getElementById('inpTPManual');
    manual.style.display = (this.value === '__manual__' || this.value === '') ? 'block' : 'none';
  });

  document.getElementById('btnSimpanPenilaian')?.addEventListener('click', simpanPenilaian);
  document.getElementById('btnUnduhPenilaian')?.addEventListener('click', unduhCSV);
  document.getElementById('btnExportWord')?.addEventListener('click', exportWord);
  document.getElementById('btnEditMode')?.addEventListener('click', toggleEditMode);
}

function toggleEditMode() {
  editMode = !editMode;
  const btn = document.getElementById('btnEditMode');
  btn.textContent = editMode ? '✏️ Mode Edit: ON' : '🔒 Mode Edit: OFF';
  btn.style.background = editMode ? '#f59e0b' : '#6b7280';
  document.querySelectorAll('.nilai-cell').forEach(c => {
    c.style.pointerEvents = editMode ? 'auto' : 'none';
    c.style.opacity = editMode ? '1' : '0.5';
  });
}

// ============ RTDB SISWA ============
async function tarikDataPesertaDidik() {
  const kelas = document.getElementById('inpKelasPenilaian').value;
  if (!kelas) return alert('Pilih Kelas 1-6 dulu!');
  await loadSiswaPenilaian(kelas);
}

async function fetchSiswaFromRTDB(kelas) {
  const paths = [`siswa/${kelas}`, `data-peserta-didik/${kelas}`, `peserta-didik/${kelas}`, `data_siswa/${kelas}`, `siswa_kelas_${kelas}`];
  for (const p of paths) {
    try {
      const snap = await get(ref(database, p));
      if (snap.exists()) return normalizeSiswa(snap.val());
    } catch {}
  }
  // fallback: coba ambil semua lalu filter kelas
  try {
    const snap = await get(ref(database, 'siswa'));
    if (snap.exists()) {
      const all = normalizeSiswa(snap.val());
      const filtered = all.filter(s => String(s.kelas||s.kelas_id||'') === String(kelas) || String(s.kelas||'').includes(kelas));
      if (filtered.length) return filtered;
    }
  } catch {}
  return null;
}

function normalizeSiswa(raw) {
  if (!raw) return [];
  const arr = Array.isArray(raw) ? raw : Object.keys(raw).map(k => {
    const v = raw[k];
    return (v && typeof v === 'object') ? { id: k, ...v } : { id: k, nama: String(v) };
  });
  return arr.sort((a,b) => (a.nama||a.name||'').localeCompare(b.nama||b.name||'')).map(s => ({
    id: s.id || s.nisn || s.nis || '',
    nisn: s.nisn || s.nis || s.id || '',
    nama: (s.nama || s.name || s.nama_lengkap || 'Tanpa Nama').toUpperCase(),
    kelas: s.kelas || s.kelas_id || ''
  }));
}

async function loadSiswaPenilaian(kelas) {
  const tbody = document.getElementById('tbodyPenilaian');
  tbody.innerHTML = `<tr><td colspan="5" style="padding:20px">⏳ Menarik data Kelas ${kelas} dari RTDB...</td></tr>`;
  try {
    const list = await fetchSiswaFromRTDB(kelas);
    if (!list || !list.length) {
      dataSiswa = [];
      tbody.innerHTML = `<tr><td colspan="5" style="padding:20px;color:#ef4444">⚠️ Belum ada data peserta didik Kelas ${kelas} di RTDB. Isi dulu di Global Monitoring → Data Peserta Didik.</td></tr>`;
      return;
    }
    dataSiswa = list;
    document.getElementById('infoSiswaBox').style.display = 'block';
    document.getElementById('infoSiswaCount').textContent = list.length;
    tbody.innerHTML = '';
    list.forEach((siswa, idx) => {
      const existing = dataPenilaian.find(d => String(d.nisn) === String(siswa.nisn) && String(d.kelas) === String(kelas));
      const nilaiAwal = existing ? existing.nilai : '';
      const tr = document.createElement('tr');
      tr.dataset.nisn = siswa.nisn;
      tr.dataset.nama = siswa.nama;
      tr.dataset.kelas = kelas;
      tr.dataset.idx = idx; // index roster - dipakai exportWord agar pencocokan pasti akurat
      tr.innerHTML = `
        <td>${idx+1}</td>
        <td class="nama-cell">${siswa.nama}</td>
        <td>${kelas} / Fase ${kelas <=2 ? 'A' : kelas <=4 ? 'B' : 'C'}</td>
        <td class="nilai-cell" data-nilai="${nilaiAwal}" onclick="window.editNilai(this)">${nilaiAwal !== '' ? nilaiAwal : '<span style="color:#94a3b8">Klik isi</span>'}</td>
        <td class="predikat-cell">${existing ? getPredikatLabel(existing.nilai, existing.kktp) : '-'}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error(err);
    tbody.innerHTML = `<tr><td colspan="5" style="color:#ef4444">Gagal: ${err.message}</td></tr>`;
  }
}

window.editNilai = function(el) {
  if (!editMode) return;
  const cur = el.dataset.nilai || '';
  const input = prompt('Masukkan nilai (0-100):', cur);
  if (input === null) return;
  const nilai = parseInt(input);
  if (isNaN(nilai) || nilai <0 || nilai >100) return alert('Nilai 0-100!');
  el.dataset.nilai = nilai;
  el.textContent = nilai;
  const tr = el.closest('tr');
  const kktp = parseInt(document.getElementById('inpKKTP').value) || 70;
  tr.querySelector('.predikat-cell').innerHTML = getPredikatLabel(nilai, kktp);
};

function getPredikatInfo(nilai, kktp) {
  const n = parseInt(nilai)||0;
  const k = parseInt(kktp)||70;
  if (n < k) return { kode: 'BB', ket: 'Belum Berkembang', tindak: 'Remedial mindful', cls: 'BB' };
  if (n < k+10) return { kode: 'MB', ket: 'Mulai Berkembang', tindak: 'Penguatan bermakna', cls: 'MB' };
  if (n < k+20) return { kode: 'BSH', ket: 'Sesuai Harapan', tindak: 'Pengayaan joyful', cls: 'BSH' };
  return { kode: 'BSB', ket: 'Sangat Baik', tindak: 'Tutor sebaya', cls: 'BSB' };
}

function getPredikatLabel(nilai, kktp) {
  const p = getPredikatInfo(nilai, kktp);
  const pm = `${document.getElementById('pmSadar')?.checked ? ' mindful' : ''}${document.getElementById('pmMakna')?.checked ? ' bermakna' : ''}${document.getElementById('pmGembira')?.checked ? ' joyful' : ''}`;
  return `<span class="badge-pred badge-${p.cls}">${p.kode} - ${p.ket}</span> <span style="color:#64748b">${p.tindak}${pm}</span>`;
}

// ============ SIMPAN ============
async function simpanPenilaian() {
  const kelas = document.getElementById('inpKelasPenilaian').value;
  const mapel = document.getElementById('inpMapelPenilaian').value;
  const tp = document.getElementById('inpTP').value === '__manual__' ? document.getElementById('inpTPManual').value : document.getElementById('inpTP').value;
  const kktp = document.getElementById('inpKKTP').value;
  const jenis = document.getElementById('inpJenisPenilaian').value;

  if (!kelas) return alert('Pilih Kelas!');
  if (!mapel) return alert('Pilih Mapel!');
  if (!tp) return alert('Pilih / isi TP!');

  const tbody = document.getElementById('tbodyPenilaian');
  const rows = tbody.querySelectorAll('tr');
  const toSave = [];

  rows.forEach(tr => {
    if (!tr.dataset.nisn) return;
    const nilaiEl = tr.querySelector('.nilai-cell');
    const nilai = nilaiEl?.dataset?.nilai || '';
    if (nilai === '') return;
    toSave.push({
      nisn: tr.dataset.nisn,
      nama: tr.dataset.nama,
      kelas: String(kelas),
      fase: `Fase ${kelas <=2 ? 'A' : kelas <=4 ? 'B' : 'C'}`,
      mapel: mapel,
      tp: tp,
      kktp: parseInt(kktp)||70,
      jenis: jenis,
      nilai: parseInt(nilai)||0,
      tgl: new Date().toISOString().slice(0,10),
      prinsip: { sadar: document.getElementById('pmSadar')?.checked, makna: document.getElementById('pmMakna')?.checked, gembira: document.getElementById('pmGembira')?.checked }
    });
  });

  if (!toSave.length) return alert('Belum ada nilai yang diisi! Klik angka Nilai untuk edit.');

  // Simpan LS
  const filteredOld = dataPenilaian.filter(d => !(String(d.kelas)===String(kelas) && d.mapel===mapel && d.jenis===jenis));
  dataPenilaian = [...filteredOld, ...toSave];
  localStorage.setItem(LS_KEY, JSON.stringify(dataPenilaian));

  // Simpan Firestore - FIXED sesuai rules
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
  const guruId = currentUser.uid || currentUser.id || '';
  if (!guruId) {
    alert(`✅ ${toSave.length} data tersimpan di localStorage!\n⚠️ Firestore skip: user tidak login (guruId kosong), silakan login ulang. Export Word tetap bisa.`);
    return;
  }

  const batch = writeBatch(firestore);
  toSave.forEach(d => {
    const docId = docIdFor(d);
    const refDoc = doc(firestore, FS_COLLECTION, docId);
    batch.set(refDoc, {
      guruId: guruId,
      userId: guruId,
      createdBy: guruId,
      ...d,
      kelasAngka: parseInt(kelas),
      mapelSource: 'js/data-mapel.js',
      createdAt: new Date().toISOString()
    }, { merge: true });
  });

  const btn = document.getElementById('btnSimpanPenilaian');
  btn.disabled = true;
  btn.textContent = '⏳ Menyimpan...';

  try {
    await batch.commit();
    btn.disabled = false;
    btn.textContent = '💾 Simpan Penilaian (LS + Firestore)';
    alert(`✅ ${toSave.length} data berhasil disimpan!\n✅ Firestore: OK (collection 'penilaian')\n📄 Export Word siap dipakai`);
  } catch (e) {
    console.error(e);
    btn.disabled = false;
    btn.textContent = '💾 Simpan Penilaian (LS + Firestore)';
    alert(`✅ ${toSave.length} data tersimpan di localStorage!\n⚠️ Firestore gagal: ${e.message}\nTetap bisa Export Word & CSV`);
  }
}

function docIdFor(d) {
  const nisn = String(d.nisn||'').replace(/[^a-zA-Z0-9]/g,'') || 'nonis';
  return `${d.kelas}_${nisn}_${slugify(d.mapel,20)}_${simpleHash(d.tp+'|'+d.jenis)}`;
}
function slugify(s,max=30){ return String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,max)||'x'; }
function simpleHash(s){ let h=0; for(let i=0;i<s.length;i++){ h=(h*31+s.charCodeAt(i))|0; } return Math.abs(h).toString(36); }

// ============ EXPORT CSV ============
function unduhCSV() {
  if (!dataPenilaian.length) return alert('Belum ada data penilaian! Simpan dulu.');
  const header = ['Tanggal','NISN','Nama','Kelas','Fase','Mapel','TP','Jenis','KKTP','Nilai','Predikat','Tindak Lanjut','PM'];
  const rows = dataPenilaian.map(d => {
    const p = getPredikatInfo(d.nilai, d.kktp);
    const prinsip = `${d.prinsip?.sadar?'Sadar ':''}${d.prinsip?.makna?'Makna ':''}${d.prinsip?.gembira?'Gembira':''}`.trim();
    return [d.tgl, d.nisn, `"${d.nama}"`, d.kelas, d.fase, `"${d.mapel}"`, `"${String(d.tp||'').replace(/"/g,'""')}"`, d.jenis, d.kktp, d.nilai, p.kode, p.tindak, `"${prinsip}"`].join(',');
  });
  const csv = [header.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `Penilaian_KurMer_${new Date().toISOString().slice(0,10)}.csv`; a.click();
}

// ============ EXPORT WORD - FIXED: bersumber dari dataSiswa (roster lengkap) ============
function exportWord() {
  // FIX UTAMA: sebelumnya fungsi ini scan ulang tbody.querySelectorAll('tr') dan men-skip
  // baris yang gagal terbaca tr.dataset.nama-nya -> kalau ada baris yang dataset-nya
  // tidak lengkap, siswa itu hilang dari Word walau tetap tampil di tabel.
  // Sekarang: dataSiswa (roster asli hasil Tarik dari RTDB) jadi sumber utama daftar nama,
  // jadi export dijamin selalu berisi SEMUA siswa yang ada di tabel.
  if (!dataSiswa || !dataSiswa.length) {
    return alert('Tabel kosong! Pilih Kelas 1-6 lalu Tarik Data Peserta Didik dulu.');
  }

  const kelas = document.getElementById('inpKelasPenilaian').value || 'Semua';
  const mapel = document.getElementById('inpMapelPenilaian').value || 'Semua';
  const jenis = document.getElementById('inpJenisPenilaian')?.value || '';
  const tpRaw = document.getElementById('inpTP')?.value;
  const tp = (tpRaw && tpRaw !== '__manual__' ? tpRaw : (document.getElementById('inpTPManual')?.value || '')) || '';
  const kktp = document.getElementById('inpKKTP')?.value || '70';
  const faseLabel = `Fase ${kelas <=2 ? 'A' : kelas <=4 ? 'B' : 'C'}`;
  const jenisLabel = document.querySelector(`#inpJenisPenilaian option[value="${jenis}"]`)?.textContent || jenis || '-';
  const tglCetak = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  // Ambil nilai yang sedang diisi di tabel, berdasarkan urutan baris (idx),
  // supaya tidak tergantung pada kecocokan NISN yang bisa kosong/duplikat.
  const tbody = document.getElementById('tbodyPenilaian');
  const domRows = tbody ? Array.from(tbody.querySelectorAll('tr')) : [];
  const nilaiByIdx = new Map();
  domRows.forEach(tr => {
    if (tr.dataset.idx === undefined) return;
    const nilaiCell = tr.querySelector('.nilai-cell');
    const nilai = nilaiCell?.dataset?.nilai || '';
    nilaiByIdx.set(Number(tr.dataset.idx), nilai);
  });

  let tableRows = '';
  let no = 1;
  dataSiswa.forEach((siswa, idx) => {
    const nilai = nilaiByIdx.has(idx) ? nilaiByIdx.get(idx) : '';
    const nilaiDisplay = nilai !== '' ? nilai : '-';
    const p = getPredikatInfo(parseInt(nilai)||0, parseInt(kktp)||70);
    const predikatDisplay = nilai !== '' ? getPredikatLabel(nilai, parseInt(kktp)||70) : '-';
    // Tanpa NISN - sesuai permintaan
    tableRows += `<tr><td style="text-align:center">${no++}</td><td style="text-align:left;font-weight:700">${siswa.nama}</td><td style="text-align:center">${kelas} / ${faseLabel}</td><td style="text-align:center">${nilaiDisplay}</td><td style="text-align:center">${predikatDisplay}</td><td>${p.tindak}</td><td style="font-size:10pt">${tp||'-'}</td></tr>`;
  });

  if (!tableRows) return alert('Tidak ada data siswa untuk di-export!');

  const table = `<table border="1" cellpadding="6" style="border-collapse:collapse;width:100%;font-family:'Times New Roman',serif;font-size:11pt"><tr style="background:#e2e8f0;font-weight:bold"><th style="width:40px">No</th><th>Nama Peserta Didik</th><th style="width:110px">Kelas</th><th style="width:60px">Nilai</th><th>Predikat & Tindak Lanjut PM</th><th style="width:110px">Tindak Lanjut</th><th>TP</th></tr>${tableRows}</table>`;

  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>Penilaian Kelas ${kelas}</title><style>@page{size:A4 landscape;margin:1.5cm}body{font-family:'Times New Roman',serif;font-size:11pt}h2{text-align:center;margin-bottom:4px}.sub{text-align:center;margin-top:0;font-size:11pt}.meta{margin:12px 0;font-size:11pt}table{margin-top:10px}th{background:#f2f2f2}.ttd{margin-top:40px;text-align:right;font-size:12pt}</style></head><body><h2 style="margin:0">REKAP PENILAIAN KURIKULUM MERDEKA</h2><p class="sub">SDN 139 PADANG • PEMBELAJARAN MENDALAM (SADAR • MAKNA • GEMBIRA)</p><div class="meta"><p>Kelas: <b>${kelas}</b> (${faseLabel} - Terpisah) &nbsp;&nbsp; Mapel: <b>${mapel}</b></p><p>Jenis Penilaian: <b>${jenisLabel}</b> &nbsp;&nbsp; KKTP: <b>${kktp}</b> &nbsp;&nbsp; Tanggal Cetak: <b>${tglCetak}</b></p><p>TP: <b>${tp||'-'}</b></p></div>${table}<div class="ttd"><p>Guru Kelas,</p><br><br><br><p><b>(_______________________)</b></p></div></body></html>`;

  const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `Penilaian_${mapel.replace(/\s+/g,'_')}_Kelas${kelas}_${new Date().toISOString().slice(0,10)}.doc`;
  document.body.appendChild(a); a.click();
  setTimeout(()=>{ document.body.removeChild(a); URL.revokeObjectURL(a.href); }, 800);
  console.log('Export Word berhasil, total siswa:', no-1, '/ roster:', dataSiswa.length);
}



window.renderPenilaian = (container) => init(container);
window.Penilaian = { init };
window.exportWord = exportWord;
window.editNilai = window.editNilai;
