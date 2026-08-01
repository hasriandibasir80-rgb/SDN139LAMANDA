// modules/bantuan-ai/script.js - FINAL PATCH
// ✅ PERTAHANKAN: Multi-API Keys dari Firestore settings/api_key (rotasi), Groq API, Voice, Image, Link
// ✅ TAMBAHAN: 1. Tetap bisa ketik teks saat upload gambar 2. Output di bawah input area 3. Download + Save Firestore 4. Klasifikasi role Guru/Siswa/Ortu

import { db } from '../../js/firebase-config.js';
import { doc, getDoc, collection, addDoc, serverTimestamp } 
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
if (!currentUser.uid) {
  alert('Sesi berakhir. Silakan login kembali.');
  window.location.href = '../../index.html';
}

// Konfigurasi API - PERTAHANKAN ORI
const API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const API_MODEL = 'llama-3.3-70b-versatile';
const API_MODEL_VISION = 'meta-llama/llama-4-scout-17b-16e-instruct';
const STORAGE_KEY_CHAT = 'ai_chat_history';

let apiKeys = [];
let currentKeyIndex = 0;
let chatHistory = JSON.parse(localStorage.getItem(STORAGE_KEY_CHAT) || '[]');
let recognition = null;
let isListening = false;

// --- TAMBAHAN: STATE BARU UNTUK FITUR BARU ---
let currentRole = localStorage.getItem('ai_role') || detectRole();
let currentFileData = null; // { name, base64, type }
let lastOutputRaw = ''; // untuk download & save

function detectRole() {
  try {
    const roleRaw = (currentUser.role || currentUser.jabatan || '').toLowerCase();
    if (roleRaw.includes('siswa') || roleRaw.includes('murid') || roleRaw.includes('peserta')) return 'siswa';
    if (roleRaw.includes('ortu') || roleRaw.includes('wali') || roleRaw.includes('orang')) return 'ortu';
    return 'guru';
  } catch { return 'guru'; }
}

function getSystemPromptByRole(role) {
  const base = `Anda adalah asisten AI resmi SDN 139 LAMANDA.`;
  if (role === 'guru') {
    return `${base}
Peran: Membantu Guru/Admin SD.
Keahlian: Pembuatan modul ajar, Prota, Promes, soal evaluasi, ide P5, administrasi pembelajaran.
Gaya: Praktis, terstruktur rapi, sesuai konteks SD di Indonesia, Kurikulum Merdeka. Berikan JP dan Elemen CP jika relevan.
Jika menghasilkan daftar TP/ATP, akhiri dengan JSON array: [{"elemen":"Bilangan","tp":"...","jp":8,"semester":1,"mapel":"Matematika"}] agar bisa disimpan otomatis ke Prota.
Anda bisa memproses teks, gambar, dan link.`;
  }
  if (role === 'siswa') {
    return `${base}
Peran: Tutor untuk Peserta Didik SD Fase A-C.
Gaya: Bahasa sederhana, menyenangkan, emoji secukupnya, jelaskan langkah demi langkah (3 langkah).
Jika ada gambar soal, jangan langsung beri jawaban akhir, tuntun cara berpikirnya.
Akhiri dengan 1 soal latihan ringan.`;
  }
  // ortu
  return `${base}
Peran: Pendamping untuk Orang Tua/Wali Peserta Didik.
Gaya: Empatik, santai, bahasa sehari-hari, tidak pakai istilah teknis berat.
Fokus: Cara mendampingi anak belajar di rumah, motivasi, perkembangan karakter, dan cara membaca tugas/rapor anak.
Jika ada gambar tugas/rapor anak, beri apresiasi positif dulu baru saran praktis.`;
}

