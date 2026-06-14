// js/dashboard.js

const layananSelect = document.getElementById('layananSelect');
const saveLayananBtn = document.getElementById('saveLayananBtn');
const resetBtn = document.getElementById('resetBtn');
const statusEl = document.getElementById('status');
const featureContents = document.querySelectorAll('.feature-content');

// === FUNGSI UNTUK MENAMPILKAN KONTEN YANG DIPILIH ===
function setActiveFeature(featureValue) {
  // 1. Sembunyikan semua konten terlebih dahulu
  featureContents.forEach(content => content.classList.remove('active'));

  // 2. Tampilkan hanya konten yang ID-nya cocok dengan featureValue
  const targetContent = document.getElementById(featureValue);
  if (targetContent) {
    targetContent.classList.add('active');
  }
}

// === 1. MUAT LAYANAN AKTIF SAAT HALAMAN DIMUAT ===
document.addEventListener('DOMContentLoaded', () => {
  const savedLayanan = localStorage.getItem('layananAktif');
  if (savedLayanan) {
    layananSelect.value = savedLayanan;
    setActiveFeature(savedLayanan);
    statusEl.textContent = `✅ Layanan aktif: ${layananSelect.options[layananSelect.selectedIndex].text}`;
    statusEl.className = '';
  }
});

// === 2. FUNGSI UTAMA: SIMPAN LAYANAN (Pemicu Perubahan Tampilan) ===
saveLayananBtn.addEventListener('click', () => {
  const selected = layananSelect.value;
  
  if (!selected) {
    statusEl.textContent = '⚠️ Pilih layanan terlebih dahulu.';
    statusEl.className = 'error';
    return;
  }
  
  // Simpan ke localStorage
  localStorage.setItem('layananAktif', selected);
  
  // Ubah tampilan secara real-time
  setActiveFeature(selected);
  
  // Berikan feedback ke user
  statusEl.textContent = `✅ Layanan "${layananSelect.options[layananSelect.selectedIndex].text}" berhasil disimpan dan ditampilkan.`;
  statusEl.className = '';
});

// === 3. RESET PILIHAN LAYANAN ===
resetBtn.addEventListener('click', () => {
  // Hapus dari penyimpanan
  localStorage.removeItem('layananAktif');
  
  // Kembalikan dropdown ke kondisi awal
  layananSelect.value = '';
  
  // Sembunyikan semua konten fitur
  featureContents.forEach(content => content.classList.remove('active'));
  
  // Bersihkan pesan status
  statusEl.textContent = '⚠️ Tampilan direset. Silakan pilih layanan baru.';
  statusEl.className = 'error'; // Menggunakan warna merah/oranye untuk alert reset
  
  // Opsional: Kembalikan warna status ke normal setelah 2 detik
  setTimeout(() => {
    statusEl.textContent = '';
    statusEl.className = '';
  }, 3000);
});
