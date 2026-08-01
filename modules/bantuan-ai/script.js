/**
 * script.js - Bantuan AI Global - GROQ dari Firestore
 * REVISI: API Key diambil dari Firestore (sesuai sistem lama), bukan localStorage
 */

import { db } from '../../js/firebase-config.js';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL_TEXT = 'llama-3.3-70b-versatile';
const GROQ_MODEL_VISION = 'meta-llama/llama-4-scout-17b-16e-instruct';

let firestoreDB = db;
let cachedGroqKey = null;
let currentRole = localStorage.getItem('ai_role') || detectRole();
let currentFile = null;
let lastOutputRaw = '';
const $ = (id) => document.getElementById(id);

// --- ROLE ---
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
  const base = `Kamu adalah asisten AI resmi SDN 139 LAMANDA.`;
  if (role === 'guru') return `${base} Peran: Guru/Admin SD. Gaya: Profesional, Kurikulum Merdeka, berikan tabel, JP, Elemen CP. Jika output TP/ATP, akhiri dengan JSON array [{"elemen":"...","tp":"...","jp":8,"semester":1,"mapel":"..."}]`;
  if (role === 'siswa') return `${base} Peran: Tutor Siswa SD. Gaya: Sederhana, menyenangkan, langkah demi langkah, pakai emoji secukupnya, akhiri dengan 1 latihan.`;
  return `${base} Peran: Konselor Orang Tua. Gaya: Empatik, santai, tips pendampingan di rumah.`;
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

// --- AMBIL GROQ API KEY DARI FIRESTORE (PERTAHANKAN SISTEM LAMA) ---
async function getGroqApiKey() {
  if (cachedGroqKey) return cachedGroqKey;

  // Coba beberapa lokasi umum tempat kamu simpan (agar kompatibel dengan sistem lamamu)
  const possiblePaths = [
    { col: 'settings', doc: 'api_keys', field: 'groq_api_key' },
    { col: 'settings', doc: 'groq', field: 'api_key' },
    { col: 'config', doc: 'api', field: 'groq_api_key' },
    { col: 'sekolah_config', doc: 'api', field: 'groq' },
    { col: 'api_keys', doc: 'groq', field: 'key' },
  ];

  try {
    // Compat SDK (db.collection)
    if (firestoreDB && firestoreDB.collection) {
      for (const p of possiblePaths) {
        try {
          const docSnap = await firestoreDB.collection(p.col).doc(p.doc).get();
          if (docSnap.exists) {
            const data = docSnap.data();
            const key = data[p.field] || data.groq_api_key || data.groq || data.api_key || data.key;
            if (key && key.startsWith('gsk_')) {
              cachedGroqKey = key;
              console.log(`✅ Groq Key ditemukan di Firestore: ${p.col}/${p.doc}.${p.field}`);
              return key;
            }
          }
        } catch {}
      }
      // Coba koleksi langsung
      try {
        const snap = await firestoreDB.collection('settings').limit(1).get();
        snap.forEach(d => {
          const data = d.data();
          if (data.groq_api_key && data.groq_api_key.startsWith('gsk_')) cachedGroqKey = data.groq_api_key;
        });
        if (cachedGroqKey) return cachedGroqKey;
      } catch {}
    } else {
      // Modular SDK
      const { doc, getDoc, collection, getDocs, query, limit } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
      for (const p of possiblePaths) {
        try {
          const ref = doc(firestoreDB, p.col, p.doc);
          const snap = await getDoc(ref);
          if (snap.exists()) {
            const data = snap.data();
            const key = data[p.field] || data.groq_api_key || data.groq || data.api_key;
            if (key && key.startsWith('gsk_')) {
              cachedGroqKey = key;
              console.log(`✅ Groq Key ditemukan di Firestore: ${p.col}/${p.doc}.${p.field}`);
              return key;
            }
          }
        } catch {}
      }
    }
  } catch (e) {
    console.warn('Gagal ambil Groq Key dari Firestore:', e);
  }

  // Fallback localStorage (untuk dev, tapi utama dari Firestore)
  const fallback = localStorage.getItem('groq_api_key');
  if (fallback && fallback.startsWith('gsk_')) {
    cachedGroqKey = fallback;
    return fallback;
  }

  throw new Error('Groq API Key tidak ditemukan di Firestore. Pastikan ada di koleksi settings/api_keys field groq_api_key');
}

