// modules/admin-pembelajaran/features/bank-rpm.js - FIXED V2
// FITUR: BANK RPM - Penyimpanan RPM Spesifik + Print/Unduh/Edit + Anti Missing Permission

import { db } from '../../../js/firebase-config.js';
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  collection, getDocs, query, where, doc, deleteDoc, orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const CSS_ID = 'bank-rpm-css';
let allData = [];
let selectedId = null;

export async function init(container) {
  loadCSS();
  renderUI(container);
  attachEvents(container);
  await loadBankRPM(container);
}

export function cleanup() {
  const css = document.getElementById(CSS_ID);
  if (css) css.remove();
}

function getCurrentUid() {
  try {
    const auth = getAuth();
    if (auth.currentUser?.uid) return auth.currentUser.uid;
  } catch {}
  const ls = JSON.parse(localStorage.getItem('currentUser') || '{}');
  return ls.uid || ls.userId || null;
}

function loadCSS() {
  if (document.getElementById(CSS_ID)) return;
  const style = document.createElement('style');
  style.id = CSS_ID;
  style.textContent = `
    .brpm-wrap { max-width: 1200px; margin: 0 auto; font-family: 'Segoe UI', sans-serif; }
    .brpm-header { background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%); color: #fff; padding: 28px; border-radius: 16px; margin-bottom: 20px; box-shadow: 0 8px 20px rgba(37,99,235,.25); }
    .brpm-header h2 { margin: 0 0 6px 0; font-size: 26px; font-weight: 800; }
    .brpm-header p { margin: 0; opacity: .95; font-size: 14px; }
    .brpm-toolbar { background: #fff; padding: 16px; border-radius: 12px; display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 16px; box-shadow: 0 2px 8px rgba(0,0,0,.06); }
    .brpm-input { padding: 10px 14px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 14px; outline: none; flex:1; min-width:200px; }
    .brpm-input:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,.15); }
    .brpm-select { padding: 10px 14px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 13px; }
    .brpm-btn { padding: 10px 16px; border: none; border-radius: 8px; font-weight: 600; font-size: 13px; cursor: pointer; color: #fff; display: inline-flex; align-items: center; gap: 6px; }
    .brpm-btn-primary { background: linear-gradient(135deg, #2563eb, #7c3aed); }
    .brpm-btn-danger { background: linear-gradient(135deg, #ef4444, #dc2626); }
    .brpm-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 14px; }
    .brpm-card { background: #fff; border-radius: 14px; padding: 16px; border: 1px solid #e2e8f0; border-left: 5px solid #6366f1; box-shadow: 0 2px 10px rgba(0,0,0,.04); transition: all .2s; }
    .brpm-card:hover { transform: translateY(-2px); box-shadow: 0 6px 18px rgba(99,102,241,.15); }
    .brpm-card-title { font-weight: 800; color: #1e293b; font-size: 14px; margin-bottom: 6px; line-height: 1.3; }
    .brpm-card-meta { font-size: 12px; color: #64748b; margin-bottom: 10px; display: flex; flex-wrap: wrap; gap: 6px; }
    .brpm-badge { display: inline-block; padding: 3px 8px; border-radius: 20px; font-size: 11px; font-weight: 700; }
    .brpm-badge-mapel { background: #dbeafe; color: #1e40af; }
    .brpm-badge-kelas { background: #fef3c7; color: #92400e; }
    .brpm-badge-metode { background: #f3e8ff; color: #6b21a8; }
    .brpm-card-actions { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 12px; }
    .brpm-card-actions button { padding: 7px 11px; font-size: 12px; border: none; border-radius: 7px; cursor: pointer; font-weight: 600; color:#fff; }
    .brpm-empty { background: #fff; padding: 40px; border-radius: 12px; text-align: center; color: #64748b; }
    .brpm-modal-bg { position: fixed; inset: 0; background: rgba(0,0,0,.5); display: none; align-items: center; justify-content: center; z-index: 10000; padding: 20px; }
    .brpm-modal-bg.show { display: flex; }
    .brpm-modal { background: #fff; width: 100%; max-width: 900px; max-height: 90vh; overflow: auto; border-radius: 16px; padding: 24px; }
    .brpm-stat { display: grid; grid-template-columns: repeat(4,1fr); gap: 10px; margin-bottom: 16px; }
    .brpm-stat-item { background: #fff; padding: 14px; border-radius: 10px; text-align: center; border: 1px solid #e2e8f0; }
    .brpm-stat-num { font-size: 22px; font-weight: 800; color: #4f46e5; }
    .brpm-stat-label { font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase; }
    @media print { body * { visibility: hidden; } #brpm-modal-bg, #brpm-modal-bg * { visibility: visible; } #brpm-modal-bg { position: absolute; inset: 0; background: #fff; } }
    @media (max-width: 768px) { .brpm-grid { grid-template-columns: 1fr; } .brpm-stat { grid-template-columns: repeat(2,1fr); } }
  `;
  document.head.appendChild(style);
}