function setRoleUI(role) {
  currentRole = role;
  localStorage.setItem('ai_role', role);
  document.querySelectorAll('.role-btn').forEach(b => b.classList.toggle('active', b.dataset.role === role));
  const badge = document.getElementById('roleBadge');
  if (badge) {
    badge.textContent = role === 'guru' ? '👨‍🏫 Guru/Admin' : role === 'siswa' ? '🎒 Siswa' : '👨‍👩‍👧 Orang Tua';
    badge.className = 'role-badge ' + role;
  }
  // Update system prompt preview di chat
  const container = document.getElementById('chatContainer');
  if (container && chatHistory.length === 0) {
    container.innerHTML = `<div class="message ai">Mode <b>${badge ? badge.textContent : role}</b> aktif. ${role === 'guru' ? 'Saya bantu buat perangkat ajar.' : role === 'siswa' ? 'Tanya soal apa saja, akan saya jelaskan dengan mudah.' : 'Saya bantu tips dampingi anak di rumah.'}</div>`;
  }
}

const SYSTEM_PROMPT = getSystemPromptByRole(currentRole); // akan diupdate dinamis per request

document.addEventListener('DOMContentLoaded', () => {
  initializeSpeechRecognition();
  loadApiKeys();
  renderChatHistory();
  attachEventListeners();
  // Init role UI
  setRoleUI(currentRole);
  // Preload: update SYSTEM_PROMPT sesuai role
  console.log('✅ Bantuan AI Global - Role:', currentRole);
});

// --- SPEECH RECOGNITION (PERTAHANKAN ORI) ---
function initializeSpeechRecognition() {
  if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'id-ID';
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      const input = document.getElementById('userInput');
      input.value = input.value ? input.value + ' ' + transcript : transcript;
      input.focus();
    };
    recognition.onerror = (event) => {
      console.error('Voice recognition error:', event.error);
      appendMessage('ai', '❌ Gagal mengenali suara. Silakan coba lagi atau ketik manual.');
      isListening = false;
      updateVoiceButton();
    };
    recognition.onend = () => {
      isListening = false;
      updateVoiceButton();
    };
    console.log('✅ Voice recognition initialized');
  } else {
    console.warn('⚠ Voice recognition tidak didukung browser ini');
    const btnVoice = document.getElementById('btnVoice');
    if (btnVoice) {
      btnVoice.disabled = true;
      btnVoice.title = 'Fitur suara tidak didukung browser ini';
    }
  }
}

function toggleVoiceInput() {
  if (!recognition) {
    alert('Fitur voice tidak didukung browser Anda');
    return;
  }
  if (isListening) {
    recognition.stop();
    isListening = false;
  } else {
    recognition.start();
    isListening = true;
    appendMessage('ai', '🎤 Mendengarkan... Silakan berbicara');
  }
  updateVoiceButton();
}

function updateVoiceButton() {
  const btnVoice = document.getElementById('btnVoice');
  if (!btnVoice) return;
  if (isListening) {
    btnVoice.innerHTML = '⏹ Stop';
    btnVoice.classList.add('listening');
  } else {
    btnVoice.innerHTML = '🎤 Suara';
    btnVoice.classList.remove('listening');
  }
}

// --- LOAD MULTI-API KEYS DARI FIRESTORE (PERTAHANKAN ORI) ---
async function loadApiKeys() {
  try {
    const docRef = doc(db, 'settings', 'api_key');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data.keys) {
        apiKeys = Object.values(data.keys)
          .filter(key => key.active === true)
          .map(key => key.value);
        console.log(`✅ Loaded ${apiKeys.length} API keys dari Firestore settings/api_key`);
        if (apiKeys.length === 0) {
          appendMessage('ai', '⚠ Tidak ada API Key yang aktif. Hubungi Admin.');
        }
      } else {
        appendMessage('ai', '⚠ Struktur API Key tidak valid di database.');
      }
    } else {
      appendMessage('ai', '⚠ Dokumen API Key tidak ditemukan di settings/api_key. Hubungi Admin.');
    }
  } catch (error) {
    console.error('Error loading API keys:', error);
    appendMessage('ai', '❌ Gagal memuat konfigurasi API Key dari Firestore.');
  }
}

