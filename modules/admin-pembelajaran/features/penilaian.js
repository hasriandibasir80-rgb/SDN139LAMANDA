/**
 * FILE: /modules/admin-pembelajaran/features/penilaian.js
 * STATUS: ready
 * KOMPATIBEL DENGAN: service-menu.js + main.js adm-pembelajaran
 * STANDAR: Kurikulum Merdeka + Pembelajaran Mendalam (Berkesadaran, Bermakna, Menggembirakan)
 * SDN 139 LAMANDA
 */

// Agar kompatibel dengan loader main.js (yang pakai import dinamis atau script tag)
(function () {
  const STORAGE_KEY = 'sdn139_penilaian_kurmer_pm';
  const SISWA_KEY = 'sdn139_siswa';

  // Data dummy jika belum ada data siswa dari fitur lain
  const getSiswa = () => {
    const saved = localStorage.getItem(SISWA_KEY);
    if (saved) return JSON.parse(saved);
    return [
      { nisn: '001', nama: 'Andi Saputra', kelas: 'IV-A' },
      { nisn: '002', nama: 'Siti Aminah', kelas: 'IV-A' },
      { nisn: '003', nama: 'Budi Hartono', kelas: 'IV-A' },
      { nisn: '004', nama: 'Putri Lestari', kelas: 'IV-A' },
    ];
  };

  const loadPenilaian = () => JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  const savePenilaian = (data) => localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

  const getPredikatKurMer = (nilai, kktp = 70) => {
    // Standar SD KurMer
    if (nilai >= 90) return { kode: 'BSB', label: 'Berkembang Sangat Baik', color: '#15803d', bg: '#dcfce7' };
    if (nilai >= 80) return { kode: 'BSH', label: 'Berkembang Sesuai Harapan', color: '#1d4ed8', bg: '#dbeafe' };
    if (nilai >= kktp) return { kode: 'MB', label: 'Mulai Berkembang', color: '#a16207', bg: '#fef9c3' };
    return { kode: 'BB', label: 'Belum Berkembang', color: '#b91c1c', bg: '#fee2e2' };
  };

  const getTindakLanjutPM = (kode) => {
    return {
      'BB': 'Remedial berdiferensiasi + pendampingan mindful',
      'MB': 'Penguatan bermakna + latihan kontekstual',
      'BSH': 'Pengayaan joyful + tantangan HOTS',
      'BSB': 'Tutor sebaya + proyek kepemimpinan'
    }[kode];
  };

  // TEMPLATE UTAMA - akan dirender di dalam #app / #content / #main-content di adm-pembelajaran.html
  function renderHTML() {
    return `
    <div id="fitur-penilaian" style="font-family:Inter,Segoe UI,sans-serif; max-width:1200px; margin:0 auto; padding:10px;">
      
      <!-- HEADER FITUR -->
      <div style="background:linear-gradient(135deg,#2563eb,#1e40af); color:white; padding:20px 24px; border-radius:16px; margin-bottom:16px;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
          <div>
            <h2 style="margin:0; font-size:22px;">📎 Penilaian KurMer - Pembelajaran Mendalam</h2>
            <p style="margin:6px 0 0; opacity:0.9; font-size:13px;">Diagnostik • Formatif • Sumatif • Terintegrasi Prinsip Berkesadaran, Bermakna, Menggembirakan & Rumus 8-3-3-4</p>
          </div>
          <div style="background:rgba(255,255,255,0.2); padding:8px 12px; border-radius:10px; font-size:12px;">KurMer 2024 + PM</div>
        </div>
      </div>

      <div style="display:grid; grid-template-columns: 340px 1fr; gap:16px;" class="penilaian-grid">
        <!-- FORM INPUT -->
        <div style="background:white; border:1px solid #e2e8f0; border-radius:14px; padding:18px; height:fit-content; position:sticky; top:10px;">
          <h4 style="margin:0 0 12px; font-size:15px;">+ Input Penilaian</h4>
          
          <label style="font-size:11px; font-weight:700; color:#475569;">JENIS ASESMEN KURMER</label>
          <select id="p-jenis" style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:8px; margin:4px 0 10px;">
            <option value="diagnostik-kognitif">Diagnostik Kognitif</option>
            <option value="diagnostik-non-kognitif">Diagnostik Non-Kognitif</option>
            <option value="formatif">Formatif (Harian)</option>
            <option value="formatif-proyek">Formatif Proyek PM</option>
            <option value="sumatif-lingkup">Sumatif Lingkup Materi</option>
            <option value="sumatif-akhir">Sumatif Akhir (STS/SAS)</option>
          </select>

          <label style="font-size:11px; font-weight:700; color:#475569;">MAPEL & TP</label>
          <input id="p-mapel" placeholder="Contoh: IPAS - Wujud Zat" style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:8px; margin:4px 0 8px;">
          <input id="p-tp" placeholder="TP: Memahami perubahan wujud benda" style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:8px; margin-bottom:10px;">

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
            <div><label style="font-size:11px; font-weight:700;">KKTP</label><input id="p-kktp" type="number" value="70" style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:8px;"></div>
            <div><label style="font-size:11px; font-weight:700;">NILAI 0-100</label><input id="p-nilai" type="number" min="0" max="100" style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:8px;"></div>
          </div>

          <label style="font-size:11px; font-weight:700; margin-top:12px; display:block;">PEMBELAJARAN MENDALAM</label>
          <div style="display:flex; gap:6px; margin:6px 0 10px; flex-wrap:wrap;">
            <label style="font-size:12px; background:#eff6ff; padding:6px 10px; border-radius:20px; cursor:pointer;"><input type="checkbox" id="p-sadar" checked> Berkesadaran</label>
            <label style="font-size:12px; background:#f0fdf4; padding:6px 10px; border-radius:20px; cursor:pointer;"><input type="checkbox" id="p-makna" checked> Bermakna</label>
            <label style="font-size:12px; background:#fefce8; padding:6px 10px; border-radius:20px; cursor:pointer;"><input type="checkbox" id="p-gembira" checked> Menggembirakan</label>
          </div>

          <label style="font-size:11px; font-weight:700;">SISWA</label>
          <select id="p-siswa" style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:8px; margin:4px 0 10px;">
            ${getSiswa().map(s => `<option value="${s.nisn}">${s.nama} - ${s.kelas}</option>`).join('')}
          </select>

          <textarea id="p-deskripsi" rows="2" placeholder="Deskripsi capaian (auto jika kosong, sesuai KurMer)" style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:8px; margin-bottom:8px;"></textarea>
          <textarea id="p-refleksi" rows="2" placeholder="Refleksi PM: Apa yang disadari/dirasakan siswa?" style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:8px; margin-bottom:12px;"></textarea>

          <button id="p-simpan" style="width:100%; background:#2563eb; color:white; border:0; padding:12px; border-radius:10px; font-weight:700; cursor:pointer;">💾 Simpan & Analisis</button>
          <button id="p-export" style="width:100%; background:white; border:1px solid #cbd5e1; padding:10px; border-radius:10px; margin-top:8px; cursor:pointer;">⬇ Export Rekap (CSV)</button>
        </div>

        <!-- TABEL & STATS -->
        <div>
          <div id="p-stats" style="display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-bottom:14px;"></div>

          <div style="background:white; border:1px solid #e2e8f0; border-radius:14px; overflow:hidden;">
            <div style="padding:12px 16px; border-bottom:1px solid #e2e8f0; display:flex; gap:8px;">
              <input id="p-search" placeholder="Cari siswa / TP / mapel..." style="flex:1; padding:9px 12px; border:1px solid #cbd5e1; border-radius:8px;">
              <select id="p-filter" style="padding:9px 12px; border:1px solid #cbd5e1; border-radius:8px;">
                <option value="">Semua Jenis</option>
                <option value="diagnostik">Diagnostik</option>
                <option value="formatif">Formatif</option>
                <option value="sumatif">Sumatif</option>
              </select>
            </div>
            <div style="overflow:auto; max-height:65vh;">
              <table style="width:100%; border-collapse:collapse; font-size:13px;">
                <thead style="position:sticky; top:0; background:#f8fafc; z-index:1;">
                  <tr>
                    <th style="padding:10px; text-align:left; border-bottom:1px solid #e2e8f0;">Siswa & Tgl</th>
                    <th style="padding:10px; text-align:left; border-bottom:1px solid #e2e8f0;">Asesmen</th>
                    <th style="padding:10px; text-align:center; border-bottom:1px solid #e2e8f0;">Nilai</th>
                    <th style="padding:10px; text-align:left; border-bottom:1px solid #e2e8f0;">Deskripsi KurMer + PM</th>
                    <th style="padding:10px; border-bottom:1px solid #e2e8f0;">Aksi</th>
                  </tr>
                </thead>
                <tbody id="p-tbody"></tbody>
              </table>
            </div>
          </div>
          
          <div style="margin-top:12px; padding:12px; background:#fffbeb; border:1px dashed #f59e0b; border-radius:10px; font-size:12px;">
            <b>Catatan Integrasi:</b> Data ini otomatis bisa kamu tarik di <code>Analisis KKTP</code> (pakai localStorage key: <code>${STORAGE_KEY}</code>) dan <code>Rumus 8-3-3-4</code> untuk dimensi Profil Lulusan dari kolom Refleksi PM.
          </div>
        </div>
      </div>
    </div>
    <style>
      @media(max-width: 900px){ .penilaian-grid{grid-template-columns:1fr !important;} .penilaian-grid > div{position:relative !important; top:0 !important;} }
    </style>
    `;
  }

  function render() {
    // Cari root container yang dipakai main.js kamu (coba beberapa kemungkinan)
    const possibleRoots = ['#app', '#content', '#main-content', '#fitur-container', '.content-wrapper', 'main'];
    let root = null;
    for (let sel of possibleRoots) {
      root = document.querySelector(sel);
      if (root) break;
    }
    if (!root) root = document.body; // fallback

    root.innerHTML = renderHTML();
    bindEvents();
    refresh();
  }

  function bindEvents() {
    document.getElementById('p-simpan')?.addEventListener('click', handleSimpan);
    document.getElementById('p-export')?.addEventListener('click', exportCSV);
    document.getElementById('p-search')?.addEventListener('input', refreshTable);
    document.getElementById('p-filter')?.addEventListener('change', refreshTable);
  }

  function handleSimpan() {
    const jenis = document.getElementById('p-jenis').value;
    const mapel = document.getElementById('p-mapel').value.trim();
    const tp = document.getElementById('p-tp').value.trim();
    const kktp = parseInt(document.getElementById('p-kktp').value) || 70;
    const nilai = parseInt(document.getElementById('p-nilai').value);
    const nisn = document.getElementById('p-siswa').value;
    let deskripsi = document.getElementById('p-deskripsi').value.trim();
    const refleksi = document.getElementById('p-refleksi').value.trim();

    if (!mapel || !tp || isNaN(nilai)) {
      alert('Lengkapi Mapel, TP, dan Nilai dulu ya!');
      return;
    }

    const siswa = getSiswa().find(s => s.nisn === nisn);
    const pred = getPredikatKurMer(nilai, kktp);

    if (!deskripsi) {
      // Auto deskripsi format KurMer + PM
      if (jenis.includes('diagnostik')) {
        deskripsi = `Asesmen diagnostik: ${siswa.nama} ${pred.label.toLowerCase()} pada ${tp}.`;
      } else {
        deskripsi = `${siswa.nama} ${pred.label.toLowerCase()} dalam ${tp} (${mapel}). Mampu memahami dan mengaplikasi. ${getTindakLanjutPM(pred.kode)}.`;
      }
    }

    const item = {
      id: Date.now(),
      tgl: new Date().toISOString().slice(0, 10),
      jam: new Date().toLocaleTimeString('id-ID'),
      jenis, mapel, tp, kktp, nilai,
      nisn, nama: siswa.nama, kelas: siswa.kelas,
      ...pred,
      deskripsi, refleksi,
      prinsip: {
        sadar: document.getElementById('p-sadar').checked,
        makna: document.getElementById('p-makna').checked,
        gembira: document.getElementById('p-gembira').checked,
      },
      tindak: getTindakLanjutPM(pred.kode)
    };

    const data = loadPenilaian();
    data.unshift(item);
    savePenilaian(data);
    
    // reset
    document.getElementById('p-nilai').value = '';
    document.getElementById('p-deskripsi').value = '';
    document.getElementById('p-refleksi').value = '';
    refresh();
  }

  function refresh() {
    renderStats();
    refreshTable();
  }

  function renderStats() {
    const data = loadPenilaian();
    const total = data.length;
    const avg = total ? (data.reduce((a, b) => a + b.nilai, 0) / total).toFixed(1) : 0;
    const bsb = data.filter(d => d.kode === 'BSB').length;
    const perlu = data.filter(d => ['BB', 'MB'].includes(d.kode)).length;
    const el = document.getElementById('p-stats');
    if (!el) return;
    el.innerHTML = `
      <div style="background:white; border:1px solid #e2e8f0; padding:12px; border-radius:12px;"><div style="font-size:11px; color:#64748b;">Rata-rata</div><div style="font-size:22px; font-weight:800; color:#0f172a;">${avg}</div></div>
      <div style="background:white; border:1px solid #e2e8f0; padding:12px; border-radius:12px;"><div style="font-size:11px; color:#64748b;">Total</div><div style="font-size:22px; font-weight:800;">${total}</div></div>
      <div style="background:#fefce8; border:1px solid #fde68a; padding:12px; border-radius:12px;"><div style="font-size:11px; color:#92400e;">Perlu Dukungan</div><div style="font-size:22px; font-weight:800; color:#b45309;">${perlu}</div></div>
      <div style="background:#f0fdf4; border:1px solid #bbf7d0; padding:12px; border-radius:12px;"><div style="font-size:11px; color:#166534;">BSB</div><div style="font-size:22px; font-weight:800; color:#15803d;">${bsb}</div></div>
    `;
  }

  function refreshTable() {
    const tbody = document.getElementById('p-tbody');
    if (!tbody) return;
    let data = loadPenilaian();
    const q = (document.getElementById('p-search')?.value || '').toLowerCase();
    const f = (document.getElementById('p-filter')?.value || '').toLowerCase();
    if (q) data = data.filter(d => `${d.nama} ${d.tp} ${d.mapel}`.toLowerCase().includes(q));
    if (f) data = data.filter(d => d.jenis.includes(f));

    if (!data.length) {
      tbody.innerHTML = `<tr><td colspan="5" style="padding:30px; text-align:center; color:#94a3b8;">Belum ada data penilaian. Silakan input dari form di samping.</td></tr>`;
      return;
    }

    tbody.innerHTML = data.map(d => `
      <tr>
        <td style="padding:10px; border-bottom:1px solid #f1f5f9;"><b>${d.nama}</b><br><span style="font-size:11px; color:#64748b;">${d.kelas} • ${d.tgl}</span></td>
        <td style="padding:10px; border-bottom:1px solid #f1f5f9;"><span style="background:#f1f5f9; padding:3px 8px; border-radius:20px; font-size:11px;">${d.jenis.replace(/-/g,' ')}</span><br><div style="margin-top:4px; font-size:12px; font-weight:600;">${d.mapel}</div><div style="font-size:11px; color:#475569;">${d.tp}</div><div style="font-size:10px; margin-top:2px;">KKTP:${d.kktp}</div></td>
        <td style="padding:10px; border-bottom:1px solid #f1f5f9; text-align:center;"><div style="width:40px; height:40px; border-radius:50%; background:${d.color}; color:white; display:flex; align-items:center; justify-content:center; font-weight:800; margin:0 auto;">${d.nilai}</div><div style="font-size:11px; font-weight:700; color:${d.color}; margin-top:4px;">${d.kode}</div></td>
        <td style="padding:10px; border-bottom:1px solid #f1f5f9; max-width:320px;">
          <div style="font-size:12px;">${d.deskripsi}</div>
          <div style="display:flex; gap:4px; margin-top:6px; flex-wrap:wrap;">
            ${d.prinsip.sadar ? '<span style="font-size:10px; background:#dbeafe; padding:2px 6px; border-radius:10px;">Sadar</span>' : ''}
            ${d.prinsip.makna ? '<span style="font-size:10px; background:#dcfce7; padding:2px 6px; border-radius:10px;">Makna</span>' : ''}
            ${d.prinsip.gembira ? '<span style="font-size:10px; background:#fef9c3; padding:2px 6px; border-radius:10px;">Gembira</span>' : ''}
          </div>
          ${d.refleksi ? `<div style="font-size:11px; color:#475569; margin-top:4px; font-style:italic;">🪞 Refleksi: ${d.refleksi}</div>` : ''}
          <div style="font-size:11px; color:#334155; margin-top:4px; background:#f8fafc; padding:4px 6px; border-radius:6px;">↳ ${d.tindak}</div>
        </td>
        <td style="padding:10px; border-bottom:1px solid #f1f5f9;"><button onclick="window.hapusPenilaian(${d.id})" style="background:white; border:1px solid #fecaca; color:#dc2626; padding:6px 10px; border-radius:6px; cursor:pointer; font-size:12px;">Hapus</button></td>
      </tr>
    `).join('');
  }

  function exportCSV() {
    const data = loadPenilaian();
    if (!data.length) return alert('Belum ada data');
    const header = ['Tgl','Jam','NISN','Nama','Kelas','Jenis Asesmen','Mapel','TP','KKTP','Nilai','Predikat','Deskripsi KurMer','Refleksi PM','Prinsip','Tindak Lanjut'];
    const rows = data.map(d => [
      d.tgl, d.jam, d.nisn, `"${d.nama}"`, d.kelas, d.jenis, `"${d.mapel}"`, `"${d.tp.replace(/"/g,'""')}"`, d.kktp, d.nilai, d.kode,
      `"${d.deskripsi.replace(/"/g,'""')}"`,
      `"${(d.refleksi||'').replace(/"/g,'""')}"`,
      `${d.prinsip.sadar?'Sadar ':''}${d.prinsip.makna?'Bermakna ':''}${d.prinsip.gembira?'Menggembirakan':''}`.trim(),
      `"${d.tindak}"`
    ].join(','));
    const csv = [header.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `Penilaian_KurMer_PM_SD139_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  }

  // Global agar bisa dipanggil dari HTML inline
  window.hapusPenilaian = (id) => {
    if (!confirm('Hapus data penilaian ini?')) return;
    let data = loadPenilaian();
    data = data.filter(d => d.id !== id);
    savePenilaian(data);
    refresh();
  };

  // EXPORT COMPATIBLE DENGAN main.js KAMU
  // main.js kamu kemungkinan pakai salah satu dari ini:
  window.renderPenilaian = render;
  window.Penilaian = { render, init: render };
  
  // Jika main.js pakai ES Module dynamic import: export default
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { render };
  }

  // Auto-render jika diakses langsung via ?fitur=penilaian
  const params = new URLSearchParams(window.location.search);
  if (params.get('fitur') === 'penilaian') {
    // tunggu DOM siap
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', render);
    } else {
      setTimeout(render, 300);
    }
  }

  console.log('✅ features/penilaian.js loaded - KurMer + PM ready');
})();
