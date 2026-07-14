// modules/admin-pembelajaran/features/rpm-standar.js
// =========================================
// FITUR: RPM STANDAR (Rencana Pembelajaran Mendalam)
// UNIVERSAL - Untuk Semua Mapel & Metode
// TERINTEGRASI: Firestore, AI Groq, Data Mapel JSON
// UPDATE: Default Nama Guru, Tanda Tangan, Mapel dari JSON
// =========================================

import { db } from '../../../js/firebase-config.js';
import { 
  collection, addDoc, getDocs, query, where, orderBy, 
  onSnapshot, doc, updateDoc, deleteDoc, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');

// Groq API Configuration
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';
let groqApiKey = null;

const CSS_ID = 'rpm-standar-css';
let currentEditId = null;
let dataMapel = [];

// Default Tanda Tangan
const DEFAULT_TTD = {
  namaKepsek: 'Imam Munandar SP.d',
  nipKepsek: '198512192011011007',
  namaGuru: 'Hasriandi Basir SP.d',
  nipGuru: '198110182025211059'
};

export async function init(container, db) {
  loadCSS();
  await loadGroqApiKey();
  await loadMataPelajaran();
  renderUI(container);
  attachEvents(container);
  loadTTDDefaults();
  loadRPMList(container);
}

export function cleanup() {
  const css = document.getElementById(CSS_ID);
  if (css) css.remove();
}

async function loadGroqApiKey() {
  try {
    const { doc, getDoc } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
    const docRef = doc(db, 'settings', 'api_key');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data.keys) {
        const activeKeys = Object.values(data.keys).filter(k => k.active === true);
        if (activeKeys.length > 0) groqApiKey = activeKeys[0].value;
      }
    }
  } catch (error) {
    console.error('Error loading API key:', error);
  }
}

/**
 * ⭐ LOAD DATA MATA PELAJARAN DARI JSON (TANPA FALLBACK)
 */
