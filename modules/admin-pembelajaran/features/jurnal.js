// modules/admin-pembelajaran/features/jurnal.js
// =========================================
// FITUR: JURNAL HARIAN (MODULAR)
// =========================================

import { db } from '../../../js/firebase-config.js';
import { collection, addDoc, getDocs, query, where, orderBy, serverTimestamp } 
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// User saat ini
const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');

/**
 * Fungsi init - Dipanggil oleh main.js saat fitur ini dipilih
 * @param {HTMLElement} container - Elemen HTML untuk menampung konten
 * @param {Firestore} db - Instance Firestore
 */
export function init(container, db) {
  renderJurnalForm(container);
  attachEventListeners(container);
  loadJurnalData(container);
}

/**
 * Render form jurnal ke dalam container
 */
function renderJurnalForm(container) {
  container.innerHTML = `
    <div class="feature-container jurnal-feature">
      <div class="feature-header">
        <h2>📝 Jurnal Mengajar Harian</h2>
        <p>Catat kegiatan pembelajaran dan refleksi harian Anda.</p>
      </div>

      <form id="formJurnal" class="feature-form">
        <div class="form-row">
          <div class="form-group">
            <label for="tanggal">📅 Tanggal Mengajar <span class="required">*</span></label>
            <input type="date" id="tanggal" name="tanggal" class="form-control" required>
          </div>
          
          <div class="form-group">
            <label for="kelas">🏫 Kelas <span class="required">*</span></label>
            <select id="kelas" name="kelas" class="form-control" required>
              <option value="">-- Pilih Kelas --</option>
              <option value="1">Kelas 1</option>
              <option value="2">Kelas 2</option>
              <option value="3">Kelas 3</option>
              <option value="4">Kelas 4</option>
              <option value="5">Kelas 5</option>
              <option value="6">Kelas 6</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label for="mapelTopik">📚 Mata Pelajaran & Topik <span class="required">*</span></label>
          <input type="text" id="mapelTopik" name="mapelTopik" class="form-control" 
                 placeholder="Contoh: Matematika - Pecahan Sederhana" required>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="jumlahSiswa">👥 Jumlah Siswa Hadir <span class="required">*</span></label>
            <input type="number" id="jumlahSiswa" name="jumlahSiswa" class="form-control" 
                   min="0" max="50" required>
          </div>
          
          <div class="form-group">
            <label for="ketercapaian">📊 Ketercapaian Tujuan (%) <span class="required">*</span></label>
            <input type="number" id="ketercapaian" name="ketercapaian" class="form-control" 
                   min="0" max="100" placeholder="0-100" required>
          </div>
        </div>

        <div class="form-section">
          <h4>🔍 Refleksi & Evaluasi</h4>
          
          <div class="form-group">
            <label for="kendala">⚠️ Kendala / Catatan Khusus (Opsional)</label>
            <textarea id="kendala" name="kendala" class="form-control" rows="3" 
                      placeholder="Tulis kendala yang dihadapi atau catatan perilaku siswa..."></textarea>
          </div>

          <div class="form-group">
            <label for="tindakLanjut">💡 Tindak Lanjut & Rencana Perbaikan <span class="required">*</span></label>
            <textarea id="tindakLanjut" name="tindakLanjut" class="form-control" rows="3" 
                      placeholder="Apa yang perlu diperbaiki atau ditingkatkan di pertemuan berikutnya?" required></textarea>
          </div>
        </div>

        <div class="form-actions">
          <button type="submit" class="btn btn-primary">💾 Simpan Jurnal</button>
          <button type="reset" class="btn btn-secondary">🔄 Reset Form</button>
        </div>
      </form>

      <div class="data-section">
        <h3>📋 Riwayat Jurnal Tersimpan</h3>
        <div id="jurnalList" class="data-list">
          <p class="loading">Memuat data...</p>
        </div>
      </div>
    </div>
  `;
}

/**
 * Attach event listeners untuk form dan tombol
 */
function attachEventListeners(container) {
  const form = container.querySelector('#formJurnal');
  
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await saveJurnal(container);
    });
  }
}

/**
 * Simpan data jurnal ke Firestore
 */
async function saveJurnal(container) {
  const form = container.querySelector('#formJurnal');
  const formData = new FormData(form);
  
  // Validasi user
  if (!currentUser.uid) {
    alert('⚠️ User tidak ditemukan. Silakan login ulang.');
    return;
  }

  // Siapkan data
  const dataToSave = {
    tanggal: formData.get('tanggal'),
    kelas: formData.get('kelas'),
    mapelTopik: formData.get('mapelTopik'),
    jumlahSiswa: parseInt(formData.get('jumlahSiswa')),
    ketercapaian: parseInt(formData.get('ketercapaian')),
    kendala: formData.get('kendala') || '',
    tindakLanjut: formData.get('tindakLanjut'),
    createdBy: currentUser.uid,
    createdByEmail: currentUser.email || 'unknown',
    createdAt: serverTimestamp()
  };

  try {
    // Simpan ke Firestore
    await addDoc(collection(db, 'jurnal_harian'), dataToSave);
    
    alert('✅ Jurnal berhasil disimpan!');
    form.reset();
    
    // Reload data
    loadJurnalData(container);
    
  } catch (error) {
    console.error('Error saving jurnal:', error);
    alert('❌ Gagal menyimpan jurnal: ' + error.message);
  }
}

/**
 * Load data jurnal dari Firestore
 */
async function loadJurnalData(container) {
  const listContainer = container.querySelector('#jurnalList');
  
  if (!currentUser.uid) {
    listContainer.innerHTML = '<p class="error">User tidak ditemukan.</p>';
    return;
  }

  try {
    // Query data jurnal user ini
    const q = query(
      collection(db, 'jurnal_harian'),
      where('createdBy', '==', currentUser.uid),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      listContainer.innerHTML = '<p class="empty-state">Belum ada jurnal tersimpan.</p>';
      return;
    }

    // Render data
    let html = '<div class="jurnal-cards">';
    
    snapshot.forEach(doc => {
      const data = doc.data();
      const tanggal = data.tanggal ? formatDate(data.tanggal) : '-';
      
      html += `
        <div class="jurnal-card">
          <div class="jurnal-card-header">
            <span class="jurnal-date">📅 ${tanggal}</span>
            <span class="jurnal-kelas">Kelas ${data.kelas}</span>
          </div>
          <div class="jurnal-card-body">
            <h4>${data.mapelTopik}</h4>
            <div class="jurnal-stats">
              <span>👥 ${data.jumlahSiswa} siswa</span>
              <span>📊 Ketercapaian: ${data.ketercapaian}%</span>
            </div>
            ${data.kendala ? `<p class="jurnal-kendala"><strong>Kendala:</strong> ${data.kendala}</p>` : ''}
            <p class="jurnal-tindak-lanjut"><strong>Tindak Lanjut:</strong> ${data.tindakLanjut}</p>
          </div>
        </div>
      `;
    });
    
    html += '</div>';
    listContainer.innerHTML = html;
    
  } catch (error) {
    console.error('Error loading jurnal:', error);
    listContainer.innerHTML = '<p class="error">Gagal memuat data jurnal.</p>';
  }
}

/**
 * Format tanggal ke format Indonesia
 */
function formatDate(dateString) {
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return new Date(dateString).toLocaleDateString('id-ID', options);
}
