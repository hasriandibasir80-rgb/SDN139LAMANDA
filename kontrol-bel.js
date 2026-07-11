// modules/kontrol-bel/kontrol-bel.js
// =========================================
// PANEL KONTROL BEL SEKOLAH - FINAL VERSION
// ✅ Beep + Voice (Text-to-Speech)
// ✅ Berfungsi di HP
// ✅ Tidak perlu upload MP3
// =========================================

// State
let audioContext = null;
let speechSynth = window.speechSynthesis;
let audioUnlocked = false;
let indonesianVoice = null;
let sedangBerputar = null;

// Daftar Bel dengan Beep Pattern + Text Voice
const DAFTAR_BEL = [
  { 
    id: 'masuk', 
    nama: 'Bel Masuk Kelas', 
    icon: '', 
    text: 'Selamat pagi, ayo masuk kelas dan belajar yang rajin ya!',
    pattern: [{freq: 880, duration: 2000}], 
    warna: '#3b82f6' 
  },
  { 
    id: 'istirahat', 
    nama: 'Bel Istirahat', 
    icon: '☕', 
    text: 'Waktunya istirahat, silakan pergi ke kantin.',
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
    text: 'Waktunya masuk kelas kembali, ayo lanjut belajar!',
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
    text: 'Waktunya pulang, hati-hati di jalan. Sampai jumpa besok!',
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
  
  // ⭐ PRELOAD VOICES - KUNCI AGAR TTS BEKERJA DI MOBILE
  if (speechSynth) {
    const loadVoices = () => {
      const voices = speechSynth.getVoices();
      indonesianVoice = voices.find(v => v.lang === 'id-ID') || 
                       voices.find(v => v.lang.includes('id')) ||
                       voices.find(v => v.name.toLowerCase().includes('indonesia'));
      console.log('🎤 Voices loaded:', voices.length, '| Indonesian voice:', indonesianVoice?.name || 'Not found');
    };
    
    loadVoices();
    if (speechSynth.onvoiceschanged !== undefined) {
      speechSynth.onvoiceschanged = loadVoices;
    }
  }
  
  // Unlock audio on first interaction
  const unlockHandler = () => {
    unlockAudio();
    document.removeEventListener('click', unlockHandler);
    document.removeEventListener('touchstart', unlockHandler);
    document.removeEventListener('keydown', unlockHandler);
  };
  document.addEventListener('click', unlockHandler);
  document.addEventListener('touchstart', unlockHandler);
  document.addEventListener('keydown', unlockHandler);
}

export function cleanup() {
  stopAudio();
}

/**
 * ⭐ UNLOCK AUDIO - KUNCI AGAR TTS BEKERJA DI MOBILE
 */
function unlockAudio() {
  if (audioUnlocked) return;
  
  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
    
    // Play silent audio to unlock
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    gainNode.gain.value = 0.001;
    oscillator.frequency.value = 1;
    oscillator.start();
    setTimeout(() => oscillator.stop(), 100);
    
    // Speak silent text to unlock TTS
    if (speechSynth) {
      const silentUtterance = new SpeechSynthesisUtterance(' ');
      silentUtterance.volume = 0.01;
      speechSynth.speak(silentUtterance);
    }
    
    audioUnlocked = true;
    console.log('🔓 Audio unlocked');
    
    showToast('✅ Audio berhasil diaktifkan!');
  } catch (e) {
    console.error('Gagal unlock audio:', e);
  }
}

