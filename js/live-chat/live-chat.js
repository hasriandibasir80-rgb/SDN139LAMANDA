// live-chat.js - OPSI B FINAL - HANYA BOTTOM NAV, FAB DIMATIKAN
// Fix: Nama muncul, Teks muncul, Memuat pesan fix, Single button

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, doc, query, onSnapshot, addDoc, setDoc, updateDoc, serverTimestamp, getDoc, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { firebaseConfig } from "./firebase-config.js";

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const CHATS_COLLECTION = 'chats';
const USERS_COLLECTION = 'users';

let me = null;
let myChats = [];
let activeChatId = null;
let unsubMessages = null;
let unsubChats = null;
let allUsersCache = [];

function loadCSS(){
  if(document.getElementById('lc-style')) return;
  const style = document.createElement('style');
  style.id = 'lc-style';
  style.textContent = `
    #lc-panel{position:fixed;bottom:70px;left:50%;transform:translateX(-50%);width:380px;max-width:96vw;height:520px;background:#fff;border-radius:16px;box-shadow:0 8px 30px rgba(0,0,0,0.25);display:none;flex-direction:column;z-index:9999;overflow:hidden;border:1px solid #e2e8f0}
    #lc-panel.open{display:flex;animation:lcSlideUp .25s ease}
    @keyframes lcSlideUp{from{transform:translate(-50%,20px);opacity:0}to{transform:translate(-50%,0);opacity:1}}
    #lc-header{padding:12px 16px;background:#6366f1;color:#fff;display:flex;justify-content:space-between;align-items:center;font-weight:700}
    #lc-header-title{font-size:14px}
    #lc-tabs{display:flex;background:#f1f5f9;border-bottom:1px solid #e2e8f0}
    .lc-tab{flex:1;padding:10px;text-align:center;font-size:13px;cursor:pointer;font-weight:600;color:#64748b;border-bottom:2px solid transparent}
    .lc-tab.active{color:#6366f1;border-bottom-color:#6366f1;background:#fff}
    #lc-list,#lc-dir{flex:1;overflow-y:auto;background:#fff}
    #lc-messages{flex:1;overflow-y:auto;padding:12px;background:#f8fafc;display:flex;flex-direction:column;gap:8px}
    .lc-msg-row{display:flex;flex-direction:column;max-width:80%}
    .lc-msg-row.lc-me{align-self:flex-end;align-items:flex-end}
    .lc-msg-row.lc-other{align-self:flex-start;align-items:flex-start}
    .lc-bubble{padding:9px 13px;border-radius:16px;font-size:13.5px;line-height:1.4;word-break:break-word}
    .lc-me .lc-bubble{background:#6366f1;color:#fff;border-bottom-right-radius:4px}
    .lc-other .lc-bubble{background:#fff;color:#1e293b;border:1px solid #e2e8f0;border-bottom-left-radius:4px}
    .lc-msg-time{font-size:10px;margin-top:4px;color:#94a3b8}
    #lc-input-area{padding:10px;border-top:1px solid #e2e8f0;display:flex;gap:8px;align-items:center;background:#fff}
    #lc-text-input{flex:1;padding:10px 14px;border:1px solid #e2e8f0;border-radius:24px;outline:none;font-size:13px}
    #lc-text-input:focus{border-color:#6366f1}
    #lc-send-btn{background:#6366f1;color:#fff;border:none;width:38px;height:38px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:16px}
    .lc-user-item{padding:11px 16px;display:flex;align-items:center;gap:10px;cursor:pointer;border-bottom:1px solid #f8fafc;transition:.15s}
    .lc-user-item:hover{background:#f8fafc}
    .lc-avatar{width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;flex-shrink:0}
    .lc-user-info{flex:1;min-width:0}
    .lc-user-name{font-weight:600;font-size:13.5px;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .lc-user-last{font-size:11.5px;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .lc-empty{padding:40px 20px;text-align:center;color:#94a3b8;font-size:13px}
    #navLiveChat.active{color:#6366f1}
    .lc-unread-badge{background:#ef4444;color:#fff;font-size:10px;min-width:18px;height:18px;border-radius:9px;display:flex;align-items:center;justify-content:center;padding:0 5px;margin-left:auto;font-weight:700}
  `;
  document.head.appendChild(style);
}

function getGuestId(){
  let gid = localStorage.getItem('guest_id');
  if(!gid){
    gid = 'guest_' + Math.random().toString(36).slice(2,9);
    localStorage.setItem('guest_id', gid);
  }
  return gid;
}

function getMe(){
  const user = auth.currentUser;
  if(user){
    return { uid: user.uid, nama: user.displayName || user.email?.split('@')[0] || 'Saya', isGuest: false };
  } else {
    const gid = getGuestId();
    const savedName = localStorage.getItem('guest_nama') || 'Tamu';
    return { uid: gid, nama: savedName, isGuest: true };
  }
}

