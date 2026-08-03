/**
 * FILE: modules/admin-pembelajaran/features/penilaian.js
 * REVISI: Tarik data dari Global-Monitoring > Data Peserta Didik + Master Data TP (sinkron RPM Spesifik)
 * STANDAR: KurMer + Pembelajaran Mendalam
 * Compatible dengan main.js loader (status ready)
 */

(function () {
  const STORAGE_PENILAIAN = 'sdn139_penilaian_kurmer_pm';

  // ===== HELPER: TARIK DATA PESERTA DIDIK DARI GLOBAL MONITORING =====
  function getDataPesertaDidik() {
    // Coba semua kemungkinan key yang dipakai di project SDN139
    const possibleKeys = [
      'data-peserta-didik',
      'sdn139_data_peserta_didik',
      'sdn139_peserta_didik',
      'SDN139_PESERTA_DIDIK',
      'global-monitoring-peserta-didik',
      'dataPesertaDidik',
      'pesertaDidik',
      'siswa',
      'data_siswa'
    ];

    for (let key of possibleKeys) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        // Bisa berbentuk array langsung atau object {data:[]}
        const arr = Array.isArray(parsed) ? parsed : (parsed.data || parsed.peserta || []);
        if (arr.length > 0 && (arr[0].nama || arr[0].nama_lengkap)) {
          console.log(`✅ Peserta Didik ditemukan di key: ${key}`, arr.length);
          return arr.map(normalizePeserta);
        }
      } catch (e) {}
    }

    // Scan semua localStorage cari yang mirip peserta didik
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && /peserta|siswa/i.test(k)) {
        try {
          const raw = localStorage.getItem(k);
          const parsed = JSON.parse(raw);
          const arr = Array.isArray(parsed) ? parsed : (parsed.data || []);
          if (arr.length > 5) { // asumsi data peserta >5
            console.log(`✅ Peserta Didik ditemukan via scan: ${k}`);
            return arr.map(normalizePeserta);
          }
        } catch (e) {}
      }
    }

    console.warn('⚠️ Data Peserta Didik belum ditemukan, pakai fallback kosong');
    return [];
  }

  function normalizePeserta(item) {
    // Normalisasi struktur berbeda-beda dari Global-Monitoring
    return {
      nisn: item.nisn || item.nis || item.id || '',
      nama: (item.nama || item.nama_lengkap || item.name || '').toUpperCase().trim(),
      kelas: (item.kelas || item.rombel || item.kelas_rombel || item.kelas_saat_ini || 'Tanpa Kelas').toString(),
      jk: item.jk || item.jenis_kelamin || '',
      // simpan original untuk debug
      _raw: item
    };
  }

  // ===== HELPER: TARIK MASTER DATA TP / CP =====
  function getMasterTP() {
    const possibleKeys = [
      'data-tp',
      'master-tp',
      'data_tp',
      'sdn139_data_tp',
      'SDN139_TP',
      'cp-tp-atp',
      'rpm-spesifik-data-tp',
      'dataTP',
      'masterDataTP'
    ];

    for (let key of possibleKeys) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        const arr = Array.isArray(parsed) ? parsed : (parsed.data || parsed.tp || []);
        if (arr.length > 0 && (arr[0].tp || arr[0].tujuan || arr[0].deskripsi)) {
          console.log(`✅ Master TP ditemukan di key: ${key}`, arr.length);
          return arr.map(normalizeTP);
        }
      } catch (e) {}
    }

    // scan
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && /tp|cp.*atp/i.test(k)) {
        try {
          const parsed = JSON.parse(localStorage.getItem(k));
          const arr = Array.isArray(parsed) ? parsed : (parsed.data || []);
          if (arr.length > 3) {
            return arr.map(normalizeTP);
          }
        } catch (e) {}
      }
    }
    return [];
  }

  function normalizeTP(item) {
    return {
      id: item.id || item.kode || Date.now() + Math.random(),
      fase: item.fase || item.kelas_fase || 'Fase B',
      mapel: item.mapel || item.mata_pelajaran || item.mapel_kode || 'Umum',
      cp: item.cp || item.capaian || '',
      tp: item.tp || item.tujuan_pembelajaran || item.tujuan || item.deskripsi || '',
      atp: item.atp || item.alur || '',
      _raw: item
    };
  }

  const getPredikat = (nilai, kktp = 70) => {
    if (nilai >= 90) return { kode: 'BSB', label: 'Berkembang Sangat Baik', color: '#15803d', bg: '#dcfce7' };
    if (nilai >= 80) return { kode: 'BSH', label: 'Berkembang Sesuai Harapan', color: '#1d4ed8', bg: '#dbeafe' };
    if (nilai >= kktp) return { kode: 'MB', label: 'Mulai Berkembang', color: '#a16207', bg: '#fef9c3' };
    return { kode: 'BB', label: 'Belum Berkembang', color: '#b91c1c', bg: '#fee2e2' };
  };

  const getTindak = (kode) => ({
    'BB': 'Remedial berdiferensiasi + pendampingan mindful',
    'MB': 'Penguatan bermakna + latihan kontekstual',
    'BSH': 'Pengayaan joyful + tantangan HOTS',
    'BSB': 'Tutor sebaya + proyek kepemimpinan'
  }[kode]);

  const load = () => JSON.parse(localStorage.getItem(STORAGE_PENILAIAN) || '[]');
  const save = (d) => localStorage.setItem(STORAGE_PENILAIAN, JSON.stringify(d));

  // ===== RENDER =====
  function render() {
    const pesertaDidik = getDataPesertaDidik();
    const masterTP = getMasterTP();

    // Group peserta by kelas untuk filter
    const kelasUnik = [...new Set(pesertaDidik.map(p => p.kelas))].sort();

    const rootCandidates = ['#app', '#content', '#main-content', '#fitur-container', '.content-wrapper', 'main'];
    let root = null;
    for (let s of rootCandidates) { root = document.querySelector(s); if (root) break; }
    if (!root) root = document.body;

    root.innerHTML = `
    <div id="fitur-penilaian" style="font-family:Inter,Segoe UI,sans-serif; max-width:1250px; margin:0 auto; padding:10px;">
      <div style="background:linear-gradient(135deg,#2563eb,#1e40af); color:white; padding:20px 24px; border-radius:16px; margin-bottom:16px;">
        <h2 style="margin:0; font-size:22px;">📎 Penilaian KurMer - Pembelajaran Mendalam</h2>
        <p style="margin:6px 0 0; opacity:0.9; font-size:13px;">Sinkron: Data Peserta Didik (Global Monitoring) + Master TP (RPM Spesifik) • Total Siswa: ${pesertaDidik.length} • Total TP: ${masterTP.length}</p>
        ${pesertaDidik.length===0 ? `<div style="margin-top:10px; background:#fef08a; color:#713f12; padding:8px 12px; border-radius:8px; font-size:12px;">⚠️ Data Peserta Didik belum terbaca. Pastikan kamu sudah pernah buka fitur Data Peserta Didik di Global-Monitoring agar data tersimpan di localStorage. <br>Key dicari: ${['data-peserta-didik','sdn139_data_peserta_didik'].join(', ')}</div>` : ''}
      </div>

      <div style="display:grid; grid-template-columns:360px 1fr; gap:16px;" class="penilaian-grid">
        <!-- FORM -->
        <div style="background:white; border:1px solid #e2e8f0; border-radius:14px; padding:18px; height:fit-content; position:sticky; top:10px;">
          
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:12px;">
            <div>
              <label style="font-size:11px; font-weight:700;">FILTER KELAS</label>
              <select id="p-filter-kelas" style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:8px;">
                <option value="">Semua Kelas</option>
                ${kelasUnik.map(k => `<option value="${k}">${k}</option>`).join('')}
              </select>
            </div>
            <div>
              <label style="font-size:11px; font-weight:700;">KKTP</label>
              <input id="p-kktp" type="number" value="70" style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:8px;">
            </div>
          </div>

          <label style="font-size:11px; font-weight:700;">JENIS ASESMEN</label>
          <select id="p-jenis" style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:8px; margin:4px 0 10px;">
            <option value="diagnostik-kognitif">Diagnostik Kognitif</option>
            <option value="diagnostik-non-kognitif">Diagnostik Non-Kognitif</option>
            <option value="formatif">Formatif (Harian)</option>
            <option value="formatif-proyek">Formatif Proyek PM</option>
            <option value="sumatif-lingkup">Sumatif Lingkup Materi</option>
            <option value="sumatif-akhir">Sumatif Akhir (STS/SAS)</option>
          </select>

          <label style="font-size:11px; font-weight:700;">MAPEL (dari Master TP)</label>
          <select id="p-mapel" style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:8px; margin:4px 0 10px;">
            <option value="">-- Pilih Mapel --</option>
            ${[...new Set(masterTP.map(t=>t.mapel))].map(m=>`<option value="${m}">${m}</option>`).join('')}
            <option value="__manual__">Input Manual...</option>
          </select>
          <input id="p-mapel-manual" placeholder="Ketik Mapel manual jika tidak ada di master" style="display:none; width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:8px; margin-bottom:10px;">

          <label style="font-size:11px; font-weight:700;">TUJUAN PEMBELAJARAN (dari Master TP)</label>
          <select id="p-tp" style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:8px; margin:4px 0 10px;">
            <option value="">-- Pilih TP --</option>
            ${masterTP.map(t=>`<option value="${t.tp}" data-mapel="${t.mapel}" data-cp="${t.cp.replace(/"/g,'&quot;')}">${t.mapel} - ${t.tp.substring(0,60)}...</option>`).join('')}
          </select>
          <textarea id="p-tp-manual" rows="2" placeholder="Atau ketik TP manual" style="display:none; width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:8px; margin-bottom:10px;"></textarea>
          <div id="p-cp-preview" style="display:none; font-size:11px; background:#f8fafc; border:1px solid #e2e8f0; padding:8px; border-radius:8px; margin-bottom:10px;"></div>

          <label style="font-size:11px; font-weight:700;">PESERTA DIDIK (dari Data Peserta Didik)</label>
          <select id="p-siswa" style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:8px; margin:4px 0 10px; max-height:200px;">
            <option value="">-- Pilih Siswa --</option>
            ${pesertaDidik.map(p=>`<option value="${p.nisn}" data-kelas="${p.kelas}" data-nama="${p.nama}">${p.nama} - ${p.kelas} (${p.nisn})</option>`).join('')}
          </select>

          <label style="font-size:11px; font-weight:700;">NILAI (0-100)</label>
          <input id="p-nilai" type="number" min="0" max="100" placeholder="Contoh: 85" style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:8px; margin:4px 0 10px;">

          <label style="font-size:11px; font-weight:700;">PRINSIP PM</label>
          <div style="display:flex; gap:6px; margin:6px 0 10px; flex-wrap:wrap;">
            <label style="font-size:12px; background:#eff6ff; padding:6px 10px; border-radius:20px;"><input type="checkbox" id="p-sadar" checked> Sadar</label>
            <label style="font-size:12px; background:#f0fdf4; padding:6px 10px; border-radius:20px;"><input type="checkbox" id="p-makna" checked> Makna</label>
            <label style="font-size:12px; background:#fefce8; padding:6px 10px; border-radius:20px;"><input type="checkbox" id="p-gembira" checked> Gembira</label>
          </div>

          <textarea id="p-deskripsi" rows="2" placeholder="Deskripsi capaian (otomatis jika kosong)" style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:8px; margin-bottom:8px;"></textarea>
          <textarea id="p-refleksi" rows="2" placeholder="Refleksi PM siswa" style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:8px; margin-bottom:12px;"></textarea>

          <button id="p-simpan" style="width:100%; background:#2563eb; color:white; border:0; padding:12px; border-radius:10px; font-weight:700; cursor:pointer;">💾 Simpan Penilaian</button>
          <button id="p-export" style="width:100%; background:white; border:1px solid #cbd5e1; padding:10px; border-radius:10px; margin-top:8px; cursor:pointer;">⬇ Export CSV</button>
          <button id="p-bulk" style="width:100%; background:#f1f5f9; border:1px dashed #94a3b8; padding:10px; border-radius:10px; margin-top:8px; cursor:pointer; font-size:12px;">📋 Input Nilai Massal (1 Kelas)</button>
        </div>

        <!-- TABLE -->
        <div>
          <div id="p-stats" style="display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-bottom:14px;"></div>
          <div style="background:white; border:1px solid #e2e8f0; border-radius:14px; overflow:hidden;">
            <div style="padding:12px 16px; border-bottom:1px solid #e2e8f0; display:flex; gap:8px;">
              <input id="p-search" placeholder="Cari nama / kelas / TP..." style="flex:1; padding:9px 12px; border:1px solid #cbd5e1; border-radius:8px;">
              <select id="p-filter-jenis" style="padding:9px 12px; border:1px solid #cbd5e1; border-radius:8px;">
                <option value="">Semua</option>
                <option value="diagnostik">Diagnostik</option>
                <option value="formatif">Formatif</option>
                <option value="sumatif">Sumatif</option>
              </select>
            </div>
            <div style="overflow:auto; max-height:70vh;">
              <table style="width:100%; border-collapse:collapse; font-size:13px;">
                <thead style="position:sticky; top:0; background:#f8fafc;"><tr><th style="padding:10px; text-align:left; border-bottom:1px solid #e2e8f0;">Siswa</th><th style="padding:10px; text-align:left; border-bottom:1px solid #e2e8f0;">Asesmen</th><th style="padding:10px; text-align:center; border-bottom:1px solid #e2e8f0;">Nilai</th><th style="padding:10px; text-align:left; border-bottom:1px solid #e2e8f0;">Deskripsi + PM</th><th style="padding:10px; border-bottom:1px solid #e2e8f0;">Aksi</th></tr></thead>
                <tbody id="p-tbody"></tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
    <style>@media(max-width:900px){.penilaian-grid{grid-template-columns:1fr !important;}}</style>
    `;

    bindEvents(pesertaDidik, masterTP);
    refresh();
  }

  function bindEvents(pesertaDidik, masterTP) {
    // Mapel manual toggle
    document.getElementById('p-mapel')?.addEventListener('change', (e) => {
      const manual = document.getElementById('p-mapel-manual');
      if (e.target.value === '__manual__') manual.style.display = 'block';
      else manual.style.display = 'none';

      // Filter TP berdasarkan mapel
      const tpSelect = document.getElementById('p-tp');
      const selectedMapel = e.target.value;
      tpSelect.innerHTML = `<option value="">-- Pilih TP --</option>` + masterTP
        .filter(t => !selectedMapel || selectedMapel === '__manual__' || t.mapel === selectedMapel)
        .map(t => `<option value="${t.tp}" data-mapel="${t.mapel}" data-cp="${t.cp.replace(/"/g,'&quot;')}">${t.mapel} - ${t.tp.substring(0,70)}...</option>`).join('') +
        `<option value="__manual__">Input Manual...</option>`;
    });

    document.getElementById('p-tp')?.addEventListener('change', (e) => {
      const manual = document.getElementById('p-tp-manual');
      const preview = document.getElementById('p-cp-preview');
      const opt = e.target.selectedOptions[0];
      if (e.target.value === '__manual__') {
        manual.style.display = 'block';
        preview.style.display = 'none';
      } else {
        manual.style.display = 'none';
        if (opt && opt.dataset.cp) {
          preview.style.display = 'block';
          preview.innerHTML = `<b>CP Terkait:</b> ${opt.dataset.cp}`;
          // auto set mapel if belum
          const mapelSel = document.getElementById('p-mapel');
          if (mapelSel && !mapelSel.value) mapelSel.value = opt.dataset.mapel || '';
        }
      }
    });

    // Filter kelas -> filter siswa
    document.getElementById('p-filter-kelas')?.addEventListener('change', (e) => {
      const kelas = e.target.value;
      const siswaSel = document.getElementById('p-siswa');
      siswaSel.innerHTML = `<option value="">-- Pilih Siswa --</option>` + pesertaDidik
        .filter(p => !kelas || p.kelas === kelas)
        .map(p => `<option value="${p.nisn}" data-kelas="${p.kelas}" data-nama="${p.nama}">${p.nama} - ${p.kelas} (${p.nisn})</option>`).join('');
    });

    document.getElementById('p-simpan')?.addEventListener('click', handleSimpan);
    document.getElementById('p-export')?.addEventListener('click', exportCSV);
    document.getElementById('p-search')?.addEventListener('input', refreshTable);
    document.getElementById('p-filter-jenis')?.addEventListener('change', refreshTable);
    document.getElementById('p-bulk')?.addEventListener('click', handleBulk);
  }

  function handleSimpan() {
    const jenis = document.getElementById('p-jenis').value;
    let mapel = document.getElementById('p-mapel').value;
    if (mapel === '__manual__' || !mapel) mapel = document.getElementById('p-mapel-manual').value.trim();
    
    let tp = document.getElementById('p-tp').value;
    if (tp === '__manual__' || !tp) tp = document.getElementById('p-tp-manual').value.trim();

    const kktp = parseInt(document.getElementById('p-kktp').value) || 70;
    const nilai = parseInt(document.getElementById('p-nilai').value);
    const nisn = document.getElementById('p-siswa').value;

    if (!nisn) return alert('Pilih Peserta Didik dulu! Data diambil dari Global-Monitoring > Data Peserta Didik');
    if (!mapel || !tp || isNaN(nilai)) return alert('Lengkapi Mapel, TP (dari Master Data TP), dan Nilai');

    const peserta = getDataPesertaDidik().find(p => p.nisn == nisn);
    const pred = getPredikat(nilai, kktp);
    let deskripsi = document.getElementById('p-deskripsi').value.trim();
    const refleksi = document.getElementById('p-refleksi').value.trim();

    if (!deskripsi) {
      deskripsi = `${peserta.nama} ${pred.label.toLowerCase()} dalam ${tp}. ${getTindak(pred.kode)}.`;
    }

    const item = {
      id: Date.now(),
      tgl: new Date().toISOString().slice(0,10),
      jenis, mapel, tp, kktp, nilai,
      nisn, nama: peserta.nama, kelas: peserta.kelas,
      ...pred,
      deskripsi, refleksi,
      prinsip: {
        sadar: document.getElementById('p-sadar').checked,
        makna: document.getElementById('p-makna').checked,
        gembira: document.getElementById('p-gembira').checked,
      },
      tindak: getTindak(pred.kode)
    };

    const data = load();
    data.unshift(item);
    save(data);
    document.getElementById('p-nilai').value = '';
    document.getElementById('p-deskripsi').value = '';
    document.getElementById('p-refleksi').value = '';
    refresh();
  }

  function handleBulk() {
    const kelas = document.getElementById('p-filter-kelas').value;
    if (!kelas) return alert('Pilih Filter Kelas dulu di atas, baru bisa input massal 1 kelas!');
    const peserta = getDataPesertaDidik().filter(p => p.kelas === kelas);
    if (!peserta.length) return alert('Tidak ada siswa di kelas ' + kelas);
    const nilai = prompt(`Input nilai massal untuk kelas ${kelas} (${peserta.length} siswa)\nFormat: nilai yang sama untuk semua, atau kosongkan untuk input satu-satu`);
    if (nilai === null) return;
    const mapel = document.getElementById('p-mapel').value || document.getElementById('p-mapel-manual').value;
    const tp = document.getElementById('p-tp').value || document.getElementById('p-tp-manual').value;
    if (!mapel || !tp) return alert('Pilih Mapel & TP dulu');
    const data = load();
    peserta.forEach(p => {
      const n = parseInt(nilai) || 75;
      const pred = getPredikat(n, parseInt(document.getElementById('p-kktp').value) || 70);
      data.unshift({
        id: Date.now() + Math.random(),
        tgl: new Date().toISOString().slice(0,10),
        jenis: document.getElementById('p-jenis').value,
        mapel, tp, kktp: parseInt(document.getElementById('p-kktp').value)||70,
        nilai: n, nisn: p.nisn, nama: p.nama, kelas: p.kelas, ...pred,
        deskripsi: `${p.nama} ${pred.label.toLowerCase()} dalam ${tp}`,
        refleksi: '', prinsip: {sadar:true, makna:true, gembira:true},
        tindak: getTindak(pred.kode)
      });
    });
    save(data);
    refresh();
    alert(`Berhasil input ${peserta.length} siswa kelas ${kelas}`);
  }

  function refresh() { renderStats(); refreshTable(); }

  function renderStats() {
    const data = load();
    const el = document.getElementById('p-stats');
    if (!el) return;
    const total = data.length;
    const avg = total ? (data.reduce((a,b)=>a+b.nilai,0)/total).toFixed(1) : 0;
    el.innerHTML = `
      <div style="background:white; border:1px solid #e2e8f0; padding:12px; border-radius:12px;"><div style="font-size:11px;">Rata-rata</div><div style="font-size:20px; font-weight:800;">${avg}</div></div>
      <div style="background:white; border:1px solid #e2e8f0; padding:12px; border-radius:12px;"><div style="font-size:11px;">Total</div><div style="font-size:20px; font-weight:800;">${total}</div></div>
      <div style="background:#fefce8; border:1px solid #fde68a; padding:12px; border-radius:12px;"><div style="font-size:11px;">BB/MB</div><div style="font-size:20px; font-weight:800;">${data.filter(d=>['BB','MB'].includes(d.kode)).length}</div></div>
      <div style="background:#f0fdf4; border:1px solid #bbf7d0; padding:12px; border-radius:12px;"><div style="font-size:11px;">BSB</div><div style="font-size:20px; font-weight:800;">${data.filter(d=>d.kode==='BSB').length}</div></div>
    `;
  }

  function refreshTable() {
    const tbody = document.getElementById('p-tbody');
    if (!tbody) return;
    let data = load();
    const q = (document.getElementById('p-search')?.value || '').toLowerCase();
    const f = (document.getElementById('p-filter-jenis')?.value || '').toLowerCase();
    if (q) data = data.filter(d => `${d.nama} ${d.kelas} ${d.tp} ${d.mapel}`.toLowerCase().includes(q));
    if (f) data = data.filter(d => d.jenis.includes(f));
    if (!data.length) { tbody.innerHTML = `<tr><td colspan="5" style="padding:30px; text-align:center; color:#94a3b8;">Belum ada data penilaian</td></tr>`; return; }
    tbody.innerHTML = data.map(d => `
      <tr>
        <td style="padding:10px; border-bottom:1px solid #f1f5f9;"><b>${d.nama}</b><br><span style="font-size:11px; color:#64748b;">${d.kelas} • ${d.nisn} • ${d.tgl}</span></td>
        <td style="padding:10px; border-bottom:1px solid #f1f5f9;"><span style="background:#f1f5f9; padding:3px 8px; border-radius:20px; font-size:11px;">${d.jenis}</span><br><b style="font-size:12px;">${d.mapel}</b><br><span style="font-size:11px;">${d.tp.substring(0,80)}...</span></td>
        <td style="padding:10px; text-align:center; border-bottom:1px solid #f1f5f9;"><div style="width:38px; height:38px; border-radius:50%; background:${d.color}; color:white; display:flex; align-items:center; justify-content:center; font-weight:800; margin:0 auto;">${d.nilai}</div><div style="font-size:11px; font-weight:700; color:${d.color};">${d.kode}</div></td>
        <td style="padding:10px; border-bottom:1px solid #f1f5f9; max-width:300px;"><div style="font-size:12px;">${d.deskripsi}</div><div style="font-size:11px; background:#f8fafc; padding:4px 6px; border-radius:6px; margin-top:4px;">↳ ${d.tindak}</div></td>
        <td style="padding:10px; border-bottom:1px solid #f1f5f9;"><button onclick="window.hapusPenilaian(${d.id})" style="border:1px solid #fecaca; color:#dc2626; background:white; padding:6px 10px; border-radius:6px; cursor:pointer;">Hapus</button></td>
      </tr>
    `).join('');
  }

  function exportCSV() {
    const data = load();
    if (!data.length) return alert('Belum ada data');
    const header = ['Tgl','NISN','Nama','Kelas','Jenis','Mapel','TP','KKTP','Nilai','Predikat','Deskripsi','Tindak'];
    const rows = data.map(d => [d.tgl,d.nisn,`"${d.nama}"`,d.kelas,d.jenis,`"${d.mapel}"`,`"${d.tp.replace(/"/g,'""')}"`,d.kktp,d.nilai,d.kode,`"${d.deskripsi.replace(/"/g,'""')}"`,`"${d.tindak}"`].join(','));
    const csv = [header.join(','), ...rows].join('\n');
    const blob = new Blob([csv], {type:'text/csv'});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `Penilaian_${new Date().toISOString().slice(0,10)}.csv`; a.click();
  }

  window.hapusPenilaian = (id) => {
    if (!confirm('Hapus?')) return;
    let data = load(); data = data.filter(d=>d.id!==id); save(data); refresh();
  };

  window.renderPenilaian = render;
  window.Penilaian = { render };

  // Auto render
  const params = new URLSearchParams(window.location.search);
  if (params.get('fitur') === 'penilaian') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render);
    else setTimeout(render, 300);
  }

  console.log('✅ penilaian.js REVISI sinkron Global-Monitoring + Master TP loaded');
})();
