// modules/global-monitoring/features/master-data.js
// =========================================
// MASTER DATA MODULE - Updated untuk struktur schools/{NPSN}
// =========================================

import { collection, doc, getDocs, setDoc, deleteDoc, query, where, orderBy } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

let db = null;
let currentUser = null;
let currentSchoolId = null;

// Fungsi yang dipanggil oleh main.js
export async function init(contentDiv, firebaseDb) {
  db = firebaseDb;
  
  // Ambil data user yang login dari localStorage
  const userData = JSON.parse(localStorage.getItem('currentUser') || '{}');
  currentUser = userData;
  
  // Gunakan field npsn atau idSekolah (support kedua format)
  currentSchoolId = userData.npsn || userData.idSekolah;
  
  if (!currentSchoolId) {
    contentDiv.innerHTML = `
      <div class="empty-state">
        <h3>❌ Error</h3>
        <p>School ID (NPSN) tidak ditemukan. Silakan update profil Anda terlebih dahulu atau login kembali.</p>
        <button onclick="window.location.href='../../modules/profil-user/profil-user.html'" style="margin-top:10px; padding:10px 20px; background:#007bff; color:white; border:none; border-radius:4px; cursor:pointer;">
          Update Profil
        </button>
      </div>
    `;
    return;
  }
  
  console.log('✅ Master Data initialized for school:', currentSchoolId);
  renderMasterDataUI(contentDiv);
}

function getCollectionPath(collectionName) {
  // Gunakan path yang konsisten: schools/{NPSN}/masterData/{collection}
  return `schools/${currentSchoolId}/masterData/${collectionName}`;
}

