/**
 * Dashboard Logic - Rumah Utama
 * Fitur: Market selection + Dynamic child houses navigation
 * Compatible: Mobile, Firebase-ready, localStorage persistence
 */

// === DATA: Nama "Rumah Anak" ===
const houseNames = {
  1: 'Pasar 1',
  2: 'Pasar 2',
  3: 'Pasar 3',
  4: 'Pasar 4',
  5: 'Pasar 5'
  // Tambahkan sesuai kebutuhan
};

let activeMarket = null;
const statusEl = document.getElementById('status');

// === UTIL: Tampilkan status message ===
function showStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.className = isError ? 'error' : '';
}

// === RENDER: Daftar Rumah Anak ===
function renderChildHouses() {
  const container = document.getElementById('houseList');
  if (!container) return;
  
  container.innerHTML = '';

  for (const num in houseNames) {
    const link = document.createElement('a');
    const marketParam = encodeURIComponent(activeMarket);
    link.href = `rumah${num}.html?market=${marketParam}`;
    link.className = 'house-btn';
    link.setAttribute('role', 'listitem');
    link.innerHTML = `Rumah${num}<br><small>(${houseNames[num]})</small>`;
    container.appendChild(link);
  }

  document.getElementById('childHouses').hidden = false;
}

// === INIT: Load market dari localStorage ===
function initDashboard() {
  const savedMarket = localStorage.getItem('marketAktif');
  const periodSelect = document.getElementById('period');
  
  if (savedMarket && periodSelect) {
    periodSelect.value = savedMarket;
    activeMarket = savedMarket;
    showStatus(`✅ Market aktif: ${savedMarket}`);
    renderChildHouses();
  }
}

// === EVENT: Simpan market pilihan ===
function handleSaveMarket() {
  const periodSelect = document.getElementById('period');
  const selected = periodSelect?.value;
  
  if (!selected) {
    showStatus('⚠️ Pilih market terlebih dahulu.', true);
    return;
  }
  
  activeMarket = selected;
  localStorage.setItem('marketAktif', selected);
  showStatus(`✅ Market aktif: ${selected}`);
  renderChildHouses();
}

// === EVENT: Reset pilihan ===
function handleReset() {
  activeMarket = null;
  localStorage.removeItem('marketAktif');
  
  const periodSelect = document.getElementById('period');
  if (periodSelect) periodSelect.value = '';
  
  const childHouses = document.getElementById('childHouses');
  if (childHouses) childHouses.hidden = true;
  
  showStatus('');
}

// === REGISTER EVENT LISTENERS ===
function setupEventListeners() {
  const saveBtn = document.getElementById('savePeriod');
  const resetBtn = document.getElementById('resetBtn');
  
  if (saveBtn) {
    saveBtn.addEventListener('click', handleSaveMarket);
  }
  
  if (resetBtn) {
    resetBtn.addEventListener('click', handleReset);
  }
}

// === DOM READY ===
document.addEventListener('DOMContentLoaded', () => {
  initDashboard();
  setupEventListeners();
  
  // Debug: pastikan script terload
  console.log('📊 Dashboard.js loaded - Market:', activeMarket || 'none');
});
