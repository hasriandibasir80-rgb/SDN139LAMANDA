// modules/admin-pembelajaran/features/presensi.js
import { db } from '../../../js/firebase-config.js';
import { collection, addDoc, getDocs, query, where, orderBy, serverTimestamp } 
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');

export function init(container, db) {
  container.innerHTML = `
    <div class="feature-container">
      <div class="feature-header">
        <h2>✅ Presensi Siswa</h2>
        <p>Catat kehadiran siswa harian.</p>
      </div>

      <form id="formPresensi" class="feature-form">
        <div class="form-row">
          <div class="form-group">
            <label>📅 Tanggal <span class="required">*</span></label>
            <input type="date" name="tanggal" class="form-control" required>
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
          <label>👤 Nama Siswa <span class="required">*</span></label>
          <input type="text" name="namaSiswa" class="form-control" placeholder="Nama lengkap siswa" required>
        </div>

        <div class="form-group">
          <label>📊 Status Kehadiran <span class="required">*</span></label>
          <select name="status" class="form-control" required>
            <option value="">-- Pilih Status --</option>
            <option value="Hadir">✅ Hadir</option>
            <option value="Sakit">🤒 Sakit</option>
            <option value="Izin">📝 Izin</option>
            <option value="Alpha">❌ Alpha</option>
          </select>
        </div>

        <div class="form-group">
          <label>📄 Keterangan (Opsional)</label>
          <textarea name="keterangan" class="form-control" rows="2" placeholder="Detail tambahan..."></textarea>
        </div>

        <div class="form-actions">
          <button type="submit" class="btn btn-primary">💾 Simpan Presensi</button>
          <button type="reset" class="btn btn-secondary">🔄 Reset</button>
        </div>
      </form>

      <div class="data-section">
        <h3>📋 Riwayat Presensi</h3>
        <div id="presensiList" class="data-list">
          <p class="loading">Memuat data...</p>
        </div>
      </div>
    </div>
  `;

  const form = container.querySelector('#formPresensi');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);
    data.createdBy = currentUser.uid;
    data.createdAt = serverTimestamp();

    try {
      await addDoc(collection(db, 'presensi'), data);
      alert('✅ Presensi berhasil disimpan!');
      form.reset();
      loadPresensiData(container);
    } catch (error) {
      alert('❌ Gagal menyimpan: ' + error.message);
    }
  });

  loadPresensiData(container);
}

async function loadPresensiData(container) {
  const listContainer = container.querySelector('#presensiList');
  
  try {
    const q = query(
      collection(db, 'presensi'),
      where('createdBy', '==', currentUser.uid),
      orderBy('tanggal', 'desc')
    );
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      listContainer.innerHTML = '<p class="empty-state">Belum ada data presensi.</p>';
      return;
    }

    let html = '';
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const statusIcon = {
        'Hadir': '✅',
        'Sakit': '🤒',
        'Izin': '📝',
        'Alpha': '❌'
      }[data.status] || '❓';
      
      html += `
        <div class="data-card">
          <h4>${statusIcon} ${data.namaSiswa}</h4>
          <p>📅 ${data.tanggal} | 🏫 Kelas ${data.kelas}</p>
          <p><strong>Status:</strong> ${data.status}</p>
          ${data.keterangan ? `<p><strong>Keterangan:</strong> ${data.keterangan}</p>` : ''}
        </div>
      `;
    });
    listContainer.innerHTML = html;
  } catch (error) {
    listContainer.innerHTML = '<p class="error">Gagal memuat data.</p>';
  }
}
