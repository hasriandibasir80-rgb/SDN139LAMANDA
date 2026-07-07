// =========================================
// MODUL: ARSIP KATALOG (PREVIEW & DOWNLOAD FIXED)
// =========================================

import { db } from '../firebase-config.js';
import { collection, getDocs, query, orderBy } 
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// 1. KEAMANAN: Cek user login
const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
if (!currentUser || !currentUser.uid) {
  alert('⛔ Akses Ditolak: Silakan login terlebih dahulu.');
  window.location.href = '../../index.html';
}

const userRole = localStorage.getItem('userRole');

// 2. STATE
let semuaDokumen = [];

// 3. DOM Elements
const searchInput = document.getElementById('searchInput');
const filterKategori = document.getElementById('filterKategori');
const katalogContainer = document.getElementById('katalogContainer');
const resultCount = document.getElementById('resultCount');

// 4. MUAT SEMUA DOKUMEN
async function muatSemuaDokumen() {
  try {
    const q = query(collection(db, 'documents'), orderBy('tanggalUpload', 'desc'));
    const snapshot = await getDocs(q);
    
    semuaDokumen = [];
    snapshot.forEach(doc => {
      semuaDokumen.push({ id: doc.id, ...doc.data() });
    });
    
    renderKatalog(semuaDokumen);
    
  } catch (error) {
    console.error('Error loading dokumen:', error);
    katalogContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⚠️</div>
        <h3>Gagal Memuat Data</h3>
        <p>${error.message}</p>
      </div>
    `;
  }
}

// 5. CEK AKSES DOKUMEN
function bisaAkses(levelAkses) {
  if (levelAkses === 'publik') return true;
  if (levelAkses === 'guru' && (userRole === 'admin' || userRole === 'guru')) return true;
  if (levelAkses === 'admin' && userRole === 'admin') return true;
  return false;
}

// 6. RENDER KATALOG
function renderKatalog(daftarDokumen) {
  resultCount.textContent = `Menampilkan ${daftarDokumen.length} dokumen`;
  
  if (daftarDokumen.length === 0) {
    katalogContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📭</div>
        <h3>Tidak Ada Dokumen</h3>
        <p>Tidak ada dokumen yang sesuai dengan filter Anda.</p>
      </div>
    `;
    return;
  }
  
  katalogContainer.innerHTML = '';
  
  daftarDokumen.forEach(doc => {
    const akses = bisaAkses(doc.levelAkses);
    const tanggal = doc.tanggalUpload 
      ? new Date(doc.tanggalUpload.toDate()).toLocaleDateString('id-ID', { 
          day: 'numeric', month: 'short', year: 'numeric' 
        })
      : '-';
    
    const iconMap = {
      'application/pdf': '📕',
      'application/msword': '📘',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '📘',
      'application/vnd.ms-excel': '📗',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '📗',
      'image/jpeg': '🖼️',
      'image/png': '🖼️'
    };
    const icon = iconMap[doc.tipeFile] || '📄';
    
    const ukuranMB = (doc.ukuranFile / (1024 * 1024)).toFixed(2);
    
    // =========================================
    // ✅ PERBAIKAN: GUNAKAN driveId UNTUK LINK LANGSUNG
    // =========================================
    
    // Prioritas: driveId > fileId > namaDokumen untuk search
    const fileId = doc.driveId || doc.fileId || doc.id;
    
    // Link Lihat: Gunakan URL Drive langsung jika ada fileId
    const linkLihat = fileId 
      ? `https://drive.google.com/file/d/${fileId}/view`
      : `https://drive.google.com/drive/search?q=${encodeURIComponent(doc.namaDokumen)}`;
    
    // Link Download: Gunakan URL download langsung
    const linkDownload = fileId
      ? `https://drive.google.com/uc?export=download&id=${fileId}`
      : linkLihat;

    const actions = akses
      ? `<a href="${linkLihat}" target="_blank" class="btn-action btn-view">👁️ Lihat</a>
         <a href="${linkDownload}" target="_blank" class="btn-action btn-download">⬇️ Unduh</a>`
      : `<button class="btn-action btn-locked" disabled>🔒 Akses Terbatas</button>`;
    
    const card = `
      <div class="dokumen-card ${akses ? '' : 'access-denied'}">
        <div class="doc-icon">${icon}</div>
        <div class="doc-title">${doc.namaDokumen}</div>
        <div class="doc-desc">${doc.deskripsi || 'Tidak ada deskripsi.'}</div>
        <div class="doc-meta">
          <span class="meta-badge kategori">📁 ${doc.kategori}</span>
          <span class="meta-badge ${doc.levelAkses}">🔒 ${doc.levelAkses}</span>
          <span class="meta-badge">📅 ${tanggal}</span>
          <span class="meta-badge">📦 ${ukuranMB} MB</span>
        </div>
        <div class="doc-actions">${actions}</div>
      </div>
    `;
    katalogContainer.innerHTML += card;
  });
}

// 7. FILTER & SEARCH
function filterDokumen() {
  const keyword = searchInput.value.toLowerCase().trim();
  const kategori = filterKategori.value;
  
  const hasil = semuaDokumen.filter(doc => {
    const matchKeyword = !keyword || 
      doc.namaDokumen.toLowerCase().includes(keyword) ||
      (doc.deskripsi && doc.deskripsi.toLowerCase().includes(keyword));
    const matchKategori = !kategori || doc.kategori === kategori;
    return matchKeyword && matchKategori;
  });
  
  renderKatalog(hasil);
}

searchInput.addEventListener('input', filterDokumen);
filterKategori.addEventListener('change', filterDokumen);

// 8. INIT
document.addEventListener('DOMContentLoaded', () => {
  muatSemuaDokumen();
});
