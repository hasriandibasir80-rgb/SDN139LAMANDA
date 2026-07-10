// modules/kontrol-bel/kontrol-bel.js
// =========================================
// FITUR: PANEL KONTROL BEL MANUAL (MP3)
// BERDIRI SENDIRI (STANDALONE)
// TANPA TIMER, FULL USER GESTURE
// =========================================

// ⭐ URL Audio - Bisa pakai file lokal ATAU URL online
// Opsi 1: File lokal di repo (upload MP3 ke assets/audio/)
const BASE_AUDIO_URL = 'https://hasriandibasir80-rgb.github.io/SDN139LAMANDA/assets/audio/';

// Opsi 2: URL online (uncomment baris di bawah jika belum upload MP3)
// const BASE_AUDIO_URL = '';

const DAFTAR_BEL = [
  { id: 'masuk', nama: 'Bel Masuk Kelas', icon: '', file: 'bel-masuk.mp3', warna: '#3b82f6' },
  { id: 'istirahat', nama: 'Bel Istirahat', icon: '☕', file: 'bel-istirahat.mp3', warna: '#f59e0b' },
  { id: 'lanjut', nama: 'Bel Lanjut Belajar', icon: '📚', file: 'bel-lanjut.mp3', warna: '#10b981' },
  { id: 'pulang', nama: 'Bel Pulang Sekolah', icon: '🏠', file: 'bel-pulang.mp3', warna: '#ef4444' }
];

// State Audio
let audioPlayer = new Audio();
let sedangBerputar = null;

/**
 * Fungsi Utama Init
 */
export async function init(container) {
  renderUI(container);
  attachEvents();
}

export function cleanup() {
  stopAudio();
}

/**
 * Render UI - Tombol Besar untuk Mobile
 */
function renderUI(container) {
  container.innerHTML = `
    <div class="kontrol-bel-container">
      <div class="kontrol-bel-header">
        <h2>🎛️ Panel Kontrol Bel Sekolah</h2>
        <p>Klik tombol di bawah untuk membunyikan bel secara manual. Suara akan keluar dari speaker HP/Komputer.</p>
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
        <div class="volume-control">
          <label> Volume:</label>
          <input type="range" id="inpVolume" min="0" max="100" value="100">
          <span id="valVolume">100%</span>
        </div>
      </div>
      
      <div id="player-indicator" class="player-indicator" style="display: none;">
        🔊 Sedang Memutar: <span id="nama-bel-aktif">-</span>
      </div>
    </div>
  `;
}

/**
 * Attach Event Listeners
 */
function attachEvents() {
  document.querySelectorAll('.btn-bel').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const belId = btn.getAttribute('data-id');
      mainkanBel(belId);
    });
  });

  document.getElementById('btnStop').addEventListener('click', stopAudio);

  const volSlider = document.getElementById('inpVolume');
  const volVal = document.getElementById('valVolume');
  
  volSlider.addEventListener('input', (e) => {
    const val = e.target.value;
    volVal.textContent = val + '%';
    audioPlayer.volume = val / 100;
  });

  audioPlayer.volume = 1;
}

/**
 * Fungsi Memainkan Bel
 */
function mainkanBel(belId) {
  const belData = DAFTAR_BEL.find(b => b.id === belId);
  if (!belData) return;

  stopAudio();

  // ⭐ Gabungkan BASE_AUDIO_URL + nama file
  audioPlayer.src = BASE_AUDIO_URL + belData.file;
  
  updateUIStatus(belId, 'Memutar...');
  document.getElementById('player-indicator').style.display = 'block';
  document.getElementById('nama-bel-aktif').textContent = belData.nama;

  const playPromise = audioPlayer.play();

  if (playPromise !== undefined) {
    playPromise.then(() => {
      sedangBerputar = belId;
      console.log(`✅ Bel ${belData.nama} sedang diputar dari: ${audioPlayer.src}`);
    }).catch(error => {
      console.error('❌ Gagal memutar audio:', error);
      updateUIStatus(belId, 'Gagal!');
      
      // Tampilkan pesan error yang lebih jelas
      const errorMsg = `⚠️ Gagal memutar suara!\n\nFile: ${belData.file}\nURL: ${audioPlayer.src}\n\nPastikan:\n1. File MP3 sudah diupload ke folder assets/audio/\n2. Nama file sesuai\n3. Volume HP tidak mute`;
      alert(errorMsg);
      
      document.getElementById('player-indicator').style.display = 'none';
    });
  }

  audioPlayer.onended = () => {
    updateUIStatus(belId, 'Selesai');
    document.getElementById('player-indicator').style.display = 'none';
    sedangBerputar = null;
  };
  
  audioPlayer.onerror = (e) => {
    console.error('❌ Audio error:', e);
    updateUIStatus(belId, 'File tidak ditemukan!');
    document.getElementById('player-indicator').style.display = 'none';
  };
}

function stopAudio() {
  if (audioPlayer) {
    audioPlayer.pause();
    audioPlayer.currentTime = 0;
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
    else if (status === 'Gagal!' || status === 'File tidak ditemukan!') statusEl.style.color = '#ef4444';
    else if (status === 'Dihentikan') statusEl.style.color = '#f59e0b';
  }
}

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
  .btn-bel:hover {
    transform: translateY(-3px);
    box-shadow: 0 6px 16px rgba(0,0,0,0.15);
  }
  .btn-bel:active {
    transform: scale(0.97);
  }
  .btn-bel-icon { font-size: 40px; }
  .btn-bel-nama { font-size: 15px; font-weight: 700; color: #1e293b; text-align: center; }
  .btn-bel-status { font-size: 12px; color: #64748b; font-weight: 600; }
  
  .kontrol-bel-footer {
    background: white;
    padding: 20px;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    display: flex;
    flex-direction: column;
    gap: 15px;
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
  
  .volume-control {
    display: flex;
    align-items: center;
    gap: 10px;
    justify-content: center;
    font-size: 14px;
    color: #475569;
  }
  .volume-control input {
    flex: 1;
    max-width: 200px;
  }
  
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
