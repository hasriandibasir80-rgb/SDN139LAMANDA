// modules/admin-pembelajaran/features/pembuat-soal.js
// =========================================
// FITUR: PEMBUAT SOAL PRESISI - V4
// Terhubung: kisi-kisi.topik_list (dinamis) + data-mapel.js + bankSoal
// =========================================

import { db } from '../../../js/firebase-config.js';
import { 
  collection, addDoc, query, where, orderBy, 
  onSnapshot, doc, serverTimestamp, getDocs, getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let dataMapelMaster = [];
try {
  const mod = await import('../../../js/config/data-mapel.js');
  dataMapelMaster = mod.dataMapel || mod.default || [];
} catch(e){}
const FALLBACK_MAPEL = [
  { id: 'paibd', nama: 'PAIBD', singkatan: 'PAIBD', icon: '🕌' },
  { id: 'matematika', nama: 'Matematika', singkatan: 'MTK', icon: '🔢' },
  { id: 'ipas', nama: 'IPAS', singkatan: 'IPAS', icon: '🔬' },
  { id: 'bahasa-indonesia', nama: 'Bahasa Indonesia', singkatan: 'BIN', icon: '📖' },
];

const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';
let groqApiKey = null;
const CSS_ID = 'pembuat-soal-css';
let dataMapel = dataMapelMaster.length ? dataMapelMaster : FALLBACK_MAPEL;
let topikCounter = 0;
let kisiListCache = [];

const KELAS_FASE = [
  { id: '1|A', label: 'Kelas 1 / Fase A', kelas: '1', fase: 'A' },
  { id: '2|A', label: 'Kelas 2 / Fase A', kelas: '2', fase: 'A' },
  { id: '3|B', label: 'Kelas 3 / Fase B', kelas: '3', fase: 'B' },
  { id: '4|B', label: 'Kelas 4 / Fase B', kelas: '4', fase: 'B' },
  { id: '5|C', label: 'Kelas 5 / Fase C', kelas: '5', fase: 'C' },
  { id: '6|C', label: 'Kelas 6 / Fase C', kelas: '6', fase: 'C' },
];

export async function init(container) {
  loadCSS();
  await loadGroqApiKey();
  await loadMataPelajaran();
  renderUI(container);
  attachEvents(container);
  loadKisiKisiDropdown(container);
  setTimeout(() => addTopik(container), 100);
}

export function cleanup() {
  const css = document.getElementById(CSS_ID);
  if (css) css.remove();
}

async function loadGroqApiKey() {
  try {
    const docRef = doc(db, 'settings', 'api_key');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      if (data.keys) {
        const active = Object.values(data.keys).filter(k => k.active);
        if (active.length) groqApiKey = active[0].value;
      }
    }
  } catch(e){ console.error(e); }
}
async function loadMataPelajaran(){
  if(dataMapelMaster.length){ dataMapel = dataMapelMaster; return; }
  dataMapel = FALLBACK_MAPEL;
}

function loadCSS(){
  if(document.getElementById(CSS_ID)) return;
  const s = document.createElement('style');
  s.id = CSS_ID;
  s.textContent = `
    .soal-container { background: linear-gradient(135deg, #dbeafe 0%, #e0e7ff 100%); border-radius:16px; padding:24px; max-width:1200px; margin:0 auto; font-family:'Segoe UI',sans-serif; }
    .soal-header { background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%); color:#fff; padding:24px; border-radius:12px; margin-bottom:20px; }
    .soal-section { background:#fff; padding:20px; border-radius:12px; margin-bottom:16px; box-shadow:0 2px 8px rgba(0,0,0,.06); }
    .soal-section-title { font-weight:700; color:#1e40af; border-bottom:3px solid #dbeafe; padding-bottom:8px; margin-bottom:12px; }
    .form-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
    .form-group { margin-bottom:12px; }
    .form-group label { display:block; font-weight:600; font-size:13px; color:#1e3a8a; margin-bottom:6px; }
    .form-control { width:100%; padding:10px 12px; border:2px solid #bfdbfe; border-radius:8px; font-size:14px; box-sizing:border-box; }
    .form-control:focus { outline:none; border-color:#2563eb; box-shadow:0 0 0 3px rgba(37,99,235,.15); }
    .topik-card { background:#eff6ff; border:2px dashed #93c5fd; border-radius:10px; padding:14px; margin-bottom:12px; }
    .sub-list { display:flex; flex-direction:column; gap:6px; margin-top:8px; }
    .sub-item { display:flex; gap:6px; }
    .btn { padding:10px 18px; border:none; border-radius:8px; font-weight:600; cursor:pointer; color:#fff; display:inline-flex; gap:6px; align-items:center; }
    .btn-primary { background:linear-gradient(135deg, #2563eb, #7c3aed); } .btn-success { background:linear-gradient(135deg,#10b981,#059669); }
    .btn-warning { background:linear-gradient(135deg,#f59e0b,#d97706); } .btn-secondary { background:#6b7280; }
    .btn-mini { padding:5px 9px; font-size:11px; border:none; border-radius:6px; cursor:pointer; }
    .soal-card { background:#fff; border:1px solid #dbeafe; border-radius:10px; padding:14px; margin-bottom:10px; }
    .soal-card.correct { border-left:4px solid #10b981; }
    .badge { font-size:11px; padding:3px 8px; border-radius:12px; background:#dbeafe; color:#1e40af; font-weight:600; }
    .toast { position:fixed; top:20px; right:20px; padding:12px 20px; border-radius:10px; color:#fff; font-weight:600; z-index:10001; }
    .toast-success { background:#10b981; } .toast-error { background:#ef4444; }
    @media(max-width:768px){ .form-grid{ grid-template-columns:1fr; } }
  `;
  document.head.appendChild(s);
}

