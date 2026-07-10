// modules/admin-pembelajaran/features/jadwal.js
// =========================================
// JADWAL PEMBELAJARAN + BEL OTOMATIS
// FINAL VERSION - GABUNGAN TERBAIK
// ✅ Suara TTS terdengar di HP
// ✅ Beep berfungsi
// ✅ Notifikasi muncul
// ✅ Bel otomatis berjalan
// =========================================

import { db } from '../../../js/firebase-config.js';
import { getDatabase, ref, get, set } 
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
const database = getDatabase();

const CSS_PATH = '../../../css/modules/jadwal.css';
const CSS_ID = 'jadwal-css';

const HARI_LIST = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'];

const DEFAULT_JADWAL = {
  warnaMapel: {
    'Matematika': '#3b82f6',
    'Bahasa Indonesia': '#10b981',
    'IPA': '#f59e0b',
    'IPS': '#8b5cf6',
    'PJOK': '#ef4444',
    'Seni Budaya': '#ec4899',
    'Bahasa Inggris': '#06b6d4',
    'Agama': '#84cc16',
    'PKn': '#f97316',
    '': '#94a3b8'
  }
};

// State
let audioContext = null;
let belInterval = null;
let keepAliveInterval = null;
let lastBelMinute = '';
let speechSynth = window.speechSynthesis;
let audioUnlocked = false;
let indonesianVoice = null; // ← Voice Indonesia yang sudah di-cache

