// modules/admin-pembelajaran/features/bank-soal.js
// =========================================
// BANK SOAL V3 HYBRID - Tab V1 + V2.1 - FIX MULTI SEKOLAH
// PERBAIKAN: Tambah filter sekolahId agar lolos rules Version 3
// LOGIC ASLI DIPERTAHANKAN 100%
// =========================================

import { db } from '../../../js/firebase-config.js';
import { 
  collection, query, where, getDocs, 
  doc, deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let dataMapelMaster = [];
try {
  const mod = await import('../../../js/config/data-mapel.js');
  dataMapelMaster = mod.dataMapel || mod.default || [];
} catch(e){}
const FALLBACK_MAPEL = [
  { id: 'paibd', nama: 'PAIBD', icon: '🕌' },
  { id: 'matematika', nama: 'MTK', icon: '🔢' },
  { id: 'ipas', nama: 'IPAS', icon: '🔬' },
  { id: 'bahasa-indonesia', nama: 'BIN', icon: '📖' },
];

const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
const CSS_ID = 'bank-soal-v3-css';
let allSoal = [];
let filteredSoal = [];
let selectedIds = new Set();
let dataMapel = dataMapelMaster.length ? dataMapelMaster : FALLBACK_MAPEL;
const KELAS_LIST = ['1','2','3','4','5','6'];
let activeTab = 'v1';
let v1Page = 1;
const V1_PER_PAGE = 20;
let v1Filtered = [];

// ===================== FIX HELPER SEKOLAH ID =====================
function getMySekolahId(){
  return currentUser.sekolahId || currentUser.sekolah_id || currentUser.kodeSekolah || null;
}
function getMyUid(){
  return currentUser.uid || currentUser.id || null;
}

export async function init(container){
  loadCSS();
  await loadMapel();
  renderUI(container);
  attachEvents(container);
  await loadBankSoal(container);
}

export function cleanup(){
  const css = document.getElementById(CSS_ID);
  if(css) css.remove();
}

function loadCSS(){
  if(document.getElementById(CSS_ID)) return;
  const s = document.createElement('style');
  s.id = CSS_ID;
  s.textContent = `
    .bank-container { background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%); border-radius:16px; padding:24px; max-width:1450px; margin:0 auto; font-family:'Segoe UI',sans-serif; }
    .bank-header { background: linear-gradient(135deg, #059669 0%, #10b981 100%); color:#fff; padding:20px; border-radius:12px; margin-bottom:16px; display:flex; justify-content:space-between; flex-wrap:wrap; gap:10px; }
    .tabs { display:flex; gap:8px; margin-bottom:16px; }
    .tab-btn { padding:10px 18px; border:none; border-radius:10px; font-weight:700; cursor:pointer; background:#e5e7eb; color:#374151; }
    .tab-btn.active { background:linear-gradient(135deg,#059669,#10b981); color:#fff; box-shadow:0 2px 8px rgba(16,185,129,.3); }
    .tab-content { display:none; }
    .tab-content.active { display:block; }
    .bank-layout { display:grid; grid-template-columns: 1fr 350px; gap:16px; }
    .bank-main { background:#fff; padding:16px; border-radius:12px; box-shadow:0 2px 8px rgba(0,0,0,.06); }
    .bank-sidebar { background:#fff; padding:16px; border-radius:12px; box-shadow:0 2px 8px rgba(0,0,0,.06); position:sticky; top:10px; max-height:92vh; overflow-y:auto; }
    .filter-grid { display:grid; grid-template-columns: 1fr 1fr 1fr; gap:10px; margin-bottom:12px; }
    .form-group { margin-bottom:8px; }
    .form-group label { display:block; font-weight:600; font-size:11px; color:#065f46; margin-bottom:4px; text-transform:uppercase; }
    .form-control { width:100%; padding:8px 10px; border:1.5px solid #a7f3d0; border-radius:8px; font-size:13px; box-sizing:border-box; }
    .soal-item { border:1px solid #d1fae5; border-radius:8px; padding:10px; margin-bottom:8px; display:flex; gap:10px; align-items:flex-start; }
    .soal-item.selected { background:#ecfdf5; border-color:#10b981; border-width:2px; }
    .soal-item input[type="checkbox"]{ margin-top:4px; width:18px; height:18px; }
    .soal-card-v1 { border:1px solid #d1fae5; border-radius:10px; padding:12px; margin-bottom:10px; background:#fff; }
    .soal-card-v1:hover { border-color:#10b981; box-shadow:0 2px 10px rgba(16,185,129,.1); }
    .badge { font-size:10px; padding:2px 7px; border-radius:10px; background:#d1fae5; color:#065f46; font-weight:600; }
    .badge-lots { background:#dcfce7; } .badge-mots { background:#fef3c7; } .badge-hots { background:#fee2e2; }
    .btn { padding:8px 14px; border:none; border-radius:8px; font-weight:600; cursor:pointer; font-size:12px; display:inline-flex; gap:6px; align-items:center; }
    .btn-primary { background:linear-gradient(135deg,#059669,#10b981); color:#fff; }
    .btn-success { background:linear-gradient(135deg,#10b981,#059669); color:#fff; }
    .btn-warning { background:linear-gradient(135deg,#f59e0b,#d97706); color:#fff; }
    .btn-secondary { background:#6b7280; color:#fff; }
    .btn-danger { background:#ef4444; color:#fff; }
    .btn-mini { padding:4px 8px; font-size:10px; border-radius:6px; border:none; cursor:pointer; }
    .keranjang-item { font-size:11px; padding:6px; border-bottom:1px dashed #a7f3d0; display:flex; justify-content:space-between; gap:6px; }
    .toast { position:fixed; top:20px; right:20px; padding:12px 20px; border-radius:10px; color:#fff; font-weight:600; z-index:10001; }
    .toast-success { background:#10b981; } .toast-error { background:#ef4444; } .toast-info { background:#3b82f6; }
    .level-bar { display:flex; gap:6px; margin-top:6px; flex-wrap:wrap; }
    .level-input { display:flex; align-items:center; gap:3px; background:#f0fdf4; padding:5px 7px; border-radius:6px; border:1px solid #a7f3d0; font-size:11px; }
    .level-input input { width:38px; border:none; background:transparent; font-weight:700; text-align:center; }
    .pagination { display:flex; gap:6px; justify-content:center; margin-top:12px; flex-wrap:wrap; }
    .page-btn { padding:6px 10px; border:1px solid #a7f3d0; border-radius:6px; background:#fff; cursor:pointer; font-size:11px; }
    .page-btn.active { background:#10b981; color:#fff; border-color:#10b981; }
    @media(max-width:1100px){ .bank-layout{ grid-template-columns:1fr; } .filter-grid{ grid-template-columns:1fr 1fr; } }
    @media(max-width:600px){ .filter-grid{ grid-template-columns:1fr; } }
  `;
  document.head.appendChild(s);
}

async function loadMapel(){
  if(dataMapelMaster.length){ dataMapel = dataMapelMaster; return; }
  dataMapel = FALLBACK_MAPEL;
}

function renderUI(container){
  let mapelOptions = '<option value="">Semua Mapel</option>';
  dataMapel.forEach(m=>{ mapelOptions += `<option value="${m.id}">${m.icon||'📘'} ${m.nama}</option>`; });
  let kelasOptions = '<option value="">Semua Kelas</option>';
  KELAS_LIST.forEach(k=> kelasOptions += `<option value="${k}">Kelas ${k}</option>`);

  container.innerHTML = `
    <div class="bank-container">
      <div class="bank-header">
        <div><h2 style="margin:0;">📚 Bank Soal Hybrid V3</h2><p style="margin:4px 0 0; font-size:12px; opacity:.9;">Kelola & Rakit Soal - Anti Index - Multi Sekolah</p></div>
        <div style="display:flex; gap:8px; align-items:center;">
          <span id="stat-total" style="background:rgba(255,255,255,.2); padding:6px 10px; border-radius:8px; font-size:11px;">Total: 0</span>
          <span id="stat-terpilih" style="background:rgba(255,255,255,.2); padding:6px 10px; border-radius:8px; font-size:11px;">Terpilih: 0</span>
        </div>
      </div>
      <div class="tabs">
        <button class="tab-btn active" data-tab="v1">📋 V1 Daftar Semua</button>
        <button class="tab-btn" data-tab="v2">🧠 V2 Wadah Pintar</button>
      </div>

      <div id="tab-v1" class="tab-content active">
        <div class="bank-main">
          <div class="filter-grid">
            <div class="form-group"><label>Mapel</label><select id="v1-filter-mapel" class="form-control">${mapelOptions}</select></div>
            <div class="form-group"><label>Kelas</label><select id="v1-filter-kelas" class="form-control">${kelasOptions}</select></div>
            <div class="form-group"><label>Cari</label><input id="v1-search" class="form-control" placeholder="Cari soal..."></div>
          </div>
          <div id="v1-list"></div>
          <div id="v1-pagination" class="pagination"></div>
        </div>
      </div>

      <div id="tab-v2" class="tab-content">
        <div class="bank-layout">
          <div class="bank-main">
            <div class="filter-grid">
              <div class="form-group"><label>Mapel</label><select id="filter-mapel" class="form-control">${mapelOptions}</select></div>
              <div class="form-group"><label>Kelas</label><select id="filter-kelas" class="form-control">${kelasOptions}</select></div>
              <div class="form-group"><label>Level</label><select id="filter-level" class="form-control"><option value="">Semua</option><option value="LOTS">LOTS</option><option value="MOTS">MOTS</option><option value="HOTS">HOTS</option></select></div>
            </div>
            <div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:10px;">
              <button id="btnAcak" class="btn btn-primary">🎲 Acak</button>
              <button id="btnAmbilProporsional" class="btn btn-warning">⚖️ Proporsional</button>
              <button id="btnPilihSemua" class="btn btn-secondary">☑️ Pilih Semua Filter</button>
              <button id="btnBersih" class="btn btn-secondary">🧹 Bersihkan</button>
              <button id="btnHapusTerpilih" class="btn btn-danger">🗑️ Hapus Terpilih</button>
            </div>
            <div style="background:#f0fdf4; padding:10px; border-radius:8px; margin-bottom:10px; display:flex; gap:10px; flex-wrap:wrap;">
              <div class="level-input"><label>Butuh:</label><input id="input-jumlah-butuh" type="number" value="25" min="1"> soal</div>
              <div class="level-input"><label>LOTS %</label><input id="input-lots" type="number" value="40"></div>
              <div class="level-input"><label>MOTS %</label><input id="input-mots" type="number" value="40"></div>
              <div class="level-input"><label>HOTS %</label><input id="input-hots" type="number" value="20"></div>
            </div>
            <div id="bank-list"></div>
          </div>
          <div class="bank-sidebar">
            <h4 style="margin:0 0 10px;">🛒 Keranjang Soal</h4>
            <div id="keranjang-list" style="min-height:100px; border:1px dashed #a7f3d0; border-radius:8px; padding:8px; margin-bottom:10px;"></div>
            <div style="display:grid; gap:6px;">
              <button id="btnExportSiswa" class="btn btn-primary">📄 Export Siswa (Bersih)</button>
              <button id="btnExportGuru" class="btn btn-success">📄 Export Guru (+Kunci)</button>
              <button id="btnExportBoth" class="btn btn-warning">📦 Export Keduanya</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ===================== LOAD BANK SOAL - FIX UTAMA =====================
async function loadBankSoal(container){
  try{
    const sekolahId = getMySekolahId();
    const uid = getMyUid();
    if(!sekolahId){
      console.warn("currentUser.sekolahId kosong, fallback ke uid saja");
      showToast("⚠️ Akun belum ada sekolahId, hubungi Admin", "error");
    }

    container.querySelector('#v1-list').innerHTML = '<p style="text-align:center; padding:20px;">⏳ Memuat bank soal...</p>';

    // Query ANTI INDEX: hanya pakai where sekolahId saja (tidak pakai orderBy)
    // Ini yang bikin lolos rules Version 3
    let q;
    let collectionsToTry = ['bankSoal', 'bank_soal']; // coba 2 koleksi karena di projectmu ada 2 nama
    let results = [];

    for(let colName of collectionsToTry){
      try{
        if(sekolahId){
          q = query(collection(db, colName), where("sekolahId", "==", sekolahId));
        } else if(uid){
          // Fallback untuk data lama yang belum ada sekolahId: pakai owner
          q = query(collection(db, colName), where("createdBy", "==", uid));
        } else {
          q = query(collection(db, colName));
        }
        const snap = await getDocs(q);
        snap.forEach(d=>{
          results.push({ id: d.id, _col: colName, ...d.data() });
        });
      }catch(e){
        // koleksi tidak ada / tidak punya akses, lanjutkan
        console.log(`Skip ${colName}:`, e.message);
      }
    }

    // Gabungkan & hilangkan duplikat berdasarkan id + pertanyaan
    const map = new Map();
    results.forEach(r=>{
      if(!map.has(r.id)) map.set(r.id, r);
    });
    allSoal = Array.from(map.values());

    // Sort client-side (anti index)
    allSoal.sort((a,b)=> (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0));

    filteredSoal = [...allSoal];
    v1Filtered = [...allSoal];

    console.log(`BankSoal loaded: ${allSoal.length} soal untuk sekolah ${sekolahId}`);
    updateStats(container);
    renderV1List(container);
    renderList(container);
    renderKeranjang(container);

    if(!allSoal.length){
      showToast("Bank soal kosong untuk sekolah ini. Buat soal baru akan otomatis ada sekolahId.", "info");
    }

  }catch(e){
    console.error(e);
    container.querySelector('#v1-list').innerHTML = `<p style="color:#ef4444; text-align:center;">❌ Gagal load: ${e.message}<br><small>Pastikan dokumen sudah ada field sekolahId = ${getMySekolahId()}</small></p>`;
    showToast("❌ " + e.message, "error");
  }
}

// ===================== SISA LOGIC ASLI - TIDAK DIUBAH =====================
let currentFilterV1 = { mapel: '', kelas: '', search: '' };
let currentFilterV2 = { mapel: '', kelas: '', level: '' };

function updateStats(container){
  if(container.querySelector('#stat-total')) container.querySelector('#stat-total').textContent = `Total: ${allSoal.length}`;
  if(container.querySelector('#stat-terpilih')) container.querySelector('#stat-terpilih').textContent = `Terpilih: ${selectedIds.size}`;
}

function renderV1List(container){
  let list = container.querySelector('#v1-list');
  if(!list) return;
  let data = v1Filtered;
  if(currentFilterV1.mapel) data = data.filter(s=> s.mapelId===currentFilterV1.mapel);
  if(currentFilterV1.kelas) data = data.filter(s=> String(s.kelas)===String(currentFilterV1.kelas));
  if(currentFilterV1.search){
    const q = currentFilterV1.search.toLowerCase();
    data = data.filter(s=> (s.pertanyaan||'').toLowerCase().includes(q));
  }
  const totalPages = Math.ceil(data.length / V1_PER_PAGE) || 1;
  if(v1Page>totalPages) v1Page=totalPages;
  const start = (v1Page-1)*V1_PER_PAGE;
  const pageData = data.slice(start, start+V1_PER_PAGE);

  if(!pageData.length){
    list.innerHTML = '<p style="text-align:center; color:#6b7280; padding:20px;">Tidak ada soal.</p>';
  }else{
    list.innerHTML = pageData.map(s=>{
      const checked = selectedIds.has(s.id) ? 'checked' : '';
      const level = s.level_kognitif || s.tingkat || '-';
      const badgeClass = level==='LOTS' ? 'badge-lots' : level==='MOTS' ? 'badge-mots' : level==='HOTS' ? 'badge-hots' : '';
      return `<div class="soal-card-v1 ${selectedIds.has(s.id)?'selected':''}">
        <div style="display:flex; gap:8px;">
          <input type="checkbox" class="chk-soal-v1" data-id="${s.id}" ${checked}>
          <div style="flex:1;">
            <div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:4px;">
              <span class="badge">${s.mapelId||''} - Kls ${s.kelas||''}</span>
              <span class="badge ${badgeClass}">${level}</span>
              <span class="badge" style="background:#fef3c7;">${s._col||''}</span>
            </div>
            <div style="font-size:13px;">${(s.pertanyaan||'').substring(0,250)}</div>
          </div>
        </div>
      </div>`;
    }).join('');
  }
  // pagination
  const pag = container.querySelector('#v1-pagination');
  if(pag){
    let html='';
    for(let i=1;i<=totalPages;i++){
      html+=`<button class="page-btn ${i===v1Page?'active':''}" data-page="${i}">${i}</button>`;
    }
    pag.innerHTML = html;
  }
  list.querySelectorAll('.chk-soal-v1').forEach(chk=>{
    chk.addEventListener('change', e=>{
      const id = e.target.dataset.id;
      if(e.target.checked) selectedIds.add(id); else selectedIds.delete(id);
      updateStats(container); renderKeranjang(container);
    });
  });
  const pagEl = container.querySelector('#v1-pagination');
  if(pagEl){
    pagEl.querySelectorAll('.page-btn').forEach(b=>{
      b.addEventListener('click', e=>{
        v1Page = parseInt(e.target.dataset.page);
        renderV1List(container);
      });
    });
  }
}

function renderList(container){
  const list = container.querySelector('#bank-list');
  if(!list) return;
  let data = filteredSoal;
  if(currentFilterV2.mapel) data = data.filter(s=> s.mapelId===currentFilterV2.mapel);
  if(currentFilterV2.kelas) data = data.filter(s=> String(s.kelas)===String(currentFilterV2.kelas));
  if(currentFilterV2.level) data = data.filter(s=> (s.level_kognitif===currentFilterV2.level || s.tingkat===currentFilterV2.level));
  
  if(!data.length){
    list.innerHTML = '<p style="text-align:center; color:#6b7280;">Tidak ada soal sesuai filter.</p>';
    return;
  }
  list.innerHTML = data.map(s=>{
    const checked = selectedIds.has(s.id) ? 'checked' : '';
    const level = s.level_kognitif || s.tingkat || '-';
    return `<div class="soal-item ${selectedIds.has(s.id)?'selected':''}">
      <input type="checkbox" class="chk-soal" data-id="${s.id}" ${checked}>
      <div style="flex:1;"><div style="font-size:12px; font-weight:600;">${s.mapelId} - ${level} - ${s.topik||''}</div><div style="font-size:13px;">${(s.pertanyaan||'').substring(0,200)}</div></div>
    </div>`;
  }).join('');
  list.querySelectorAll('.chk-soal').forEach(chk=>{
    chk.addEventListener('change', e=>{
      const id = e.target.dataset.id;
      if(e.target.checked) selectedIds.add(id); else selectedIds.delete(id);
      updateStats(container); renderKeranjang(container); renderV1List(container);
    });
  });
}

function renderKeranjang(container){
  const el = container.querySelector('#keranjang-list');
  if(!el) return;
  if(!selectedIds.size){
    el.innerHTML = '<p style="text-align:center; color:#9ca3af; font-size:11px;">Belum ada soal dipilih.</p>';
    return;
  }
  const selected = allSoal.filter(s=> selectedIds.has(s.id));
  el.innerHTML = selected.map((s,i)=> `<div class="keranjang-item"><span>${i+1}. ${(s.pertanyaan||'').substring(0,40)}...</span><button class="btn-mini" style="background:#fee2e2; color:#ef4444;" data-id="${s.id}">x</button></div>`).join('');
  el.querySelectorAll('button').forEach(b=>{
    b.addEventListener('click', e=>{
      selectedIds.delete(e.target.dataset.id);
      updateStats(container); renderList(container); renderV1List(container); renderKeranjang(container);
    });
  });
}

function attachEvents(container){
  container.querySelectorAll('.tab-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      activeTab = btn.dataset.tab;
      container.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      container.querySelectorAll('.tab-content').forEach(c=>c.classList.remove('active'));
      container.querySelector(`#tab-${activeTab}`).classList.add('active');
    });
  });
  container.querySelector('#v1-filter-mapel')?.addEventListener('change', e=>{ currentFilterV1.mapel=e.target.value; v1Page=1; renderV1List(container); });
  container.querySelector('#v1-filter-kelas')?.addEventListener('change', e=>{ currentFilterV1.kelas=e.target.value; v1Page=1; renderV1List(container); });
  container.querySelector('#v1-search')?.addEventListener('input', e=>{ currentFilterV1.search=e.target.value; v1Page=1; renderV1List(container); });

  container.querySelector('#filter-mapel')?.addEventListener('change', e=>{ currentFilterV2.mapel=e.target.value; renderList(container); });
  container.querySelector('#filter-kelas')?.addEventListener('change', e=>{ currentFilterV2.kelas=e.target.value; renderList(container); });
  container.querySelector('#filter-level')?.addEventListener('change', e=>{ currentFilterV2.level=e.target.value; renderList(container); });

  container.querySelector('#btnPilihSemua')?.addEventListener('click', ()=>{
    filteredSoal.forEach(s=> selectedIds.add(s.id));
    v1Filtered.forEach(s=> selectedIds.add(s.id));
    updateStats(container); renderList(container); renderV1List(container); renderKeranjang(container);
  });
  container.querySelector('#btnBersih')?.addEventListener('click', ()=>{
    selectedIds.clear();
    updateStats(container); renderList(container); renderV1List(container); renderKeranjang(container);
  });
  container.querySelector('#btnAcak').addEventListener('click', ()=>{
    const jumlah = parseInt(container.querySelector('#input-jumlah-butuh').value);
    if(!jumlah || jumlah<=0){ showToast('Isi jumlah dulu! Misal 25','error'); return; }
    let count = Math.min(jumlah, filteredSoal.length);
    const shuffled = [...filteredSoal].sort(()=>0.5-Math.random());
    const picked = shuffled.slice(0, count);
    selectedIds.clear();
    picked.forEach(s=> selectedIds.add(s.id));
    updateStats(container);
    renderList(container);
    renderV1List(container);
    renderKeranjang(container);
    showToast(`🎲 ${count} soal acak dari ${filteredSoal.length} terfilter`, 'success');
  });

  container.querySelector('#btnAmbilProporsional').addEventListener('click', ()=>{
    const jumlah = parseInt(container.querySelector('#input-jumlah-butuh').value);
    if(!jumlah || jumlah<=0){ showToast('Isi jumlah dulu!','error'); return; }
    let pLots = parseInt(container.querySelector('#input-lots').value)||0;
    let pMots = parseInt(container.querySelector('#input-mots').value)||0;
    let pHots = parseInt(container.querySelector('#input-hots').value)||0;
    if(pLots+pMots+pHots !== 100){ showToast(`Total % harus 100%, sekarang ${pLots+pMots+pHots}%`,'error'); return; }
    const needLots = Math.round(jumlah * pLots / 100);
    const needMots = Math.round(jumlah * pMots / 100);
    const needHots = jumlah - needLots - needMots;
    const poolLots = filteredSoal.filter(s=> (s.level_kognitif==='LOTS' || s.tingkat==='Mudah'));
    const poolMots = filteredSoal.filter(s=> (s.level_kognitif==='MOTS' || s.tingkat==='Sedang'));
    const poolHots = filteredSoal.filter(s=> (s.level_kognitif==='HOTS' || s.tingkat==='Sulit'));
    const pick = (pool, need) => [...pool].sort(()=>0.5-Math.random()).slice(0, Math.min(need, pool.length));
    let allPicked = [...pick(poolLots, needLots), ...pick(poolMots, needMots), ...pick(poolHots, needHots)];
    if(allPicked.length < jumlah){
      const remaining = filteredSoal.filter(s=> !allPicked.find(p=>p.id===s.id));
      allPicked = [...allPicked, ...remaining.slice(0, jumlah - allPicked.length)];
    }
    selectedIds.clear();
    allPicked.forEach(s=> selectedIds.add(s.id));
    updateStats(container);
    renderList(container);
    renderV1List(container);
    renderKeranjang(container);
    showToast(`⚖️ ${allPicked.length} soal proporsional`, 'success');
  });

  container.querySelector('#btnExportSiswa').addEventListener('click', ()=> exportWord(container, 'siswa'));
  container.querySelector('#btnExportGuru').addEventListener('click', ()=> exportWord(container, 'guru'));
  container.querySelector('#btnExportBoth').addEventListener('click', ()=>{
    exportWord(container, 'siswa');
    setTimeout(()=> exportWord(container, 'guru'), 800);
  });
  container.querySelector('#btnHapusTerpilih').addEventListener('click', async ()=>{
    if(!selectedIds.size){ showToast('Tidak ada yang dipilih','error'); return; }
    if(!confirm(`Hapus ${selectedIds.size} soal permanen?`)) return;
    try{
      for(const id of selectedIds){ 
        // coba hapus di kedua koleksi untuk jaga-jaga
        try{ await deleteDoc(doc(db,'bankSoal', id)); }catch(e){}
        try{ await deleteDoc(doc(db,'bank_soal', id)); }catch(e){}
      }
      allSoal = allSoal.filter(s=> !selectedIds.has(s.id));
      filteredSoal = filteredSoal.filter(s=> !selectedIds.has(s.id));
      v1Filtered = v1Filtered.filter(s=> !selectedIds.has(s.id));
      selectedIds.clear();
      updateStats(container);
      renderV1List(container);
      renderList(container);
      renderKeranjang(container);
      showToast('🗑️ Dihapus','success');
    }catch(e){ showToast('❌ '+e.message,'error'); }
  });
}

