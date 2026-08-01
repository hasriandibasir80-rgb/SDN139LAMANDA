// modules/bantuan-ai/script.js - FIX MODEL VISION
// FIX: Ganti model vision yang error menjadi model yang tersedia di semua akun Groq

import { db } from '../../js/firebase-config.js';
import { doc, getDoc, collection, addDoc, serverTimestamp } 
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
if (!currentUser.uid) {
  alert('Sesi berakhir. Silakan login kembali.');
  window.location.href = '../../index.html';
}

const API_URL = 'https://api.groq.com/openai/v1/chat/completions';
// FIX: Model yang tersedia di semua akun Groq
const API_MODEL = 'llama-3.3-70b-versatile';
const API_MODEL_VISION_PRIMARY = 'llama-3.2-11b-vision-preview'; // FIX UTAMA - ini yang pasti jalan
const API_MODEL_VISION_FALLBACK = 'llama-3.2-90b-vision-preview'; // cadangan
const API_MODEL_VISION_L4 = 'meta-llama/llama-4-scout-17b-16e-instruct'; // coba terakhir jika akun sudah support

const STORAGE_KEY_CHAT = 'ai_chat_history';

let apiKeys = [];
let currentKeyIndex = 0;
let chatHistory = JSON.parse(localStorage.getItem(STORAGE_KEY_CHAT) || '[]');
let recognition = null;
let isListening = false;
let currentRole = localStorage.getItem('ai_role') || detectRole();
let currentFileData = null;
let lastOutputRaw = '';
const $ = (id) => document.getElementById(id);

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
    return `${base} Peran: Membantu Guru/Admin SD. Keahlian: Modul ajar, Prota, Promes, soal, P5. Gaya: Praktis, terstruktur, Kurikulum Merdeka. Jika hasilkan TP/ATP, akhiri JSON: [{"elemen":"Bilangan","tp":"...","jp":8,"semester":1,"mapel":"Matematika"}]`;
  }
  if (role === 'siswa') return `${base} Peran: Tutor SD Fase A-C. Gaya: Sederhana, menyenangkan, 3 langkah, akhiri 1 latihan.`;
  return `${base} Peran: Pendamping Orang Tua. Gaya: Empatik, santai, tips praktis di rumah.`;
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

document.addEventListener('DOMContentLoaded', () => {
  initializeSpeechRecognition();
  loadApiKeys();
  renderChatHistory();
  attachEventListeners();
  setRoleUI(currentRole);
});

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
    recognition.onerror = () => { isListening = false; updateVoiceButton(); };
    recognition.onend = () => { isListening = false; updateVoiceButton(); };
  }
}

function toggleVoiceInput() {
  if (!recognition) return alert('Fitur voice tidak didukung');
  if (isListening) { recognition.stop(); isListening = false; }
  else { recognition.start(); isListening = true; appendMessage('ai', '🎤 Mendengarkan...'); }
  updateVoiceButton();
}

function updateVoiceButton() {
  const btnVoice = $('btnVoice');
  if (!btnVoice) return;
  btnVoice.innerHTML = isListening ? '⏹ Stop' : '🎤 Suara';
  btnVoice.classList.toggle('listening', isListening);
}

async function loadApiKeys() {
  try {
    const docRef = doc(db, 'settings', 'api_key');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data.keys) {
        apiKeys = Object.values(data.keys).filter(k => k.active === true).map(k => k.value);
        console.log(`✅ Loaded ${apiKeys.length} API keys`);
        if (apiKeys.length === 0) appendMessage('ai', '⚠ Tidak ada API Key aktif.');
      }
    } else {
      appendMessage('ai', '⚠ Dokumen API Key tidak ditemukan.');
    }
  } catch (error) {
    console.error('Error loading API keys:', error);
    appendMessage('ai', '❌ Gagal memuat API Key.');
  }
}

function getNextApiKey() {
  if (apiKeys.length === 0) return null;
  const key = apiKeys[currentKeyIndex];
  currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
  return key;
}

