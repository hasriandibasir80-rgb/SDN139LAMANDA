// modules/bantuan-ai/script.js
// =========================================
// MODUL: BANTUAN AI (MULTI-API KEY SUPPORT)
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

let apiKeys = []; // Array untuk menyimpan multiple keys
let currentKeyIndex = 0;
let chatHistory = JSON.parse(localStorage.getItem(STORAGE_KEY_CHAT) || '[]');

const SYSTEM_PROMPT = `Anda adalah asisten AI yang membantu guru-guru di SDN 139 LAMANDA. 
Anda ahli dalam pembuatan modul ajar, soal evaluasi, ide P5, dan administrasi pembelajaran.
Berikan jawaban yang praktis, sesuai konteks SD di Indonesia, dan terstruktur rapi.`;

document.addEventListener('DOMContentLoaded', () => {
  loadApiKeys();
  renderChatHistory();
  attachEventListeners();
});

// ✅ LOAD MULTI-API KEYS DARI FIRESTORE
async function loadApiKeys() {
  try {
    const docRef = doc(db, 'settings', 'api_key');
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      
      if (data.keys) {
        // Ambil semua key yang active
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

// ✅ GET NEXT AVAILABLE KEY (dengan fallback)
function getNextApiKey() {
  if (apiKeys.length === 0) return null;
  
  const key = apiKeys[currentKeyIndex];
  currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length; // Round-robin
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
  
  if (apiKeys.length === 0) {
    alert('⚠️ API Key belum dikonfigurasi. Hubungi Admin.');
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
  
  // ✅ TRY MULTIPLE KEYS (dengan fallback)
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
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            ...chatHistory
          ],
          temperature: 0.7,
          max_tokens: 2048
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        const aiMessage = data.choices[0].message.content;
        
        loadingDiv.remove();
        appendMessage('ai', aiMessage);
        await logUsage(userMessage, aiMessage);
        
        success = true;
        break; // Success, exit loop
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `HTTP ${response.status}`);
      }
    } catch (error) {
      console.warn(`API Key attempt failed:`, error);
      lastError = error;
      
      // Continue to next key
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