function getNextApiKey() {
  if (apiKeys.length === 0) return null;
  const key = apiKeys[currentKeyIndex];
  currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
  return key;
}

function attachEventListeners() {
  document.getElementById('btnClearChat')?.addEventListener('click', () => {
    if (confirm('Hapus semua riwayat chat?')) {
      chatHistory = [];
      localStorage.removeItem(STORAGE_KEY_CHAT);
      renderChatHistory();
      const out = document.getElementById('outputWrapper');
      if (out) out.classList.remove('show');
      lastOutputRaw = '';
    }
  });

  document.getElementById('btnSend')?.addEventListener('click', sendMessage);
  document.getElementById('userInput')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
  document.getElementById('btnVoice')?.addEventListener('click', toggleVoiceInput);
  document.getElementById('imageInput')?.addEventListener('change', handleImageUpload);
  document.getElementById('btnSendLink')?.addEventListener('click', sendLinkAnalysis);
  document.getElementById('videoInput')?.addEventListener('change', handleVideoUpload);

  // --- TAMBAHAN: ROLE BUTTONS ---
  document.querySelectorAll('.role-btn').forEach(btn => {
    btn.addEventListener('click', () => setRoleUI(btn.dataset.role));
  });

  // --- TAMBAHAN: OUTPUT ACTIONS (DOWNLOAD & SAVE) ---
  document.getElementById('btnCopy')?.addEventListener('click', () => {
    if (!lastOutputRaw) return alert('Belum ada output');
    navigator.clipboard.writeText(lastOutputRaw);
    alert('✅ Jawaban disalin!');
  });
  document.getElementById('btnDownload')?.addEventListener('click', () => {
    if (!lastOutputRaw) return alert('Belum ada output');
    const blob = new Blob([lastOutputRaw], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `AI-${currentRole}-${Date.now()}.txt`; a.click();
    URL.revokeObjectURL(url);
  });
  document.getElementById('btnDownloadPDF')?.addEventListener('click', () => {
    if (!lastOutputRaw) return alert('Belum ada output');
    const w = window.open('', '_blank');
    w.document.write(`<html><head><title>AI Output</title><style>body{font-family:sans-serif;padding:24px;line-height:1.7} pre{background:#0f172a;color:#e2e8f0;padding:14px;border-radius:8px;overflow:auto}</style></head><body><h2>Bantuan AI - ${currentRole.toUpperCase()} - SDN 139 LAMANDA</h2><hr><div>${document.getElementById('aiOutput').innerHTML}</div><script>window.print()<\/script></body></html>`);
    w.document.close();
  });
  document.getElementById('btnSaveFirestore')?.addEventListener('click', saveOutputToFirestore);
  document.getElementById('btnSaveProta')?.addEventListener('click', saveToProta);
  document.getElementById('btnRemoveFile')?.addEventListener('click', clearFilePreview);

  // --- TAMBAHAN: CLEAR FILE PREVIEW ---
  function clearFilePreview() {
    currentFileData = null;
    window.lastUploadedImage = null;
    window.lastUploadedVideo = null;
    const previewArea = document.getElementById('previewArea');
    if (previewArea) previewArea.classList.remove('show');
    const btnImage = document.getElementById('btnImage');
    if (btnImage) btnImage.classList.remove('has-file');
    document.getElementById('imageInput').value = '';
    document.getElementById('videoInput').value = '';
    document.getElementById('userInput').placeholder = 'Ketik pertanyaan atau perintah Anda...';
  }
}

// --- HANDLE IMAGE UPLOAD (REVISI: TETAP BISA KETIK TEKS) ---
async function handleImageUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    alert('File bukan gambar.');
    return;
  }
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    alert('Ukuran gambar terlalu besar. Maksimal 5MB.');
    return;
  }

  const base64 = await convertToBase64(file);
  currentFileData = { name: file.name, base64, type: 'image', size: file.size };
  window.lastUploadedImage = base64;

  // Tampilkan preview di atas input (bisa tetap ketik)
  const previewArea = document.getElementById('previewArea');
  const previewImg = document.getElementById('previewImg');
  const previewName = document.getElementById('previewName');
  const previewSize = document.getElementById('previewSize');
  if (previewArea) {
    previewArea.classList.add('show');
    if (previewImg) previewImg.src = base64;
    if (previewName) previewName.textContent = file.name;
    if (previewSize) previewSize.textContent = (file.size / 1024).toFixed(1) + ' KB';
  }
  const btnImage = document.getElementById('btnImage');
  if (btnImage) btnImage.classList.add('has-file');

  // Update placeholder agar user tahu bisa ketik info gambar
  const userInput = document.getElementById('userInput');
  userInput.placeholder = `Gambar "${file.name}" terupload. Ketik info tambahan tentang gambar ini... contoh: "jelaskan soal ini untuk kelas 4"`;
  userInput.focus();

  appendMessage('ai', `📷 Gambar "${file.name}" siap. Silakan ketik pertanyaan/info tentang gambar ini di kolom input, lalu kirim.`);
}

