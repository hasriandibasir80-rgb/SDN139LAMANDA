// =========================================
// MODUL: DEMOGRAFI SEKOLAH (LOGIKA)
// =========================================

// 1. Import kebutuhan Firebase (siap untuk koneksi data nanti)
import { db } from '../firebase-config.js'; 

// 2. Keamanan Dasar: Cek apakah user sudah login
const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
if (!currentUser || !currentUser.uid) {
  alert('⛔ Akses Ditolak: Silakan login terlebih dahulu.');
  window.location.href = '../../index.html';
}

// 3. Data Dummy (Contoh) - Nanti akan diganti dengan query Firestore
const dataDummy = {
  totalSiswa: 245,
  totalGuru: 18,
  totalKelas: 12,
  rasio: "1:14",
  rincianKelas: [
    { nama: "Kelas 1", jumlah: 42 },
    { nama: "Kelas 2", jumlah: 38 },
    { nama: "Kelas 3", jumlah: 40 },
    { nama: "Kelas 4", jumlah: 35 },
    { nama: "Kelas 5", jumlah: 45 },
    { nama: "Kelas 6", jumlah: 45 }
  ]
};

// 4. Fungsi untuk Merender Data ke HTML
function renderDemografi(data) {
  // Update Kartu Ringkasan
  document.getElementById('totalSiswa').textContent = data.totalSiswa;
  document.getElementById('totalGuru').textContent = data.totalGuru;
  document.getElementById('totalKelas').textContent = data.totalKelas;
  document.getElementById('rasioGuruSiswa').textContent = data.rasio;

  // Update Rincian Per Kelas
  const container = document.getElementById('daftarKelasContainer');
  container.innerHTML = ''; // Bersihkan loading state

  // Cari jumlah maksimal untuk skala progress bar (agar yang terbanyak = 100%)
  const maxSiswa = Math.max(...data.rincianKelas.map(k => k.jumlah));

  data.rincianKelas.forEach(kelas => {
    const persentaseLebar = (kelas.jumlah / maxSiswa) * 100;
    
    const itemHTML = `
      <div class="kelas-item">
        <div class="kelas-nama">${kelas.nama}</div>
        <div class="kelas-bar-container">
          <div class="kelas-bar-fill" style="width: ${persentaseLebar}%"></div>
        </div>
        <div class="kelas-jumlah">${kelas.jumlah}</div>
      </div>
    `;
    container.innerHTML += itemHTML;
  });
}

// 5. Eksekusi saat halaman dimuat
document.addEventListener('DOMContentLoaded', () => {
  console.log('✅ Modul Demografi dimuat untuk user:', currentUser.email);
  
  // Simulasi delay jaringan agar terlihat seperti loading (bisa dihapus nanti)
  setTimeout(() => {
    renderDemografi(dataDummy);
    console.log('✅ Data demografi berhasil dirender (Mode Dummy)');
    
    // TODO: Di masa depan, ganti 'setTimeout' di atas dengan:
    // const snapshot = await getDocs(collection(db, "students"));
    // const realData = hitungStatistikDariSnapshot(snapshot);
    // renderDemografi(realData);
    
  }, 800);
});
