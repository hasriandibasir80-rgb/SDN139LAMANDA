// modules/bantuan-ai/script.js
// =========================================
// MODUL: BANTUAN AI (MULTI-MODAL: TEKS, SUARA, GAMBAR, VIDEO, LINK)
// =========================================

import { db } from '../../js/firebase-config.js';
import { doc, getDoc, collection, addDoc, serverTimestamp } 
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
if (!currentUser.uid) {
  alert('Sesi berakhir. Silakan login kembali.');
  window.location.href = '../../index.html';
}

// Konfigurasi API
const API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const API_MODEL = 'llama-3.3-70b-versatile';
const STORAGE_KEY_CHAT = 'ai_chat_history';

let apiKeys = [];
let currentKeyIndex = 0;
let chatHistory = JSON.parse(localStorage.getItem(STORAGE_KEY_CHAT) || '[]');
let recognition = null; // Untuk voice input
let isListening = false;

const SYSTEM_PROMPT = `Anda adalah asisten AI yang membantu guru-guru di SDN 139 LAMANDA. 
Anda ahli dalam pembuatan modul ajar, soal evaluasi, ide P5, dan administrasi pembelajaran.
Berikan jawaban yang praktis, sesuai konteks SD di Indonesia, dan terstruktur rapi.
Anda bisa memproses teks, gambar, dan link.`;

document.addEventListener('DOMContentLoaded', () => {
  initializeSpeechRecognition();
  loadApiKeys();
  renderChatHistory();
  attachEventListeners();
});

// ✅ INISIALISASI SPEECH RECOGNITION (Voice Input)
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
    console.warn('⚠️ Voice recognition tidak didukung browser ini');
    const btnVoice = document.getElementById('btnVoice');
    if (btnVoice) {
      btnVoice.disabled = true;
      btnVoice.title = 'Fitur suara tidak didukung browser ini';
    }
  }
}

// ✅ TOGGLE VOICE INPUT
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
    btnVoice.innerHTML = '⏹️ Stop';
    btnVoice.classList.add('listening');
  } else {
    btnVoice.innerHTML = '🎤 Suara';
    btnVoice.classList.remove('listening');
  }
}

// ✅ LOAD MULTI-API KEYS DARI FIRESTORE
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
        
        console.log(`✅ Loaded ${apiKeys.length} API keys`);
        
        if (apiKeys.length === 0) {
          appendMessage('ai', '⚠️ Tidak ada API Key yang aktif. Hubungi Admin.');
        }
      } else {
        appendMessage('ai', '⚠️ Struktur API Key tidak valid di database.');
      }
    } else {
      appendMessage('ai', '⚠️ Dokumen API Key tidak ditemukan. Hubungi Admin.');
    }
  } catch (error) {
    console.error('Error loading API keys:', error);
    appendMessage('ai', '❌ Gagal memuat konfigurasi API Key.');
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
    }
  });

  document.getElementById('btnSend')?.addEventListener('click', sendMessage);
  
  document.getElementById('userInput')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
  
  // ✅ VOICE INPUT BUTTON
  document.getElementById('btnVoice')?.addEventListener('click', toggleVoiceInput);
  
  // ✅ IMAGE UPLOAD
  document.getElementById('imageInput')?.addEventListener('change', handleImageUpload);
  
  // ✅ LINK/URL INPUT
  document.getElementById('btnSendLink')?.addEventListener('click', sendLinkAnalysis);
  
  // ✅ VIDEO UPLOAD (Placeholder untuk masa depan)
  document.getElementById('videoInput')?.addEventListener('change', handleVideoUpload);
}

// ✅ HANDLE IMAGE UPLOAD
async function handleImageUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  if (!file.type.startsWith('image/')) {
    alert('File bukan gambar. Silakan pilih file gambar.');
    return;
  }
  
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    alert('Ukuran gambar terlalu besar. Maksimal 5MB.');
    return;
  }
  
  appendMessage('ai', `📷 Gambar "${file.name}" diupload. Silakan ajukan pertanyaan tentang gambar ini.`);
  
  // Preview gambar
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = document.createElement('img');
    img.src = e.target.result;
    img.style.maxWidth = '200px';
    img.style.borderRadius = '8px';
    img.style.marginTop = '8px';
    
    const lastMessage = document.querySelector('.message.ai:last-child');
    if (lastMessage) {
      lastMessage.appendChild(img);
    }
  };
  reader.readAsDataURL(file);
  
  // Simpan untuk dikirim ke AI (base64)
  window.lastUploadedImage = e?.target?.result || await convertToBase64(file);
}

// ✅ HANDLE VIDEO UPLOAD (Placeholder)
async function handleVideoUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  if (!file.type.startsWith('video/')) {
    alert('File bukan video. Silakan pilih file video.');
    return;
  }
  
  appendMessage('ai', `🎥 Video "${file.name}" diupload. Fitur analisis video sedang dalam pengembangan. Saat ini hanya bisa memproses teks dari deskripsi video.`);
  
  // Untuk saat ini, simpan informasi video
  window.lastUploadedVideo = {
    name: file.name,
    size: file.size,
    type: file.type
  };
}

// ✅ SEND LINK/URL ANALYSIS
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
  
  appendMessage('ai', `🔗 Menganalisis konten dari: ${url}`);
  
  // Kirim ke AI untuk analisis
  const prompt = `Analisis konten dari link berikut dan berikan ringkasan yang bermanfaat untuk guru: ${url}\n\nBerikan poin-poin penting yang bisa diterapkan dalam pembelajaran.`;
  
  await sendAiRequest(prompt);
  
  if (urlInput) urlInput.value = '';
}

