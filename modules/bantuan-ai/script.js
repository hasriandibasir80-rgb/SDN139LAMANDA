// =========================================
// MODUL: BANTUAN AI (AUTO CONNECT FIRESTORE)
// =========================================

import { db } from '../../js/firebase-config.js';
import { collection, doc, getDoc, serverTimestamp, addDoc } 
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
if (!currentUser.uid) {
  alert('Sesi berakhir. Silakan login kembali.');
  window.location.href = '../../index.html';
}

// Konfigurasi API (disamarkan)
const API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const API_MODEL = 'llama-3.3-70b-versatile';
const STORAGE_KEY_CHAT = 'ai_chat_history';

let apiKey = ''; // Akan diisi otomatis dari Firestore
let chatHistory = JSON.parse(localStorage.getItem(STORAGE_KEY_CHAT) || '[]');

const SYSTEM_PROMPT = `Anda adalah asisten AI yang membantu guru-guru di SDN 139 LAMANDA. 
Anda ahli dalam pembuatan modul ajar, soal evaluasi, ide P5, dan administrasi pembelajaran.
Berikan jawaban yang praktis, sesuai konteks SD di Indonesia, dan terstruktur rapi.`;

document.addEventListener('DOMContentLoaded', () => {
  loadApiKeyAutomatically();
  renderChatHistory();
  attachEventListeners();
});

// ✅ FUNGSI BARU: Load API Key otomatis dari Firestore
async function loadApiKeyAutomatically() {
  const container = document.getElementById('chatContainer');
  
  try {
    // Membaca dari collection 'system_config', document 'ai_api_key'
    const docRef = doc(db, 'system_config', 'ai_api_key');
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      apiKey = docSnap.data().key;
      console.log('✅ API Key berhasil dimuat dari Firestore');
    } else {
      console.warn('⚠️ Dokumen API Key tidak ditemukan di Firestore');
      appendMessage('ai', '⚠️ Sistem AI belum dikonfigurasi oleh Admin. Silakan hubungi administrator.');
    }
  } catch (error) {
    console.error('❌ Gagal memuat API Key:', error);
    appendMessage('ai', '❌ Terjadi kesalahan koneksi ke database. Silakan refresh halaman.');
  }
}

function attachEventListeners() {
  // Tombol Hapus Chat
  document.getElementById('btnClearChat')?.addEventListener('click', () => {
    if (confirm('Hapus semua riwayat chat?')) {
      chatHistory = [];
      localStorage.removeItem(STORAGE_KEY_CHAT);
      renderChatHistory();
    }
  });

  // Tombol Kirim
  document.getElementById('btnSend')?.addEventListener('click', sendMessage);
  
  // Enter untuk kirim
  document.getElementById('userInput')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
}

function renderChatHistory() {
  const container = document.getElementById('chatContainer');
  
  if (chatHistory.length === 0) {
    container.innerHTML = `
      <div class="message ai">
        Halo, saya asisten AI. silahkan beri perintah atau pertanyaan
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

// Helper untuk menambah pesan baru ke UI dan History
function appendMessage(role, text) {
  chatHistory.push({ role, content: text });
  saveChatHistory();
  renderChatHistory();
}

function formatAIResponse(text) {
  return text
    .replace(/```([\s\S]*?)```/g, '<pre>$1</pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>');
}

async function sendMessage() {
  const input = document.getElementById('userInput');
  const btnSend = document.getElementById('btnSend');
  const userMessage = input.value.trim();
  
  if (!userMessage) return;
  
  // Cek apakah API Key sudah dimuat
  if (!apiKey) {
    alert('⚠️ API Key belum dikonfigurasi di sistem. Hubungi Admin.');
    return;
  }
  
  appendMessage('user', userMessage);
  input.value = '';
  btnSend.disabled = true;
  
  const container = document.getElementById('chatContainer');
  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'message ai loading';
  loadingDiv.innerHTML = '<span class="typing-dots">AI sedang berpikir</span>';
  container.appendChild(loadingDiv);
  container.scrollTop = container.scrollHeight;
  
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: API_MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...chatHistory
        ],
        temperature: 0.7,
        max_tokens: 2048
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `HTTP ${response.status}`);
    }
    
    const data = await response.json();
    const aiMessage = data.choices[0].message.content;
    
    loadingDiv.remove();
    appendMessage('ai', aiMessage);
    
    logUsage(userMessage, aiMessage);
    
  } catch (error) {
    console.error('API Error:', error);
    loadingDiv.remove();
    
    let errorMsg = '❌ Maaf, terjadi kesalahan: ' + error.message;
    if (error.message.includes('401')) {
      errorMsg = ' API Key tidak valid atau kadaluarsa. Silakan hubungi Admin.';
    } else if (error.message.includes('429')) {
      errorMsg = '⚠️ Batas permintaan AI tercapai. Silakan coba lagi beberapa saat.';
    }
    
    appendMessage('ai', errorMsg);
  } finally {
    btnSend.disabled = false;
    input.focus();
  }
}

function saveChatHistory() {
  if (chatHistory.length > 50) {
    chatHistory = chatHistory.slice(-50);
  }
  localStorage.setItem(STORAGE_KEY_CHAT, JSON.stringify(chatHistory));
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
  }
}