export async function init(container, db) {
  loadCSS();
  renderUI(container);
  attachEvents();
  loadTTDDefaults();
  requestNotificationPermission();
  
  // Unlock audio on ANY user interaction
  const unlockHandler = () => {
    unlockAudio();
    document.removeEventListener('click', unlockHandler);
    document.removeEventListener('touchstart', unlockHandler);
    document.removeEventListener('keydown', unlockHandler);
  };
  document.addEventListener('click', unlockHandler);
  document.addEventListener('touchstart', unlockHandler);
  document.addEventListener('keydown', unlockHandler);
  
  // ⭐ PRELOAD VOICES - KUNCI AGAR TTS BEKERJA DI MOBILE
  if (speechSynth) {
    const loadVoices = () => {
      const voices = speechSynth.getVoices();
      // Cari voice Indonesia
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
  
  console.log('✅ Jadwal module initialized');
}

export function cleanup() {
  const css = document.getElementById(CSS_ID);
  if (css) css.remove();
  stopBelOtomatis();
}

function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

/**
 * ⭐ UNLOCK AUDIO - KUNCI AGAR TTS BEKERJA DI MOBILE
 * Harus dipanggil dari user gesture (klik/tap)
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
    
    // Play silent audio to unlock (WAJIB di mobile!)
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    gainNode.gain.value = 0.001; // Hampir silent
    oscillator.frequency.value = 1;
    oscillator.start();
    setTimeout(() => oscillator.stop(), 100);
    
    // Speak silent text to unlock TTS (WAJIB di mobile!)
    if (speechSynth) {
      const silentUtterance = new SpeechSynthesisUtterance(' ');
      silentUtterance.volume = 0.01;
      speechSynth.speak(silentUtterance);
    }
    
    audioUnlocked = true;
    console.log('🔓 Audio unlocked');
    
    // Update UI status
    const audioStatusEl = document.getElementById('audioStatus');
    if (audioStatusEl) {
      audioStatusEl.textContent = '✅ Audio: Ter-unlock';
      audioStatusEl.style.color = '#10b981';
    }
  } catch (e) {
    console.error('Gagal unlock audio:', e);
  }
}

/**
 * ⭐ KEEP ALIVE - Jaga audio context tetap hidup di mobile
 */
function startKeepAlive() {
  if (keepAliveInterval) clearInterval(keepAliveInterval);
  
  keepAliveInterval = setInterval(() => {
    if (audioContext && audioContext.state === 'suspended') {
      audioContext.resume();
    }
    
    // Silent ping setiap 30 detik
    if (audioContext && audioUnlocked) {
      try {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        gainNode.gain.value = 0.001;
        oscillator.frequency.value = 1;
        oscillator.start();
        setTimeout(() => oscillator.stop(), 50);
      } catch (e) {}
    }
  }, 30000);
}

function loadCSS() {
  if (document.getElementById(CSS_ID)) return;
  
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = CSS_PATH;
  link.id = CSS_ID;
  
  link.onerror = () => {
    const style = document.createElement('style');
    style.id = CSS_ID + '-inline';
    style.textContent = getInlineCSS();
    document.head.appendChild(style);
  };
  
  document.head.appendChild(link);
}

function getInlineCSS() {
  return `
    .jadwal-container { background: linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%); border-radius: 16px; padding: 25px; font-family: 'Segoe UI', sans-serif; max-width: 1200px; margin: 0 auto; box-shadow: 0 8px 24px rgba(236, 72, 153, 0.15); }
    .jadwal-header { background: linear-gradient(135deg, #ec4899 0%, #f472b6 100%); color: white; padding: 30px; border-radius: 12px; margin-bottom: 25px; box-shadow: 0 4px 12px rgba(236, 72, 153, 0.3); }
    .jadwal-header h2 { margin: 0 0 8px 0; font-size: 28px; font-weight: 700; }
    .jadwal-header p { margin: 0; opacity: 0.95; font-size: 15px; }
    .jadwal-form { background: white; padding: 30px; border-radius: 12px; box-shadow: 0 2px 8px rgba(236, 72, 153, 0.1); }
    .form-section-title { font-size: 18px; font-weight: 700; color: #be185d; margin: 25px 0 18px 0; border-bottom: 3px solid #fce7f3; padding-bottom: 8px; }
    .form-section-title:first-child { margin-top: 0; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 15px; }
    .form-group { margin-bottom: 18px; }
    .form-group label { display: block; margin-bottom: 8px; font-weight: 600; font-size: 14px; color: #831843; }
    .form-control { width: 100%; padding: 14px 16px; border: 2px solid #fbcfe8; border-radius: 8px; font-size: 15px; box-sizing: border-box; background: white; color: #831843; }
    .form-control:focus { outline: none; border-color: #ec4899; box-shadow: 0 0 0 3px rgba(236, 72, 153, 0.15); }
    select.form-control { cursor: pointer; }
    .jadwal-grid-wrapper { overflow-x: auto; margin: 20px 0; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .jadwal-table { width: 100%; border-collapse: collapse; background: white; min-width: 800px; }
    .jadwal-table th { background: linear-gradient(135deg, #ec4899 0%, #f472b6 100%); color: white; padding: 12px 8px; text-align: center; font-weight: 700; border: 1px solid #ec4899; }
    .jadwal-table td { padding: 10px 8px; border: 1px solid #e2e8f0; text-align: center; vertical-align: top; min-width: 120px; }
    .jadwal-table tr:nth-child(even) { background: #fff1f2; }
    .jp-cell { font-weight: 600; color: #831843; background: #fce7f3; }
    .mapel-cell { padding: 8px; border-radius: 6px; cursor: pointer; min-height: 60px; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 4px; }
    .mapel-cell.istirahat { background: #94a3b8; color: white; font-style: italic; }
    .mapel-name { font-weight: 700; font-size: 13px; }
    .mapel-guru { font-size: 11px; color: #475569; }
    .mapel-cell.empty { background: #f1f5f9; color: #94a3b8; }
    .color-picker-wrapper { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 10px; }
    .color-option { width: 30px; height: 30px; border-radius: 50%; cursor: pointer; border: 3px solid transparent; }
    .color-option.selected { border-color: #1e293b; }
    .gen-action { margin-top: 30px; display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; }
    .btn-action { padding: 12px 24px; border: none; border-radius: 8px; font-weight: 600; font-size: 15px; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; box-shadow: 0 2px 6px rgba(0,0,0,0.1); }
    .btn-save { background: #10b981; color: white; }
    .btn-print { background: #8b5cf6; color: white; }
    .btn-download { background: #3b82f6; color: white; }
    .btn-reset { background: #6b7280; color: white; }
    .btn-unlock { background: #f59e0b; color: white; animation: pulse 2s infinite; }
    .btn-test { background: #3b82f6; color: white; }
    @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
    .countdown-display { font-size: 32px; font-weight: 700; color: #ec4899; margin: 10px 0; font-family: 'Courier New', monospace; }
    @keyframes bellPulse { 0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; } 100% { transform: translate(-50%, -50%) scale(1); opacity: 1; } }
    .bell-notif-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 9999; }
    .bell-notif-content { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: linear-gradient(135deg, #ec4899 0%, #f472b6 100%); color: white; padding: 40px 60px; border-radius: 20px; box-shadow: 0 20px 60px rgba(236, 72, 153, 0.4); z-index: 10000; text-align: center; animation: bellPulse 0.5s ease; max-width: 90%; }
    .bell-notif-icon { font-size: 48px; margin-bottom: 15px; }
    .bell-notif-title { font-size: 24px; font-weight: 700; margin-bottom: 10px; }
    .bell-notif-time { font-size: 14px; opacity: 0.9; }
    @media print { body * { visibility: hidden; } .jadwal-container, .jadwal-container * { visibility: visible; } .jadwal-container { position: absolute; left: 0; top: 0; width: 100%; padding: 20px; background: white !important; } .gen-action, .form-section-title { display: none !important; } }
    @media (max-width: 768px) { .jadwal-container { padding: 15px; } .jadwal-header h2 { font-size: 22px; } .form-grid { grid-template-columns: 1fr; } .btn-action { width: 100%; justify-content: center; } }
  `;
}

function loadTTDDefaults() {
  const saved = localStorage.getItem('jadwal_ttd');
  let ttdData = {
    namaKepsek: 'Imam munandar SP.d',
    nipKepsek: '-',
    namaGuru: 'Hasriandi basir SP.d',
    nipGuru: '-'
  };
  
  if (saved) {
    try {
      ttdData = { ...ttdData, ...JSON.parse(saved) };
    } catch (e) {}
  }
  
  setTimeout(() => {
    ['inpKepsek', 'inpNipKepsek', 'inpGuruPengampu', 'inpNipGuru'].forEach(id => {
      const el = document.getElementById(id);
      const key = id === 'inpKepsek' ? 'namaKepsek' : id === 'inpNipKepsek' ? 'nipKepsek' : id === 'inpGuruPengampu' ? 'namaGuru' : 'nipGuru';
      if (el) el.value = ttdData[key];
    });
  }, 100);
}

function saveTTDDefaults() {
  const ttdData = {
    namaKepsek: document.getElementById('inpKepsek')?.value || '',
    nipKepsek: document.getElementById('inpNipKepsek')?.value || '',
    namaGuru: document.getElementById('inpGuruPengampu')?.value || '',
    nipGuru: document.getElementById('inpNipGuru')?.value || ''
  };
  localStorage.setItem('jadwal_ttd', JSON.stringify(ttdData));
}

function renderUI(container) {
  const headerRow = `<tr><th style="width: 80px;">Jam</th>${HARI_LIST.map(hari => `<th>${hari}</th>`).join('')}</tr>`;
  
  let rows = '';
  for (let jp = 1; jp <= 8; jp++) {
    rows += `<tr><td class="jp-cell">JP ${jp}</td>`;
    HARI_LIST.forEach(hari => {
      rows += `<td data-hari="${hari}" data-jp="${jp}"><div class="mapel-cell empty" onclick="editJadwal('${hari}', ${jp})"><span class="mapel-name">-</span><span class="mapel-guru">-</span></div></td>`;
    });
    rows += `</tr>`;
  }
  
  container.innerHTML = `
    <div class="jadwal-container">
      <div class="jadwal-header">
        <h2>📅 Jadwal Pembelajaran</h2>
        <p>Input jadwal pembelajaran per kelas secara manual. Klik cell untuk edit.</p>
      </div>

      <div class="jadwal-form">
        <div class="form-section-title">📋 1. Pilih Kelas</div>
        <div class="form-grid">
          <div class="form-group">
            <label>🎓 Kelas / Fase</label>
            <select id="inpKelas" class="form-control">
              <option value="">-- Pilih Kelas --</option>
              <option value="1 (Fase A)">Kelas 1 (Fase A)</option>
              <option value="2 (Fase A)">Kelas 2 (Fase A)</option>
              <option value="3 (Fase B)">Kelas 3 (Fase B)</option>
              <option value="4 (Fase B)">Kelas 4 (Fase B)</option>
              <option value="5 (Fase C)">Kelas 5 (Fase C)</option>
              <option value="6 (Fase C)">Kelas 6 (Fase C)</option>
            </select>
          </div>
          <div class="form-group">
            <label>👤 Wali Kelas</label>
            <input type="text" id="inpWaliKelas" class="form-control" placeholder="Nama Wali Kelas">
          </div>
        </div>

        <div class="form-section-title">🎨 2. Warna Per Mapel</div>
        <div class="form-group">
          <label>Pilih warna:</label>
          <div class="color-picker-wrapper">
            ${Object.entries(DEFAULT_JADWAL.warnaMapel).map(([mapel, warna]) => `
              <div class="color-option" style="background: ${warna}" data-mapel="${mapel}" onclick="selectColor('${mapel}', '${warna}')"></div>
            `).join('')}
          </div>
        </div>

        <div class="form-section-title">🔔 3. Pengaturan Bel Suara</div>
        <div class="form-grid">
          <div class="form-group">
            <label>🔔 Aktifkan Bel</label>
            <select id="optBelOtomatis" class="form-control">
              <option value="no">❌ Tidak</option>
              <option value="yes">✅ Ya, aktifkan</option>
            </select>
          </div>
          <div class="form-group">
            <label>🗣️ Jenis Suara</label>
            <select id="optVoiceGender" class="form-control">
              <option value="female">👩 Perempuan</option>
              <option value="male">👨 Laki-laki</option>
            </select>
          </div>
        </div>
        
        <div class="form-section-title" style="font-size: 16px; color: #db2777;">⏰ Waktu & Pesan Suara</div>
        <div class="form-grid">
          <div class="form-group">
            <label>🔔 Bel Mulai</label>
            <input type="time" id="inpBelMulai" class="form-control" value="07:00">
            <input type="text" id="txtBelMulai" class="form-control" style="margin-top: 5px;" value="Selamat pagi, ayo masuk kelas dan belajar yang rajin ya!">
          </div>
          <div class="form-group">
            <label>☕ Bel Istirahat</label>
            <input type="time" id="inpBelIstirahat1" class="form-control" value="09:00">
            <input type="text" id="txtBelIstirahat1" class="form-control" style="margin-top: 5px;" value="Waktunya istirahat, silakan pergi ke kantin.">
          </div>
        </div>
        <div class="form-grid">
          <div class="form-group">
            <label>📚 Bel Lanjut</label>
            <input type="time" id="inpBelLanjut" class="form-control" value="09:30">
            <input type="text" id="txtBelLanjut" class="form-control" style="margin-top: 5px;" value="Waktunya masuk kelas kembali, ayo lanjut belajar!">
          </div>
          <div class="form-group">
            <label>🏠 Bel Pulang</label>
            <input type="time" id="inpBelPulang" class="form-control" value="13:00">
            <input type="text" id="txtBelPulang" class="form-control" style="margin-top: 5px;" value="Waktunya pulang, hati-hati di jalan. Sampai jumpa besok!">
          </div>
        </div>
        
        <div class="form-section-title">✍️ 4. Tanda Tangan</div>
        <div class="form-grid">
          <div class="form-group">
            <label>👨‍💼 Nama Kepala Sekolah</label>
            <input type="text" id="inpKepsek" class="form-control">
          </div>
          <div class="form-group">
            <label>🔢 NIP Kepala Sekolah</label>
            <input type="text" id="inpNipKepsek" class="form-control">
          </div>
        </div>
        <div class="form-grid">
          <div class="form-group">
            <label>👩‍🏫 Nama Guru Pengampu</label>
            <input type="text" id="inpGuruPengampu" class="form-control">
          </div>
          <div class="form-group">
            <label>🔢 NIP Guru Pengampu</label>
            <input type="text" id="inpNipGuru" class="form-control">
          </div>
        </div>

        <div class="gen-action">
          <button class="btn-action btn-save" onclick="saveJadwal()">💾 Simpan</button>
          <button class="btn-action btn-print" onclick="printJadwal()">🖨️ Print</button>
          <button class="btn-action btn-download" onclick="downloadWord()">📥 Word</button>
          <button class="btn-action btn-reset" onclick="resetJadwal()">🔄 Reset</button>
          
          <button class="btn-action btn-unlock" onclick="manualUnlockAudio()">🔓 Izinkan Suara</button>
          
          <button class="btn-action btn-test" onclick="testBelManual('mulai')">🧪 Test Masuk</button>
          <button class="btn-action btn-test" onclick="testBelManual('istirahat')">🧪 Test Istirahat</button>
          <button class="btn-action btn-test" onclick="testBelManual('lanjut')">🧪 Test Lanjut</button>
          <button class="btn-action btn-test" onclick="testBelManual('pulang')">🧪 Test Pulang</button>
        </div>
      </div>

      <div class="jadwal-grid-wrapper">
        <table class="jadwal-table">${headerRow}${rows}</table>
      </div>

      <div style="margin-top: 20px; padding: 20px; background: linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%); border-radius: 8px; text-align: center;">
        <div style="font-size: 14px; color: #831843;">🔔 Status Bel Otomatis</div>
        <div style="font-size: 18px; font-weight: 700; color: #be185d;" id="belStatus">⏸️ Non-aktif</div>
        <div style="font-size: 12px; color: #64748b; margin-top: 5px;" id="belNextTime">Bel berikutnya: -</div>
        <div class="countdown-display" id="countdownDisplay">--:--:--</div>
        <div style="font-size: 11px; color: #64748b;" id="belCurrentTime">Waktu sekarang: -</div>
        <div style="font-size: 11px; color: #10b981; margin-top: 5px;" id="audioStatus">🔊 Audio: Belum unlock</div>
      </div>
    </div>
  `;
}

function attachEvents() {
  ['inpKepsek', 'inpNipKepsek', 'inpGuruPengampu', 'inpNipGuru'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', saveTTDDefaults);
  });
  
  document.getElementById('inpKelas').addEventListener('change', loadJadwal);
  
  document.getElementById('optBelOtomatis')?.addEventListener('change', (e) => {
    if (e.target.value === 'yes') {
      startBelOtomatis();
    } else {
      stopBelOtomatis();
    }
  });
}

window.manualUnlockAudio = function() {
  unlockAudio();
  
  // Langsung speak test untuk memastikan TTS bekerja
  const testText = "Suara berhasil diaktifkan. Bel otomatis siap digunakan.";
  speakText(testText);
  
  showToast('✅ Audio berhasil diaktifkan! Dengarkan suara test...');
};

window.selectColor = function(mapel, warna) {
  document.querySelectorAll('.color-option').forEach(el => el.classList.remove('selected'));
  document.querySelector(`.color-option[data-mapel="${mapel}"]`)?.classList.add('selected');
  DEFAULT_JADWAL.warnaMapel[mapel] = warna;
};

window.editJadwal = function(hari, jp) {
  const kelas = document.getElementById('inpKelas').value;
  if (!kelas) { alert('⚠️ Pilih kelas!'); return; }
  
  if (jp === 4 || jp === 5) {
    if (confirm(`Jam ${jp} adalah istirahat. Kosongkan?`)) {
      updateCell(hari, jp, '', '', true);
    }
    return;
  }
  
  const cell = document.querySelector(`td[data-hari="${hari}"][data-jp="${jp}"] .mapel-cell`);
  const currentMapel = cell.querySelector('.mapel-name').textContent;
  const currentGuru = cell.querySelector('.mapel-guru').textContent;
  
  const mapel = prompt('Mata Pelajaran:', currentMapel === '-' ? '' : currentMapel);
  if (mapel === null) return;
  
  const guru = prompt('Nama Guru:', currentGuru === '-' ? '' : currentGuru);
  if (guru === null) return;
  
  updateCell(hari, jp, mapel.trim(), guru.trim());
};

function updateCell(hari, jp, mapel, guru, isIstirahat = false) {
  const cell = document.querySelector(`td[data-hari="${hari}"][data-jp="${jp}"] .mapel-cell`);
  
  if (isIstirahat) {
    cell.className = 'mapel-cell istirahat';
    cell.innerHTML = `<span class="mapel-name">🕐 ISTIRAHAT</span><span class="mapel-guru">-</span>`;
    cell.onclick = null;
    return;
  }
  
  if (!mapel) {
    cell.className = 'mapel-cell empty';
    cell.innerHTML = `<span class="mapel-name">-</span><span class="mapel-guru">-</span>`;
  } else {
    const warna = DEFAULT_JADWAL.warnaMapel[mapel] || '#94a3b8';
    cell.className = 'mapel-cell';
    cell.style.background = warna + '20';
    cell.style.border = `2px solid ${warna}`;
    cell.innerHTML = `<span class="mapel-name" style="color: ${warna}">${mapel}</span><span class="mapel-guru">${guru || '-'}</span>`;
  }
  
  cell.onclick = () => editJadwal(hari, jp);
}

async function loadJadwal() {
  const kelas = document.getElementById('inpKelas').value;
  if (!kelas) return;
  
  try {
    const snapshot = await get(ref(database, `jadwal/${kelas.replace(/\s+/g, '_')}`));
    if (snapshot.exists()) {
      const data = snapshot.val();
      if (data.waliKelas) document.getElementById('inpWaliKelas').value = data.waliKelas;
      
      Object.entries(data.data || {}).forEach(([key, value]) => {
        const [hari, jp] = key.split('_');
        if (value.istirahat) {
          updateCell(hari, parseInt(jp), '', '', true);
        } else {
          updateCell(hari, parseInt(jp), value.mapel || '', value.guru || '');
        }
      });
      showToast('✅ Jadwal dimuat!');
    } else {
      resetJadwalTable();
    }
  } catch (error) {
    console.error('Error load:', error);
  }
}

window.saveJadwal = async function() {
  const kelas = document.getElementById('inpKelas').value;
  if (!kelas) { alert('⚠️ Pilih kelas!'); return; }
  
  const waliKelas = document.getElementById('inpWaliKelas').value;
  if (!waliKelas) { alert('⚠️ Isi wali kelas!'); return; }
  
  const jadwalData = {};
  HARI_LIST.forEach(hari => {
    for (let jp = 1; jp <= 8; jp++) {
      const cell = document.querySelector(`td[data-hari="${hari}"][data-jp="${jp}"] .mapel-cell`);
      const mapel = cell.querySelector('.mapel-name').textContent;
      const guru = cell.querySelector('.mapel-guru').textContent;
      
      if (mapel !== '-' && mapel !== '🕐 ISTIRAHAT') {
        jadwalData[`${hari}_${jp}`] = { mapel, guru: guru === '-' ? '' : guru };
      } else if (mapel === '🕐 ISTIRAHAT') {
        jadwalData[`${hari}_${jp}`] = { istirahat: true };
      }
    }
  });
  
  try {
    await set(ref(database, `jadwal/${kelas.replace(/\s+/g, '_')}`), {
      kelas, waliKelas, data: jadwalData, updatedAt: Date.now()
    });
    showToast('✅ Jadwal disimpan!');
  } catch (error) {
    alert('❌ Gagal: ' + error.message);
  }
};

window.resetJadwal = function() {
  if (confirm('🔄 Reset jadwal?')) resetJadwalTable();
};

function resetJadwalTable() {
  HARI_LIST.forEach(hari => {
    for (let jp = 1; jp <= 8; jp++) updateCell(hari, jp, '', '');
  });
}

window.printJadwal = function() {
  if (!document.getElementById('inpKelas').value) { alert('⚠️ Pilih kelas!'); return; }
  window.print();
};

window.downloadWord = function() {
  const kelas = document.getElementById('inpKelas').value;
  if (!kelas) { alert('⚠️ Pilih kelas!'); return; }
  
  const waliKelas = document.getElementById('inpWaliKelas').value || '-';
  const namaKepsek = document.getElementById('inpKepsek').value || '-';
  const nipKepsek = document.getElementById('inpNipKepsek').value || '-';
  const namaGuru = document.getElementById('inpGuruPengampu').value || '-';
  const nipGuru = document.getElementById('inpNipGuru').value || '-';
  
  let tableHTML = `<table border="1" cellpadding="8" cellspacing="0" style="width: 100%; border-collapse: collapse;">
    <thead><tr style="background: #ec4899; color: white;">
      <th>Jam</th>${HARI_LIST.map(h => `<th>${h}</th>`).join('')}
    </tr></thead><tbody>`;
  
  for (let jp = 1; jp <= 8; jp++) {
    tableHTML += `<tr><td style="text-align: center; font-weight: bold;">JP ${jp}</td>`;
    HARI_LIST.forEach(hari => {
      const cell = document.querySelector(`td[data-hari="${hari}"][data-jp="${jp}"] .mapel-cell`);
      const mapel = cell.querySelector('.mapel-name').textContent;
      const guru = cell.querySelector('.mapel-guru').textContent;
      if (mapel === '🕐 ISTIRAHAT') {
        tableHTML += `<td style="text-align: center; background: #94a3b8; color: white;">ISTIRAHAT</td>`;
      } else if (mapel === '-') {
        tableHTML += `<td style="text-align: center;">-</td>`;
      } else {
        tableHTML += `<td style="text-align: center;"><strong>${mapel}</strong><br><small>${guru}</small></td>`;
      }
    });
    tableHTML += `</tr>`;
  }
  tableHTML += `</tbody></table>`;
  
  const htmlContent = `<html><head><meta charset="utf-8"></head>
    <body style="font-family: 'Times New Roman', serif; margin: 2cm;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="margin: 0;">JADWAL PEMBELAJARAN</h1>
        <h2>${kelas}</h2>
        <p>Tahun Ajaran 2026/2027</p>
      </div>
      <p><strong>Wali Kelas:</strong> ${waliKelas}</p>
      ${tableHTML}
      <div style="margin-top: 40px; display: table; width: 100%;">
        <div style="display: table-cell; width: 50%; text-align: center;">
          <div>Mengetahui,</div>
          <div style="margin-bottom: 80px;">Kepala Sekolah</div>
          <div style="border-bottom: 1px solid #000; display: inline-block; min-width: 200px;"><strong>${namaKepsek}</strong></div>
          <div>NIP: ${nipKepsek}</div>
        </div>
        <div style="display: table-cell; width: 50%; text-align: center;">
          <div>Wali Kelas,</div>
          <div style="margin-bottom: 80px;">Guru Kelas</div>
          <div style="border-bottom: 1px solid #000; display: inline-block; min-width: 200px;"><strong>${namaGuru}</strong></div>
          <div>NIP: ${nipGuru}</div>
        </div>
      </div>
    </body></html>`;
  
  const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Jadwal_${kelas.replace(/\s+/g, '_')}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  
  showToast('📥 Word diunduh!');
};

window.testBelManual = function(belType) {
  // Pastikan audio unlock dulu
  if (!audioUnlocked) {
    unlockAudio();
  }
  
  const texts = {
    mulai: document.getElementById('txtBelMulai')?.value,
    istirahat: document.getElementById('txtBelIstirahat1')?.value,
    lanjut: document.getElementById('txtBelLanjut')?.value,
    pulang: document.getElementById('txtBelPulang')?.value
  };
  
  const titles = {
    mulai: '🔔 Bel Masuk Kelas',
    istirahat: '☕ Bel Istirahat',
    lanjut: '📚 Bel Lanjut',
    pulang: '🏠 Bel Pulang'
  };
  
  const text = texts[belType];
  const title = titles[belType];
  
  if (!text) {
    alert('⚠️ Teks bel kosong!');
    return;
  }
  
  // Play beep
  playBeep();
  
  // ⭐ PANGGIL speakText LANGSUNG tanpa delay (KUNCI!)
  speakText(text);
  
  showBelNotification(title, text);
  showToast(`🧪 Test ${title}`);
};

function playBeep() {
  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContext.state === 'suspended') audioContext.resume();
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.frequency.value = 880;
    oscillator.type = 'sine';
    gainNode.gain.value = 0.5;
    oscillator.start();
    setTimeout(() => oscillator.stop(), 1000);
  } catch (e) {
    console.error('Error beep:', e);
  }
}