function attachEventListeners() {
  $('btnClearChat')?.addEventListener('click', () => {
    if (confirm('Hapus semua riwayat chat?')) {
      chatHistory = []; localStorage.removeItem(STORAGE_KEY_CHAT);
      renderChatHistory();
      $('outputWrapper')?.classList.remove('show');
      lastOutputRaw = '';
    }
  });
  $('btnSend')?.addEventListener('click', sendMessage);
  $('userInput')?.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } });
  $('btnVoice')?.addEventListener('click', toggleVoiceInput);
  $('imageInput')?.addEventListener('change', handleImageUpload);
  $('btnSendLink')?.addEventListener('click', sendLinkAnalysis);
  $('videoInput')?.addEventListener('change', handleVideoUpload);
  document.querySelectorAll('.role-btn').forEach(btn => btn.addEventListener('click', () => setRoleUI(btn.dataset.role)));
  $('btnCopy')?.addEventListener('click', () => { if(!lastOutputRaw) return alert('Belum ada output'); navigator.clipboard.writeText(lastOutputRaw); alert('✅ Disalin'); });
  $('btnDownload')?.addEventListener('click', () => {
    if(!lastOutputRaw) return alert('Belum ada output');
    const blob=new Blob([lastOutputRaw],{type:'text/plain'}); const url=URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=url; a.download=`AI-${currentRole}-${Date.now()}.txt`; a.click(); URL.revokeObjectURL(url);
  });
  $('btnDownloadPDF')?.addEventListener('click', () => {
    if(!lastOutputRaw) return alert('Belum ada output');
    const w=window.open('','_blank'); w.document.write(`<html><head><title>AI Output</title><style>body{font-family:sans-serif;padding:24px;line-height:1.7} pre{background:#0f172a;color:#e2e8f0;padding:14px;border-radius:8px}</style></head><body><h2>Bantuan AI - ${currentRole}</h2><div>${$('aiOutput').innerHTML}</div><script>window.print()<\/script></body></html>`); w.document.close();
  });
  $('btnSaveFirestore')?.addEventListener('click', saveOutputToFirestore);
  $('btnSaveProta')?.addEventListener('click', saveToProta);
  $('btnRemoveFile')?.addEventListener('click', clearFilePreview);
}

async function handleImageUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) return alert('File bukan gambar.');
  if (file.size > 5 * 1024 * 1024) return alert('Maksimal 5MB.');

  const base64 = await convertToBase64(file);
  currentFileData = { name: file.name, base64, type: 'image', size: file.size };
  window.lastUploadedImage = base64;

  const previewArea = $('previewArea');
  if (previewArea) {
    previewArea.classList.add('show');
    $('previewImg').src = base64;
    $('previewName').textContent = file.name;
    $('previewSize').textContent = (file.size/1024).toFixed(1)+' KB';
  }
  $('btnImage')?.classList.add('has-file');
  const userInput = $('userInput');
  userInput.placeholder = `Gambar "${file.name}" terupload. Ketik info tambahan...`;
  userInput.focus();
  appendMessage('ai', `📷 Gambar "${file.name}" siap. Silakan ketik pertanyaan/info tentang gambar ini, lalu kirim.`);
}

async function handleVideoUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  window.lastUploadedVideo = { name: file.name, size: file.size, type: file.type };
  currentFileData = { name: file.name, type: 'video' };
  const previewArea = $('previewArea');
  if (previewArea) {
    previewArea.classList.add('show');
    $('previewName').textContent = file.name;
    $('previewSize').textContent = (file.size/1024/1024).toFixed(2)+' MB (Video)';
  }
  appendMessage('ai', `🎥 Video "${file.name}" diupload. Ketik deskripsi/pertanyaan tentang video ini.`);
}

function clearFilePreview() {
  currentFileData = null;
  window.lastUploadedImage = null;
  window.lastUploadedVideo = null;
  $('previewArea')?.classList.remove('show');
  $('btnImage')?.classList.remove('has-file');
  $('imageInput').value = '';
  $('videoInput').value = '';
  $('userInput').placeholder = 'Ketik pertanyaan atau perintah Anda...';
}