function renderUI(container) {
  container.innerHTML = `
    <div class="brpm-wrap">
      <div class="brpm-header">
        <h2>📚 Bank RPM - Arsip RPM Spesifik</h2>
        <p>Penyimpanan terpusat semua RPM yang telah dihasilkan dari fitur RPM Spesifik. Data diambil dari koleksi <code>rpm_data</code> & <code>bank_rpm</code>.</p>
      </div>
      <div class="brpm-stat" id="brpm-stat">
        <div class="brpm-stat-item"><div class="brpm-stat-num" id="stat-total">0</div><div class="brpm-stat-label">Total RPM</div></div>
        <div class="brpm-stat-item"><div class="brpm-stat-num" id="stat-kelas">0</div><div class="brpm-stat-label">Kelas</div></div>
        <div class="brpm-stat-item"><div class="brpm-stat-num" id="stat-mapel">0</div><div class="brpm-stat-label">Mapel</div></div>
        <div class="brpm-stat-item"><div class="brpm-stat-num" id="stat-metode">0</div><div class="brpm-stat-label">Metode</div></div>
      </div>
      <div class="brpm-toolbar">
        <input type="text" id="brpm-search" class="brpm-input" placeholder="🔍 Cari tema, mapel, metode...">
        <select id="brpm-filter-mapel" class="brpm-select"><option value="">Semua Mapel</option></select>
        <select id="brpm-filter-kelas" class="brpm-select"><option value="">Semua Kelas</option></select>
        <select id="brpm-filter-metode" class="brpm-select"><option value="">Semua Metode</option></select>
        <button id="brpm-refresh" class="brpm-btn brpm-btn-primary">🔄 Refresh</button>
      </div>
      <div id="brpm-list"><div class="brpm-empty">⏳ Memuat data Bank RPM...</div></div>
    </div>
    <div id="brpm-modal-bg" class="brpm-modal-bg">
      <div class="brpm-modal" id="brpm-modal">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; gap:10px; flex-wrap:wrap;">
          <h3 id="brpm-modal-title" style="margin:0;">Detail RPM</h3>
          <div style="display:flex; gap:6px; flex-wrap:wrap;">
            <button onclick="brpmPrint()" class="brpm-btn brpm-btn-primary" style="background:#0ea5e9;">🖨️ Print</button>
            <button onclick="brpmDownload()" class="brpm-btn" style="background:#059669;">📥 Unduh Word</button>
            <button onclick="brpmEditCurrent()" class="brpm-btn" style="background:#7c3aed;">✏️ Edit</button>
            <button onclick="brpmClose()" class="brpm-btn brpm-btn-secondary">✖ Tutup</button>
          </div>
        </div>
        <div id="brpm-modal-body"></div>
      </div>
    </div>
  `;
}

function attachEvents(container) {
  container.querySelector('#brpm-search')?.addEventListener('input', () => renderList());
  container.querySelector('#brpm-filter-mapel')?.addEventListener('change', () => renderList());
  container.querySelector('#brpm-filter-kelas')?.addEventListener('change', () => renderList());
  container.querySelector('#brpm-filter-metode')?.addEventListener('change', () => renderList());
  container.querySelector('#brpm-refresh')?.addEventListener('click', () => loadBankRPM(container));

  document.getElementById('brpm-modal-bg')?.addEventListener('click', (e) => {
    if (e.target.id === 'brpm-modal-bg') brpmClose();
  });

  // Global functions untuk onclick di card
  window.brpmView = (id) => openDetail(id);
  window.brpmDelete = (id) => confirmDelete(id);
  window.brpmEdit = (id) => editRPM(id);
  window.brpmPrint = () => doPrint();
  window.brpmDownload = () => { if (selectedId) exportWord(selectedId); };
  window.brpmEditCurrent = () => { if (selectedId) editRPM(selectedId); };
  window.brpmClose = () => document.getElementById('brpm-modal-bg')?.classList.remove('show');
  window.brpmDownloadCard = (id) => exportWord(id);
  window.brpmPrintCard = (id) => { openDetail(id); setTimeout(()=>doPrint(), 300); };
}