// --- FILE HANDLING (TETAP BISA KETIK) ---
function handleFile(file, type) {
  currentFile = { file, type, name: file.name, size: file.size };
  const reader = new FileReader();
  reader.onload = (ev) => {
    currentFile.base64 = ev.target.result;
    const previewArea = $('previewArea');
    const previewImg = $('previewImg');
    if (previewArea) previewArea.classList.add('show');
    if (previewImg) previewImg.src = type === 'image' ? ev.target.result : '';
    $('previewName').textContent = file.name;
    $('previewSize').textContent = (file.size / 1024).toFixed(1) + ' KB';
    $('btnImage').classList.add('has-file');
    $('userInput').placeholder = `Gambar "${file.name}" terupload. Ketik info tambahan di sini...`;
    $('userInput').focus();
  };
  reader.readAsDataURL(file);
}

function clearFile() {
  currentFile = null;
  $('previewArea').classList.remove('show');
  $('btnImage').classList.remove('has-file');
  $('imageInput').value = '';
  $('videoInput').value = '';
}

// --- GROQ CALL ---
async function callGroqAPI(promptText, file) {
  const apiKey = await getGroqApiKey();
  const systemPrompt = getSystemPrompt(currentRole);

  let userContent;
  let model = GROQ_MODEL_TEXT;

  if (file && file.type === 'image' && file.base64) {
    model = GROQ_MODEL_VISION;
    userContent = [
      { type: 'text', text: `${promptText}\n\nInfo: User upload file ${file.name}. ${promptText ? `Konteks: ${promptText}` : 'Jelaskan isi gambar.'}` },
      { type: 'image_url', image_url: { url: file.base64 } }
    ];
  } else {
    userContent = promptText;
  }

  const body = {
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent }
    ],
    temperature: 0.7,
    max_tokens: 2048,
  };

  const res = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Groq API ${res.status}: ${t}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || 'Tidak ada jawaban';
}

function formatAIOutput(text) {
  return text.replace(/```json([\s\S]*?)```/g, (m,c)=>`<pre>${c.trim()}</pre>`).replace(/```([\s\S]*?)```/g, (m,c)=>`<pre>${c.trim()}</pre>`).replace(/\*\*(.*?)\*\*/g,'<b>$1</b>').replace(/\n/g,'<br>');
}

function addChat(text, who, img) {
  const cont = $('chatContainer');
  if (!cont) return;
  const div = document.createElement('div');
  div.className = `message ${who}`;
  div.innerHTML = `${text.replace(/\n/g,'<br>')}${img && who==='user' ? `<img src="${img}" style="max-width:120px; border-radius:6px; margin-top:6px;">` : ''}`;
  cont.appendChild(div);
  cont.scrollTop = cont.scrollHeight;
}

async function send() {
  const text = $('userInput').value.trim();
  const url = $('urlInput').value.trim();
  if (!text && !url && !currentFile) return alert('Ketik pertanyaan atau upload gambar!');

  const display = `${text}${url?`\n🔗 ${url}`:''}${currentFile?`\n📎 ${currentFile.name}`:''}`;
  addChat(display, 'user', currentFile?.base64);

  let fullPrompt = text;
  if (url) fullPrompt += `\n\nAnalisis link: ${url}`;
  if (currentFile && !text) fullPrompt = `Jelaskan file ${currentFile.name}`;
  if (currentFile && text) fullPrompt = `${text} (File: ${currentFile.name})`;

  $('btnSend').disabled = true;
  $('btnSend').textContent = '⏳';
  $('outputWrapper').classList.remove('show');

  try {
    const result = await callGroqAPI(fullPrompt, currentFile);
    lastOutputRaw = result;
    $('aiOutput').innerHTML = formatAIOutput(result);
    $('outputWrapper').classList.add('show');
    $('btnSaveProta').style.display = (result.includes('"elemen"') && result.includes('"tp"')) ? 'inline-block' : 'none';
    $('outputWrapper').scrollIntoView({ behavior: 'smooth' });
    addChat('✅ Jawaban tampil di bawah input.', 'ai');
  } catch (e) {
    $('aiOutput').innerHTML = `<span style="color:#ef4444;">❌ ${e.message}</span>`;
    $('outputWrapper').classList.add('show');
    console.error(e);
  } finally {
    $('btnSend').disabled = false;
    $('btnSend').textContent = '➤';
  }
}

