// modules/kontrol-bel/kontrol-bel.js
// =========================================
// PANEL KONTROL BEL SEKOLAH - WEB AUDIO API
// TIDAK PERLU UPLOAD MP3!
// Suara dihasilkan oleh browser (oscillator)
// =========================================

let audioContext = null;
let sedangBerputar = null;

// Daftar Bel dengan konfigurasi nada
const DAFTAR_BEL = [
  { 
    id: 'masuk', 
    nama: 'Bel Masuk Kelas', 
    icon: '', 
    // Nada panjang: 880Hz selama 2 detik
    pattern: [{freq: 880, duration: 2000}], 
    warna: '#3b82f6' 
  },
  { 
    id: 'istirahat', 
    nama: 'Bel Istirahat', 
    icon: '☕', 
    // Nada pendek 3x: beep-beep-beep
    pattern: [
      {freq: 880, duration: 300},
      {freq: 0, duration: 200},
      {freq: 880, duration: 300},
      {freq: 0, duration: 200},
      {freq: 880, duration: 300}
    ], 
    warna: '#f59e0b' 
  },
  { 
    id: 'lanjut', 
    nama: 'Bel Lanjut Belajar', 
    icon: '', 
    // Nada sedang 2x: beep-beep
    pattern: [
      {freq: 880, duration: 500},
      {freq: 0, duration: 200},
      {freq: 880, duration: 500}
    ], 
    warna: '#10b981' 
  },
  { 
    id: 'pulang', 
    nama: 'Bel Pulang Sekolah', 
    icon: '', 
    // Nada panjang 4x: beep-beep-beep-beep
    pattern: [
      {freq: 880, duration: 400},
      {freq: 0, duration: 150},
      {freq: 880, duration: 400},
      {freq: 0, duration: 150},
      {freq: 880, duration: 400},
      {freq: 0, duration: 150},
      {freq: 880, duration: 400}
    ], 
    warna: '#ef4444' 
  }
];

export async function init(container) {
  renderUI(container);
  attachEvents();
}

export function cleanup() {
  stopAudio();
}

function renderUI(container) {
  container.innerHTML = `
    <div class="kontrol-bel-container">
      <div class="kontrol-bel-header">
        <h2>🎛️ Panel Kontrol Bel Sekolah</h2>
        <p>Klik tombol untuk membunyikan bel. Suara dihasilkan oleh browser (tanpa file MP3).</p>
      </div>
      <div class="kontrol-bel-grid">
        ${DAFTAR_BEL.map(bel => `
          <button class="btn-bel" data-id="${bel.id}" style="border-left: 5px solid ${bel.warna};">
            <div class="btn-bel-icon">${bel.icon}</div>
            <div class="btn-bel-nama">${bel.nama}</div>
            <div class="btn-bel-status" id="status-${bel.id}">Siap</div>
          </button>
        `).join('')}
      </div>
      <div class="kontrol-bel-footer">
        <button class="btn-stop" id="btnStop">⏹️ Stop / Matikan Suara</button>
      </div>
      <div id="player-indicator" class="player-indicator" style="display: none;">
        🔊 Sedang Memutar: <span id="nama-bel-aktif">-</span>
      </div>
    </div>
  `;
}

function attachEvents() {
  document.querySelectorAll('.btn-bel').forEach(btn => {
    btn.addEventListener('click', () => mainkanBel(btn.getAttribute('data-id')));
  });
  
  document.getElementById('btnStop').addEventListener('click', stopAudio);
}

/**
 * Fungsi Utama: Mainkan Bel dengan Web Audio API
 */
function mainkanBel(belId) {
  const belData = DAFTAR_BEL.find(b => b.id === belId);
  if (!belData) return;

  console.log(`🔔 Memutar: ${belData.nama}`);
  
  // Unlock audio context jika belum
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  
  updateUIStatus(belId, 'Memutar...');
  document.getElementById('player-indicator').style.display = 'block';
  document.getElementById('nama-bel-aktif').textContent = belData.nama;
  sedangBerputar = belId;

  // Mainkan pattern nada
  playPattern(belData.pattern, () => {
    // Callback saat selesai
    updateUIStatus(belId, 'Selesai');
    document.getElementById('player-indicator').style.display = 'none';
    sedangBerputar = null;
    console.log('✅ Bel selesai diputar');
  });
}

/**
 * Mainkan pattern nada (array frekuensi & durasi)
 */