async function loadBankRPM(container) {
  const uid = getCurrentUid();
  const listEl = document.getElementById('brpm-list');
  if (!uid) {
    listEl.innerHTML = `<div class="brpm-empty">❌ User tidak terdeteksi. Silakan login ulang.<br><small>UID tidak ditemukan di Auth / localStorage</small></div>`;
    return;
  }

  listEl.innerHTML = `<div class="brpm-empty">⏳ Memuat data untuk UID ${uid.substring(0,6)}...</div>`;

  try {
    // FIX UTAMA: Query harus pakai userId == uid agar lolos rules isOwner()
    // Kita coba 2 koleksi: rpm_data dan bank_rpm untuk kompatibilitas
    let results = [];

    // 1. Coba koleksi rpm_data (yang lama)
    try {
      const q1 = query(collection(db, 'rpm_data'), where('userId', '==', uid));
      const snap1 = await getDocs(q1);
      snap1.forEach(d => {
        const data = d.data();
        // Filter jenis di client agar tidak butuh composite index
        if (!data.jenis || data.jenis === 'spesifik' || data.jenis === 'RPM Spesifik') {
          results.push({ id: d.id, ...data, _source: 'rpm_data' });
        }
      });
    } catch (e) {
      console.warn('rpm_data query failed', e);
      if (e.message.includes('permission') || e.code === 'permission-denied') throw e;
    }

    // 2. Coba koleksi bank_rpm (yang baru, lebih aman)
    try {
      const q2 = query(collection(db, 'bank_rpm'), where('userId', '==', uid));
      const snap2 = await getDocs(q2);
      snap2.forEach(d => results.push({ id: d.id, ...d.data(), _source: 'bank_rpm' }));
    } catch (e) {
      console.warn('bank_rpm query failed (mungkin belum ada)', e);
    }

    // Deduplicate by id
    const map = new Map();
    results.forEach(r => map.set(r.id, r));
    allData = Array.from(map.values());

    // Sort terbaru dulu
    allData.sort((a,b) => {
      const ta = a.createdAt?.toMillis?.() || a.createdAt?.seconds || 0;
      const tb = b.createdAt?.toMillis?.() || b.createdAt?.seconds || 0;
      return tb - ta;
    });

    updateStatsAndFilters();
    renderList();

    if (allData.length === 0) {
      listEl.innerHTML = `<div class="brpm-empty">📭 Tidak ada RPM ditemukan untuk akun ini.<br><small>Buat dulu di <b>RPM Spesifik</b> → otomatis masuk ke sini. Pastikan saat simpan field <code>userId</code> terisi.</small></div>`;
    }

  } catch (err) {
    console.error(err);
    const msg = err.code === 'permission-denied' || err.message.includes('Missing or insufficient') 
      ? `❌ <b>Missing or insufficient permissions</b><br><br>
         Penyebab: Rules Firestore belum di-publish yang terbaru, atau data lama tidak punya field <code>userId</code>.<br><br>
         <b>Solusi cepat:</b><br>
         1. Publish rules yang saya berikan kemarin (yang ada <code>bank_rpm</code> & <code>isOwner()</code> fix)<br>
         2. Pastikan saat simpan RPM Spesifik, kode simpan menyertakan <code>userId: auth.currentUser.uid</code><br>
         3. Untuk data lama, tambahkan field <code>userId</code> manual di Firestore<br><br>
         <small>Error: ${err.message}</small>`
      : `❌ Gagal memuat: ${err.message}`;
    
    listEl.innerHTML = `<div class="brpm-empty" style="text-align:left;">${msg}</div>`;
  }
}

