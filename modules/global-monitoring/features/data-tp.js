// modules/global-monitoring/features/data-tp.js
// =========================================
// FITUR: DATA TP (MASTER DATA TUJUAN PEMBELAJARAN)
// FUNGSI: Single Source of Truth untuk seluruh sub-fitur aplikasi
// TERINTEGRASI: Firestore (Collection: 'data_tp')
// UJI COBA: Menggunakan import JS langsung dari data-mapel.js (tanpa fetch/fallback)
// =========================================

import { db } from '../../../js/firebase-config.js';
import { 
  collection, addDoc, getDocs, query, where, 
  onSnapshot, doc, updateDoc, deleteDoc, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { dataMapel } from '../../../assets/data-mapel.js'; // ⭐ UJI COBA: Import langsung dari JS

const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
const CSS_ID = 'data-tp-css';
let currentEditId = null;
// ⭐ dataMapel sudah tersedia dari import, tidak perlu inisialisasi array kosong

export async function init(container, db) {
  loadCSS();
  await loadMataPelajaran();
  renderUI(container);
  attachEvents(container);
  loadDataTP(container);
}

export function cleanup() {
  const css = document.getElementById(CSS_ID);
  if (css) css.remove();
}

// ⭐ UJI COBA: Fungsi disederhanakan, tanpa fetch dan tanpa fallback
async function loadMataPelajaran() {
  // Data sudah di-import langsung dari data-mapel.js
  console.log(' [UJI COBA] Data mapel dimuat dari modul JS:', dataMapel.length, 'mata pelajaran');
  console.log('🧪 [UJI COBA] Isi dataMapel:', dataMapel);
  return Promise.resolve();
}

function loadCSS() {
  if (document.getElementById(CSS_ID)) return;
  const style = document.createElement('style');
  style.id = CSS_ID;
  style.textContent = `
    .dtp-container { background: linear-gradient(135deg, #fce7f3 0%, #fbcfe8 50%, #e0e7ff 100%); border-radius: 16px; padding: 25px; font-family: 'Segoe UI', sans-serif; max-width: 1200px; margin: 0 auto; box-shadow: 0 8px 24px rgba(236, 72, 153, 0.15); }
    .dtp-header { background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); color: white; padding: 30px; border-radius: 12px; margin-bottom: 25px; box-shadow: 0 4px 12px rgba(236, 72, 153, 0.3); }
    .dtp-header h2 { margin: 0 0 8px 0; font-size: 28px; font-weight: 700; }
    .dtp-header p { margin: 0; opacity: 0.95; font-size: 15px; }
    .dtp-tabs { display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap; }
    .dtp-tab { padding: 12px 24px; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 14px; background: white; color: #be185d; transition: all 0.2s; }
    .dtp-tab.active { background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); color: white; }
    .dtp-section { background: white; padding: 25px; border-radius: 12px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(236, 72, 153, 0.1); }
    .dtp-section-title { font-size: 18px; font-weight: 700; color: #be185d; margin: 0 0 15px 0; padding-bottom: 10px; border-bottom: 3px solid #fce7f3; }
    .dtp-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px; }
    .dtp-form-group { margin-bottom: 15px; }
    .dtp-form-group label { display: block; margin-bottom: 6px; font-weight: 600; font-size: 13px; color: #831843; }
    .dtp-form-control { width: 100%; padding: 12px 14px; border: 2px solid #fbcfe8; border-radius: 8px; font-size: 14px; box-sizing: border-box; background: white; color: #831843; font-family: inherit; }
    .dtp-form-control:focus { outline: none; border-color: #ec4899; box-shadow: 0 0 0 3px rgba(236, 72, 153, 0.15); }
    textarea.dtp-form-control { resize: vertical; min-height: 120px; }
    select.dtp-form-control { cursor: pointer; }
    .dtp-btn { padding: 12px 24px; border: none; border-radius: 8px; font-weight: 600; font-size: 14px; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; transition: all 0.2s; color: white; }
    .dtp-btn:hover { transform: translateY(-2px); }
    .dtp-btn-primary { background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); }
    .dtp-btn-success { background: linear-gradient(135deg, #10b981 0%, #059669 100%); }
    .dtp-btn-warning { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); }
    .dtp-btn-danger { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); }
    .dtp-btn-secondary { background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%); }
    .dtp-actions { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 20px; justify-content: center; }
    .dtp-item { background: linear-gradient(135deg, #fff1f2 0%, #fce7f3 100%); padding: 15px; border-radius: 10px; margin-bottom: 10px; border-left: 4px solid #ec4899; }
    .dtp-item-header { display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px; flex-wrap: wrap; gap: 5px; }
    .dtp-item-title { font-weight: 700; color: #be185d; font-size: 15px; }
    .dtp-item-meta { font-size: 12px; color: #64748b; }
    .dtp-item-actions { display: flex; gap: 5px; }
    .dtp-item-actions button { padding: 6px 12px; font-size: 12px; border: none; border-radius: 6px; cursor: pointer; color: white; }
    .dtp-empty { text-align: center; padding: 30px; color: #64748b; background: white; border-radius: 10px; }
    .dtp-loading { text-align: center; padding: 20px; color: #831843; }
    .dtp-toast { position: fixed; top: 20px; right: 20px; padding: 14px 24px; border-radius: 10px; z-index: 10001; color: white; font-weight: 600; box-shadow: 0 4px 16px rgba(0,0,0,0.15); animation: dtpSlideIn 0.3s ease; }
    .dtp-toast-success { background: linear-gradient(135deg, #10b981 0%, #059669 100%); }
    .dtp-toast-error { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); }
    @keyframes dtpSlideIn { from { transform: translateX(400px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    .dtp-tp-list { background: #f8fafc; padding: 15px; border-radius: 8px; margin-top: 10px; }
    .dtp-tp-list ol { margin: 0; padding-left: 20px; color: #334155; font-size: 14px; line-height: 1.6; }
    .dtp-filters { display: flex; gap: 10px; margin-bottom: 15px; flex-wrap: wrap; }
    .dtp-filters select, .dtp-filters input { padding: 10px; border: 2px solid #fbcfe8; border-radius: 8px; font-size: 14px; }
    @media (max-width: 768px) { .dtp-form-grid { grid-template-columns: 1fr; } .dtp-actions { flex-direction: column; } .dtp-btn { width: 100%; justify-content: center; } .dtp-filters { flex-direction: column; } }
  `;
  document.head.appendChild(style);
}

function renderUI(container) {
  let mapelOptions = '<option value="">-- Pilih Mapel --</option>';
  dataMapel.forEach(m => {
    mapelOptions += `<option value="${m.nama}">${m.icon} ${m.singkatan}</option>`;
  });

  container.innerHTML = `
    <div class="dtp-container">
      <div class="dtp-header">
        <h2>🎯 Data TP (Master Data)</h2>
        <p>Database Terpusat Tujuan Pembelajaran untuk Konsistensi Administrasi Kurikulum</p>
      </div>

      <div class="dtp-tabs">
        <button class="dtp-tab active" data-tab="form">➕ Input / Edit Data TP</button>
        <button class="dtp-tab" data-tab="list"> Daftar Master TP</button>
      </div>

      <div id="dtp-form-section">
        <div class="dtp-section">
          <h3 class="dtp-section-title"> Informasi Master TP</h3>
          <div class="dtp-form-grid">
            <div class="dtp-form-group">
              <label> Kelas</label>
              <select id="dtp-kelas" class="dtp-form-control">
                <option value="">-- Pilih Kelas --</option>
                <option value="1">Kelas 1</option>
                <option value="2">Kelas 2</option>
                <option value="3">Kelas 3</option>
                <option value="4">Kelas 4</option>
                <option value="5">Kelas 5</option>
                <option value="6">Kelas 6</option>
              </select>
            </div>
            <div class="dtp-form-group">
              <label>📚 Mata Pelajaran</label>
              <select id="dtp-mapel" class="dtp-form-control">${mapelOptions}</select>
            </div>
          </div>
          <div class="dtp-form-grid">
            <div class="dtp-form-group">
              <label>📅 Semester</label>
              <select id="dtp-semester" class="dtp-form-control">
                <option value="1">Semester 1 (Ganjil)</option>
                <option value="2">Semester 2 (Genap)</option>
              </select>
            </div>
            <div class="dtp-form-group">
              <label>📝 Topik Pembelajaran</label>
              <input type="text" id="dtp-topik" class="dtp-form-control" placeholder="Contoh: Bagian Tubuh Tumbuhan">
            </div>
          </div>
          <div class="dtp-form-group">
            <label>🎯 Daftar Tujuan Pembelajaran (TP)</label>
            <textarea id="dtp-list-tp" class="dtp-form-control" placeholder="1. Siswa mampu mengidentifikasi bagian tubuh tumbuhan&#10;2. Siswa mampu menjelaskan fungsi akar, batang, dan daun&#10;(Pisahkan setiap TP dengan baris baru / Enter)"></textarea>
            <p style="font-size: 12px; color: #64748b; margin-top: 5px;">💡 Data ini adalah <strong>Master Data Terpusat (Single Source of Truth)</strong> yang dapat diakses secara universal oleh seluruh fitur aplikasi (RPM, KKTP, LKPD, Kisi-kisi, dan fitur-fitur baru di masa depan) sesuai kebutuhan.</p>
          </div>
        </div>

        <div class="dtp-actions">
          <button class="dtp-btn dtp-btn-success" id="btn-simpan">💾 Simpan ke Master Data</button>
          <button class="dtp-btn dtp-btn-warning" id="btn-export">📥 Export Word</button>
          <button class="dtp-btn dtp-btn-secondary" id="btn-reset"> Reset Form</button>
        </div>
      </div>

      <div id="dtp-list-section" style="display: none;">
        <div class="dtp-section">
          <h3 class="dtp-section-title">🔍 Filter Data</h3>
          <div class="dtp-filters">
            <select id="filter-kelas" class="dtp-form-control" style="flex: 1;">
              <option value="">Semua Kelas</option>
              <option value="1">Kelas 1</option>
              <option value="2">Kelas 2</option>
              <option value="3">Kelas 3</option>
              <option value="4">Kelas 4</option>
              <option value="5">Kelas 5</option>
              <option value="6">Kelas 6</option>
            </select>
            <select id="filter-mapel" class="dtp-form-control" style="flex: 2;">
              <option value="">Semua Mapel</option>
              ${mapelOptions}
            </select>
            <input type="text" id="filter-topik" class="dtp-form-control" style="flex: 2;" placeholder="Cari topik...">
          </div>

          <h3 class="dtp-section-title">📚 Daftar Master TP Tersimpan</h3>
          <div id="dtp-list-container">
            <div class="dtp-loading">⏳ Memuat data...</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function attachEvents(container) {
  // Tab switching
  container.querySelectorAll('.dtp-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      container.querySelectorAll('.dtp-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const target = tab.dataset.tab;
      container.querySelector('#dtp-form-section').style.display = target === 'form' ? 'block' : 'none';
      container.querySelector('#dtp-list-section').style.display = target === 'list' ? 'block' : 'none';
    });
  });

  // Simpan
  container.querySelector('#btn-simpan').addEventListener('click', () => handleSimpan(container));

  // Export
  container.querySelector('#btn-export').addEventListener('click', () => handleExportWord(container));

  // Reset
  container.querySelector('#btn-reset').addEventListener('click', () => {
    if (confirm('🔄 Reset form?')) {
      currentEditId = null;
      container.querySelector('#dtp-kelas').value = '';
      container.querySelector('#dtp-mapel').value = '';
      container.querySelector('#dtp-semester').value = '1';
      container.querySelector('#dtp-topik').value = '';
      container.querySelector('#dtp-list-tp').value = '';
      showToast('✅ Form direset!');
    }
  });

  // Filter listeners
  ['filter-kelas', 'filter-mapel', 'filter-topik'].forEach(id => {
    container.querySelector(`#${id}`).addEventListener('input', () => loadDataTP(container));
  });
}