async function sendLinkAnalysis() {
  const urlInput = $('urlInput');
  const url = urlInput?.value.trim();
  if (!url) return alert('Masukkan URL');
  try { new URL(url); } catch { return alert('URL tidak valid'); }
  $('userInput').value = `Analisis link ini dan ringkas untuk ${currentRole}: ${url}`;
  sendMessage();
  urlInput.value = '';
}

function convertToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
}

// FIX UTAMA: SEND MESSAGE DENGAN FALLBACK MODEL VISION
async function sendMessage() {
  const input = $('userInput');
  const btnSend = $('btnSend');
  let userMessage = input.value.trim();

  if (currentFileData && !userMessage) {
    userMessage = currentFileData.type === 'image' ? 'Analisis gambar yang saya upload ini. Berapa orang yang ada dalam gambar dan jelaskan.' : 'Berikan saran untuk video ini';
  }

  if (!userMessage && !window.lastUploadedImage && !window.lastUploadedVideo) return;
  if (apiKeys.length === 0) return alert('API Key belum dikonfigurasi.');

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

  const dynamicSystemPrompt = getSystemPromptByRole(currentRole);
  const validMessages = chatHistory.slice(-10).map(m => ({ role: m.role === 'ai' ? 'assistant' : m.role, content: m.content }));
  let enhancedPrompt = userMessage;
  if (currentFileData?.type === 'image') enhancedPrompt += `\n\n[User mengupload gambar: ${currentFileData.name}. Info tambahan: ${userMessage}]`;
  if (window.lastUploadedVideo) enhancedPrompt += `\n\n[User upload video: ${window.lastUploadedVideo.name}]`;

  let useVision = !!(currentFileData && currentFileData.type === 'image' && currentFileData.base64);
  let finalMessagesVision = [
    { role: 'system', content: dynamicSystemPrompt },
    ...validMessages.slice(-4),
    { role: 'user', content: [{ type: 'text', text: enhancedPrompt }, { type: 'image_url', image_url: { url: currentFileData.base64 } }] }
  ];
  let finalMessagesText = [
    { role: 'system', content: dynamicSystemPrompt },
    ...validMessages,
    { role: 'user', content: enhancedPrompt }
  ];

  let lastError = null;
  let success = false;
  let aiMessage = '';

  // Daftar model yang akan dicoba berurutan (vision dulu, lalu text fallback)
  const modelsToTry = useVision ? [API_MODEL_VISION_PRIMARY, API_MODEL_VISION_FALLBACK, API_MODEL_VISION_L4] : [API_MODEL];

  for (let attempt = 0; attempt < apiKeys.length && !success; attempt++) {
    const apiKey = getNextApiKey();
    
    for (const modelName of modelsToTry) {
      try {
        console.log(`🔄 Mencoba model: ${modelName} dengan key index ${currentKeyIndex}`);
        const response = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: modelName,
            messages: useVision ? finalMessagesVision : finalMessagesText,
            temperature: 0.7,
            max_tokens: 2048
          })
        });

        if (response.ok) {
          const data = await response.json();
          aiMessage = data.choices[0].message.content;
          loadingDiv.remove();
          appendMessage('ai', aiMessage);

          lastOutputRaw = aiMessage;
          const outputWrapper = $('outputWrapper');
          const aiOutput = $('aiOutput');
          if (outputWrapper && aiOutput) {
            aiOutput.innerHTML = formatAIResponse(aiMessage);
            outputWrapper.classList.add('show');
            $('btnSaveProta').style.display = (aiMessage.includes('"elemen"') && aiMessage.includes('"tp"')) ? 'inline-block' : 'none';
            outputWrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
          logUsage(fullMessageDisplay, aiMessage).catch(()=>{});
          success = true;
          break; // keluar dari loop model
        } else {
          const errorData = await response.json();
          const msg = errorData.error?.message || `HTTP ${response.status}`;
          // Jika error model tidak ada, coba model berikutnya
          if (msg.includes('does not exist') || msg.includes('model')) {
            console.warn(`Model ${modelName} gagal: ${msg} -> coba model berikutnya`);
            lastError = new Error(msg);
            continue; // coba model lain
          } else {
            throw new Error(msg);
          }
        }
      } catch (error) {
        console.warn(`Attempt failed model ${modelName}:`, error);
        lastError = error;
        // Jika error model, lanjut ke model berikutnya, jika error key, lanjut ke key berikutnya
        if (error.message.includes('does not exist') || error.message.includes('model')) {
          continue;
        } else {
          break; // error bukan model, ganti API key
        }
      }
    }
  }

  if (!success) {
    loadingDiv.remove();
    let errorMsg = '❌ Maaf, terjadi kesalahan pada semua API Key.';
    if (lastError) {
      if (lastError.message.includes('401')) errorMsg = '❌ Semua API Key tidak valid.';
      else if (lastError.message.includes('429')) errorMsg = '⚠ Batas permintaan tercapai.';
      else errorMsg = `❌ Error: ${lastError.message}`;
    }
    appendMessage('ai', errorMsg);
    const outputWrapper = $('outputWrapper');
    const aiOutput = $('aiOutput');
    if (outputWrapper && aiOutput) {
      aiOutput.innerHTML = `<span style="color:#ef4444;">${errorMsg}<br><br>Model yang dicoba: ${modelsToTry.join(', ')}</span>`;
      outputWrapper.classList.add('show');
    }
  }

  btnSend.disabled = false;
  input.focus();
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
  const container = $('chatContainer');
  if (!container) return;
  if (chatHistory.length === 0) {
    container.innerHTML = `<div class="message ai">Halo, mode <b>${currentRole}</b> aktif.<br>• Ketik teks<br>• 📷 Upload gambar (tetap bisa ketik info)<br>• 🔗 Paste link<br>• 🎤 Voice</div>`;
    return;
  }
  container.innerHTML = chatHistory.map(msg => `<div class="message ${msg.role}">${formatAIResponse(msg.content)}</div>`).join('');
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