function initEvents() {
  $('imageInput').addEventListener('change', e=>{ const f=e.target.files[0]; if(f) handleFile(f,'image'); });
  $('videoInput').addEventListener('change', e=>{ const f=e.target.files[0]; if(f) handleFile(f,'video'); });
  $('btnRemoveFile').onclick = clearFile;

  // Voice
  let recognition=null, listening=false;
  $('btnVoice').onclick = ()=>{
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) return alert('Gunakan Chrome untuk voice');
    if (!recognition) {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognition = new SR(); recognition.lang='id-ID';
      recognition.onresult = e=>{ $('userInput').value += ( $('userInput').value?' ':'') + e.results[0][0].transcript; };
      recognition.onend = ()=>{ listening=false; $('btnVoice').classList.remove('listening'); $('btnVoice').textContent='🎤 Suara'; };
    }
    if (!listening) { recognition.start(); listening=true; $('btnVoice').classList.add('listening'); $('btnVoice').textContent='⏹️ Stop'; }
    else recognition.stop();
  };

  $('btnSend').onclick = send;
  $('userInput').addEventListener('keydown', e=>{ if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); send(); } });
  $('btnSendLink').onclick = ()=>{ if($('urlInput').value) send(); };
  document.querySelectorAll('.role-btn').forEach(b=> b.onclick=()=>setRoleUI(b.dataset.role));

  $('btnCopy').onclick = ()=>{ navigator.clipboard.writeText(lastOutputRaw); alert('✅ Disalin'); };
  $('btnDownload').onclick = ()=>{
    if(!lastOutputRaw) return alert('Belum ada output');
    const blob=new Blob([lastOutputRaw],{type:'text/plain'}); const url=URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=url; a.download=`AI-${currentRole}-${Date.now()}.txt`; a.click(); URL.revokeObjectURL(url);
  };
  $('btnDownloadPDF').onclick = ()=>{
    if(!lastOutputRaw) return alert('Belum ada output');
    const w=window.open('','_blank'); w.document.write(`<html><head><title>AI</title><style>body{font-family:sans-serif;padding:24px;line-height:1.7}pre{background:#0f172a;color:#fff;padding:12px;border-radius:8px}</style></head><body><h2>Bantuan AI - ${currentRole}</h2><div>${$('aiOutput').innerHTML}</div><script>window.print()<\/script></body></html>`); w.document.close();
  };
  $('btnSaveFirestore').onclick = async ()=>{
    if(!lastOutputRaw) return alert('Belum ada output');
    $('saveStatus').textContent='⏳ Menyimpan...';
    try {
      const user=JSON.parse(localStorage.getItem('currentUser')||'{}');
      const data={ uid:user.uid||'anonymous', nama:user.nama||'User', role:currentRole, prompt:$('userInput').value, fileName:currentFile?.name||null, response:lastOutputRaw, createdAt:new Date().toISOString() };
      if(firestoreDB.collection){
        await firestoreDB.collection('bantuan_ai_logs').add({ ...data, createdAt: firebase.firestore ? firebase.firestore.FieldValue.serverTimestamp() : new Date() });
      } else {
        const { collection, addDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
        await addDoc(collection(firestoreDB,'bantuan_ai_logs'),{...data, createdAt:serverTimestamp()});
      }
      $('saveStatus').innerHTML='✅ Berhasil disimpan ke <b>bantuan_ai_logs</b> (Firestore)';
    } catch(e){ $('saveStatus').innerHTML=`❌ Gagal: ${e.message}`; }
  };
  $('btnSaveProta').onclick = ()=>{
    try {
      const m=lastOutputRaw.match(/\[([\s\S]*?"elemen"[\s\S]*?)\]/);
      if(!m) return alert('Tidak ada JSON TP');
      const json=JSON.parse(m[0]); localStorage.setItem('cp_tp_atp', JSON.stringify(json));
      alert(`✅ ${json.length} TP disimpan ke Prota!`);
    } catch(e){ alert('Gagal parse: '+e.message); }
  };
  $('btnClearChat').onclick = ()=>{ $('chatContainer').innerHTML='<div class="message ai">Chat dibersihkan.</div>'; $('outputWrapper').classList.remove('show'); };
}

document.addEventListener('DOMContentLoaded', ()=>{
  setRoleUI(currentRole);
  initEvents();
  // Preload Groq Key dari Firestore saat load (agar cepat)
  getGroqApiKey().then(k=> console.log('Groq Key loaded dari Firestore')).catch(e=> console.warn(e.message));
});
