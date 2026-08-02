// modules/admin-pembelajaran/features/bank-soal.js
// REVISI 3: Export WORD, Kelas Fase Merdeka, Firestore Full
// =========================================
import { 
  collection, query, orderBy, onSnapshot, 
  doc, deleteDoc, addDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { dataMapel } from '../../../js/config/data-mapel.js';

// ✅ KONFIGURASI KELAS FASE - KURIKULUM MERDEKA SD
const KELAS_FASE = [
  { id: '1', label: 'Kelas 1 / Fase A', kelas: '1', fase: 'A' },
  { id: '2', label: 'Kelas 2 / Fase A', kelas: '2', fase: 'A' },
  { id: '3', label: 'Kelas 3 / Fase B', kelas: '3', fase: 'B' },
  { id: '4', label: 'Kelas 4 / Fase B', kelas: '4', fase: 'B' },
  { id: '5', label: 'Kelas 5 / Fase C', kelas: '5', fase: 'C' },
  { id: '6', label: 'Kelas 6 / Fase C', kelas: '6', fase: 'C' },
];

export async function init(contentDiv, db) {
  contentDiv.innerHTML = `
    <style>
      .bank-wrapper { font-family: 'Inter', sans-serif; max-width:1100px; }
      .bank-header { display:flex; flex-wrap:wrap; gap:12px; justify-content:space-between; align-items:center; margin-bottom:20px; }
      .bank-filters { display:flex; flex-wrap:wrap; gap:10px; background:#fff; padding:14px; border-radius:12px; border:1px solid #e5e7eb; position:sticky; top:10px; z-index:10; }
      .bank-filters select, .bank-filters input { padding:9px 12px; border:1px solid #d1d5db; border-radius:8px; font-size:13px; }
      .bank-stats { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:12px; margin-bottom:20px; }
      .stat-card { background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:14px; }
      .stat-card h4 { margin:0; font-size:11px; color:#6b7280; text-transform:uppercase; }
      .stat-card b { font-size:22px; display:block; margin-top:4px; }
      .soal-grid { display:grid; gap:12px; }
      .soal-card { background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:16px; }
      .soal-card:hover { border-color:#3b82f6; }
      .badge { font-size:11px; padding:4px 9px; border-radius:20px; font-weight:600; display:inline-flex; gap:4px; align-items:center; }
      .badge-mapel { background:#eff6ff; color:#1e40af; border:1px solid #dbeafe; }
      .badge-fase { background:#f3e8ff; color:#6b21a8; border:1px solid #e9d5ff; }
      .badge-jenis { background:#fef3c7; color:#92400e; }
      .btn { padding:9px 14px; border-radius:8px; border:1px solid #ddd; background:#fff; cursor:pointer; font-size:13px; font-weight:600; display:inline-flex; gap:6px; align-items:center; }
      .btn-primary { background:#2563eb; color:#fff; border-color:#2563eb; }
      .btn-word { background:#185abd; color:#fff; border-color:#185abd; }
      .btn-danger { color:#dc2626; border-color:#fecaca; background:#fff; }
      .empty-state { text-align:center; padding:40px; background:#f9fafb; border-radius:12px; border:1px dashed #d1d5db; }
    </style>

    <div class="bank-wrapper">
      <div class="bank-header">
        <div>
          <h2 style="margin:0;">🏦 Bank Soal - SDN 139 Lamanda</h2>
          <p style="margin:4px 0 0; color:#6b7280; font-size:13px;">
            <span id="firestoreStatus" style="color:#f59e0b;">● Menghubungkan Firestore...</span> • ${dataMapel.length} Mapel dari <code>data-mapel.js</code>
          </p>
        </div>
        <div style="display:flex; gap:8px;">
          <button id="btnExportWord" class="btn btn-word">📄 Unduh Word (.doc)</button>
          <button id="btnExportCSV" class="btn">📊 CSV</button>
        </div>
      </div>

      <div class="bank-stats">
        <div class="stat-card"><h4>Total Soal</h4><b id="statTotal">0</b></div>
        <div class="stat-card"><h4>Fase A (1-2)</h4><b id="statFaseA">0</b></div>
        <div class="stat-card"><h4>Fase B (3-4)</h4><b id="statFaseB">0</b></div>
        <div class="stat-card"><h4>Fase C (5-6)</h4><b id="statFaseC">0</b></div>
      </div>

      <div class="bank-filters">
        <input type="text" id="filterSearch" placeholder="🔍 Cari pertanyaan, TP..." style="flex:1; min-width:200px;">
        <select id="filterMapel"></select>
        <select id="filterKelas"></select>
        <select id="filterFase"><option value="">Semua Fase</option><option value="A">Fase A</option><option value="B">Fase B</option><option value="C">Fase C</option></select>
        <select id="filterJenis"><option value="">Semua Jenis</option><option value="PG">PG</option><option value="PGK">PG Kompleks</option><option value="Isian">Isian</option><option value="Uraian">Uraian</option></select>
      </div>

      <div style="margin-top:16px;" id="soalContainer"><div class="empty-state">⏳ Memuat dari Firestore...</div></div>
    </div>

    <div id="modalPreview" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,.5); z-index:9999; padding:20px; overflow:auto;">
      <div style="background:#fff; max-width:750px; margin:30px auto; border-radius:12px; padding:24px; position:relative;">
        <button onclick="this.closest('#modalPreview').style.display='none'" style="position:absolute; right:16px; top:16px; border:none; background:#f3f4f6; width:32px; height:32px; border-radius:50%; cursor:pointer;">✕</button>
        <div id="modalContent"></div>
      </div>
    </div>
  `;

  const els = {
    container: contentDiv.querySelector('#soalContainer'),
    search: contentDiv.querySelector('#filterSearch'),
    mapel: contentDiv.querySelector('#filterMapel'),
    kelas: contentDiv.querySelector('#filterKelas'),
    fase: contentDiv.querySelector('#filterFase'),
    jenis: contentDiv.querySelector('#filterJenis'),
    status: contentDiv.querySelector('#firestoreStatus'),
    statTotal: contentDiv.querySelector('#statTotal'),
    statA: contentDiv.querySelector('#statFaseA'),
    statB: contentDiv.querySelector('#statFaseB'),
    statC: contentDiv.querySelector('#statFaseC'),
  };

  let allSoal = [];
  let unsubscribe = null;

  function getMapelInfo(mapelId){ return dataMapel.find(m => m.id === mapelId) || { id: mapelId, nama: mapelId, singkatan: mapelId?.toUpperCase(), icon:'📘' }; }
  function getKelasLabel(kelasId){ return KELAS_FASE.find(k => k.id === kelasId)?.label || `Kelas ${kelasId}`; }
  function getFaseByKelas(kelasId){ return KELAS_FASE.find(k => k.id === kelasId)?.fase || ''; }

  function populateFilters(){
    els.mapel.innerHTML = `<option value="">Semua Mapel</option>` + dataMapel.map(m => `<option value="${m.id}">${m.icon} ${m.nama}</option>`).join('');
    els.kelas.innerHTML = `<option value="">Semua Kelas</option>` + KELAS_FASE.map(k => `<option value="${k.id}">${k.label}</option>`).join('');
  }

  // --- FIRESTORE REALTIME ---
  function listenBankSoal(){
    try {
      const colRef = collection(db, "bankSoal");
      const q = query(colRef, orderBy("createdAt", "desc"));
      
      unsubscribe = onSnapshot(q, (snap) => {
        allSoal = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        els.status.innerHTML = `<span style="color:#16a34a;">● Terhubung Firestore (${snap.size} dokumen)</span>`;
        els.status.title = "Koleksi: bankSoal";
        renderSoal();
        updateStats();
      }, (err) => {
        console.error("Firestore Error:", err);
        els.status.innerHTML = `<span style="color:#dc2626;">● Gagal: ${err.message} (cek rules)</span>`;
        els.container.innerHTML = `<div class="empty-state">❌ Gagal terhubung Firestore<br><small>${err.message}<br>Pastikan rules Firestore mengizinkan read koleksi <code>bankSoal</code></small></div>`;
      });
    } catch(e){
      els.status.textContent = "● Error: "+e.message;
    }
  }

  function renderSoal(){
    const kw = els.search.value.toLowerCase();
    const fMapel = els.mapel.value;
    const fKelas = els.kelas.value;
    const fFase = els.fase.value;
    const fJenis = els.jenis.value;

    let filtered = allSoal.filter(s => {
      const mapelInfo = getMapelInfo(s.mapelId);
      const text = `${s.pertanyaan} ${mapelInfo.nama} ${s.tpId || ''}`.toLowerCase();
      const matchKw = !kw || text.includes(kw);
      const matchMapel = !fMapel || s.mapelId === fMapel;
      const matchKelas = !fKelas || s.kelas === fKelas;
      const matchFase = !fFase || (s.fase === fFase || getFaseByKelas(s.kelas) === fFase);
      const matchJenis = !fJenis || s.jenis === fJenis;
      return matchKw && matchMapel && matchKelas && matchFase && matchJenis;
    });

    if(filtered.length === 0){
      els.container.innerHTML = `<div class="empty-state">📭 Tidak ada soal yang cocok.<br><small>Soal hasil dari <b>Pembuat Soal</b> akan otomatis masuk ke koleksi Firestore <code>bankSoal</code> dan tampil di sini.</small></div>`;
      return;
    }

    els.container.innerHTML = `<div class="soal-grid">${filtered.map((s,i) => {
      const mInfo = getMapelInfo(s.mapelId);
      const kLabel = getKelasLabel(s.kelas);
      const fase = s.fase || getFaseByKelas(s.kelas);
      return `
      <div class="soal-card">
        <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:8px;">
          <span class="badge badge-mapel">${mInfo.icon} ${mInfo.singkatan}</span>
          <span class="badge badge-fase">${kLabel}</span>
          <span class="badge badge-jenis">${s.jenis || 'PG'} • ${s.tingkat || 'Sedang'}</span>
          ${s.tpId ? `<span class="badge" style="background:#f3f4f6;">🔗 ${s.tpId}</span>` : ''}
        </div>
        <div style="font-weight:600;">${i+1}. ${s.pertanyaan}</div>
        ${s.jenis === 'PG' && s.opsi?.length ? `<div style="margin-top:8px; font-size:13px; color:#374151; line-height:1.6;">${s.opsi.map((o,idx) => `<div>${String.fromCharCode(65+idx)}. ${o} ${String.fromCharCode(65+idx) === s.kunci ? '<b style="color:green;">✓</b>' : ''}</div>`).join('')}</div>` : ''}
        <div style="display:flex; gap:8px; margin-top:12px;">
          <button class="btn btn-primary" style="padding:6px 10px; font-size:12px;" onclick="window.bankSoalPreview('${s.id}')">👁️ Preview</button>
          <button class="btn" style="padding:6px 10px; font-size:12px;" onclick="window.bankSoalWordSingle('${s.id}')">📄 Word</button>
          <button class="btn btn-danger" style="padding:6px 10px; font-size:12px;" onclick="window.bankSoalHapus('${s.id}')">🗑️</button>
        </div>
      </div>`;
    }).join('')}</div>`;
  }

  function updateStats(){
    els.statTotal.textContent = allSoal.length;
    els.statA.textContent = allSoal.filter(s => (s.fase || getFaseByKelas(s.kelas)) === 'A').length;
    els.statB.textContent = allSoal.filter(s => (s.fase || getFaseByKelas(s.kelas)) === 'B').length;
    els.statC.textContent = allSoal.filter(s => (s.fase || getFaseByKelas(s.kelas)) === 'C').length;
  }

  // --- EXPORT WORD FUNCTION ---
  function generateWordDoc(soalList, fileName){
    const schoolName = "SDN 139 LAMANDA";
    const now = new Date().toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' });

    // Group by mapel for header
    let htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>Bank Soal</title>
      <style>
        body { font-family:'Times New Roman', Times, serif; font-size:12pt; }
        h1 { text-align:center; font-size:16pt; margin-bottom:0; }
        h2 { text-align:center; font-size:12pt; font-weight:normal; margin-top:4px; }
        table { width:100%; border-collapse:collapse; margin-top:20px; }
        td { vertical-align:top; padding:6px; }
        .kop { text-align:center; border-bottom:3px double #000; padding-bottom:10px; margin-bottom:20px; }
        .soal { margin-bottom:16px; }
        .opsi { margin-left:20px; }
        .kunci { margin-top:30px; border-top:1px solid #000; padding-top:10px; }
      </style>
      </head><body>
      <div class="kop">
        <h1>BANK SOAL</h1>
        <h2>${schoolName} - ${now}</h2>
        <p>Filter: ${els.mapel.options[els.mapel.selectedIndex]?.text || 'Semua Mapel'} | ${els.kelas.options[els.kelas.selectedIndex]?.text || 'Semua Kelas'} | ${els.jenis.value || 'Semua Jenis'}</p>
      </div>
    `;

    soalList.forEach((s, idx) => {
      const mInfo = getMapelInfo(s.mapelId);
      const kLabel = getKelasLabel(s.kelas);
      htmlContent += `
        <div class="soal">
          <p><b>${idx+1}. [${mInfo.singkatan} - ${kLabel} - ${s.jenis} - ${s.tingkat}]</b> ${s.tpId ? `(TP: ${s.tpId})` : ''}<br>
          ${s.pertanyaan}</p>
          ${s.opsi?.length ? `<div class="opsi">${s.opsi.map((o,i) => `${String.fromCharCode(65+i)}. ${o}<br>`).join('')}</div>` : ''}
        </div>
      `;
    });

    htmlContent += `<div class="kunci"><h3>KUNCI JAWABAN & PEMBAHASAN</h3>`;
    soalList.forEach((s, idx) => {
      htmlContent += `<p>${idx+1}. Kunci: <b>${s.kunci || '-'}</b> ${s.pembahasan ? ` - ${s.pembahasan}` : ''}</p>`;
    });
    htmlContent += `</div></body></html>`;

    const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || `Bank-Soal-${new Date().toISOString().slice(0,10)}.doc`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
  }

  // Events
  [els.search, els.mapel, els.kelas, els.fase, els.jenis].forEach(el => {
    el.addEventListener('input', renderSoal);
    el.addEventListener('change', renderSoal);
  });

  contentDiv.querySelector('#btnExportWord').addEventListener('click', () => {
    const kw = els.search.value.toLowerCase();
    const fMapel = els.mapel.value;
    const fKelas = els.kelas.value;
    const fFase = els.fase.value;
    const fJenis = els.jenis.value;
    let filtered = allSoal.filter(s => {
      const mInfo = getMapelInfo(s.mapelId);
      const text = `${s.pertanyaan} ${mInfo.nama}`.toLowerCase();
      return (!kw || text.includes(kw)) && (!fMapel || s.mapelId === fMapel) && (!fKelas || s.kelas === fKelas) && (!fFase || (s.fase || getFaseByKelas(s.kelas)) === fFase) && (!fJenis || s.jenis === fJenis);
    });
    if(filtered.length === 0) return alert('Tidak ada soal untuk diunduh sesuai filter');
    generateWordDoc(filtered, `Bank-Soal-${fKelas ? getKelasLabel(fKelas).replace(/[^a-zA-Z0-9]/g,'-') : 'Semua-Kelas'}.doc`);
  });

  contentDiv.querySelector('#btnExportCSV').addEventListener('click', () => {
    let csv = "Mapel ID,Nama Mapel,Kelas,Fase,Jenis,Tingkat,Pertanyaan,Kunci\n";
    allSoal.forEach(s => {
      const mInfo = getMapelInfo(s.mapelId);
      csv += `"${mInfo.id}","${mInfo.nama}","${s.kelas}","${s.fase || getFaseByKelas(s.kelas)}","${s.jenis}","${s.tingkat}","${s.pertanyaan.replace(/"/g,'""')}","${s.kunci}"\n`;
    });
    const blob = new Blob([csv], {type:'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'bank-soal.csv'; a.click();
  });

  window.bankSoalPreview = (id) => {
    const s = allSoal.find(x => x.id === id);
    if(!s) return;
    const mInfo = getMapelInfo(s.mapelId);
    const modal = contentDiv.querySelector('#modalPreview');
    const modalContent = contentDiv.querySelector('#modalContent');
    modalContent.innerHTML = `
      <h3 style="margin:0;">${mInfo.icon} ${mInfo.nama} - ${getKelasLabel(s.kelas)}</h3>
      <p style="color:#6b7280; font-size:13px;">Fase ${s.fase || getFaseByKelas(s.kelas)} • ${s.jenis} • ${s.tingkat} • TP: ${s.tpId || '-'}</p><hr>
      <p style="font-size:16px; font-weight:600;">${s.pertanyaan}</p>
      ${s.opsi?.length ? `<div>${s.opsi.map((o,i) => `<div style="padding:8px; background:${String.fromCharCode(65+i)===s.kunci?'#dcfce7':'#f9fafb'}; margin-bottom:4px; border-radius:6px;">${String.fromCharCode(65+i)}. ${o}</div>`).join('')}</div>` : ''}
      <div style="margin-top:16px; padding:12px; background:#fefce8; border-radius:8px;"><b>Kunci:</b> ${s.kunci}<br><b>Pembahasan:</b> ${s.pembahasan || '-'}</div>
      <div style="margin-top:16px;"><button class="btn btn-word" onclick="window.bankSoalWordSingle('${s.id}')">📄 Unduh Soal Ini ke Word</button></div>
    `;
    modal.style.display = 'block';
  };

  window.bankSoalWordSingle = (id) => {
    const s = allSoal.find(x => x.id === id);
    if(!s) return;
    generateWordDoc([s], `Soal-${getMapelInfo(s.mapelId).singkatan}-${s.kelas}.doc`);
  };

  window.bankSoalHapus = async (id) => {
    if(!confirm('Yakin hapus soal ini dari Firestore? Data akan hilang permanen.')) return;
    try {
      await deleteDoc(doc(db, "bankSoal", id));
      // onSnapshot akan otomatis update UI
    } catch(e){ alert('Gagal hapus: '+e.message); }
  };

  // INIT
  populateFilters();
  listenBankSoal();

  return () => { if(unsubscribe) unsubscribe(); };
}
