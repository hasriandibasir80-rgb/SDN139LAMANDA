import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, collection, doc, getDocs, setDoc, deleteDoc, query, where, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;
let currentSchoolId = null;

onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    loadUserProfile(user.uid);
  }
});

async function loadUserProfile(uid) {
  try {
    const userDoc = await getDocs(query(collection(db, 'users'), where('uid', '==', uid)));
    if (!userDoc.empty) {
      const userData = userDoc.docs[0].data();
      currentSchoolId = userData.idSekolah;
    }
  } catch (error) {
    console.error('Error loading user profile:', error);
  }
}

function getCollectionPath(collectionName) {
  if (!currentSchoolId) {
    throw new Error('School ID not found. User may not be logged in.');
  }
  return `sekolah/${currentSchoolId}/masterData/${collectionName}`;
}

async function getData(collectionName) {
  try {
    const collectionPath = getCollectionPath(collectionName);
    const snapshot = await getDocs(collection(db, collectionPath));
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
      updatedBy: currentUser?.uid || 'unknown'
    });
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

export const masterData = {
  async getPesertaDidik() {
    return await getData('pesertaDidik');
  },
  
  async savePesertaDidik(data, id = null) {
    return await saveData('pesertaDidik', data, id);
  },
  
  async deletePesertaDidik(id) {
    return await deleteData('pesertaDidik', id);
  },
  
  async getSarana() {
    return await getData('sarana');
  },
  
  async saveSarana(data, id = null) {
    return await saveData('sarana', data, id);
  },
  
  async deleteSarana(id) {
    return await deleteData('sarana', id);
  },
  
  async getTP() {
    return await getData('tp');
  },
  
  async saveTP(data, id = null) {
    return await saveData('tp', data, id);
  },
  
  async deleteTP(id) {
    return await deleteData('tp', id);
  },
  
  async getCP() {
    return await getData('cp');
  },
  
  async saveCP(data, id = null) {
    return await saveData('cp', data, id);
  },
  
  async deleteCP(id) {
    return await deleteData('cp', id);
  },
  
  async getATP() {
    return await getData('atp');
  },
  
  async saveATP(data, id = null) {
    return await saveData('atp', data, id);
  },
  
  async deleteATP(id) {
    return await deleteData('atp', id);
  },
  
  async getMapel() {
    return await getData('mapel');
  },
  
  async saveMapel(data, id = null) {
    return await saveData('mapel', data, id);
  },
  
  async deleteMapel(id) {
    return await deleteData('mapel', id);
  },
  
  async getKopAdministrasi() {
    const data = await getData('kopAdministrasi');
    return data.length > 0 ? data[0] : null;
  },
  
  async saveKopAdministrasi(data, id = null) {
    return await saveData('kopAdministrasi', data, id);
  },
  
  getCurrentUser() {
    return currentUser;
  },
  
  getCurrentSchoolId() {
    return currentSchoolId;
  }
};

export function createMasterDataUI() {
  const container = document.createElement('div');
  container.className = 'master-data-container';
  container.innerHTML = `
    <style>
      .master-data-container {
        padding: 20px;
        max-width: 1200px;
        margin: 0 auto;
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
  `;
  
  document.body.appendChild(container);
  
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
        { name: 'npsn', label: 'NPSN', type: 'text', required: true },
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
        case 'pesertaDidik': data = await masterData.getPesertaDidik(); break;
        case 'sarana': data = await masterData.getSarana(); break;
        case 'tp': data = await masterData.getTP(); break;
        case 'cp': data = await masterData.getCP(); break;
        case 'atp': data = await masterData.getATP(); break;
        case 'mapel': data = await masterData.getMapel(); break;
        case 'kop': data = await masterData.getKopAdministrasi(); data = data ? [data] : []; break;
      }
      
      allData = data;
      renderTable(data);
    } catch (error) {
      dataContainer.innerHTML = '<p style="color: red;">Error loading data</p>';
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
        <button class="master-btn master-btn-danger" onclick="deleteDataItem('${item.id}')">Hapus</button>
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
      
      if (field.type === 'select') {
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
        case 'pesertaDidik': await masterData.savePesertaDidik(data, editingId); break;
        case 'sarana': await masterData.saveSarana(data, editingId); break;
        case 'tp': await masterData.saveTP(data, editingId); break;
        case 'cp': await masterData.saveCP(data, editingId); break;
        case 'atp': await masterData.saveATP(data, editingId); break;
        case 'mapel': await masterData.saveMapel(data, editingId); break;
        case 'kop': await masterData.saveKopAdministrasi(data, editingId); break;
      }
      
      closeModal();
      await refreshData();
    } catch (error) {
      alert('Error saving data: ' + error.message);
    }
  });
  
  window.deleteDataItem = async function(id) {
    if (!confirm('Apakah Anda yakin ingin menghapus data ini?')) return;
    
    try {
      switch(currentTab) {
        case 'pesertaDidik': await masterData.deletePesertaDidik(id); break;
        case 'sarana': await masterData.deleteSarana(id); break;
        case 'tp': await masterData.deleteTP(id); break;
        case 'cp': await masterData.deleteCP(id); break;
        case 'atp': await masterData.deleteATP(id); break;
        case 'mapel': await masterData.deleteMapel(id); break;
        case 'kop': await masterData.deleteKopAdministrasi(id); break;
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
      loadTabData();
    });
  });
  
  loadTabData();
  
  return container;
}