async function loadMataPelajaran() {
  try {
    const response = await fetch('../../../assets/data-mapel.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    dataMapel = data.mataPelajaran || [];
    console.log(`✅ Data mapel berhasil dimuat: ${dataMapel.length} mapel`);
  } catch (error) {
    console.error('❌ Gagal memuat data-mapel.json:', error);
    // Tetap kosongkan, jangan pakai fallback
    dataMapel = [];
    console.warn('⚠️ Dropdown mapel akan kosong. Pastikan file assets/data-mapel.json ada.');
  }
}

function loadCSS() {
  if (document.getElementById(CSS_ID)) return;
  const style = document.createElement('style');
  style.id = CSS_ID;
  style.textContent = `
    .rpm-container { background: linear-gradient(135deg, #fce7f3 0%, #fbcfe8 50%, #e0e7ff 100%); border-radius: 16px; padding: 25px; font-family: 'Segoe UI', sans-serif; max-width: 1200px; margin: 0 auto; box-shadow: 0 8px 24px rgba(236, 72, 153, 0.15); }
    .rpm-header { background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); color: white; padding: 30px; border-radius: 12px; margin-bottom: 25px; box-shadow: 0 4px 12px rgba(236, 72, 153, 0.3); }
    .rpm-header h2 { margin: 0 0 8px 0; font-size: 28px; font-weight: 700; }
    .rpm-header p { margin: 0; opacity: 0.95; font-size: 15px; }
    .rpm-tabs { display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap; }
    .rpm-tab { padding: 12px 24px; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 14px; background: white; color: #be185d; transition: all 0.2s; }
    .rpm-tab.active { background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); color: white; }
    .rpm-section { background: white; padding: 25px; border-radius: 12px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(236, 72, 153, 0.1); }
    .rpm-section-title { font-size: 18px; font-weight: 700; color: #be185d; margin: 0 0 15px 0; padding-bottom: 10px; border-bottom: 3px solid #fce7f3; }
    .rpm-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px; }
    .rpm-form-group { margin-bottom: 15px; }
    .rpm-form-group label { display: block; margin-bottom: 6px; font-weight: 600; font-size: 13px; color: #831843; }
    .rpm-form-control { width: 100%; padding: 12px 14px; border: 2px solid #fbcfe8; border-radius: 8px; font-size: 14px; box-sizing: border-box; background: white; color: #831843; font-family: inherit; }
    .rpm-form-control:focus { outline: none; border-color: #ec4899; box-shadow: 0 0 0 3px rgba(236, 72, 153, 0.15); }
    textarea.rpm-form-control { resize: vertical; min-height: 80px; }
    select.rpm-form-control { cursor: pointer; }
    .rpm-btn { padding: 12px 24px; border: none; border-radius: 8px; font-weight: 600; font-size: 14px; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; transition: all 0.2s; color: white; }
    .rpm-btn:hover { transform: translateY(-2px); }
    .rpm-btn-primary { background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); }
    .rpm-btn-success { background: linear-gradient(135deg, #10b981 0%, #059669 100%); }
    .rpm-btn-warning { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); }
    .rpm-btn-danger { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); }
    .rpm-btn-secondary { background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%); }
    .rpm-actions { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 20px; justify-content: center; }
    .rpm-list { margin-top: 20px; }
    .rpm-item { background: linear-gradient(135deg, #fff1f2 0%, #fce7f3 100%); padding: 15px; border-radius: 10px; margin-bottom: 10px; border-left: 4px solid #ec4899; }
    .rpm-item-header { display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px; flex-wrap: wrap; gap: 5px; }
    .rpm-item-title { font-weight: 700; color: #be185d; font-size: 15px; }
    .rpm-item-meta { font-size: 12px; color: #64748b; }
    .rpm-item-actions { display: flex; gap: 5px; }
    .rpm-item-actions button { padding: 6px 12px; font-size: 12px; border: none; border-radius: 6px; cursor: pointer; color: white; }
    .rpm-empty { text-align: center; padding: 30px; color: #64748b; background: white; border-radius: 10px; }
    .rpm-loading { text-align: center; padding: 20px; color: #831843; }
    .rpm-badge { display: inline-block; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; }
    .rpm-badge-standar { background: #dbeafe; color: #1e40af; }
    .rpm-toast { position: fixed; top: 20px; right: 20px; padding: 14px 24px; border-radius: 10px; z-index: 10001; color: white; font-weight: 600; box-shadow: 0 4px 16px rgba(0,0,0,0.15); animation: rpmSlideIn 0.3s ease; }
    .rpm-toast-success { background: linear-gradient(135deg, #10b981 0%, #059669 100%); }
    .rpm-toast-error { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); }
    @keyframes rpmSlideIn { from { transform: translateX(400px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    @media (max-width: 768px) { .rpm-form-grid { grid-template-columns: 1fr; } .rpm-actions { flex-direction: column; } .rpm-btn { width: 100%; justify-content: center; } }
  `;
  document.head.appendChild(style);
}

function renderUI(container) {
  const aiReady = groqApiKey ? '✅ AI Siap' : '⚠️ API Key Belum Aktif';
  const aiStatusClass = groqApiKey ? 'rpm-badge-standar' : '';
  
  let mapelOptions = '<option value="">-- Pilih Mapel --</option>';
  dataMapel.forEach(m => {
    mapelOptions += `<option value="${m.nama}">${m.icon} ${m.singkatan}</option>`;
  });

  container.innerHTML = `
    <div class="rpm-container">
      <div class="rpm-header">
        <h2>📝 RPM Standar</h2>
        <p>Rencana Pembelajaran Mendalam - Format Universal untuk Semua Mapel & Metode 
          <span class="rpm-badge ${aiStatusClass}" style="margin-left: 10px;">${aiReady}</span>
        </p>
      </div>

      <div class="rpm-tabs">
        <button class="rpm-tab active" data-tab="form">📝 Buat/Edit RPM</button>
        <button class="rpm-tab" data-tab="list">📚 RPM Tersimpan</button>
      </div>

      <div id="rpm-form-section">
        <div class="rpm-section">
          <h3 class="rpm-section-title">📋 1. Identitas Dokumen</h3>
          <div class="rpm-form-grid">
            <div class="rpm-form-group">
              <label>🏫 Sekolah</label>
              <input type="text" id="rpm-sekolah" class="rpm-form-control" value="${currentUser.namaSekolah || 'SDN 139 LAMANDA'}">
            </div>
            <div class="rpm-form-group">
              <label>👩‍🏫 Nama Guru</label>
              <input type="text" id="rpm-guru" class="rpm-form-control" value="${DEFAULT_TTD.namaGuru}">
            </div>
          </div>
          <div class="rpm-form-grid">
            <div class="rpm-form-group">
              <label>📚 Mata Pelajaran</label>
              <select id="rpm-mapel" class="rpm-form-control">${mapelOptions}</select>
            </div>
            <div class="rpm-form-group">
              <label>🎓 Kelas / Fase</label>
              <select id="rpm-kelas" class="rpm-form-control">
                <option value="">-- Pilih --</option>
                <option value="1|A">Kelas 1 (Fase A)</option>
                <option value="2|A">Kelas 2 (Fase A)</option>
                <option value="3|B">Kelas 3 (Fase B)</option>
                <option value="4|B">Kelas 4 (Fase B)</option>
                <option value="5|C">Kelas 5 (Fase C)</option>
                <option value="6|C">Kelas 6 (Fase C)</option>
              </select>
            </div>
          </div>
          <div class="rpm-form-grid">
            <div class="rpm-form-group">
              <label>📝 Topik / Materi</label>
              <input type="text" id="rpm-topik" class="rpm-form-control" placeholder="Contoh: Bagian Tubuh Tumbuhan">
            </div>
            <div class="rpm-form-group">
              <label>⏰ Alokasi Waktu</label>
              <input type="text" id="rpm-alokasi" class="rpm-form-control" placeholder="Contoh: 2 Pertemuan (4 x 35 Menit)">
            </div>
          </div>
          <div class="rpm-form-group">
            <label>🎨 Model Pembelajaran</label>
            <select id="rpm-model" class="rpm-form-control">
              <option value="Project Based Learning (PjBL)">Project Based Learning (PjBL)</option>
              <option value="Problem Based Learning (PBL)">Problem Based Learning (PBL)</option>
              <option value="Discovery Learning">Discovery Learning</option>
              <option value="Inquiry Learning">Inquiry Learning</option>
              <option value="Cooperative Learning">Cooperative Learning</option>
              <option value="Game-Based Learning">Game-Based Learning</option>
              <option value="Tatap Muka Klasikal">Tatap Muka Klasikal</option>
            </select>
          </div>
        </div>

        <div class="rpm-section">
          <h3 class="rpm-section-title">👥 2. Analisis Kesiapan Murid</h3>
          <div class="rpm-form-group">
            <label> Kelompok Belum Siap</label>
            <textarea id="rpm-belum-siap" class="rpm-form-control" rows="2" placeholder="Karakteristik & strategi diferensiasi..."></textarea>
          </div>
          <div class="rpm-form-group">
            <label>🟡 Kelompok Siap</label>
            <textarea id="rpm-siap" class="rpm-form-control" rows="2" placeholder="Karakteristik & strategi diferensiasi..."></textarea>
          </div>
          <div class="rpm-form-group">
            <label>🟢 Kelompok Mahir</label>
            <textarea id="rpm-mahir" class="rpm-form-control" rows="2" placeholder="Karakteristik & strategi diferensiasi..."></textarea>
          </div>
        </div>

        <div class="rpm-section">
          <h3 class="rpm-section-title">🎯 3. Tujuan & Profil Lulusan</h3>
          <div class="rpm-form-group">
            <label>📖 Capaian Pembelajaran (CP)</label>
            <textarea id="rpm-cp" class="rpm-form-control" rows="3" placeholder="Paste CP dari kurikulum..."></textarea>
          </div>
          <div class="rpm-form-group">
            <label>✅ Tujuan Pembelajaran (satu per baris)</label>
            <textarea id="rpm-tp" class="rpm-form-control" rows="4" placeholder="1. Siswa mampu...&#10;2. Siswa dapat..."></textarea>
          </div>
          <div class="rpm-form-group">
            <label>🌟 Profil Lulusan yang Disasar (pilih 3-4)</label>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
              <label style="font-weight: normal;"><input type="checkbox" class="rpm-profil" value="Keimanan dan Ketakwaan"> Keimanan & Ketakwaan</label>
              <label style="font-weight: normal;"><input type="checkbox" class="rpm-profil" value="Kewargaan"> Kewargaan</label>
              <label style="font-weight: normal;"><input type="checkbox" class="rpm-profil" value="Penalaran Kritis"> Penalaran Kritis</label>
              <label style="font-weight: normal;"><input type="checkbox" class="rpm-profil" value="Kreatif"> Kreatif</label>
              <label style="font-weight: normal;"><input type="checkbox" class="rpm-profil" value="Kolaborasi"> Kolaborasi</label>
              <label style="font-weight: normal;"><input type="checkbox" class="rpm-profil" value="Kemandirian"> Kemandirian</label>
              <label style="font-weight: normal;"><input type="checkbox" class="rpm-profil" value="Kesehatan"> Kesehatan</label>
              <label style="font-weight: normal;"><input type="checkbox" class="rpm-profil" value="Komunikasi"> Komunikasi</label>
            </div>
          </div>
        </div>

        <div class="rpm-section">
          <h3 class="rpm-section-title">📚 4. Langkah Pembelajaran (per Pertemuan)</h3>
          <div id="rpm-pertemuan-container"></div>
          <button type="button" class="rpm-btn rpm-btn-secondary" id="btn-tambah-pertemuan" style="margin-top: 10px;">➕ Tambah Pertemuan</button>
        </div>

        <div class="rpm-section">
          <h3 class="rpm-section-title"> 5. Asesmen Holistik</h3>
          <div class="rpm-form-group">
            <label>🔍 Asesmen Diagnostik</label>
            <textarea id="rpm-diagnostik" class="rpm-form-control" rows="2"></textarea>
          </div>
          <div class="rpm-form-group">
            <label> Asesmen Formatif</label>
            <textarea id="rpm-formatif" class="rpm-form-control" rows="2"></textarea>
          </div>
          <div class="rpm-form-group">
            <label>🎯 Asesmen Sumatif</label>
            <textarea id="rpm-sumatif" class="rpm-form-control" rows="2"></textarea>
          </div>
          <div class="rpm-form-group">
            <label> Rubrik Penilaian (skala 1-4)</label>
            <textarea id="rpm-rubrik" class="rpm-form-control" rows="4" placeholder="4 (Mahir): ...&#10;3 (Cakap): ...&#10;2 (Berkembang): ...&#10;1 (Belum Siap): ..."></textarea>
          </div>
        </div>

        <div class="rpm-section">
          <h3 class="rpm-section-title">🎨 6. Diferensiasi</h3>
          <div class="rpm-form-group">
            <label>🔴 Remedial (Belum Siap)</label>
            <textarea id="rpm-remedial" class="rpm-form-control" rows="2"></textarea>
          </div>
          <div class="rpm-form-group">
            <label>🟢 Pengayaan (Mahir)</label>
            <textarea id="rpm-pengayaan" class="rpm-form-control" rows="2"></textarea>
          </div>
        </div>

        <div class="rpm-section">
          <h3 class="rpm-section-title">🔄 7. Refleksi</h3>
          <div class="rpm-form-group">
            <label>🧑‍🏫 Refleksi Guru</label>
            <textarea id="rpm-refleksi-guru" class="rpm-form-control" rows="2"></textarea>
          </div>
          <div class="rpm-form-group">
            <label>🧒 Refleksi Siswa</label>
            <textarea id="rpm-refleksi-siswa" class="rpm-form-control" rows="2"></textarea>
          </div>
        </div>

        <div class="rpm-section">
          <h3 class="rpm-section-title">📎 8. Lampiran</h3>
          <div class="rpm-form-group">
            <label>📄 LKPD / LKM</label>
            <textarea id="rpm-lkpd" class="rpm-form-control" rows="3"></textarea>
          </div>
          <div class="rpm-form-group">
            <label>📚 Bahan Bacaan</label>
            <textarea id="rpm-bahan" class="rpm-form-control" rows="2"></textarea>
          </div>
          <div class="rpm-form-group">
            <label> Glosarium</label>
            <textarea id="rpm-glosarium" class="rpm-form-control" rows="2"></textarea>
          </div>
        </div>

        <div class="rpm-section">
          <h3 class="rpm-section-title">✍️ 9. Tanda Tangan</h3>
          <div class="rpm-form-grid">
            <div class="rpm-form-group">
              <label>👨‍💼 Nama Kepala Sekolah</label>
              <input type="text" id="rpm-kepsek" class="rpm-form-control" value="${DEFAULT_TTD.namaKepsek}">
            </div>
            <div class="rpm-form-group">
              <label>🔢 NIP Kepala Sekolah</label>
              <input type="text" id="rpm-nip-kepsek" class="rpm-form-control" value="${DEFAULT_TTD.nipKepsek}">
            </div>
          </div>
          <div class="rpm-form-grid">
            <div class="rpm-form-group">
              <label>👩‍ Nama Guru Pengampu</label>
              <input type="text" id="rpm-guru-pengampu" class="rpm-form-control" value="${DEFAULT_TTD.namaGuru}">
            </div>
            <div class="rpm-form-group">
              <label>🔢 NIP Guru Pengampu</label>
              <input type="text" id="rpm-nip-guru" class="rpm-form-control" value="${DEFAULT_TTD.nipGuru}">
            </div>
          </div>
        </div>

        <div class="rpm-actions">
          <button class="rpm-btn rpm-btn-primary" id="btn-generate-ai">✨ Generate dengan AI</button>
          <button class="rpm-btn rpm-btn-success" id="btn-simpan">💾 Simpan ke Database</button>
          <button class="rpm-btn rpm-btn-warning" id="btn-export">📥 Export Word</button>
          <button class="rpm-btn rpm-btn-secondary" id="btn-reset">🔄 Reset Form</button>
        </div>
      </div>

      <div id="rpm-list-section" style="display: none;">
        <div class="rpm-section">
          <h3 class="rpm-section-title">📚 Daftar RPM Tersimpan</h3>
          <div id="rpm-list-container">
            <div class="rpm-loading"> Memuat data...</div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Tambah 1 pertemuan default
  tambahPertemuan();
}

function attachEvents(container) {
  // Tab switching
  container.querySelectorAll('.rpm-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      container.querySelectorAll('.rpm-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const target = tab.dataset.tab;
      container.querySelector('#rpm-form-section').style.display = target === 'form' ? 'block' : 'none';
      container.querySelector('#rpm-list-section').style.display = target === 'list' ? 'block' : 'none';
    });
  });

  // Tambah pertemuan
  container.querySelector('#btn-tambah-pertemuan').addEventListener('click', tambahPertemuan);

  // Generate AI
  container.querySelector('#btn-generate-ai').addEventListener('click', () => handleGenerateAI(container));

  // Simpan
  container.querySelector('#btn-simpan').addEventListener('click', () => handleSimpan(container));

  // Export Word
  container.querySelector('#btn-export').addEventListener('click', () => handleExportWord(container));

  // Reset
  container.querySelector('#btn-reset').addEventListener('click', () => {
    if (confirm('🔄 Reset semua form?')) {
      currentEditId = null;
      container.querySelectorAll('input[type="text"], textarea').forEach(el => {
        // Reset ke default untuk field tertentu
        if (el.id === 'rpm-guru' || el.id === 'rpm-guru-pengampu') {
          el.value = DEFAULT_TTD.namaGuru;
        } else if (el.id === 'rpm-kepsek') {
          el.value = DEFAULT_TTD.namaKepsek;
        } else if (el.id === 'rpm-nip-kepsek') {
          el.value = DEFAULT_TTD.nipKepsek;
        } else if (el.id === 'rpm-nip-guru') {
          el.value = DEFAULT_TTD.nipGuru;
        } else if (el.id === 'rpm-sekolah') {
          el.value = currentUser.namaSekolah || 'SDN 139 LAMANDA';
        } else {
          el.value = '';
        }
      });
      container.querySelectorAll('input[type="checkbox"]').forEach(el => el.checked = false);
      container.querySelector('#rpm-pertemuan-container').innerHTML = '';
      tambahPertemuan();
      showToast('✅ Form direset!');
    }
  });
}

function loadTTDDefaults() {
  const saved = localStorage.getItem('rpm_ttd');
  let ttdData = { ...DEFAULT_TTD };
  
  if (saved) {
    try {
      ttdData = { ...ttdData, ...JSON.parse(saved) };
    } catch (e) {}
  }
  
  setTimeout(() => {
    const fields = {
      'rpm-kepsek': ttdData.namaKepsek,
      'rpm-nip-kepsek': ttdData.nipKepsek,
      'rpm-guru-pengampu': ttdData.namaGuru,
      'rpm-nip-guru': ttdData.nipGuru
    };
    
    Object.entries(fields).forEach(([id, value]) => {
      const el = document.getElementById(id);
      if (el) el.value = value;
    });
  }, 100);
}

function saveTTDDefaults() {
  const ttdData = {
    namaKepsek: document.getElementById('rpm-kepsek')?.value || DEFAULT_TTD.namaKepsek,
    nipKepsek: document.getElementById('rpm-nip-kepsek')?.value || DEFAULT_TTD.nipKepsek,
    namaGuru: document.getElementById('rpm-guru-pengampu')?.value || DEFAULT_TTD.namaGuru,
    nipGuru: document.getElementById('rpm-nip-guru')?.value || DEFAULT_TTD.nipGuru
  };
  
  localStorage.setItem('rpm_ttd', JSON.stringify(ttdData));
}

function tambahPertemuan() {
  const container = document.querySelector('#rpm-pertemuan-container');
  const nomor = container.querySelectorAll('.rpm-pertemuan-item').length + 1;
  
  const div = document.createElement('div');
  div.className = 'rpm-pertemuan-item';
  div.style.cssText = 'background: #fff1f2; padding: 15px; border-radius: 10px; margin-bottom: 15px; border-left: 4px solid #ec4899;';
  div.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
      <strong style="color: #be185d;">Pertemuan ${nomor}</strong>
      <button type="button" class="rpm-btn rpm-btn-danger" onclick="this.parentElement.parentElement.remove()" style="padding: 6px 12px; font-size: 12px;">🗑️ Hapus</button>
    </div>
    <div class="rpm-form-group">
      <label>🧠 A. Memahami (Mindful)</label>
      <textarea class="rpm-form-control rpm-memahami" rows="2" placeholder="Pertanyaan pemantik, aktivitas eksplorasi..."></textarea>
    </div>
    <div class="rpm-form-group">
      <label>🛠️ B. Mengaplikasikan (Meaningful & Joyful)</label>
      <textarea class="rpm-form-control rpm-mengaplikasikan" rows="3" placeholder="Aktivitas praktik, diferensiasi..."></textarea>
    </div>
    <div class="rpm-form-group">
      <label>🔄 C. Merefleksikan</label>
      <textarea class="rpm-form-control rpm-merefleksikan" rows="2" placeholder="Pertanyaan refleksi, self-assessment..."></textarea>
    </div>
  `;
  container.appendChild(div);
}

async function handleGenerateAI(container) {
  if (!groqApiKey) {
    showToast('⚠️ API Key belum aktif!', 'error');
    return;
  }

  const mapel = container.querySelector('#rpm-mapel').value;
  const kelas = container.querySelector('#rpm-kelas').value;
  const topik = container.querySelector('#rpm-topik').value;
  const model = container.querySelector('#rpm-model').value;

  if (!mapel || !kelas || !topik) {
    showToast('⚠️ Isi Mapel, Kelas, dan Topik terlebih dahulu!', 'error');
    return;
  }

  const [kelasNum, fase] = kelas.split('|');
  
  const prompt = `Bertindaklah sebagai Ahli Kurikulum Merdeka dan Pengembang RPM profesional.

Buatkan Rencana Pembelajaran Mendalam (RPM) dengan format JSON valid berdasarkan data:
- Mata Pelajaran: ${mapel}
- Kelas: ${kelasNum} (Fase ${fase})
- Topik: ${topik}
- Model Pembelajaran: ${model}
- Sekolah: SDN 139 LAMANDA

WAJIB output dalam format JSON berikut (tanpa markdown tambahan):
{
  "analisis_kesiapan": {
    "belum_siap": "deskripsi...",
    "siap": "deskripsi...",
    "mahir": "deskripsi..."
  },
  "cp": "Capaian Pembelajaran...",
  "tujuan_pembelajaran": ["TP 1", "TP 2", "TP 3"],
  "profil_lulusan": ["Dimensi 1", "Dimensi 2", "Dimensi 3"],
  "langkah_pembelajaran": [
    {
      "pertemuan": 1,
      "memahami": "...",
      "mengaplikasikan": "...",
      "merefleksikan": "..."
    }
  ],
  "asesmen": {
    "diagnostik": "...",
    "formatif": "...",
    "sumatif": "...",
    "rubrik_penilaian": "4 (Mahir): ... 3 (Cakap): ... 2 (Berkembang): ... 1 (Belum Siap): ..."
  },
  "diferensiasi": {
    "remedial": "...",
    "pengayaan": "..."
  },
  "refleksi": {
    "guru": "...",
    "siswa": "..."
  },
  "lampiran": {
    "lkpd": "...",
    "bahan_bacaan": "...",
    "glosarium": "..."
  }
}

PENTING:
- Integrasi 3 Prinsip: Mindful, Meaningful, Joyful
- Integrasi 4 Kerangka: Praktik Pedagogik, Lingkungan, Digital, Kemitraan
- Pilih 3-4 Profil Lulusan yang paling relevan
- Buat 2 pertemuan dengan siklus Memahami-Mengaplikasikan-Merefleksikan
- Gunakan bahasa Indonesia formal dan edukatif`;

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqApiKey}`
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: 'Anda adalah ahli kurikulum Merdeka Indonesia. Output HARUS JSON valid.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 4000
      })
    });

    if (!response.ok) throw new Error(`API Error: ${response.status}`);

    const data = await response.json();
    const aiText = data.choices[0].message.content;
    
    // Parse JSON dari response
    let parsed;
    const jsonMatch = aiText.match(/```json\s*([\s\S]*?)\s*```/) || aiText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);
    } else {
      parsed = JSON.parse(aiText);
    }

    // Isi form dengan data AI
    if (parsed.analisis_kesiapan) {
      container.querySelector('#rpm-belum-siap').value = parsed.analisis_kesiapan.belum_siap || '';
      container.querySelector('#rpm-siap').value = parsed.analisis_kesiapan.siap || '';
      container.querySelector('#rpm-mahir').value = parsed.analisis_kesiapan.mahir || '';
    }
    if (parsed.cp) container.querySelector('#rpm-cp').value = parsed.cp;
    if (parsed.tujuan_pembelajaran) {
      container.querySelector('#rpm-tp').value = parsed.tujuan_pembelajaran.join('\n');
    }
    if (parsed.profil_lulusan) {
      container.querySelectorAll('.rpm-profil').forEach(cb => {
        cb.checked = parsed.profil_lulusan.includes(cb.value);
      });
    }
    if (parsed.langkah_pembelajaran) {
      container.querySelector('#rpm-pertemuan-container').innerHTML = '';
      parsed.langkah_pembelajaran.forEach(p => {
        tambahPertemuan();
        const items = container.querySelectorAll('.rpm-pertemuan-item');
        const last = items[items.length - 1];
        last.querySelector('.rpm-memahami').value = p.memahami || '';
        last.querySelector('.rpm-mengaplikasikan').value = p.mengaplikasikan || '';
        last.querySelector('.rpm-merefleksikan').value = p.merefleksikan || '';
      });
    }
    if (parsed.asesmen) {
      container.querySelector('#rpm-diagnostik').value = parsed.asesmen.diagnostik || '';
      container.querySelector('#rpm-formatif').value = parsed.asesmen.formatif || '';
      container.querySelector('#rpm-sumatif').value = parsed.asesmen.sumatif || '';
      container.querySelector('#rpm-rubrik').value = parsed.asesmen.rubrik_penilaian || '';
    }
    if (parsed.diferensiasi) {
      container.querySelector('#rpm-remedial').value = parsed.diferensiasi.remedial || '';
      container.querySelector('#rpm-pengayaan').value = parsed.diferensiasi.pengayaan || '';
    }
    if (parsed.refleksi) {
      container.querySelector('#rpm-refleksi-guru').value = parsed.refleksi.guru || '';
      container.querySelector('#rpm-refleksi-siswa').value = parsed.refleksi.siswa || '';
    }
    if (parsed.lampiran) {
      container.querySelector('#rpm-lkpd').value = parsed.lampiran.lkpd || '';
      container.querySelector('#rpm-bahan').value = parsed.lampiran.bahan_bacaan || '';
      container.querySelector('#rpm-glosarium').value = parsed.lampiran.glosarium || '';
    }

    showToast('✅ RPM berhasil di-generate dengan AI!');
  } catch (error) {
    console.error('Error AI:', error);
    showToast('❌ Gagal generate: ' + error.message, 'error');
  }
}

async function handleSimpan(container) {
  const sekolah = container.querySelector('#rpm-sekolah').value;
  const guru = container.querySelector('#rpm-guru').value;
  const mapel = container.querySelector('#rpm-mapel').value;
  const kelas = container.querySelector('#rpm-kelas').value;
  const topik = container.querySelector('#rpm-topik').value;

  if (!sekolah || !guru || !mapel || !kelas || !topik) {
    showToast('⚠️ Lengkapi Identitas Dokumen!', 'error');
    return;
  }

  const [kelasNum, fase] = kelas.split('|');

  const profilLulusan = [];
  container.querySelectorAll('.rpm-profil:checked').forEach(cb => profilLulusan.push(cb.value));

  const langkahPembelajaran = [];
  container.querySelectorAll('.rpm-pertemuan-item').forEach((item, idx) => {
    langkahPembelajaran.push({
      pertemuan: idx + 1,
      memahami: item.querySelector('.rpm-memahami').value,
      mengaplikasikan: item.querySelector('.rpm-mengaplikasikan').value,
      merefleksikan: item.querySelector('.rpm-merefleksikan').value
    });
  });

  const dataRPM = {
    jenis: 'standar',
    identitas: {
      sekolah, guru, mapel,
      kelas: kelasNum,
      fase,
      topik,
      alokasi_waktu: container.querySelector('#rpm-alokasi').value,
      model_pembelajaran: container.querySelector('#rpm-model').value
    },
    analisis_kesiapan: {
      belum_siap: container.querySelector('#rpm-belum-siap').value,
      siap: container.querySelector('#rpm-siap').value,
      mahir: container.querySelector('#rpm-mahir').value
    },
    tujuan_dan_profil: {
      cp: container.querySelector('#rpm-cp').value,
      tujuan_pembelajaran: container.querySelector('#rpm-tp').value.split('\n').filter(t => t.trim()),
      profil_lulusan: profilLulusan
    },
    langkah_pembelajaran: langkahPembelajaran,
    asesmen: {
      diagnostik: container.querySelector('#rpm-diagnostik').value,
      formatif: container.querySelector('#rpm-formatif').value,
      sumatif: container.querySelector('#rpm-sumatif').value,
      rubrik_penilaian: container.querySelector('#rpm-rubrik').value
    },
    diferensiasi: {
      remedial: container.querySelector('#rpm-remedial').value,
      pengayaan: container.querySelector('#rpm-pengayaan').value
    },
    refleksi: {
      guru: container.querySelector('#rpm-refleksi-guru').value,
      siswa: container.querySelector('#rpm-refleksi-siswa').value
    },
    lampiran: {
      lkpd: container.querySelector('#rpm-lkpd').value,
      bahan_bacaan: container.querySelector('#rpm-bahan').value,
      glosarium: container.querySelector('#rpm-glosarium').value
    },
    tanda_tangan: {
      kepala_sekolah: {
        nama: container.querySelector('#rpm-kepsek').value,
        nip: container.querySelector('#rpm-nip-kepsek').value
      },
      guru_pengampu: {
        nama: container.querySelector('#rpm-guru-pengampu').value,
        nip: container.querySelector('#rpm-nip-guru').value
      }
    }
  };

  try {
    if (currentEditId) {
      const docRef = doc(db, 'rpm_data', currentEditId);
      await updateDoc(docRef, dataRPM);
      showToast('✅ RPM berhasil diupdate!');
      currentEditId = null;
    } else {
      await addDoc(collection(db, 'rpm_data'), {
        ...dataRPM,
        userId: currentUser.uid,
        createdAt: serverTimestamp()
      });
      showToast('✅ RPM berhasil disimpan!');
    }
    
    saveTTDDefaults();
    container.querySelector('#btn-reset').click();
  } catch (error) {
    console.error('Error saving:', error);
    showToast('❌ Gagal menyimpan: ' + error.message, 'error');
  }
}

function loadRPMList(container) {
  const listContainer = container.querySelector('#rpm-list-container');
  
  const q = query(
    collection(db, 'rpm_data'),
    where('userId', '==', currentUser.uid),
    where('jenis', '==', 'standar'),
    orderBy('createdAt', 'desc')
  );

  onSnapshot(q, (snapshot) => {
    if (snapshot.empty) {
      listContainer.innerHTML = '<div class="rpm-empty">📭 Belum ada RPM tersimpan</div>';
      return;
    }

    listContainer.innerHTML = snapshot.docs.map(docSnap => {
      const d = docSnap.data();
      const date = d.createdAt?.toDate?.()?.toLocaleString('id-ID') || '-';
      return `
        <div class="rpm-item">
          <div class="rpm-item-header">
            <div>
              <div class="rpm-item-title">${d.identitas?.mapel || '-'} - ${d.identitas?.topik || '-'}</div>
              <div class="rpm-item-meta">Kelas ${d.identitas?.kelas || '-'} | ${date}</div>
            </div>
            <div class="rpm-item-actions">
              <button onclick="editRPM('${docSnap.id}')" style="background: #3b82f6;">✏️ Edit</button>
              <button onclick="deleteRPM('${docSnap.id}')" style="background: #ef4444;">🗑️ Hapus</button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }, (error) => {
    console.warn('Error loading RPM list:', error);
    if (error.code === 'failed-precondition') {
      listContainer.innerHTML = '<div class="rpm-empty">⚠️ Index Firestore sedang diproses. Silakan tunggu beberapa menit.</div>';
    } else {
      listContainer.innerHTML = '<div class="rpm-empty">❌ Gagal memuat data</div>';
    }
  });
}