/**
 * ⭐ SPEECH SYNTHESIS - KUNCI AGAR TTS BEKERJA DI MOBILE
 * - Panggil LANGSUNG tanpa delay
 * - Pakai voice Indonesia yang sudah di-cache
 */
function speakText(text) {
  console.log('🗣️ speakText:', text);
  
  if (!speechSynth) {
    console.error('❌ TTS tidak tersedia');
    playBeep();
    playBeep();
    playBeep();
    return;
  }
  
  try {
    // Pastikan audio context aktif
    if (audioContext && audioContext.state === 'suspended') {
      audioContext.resume();
    }
    
    // Cancel semua speech yang sedang berjalan
    speechSynth.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'id-ID';
    utterance.rate = 0.9;
    utterance.volume = 1;
    
    // ⭐ PAKAI VOICE INDONESIA YANG SUDAH DI-CACHE
    const gender = document.getElementById('optVoiceGender')?.value || 'female';
    
    if (indonesianVoice) {
      utterance.voice = indonesianVoice;
      console.log('🎤 Pakai voice:', indonesianVoice.name);
    }
    
    // Set pitch berdasarkan gender
    if (gender === 'male') {
      utterance.pitch = 0.85;
    } else {
      utterance.pitch = 1.15;
    }
    
    utterance.onstart = () => console.log('✅ TTS started');
    utterance.onend = () => console.log('✅ TTS ended');
    utterance.onerror = (e) => {
      console.error('❌ TTS error:', e);
      playBeep();
      setTimeout(() => playBeep(), 500);
      setTimeout(() => playBeep(), 1000);
    };
    
    speechSynth.speak(utterance);
  } catch (e) {
    console.error('TTS exception:', e);
    playBeep();
    playBeep();
  }
}

