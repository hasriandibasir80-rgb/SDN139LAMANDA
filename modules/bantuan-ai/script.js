// modules/bantuan-ai/script.js
// =========================================
// MODUL: BANTUAN AI GLOBAL (ADOPSI DARI cp-tp-atp.js)
// REVISI MULAI DARI NOL - ADOPSI 100% CARA KERJA cp-tp-atp.js
// SASARAN:
// 1. Output di bawah text area input
// 2. Output bisa diunduh (TXT/PDF)
// 3. Tombol Simpan (Firestore) dan Hapus (clear)
// 4. Tetap bisa ketik teks saat upload gambar
// 5. Klasifikasi role Guru/Siswa/Ortu
// =========================================

import { db } from '../../js/firebase-config.js';
import { doc, getDoc, collection, addDoc, serverTimestamp } 
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
if (!currentUser.uid) {
  alert('Sesi berakhir. Silakan login kembali.');
  window.location.href = '../../index.html';
}

// Konfigurasi Groq API - ADOPSI PERSIS DARI cp-tp-atp.js
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL_TEXT = 'llama-3.3-70b-versatile'; // sama seperti GROQ_MODEL di cp-tp-atp.js
const GROQ_VISION_MODELS = [
  'meta-llama/llama-4-maverick-17b-128e-instruct', // terbaru aktif 2026
  'meta-llama/llama-4-scout-17b-16e-instruct',
  'llama-3.2-11b-vision-preview'
];
const GEMINI_MODEL = 'gemini-1.5-flash'; // backup jika Groq vision down

let groqApiKey = null; // ADOPSI: single key seperti cp-tp-atp.js
let geminiApiKey = null; // tambahan untuk backup vision
let lastOutputRaw = '';
let currentFileData = null; // { name, base64, type }
let chatHistory = JSON.parse(localStorage.getItem('ai_chat_history') || '[]');
let currentRole = localStorage.getItem('ai_role') || detectRole();
let recognition = null;
let isListening = false;

const $ = (id) => document.getElementById(id);

// ==================== ADOPSI: loadGroqApiKey PERSIS cp-tp-atp.js ====================
async function loadGroqApiKey() {
  try {
    const docRef = doc(db, 'settings', 'api_key');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      console.log('📄 Firestore settings/api_key:', data);
      if (data.keys) {
        const activeKeys = Object.values(data.keys).filter(k => k.active === true);
        if (activeKeys.length > 0) {
          groqApiKey = activeKeys[0].value; // ADOPSI: ambil yang pertama aktif
          console.log(`✅ Groq Key aktif loaded (dipakai juga di cp-tp-atp.js): ${groqApiKey.substring(0,10)}...`);
        }
      }
      // Tambahan: coba ambil Gemini key dari field yang sama jika ada
      if (data.gemini_keys) {
        const activeGem = Object.values(data.gemini_keys).filter(k => k.active === true);
        if (activeGem.length > 0) geminiApiKey = activeGem[0].value;
      }
      if (data.gemini_api_key && !geminiApiKey) geminiApiKey = data.gemini_api_key;
    }
    // Coba doc terpisah settings/gemini_api_key
    if (!geminiApiKey) {
      try {
        const gSnap = await getDoc(doc(db, 'settings', 'gemini_api_key'));
        if (gSnap.exists()) {
          const d = gSnap.data();
          if (d.value) geminiApiKey = d.value;
          if (d.keys) {
            const gk = Object.values(d.keys).filter(k=>k.active)[0];
            if (gk) geminiApiKey = gk.value;
          }
        }
      } catch {}
    }
    console.log(`✅ Final Keys - Groq: ${groqApiKey ? 'ADA' : 'TIDAK'} | Gemini: ${geminiApiKey ? 'ADA' : 'TIDAK'}`);
  } catch (error) {
    console.error('❌ Error loading API key:', error);
  }
}

function detectRole() {
  try {
    const r = (currentUser.role || currentUser.jabatan || '').toLowerCase();
    if (r.includes('siswa') || r.includes('murid')) return 'siswa';
    if (r.includes('ortu') || r.includes('wali')) return 'ortu';
    return 'guru';
  } catch { return 'guru'; }
}

