/**
 * script.js - Bantuan AI Global (GROQ API) - REVISI
 * Fitur: Groq Vision + Teks + Role Classification + Output di bawah + Download + Save Firestore + Tetap bisa ketik saat upload gambar
 * API: Groq - https://api.groq.com/openai/v1/chat/completions
 * Model Vision: meta-llama/llama-4-scout-17b-16e-instruct atau llama-3.2-11b-vision-preview
 */

import { db } from '../../js/firebase-config.js';

// --- CONFIG GROQ ---
// Simpan API Key di localStorage agar aman: localStorage.setItem('groq_api_key', 'gsk_xxx')
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL_TEXT = 'llama-3.3-70b-versatile'; // cepat & pintar untuk teks
const GROQ_MODEL_VISION = 'meta-llama/llama-4-scout-17b-16e-instruct'; // support image
let firestoreDB = db;

// --- STATE ---
let currentRole = localStorage.getItem('ai_role') || detectRole();
let currentFile = null; // { file, base64, type }
let lastOutputRaw = '';

const $ = (id) => document.getElementById(id);

// --- ROLE SYSTEM ---
function detectRole() {
  try {
    const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const r = (user.role || user.jabatan || '').toLowerCase();
    if (r.includes('siswa') || r.includes('murid')) return 'siswa';
    if (r.includes('ortu') || r.includes('wali') || r.includes('orang')) return 'ortu';
    return 'guru';
  } catch { return 'guru'; }
}

function getSystemPrompt(role) {
  const base = `Kamu adalah asisten AI resmi SDN 139 LAMANDA, ramah dan membantu.`;
  if (role === 'guru') {
    return `${base}
Peran: Membantu Guru/Admin SD.
Gaya: Profesional, terstruktur, sesuai Kurikulum Merdeka. Selalu berikan format tabel jika relevan, sertakan JP, Elemen CP, dan contoh konkret.
Jika user upload gambar, analisis sebagai soal, LKPD, atau hasil kerja siswa dan berikan umpan balik + rekomendasi TP.
Jika menghasilkan daftar TP/ATP, selalu akhiri dengan format JSON array seperti: [{"elemen":"Bilangan","tp":"...","jp":8,"semester":1,"mapel":"Matematika"}] agar bisa disimpan otomatis ke Prota.`;
  }
  if (role === 'siswa') {
    return `${base}
Peran: Tutor untuk Peserta Didik SD (Fase A-C).
Gaya: Bahasa sederhana, menyenangkan, pakai emoji secukupnya, jelaskan langkah demi langkah.
Jika user upload gambar soal, jelaskan cara menyelesaikannya dengan 3 langkah mudah, jangan langsung kasih jawaban akhir saja.
Akhiri dengan 1 pertanyaan latihan untuk siswa.`;
  }
  // ortu
  return `${base}
Peran: Konselor untuk Orang Tua/Wali.
Gaya: Empatik, santai, tidak pakai istilah teknis berat. Fokus pada cara mendampingi anak di rumah, motivasi, dan perkembangan karakter.
Jika user upload gambar (rapor, tugas, foto kegiatan), berikan apresiasi positif dulu, lalu tips pendampingan praktis di rumah.`;
}

function setRoleUI(role) {
  currentRole = role;
  localStorage.setItem('ai_role', role);
  document.querySelectorAll('.role-btn').forEach(b => b.classList.toggle('active', b.dataset.role === role));
  const badge = $('roleBadge');
  if (badge) {
    badge.textContent = role === 'guru' ? '👨‍🏫 Guru/Admin' : role === 'siswa' ? '🎒 Siswa' : '👨‍👩‍👧 Orang Tua';
    badge.className = 'role-badge ' + role;
  }
}