async function handleVideoUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (!file.type.startsWith('video/')) {
    alert('File bukan video.');
    return;
  }
  window.lastUploadedVideo = { name: file.name, size: file.size, type: file.type };
  currentFileData = { name: file.name, base64: null, type: 'video' };
  
  const previewArea = document.getElementById('previewArea');
  if (previewArea) {
    previewArea.classList.add('show');
    document.getElementById('previewName').textContent = file.name;
    document.getElementById('previewSize').textContent = (file.size / 1024 / 1024).toFixed(2) + ' MB (Video)';
  }
  appendMessage('ai', `🎥 Video "${file.name}" diupload. Ketik deskripsi/pertanyaan tentang video ini di kolom input.`);
}

async function sendLinkAnalysis() {
  const urlInput = document.getElementById('urlInput');
  const url = urlInput?.value.trim();
  if (!url) {
    alert('Masukkan URL/link yang ingin dianalisis');
    return;
  }
  if (!isValidUrl(url)) {
    alert('URL tidak valid. Pastikan dimulai dengan http:// atau https://');
    return;
  }
  document.getElementById('userInput').value = `Analisis link ini dan berikan ringkasan yang bermanfaat untuk ${currentRole}: ${url}`;
  sendMessage();
  if (urlInput) urlInput.value = '';
}

function isValidUrl(string) {
  try { new URL(string); return true; } catch (_) { return false; }
}

function convertToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
}