async function handleSimpan(container) {
  const kelas = container.querySelector('#dtp-kelas').value;
  const mapel = container.querySelector('#dtp-mapel').value;
  const semester = container.querySelector('#dtp-semester').value;
  const topik = container.querySelector('#dtp-topik').value.trim();
  const tpText = container.querySelector('#dtp-list-tp').value.trim();

  if (!kelas || !mapel || !topik || !tpText) {
    showToast('️ Lengkapi semua field (Kelas, Mapel, Topik, dan TP)!', 'error');
    return;
  }

  // Ubah textarea (satu per baris) menjadi Array
  const tujuan_pembelajaran = tpText.split('\n').map(t => t.trim()).filter(t => t.length > 0);

  // Tentukan Fase berdasarkan Kelas
  let fase = 'A';
  if (kelas === '3' || kelas === '4') fase = 'B';
  else if (kelas === '5' || kelas === '6') fase = 'C';

  const dataTP = {
    kelas,
    fase,
    mapel,
    semester,
    topik,
    tujuan_pembelajaran,
    updatedAt: serverTimestamp(),
    userId: currentUser.uid
  };

  try {
    if (currentEditId) {
      const docRef = doc(db, 'data_tp', currentEditId);
      await updateDoc(docRef, dataTP);
      showToast('✅ Data TP berhasil diupdate!');
      currentEditId = null;
    } else {
      dataTP.createdAt = serverTimestamp();
      await addDoc(collection(db, 'data_tp'), dataTP);
      showToast('✅ Data TP berhasil disimpan ke Master Data!');
    }
    
    // Reset form setelah simpan
    container.querySelector('#btn-reset').click();
    // Pindah ke tab list
    container.querySelector('[data-tab="list"]').click();
  } catch (error) {
    console.error('Error saving:', error);
    showToast('❌ Gagal menyimpan: ' + error.message, 'error');
  }
}