async function saveOutputToFirestore() {
  if (!lastOutputRaw) return alert('Belum ada output');
  const saveStatus = $('saveStatus');
  if (saveStatus) saveStatus.textContent = '⏳ Menyimpan...';
  try {
    await addDoc(collection(db, 'bantuan_ai_logs'), {
      userId: currentUser.uid,
      userEmail: currentUser.email || 'unknown',
      userName: currentUser.nama || currentUser.displayName || 'User',
      role: currentRole,
      question: $('userInput')?.value?.substring(0,500) || 'file upload',
      fileName: currentFileData?.name || null,
      response: lastOutputRaw,
      timestamp: serverTimestamp()
    });
    if (saveStatus) saveStatus.innerHTML = '✅ Berhasil disimpan ke bantuan_ai_logs (role: '+currentRole+')';
  } catch (e) {
    if (saveStatus) saveStatus.innerHTML = `❌ Gagal: ${e.message}`;
  }
}

function saveToProta() {
  try {
    const match = lastOutputRaw.match(/\[([\s\S]*?"elemen"[\s\S]*?)\]/);
    if (!match) return alert('Tidak ada JSON TP');
    const json = JSON.parse(match[0]);
    localStorage.setItem('cp_tp_atp', JSON.stringify(json));
    alert(`✅ ${json.length} TP disimpan ke Prota!`);
  } catch (e) { alert('Gagal parse: '+e.message); }
}

async function logUsage(question, answer) {
  try {
    await addDoc(collection(db, 'ai_usage_logs'), {
      userId: currentUser.uid,
      userEmail: currentUser.email || 'unknown',
      role: currentRole,
      question: question.substring(0,200),
      answerLength: answer.length,
      timestamp: serverTimestamp()
    });
  } catch {}
}
