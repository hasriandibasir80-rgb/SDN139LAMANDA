const houseNames = {
  1: 'data statistik',
  2: 'dasar',
  3: 'kamar',
  4: 'jalur',
  5: 'kontrol',
  6: 'besar/kecil',
  7: 'rampa40',
  8: 'kalkulator',
  9: 'filter',
  10: 'lemari',
  11: 'rata muncul',
  12: 'ranjang',
  13: 'tv',
  14: 'ganjil/genap',
  15: 'T@RD@L',
  16: 'beting show',
  17: 'pustaka',
  18: 'jarak lemah',
  19: 'RES HARIAN',
  20: 'KHUSUS NYA',
  21: 'tabel',
  22: 'sketsa bil',
  23: 'BBFS',
  24: 'coming soon',
  25: 'coming soon',
  26: 'coming soon',
  27: 'coming soon'
};

let activeMarket = null;
const statusEl = document.getElementById('status');

// === MUAT MARKET AKTIF SAAT HALAMAN DIMUAT ===
document.addEventListener('DOMContentLoaded', () => {
  const savedMarket = localStorage.getItem('marketAktif');
  if (savedMarket) {
    document.getElementById('period').value = savedMarket;
    activeMarket = savedMarket;
    statusEl.textContent = `✅ Market aktif: ${savedMarket}`;
    renderChildHouses();
  }
});

// === SIMPAN MARKET KE LOCALSTORAGE ===
document.getElementById('savePeriod').addEventListener('click', () => {
  const selected = document.getElementById('period').value;
  if (!selected) {
    statusEl.textContent = '⚠️ Pilih market terlebih dahulu.';
    statusEl.className = 'error';
    return;
  }
  activeMarket = selected;
  localStorage.setItem('marketAktif', selected);
  statusEl.textContent = `✅ Market aktif: ${selected}`;
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

// === RENDER DAFTAR "ANAK RUMAH" ===
function renderChildHouses() {
  const container = document.getElementById('houseList');
  container.innerHTML = '';

  for (const num in houseNames) {
    const a = document.createElement('a');
    a.href = `rumah${num}.html?market=${encodeURIComponent(activeMarket)}`;
    a.className = 'house-btn';
    a.textContent = `Rumah${num}\n(${houseNames[num]})`;
    a.style.whiteSpace = 'pre-line';
    container.appendChild(a);
  }

  document.getElementById('childHouses').style.display = 'block';
}
