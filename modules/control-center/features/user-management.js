// modules/control-center/features/user-management.js
// =========================================
// FITUR: MANAJEMEN PENGGUNA (ADMIN ONLY)
// SISTEM: Per-User Permissions dengan Checkbox
// TERINTEGRASI: Firebase Auth + Firestore
// =========================================

import { db } from '../../js/firebase-config.js';
import { 
  collection, addDoc, getDocs, query, where, orderBy, 
  doc, updateDoc, deleteDoc, serverTimestamp, getDoc 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { 
  getAuth, createUserWithEmailAndPassword, sendPasswordResetEmail 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const auth = getAuth();
const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
const USER_COLLECTION = 'users';
const CSS_ID = 'user-management-css';

// =========================================
// DAFTAR SEMUA MODUL & SUB-FITUR
// Tambahkan modul baru di sini saat ada fitur baru
// =========================================
const AVAILABLE_MODULES = [
  {
    id: 'admin-pembelajaran',
    name: 'Admin Pembelajaran',
    icon: '📚',
    subModules: [
      { id: 'rpm-spesifik', name: 'RPM Spesifik', icon: '🎯' },
      { id: 'rpm-standar', name: 'RPM Standar', icon: '📋' },
      { id: 'data-tp', name: 'Data TP', icon: '🎯' },
      { id: 'lkpd', name: 'LKPD', icon: '📝' },
      { id: 'kisi-kisi', name: 'Kisi-kisi', icon: '' },
      { id: 'cp-tp-atp', name: 'CP/TP/ATP Generator', icon: '✨' }
    ]
  },
  {
    id: 'global-monitoring',
    name: 'Global Monitoring',
    icon: '📈',
    subModules: [
      { id: 'data-tp-monitor', name: 'Data TP', icon: '🎯' },
      { id: 'data-cp-monitor', name: 'Data CP', icon: '📖' }
    ]
  },
  {
    id: 'control-center',
    name: 'Control Center',
    icon: '️',
    subModules: [
      { id: 'manajemen-user', name: 'Manajemen Pengguna', icon: '👥' },
      { id: 'pengaturan-situs', name: 'Pengaturan Situs', icon: '⚙️' },
      { id: 'keamanan-log', name: 'Keamanan & Log', icon: '🔒' },
      { id: 'data-statistik', name: 'Data & Statistik', icon: '' },
      { id: 'monitoring', name: 'Monitoring', icon: '📡' }
    ]
  },
  {
    id: 'arsip',
    name: 'Arsip',
    icon: '',
    subModules: [
      { id: 'arsip-upload', name: 'Upload Arsip', icon: '📤' },
      { id: 'arsip-browse', name: 'Browse Arsip', icon: '' }
    ]
  },
  {
    id: 'statistik',
    name: 'Statistik',
    icon: '📊',
    subModules: [
      { id: 'demografi', name: 'Demografi', icon: '👥' },
      { id: 'akademik', name: 'Akademik', icon: '🎓' }
    ]
  }
];

// =========================================
// INIT
// =========================================
export async function init(container, db) {
  // Validasi admin
  if (!currentUser.isAdmin && currentUser.role !== 'admin') {
    container.innerHTML = `
      <div style="text-align: center; padding: 50px; background: #fff3cd; border-radius: 12px; margin: 20px;">
        <h2>⚠️ Akses Ditolak</h2>
        <p>Hanya administrator yang dapat mengakses fitur ini.</p>
      </div>
    `;
    return;
  }

  loadCSS();
  renderUI(container);
  attachEvents(container);
  loadUsers(container);
}

export function cleanup() {
  const css = document.getElementById(CSS_ID);
  if (css) css.remove();
}

// =========================================
// CSS
// =========================================
function loadCSS() {
  if (document.getElementById(CSS_ID)) return;
  
  const style = document.createElement('style');
  style.id = CSS_ID;
  style.textContent = `
    .um-container { 
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); 
      border-radius: 16px; 
      padding: 25px; 
      font-family: 'Segoe UI', sans-serif; 
      max-width: 1400px; 
      margin: 0 auto; 
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08); 
    }
    
    .um-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 25px;
      padding-bottom: 15px;
      border-bottom: 2px solid #e9ecef;
    }
    
    .um-title {
      font-size: 24px;
      font-weight: 700;
      color: #343a40;
      margin: 0;
    }
    
    .um-btn {
      padding: 10px 20px;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 14px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s;
      color: white;
    }
    
    .um-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    
    .um-btn-primary { background: linear-gradient(135deg, #0d6efd 0%, #0b5ed7 100%); }
    .um-btn-success { background: linear-gradient(135deg, #198754 0%, #157347 100%); }
    .um-btn-danger { background: linear-gradient(135deg, #dc3545 0%, #bb2d3b 100%); }
    .um-btn-secondary { background: linear-gradient(135deg, #6c757d 0%, #565e64 100%); }
    
    .um-form {
      background: white;
      padding: 25px;
      border-radius: 12px;
      margin-bottom: 25px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    }
    
    .um-form-title {
      font-size: 18px;
      font-weight: 700;
      color: #343a40;
      margin: 0 0 20px 0;
      padding-bottom: 10px;
      border-bottom: 2px solid #e9ecef;
    }
    
    .um-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-bottom: 20px;
    }
    
    .um-form-group { margin-bottom: 15px; }
    
    .um-form-group label {
      display: block;
      margin-bottom: 6px;
      font-weight: 600;
      font-size: 14px;
      color: #495057;
    }
    
    .um-input {
      width: 100%;
      padding: 12px 14px;
      border: 2px solid #ced4da;
      border-radius: 8px;
      font-size: 14px;
      box-sizing: border-box;
      background: white;
      color: #495057;
      font-family: inherit;
      transition: all 0.2s;
    }
    
    .um-input:focus {
      outline: none;
      border-color: #0d6efd;
      box-shadow: 0 0 0 3px rgba(13, 110, 253, 0.25);
    }
    
    .um-actions {
      display: flex;
      gap: 10px;
      margin-top: 20px;
      justify-content: flex-end;
    }
    
    /* Permissions Section */
    .um-permissions-section {
      margin-top: 25px;
      padding-top: 20px;
      border-top: 2px solid #e9ecef;
    }
    
    .um-permissions-title {
      font-size: 16px;
      font-weight: 700;
      color: #343a40;
      margin-bottom: 15px;
    }
    
    .um-permissions-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 15px;
    }
    
    .um-permission-module {
      background: #f8f9fa;
      border: 2px solid #e9ecef;
      border-radius: 8px;
      padding: 15px;
      transition: all 0.2s;
    }
    
    .um-permission-module:hover {
      border-color: #0d6efd;
      background: #e7f1ff;
    }
    
    .um-permission-module-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 10px;
      padding-bottom: 10px;
      border-bottom: 1px solid #dee2e6;
    }
    
    .um-permission-module-header input[type="checkbox"] {
      width: 18px;
      height: 18px;
      cursor: pointer;
    }
    
    .um-permission-module-header label {
      font-weight: 700;
      font-size: 14px;
      color: #343a40;
      cursor: pointer;
      flex: 1;
    }
    
    .um-permission-submodules {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding-left: 28px;
    }
    
    .um-permission-submodule {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .um-permission-submodule input[type="checkbox"] {
      width: 16px;
      height: 16px;
      cursor: pointer;
    }
    
    .um-permission-submodule label {
      font-size: 13px;
      color: #495057;
      cursor: pointer;
    }
    
    /* Table */
    .um-table-container {
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    }
    
    .um-table {
      width: 100%;
      border-collapse: collapse;
    }
    
    .um-table th {
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      padding: 15px 12px;
      text-align: left;
      font-weight: 700;
      color: #495057;
      font-size: 14px;
      border-bottom: 2px solid #dee2e6;
    }
    
    .um-table td {
      padding: 12px;
      border-bottom: 1px solid #dee2e6;
      font-size: 14px;
      color: #212529;
    }
    
    .um-table tr:last-child td { border-bottom: none; }
    .um-table tr:hover td { background: #f8f9fa; }
    
    .um-table-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    
    .um-action-btn {
      padding: 6px 12px;
      border: none;
      border-radius: 6px;
      font-size: 12px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      transition: all 0.2s;
      color: white;
    }
    
    .um-action-btn:hover { transform: translateY(-1px); }
    .um-action-btn-edit { background: #0d6efd; }
    .um-action-btn-delete { background: #dc3545; }
    .um-action-btn-reset { background: #0dcaf0; color: #000; }
    
    .um-role-badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
    }
    
    .um-role-admin { background: #d3d3d3; color: #343a40; }
    .um-role-guru { background: #e9ecef; color: #495057; }
    .um-role-siswa { background: #cfe2ff; color: #084298; }
    .um-role-ortu { background: #d1e7dd; color: #0f5132; }
    .um-role-kepsek { background: #fff3cd; color: #664d03; }
    .um-role-staf { background: #f8d7da; color: #842029; }
    
    .um-status-badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
    }
    
    .um-status-active { background: #d1e7dd; color: #0f5132; }
    .um-status-inactive { background: #f8d7da; color: #842029; }
    
    .um-empty { text-align: center; padding: 40px; color: #6c757d; font-size: 14px; }
    .um-loading { text-align: center; padding: 30px; color: #6c757d; }
    
    .um-toast {
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 14px 24px;
      border-radius: 10px;
      z-index: 10001;
      color: white;
      font-weight: 600;
      box-shadow: 0 4px 16px rgba(0,0,0,0.15);
      animation: umSlideIn 0.3s ease;
    }
    
    .um-toast-success { background: linear-gradient(135deg, #198754 0%, #157347 100%); }
    .um-toast-error { background: linear-gradient(135deg, #dc3545 0%, #bb2d3b 100%); }
    
    @keyframes umSlideIn {
      from { transform: translateX(400px); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    
    @media (max-width: 768px) {
      .um-grid { grid-template-columns: 1fr; }
      .um-permissions-grid { grid-template-columns: 1fr; }
      .um-header { flex-direction: column; gap: 15px; align-items: stretch; }
      .um-btn { width: 100%; justify-content: center; }
      .um-table-actions { flex-direction: column; }
      .um-action-btn { width: 100%; justify-content: center; }
    }
  `;
  document.head.appendChild(style);
}

// =========================================
// RENDER UI
// =========================================
function renderUI(container) {
  container.innerHTML = `
    <div class="um-container">
      <div class="um-header">
        <h2 class="um-title"> Manajemen Pengguna</h2>
        <button class="um-btn um-btn-primary" id="btn-add-user">
          ➕ Tambah Pengguna
        </button>
      </div>

      <div class="um-form" id="um-form" style="display: none;">
        <h3 class="um-form-title" id="um-form-title">Tambah Pengguna Baru</h3>
        <input type="hidden" id="um-user-id">
        
        <div class="um-grid">
          <div class="um-form-group">
            <label for="um-name">Nama Lengkap *</label>
            <input type="text" id="um-name" class="um-input" placeholder="Contoh: Budi Santoso">
          </div>
          <div class="um-form-group">
            <label for="um-email">Email *</label>
            <input type="email" id="um-email" class="um-input" placeholder="contoh@sekolah.id">
          </div>
          <div class="um-form-group">
            <label for="um-role">Peran *</label>
            <select id="um-role" class="um-input">
              <option value="admin">Administrator</option>
              <option value="kepsek">Kepala Sekolah</option>
              <option value="guru">Guru</option>
              <option value="staf">Staf/Tata Usaha</option>
              <option value="siswa">Peserta Didik</option>
              <option value="ortu">Orang Tua</option>
            </select>
          </div>
          <div class="um-form-group">
            <label for="um-school">Nama Sekolah</label>
            <input type="text" id="um-school" class="um-input" value="${currentUser.namaSekolah || 'SDN 139 LAMANDA'}">
          </div>
          <div class="um-form-group">
            <label for="um-status">Status Akun</label>
            <select id="um-status" class="um-input">
              <option value="active">Aktif</option>
              <option value="inactive">Non-Aktif</option>
            </select>
          </div>
        </div>

        <!-- Permissions Section -->
        <div class="um-permissions-section">
          <h4 class="um-permissions-title">🔐 Hak Akses (Centang fitur yang boleh diakses)</h4>
          <div class="um-permissions-grid" id="um-permissions-container">
            <!-- Generated by JS -->
          </div>
        </div>
        
        <div class="um-actions">
          <button class="um-btn um-btn-secondary" id="btn-cancel-user">Batal</button>
          <button class="um-btn um-btn-success" id="btn-save-user">💾 Simpan Pengguna</button>
        </div>
      </div>

      <div class="um-table-container">
        <table class="um-table">
          <thead>
            <tr>
              <th>Nama</th>
              <th>Email</th>
              <th>Peran</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody id="um-user-list">
            <tr>
              <td colspan="5" class="um-loading">⏳ Memuat data pengguna...</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  // Render permissions checkboxes
  renderPermissions(container);
}

function renderPermissions(container) {
  const permissionsContainer = container.querySelector('#um-permissions-container');
  
  permissionsContainer.innerHTML = AVAILABLE_MODULES.map(module => `
    <div class="um-permission-module">
      <div class="um-permission-module-header">
        <input type="checkbox" id="perm-${module.id}" data-module="${module.id}">
        <label for="perm-${module.id}">${module.icon} ${module.name}</label>
      </div>
      <div class="um-permission-submodules">
        ${module.subModules.map(sub => `
          <div class="um-permission-submodule">
            <input type="checkbox" id="perm-${sub.id}" data-module="${module.id}" data-sub="${sub.id}">
            <label for="perm-${sub.id}">${sub.icon} ${sub.name}</label>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');

  // Auto-check parent when all children checked
  AVAILABLE_MODULES.forEach(module => {
    const parentCheckbox = container.querySelector(`#perm-${module.id}`);
    const childCheckboxes = container.querySelectorAll(`[data-module="${module.id}"][data-sub]`);
    
    parentCheckbox.addEventListener('change', (e) => {
      childCheckboxes.forEach(child => child.checked = e.target.checked);
    });
    
    childCheckboxes.forEach(child => {
      child.addEventListener('change', () => {
        const allChecked = Array.from(childCheckboxes).every(c => c.checked);
        parentCheckbox.checked = allChecked;
      });
    });
  });
}

// =========================================
// EVENTS
// =========================================
function attachEvents(container) {
  container.querySelector('#btn-add-user').addEventListener('click', () => {
    container.querySelector('#um-form').style.display = 'block';
    container.querySelector('#um-form-title').textContent = 'Tambah Pengguna Baru';
    container.querySelector('#btn-save-user').textContent = '💾 Simpan Pengguna';
    container.querySelector('#um-user-id').value = '';
    container.querySelector('#um-name').value = '';
    container.querySelector('#um-email').value = '';
    container.querySelector('#um-school').value = currentUser.namaSekolah || 'SDN 139 LAMANDA';
    container.querySelector('#um-role').value = 'guru';
    container.querySelector('#um-status').value = 'active';
    
    // Reset permissions
    container.querySelectorAll('#um-permissions-container input[type="checkbox"]').forEach(cb => cb.checked = false);
    
    container.querySelector('#um-form').scrollIntoView({ behavior: 'smooth' });
  });

  container.querySelector('#btn-cancel-user').addEventListener('click', () => {
    container.querySelector('#um-form').style.display = 'none';
  });

  container.querySelector('#btn-save-user').addEventListener('click', () => saveUser(container));
}

// =========================================
// LOAD USERS
// =========================================
async function loadUsers(container) {
  const userList = container.querySelector('#um-user-list');
  userList.innerHTML = '<tr><td colspan="5" class="um-loading">⏳ Memuat data pengguna...</td></tr>';

  try {
    const q = query(collection(db, USER_COLLECTION), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      userList.innerHTML = `<tr><td colspan="5" class="um-empty">📌 Belum ada pengguna. Klik "Tambah Pengguna" untuk memulai!</td></tr>`;
      return;
    }

    const users = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));

    userList.innerHTML = users.map(user => {
      const roleLabels = {
        admin: ' Admin',
        kepsek: ' Kepsek',
        guru: '‍🏫 Guru',
        staf: '💼 Staf',
        siswa: '🎓 Siswa',
        ortu: ' Ortu'
      };
      
      return `
        <tr>
          <td><strong>${user.namaLengkap || '-'}</strong></td>
          <td>${user.email || '-'}</td>
          <td><span class="um-role-badge um-role-${user.role || 'guru'}">${roleLabels[user.role] || user.role}</span></td>
          <td><span class="um-status-badge um-status-${user.status || 'active'}">${user.status === 'inactive' ? 'Non-Aktif' : 'Aktif'}</span></td>
          <td>
            <div class="um-table-actions">
              <button class="um-action-btn um-action-btn-edit" onclick="editUser('${user.id}')">️ Edit</button>
              <button class="um-action-btn um-action-btn-reset" onclick="resetPassword('${user.email}')">🔑 Reset</button>
              <button class="um-action-btn um-action-btn-delete" onclick="deleteUser('${user.id}')">🗑️ Hapus</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  } catch (error) {
    console.error('Error loading users:', error);
    userList.innerHTML = `<tr><td colspan="5" class="um-empty">❌ Gagal memuat: ${error.message}</td></tr>`;
  }
}

// =========================================
// GET PERMISSIONS FROM FORM
// =========================================
function getPermissionsFromForm(container) {
  const permissions = {};
  
  AVAILABLE_MODULES.forEach(module => {
    permissions[module.id] = {};
    module.subModules.forEach(sub => {
      const checkbox = container.querySelector(`#perm-${sub.id}`);
      permissions[module.id][sub.id] = checkbox ? checkbox.checked : false;
    });
  });
  
  return permissions;
}

