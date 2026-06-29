// modules/admin-pembelajaran/features/jadwal.js
import { db } from '../../../js/firebase-config.js';
import { collection, addDoc, getDocs, query, where, orderBy, serverTimestamp, deleteDoc, doc } 
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');

export function init(container, db) {
  container.innerHTML = `
    <div class="feature-container">
      <div class="feature-header">
        <h2>🕐 Jadwal Pembelajaran</h2>
        <p>Atur jadwal mengajar mingguan Anda.</p>
      </div>

      <form id="formJadwal" class="feature-form">
        <div class="form-row">
          <div class="form-group">
            <label>📅 Hari <span class="required">*</span></label>
            <select name="hari" class="form-control" required>
              <option value="">-- Pilih Hari --</option>
              <option value="Senin">Senin</option>
              <option value="Selasa">Selasa</option>
              <option value="Rabu">Rabu</option>
              <option value="Kamis">Kamis</option>
              <option value="Jumat">Jumat</option>
              <option value="Sabtu">Sabtu</option>
            </select>
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

        <div class="form-row">
          <div class="form-group">
            <label>🕐 Jam Mulai <span class="required">*</span></label>
            <input type="time" name="jamMulai" class="form-control" required>
          </div>
          <div class="form-group">
            <label>🕐 Jam Selesai <span class="required">*</span></label>
            <input type="time" name="jamSelesai" class="form-control" required>
          </div>
        </div>

        <div class="form-group">
          <label>📚 Mata Pelajaran <span class="required">*</span></label>
          <input type="text" name="mapel" class="form-control" placeholder="Contoh: Matematika" required>
        </div>

        <div class="form-actions">
          <button type="submit" class="btn btn-primary">💾 Simpan Jadwal</button>
          <button type="reset" class="btn btn-secondary">🔄 Reset</button>
        </div>
      </form>

      <div class="data-section">
        <h3>📋 Jadwal Saya</h3>
        <div id="jadwalList" class="data-list">
          <p class="loading">Memuat data...</p>
        </div>
      </div>
    </div>
  `;

  const form = container.querySelector('#formJadwal');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);
    data.createdBy = currentUser.uid;
    data.createdAt = serverTimestamp();

    try {
      await addDoc(collection(db, 'jadwal_pelajaran'), data);
      alert('✅ Jadwal berhasil disimpan!');
      form.reset();
      loadJadwalData(container);
    } catch (error) {
      alert('❌ Gagal menyimpan: ' + error.message);
    }
  });

  loadJadwalData(container);
}

async function loadJadwalData(container) {
  const listContainer = container.querySelector('#jadwalList');
  
  try {
    const q = query(
      collection(db, 'jadwal_pelajaran'),
      where('createdBy', '==', currentUser.uid),
      orderBy('hari', 'asc')
    );
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      listContainer.innerHTML = '<p class="empty-state">Belum ada jadwal.</p>';
      return;
    }

    let html = '';
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      html += `
        <div class="data-card">
          <h4>${data.mapel}</h4>
          <p>📅 ${data.hari} | 🏫 Kelas ${data.kelas}</p>
          <p>🕐 ${data.jamMulai} - ${data.jamSelesai}</p>
          <button onclick="deleteJadwal('${docSnap.id}')" style="margin-top:8px; background:#ef4444; color:white; border:none; padding:5px 10px; border-radius:5px; cursor:pointer;">🗑️ Hapus</button>
        </div>
      `;
    });
    listContainer.innerHTML = html;
  } catch (error) {
    listContainer.innerHTML = '<p class="error">Gagal memuat data.</p>';
  }
}

window.deleteJadwal = async function(docId) {
  if (!confirm('Hapus jadwal ini?')) return;
  try {
    await deleteDoc(doc(db, 'jadwal_pelajaran', docId));
    alert('✅ Jadwal dihapus!');
    location.reload();
  } catch (error) {
    alert('❌ Gagal menghapus: ' + error.message);
  }
};