function addChat(text, who, imgBase64) {
  const container = $('chatContainer');
  if (!container) return;
  const div = document.createElement('div');
  div.className = `message ${who}`;
  const safeText = text.replace(/</g, '&lt;').replace(/\n/g, '<br>');
  div.innerHTML = `${safeText}${imgBase64 && who === 'user' ? `<img src="${imgBase64}" style="max-width:120px; border-radius:6px; margin-top:6px; display:block;">` : ''}`;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

// --- FILE HANDLING (BISA TETAP KETIK TEKS) ---
function handleFile(file, type) {
  currentFile = { file, type, name: file.name, size: file.size };
  const reader = new FileReader();
  reader.onload = (ev) => {
    currentFile.base64 = ev.target.result;
    const previewArea = $('previewArea');
    const previewImg = $('previewImg');
    const previewName = $('previewName');
    const previewSize = $('previewSize');
    const btnImage = $('btnImage');
    if (previewArea) {
      previewArea.classList.add('show');
      if (previewImg) previewImg.src = type === 'image' ? ev.target.result : '';
      if (previewName) previewName.textContent = file.name;
      if (previewSize) previewSize.textContent = (file.size / 1024).toFixed(1) + ' KB';
    }
    if (btnImage) btnImage.classList.add('has-file');
    const userInput = $('userInput');
    if (userInput) {
      userInput.placeholder = `Gambar "${file.name}" terupload. Silakan ketik info tambahan tentang gambar ini (contoh: 'jelaskan soal ini untuk kelas 4')...`;
      userInput.focus();
    }
  };
  if (type === 'image') reader.readAsDataURL(file);
  else reader.readAsDataURL(file); // video juga sebagai base64 untuk preview
}

function clearFile() {
  currentFile = null;
  const previewArea = $('previewArea');
  const btnImage = $('btnImage');
  const imageInput = $('imageInput');
  const videoInput = $('videoInput');
  if (previewArea) previewArea.classList.remove('show');
  if (btnImage) btnImage.classList.remove('has-file');
  if (imageInput) imageInput.value = '';
  if (videoInput) videoInput.value = '';
  const userInput = $('userInput');
  if (userInput) userInput.placeholder = 'Ketik pertanyaan atau perintah Anda...';
}

// --- GROQ API CALL ---
async function callGroqAPI(promptText, file) {
  const apiKey = localStorage.getItem('groq_api_key') || localStorage.getItem('GROQ_API_KEY') || '';
  if (!apiKey) {
    throw new Error('Groq API Key belum diatur. Silakan set: localStorage.setItem("groq_api_key", "gsk_xxx") di console browser. Dapatkan key di https://console.groq.com/keys');
  }

  const systemPrompt = getSystemPrompt(currentRole);
  const userContent = [];

  // Jika ada gambar, gunakan format vision
  if (file && file.type === 'image' && file.base64) {
    // Groq vision butuh base64 url
    userContent.push({
      type: 'text',
      text: `${promptText}\n\nInfo tambahan: User mengupload file ${file.name}. ${promptText ? `Konteks dari user: ${promptText}` : 'Jelaskan isi gambar ini.'}`
    });
    userContent.push({
      type: 'image_url',
      image_url: { url: file.base64 }
    });
  } else {
    // Text only
    userContent.push({
      type: 'text',
      text: promptText
    });
  }

  const body = {
    model: file && file.type === 'image' ? GROQ_MODEL_VISION : GROQ_MODEL_TEXT,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: file && file.type === 'image' ? userContent : promptText }
    ],
    temperature: 0.7,
    max_tokens: 2048,
  };

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Groq API Error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const output = data.choices?.[0]?.message?.content || 'Maaf, tidak ada jawaban dari AI.';
  return output;
}

function formatAIOutput(text) {
  return text
    .replace(/```json([\s\S]*?)```/g, (m, code) => `<pre>${code.trim()}</pre>`)
    .replace(/```([\s\S]*?)```/g, (m, code) => `<pre>${code.trim()}</pre>`)
    .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
    .replace(/\n/g, '<br>');
}

