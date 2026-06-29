// js/controllers/login-controller.js
import { auth } from '../firebase-config.js';

export class LoginController {
  // ✅ PERBAIKAN 1: Terima instance captcha dari luar
  constructor(captchaInstance) {
    this.captcha = captchaInstance; 
    this.form = document.getElementById('loginForm');
    this.loading = document.getElementById('loading');
    this.submitBtn = this.form?.querySelector('button[type="submit"]');
  }

  init() {
    if (!this.form) return;
    this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    console.log('✅ Login controller initialized');
  }

  async handleSubmit(e) {
    e.preventDefault();
    this.showLoading(true);

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const userCaptcha = document.getElementById('captchaInput').value.trim();

    // Validasi captcha
    if (!this.captcha.validate(userCaptcha)) {
      alert('❌ Kode Captcha salah!');
      this.captcha.refresh();
      this.showLoading(false);
      return;
    }

    try {
      // ✅ PERBAIKAN 2: Gunakan fungsi login asli dari auth-login.js 
      // agar data user otomatis tersimpan di localStorage dan role terbaca.
      if (typeof window.handleEmailLogin === 'function') {
        console.log('🔐 Menggunakan sistem login utama...');
        await window.handleEmailLogin(email, password);
        
        // Beri jeda sedikit agar localStorage sempat tersimpan oleh auth-login.js
        setTimeout(() => {
          window.location.href = 'dashboard.html'; 
        }, 500);
      } else {
        // Fallback jika auth-login.js tidak ter-load (Basic Firebase Login)
        console.log('⚠️ Fallback login digunakan...');
        const { signInWithEmailAndPassword } = await import('../firebase-config.js');
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        localStorage.setItem('currentUser', JSON.stringify({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || user.email.split('@')[0],
          isDemo: false,
          isCustomId: false
        }));
        window.location.href = 'dashboard.html';
      }
    } catch (error) {
      console.error('Login failed:', error);
      alert('❌ Login gagal: ' + error.message);
      this.captcha.refresh();
      this.showLoading(false);
    }
  }

  showLoading(show) {
    if (this.loading) this.loading.style.display = show ? 'flex' : 'none';
    if (this.submitBtn) this.submitBtn.disabled = show;
  }
}
