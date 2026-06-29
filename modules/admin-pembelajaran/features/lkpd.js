// modules/admin-pembelajaran/features/lkpd.js
import { db } from '../../../js/firebase-config.js';
import { collection, addDoc, getDocs, query, where, orderBy, serverTimestamp, deleteDoc, doc } 
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');

export function init(container, db) {
  container.innerHTML = `
    <div class="feature-container">
      <div class="feature-header">
        <h2>📄 LKPD (Lembar Kerja Peserta Didik)</h2>
        <p>Kelola lembar kerja untuk siswa.</p>
      </div>

      <form id="formLKPD" class="feature-form">
        <div class="form-row">
          <div class="form-group">
            <label>📚 Mata Pelajaran <span class="required">*</span></label>
            <input type="text" name="mapel" class="form-control" placeholder="Contoh: Matematika" required>
          </div>
          <div class="form-group">
            <label>🏫 Kelas <span class="required">*</span></label>
            <select name="kelas" class="form-control" required>
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
          <label>📝 Judul LKPD <span class="required">*</span></label>
          <input type="text" name="judul" class="form-control" placeholder="Contoh: LKPD Pecahan Sederhana" required>
        </div>

        <div class="form-group">
          <label>🎯 Tujuan Pembelajaran <span class="required">*</span></label>
          <textarea name="tujuan" class="form-control" rows="3" placeholder="Apa yang ingin dicapai?" required></textarea>
        </div>

        <div class="form-group">
          <label>📋 Instruksi / Soal <span class="required">*</span></label>
          <textarea name="instruksi" class="form-control" rows="5" placeholder="Tulis instruksi atau soal..." required></textarea>
        </div>

        <div class="form-actions">
          <button type="submit" class="btn btn-primary">💾 Simpan LKPD</button>
          <button type="reset" class="btn btn-secondary">🔄 Reset</button>
        </div>
      </form>

      <div class="data-section">
        <h3>📋 Daftar LKPD</h3>
        <div id="lkpdList" class="data-list">
          <p class="loading">Memuat data...</p>
        </div>
      </div>
    </div>
  `;

  const form = container.querySelector('#formLKPD');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);
    data.createdBy = currentUser.uid;
    data.createdAt = serverTimestamp();

    try {
      await addDoc(collection(db, 'lkpd'), data);
      alert('✅ LKPD berhasil disimpan!');
      form.reset();
      loadLKPDData(container);
    } catch (error) {
      alert('❌ Gagal menyimpan: ' + error.message);
    }
  });

  loadLKPDData(container);
}

async function loadLKPDData(container) {
  const listContainer = container.querySelector('#lkpdList');
  
  try {
    const q = query(
      collection(db, 'lkpd'),
      where('createdBy', '==', currentUser.uid),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      listContainer.innerHTML = '<p class="empty-state">Belum ada LKPD.</p>';
      return;
    }

    let html = '';
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      html += `
        <div class="data-card">
          <h4>${data.judul}</h4>
          <p>📚 ${data.mapel} | 🏫 Kelas ${data.kelas}</p>
          <p><strong>Tujuan:</strong> ${data.tujuan}</p>
          <button onclick="deleteLKPD('${docSnap.id}')" style="margin-top:8px; background:#ef4444; color:white; border:none; padding:5px 10px; border-radius:5px; cursor:pointer;">🗑️ Hapus</button>
        </div>
      `;
    });
    listContainer.innerHTML = html;
  } catch (error) {
    listContainer.innerHTML = '<p class="error">Gagal memuat data.</p>';
  }
}

window.deleteLKPD = async function(docId) {
  if (!confirm('Hapus LKPD ini?')) return;
  try {
    await deleteDoc(doc(db, 'lkpd', docId));
    alert('✅ LKPD dihapus!');
    location.reload();
  } catch (error) {
    alert('❌ Gagal menghapus: ' + error.message);
  }
};