function updateDisplay() {
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
  
  const timeEl = document.getElementById('belCurrentTime');
  if (timeEl) timeEl.textContent = `Waktu sekarang: ${currentTime}`;
  
  // Update countdown
  const belTimes = [
    { time: document.getElementById('inpBelMulai')?.value || '07:00', name: 'Mulai' },
    { time: document.getElementById('inpBelIstirahat1')?.value || '09:00', name: 'Istirahat' },
    { time: document.getElementById('inpBelLanjut')?.value || '09:30', name: 'Lanjut' },
    { time: document.getElementById('inpBelPulang')?.value || '13:00', name: 'Pulang' }
  ];
  
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  let nextBel = null;
  for (const bel of belTimes) {
    const [h, m] = bel.time.split(':').map(Number);
    const belMinutes = h * 60 + m;
    if (belMinutes > currentMinutes) {
      nextBel = { ...bel, minutes: belMinutes };
      break;
    }
  }
  
  const countdownEl = document.getElementById('countdownDisplay');
  if (countdownEl) {
    if (nextBel) {
      const diff = nextBel.minutes - currentMinutes;
      const hours = Math.floor(diff / 60);
      const mins = diff % 60;
      const secs = 60 - now.getSeconds();
      countdownEl.textContent = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    } else {
      countdownEl.textContent = '00:00:00';
    }
  }
  
  const nextEl = document.getElementById('belNextTime');
  if (nextEl) nextEl.textContent = `Bel berikutnya: ${nextBel ? nextBel.name + ' (' + nextBel.time + ')' : '-'}`;
}