function updateStatsAndFilters() {
  const mapelSet = new Set(), kelasSet = new Set(), metodeSet = new Set();
  allData.forEach(d => {
    if (d.identitas?.mapel) mapelSet.add(d.identitas.mapel);
    if (d.identitas?.kelas) kelasSet.add(d.identitas.kelas);
    if (d.metode_pembelajaran) metodeSet.add(d.metode_pembelajaran);
  });

  document.getElementById('stat-total').textContent = allData.length;
  document.getElementById('stat-kelas').textContent = kelasSet.size;
  document.getElementById('stat-mapel').textContent = mapelSet.size;
  document.getElementById('stat-metode').textContent = metodeSet.size;

  const fill = (id, set) => {
    const sel = document.getElementById(id);
    if (!sel) return;
    const cur = sel.value;
    sel.innerHTML = `<option value="">${sel.options[0].text}</option>` + Array.from(set).map(v=>`<option value="${v}">${v}</option>`).join('');
    sel.value = cur;
  };
  fill('brpm-filter-mapel', mapelSet);
  fill('brpm-filter-kelas', kelasSet);
  fill('brpm-filter-metode', metodeSet);
}

function renderList() {
  const listEl = document.getElementById('brpm-list');
  if (!listEl) return;

  const q = document.getElementById('brpm-search')?.value.toLowerCase() || '';
  const fMapel = document.getElementById('brpm-filter-mapel')?.value || '';
  const fKelas = document.getElementById('brpm-filter-kelas')?.value || '';
  const fMetode = document.getElementById('brpm-filter-metode')?.value || '';

  let filtered = allData.filter(d => {
    const text = `${d.identitas?.mapel||''} ${d.identitas?.tema||''} ${d.identitas?.topik||''} ${d.metode_pembelajaran||''}`.toLowerCase();
    if (q && !text.includes(q)) return false;
    if (fMapel && d.identitas?.mapel !== fMapel) return false;
    if (fKelas && String(d.identitas?.kelas) !== String(fKelas)) return false;
    if (fMetode && d.metode_pembelajaran !== fMetode) return false;
    return true;
  });

  if (filtered.length === 0) {
    listEl.innerHTML = `<div class="brpm-empty">📭 Tidak ada RPM ditemukan.<br><small>Buat dulu di <b>RPM Spesifik</b> → otomatis masuk ke sini.</small></div>`;
    return;
  }

  listEl.innerHTML = `<div class="brpm-grid">` + filtered.map(d => {
    const date = d.createdAt?.toDate?.()?.toLocaleDateString('id-ID') || new Date().toLocaleDateString('id-ID');
    const tema = d.identitas?.tema || d.identitas?.topik || '-';
    const sub = d.identitas?.sub_tema || d.identitas?.subtema || '';
    return `
      <div class="brpm-card">
        <div class="brpm-card-title">${escapeHtml(d.identitas?.mapel || '-')} • ${escapeHtml(tema)} ${sub ? ' - ' + escapeHtml(sub) : ''}</div>
        <div class="brpm-card-meta">
          <span class="brpm-badge brpm-badge-mapel">${escapeHtml(d.identitas?.mapel || '-')}</span>
          <span class="brpm-badge brpm-badge-kelas">Kelas ${escapeHtml(d.identitas?.kelas || '-')} • Fase ${escapeHtml(d.identitas?.fase || '-')}</span>
          <span class="brpm-badge brpm-badge-metode">${escapeHtml(d.metode_pembelajaran || '-')}</span>
        </div>
        <div style="font-size:12px; color:#475569;">📅 ${date} • ⏰ ${escapeHtml(d.identitas?.alokasi_waktu || '-')} • 👩‍🏫 ${escapeHtml(d.identitas?.guru || d.tanda_tangan?.guru_pengampu?.nama || '-')}</div>
        <div class="brpm-card-actions">
          <button onclick="brpmView('${d.id}')" style="background:#2563eb;">👁️ Lihat</button>
          <button onclick="brpmPrintCard('${d.id}')" style="background:#0ea5e9;">🖨️ Print</button>
          <button onclick="brpmDownloadCard('${d.id}')" style="background:#059669;">📥 Unduh</button>
          <button onclick="brpmEdit('${d.id}')" style="background:#7c3aed;">✏️ Edit</button>
          <button onclick="brpmDelete('${d.id}')" style="background:#ef4444;">🗑️ Hapus</button>
        </div>
      </div>
    `;
  }).join('') + `</div>`;
}

