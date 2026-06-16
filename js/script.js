import { rtdb } from './firebase-config.js';
import { ref, onValue } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const pengumumanRef = ref(rtdb, 'config/pengumuman_login');

onValue(pengumumanRef, (snapshot) => {
  const teksInfoEl = document.getElementById('teksInfo');
  const infoBoxEl = document.getElementById('infoBerjalan');
  
  if (teksInfoEl && infoBoxEl) {
    const data = snapshot.val();
    
    if (data && data.teks && data.teks.trim() !== "") {
      teksInfoEl.textContent = data.teks;
      infoBoxEl.style.display = 'flex';
    } else {
      infoBoxEl.style.display = 'none';
    }
  }
});

const menuBtn = document.getElementById('menuBtn');
const sidebar = document.getElementById('sidebar');
const closeSidebar = document.getElementById('closeSidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');

function openSidebar() {
  if (sidebar) sidebar.classList.add('active');
  if (sidebarOverlay) sidebarOverlay.classList.add('active');
}

function closeSidebarMenu() {
  if (sidebar) sidebar.classList.remove('active');
  if (sidebarOverlay) sidebarOverlay.classList.remove('active');
}

if (menuBtn) menuBtn.addEventListener('click', openSidebar);
if (closeSidebar) closeSidebar.addEventListener('click', closeSidebarMenu);
if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebarMenu);

let currentCaptcha = '';

function generateCaptcha() {
  currentCaptcha = Math.floor(10000 + Math.random() * 90000).toString();
  const captchaEl = document.getElementById('captcha');
  if (captchaEl) captchaEl.textContent = currentCaptcha;
  return currentCaptcha;
}

function refreshCaptcha() {
  generateCaptcha();
  const captchaInput = document.getElementById('captchaInput');
  if (captchaInput) captchaInput.value = '';
}

document.getElementById('loginForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  
  const loading = document.getElementById('loading');
  const submitBtn = document.querySelector('button[type="submit"]');
  
  if (loading) loading.style.display = 'flex';
  if (submitBtn) submitBtn.disabled = true;
  
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const captchaInput = document.getElementById('captchaInput');
  
  if (!emailInput || !passwordInput || !captchaInput) {
    alert('⚠️ Error: Struktur form tidak lengkap!');
    if (loading) loading.style.display = 'none';
    if (submitBtn) submitBtn.disabled = false;
    return;
  }
  
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  const userCaptcha = captchaInput.value.trim();
  
  if (userCaptcha !== currentCaptcha) {
    alert('❌ Kode Captcha yang Anda masukkan salah! Silakan coba lagi.');
    refreshCaptcha();
    if (loading) loading.style.display = 'none';
    if (submitBtn) submitBtn.disabled = false;
    return; 
  }
  
  try {
    console.log('✅ Captcha benar. Menghubungi Firebase...');
    await window.handleEmailLogin(email, password);
    
  } catch (error) {
    console.error('❌ Login gagal:', error);
    if (loading) loading.style.display = 'none';
    if (submitBtn) submitBtn.disabled = false;
    
    refreshCaptcha();
    alert('❌ ' + error.message);
  }
});

function forgotPassword() {
  alert('Silakan hubungi Admin sekolah atau Live Chat untuk reset password Anda');
}

window.addEventListener('DOMContentLoaded', function() {
  generateCaptcha();
  
  if (typeof window.handleEmailLogin !== 'function') {
    console.error('⚠️ CRITICAL: auth-login.js belum ter-load! Pastikan path dan type="module" sudah benar.');
  } else {
    console.log('✅ Sistem login REAL & Captcha siap digunakan');
  }
});

document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', function(e) {
    if (this.getAttribute('href') === '#') {
      e.preventDefault();
      document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
      this.classList.add('active');
    }
  });
});