function loadDataTP(container) {
  const listContainer = container.querySelector('#dtp-list-container');
  const filterKelas = container.querySelector('#filter-kelas').value;
  const filterMapel = container.querySelector('#filter-mapel').value;
  const filterTopik = container.querySelector('#filter-topik').value.toLowerCase();

  // Query dasar: ambil semua data user ini
  const q = query(
    collection(db, 'data_tp'),
    where('userId', '==', currentUser.uid)
  );

  onSnapshot(q, (snapshot) => {
    if (snapshot.empty) {
      listContainer.innerHTML = '<div class="dtp-empty">📭 Belum ada Data TP tersimpan. Silakan input atau biarkan fitur CP-TP-ATP mengisi otomatis.</div>';
      return;
    }

    let allData = [];
    snapshot.forEach(docSnap => {
      allData.push({ id: docSnap.id, ...docSnap.data() });
    });

    // Client-side filtering (lebih aman dari error index Firestore yang rumit)
    let filteredData = allData.filter(item => {
      const matchKelas = !filterKelas || item.kelas === filterKelas;
      const matchMapel = !filterMapel || item.mapel === filterMapel;
      const matchTopik = !filterTopik || item.topik.toLowerCase().includes(filterTopik);
      return matchKelas && matchMapel && matchTopik;
    });

    // Sort by createdAt descending manually
    filteredData.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

    if (filteredData.length === 0) {
      listContainer.innerHTML = '<div class="dtp-empty">🔍 Tidak ada data yang cocok dengan filter.</div>';
      return;
    }

    listContainer.innerHTML = filteredData.map(d => {
      const tpListHtml = d.tujuan_pembelajaran.map((tp, idx) => `<li>${tp}</li>`).join('');
      return `
        <div class="dtp-item">
          <div class="dtp-item-header">
            <div>
              <div class="dtp-item-title">${d.mapel} - Kelas ${d.kelas} (Fase ${d.fase}) | Semester ${d.semester}</div>
              <div class="dtp-item-meta">Topik: <strong>${d.topik}</strong></div>
            </div>
            <div class="dtp-item-actions">
              <button onclick="editDataTP('${d.id}')" style="background: #3b82f6;">✏️ Edit</button>
              <button onclick="deleteDataTP('${d.id}')" style="background: #ef4444;">🗑️ Hapus</button>
            </div>
          </div>
          <div class="dtp-tp-list">
            <ol>${tpListHtml}</ol>
          </div>
        </div>
      `;
    }).join('');
  }, (error) => {
    console.warn('Error loading data TP:', error);
    listContainer.innerHTML = '<div class="dtp-empty">❌ Gagal memuat data. Periksa koneksi internet.</div>';
  });
}