window.editRPM = async function(id) {
  try {
    const { getDoc, doc } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
    const docRef = doc(db, 'rpm_data', id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      showToast('❌ Data tidak ditemukan!', 'error');
      return;
    }

    const d = docSnap.data();
    currentEditId = id;

    document.querySelector('#rpm-sekolah').value = d.identitas?.sekolah || '';
    document.querySelector('#rpm-guru').value = d.identitas?.guru || '';
    document.querySelector('#rpm-mapel').value = d.identitas?.mapel || '';
    document.querySelector('#rpm-kelas').value = `${d.identitas?.kelas}|${d.identitas?.fase}` || '';
    document.querySelector('#rpm-topik').value = d.identitas?.topik || '';
    document.querySelector('#rpm-alokasi').value = d.identitas?.alokasi_waktu || '';
    document.querySelector('#rpm-model').value = d.identitas?.model_pembelajaran || '';

    document.querySelector('#rpm-belum-siap').value = d.analisis_kesiapan?.belum_siap || '';
    document.querySelector('#rpm-siap').value = d.analisis_kesiapan?.siap || '';
    document.querySelector('#rpm-mahir').value = d.analisis_kesiapan?.mahir || '';

    document.querySelector('#rpm-cp').value = d.tujuan_dan_profil?.cp || '';
    document.querySelector('#rpm-tp').value = (d.tujuan_dan_profil?.tujuan_pembelajaran || []).join('\n');
    
    document.querySelectorAll('.rpm-profil').forEach(cb => {
      cb.checked = (d.tujuan_dan_profil?.profil_lulusan || []).includes(cb.value);
    });

    document.querySelector('#rpm-pertemuan-container').innerHTML = '';
    (d.langkah_pembelajaran || []).forEach(p => {
      tambahPertemuan();
      const items = document.querySelectorAll('.rpm-pertemuan-item');
      const last = items[items.length - 1];
      last.querySelector('.rpm-memahami').value = p.memahami || '';
      last.querySelector('.rpm-mengaplikasikan').value = p.mengaplikasikan || '';
      last.querySelector('.rpm-merefleksikan').value = p.merefleksikan || '';
    });

    document.querySelector('#rpm-diagnostik').value = d.asesmen?.diagnostik || '';
    document.querySelector('#rpm-formatif').value = d.asesmen?.formatif || '';
    document.querySelector('#rpm-sumatif').value = d.asesmen?.sumatif || '';
    document.querySelector('#rpm-rubrik').value = d.asesmen?.rubrik_penilaian || '';

    document.querySelector('#rpm-remedial').value = d.diferensiasi?.remedial || '';
    document.querySelector('#rpm-pengayaan').value = d.diferensiasi?.pengayaan || '';

    document.querySelector('#rpm-refleksi-guru').value = d.refleksi?.guru || '';
    document.querySelector('#rpm-refleksi-siswa').value = d.refleksi?.siswa || '';

    document.querySelector('#rpm-lkpd').value = d.lampiran?.lkpd || '';
    document.querySelector('#rpm-bahan').value = d.lampiran?.bahan_bacaan || '';
    document.querySelector('#rpm-glosarium').value = d.lampiran?.glosarium || '';

    // Load tanda tangan
    if (d.tanda_tangan) {
      document.querySelector('#rpm-kepsek').value = d.tanda_tangan.kepala_sekolah?.nama || DEFAULT_TTD.namaKepsek;
      document.querySelector('#rpm-nip-kepsek').value = d.tanda_tangan.kepala_sekolah?.nip || DEFAULT_TTD.nipKepsek;
      document.querySelector('#rpm-guru-pengampu').value = d.tanda_tangan.guru_pengampu?.nama || DEFAULT_TTD.namaGuru;
      document.querySelector('#rpm-nip-guru').value = d.tanda_tangan.guru_pengampu?.nip || DEFAULT_TTD.nipGuru;
    }

    document.querySelector('[data-tab="form"]').click();
    showToast('✅ RPM dimuat untuk edit!');
  } catch (error) {
    console.error('Error loading RPM:', error);
    showToast('❌ Gagal memuat RPM!', 'error');
  }
};