function getSystemPromptByRole(role) {
  if (role === 'siswa') {
    return `Anda adalah tutor untuk siswa SD Fase A-C. Bahasa sederhana, menyenangkan, langkah demi langkah, emoji secukupnya. Jika ada gambar soal, tuntun cara berpikir, jangan langsung jawaban akhir. Akhiri dengan 1 soal latihan.`;
  }
  if (role === 'ortu') {
    return `Anda adalah pendamping untuk Orang Tua/Wali SD. Bahasa empatik, santai, praktis. Fokus cara mendampingi anak belajar di rumah, motivasi, karakter. Jika ada gambar tugas/rapor, beri apresiasi dulu baru saran.`;
  }
  return `Anda adalah asisten AI yang membantu guru-guru di SDN 139 LAMANDA. Anda ahli dalam pembuatan modul ajar, soal evaluasi, ide P5, dan administrasi pembelajaran. Berikan jawaban yang praktis, sesuai konteks SD di Indonesia, dan terstruktur rapi. Jika menghasilkan TP/ATP, akhiri dengan JSON array: [{"elemen":"Bilangan","tp":"...","jp":8,"semester":1,"mapel":"Matematika"}] agar bisa disimpan ke Prota.`;
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

document.addEventListener('DOMContentLoaded', async () => {
  await loadGroqApiKey(); // ADOPSI: load dulu seperti cp-tp-atp.js
  renderChatHistory();
  attachEventListeners();
  setRoleUI(currentRole);
  initializeSpeechRecognition();
  updateApiStatus();
});

function updateApiStatus() {
  const el = $('apiStatus');
  if (el) {
    const groqStatus = groqApiKey ? '✅ Groq Aktif (sama dengan CP-TP-ATP)' : '❌ Groq Tidak Ada';
    const gemStatus = geminiApiKey ? '✅ Gemini Backup Aktif' : '⚠️ Gemini Belum Ada';
    el.innerHTML = `${groqStatus} | ${gemStatus}`;
  }
}

function initializeSpeechRecognition() {
  if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SR();
    recognition.lang = 'id-ID';
    recognition.onresult = (e) => { $('userInput').value += ( $('userInput').value ? ' ' : '') + e.results[0][0].transcript; };
    recognition.onend = () => { isListening = false; updateVoiceButton(); };
  }
}
function toggleVoiceInput() {
  if (!recognition) return alert('Voice tidak didukung browser');
  if (isListening) { recognition.stop(); isListening = false; }
  else { recognition.start(); isListening = true; }
  updateVoiceButton();
}
function updateVoiceButton() {
  const btn = $('btnVoice');
  if (!btn) return;
  btn.textContent = isListening ? '⏹ Stop' : '🎤 Suara';
  btn.classList.toggle('listening', isListening);
}

function attachEventListeners() {
  $('btnSend')?.addEventListener('click', sendMessage);
  $('userInput')?.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } });
  $('btnVoice')?.addEventListener('click', toggleVoiceInput);
  $('imageInput')?.addEventListener('change', handleImageUpload);
  $('videoInput')?.addEventListener('change', handleVideoUpload);
  $('btnSendLink')?.addEventListener('click', sendLinkAnalysis);
  document.querySelectorAll('.role-btn').forEach(b => b.addEventListener('click', () => setRoleUI(b.dataset.role)));
  
  // SASARAN: Tombol Download, Simpan, Hapus (di bawah output)
  $('btnCopy')?.addEventListener('click', handleCopy);
  $('btnDownload')?.addEventListener('click', handleDownloadTXT);
  $('btnDownloadPDF')?.addEventListener('click', handleDownloadPDF);
  $('btnSaveFirestore')?.addEventListener('click', handleSaveToFirestore);
  $('btnHapusOutput')?.addEventListener('click', handleHapusOutput);
  $('btnClearChat')?.addEventListener('click', handleHapusChat);
  $('btnRemoveFile')?.addEventListener('click', clearFilePreview);
}

