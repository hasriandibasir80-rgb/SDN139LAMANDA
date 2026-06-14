// js/dashboard.js

const houseNames = {
  1: 'DATA SISWA',
  2: 'PRESENSI',
  3: 'PENILAIAN',
  4: 'MODUL AJAR',
  5: 'CP,TP,ATP',
  6: 'REFLEKSI',
  7: 'BAN SOAL',
  8: 'JADWAL PEMBELAJARAN',
  9: 'SUVERVISI',
  10: 'COMING SOON',
  11: 'COMING SOON',
  12: 'MENUJU SIAGA',
  13: 'dicoba'
};

// ✅ PERBAIKI: Gunakan nama variabel yang konsisten
let activeFitur = null;
const statusEl = document.getElementById('status');

// === MUAT FITUR AKTIF SAAT HALAMAN DIMUAT ===
document.addEventListener('DOMContentLoaded', () => {
  const savedFitur = localStorage.getItem('fiturAktif');
  if (savedFitur) {
    document.getElementById('period').value = savedFitur;
    activeFitur = savedFitur;
    statusEl.textContent = `✅ Fitur aktif: ${savedFitur}`;
    statusEl.className = '';
    renderChildHouses();
  }
});

// === SIMPAN FITUR KE LOCALSTORAGE ===
document.getElementById('savePeriod').addEventListener('click', () => {
  const selected = document.getElementById('period').value;
  if (!selected) {
    statusEl.textContent = '⚠️ Pilih fitur terlebih dahulu.';
    statusEl.className = 'error';
    return;
  }
  
  // ✅ PERBAIKI: Gunakan activeFitur, bukan activeMarket
  activeFitur = selected;
  localStorage.setItem('fiturAktif', selected);
  statusEl.textContent = `✅ Fitur aktif: ${selected}`;
  statusEl.className = '';
  renderChildHouses();
});

// === RESET (BERSIHKAN PEMILIHAN) ===
document.getElementById('resetBtn').addEventListener('click', () => {
  // ✅ PERBAIKI: Gunakan activeFitur dan 'fiturAktif'
  activeFitur = null;
  localStorage.removeItem('fiturAktif');
  document.getElementById('period').value = '';
  document.getElementById('childHouses').style.display = 'none';
  statusEl.textContent = '';
  statusEl.className = '';
});

// === RENDER DAFTAR "FITUR" ===
function renderChildHouses() {
  const container = document.getElementById('houseList');
  container.innerHTML = '';

  for (const num in houseNames) {
    const a = document.createElement('a');
    // ✅ PERBAIKI: Gunakan parameter ?fitur= bukan ?market=
    a.href = `FITUR${num}.html?fitur=${encodeURIComponent(activeFitur)}`;
    a.className = 'house-btn';
    a.textContent = `FITUR ${num}\n(${houseNames[num]})`;
    a.style.whiteSpace = 'pre-line';
    container.appendChild(a);
  }

  document.getElementById('childHouses').style.display = 'block';
}
