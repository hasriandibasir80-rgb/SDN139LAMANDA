// modules/admin-pembelajaran/features/cp-tp-atp.js
// =========================================
// FITUR: CP, TP, & ATP GENERATOR (MODULAR)
// =========================================

import { db } from '../../../js/firebase-config.js';
import { collection, addDoc, getDocs, query, where, orderBy, onSnapshot, doc, getDoc, serverTimestamp } 
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');

// Konfigurasi Groq API
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';
let groqApiKey = null;

/**
 * Fungsi init - Dipanggil oleh main.js
 */
export async function init(container, db) {
  // Load API Key dari Firestore
  await loadGroqApiKey();
  
  // Render UI
  renderCTAGenerator(container);
  
  // Attach event listeners
  attachEventListeners(container);
  
  // Load data tersimpan
  loadCTAData(container);
}

/**
 * Load Groq API Key dari Firestore
 */
async function loadGroqApiKey() {
  try {
    const docRef = doc(db, 'settings', 'api_key');
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data.keys) {
        const activeKeys = Object.values(data.keys).filter(k => k.active === true);
        if (activeKeys.length > 0) {
          groqApiKey = activeKeys[0].value;
          console.log('✅ Groq API Key loaded');
        }
      }
    }
  } catch (error) {
    console.error('Error loading API key:', error);
  }
}

/**
 * Render UI Generator
 */
function renderCTAGenerator(container) {
  const aiReady = groqApiKey ? true : false;
  const userNama = currentUser.namaLengkap || '';
  const userSekolah = currentUser.namaSekolah || '';

  container.innerHTML = `
    <div class="cta-generator-form">
      <h2>📄 Generator CP/TP/ATP</h2>
      <p class="subtitle">Buat Perangkat Pembelajaran dengan AI 
        ${aiReady ? '<span class="status-badge status-ready">✅ AI Siap</span>' : '<span class="status-badge status-warning">⚠️ API Key Belum Aktif</span>'}
      </p>

      <form id="cta-form">
        <div class="section-title">1. Informasi Sekolah</div>
        
        <div class="form-group">
          <label for="kop-sekolah">Nama Sekolah</label>
          <input type="text" id="kop-sekolah" placeholder="Masukkan nama sekolah" value="${userSekolah}" class="${userSekolah ? 'auto-filled' : ''}" required>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="kop-tahun">Tahun Ajaran</label>
            <input type="text" id="kop-tahun" placeholder="2025/2026" value="2025/2026">
          </div>
          <div class="form-group">
            <label for="cta-guru">Nama Guru</label>
            <input type="text" id="cta-guru" placeholder="Opsional" value="${userNama}" class="${userNama ? 'auto-filled' : ''}">
          </div>
        </div>

        <div class="section-title">2. Informasi Pembelajaran</div>

        <div class="form-row-3">
          <div class="form-group">
            <label for="cta-jenjang">Jenjang</label>
            <select id="cta-jenjang" required>
              <option value="">Pilih</option>
              <option value="sd">SD</option>
              <option value="smp">SMP</option>
              <option value="sma">SMA</option>
            </select>
          </div>
          <div class="form-group">
            <label for="cta-kelas">Kelas</label>
            <select id="cta-kelas" required>
              <option value="">Pilih</option>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
              <option value="5">5</option>
              <option value="6">6</option>
            </select>
          </div>
          <div class="form-group">
            <label for="cta-semester">Semester</label>
            <select id="cta-semester" required>
              <option value="">Pilih</option>
              <option value="1">1 (Ganjil)</option>
              <option value="2">2 (Genap)</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="cta-mapel">Mata Pelajaran</label>
            <input type="text" id="cta-mapel" placeholder="Contoh: Matematika" required>
          </div>
          <div class="form-group">
            <label for="cta-topik">Topik/Materi</label>
            <input type="text" id="cta-topik" placeholder="Contoh: Bilangan 1-20" required>
          </div>
        </div>

        <button type="button" id="btn-generate" class="btn-generate">✨ Generate dengan AI</button>
      </form>

      <div id="cta-result" class="result-section hidden">
        <h3>📋 Hasil Generate</h3>
        <table class="cta-result-table">
          <thead>
            <tr>
              <th class="label-col">Komponen</th>
              <th class="content-col">Konten</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="label-col">🎯 Capaian Pembelajaran (CP)</td>
              <td class="content-col" id="result-cp">CP akan muncul setelah generate...</td>
            </tr>
            <tr>
              <td class="label-col">🏁 Tujuan Pembelajaran (TP)</td>
              <td class="content-col" id="result-tp">TP akan muncul setelah generate...</td>
            </tr>
            <tr>
              <td class="label-col">📊 Alur Tujuan Pembelajaran (ATP)</td>
              <td class="content-col" id="result-atp">ATP akan muncul setelah generate...</td>
            </tr>
          </tbody>
        </table>

        <div class="action-buttons">
          <button type="button" id="btn-print" class="btn-print">🖨️ Print</button>
          <button type="button" id="btn-download" class="btn-download">💾 Download</button>
          <button type="button" id="btn-save" class="btn-save">💾 Simpan Manual</button>
          <button type="button" id="btn-regenerate" class="btn-secondary">🔄 Ulang</button>
        </div>
      </div>

      <div class="saved-documents">
        <h3>📚 Dokumen Tersimpan (<span id="saved-count">0</span>)</h3>
        <div id="cta-list" class="document-list">
          <p class="loading">Memuat data...</p>
        </div>
      </div>
    </div>
  `;
}