window.editDataTP = async function(id) {
  try {
    const { getDoc, doc } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
    const docRef = doc(db, 'data_tp', id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      showToast('⚠️ Data tidak ditemukan!', 'error');
      return;
    }

    const d = docSnap.data();
    currentEditId = id;

    document.querySelector('#dtp-kelas').value = d.kelas || '';
    document.querySelector('#dtp-mapel').value = d.mapel || '';
    document.querySelector('#dtp-semester').value = d.semester || '1';
    document.querySelector('#dtp-topik').value = d.topik || '';
    
    // Gabungkan array TP kembali menjadi string dengan baris baru
    document.querySelector('#dtp-list-tp').value = (d.tujuan_pembelajaran || []).join('\n');

    // Pindah ke tab form
    document.querySelector('[data-tab="form"]').click();
    showToast('✅ Data TP dimuat untuk diedit!');
  } catch (error) {
    console.error('Error loading data TP:', error);
    showToast('❌ Gagal memuat data!', 'error');
  }
};

window.deleteDataTP = async function(id) {
  if (!confirm('⚠️ Yakin hapus Data TP ini? Penghapusan akan mempengaruhi sub-fitur yang menggunakan data ini.')) return;
  
  try {
    await deleteDoc(doc(db, 'data_tp', id));
    showToast('✅ Data TP berhasil dihapus!');
  } catch (error) {
    console.error('Error deleting:', error);
    showToast('❌ Gagal menghapus!', 'error');
  }
};

