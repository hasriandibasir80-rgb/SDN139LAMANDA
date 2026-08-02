// modules/admin-pembelajaran/features/bank-soal.js
// =========================================
// SUB-FITUR: BANK SOAL - Wadah Output Pembuat Soal
// =========================================

import { 
  collection, query, where, orderBy, onSnapshot, 
  doc, deleteDoc, getDocs 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export async function init(contentDiv, db) {
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');

  contentDiv.innerHTML = `
    <style>
      .bank-wrapper { font-family: 'Inter', sans-serif; }
      .bank-header { display:flex; flex-wrap:wrap; gap:12px; justify-content:space-between; align-items:center; margin-bottom:20px; }
      .bank-filters { display:flex; flex-wrap:wrap; gap:10px; }
      .bank-filters select, .bank-filters input { padding:8px 12px; border:1px solid #ddd; border-radius:8px; font-size:13px; }
      .bank-stats { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:12px; margin-bottom:20px; }
      .stat-card { background:#fff; border:1px solid #eee; border-radius:12px; padding:14px; }
      .stat-card h4 { margin:0; font-size:12px; color:#888; text-transform:uppercase; }
      .stat-card b { font-size:22px; display:block; margin-top:4px; }
      .soal-grid { display:grid; grid-template-columns:1fr; gap:12px; }
      .soal-card { background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:16px; transition:.2s; }
      .soal-card:hover { border-color:#3b82f6; box-shadow:0 4px 12px rgba(0,0,0,.05); }
      .soal-meta { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:8px; }
      .badge { font-size:11px; padding:3px 8px; border-radius:20px; font-weight:600; }
      .badge-mapel { background:#dbeafe; color:#1e40af; }
      .badge-jenis { background:#fef3c7; color:#92400e; }
      .badge-sulit { background:#fee2e2; color:#991b1b; } .badge-sedang { background:#fef9c3; color:#854d0e; } .badge-mudah { background:#dcfce7; color:#166534; }
      .soal-aksi { display:flex; gap:8px; margin-top:12px; }
      .btn-sm { padding:6px 10px; border-radius:6px; border:1px solid #ddd; background:#fff; cursor:pointer; font-size:12px; }
      .btn-sm.primary { background:#2563eb; color:#fff; border-color:#2563eb; }
      .btn-sm.danger { color:#dc2626; border-color:#fecaca; }
      .empty-state { text-align:center; padding:40px; background:#f9fafb; border-radius:12px; border:1px dashed #ddd; }
    </style>

    <div class="bank-wrapper">
      <div class="bank-header">
        <div>
          <h2 style="margin:0;">📚 Bank Soal</h2>
          <p style="margin:4px 0 0; color:#6b7280; font-size:13px;">Wadah semua soal hasil dari Pembuat Soal. Data terhubung langsung ke Firebase.</p>
        </div>
        <div>
          <button id="btnExportBank" class="btn-sm primary">📤 Export Paket Soal</button>
        </div>
      </div>

      <div class="bank-stats" id="bankStats">
        <div class="stat-card"><h4>Total Soal</h4><b id="statTotal">0</b></div>
        <div class="stat-card"><h4>Pilihan Ganda</h4><b id="statPG">0</b></div>
        <div class="stat-card"><h4>Isian & Uraian</h4><b id="statUraian">0</b></div>
        <div class="stat-card"><h4>Mapel Aktif</h4><b id="statMapel">0</b></div>
      </div>

      <div class="bank-filters">
        <input type="text" id="filterSearch" placeholder="🔍 Cari soal, mapel, materi..." style="min-width:220px;">
        <select id="filterMapel"><option value="">Semua Mapel</option></select>
        <select id="filterKelas"><option value="">Semua Kelas</option><option>VII</option><option>VIII</option><option>IX</option><option>X</option><option>XI</option><option>XII</option></select>
        <select id="filterJenis"><option value="">Semua Jenis</option><option value="PG">Pilihan Ganda</option><option value="PGK">PG Kompleks</option><option value="Isian">Isian</option><option value="Uraian">Uraian</option><option value="Jodoh">Menjodohkan</option></select>
        <select id="filterTingkat"><option value="">Semua Tingkat</option><option value="Mudah">Mudah</option><option value="Sedang">Sedang</option><option value="Sulit">Sulit</option></select>
      </div>

      <div style="margin-top:16px;" id="soalContainer">
        <div class="empty-state">⏳ Memuat bank soal...</div>
      </div>
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
  const filterTingkat = contentDiv.querySelector('#filterTingkat');

  let allSoal = [];
  let unsubscribe = null;

  // 1. LOAD REALTIME DARI FIRESTORE
  // Koleksi: bankSoal
  // Schema yang diharapkan dari Pembuat Soal nanti:
  // { mapel, kelas, semester, jenis, tingkat, pertanyaan, opsi:[], kunci, pembahasan, tpId, kisiId, authorId, createdAt }
  function listenBankSoal() {
    try {
      const colRef = collection(db, "bankSoal");
      // Filter hanya milik sekolah/user ini jika ada field sekolah
      const q = query(colRef, orderBy("createdAt", "desc"));
      
      unsubscribe = onSnapshot(q, (snapshot) => {
        allSoal = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        // Jika belum ada data sama sekali, tampilkan dummy untuk preview UI (bisa dihapus nanti)
        if(allSoal.length === 0){
          allSoal = getDummySoal();
        }
        populateMapelFilter();
        renderSoal();
        updateStats();
      }, (err) => {
        console.error(err);
        // Fallback dummy jika rules belum ada
        allSoal = getDummySoal();
        populateMapelFilter();
        renderSoal();
        updateStats();
      });
    } catch(e) {
      console.error(e);
      allSoal = getDummySoal();
      renderSoal();
    }
  }

  function getDummySoal(){
    return [
      { id:'dummy1', mapel:'IPA', kelas:'VII', semester:'Ganjil', jenis:'PG', tingkat:'Sedang', pertanyaan:'Apa fungsi utama kloroplas pada sel tumbuhan?', opsi:['Respirasi','Fotosintesis','Transportasi','Ekskresi'], kunci:'B', pembahasan:'Kloroplas tempat fotosintesis.', tpId:'TP-01', createdAt: new Date() },
      { id:'dummy2', mapel:'Matematika', kelas:'VIII', semester:'Genap', jenis:'Uraian', tingkat:'Sulit', pertanyaan:'Jelaskan teorema Pythagoras dan berikan contoh penerapannya dalam kehidupan sehari-hari!', opsi:[], kunci:'a^2 + b^2 = c^2', pembahasan:'...', tpId:'TP-02', createdAt: new Date() },
      { id:'dummy3', mapel:'Bahasa Indonesia', kelas:'VII', semester:'Ganjil', jenis:'Isian', tingkat:'Mudah', pertanyaan:'Ide pokok paragraf disebut juga ...', opsi:[], kunci:'Gagasan utama', pembahasan:'', tpId:'', createdAt: new Date() },
    ];
  }

  function populateMapelFilter(){
    const mapels = [...new Set(allSoal.map(s => s.mapel))].filter(Boolean);
    filterMapel.innerHTML = `<option value="">Semua Mapel</option>` + mapels.map(m => `<option value="${m}">${m}</option>`).join('');
  }

  function renderSoal(){
    const keyword = filterSearch.value.toLowerCase();
    const fMapel = filterMapel.value;
    const fKelas = filterKelas.value;
    const fJenis = filterJenis.value;
    const fTingkat = filterTingkat.value;

    let filtered = allSoal.filter(s => {
      const matchSearch = !keyword || `${s.pertanyaan} ${s.mapel} ${s.kelas}`.toLowerCase().includes(keyword);
      const matchMapel = !fMapel || s.mapel === fMapel;
      const matchKelas = !fKelas || s.kelas === fKelas;
      const matchJenis = !fJenis || s.jenis === fJenis;
      const matchTingkat = !fTingkat || s.tingkat === fTingkat;
      return matchSearch && matchMapel && matchKelas && matchJenis && matchTingkat;
    });

    if(filtered.length === 0){
      soalContainer.innerHTML = `<div class="empty-state">📭 Tidak ada soal yang cocok. <br><small>Soal akan otomatis muncul di sini setelah kamu buat di fitur <b>Pembuat Soal</b>.</small></div>`;
      return;
    }

    soalContainer.innerHTML = `<div class="soal-grid">${filtered.map(s => `
      <div class="soal-card" data-id="${s.id}">
        <div class="soal-meta">
          <span class="badge badge-mapel">${s.mapel || '-'} • Kelas ${s.kelas || '-'}</span>
          <span class="badge badge-jenis">${s.jenis || 'PG'}</span>
          <span class="badge ${s.tingkat === 'Mudah' ? 'badge-mudah' : s.tingkat === 'Sulit' ? 'badge-sulit' : 'badge-sedang'}">${s.tingkat || 'Sedang'}</span>
          ${s.tpId ? `<span class="badge" style="background:#f3f4f6;">🔗 ${s.tpId}</span>` : ''}
        </div>
        <div style="font-weight:600; line-height:1.5;">${s.pertanyaan}</div>
        ${s.jenis === 'PG' && s.opsi ? `<div style="margin-top:8px; font-size:13px; color:#374151;">${s.opsi.map((o,i) => `<div>${String.fromCharCode(65+i)}. ${o} ${String.fromCharCode(65+i) === s.kunci ? '✅' : ''}</div>`).join('')}</div>` : ''}
        <div class="soal-aksi">
          <button class="btn-sm primary" onclick="window.bankSoalPreview('${s.id}')">👁️ Lihat</button>
          <button class="btn-sm" onclick="window.bankSoalEdit('${s.id}')">✏️ Edit</button>
          <button class="btn-sm" onclick="window.bankSoalDuplicate('${s.id}')">📋 Duplikat</button>
          <button class="btn-sm danger" onclick="window.bankSoalHapus('${s.id}')">🗑️ Hapus</button>
        </div>
      </div>
    `).join('')}</div>`;
  }

  function updateStats(){
    contentDiv.querySelector('#statTotal').textContent = allSoal.length;
    contentDiv.querySelector('#statPG').textContent = allSoal.filter(s => s.jenis === 'PG' || s.jenis === 'PGK').length;
    contentDiv.querySelector('#statUraian').textContent = allSoal.filter(s => s.jenis !== 'PG' && s.jenis !== 'PGK').length;
    contentDiv.querySelector('#statMapel').textContent = [...new Set(allSoal.map(s => s.mapel))].length;
  }

  // EVENTS
  [filterSearch, filterMapel, filterKelas, filterJenis, filterTingkat].forEach(el => {
    el.addEventListener('input', renderSoal);
    el.addEventListener('change', renderSoal);
  });

  // GLOBAL ACTIONS (agar bisa dipanggil dari onclick)
  window.bankSoalPreview = (id) => {
    const s = allSoal.find(x => x.id === id);
    if(!s) return;
    const modal = contentDiv.querySelector('#modalPreview');
    const modalContent = contentDiv.querySelector('#modalContent');
    modalContent.innerHTML = `
      <h3 style="margin-top:0;">${s.mapel} - ${s.kelas}</h3>
      <p><b>TP Terkait:</b> ${s.tpId || '-'} | <b>Jenis:</b> ${s.jenis} | <b>Tingkat:</b> ${s.tingkat}</p>
      <hr>
      <p style="font-size:16px; font-weight:600;">${s.pertanyaan}</p>
      ${s.opsi ? `<div>${s.opsi.map((o,i) => `<div style="padding:6px; background:${String.fromCharCode(65+i) === s.kunci ? '#dcfce7' : '#f9fafb'}; margin-bottom:4px; border-radius:6px;">${String.fromCharCode(65+i)}. ${o}</div>`).join('')}</div>` : ''}
      <div style="margin-top:16px; padding:12px; background:#fefce8; border-radius:8px;"><b>Kunci:</b> ${s.kunci}<br><b>Pembahasan:</b> ${s.pembahasan || '-'}</div>
    `;
    modal.style.display = 'block';
  };

  window.bankSoalHapus = async (id) => {
    if(!confirm('Yakin hapus soal ini dari Bank Soal?')) return;
    if(id.startsWith('dummy')){ allSoal = allSoal.filter(s => s.id !== id); renderSoal(); updateStats(); return; }
    try { await deleteDoc(doc(db, "bankSoal", id)); } catch(e){ alert('Gagal hapus: '+e.message); }
  };

  window.bankSoalDuplicate = (id) => {
    alert('Fitur Duplikat akan membuat salinan soal ini di Pembuat Soal. Implementasi: clone data '+id+' dan buka di editor Pembuat Soal.');
  };

  window.bankSoalEdit = (id) => {
    alert('Edit akan membuka soal '+id+' di dalam fitur Pembuat Soal untuk diedit ulang. Nanti kita hubungkan.');
  };

  contentDiv.querySelector('#btnExportBank').addEventListener('click', () => {
    if(allSoal.length === 0) return alert('Bank masih kosong');
    // Export sederhana CSV untuk sekarang
    let csv = "Mapel,Kelas,Jenis,Tingkat,Pertanyaan,Kunci\n";
    allSoal.forEach(s => {
      csv += `"${s.mapel}","${s.kelas}","${s.jenis}","${s.tingkat}","${s.pertanyaan.replace(/"/g,'""')}","${s.kunci}"\n`;
    });
    const blob = new Blob([csv], {type:'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'bank-soal.csv'; a.click();
  });

  // INIT
  listenBankSoal();

  // Cleanup saat keluar
  return () => { if(unsubscribe) unsubscribe(); };
}
