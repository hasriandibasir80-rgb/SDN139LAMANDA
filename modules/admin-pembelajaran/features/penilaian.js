// modules/admin-pembelajaran/features/penilaian.js
// =========================================
// FITUR: PENILAIAN KURIKULUM MERDEKA + PEMBELAJARAN MENDALAM
// REVISI:
// 1. Tombol "Tarik Data Peserta Didik" dari Realtime Database (RTDB)
// 2. Tombol Simpan -> localStorage + Firestore (upsert per siswa)
// 3. Export Word lebih lengkap + filter kelas/mapel + landscape
// =========================================

import { getDatabase, ref, get, set } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { getFirestore, doc, writeBatch } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const database = getDatabase();
const firestore = getFirestore();
const FS_COLLECTION = 'sdn139_penilaian_final';

const CSS_PATH = '../../../css/modules/analisis-kktp.css';
const CSS_ID = 'penilaian-kurmer-css';

let dataSiswa = [];
let dataPenilaian = JSON.parse(localStorage.getItem('sdn139_penilaian_final') || '[]');
let editMode = true;

// Fallback Mapel
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
  await loadMataPelajaran();
}

export function cleanup() {
  const css = document.getElementById(CSS_ID);
  if (css) css.remove();
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
      .kktp-container{max-width:1200px;margin:0 auto;font-family:'Segoe UI',sans-serif}
      .btn-action{padding:10px 20px;border:none;border-radius:8px;font-weight:600;cursor:pointer}
      .form-control{width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:8px}
      .siswa-table{width:100%;border-collapse:collapse}
      .siswa-table th{background:#2563eb;color:white;padding:10px}
      .siswa-table td{padding:8px;border:1px solid #e2e8f0;text-align:center}
      .siswa-table .nama-cell{text-align:left;font-weight:600}
      .nilai-cell{cursor:pointer;background:#f8fafc}
      .nilai-cell:hover{background:#dbeafe}
      .nilai-cell.editing{background:#fef9c3}
    `;
    document.head.appendChild(style);
  };

  document.head.appendChild(link);
}

async function loadMataPelajaran() {
  const selectMapel = document.getElementById('inpMapelPenilaian');
  if (!selectMapel) return;

  try {
    const res = await fetch('../../../assets/data-mapel.json');
    if (res.ok) {
      const data = await res.json();
      if (data.mataPelajaran?.length) {
        populateMapel(data.mataPelajaran);
        return;
      }
    }
  } catch (e) {}

  try {
    const mod = await import('../../../js/config/data-mapel.js');
    const list = mod.default || mod.DATA_MAPEL || mod.mataPelajaran || [];
    if (list.length) {
      populateMapel(list);
      return;
    }
  } catch (e) {
    console.log('data-mapel.js belum bisa di-import, pakai fallback');
  }

  populateMapel(FALLBACK_MAPEL);
}

function populateMapel(list) {
  const selectMapel = document.getElementById('inpMapelPenilaian');
  if (!selectMapel) return;

  selectMapel.innerHTML = '<option value="">-- Pilih Mapel --</option>';
  list.forEach(mapel => {
    const opt = document.createElement('option');
    opt.value = mapel.nama;
    opt.textContent = `${mapel.icon || '📚'} ${mapel.singkatan || mapel.nama}`;
    selectMapel.appendChild(opt);
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

function renderUI(container) {
  container.innerHTML = `
    <div class="kktp-container">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; flex-wrap:wrap; gap:10px;">
        <button onclick="window.location.href='adm-pembelajaran.html'" style="background:#0f172a;color:white;padding:10px 16px;border:none;border-radius:8px;cursor:pointer;font-weight:600;">← Kembali ke Menu</button>
        <div style="font-size:12px; background:#eff6ff; border:1px solid #bfdbfe; padding:8px 12px; border-radius:20px;">🧠 KurMer + Pembelajaran Mendalam (Sadar, Makna, Gembira)</div>
      </div>

      <div style="background:linear-gradient(135deg,#2563eb,#1e40af);color:white;padding:20px 24px;border-radius:14px;margin-bottom:20px;">
        <h2 style="margin:0;">📎 Penilaian Kurikulum Merdeka</h2>
        <p style="margin:6px 0 0; opacity:0.9; font-size:13px;">Tarik Data Siswa dari Data Peserta Didik (RTDB) + Mapel dari data-mapel.js + TP dari Master TP • Nilai bisa diklik untuk edit</p>
      </div>

      <div style="background:white;padding:20px;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.08);margin-bottom:20px;">
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:15px;">
          <div>
            <label style="font-size:12px;font-weight:700;">🎓 Kelas / Fase</label>
            <select id="inpKelasPenilaian" class="form-control">
              <option value="">-- Pilih Kelas --</option>
              <option value="1">1 / Fase A</option>
              <option value="2">2 / Fase A</option>
              <option value="3">3 / Fase B</option>
              <option value="4">4 / Fase B</option>
              <option value="5">5 / Fase C</option>
              <option value="6">6 / Fase C</option>
            </select>
          </div>

          <div>
            <label style="font-size:12px;font-weight:700;">📚 Mata Pelajaran</label>
            <select id="inpMapelPenilaian" class="form-control">
              <option value="">-- Pilih Mapel --</option>
            </select>
          </div>

          <div>
            <label style="font-size:12px;font-weight:700;">📝 Jenis Penilaian</label>
            <select id="inpJenisPenilaian" class="form-control">
              <option value="diagnostik-kognitif">Diagnostik Kognitif</option>
              <option value="diagnostik-non-kognitif">Diagnostik Non-Kognitif</option>
              <option value="formatif">Formatif</option>
              <option value="formatif-proyek">Formatif Proyek PM</option>
              <option value="sumatif-lingkup">Sumatif Lingkup Materi</option>
              <option value="sumatif-akhir">Sumatif Akhir</option>
            </select>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:2fr 1fr;gap:15px;margin-top:15px;">
          <div>
            <label style="font-size:12px;font-weight:700;">🎯 TP (dari Master TP / RPM Spesifik)</label>
            <select id="inpTP" class="form-control">
              <option value="">-- Pilih TP dari Master Data --</option>
            </select>
            <input id="inpTPManual" placeholder="Atau ketik TP manual jika belum ada" class="form-control" style="margin-top:8px;display:none;">
          </div>

          <div>
            <label style="font-size:12px;font-weight:700;">KKTP</label>
            <input id="inpKKTP" type="number" value="70" class="form-control">
            <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;">
              <label style="font-size:11px;background:#dbeafe;padding:4px 8px;border-radius:12px;"><input type="checkbox" id="pmSadar" checked> Sadar</label>
              <label style="font-size:11px;background:#dcfce7;padding:4px 8px;border-radius:12px;"><input type="checkbox" id="pmMakna" checked> Makna</label>
              <label style="font-size:11px;background:#fef9c3;padding:4px 8px;border-radius:12px;"><input type="checkbox" id="pmGembira" checked> Gembira</label>
            </div>
          </div>
        </div>

        <div style="margin-top:15px;background:#fffbeb;border-left:4px solid #f59e0b;padding:10px;border-radius:6px;font-size:12px;display:none;" id="infoSiswaBox">
          ✅ Data siswa dimuat dari RTDB: <span id="infoSiswaCount">0</span> siswa. Klik angka nilai untuk edit langsung jika salah input.
        </div>
      </div>

      <div style="background:white;padding:20px;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:10px;">
          <h4 style="margin:0;">👥 Daftar Nilai Peserta Didik</h4>
          <button id="btnTarikSiswa" class="btn-action" style="background:#0ea5e9;color:white;">🔄 Tarik Data Peserta Didik</button>
        </div>

        <div style="overflow:auto;">
          <table class="siswa-table" id="tabelPenilaian">
            <thead>
              <tr>
                <th style="width:40px;">No</th>
                <th>Nama Peserta Didik</th>
                <th style="width:120px;">Kelas</th>
                <th style="width:130px;">Nilai (Klik untuk Edit)</th>
                <th>Predikat & Tindak Lanjut PM</th>
              </tr>
            </thead>
            <tbody id="tbodyPenilaian">
              <tr><td colspan="5" style="padding:20px;color:#64748b;">Pilih Kelas terlebih dahulu (1/Fase A - 6/Fase C)</td></tr>
            </tbody>
          </table>
        </div>

        <div style="display:flex;gap:10px;justify-content:center;margin-top:20px;flex-wrap:wrap;">
          <button class="btn-action" id="btnSimpanPenilaian" style="background:#3b82f6;color:white;">💾 Simpan Penilaian</button>
          <button class="btn-action" id="btnEditMode" style="background:#f59e0b;color:white;">✏️ Mode Edit: ON</button>
          <button class="btn-action" id="btnUnduhPenilaian" style="background:#10b981;color:white;">⬇ Unduh Rekap (CSV)</button>
          <button class="btn-action" id="btnExportWord" style="background:#8b5cf6;color:white;">📄 Export Word</button>
        </div>
      </div>
    </div>
  `;
}

function attachEvents() {
  document.getElementById('inpKelasPenilaian').addEventListener('change', function () {
    const kelas = this.value;
    if (kelas) loadSiswaPenilaian(kelas);
  });

  document.getElementById('btnTarikSiswa').addEventListener('click', tarikDataPesertaDidik);

  document.getElementById('inpMapelPenilaian').addEventListener('change', function () {
    const mapel = this.value;
    const tpSelect = document.getElementById('inpTP');
    const master = getMasterTP();

    const filtered = master.filter(t =>
      !mapel ||
      (t.mapel && t.mapel.toLowerCase().includes(mapel.toLowerCase())) ||
      (t.mata_pelajaran && t.mata_pelajaran.toLowerCase().includes(mapel.toLowerCase()))
    );

    tpSelect.innerHTML = '<option value="">-- Pilih TP --</option>';

    if (filtered.length) {
      filtered.forEach(t => {
        const opt = document.createElement('option');
        const tpText = t.tp || t.tujuan || t.deskripsi || '';
        opt.value = tpText;
        opt.textContent = tpText.substring(0, 80) + '...';
        tpSelect.appendChild(opt);
      });
    } else {
      tpSelect.innerHTML += '<option value="__manual__">TP belum ada di Master, ketik manual</option>';
    }
  });

  document.getElementById('inpTP').addEventListener('change', function () {
    const manual = document.getElementById('inpTPManual');
    if (this.value === '__manual__' || this.value === '') manual.style.display = 'block';
    else manual.style.display = 'none';
  });

  document.getElementById('btnSimpanPenilaian').addEventListener('click', simpanPenilaian);
  document.getElementById('btnUnduhPenilaian').addEventListener('click', unduhCSV);
  document.getElementById('btnExportWord').addEventListener('click', exportWord);
  document.getElementById('btnEditMode').addEventListener('click', toggleEditMode);
}

function toggleEditMode() {
  editMode = !editMode;
  document.getElementById('btnEditMode').textContent = editMode ? '✏️ Mode Edit: ON' : '🔒 Mode Edit: OFF';
  document.getElementById('btnEditMode').style.background = editMode ? '#f59e0b' : '#6b7280';

  document.querySelectorAll('.nilai-cell').forEach(c => {
    c.style.pointerEvents = editMode ? 'auto' : 'none';
    c.style.opacity = editMode ? '1' : '0.6';
  });
}

// =========================
// REVISI 1: TARIK DATA PESERTA DIDIK DARI RTDB
// =========================
async function tarikDataPesertaDidik() {
  const kelas = document.getElementById('inpKelasPenilaian').value;
  if (!kelas) return alert('Pilih Kelas terlebih dahulu!');
  await loadSiswaPenilaian(kelas);
}

async function fetchSiswaFromRTDB(kelas) {
  const paths = [
    `siswa/${kelas}`,
    `data-peserta-didik/${kelas}`,
    `peserta-didik/${kelas}`,
    `data_siswa/${kelas}`
  ];

  for (const p of paths) {
    try {
      const snap = await get(ref(database, p));
      if (snap.exists()) return normalizeSiswa(snap.val());
    } catch (e) {
      // coba path berikutnya
    }
  }
  return null;
}

function normalizeSiswa(raw) {
  return Object.keys(raw)
    .map(k => {
      const v = raw[k];
      if (v && typeof v === 'object') return { id: k, ...v };
      return { id: k, nama: String(v) };
    })
    .sort((a, b) => (a.nama || '').localeCompare(b.nama || ''));
}

async function loadSiswaPenilaian(kelas) {
  const tbody = document.getElementById('tbodyPenilaian');
  tbody.innerHTML = `<tr><td colspan="5" style="padding:20px;">⏳ Menarik data peserta didik kelas ${kelas} dari Realtime Database...</td></tr>`;

  try {
    const list = await fetchSiswaFromRTDB(kelas);

    if (!list || !list.length) {
      tbody.innerHTML = `<tr><td colspan="5" style="padding:20px;color:#ef4444;">⚠️ Belum ada data peserta didik untuk kelas ${kelas} di Realtime Database. Isi dulu di Global Monitoring → Data Peserta Didik.</td></tr>`;
      return;
    }

    dataSiswa = list;
    document.getElementById('infoSiswaBox').style.display = 'block';
    document.getElementById('infoSiswaCount').textContent = list.length;

    tbody.innerHTML = '';

    list.forEach((siswa, idx) => {
      const nama = (siswa.nama || 'Tanpa Nama').toUpperCase();
      const tr = document.createElement('tr');

      tr.dataset.nisn = siswa.nis || siswa.nisn || siswa.id;
      tr.dataset.nama = nama;
      tr.dataset.kelas = kelas;

      const existing = dataPenilaian.find(d => d.nisn == (siswa.nis || siswa.nisn) && d.kelas == kelas);
      const nilaiAwal = existing ? existing.nilai : '';

      tr.innerHTML = `
        <td>${idx + 1}</td>
        <td class="nama-cell">${nama}</td>
        <td>${kelas} / Fase ${kelas <= 2 ? 'A' : kelas <= 4 ? 'B' : 'C'}</td>
        <td class="nilai-cell" data-nilai="${nilaiAwal}" onclick="editNilai(this)">${nilaiAwal !== '' ? nilaiAwal : '<span style="color:#94a3b8;">Klik isi</span>'}</td>
        <td class="predikat-cell" style="font-size:12px;">${existing ? getPredikatLabel(existing.nilai, existing.kktp) : '-'}</td>
      `;

      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error(err);
    tbody.innerHTML = `<tr><td colspan="5" style="color:#ef4444;">Gagal memuat: ${err.message}</td></tr>`;
  }
}

function getPredikatInfo(nilai, kktp = 70) {
  if (nilai >= 90) return { kode: 'BSB', ket: 'Sangat Baik', tindak: 'Tutor sebaya', badge: '#dcfce7', color: '#166534' };
  if (nilai >= 80) return { kode: 'BSH', ket: 'Sesuai Harapan', tindak: 'Pengayaan joyful', badge: '#dbeafe', color: '#1e40af' };
  if (nilai >= kktp) return { kode: 'MB', ket: 'Mulai Berkembang', tindak: 'Penguatan bermakna', badge: '#fef9c3', color: '#854d0e' };
  return { kode: 'BB', ket: 'Belum Berkembang', tindak: 'Remedial mindful', badge: '#fee2e2', color: '#991b1b' };
}

function getPredikatLabel(nilai, kktp = 70) {
  const p = getPredikatInfo(nilai, kktp);
  return `<span style="background:${p.badge};color:${p.color};padding:4px 8px;border-radius:12px;font-size:11px;">${p.kode} - ${p.ket}</span> <span style="font-size:11px;">${p.tindak}</span>`;
}

window.editNilai = function (td) {
  if (!editMode) return;
  if (td.querySelector('input')) return;

  const current = td.dataset.nilai || '';
  td.classList.add('editing');
  td.innerHTML = `<input type="number" min="0" max="100" value="${current}" style="width:70px;padding:6px;text-align:center;border:2px solid #2563eb;border-radius:6px;" onblur="selesaiEdit(this)" onkeydown="if(event.key==='Enter') this.blur()" autofocus>`;

  const input = td.querySelector('input');
  input.focus();
  input.select();
};

window.selesaiEdit = function (input) {
  const td = input.parentElement;
  let val = parseInt(input.value);

  if (isNaN(val) || input.value === '') {
    td.dataset.nilai = '';
    td.innerHTML = '<span style="color:#94a3b8;">Klik isi</span>';
    td.nextElementSibling.innerHTML = '-';
  } else {
    if (val < 0) val = 0;
    if (val > 100) val = 100;

    td.dataset.nilai = val;
    td.innerHTML = val;

    const kktp = parseInt(document.getElementById('inpKKTP').value) || 70;
    td.nextElementSibling.innerHTML = getPredikatLabel(val, kktp);
  }

  td.classList.remove('editing');
};

// =========================
// REVISI 2: SIMPAN KE FIRESTORE
// =========================
async function simpanPenilaian() {
  const kelas = document.getElementById('inpKelasPenilaian').value;
  let mapel = document.getElementById('inpMapelPenilaian').value;
  let tp = document.getElementById('inpTP').value;
  const tpManual = document.getElementById('inpTPManual').value.trim();

  if (tp === '__manual__' || !tp) tp = tpManual;

  const kktp = parseInt(document.getElementById('inpKKTP').value) || 70;
  const jenis = document.getElementById('inpJenisPenilaian').value;

  const prinsip = {
    sadar: document.getElementById('pmSadar').checked,
    makna: document.getElementById('pmMakna').checked,
    gembira: document.getElementById('pmGembira').checked
  };

  if (!kelas || !mapel) return alert('Pilih Kelas (1/Fase A - 6/Fase C) dan Mapel dari data-mapel.js dulu!');
  if (!tp) return alert('Pilih TP dari Master TP atau ketik manual!');

  const rows = document.querySelectorAll('#tbodyPenilaian tr');
  let count = 0;

  const batch = writeBatch(firestore);

  rows.forEach(row => {
    const nisn = row.dataset.nisn;
    const nama = row.dataset.nama;
    const nilaiCell = row.querySelector('.nilai-cell');
    const nilai = parseInt(nilaiCell?.dataset.nilai);

    if (isNaN(nilai)) return;

    const record = {
      id: Date.now() + Math.random(),
      tgl: new Date().toISOString().slice(0, 10),
      nisn,
      nama,
      kelas,
      mapel,
      tp,
      kktp,
      jenis,
      nilai,
      prinsip
    };

    // hapus data lama untuk nisn + mapel + tp + jenis yang sama
    dataPenilaian = dataPenilaian.filter(d =>
      !(d.nisn == nisn && d.mapel == mapel && d.tp == tp && d.jenis == jenis)
    );

    dataPenilaian.push(record);
    count++;

    // upsert ke Firestore
    const docId = docIdFor(record);
    batch.set(doc(firestore, FS_COLLECTION, docId), record);
  });

  if (count === 0) return alert('Belum ada nilai yang diisi! Klik kolom nilai untuk edit.');

  localStorage.setItem('sdn139_penilaian_final', JSON.stringify(dataPenilaian));

  const btn = document.getElementById('btnSimpanPenilaian');
  btn.disabled = true;
  btn.textContent = '⏳ Menyimpan...';

  let fsStatus = '✅ Firestore: OK';

  try {
    await batch.commit();
  } catch (e) {
    console.error('Firestore commit gagal:', e);
    fsStatus = '⚠️ Firestore gagal: ' + e.message;
  }

  // Backup ke Realtime Database (opsional, tetap ada)
  try {
    await set(ref(database, `penilaian/${kelas}/${mapel.replace(/\s+/g, '_')}_${Date.now()}`), {
      mapel,
      tp,
      kelas,
      kktp,
      jenis,
      jumlah: count,
      tanggal: new Date().toISOString(),
      data: dataPenilaian.filter(d => d.kelas == kelas && d.mapel == mapel).slice(-count)
    });
  } catch (e) {
    console.log('RTDB backup skip', e);
  }

  btn.disabled = false;
  btn.textContent = '💾 Simpan Penilaian';

  alert(`✅ ${count} data penilaian berhasil disimpan!\n${fsStatus}\n(Sinkron dengan KKTP)`);
}

function slugify(s, max = 30) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, max) || 'x';
}

function simpleHash(s) {
  let h = 0;
  const str = String(s);
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}

function docIdFor(d) {
  const nisn = String(d.nisn || '').replace(/[^a-zA-Z0-9]/g, '') || 'nonis';
  return `${d.kelas}_${nisn}_${slugify(d.mapel, 20)}_${simpleHash(d.tp + '|' + d.jenis)}`;
}

function unduhCSV() {
  if (!dataPenilaian.length) return alert('Belum ada data penilaian!');

  const header = ['Tanggal', 'NISN', 'Nama', 'Kelas', 'Fase', 'Mapel', 'TP', 'Jenis', 'KKTP', 'Nilai', 'Predikat', 'Tindak Lanjut', 'Prinsip PM'];

  const rows = dataPenilaian.map(d => {
    const fase = d.kelas <= 2 ? 'Fase A' : d.kelas <= 4 ? 'Fase B' : 'Fase C';
    const p = getPredikatInfo(d.nilai, d.kktp);

    const prinsip = `${d.prinsip?.sadar ? 'Sadar ' : ''}${d.prinsip?.makna ? 'Makna ' : ''}${d.prinsip?.gembira ? 'Gembira' : ''}`.trim();

    return [
      d.tgl,
      d.nisn,
      `"${d.nama}"`,
      `${d.kelas} / ${fase}`,
      fase,
      `"${d.mapel}"`,
      `"${String(d.tp || '').replace(/"/g, '""')}"`,
      d.jenis,
      d.kktp,
      d.nilai,
      p.kode,
      p.tindak,
      `"${prinsip}"`
    ].join(',');
  });

  const csv = [header.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `Penilaian_KurMer_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
}

// =========================
// REVISI 3: EXPORT WORD
// =========================
function exportWord() {
  if (!dataPenilaian.length) return alert('Belum ada data penilaian!');

  const kelas = document.getElementById('inpKelasPenilaian').value;
  const mapel = document.getElementById('inpMapelPenilaian').value;
  const jenis = document.getElementById('inpJenisPenilaian').value;

  const filtered = dataPenilaian.filter(d =>
    (!kelas || d.kelas == kelas) &&
    (!mapel || d.mapel == mapel)
  );

  if (!filtered.length) return alert('Tidak ada data untuk kelas/mapel yang dipilih!');

  const faseLabel = kelas ? `Fase ${kelas <= 2 ? 'A' : kelas <= 4 ? 'B' : 'C'}` : '-';
  const jenisLabel = document.querySelector(`#inpJenisPenilaian option[value="${jenis}"]`)?.textContent || jenis;
  const tglCetak = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  let table = `
    <table border="1" cellpadding="6" style="border-collapse:collapse;width:100%;font-family:'Times New Roman',serif;font-size:11pt;">
      <tr style="background:#e2e8f0;">
        <th>No</th>
        <th>NISN</th>
        <th>Nama Peserta Didik</th>
        <th>Kelas</th>
        <th>Nilai</th>
        <th>Predikat</th>
        <th>Tindak Lanjut</th>
        <th>TP</th>
      </tr>`;

  filtered.forEach((d, i) => {
    const p = getPredikatInfo(d.nilai, d.kktp);

    table += `
      <tr>
        <td style="text-align:center;">${i + 1}</td>
        <td style="text-align:center;">${d.nisn}</td>
        <td>${d.nama}</td>
        <td style="text-align:center;">${d.kelas} / Fase ${d.kelas <= 2 ? 'A' : d.kelas <= 4 ? 'B' : 'C'}</td>
        <td style="text-align:center;">${d.nilai}</td>
        <td style="text-align:center;">${p.kode} - ${p.ket}</td>
        <td>${p.tindak}</td>
        <td>${d.tp}</td>
      </tr>`;
  });

  table += `</table>`;

  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <title>Rekap Penilaian Kurikulum Merdeka</title>
      <style>
        @page { size: A4 landscape; margin: 1.5cm; }
        body { font-family: 'Times New Roman', serif; }
        h2 { text-align: center; margin-bottom: 4px; }
        .sub { text-align: center; margin-top: 0; font-size: 12pt; }
        .meta { margin: 12px 0; font-size: 12pt; }
        table { margin-top: 10px; }
        .ttd { margin-top: 40px; text-align: right; font-size: 12pt; }
      </style>
    </head>
    <body>
      <h2>REKAP PENILAIAN KURIKULUM MERDEKA</h2>
      <p class="sub">SDN 139 PADANG • PEMBELAJARAN MENDALAM (SADAR • MAKNA • GEMBIRA)</p>

      <div class="meta">
        <p>Kelas: <b>${kelas || 'Semua'}</b> (${faseLabel}) &nbsp;&nbsp; Mapel: <b>${mapel || 'Semua'}</b></p>
        <p>Jenis Penilaian: <b>${jenisLabel}</b> &nbsp;&nbsp; Tanggal Cetak: <b>${tglCetak}</b></p>
      </div>

      ${table}

      <div class="ttd">
        <p>Guru Kelas,</p>
        <br><br><br>
        <p><b>(_______________________)</b></p>
      </div>
    </body>
    </html>`;

  const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `Penilaian_${mapel || 'Semua'}_Kelas${kelas || 'Semua'}_${new Date().toISOString().slice(0, 10)}.doc`;
  a.click();
}

// Agar kompatibel dengan loader lama yang pakai window.render
window.renderPenilaian = (container) => init(container);
window.Penilaian = { init };