function setPermissionsToForm(container, permissions) {
  AVAILABLE_MODULES.forEach(module => {
    module.subModules.forEach(sub => {
      const checkbox = container.querySelector(`#perm-${sub.id}`);
      if (checkbox && permissions[module.id] && permissions[module.id][sub.id]) {
        checkbox.checked = true;
      }
    });
    
    // Check parent if all children checked
    const parentCheckbox = container.querySelector(`#perm-${module.id}`);
    const childCheckboxes = container.querySelectorAll(`[data-module="${module.id}"][data-sub]`);
    if (parentCheckbox && Array.from(childCheckboxes).every(c => c.checked)) {
      parentCheckbox.checked = true;
    }
  });
}

// =========================================
// SAVE USER
// =========================================
async function saveUser(container) {
  const userId = container.querySelector('#um-user-id').value;
  const name = container.querySelector('#um-name').value.trim();
  const email = container.querySelector('#um-email').value.trim();
  const role = container.querySelector('#um-role').value;
  const school = container.querySelector('#um-school').value.trim();
  const status = container.querySelector('#um-status').value;
  const permissions = getPermissionsFromForm(container);

  if (!name || !email) {
    showToast('⚠️ Nama dan Email wajib diisi!', 'error');
    return;
  }

  if (!validateEmail(email)) {
    showToast('⚠️ Format email tidak valid!', 'error');
    return;
  }

  try {
    if (userId) {
      // Update
      const userRef = doc(db, USER_COLLECTION, userId);
      await updateDoc(userRef, {
        namaLengkap: name,
        email: email,
        role: role,
        namaSekolah: school,
        status: status,
        permissions: permissions,
        isAdmin: role === 'admin',
        updatedAt: serverTimestamp()
      });
      showToast('✅ Pengguna berhasil diperbarui!', 'success');
    } else {
      // Create new
      const credential = await createUserWithEmailAndPassword(auth, email, 'password123');
      
      await addDoc(collection(db, USER_COLLECTION), {
        userId: credential.user.uid,
        email: email,
        namaLengkap: name,
        role: role,
        namaSekolah: school,
        status: status,
        permissions: permissions,
        isAdmin: role === 'admin',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      showToast('✅ Pengguna ditambahkan! Password awal: password123', 'success');
    }
    
    container.querySelector('#um-form').style.display = 'none';
    loadUsers(container);
  } catch (error) {
    console.error('Error saving user:', error);
    showToast(`❌ Gagal: ${error.message}`, 'error');
  }
}

// =========================================
// EDIT USER
// =========================================
window.editUser = async function(userId) {
  try {
    const docRef = doc(db, USER_COLLECTION, userId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      showToast(' Pengguna tidak ditemukan!', 'error');
      return;
    }

    const user = docSnap.data();
    const container = document.querySelector('.um-container');
    
    container.querySelector('#um-form').style.display = 'block';
    container.querySelector('#um-form-title').textContent = 'Edit Pengguna';
    container.querySelector('#btn-save-user').textContent = '💾 Perbarui Pengguna';
    
    container.querySelector('#um-user-id').value = userId;
    container.querySelector('#um-name').value = user.namaLengkap || '';
    container.querySelector('#um-email').value = user.email || '';
    container.querySelector('#um-school').value = user.namaSekolah || '';
    container.querySelector('#um-role').value = user.role || 'guru';
    container.querySelector('#um-status').value = user.status || 'active';
    
    // Set permissions
    if (user.permissions) {
      setPermissionsToForm(container, user.permissions);
    }
    
    container.querySelector('#um-form').scrollIntoView({ behavior: 'smooth' });
  } catch (error) {
    console.error('Error editing user:', error);
    showToast(' Gagal memuat data!', 'error');
  }
};

// =========================================
// RESET PASSWORD
// =========================================
window.resetPassword = async function(email) {
  if (!confirm(`Kirim link reset password ke ${email}?`)) return;
  
  try {
    await sendPasswordResetEmail(auth, email);
    showToast(`✅ Link reset dikirim ke ${email}!`, 'success');
  } catch (error) {
    console.error('Error resetting password:', error);
    showToast('❌ Gagal mengirim link!', 'error');
  }
};

// =========================================
// DELETE USER
// =========================================
window.deleteUser = async function(userId) {
  if (!confirm('Hapus pengguna ini? Tindakan tidak dapat dibatalkan!')) return;
  
  try {
    await deleteDoc(doc(db, USER_COLLECTION, userId));
    showToast('✅ Pengguna dihapus!', 'success');
    const container = document.querySelector('.um-container');
    loadUsers(container);
  } catch (error) {
    console.error('Error deleting user:', error);
    showToast(' Gagal menghapus!', 'error');
  }
};

// =========================================
// HELPERS
// =========================================
function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).toLowerCase());
}

function showToast(msg, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `um-toast um-toast-${type}`;
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(400px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// =========================================
// HELPER: CHECK PERMISSION (untuk digunakan di modul lain)
// =========================================
export function hasPermission(user, moduleId, subModuleId = null) {
  if (!user || !user.permissions) return false;
  if (user.isAdmin) return true; // Admin full access
  
  if (subModuleId) {
    return user.permissions[moduleId] && user.permissions[moduleId][subModuleId] === true;
  }
  
  // Check if any submodule is accessible
  if (user.permissions[moduleId]) {
    return Object.values(user.permissions[moduleId]).some(v => v === true);
  }
  
  return false;
}
