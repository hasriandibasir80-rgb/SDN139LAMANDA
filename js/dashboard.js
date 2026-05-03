/**
 * Dashboard Logic - Rumah Anak
 * Fitur: 7 Main Cards → 3 Sub-features each
 * Compatible: Mobile, Firebase-ready, localStorage persistence
 */

// === CONFIG: 7 Fitur Utama (Placeholder - bisa di-custom nanti) ===
const FEATURES = [
  { id: 1, name: 'Fitur 1', desc: 'Deskripsi fitur 1', icon: '🔹', subs: ['Sub 1A', 'Sub 1B', 'Sub 1C'] },
  { id: 2, name: 'Fitur 2', desc: 'Deskripsi fitur 2', icon: '🔹', subs: ['Sub 2A', 'Sub 2B', 'Sub 2C'] },
  { id: 3, name: 'Fitur 3', desc: 'Deskripsi fitur 3', icon: '🔹', subs: ['Sub 3A', 'Sub 3B', 'Sub 3C'] },
  { id: 4, name: 'Fitur 4', desc: 'Deskripsi fitur 4', icon: '🔹', subs: ['Sub 4A', 'Sub 4B', 'Sub 4C'] },
  { id: 5, name: 'Fitur 5', desc: 'Deskripsi fitur 5', icon: '🔹', subs: ['Sub 5A', 'Sub 5B', 'Sub 5C'] },
  { id: 6, name: 'Fitur 6', desc: 'Deskripsi fitur 6', icon: '🔹', subs: ['Sub 6A', 'Sub 6B', 'Sub 6C'] },
  { id: 7, name: 'Fitur 7', desc: 'Deskripsi fitur 7', icon: '🔹', subs: ['Sub 7A', 'Sub 7B', 'Sub 7C'] }
];

// === STATE ===
let activeMarket = null;
let currentView = 'main'; // 'main' | 'sub-feature'
let selectedFeature = null;

// === DOM ELEMENTS ===
const statusEl = document.getElementById('status');
const featuresGrid = document.querySelector('.features-grid');
const backBtn = document.getElementById('backBtn');
const periodSelect = document.getElementById('period');

// === UTIL: Show Status Message ===
function showStatus(message, isError = false) {
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.className = `status-msg ${isError ? 'error' : ''}`;
  // Auto-clear success message after 3s
  if (!isError) setTimeout(() => { if (statusEl.textContent === message) statusEl.textContent = ''; }, 3000);
}

// === RENDER: 7 Feature Cards ===
function renderFeatures() {
  if (!featuresGrid) return;
  featuresGrid.innerHTML = '';

  FEATURES.forEach(feature => {
    const card = document.createElement('article');
    card.className = 'feature-card';
    card.setAttribute('role', 'listitem');
    card.setAttribute('data-feature', feature.id);
    card.innerHTML = `
      <h3>${feature.icon} ${feature.name}</h3>
      <p>${feature.desc}</p>
      <div class="sub-features">
        ${feature.subs.map((sub, idx) => 
          `<button type="button" data-sub="${idx + 1}">${sub}</button>`
        ).join('')}
      </div>
    `;
    featuresGrid.appendChild(card);
  });
}

// === NAVIGATION: Handle Sub-Feature Click ===
function handleSubFeatureClick(featureId, subIndex) {
  const feature = FEATURES.find(f => f.id === featureId);
  if (!feature) return;
  
  selectedFeature = { feature, subIndex, subName: feature.subs[subIndex - 1] };
  currentView = 'sub-feature';
  
  // Tampilkan UI sub-feature (placeholder - nanti diganti form real)
  showStatus(`🔍 Membuka: ${feature.name} → ${selectedFeature.subName}`);
  
  // Tampilkan tombol BACK
  if (backBtn) backBtn.classList.remove('hidden');
  
  // TODO: Di sini nanti load konten sub-feature (form/input)
  // Contoh: window.location.href = `features/feature-${featureId}-sub${subIndex}.html?market=${activeMarket}`;
  console.log('Navigasi ke sub-feature:', selectedFeature);
}

// === NAVIGATION: Handle Back Button ===
function handleBack() {
  currentView = 'main';
  selectedFeature = null;
  
  if (backBtn) backBtn.classList.add('hidden');
  showStatus('✅ Kembali ke dashboard');
  
  // TODO: Di sini nanti bersihkan/restore view utama
  // Contoh: reload features grid atau restore state sebelumnya
}

// === PERSISTENCE: Load Market dari localStorage ===
function loadMarketPreference() {
  const saved = localStorage.getItem('marketAktif');
  if (saved && periodSelect) {
    periodSelect.value = saved;
    activeMarket = saved;
    showStatus(`✅ Periode aktif: ${saved}`);
  }
}

// === EVENT: Save Market ===
function handleSaveMarket() {
  const selected = periodSelect?.value;
  if (!selected) {
    showStatus('⚠️ Pilih periode terlebih dahulu.', true);
    return;
  }
  activeMarket = selected;
  localStorage.setItem('marketAktif', selected);
  showStatus(`✅ Periode disimpan: ${selected}`);
}

// === EVENT: Reset Market ===
function handleResetMarket() {
  activeMarket = null;
  localStorage.removeItem('marketAktif');
  if (periodSelect) periodSelect.value = '';
  showStatus('🗑️ Periode direset');
}

// === SETUP: Event Listeners ===
function setupEventListeners() {
  // Delegasi event untuk feature cards (lebih efisien dari attach per card)
  featuresGrid?.addEventListener('click', (e) => {
    const subBtn = e.target.closest('button[data-sub]');
    const card = e.target.closest('.feature-card[data-feature]');
    
    if (subBtn && card) {
      // Klik tombol sub-feature
      e.stopPropagation();
      const featureId = parseInt(card.dataset.feature);
      const subIndex = parseInt(subBtn.dataset.sub);
      handleSubFeatureClick(featureId, subIndex);
    } else if (card) {
      // Klik card (opsional: expand info atau pilih default sub)
      console.log('Card clicked:', card.dataset.feature);
    }
  });

  // Back button
  backBtn?.addEventListener('click', handleBack);

  // Market selector
  document.getElementById('savePeriod')?.addEventListener('click', handleSaveMarket);
  document.getElementById('resetPeriod')?.addEventListener('click', handleResetMarket);

  // Logout button (SULU) - panggil fungsi dari auth-login.js
  document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    const btn = document.getElementById('logoutBtn');
    btn.disabled = true;
    try {
      if (typeof window.handleLogout === 'function') {
        await window.handleLogout();
      }
    } catch (err) {
      console.error('Logout error:', err);
      alert('Gagal logout: ' + err.message);
    } finally {
      btn.disabled = false;
    }
  });
}

// === INIT: DOM Ready ===
document.addEventListener('DOMContentLoaded', () => {
  console.log('📊 dashboard.js loaded');
  
  loadMarketPreference();
  renderFeatures();
  setupEventListeners();
  
  // Debug: pastikan fungsi auth tersedia
  setTimeout(() => {
    console.log('✅ handleLogout tersedia:', typeof window.handleLogout === 'function');
  }, 300);
});