function renderUI(container){
  const aiReady = groqApiKey ? '✅ AI Siap' : '⚠️ API Key Belum Aktif';
  let mapelOptions = '<option value="">-- Pilih Mapel --</option>';
  dataMapel.forEach(m => { mapelOptions += `<option value="${m.id}">${m.icon||'📘'} ${m.nama}</option>`; });
  let kelasOptions = '<option value="">-- Kelas / Fase --</option>';
  KELAS_FASE.forEach(k => { kelasOptions += `<option value="${k.id}">${k.label}</option>`; });

  container.innerHTML = `
    <div class="soal-container">
      <div class="soal-header">
        <h2 style="margin:0;">✍️ Pembuat Soal Presisi</h2>
        <p style="margin:6px 0 0; opacity:.9;">Terhubung Kisi-Kisi Dinamis + Bank Soal • ${dataMapel.length} Mapel • <span>${aiReady}</span></p>
      </div>

      <div class="soal-section">
        <h3 class="soal-section-title">1. Sumber Kisi-Kisi (Presisi)</h3>
        <div class="form-group">
          <label>📚 Pilih Kisi-Kisi Tersimpan (Otomatis isi Topik)</label>
          <select id="soal-kisi-select" class="form-control">
            <option value="">-- Buat Manual / Pilih Kisi-Kisi --</option>
          </select>
          <small style="color:#64748b;">Jika pilih Kisi-Kisi, Topik & Sub Topik otomatis terisi dari kisi_kisi.topik_list</small>
        </div>
        <div id="kisi-info" style="display:none; background:#f0f9ff; border:1px solid #bae6fd; padding:10px; border-radius:8px; font-size:12px; margin-top:8px;"></div>
      </div>

      <div class="soal-section">
        <h3 class="soal-section-title">2. Informasi Soal</h3>
        <div class="form-grid">
          <div class="form-group"><label>📘 Mapel</label><select id="soal-mapel" class="form-control">${mapelOptions}</select></div>
          <div class="form-group"><label>🎓 Kelas / Fase</label><select id="soal-kelas" class="form-control">${kelasOptions}</select></div>
        </div>
        <div class="form-grid">
          <div class="form-group"><label>📝 Bentuk Soal</label>
            <select id="soal-bentuk" class="form-control">
              <option value="Pilihan Ganda">Pilihan Ganda</option>
              <option value="Isian Singkat">Isian Singkat</option>
              <option value="Esai">Esai/Uraian</option>
              <option value="Pilihan Ganda + Esai">PG + Esai</option>
              <option value="Campuran">Campuran LOTS-MOTS-HOTS</option>
            </select>
          </div>
          <div class="form-group"><label>🔢 Jumlah Soal</label><input type="number" id="soal-jumlah" class="form-control" value="10" min="1" max="30"></div>
        </div>
        <div class="form-group"><label>📊 Distribusi Level</label>
          <div style="display:flex; gap:10px;">
            <label><input type="number" id="lots" value="40" style="width:60px;">% LOTS</label>
            <label><input type="number" id="mots" value="40" style="width:60px;">% MOTS</label>
            <label><input type="number" id="hots" value="20" style="width:60px;">% HOTS</label>
          </div>
        </div>
      </div>

      <div class="soal-section">
        <h3 class="soal-section-title">3. Topik & Sub Topik (Dinamis - Sama seperti Kisi-Kisi)</h3>
        <div id="soal-topik-container"></div>
        <button type="button" id="btnTambahTopikSoal" class="btn btn-secondary" style="margin-top:8px; width:100%;">➕ Tambah Topik</button>
      </div>

      <div class="soal-section">
        <h3 class="soal-section-title">4. TP / Indikator</h3>
        <textarea id="soal-tp" class="form-control" rows="4" placeholder="Paste TP dari Kisi-Kisi atau tulis manual..."></textarea>
        <div style="margin-top:12px; display:flex; gap:8px; flex-wrap:wrap;">
          <button class="btn btn-primary" id="btnGenerateSoal">🤖 Generate Soal Presisi dengan AI</button>
          <button class="btn btn-success" id="btnSimpanBank">💾 Simpan ke Bank Soal</button>
          <button class="btn btn-warning" id="btnExportWord">📄 Export Word</button>
          <button class="btn btn-secondary" id="btnResetSoal">🔄 Reset</button>
        </div>
      </div>

      <div class="soal-section" id="preview-section" style="display:none;">
        <h3 class="soal-section-title">👁️ Preview Soal (Editable)</h3>
        <div id="preview-content"></div>
      </div>
    </div>
  `;
}