// --- SEND MESSAGE (REVISI: ROLE + OUTPUT DI BAWAH + VISION) ---
async function sendMessage() {
  const input = document.getElementById('userInput');
  const btnSend = document.getElementById('btnSend');
  let userMessage = input.value.trim();

  if (currentFileData && !userMessage) {
    userMessage = currentFileData.type === 'image' ? 'Analisis gambar yang saya upload ini' : 'Berikan saran untuk video ini';
  }

  if (!userMessage && !window.lastUploadedImage && !window.lastUploadedVideo) return;
  if (apiKeys.length === 0) {
    alert('API Key belum dikonfigurasi. Hubungi Admin.');
    return;
  }

  // Tampilkan pesan user (dengan info file)
  let fullMessageDisplay = userMessage;
  if (currentFileData) fullMessageDisplay += `\n[📎 ${currentFileData.type}: ${currentFileData.name}]`;
  appendMessage('user', fullMessageDisplay);

  input.value = '';
  btnSend.disabled = true;

  const container = document.getElementById('chatContainer');
  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'message ai loading';
  loadingDiv.innerHTML = '<span class="typing-dots">AI sedang berpikir (' + currentRole + ')...</span>';
  container.appendChild(loadingDiv);
  container.scrollTop = container.scrollHeight;

  // System prompt dinamis per role
  const dynamicSystemPrompt = getSystemPromptByRole(currentRole);

  const validMessages = chatHistory.slice(-10).map(msg => ({
    role: msg.role === 'ai' ? 'assistant' : msg.role,
    content: msg.content
  }));

  const messages = [
    { role: 'system', content: dynamicSystemPrompt },
    ...validMessages
  ];

  // Enhanced prompt dengan konteks file
  let enhancedPrompt = userMessage;
  if (currentFileData && currentFileData.type === 'image') {
    enhancedPrompt += `\n\n[User mengupload gambar: ${currentFileData.name}. Analisis gambar tersebut. Info tambahan dari user: ${userMessage}]`;
  }
  if (window.lastUploadedVideo) {
    enhancedPrompt += `\n\n[User mengupload video: ${window.lastUploadedVideo.name}. Berikan saran konstruktif.]`;
  }

  // Jika ada gambar, pakai format vision untuk Groq
  let useVision = !!(currentFileData && currentFileData.type === 'image' && currentFileData.base64);
  let finalMessages;

  if (useVision) {
    finalMessages = [
      { role: 'system', content: dynamicSystemPrompt },
      ...validMessages.slice(-4),
      {
        role: 'user',
        content: [
          { type: 'text', text: enhancedPrompt },
          { type: 'image_url', image_url: { url: currentFileData.base64 } }
        ]
      }
    ];
  } else {
    finalMessages = [...messages.slice(0, -1), { role: 'user', content: enhancedPrompt }];
  }

  let lastError = null;
  let success = false;
  let aiMessage = '';

  for (let attempt = 0; attempt < apiKeys.length; attempt++) {
    const apiKey = getNextApiKey();
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: useVision ? API_MODEL_VISION : API_MODEL,
          messages: useVision ? finalMessages : finalMessages,
          temperature: 0.7,
          max_tokens: 2048
        })
      });

      if (response.ok) {
        const data = await response.json();
        aiMessage = data.choices[0].message.content;
        loadingDiv.remove();
        appendMessage('ai', aiMessage);

        // --- TAMBAHAN: TAMPILKAN OUTPUT DI BAWAH INPUT AREA ---
        lastOutputRaw = aiMessage;
        const outputWrapper = document.getElementById('outputWrapper');
        const aiOutput = document.getElementById('aiOutput');
        if (outputWrapper && aiOutput) {
          aiOutput.innerHTML = formatAIResponse(aiMessage);
          outputWrapper.classList.add('show');
          // Tombol Save ke Prota hanya muncul jika ada JSON TP
          const btnSaveProta = document.getElementById('btnSaveProta');
          if (btnSaveProta) {
            btnSaveProta.style.display = (aiMessage.includes('"elemen"') && aiMessage.includes('"tp"')) ? 'inline-block' : 'none';
          }
          outputWrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        // Reset uploads tapi jangan hapus preview langsung (biar user bisa lihat)
        // window.lastUploadedImage = null; // jangan reset langsung, biar bisa save
        // window.lastUploadedVideo = null;

        logUsage(fullMessageDisplay, aiMessage).catch(err => console.warn('Log usage gagal:', err.message));
        success = true;
        break;
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `HTTP ${response.status}`);
      }
    } catch (error) {
      console.warn(`API Key attempt ${attempt + 1} failed:`, error);
      lastError = error;
    }
  }

  if (!success) {
    loadingDiv.remove();
    let errorMsg = '❌ Maaf, terjadi kesalahan pada semua API Key.';
    if (lastError) {
      if (lastError.message.includes('401')) errorMsg = '❌ Semua API Key tidak valid. Hubungi Admin.';
      else if (lastError.message.includes('429')) errorMsg = '⚠ Semua API Key mencapai batas. Coba lagi nanti.';
      else errorMsg = `❌ Error: ${lastError.message}`;
    }
    appendMessage('ai', errorMsg);
    // Tampilkan error juga di output wrapper
    const outputWrapper = document.getElementById('outputWrapper');
    const aiOutput = document.getElementById('aiOutput');
    if (outputWrapper && aiOutput) {
      aiOutput.innerHTML = `<span style="color:#ef4444;">${errorMsg}</span>`;
      outputWrapper.classList.add('show');
    }
  }

  btnSend.disabled = false;
  input.focus();
  // Jangan clear file otomatis, biarkan user hapus manual via tombol X (sesuai request tetap bisa ketik)
}

