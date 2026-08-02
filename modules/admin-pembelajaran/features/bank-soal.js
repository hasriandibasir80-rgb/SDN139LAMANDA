// modules/admin-pembelajaran/features/bank-soal.js
// REVISI 2: Menggunakan Single Source of Truth - js/config/data-mapel.js
// =========================================
import { 
  collection, query, orderBy, onSnapshot, 
  doc, deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ✅ IMPORT MASTER DATA MAPEL - JAUH LEBIH BERSIH
import { dataMapel } from '../../../js/config/data-mapel.js';

export async function init(contentDiv, db) {

  contentDiv.innerHTML = `
    <style>
      .bank-wrapper { font-family: 'Inter', sans-serif; }
      .bank-header { display:flex; flex-wrap:wrap; gap:12px; justify-content:space-between; align-items:center; margin-bottom:20px; }
      .bank-filters { display:flex; flex-wrap:wrap; gap:10px; background:#fff; padding:12px; border-radius:12px; border:1px solid #eee; }
      .bank-filters select, .bank-filters input { padding:9px 12px; border:1px solid #ddd; border-radius:8px; font-size:13px; min-width:160px; }
      .bank-stats { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:12px; margin-bottom:20px; }
      .stat-card { background:#fff; border:1px solid #eee; border-radius:12px; padding:14px; }
      .stat-card h4 { margin:0; font-size:11px; color:#888; text-transform:uppercase; letter-spacing:.5px; }
      .stat-card b { font-size:22px; display:block; margin-top:4px; }
      .soal-grid { display:grid; grid-template-columns:1fr; gap:12px; }
      .soal-card { background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:16px; transition:.2s; }
      .soal-card:hover { border-color:#3b82f6; box-shadow:0 4px 12px rgba(0,0,0,.05); }
      .soal-meta { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:8px; align-items:center; }
      .badge { font-size:11px; padding:4px 9px; border-radius:20px; font-weight:600; display:inline-flex; align-items:center; gap:4px; }
      .badge-mapel { background:#eff6ff; color:#1e40af; border:1px solid #dbeafe; }
      .badge-jenis { background:#fef3c7; color:#92400e; }
      .badge-mudah { background:#dcfce7; color:#166534; } .badge-sedang { background:#fef9c3; color:#854d0e; } .badge-sulit { background:#fee2e2; color:#991b1b; }
      .btn-sm { padding:6px 10px; border-radius:6px; border:1px solid #ddd; background:#fff; cursor:pointer; font-size:12px; }
      .btn-sm.primary { background:#2563eb; color:#fff; border-color:#2563eb; }
      .btn-sm.danger { color:#dc2626; border-color:#fecaca; }
      .empty-state { text-align:center; padding:40px; background:#f9fafb; border-radius:12px; border:1px dashed #ddd; }
    </style>

    <div class="bank-wrapper">
      <div class="bank-header">
        <div>
          <h2 style="margin:0;">🏦 Bank Soal</h2>
          <p style="margin:4px 0 0; color:#6b7280; font-size:13px;">Terhubung ke <code>data-mapel.js</code> (${dataMapel.length} mapel) • Wadah output Pembuat Soal</p>
        </div>
        <button id="btnExportBank" class="btn-sm primary">📤 Export Paket</button>
      </div>

      <div class="bank-stats" id="bankStats">
        <div class="stat-card"><h4>Total Soal</h4><b id="statTotal">0</b></div>
        <div class="stat-card"><h4>Pilihan Ganda</h4><b id="statPG">0</b></div>
        <div class="stat-card"><h4>Isian & Uraian</h4><b id="statUraian">0</b></div>
        <div class="stat-card"><h4>Mapel Terpakai</h4><b id="statMapel">0</b></div>
      </div>

      <div class="bank-filters">
        <input type="text" id="filterSearch" placeholder="🔍 Cari soal..." style="flex:1; min-width:220px;">
        <select id="filterMapel"></select>
        <select id="filterKelas"><option value="">Semua Kelas</option><option>VII</option><option>VIII</option><option>IX</option><option>X</option><option>XI</option><option>XII</option></select>
        <select id="filterJenis"><option value="">Semua Jenis</option><option value="PG">PG</option><option value="PGK">PG Kompleks</option><option value="Isian">Isian</option><option value="Uraian">Uraian</option><option value="Jodoh">Menjodohkan</option></select>
      </div>

      <div style="margin-top:16px;" id="soalContainer"><div class="empty-state">⏳ Memuat...</div></div>
    </div>

    <div id="modalPreview" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,.5); z-index:9999; padding:20px; overflow:auto;">
      <div style="background:#fff; max-width:700px; margin:40px auto; border-radius:12px; padding:24px; position:relative;">
        <button onclick="this.closest('#modalPreview').style.display='none'" style="position:absolute; right:16px; top:16px; border:none; background:#f3f4f6; width:32px; height:32px; border-radius:50%; cursor:pointer;">✕</button>
        <div id="modalContent"></div>
      </div>
    </div>
  `;

  const soalContainer = contentDiv.querySelector('#soalContainer');
  const filterSearch = contentDiv.querySelector('#filterSearch');
  const filterMapel = contentDiv.querySelector('#filterMapel');
  const filterKelas = contentDiv.querySelector('#filterKelas');
  const filterJenis = contentDiv.querySelector('#filterJenis');

  let allSoal = [];
  let unsubscribe = null;

  // --- Helper: Ambil info mapel dari ID ---
  function getMapelInfo(mapelId){
    return dataMapel.find(m => m.id === mapelId) || { id: mapelId, nama: mapelId, singkatan: mapelId, icon: '📘' };
  }

  // --- Populate Filter Mapel dari Master ---
  function populateMapelFilter(){
    const usedMapelIds = [...new Set(allSoal.map(s => s.mapelId || s.mapel))];
    // Tampilkan semua mapel master, tapi tandai yang ada isinya
    filterMapel.innerHTML = `<option value="">Semua Mapel (${dataMapel.length})</option>` + 
      dataMapel.map(m => {
        const count = allSoal.filter(s => (s.mapelId||s.mapel) === m.id).length;
        return `<option value="${m.id}">${m.icon} ${m.nama} ${count ? `(${count})` : ''}</option>`;
      }).join('');
  }

  function listenBankSoal(){
    try {
      const colRef = collection(db, "bankSoal");
      const q = query(colRef, orderBy("createdAt", "desc"));
      unsubscribe = onSnapshot(q, (snap) => {
        allSoal = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        if(allSoal.length === 0) allSoal = getDummySoal();
        populateMapelFilter();
        renderSoal();
        updateStats();
      }, () => {
        allSoal = getDummySoal();
        populateMapelFilter();
        renderSoal();
        updateStats();
      });
    } catch(e){
      allSoal = getDummySoal();
      populateMapelFilter();
      renderSoal();
    }
  }

  function getDummySoal(){
    // Gunakan ID yang sesuai dengan dataMapel.js kamu
    return [
      { id:'dummy1', mapelId:'ipas', mapel:'IPAS', kelas:'VII', jenis:'PG', tingkat:'Sedang', pertanyaan:'Apa fungsi utama kloroplas pada sel tumbuhan?', opsi:['Respirasi','Fotosintesis','Transportasi','Ekskresi'], kunci:'B', pembahasan:'Kloroplas tempat fotosintesis.', tpId:'TP-IPAS-01', createdAt: new Date() },
      { id:'dummy2', mapelId:'matematika', mapel:'Matematika', kelas:'VIII', jenis:'Uraian', tingkat:'Sulit', pertanyaan:'Jelaskan teorema Pythagoras dan berikan contoh penerapannya!', opsi:[], kunci:'a^2 + b^2 = c^2', pembahasan:'...', createdAt: new Date() },
      { id:'dummy3', mapelId:'bahasa-indonesia', mapel:'Bahasa Indonesia', kelas:'VII', jenis:'Isian', tingkat:'Mudah', pertanyaan:'Ide pokok paragraf disebut juga ...', opsi:[], kunci:'Gagasan utama', pembahasan:'', createdAt: new Date() },
    ];
  }

  function renderSoal(){
    const keyword = filterSearch.value.toLowerCase();
    const fMapel = filterMapel.value;
    const fKelas = filterKelas.value;
    const fJenis = filterJenis.value;

    let filtered = allSoal.filter(s => {
      const mapelId = s.mapelId || s.mapel;
      const info = getMapelInfo(mapelId);
      const textGabung = `${s.pertanyaan} ${info.nama} ${s.kelas}`.toLowerCase();
      return (!keyword || textGabung.includes(keyword)) &&
             (!fMapel || mapelId === fMapel) &&
             (!fKelas || s.kelas === fKelas) &&
             (!fJenis || s.jenis === fJenis);
    });

    if(filtered.length === 0){
      soalContainer.innerHTML = `<div class="empty-state">📭 Tidak ada soal. <br><small>Soal akan otomatis muncul di sini setelah dibuat di <b>Pembuat Soal</b>.</small></div>`;
      return;
    }

    soalContainer.innerHTML = `<div class="soal-grid">${filtered.map(s => {
      const mapelId = s.mapelId || s.mapel;
      const info = getMapelInfo(mapelId);
      return `
      <div class="soal-card">
        <div class="soal-meta">
          <span class="badge badge-mapel">${info.icon} ${info.singkatan} • Kelas ${s.kelas || '-'}</span>
          <span class="badge badge-jenis">${s.jenis}</span>
          <span class="badge ${s.tingkat === 'Mudah' ? 'badge-mudah' : s.tingkat === 'Sulit' ? 'badge-sulit' : 'badge-sedang'}">${s.tingkat || 'Sedang'}</span>
        </div>
        <div style="font-weight:600; line-height:1.5;">${s.pertanyaan}</div>
        ${s.jenis === 'PG' && s.opsi ? `<div style="margin-top:8px; font-size:13px;">${s.opsi.map((o,i) => `<div>${String.fromCharCode(65+i)}. ${o}</div>`).join('')}</div>` : ''}
        <div class="soal-aksi" style="display:flex; gap:8px; margin-top:12px;">
          <button class="btn-sm primary" onclick="window.bankSoalPreview('${s.id}')">👁️ Lihat</button>
          <button class="btn-sm danger" onclick="window.bankSoalHapus('${s.id}')">🗑️ Hapus</button>
        </div>
      </div>`;
    }).join('')}</div>`;
  }

  function updateStats(){
    contentDiv.querySelector('#statTotal').textContent = allSoal.length;
    contentDiv.querySelector('#statPG').textContent = allSoal.filter(s => s.jenis === 'PG' || s.jenis === 'PGK').length;
    contentDiv.querySelector('#statUraian').textContent = allSoal.filter(s => s.jenis !== 'PG').length;
    contentDiv.querySelector('#statMapel').textContent = [...new Set(allSoal.map(s => s.mapelId || s.mapel))].length;
  }

  [filterSearch, filterMapel, filterKelas, filterJenis].forEach(el => {
    el.addEventListener('input', renderSoal);
    el.addEventListener('change', renderSoal);
  });

  window.bankSoalPreview = (id) => {
    const s = allSoal.find(x => x.id === id);
    if(!s) return;
    const info = getMapelInfo(s.mapelId || s.mapel);
    const modal = contentDiv.querySelector('#modalPreview');
    const modalContent = contentDiv.querySelector('#modalContent');
    modalContent.innerHTML = `
      <h3 style="margin-top:0;">${info.icon} ${info.nama} - Kelas ${s.kelas}</h3>
      <p><b>TP:</b> ${s.tpId || '-'} | <b>Jenis:</b> ${s.jenis} | <b>Tingkat:</b> ${s.tingkat}</p><hr>
      <p style="font-weight:600;">${s.pertanyaan}</p>
      ${s.opsi ? `<div>${s.opsi.map((o,i) => `<div style="padding:6px; background:${String.fromCharCode(65+i) === s.kunci ? '#dcfce7' : '#f9fafb'}; margin-bottom:4px; border-radius:6px;">${String.fromCharCode(65+i)}. ${o}</div>`).join('')}</div>` : ''}
      <div style="margin-top:16px; padding:12px; background:#fefce8; border-radius:8px;"><b>Kunci:</b> ${s.kunci}<br><b>Pembahasan:</b> ${s.pembahasan || '-'}</div>
    `;
    modal.style.display = 'block';
  };

  window.bankSoalHapus = async (id) => {
    if(!confirm('Yakin hapus?')) return;
    if(id.startsWith('dummy')){ allSoal = allSoal.filter(s => s.id !== id); renderSoal(); updateStats(); return; }
    try { await deleteDoc(doc(db, "bankSoal", id)); } catch(e){ alert(e.message); }
  };

  contentDiv.querySelector('#btnExportBank').addEventListener('click', () => {
    let csv = "ID Mapel,Nama Mapel,Kelas,Jenis,Tingkat,Pertanyaan,Kunci\n";
    allSoal.forEach(s => {
      const info = getMapelInfo(s.mapelId || s.mapel);
      csv += `"${info.id}","${info.nama}","${s.kelas}","${s.jenis}","${s.tingkat}","${s.pertanyaan.replace(/"/g,'""')}","${s.kunci}"\n`;
    });
    const blob = new Blob([csv], {type:'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'bank-soal-SDN139.csv'; a.click();
  });

  listenBankSoal();
  return () => { if(unsubscribe) unsubscribe(); };
}
