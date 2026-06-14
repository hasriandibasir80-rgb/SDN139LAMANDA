// ============================================
// FILE: js/script.js (100% REAL FIREBASE - NO SIMULATION)
// SDN 139 LAMANDA - Login Page Script
// ============================================

// === CAPTCHA GENERATOR ===
function generateCaptcha() {
  const captcha = Math.floor(10000 + Math.random() * 90000).toString();
  const captchaEl = document.getElementById('captcha');
  if (captchaEl) captchaEl.textContent = captcha;
  return captcha;
}

function refreshCaptcha() {
  generateCaptcha();
}

// === FORM SUBMISSION (REAL FIREBASE) ===
document.getElementById('loginForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  
  const loading = document.getElementById('loading');
  const submitBtn = document.querySelector('button[type="submit"]');
  
  if (loading) loading.style.display = 'flex';
  if (submitBtn) submitBtn.disabled = true;
  
  // Ambil nilai input (Pastikan ID di HTML Anda adalah 'email' dan 'password')
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  
  if (!emailInput || !passwordInput) {
    alert('⚠️ Error: Input email atau password tidak ditemukan di HTML!');
    if (loading) loading.style.display = 'none';
    if (submitBtn) submitBtn.disabled = false;
    return;
  }
  
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  
  if (!email || !password) {
    alert('Email dan password harus diisi!');
    if (loading) loading.style.display = 'none';
    if (submitBtn) submitBtn.disabled = false;
    return;
  }
  
  try {
    // ✅ PANGGIL FUNGSI REAL DARI auth-login.js
    // Fungsi ini akan menghubungi Firebase, memverifikasi, dan redirect otomatis
    await window.handleEmailLogin(email, password);
    
  } catch (error) {
    console.error('❌ Login gagal:', error);
    if (loading) loading.style.display = 'none';
    if (submitBtn) submitBtn.disabled = false;
    alert('❌ ' + error.message);
  }
});

// === FORGOT PASSWORD ===
function forgotPassword() {
  alert('Silakan hubungi Admin sekolah untuk reset password Anda');
}

// === INITIALIZE ===
window.addEventListener('DOMContentLoaded', function() {
  generateCaptcha();
  if (typeof window.handleEmailLogin !== 'function') {
    console.error('⚠️ CRITICAL: auth-login.js belum ter-load!');
  } else {
    console.log('✅ Sistem login REAL siap digunakan');
  }
});

// === BOTTOM NAVIGATION ===
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', function(e) {
    if (this.getAttribute('href') === '#') {
      e.preventDefault();
      document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
      this.classList.add('active');
    }
  });
});