function appendMessage(role, text) {
  chatHistory.push({ role, content: text });
  saveChatHistory();
  renderChatHistory();
}

function saveChatHistory() {
  if (chatHistory.length > 50) chatHistory = chatHistory.slice(-50);
  localStorage.setItem(STORAGE_KEY_CHAT, JSON.stringify(chatHistory));
}

function renderChatHistory() {
  const container = document.getElementById('chatContainer');
  if (!container) return;
  if (chatHistory.length === 0) {
    container.innerHTML = `<div class="message ai">Halo, saya asisten AI. Mode <b>${currentRole}</b> aktif.<br>• Ketik teks<br>• 📷 Upload gambar (tetap bisa ketik info gambar)<br>• 🔗 Paste link<br>• 🎤 Voice</div>`;
    return;
  }
  container.innerHTML = chatHistory.map(msg => {
    const formattedContent = formatAIResponse(msg.content);
    return `<div class="message ${msg.role}">${formattedContent}</div>`;
  }).join('');
  container.scrollTop = container.scrollHeight;
}

function formatAIResponse(text) {
  return text
    .replace(/```json([\s\S]*?)```/g, '<pre>$1</pre>')
    .replace(/```([\s\S]*?)```/g, '<pre>$1</pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>');
}

// --- TAMBAHAN: SAVE OUTPUT KE FIRESTORE ---
async function saveOutputToFirestore() {
  if (!lastOutputRaw) return alert('Belum ada output untuk disimpan');
  const saveStatus = document.getElementById('saveStatus');
  if (saveStatus) saveStatus.textContent = '⏳ Menyimpan ke Firestore...';
  try {
    await addDoc(collection(db, 'bantuan_ai_logs'), {
      userId: currentUser.uid,
      userEmail: currentUser.email || 'unknown',
      userName: currentUser.nama || currentUser.displayName || 'User',
      role: currentRole,
      question: document.getElementById('userInput')?.value?.substring(0, 500) || 'file upload',
      fileName: currentFileData?.name || null,
      response: lastOutputRaw,
      timestamp: serverTimestamp()
    });
    if (saveStatus) saveStatus.innerHTML = '✅ <b>Berhasil disimpan ke Firestore: bantuan_ai_logs (role: ' + currentRole + ')</b>';
    // backup local
    const logs = JSON.parse(localStorage.getItem('ai_logs') || '[]');
    logs.push({ role: currentRole, response: lastOutputRaw, createdAt: new Date().toISOString() });
    localStorage.setItem('ai_logs', JSON.stringify(logs));
  } catch (e) {
    console.error(e);
    if (saveStatus) saveStatus.innerHTML = `❌ Gagal simpan: ${e.message}`;
  }
}

function saveToProta() {
  try {
    const match = lastOutputRaw.match(/\[([\s\S]*?"elemen"[\s\S]*?)\]/);
    if (!match) return alert('Tidak ada JSON TP/ATP ditemukan di output');
    const json = JSON.parse(match[0]);
    localStorage.setItem('cp_tp_atp', JSON.stringify(json));
    alert(`✅ ${json.length} TP berhasil disimpan ke Prota! Buka menu Program Tahunan > Tarik Data TP/ATP`);
  } catch (e) {
    alert('Gagal parse JSON TP: ' + e.message);
  }
}

async function logUsage(question, answer) {
  try {
    await addDoc(collection(db, 'ai_usage_logs'), {
      userId: currentUser.uid,
      userEmail: currentUser.email || 'unknown',
      role: currentRole,
      question: question.substring(0, 200),
      answerLength: answer.length,
      timestamp: serverTimestamp()
    });
  } catch (error) {
    console.warn('Gagal log penggunaan AI:', error);
    throw error;
  }
}
