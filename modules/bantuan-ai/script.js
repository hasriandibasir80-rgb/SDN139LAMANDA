// =========================================
// MODUL: BANTUAN AI
// =========================================

import { db } from '../../js/firebase-config.js';
import { collection, addDoc, serverTimestamp } 
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
if (!currentUser.uid) {
  alert('Sesi berakhir. Silakan login kembali.');
  window.location.href = '../../index.html';
}

// Konfigurasi API (disamarkan)
const API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const API_MODEL = 'llama-3.3-70b-versatile';
const STORAGE_KEY_API = 'ai_api_key';
const STORAGE_KEY_CHAT = 'ai_chat_history';

let apiKey = localStorage.getItem(STORAGE_KEY_API) || '';
let chatHistory = JSON.parse(localStorage.getItem(STORAGE_KEY_CHAT) || '[]');

const SYSTEM_PROMPT = `Anda adalah asisten AI yang membantu guru-guru di SDN 139 LAMANDA. 
Anda ahli dalam pembuatan modul ajar, soal evaluasi, ide P5, dan administrasi pembelajaran.
Berikan jawaban yang praktis, sesuai konteks SD di Indonesia, dan terstruktur rapi.`;

document.addEventListener('DOMContentLoaded', () => {
  checkApiKey();
  renderChatHistory();
  attachEventListeners();
});

function checkApiKey() {
  const setupBox = document.getElementById('apiKeySetup');
  if (!apiKey) {
    setupBox.style.display = 'block';
  } else {
    setupBox.style.display = 'none';
  }
}

function attachEventListeners() {
  document.getElementById('btnSaveApiKey')?.addEventListener('click', saveApiKey);
  document.getElementById('btnSkipSetup')?.addEventListener('click', () => {
    document.getElementById('apiKeySetup').style.display = 'none';
  });
  document.getElementById('btnChangeApiKey')?.addEventListener('click', () => {
    const newKey = prompt('Masukkan API Key baru:', apiKey);
    if (newKey && newKey.trim()) {
      apiKey = newKey.trim();
      localStorage.setItem(STORAGE_KEY_API, apiKey);
      alert('✅ API Key berhasil diperbarui!');
      checkApiKey();
    }
  });
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
  document.querySelectorAll('.prompt-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const prompt = chip.getAttribute('data-prompt');
      document.getElementById('userInput').value = prompt;
      sendMessage();
    });
  });
}

function saveApiKey() {
  const input = document.getElementById('apiKeyInput');
  const key = input.value.trim();
  
  if (!key) {
    alert('⚠️ API Key tidak boleh kosong!');
    return;
  }
  
  apiKey = key;
  localStorage.setItem(STORAGE_KEY_API, apiKey);
  document.getElementById('apiKeySetup').style.display = 'none';
  alert('✅ API Key berhasil disimpan!');
}

function renderChatHistory() {
  const container = document.getElementById('chatContainer');
  
  if (chatHistory.length === 0) {
    container.innerHTML = `
      <div class="message ai">
        👋 Halo! Saya asisten AI untuk guru SDN 139 LAMANDA. 
        Saya bisa membantu Anda membuat modul ajar, soal evaluasi, ide P5, dan banyak lagi. 
        Silakan tanyakan apa saja!
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

async function sendMessage() {
  const input = document.getElementById('userInput');
  const btnSend = document.getElementById('btnSend');
  const userMessage = input.value.trim();
  
  if (!userMessage) return;
  
  if (!apiKey) {
    alert('⚠️ API Key belum diset!');
    document.getElementById('apiKeySetup').style.display = 'block';
    return;
  }
  
  chatHistory.push({ role: 'user', content: userMessage });
  saveChatHistory();
  renderChatHistory();
  
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
    
    chatHistory.push({ role: 'ai', content: aiMessage });
    saveChatHistory();
    renderChatHistory();
    
    logUsage(userMessage, aiMessage);
    
  } catch (error) {
    console.error('API Error:', error);
    loadingDiv.remove();
    
    let errorMsg = '❌ Maaf, terjadi kesalahan: ' + error.message;
    if (error.message.includes('401')) {
      errorMsg = '❌ API Key tidak valid.';
    } else if (error.message.includes('429')) {
      errorMsg = '⚠️ Batas permintaan tercapai. Silakan coba lagi nanti.';
    }
    
    chatHistory.push({ role: 'ai', content: errorMsg });
    saveChatHistory();
    renderChatHistory();
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