/**
 * ⭐ CHECK BEL - PANGGIL speakText LANGSUNG TANPA DELAY
 */
function checkBelTime() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const currentTime = `${hours}:${minutes}`;
  
  updateDisplay();
  
  // Window 5 detik (00-04)
  if (seconds !== '00' && seconds !== '01' && seconds !== '02' && seconds !== '03' && seconds !== '04') return;
  if (lastBelMinute === currentTime) return;
  
  const belConfigs = [
    { time: document.getElementById('inpBelMulai')?.value, text: document.getElementById('txtBelMulai')?.value, title: '🔔 Bel Masuk Kelas' },
    { time: document.getElementById('inpBelIstirahat1')?.value, text: document.getElementById('txtBelIstirahat1')?.value, title: '☕ Bel Istirahat' },
    { time: document.getElementById('inpBelLanjut')?.value, text: document.getElementById('txtBelLanjut')?.value, title: '📚 Bel Lanjut' },
    { time: document.getElementById('inpBelPulang')?.value, text: document.getElementById('txtBelPulang')?.value, title: '🏠 Bel Pulang' }
  ];
  
  const activeBel = belConfigs.find(bel => bel.time === currentTime);
  
  if (activeBel && activeBel.text && activeBel.text.trim()) {
    lastBelMinute = currentTime;
    
    console.log(`🔔 BEL AKTIF: ${activeBel.title}`);
    
    // 1. Play beep
    playBeep();
    
    // 2. Show notification
    showBelNotification(activeBel.title, activeBel.text);
    
    // 3. Browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(activeBel.title, { body: activeBel.text });
    }
    
    // 4. Vibrate
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    
    // 5. ⭐ PANGGIL speakText LANGSUNG TANPA DELAY
    // Ini kunci agar TTS bekerja di mobile!
    speakText(activeBel.text);
  }
}