function formatTime(ts){
  if(!ts) return '';
  const d = ts.toDate ? ts.toDate() : (ts.seconds ? new Date(ts.seconds*1000) : new Date(ts));
  if(isNaN(d)) return '';
  return d.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'});
}

function escapeHtml(text){
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// === RENDER LIST CHAT SAYA ===
function renderChatListView(){
  const listEl = document.getElementById('lc-list');
  const dirEl = document.getElementById('lc-dir');
  if(dirEl) dirEl.style.display = 'none';
  if(listEl) listEl.style.display = 'block';
  document.querySelectorAll('.lc-tab').forEach(t=>{
    t.classList.toggle('active', t.dataset.tab==='chats');
  });
  if(!listEl) return;
  if(myChats.length===0){
    listEl.innerHTML = `<div class="lc-empty">Belum ada percakapan.<br/>Pilih tab <b>Semua Pengguna</b> untuk mulai chat.</div>`;
    return;
  }
  listEl.innerHTML = myChats.map(chat=>{
    const other = chat.participants?.find(p=>p!==me.uid) || 'Unknown';
    const otherName = chat.participantNames?.[other] || other.substring(0,12);
    const last = chat.lastMessage || '';
    const unread = chat.unread?.[me.uid] || 0;
    return `<div class="lc-user-item" onclick="window.lcOpenChat('${chat.id}','${other}','${escapeHtml(otherName)}')">
      <div class="lc-avatar">${otherName.charAt(0).toUpperCase()}</div>
      <div class="lc-user-info"><div class="lc-user-name">${escapeHtml(otherName)}</div><div class="lc-user-last">${escapeHtml(last.substring(0,30))}</div></div>
      ${unread>0?`<div class="lc-unread-badge">${unread}</div>`:''}
    </div>`;
  }).join('');
}

// === LOAD SEMUA PENGGUNA ===
async function loadAllUsersDirectory(){
  const listEl = document.getElementById('lc-list');
  const dirEl = document.getElementById('lc-dir');
  if(listEl) listEl.style.display = 'none';
  if(dirEl) dirEl.style.display = 'block';
  document.querySelectorAll('.lc-tab').forEach(t=>{
    t.classList.toggle('active', t.dataset.tab==='users');
  });
  if(!dirEl) return;
  dirEl.innerHTML = `<div class="lc-empty">Memuat pengguna...</div>`;
  try{
    const snap = await getDocs(collection(db, USERS_COLLECTION));
    allUsersCache = snap.docs.map(d=>({id:d.id, ...d.data()})).filter(u=>u.id!==me.uid);
    if(allUsersCache.length===0){
      dirEl.innerHTML = `<div class="lc-empty">Tidak ada pengguna lain.</div>`;
      return;
    }
    dirEl.innerHTML = allUsersCache.map(u=>{
      const nama = u.nama || u.displayName || u.email || u.id;
      return `<div class="lc-user-item" onclick="window.lcOpenChat('', '${u.id}', '${escapeHtml(nama)}')">
        <div class="lc-avatar">${nama.charAt(0).toUpperCase()}</div>
        <div class="lc-user-info"><div class="lc-user-name">${escapeHtml(nama)}</div><div class="lc-user-last">${escapeHtml(u.email||'')}</div></div>
      </div>`;
    }).join('');
  }catch(err){
    console.error('load users error', err);
    dirEl.innerHTML = `<div class="lc-empty" style="color:#ef4444">Gagal memuat: ${err.message}<br/>Pastikan Rules users = allow read: if true</div>`;
  }
}

function getChatIdForUsers(a,b){
  return [a,b].sort().join('_');
}

async function ensureChatDoc(chatId, otherId, otherName){
  const ref = doc(db, CHATS_COLLECTION, chatId);
  const snap = await getDoc(ref);
  if(!snap.exists()){
    const participants = [me.uid, otherId].sort();
    await setDoc(ref, {
      participants: participants,
      participantNames: { [me.uid]: me.nama, [otherId]: otherName },
      createdAt: serverTimestamp(),
      lastMessage: '',
      lastAt: serverTimestamp(),
      unread: { [otherId]: 0, [me.uid]: 0 }
    });
  } else {
    // Update nama saya kalau berubah
    const data = snap.data();
    if(data.participantNames?.[me.uid] !== me.nama){
      await updateDoc(ref, { [`participantNames.${me.uid}`]: me.nama });
    }
  }
}

window.lcOpenChat = async function(existingChatId, otherId, otherName){
  try{
    const chatId = existingChatId || getChatIdForUsers(me.uid, otherId);
    activeChatId = chatId;
    await ensureChatDoc(chatId, otherId, otherName);
    document.getElementById('lc-list').style.display = 'none';
    const dirEl = document.getElementById('lc-dir');
    if(dirEl) dirEl.style.display = 'none';
    const msgEl = document.getElementById('lc-messages');
    const inputArea = document.getElementById('lc-input-area');
    msgEl.style.display = 'flex';
    inputArea.style.display = 'flex';
    msgEl.innerHTML = `<div class="lc-empty">Memuat pesan...</div>`;
    document.getElementById('lc-header-title').textContent = otherName;
    document.getElementById('lc-tabs').style.display = 'none';
    // Reset unread
    try{ await updateDoc(doc(db, CHATS_COLLECTION, chatId), { [`unread.${me.uid}`]: 0 }); }catch(e){}
    subscribeMessages(chatId);
    document.getElementById('lc-back-btn').style.display = 'block';
  }catch(err){
    alert('Gagal buka chat: '+err.message);
    console.error(err);
  }
};

window.lcBackToList = function(){
  if(unsubMessages){ unsubMessages(); unsubMessages=null; }
  activeChatId = null;
  document.getElementById('lc-messages').style.display = 'none';
  document.getElementById('lc-input-area').style.display = 'none';
  document.getElementById('lc-header-title').textContent = 'Live Chat';
  document.getElementById('lc-tabs').style.display = 'flex';
  document.getElementById('lc-back-btn').style.display = 'none';
  document.getElementById('lc-list').style.display = 'block';
  renderChatListView();
};

function subscribeMessages(chatId){
  const container = document.getElementById('lc-messages');
  if(unsubMessages) unsubMessages();
  // FIX: Tanpa orderBy untuk hindari error null serverTimestamp
  const colRef = collection(db, CHATS_COLLECTION, chatId, 'messages');
  unsubMessages = onSnapshot(colRef, snap=>{
    let msgs = snap.docs.map(d=>({id:d.id, ...d.data()}));
    // Sort manual client-side, aman untuk createdAt null
    msgs.sort((a,b)=>{
      const tA = a.createdAt?.seconds || a.createdAt?._seconds || (a.createdAt instanceof Date ? a.createdAt.getTime()/1000 : 0) || 0;
      const tB = b.createdAt?.seconds || b.createdAt?._seconds || (b.createdAt instanceof Date ? b.createdAt.getTime()/1000 : 0) || 0;
      return tA - tB;
    });
    renderMessages(msgs);
  }, err=>{
    console.error('subscribe error', err);
    container.innerHTML = `<div class="lc-empty" style="color:red">Error load pesan: ${err.message}<br/>Pastikan Rules chats/messages = allow true</div>`;
  });
}

function renderMessages(msgs){
  const container = document.getElementById('lc-messages');
  if(!container) return;
  if(msgs.length===0){
    container.innerHTML = `<div class="lc-empty">Belum ada pesan. Mulai percakapan!</div>`;
    return;
  }
  container.innerHTML = msgs.map(m=>{
    const isMe = m.senderId === me.uid;
    const time = formatTime(m.createdAt);
    const cls = isMe ? 'lc-me' : 'lc-other';
    return `<div class="lc-msg-row ${cls}"><div class="lc-bubble">${escapeHtml(m.text||'')}<div class="lc-msg-time">${time}</div></div></div>`;
  }).join('');
  container.scrollTop = container.scrollHeight;
}

async function sendMessage({text}){
  if(!activeChatId) return;
  if(!text || !text.trim()) return;
  try{
    const colRef = collection(db, CHATS_COLLECTION, activeChatId, 'messages');
    await addDoc(colRef, {
      senderId: me.uid,
      senderName: me.nama,
      text: text.trim(),
      createdAt: serverTimestamp()
    });
    const chatRef = doc(db, CHATS_COLLECTION, activeChatId);
    const snap = await getDoc(chatRef);
    if(snap.exists()){
      const data = snap.data();
      const otherId = data.participants.find(p=>p!==me.uid);
      await updateDoc(chatRef, {
        lastMessage: text.trim(),
        lastAt: serverTimestamp(),
        [`unread.${otherId}`]: (data.unread?.[otherId]||0)+1
      });
    }
  }catch(err){
    console.error('send error', err);
    alert('Gagal kirim: '+err.message);
  }
}

async function handleSendText(){
  const input = document.getElementById('lc-text-input');
  const text = input.value.trim();
  if(!text) return;
  // Optimistic UI - tampilkan langsung biar teks langsung muncul
  const container = document.getElementById('lc-messages');
  if(container.querySelector('.lc-empty')) container.innerHTML = '';
  container.insertAdjacentHTML('beforeend', `<div class="lc-msg-row lc-me"><div class="lc-bubble" style="background:#6366f1;color:#fff;opacity:0.8">${escapeHtml(text)}<div class="lc-msg-time">mengirim...</div></div></div>`);
  container.scrollTop = container.scrollHeight;
  input.value = '';
  await sendMessage({text});
}

function listenMyChats(){
  if(unsubChats) unsubChats();
  // Tanpa where/orderBy agar tidak butuh index, filter client
  const q = collection(db, CHATS_COLLECTION);
  unsubChats = onSnapshot(q, snap=>{
    let all = snap.docs.map(d=>({id:d.id, ...d.data()}));
    // Filter hanya chat saya
    myChats = all.filter(c=>c.participants && c.participants.includes(me.uid));
    // Sort by lastAt desc
    myChats.sort((a,b)=>{
      const tA = a.lastAt?.seconds || 0;
      const tB = b.lastAt?.seconds || 0;
      return tB - tA;
    });
    // Update badge bottom nav
    let totalUnread = 0;
    myChats.forEach(c=>{ totalUnread += (c.unread?.[me.uid]||0); });
    const nav = document.getElementById('navLiveChat');
    if(nav){
      let badge = nav.querySelector('.lc-bottom-badge');
      if(!badge && totalUnread>0){
        badge = document.createElement('span');
        badge.className = 'lc-bottom-badge';
        badge.style.cssText = 'position:absolute;top:2px;right:18px;background:#ef4444;color:#fff;font-size:10px;min-width:16px;height:16px;border-radius:8px;display:flex;align-items:center;justify-content:center;padding:0 4px;font-weight:700';
        nav.style.position='relative';
        nav.appendChild(badge);
      }
      if(badge){
        badge.textContent = totalUnread;
        badge.style.display = totalUnread>0 ? 'flex' : 'none';
      }
    }
    // Jika di list view, re-render
    const listEl = document.getElementById('lc-list');
    if(listEl && listEl.style.display!=='none' && !activeChatId){
      renderChatListView();
    }
  });
}

function renderWidgetShell(){
  loadCSS();
  // === OPSI B: HAPUS FAB KALAU MASIH ADA ===
  const oldFab = document.getElementById('lc-fab');
  if(oldFab) oldFab.remove();
  const oldFab2 = document.querySelector('.lc-fab');
  if(oldFab2) oldFab2.remove();
  
  if(document.getElementById('lc-panel')) return;
  
  const panel = document.createElement('div');
  panel.id = 'lc-panel';
  panel.innerHTML = `
    <div id="lc-header">
      <button id="lc-back-btn" onclick="window.lcBackToList()" style="display:none;background:none;border:none;color:#fff;cursor:pointer;margin-right:8px">←</button>
      <span id="lc-header-title">Live Chat</span>
      <button onclick="window.liveChatToggle()" style="background:none;border:none;color:#fff;cursor:pointer;font-size:18px">✕</button>
    </div>
    <div id="lc-tabs">
      <div class="lc-tab active" data-tab="chats" onclick="window.lcShowTab('chats')">Chat Saya</div>
      <div class="lc-tab" data-tab="users" onclick="window.lcShowTab('users')">Semua Pengguna</div>
    </div>
    <div id="lc-list"></div>
    <div id="lc-dir" style="display:none"></div>
    <div id="lc-messages" style="display:none"></div>
    <div id="lc-input-area" style="display:none">
      <input id="lc-text-input" placeholder="Tulis pesan..." onkeydown="if(event.key==='Enter'){window.lcHandleSend()}" />
      <button id="lc-send-btn" onclick="window.lcHandleSend()">➤</button>
    </div>
  `;
  document.body.appendChild(panel);
  
  // Hook bottom nav
  const navBtn = document.getElementById('navLiveChat');
  if(navBtn){
    navBtn.addEventListener('click', (e)=>{
      e.preventDefault();
      window.liveChatToggle();
    });
  }
  
  console.log('Live Chat OPSI B loaded - FAB disabled, hanya bottom nav');
}

window.liveChatToggle = function(){
  const p = document.getElementById('lc-panel');
  if(!p) return;
  p.classList.toggle('open');
  if(p.classList.contains('open') && !activeChatId){
    renderChatListView();
  }
};

window.lcShowTab = function(tab){
  if(tab==='chats') renderChatListView();
  else loadAllUsersDirectory();
};

window.lcHandleSend = handleSendText;

function init(){
  renderWidgetShell();
  onAuthStateChanged(auth, async (user)=>{
    me = getMe();
    listenMyChats();
    if(document.getElementById('lc-panel')?.classList.contains('open')){
      renderChatListView();
    }
  });
  // Guest juga langsung listen
  if(!auth.currentUser){
    me = getMe();
    listenMyChats();
  }
}

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