function addTopik(container, data = { tema:'', subTemas:[''] }){
  topikCounter++;
  const id = topikCounter;
  const wrap = container.querySelector('#soal-topik-container');
  if(!wrap) return;
  const div = document.createElement('div');
  div.className = 'topik-card';
  div.dataset.id = id;
  div.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
      <b>📂 Topik ${id}</b>
      <button class="btn-mini" style="background:#fee2e2; color:#991b1b;" data-action="hapusTopik">🗑️ Hapus</button>
    </div>
    <input type="text" class="form-control input-tema" placeholder="Contoh: Aku Cinta Al-Quran" value="${data.tema||''}">
    <div style="margin-top:8px; font-size:12px; font-weight:600;">Sub Topik / Materi:</div>
    <div class="sub-list"></div>
    <button class="btn-mini" style="background:#dcfce7; color:#166534; margin-top:6px;" data-action="tambahSub">➕ Tambah Sub</button>
  `;
  wrap.appendChild(div);
  const subList = div.querySelector('.sub-list');
  (data.subTemas?.length ? data.subTemas : ['']).forEach(s => addSub(subList, s));
  div.querySelector('[data-action="hapusTopik"]').addEventListener('click', ()=>{
    if(wrap.children.length<=1){ showToast('Minimal 1 topik','error'); return; }
    div.remove();
  });
  div.querySelector('[data-action="tambahSub"]').addEventListener('click', ()=> addSub(subList,''));
}
function addSub(listEl, value=''){
  const item = document.createElement('div');
  item.className = 'sub-item';
  item.innerHTML = `<input type="text" class="form-control input-sub" placeholder="Sub materi..." value="${value}" style="flex:1;"><button class="btn-mini" style="background:#fee2e2;">✕</button>`;
  listEl.appendChild(item);
  item.querySelector('button').addEventListener('click', ()=>{
    if(listEl.children.length<=1){ item.querySelector('input').value=''; } else item.remove();
  });
}
function getTopikData(container){
  const cards = container.querySelectorAll('.topik-card');
  const res=[];
  cards.forEach(c=>{
    const tema = c.querySelector('.input-tema')?.value.trim()||'';
    const subs = Array.from(c.querySelectorAll('.input-sub')).map(i=>i.value.trim()).filter(Boolean);
    if(tema||subs.length) res.push({ tema, subTemas: subs });
  });
  return res;
}

async function loadKisiKisiDropdown(container){
  try{
    const q = query(collection(db,'kisi_kisi'), where('userId','==', currentUser.uid));
    const snap = await getDocs(q);
    const select = container.querySelector('#soal-kisi-select');
    kisiListCache = [];
    snap.forEach(d=>{
      const data = d.data();
      kisiListCache.push({ id:d.id, ...data });
      const info = data.informasi||{};
      const label = `${info.mapelId||info.mapel||'-'} | Kelas ${info.kelas||'-'} | ${info.tema|| info.topik?.slice(0,30) || '-'} (${info.topik_list?.length||1} topik)`;
      const opt = document.createElement('option');
      opt.value = d.id;
      opt.textContent = label;
      select.appendChild(opt);
    });
  }catch(e){ console.error(e); }
}

function attachEvents(container){
  container.querySelector('#btnTambahTopikSoal').addEventListener('click', ()=> addTopik(container));
  container.querySelector('#soal-kisi-select').addEventListener('change', (e)=>{
    const id = e.target.value;
    if(!id){
      container.querySelector('#kisi-info').style.display='none';
      return;
    }
    const kisi = kisiListCache.find(k=>k.id===id);
    if(!kisi) return;
    const info = kisi.informasi||{};
    // Auto set mapel & kelas
    if(info.mapelId) container.querySelector('#soal-mapel').value = info.mapelId;
    else if(info.mapel) {
      const found = dataMapel.find(m=>m.nama.toLowerCase().includes(info.mapel.toLowerCase()) || m.id===info.mapel.toLowerCase());
      if(found) container.querySelector('#soal-mapel').value = found.id;
    }
    if(info.kelas && info.fase) container.querySelector('#soal-kelas').value = `${info.kelas}|${info.fase}`;
    if(info.tujuan_pembelajaran) container.querySelector('#soal-tp').value = info.tujuan_pembelajaran;
    if(info.jumlah_soal) container.querySelector('#soal-jumlah').value = info.jumlah_soal;
    if(info.bentuk_soal) container.querySelector('#soal-bentuk').value = info.bentuk_soal;

    // Isi topik_list
    const wrap = container.querySelector('#soal-topik-container');
    wrap.innerHTML=''; topikCounter=0;
    const list = info.topik_list && info.topik_list.length ? info.topik_list : [{ tema: info.tema||info.topik||'', subTemas: [info.sub_tema||''] }];
    list.forEach(t=> addTopik(container, t));

    // Info box
    const infoBox = container.querySelector('#kisi-info');
    infoBox.style.display='block';
    infoBox.innerHTML = `<b>✅ Kisi-Kisi Terhubung:</b> ${info.topik_list?.length||1} Topik, ${kisi.kisi_kisi?.length||0} indikator. TP otomatis terisi.`;

    // Preview kisi di console
    console.log('Kisi terpilih:', kisi);
    showToast('✅ Kisi-Kisi dimuat, topik presisi terisi!');
  });

  container.querySelector('#btnGenerateSoal').addEventListener('click', ()=> handleGenerate(container));
  container.querySelector('#btnSimpanBank').addEventListener('click', ()=> handleSimpanBank(container));
  container.querySelector('#btnExportWord').addEventListener('click', ()=> handleExportWord(container));
  container.querySelector('#btnResetSoal').addEventListener('click', ()=>{
    if(!confirm('Reset form?')) return;
    container.querySelector('#soal-topik-container').innerHTML=''; topikCounter=0; addTopik(container);
    container.querySelector('#preview-content').innerHTML=''; container.querySelector('#preview-section').style.display='none';
    container.querySelector('#soal-kisi-select').value='';
    container.querySelector('#kisi-info').style.display='none';
  });
}

async function handleGenerate(container){
  const mapelId = container.querySelector('#soal-mapel').value;
  const kelasVal = container.querySelector('#soal-kelas').value;
  const bentuk = container.querySelector('#soal-bentuk').value;
  const jumlah = parseInt(container.querySelector('#soal-jumlah').value)||10;
  const tp = container.querySelector('#soal-tp').value;
  const allTopik = getTopikData(container);
  const lots = container.querySelector('#lots').value;
  const mots = container.querySelector('#mots').value;
  const hots = container.querySelector('#hots').value;

  if(!mapelId || !kelasVal || allTopik.length===0 || !tp){ showToast('Lengkapi Mapel, Kelas, Topik, dan TP','error'); return; }
  if(!groqApiKey){ showToast('API Key belum aktif','error'); return; }

  const btn = container.querySelector('#btnGenerateSoal');
  btn.disabled=true; btn.textContent='⏳ AI Meracik Soal...';
  const previewSec = container.querySelector('#preview-section');
  const preview = container.querySelector('#preview-content');
  previewSec.style.display='block';
  preview.innerHTML='<div style="padding:20px; text-align:center;">🤖 AI sedang menyusun soal presisi dari '+allTopik.length+' topik...</div>';

  try{
    const mapelInfo = dataMapel.find(m=>m.id===mapelId);
    const mapelNama = mapelInfo ? mapelInfo.nama : mapelId;
    const [kelasNum, fase] = kelasVal.split('|');
    const topikDetail = allTopik.map((t,i)=> `Topik ${i+1}: ${t.tema} | Sub Materi: ${t.subTemas.join(', ')}`).join('\n');

    const prompt = `
Buatkan ${jumlah} soal untuk:
Mapel: ${mapelNama} (${mapelId})
Kelas: ${kelasNum} Fase ${fase}
Bentuk: ${bentuk}
Level: ${lots}% LOTS, ${mots}% MOTS, ${hots}% HOTS
Topik & Sub Topik Presisi:
${topikDetail}
TP: ${tp}

Aturan:
- Soal harus tersebar proporsional ke semua Topik
- Setiap soal harus mencantumkan topik_asal, sub_asal, level_kognitif (LOTS/MOTS/HOTS), TP_ref
- Jika PG: beri 4 opsi A-D, kunci (A/B/C/D), pembahasan singkat
- Jika Isian: beri kunci jawaban singkat
- Jika Esai: beri kunci uraian

Kembalikan JSON array valid tanpa markdown, format:
{
  "nomor": 1,
  "topik_asal": "...",
  "sub_asal": "...",
  "level_kognitif": "LOTS/MOTS/HOTS",
  "pertanyaan": "...",
  "jenis": "PG/Isian/Uraian",
  "opsi": ["...","...","...","..."],
  "kunci": "B atau jawaban",
  "pembahasan": "...",
  "tp_ref": "..."
}
`;

    const res = await fetch(GROQ_API_URL,{
      method:'POST',
      headers:{ 'Content-Type':'application/json', 'Authorization':`Bearer ${groqApiKey}` },
      body: JSON.stringify({ model: GROQ_MODEL, messages:[{ role:'user', content: prompt }], temperature:0.7, max_tokens:6000 })
    });
    const data = await res.json();
    let text = data.choices?.[0]?.message?.content||'';
    text = text.replace(/```json/g,'').replace(/```/g,'').trim();
    let soalData=[];
    try{ soalData = JSON.parse(text); }catch(e){
      const m = text.match(/\[.*\]/s);
      if(m) soalData = JSON.parse(m[0]);
    }
    if(!Array.isArray(soalData) || !soalData.length) throw new Error('Format AI tidak valid');

    renderPreview(container, soalData);
    preview.dataset.soalJson = JSON.stringify(soalData);
    showToast('✅ '+soalData.length+' soal presisi berhasil dibuat!');

  }catch(err){
    console.error(err);
    preview.innerHTML=`<div style="color:red; padding:10px;">❌ Gagal: ${err.message}</div>`;
    showToast('❌ Gagal generate','error');
  }finally{
    btn.disabled=false; btn.textContent='🤖 Generate Soal Presisi dengan AI';
  }
}

function renderPreview(container, soalList){
  const preview = container.querySelector('#preview-content');
  let html = '';
  soalList.forEach((s,i)=>{
    const opsiHtml = s.opsi && s.opsi.length ? `<div style="margin:8px 0 0 20px;">${s.opsi.map((o,idx)=> `<div>${String.fromCharCode(65+idx)}. ${o} ${String.fromCharCode(65+idx)===s.kunci ? '<b style="color:green;">✓</b>' : ''}</div>`).join('')}</div>` : '';
    html+=`
      <div class="soal-card">
        <div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:6px;">
          <span class="badge">${s.topik_asal||''}</span>
          <span class="badge" style="background:#fef3c7;">${s.sub_asal||''}</span>
          <span class="badge" style="background:${s.level_kognitif==='HOTS'?'#fee2e2': s.level_kognitif==='MOTS'?'#fef3c7':'#dcfce7'};">${s.level_kognitif}</span>
          <span class="badge">${s.jenis}</span>
        </div>
        <div><b>${i+1}. ${s.pertanyaan}</b></div>
        ${opsiHtml}
        <div style="margin-top:8px; font-size:12px; background:#f9fafb; padding:8px; border-radius:6px;">
          <b>Kunci:</b> ${s.kunci}<br><b>Pembahasan:</b> ${s.pembahasan||'-'}<br><b>TP Ref:</b> ${s.tp_ref||'-'}
        </div>
      </div>
    `;
  });
  preview.innerHTML = html;
}

async function handleSimpanBank(container){
  const preview = container.querySelector('#preview-content');
  if(!preview.dataset.soalJson){ showToast('Generate soal dulu!','error'); return; }
  const mapelId = container.querySelector('#soal-mapel').value;
  const kelasVal = container.querySelector('#soal-kelas').value;
  const [kelasNum, fase] = kelasVal.split('|');
  const kisiId = container.querySelector('#soal-kisi-select').value||null;
  let soalList=[];
  try{ soalList = JSON.parse(preview.dataset.soalJson); }catch(e){}

  if(!soalList.length){ showToast('Tidak ada soal','error'); return; }

  try{
    let count=0;
    for(const s of soalList){
      await addDoc(collection(db,'bankSoal'),{
        mapelId,
        kelas: kelasNum,
        fase,
        topik: s.topik_asal||'',
        subTopik: s.sub_asal||'',
        pertanyaan: s.pertanyaan,
        jenis: s.jenis==='PG' ? 'PG' : s.jenis.includes('Isian') ? 'Isian' : 'Uraian',
        opsi: s.opsi||[],
        kunci: s.kunci,
        pembahasan: s.pembahasan||'',
        tingkat: s.level_kognitif==='HOTS' ? 'Sulit' : s.level_kognitif==='MOTS' ? 'Sedang' : 'Mudah',
        level_kognitif: s.level_kognitif,
        tpId: s.tp_ref||'',
        kisiId,
        userId: currentUser.uid,
        createdAt: serverTimestamp()
      });
      count++;
    }
    showToast(`✅ ${count} soal disimpan ke Bank Soal (bankSoal)!`);
  }catch(err){
    console.error(err);
    showToast('❌ Gagal simpan: '+err.message,'error');
  }
}

function handleExportWord(container){
  const preview = container.querySelector('#preview-content');
  if(!preview.innerHTML.trim() || !preview.dataset.soalJson){ showToast('Generate soal dulu','error'); return; }
  let soalList=[]; try{ soalList=JSON.parse(preview.dataset.soalJson); }catch(e){}
  const mapelId = container.querySelector('#soal-mapel').value;
  const mapelInfo = dataMapel.find(m=>m.id===mapelId);
  const mapelNama = mapelInfo ? mapelInfo.nama : mapelId;
  const kelasVal = container.querySelector('#soal-kelas').value;
  const [kelasNum, fase] = kelasVal.split('|');

  let html = `
    <html><head><meta charset="utf-8"><title>Soal - ${mapelNama}</title>
    <style>body{font-family:'Times New Roman',serif; margin:2cm;} h1{text-align:center;} .soal{margin-bottom:16px;} .opsi{margin-left:20px;} .kunci{margin-top:30px; border-top:1px solid #000; padding-top:10px;}</style>
    </head><body>
    <h1>SOAL ${mapelNama.toUpperCase()} - Kelas ${kelasNum} Fase ${fase}</h1>
    <p>Tanggal: ${new Date().toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'})}</p>
    <hr>
  `;
  soalList.forEach((s,i)=>{
    html+=`<div class="soal"><p><b>${i+1}. [${s.topik_asal} - ${s.sub_asal} - ${s.level_kognitif}]</b><br>${s.pertanyaan}</p>${s.opsi?.length? `<div class="opsi">${s.opsi.map((o,idx)=> `${String.fromCharCode(65+idx)}. ${o}<br>`).join('')}</div>`:''}</div>`;
  });
  html+=`<div class="kunci"><h3>KUNCI & PEMBAHASAN</h3>${soalList.map((s,i)=> `<p>${i+1}. Kunci: <b>${s.kunci}</b> - ${s.pembahasan||''} (TP: ${s.tp_ref||'-'})</p>`).join('')}</div></body></html>`;

  const blob = new Blob(['\ufeff', html], {type:'application/msword'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download=`Soal-${mapelId}-Kelas${kelasNum}-${new Date().toISOString().slice(0,10)}.doc`; document.body.appendChild(a); a.click(); setTimeout(()=>{ document.body.removeChild(a); URL.revokeObjectURL(url); },100);
  showToast('📄 Word berhasil diunduh!');
}

function showToast(msg,type='success'){
  const t=document.createElement('div'); t.className=`toast toast-${type}`; t.textContent=msg; document.body.appendChild(t); setTimeout(()=> t.remove(),3000);
}