async function handleImageUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) return alert('Bukan gambar');
  if (file.size > 5*1024*1024) return alert('Maksimal 5MB');

  const base64 = await convertToBase64(file);
  currentFileData = { name: file.name, base64, type: 'image', size: file.size };
  window.lastUploadedImage = base64;

  // SASARAN: Tetap bisa ketik teks saat upload gambar
  $('previewArea')?.classList.add('show');
  $('previewImg').src = base64;
  $('previewName').textContent = file.name;
  $('previewSize').textContent = (file.size/1024).toFixed(1)+' KB';
  $('btnImage')?.classList.add('has-file');
  $('userInput').placeholder = `Gambar "${file.name}" siap. Ketik info tambahan di sini (contoh: "jelaskan soal ini untuk kelas 4")...`;
  $('userInput').focus();

  appendMessage('ai', `📷 Gambar "${file.name}" siap. Silakan ketik info tambahan di kolom input, lalu kirim.`);
}

async function handleVideoUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  currentFileData = { name: file.name, type: 'video' };
  window.lastUploadedVideo = { name: file.name };
  $('previewArea')?.classList.add('show');
  $('previewName').textContent = file.name;
  $('previewSize').textContent = (file.size/1024/1024).toFixed(2)+' MB (Video)';
  $('userInput').placeholder = `Video "${file.name}" siap. Ketik pertanyaan tentang video ini...`;
  $('userInput').focus();
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
  const url = $('urlInput')?.value.trim();
  if (!url) return alert('Masukkan URL');
  try { new URL(url); } catch { return alert('URL tidak valid'); }
  $('userInput').value = `Analisis link ini untuk ${currentRole}: ${url}`;
  sendMessage();
  $('urlInput').value = '';
}

function convertToBase64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.readAsDataURL(file);
    r.onload = () => res(r.result);
    r.onerror = rej;
  });
}

