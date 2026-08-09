// modules/admin-pembelajaran/features/bank-soal.js
// =========================================
// BANK SOAL V3 HYBRID - Tab V1 + V2.1
// V1: Daftar Semua (simple list, manage cepat) + V2.1: Wadah Pintar (filter, keranjang, jumlah bebas, LOTS/MOTS/HOTS, export 2 bagian)
// FIX: Anti-Index (tanpa orderBy, sort client-side) - tidak perlu composite index
// Kasus: PAI Kelas 1 = 100 soal, guru butuh bebas (misal 25) -> filter -> acak/proporsional -> keranjang -> export siswa & guru
// Hanya yang tercentang yang terunduh, output bersih tanpa [PAIBD - ...]
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
  KELAS_LIST.forEach(k=>{ kelasOptions += `<option value="${k}">Kelas ${k}</option>`; });

  container.innerHTML = `
    <div class="bank-container">
      <div class="bank-header">
        <div>
          <h2 style="margin:0;">📚 Bank Soal V3 Hybrid - V1 Daftar + V2 Pintar</h2>
          <p style="margin:4px 0 0; opacity:.9; font-size:12px;">V1: Kelola semua soal cepat | V2: Wadah kecil saring → ambil seperlunya (jumlah bebas, LOTS/MOTS/HOTS adjustable). Hanya tercentang yang terunduh, bersih tanpa [PAIBD...]</p>
        </div>
        <div style="background:rgba(255,255,255,.2); padding:8px 12px; border-radius:8px; font-size:11px; min-width:130px;">
          <div>Total: <b id="stat-total">0</b> soal</div>
          <div>Terfilter: <b id="stat-filtered">0</b> soal</div>
          <div>Terpilih: <b id="stat-selected">0</b> soal</div>
          <div style="margin-top:4px; font-size:10px; opacity:.9;">Mode: <span id="stat-mode">Anti-Index OK</span></div>
        </div>
      </div>

      <div class="tabs">
        <button class="tab-btn active" data-tab="v1">📋 Tab V1 - Daftar Semua (Manage)</button>
        <button class="tab-btn" data-tab="v2">🧺 Tab V2 - Wadah Pintar (Saring & Ambil)</button>
      </div>

      <div id="tab-v1" class="tab-content active">
        <div class="bank-main">
          <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:12px; align-items:end;">
            <div class="form-group" style="flex:1; min-width:180px; margin:0;"><label>🔎 Cari V1</label><input type="text" id="v1-search" class="form-control" placeholder="Cari soal, topik, kunci..."></div>
            <div class="form-group" style="min-width:140px; margin:0;"><label>Mapel V1</label><select id="v1-mapel" class="form-control">${mapelOptions}</select></div>
            <div class="form-group" style="min-width:120px; margin:0;"><label>Kelas V1</label><select id="v1-kelas" class="form-control">${kelasOptions}</select></div>
            <button class="btn btn-primary" id="v1-btnFilter">Filter V1</button>
            <button class="btn btn-secondary" id="v1-btnReset">Reset</button>
          </div>
          <div id="v1-list" style="max-height:650px; overflow-y:auto;"></div>
          <div id="v1-pagination" class="pagination"></div>
        </div>
      </div>

      <div id="tab-v2" class="tab-content">
        <div class="bank-layout">
          <div class="bank-main">
            <div style="background:#f0fdf4; border:1px solid #a7f3d0; padding:12px; border-radius:10px; margin-bottom:12px;">
              <h4 style="margin:0 0 8px; color:#065f46; font-size:13px;">🔍 Filter Berlapis - Merampingkan (Fix Index Error)</h4>
              <div class="filter-grid">
                <div class="form-group"><label>📘 Mapel</label><select id="f-mapel" class="form-control">${mapelOptions}</select></div>
                <div class="form-group"><label>🎓 Kelas</label><select id="f-kelas" class="form-control">${kelasOptions}</select></div>
                <div class="form-group"><label>📝 Bentuk Soal</label>
                  <select id="f-bentuk" class="form-control">
                    <option value="">Semua Bentuk</option>
                    <option value="PG">PG</option>
                    <option value="Menjodohkan">Menjodohkan</option>
                    <option value="Isian">Isian</option>
                    <option value="Esai">Esai</option>
                    <option value="Campuran">Campuran</option>
                  </select>
                </div>
              </div>
              <div class="filter-grid">
                <div class="form-group"><label>📊 Level</label>
                  <select id="f-level" class="form-control">
                    <option value="">Semua Level</option>
                    <option value="LOTS">LOTS - Mudah</option>
                    <option value="MOTS">MOTS - Sedang</option>
                    <option value="HOTS">HOTS - Sulit</option>
                  </select>
                </div>
                <div class="form-group"><label>🏷️ Topik (otomatis)</label><select id="f-topik" class="form-control"><option value="">Semua Topik</option></select></div>
                <div class="form-group"><label>🔎 Cari Kata</label><input type="text" id="f-search" class="form-control" placeholder="wudhu, shalat..."></div>
              </div>
              <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:8px;">
                <button class="btn btn-primary" id="btnFilter">🔍 Terapkan Filter</button>
                <button class="btn btn-secondary" id="btnResetFilter">🔄 Reset</button>
                <button class="btn btn-secondary" id="btnSelectAllFiltered">☑️ Centang Semua Terfilter (<span id="count-filtered">0</span>)</button>
                <button class="btn btn-secondary" id="btnClearSelected">❌ Bersihkan Pilihan</button>
              </div>
            </div>
            <div id="list-soal" style="max-height:600px; overflow-y:auto; border:1px solid #d1fae5; border-radius:8px; padding:8px;">
              <div style="text-align:center; padding:40px; color:#6b7280;">Memuat bank soal...</div>
            </div>
          </div>

          <div class="bank-sidebar">
            <h4 style="margin:0 0 10px; color:#065f46;">🧺 Keranjang - Wadah Kecil</h4>
            <div style="background:#ecfdf5; border:1px solid #10b981; border-radius:8px; padding:10px; margin-bottom:12px;">
              <label style="font-size:11px; font-weight:700;">🎯 Jumlah yang Dibutuhkan (BEBAS - bukan fix 25)</label>
              <div style="display:flex; gap:6px; margin-top:6px;">
                <input type="number" id="input-jumlah-butuh" class="form-control" value="" placeholder="25, 30, 50 bebas" min="1" style="flex:1;">
                <button class="btn btn-primary" id="btnAmbilAcak">🎲 Acak</button>
              </div>
              <small style="font-size:9px; color:#065f46;">Contoh: PAI Kelas 1 ada 100, butuh 25 → isi 25 → Acak</small>
            </div>

            <div style="background:#fefce8; border:1px solid #facc15; border-radius:8px; padding:10px; margin-bottom:12px;">
              <label style="font-size:11px; font-weight:700;">📊 Komposisi LOTS/MOTS/HOTS (Bisa Diatur User)</label>
              <div class="level-bar">
                <div class="level-input"><span>LOTS</span><input type="number" id="input-lots" value="40" min="0" max="100">%</div>
                <div class="level-input"><span>MOTS</span><input type="number" id="input-mots" value="40" min="0" max="100">%</div>
                <div class="level-input"><span>HOTS</span><input type="number" id="input-hots" value="20" min="0" max="100">%</div>
              </div>
              <div style="display:flex; gap:6px; margin-top:8px;">
                <button class="btn btn-warning" id="btnAmbilProporsional" style="flex:1;">⚖️ Ambil Proporsional</button>
              </div>
              <small style="font-size:9px;">Isi jumlah + atur % (total 100%) → Proporsional</small>
            </div>

            <div style="margin-bottom:12px;">
              <div style="display:flex; justify-content:space-between; font-size:11px; font-weight:700; margin-bottom:6px;">
                <span>Terpilih: <span id="sidebar-count">0</span> soal</span>
                <span style="color:#059669;"><span id="sidebar-lots">0</span>L / <span id="sidebar-mots">0</span>M / <span id="sidebar-hots">0</span>H</span>
              </div>
              <div id="keranjang-list" style="max-height:180px; overflow-y:auto; border:1px dashed #a7f3d0; border-radius:6px; padding:4px; background:#f9fefb;">
                <div style="text-align:center; color:#9ca3af; font-size:11px; padding:10px;">Belum ada soal terpilih.</div>
              </div>
            </div>

            <div style="background:#f0fdf4; border:1px solid #a7f3d0; border-radius:8px; padding:10px;">
              <h5 style="margin:0 0 8px; font-size:11px;">📥 Hasil Unduhan - 2 Bagian (Hanya Tercentang)</h5>
              <p style="font-size:9px; color:#6b7280; margin:0 0 8px;">Hanya soal yang tercentang di keranjang yang terunduh, output bersih tanpa [PAIBD...]</p>
              <button class="btn btn-primary" id="btnExportSiswa" style="width:100%; margin-bottom:6px;">📄 1. Soal Siswa (Tanpa Kunci) - Bersih</button>
              <button class="btn btn-success" id="btnExportGuru" style="width:100%; margin-bottom:6px;">📄 2. Soal Guru (Dengan Kunci + Pembahasan)</button>
              <button class="btn btn-warning" id="btnExportBoth" style="width:100%;">📦 Export 2 File Sekaligus</button>
            </div>

            <div style="margin-top:10px; display:flex; gap:6px;">
              <button class="btn btn-danger" id="btnHapusTerpilih" style="flex:1; font-size:11px;">🗑️ Hapus Terpilih</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

async function loadBankSoal(container){
  try{
    const q = query(collection(db,'bankSoal'), where('userId','==', currentUser.uid));
    const snap = await getDocs(q);
    allSoal = [];
    const topikSet = new Set();
    snap.forEach(d=>{
      const data = { id: d.id, ...d.data() };
      allSoal.push(data);
      if(data.topik) topikSet.add(data.topik);
      if(data.subTopik) topikSet.add(data.subTopik);
    });
    allSoal.sort((a,b)=>{
      const ta = a.createdAt?.seconds || 0;
      const tb = b.createdAt?.seconds || 0;
      return tb - ta;
    });

    const fTopik = container.querySelector('#f-topik');
    if(fTopik){
      fTopik.innerHTML = '<option value="">Semua Topik</option>';
      Array.from(topikSet).sort().forEach(t=>{
        const opt = document.createElement('option');
        opt.value = t;
        opt.textContent = t.substring(0,50);
        fTopik.appendChild(opt);
      });
    }

    filteredSoal = [...allSoal];
    v1Page = 1;
    v1Filtered = [...allSoal];
    updateStats(container);
    renderV1List(container);
    renderList(container);
    showToast(`✅ ${allSoal.length} soal dimuat (V3 Hybrid Anti-Index)`, 'success');
  }catch(e){
    console.error(e);
    container.querySelector('#list-soal').innerHTML = `<div style="color:red; padding:20px;">❌ Gagal load: ${e.message}</div>`;
    container.querySelector('#v1-list').innerHTML = `<div style="color:red; padding:20px;">❌ Gagal load: ${e.message}</div>`;
    showToast('❌ Gagal load bank soal','error');
  }
}

function updateStats(container){
  const totalEl = container.querySelector('#stat-total');
  const filteredEl = container.querySelector('#stat-filtered');
  const selectedEl = container.querySelector('#stat-selected');
  const countFilteredEl = container.querySelector('#count-filtered');
  const sidebarCount = container.querySelector('#sidebar-count');
  if(totalEl) totalEl.textContent = allSoal.length;
  if(filteredEl) filteredEl.textContent = filteredSoal.length;
  if(selectedEl) selectedEl.textContent = selectedIds.size;
  if(countFilteredEl) countFilteredEl.textContent = filteredSoal.length;
  if(sidebarCount) sidebarCount.textContent = selectedIds.size;

  let lots=0,mots=0,hots=0;
  allSoal.filter(s=> selectedIds.has(s.id)).forEach(s=>{
    const lvl = (s.level_kognitif||'').toUpperCase();
    if(lvl==='LOTS') lots++; else if(lvl==='MOTS') mots++; else if(lvl==='HOTS') hots++;
    else if((s.tingkat||'').toLowerCase()==='mudah') lots++; else if((s.tingkat||'').toLowerCase()==='sedang') mots++; else if((s.tingkat||'').toLowerCase()==='sulit') hots++;
  });
  const elL = container.querySelector('#sidebar-lots');
  const elM = container.querySelector('#sidebar-mots');
  const elH = container.querySelector('#sidebar-hots');
  if(elL) elL.textContent = lots;
  if(elM) elM.textContent = mots;
  if(elH) elH.textContent = hots;
}

let v1Filtered = [];
function applyV1Filter(container){
  const search = container.querySelector('#v1-search').value.toLowerCase().trim();
  const mapel = container.querySelector('#v1-mapel').value;
  const kelas = container.querySelector('#v1-kelas').value;
  v1Filtered = allSoal.filter(s=>{
    if(mapel && s.mapelId !== mapel) return false;
    if(kelas && s.kelas !== kelas) return false;
    if(search){
      const hay = `${s.pertanyaan||''} ${s.topik||''} ${s.subTopik||''} ${s.kunci||''}`.toLowerCase();
      if(!hay.includes(search)) return false;
    }
    return true;
  });
  v1Page = 1;
  renderV1List(container);
}

function renderV1List(container){
  if(!v1Filtered.length && allSoal.length) v1Filtered = [...allSoal];
  const listEl = container.querySelector('#v1-list');
  const pagEl = container.querySelector('#v1-pagination');
  if(!listEl) return;
  const totalPages = Math.ceil(v1Filtered.length / V1_PER_PAGE);
  const start = (v1Page-1)*V1_PER_PAGE;
  const pageData = v1Filtered.slice(start, start+V1_PER_PAGE);

  if(!pageData.length){
    listEl.innerHTML = `<div style="text-align:center; padding:30px; color:#6b7280;">Tidak ada soal. Coba reset filter V1.</div>`;
    pagEl.innerHTML = '';
    return;
  }

  let html = '';
  pageData.forEach((s, idx)=>{
    const globalIdx = start + idx + 1;
    const levelClass = (s.level_kognitif==='HOTS'|| s.tingkat==='Sulit') ? 'badge-hots' : (s.level_kognitif==='MOTS'|| s.tingkat==='Sedang') ? 'badge-mots' : 'badge-lots';
    html += `
      <div class="soal-card-v1">
        <div style="display:flex; justify-content:space-between; gap:8px; flex-wrap:wrap; margin-bottom:6px;">
          <div style="display:flex; gap:6px; flex-wrap:wrap;">
            <span class="badge">${s.mapelId||'-'} | Kelas ${s.kelas||'-'}</span>
            <span class="badge">${s.jenis||s.bentukSoal||'PG'}</span>
            <span class="badge ${levelClass}">${s.level_kognitif||s.tingkat||'LOTS'}</span>
            <span class="badge" style="background:#fef3c7;">${(s.topik||'').substring(0,25)}</span>
          </div>
          <div style="display:flex; gap:4px;">
            <button class="btn-mini" style="background:#fee2e2; color:#991b1b;" data-v1-del="${s.id}">🗑️ Hapus</button>
            <button class="btn-mini" style="background:#ecfdf5; color:#065f46;" data-v1-add="${s.id}">➕ Ke Keranjang</button>
          </div>
        </div>
        <div style="font-size:13px; font-weight:600;">${globalIdx}. ${s.pertanyaan||''}</div>
        ${s.opsi && Array.isArray(s.opsi) && s.opsi.length ? `<div style="font-size:11px; color:#4b5563; margin-top:4px;">${s.opsi.map((o,i)=> `${String.fromCharCode(65+i)}. ${o}`).join(' | ')}</div>` : ''}
        <div style="font-size:10px; color:#6b7280; margin-top:4px;">Sub: ${s.subTopik||'-'} | Kunci: <b style="color:#059669;">${s.kunci||'-'}</b> | ${s.jenisAsesmen||''}</div>
      </div>
    `;
  });
  listEl.innerHTML = html;

  let pagHtml = '';
  for(let i=1;i<=totalPages;i++){
    pagHtml += `<button class="page-btn ${i===v1Page?'active':''}" data-page="${i}">${i}</button>`;
  }
  pagEl.innerHTML = pagHtml;
  pagEl.querySelectorAll('[data-page]').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      v1Page = parseInt(e.target.dataset.page);
      renderV1List(container);
    });
  });

  listEl.querySelectorAll('[data-v1-del]').forEach(btn=>{
    btn.addEventListener('click', async (e)=>{
      const id = e.target.dataset.v1Del;
      if(!confirm('Hapus soal ini permanen?')) return;
      try{
        await deleteDoc(doc(db,'bankSoal', id));
        allSoal = allSoal.filter(s=> s.id!==id);
        v1Filtered = v1Filtered.filter(s=> s.id!==id);
        filteredSoal = filteredSoal.filter(s=> s.id!==id);
        selectedIds.delete(id);
        updateStats(container);
        renderV1List(container);
        renderList(container);
        renderKeranjang(container);
        showToast('🗑️ Dihapus','success');
      }catch(err){ showToast('❌ '+err.message,'error'); }
    });
  });
  listEl.querySelectorAll('[data-v1-add]').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      const id = e.target.dataset.v1Add;
      selectedIds.add(id);
      updateStats(container);
      renderKeranjang(container);
      renderList(container);
      showToast('➕ Ditambah ke keranjang (Tab V2)','success');
    });
  });
}

function applyFilters(container){
  const mapel = container.querySelector('#f-mapel').value;
  const kelas = container.querySelector('#f-kelas').value;
  const bentuk = container.querySelector('#f-bentuk').value;
  const level = container.querySelector('#f-level').value;
  const topik = container.querySelector('#f-topik').value;
  const search = container.querySelector('#f-search').value.toLowerCase().trim();

  filteredSoal = allSoal.filter(s=>{
    if(mapel && s.mapelId !== mapel) return false;
    if(kelas && s.kelas !== kelas) return false;
    if(bentuk && !((s.jenis||'').toLowerCase().includes(bentuk.toLowerCase()) || (s.bentukSoal||'').toLowerCase().includes(bentuk.toLowerCase()))) return false;
    if(level && (s.level_kognitif||'').toUpperCase() !== level.toUpperCase() && (s.tingkat||'').toLowerCase() !== level.toLowerCase()) return false;
    if(topik && !((s.topik||'').includes(topik) || (s.subTopik||'').includes(topik))) return false;
    if(search){
      const hay = `${s.pertanyaan||''} ${s.topik||''} ${s.subTopik||''} ${s.kunci||''}`.toLowerCase();
      if(!hay.includes(search)) return false;
    }
    return true;
  });
  updateStats(container);
  renderList(container);
}

function renderList(container){
  const listEl = container.querySelector('#list-soal');
  if(!listEl) return;
  if(!filteredSoal.length){
    listEl.innerHTML = `<div style="text-align:center; padding:30px; color:#6b7280;">Tidak ada soal sesuai filter V2. Coba reset.</div>`;
    return;
  }
  let html = '';
  filteredSoal.forEach((s, idx)=>{
    const isSelected = selectedIds.has(s.id);
    const levelClass = (s.level_kognitif==='HOTS'|| s.tingkat==='Sulit') ? 'badge-hots' : (s.level_kognitif==='MOTS'|| s.tingkat==='Sedang') ? 'badge-mots' : 'badge-lots';
    html += `
      <div class="soal-item ${isSelected?'selected':''}" data-id="${s.id}">
        <input type="checkbox" ${isSelected?'checked':''} data-action="check" data-id="${s.id}">
        <div style="flex:1;">
          <div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:4px;">
            <span class="badge">${s.mapelId||'-'} | Kelas ${s.kelas||'-'}</span>
            <span class="badge">${s.jenis||s.bentukSoal||'PG'}</span>
            <span class="badge ${levelClass}">${s.level_kognitif||s.tingkat||'LOTS'}</span>
            <span class="badge" style="background:#fef3c7;">${(s.topik||'').substring(0,30)}</span>
          </div>
          <div style="font-size:12px; font-weight:600;">${idx+1}. ${s.pertanyaan||''}</div>
          <div style="font-size:10px; color:#6b7280; margin-top:2px;">Sub: ${s.subTopik||'-'} | Kunci: ${s.kunci||'-'}</div>
        </div>
      </div>
    `;
  });
  listEl.innerHTML = html;
  listEl.querySelectorAll('input[data-action="check"]').forEach(cb=>{
    cb.addEventListener('change', (e)=>{
      const id = e.target.dataset.id;
      if(e.target.checked) selectedIds.add(id);
      else selectedIds.delete(id);
      e.target.closest('.soal-item').classList.toggle('selected', e.target.checked);
      updateStats(container);
      renderKeranjang(container);
    });
  });
}

function renderKeranjang(container){
  const el = container.querySelector('#keranjang-list');
  if(!el) return;
  if(!selectedIds.size){
    el.innerHTML = `<div style="text-align:center; color:#9ca3af; font-size:11px; padding:10px;">Belum ada soal terpilih.</div>`;
    return;
  }
  const selected = allSoal.filter(s=> selectedIds.has(s.id));
  let html = '';
  selected.forEach((s,i)=>{
    html += `<div class="keranjang-item"><span>${i+1}. ${(s.pertanyaan||'').substring(0,35)}... [${s.level_kognitif||s.tingkat||''}]</span><button class="btn-mini" style="background:#fee2e2;" data-remove="${s.id}">✕</button></div>`;
  });
  el.innerHTML = html;
  el.querySelectorAll('[data-remove]').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      const id = e.target.dataset.remove;
      selectedIds.delete(id);
      updateStats(container);
      renderList(container);
      renderV1List(container);
      renderKeranjang(container);
    });
  });
}

function attachEvents(container){
  container.querySelectorAll('.tab-btn').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      const tab = e.target.dataset.tab;
      container.querySelectorAll('.tab-btn').forEach(b=> b.classList.remove('active'));
      e.target.classList.add('active');
      container.querySelectorAll('.tab-content').forEach(c=> c.classList.remove('active'));
      container.querySelector(`#tab-${tab}`).classList.add('active');
    });
  });

  container.querySelector('#v1-btnFilter').addEventListener('click', ()=> applyV1Filter(container));
  container.querySelector('#v1-search').addEventListener('keypress', (e)=>{ if(e.key==='Enter') applyV1Filter(container); });
  container.querySelector('#v1-btnReset').addEventListener('click', ()=>{
    container.querySelector('#v1-search').value='';
    container.querySelector('#v1-mapel').value='';
    container.querySelector('#v1-kelas').value='';
    v1Filtered = [...allSoal];
    v1Page = 1;
    renderV1List(container);
  });

  container.querySelector('#btnFilter').addEventListener('click', ()=> applyFilters(container));
  container.querySelector('#f-search').addEventListener('keypress', (e)=>{ if(e.key==='Enter') applyFilters(container); });
  container.querySelector('#btnResetFilter').addEventListener('click', ()=>{
    container.querySelector('#f-mapel').value='';
    container.querySelector('#f-kelas').value='';
    container.querySelector('#f-bentuk').value='';
    container.querySelector('#f-level').value='';
    container.querySelector('#f-topik').value='';
    container.querySelector('#f-search').value='';
    filteredSoal = [...allSoal];
    updateStats(container);
    renderList(container);
  });
  container.querySelector('#btnSelectAllFiltered').addEventListener('click', ()=>{
    filteredSoal.forEach(s=> selectedIds.add(s.id));
    updateStats(container);
    renderList(container);
    renderKeranjang(container);
    renderV1List(container);
  });
  container.querySelector('#btnClearSelected').addEventListener('click', ()=>{
    selectedIds.clear();
    updateStats(container);
    renderList(container);
    renderV1List(container);
    renderKeranjang(container);
  });

  container.querySelector('#btnAmbilAcak').addEventListener('click', ()=>{
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
      for(const id of selectedIds){ await deleteDoc(doc(db,'bankSoal', id)); }
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
