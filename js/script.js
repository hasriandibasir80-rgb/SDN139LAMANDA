// ============================================
// FILE: js/script.js (LENGKAP - SUDAH DIPERBAIKI)
// SDN 139 LAMANDA - Login Page Script
// ============================================

// === CAPTCHA GENERATOR ===
function generateCaptcha() {
  const captcha = Math.floor(10000 + Math.random() * 90000).toString();
  document.getElementById('captcha').textContent = captcha;
  return captcha;
}

function refreshCaptcha() {
  generateCaptcha();
}

// === FORM SUBMISSION (LOGIN) ===
document.getElementById('loginForm').addEventListener('submit', function(e) {
  e.preventDefault();
  
  const loading = document.getElementById('loading');
  loading.style.display = 'flex';
  
  // Simulate login process
  setTimeout(() => {
    loading.style.display = 'none';
    alert('Login berhasil! Selamat datang di SDN 139 LAMANDA');
    
    // ==========================================
    // ✅ PERBAIKAN: SIMPAN DATA USER KE LOCALSTORAGE
    // ==========================================
    // Membuat objek data user yang memiliki 'uid' (syarat mutlak agar diterima dashboard)
    const userData = {
      uid: 'user-sdn139-' + Date.now(), 
      displayName: 'Pengguna SDN 139',
      email: 'admin@sdn139.sch.id',
      isCustomId: true
    };
    
    // Menyimpan data user ke localStorage dengan kunci 'currentUser'
    // JSON.stringify digunakan karena localStorage hanya menerima format teks (string)
    localStorage.setItem('currentUser', JSON.stringify(userData));
    // ==========================================
    // ✅ AKHIR PERBAIKAN
    // ==========================================
    
    // ✅ REDIRECT KE DASHBOARD
    window.location.href = 'dashboard.html';
  }, 1500);
});

// === FORGOT PASSWORD ===
function forgotPassword() {
  alert('Silakan hubungi Live Chat untuk reset password Anda');
}

// === INITIALIZE CAPTCHA ON PAGE LOAD ===
window.onload = function() {
  generateCaptcha();
};

// === BOTTOM NAVIGATION CLICK HANDLER ===
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', function(e) {
    if (this.getAttribute('href') === '#') {
      e.preventDefault();
      document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
      this.classList.add('active');
    }
  });
});

// ============================================
// AKHIR FILE - Tidak ada kode lain di bawah ini
// ============================================
