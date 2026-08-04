// =========================================
// FITUR: KALENDER PENDIDIKAN - REVISI 2
// Lokasi: modules/admin-pembelajaran/features/kalender.js
// Revisi: Tambah Upload, Edit, Pilih Kelas, Unduh
// Prinsip: Base64 jujur, Firestore: kalender_pendidikan
// =========================================

import { doc, getDoc, setDoc, getDocs, collection, query, where, deleteDoc, serverTimestamp } 
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let dbInstance = null;
let containerEl = null;
let fileInput, previewImg, previewWrapper, statusEl, listWrapper;
let base64Gambar = null;
let editId = null; // jika edit, isi dengan docId

function getTemplate() {
  return `
  <div class="kalender-pendidikan-wrapper" style="max-width:1000px;margin:0 auto;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
      <h2 style="margin:0;">📅 Kalender Pendidikan</h2>
      <div style="display:flex;gap:8px;">
        <select id="filterKelas" style="padding:8px 12px;border-radius:8px;border:1px solid #ddd;">
          <option value="all">📚 Semua Kelas</option>
          <option value="1">Kelas 1</option>
          <option value="2">Kelas 2</option>
          <option value="3">Kelas 3</option>
          <option value="4">Kelas 4</option>
          <option value="5">Kelas 5</option>
          <option value="6">Kelas 6</option>
          <option value="Umum">Umum / Sekolah</option>
        </select>
        <button id="btnKembaliMenuKalender" style="padding:8px 16px;border-radius:8px;cursor:pointer;background:#6b7280;color:white;border:none;">← Kembali ke Menu</button>
      </div>
    </div>

    <!-- FORM TAMBAH / EDIT -->
    <div id="formKalender" style="background:white;padding:20px;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,0.1);margin-bottom:20px;display:none;">
      <h3 id="formTitle" style="margin-top:0;">➕ Tambah Kalender</h3>
      
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:16px;">
        <div>
          <label style="font-weight:600;font-size:12px;">Tahun Ajaran</label>
          <input type="text" id="tahunAjaran" placeholder="2025/2026" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;margin-top:4px;">
        </div>
        <div>
          <label style="font-weight:600;font-size:12px;">Semester</label>
          <select id="semester" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;margin-top:4px;">
            <option value="Ganjil">Ganjil</option>
            <option value="Genap">Genap</option>
          </select>
        </div>
        <div>
          <label style="font-weight:600;font-size:12px;">Pilih Kelas *</label>
          <select id="pilihKelas" style="width:100%;padding:10px;border:1px solid #2563eb;border-radius:8px;margin-top:4px;background:#eff6ff;font-weight:600;">
            <option value="Umum">Umum / Sekolah</option>
            <option value="1">Kelas 1</option>
            <option value="2">Kelas 2</option>
            <option value="3">Kelas 3</option>
            <option value="4">Kelas 4</option>
            <option value="5">Kelas 5</option>
            <option value="6">Kelas 6</option>
          </select>
        </div>
      </div>

      <div id="dropZoneKalender" style="border:2px dashed #2563eb;border-radius:12px;padding:20px;text-align:center;cursor:pointer;background:#f8fafc;">
        <div style="font-size:32px;">🖼️</div>
        <div style="font-weight:600;">Klik / Seret Gambar Kalender</div>
        <div style="font-size:11px;color:#64748b;">JPG/PNG max 5MB → auto compress ke Base64</div>
        <input type="file" id="fileKalender" accept="image/*" style="display:none;">
      </div>

      <div id="previewWrapper" style="display:none;margin-top:16px;text-align:center;">
        <img id="previewImg" style="max-width:100%;max-height:400px;border-radius:8px;border:1px solid #e2e8f0;">
        <div id="infoBase64" style="font-size:11px;color:#64748b;margin-top:6px;"></div>
      </div>

      <div id="statusKalender" style="margin-top:12px;"></div>

      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px;">
        <button id="btnBatalKalender" style="padding:10px 18px;border-radius:8px;border:1px solid #ddd;background:white;cursor:pointer;">Batal</button>
        <button id="btnSimpanKalender" style="padding:10px 22px;border-radius:8px;border:none;background:#2563eb;color:white;font-weight:600;cursor:pointer;">💾 Simpan</button>
      </div>
    </div>

    <!-- TOOLBAR -->
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
      <button id="btnTambahKalender" style="padding:10px 20px;border-radius:8px;border:none;background:#16a34a;color:white;font-weight:600;cursor:pointer;">
        ➕ Tambah Upload Gambar
      </button>
      <div style="font-size:12px;color:#64748b;" id="infoCount">Memuat...</div>
    </div>

    <!-- LIST KALENDER PER KELAS -->
    <div id="listKalender" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;"></div>

    <div style="margin-top:20px;font-size:11px;color:#94a3b8;text-align:center;">
      Simpan sebagai Base64 di <code>kalender_pendidikan</code> • Prinsip jujur tanpa Drive
    </div>
  </div>
  `;
}