// ==================== SEND MESSAGE - ADOPSI DARI cp-tp-atp.js + VISION ====================
async function sendMessage() {
  const input = $('userInput');
  const btnSend = $('btnSend');
  let userMessage = input.value.trim();

  if (currentFileData && !userMessage) {
    userMessage = currentFileData.type === 'image' ? 'Jelaskan apa yang ada di dalam gambar ini secara detail.' : 'Berikan saran untuk video ini';
  }

  if (!userMessage && !window.lastUploadedImage) {
    alert('Ketik pertanyaan atau upload gambar!');
    return;
  }

  if (!groqApiKey) {
    alert('⚠️ API Key Groq belum aktif di Firestore settings/api_key. Cek cp-tp-atp.js juga pakai key yang sama.');
    return;
  }

  // Tampilkan di chat
  let displayMsg = userMessage;
  if (currentFileData) displayMsg += `\n[📎 ${currentFileData.type}: ${currentFileData.name}]`;
  appendMessage('user', displayMsg);
  input.value = '';
  btnSend.disabled = true;
  btnSend.textContent = '⏳';

  const container = $('chatContainer');
  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'message ai loading';
  loadingDiv.innerHTML = '<span class="typing-dots">⏳ AI sedang berpikir (' + currentRole + ')...</span>';
  container.appendChild(loadingDiv);
  container.scrollTop = container.scrollHeight;

  const systemPrompt = getSystemPromptByRole(currentRole);
  let enhancedPrompt = userMessage;
  if (currentFileData?.type === 'image') enhancedPrompt = `${userMessage}\n\n[User mengupload gambar: ${currentFileData.name}. Analisis gambar tersebut.]`;

  let useVision = !!(currentFileData?.type === 'image' && currentFileData.base64);
  let aiMessage = '';
  let usedProvider = 'groq';
  let usedModel = GROQ_MODEL_TEXT;

  try {
    // Jika ada gambar, coba Groq Vision dulu (adopsi cara fetch sama seperti cp-tp-atp.js)
    if (useVision) {
      let visionSuccess = false;
      for (const modelName of GROQ_VISION_MODELS) {
        try {
          console.log(`🔄 Coba Groq Vision: ${modelName} dengan key ${groqApiKey.substring(0,10)}...`);
          const response = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqApiKey}` },
            body: JSON.stringify({
              model: modelName,
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: [
                  { type: 'text', text: enhancedPrompt },
                  { type: 'image_url', image_url: { url: currentFileData.base64 } }
                ]}
              ],
              temperature: 0.7,
              max_tokens: 2048
            })
          });

          if (response.ok) {
            const data = await response.json();
            aiMessage = data.choices[0].message.content;
            usedModel = modelName;
            visionSuccess = true;
            console.log(`✅ Vision sukses dengan ${modelName}`);
            break;
          } else {
            const errData = await response.json().catch(() => ({}));
            const msg = errData.error?.message || `HTTP ${response.status}`;
            console.warn(`❌ Model ${modelName} gagal: ${msg}`);
            if (msg.includes('does not exist') || msg.includes('decommissioned') || msg.includes('not supported')) continue;
            else throw new Error(msg);
          }
        } catch (e) {
          console.warn(`Error ${modelName}:`, e.message);
          if (e.message.includes('does not exist') || e.message.includes('decommissioned')) continue;
          else throw e;
        }
      }

      // Jika semua Groq Vision gagal, fallback ke Gemini (jika ada)
      if (!visionSuccess) {
        if (geminiApiKey) {
          console.log('🔄 Fallback ke Gemini Vision');
          loadingDiv.innerHTML = '<span class="typing-dots">⚠️ Groq Vision gagal, coba Gemini Vision...</span>';
          aiMessage = await callGeminiVision(enhancedPrompt, currentFileData.base64);
          usedProvider = 'gemini';
          usedModel = GEMINI_MODEL;
          visionSuccess = true;
        } else {
          console.log('⚠️ Vision gagal semua, fallback ke text Groq');
          loadingDiv.innerHTML = '<span class="typing-dots">⚠️ Vision tidak tersedia, pakai mode text...</span>';
          // Fallback text seperti cp-tp-atp.js
          const fallbackPrompt = `User upload gambar ${currentFileData.name} dan bertanya: "${userMessage}". Karena vision sedang maintenance, jawab berdasarkan teks saja.`;
          const response = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqApiKey}` },
            body: JSON.stringify({
              model: GROQ_MODEL_TEXT,
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: fallbackPrompt }
              ],
              temperature: 0.7,
              max_tokens: 2048
            })
          });
          if (!response.ok) throw new Error(`Groq Text Error: ${response.status}`);
          const data = await response.json();
          aiMessage = data.choices[0].message.content + '\n\n[ℹ️ Mode text: Vision sedang maintenance]';
          usedProvider = 'groq-text-fallback';
        }
      }
    } else {
      // TEXT ONLY - ADOPSI PERSIS cp-tp-atp.js
      console.log(`🔄 Groq Text: ${GROQ_MODEL_TEXT} | Key: ${groqApiKey.substring(0,10)}...`);
      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqApiKey}` },
        body: JSON.stringify({
          model: GROQ_MODEL_TEXT,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: enhancedPrompt }
          ],
          temperature: 0.7,
          max_tokens: 2048
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error?.message || `API Error: ${response.status}`);
      }

      const data = await response.json();
      aiMessage = data.choices[0].message.content;
    }

    loadingDiv.remove();
    appendMessage('ai', aiMessage);

    // SASARAN 1: OUTPUT DI BAWAH TEXT AREA INPUT
    lastOutputRaw = aiMessage;
    const outputWrapper = $('outputWrapper');
    const aiOutput = $('aiOutput');
    if (outputWrapper && aiOutput) {
      aiOutput.innerHTML = formatAIResponse(aiMessage) + `<div style="margin-top:14px; font-size:11px; color:#64748b; border-top:1px dashed #e5e7eb; padding-top:8px;">🤖 Provider: <b>${usedProvider}</b> | Model: ${usedModel} | Role: ${currentRole} | Groq Key sama dengan CP-TP-ATP</div>`;
      outputWrapper.classList.add('show');
      $('btnSaveProta')?.style && ( $('btnSaveProta').style.display = (aiMessage.includes('"elemen"') && aiMessage.includes('"tp"')) ? 'inline-block' : 'none' );
      // Scroll ke output yang di bawah input
      outputWrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // Log usage seperti cp-tp-atp.js
    logUsage(displayMsg, aiMessage, usedProvider, usedModel).catch(()=>{});

  } catch (error) {
    console.error('❌ Error:', error);
    loadingDiv.remove();
    const errMsg = `❌ Gagal: ${error.message}`;
    appendMessage('ai', errMsg);
    const out = $('outputWrapper');
    if (out) {
      $('aiOutput').innerHTML = `<span style="color:#ef4444; white-space:pre-wrap;">${errMsg}\n\nPastikan API Key di settings/api_key aktif (sama seperti cp-tp-atp.js)</span>`;
      out.classList.add('show');
    }
  } finally {
    btnSend.disabled = false;
    btnSend.textContent = '➤';
    input.focus();
  }
}

async function callGeminiVision(promptText, base64Image) {
  if (!geminiApiKey) throw new Error('Gemini Key tidak ada');
  const cleanBase64 = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;
  const mime = base64Image.match(/data:(.*?);base64/)?.[1] || 'image/png';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${geminiApiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: promptText }, { inline_data: { mime_type: mime, data: cleanBase64 } }] }]
    })
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Gemini ${res.status}: ${t}`);
  }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Tidak ada jawaban Gemini';
}