function startBelOtomatis() {
  console.log('🚀 startBelOtomatis');
  
  // ⭐ Validasi: Pastikan audio sudah unlock
  if (!audioUnlocked) {
    alert('⚠️ Klik tombol "🔓 Izinkan Suara" terlebih dahulu agar bel bisa berbunyi otomatis!');
    document.getElementById('optBelOtomatis').value = 'no';
    return;
  }
  
  if (belInterval) clearInterval(belInterval);
  lastBelMinute = '';
  
  updateDisplay();
  
  // Check setiap 500ms
  belInterval = setInterval(checkBelTime, 500);
  
  // Start keep alive
  startKeepAlive();
  
  // Speak konfirmasi
  speakText("Bel otomatis telah diaktifkan");
  
  const statusEl = document.getElementById('belStatus');
  if (statusEl) {
    statusEl.textContent = '✅ Aktif - Memantau waktu bel';
    statusEl.style.color = '#10b981';
  }
  
  showToast('🔔 Bel aktif!');
}

function stopBelOtomatis() {
  if (belInterval) {
    clearInterval(belInterval);
    belInterval = null;
  }
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
    keepAliveInterval = null;
  }
  
  const statusEl = document.getElementById('belStatus');
  if (statusEl) {
    statusEl.textContent = '⏸️ Non-aktif';
    statusEl.style.color = '#be185d';
  }
}

function showBelNotification(title, message) {
  const notif = document.createElement('div');
  notif.innerHTML = `
    <div class="bell-notif-overlay" onclick="this.parentElement.remove()"></div>
    <div class="bell-notif-content" onclick="this.parentElement.remove()">
      <div class="bell-notif-icon">🔔</div>
      <div class="bell-notif-title">${title}</div>
      <div class="bell-notif-time">${message}</div>
      <div style="margin-top: 15px; font-size: 12px;">Tap untuk tutup</div>
    </div>
  `;
  document.body.appendChild(notif);
  setTimeout(() => notif.remove(), 8000);
}

function showToast(msg) {
  const toast = document.createElement('div');
  toast.textContent = msg;
  toast.style.cssText = `position: fixed; top: 20px; right: 20px; background: #ec4899; color: white; padding: 14px 24px; border-radius: 10px; z-index: 10001; font-weight: 600;`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}