function fileToBase64Compressed(file, maxWidth = 1100, quality = 0.6) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width, h = img.height;
        if (w > maxWidth) { h = Math.round(h * maxWidth / w); w = maxWidth; }
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function showStatus(type, msg) {
  if (!statusEl) return;
  const bg = { success:'#dcfce7', error:'#fee2e2', info:'#dbeafe' }[type] || '#f1f5f9';
  statusEl.innerHTML = `<div style="padding:8px;border-radius:8px;background:${bg};font-size:12px;">${msg}</div>`;
}

function tampilkanPreview(b64, existing=false) {
  previewImg.src = b64;
  previewWrapper.style.display = 'block';
  const kb = Math.round((b64.length*3/4)/1024);
  document.getElementById('infoBase64').textContent = `${existing?'Tersimpan':'Baru'} • ~${kb} KB`;
}

async function loadList(filterKelas='all') {
  if (!listWrapper) return;
  listWrapper.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:20px;color:#64748b;">⏳ Memuat kalender...</div>';
  try {
    const q = collection(dbInstance, 'kalender_pendidikan');
    const snap = await getDocs(q);
    let items = [];
    snap.forEach(d => items.push({ id:d.id, ...d.data() }));

    if (filterKelas !== 'all') {
      items = items.filter(i => String(i.kelas) === String(filterKelas));
    }

    // sort terbaru
    items.sort((a,b) => (b.tanggalUpdate?.toMillis?.()||0) - (a.tanggalUpdate?.toMillis?.()||0));

    document.getElementById('infoCount').textContent = `${items.length} kalender ditemukan`;

    if (items.length === 0) {
      listWrapper.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:30px;background:white;border-radius:12px;">Belum ada kalender untuk filter ini. Klik <b>Tambah Upload Gambar</b>.</div>';
      return;
    }

    listWrapper.innerHTML = items.map(item => `
      <div style="background:white;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);border:1px solid #e2e8f0;">
        <div style="position:relative;">
          <img src="${item.gambarBase64}" style="width:100%;height:180px;object-fit:cover;">
          <span style="position:absolute;top:8px;left:8px;background:#2563eb;color:white;font-size:11px;padding:4px 8px;border-radius:20px;font-weight:600;">Kelas ${item.kelas} • ${item.semester}</span>
        </div>
        <div style="padding:12px;">
          <div style="font-weight:700;font-size:14px;">${item.tahunAjaran || '-'}</div>
          <div style="font-size:11px;color:#64748b;margin-bottom:10px;">${item.tanggalUpdate?.toDate ? item.tanggalUpdate.toDate().toLocaleDateString('id-ID') : ''} • ~${item.ukuranKB||0}KB</div>
          <div style="display:flex;gap:6px;">
            <button onclick="window.kalenderEdit('${item.id}')" style="flex:1;padding:8px;border-radius:6px;border:none;background:#f59e0b;color:white;font-weight:600;cursor:pointer;font-size:12px;">✏️ Edit</button>
            <button onclick="window.kalenderDownload('${item.id}')" style="flex:1;padding:8px;border-radius:6px;border:none;background:#0ea5e9;color:white;font-weight:600;cursor:pointer;font-size:12px;">⬇️ Unduh</button>
            <button onclick="window.kalenderHapus('${item.id}')" style="padding:8px 10px;border-radius:6px;border:none;background:#fee2e2;color:#dc2626;cursor:pointer;font-size:12px;">🗑️</button>
          </div>
        </div>
      </div>
    `).join('');

    // simpan untuk download
    window._kalenderCache = items;
  } catch (err) {
    listWrapper.innerHTML = `<div style="grid-column:1/-1;color:red;">Gagal: ${err.message}</div>`;
  }
}

