/**
 * ============================================================================
 * features/prota.js - Program Tahunan Kurikulum Merdeka - REBUILD TOTAL
 * Versi: 2.0.0 - Clean Build
 * Cara kerja: main.js akan memanggil export function init(container, db)
 * ============================================================================
 */

export async function init(container, db) {
  // Reset container
  container.innerHTML = `
    <style>
      .prota-wrapper{font-family:'Segoe UI',sans-serif; background:#fff; border-radius:12px; padding:20px; color:#1f2937; max-width:1100px; margin:auto;}
      .prota-header{display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:20px; border-bottom:2px solid #1e3a8a; padding-bottom:15px;}
      .prota-header h2{margin:0; color:#1e3a8a; font-size:22px;}
      .btn{padding:8px 14px; border:none; border-radius:8px; cursor:pointer; font-weight:600;}
      .btn-primary{background:#1e3a8a; color:#fff;}
      .btn-success{background:#16a34a; color:#fff;}
      .btn-secondary{background:#e5e7eb; color:#111;}
      .grid2{display:grid; grid-template-columns:1fr 1fr; gap:12px;}
      .grid3{display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px;}
      @media(max-width:768px){.grid2,.grid3{grid-template-columns:1fr}}
      .form-group{margin-bottom:10px;}
      .form-group label{font-size:13px; font-weight:600; display:block; margin-bottom:4px;}
      .form-group input, .form-group select, .form-group textarea{width:100%; padding:8px 10px; border:1px solid #d1d5db; border-radius:6px; font-size:14px;}
      .card{border:1px solid #e5e7eb; border-radius:10px; padding:15px; margin-bottom:15px; background:#f9fafb;}
      .prota-table{width:100%; border-collapse:collapse; margin-top:15px; font-size:13px;}
      .prota-table th,.prota-table td{border:1px solid #d1d5db; padding:8px;}
      .prota-table th{background:#1e3a8a; color:#fff; text-align:center;}
      .prota-table .center{text-align:center;}
      .semester-row td{background:#dbeafe; font-weight:800; color:#1e3a8a;}
      .total-row td{background:#fef3c7; font-weight:800;}
      .prota-ttd{width:100%; margin-top:30px;}
      .prota-ttd td{width:50%; text-align:center; vertical-align:top; padding:10px;}
      @media print{ .no-print{display:none !important} .prota-wrapper{box-shadow:none; padding:0} }
    </style>

    <div class="prota-wrapper">
      <div class="prota-header">
        <h2>PROGRAM TAHUNAN (PROTA) <span style="font-size:14px; color:#6b7280;">Kurikulum Merdeka</span></h2>
        <div class="no-print" style="display:flex; gap:8px;">
          <button id="btnCetak" class="btn btn-secondary">🖨️ Cetak</button>
          <button id="btnSimpan" class="btn btn-success">💾 Simpan ke Database</button>
          <button id="btnExport" class="btn btn-primary">📄 Export JSON</button>
        </div>
      </div>

      <div class="card no-print">
        <h3 style="margin-top:0;">1. Identitas</h3>
        <div class="grid2">
          <div class="form-group"><label>Sekolah</label><input id="inpSekolah" value="SDN 139 LAMANDA"></div>
          <div class="form-group"><label>Tahun Pelajaran</label><input id="inpTahun" value="2025/2026"></div>
          <div class="form-group"><label>Mata Pelajaran</label><input id="inpMapel" placeholder="Contoh: IPAS"></div>
          <div class="form-group"><label>Fase / Kelas</label><input id="inpKelas" placeholder="Contoh: Fase B / Kelas 4"></div>
          <div class="form-group"><label>Guru Mapel</label><input id="inpGuru"></div>
          <div class="form-group"><label>Kepala Sekolah</label><input id="inpKepsek"></div>
        </div>
      </div>

      <div class="card no-print">
        <h3 style="margin-top:0;">2. Kalender Pendidikan</h3>
        <div class="grid3">
          <div class="form-group"><label>Sem 1 - Total Minggu</label><input type="number" id="s1Total" value="26"></div>
          <div class="form-group"><label>Sem 1 - Tidak Efektif</label><input type="number" id="s1Tidak" value="6"></div>
          <div class="form-group"><label>JP / Minggu</label><input type="number" id="jpMinggu" value="5"></div>
          <div class="form-group"><label>Sem 2 - Total Minggu</label><input type="number" id="s2Total" value="26"></div>
          <div class="form-group"><label>Sem 2 - Tidak Efektif</label><input type="number" id="s2Tidak" value="7"></div>
          <div class="form-group"><label>Buffer (minggu)</label><input type="number" id="buffer" value="1"></div>
        </div>
        <div id="infoWaktu" style="margin-top:10px; font-size:13px; background:#eff6ff; padding:10px; border-radius:6px;"></div>
      </div>

      <div class="card no-print">
        <h3 style="margin-top:0;">3. Daftar Tujuan Pembelajaran (TP/ATP)</h3>
        <div class="grid3">
          <div class="form-group"><label>Elemen CP</label><input id="tpElemen" placeholder="Contoh: Bilangan"></div>
          <div class="form-group"><label>JP</label><input type="number" id="tpJP" value="4"></div>
          <div class="form-group"><label>Semester</label>
            <select id="tpSemester"><option value="1">Semester 1</option><option value="2">Semester 2</option></select>
          </div>
        </div>
        <div class="form-group"><label>Tujuan Pembelajaran</label><textarea id="tpTeks" rows="2" placeholder="Tulis TP..."></textarea></div>
        <button id="btnTambahTP" class="btn btn-primary">+ Tambah TP</button>
        <div id="listTP" style="margin-top:15px;"></div>
      </div>

      <div id="renderArea"></div>
    </div>
  `;

  // --- STATE ---
  let tpList = [];
  const defaultTP = [
    { elemen: "Bilangan", tp: "Peserta didik memahami bilangan cacah sampai 10.000", jp: 8, sem: 1 },
    { elemen: "Geometri", tp: "Peserta didik mengenal bangun datar dan keliling", jp: 6, sem: 1 },
    { elemen: "Pemahaman IPAS", tp: "Peserta didik memahami siklus hidup makhluk hidup", jp: 10, sem: 2 },
  ];
  tpList = [...defaultTP];

  // --- HELPERS ---
  const $ = (id) => container.querySelector('#' + id);

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

    $('infoWaktu').innerHTML = `
      Sem 1: <b>${s1E} minggu efektif</b> x ${jp} JP = <b>${jp1} JP</b> | 
      Sem 2: <b>${s2E} minggu efektif</b> x ${jp} JP = <b>${jp2} JP</b> | 
      <b>TOTAL: ${jp1 + jp2} JP / Tahun</b>
    `;
    return { s1E, s2E, jp1, jp2, total: jp1 + jp2, jpPerWeek: jp };
  }

  function renderTPList() {
    if (tpList.length === 0) {
      $('listTP').innerHTML = '<p style="color:#9ca3af; font-size:13px;">Belum ada TP. Tambahkan di atas.</p>';
      return;
    }
    $('listTP').innerHTML = tpList.map((t, i) => `
      <div style="display:flex; justify-content:space-between; align-items:center; border:1px solid #e5e7eb; padding:8px 10px; border-radius:6px; margin-bottom:6px; background:#fff; font-size:13px;">
        <div><b>[S${t.sem}] ${t.elemen}</b> (${t.jp} JP) - ${t.tp}</div>
        <button data-i="${i}" class="btnHapus btn btn-secondary" style="padding:4px 8px; font-size:12px;">Hapus</button>
      </div>
    `).join('');

    container.querySelectorAll('.btnHapus').forEach(b => {
      b.onclick = (e) => {
        tpList.splice(parseInt(e.target.dataset.i), 1);
        refreshAll();
      };
    });
  }

  function renderTabel() {
    const waktu = hitung();
    const identitas = {
      sekolah: $('inpSekolah').value,
      tahun: $('inpTahun').value,
      mapel: $('inpMapel').value || '-',
      kelas: $('inpKelas').value || '-',
      guru: $('inpGuru').value || '...........................',
      kepsek: $('inpKepsek').value || '...........................'
    };

    let rows = '';
    let no = 1;
    let totalJP = 0;

    [1, 2].forEach(sem => {
      rows += `<tr class="semester-row"><td colspan="5">SEMESTER ${sem} - ${sem === 1 ? waktu.s1E + ' Minggu' : waktu.s2E + ' Minggu'} Efektif</td></tr>`;
      tpList.filter(t => t.sem === sem).forEach(t => {
        totalJP += t.jp;
        rows += `
          <tr>
            <td class="center">${no++}</td>
            <td>${t.elemen}</td>
            <td>${t.tp}</td>
            <td class="center">${t.jp}</td>
            <td>Sem ${t.sem}</td>
          </tr>`;
      });
    });

    rows += `<tr class="total-row"><td colspan="3" class="center">TOTAL JP TERCATAT</td><td class="center">${totalJP}</td><td>Sisa: ${waktu.total - totalJP} JP</td></tr>`;

    $('renderArea').innerHTML = `
      <div style="margin-top:25px; border-top:2px dashed #d1d5db; padding-top:20px;">
        <h3 style="text-align:center; margin:0;">PROGRAM TAHUNAN</h3>
        <p style="text-align:center; margin:5px 0 15px 0; font-size:13px;">${identitas.sekolah} - ${identitas.mapel} - ${identitas.kelas} - ${identitas.tahun}</p>
        <table class="prota-table">
          <thead><tr><th style="width:40px;">No</th><th style="width:140px;">Elemen CP</th><th>Tujuan Pembelajaran</th><th style="width:60px;">JP</th><th style="width:90px;">Ket</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <table class="prota-ttd">
          <tr>
            <td>Mengetahui,<br>Kepala Sekolah<br><br><br><br><u>${identitas.kepsek}</u></td>
            <td>${new Date().toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'})}<br>Guru Mata Pelajaran<br><br><br><br><u>${identitas.guru}</u></td>
          </tr>
        </table>
      </div>
    `;
  }

  function refreshAll() {
    hitung();
    renderTPList();
    renderTabel();
  }

  // --- EVENTS ---
  $('btnTambahTP').onclick = () => {
    const elemen = $('tpElemen').value.trim();
    const teks = $('tpTeks').value.trim();
    const jp = parseInt($('tpJP').value) || 0;
    const sem = parseInt($('tpSemester').value);
    if (!teks) return alert('Isi TP dulu!');
    if (!elemen) return alert('Isi Elemen CP!');
    tpList.push({ elemen, tp: teks, jp, sem });
    $('tpTeks').value = '';
    refreshAll();
  };

  container.querySelectorAll('input').forEach(inp => {
    inp.addEventListener('input', refreshAll);
  });

  $('btnCetak').onclick = () => window.print();

  $('btnExport').onclick = () => {
    const data = {
      identitas: {
        sekolah: $('inpSekolah').value,
        tahun: $('inpTahun').value,
        mapel: $('inpMapel').value,
        kelas: $('inpKelas').value,
        guru: $('inpGuru').value,
        kepsek: $('inpKepsek').value
      },
      kalender: hitung(),
      tpList,
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `PROTA-${data.identitas.mapel || 'Mapel'}-${data.identitas.tahun}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  $('btnSimpan').onclick = async () => {
    if (!db) return alert('DB tidak terhubung, tapi data tetap bisa dicetak/export');
    try {
      // Contoh simpan ke Firestore jika ada
      // await db.collection('prota').add({ ... })
      alert('Fitur simpan ke DB siap dihubungkan. Data saat ini sudah valid dan bisa dicetak.');
    } catch (e) {
      alert('Gagal simpan: ' + e.message);
    }
  };

  // Init awal
  refreshAll();
}
