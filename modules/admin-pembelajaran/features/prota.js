/**
 * features/prota.js - v2.1 - Terhubung Data TP/ATP + Auto Elemen CP
 * Fix: Ambil data dari Firestore & LocalStorage, handle jika ATP belum ada
 */
export async function init(container, db) {
  // Import Firestore functions if needed (optional, use compat)
  let firestore = db;
  try {
    // Try to get modular SDK if db is app
    if (db && db._delegate) firestore = db;
  } catch {}

  container.innerHTML = `
    <style>
      .prota-wrapper{font-family:'Segoe UI',sans-serif; background:#fff; border-radius:12px; padding:20px; color:#1f2937; max-width:1150px; margin:auto;}
      .prota-header{display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:20px; border-bottom:2px solid #1e3a8a; padding-bottom:15px;}
      .prota-header h2{margin:0; color:#1e3a8a; font-size:22px;}
      .btn{padding:8px 14px; border:none; border-radius:8px; cursor:pointer; font-weight:600; font-size:13px;}
      .btn-primary{background:#1e3a8a; color:#fff;}
      .btn-success{background:#16a34a; color:#fff;}
      .btn-secondary{background:#e5e7eb; color:#111;}
      .btn-warning{background:#f59e0b; color:#fff;}
      .grid2{display:grid; grid-template-columns:1fr 1fr; gap:12px;}
      .grid3{display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px;}
      @media(max-width:768px){.grid2,.grid3{grid-template-columns:1fr}}
      .form-group{margin-bottom:10px;}
      .form-group label{font-size:12px; font-weight:700; display:block; margin-bottom:4px; text-transform:uppercase; color:#374151;}
      .form-group input, .form-group select, .form-group textarea{width:100%; padding:9px 11px; border:1px solid #d1d5db; border-radius:8px; font-size:14px;}
      .card{border:1px solid #e5e7eb; border-radius:12px; padding:16px; margin-bottom:16px; background:#f9fafb;}
      .alert{padding:10px 12px; border-radius:8px; font-size:13px; margin-bottom:10px;}
      .alert-info{background:#eff6ff; border:1px solid #bfdbfe; color:#1e40af;}
      .alert-warn{background:#fef3c7; border:1px solid #fde68a; color:#92400e;}
      .prota-table{width:100%; border-collapse:collapse; margin-top:15px; font-size:13px;}
      .prota-table th,.prota-table td{border:1px solid #d1d5db; padding:8px; vertical-align:top;}
      .prota-table th{background:#1e3a8a; color:#fff; text-align:center;}
      .center{text-align:center;}
      .semester-row td{background:#dbeafe; font-weight:800; color:#1e3a8a; padding:10px;}
      .total-row td{background:#fef3c7; font-weight:800;}
      .prota-ttd{width:100%; margin-top:30px;}
      .prota-ttd td{width:50%; text-align:center; vertical-align:top; padding:10px;}
      .badge{font-size:11px; padding:3px 7px; border-radius:20px; background:#e0e7ff; color:#3730a3;}
      @media print{ .no-print{display:none !important} }
    </style>

    <div class="prota-wrapper">
      <div class="prota-header">
        <h2>PROGRAM TAHUNAN <span style="font-size:13px; color:#6b7280;">v2.1 - Sinkron TP/ATP</span></h2>
        <div class="no-print" style="display:flex; gap:8px; flex-wrap:wrap;">
          <button id="btnRefreshTP" class="btn btn-warning">🔄 Tarik Data TP/ATP</button>
          <button id="btnCetak" class="btn btn-secondary">🖨️ Cetak</button>
          <button id="btnSimpan" class="btn btn-success">💾 Simpan</button>
        </div>
      </div>

      <div id="statusData" class="alert alert-info">⏳ Mengecek data TP/ATP dari database...</div>

      <div class="card no-print">
        <h3 style="margin:0 0 12px 0; font-size:16px;">1. Identitas & Kalender</h3>
        <div class="grid2">
          <div class="form-group"><label>Satuan Pendidikan</label><input id="inpSekolah" value="SDN 139 LAMANDA"></div>
          <div class="form-group"><label>Tahun Pelajaran</label><input id="inpTahun" value="2025/2026"></div>
          <div class="form-group"><label>Mata Pelajaran</label>
            <select id="inpMapel">
              <option value="">-- Pilih Mapel --</option>
              <option>Bahasa Indonesia</option>
              <option>Matematika</option>
              <option>IPAS</option>
              <option>PPKn</option>
              <option>PAI & BP</option>
              <option>PJOK</option>
              <option>Seni Budaya</option>
              <option>Bahasa Inggris</option>
            </select>
          </div>
          <div class="form-group"><label>Fase / Kelas</label>
            <select id="inpKelas">
              <option>Fase A / Kelas 1</option>
              <option>Fase A / Kelas 2</option>
              <option>Fase B / Kelas 3</option>
              <option>Fase B / Kelas 4</option>
              <option>Fase C / Kelas 5</option>
              <option>Fase C / Kelas 6</option>
            </select>
          </div>
        </div>
        <div class="grid3" style="margin-top:10px;">
          <div class="form-group"><label>S1 Total Minggu</label><input type="number" id="s1Total" value="26"></div>
          <div class="form-group"><label>S1 Tidak Efektif</label><input type="number" id="s1Tidak" value="6"></div>
          <div class="form-group"><label>JP / Minggu</label><input type="number" id="jpMinggu" value="5"></div>
          <div class="form-group"><label>S2 Total Minggu</label><input type="number" id="s2Total" value="26"></div>
          <div class="form-group"><label>S2 Tidak Efektif</label><input type="number" id="s2Tidak" value="7"></div>
          <div class="form-group"><label>Buffer</label><input type="number" id="buffer" value="1"></div>
        </div>
        <div id="infoWaktu" style="margin-top:10px; font-size:13px; background:#eff6ff; padding:10px; border-radius:8px;"></div>
      </div>

      <div class="card no-print">
        <h3 style="margin:0 0 12px 0; font-size:16px;">2. Daftar TP / ATP <span class="badge" id="badgeCount">0 TP</span></h3>
        <p style="font-size:12px; color:#6b7280; margin-top:0;">Data ini otomatis ditarik dari menu <b>CP, TP, & ATP</b>. Jika ATP belum ada, kamu tetap bisa input TP manual di bawah.</p>
        
        <div id="listTP" style="max-height:300px; overflow-y:auto; border:1px solid #e5e7eb; border-radius:8px; padding:8px; background:#fff; margin-bottom:15px;"></div>

        <details style="background:#fff; padding:10px; border-radius:8px; border:1px dashed #d1d5db;">
          <summary style="cursor:pointer; font-weight:700; font-size:13px;">+ Input TP Manual (jika ATP belum ada)</summary>
          <div class="grid3" style="margin-top:10px;">
            <div class="form-group"><label>Elemen CP</label><input id="tpElemen" placeholder="Contoh: Bilangan"></div>
            <div class="form-group"><label>JP</label><input type="number" id="tpJP" value="4"></div>
            <div class="form-group"><label>Semester</label><select id="tpSemester"><option value="1">Semester 1</option><option value="2">Semester 2</option></select></div>
          </div>
          <div class="form-group"><label>Tujuan Pembelajaran</label><textarea id="tpTeks" rows="2"></textarea></div>
          <button id="btnTambahTP" class="btn btn-primary">+ Tambah TP Manual</button>
        </details>
      </div>

      <div id="renderArea"></div>
    </div>
  `;

  const ELEMEN_MAP = {
    "Bahasa Indonesia": ["Menyimak", "Membaca & Memirsa", "Berbicara", "Menulis"],
    "Matematika": ["Bilangan", "Aljabar", "Pengukuran", "Geometri", "Analisis Data & Peluang"],
    "IPAS": ["Pemahaman IPAS", "Keterampilan Proses"],
    "PAI & BP": ["Al-Quran & Hadis", "Akidah", "Akhlak", "Fikih", "SPI"],
    "PJOK": ["Keterampilan Gerak", "Pengetahuan Gerak", "Pemanfaatan Gerak", "Pengembangan Karakter"]
  };

  let tpList = [];
  const $ = (id) => container.querySelector('#' + id);

  // --- FUNGSI INTI: TARIK DATA TP ---
  async function loadDataTP() {
    $('statusData').className = 'alert alert-info';
    $('statusData').innerHTML = '⏳ Mencari data TP/ATP...';

    let found = [];
    let source = '';

    // 1. Coba dari localStorage (fitur CP-TP-ATP biasanya simpan disini)
    try {
      const keys = ['cp_tp_atp', 'data-atp', 'dataTP', 'atpList', 'tp_list', 'sdn139_atp'];
      for (const k of keys) {
        const raw = localStorage.getItem(k);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            found = parsed;
            source = `LocalStorage (${k})`;
            break;
          }
          if (parsed && Array.isArray(parsed.data)) {
            found = parsed.data;
            source = `LocalStorage (${k}.data)`;
            break;
          }
        }
      }
    } catch (e) { console.warn('localStorage read error', e); }

    // 2. Coba dari Firestore jika belum ketemu
    if (found.length === 0 && db) {
      try {
        // Coba beberapa koleksi yang umum dipakai
        const collectionsToTry = ['atp', 'cp_tp_atp', 'tp_atp', 'capaian_pembelajaran'];
        for (const colName of collectionsToTry) {
          try {
            // Gunakan modular atau compat
            let snap;
            if (db.collection) { // compat
              snap = await db.collection(colName).limit(100).get();
              if (!snap.empty) {
                found = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                source = `Firestore /${colName}`;
                break;
              }
            } else {
              // modular
              const { collection, getDocs, limit, query } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
              const q = query(collection(db, colName), limit(100));
              snap = await getDocs(q);
              if (!snap.empty) {
                found = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                source = `Firestore /${colName}`;
                break;
              }
            }
          } catch (inner) { continue; }
        }
      } catch (e) { console.warn('Firestore read error', e); }
    }

    // 3. Normalisasi data
    if (found.length > 0) {
      tpList = found.map((item, idx) => ({
        id: item.id || `TP-${idx + 1}`,
        elemen: item.elemen || item.elemenCP || item.elemen_cp || item.materi || 'Umum',
        tp: item.tp || item.tujuan || item.deskripsi || item.uraian || item.atp || '',
        jp: parseInt(item.jp || item.jpEstimasi || item.alokasi || 4),
        sem: parseInt(item.semester || item.sem || 1),
        mapel: item.mapel || item.mataPelajaran || ''
      })).filter(t => t.tp);

      // Filter by mapel terpilih jika ada
      const selectedMapel = $('inpMapel').value;
      if (selectedMapel) {
        const filtered = tpList.filter(t => !t.mapel || t.mapel.toLowerCase().includes(selectedMapel.toLowerCase().split(' ')[0]));
        if (filtered.length > 0) tpList = filtered;
      }

      $('statusData').className = 'alert alert-info';
      $('statusData').innerHTML = `✅ Berhasil menarik <b>${tpList.length} TP</b> dari <code>${source}</code>. ${$('inpMapel').value ? `Filter: ${$('inpMapel').value}` : ''} <br><span style="font-size:11px;">Jika mapel belum sesuai, ganti Mapel lalu klik Tarik Data lagi.</span>`;
    } else {
      $('statusData').className = 'alert alert-warn';
      $('statusData').innerHTML = `⚠️ <b>Data TP/ATP belum ditemukan.</b> Ini wajar jika kamu belum mengisi di menu CP, TP, & ATP.<br>Silakan isi manual di bawah, atau isi dulu di menu CP, TP, & ATP lalu klik <b>Tarik Data TP/ATP</b>.`;
      if (tpList.length === 0) {
        tpList = [
          { elemen: "Bilangan", tp: "Peserta didik memahami bilangan cacah sampai 10.000", jp: 8, sem: 1 },
          { elemen: "Geometri", tp: "Peserta didik mengenal bangun datar", jp: 6, sem: 1 },
        ];
      }
    }

    refreshAll();
  }

  function hitung() {
    const s1T = parseInt($('s1Total').value) || 0;
    const s1N = parseInt($('s1Tidak').value) || 0;
    const s2T = parseInt($('s2Total').value) || 0;
    const s2N = parseInt($('s2Tidak').value) || 0;
    const jp = parseInt($('jpMinggu').value) || 0;
    const s1E = s1T - s1N;
    const s2E = s2T - s2N;
    const jp1 = s1E * jp;
    const jp2 = s2E * jp;
    $('infoWaktu').innerHTML = `Sem 1: <b>${s1E} minggu efektif</b> x ${jp} = <b>${jp1} JP</b> | Sem 2: <b>${s2E} minggu</b> x ${jp} = <b>${jp2} JP</b> | <b>TOTAL: ${jp1 + jp2} JP</b>`;
    return { s1E, s2E, jp1, jp2, total: jp1 + jp2, jp };
  }

  function renderList() {
    $('badgeCount').textContent = `${tpList.length} TP`;
    if (tpList.length === 0) {
      $('listTP').innerHTML = '<p style="color:#9ca3af; text-align:center; padding:20px;">Belum ada data TP.</p>';
      return;
    }
    $('listTP').innerHTML = tpList.map((t, i) => `
      <div style="display:flex; gap:10px; align-items:flex-start; border-bottom:1px solid #f3f4f6; padding:8px 4px; font-size:13px;">
        <input type="checkbox" class="chk" data-i="${i}" checked style="margin-top:4px;">
        <div style="flex:1;"><b>[S${t.sem}] ${t.elemen}</b> <span style="background:#eef2ff; padding:1px 6px; border-radius:10px; font-size:11px;">${t.jp} JP</span><br>${t.tp}</div>
        <button data-i="${i}" class="btnDel" style="background:none; border:none; color:#ef4444; cursor:pointer;">✕</button>
      </div>
    `).join('');
    container.querySelectorAll('.btnDel').forEach(b => b.onclick = e => { tpList.splice(parseInt(e.currentTarget.dataset.i), 1); refreshAll(); });
    container.querySelectorAll('.chk').forEach(c => c.onchange = () => renderTabel());
  }

  function getActiveTP() {
    const checks = container.querySelectorAll('.chk');
    if (checks.length === 0) return tpList;
    const active = [];
    checks.forEach(ch => { if (ch.checked) active.push(tpList[parseInt(ch.dataset.i)]); });
    return active;
  }

  function renderTabel() {
    const waktu = hitung();
    const activeTP = getActiveTP();
    const idt = { sekolah: $('inpSekolah').value, tahun: $('inpTahun').value, mapel: $('inpMapel').value || '-', kelas: $('inpKelas').value || '-', guru: 'Guru Mapel', kepsek: 'Kepala Sekolah' };
    let rows = ''; let no = 1; let totalJP = 0;
    [1, 2].forEach(sem => {
      const tpSem = activeTP.filter(t => t.sem === sem);
      if (tpSem.length === 0) return;
      rows += `<tr class="semester-row"><td colspan="5">SEMESTER ${sem} (${sem === 1 ? waktu.s1E : waktu.s2E} Minggu Efektif / ${sem === 1 ? waktu.jp1 : waktu.jp2} JP)</td></tr>`;
      tpSem.forEach(t => {
        totalJP += t.jp;
        rows += `<tr><td class="center">${no++}</td><td>${t.elemen}</td><td>${t.tp}</td><td class="center">${t.jp}</td><td>S${t.sem}</td></tr>`;
      });
    });
    rows += `<tr class="total-row"><td colspan="3" class="center">TOTAL JP DI PROTA</td><td class="center">${totalJP}</td><td>Sisa ${waktu.total - totalJP} JP</td></tr>`;
    $('renderArea').innerHTML = `
      <div style="margin-top:20px; border-top:2px dashed #d1d5db; padding-top:20px;">
        <h3 style="text-align:center; margin:0;">PROGRAM TAHUNAN</h3>
        <p style="text-align:center; font-size:12px; margin:4px 0 12px 0;">${idt.sekolah} | ${idt.mapel} | ${idt.kelas} | ${idt.tahun}</p>
        <table class="prota-table"><thead><tr><th>No</th><th>Elemen</th><th>Tujuan Pembelajaran</th><th>JP</th><th>Ket</th></tr></thead><tbody>${rows || '<tr><td colspan=5 style="text-align:center; padding:20px;">Centang minimal 1 TP di atas untuk tampil di Prota</td></tr>'}</tbody></table>
      </div>
    `;
  }

  function refreshAll() { hitung(); renderList(); renderTabel(); }

  // EVENTS
  $('btnRefreshTP').onclick = loadDataTP;
  $('inpMapel').onchange = () => {
    const mapel = $('inpMapel').value;
    if (ELEMEN_MAP[mapel]) {
      $('tpElemen').placeholder = `Contoh: ${ELEMEN_MAP[mapel][0]}`;
    }
    loadDataTP();
  };
  $('btnTambahTP').onclick = () => {
    const el = $('tpElemen').value.trim() || 'Umum';
    const tp = $('tpTeks').value.trim();
    const jp = parseInt($('tpJP').value) || 4;
    const sem = parseInt($('tpSemester').value);
    if (!tp) return alert('Isi TP dulu');
    tpList.push({ elemen: el, tp, jp, sem });
    $('tpTeks').value = '';
    refreshAll();
  };
  $('btnCetak').onclick = () => window.print();
  $('btnSimpan').onclick = () => {
    localStorage.setItem('prota_final_v2', JSON.stringify({ mapel: $('inpMapel').value, tpList, waktu: hitung(), savedAt: new Date().toISOString() }));
    alert('✅ Prota disimpan di LocalStorage (prota_final_v2)');
  };
  container.querySelectorAll('input, select').forEach(el => { if (!el.classList.contains('chk')) el.addEventListener('input', () => { hitung(); renderTabel(); }); });

  // AUTO LOAD
  await loadDataTP();
}