function initEvents() {
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
  fileInput = document.getElementById('fileKalender');
  previewImg = document.getElementById('previewImg');
  previewWrapper = document.getElementById('previewWrapper');
  statusEl = document.getElementById('statusKalender');
  listWrapper = document.getElementById('listKalender');

  document.getElementById('btnKembaliMenuKalender').addEventListener('click', () => window.backToMenu?.() || (window.location.href='./adm-pembelajaran.html'));
  document.getElementById('btnTambahKalender').addEventListener('click', () => {
    editId = null;
    document.getElementById('formTitle').textContent = '➕ Tambah Kalender';
    document.getElementById('formKalender').style.display = 'block';
    document.getElementById('tahunAjaran').value = '2025/2026';
    document.getElementById('pilihKelas').value = document.getElementById('filterKelas').value !== 'all' ? document.getElementById('filterKelas').value : 'Umum';
    base64Gambar = null;
    previewWrapper.style.display = 'none';
    fileInput.value = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  document.getElementById('btnBatalKalender').addEventListener('click', () => {
    document.getElementById('formKalender').style.display = 'none';
    base64Gambar = null;
    editId = null;
  });
  document.getElementById('filterKelas').addEventListener('change', (e) => loadList(e.target.value));

  const dropZone = document.getElementById('dropZoneKalender');
  dropZone.addEventListener('click', () => fileInput.click());
  dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.style.borderColor='#16a34a'; });
  dropZone.addEventListener('dragleave', () => dropZone.style.borderColor='#2563eb');
  dropZone.addEventListener('drop', async (e) => {
    e.preventDefault(); dropZone.style.borderColor='#2563eb';
    if (e.dataTransfer.files[0]) await prosesFile(e.dataTransfer.files[0]);
  });
  fileInput.addEventListener('change', async (e) => { if (e.target.files[0]) await prosesFile(e.target.files[0]); });

  async function prosesFile(file) {
    if (!file.type.startsWith('image/')) { showStatus('error','Hanya gambar!'); return; }
    showStatus('info','⏳ Kompres ke Base64...');
    try {
      const b64 = await fileToBase64Compressed(file);
      if (b64.length > 950000) { showStatus('error','Masih >900KB, pilih gambar lebih kecil.'); return; }
      base64Gambar = b64;
      tampilkanPreview(b64);
      showStatus('success','✅ Siap simpan.');
    } catch (e) { showStatus('error','Gagal: '+e.message); }
  }

  document.getElementById('btnSimpanKalender').addEventListener('click', async () => {
    const tahunAjaran = document.getElementById('tahunAjaran').value.trim();
    const semester = document.getElementById('semester').value;
    const kelas = document.getElementById('pilihKelas').value;
    if (!tahunAjaran) { showStatus('error','Isi Tahun Ajaran!'); return; }
    if (!base64Gambar) { showStatus('error','Upload gambar dulu!'); return; }

    const btn = document.getElementById('btnSimpanKalender');
    btn.disabled = true; btn.textContent = '⏳ Menyimpan...';
    try {
      const id = editId || `kal-${kelas}-${tahunAjaran.replace('/','-')}-${semester}-${Date.now()}`;
      const ref = doc(dbInstance, 'kalender_pendidikan', id);
      await setDoc(ref, {
        tahunAjaran, semester, kelas,
        gambarBase64: base64Gambar,
        ukuranKB: Math.round((base64Gambar.length*3/4)/1024),
        uploaderUid: currentUser.uid || '',
        tanggalUpdate: serverTimestamp(),
        status: 'aktif'
      }, { merge: true });

      showStatus('success', `✅ Kalender Kelas ${kelas} tersimpan!`);
      document.getElementById('formKalender').style.display = 'none';
      base64Gambar = null; editId = null;
      loadList(document.getElementById('filterKelas').value);
    } catch (err) {
      showStatus('error','❌ '+err.message);
    } finally {
      btn.disabled = false; btn.textContent = '💾 Simpan';
    }
  });

  // Global untuk tombol di list
  window.kalenderEdit = async (id) => {
    const ref = doc(dbInstance, 'kalender_pendidikan', id);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const data = snap.data();
    editId = id;
    document.getElementById('formTitle').textContent = '✏️ Edit Kalender';
    document.getElementById('formKalender').style.display = 'block';
    document.getElementById('tahunAjaran').value = data.tahunAjaran || '';
    document.getElementById('semester').value = data.semester || 'Ganjil';
    document.getElementById('pilihKelas').value = data.kelas || 'Umum';
    base64Gambar = data.gambarBase64;
    tampilkanPreview(base64Gambar, true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  window.kalenderDownload = (id) => {
    const item = (window._kalenderCache||[]).find(x=>x.id===id);
    if (!item) return;
    const a = document.createElement('a');
    a.href = item.gambarBase64;
    a.download = `Kalender-${item.kelas}-${item.tahunAjaran}-${item.semester}.jpg`;
    a.click();
  };

  window.kalenderHapus = async (id) => {
    if (!confirm('Hapus kalender ini?')) return;
    await deleteDoc(doc(dbInstance, 'kalender_pendidikan', id));
    loadList(document.getElementById('filterKelas').value);
  };

  loadList('all');
}

export function init(container, db) {
  containerEl = container;
  dbInstance = db;
  containerEl.innerHTML = getTemplate();
  initEvents();
  console.log('✅ kalender.js revisi: Tambah, Edit, Pilih Kelas, Unduh - Base64');
}