function handleExportWord(container) {
  // Ambil data yang sedang tampil di filter
  const filterKelas = container.querySelector('#filter-kelas').value || 'Semua';
  const filterMapel = container.querySelector('#filter-mapel').value || 'Semua';
  
  // Kita ambil ulang data dari DOM yang sudah difilter untuk konsistensi
  const items = container.querySelectorAll('.dtp-item');
  if (items.length === 0) {
    showToast('⚠️ Tidak ada data untuk diexport!', 'error');
    return;
  }

  let html = `
    <html><head><meta charset="utf-8"><title>Master Data TP</title>
    <style>
      body { font-family: 'Times New Roman', serif; margin: 2cm; line-height: 1.6; }
      h1 { text-align: center; font-size: 16pt; margin-bottom: 5px; }
      h2 { font-size: 13pt; border-bottom: 2px solid #000; padding-bottom: 5px; margin-top: 20px; }
      .item { margin-bottom: 20px; page-break-inside: avoid; }
      .item-header { font-weight: bold; font-size: 12pt; margin-bottom: 5px; }
      .item-topik { font-style: italic; color: #555; margin-bottom: 10px; }
      ol { margin: 5px 0; padding-left: 20px; }
      li { margin-bottom: 5px; }
    </style></head><body>
    <h1>MASTER DATA TUJUAN PEMBELAJARAN (TP)</h1>
    <p style="text-align: center;">SDN 139 LAMANDA | Filter: Kelas ${filterKelas} | Mapel ${filterMapel}</p>
    <hr>
  `;

  items.forEach(item => {
    const header = item.querySelector('.dtp-item-title').textContent;
    const topik = item.querySelector('.dtp-item-meta').textContent;
    const tpList = item.querySelector('.dtp-tp-list ol').innerHTML;
    
    html += `
      <div class="item">
        <div class="item-header">${header}</div>
        <div class="item-topik">${topik}</div>
        <ol>${tpList}</ol>
      </div>
    `;
  });

  html += `</body></html>`;

  const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Master_Data_TP_${filterKelas}_${filterMapel}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  showToast('✅ Word berhasil diunduh!');
}

function showToast(msg, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `dtp-toast dtp-toast-${type}`;
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(400px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
