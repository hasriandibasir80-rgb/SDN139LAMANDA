// Captcha Generator
function generateCaptcha() {
  const captcha = Math.floor(10000 + Math.random() * 90000).toString();
  document.getElementById('captcha').textContent = captcha;
  return captcha;
}

function refreshCaptcha() {
  generateCaptcha();
}

// Form Submission
document.getElementById('loginForm').addEventListener('submit', function(e) {
  e.preventDefault();
  
  const loading = document.getElementById('loading');
  loading.style.display = 'flex';
  
  // Simulate login process
  setTimeout(() => {
    loading.style.display = 'none';
    alert('Login berhasil! Selamat datang di SDN 139 LAMANDA');
    // Redirect to dashboard or rumah30
    window.location.href = 'rumah30.html';
  }, 1500);
});

// Forgot Password
function forgotPassword() {
  alert('Silakan hubungi Live Chat untuk reset password Anda');
}

// Initialize captcha on load
window.onload = function() {
  generateCaptcha();
};

// Bottom Navigation Click Handler
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', function(e) {
    if (this.getAttribute('href') === '#') {
      e.preventDefault();
      document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
      this.classList.add('active');
    }
  });
});