// --- MAIN SEND ---
async function send() {
  const userInput = $('userInput');
  const urlInput = $('urlInput');
  const btnSend = $('btnSend');
  const aiOutput = $('aiOutput');
  const outputWrapper = $('outputWrapper');

  const text = userInput ? userInput.value.trim() : '';
  const url = urlInput ? urlInput.value.trim() : '';

  if (!text && !url && !currentFile) {
    alert('Ketik pertanyaan atau upload gambar dulu!');
    return;
  }

  const displayPrompt = `${text}${url ? `\n🔗 Link: ${url}` : ''}${currentFile ? `\n📎 File: ${currentFile.name}` : ''}`;
  addChat(displayPrompt, 'user', currentFile?.base64);

  // Gabung prompt + url + info file (agar bisa tetap ketik teks saat upload gambar)
  let fullPrompt = text;
  if (url) fullPrompt += `\n\nTolong analisis link ini juga: ${url}`;
  if (currentFile && !text) fullPrompt = `Jelaskan / analisis file ${currentFile.name} ini.`;
  if (currentFile && text) fullPrompt = `${text} (Konteks: user mengupload file ${currentFile.name})`;

  if (btnSend) { btnSend.disabled = true; btnSend.textContent = '⏳'; }
  if (outputWrapper) outputWrapper.classList.remove('show');

  try {
    const result = await callGroqAPI(fullPrompt, currentFile);
    lastOutputRaw = result;

    if (aiOutput) aiOutput.innerHTML = formatAIOutput(result);
    if (outputWrapper) {
      outputWrapper.classList.add('show');
      // Tampilkan tombol Simpan ke Prota jika ada JSON TP
      const btnSaveProta = $('btnSaveProta');
      if (btnSaveProta) {
        btnSaveProta.style.display = (result.includes('"elemen"') && result.includes('"tp"')) ? 'inline-block' : 'none';
      }
      outputWrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    addChat('✅ Jawaban AI sudah tampil di bawah input.', 'ai');
  } catch (err) {
    console.error(err);
    if (aiOutput) aiOutput.innerHTML = `<span style="color:#ef4444;">❌ Error: ${err.message}<br><br>Tips: Cek API Key Groq di localStorage. Buka Console (F12) dan ketik:<br><code>localStorage.setItem('groq_api_key','gsk_xxx')</code></span>`;
    if (outputWrapper) outputWrapper.classList.add('show');
    addChat(`❌ Gagal: ${err.message}`, 'ai');
  } finally {
    if (btnSend) { btnSend.disabled = false; btnSend.textContent = '➤'; }
  }
}

// --- ACTIONS ---
function initEvents() {
  // File inputs
  const imageInput = $('imageInput');
  const videoInput = $('videoInput');
  if (imageInput) imageInput.addEventListener('change', (e) => { const f = e.target.files[0]; if (f) handleFile(f, 'image'); });
  if (videoInput) videoInput.addEventListener('change', (e) => { const f = e.target.files[0]; if (f) handleFile(f, 'video'); });

  const btnRemoveFile = $('btnRemoveFile');
  if (btnRemoveFile) btnRemoveFile.onclick = clearFile;

  // Voice
  let recognition = null;
  let isListening = false;
  const btnVoice = $('btnVoice');
  if (btnVoice) {
    btnVoice.onclick = () => {
      if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
        alert('Browser tidak mendukung voice. Gunakan Chrome.');
        return;
      }
      if (!recognition) {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SR();
        recognition.lang = 'id-ID';
        recognition.onresult = (e) => {
          const t = e.results[0][0].transcript;
          const ui = $('userInput');
          if (ui) ui.value += (ui.value ? ' ' : '') + t;
        };
        recognition.onend = () => { isListening = false; btnVoice.classList.remove('listening'); btnVoice.textContent = '🎤 Suara'; };
      }
      if (!isListening) { recognition.start(); isListening = true; btnVoice.classList.add('listening'); btnVoice.textContent = '⏹️ Stop'; }
      else recognition.stop();
    };
  }

  // Send
  const btnSend = $('btnSend');
  const userInput = $('userInput');
  const btnSendLink = $('btnSendLink');
  if (btnSend) btnSend.onclick = send;
  if (userInput) userInput.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } });
  if (btnSendLink) btnSendLink.onclick = () => { const ui = $('urlInput'); if (ui && ui.value) send(); };

  // Role buttons
  document.querySelectorAll('.role-btn').forEach(b => {
    b.onclick = () => setRoleUI(b.dataset.role);
  });

  // Output actions
  const btnCopy = $('btnCopy');
  const btnDownload = $('btnDownload');
  const btnDownloadPDF = $('btnDownloadPDF');
  const btnSaveFirestore = $('btnSaveFirestore');
  const btnSaveProta = $('btnSaveProta');
  const btnClearChat = $('btnClearChat');

  if (btnCopy) btnCopy.onclick = () => { navigator.clipboard.writeText(lastOutputRaw); alert('✅ Disalin ke clipboard!'); };
  if (btnDownload) btnDownload.onclick = () => {
    if (!lastOutputRaw) return alert('Belum ada output');
    const blob = new Blob([lastOutputRaw], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `AI-${currentRole}-${Date.now()}.txt`; a.click(); URL.revokeObjectURL(url);
  };
  if (btnDownloadPDF) btnDownloadPDF.onclick = () => {
    if (!lastOutputRaw) return alert('Belum ada output');
    const w = window.open('', '_blank');
    w.document.write(`<html><head><title>AI Output</title><style>body{font-family:sans-serif; padding:24px; line-height:1.7;} pre{background:#0f172a; color:#e2e8f0; padding:14px; border-radius:8px; overflow:auto;}</style></head><body><h2>Bantuan AI - ${currentRole.toUpperCase()} - SDN 139 LAMANDA</h2><hr><div>${$('aiOutput').innerHTML}</div><script>window.print()<\/script></body></html>`);
    w.document.close();
  };
  if (btnSaveFirestore) btnSaveFirestore.onclick = async () => {
    if (!lastOutputRaw) return alert('Belum ada output');
    const saveStatus = $('saveStatus');
    if (saveStatus) saveStatus.textContent = '⏳ Menyimpan ke Firestore...';
    try {
      const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
      const data = {
        uid: user.uid || 'anonymous',
        nama: user.nama || user.displayName || 'User',
        role: currentRole,
        prompt: $('userInput') ? $('userInput').value : '',
        fileName: currentFile?.name || null,
        response: lastOutputRaw,
        createdAt: new Date().toISOString()
      };
      if (firestoreDB) {
        if (firestoreDB.collection) {
          await firestoreDB.collection('bantuan_ai_logs').add({ ...data, createdAt: firestoreDB.constructor.FieldValue ? firestoreDB.constructor.FieldValue.serverTimestamp() : new Date() });
        } else {
          const { collection, addDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
          await addDoc(collection(firestoreDB, 'bantuan_ai_logs'), { ...data, createdAt: serverTimestamp() });
        }
      }
      const logs = JSON.parse(localStorage.getItem('ai_logs') || '[]');
      logs.push(data);
      localStorage.setItem('ai_logs', JSON.stringify(logs));
      if (saveStatus) saveStatus.innerHTML = '✅ <b>Berhasil disimpan ke Firestore: bantuan_ai_logs</b>';
    } catch (e) {
      if (saveStatus) saveStatus.innerHTML = `❌ Gagal Firestore: ${e.message}, tapi tersimpan lokal.`;
    }
  };
  if (btnSaveProta) btnSaveProta.onclick = () => {
    try {
      const match = lastOutputRaw.match(/\[([\s\S]*?"elemen"[\s\S]*?)\]/);
      if (!match) return alert('Tidak ada JSON TP ditemukan di output');
      const jsonStr = match[0];
      const json = JSON.parse(jsonStr);
      localStorage.setItem('cp_tp_atp', JSON.stringify(json));
      alert(`✅ ${json.length} TP berhasil disimpan ke Prota! Buka Program Tahunan > Tarik Data TP/ATP`);
    } catch (e) { alert('Gagal parse JSON TP: ' + e.message); }
  };
  if (btnClearChat) btnClearChat.onclick = () => {
    const cc = $('chatContainer');
    if (cc) cc.innerHTML = '<div class="message ai">Chat dibersihkan.</div>';
    const ow = $('outputWrapper');
    if (ow) ow.classList.remove('show');
    lastOutputRaw = '';
  };
}

// Init
document.addEventListener('DOMContentLoaded', () => {
  setRoleUI(currentRole);
  initEvents();
  console.log('Bantuan AI Groq v2.1 - Role:', currentRole, 'Groq Model:', GROQ_MODEL_TEXT, '/', GROQ_MODEL_VISION);
});
