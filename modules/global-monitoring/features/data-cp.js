// modules/global-monitoring/features/data-cp.js
// =========================================
// FITUR: DATA CAPAIAN PEMBELAJARAN (CP)
// Fungsi: Mengelola data CP sekolah
// Fitur: Input Manual, Export, Import, Template, Simpan
// =========================================

import { 
  collection, doc, getDocs, setDoc, updateDoc, deleteDoc, 
  query, orderBy, serverTimestamp 
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

let db = null;
let currentUser = null;
let currentSchoolId = null;

export async function init(contentDiv, firebaseDb) {
  db = firebaseDb;
  
  // Ambil data user yang login
  const userData = JSON.parse(localStorage.getItem('currentUser') || '{}');
  currentUser = userData;
  currentSchoolId = userData.npsn || userData.idSekolah;
  
  if (!currentSchoolId) {
    contentDiv.innerHTML = `
      <div style="padding: 40px; text-align: center; background: white; border-radius: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
        <h3 style="color: #dc3545; margin-bottom: 15px;">❌ Error</h3>
        <p style="color: #6c757d;">NPSN tidak ditemukan. Silakan hubungi administrator.</p>
      </div>
    `;
    return;
  }
  
  console.log('✅ Data CP initialized for school:', currentSchoolId);
  renderDataCPUI(contentDiv);
  
  // Load data CP yang sudah ada
  await refreshData();
}

function getCollectionPath() {
  return `sekolah/${currentSchoolId}/data_cp`;
}

async function loadDataCP() {
  try {
    const collectionPath = getCollectionPath();
    const q = query(collection(db, collectionPath), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    const data = [];
    snapshot.forEach(docSnap => {
      data.push({ id: docSnap.id, ...docSnap.data() });
    });
    return data;
  } catch (error) {
    console.error('Error loading CP data:', error);
    return [];
  }
}

async function saveDataCP(data, id = null) {
  try {
    const collectionPath = getCollectionPath();
    const docRef = id ? doc(db, collectionPath, id) : doc(collection(db, collectionPath));
    
    await setDoc(docRef, {
      ...data,
      npsn: currentSchoolId,
      updatedAt: serverTimestamp(),
      updatedBy: currentUser?.uid || 'unknown',
      createdAt: id ? undefined : serverTimestamp()
    }, { merge: true });
    
    return docRef.id;
  } catch (error) {
    console.error('Error saving CP data:', error);
    throw error;
  }
}

async function deleteDataCP(id) {
  try {
    const collectionPath = getCollectionPath();
    await deleteDoc(doc(db, collectionPath, id));
    return true;
  } catch (error) {
    console.error('Error deleting CP data:', error);
    throw error;
  }
}

function renderDataCPUI(container) {
  container.innerHTML = `
    <style>
      .data-cp-container { padding: 20px; max-width: 1400px; margin: 0 auto; }
      .data-cp-header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 20px;
        border-radius: 10px;
        margin-bottom: 25px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      }
      .data-cp-header h2 { margin: 0 0 10px 0; }
      .data-cp-header p { margin: 5px 0; opacity: 0.95; }
      .data-cp-actions {
        display: flex;
        gap: 10px;
        margin-bottom: 20px;
        flex-wrap: wrap;
      }
      .data-cp-btn {
        padding: 10px 20px;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 600;
        transition: all 0.3s;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
      }
      .data-cp-btn:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
      .btn-primary { background: #007bff; color: white; }
      .btn-primary:hover { background: #0056b3; }
      .btn-success { background: #28a745; color: white; }
      .btn-success:hover { background: #218838; }
      .btn-warning { background: #ffc107; color: #000; }
      .btn-warning:hover { background: #e0a800; }
      .btn-info { background: #17a2b8; color: white; }
      .btn-info:hover { background: #138496; }
      .btn-danger { background: #dc3545; color: white; }
      .btn-danger:hover { background: #c82333; }
      .btn-secondary { background: #6c757d; color: white; }
      .btn-secondary:hover { background: #5a6268; }
      .data-cp-table-container {
        background: white;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        overflow-x: auto;
      }
      .data-cp-table { width: 100%; border-collapse: collapse; }
      .data-cp-table th, .data-cp-table td {
        padding: 12px 15px;
        text-align: left;
        border-bottom: 1px solid #dee2e6;
      }
      .data-cp-table th {
        background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
        font-weight: 700;
        color: #495057;
        position: sticky;
        top: 0;
      }
      .data-cp-table tr:hover td { background: #f8f9fa; }
      .data-cp-form-container {
        background: #f8f9fa;
        border: 2px solid #dee2e6;
        border-radius: 10px;
        padding: 25px;
        margin-bottom: 25px;
      }
      .data-cp-form-title {
        color: #343a40;
        font-size: 20px;
        font-weight: bold;
        margin-bottom: 20px;
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .data-cp-form-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 20px;
        margin-bottom: 20px;
      }
      .data-cp-form-group { display: flex; flex-direction: column; }
      .data-cp-form-group label {
        margin-bottom: 8px;
        font-weight: 600;
        color: #495057;
        font-size: 14px;
      }
      .data-cp-form-group input,
      .data-cp-form-group select,
      .data-cp-form-group textarea {
        padding: 12px;
        border: 2px solid #dee2e6;
        border-radius: 6px;
        font-size: 14px;
        transition: all 0.3s;
        background: white;
      }
      .data-cp-form-group input:focus,
      .data-cp-form-group select:focus,
      .data-cp-form-group textarea:focus {
        outline: none;
        border-color: #007bff;
        box-shadow: 0 0 0 3px rgba(0,123,255,0.1);
      }
      .data-cp-form-group textarea { min-height: 100px; resize: vertical; }
      .data-cp-modal {
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        z-index: 1000;
        align-items: center;
        justify-content: center;
      }
      .data-cp-modal.active { display: flex; }
      .data-cp-modal-content {
        background: white;
        padding: 30px;
        border-radius: 10px;
        max-width: 600px;
        width: 90%;
        max-height: 90vh;
        overflow-y: auto;
      }
      .data-cp-modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        padding-bottom: 15px;
        border-bottom: 2px solid #e9ecef;
      }
      .data-cp-modal-header h3 { margin: 0; color: #343a40; }
      .data-cp-close {
        font-size: 28px;
        cursor: pointer;
        color: #6c757d;
        line-height: 20px;
      }
      .data-cp-close:hover { color: #dc3545; }
      .empty-state { text-align: center; padding: 40px; color: #6c757d; }
      .data-cp-search {
        margin-bottom: 20px;
      }
      .data-cp-search input {
        width: 100%;
        padding: 12px;
        border: 2px solid #dee2e6;
        border-radius: 6px;
        font-size: 14px;
      }
      .data-cp-search input:focus {
        outline: none;
        border-color: #007bff;
      }
      .badge {
        display: inline-block;
        padding: 4px 10px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 600;
      }
      .badge-phase { background: #cfe2ff; color: #084298; }
      @media (max-width: 768px) {
        .data-cp-form-grid { grid-template-columns: 1fr; }
        .data-cp-table { font-size: 12px; }
        .data-cp-table th, .data-cp-table td { padding: 8px; }
        .data-cp-actions { flex-direction: column; }
        .data-cp-btn { width: 100%; justify-content: center; }
      }
    </style>
    
    <div class="data-cp-container">
      <div class="data-cp-header">
        <h2> Data Capaian Pembelajaran (CP)</h2>
        <p><strong>Sekolah:</strong> ${currentUser.namaSekolah || '-'}</p>
        <p><strong>NPSN:</strong> ${currentSchoolId}</p>
      </div>
      
      <div class="data-cp-actions">
        <button class="data-cp-btn btn-primary" onclick="showAddForm()">
          ️ Input Manual
        </button>
        <button class="data-cp-btn btn-success" onclick="exportData()">
          📤 Export File
        </button>
        <button class="data-cp-btn btn-warning" onclick="document.getElementById('importFileInput').click()">
          📥 Import File
        </button>
        <button class="data-cp-btn btn-info" onclick="downloadTemplate()">
          📋 Template File
        </button>
        <input type="file" id="importFileInput" accept=".json" style="display:none;" onchange="importData(event)">
      </div>
      
      <div class="data-cp-search">
        <input type="text" id="searchInput" placeholder="🔍 Cari data CP..." oninput="filterData(this.value)">
      </div>
      
      <div class="data-cp-table-container">
        <div id="dataContainer">
          <div class="empty-state"> Memuat data...</div>
        </div>
      </div>
      
      <!-- Modal Form -->
      <div class="data-cp-modal" id="cpModal">
        <div class="data-cp-modal-content">
          <div class="data-cp-modal-header">
            <h3 id="modalTitle">Tambah Data CP</h3>
            <span class="data-cp-close" onclick="closeModal()">&times;</span>
          </div>
          <form id="cpForm">
            <div class="data-cp-form-grid">
              <div class="data-cp-form-group">
                <label>Kode CP *</label>
                <input type="text" id="cpKode" required placeholder="Contoh: CP-MTK-01">
              </div>
              <div class="data-cp-form-group">
                <label>Fase *</label>
                <select id="cpFase" required>
                  <option value="">Pilih Fase...</option>
                  <option value="A">Fase A (Kelas 1-2)</option>
                  <option value="B">Fase B (Kelas 3-4)</option>
                  <option value="C">Fase C (Kelas 5-6)</option>
                  <option value="D">Fase D (Kelas 7-9)</option>
                  <option value="E">Fase E (Kelas 10)</option>
                  <option value="F">Fase F (Kelas 11-12)</option>
                </select>
              </div>
              <div class="data-cp-form-group">
                <label>Mata Pelajaran *</label>
                <input type="text" id="cpMapel" required placeholder="Contoh: Matematika">
              </div>
              <div class="data-cp-form-group">
                <label>Kelas *</label>
                <input type="text" id="cpKelas" required placeholder="Contoh: 1, 2, 3">
              </div>
              <div class="data-cp-form-group" style="grid-column: 1 / -1;">
                <label>Deskripsi CP *</label>
                <textarea id="cpDeskripsi" required placeholder="Tuliskan deskripsi Capaian Pembelajaran..."></textarea>
              </div>
            </div>
            <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
              <button type="button" class="data-cp-btn btn-secondary" onclick="closeModal()">
                Batal
              </button>
              <button type="submit" class="data-cp-btn btn-success">
                💾 Simpan
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;
  
  let editingId = null;
  let allData = [];
  
  // Form submit handler
  document.getElementById('cpForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const data = {
      kode: document.getElementById('cpKode').value.trim(),
      fase: document.getElementById('cpFase').value,
      mapel: document.getElementById('cpMapel').value.trim(),
      kelas: document.getElementById('cpKelas').value.trim(),
      deskripsi: document.getElementById('cpDeskripsi').value.trim()
    };
    
    try {
      await saveDataCP(data, editingId);
      closeModal();
      editingId = null;
      await refreshData();
      showToast('✅ Data CP berhasil disimpan!', 'success');
    } catch (error) {
      showToast('❌ Gagal menyimpan: ' + error.message, 'error');
    }
  });
  
  window.showAddForm = function() {
    editingId = null;
    document.getElementById('modalTitle').textContent = 'Tambah Data CP';
    document.getElementById('cpForm').reset();
    document.getElementById('cpModal').classList.add('active');
  };
  
  window.editData = function(id) {
    editingId = id;
    const item = allData.find(d => d.id === id);
    if (!item) return;
    
    document.getElementById('modalTitle').textContent = 'Edit Data CP';
    document.getElementById('cpKode').value = item.kode || '';
    document.getElementById('cpFase').value = item.fase || '';
    document.getElementById('cpMapel').value = item.mapel || '';
    document.getElementById('cpKelas').value = item.kelas || '';
    document.getElementById('cpDeskripsi').value = item.deskripsi || '';
    
    document.getElementById('cpModal').classList.add('active');
  };
  
  window.closeModal = function() {
    document.getElementById('cpModal').classList.remove('active');
    editingId = null;
  };
  
  window.deleteData = async function(id) {
    if (!confirm('Apakah Anda yakin ingin menghapus data ini?')) return;
    
    try {
      await deleteDataCP(id);
      await refreshData();
      showToast('✅ Data berhasil dihapus!', 'success');
    } catch (error) {
      showToast('❌ Gagal menghapus: ' + error.message, 'error');
    }
  };
  
  window.exportData = function() {
    if (allData.length === 0) {
      showToast('⚠️ Tidak ada data untuk diexport!', 'error');
      return;
    }
    
    const exportObj = {
      metadata: {
        sekolah: currentUser.namaSekolah,
        npsn: currentSchoolId,
        exportDate: new Date().toISOString(),
        totalData: allData.length
      },
      data: allData
    };
    
    const dataStr = JSON.stringify(exportObj, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `data-cp-${currentSchoolId}-${new Date().getTime()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    
    showToast(`✅ ${allData.length} data CP berhasil diexport!`, 'success');
  };
  
  window.importData = async function(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    try {
      const text = await file.text();
      const imported = JSON.parse(text);
      
      if (!imported.data || !Array.isArray(imported.data)) {
        throw new Error('Format file tidak valid!');
      }
      
      let successCount = 0;
      for (const item of imported.data) {
        if (item.kode && item.fase && item.mapel && item.deskripsi) {
          await saveDataCP({
            kode: item.kode,
            fase: item.fase,
            mapel: item.mapel,
            kelas: item.kelas || '',
            deskripsi: item.deskripsi
          });
          successCount++;
        }
      }
      
      await refreshData();
      showToast(`✅ ${successCount} data CP berhasil diimport!`, 'success');
    } catch (error) {
      showToast('❌ Gagal import: ' + error.message, 'error');
    }
    
    event.target.value = '';
  };
  
  window.downloadTemplate = function() {
    const template = {
      metadata: {
        sekolah: currentUser.namaSekolah || 'Nama Sekolah',
        npsn: currentSchoolId || 'NPSN',
        exportDate: new Date().toISOString(),
        totalData: 0,
        note: 'Ini adalah template file import. Sesuaikan data dengan format di bawah.'
      },
      data: [
        {
          kode: 'CP-MTK-01',
          fase: 'A',
          mapel: 'Matematika',
          kelas: '1, 2',
          deskripsi: 'Peserta didik dapat menunjukkan pemahaman dan memiliki intuisi bilangan (number sense) pada bilangan cacah sampai 100.'
        },
        {
          kode: 'CP-BIN-01',
          fase: 'A',
          mapel: 'Bahasa Indonesia',
          kelas: '1, 2',
          deskripsi: 'Peserta didik mampu membaca nyaring dan menunjukkan pemahaman teks yang dibaca.'
        }
      ]
    };
    
    const dataStr = JSON.stringify(template, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `template-data-cp.json`;
    link.click();
    URL.revokeObjectURL(url);
    
    showToast('✅ Template file berhasil didownload!', 'success');
  };
  
  window.filterData = function(searchTerm) {
    const filtered = allData.filter(item => {
      const search = searchTerm.toLowerCase();
      return (
        (item.kode || '').toLowerCase().includes(search) ||
        (item.fase || '').toLowerCase().includes(search) ||
        (item.mapel || '').toLowerCase().includes(search) ||
        (item.kelas || '').toLowerCase().includes(search) ||
        (item.deskripsi || '').toLowerCase().includes(search)
      );
    });
    renderTable(filtered);
  };
  
  async function refreshData() {
    const dataContainer = document.getElementById('dataContainer');
    dataContainer.innerHTML = '<div class="empty-state">⏳ Memuat data...</div>';
    
    try {
      allData = await loadDataCP();
      
      if (allData.length === 0) {
        dataContainer.innerHTML = `
          <div class="empty-state">
            <p>📭 Belum ada data CP</p>
            <p style="font-size:13px; margin-top:10px;">
              Klik tombol "Input Manual" atau "Import File" untuk menambahkan data
            </p>
          </div>
        `;
        return;
      }
      
      renderTable(allData);
    } catch (error) {
      dataContainer.innerHTML = `
        <div class="empty-state" style="color: #dc3545;">
           Gagal memuat data: ${error.message}
        </div>
      `;
    }
  }
  
  function renderTable(data) {
    const dataContainer = document.getElementById('dataContainer');
    
    let html = `
      <table class="data-cp-table">
        <thead>
          <tr>
            <th>Kode</th>
            <th>Fase</th>
            <th>Mata Pelajaran</th>
            <th>Kelas</th>
            <th>Deskripsi</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
    `;
    
    data.forEach(item => {
      html += `
        <tr>
          <td><strong>${item.kode || '-'}</strong></td>
          <td><span class="badge badge-phase">Fase ${item.fase || '-'}</span></td>
          <td>${item.mapel || '-'}</td>
          <td>${item.kelas || '-'}</td>
          <td style="max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${item.deskripsi || ''}">${item.deskripsi || '-'}</td>
          <td>
            <button class="data-cp-btn btn-primary" onclick="editData('${item.id}')" style="padding:5px 10px; font-size:12px;">
              ✏️ Edit
            </button>
            <button class="data-cp-btn btn-danger" onclick="deleteData('${item.id}')" style="padding:5px 10px; font-size:12px;">
              🗑️ Hapus
            </button>
          </td>
        </tr>
      `;
    });
    
    html += '</tbody></table>';
    dataContainer.innerHTML = html;
  }
  
  function showToast(message, type = 'success') {
    const existing = document.querySelector('.data-cp-toast');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = 'data-cp-toast';
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 14px 24px;
      border-radius: 8px;
      z-index: 10001;
      color: white;
      font-weight: 600;
      box-shadow: 0 4px 16px rgba(0,0,0,0.15);
      animation: slideIn 0.3s ease;
      background: ${type === 'success' ? '#28a745' : '#dc3545'};
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(400px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
}