// ==================== SASARAN: DOWNLOAD, SIMPAN, HAPUS ====================
function handleCopy() {
  if (!lastOutputRaw) return alert('Belum ada output');
  navigator.clipboard.writeText(lastOutputRaw);
  showToast('✅ Disalin ke clipboard', 'success');
}

function handleDownloadTXT() {
  if (!lastOutputRaw) return alert('Belum ada output untuk diunduh');
  const blob = new Blob([lastOutputRaw], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Bantuan-AI-${currentRole}-${new Date().toISOString().slice(0,10)}.txt`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('✅ File TXT diunduh', 'success');
}

function handleDownloadPDF() {
  if (!lastOutputRaw) return alert('Belum ada output');
  const w = window.open('', '_blank');
  w.document.write(`
    <html><head><title>Bantuan AI - ${currentRole}</title>
    <style>body{font-family:'Segoe UI',sans-serif; padding:24px; line-height:1.7; color:#1f2937;} h2{color:#1e3a8a;} pre{background:#0f172a; color:#e2e8f0; padding:14px; border-radius:8px; overflow:auto;}</style>
    </head><body>
    <h2>Bantuan AI - SDN 139 LAMANDA - ${currentRole.toUpperCase()}</h2>
    <p><small>${new Date().toLocaleString('id-ID')} | Role: ${currentRole}</small></p>
    <hr>
    <div>${$('aiOutput').innerHTML}</div>
    </body></html>`);
  w.document.close();
  w.print();
}

async function handleSaveToFirestore() {
  if (!lastOutputRaw) return alert('Belum ada output untuk disimpan');
  const status = $('saveStatus');
  if (status) status.textContent = '⏳ Menyimpan ke Firestore...';
  try {
    await addDoc(collection(db, 'bantuan_ai_logs'), {
      userId: currentUser.uid,
      userEmail: currentUser.email || 'unknown',
      userName: currentUser.nama || currentUser.displayName || 'User',
      role: currentRole,
      fileName: currentFileData?.name || null,
      question: $('userInput')?.value?.slice(0,200) || currentFileData?.name || 'file upload',
      response: lastOutputRaw,
      timestamp: serverTimestamp(),
      source: 'bantuan-ai-adopted-cp-tp-atp'
    });
    if (status) status.innerHTML = '✅ <b>Berhasil disimpan ke Firestore: bantuan_ai_logs</b> (Role: ' + currentRole + ')';
    showToast('✅ Berhasil simpan ke Firestore', 'success');
  } catch (e) {
    console.error(e);
    if (status) status.innerHTML = `❌ Gagal simpan: ${e.message}`;
    showToast('❌ Gagal simpan: ' + e.message, 'error');
  }
}

function handleHapusOutput() {
  if (!lastOutputRaw) return alert('Belum ada output');
  if (!confirm('Hapus output yang di bawah input ini?')) return;
  lastOutputRaw = '';
  $('aiOutput').innerHTML = '';
  $('outputWrapper')?.classList.remove('show');
  $('saveStatus').textContent = '';
  showToast('🗑️ Output dihapus', 'success');
}

function handleHapusChat() {
  if (!confirm('Hapus semua riwayat chat? Output di bawah juga akan hilang.')) return;
  chatHistory = [];
  localStorage.removeItem('ai_chat_history');
  renderChatHistory();
  lastOutputRaw = '';
  $('aiOutput').innerHTML = '';
  $('outputWrapper')?.classList.remove('show');
  $('saveStatus').textContent = '';
  clearFilePreview();
  showToast('🗑️ Chat & output dihapus', 'success');
}

function appendMessage(role, text) {
  chatHistory.push({ role, content: text });
  if (chatHistory.length > 50) chatHistory = chatHistory.slice(-50);
  localStorage.setItem('ai_chat_history', JSON.stringify(chatHistory));
  renderChatHistory();
}

function renderChatHistory() {
  const c = $('chatContainer');
  if (!c) return;
  if (chatHistory.length === 0) {
    c.innerHTML = `<div class="message ai">Halo! Mode <b>${currentRole.toUpperCase()}</b> aktif.<br>✅ Groq Key dari <code>settings/api_key</code> (sama dengan CP-TP-ATP)<br>• 📷 Upload gambar → tetap bisa ketik teks info gambar<br>• 🔗 Paste link | 🎤 Voice<br><br><small id="apiStatus" style="color:#64748b;">Memuat API status...</small></div>`;
    updateApiStatus();
    return;
  }
  c.innerHTML = chatHistory.map(m => `<div class="message ${m.role}">${formatAIResponse(m.content)}</div>`).join('');
  c.scrollTop = c.scrollHeight;
  updateApiStatus();
}

function formatAIResponse(text) {
  return text
    .replace(/```json([\s\S]*?)```/g, '<pre>$1</pre>')
    .replace(/```([\s\S]*?)```/g, '<pre>$1</pre>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');
}

async function logUsage(q, a, provider, model) {
  try {
    await addDoc(collection(db, 'ai_usage_logs'), {
      userId: currentUser.uid,
      userEmail: currentUser.email || 'unknown',
      role: currentRole,
      provider, model,
      question: q.substring(0,200),
      answerLength: a.length,
      timestamp: serverTimestamp()
    });
  } catch {}
}

function showToast(msg, type = 'success') {
  const toast = document.createElement('div');
  toast.style.cssText = `position:fixed; top:20px; right:20px; padding:12px 18px; border-radius:8px; z-index:99999; color:#fff; font-weight:600; font-size:13px; box-shadow:0 4px 12px rgba(0,0,0,0.15); transition:all 0.3s ease; background:${type==='success'?'#16a34a':type==='error'?'#ef4444':'#f59e0b'};`;
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.opacity='0'; toast.style.transform='translateX(100%)'; setTimeout(()=>toast.remove(),300); }, 2500);
}

function saveToProta() {
  try {
    const m = lastOutputRaw.match(/\[([\s\S]*?"elemen"[\s\S]*?)\]/);
    if (!m) return alert('Tidak ada JSON TP ditemukan');
    const json = JSON.parse(m[0]);
    localStorage.setItem('cp_tp_atp', JSON.stringify(json));
    alert(`✅ ${json.length} TP disimpan ke Prota! Buka Program Tahunan > Tarik Data TP/ATP`);
  } catch (e) { alert('Gagal: '+e.message); }
}
