// modules/global-monitoring/features/kop.js
// =========================================
// FITUR: KOP ADMINISTRASI
// Fungsi: Mengelola data Kop Surat Sekolah
// Data ini akan di-load otomatis oleh sub-fitur lain saat generate dokumen
// =========================================

import { 
  collection, doc, getDocs, getDoc, setDoc, updateDoc, 
  query, where, serverTimestamp 
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

let db = null;
let currentUser = null;
let currentSchoolId = null;
let kopDocId = null; // ID dokumen kop yang sudah ada

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
      <p style="color: #6c757d;">NPSN tidak ditemukan pada data user. Silakan hubungi administrator.</p>
    </div>
  `;
  return;
}
  console.log('✅ Kop Administrasi initialized for school:', currentSchoolId);
  renderKopUI(contentDiv);
  
  // Load data kop yang sudah ada
  await loadExistingKop();
}

// Fungsi untuk input NPSN manual
window.inputNPSNManual = function() {
  const npsn = prompt('Masukkan NPSN Sekolah Anda:');
  if (npsn && npsn.trim()) {
    // Update localStorage
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    currentUser.npsn = npsn.trim();
    currentUser.idSekolah = npsn.trim();
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    
    // Reload halaman
    location.reload();
  }
};

function getCollectionPath() {
  // ✅ DIPERBAIKI: Menggunakan 'sekolah' bukan 'schools' agar sesuai dengan struktur database
  return `sekolah/${currentSchoolId}/kopAdministrasi`;
}

async function loadExistingKop() {
  try {
    const collectionPath = getCollectionPath();
    const snapshot = await getDocs(collection(db, collectionPath));
    
    if (!snapshot.empty) {
      const docSnap = snapshot.docs[0];
      kopDocId = docSnap.id;
      const data = docSnap.data();
      
      // Auto-fill form dengan data yang sudah ada
      document.getElementById('kopNamaKabupaten').value = data.namaKabupaten || '';
      document.getElementById('kopDinas').value = data.dinas || '';
      document.getElementById('kopNamaSekolah').value = data.namaSekolah || currentUser.namaSekolah || '';
      document.getElementById('kopAlamat').value = data.alamat || '';
      
      // Update preview
      updatePreview();
    } else {
      // Set default values dari data user
      document.getElementById('kopNamaSekolah').value = currentUser.namaSekolah || '';
      updatePreview();
    }
  } catch (error) {
    console.error('Error loading kop data:', error);
  }
}

async function saveKopData() {
  const namaKabupaten = document.getElementById('kopNamaKabupaten').value.trim();
  const dinas = document.getElementById('kopDinas').value.trim();
  const namaSekolah = document.getElementById('kopNamaSekolah').value.trim();
  const alamat = document.getElementById('kopAlamat').value.trim();
  
  if (!namaKabupaten || !dinas || !namaSekolah || !alamat) {
    showToast('⚠️ Semua field wajib diisi!', 'error');
    return;
  }
  
  try {
    const collectionPath = getCollectionPath();
    const kopData = {
      namaKabupaten,
      dinas,
      namaSekolah,
      alamat,
      npsn: currentSchoolId,
      updatedAt: serverTimestamp(),
      updatedBy: currentUser?.uid || 'unknown'
    };
    
    if (kopDocId) {
      // Update dokumen yang sudah ada
      await updateDoc(doc(db, collectionPath, kopDocId), kopData);
    } else {
      // Buat dokumen baru
      const docRef = await setDoc(doc(collection(db, collectionPath)), kopData);
      kopDocId = docRef.id;
    }
    
    showToast('✅ Pengaturan Kop berhasil disimpan!', 'success');
  } catch (error) {
    console.error('Error saving kop data:', error);
    showToast('❌ Gagal menyimpan: ' + error.message, 'error');
  }
}

function updatePreview() {
  const namaKabupaten = document.getElementById('kopNamaKabupaten').value.trim() || '[Nama Kabupaten]';
  const dinas = document.getElementById('kopDinas').value.trim() || '[Nama Dinas]';
  const namaSekolah = document.getElementById('kopNamaSekolah').value.trim() || '[Nama Sekolah]';
  const alamat = document.getElementById('kopAlamat').value.trim() || '[Alamat Lengkap]';
  
  const preview = document.getElementById('kopPreview');
  preview.innerHTML = `
    <div style="text-align: center; padding: 20px; border: 1px solid #ddd; background: white;">
      <div style="font-size: 14px; font-weight: bold; margin-bottom: 5px;">
        PEMERINTAH KABUPATEN ${namaKabupaten.toUpperCase()}
      </div>
      <div style="font-size: 14px; font-weight: bold; margin-bottom: 15px;">
        ${dinas.toUpperCase()}
      </div>
      <div style="font-size: 18px; font-weight: bold; margin-bottom: 10px;">
        ${namaSekolah.toUpperCase()}
      </div>
      <div style="font-size: 12px; font-style: italic; color: #666;">
        ${alamat}
      </div>
      <div style="margin-top: 15px; border-top: 3px double #000; padding-top: 5px;"></div>
    </div>
  `;
}

function renderKopUI(container) {
  container.innerHTML = `
    <style>
      .kop-container {
        padding: 20px;
        max-width: 1000px;
        margin: 0 auto;
      }
      .kop-header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 20px;
        border-radius: 10px;
        margin-bottom: 25px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      }
      .kop-header h2 {
        margin: 0 0 10px 0;
      }
      .kop-header p {
        margin: 5px 0;
        opacity: 0.95;
      }
      .kop-form-container {
        background: #fff5f7;
        border: 2px dashed #007bff;
        border-radius: 10px;
        padding: 25px;
        margin-bottom: 25px;
      }
      .kop-form-title {
        color: #d63384;
        font-size: 20px;
        font-weight: bold;
        margin-bottom: 20px;
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .kop-form-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
        margin-bottom: 20px;
      }
      .kop-form-group {
        display: flex;
        flex-direction: column;
      }
      .kop-form-group.full-width {
        grid-column: 1 / -1;
      }
      .kop-form-group label {
        margin-bottom: 8px;
        font-weight: 600;
        color: #d63384;
        font-size: 14px;
        display: flex;
        align-items: center;
        gap: 5px;
      }
      .kop-form-group input,
      .kop-form-group textarea {
        padding: 12px;
        border: 2px solid #f8d7da;
        border-radius: 6px;
        font-size: 14px;
        transition: all 0.3s;
        background: white;
      }
      .kop-form-group input:focus,
      .kop-form-group textarea:focus {
        outline: none;
        border-color: #007bff;
        box-shadow: 0 0 0 3px rgba(0,123,255,0.1);
      }
      .kop-form-group textarea {
        min-height: 80px;
        resize: vertical;
      }
      .kop-btn-save {
        width: 100%;
        padding: 14px;
        background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
      }
      .kop-btn-save:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0,123,255,0.3);
      }
      .kop-preview-container {
        background: white;
        border: 1px solid #ddd;
        border-radius: 8px;
        padding: 20px;
        margin-top: 20px;
      }
      .kop-preview-title {
        font-size: 16px;
        font-weight: bold;
        color: #343a40;
        margin-bottom: 15px;
        padding-bottom: 10px;
        border-bottom: 2px solid #e9ecef;
      }
      .empty-state {
        text-align: center;
        padding: 40px;
        color: #6c757d;
      }
      @media (max-width: 768px) {
        .kop-form-grid {
          grid-template-columns: 1fr;
        }
      }
    </style>
    
    <div class="kop-container">
      <div class="kop-header">
        <h2>🏛️ Pengaturan Kop Surat</h2>
        <p><strong>Sekolah:</strong> ${currentUser.namaSekolah || '-'}</p>
        <p><strong>NPSN:</strong> ${currentSchoolId}</p>
        <p style="font-size:13px; margin-top:10px; opacity:0.9;">
          ℹ️ Data kop surat ini akan otomatis di-load oleh sub-fitur lain saat generate dokumen untuk di-download.
        </p>
      </div>
      
      <div class="kop-form-container">
        <div class="kop-form-title">
          <span>🏛️</span>
          <span>Pengaturan Kop Surat (Editable)</span>
        </div>
        
        <div class="kop-form-grid">
          <div class="kop-form-group">
            <label>️ Nama Kabupaten</label>
            <input type="text" id="kopNamaKabupaten" placeholder="Contoh: BULUKUMBA" oninput="updatePreview()">
          </div>
          <div class="kop-form-group">
            <label>🏢 Dinas</label>
            <input type="text" id="kopDinas" placeholder="Contoh: DINAS PENDIDIKAN DAN KEBUDAYAAN" oninput="updatePreview()">
          </div>
          <div class="kop-form-group">
            <label>🏫 Nama Sekolah</label>
            <input type="text" id="kopNamaSekolah" placeholder="Contoh: SDN 139 LAMANDA" oninput="updatePreview()">
          </div>
          <div class="kop-form-group full-width">
            <label>📍 Alamat Lengkap</label>
            <input type="text" id="kopAlamat" placeholder="Contoh: Dusun Batu Assung, Desa Lamanda, Kec. [Kecamatan], Kab. Bulukumba" oninput="updatePreview()">
          </div>
        </div>
        
        <button class="kop-btn-save" onclick="saveKopData()">
          💾 Simpan Pengaturan Kop
        </button>
      </div>
      
      <div class="kop-preview-container">
        <div class="kop-preview-title">👁️ Preview Kop Surat</div>
        <div id="kopPreview">
          <div style="text-align: center; padding: 20px; color: #6c757d;">
            Preview akan muncul di sini...
          </div>
        </div>
      </div>
    </div>
  `;
}

function showToast(message, type = 'success') {
  const existing = document.querySelector('.kop-toast');
  if (existing) existing.remove();
  
  const toast = document.createElement('div');
  toast.className = 'kop-toast';
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

// Export fungsi untuk digunakan sub-fitur lain
export async function getKopData() {
  try {
    const collectionPath = getCollectionPath();
    const snapshot = await getDocs(collection(db, collectionPath));
    
    if (!snapshot.empty) {
      return snapshot.docs[0].data();
    }
    return null;
  } catch (error) {
    console.error('Error getting kop data:', error);
    return null;
  }
}

// Fungsi helper untuk generate kop HTML (untuk digunakan sub-fitur lain)
export function generateKopHTML(kopData) {
  if (!kopData) {
    return '<div style="text-align:center; color:red;">️ Data Kop Surat belum diatur!</div>';
  }
  
  return `
    <div style="text-align: center; padding: 20px; border-bottom: 3px double #000; margin-bottom: 20px;">
      <div style="font-size: 14px; font-weight: bold; margin-bottom: 5px;">
        PEMERINTAH KABUPATEN ${kopData.namaKabupaten.toUpperCase()}
      </div>
      <div style="font-size: 14px; font-weight: bold; margin-bottom: 15px;">
        ${kopData.dinas.toUpperCase()}
      </div>
      <div style="font-size: 18px; font-weight: bold; margin-bottom: 10px;">
        ${kopData.namaSekolah.toUpperCase()}
      </div>
      <div style="font-size: 12px; font-style: italic; color: #666;">
        ${kopData.alamat}
      </div>
    </div>
  `;
}
