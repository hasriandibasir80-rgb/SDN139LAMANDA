// modules/admin-pembelajaran/features/bank-rpm.js
// =========================================
// FITUR: BANK RPM - Penyimpanan RPM Spesifik
// Terintegrasi dengan koleksi 'rpm_data' jenis 'spesifik'
// Pengganti 'coming-soon'
// =========================================

import { db } from '../../../js/firebase-config.js';
import {
  collection, getDocs, query, where, onSnapshot,
  doc, deleteDoc, getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
const CSS_ID = 'bank-rpm-css';
let unsub = null;
let allData = [];
let selectedId = null;

export async function init(container) {
  loadCSS();
  renderUI(container);
  attachEvents(container);
  loadBankRPM(container);
}

export function cleanup() {
  if (unsub) unsub();
  const css = document.getElementById(CSS_ID);
  if (css) css.remove();
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
    .brpm-input { padding: 10px 14px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 14px; outline: none; }
    .brpm-input:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,.15); }
    .brpm-select { padding: 10px 14px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 13px; }
    .brpm-btn { padding: 10px 16px; border: none; border-radius: 8px; font-weight: 600; font-size: 13px; cursor: pointer; color: #fff; display: inline-flex; align-items: center; gap: 6px; }
    .brpm-btn-primary { background: linear-gradient(135deg, #2563eb, #7c3aed); }
    .brpm-btn-danger { background: linear-gradient(135deg, #ef4444, #dc2626); }
    .brpm-btn-secondary { background: linear-gradient(135deg, #64748b, #475569); }
    .brpm-btn-success { background: linear-gradient(135deg, #10b981, #059669); }
    .brpm-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 14px; }
    .brpm-card { background: #fff; border-radius: 14px; padding: 16px; border: 1px solid #e2e8f0; border-left: 5px solid #6366f1; box-shadow: 0 2px 10px rgba(0,0,0,.04); transition: all .2s; position: relative; }
    .brpm-card:hover { transform: translateY(-2px); box-shadow: 0 6px 18px rgba(99,102,241,.15); }
    .brpm-card-title { font-weight: 800; color: #1e293b; font-size: 14px; margin-bottom: 4px; line-height: 1.3; }
    .brpm-card-meta { font-size: 12px; color: #64748b; margin-bottom: 10px; display: flex; flex-wrap: wrap; gap: 6px; }
    .brpm-badge { display: inline-block; padding: 3px 8px; border-radius: 20px; font-size: 11px; font-weight: 700; }
    .brpm-badge-mapel { background: #dbeafe; color: #1e40af; }
    .brpm-badge-kelas { background: #fef3c7; color: #92400e; }
    .brpm-badge-metode { background: #f3e8ff; color: #6b21a8; }
    .brpm-card-actions { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 10px; }
    .brpm-card-actions button { padding: 7px 10px; font-size: 12px; border: none; border-radius: 7px; cursor: pointer; font-weight: 600; }
    .brpm-empty { background: #fff; padding: 40px; border-radius: 12px; text-align: center; color: #64748b; }
    .brpm-modal-bg { position: fixed; inset: 0; background: rgba(0,0,0,.5); display: none; align-items: center; justify-content: center; z-index: 10000; padding: 20px; }
    .brpm-modal-bg.show { display: flex; }
    .brpm-modal { background: #fff; width: 100%; max-width: 900px; max-height: 90vh; overflow: auto; border-radius: 16px; padding: 24px; }
    .brpm-modal h3 { margin-top: 0; color: #1e293b; }
    .brpm-stat { display: grid; grid-template-columns: repeat(4,1fr); gap: 10px; margin-bottom: 16px; }
    .brpm-stat-item { background: #fff; padding: 14px; border-radius: 10px; text-align: center; border: 1px solid #e2e8f0; }
    .brpm-stat-num { font-size: 22px; font-weight: 800; color: #4f46e5; }
    .brpm-stat-label { font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase; }
    @media (max-width: 768px) { .brpm-grid { grid-template-columns: 1fr; } .brpm-stat { grid-template-columns: repeat(2,1fr); } }
  `;
  document.head.appendChild(style);
}

function renderUI(container) {
  container.innerHTML = `
    <div class="brpm-wrap">
      <div class="brpm-header">
        <h2>📚 Bank RPM - Arsip RPM Spesifik</h2>
        <p>Penyimpanan terpusat semua RPM yang telah dihasilkan dari fitur RPM Spesifik. Data diambil dari Firestore koleksi <code>rpm_data</code> jenis <code>spesifik</code>.</p>
      </div>

      <div class="brpm-stat" id="brpm-stat">
        <div class="brpm-stat-item"><div class="brpm-stat-num" id="stat-total">0</div><div class="brpm-stat-label">Total RPM</div></div>
        <div class="brpm-stat-item"><div class="brpm-stat-num" id="stat-kelas">0</div><div class="brpm-stat-label">Kelas</div></div>
        <div class="brpm-stat-item"><div class="brpm-stat-num" id="stat-mapel">0</div><div class="brpm-stat-label">Mapel</div></div>
        <div class="brpm-stat-item"><div class="brpm-stat-num" id="stat-metode">0</div><div class="brpm-stat-label">Metode</div></div>
      </div>

      <div class="brpm-toolbar">
        <input type="text" id="brpm-search" class="brpm-input" placeholder="🔍 Cari tema, mapel, metode..." style="flex:1; min-width:200px;">
        <select id="brpm-filter-mapel" class="brpm-select"><option value="">Semua Mapel</option></select>
        <select id="brpm-filter-kelas" class="brpm-select"><option value="">Semua Kelas</option></select>
        <select id="brpm-filter-metode" class="brpm-select"><option value="">Semua Metode</option></select>
        <button id="brpm-refresh" class="brpm-btn brpm-btn-primary">🔄 Refresh</button>
      </div>

      <div id="brpm-list">
        <div class="brpm-empty">⏳ Memuat data Bank RPM...</div>
      </div>
    </div>

    <div id="brpm-modal-bg" class="brpm-modal-bg">
      <div class="brpm-modal">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
          <h3 id="brpm-modal-title">Detail RPM</h3>
          <button id="brpm-modal-close" class="brpm-btn brpm-btn-secondary">✕ Tutup</button>
        </div>
        <div id="brpm-modal-body" style="font-size:13px; line-height:1.7; color:#334155;"></div>
        <div style="margin-top:16px; display:flex; gap:8px; flex-wrap:wrap;">
          <button id="brpm-modal-export" class="brpm-btn brpm-btn-success">📄 Export Word</button>
          <button id="brpm-modal-delete" class="brpm-btn brpm-btn-danger">🗑️ Hapus</button>
        </div>
      </div>
    </div>
  `;
}

function attachEvents(container) {
  const search = container.querySelector('#brpm-search');
  const fMapel = container.querySelector('#brpm-filter-mapel');
  const fKelas = container.querySelector('#brpm-filter-kelas');
  const fMetode = container.querySelector('#brpm-filter-metode');
  const refresh = container.querySelector('#brpm-refresh');
  const modalBg = document.getElementById('brpm-modal-bg');
  const modalClose = document.getElementById('brpm-modal-close');

  const rerender = () => renderList(container);
  [search, fMapel, fKelas, fMetode].forEach(el => {
    if (!el) return;
    el.addEventListener('input', rerender);
    el.addEventListener('change', rerender);
  });
  refresh.addEventListener('click', () => loadBankRPM(container));

  modalClose.addEventListener('click', () => modalBg.classList.remove('show'));
  modalBg.addEventListener('click', (e) => { if (e.target === modalBg) modalBg.classList.remove('show'); });

  document.getElementById('brpm-modal-export').addEventListener('click', () => {
    if (selectedId) exportWord(selectedId);
  });
  document.getElementById('brpm-modal-delete').addEventListener('click', async () => {
    if (selectedId) {
      if (confirm('⚠️ Yakin hapus RPM ini dari Bank?')) {
        await deleteRPM(selectedId);
        modalBg.classList.remove('show');
      }
    }
  });

  window.brpmView = (id) => openDetail(id);
  window.brpmDelete = async (id) => { if (confirm('Hapus RPM ini?')) await deleteRPM(id); };
  window.brpmEdit = (id) => {
    // Arahkan ke editor RPM Spesifik dengan ID
    const url = new URL(window.location.href);
    url.searchParams.set('fitur', 'rpm-spesifik');
    url.searchParams.set('edit', id);
    window.location.href = url.toString();
    // Alternatif: simpan id ke localStorage untuk di-load otomatis
    localStorage.setItem('brpm_edit_id', id);
  };
}

function loadBankRPM(container) {
  if (!currentUser?.uid) {
    container.querySelector('#brpm-list').innerHTML = `<div class="brpm-empty">❌ User tidak terdeteksi. Silakan login ulang.</div>`;
    return;
  }
  const q = query(
    collection(db, 'rpm_data'),
    where('userId', '==', currentUser.uid),
    where('jenis', '==', 'spesifik')
  );

  if (unsub) unsub();
  unsub = onSnapshot(q, (snap) => {
    allData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    // sort terbaru
    allData.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    populateFilters();
    updateStats();
    renderList(container);
  }, (err) => {
    console.error(err);
    container.querySelector('#brpm-list').innerHTML = `<div class="brpm-empty">❌ Gagal memuat: ${err.message}</div>`;
  });
}

function populateFilters() {
  const mapels = [...new Set(allData.map(d => d.identitas?.mapel).filter(Boolean))];
  const kelas = [...new Set(allData.map(d => d.identitas?.kelas).filter(Boolean))];
  const metode = [...new Set(allData.map(d => d.metode_pembelajaran).filter(Boolean))];

  const fMapel = document.getElementById('brpm-filter-mapel');
  const fKelas = document.getElementById('brpm-filter-kelas');
  const fMetode = document.getElementById('brpm-filter-metode');

  if (fMapel) {
    const cur = fMapel.value;
    fMapel.innerHTML = `<option value="">Semua Mapel</option>` + mapels.map(m => `<option value="${m}">${m}</option>`).join('');
    fMapel.value = cur;
  }
  if (fKelas) {
    const cur = fKelas.value;
    fKelas.innerHTML = `<option value="">Semua Kelas</option>` + kelas.map(k => `<option value="${k}">Kelas ${k}</option>`).join('');
    fKelas.value = cur;
  }
  if (fMetode) {
    const cur = fMetode.value;
    fMetode.innerHTML = `<option value="">Semua Metode</option>` + metode.map(m => `<option value="${m}">${m}</option>`).join('');
    fMetode.value = cur;
  }
}

function updateStats() {
  const elTotal = document.getElementById('stat-total');
  const elKelas = document.getElementById('stat-kelas');
  const elMapel = document.getElementById('stat-mapel');
  const elMetode = document.getElementById('stat-metode');
  if (elTotal) elTotal.textContent = allData.length;
  if (elKelas) elKelas.textContent = new Set(allData.map(d => d.identitas?.kelas)).size;
  if (elMapel) elMapel.textContent = new Set(allData.map(d => d.identitas?.mapel)).size;
  if (elMetode) elMetode.textContent = new Set(allData.map(d => d.metode_pembelajaran)).size;
}

function renderList(container) {
  const listEl = container.querySelector('#brpm-list');
  const search = container.querySelector('#brpm-search')?.value.toLowerCase() || '';
  const fMapel = container.querySelector('#brpm-filter-mapel')?.value || '';
  const fKelas = container.querySelector('#brpm-filter-kelas')?.value || '';
  const fMetode = container.querySelector('#brpm-filter-metode')?.value || '';

  let filtered = allData.filter(d => {
    const text = `${d.identitas?.mapel||''} ${d.identitas?.tema||''} ${d.identitas?.sub_tema||''} ${d.identitas?.topik||''} ${d.metode_pembelajaran||''}`.toLowerCase();
    if (search && !text.includes(search)) return false;
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
    const date = d.createdAt?.toDate?.()?.toLocaleDateString('id-ID') || '-';
    const tema = d.identitas?.tema || d.identitas?.topik || '-';
    const sub = d.identitas?.sub_tema || d.identitas?.subtema || '';
    return `
      <div class="brpm-card">
        <div class="brpm-card-title">${d.identitas?.mapel || '-'} • ${tema} ${sub ? ' - ' + sub : ''}</div>
        <div class="brpm-card-meta">
          <span class="brpm-badge brpm-badge-mapel">${d.identitas?.mapel || '-'}</span>
          <span class="brpm-badge brpm-badge-kelas">Kelas ${d.identitas?.kelas || '-'} • Fase ${d.identitas?.fase || '-'}</span>
          <span class="brpm-badge brpm-badge-metode">${d.metode_pembelajaran || '-'}</span>
        </div>
        <div style="font-size:12px; color:#475569;">📅 ${date} • ⏰ ${d.identitas?.alokasi_waktu || '-'} • 👩‍🏫 ${d.identitas?.guru || d.tanda_tangan?.guru_pengampu?.nama || '-'}</div>
        <div class="brpm-card-actions">
          <button onclick="brpmView('${d.id}')" style="background:#2563eb; color:#fff;">👁️ Lihat</button>
          <button onclick="brpmEdit('${d.id}')" style="background:#7c3aed; color:#fff;">✏️ Edit</button>
          <button onclick="brpmDelete('${d.id}')" style="background:#ef4444; color:#fff;">🗑️ Hapus</button>
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
  title.textContent = `${d.identitas?.mapel} - ${d.identitas?.tema || d.identitas?.topik}`;

  body.innerHTML = `
    <table style="width:100%; border-collapse:collapse; margin-bottom:12px;">
      <tr><td style="width:30%; padding:6px; border:1px solid #e2e8f0; background:#f8fafc;"><b>Sekolah</b></td><td style="padding:6px; border:1px solid #e2e8f0;">${d.identitas?.sekolah||'-'}</td></tr>
      <tr><td style="padding:6px; border:1px solid #e2e8f0; background:#f8fafc;"><b>Mapel / Kelas / Fase</b></td><td style="padding:6px; border:1px solid #e2e8f0;">${d.identitas?.mapel} / Kelas ${d.identitas?.kelas} (Fase ${d.identitas?.fase})</td></tr>
      <tr><td style="padding:6px; border:1px solid #e2e8f0; background:#f8fafc;"><b>Tema</b></td><td style="padding:6px; border:1px solid #e2e8f0;">${d.identitas?.tema||'-'} ${d.identitas?.sub_tema ? ' - ' + d.identitas.sub_tema : ''}</td></tr>
      <tr><td style="padding:6px; border:1px solid #e2e8f0; background:#f8fafc;"><b>Metode</b></td><td style="padding:6px; border:1px solid #e2e8f0;">${d.metode_pembelajaran||'-'}</td></tr>
      <tr><td style="padding:6px; border:1px solid #e2e8f0; background:#f8fafc;"><b>Alokasi Waktu</b></td><td style="padding:6px; border:1px solid #e2e8f0;">${d.identitas?.alokasi_waktu||'-'}</td></tr>
    </table>

    <h4>🎯 Tujuan & Profil</h4>
    <p><b>CP:</b> ${d.tujuan_dan_profil?.cp||'-'}</p>
    <p><b>TP:</b></p>
    <ul>${(d.tujuan_dan_profil?.tujuan_pembelajaran||[]).map(t=>`<li>${t}</li>`).join('')}</ul>
    <p><b>Profil Lulusan:</b> ${(d.tujuan_dan_profil?.profil_lulusan||[]).join(', ')||'-'}</p>

    <h4>🧩 Langkah Pembelajaran (${d.langkah_pembelajaran?.length||0} Pertemuan)</h4>
    ${(d.langkah_pembelajaran||[]).map(p=>`
      <div style="background:#f8fafc; border:1px solid #e2e8f0; padding:10px; border-radius:8px; margin-bottom:8px;">
        <b>${p.judul}</b>
        <div style="margin-top:6px;"><b>Memahami:</b> ${p.memahami||'-'}</div>
        <div><b>Mengaplikasikan:</b> ${p.mengaplikasikan||'-'}</div>
        <div><b>Merefleksikan:</b> ${p.merefleksikan||'-'}</div>
      </div>
    `).join('')}

    <h4>📝 Asesmen</h4>
    <p><b>Diagnostik:</b> ${d.asesmen?.diagnostik||'-'}</p>
    <p><b>Formatif:</b> ${d.asesmen?.formatif||'-'}</p>
    <p><b>Sumatif:</b> ${d.asesmen?.sumatif||'-'}</p>
    <p><b>Rubrik:</b> ${d.asesmen?.rubrik_penilaian||'-'}</p>
  `;

  document.getElementById('brpm-modal-bg').classList.add('show');
}

async function deleteRPM(id) {
  try {
    await deleteDoc(doc(db, 'rpm_data', id));
    showToast('✅ RPM dihapus dari Bank RPM');
  } catch (e) {
    showToast('❌ Gagal hapus: ' + e.message, true);
  }
}

function exportWord(id) {
  const d = allData.find(x => x.id === id);
  if (!d) return;
  let html = `
    <html><head><meta charset="utf-8"><title>RPM - ${d.identitas?.tema||''}</title></head><body>
    <h1 style="text-align:center;">RENCANA PEMBELAJARAN MENDALAM (RPM) - SPESIFIK</h1>
    <h2 style="text-align:center;">${d.identitas?.tema||''} ${d.identitas?.sub_tema ? ' - ' + d.identitas.sub_tema : ''}</h2>
    <p style="text-align:center;"><i>Metode: ${d.metode_pembelajaran}</i></p>
    <h3>Identitas</h3>
    <p>Sekolah: ${d.identitas?.sekolah} | Mapel: ${d.identitas?.mapel} | Kelas: ${d.identitas?.kelas} Fase ${d.identitas?.fase} | Alokasi: ${d.identitas?.alokasi_waktu}</p>
    <h3>CP & TP</h3><p>${d.tujuan_dan_profil?.cp}</p><ul>${(d.tujuan_dan_profil?.tujuan_pembelajaran||[]).map(t=>`<li>${t}</li>`).join('')}</ul>
    <h3>Langkah Pembelajaran</h3>${(d.langkah_pembelajaran||[]).map(p=>`<h4>${p.judul}</h4><p>Memahami: ${p.memahami}</p><p>Mengaplikasikan: ${p.mengaplikasikan}</p><p>Merefleksikan: ${p.merefleksikan}</p>`).join('')}
    <h3>Asesmen</h3><p>Diagnostik: ${d.asesmen?.diagnostik}</p><p>Formatif: ${d.asesmen?.formatif}</p><p>Sumatif: ${d.asesmen?.sumatif}</p><p>Rubrik: ${d.asesmen?.rubrik_penilaian}</p>
    </body></html>
  `;
  const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Bank_RPM_${d.identitas?.mapel}_${d.identitas?.tema||'tema'}.doc`;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
  showToast('📥 Word berhasil diunduh!');
}

function showToast(msg, isError=false) {
  const toast = document.createElement('div');
  toast.textContent = msg;
  toast.style.cssText = `position:fixed; top:20px; right:20px; padding:12px 20px; border-radius:10px; z-index:10001; color:#fff; font-weight:600; background:${isError ? 'linear-gradient(135deg,#ef4444,#dc2626)' : 'linear-gradient(135deg,#2563eb,#7c3aed)'}; box-shadow:0 4px 12px rgba(0,0,0,.15);`;
  document.body.appendChild(toast);
  setTimeout(()=>{ toast.style.opacity='0'; toast.style.transform='translateX(100px)'; toast.style.transition='all .3s'; setTimeout(()=>toast.remove(),300); }, 2500);
}