function openDetail(id) {
  const d = allData.find(x => x.id === id);
  if (!d) return;
  selectedId = id;
  const body = document.getElementById('brpm-modal-body');
  const title = document.getElementById('brpm-modal-title');
  title.textContent = `${d.identitas?.mapel || ''} - ${d.identitas?.tema || d.identitas?.topik || ''}`;

  body.innerHTML = `
    <div id="print-area">
      <table style="width:100%; border-collapse:collapse; margin-bottom:12px;">
        <tr><td style="width:30%; padding:6px; border:1px solid #e2e8f0; background:#f8fafc;"><b>Sekolah</b></td><td style="padding:6px; border:1px solid #e2e8f0;">${escapeHtml(d.identitas?.sekolah||'-')}</td></tr>
        <tr><td style="padding:6px; border:1px solid #e2e8f0; background:#f8fafc;"><b>Mapel / Kelas / Fase</b></td><td style="padding:6px; border:1px solid #e2e8f0;">${escapeHtml(d.identitas?.mapel)} / Kelas ${escapeHtml(d.identitas?.kelas)} (Fase ${escapeHtml(d.identitas?.fase)})</td></tr>
        <tr><td style="padding:6px; border:1px solid #e2e8f0; background:#f8fafc;"><b>Tema</b></td><td style="padding:6px; border:1px solid #e2e8f0;">${escapeHtml(d.identitas?.tema||'-')} ${d.identitas?.sub_tema ? ' - ' + escapeHtml(d.identitas.sub_tema) : ''}</td></tr>
        <tr><td style="padding:6px; border:1px solid #e2e8f0; background:#f8fafc;"><b>Metode</b></td><td style="padding:6px; border:1px solid #e2e8f0;">${escapeHtml(d.metode_pembelajaran||'-')}</td></tr>
        <tr><td style="padding:6px; border:1px solid #e2e8f0; background:#f8fafc;"><b>Alokasi Waktu</b></td><td style="padding:6px; border:1px solid #e2e8f0;">${escapeHtml(d.identitas?.alokasi_waktu||'-')}</td></tr>
      </table>
      <h4>🎯 Tujuan & Profil</h4>
      <p><b>CP:</b> ${escapeHtml(d.tujuan_dan_profil?.cp||'-')}</p>
      <p><b>TP:</b></p>
      <ul>${(d.tujuan_dan_profil?.tujuan_pembelajaran||[]).map(t=>`<li>${escapeHtml(t)}</li>`).join('')}</ul>
      <p><b>Profil Lulusan:</b> ${escapeHtml((d.tujuan_dan_profil?.profil_lulusan||[]).join(', ')||'-')}</p>
      <h4>🧩 Langkah Pembelajaran (${d.langkah_pembelajaran?.length||0} Pertemuan)</h4>
      ${(d.langkah_pembelajaran||[]).map(p=>`
        <div style="background:#f8fafc; border:1px solid #e2e8f0; padding:10px; border-radius:8px; margin-bottom:8px;">
          <b>${escapeHtml(p.judul)}</b>
          <div style="margin-top:6px;"><b>Memahami:</b> ${escapeHtml(p.memahami||'-')}</div>
          <div><b>Mengaplikasikan:</b> ${escapeHtml(p.mengaplikasikan||'-')}</div>
          <div><b>Merefleksikan:</b> ${escapeHtml(p.merefleksikan||'-')}</div>
        </div>
      `).join('')}
      <h4>📝 Asesmen</h4>
      <p><b>Diagnostik:</b> ${escapeHtml(d.asesmen?.diagnostik||'-')}</p>
      <p><b>Formatif:</b> ${escapeHtml(d.asesmen?.formatif||'-')}</p>
      <p><b>Sumatif:</b> ${escapeHtml(d.asesmen?.sumatif||'-')}</p>
      <p><b>Rubrik:</b> ${escapeHtml(d.asesmen?.rubrik_penilaian||'-')}</p>
    </div>
  `;
  document.getElementById('brpm-modal-bg').classList.add('show');
}

function doPrint() {
  window.print();
}