function renderUI(container) {
  container.innerHTML = `
    <div class="kontrol-bel-container">
      <div class="kontrol-bel-header">
        <h2>🎛️ Panel Kontrol Bel Sekolah</h2>
        <p>Klik tombol untuk membunyikan bel. Suara beep + voice akan keluar dari speaker.</p>
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
        <button class="btn-unlock" id="btnUnlock" onclick="unlockAudio()">🔓 Izinkan Suara (Klik Dulu!)</button>
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
 * Fungsi Utama: Mainkan Bel (Beep + Voice)
 */
function mainkanBel(belId) {
  const belData = DAFTAR_BEL.find(b => b.id === belId);
  if (!belData) return;

  // Pastikan audio unlock dulu
  if (!audioUnlocked) {
    unlockAudio();
    setTimeout(() => mainkanBel(belId), 500);
    return;
  }

  console.log(`🔔 Memutar: ${belData.nama}`);
  
  updateUIStatus(belId, 'Memutar...');
  document.getElementById('player-indicator').style.display = 'block';
  document.getElementById('nama-bel-aktif').textContent = belData.nama;
  sedangBerputar = belId;

  // 1. Mainkan beep pattern
  playPattern(belData.pattern, () => {
    // 2. Setelah beep selesai, mainkan voice
    console.log('✅ Beep selesai, memainkan voice...');
    speakText(belData.text);
    
    updateUIStatus(belId, 'Selesai');
    document.getElementById('player-indicator').style.display = 'none';
    sedangBerputar = null;
  });
}

/**
 * Mainkan pattern nada
 */
function playPattern(pattern, onComplete) {
  let currentTime = 0;
  
  pattern.forEach((note, index) => {
    setTimeout(() => {
      if (note.freq > 0) {
        playTone(note.freq, note.duration / 1000);
      }
      
      if (index === pattern.length - 1 && onComplete) {
        setTimeout(onComplete, note.duration);
      }
    }, currentTime);
    
    currentTime += note.duration;
  });
}

/**
 * Mainkan satu nada
 */
function playTone(frequency, duration) {
  try {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
    
  } catch (error) {
    console.error('❌ Error play tone:', error);
  }
}

/**
 * ⭐ SPEECH SYNTHESIS - KUNCI AGAR TTS BEKERJA DI MOBILE
 */
function speakText(text) {
  console.log('🗣️ speakText:', text);
  
  if (!speechSynth) {
    console.error('❌ TTS tidak tersedia');
    return;
  }
  
  try {
    if (audioContext && audioContext.state === 'suspended') {
      audioContext.resume();
    }
    
    speechSynth.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'id-ID';
    utterance.rate = 0.9;
    utterance.volume = 1;
    
    // PAKAI VOICE INDONESIA YANG SUDAH DI-CACHE
    if (indonesianVoice) {
      utterance.voice = indonesianVoice;
      console.log('🎤 Pakai voice:', indonesianVoice.name);
    }
    
    // Set pitch (default female)
    utterance.pitch = 1.15;
    
    utterance.onstart = () => console.log('✅ TTS started');
    utterance.onend = () => console.log('✅ TTS ended');
    utterance.onerror = (e) => {
      console.error('❌ TTS error:', e);
    };
    
    speechSynth.speak(utterance);
  } catch (e) {
    console.error('TTS exception:', e);
  }
}

function stopAudio() {
  if (audioContext) {
    if (audioContext.state === 'running') {
      audioContext.suspend();
      setTimeout(() => audioContext.resume(), 100);
    }
  }
  
  if (speechSynth) {
    speechSynth.cancel();
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

function showToast(msg) {
  const toast = document.createElement('div');
  toast.textContent = msg;
  toast.style.cssText = `position: fixed; top: 20px; right: 20px; background: #ec4899; color: white; padding: 14px 24px; border-radius: 10px; z-index: 10001; font-weight: 600;`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
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
  .btn-unlock {
    background: #f59e0b;
    color: white;
    border: none;
    padding: 15px;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 700;
    cursor: pointer;
    width: 100%;
    animation: pulse 2s infinite;
  }
  @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
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
  @media (max-width: 600px) {
    .kontrol-bel-grid { grid-template-columns: 1fr; }
    .btn-bel { flex-direction: row; justify-content: flex-start; padding: 15px 20px; }
    .btn-bel-icon { font-size: 32px; margin-right: 15px; }
    .btn-bel-nama { text-align: left; }
  }
`;
document.head.appendChild(style);