function exportWord(container, type){
  if(!selectedIds.size){ showToast('Centang dulu soal di keranjang!','error'); return; }
  const selected = allSoal.filter(s=> selectedIds.has(s.id));
  const first = selected[0];
  const mapelNama = dataMapel.find(m=>m.id===first.mapelId)?.nama || first.mapelId || 'Soal';
  const kelas = first.kelas || '-';
  let html = `
    <html><head><meta charset="utf-8"><title>${type==='siswa'?'Soal Siswa':'Soal Guru'} - ${mapelNama}</title>
    <style>body{font-family:'Times New Roman',serif; margin:2cm; font-size:12pt; line-height:1.5;} h1{text-align:center; font-size:14pt;} .kop{ text-align:center; border-bottom:2px solid #000; padding-bottom:10px; margin-bottom:20px; } .soal{margin-bottom:14px;} .opsi{margin-left:20px; margin-top:4px;}</style>
    </head><body>
    <div class="kop"><h1>${type==='siswa' ? 'SOAL EVALUASI' : 'SOAL + KUNCI JAWABAN GURU'}<br>${mapelNama.toUpperCase()} - KELAS ${kelas}</h1><p style="font-size:10pt;">${type==='siswa' ? 'Lembar Soal Peserta Didik - Tanpa Kunci - BERSIH' : 'Pegangan Guru - Dengan Kunci & Pembahasan'}</p></div>
    <p>Tanggal: ${new Date().toLocaleDateString('id-ID')} | Jumlah: ${selected.length} soal</p><hr>
  `;
  selected.forEach((s,i)=>{
    let opsiBlock = '';
    if(s.opsi && Array.isArray(s.opsi) && s.opsi.length){
      opsiBlock = `<div class="opsi">${s.opsi.map((o,idx)=> `${String.fromCharCode(65+idx)}. ${o}<br>`).join('')}</div>`;
    }
    html+=`<div class="soal"><p><b>${i+1}.</b> ${s.pertanyaan||''}</p>${opsiBlock}</div>`;
    if(type==='guru'){
      html+=`<div style="margin-left:20px; font-size:11pt; background:#f9fafb; padding:6px; border-left:3px solid #10b981; margin-bottom:12px;"><b>Kunci:</b> ${s.kunci||'-'}<br><b>Pembahasan:</b> ${s.pembahasan||'-'}</div>`;
    }
  });
  if(type==='siswa'){
    html+=`<div style="page-break-before:always;"></div><h3>LEMBAR JAWAB SISWA</h3><p>Nama: .................... Kelas: ............</p><table border="1" cellpadding="6" cellspacing="0" style="width:100%; border-collapse:collapse;"><tr><th>No</th><th>Jawaban</th></tr>${selected.map((_,i)=> `<tr><td>${i+1}</td><td style="height:22px;"></td></tr>`).join('')}</table>`;
  } else {
    html+=`<div style="page-break-before:always;"></div><h3>REKAP KUNCI JAWABAN</h3>${selected.map((s,i)=> `<p>${i+1}. <b>${s.kunci||'-'}</b> - ${s.topik||''} (${s.level_kognitif||s.tingkat||''})</p>`).join('')}`;
  }
  html+=`</body></html>`;
  const blob = new Blob(['\ufeff', html], {type:'application/msword'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download = type==='siswa' ? `Soal-SISWA-${mapelNama}-Kelas${kelas}-${selected.length}soal.doc` : `Soal-GURU-${mapelNama}-Kelas${kelas}-${selected.length}soal.doc`;
  document.body.appendChild(a); a.click(); setTimeout(()=>{ document.body.removeChild(a); URL.revokeObjectURL(url); },100);
  showToast(`📄 ${type==='siswa'?'Soal Siswa':'Soal Guru'} ${selected.length} soal diunduh!`, 'success');
}

function showToast(msg,type='success'){
  const t=document.createElement('div'); t.className=`toast toast-${type}`; t.textContent=msg; document.body.appendChild(t); setTimeout(()=> t.remove(),3000);
}