function escapeHtml(s) {
  if (typeof s !== 'string') s = String(s);
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

async function confirmDelete(id) {
  if (!confirm('Hapus RPM ini dari Bank RPM?')) return;
  try {
    const item = allData.find(x=>x.id===id);
    const col = item?._source || 'rpm_data';
    await deleteDoc(doc(db, col, id));
    // coba hapus di koleksi satunya juga jika ada duplikat
    try { if (col !== 'bank_rpm') await deleteDoc(doc(db, 'bank_rpm', id)); } catch {}
    try { if (col !== 'rpm_data') await deleteDoc(doc(db, 'rpm_data', id)); } catch {}
    showToast('✅ RPM dihapus');
    allData = allData.filter(x=>x.id!==id);
    updateStatsAndFilters();
    renderList();
  } catch (e) {
    showToast('❌ Gagal hapus: ' + e.message, true);
  }
}

function editRPM(id) {
  // Simpan id ke localStorage agar halaman RPM Spesifik bisa load data untuk edit
  localStorage.setItem('edit_rpm_id', id);
  const d = allData.find(x=>x.id===id);
  if (d) localStorage.setItem('edit_rpm_data', JSON.stringify(d));
  showToast('✏️ Membuka editor RPM Spesifik...');
  // Arahkan ke fitur RPM Spesifik - sesuaikan URL routing Bapak
  const url = new URL(window.location.href);
  url.searchParams.set('fitur', 'rpm-spesifik');
  url.searchParams.set('edit', id);
  window.location.href = url.toString();
}

function exportWord(id) {
  const d = allData.find(x => x.id === id);
  if (!d) return;
  let html = `
    <html><head><meta charset="utf-8"><title>RPM - ${d.identitas?.tema||''}</title></head><body>
    <h1 style="text-align:center;">RENCANA PEMBELAJARAN MENDALAM (RPM) - SPESIFIK</h1>
    <h2 style="text-align:center;">${d.identitas?.tema||''} ${d.identitas?.sub_tema ? ' - ' + d.identitas.sub_tema : ''}</h2>
    <p style="text-align:center;"><i>Metode: ${d.metode_pembelajaran}</i> | Sekolah: ${d.identitas?.sekolah||''}</p>
    <h3>Identitas</h3>
    <p>Sekolah: ${d.identitas?.sekolah} | Mapel: ${d.identitas?.mapel} | Kelas: ${d.identitas?.kelas} Fase ${d.identitas?.fase} | Alokasi: ${d.identitas?.alokasi_waktu}</p>
    <h3>CP & TP</h3><p>${d.tujuan_dan_profil?.cp||''}</p><ul>${(d.tujuan_dan_profil?.tujuan_pembelajaran||[]).map(t=>`<li>${t}</li>`).join('')}</ul>
    <h3>Langkah Pembelajaran</h3>${(d.langkah_pembelajaran||[]).map(p=>`<h4>${p.judul}</h4><p>Memahami: ${p.memahami}</p><p>Mengaplikasikan: ${p.mengaplikasikan}</p><p>Merefleksikan: ${p.merefleksikan}</p>`).join('')}
    <h3>Asesmen</h3><p>Diagnostik: ${d.asesmen?.diagnostik}</p><p>Formatif: ${d.asesmen?.formatif}</p><p>Sumatif: ${d.asesmen?.sumatif}</p><p>Rubrik: ${d.asesmen?.rubrik_penilaian}</p>
    <br><br><p>Dicetak dari Bank RPM - SDN 139 LAMANDA - ${new Date().toLocaleDateString('id-ID')}</p>
    </body></html>
  `;
  const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Bank_RPM_${(d.identitas?.mapel||'Mapel')}_${(d.identitas?.tema||'tema').replace(/\s+/g,'_')}.doc`;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
  showToast('📥 Word berhasil diunduh!');
}

function showToast(msg, isError=false) {
  const toast = document.createElement('div');
  toast.textContent = msg;
  toast.style.cssText = `position:fixed; top:20px; right:20px; padding:12px 20px; border-radius:10px; z-index:10001; color:#fff; font-weight:600; background:${isError ? 'linear-gradient(135deg,#ef4444,#dc2626)' : 'linear-gradient(135deg,#2563eb,#7c3aed)'}; box-shadow:0 4px 12px rgba(0,0,0,.15); max-width:400px;`;
  document.body.appendChild(toast);
  setTimeout(()=>{ toast.style.opacity='0'; toast.style.transform='translateX(100px)'; toast.style.transition='all .3s'; setTimeout(()=>toast.remove(),300); }, 3000);
}