window.deleteRPM = async function(id) {
  if (!confirm('⚠️ Yakin hapus RPM ini?')) return;
  
  try {
    await deleteDoc(doc(db, 'rpm_data', id));
    showToast('✅ RPM berhasil dihapus!');
  } catch (error) {
    console.error('Error deleting:', error);
    showToast('❌ Gagal menghapus!', 'error');
  }
};

function handleExportWord(container) {
  const data = gatherFormData(container);
  if (!data.identitas.topik) {
    showToast('⚠️ Isi data terlebih dahulu!', 'error');
    return;
  }

  const d = data;
  let html = `
    <html><head><meta charset="utf-8"><title>RPM - ${d.identitas.topik}</title>
    <style>
      body { font-family: 'Times New Roman', serif; margin: 2cm; line-height: 1.6; }
      h1 { text-align: center; font-size: 16pt; margin-bottom: 5px; }
      h2 { font-size: 13pt; border-bottom: 2px solid #000; padding-bottom: 5px; margin-top: 20px; }
      h3 { font-size: 12pt; margin-top: 15px; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
      th, td { border: 1px solid #000; padding: 8px; text-align: left; }
      th { background: #f0f0f0; }
      ul { margin: 5px 0; padding-left: 20px; }
      .ttd-section { margin-top: 50px; }
      .ttd-table { width: 100%; border: none; }
      .ttd-table td { width: 50%; border: none; text-align: center; vertical-align: top; }
      .ttd-name { font-weight: bold; border-bottom: 1px solid #000; display: inline-block; min-width: 200px; margin-bottom: 5px; }
    </style></head><body>
    <h1>RENCANA PEMBELAJARAN MENDALAM (RPM)</h1>
    <h2 style="text-align: center; border: none;">${d.identitas.topik}</h2>
    
    <h2>A. IDENTITAS DOKUMEN</h2>
    <table>
      <tr><td style="width: 30%;"><strong>Sekolah</strong></td><td>${d.identitas.sekolah}</td></tr>
      <tr><td><strong>Guru</strong></td><td>${d.identitas.guru}</td></tr>
      <tr><td><strong>Mata Pelajaran</strong></td><td>${d.identitas.mapel}</td></tr>
      <tr><td><strong>Kelas/Fase</strong></td><td>${d.identitas.kelas} (Fase ${d.identitas.fase})</td></tr>
      <tr><td><strong>Topik</strong></td><td>${d.identitas.topik}</td></tr>
      <tr><td><strong>Alokasi Waktu</strong></td><td>${d.identitas.alokasi_waktu}</td></tr>
      <tr><td><strong>Model</strong></td><td>${d.identitas.model_pembelajaran}</td></tr>
    </table>

    <h2>B. ANALISIS KESIAPAN MURID</h2>
    <p><strong>🔴 Belum Siap:</strong> ${d.analisis_kesiapan.belum_siap}</p>
    <p><strong>🟡 Siap:</strong> ${d.analisis_kesiapan.siap}</p>
    <p><strong>🟢 Mahir:</strong> ${d.analisis_kesiapan.mahir}</p>

    <h2>C. TUJUAN & PROFIL LULUSAN</h2>
    <p><strong>CP:</strong> ${d.tujuan_dan_profil.cp}</p>
    <h3>Tujuan Pembelajaran:</h3>
    <ul>${d.tujuan_dan_profil.tujuan_pembelajaran.map(t => `<li>${t}</li>`).join('')}</ul>
    <h3>Profil Lulusan:</h3>
    <ul>${d.tujuan_dan_profil.profil_lulusan.map(p => `<li>${p}</li>`).join('')}</ul>

    <h2>D. LANGKAH PEMBELAJARAN</h2>
    ${d.langkah_pembelajaran.map(p => `
      <h3>Pertemuan ${p.pertemuan}</h3>
      <p><strong>A. Memahami:</strong> ${p.memahami}</p>
      <p><strong>B. Mengaplikasikan:</strong> ${p.mengaplikasikan}</p>
      <p><strong>C. Merefleksikan:</strong> ${p.merefleksikan}</p>
    `).join('')}

    <h2>E. ASESMEN</h2>
    <p><strong>Diagnostik:</strong> ${d.asesmen.diagnostik}</p>
    <p><strong>Formatif:</strong> ${d.asesmen.formatif}</p>
    <p><strong>Sumatif:</strong> ${d.asesmen.sumatif}</p>
    <p><strong>Rubrik:</strong> ${d.asesmen.rubrik_penilaian}</p>

    <h2>F. DIFERENSIASI</h2>
    <p><strong>Remedial:</strong> ${d.diferensiasi.remedial}</p>
    <p><strong>Pengayaan:</strong> ${d.diferensiasi.pengayaan}</p>

    <h2>G. REFLEKSI</h2>
    <p><strong>Guru:</strong> ${d.refleksi.guru}</p>
    <p><strong>Siswa:</strong> ${d.refleksi.siswa}</p>

    <h2>H. LAMPIRAN</h2>
    <p><strong>LKPD:</strong> ${d.lampiran.lkpd}</p>
    <p><strong>Bahan Bacaan:</strong> ${d.lampiran.bahan_bacaan}</p>
    <p><strong>Glosarium:</strong> ${d.lampiran.glosarium}</p>

    <div class="ttd-section">
      <table class="ttd-table">
        <tr>
          <td>
            <div>Mengetahui,</div>
            <div style="margin-bottom: 60px;">Kepala Sekolah<br>SDN 139 LAMANDA</div>
            <div class="ttd-name">${d.tanda_tangan.kepala_sekolah.nama}</div>
            <div>NIP: ${d.tanda_tangan.kepala_sekolah.nip}</div>
          </td>
          <td>
            <div>Guru Pengampu,</div>
            <div style="margin-bottom: 60px;">Guru Mata Pelajaran</div>
            <div class="ttd-name">${d.tanda_tangan.guru_pengampu.nama}</div>
            <div>NIP: ${d.tanda_tangan.guru_pengampu.nip}</div>
          </td>
        </tr>
      </table>
    </div>
    </body></html>
  `;

  const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `RPM_${d.identitas.mapel}_${d.identitas.topik.replace(/\s+/g, '_')}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  showToast('📥 Word berhasil diunduh!');
}

function gatherFormData(container) {
  const kelas = container.querySelector('#rpm-kelas').value;
  const [kelasNum, fase] = kelas.split('|');

  const profilLulusan = [];
  container.querySelectorAll('.rpm-profil:checked').forEach(cb => profilLulusan.push(cb.value));

  const langkahPembelajaran = [];
  container.querySelectorAll('.rpm-pertemuan-item').forEach((item, idx) => {
    langkahPembelajaran.push({
      pertemuan: idx + 1,
      memahami: item.querySelector('.rpm-memahami').value,
      mengaplikasikan: item.querySelector('.rpm-mengaplikasikan').value,
      merefleksikan: item.querySelector('.rpm-merefleksikan').value
    });
  });

  return {
    identitas: {
      sekolah: container.querySelector('#rpm-sekolah').value,
      guru: container.querySelector('#rpm-guru').value,
      mapel: container.querySelector('#rpm-mapel').value,
      kelas: kelasNum,
      fase,
      topik: container.querySelector('#rpm-topik').value,
      alokasi_waktu: container.querySelector('#rpm-alokasi').value,
      model_pembelajaran: container.querySelector('#rpm-model').value
    },
    analisis_kesiapan: {
      belum_siap: container.querySelector('#rpm-belum-siap').value,
      siap: container.querySelector('#rpm-siap').value,
      mahir: container.querySelector('#rpm-mahir').value
    },
    tujuan_dan_profil: {
      cp: container.querySelector('#rpm-cp').value,
      tujuan_pembelajaran: container.querySelector('#rpm-tp').value.split('\n').filter(t => t.trim()),
      profil_lulusan: profilLulusan
    },
    langkah_pembelajaran: langkahPembelajaran,
    asesmen: {
      diagnostik: container.querySelector('#rpm-diagnostik').value,
      formatif: container.querySelector('#rpm-formatif').value,
      sumatif: container.querySelector('#rpm-sumatif').value,
      rubrik_penilaian: container.querySelector('#rpm-rubrik').value
    },
    diferensiasi: {
      remedial: container.querySelector('#rpm-remedial').value,
      pengayaan: container.querySelector('#rpm-pengayaan').value
    },
    refleksi: {
      guru: container.querySelector('#rpm-refleksi-guru').value,
      siswa: container.querySelector('#rpm-refleksi-siswa').value
    },
    lampiran: {
      lkpd: container.querySelector('#rpm-lkpd').value,
      bahan_bacaan: container.querySelector('#rpm-bahan').value,
      glosarium: container.querySelector('#rpm-glosarium').value
    },
    tanda_tangan: {
      kepala_sekolah: {
        nama: container.querySelector('#rpm-kepsek').value,
        nip: container.querySelector('#rpm-nip-kepsek').value
      },
      guru_pengampu: {
        nama: container.querySelector('#rpm-guru-pengampu').value,
        nip: container.querySelector('#rpm-nip-guru').value
      }
    }
  };
}

function showToast(msg, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `rpm-toast rpm-toast-${type}`;
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(400px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