async function getData(collectionName) {
  try {
    const collectionPath = getCollectionPath(collectionName);
    const q = query(collection(db, collectionPath), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    const data = [];
    snapshot.forEach(doc => {
      data.push({ id: doc.id, ...doc.data() });
    });
    return data;
  } catch (error) {
    console.error(`Error getting ${collectionName}:`, error);
    return [];
  }
}

async function saveData(collectionName, data, id = null) {
  try {
    const collectionPath = getCollectionPath(collectionName);
    const docRef = id ? doc(db, collectionPath, id) : doc(collection(db, collectionPath));
    await setDoc(docRef, {
      ...data,
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser?.uid || 'unknown',
      npsn: currentSchoolId // Simpan NPSN untuk referensi
    }, { merge: true });
    return docRef.id;
  } catch (error) {
    console.error(`Error saving ${collectionName}:`, error);
    throw error;
  }
}

async function deleteData(collectionName, id) {
  try {
    const collectionPath = getCollectionPath(collectionName);
    await deleteDoc(doc(db, collectionPath, id));
    return true;
  } catch (error) {
    console.error(`Error deleting ${collectionName}:`, error);
    throw error;
  }
}

function renderMasterDataUI(container) {
  container.innerHTML = `
    <style>
      .master-data-container {
        padding: 20px;
        max-width: 1200px;
        margin: 0 auto;
      }
      .school-info {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        margin-bottom: 20px;
      }
      .school-info h3 {
        margin: 0 0 5px 0;
      }
      .school-info p {
        margin: 0;
        opacity: 0.9;
      }
      .master-tabs {
        display: flex;
        gap: 10px;
        margin-bottom: 20px;
        flex-wrap: wrap;
      }
      .master-tab {
        padding: 10px 20px;
        border: 1px solid #ddd;
        border-radius: 5px;
        cursor: pointer;
        background: #f5f5f5;
        transition: all 0.3s;
      }
      .master-tab.active {
        background: #007bff;
        color: white;
        border-color: #007bff;
      }
      .master-content {
        background: white;
        border: 1px solid #ddd;
        border-radius: 5px;
        padding: 20px;
      }
      .master-table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 15px;
      }
      .master-table th,
      .master-table td {
        border: 1px solid #ddd;
        padding: 10px;
        text-align: left;
      }
      .master-table th {
        background: #f5f5f5;
        font-weight: 600;
      }
      .master-btn {
        padding: 8px 16px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        margin: 2px;
        transition: all 0.3s;
      }
      .master-btn-primary {
        background: #007bff;
        color: white;
      }
      .master-btn-primary:hover {
        background: #0056b3;
      }
      .master-btn-danger {
        background: #dc3545;
        color: white;
      }
      .master-btn-danger:hover {
        background: #c82333;
      }
      .master-btn-success {
        background: #28a745;
        color: white;
      }
      .master-btn-success:hover {
        background: #218838;
      }
      .master-form {
        display: grid;
        gap: 15px;
        margin-bottom: 20px;
      }
      .master-form-group {
        display: flex;
        flex-direction: column;
      }
      .master-form-group label {
        margin-bottom: 5px;
        font-weight: 500;
      }
      .master-form-group input,
      .master-form-group select,
      .master-form-group textarea {
        padding: 8px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 14px;
      }
      .master-form-group textarea {
        min-height: 80px;
        resize: vertical;
      }
      .master-modal {
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        z-index: 1000;
      }
      .master-modal.active {
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .master-modal-content {
        background: white;
        padding: 30px;
        border-radius: 8px;
        max-width: 600px;
        width: 90%;
        max-height: 90vh;
        overflow-y: auto;
      }
      .master-search {
        margin-bottom: 15px;
      }
      .master-search input {
        width: 100%;
        padding: 10px;
        border: 1px solid #ddd;
        border-radius: 4px;
      }
      @media (max-width: 768px) {
        .master-table {
          font-size: 12px;
        }
        .master-table th,
        .master-table td {
          padding: 6px;
        }
        .master-tabs {
          flex-direction: column;
        }
        .master-tab {
          width: 100%;
        }
      }
    </style>
    
    <div class="master-data-container">
      <div class="school-info">
        <h3>🏫 ${currentUser.namaSekolah || 'Data Sekolah'}</h3>
        <p>NPSN: ${currentSchoolId}</p>
      </div>
      
      <div class="master-tabs">
        <div class="master-tab active" data-tab="pesertaDidik">Peserta Didik</div>
        <div class="master-tab" data-tab="sarana">Sarana</div>
        <div class="master-tab" data-tab="tp">TP</div>
        <div class="master-tab" data-tab="cp">CP</div>
        <div class="master-tab" data-tab="atp">ATP</div>
        <div class="master-tab" data-tab="mapel">Mapel</div>
        <div class="master-tab" data-tab="kop">Kop Administrasi</div>
      </div>
      
      <div class="master-content">
        <div id="master-panel"></div>
      </div>
      
      <div class="master-modal" id="masterModal">
        <div class="master-modal-content">
          <h3 id="modalTitle">Tambah Data</h3>
          <form id="masterForm" class="master-form"></form>
          <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
            <button type="button" class="master-btn master-btn-danger" onclick="closeModal()">Batal</button>
            <button type="submit" class="master-btn master-btn-success" form="masterForm">Simpan</button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  let currentTab = 'pesertaDidik';
  let editingId = null;
  
  const tabConfigs = {
    pesertaDidik: {
      title: 'Peserta Didik',
      fields: [
        { name: 'nis', label: 'NIS', type: 'text', required: true },
        { name: 'nama', label: 'Nama', type: 'text', required: true },
        { name: 'kelas', label: 'Kelas', type: 'text', required: true },
        { name: 'jenisKelamin', label: 'Jenis Kelamin', type: 'select', options: ['Laki-laki', 'Perempuan'], required: true },
        { name: 'tanggalLahir', label: 'Tanggal Lahir', type: 'date', required: true },
        { name: 'namaOrangTua', label: 'Nama Orang Tua', type: 'text', required: true },
        { name: 'alamat', label: 'Alamat', type: 'textarea', required: true }
      ],
      columns: ['nis', 'nama', 'kelas', 'jenisKelamin']
    },
    sarana: {
      title: 'Sarana',
      fields: [
        { name: 'nama', label: 'Nama Sarana', type: 'text', required: true },
        { name: 'jumlah', label: 'Jumlah', type: 'number', required: true },
        { name: 'kondisi', label: 'Kondisi', type: 'select', options: ['Baik', 'Rusak Ringan', 'Rusak Berat'], required: true },
        { name: 'lokasi', label: 'Lokasi', type: 'text', required: true },
        { name: 'kategori', label: 'Kategori', type: 'text', required: true }
      ],
      columns: ['nama', 'jumlah', 'kondisi', 'lokasi', 'kategori']
    },
    tp: {
      title: 'Tujuan Pembelajaran (TP)',
      fields: [
        { name: 'kode', label: 'Kode', type: 'text', required: true },
        { name: 'deskripsi', label: 'Deskripsi', type: 'textarea', required: true },
        { name: 'fase', label: 'Fase', type: 'text', required: true },
        { name: 'kelas', label: 'Kelas', type: 'text', required: true },
        { name: 'mapelId', label: 'Mata Pelajaran', type: 'text', required: true }
      ],
      columns: ['kode', 'deskripsi', 'fase', 'kelas', 'mapelId']
    },
    cp: {
      title: 'Capaian Pembelajaran (CP)',
      fields: [
        { name: 'kode', label: 'Kode', type: 'text', required: true },
        { name: 'deskripsi', label: 'Deskripsi', type: 'textarea', required: true },
        { name: 'fase', label: 'Fase', type: 'text', required: true },
        { name: 'mapelId', label: 'Mata Pelajaran', type: 'text', required: true }
      ],
      columns: ['kode', 'deskripsi', 'fase', 'mapelId']
    },
    atp: {
      title: 'Alur Tujuan Pembelajaran (ATP)',
      fields: [
        { name: 'kode', label: 'Kode', type: 'text', required: true },
        { name: 'deskripsi', label: 'Deskripsi', type: 'textarea', required: true },
        { name: 'fase', label: 'Fase', type: 'text', required: true },
        { name: 'kelas', label: 'Kelas', type: 'text', required: true },
        { name: 'mapelId', label: 'Mata Pelajaran', type: 'text', required: true },
        { name: 'cpId', label: 'CP Terkait', type: 'text', required: true }
      ],
      columns: ['kode', 'deskripsi', 'fase', 'kelas', 'mapelId', 'cpId']
    },
    mapel: {
      title: 'Mata Pelajaran',
      fields: [
        { name: 'kode', label: 'Kode', type: 'text', required: true },
        { name: 'nama', label: 'Nama Mata Pelajaran', type: 'text', required: true },
        { name: 'kelompok', label: 'Kelompok', type: 'text', required: true },
        { name: 'fase', label: 'Fase', type: 'text', required: true }
      ],
      columns: ['kode', 'nama', 'kelompok', 'fase']
    },
    kop: {
      title: 'Kop Administrasi',
      fields: [
        { name: 'namaSekolah', label: 'Nama Sekolah', type: 'text', required: true },
        { name: 'npsn', label: 'NPSN', type: 'text', required: true, readonly: true },
        { name: 'alamat', label: 'Alamat', type: 'textarea', required: true },
        { name: 'kepalaSekolah', label: 'Kepala Sekolah', type: 'text', required: true },
        { name: 'nipKepalaSekolah', label: 'NIP Kepala Sekolah', type: 'text', required: true },
        { name: 'logo', label: 'Logo (URL)', type: 'text', required: false }
      ],
      columns: ['namaSekolah', 'npsn', 'kepalaSekolah', 'nipKepalaSekolah']
    }
  };
  
  async function loadTabData() {
    const panel = document.getElementById('master-panel');
    const config = tabConfigs[currentTab];
    
    panel.innerHTML = `
      <h2>${config.title}</h2>
      <div class="master-search">
        <input type="text" id="searchInput" placeholder="Cari data...">
      </div>
      <button class="master-btn master-btn-primary" onclick="showAddForm()">+ Tambah Data</button>
      <div id="dataContainer">Memuat data...</div>
    `;
    
    await refreshData();
    
    document.getElementById('searchInput').addEventListener('input', (e) => {
      filterData(e.target.value);
    });
  }
  
  let allData = [];
  
  async function refreshData() {
    const dataContainer = document.getElementById('dataContainer');
    const config = tabConfigs[currentTab];
    
    try {
      let data;
      switch(currentTab) {
        case 'pesertaDidik': data = await getData('pesertaDidik'); break;
        case 'sarana': data = await getData('sarana'); break;
        case 'tp': data = await getData('tp'); break;
        case 'cp': data = await getData('cp'); break;
        case 'atp': data = await getData('atp'); break;
        case 'mapel': data = await getData('mapel'); break;
        case 'kop': 
          data = await getData('kopAdministrasi'); 
          // Untuk kop, hanya ambil yang pertama jika ada
          if (data.length > 0 && !editingId) {
            editingId = data[0].id;
            document.getElementById('searchInput').parentElement.querySelector('button').style.display = 'none';
          }
          break;
      }
      
      allData = data;
      renderTable(data);
    } catch (error) {
      console.error('Error loading data:', error);
      dataContainer.innerHTML = '<p style="color: red;">Error loading data: ' + error.message + '</p>';
    }
  }
  
  function renderTable(data) {
    const config = tabConfigs[currentTab];
    const dataContainer = document.getElementById('dataContainer');
    
    if (data.length === 0) {
      dataContainer.innerHTML = '<p>Belum ada data</p>';
      return;
    }
    
    let html = '<table class="master-table"><thead><tr>';
    config.columns.forEach(col => {
      html += `<th>${col}</th>`;
    });
    html += '<th>Aksi</th></tr></thead><tbody>';
    
    data.forEach(item => {
      html += '<tr>';
      config.columns.forEach(col => {
        html += `<td>${item[col] || '-'}</td>`;
      });
      html += `<td>
        <button class="master-btn master-btn-primary" onclick="editData('${item.id}')">Edit</button>
        ${currentTab !== 'kop' ? `<button class="master-btn master-btn-danger" onclick="deleteDataItem('${item.id}')">Hapus</button>` : ''}
      </td>`;
      html += '</tr>';
    });
    
    html += '</tbody></table>';
    dataContainer.innerHTML = html;
  }
  
  function filterData(searchTerm) {
    const config = tabConfigs[currentTab];
    const filtered = allData.filter(item => {
      return config.columns.some(col => {
        const value = (item[col] || '').toString().toLowerCase();
        return value.includes(searchTerm.toLowerCase());
      });
    });
    renderTable(filtered);
  }
  
  window.showAddForm = function() {
    editingId = null;
    document.getElementById('modalTitle').textContent = 'Tambah Data';
    renderForm({});
    document.getElementById('masterModal').classList.add('active');
  };
  
  window.editData = function(id) {
    editingId = id;
    const item = allData.find(d => d.id === id);
    document.getElementById('modalTitle').textContent = 'Edit Data';
    renderForm(item);
    document.getElementById('masterModal').classList.add('active');
  };
  
  function renderForm(data) {
    const config = tabConfigs[currentTab];
    const form = document.getElementById('masterForm');
    
    let html = '';
    config.fields.forEach(field => {
      html += '<div class="master-form-group">';
      html += `<label>${field.label}${field.required ? ' *' : ''}</label>`;
      
      if (field.readonly) {
        // Field readonly untuk NPSN
        html += `<input type="${field.type}" name="${field.name}" value="${currentSchoolId}" readonly style="background:#f5f5f5;">`;
      } else if (field.type === 'select') {
        html += `<select name="${field.name}" ${field.required ? 'required' : ''}>`;
        html += '<option value="">Pilih...</option>';
        field.options.forEach(opt => {
          html += `<option value="${opt}" ${data[field.name] === opt ? 'selected' : ''}>${opt}</option>`;
        });
        html += '</select>';
      } else if (field.type === 'textarea') {
        html += `<textarea name="${field.name}" ${field.required ? 'required' : ''}>${data[field.name] || ''}</textarea>`;
      } else {
        html += `<input type="${field.type}" name="${field.name}" value="${data[field.name] || ''}" ${field.required ? 'required' : ''}>`;
      }
      
      html += '</div>';
    });
    
    form.innerHTML = html;
  }
  
  window.closeModal = function() {
    document.getElementById('masterModal').classList.remove('active');
  };
  
  document.getElementById('masterForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    
    try {
      switch(currentTab) {
        case 'pesertaDidik': await saveData('pesertaDidik', data, editingId); break;
        case 'sarana': await saveData('sarana', data, editingId); break;
        case 'tp': await saveData('tp', data, editingId); break;
        case 'cp': await saveData('cp', data, editingId); break;
        case 'atp': await saveData('atp', data, editingId); break;
        case 'mapel': await saveData('mapel', data, editingId); break;
        case 'kop': await saveData('kopAdministrasi', data, editingId || 'default'); break;
      }
      
      closeModal();
      editingId = null;
      await refreshData();
    } catch (error) {
      alert('Error saving data: ' + error.message);
    }
  });
  
  window.deleteDataItem = async function(id) {
    if (!confirm('Apakah Anda yakin ingin menghapus data ini?')) return;
    
    try {
      switch(currentTab) {
        case 'pesertaDidik': await deleteData('pesertaDidik', id); break;
        case 'sarana': await deleteData('sarana', id); break;
        case 'tp': await deleteData('tp', id); break;
        case 'cp': await deleteData('cp', id); break;
        case 'atp': await deleteData('atp', id); break;
        case 'mapel': await deleteData('mapel', id); break;
        case 'kop': await deleteData('kopAdministrasi', id); break;
      }
      
      await refreshData();
    } catch (error) {
      alert('Error deleting data: ' + error.message);
    }
  };
  
  document.querySelectorAll('.master-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.master-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentTab = tab.dataset.tab;
      editingId = null;
      if (currentTab === 'kop') {
        document.getElementById('searchInput').parentElement.querySelector('button').style.display = '';
      }
      loadTabData();
    });
  });
  
  loadTabData();
}
