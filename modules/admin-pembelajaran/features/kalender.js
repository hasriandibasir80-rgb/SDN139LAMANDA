// modules/admin-pembelajaran/features/kalender.js
import { db } from '../../../js/firebase-config.js';
import { collection, addDoc, getDocs, query, where, orderBy, serverTimestamp, deleteDoc, doc } 
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');

export function init(container, db) {
  container.innerHTML = `
    <div class="feature-container">
      <div class="feature-header">
        <h2>📆 Kalender Pendidikan</h2>
        <p>Kelola acara dan kegiatan penting sepanjang tahun ajaran.</p>
      </div>

      <form id="formKalender" class="feature-form">
        <div class="form-row">
          <div class="form-group">
            <label>📅 Tanggal <span class="required">*</span></label>
            <input type="date" name="tanggal" class="form-control" required>
          </div>
          <div class="form-group">
            <label>🏷️ Kategori <span class="required">*</span></label>
            <select name="kategori" class="form-control" required>
              <option value="">-- Pilih Kategori --</option>
              <option value="Libur Nasional">Libur Nasional</option>
              <option value="Ujian">Ujian</option>
              <option value="Kegiatan Sekolah">Kegiatan Sekolah</option>
              <option value="Rapat Guru">Rapat Guru</option>
              <option value="Lainnya">Lainnya</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label>📝 Nama Acara <span class="required">*</span></label>
          <input type="text" name="namaAcara" class="form-control" placeholder="Contoh: Ujian Tengah Semester" required>
        </div>

        <div class="form-group">
          <label>📄 Keterangan (Opsional)</label>
          <textarea name="keterangan" class="form-control" rows="2" placeholder="Detail tambahan..."></textarea>
        </div>

        <div class="form-actions">
          <button type="submit" class="btn btn-primary">💾 Simpan Acara</button>
          <button type="reset" class="btn btn-secondary">🔄 Reset</button>
        </div>
      </form>

      <div class="data-section">
        <h3>📋 Daftar Acara</h3>
        <div id="kalenderList" class="data-list">
          <p class="loading">Memuat data...</p>
        </div>
      </div>
    </div>
  `;

  const form = container.querySelector('#formKalender');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);
    data.createdBy = currentUser.uid;
    data.createdAt = serverTimestamp();

    try {
      await addDoc(collection(db, 'kalender_pendidikan'), data);
      alert('✅ Acara berhasil disimpan!');
      form.reset();
      loadKalenderData(container);
    } catch (error) {
      alert('❌ Gagal menyimpan: ' + error.message);
    }
  });

  loadKalenderData(container);
}

async function loadKalenderData(container) {
  const listContainer = container.querySelector('#kalenderList');
  
  try {
    const q = query(
      collection(db, 'kalender_pendidikan'),
      where('createdBy', '==', currentUser.uid),
      orderBy('tanggal', 'asc')
    );
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      listContainer.innerHTML = '<p class="empty-state">Belum ada acara.</p>';
      return;
    }

    let html = '';
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      html += `
        <div class="data-card">
          <h4>${data.namaAcara}</h4>
          <p>📅 ${data.tanggal} | 🏷️ ${data.kategori}</p>
          ${data.keterangan ? `<p>${data.keterangan}</p>` : ''}
          <button onclick="deleteKalender('${docSnap.id}')" style="margin-top:8px; background:#ef4444; color:white; border:none; padding:5px 10px; border-radius:5px; cursor:pointer;">🗑️ Hapus</button>
        </div>
      `;
    });
    listContainer.innerHTML = html;
  } catch (error) {
    listContainer.innerHTML = '<p class="error">Gagal memuat data.</p>';
  }
}

window.deleteKalender = async function(docId) {
  if (!confirm('Hapus acara ini?')) return;
  try {
    await deleteDoc(doc(db, 'kalender_pendidikan', docId));
    alert('✅ Acara dihapus!');
    location.reload();
  } catch (error) {
    alert('❌ Gagal menghapus: ' + error.message);
  }
};
