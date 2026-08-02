// modules/admin-pembelajaran/features/bank-soal.js
// =========================================
// FITUR: BANK SOAL V2 PINTAR - WADAH KECIL
// Revisi khusus: Filter berlapis, Keranjang, Jumlah Bebas, LOTS/MOTS/HOTS adjustable, Export 2 bagian
// - Kasus: PAI Kelas 1 ada 100 soal, butuh bebas (bukan fix 25)
// - Hanya yang tercentang yang terunduh
// - Hasil: 1. Soal Siswa (tanpa kunci) 2. Soal Guru (dengan kunci+ pembahasan)
// Terhubung: bankSoal (userId)
// =========================================

import { db } from '../../../js/firebase-config.js';
import { 
  collection, query, where, orderBy, getDocs, 
  doc, deleteDoc, writeBatch, getDoc
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
const CSS_ID = 'bank-soal-v2-css';
let allSoal = []; // semua soal dari Firestore
let filteredSoal = []; // hasil filter
let selectedIds = new Set(); // yang tercentang
let dataMapel = dataMapelMaster.length ? dataMapelMaster : FALLBACK_MAPEL;

const KELAS_LIST = ['1','2','3','4','5','6'];

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
    .bank-container { background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%); border-radius:16px; padding:24px; max-width:1400px; margin:0 auto; font-family:'Segoe UI',sans-serif; }
    .bank-header { background: linear-gradient(135deg, #059669 0%, #10b981 100%); color:#fff; padding:20px; border-radius:12px; margin-bottom:16px; display:flex; justify-content:space-between; flex-wrap:wrap; gap:10px; }
    .bank-layout { display:grid; grid-template-columns: 1fr 340px; gap:16px; }
    .bank-main { background:#fff; padding:16px; border-radius:12px; box-shadow:0 2px 8px rgba(0,0,0,.06); }
    .bank-sidebar { background:#fff; padding:16px; border-radius:12px; box-shadow:0 2px 8px rgba(0,0,0,.06); position:sticky; top:10px; max-height:90vh; overflow-y:auto; }
    .filter-grid { display:grid; grid-template-columns: 1fr 1fr 1fr; gap:10px; margin-bottom:12px; }
    .filter-grid-2 { display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom:12px; }
    .form-group { margin-bottom:8px; }
    .form-group label { display:block; font-weight:600; font-size:12px; color:#065f46; margin-bottom:4px; }
    .form-control { width:100%; padding:8px 10px; border:1.5px solid #a7f3d0; border-radius:8px; font-size:13px; box-sizing:border-box; }
    .soal-item { border:1px solid #d1fae5; border-radius:8px; padding:10px; margin-bottom:8px; display:flex; gap:10px; align-items:flex-start; }
    .soal-item.selected { background:#ecfdf5; border-color:#10b981; border-width:2px; }
    .soal-item input[type="checkbox"]{ margin-top:4px; width:18px; height:18px; }
    .badge { font-size:10px; padding:2px 6px; border-radius:10px; background:#d1fae5; color:#065f46; font-weight:600; }
    .badge-lots { background:#dcfce7; } .badge-mots { background:#fef3c7; } .badge-hots { background:#fee2e2; }
    .btn { padding:8px 14px; border:none; border-radius:8px; font-weight:600; cursor:pointer; font-size:12px; display:inline-flex; gap:6px; align-items:center; }
    .btn-primary { background:linear-gradient(135deg,#059669,#10b981); color:#fff; }
    .btn-success { background:linear-gradient(135deg,#10b981,#059669); color:#fff; }
    .btn-warning { background:linear-gradient(135deg,#f59e0b,#d97706); color:#fff; }
    .btn-secondary { background:#6b7280; color:#fff; }
    .btn-danger { background:#ef4444; color:#fff; }
    .btn-mini { padding:4px 8px; font-size:10px; border-radius:6px; border:none; cursor:pointer; }
    .keranjang-item { font-size:12px; padding:6px; border-bottom:1px dashed #a7f3d0; display:flex; justify-content:space-between; }
    .toast { position:fixed; top:20px; right:20px; padding:12px 20px; border-radius:10px; color:#fff; font-weight:600; z-index:10001; }
    .toast-success { background:#10b981; } .toast-error { background:#ef4444; } .toast-info { background:#3b82f6; }
    .level-bar { display:flex; gap:8px; margin-top:6px; }
    .level-input { display:flex; align-items:center; gap:4px; background:#f0fdf4; padding:6px 8px; border-radius:6px; border:1px solid #a7f3d0; }
    .level-input input { width:45px; border:none; background:transparent; font-weight:700; text-align:center; }
    @media(max-width:1024px){ .bank-layout{ grid-template-columns:1fr; } .filter-grid{ grid-template-columns:1fr 1fr; } }
    @media(max-width:600px){ .filter-grid, .filter-grid-2{ grid-template-columns:1fr; } }
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
          <h2 style="margin:0;">📚 Bank Soal V2 Pintar - Wadah Kecil</h2>
          <p style="margin:4px 0 0; opacity:.9; font-size:13px;">Kelola ribuan soal → saring → ambil seperlunya. Hanya yang tercentang yang terunduh.</p>
        </div>
        <div style="background:rgba(255,255,255,.2); padding:8px 12px; border-radius:8px; font-size:12px;">
          <div>Total: <b id="stat-total">0</b> soal</div>
          <div>Terfilter: <b id="stat-filtered">0</b> soal</div>
          <div>Terpilih: <b id="stat-selected">0</b> soal</div>
        </div>
      </div>

      <div class="bank-main">
        <div style="background:#f0fdf4; border:1px solid #a7f3d0; padding:12px; border-radius:10px; margin-bottom:12px;">
          <h4 style="margin:0 0 8px; color:#065f46;">🔍 Filter Berlapis - Merampingkan</h4>
          <div class="filter-grid">
            <div class="form-group"><label>📘 Mapel</label><select id="f-mapel" class="form-control">${mapelOptions}</select></div>
            <div class="form-group"><label>🎓 Kelas</label><select id="f-kelas" class="form-control">${kelasOptions}</select></div>
            <div class="form-group"><label>📝 Bentuk Soal</label>
              <select id="f-bentuk" class="form-control">
                <option value="">Semua Bentuk</option>
                <option value="PG">PG</option>
                <option value="PG Kompleks">PG Kompleks</option>
                <option value="Menjodohkan">Menjodohkan</option>
                <option value="Isian">Isian</option>
                <option value="Esai">Esai / Uraian</option>
                <option value="PG + Isian">PG+Isian</option>
                <option value="PG + Esai">PG+Esai</option>
                <option value="PG + Isian + Esai">Campuran</option>
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
            <div class="form-group"><label>🔎 Cari Kata</label><input type="text" id="f-search" class="form-control" placeholder="misal: wudhu, shalat..."></div>
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
          <label style="font-size:12px; font-weight:700;">🎯 Jumlah yang Dibutuhkan (Bebas)</label>
          <div style="display:flex; gap:6px; margin-top:6px;">
            <input type="number" id="input-jumlah-butuh" class="form-control" value="" placeholder="contoh: 25, 30, 50" min="1" style="flex:1;">
            <button class="btn btn-primary" id="btnAmbilAcak">🎲 Acak</button>
          </div>
          <small style="font-size:10px; color:#065f46;">Kosongkan untuk ambil manual. Isi angka lalu klik Acak untuk ambil acak dari yang terfilter.</small>
        </div>

        <div style="background:#fefce8; border:1px solid #facc15; border-radius:8px; padding:10px; margin-bottom:12px;">
          <label style="font-size:12px; font-weight:700;">📊 Komposisi LOTS/MOTS/HOTS (Bisa Diatur)</label>
          <div class="level-bar">
            <div class="level-input"><span style="font-size:10px;">LOTS</span><input type="number" id="input-lots" value="40" min="0" max="100">% </div>
            <div class="level-input"><span style="font-size:10px;">MOTS</span><input type="number" id="input-mots" value="40" min="0" max="100">% </div>
            <div class="level-input"><span style="font-size:10px;">HOTS</span><input type="number" id="input-hots" value="20" min="0" max="100">% </div>
          </div>
          <div style="display:flex; gap:6px; margin-top:8px;">
            <button class="btn btn-warning" id="btnAmbilProporsional" style="flex:1;">⚖️ Ambil Proporsional</button>
          </div>
          <small style="font-size:10px;">Contoh: butuh 30 soal dengan 40% LOTS, 40% MOTS, 20% HOTS → isi jumlah 30, atur %, klik Proporsional</small>
        </div>

        <div style="margin-bottom:12px;">
          <div style="display:flex; justify-content:space-between; font-size:12px; font-weight:700; margin-bottom:6px;">
            <span>Terpilih: <span id="sidebar-count">0</span> soal</span>
            <span style="color:#059669;"><span id="sidebar-lots">0</span> L / <span id="sidebar-mots">0</span> M / <span id="sidebar-hots">0</span> H</span>
          </div>
          <div id="keranjang-list" style="max-height:200px; overflow-y:auto; border:1px dashed #a7f3d0; border-radius:6px; padding:4px; background:#f9fefb;">
            <div style="text-align:center; color:#9ca3af; font-size:11px; padding:10px;">Belum ada soal terpilih. Centang soal di kiri.</div>
          </div>
        </div>

        <div style="background:#f0fdf4; border:1px solid #a7f3d0; border-radius:8px; padding:10px;">
          <h5 style="margin:0 0 8px; font-size:12px;">📥 Hasil Unduhan - 2 Bagian</h5>
          <p style="font-size:10px; color:#6b7280; margin:0 0 8px;">Hanya soal yang <b>tercentang di keranjang</b> yang akan terunduh.</p>
          <button class="btn btn-primary" id="btnExportSiswa" style="width:100%; margin-bottom:6px;">📄 1. Soal Siswa (Tanpa Kunci) - Bersih</button>
          <button class="btn btn-success" id="btnExportGuru" style="width:100%; margin-bottom:6px;">📄 2. Soal Guru (Dengan Kunci + Pembahasan)</button>
          <button class="btn btn-warning" id="btnExportBoth" style="width:100%;">📦 Export 2 File Sekaligus (Siswa + Guru)</button>
        </div>

        <div style="margin-top:10px; display:flex; gap:6px;">
          <button class="btn btn-danger" id="btnHapusTerpilih" style="flex:1; font-size:11px;">🗑️ Hapus Terpilih</button>
        </div>
      </div>
    </div>
  `;
}

async function loadBankSoal(container){
  try{
    const q = query(collection(db,'bankSoal'), where('userId','==', currentUser.uid), orderBy('createdAt','desc'));
    const snap = await getDocs(q);
    allSoal = [];
    const topikSet = new Set();
    snap.forEach(d=>{
      const data = { id: d.id, ...d.data() };
      allSoal.push(data);
      if(data.topik) topikSet.add(data.topik);
      if(data.subTopik) topikSet.add(data.subTopik);
    });
    // isi dropdown topik
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
    updateStats(container);
    renderList(container);
    showToast(`✅ ${allSoal.length} soal dimuat dari bankSoal`, 'success');
  }catch(e){
    console.error(e);
    container.querySelector('#list-soal').innerHTML = `<div style="color:red; padding:20px;">❌ Gagal load: ${e.message}. Cek Rules bankSoal.</div>`;
    showToast('❌ Gagal load bank soal','error');
  }
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

  // LOTS/MOTS/HOTS count di keranjang
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

function renderList(container){
  const listEl = container.querySelector('#list-soal');
  if(!listEl) return;
  if(!filteredSoal.length){
    listEl.innerHTML = `<div style="text-align:center; padding:30px; color:#6b7280;">Tidak ada soal sesuai filter. Coba reset filter.</div>`;
    return;
  }
  let html = '';
  filteredSoal.forEach((s, idx)=>{
    const isSelected = selectedIds.has(s.id);
    const levelClass = (s.level_kognitif==='HOTS'|| s.tingkat==='Sulit') ? 'badge-hots' : (s.level_kognitif==='MOTS'|| s.tingkat==='Sedang') ? 'badge-mots' : 'badge-lots';
    const levelLabel = s.level_kognitif || s.tingkat || 'LOTS';
    html += `
      <div class="soal-item ${isSelected?'selected':''}" data-id="${s.id}">
        <input type="checkbox" ${isSelected?'checked':''} data-action="check" data-id="${s.id}">
        <div style="flex:1;">
          <div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:4px;">
            <span class="badge">${s.mapelId||'-'} | Kelas ${s.kelas||'-'}</span>
            <span class="badge">${s.jenis||s.bentukSoal||'PG'}</span>
            <span class="badge ${levelClass}">${levelLabel}</span>
            <span class="badge" style="background:#fef3c7;">${(s.topik||'').substring(0,30)}</span>
            ${s.jenisAsesmen ? `<span class="badge" style="background:#e0e7ff;">${s.jenisAsesmen}</span>` : ''}
          </div>
          <div style="font-size:13px; font-weight:600;">${idx+1}. ${s.pertanyaan||''}</div>
          ${s.opsi && Array.isArray(s.opsi) && s.opsi.length ? `<div style="font-size:11px; color:#4b5563; margin-left:10px; margin-top:4px;">${s.opsi.map((o,i)=> `${String.fromCharCode(65+i)}. ${o}`).join(' | ')}</div>` : ''}
          <div style="font-size:10px; color:#6b7280; margin-top:2px;">Sub: ${s.subTopik||'-'} | Kunci: ${s.kunci||'-'}</div>
        </div>
      </div>
    `;
  });
  listEl.innerHTML = html;

  // attach checkbox events
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
    el.innerHTML = `<div style="text-align:center; color:#9ca3af; font-size:11px; padding:10px;">Belum ada soal terpilih. Centang soal di kiri.</div>`;
    return;
  }
  const selected = allSoal.filter(s=> selectedIds.has(s.id));
  let html = '';
  selected.forEach((s,i)=>{
    html += `<div class="keranjang-item"><span>${i+1}. ${(s.pertanyaan||'').substring(0,40)}... [${s.level_kognitif||s.tingkat||''}]</span><button class="btn-mini" style="background:#fee2e2;" data-remove="${s.id}">✕</button></div>`;
  });
  el.innerHTML = html;
  el.querySelectorAll('[data-remove]').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      const id = e.target.dataset.remove;
      selectedIds.delete(id);
      updateStats(container);
      renderList(container);
      renderKeranjang(container);
    });
  });
}

function attachEvents(container){
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
    showToast(`✅ ${filteredSoal.length} soal terfilter dicentang`, 'success');
  });

  container.querySelector('#btnClearSelected').addEventListener('click', ()=>{
    selectedIds.clear();
    updateStats(container);
    renderList(container);
    renderKeranjang(container);
  });

  // Jumlah Bebas - Acak
  container.querySelector('#btnAmbilAcak').addEventListener('click', ()=>{
    const jumlahInput = container.querySelector('#input-jumlah-butuh').value;
    let jumlah = parseInt(jumlahInput);
    if(!jumlah || jumlah <=0){
      showToast('Isi jumlah yang dibutuhkan dulu! Misal 25','error');
      return;
    }
    if(jumlah > filteredSoal.length){
      showToast(`Jumlah melebihi yang terfilter (${filteredSoal.length}). Ambil semua terfilter.`, 'info');
      jumlah = filteredSoal.length;
    }
    // acak
    const shuffled = [...filteredSoal].sort(()=> 0.5 - Math.random());
    const picked = shuffled.slice(0, jumlah);
    selectedIds.clear();
    picked.forEach(s=> selectedIds.add(s.id));
    updateStats(container);
    renderList(container);
    renderKeranjang(container);
    showToast(`🎲 ${jumlah} soal acak diambil dari ${filteredSoal.length} terfilter`, 'success');
  });

  // Proporsional LOTS/MOTS/HOTS
  container.querySelector('#btnAmbilProporsional').addEventListener('click', ()=>{
    const jumlahInput = container.querySelector('#input-jumlah-butuh').value;
    let jumlah = parseInt(jumlahInput);
    if(!jumlah || jumlah <=0){
      showToast('Isi jumlah yang dibutuhkan dulu!','error');
      return;
    }
    let pLots = parseInt(container.querySelector('#input-lots').value)||0;
    let pMots = parseInt(container.querySelector('#input-mots').value)||0;
    let pHots = parseInt(container.querySelector('#input-hots').value)||0;
    const totalP = pLots + pMots + pHots;
    if(totalP !== 100){
      showToast(`Total % harus 100%. Sekarang ${totalP}%`,'error');
      return;
    }
    const needLots = Math.round(jumlah * pLots / 100);
    const needMots = Math.round(jumlah * pMots / 100);
    const needHots = jumlah - needLots - needMots; // sisa

    const poolLots = filteredSoal.filter(s=> (s.level_kognitif==='LOTS' || s.tingkat==='Mudah'));
    const poolMots = filteredSoal.filter(s=> (s.level_kognitif==='MOTS' || s.tingkat==='Sedang'));
    const poolHots = filteredSoal.filter(s=> (s.level_kognitif==='HOTS' || s.tingkat==='Sulit'));

    const pick = (pool, need) => {
      const sh = [...pool].sort(()=>0.5-Math.random());
      return sh.slice(0, Math.min(need, pool.length));
    };

    const pickedLots = pick(poolLots, needLots);
    const pickedMots = pick(poolMots, needMots);
    const pickedHots = pick(poolHots, needHots);

    let allPicked = [...pickedLots, ...pickedMots, ...pickedHots];
    // jika kurang karena pool tidak cukup, tambal dari sisa
    if(allPicked.length < jumlah){
      const remaining = filteredSoal.filter(s=> !allPicked.find(p=>p.id===s.id));
      const needMore = jumlah - allPicked.length;
      allPicked = [...allPicked, ...remaining.slice(0, needMore)];
    }

    selectedIds.clear();
    allPicked.forEach(s=> selectedIds.add(s.id));
    updateStats(container);
    renderList(container);
    renderKeranjang(container);
    showToast(`⚖️ ${allPicked.length} soal diambil: ${pickedLots.length} LOTS, ${pickedMots.length} MOTS, ${pickedHots.length} HOTS`, 'success');
  });

  // Export Siswa (tanpa kunci) - BERSIH
  container.querySelector('#btnExportSiswa').addEventListener('click', ()=> exportWord(container, 'siswa'));
  container.querySelector('#btnExportGuru').addEventListener('click', ()=> exportWord(container, 'guru'));
  container.querySelector('#btnExportBoth').addEventListener('click', ()=>{
    exportWord(container, 'siswa');
    setTimeout(()=> exportWord(container, 'guru'), 800);
  });

  container.querySelector('#btnHapusTerpilih').addEventListener('click', async ()=>{
    if(!selectedIds.size){ showToast('Tidak ada yang dipilih','error'); return; }
    if(!confirm(`Hapus ${selectedIds.size} soal terpilih permanen?`)) return;
    try{
      const batch = [];
      for(const id of selectedIds){
        await deleteDoc(doc(db,'bankSoal', id));
      }
      allSoal = allSoal.filter(s=> !selectedIds.has(s.id));
      filteredSoal = filteredSoal.filter(s=> !selectedIds.has(s.id));
      selectedIds.clear();
      updateStats(container);
      renderList(container);
      renderKeranjang(container);
      showToast('🗑️ Soal terpilih dihapus','success');
    }catch(e){
      showToast('❌ Gagal hapus: '+e.message,'error');
    }
  });
}

function exportWord(container, type){
  if(!selectedIds.size){
    showToast('Centang dulu soal yang mau diunduh!','error');
    return;
  }
  const selected = allSoal.filter(s=> selectedIds.has(s.id));
  if(!selected.length){ showToast('Tidak ada soal terpilih','error'); return; }

  // Ambil info umum dari soal pertama untuk header
  const first = selected[0];
  const mapelNama = dataMapel.find(m=>m.id===first.mapelId)?.nama || first.mapelId || 'Soal';
  const kelas = first.kelas || '-';

  let html = `
    <html><head><meta charset="utf-8"><title>${type==='siswa'?'Soal Siswa':'Soal Guru'} - ${mapelNama}</title>
    <style>
      body{font-family:'Times New Roman',serif; margin:2cm; font-size:12pt; line-height:1.5;}
      h1{text-align:center; font-size:14pt; margin-bottom:4px;}
      .kop{ text-align:center; border-bottom:2px solid #000; padding-bottom:10px; margin-bottom:20px; }
      .soal{margin-bottom:14px;}
      .opsi{margin-left:20px; margin-top:4px;}
      .kunci{margin-top:20px; border-top:1px solid #000; padding-top:10px;}
    </style>
    </head><body>
    <div class="kop">
      <h1>${type==='siswa' ? 'SOAL EVALUASI' : 'SOAL + KUNCI JAWABAN GURU'}<br>${mapelNama.toUpperCase()} - KELAS ${kelas}</h1>
      <p style="font-size:10pt;">${type==='siswa' ? 'Lembar Soal Peserta Didik - Tanpa Kunci' : 'Pegangan Guru - Dengan Kunci & Pembahasan'}</p>
    </div>
    <p>Tanggal: ${new Date().toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'})} | Jumlah: ${selected.length} soal | LOTS: ${selected.filter(s=> (s.level_kognitif==='LOTS'||s.tingkat==='Mudah')).length} | MOTS: ${selected.filter(s=> (s.level_kognitif==='MOTS'||s.tingkat==='Sedang')).length} | HOTS: ${selected.filter(s=> (s.level_kognitif==='HOTS'||s.tingkat==='Sulit')).length}</p>
    <hr>
  `;

  selected.forEach((s,i)=>{
    // OUTPUT BERSIH TANPA [PAIBD - ...] (TP: ...)
    let opsiBlock = '';
    if(s.opsi && Array.isArray(s.opsi) && s.opsi.length){
      opsiBlock = `<div class="opsi">${s.opsi.map((o,idx)=> `${String.fromCharCode(65+idx)}. ${o}<br>`).join('')}</div>`;
    } else if(s.opsi && typeof s.opsi === 'object' && s.opsi.kiri){
      opsiBlock = `<div style="display:flex; gap:40px; margin-left:20px;"><div>${s.opsi.kiri.map((k,idx)=>`${idx+1}. ${k}<br>`).join('')}</div><div>${s.opsi.kanan.map((k,idx)=>`${String.fromCharCode(65+idx)}. ${k}<br>`).join('')}</div></div>`;
    }
    html+=`<div class="soal"><p><b>${i+1}.</b> ${s.pertanyaan||''}</p>${opsiBlock}</div>`;

    if(type==='guru'){
      html+=`<div style="margin-left:20px; font-size:11pt; background:#f9fafb; padding:6px; border-left:3px solid #10b981; margin-bottom:12px;"><b>Kunci:</b> ${s.kunci||'-'}<br><b>Pembahasan:</b> ${s.pembahasan||'-'}</div>`;
    }
  });

  if(type==='siswa'){
    // Soal siswa tanpa kunci, tambah lembar jawab kosong
    html+=`<div style="page-break-before:always;"></div><h3>LEMBAR JAWAB SISWA</h3><p>Nama: .................... Kelas: ............</p><table border="1" cellpadding="6" cellspacing="0" style="width:100%; border-collapse:collapse;"><tr><th>No</th><th>Jawaban</th></tr>${selected.map((_,i)=> `<tr><td>${i+1}</td><td style="height:20px;"></td></tr>`).join('')}</table>`;
  } else {
    // Untuk guru, tambah rekap kunci di akhir
    html+=`<div style="page-break-before:always;"></div><div class="kunci"><h3>REKAP KUNCI JAWABAN</h3>${selected.map((s,i)=> `<p>${i+1}. <b>${s.kunci||'-'}</b> - ${s.topik||''} (${s.level_kognitif||s.tingkat||''})</p>`).join('')}</div>`;
  }

  html+=`</body></html>`;

  const blob = new Blob(['\ufeff', html], {type:'application/msword'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href=url;
  const fileName = type==='siswa' ? `Soal-SISWA-${mapelNama}-Kelas${kelas}-${selected.length}soal-${new Date().toISOString().slice(0,10)}.doc` : `Soal-GURU-Kunci-${mapelNama}-Kelas${kelas}-${selected.length}soal-${new Date().toISOString().slice(0,10)}.doc`;
  a.download=fileName;
  document.body.appendChild(a); a.click();
  setTimeout(()=>{ document.body.removeChild(a); URL.revokeObjectURL(url); },100);
  showToast(`📄 ${type==='siswa'?'Soal Siswa (tanpa kunci)':'Soal Guru (dengan kunci)'} ${selected.length} soal berhasil diunduh!`, 'success');
}

function showToast(msg,type='success'){
  const t=document.createElement('div'); t.className=`toast toast-${type}`; t.textContent=msg; document.body.appendChild(t); setTimeout(()=> t.remove(),3000);
}