/**
 * Attach event listeners
 */
function attachEventListeners(container) {
  const btnGenerate = container.querySelector('#btn-generate');
  if (btnGenerate) btnGenerate.addEventListener('click', () => handleGenerate(container));

  const btnPrint = container.querySelector('#btn-print');
  if (btnPrint) btnPrint.addEventListener('click', () => {
    const cp = container.querySelector('#result-cp')?.textContent || '';
    if (!cp || cp.includes('⏳') || cp.includes('Error')) {
      showToast('⚠️ Generate data dulu sebelum print!', 'warning');
      return;
    }
    window.print();
  });

  const btnDownload = container.querySelector('#btn-download');
  if (btnDownload) btnDownload.addEventListener('click', () => downloadCTAResult(container));

  const btnSave = container.querySelector('#btn-save');
  if (btnSave) btnSave.addEventListener('click', () => handleSave(container));

  const btnRegenerate = container.querySelector('#btn-regenerate');
  if (btnRegenerate) btnRegenerate.addEventListener('click', () => handleGenerate(container));
}

/**
 * Handle Generate dengan Groq AI
 */
async function handleGenerate(container) {
  if (!currentUser.uid) {
    showToast('⚠️ Silakan login dulu!', 'error');
    return;
  }

  const jenjang = container.querySelector('#cta-jenjang')?.value;
  const kelas = container.querySelector('#cta-kelas')?.value;
  const semester = container.querySelector('#cta-semester')?.value;
  const mapel = container.querySelector('#cta-mapel')?.value.trim();
  const sekolah = container.querySelector('#kop-sekolah')?.value;
  const tahun = container.querySelector('#kop-tahun')?.value;
  const guru = container.querySelector('#cta-guru')?.value;
  const topik = container.querySelector('#cta-topik')?.value.trim();

  // Validasi
  if (!jenjang || !kelas || !semester || !mapel || !topik) {
    showToast('⚠️ Lengkapi semua field yang wajib!', 'error');
    return;
  }

  if (!groqApiKey) {
    showToast('⚠️ API Key Groq belum aktif. Hubungi admin.', 'error');
    return;
  }

  // Show result section
  const resultDiv = container.querySelector('#cta-result');
  if (resultDiv) resultDiv.classList.remove('hidden');

  container.querySelector('#result-cp').textContent = '⏳ Generating CP...';
  container.querySelector('#result-tp').textContent = '⏳ Generating TP...';
  container.querySelector('#result-atp').textContent = '⏳ Generating ATP...';

  try {
    const prompt = `Buatkan Capaian Pembelajaran (CP), Tujuan Pembelajaran (TP), dan Alur Tujuan Pembelajaran (ATP) untuk:
- Sekolah: ${sekolah}
- Jenjang: ${jenjang.toUpperCase()}
- Kelas: ${kelas}
- Semester: ${semester}
- Mata Pelajaran: ${mapel}
- Topik: ${topik}
- Tahun Ajaran: ${tahun}

Format output:
CP: [Capaian Pembelajaran]
TP: [Tujuan Pembelajaran]
ATP: [Alur Tujuan Pembelajaran]`;

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqApiKey}`
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: 'Anda adalah ahli kurikulum Merdeka. Buat CP, TP, dan ATP yang sesuai dengan kurikulum Indonesia.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 2048
      })
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    // Parse response
    const cpMatch = aiResponse.match(/CP:\s*([\s\S]*?)(?=TP:|$)/);
    const tpMatch = aiResponse.match(/TP:\s*([\s\S]*?)(?=ATP:|$)/);
    const atpMatch = aiResponse.match(/ATP:\s*([\s\S]*?)$/);

    const cp = cpMatch ? cpMatch[1].trim() : 'Tidak dapat parse CP';
    const tp = tpMatch ? tpMatch[1].trim() : 'Tidak dapat parse TP';
    const atp = atpMatch ? atpMatch[1].trim() : 'Tidak dapat parse ATP';

    container.querySelector('#result-cp').textContent = cp;
    container.querySelector('#result-tp').textContent = tp;
    container.querySelector('#result-atp').textContent = atp;

    // Auto save
    await autoSaveToFirestore(container, { cp, tp, atp }, { sekolah, jenjang, kelas, semester, mapel, guru, topik, tahun });

    showToast('✅ Berhasil generate & tersimpan!', 'success');

  } catch (error) {
    console.error('Error generating:', error);
    container.querySelector('#result-cp').textContent = `❌ Error: ${error.message}`;
    showToast('❌ Gagal generate: ' + error.message, 'error');
  }
}

/**
 * Auto save ke Firestore
 */
async function autoSaveToFirestore(container, result, metadata) {
  try {
    await addDoc(collection(db, 'cp_tp_atp'), {
      userId: currentUser.uid,
      userEmail: currentUser.email,
      userName: currentUser.namaLengkap || 'Guru',
      sekolah: metadata.sekolah,
      tahun: metadata.tahun,
      jenjang: metadata.jenjang,
      kelas: metadata.kelas,
      semester: metadata.semester,
      mapel: metadata.mapel,
      guru: metadata.guru,
      topik: metadata.topik,
      cp: result.cp,
      tp: result.tp,
      atp: result.atp,
      mode: 'AI-Generated',
      createdAt: serverTimestamp()
    });

    console.log('✅ Auto-saved to cp_tp_atp');
    loadCTAData(container);
    return true;
  } catch (error) {
    console.warn('⚠️ Auto-save gagal:', error);
    return false;
  }
}

/**
 * Download hasil sebagai TXT
 */
function downloadCTAResult(container) {
  const cp = container.querySelector('#result-cp')?.textContent || '';
  if (!cp || cp.includes('⏳') || cp.includes('Error')) {
    showToast('⚠️ Generate data dulu sebelum download!', 'warning');
    return;
  }

  const jenjang = container.querySelector('#cta-jenjang')?.value || '';
  const kelas = container.querySelector('#cta-kelas')?.value || '';
  const mapel = container.querySelector('#cta-mapel')?.value || '';
  const topik = container.querySelector('#cta-topik')?.value || '';

  let content = `CAPAIAN PEMBELAJARAN (CP/TP/ATP)\n`;
  content += `KURIKULUM MERDEKA\n\n`;
  content += `Mata Pelajaran: ${mapel}\n`;
  content += `Kelas: ${kelas}\n`;
  content += `Topik: ${topik}\n\n`;
  content += `CP:\n${cp}\n\n`;
  content += `TP:\n${container.querySelector('#result-tp')?.textContent}\n\n`;
  content += `ATP:\n${container.querySelector('#result-atp')?.textContent}\n`;

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `CP-TP-ATP_${mapel}_Kelas${kelas}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Save manual ke Firestore
 */
async function handleSave(container) {
  const cp = container.querySelector('#result-cp')?.textContent || '';
  if (!cp || cp.includes('⏳') || cp.includes('Error')) {
    showToast('⚠️ Generate data dulu!', 'warning');
    return;
  }

  try {
    await addDoc(collection(db, 'cp_tp_atp'), {
      userId: currentUser.uid,
      userEmail: currentUser.email,
      userName: currentUser.namaLengkap || 'Guru',
      sekolah: container.querySelector('#kop-sekolah')?.value,
      tahun: container.querySelector('#kop-tahun')?.value,
      jenjang: container.querySelector('#cta-jenjang')?.value,
      kelas: container.querySelector('#cta-kelas')?.value,
      semester: container.querySelector('#cta-semester')?.value,
      mapel: container.querySelector('#cta-mapel')?.value,
      guru: container.querySelector('#cta-guru')?.value,
      topik: container.querySelector('#cta-topik')?.value,
      cp: cp,
      tp: container.querySelector('#result-tp')?.textContent,
      atp: container.querySelector('#result-atp')?.textContent,
      mode: 'Manual-Save',
      createdAt: serverTimestamp()
    });

    showToast('✅ Berhasil disimpan!', 'success');
    loadCTAData(container);
  } catch (error) {
    showToast('❌ Gagal simpan: ' + error.message, 'error');
  }
}

/**
 * Load data tersimpan dengan real-time listener
 */
function loadCTAData(container) {
  const list = container.querySelector('#cta-list');
  const countSpan = container.querySelector('#saved-count');

  if (!list) return;

  const q = query(
    collection(db, 'cp_tp_atp'),
    where('userId', '==', currentUser.uid),
    orderBy('createdAt', 'desc')
  );

  onSnapshot(q, (snapshot) => {
    if (snapshot.empty) {
      list.innerHTML = '<p class="empty-state">Belum ada dokumen tersimpan</p>';
      if (countSpan) countSpan.textContent = '0';
      return;
    }

    if (countSpan) countSpan.textContent = snapshot.docs.length;

    list.innerHTML = snapshot.docs.map(docSnap => {
      const d = docSnap.data();
      const date = d.createdAt?.toDate?.()?.toLocaleString('id-ID') || '-';
      return `
        <div class="cta-item">
          <div class="cta-item-header">
            <div>
              <strong>${d.mapel?.toUpperCase() || '-'} - Kelas ${d.kelas}</strong><br>
              <small>${d.userName} • ${d.sekolah || '-'}</small>
            </div>
            <small class="date">${date}</small>
          </div>
          <p><strong>📋 Topik:</strong> ${d.topik || '-'}</p>
        </div>
      `;
    }).join('');
  });
}

/**
 * Show toast notification
 */
function showToast(msg, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}