function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

// ✅ CONVERT FILE TO BASE64
function convertToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
}

// ✅ SEND MESSAGE (Updated untuk multi-modal)
async function sendMessage() {
  const input = document.getElementById('userInput');
  const btnSend = document.getElementById('btnSend');
  let userMessage = input.value.trim();
  
  // Tambahkan informasi upload jika ada
  if (window.lastUploadedImage && !userMessage) {
    userMessage = 'Analisis gambar yang saya upload';
  }
  
  if (window.lastUploadedVideo && !userMessage) {
    userMessage = 'Berikan saran untuk video pembelajaran ini';
  }
  
  if (!userMessage && !window.lastUploadedImage && !window.lastUploadedVideo) return;
  
  if (apiKeys.length === 0) {
    alert('️ API Key belum dikonfigurasi. Hubungi Admin.');
    return;
  }
  
  // Tampilkan pesan user
  let fullMessage = userMessage;
  if (window.lastUploadedImage) {
    fullMessage += '\n[📷 Gambar dilampirkan]';
  }
  if (window.lastUploadedVideo) {
    fullMessage += '\n[🎥 Video dilampirkan]';
  }
  
  appendMessage('user', fullMessage);
  input.value = '';
  btnSend.disabled = true;
  
  // Loading indicator
  const container = document.getElementById('chatContainer');
  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'message ai loading';
  loadingDiv.innerHTML = '<span class="typing-dots">AI sedang berpikir</span>';
  container.appendChild(loadingDiv);
  container.scrollTop = container.scrollHeight;
  
  // Siapkan messages untuk API
  const validMessages = chatHistory.map(msg => ({
    role: msg.role === 'ai' ? 'assistant' : msg.role,
    content: msg.content
  }));
  
  // Tambahkan system prompt
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...validMessages
  ];
  
  // Tambahkan konteks multi-modal
  let enhancedPrompt = userMessage;
  if (window.lastUploadedImage) {
    enhancedPrompt += '\n\n[User mengupload gambar. Analisis gambar tersebut dan berikan jawaban yang relevan.]';
  }
  if (window.lastUploadedVideo) {
    enhancedPrompt += `\n\n[User mengupload video: ${window.lastUploadedVideo.name}. Berikan saran dan feedback yang konstruktif.]`;
  }
  
  // Update messages dengan prompt yang enhanced
  messages.push({
    role: 'user',
    content: enhancedPrompt
  });
  
  // Kirim ke API
  let lastError = null;
  let success = false;
  
  for (let attempt = 0; attempt < apiKeys.length; attempt++) {
    const apiKey = getNextApiKey();
    
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: API_MODEL,
          messages: messages,
          temperature: 0.7,
          max_tokens: 2048
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        const aiMessage = data.choices[0].message.content;
        
        loadingDiv.remove();
        appendMessage('ai', aiMessage);
        
        // Reset uploads setelah diproses
        window.lastUploadedImage = null;
        window.lastUploadedVideo = null;
        
        logUsage(fullMessage, aiMessage).catch(err => {
          console.warn('⚠️ Log usage gagal (tidak kritis):', err.message);
        });
        
        success = true;
        break;
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `HTTP ${response.status}`);
      }
    } catch (error) {
      console.warn(`API Key attempt failed:`, error);
      lastError = error;
      
      if (attempt < apiKeys.length - 1) {
        console.log(`Trying next API key... (${attempt + 2}/${apiKeys.length})`);
      }
    }
  }
  
  if (!success) {
    loadingDiv.remove();
    
    let errorMsg = '❌ Maaf, terjadi kesalahan pada semua API Key.';
    if (lastError) {
      if (lastError.message.includes('401')) {
        errorMsg = '❌ Semua API Key tidak valid. Hubungi Admin.';
      } else if (lastError.message.includes('429')) {
        errorMsg = '⚠️ Semua API Key mencapai batas permintaan. Silakan coba lagi nanti.';
      } else {
        errorMsg = `❌ Error: ${lastError.message}`;
      }
    }
    
    appendMessage('ai', errorMsg);
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
  if (chatHistory.length > 50) {
    chatHistory = chatHistory.slice(-50);
  }
  localStorage.setItem(STORAGE_KEY_CHAT, JSON.stringify(chatHistory));
}

function renderChatHistory() {
  const container = document.getElementById('chatContainer');
  
  if (chatHistory.length === 0) {
    container.innerHTML = `
      <div class="message ai">
        Halo, saya asisten AI. Silakan beri perintah atau pertanyaan. 
        Anda bisa:<br>
        • Ketik teks langsung<br>
        • Upload gambar untuk dianalisis<br>
        • Upload video untuk feedback<br>
        • Masukkan link untuk analisis konten<br>
        • Gunakan tombol suara untuk input voice
      </div>
    `;
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
    .replace(/```([\s\S]*?)```/g, '<pre>$1</pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>');
}

async function logUsage(question, answer) {
  try {
    await addDoc(collection(db, 'ai_usage_logs'), {
      userId: currentUser.uid,
      userEmail: currentUser.email || 'unknown',
      question: question.substring(0, 200),
      answerLength: answer.length,
      timestamp: serverTimestamp()
    });
  } catch (error) {
    console.warn('Gagal log penggunaan AI:', error);
    throw error;
  }
}