function playPattern(pattern, onComplete) {
  let currentTime = 0;
  
  pattern.forEach((note, index) => {
    setTimeout(() => {
      if (note.freq > 0) {
        playTone(note.freq, note.duration / 1000);
      }
      
      // Jika ini note terakhir, panggil callback
      if (index === pattern.length - 1 && onComplete) {
        setTimeout(onComplete, note.duration);
      }
    }, currentTime);
    
    currentTime += note.duration;
  });
}

/**
 * Mainkan satu nada dengan frekuensi tertentu
 */
function playTone(frequency, duration) {
  try {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';
    
    // Volume
    gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
    
  } catch (error) {
    console.error('❌ Error play tone:', error);
  }
}

/**
 * Stop audio
 */
function stopAudio() {
  if (audioContext) {
    // Suspend context untuk stop semua suara
    if (audioContext.state === 'running') {
      audioContext.suspend();
      setTimeout(() => audioContext.resume(), 100);
    }
  }
  
  if (sedangBerputar) {
    updateUIStatus(sedangBerputar, 'Dihentikan');
    setTimeout(() => updateUIStatus(sedangBerputar, 'Siap'), 2000);
  }
  
  sedangBerputar = null;
  document.getElementById('player-indicator').style.display = 'none';
}

function updateUIStatus(belId, status) {
  document.querySelectorAll('.btn-bel-status').forEach(el => {
    el.textContent = 'Siap';
    el.style.color = '#64748b';
  });
  
  const statusEl = document.getElementById(`status-${belId}`);
  if (statusEl) {
    statusEl.textContent = status;
    if (status === 'Memutar...') statusEl.style.color = '#10b981';
    else if (status === 'Selesai') statusEl.style.color = '#10b981';
    else if (status === 'Dihentikan') statusEl.style.color = '#f59e0b';
  }
}

// CSS Inline
const style = document.createElement('style');
style.textContent = `
  .kontrol-bel-container {
    background: linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%);
    border-radius: 16px;
    padding: 25px;
    font-family: 'Segoe UI', sans-serif;
    max-width: 800px;
    margin: 0 auto;
    box-shadow: 0 8px 24px rgba(236, 72, 153, 0.15);
  }
  .kontrol-bel-header {
    background: linear-gradient(135deg, #ec4899 0%, #f472b6 100%);
    color: white;
    padding: 25px;
    border-radius: 12px;
    margin-bottom: 25px;
    text-align: center;
  }
  .kontrol-bel-header h2 { margin: 0 0 8px 0; font-size: 24px; }
  .kontrol-bel-header p { margin: 0; opacity: 0.95; font-size: 14px; }
  .kontrol-bel-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 15px;
    margin-bottom: 25px;
  }
  .btn-bel {
    background: white;
    border: none;
    border-radius: 12px;
    padding: 20px 15px;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0,0,0,0.08);
    transition: all 0.2s;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }
  .btn-bel:hover { transform: translateY(-3px); box-shadow: 0 6px 16px rgba(0,0,0,0.15); }
  .btn-bel:active { transform: scale(0.97); }
  .btn-bel-icon { font-size: 40px; }
  .btn-bel-nama { font-size: 15px; font-weight: 700; color: #1e293b; text-align: center; }
  .btn-bel-status { font-size: 12px; color: #64748b; font-weight: 600; }
  .kontrol-bel-footer {
    background: white;
    padding: 20px;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  }
  .btn-stop {
    background: #6b7280;
    color: white;
    border: none;
    padding: 15px;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 700;
    cursor: pointer;
    width: 100%;
  }
  .btn-stop:hover { background: #4b5563; }
  .player-indicator {
    margin-top: 15px;
    text-align: center;
    background: #fff1f2;
    color: #be185d;
    padding: 10px;
    border-radius: 8px;
    font-weight: 600;
    font-size: 14px;
    animation: pulse 1.5s infinite;
  }
  @keyframes pulse {
    0% { opacity: 1; }
    50% { opacity: 0.6; }
    100% { opacity: 1; }
  }
  @media (max-width: 600px) {
    .kontrol-bel-grid { grid-template-columns: 1fr; }
    .btn-bel { flex-direction: row; justify-content: flex-start; padding: 15px 20px; }
    .btn-bel-icon { font-size: 32px; margin-right: 15px; }
    .btn-bel-nama { text-align: left; }
  }
`;
document.head.appendChild(style);
