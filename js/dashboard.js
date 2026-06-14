// js/dashboard.js

const tabBtns = document.querySelectorAll('.tab-btn');
const featureContents = document.querySelectorAll('.feature-content');
const layananSelect = document.getElementById('layananSelect');
const saveLayananBtn = document.getElementById('saveLayananBtn');
const resetBtn = document.getElementById('resetBtn');
const statusEl = document.getElementById('status');

// === FUNGSI UNTUK SINKRONISASI TAB DAN DROPDOWN ===
function setActiveFeature(featureValue) {
  // 1. Reset semua tab dan konten
  tabBtns.forEach(b => b.classList.remove('active'));
  featureContents.forEach(content => content.classList.remove('active'));

  // 2. Aktifkan tab dan konten yang sesuai
  const targetBtn = document.querySelector(`.tab-btn[data-target="${featureValue}"]`);
  const targetContent = document.getElementById(featureValue);

  if (targetBtn && targetContent) {
    targetBtn.classList.add('active');
    targetContent.classList.add('active');
  }

  // 3. Sinkronkan nilai dropdown
  if (layananSelect) {
    layananSelect.value = featureValue;
  }
}

// === 1. EVENT LISTENER UNTUK TOMBOL TAB ===
tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const featureValue = btn.getAttribute('data-target');
    setActiveFeature(featureValue);
    
    // Opsional: Langsung simpan ke localStorage saat tab diklik
    localStorage.setItem('layananAktif', featureValue);
    statusEl.textContent = `✅ Layanan aktif: ${btn.textContent}`;
    statusEl.className = '';
  });
});

// === 2. MUAT LAYANAN AKTIF SAAT HALAMAN DIMUAT ===
document.addEventListener('DOMContentLoaded', () => {
  const savedLayanan = localStorage.getItem('layananAktif');
  if (savedLayanan) {
    setActiveFeature(savedLayanan);
    statusEl.textContent = `✅ Layanan aktif: ${layananSelect.options[layananSelect.selectedIndex].text}`;
    statusEl.className = '';
  }
});

// === 3. SIMPAN PILIHAN LAYANAN ===
saveLayananBtn.addEventListener('click', () => {
  const selected = layananSelect.value;
  if (!selected) {
    statusEl.textContent = '⚠️ Pilih layanan terlebih dahulu.';
    statusEl.className = 'error';
    return;
  }
  
  setActiveFeature(selected); // Pastikan tab juga ikut berubah
  localStorage.setItem('layananAktif', selected);
  statusEl.textContent = `✅ Layanan aktif: ${layananSelect.options[layananSelect.selectedIndex].text}`;
  statusEl.className = '';
});

// === 4. RESET PILIHAN LAYANAN ===
resetBtn.addEventListener('click', () => {
  localStorage.removeItem('layananAktif');
  layananSelect.value = '';
  
  // Reset tab ke default (misalnya tab pertama) atau kosongkan semua
  tabBtns.forEach(b => b.classList.remove('active'));
  featureContents.forEach(content => content.classList.remove('active'));
  
  statusEl.textContent = '';
  statusEl.className = '';
});
