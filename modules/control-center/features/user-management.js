// modules/control-center/features/user-management.js
// FINAL V4 FULL - TIDAK ADA YANG DIKURANGI - 760+ BARIS
// BUILD: 2026-09-01
// LOGIC: Lama + Baru + Folder NPSN + Alert + Hook Tombol Luar

import { db, firebaseConfig } from '../../../js/firebase-config.js';
import { 
  collection, 
  query, 
  orderBy, 
  doc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp, 
  getDoc, 
  setDoc, 
  onSnapshot, 
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail, 
  fetchSignInMethodsForEmail
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const auth = getAuth();
const secondaryApp = firebaseConfig ? initializeApp(firebaseConfig, "SecondaryAdminApp") : null;
const secondaryAuth = secondaryApp ? getAuth(secondaryApp) : auth;

const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
const userRoleLegacy = localStorage.getItem('userRole');
const USER_COLLECTION = 'users';
const SEKOLAH_COLLECTION = 'sekolah';
const CSS_ID = 'user-management-css';
const NAMA_SEKOLAH = currentUser.namaSekolah || 'SDN 139 LAMANDA';
const PASSWORD_DEFAULT = 'bilal2011';
const LOGIN_URL = 'https://hasriandibasi80-rgb.github.io/SDN139LAMANDA/dashboard.html';

const AVAILABLE_MODULES = [
  {
    id: 'admin-pembelajaran',
    name: 'Admin Pembelajaran',
    icon: '📚',
    subModules: [
      { id: 'cp-tp-atp', name: 'CP, TP, & ATP', icon: '🎯' },
      { id: 'program-tahunan', name: 'Program Tahunan', icon: '📅' },
      { id: 'program-semester', name: 'Program Semester', icon: '📆' },
      { id: 'lckh', name: 'LCKH', icon: '' },
      { id: 'jurnal-harian', name: 'Jurnal Harian', icon: '📝' },
      { id: 'bank-soal', name: 'Bank Soal', icon: '❓' },
      { id: 'analisis-kktp', name: 'Analisis KKTP', icon: '' },
      { id: 'rumus-8-3-3-4', name: 'Rumus 8-3-3-4', icon: '🔢' },
      { id: 'refleksi-guru', name: 'Refleksi Guru', icon: '🔍' },
      { id: 'kalender-pendidikan', name: 'Kalender Pendidikan', icon: '📅' },
      { id: 'jadwal-pembelajaran', name: 'Jadwal Pembelajaran', icon: '⏰' },
      { id: 'presensi-siswa', name: 'Presensi Siswa', icon: '✅' },
      { id: 'lkpd', name: 'LKPD', icon: '📄' },
      { id: 'penilaian', name: 'Penilaian', icon: '' },
      { id: 'pembuat-soal', name: 'Pembuat Soal', icon: '✍' },
      { id: 'pembuat-kisi-kisi', name: 'Pembuat Kisi-kisi', icon: '📋' },
      { id: 'bank-rpm', name: 'BANK RPM', icon: '📝' },
      { id: 'rpm-spesifik', name: 'RPM Spesifik', icon: '' }
    ]
  },
  {
    id: 'global-monitoring',
    name: 'Global Monitoring',
    icon: '📈',
    subModules: [
      { id: 'data-peserta-didik', name: 'Data Peserta Didik', icon: '👨🎓' },
      { id: 'supervisi-akademik', name: 'Supervisi Akademik', icon: '' },
      { id: 'aset-sarana', name: 'Aset Sarana', icon: '🏫' },
      { id: 'master-data', name: 'Master Data', icon: '' },
      { id: 'evaluasi-mandiri', name: 'Evaluasi Mandiri', icon: '📊' },
      { id: 'data-tp', name: 'Data TP', icon: '🎯' }
    ]
  },
  {
    id: 'control-center',
    name: 'Control Center',
    icon: '⚙',
    subModules: [
      { id: 'manajemen-user', name: 'Manajemen Pengguna', icon: '' },
      { id: 'pengaturan-situs', name: 'Pengaturan Situs', icon: '⚙' },
      { id: 'keamanan-log', name: 'Keamanan & Log', icon: '🔒' },
      { id: 'data-statistik', name: 'Data & Statistik', icon: '📊' },
      { id: 'monitoring', name: 'Monitoring', icon: '📡' }
    ]
  },
  {
    id: 'e-dokumen',
    name: 'E-Dokumen',
    icon: '',
    subModules: [
      { id: 'arsip', name: 'Arsip', icon: '🗄' },
      { id: 'upload-file', name: 'Upload File', icon: '📤' },
      { id: 'laporan', name: 'Laporan', icon: '📄' }
    ]
  },
  {
    id: 'e-portal',
    name: 'E-Portal',
    icon: '',
    subModules: [
      { id: 'simpkb', name: 'SIMPKB', icon: '👨' },
      { id: 'sindara', name: 'Sindara', icon: '🏫' },
      { id: 'simacca', name: 'SIMACCA', icon: '📚' },
      { id: 'data-perpustakaan', name: 'Data Perpustakaan', icon: '📖' }
    ]
  },
  {
    id: 'data-statistik',
    name: 'Data Statistik',
    icon: '📊',
    subModules: [
      { id: 'statistik-gtk', name: 'Statistik GTK', icon: '' },
      { id: 'monitoring', name: 'Monitoring', icon: '' },
      { id: 'bantuan-ai', name: 'Bantuan AI', icon: '🤖' }
    ]
  }
];

let dbInstance = db;
let unsubscribe = null;
let activeContainer = null;
let currentNPSN = currentUser.idSekolah || currentUser.npsn || '';

function getAllFeatureNames() {
  return AVAILABLE_MODULES.flatMap(m => m.subModules.map(s => s.name));
}

function getDefaultHakAksesByRole(role) {
  const all = getAllFeatureNames();
  const defaults = {
    admin: all,
    kepsek: all,
    guru: ['CP, TP, & ATP', 'Program Tahunan', 'Program Semester', 'LCKH', 'Jurnal Harian', 'Analisis KKTP', 'Rumus 8-3-3-4', 'Refleksi Guru', 'Kalender Pendidikan', 'Jadwal Pembelajaran', 'Presensi Siswa', 'LKPD', 'Penilaian', 'Pembuat Soal', 'Pembuat Kisi-kisi', 'BANK RPM', 'RPM Spesifik', 'Bantuan AI'],
    staf: ['Kalender Pendidikan', 'Jadwal Pembelajaran', 'Presensi Siswa', 'Bank Soal'],
    siswa: ['Jadwal Pembelajaran', 'Kalender Pendidikan'],
    ortu: ['Jadwal Pembelajaran', 'Kalender Pendidikan', 'Presensi Siswa']
  };
  return defaults[role] || [];
}

function getInisial(nama) {
  if (!nama) return '?';
  return nama.trim().split(' ').slice(0, 2).map(n => n[0].toUpperCase()).join('');
}

function formatTanggal(timestamp) {
  if (!timestamp) return '-';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function getUserQuery() {
  const npsnInput = document.getElementById('um-npsn')?.value?.trim() || currentNPSN;
  if (npsnInput) {
    return { path: `${SEKOLAH_COLLECTION}/${npsnInput}/${USER_COLLECTION}`, npsn: npsnInput };
  }
  return { path: USER_COLLECTION, npsn: '' };
}

export async function init(container, dbParam) {
  activeContainer = container;
  dbInstance = dbParam || db;
  const isAdmin = currentUser.isAdmin || currentUser.role === 'admin' || userRoleLegacy === 'admin';
  if (!isAdmin) {
    container.innerHTML = `<div style="text-align:center;padding:50px;background:#fff3cd;border-radius:12px;margin:20px;"><h2>⚠ Akses Ditolak</h2><p>Hanya administrator.</p></div>`;
    return;
  }
  loadCSS();
  renderUI(container);
  attachEvents(container);
  hookExternalSaveButton();
  startListening(container);
}

export function cleanup() {
  if (unsubscribe) { unsubscribe(); unsubscribe = null; }
  const css = document.getElementById(CSS_ID);
  if (css) css.remove();
}

function hookExternalSaveButton() {
  const externalBtn = document.getElementById('btnSimpanUser');
  const bigBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Simpan Semua Perubahan'));
  [externalBtn, bigBtn].forEach(btn => {
    if (btn && !btn.dataset.hooked) {
      btn.dataset.hooked = '1';
      btn.addEventListener('click', () => {
        const container = document.querySelector('.um-container') || activeContainer;
        if (container) saveUser(container);
      });
    }
  });
}

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
      flex-wrap: wrap;
      gap: 10px;
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
      flex-wrap: wrap;
    }
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
    .um-action-btn-wa { background: #25D366; }
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
    .um-status-active, .um-status-aktif { background: #d1e7dd; color: #0f5132; }
    .um-status-inactive, .um-status-non-aktif { background: #f8d7da; color: #842029; }
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
      white-space: pre-wrap;
      max-width: 90vw;
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

function renderUI(container) {
  container.innerHTML = `
    <div class="um-container">
      <div class="um-header">
        <h2 class="um-title">Manajemen Pengguna</h2>
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <input type="text" id="um-search" placeholder="🔍 Cari nama/email/role..." style="padding:10px 14px;border:1px solid #cbd5e1;border-radius:8px;font-size:14px;min-width:220px;">
          <button class="um-btn um-btn-primary" id="btn-add-user">➕ Tambah Pengguna</button>
        </div>
      </div>
      <div class="um-form" id="um-form" style="display: none;">
        <h3 class="um-form-title" id="um-form-title">Tambah Pengguna Baru</h3>
        <input type="hidden" id="um-user-id">
        <div class="um-grid">
          <div class="um-form-group"><label>Nama Lengkap *</label><input type="text" id="um-name" class="um-input" placeholder="Budi Santoso"></div>
          <div class="um-form-group"><label>Email *</label><input type="email" id="um-email" class="um-input" placeholder="contoh@sekolah.id"></div>
          <div class="um-form-group"><label>Nomor WhatsApp *</label><input type="tel" id="um-wa" class="um-input" placeholder="08123456789"></div>
          <div class="um-form-group"><label>NPSN Sekolah *</label><input type="text" id="um-npsn" class="um-input" placeholder="40312952" value="${currentUser.idSekolah || currentNPSN}"></div>
          <div class="um-form-group"><label>Peran *</label><select id="um-role" class="um-input"><option value="admin">Administrator</option><option value="kepsek">Kepala Sekolah</option><option value="guru" selected>Guru</option><option value="staf">Staf/TU</option><option value="siswa">Peserta Didik</option><option value="ortu">Orang Tua</option></select></div>
          <div class="um-form-group"><label>Nama Sekolah</label><input type="text" id="um-school" class="um-input" value="${NAMA_SEKOLAH}"></div>
          <div class="um-form-group"><label>Status</label><select id="um-status" class="um-input"><option value="aktif">Aktif</option><option value="non-aktif">Non-Aktif</option></select></div>
          <div class="um-form-group"><label>Password Default</label><input type="text" value="${PASSWORD_DEFAULT}" readonly class="um-input" style="background:#f1f5f9;"></div>
        </div>
        <div class="um-permissions-section"><h4 class="um-permissions-title">🔐 Hak Akses</h4><div class="um-permissions-grid" id="um-permissions-container"></div></div>
        <div class="um-actions"><button class="um-btn um-btn-secondary" id="btn-cancel-user">Batal</button><button class="um-btn um-btn-success" id="btn-save-user">💾 Simpan Pengguna</button></div>
      </div>
      <div id="um-status" style="display:none;margin-bottom:15px;padding:12px;border-radius:8px;font-weight:600;"></div>
      <div class="um-table-container"><table class="um-table"><thead><tr><th>Nama</th><th>Email / WA</th><th>Peran</th><th>Status</th><th>Aksi</th></tr></thead><tbody id="um-user-list"><tr><td colspan="5" class="um-loading">⏳ Memuat data pengguna...</td></tr></tbody></table></div>
    </div>
  `;
  renderPermissions(container);
}

function renderPermissions(container) {
  const permissionsContainer = container.querySelector('#um-permissions-container');
  permissionsContainer.innerHTML = AVAILABLE_MODULES.map(module => `
    <div class="um-permission-module" data-group="${module.id}">
      <div class="um-permission-module-header">
        <input type="checkbox" id="perm-${module.id}" data-module="${module.id}" class="perm-parent">
        <label for="perm-${module.id}">${module.icon} ${module.name}</label>
        <span style="font-size:12px;color:#3b82f6;cursor:pointer;" class="check-all" data-group="${module.id}">Pilih Semua</span>
      </div>
      <div class="um-permission-submodules">
        ${module.subModules.map(sub => `
          <div class="um-permission-submodule">
            <input type="checkbox" id="perm-${sub.id}" data-module="${module.id}" data-sub="${sub.id}" value="${sub.name}" class="perm-child">
            <label for="perm-${sub.id}">${sub.icon} ${sub.name}</label>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');
  AVAILABLE_MODULES.forEach(module => {
    const parentCheckbox = container.querySelector(`#perm-${module.id}`);
    const childCheckboxes = container.querySelectorAll(`.perm-child[data-module="${module.id}"]`);
    const checkAll = container.querySelector(`.check-all[data-group="${module.id}"]`);
    if (parentCheckbox) {
      parentCheckbox.addEventListener('change', (e) => {
        childCheckboxes.forEach(child => child.checked = e.target.checked);
      });
    }
    if (checkAll) {
      checkAll.addEventListener('click', () => {
        const allChecked = Array.from(childCheckboxes).every(c => c.checked);
        childCheckboxes.forEach(c => c.checked = !allChecked);
        if (parentCheckbox) parentCheckbox.checked = !allChecked;
      });
    }
    childCheckboxes.forEach(child => {
      child.addEventListener('change', () => {
        if (parentCheckbox) parentCheckbox.checked = Array.from(childCheckboxes).every(c => c.checked);
      });
    });
  });
}

function attachEvents(container) {
  container.querySelector('#btn-add-user').addEventListener('click', () => {
    container.querySelector('#um-form').style.display = 'block';
    container.querySelector('#um-form-title').textContent = 'Tambah Pengguna Baru';
    container.querySelector('#btn-save-user').textContent = '💾 Simpan Pengguna';
    container.querySelector('#um-user-id').value = '';
    container.querySelector('#um-name').value = '';
    container.querySelector('#um-email').value = '';
    container.querySelector('#um-wa').value = '';
    container.querySelector('#um-npsn').value = currentUser.idSekolah || currentNPSN;
    container.querySelector('#um-school').value = NAMA_SEKOLAH;
    container.querySelector('#um-role').value = 'guru';
    container.querySelector('#um-status').value = 'aktif';
    const defaults = getDefaultHakAksesByRole('guru');
    container.querySelectorAll('.perm-child').forEach(cb => cb.checked = defaults.includes(cb.value));
    AVAILABLE_MODULES.forEach(m => {
      const parent = container.querySelector(`#perm-${m.id}`);
      const childs = container.querySelectorAll(`.perm-child[data-module="${m.id}"]`);
      if (parent) parent.checked = Array.from(childs).every(c => c.checked) && childs.length > 0;
    });
    container.querySelector('#um-form').scrollIntoView({ behavior: 'smooth' });
  });
  container.querySelector('#btn-cancel-user').addEventListener('click', () => {
    container.querySelector('#um-form').style.display = 'none';
  });
  container.querySelector('#btn-save-user').addEventListener('click', () => saveUser(container));
  container.querySelector('#um-role').addEventListener('change', e => {
    const defaults = getDefaultHakAksesByRole(e.target.value);
    container.querySelectorAll('.perm-child').forEach(cb => cb.checked = defaults.includes(cb.value));
    AVAILABLE_MODULES.forEach(m => {
      const parent = container.querySelector(`#perm-${m.id}`);
      const childs = container.querySelectorAll(`.perm-child[data-module="${m.id}"]`);
      if (parent) parent.checked = Array.from(childs).every(c => c.checked) && childs.length > 0;
    });
  });
  container.querySelector('#um-search').addEventListener('input', e => {
    const kw = e.target.value.toLowerCase();
    container.querySelectorAll('#um-user-list tr').forEach(tr => {
      tr.style.display = tr.textContent.toLowerCase().includes(kw) ? '' : 'none';
    });
  });
}

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

function getHakAksesArrayFromForm(container) {
  return [...container.querySelectorAll('.perm-child:checked')].map(cb => cb.value);
}

function setPermissionsToForm(container, permissions, hakAksesArray = []) {
  AVAILABLE_MODULES.forEach(module => {
    module.subModules.forEach(sub => {
      const checkbox = container.querySelector(`#perm-${sub.id}`);
      if (!checkbox) return;
      if (permissions && permissions[module.id] && typeof permissions[module.id][sub.id] !== 'undefined') {
        checkbox.checked = !!permissions[module.id][sub.id];
      } else if (hakAksesArray.length) {
        checkbox.checked = hakAksesArray.includes(sub.name);
      }
    });
    const parent = container.querySelector(`#perm-${module.id}`);
    const childs = container.querySelectorAll(`.perm-child[data-module="${module.id}"]`);
    if (parent) parent.checked = childs.length > 0 && Array.from(childs).every(c => c.checked);
  });
}

function startListening(container) {
  const userList = container.querySelector('#um-user-list');
  userList.innerHTML = '<tr><td colspan="5" class="um-loading">⏳ Memuat data pengguna...</td></tr>';
  const { npsn } = getUserQuery();
  const colRef = npsn ? collection(dbInstance, SEKOLAH_COLLECTION, npsn, USER_COLLECTION) : collection(dbInstance, USER_COLLECTION);
  try {
    const q = query(colRef, orderBy('createdAt', 'desc'));
    unsubscribe = onSnapshot(q, snapshot => {
      if (snapshot.empty) {
        if (npsn) { loadUsersFallback(container); return; }
        userList.innerHTML = `<tr><td colspan="5" class="um-empty">Belum ada pengguna di NPSN ${npsn || '-'}.</td></tr>`;
        return;
      }
      const users = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      renderUserTable(container, users);
    }, () => loadUsersFallback(container));
  } catch (e) {
    loadUsersFallback(container);
  }
}

async function loadUsersFallback(container) {
  const userList = container.querySelector('#um-user-list');
  try {
    const { npsn } = getUserQuery();
    let snap;
    if (npsn) {
      snap = await getDocs(collection(dbInstance, SEKOLAH_COLLECTION, npsn, USER_COLLECTION));
      if (snap.empty) snap = await getDocs(collection(dbInstance, USER_COLLECTION));
    } else {
      snap = await getDocs(collection(dbInstance, USER_COLLECTION));
    }
    const users = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => {
      const ta = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
      const tb = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
      return tb - ta;
    });
    if (users.length === 0) userList.innerHTML = `<tr><td colspan="5" class="um-empty">Belum ada pengguna.</td></tr>`;
    else renderUserTable(container, users);
  } catch (err) {
    userList.innerHTML = `<tr><td colspan="5" class="um-empty">❌ Gagal: ${err.message}</td></tr>`;
  }
}

function renderUserTable(container, users) {
  const userList = container.querySelector('#um-user-list');
  userList.innerHTML = users.map(user => {
    const roleLabels = { admin: 'Admin', kepsek: 'Kepsek', guru: 'Guru', staf: 'Staf', siswa: 'Siswa', ortu: 'Ortu' };
    const statusVal = user.status || 'aktif';
    const statusLabel = statusVal === 'aktif' || statusVal === 'active' ? 'Aktif' : 'Non-Aktif';
    const passBadge = user.passwordChanged ? '✅' : '⚠';
    const noWA = user.noWA || '-';
    const created = formatTanggal(user.createdAt);
    return `
      <tr>
        <td><strong>${user.nama || user.namaLengkap || '-'}</strong> ${passBadge}<br><small style="color:#64748b;">${user.idSekolah || user.npsn || ''} • ${created}</small></td>
        <td>${user.email || '-'}<br><small style="color:#64748b;">${noWA}</small></td>
        <td><span class="um-role-badge um-role-${user.role || 'guru'}">${roleLabels[user.role] || user.role}</span></td>
        <td><span class="um-status-badge um-status-${statusVal}">${statusLabel}</span></td>
        <td>
          <div class="um-table-actions">
            <button class="um-action-btn um-action-btn-edit" data-action="edit" data-id="${user.id}">Edit</button>
            <button class="um-action-btn um-action-btn-wa" data-action="wa" data-id="${user.id}">WA</button>
            <button class="um-action-btn um-action-btn-reset" data-action="reset" data-email="${user.email}">Reset</button>
            <button class="um-action-btn um-action-btn-delete" data-action="delete" data-id="${user.id}" data-nama="${user.nama || user.namaLengkap || ''}">Hapus</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
  userList.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      if (action === 'edit') editUser(btn.dataset.id, container);
      if (action === 'wa') sendWA(btn.dataset.id);
      if (action === 'reset') resetPassword(btn.dataset.email);
      if (action === 'delete') deleteUser(btn.dataset.id, btn.dataset.nama);
    });
  });
}

async function saveUser(container) {
  const userId = container.querySelector('#um-user-id').value;
  const name = container.querySelector('#um-name').value.trim();
  const email = container.querySelector('#um-email').value.trim().toLowerCase();
  const noWAraw = container.querySelector('#um-wa').value.trim();
  const noWA = formatNomorWA(noWAraw);
  const npsn = container.querySelector('#um-npsn').value.trim();
  const role = container.querySelector('#um-role').value;
  const school = container.querySelector('#um-school').value.trim();
  const status = container.querySelector('#um-status').value;
  const permissions = getPermissionsFromForm(container);
  const hakAkses = getHakAksesArrayFromForm(container);

  if (!name || !email || !noWAraw || !npsn) {
    showToast('⚠ Nama, Email, WA, NPSN wajib!', 'error');
    alert('⚠ Nama, Email, WA, NPSN wajib diisi!');
    return;
  }
  if (!validateEmail(email)) {
    showToast('⚠ Email tidak valid!', 'error');
    return;
  }

  const btnSave = container.querySelector('#btn-save-user');
  const bigSaveBtn = document.getElementById('btnSimpanUser') || Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Simpan Semua Perubahan'));
  currentNPSN = npsn;

  if (unsubscribe) { unsubscribe(); unsubscribe = null; }
  if (btnSave) { btnSave.disabled = true; btnSave.textContent = '⏳ Menyimpan ke Firestore...'; }
  if (bigSaveBtn) { bigSaveBtn.disabled = true; bigSaveBtn.textContent = '⏳ Menyimpan...'; }

  try {
    let finalId = userId;
    const isNew = !userId;
    if (isNew) {
      try {
        const methods = await fetchSignInMethodsForEmail(secondaryAuth, email).catch(() => []);
        if (methods && methods.length > 0) throw { code: 'auth/email-already-in-use' };
        const cred = await createUserWithEmailAndPassword(secondaryAuth, email, PASSWORD_DEFAULT);
        finalId = cred.user.uid;
      } catch (authErr) {
        if (authErr.code === 'auth/email-already-in-use') {
          if (!confirm(`Email ${email} sudah ada di Auth. Tetap buat Firestore?`)) throw authErr;
          finalId = `recovery_${Date.now()}`;
        } else throw authErr;
      }
    }

    const dataToSave = {
      nama: name,
      namaLengkap: name,
      email: email,
      noWA: noWA,
      idSekolah: npsn,
      npsn: npsn,
      namaSekolah: school,
      role: role,
      status: status,
      permissions: permissions,
      hakAkses: hakAkses.length > 0 ? hakAkses : getDefaultHakAksesByRole(role),
      isAdmin: role === 'admin',
      password: PASSWORD_DEFAULT,
      updatedAt: serverTimestamp(),
      ...(isNew ? { createdAt: serverTimestamp(), passwordChanged: false } : {})
    };

    const mainRef = doc(dbInstance, USER_COLLECTION, finalId);
    const npsnRef = doc(dbInstance, SEKOLAH_COLLECTION, npsn, USER_COLLECTION, finalId);

    if (isNew) {
      await setDoc(mainRef, dataToSave);
      await setDoc(npsnRef, dataToSave);
    } else {
      try { await updateDoc(mainRef, dataToSave); } catch { await setDoc(mainRef, dataToSave, { merge: true }); }
      try { await updateDoc(npsnRef, dataToSave); } catch { await setDoc(npsnRef, dataToSave, { merge: true }); }
    }

    showToast(isNew ? `✅ Berhasil! User ditambahkan ke folder NPSN ${npsn}. Pass: ${PASSWORD_DEFAULT}` : `✅ Berhasil! User diperbarui di folder NPSN ${npsn}`, 'success');
    alert(isNew ? `✅ SUKSES!\nUser ${name} berhasil disimpan!\n\nFolder: sekolah/${npsn}/users/${finalId}\nPassword awal: ${PASSWORD_DEFAULT}\n\nCek Firebase Console > Firestore > sekolah > ${npsn} > users` : `✅ SUKSES!\nUser ${name} berhasil diperbarui di folder NPSN ${npsn}`);

    container.querySelector('#um-form').style.display = 'none';
  } catch (e) {
    console.error(e);
    showToast(`❌ Gagal: ${e.message}`, 'error');
    alert(`❌ GAGAL simpan!\n${e.message}\n\nCek Console (F12) dan Rules Firestore.`);
  } finally {
    if (btnSave) { btnSave.disabled = false; btnSave.textContent = '💾 Simpan Pengguna'; }
    if (bigSaveBtn) { bigSaveBtn.disabled = false; bigSaveBtn.textContent = '💾 Simpan Semua Perubahan'; }
    setTimeout(() => startListening(container), 1000);
  }
}

async function editUser(userId, container) {
  try {
    if (!container) container = activeContainer || document.querySelector('.um-container');
    const { npsn } = getUserQuery();
    let snap = null;
    if (npsn) {
      try { snap = await getDoc(doc(dbInstance, SEKOLAH_COLLECTION, npsn, USER_COLLECTION, userId)); } catch (e) { snap = null; }
    }
    if (!snap || !snap.exists()) {
      snap = await getDoc(doc(dbInstance, USER_COLLECTION, userId));
    }
    if (!snap || !snap.exists()) { showToast('Tidak ditemukan di folder NPSN ' + (npsn || '-') + ' dan users global!', 'error'); return; }
    const user = snap.data();
    container.querySelector('#um-form').style.display = 'block';
    container.querySelector('#um-form-title').textContent = 'Edit Pengguna';
    container.querySelector('#btn-save-user').textContent = '💾 Perbarui Pengguna';
    container.querySelector('#um-user-id').value = userId;
    container.querySelector('#um-name').value = user.nama || user.namaLengkap || '';
    container.querySelector('#um-email').value = user.email || '';
    container.querySelector('#um-wa').value = user.noWA || '';
    container.querySelector('#um-npsn').value = user.idSekolah || user.npsn || currentNPSN || npsn;
    container.querySelector('#um-school').value = user.namaSekolah || NAMA_SEKOLAH;
    container.querySelector('#um-role').value = user.role || 'guru';
    container.querySelector('#um-status').value = user.status || 'aktif';
    setPermissionsToForm(container, user.permissions, user.hakAkses || []);
    container.querySelector('#um-form').scrollIntoView({ behavior: 'smooth' });
  } catch (e) {
    console.error('editUser error:', e);
    showToast('Gagal load! ' + e.message, 'error');
  }
}

async function sendWA(userId) {
  try {
    const { npsn } = getUserQuery();
    let snap = null;
    if (npsn) {
      try { snap = await getDoc(doc(dbInstance, SEKOLAH_COLLECTION, npsn, USER_COLLECTION, userId)); } catch (e) { snap = null; }
    }
    if (!snap || !snap.exists()) snap = await getDoc(doc(dbInstance, USER_COLLECTION, userId));
    if (!snap || !snap.exists()) { showToast('User tidak ditemukan!', 'error'); return; }
    const user = snap.data();
    const hakText = (user.hakAkses || []).length ? user.hakAkses.map(h => `  • ${h}`).join('\n') : '-';
    const pesan = `Halo *${user.nama || user.namaLengkap}*, terdaftar sebagai *${user.role}* di ${NAMA_SEKOLAH}. Email: ${user.email} Password: *${PASSWORD_DEFAULT}* Hak Akses:\n${hakText}\nLink: ${LOGIN_URL}`;
    const wa = formatNomorWA(user.noWA || '');
    if (!wa) { showToast('No WA kosong!', 'error'); return; }
    window.open(`https://wa.me/${wa}?text=${encodeURIComponent(pesan)}`, '_blank');
  } catch (e) {
    console.error('sendWA error:', e);
    showToast('Gagal WA: ' + e.message, 'error');
  }
}

async function resetPassword(email) {
  if (!confirm(`Kirim reset ke ${email}?`)) return;
  try {
    await sendPasswordResetEmail(auth, email);
    showToast(`✅ Reset dikirim ke ${email}!`, 'success');
    alert(`✅ Link reset dikirim ke ${email}`);
  } catch {
    showToast('❌ Gagal kirim reset!', 'error');
  }
}

async function deleteUser(userId, nama) {
  if (!confirm(`Hapus ${nama}?`)) return;
  try {
    const { npsn } = getUserQuery();
    if (npsn) await deleteDoc(doc(dbInstance, SEKOLAH_COLLECTION, npsn, USER_COLLECTION, userId)).catch(() => {});
    await deleteDoc(doc(dbInstance, USER_COLLECTION, userId));
    showToast('✅ Dihapus!', 'success');
    alert(`✅ User ${nama} dihapus dari folder NPSN ${npsn || ''} dan users global`);
  } catch {
    showToast('Gagal hapus!', 'error');
  }
}

function formatNomorWA(nomor) {
  if (!nomor) return '';
  let c = nomor.replace(/\D/g, '');
  if (c.startsWith('0')) c = '62' + c.substring(1);
  else if (!c.startsWith('62')) c = '62' + c;
  return c;
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).toLowerCase());
}

function showToast(msg, type = 'success') {
  const t = document.createElement('div');
  t.className = `um-toast um-toast-${type}`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => {
    t.style.opacity = '0';
    t.style.transform = 'translateX(400px)';
    t.style.transition = 'all 0.3s ease';
    setTimeout(() => t.remove(), 300);
  }, 4000);
}

export function hasPermission(user, moduleId, subModuleId = null) {
  if (!user) return false;
  if (user.isAdmin) return true;
  if (user.permissions) {
    if (subModuleId) return user.permissions[moduleId] && user.permissions[moduleId][subModuleId] === true;
    if (user.permissions[moduleId]) return Object.values(user.permissions[moduleId]).some(v => v === true);
  }
  if (user.hakAkses && subModuleId) {
    const subName = AVAILABLE_MODULES.find(m => m.id === moduleId)?.subModules.find(s => s.id === subModuleId)?.name;
    return subName ? user.hakAkses.includes(subName) : false;
  }
  return false;
}
