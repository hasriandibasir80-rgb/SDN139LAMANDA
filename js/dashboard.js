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
  12: 'MENUJU SIAGA'
  
};

let activefitur = null;
const statusEl = document.getElementById('status');

// === MUAT FITUR AKTIF SAAT HALAMAN DIMUAT ===
document.addEventListener('DOMContentLoaded', () => {
  const savedFitur = localStorage.getItem('fiturAktif');
  if (savedFitur) {
    document.getElementById('period').value = savedFitur;
    activeFitur = savedFitur;
    statusEl.textContent = `✅ fitur aktif: ${savedFitur}`;
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
  activeMarket = selected;
  localStorage.setItem('fiturAktif', selected);
  statusEl.textContent = `✅ Fitur aktif: ${selected}`;
  statusEl.className = '';
  renderChildHouses();
});

// === RESET (BERSIHKAN PEMILIHAN) ===
document.getElementById('resetBtn').addEventListener('click', () => {
  activeMarket = null;
  localStorage.removeItem('marketAktif');
  document.getElementById('period').value = '';
  document.getElementById('childHouses').style.display = 'none';
  statusEl.textContent = '';
});

// === RENDER DAFTAR "FITUR" ===
function renderChildHouses() {
  const container = document.getElementById('houseList');
  container.innerHTML = '';

  for (const num in houseNames) {
    const a = document.createElement('a');
    a.href = `FITUR${num}.html?market=${encodeURIComponent(activeMarket)}`;
    a.className = 'house-btn';
    a.textContent = `FITUR${num}\n(${houseNames[num]})`;
    a.style.whiteSpace = 'pre-line';
    container.appendChild(a);
  }

  document.getElementById('childHouses').style.display = 'block';
}
