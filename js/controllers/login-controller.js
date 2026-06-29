import { signInWithEmailAndPassword, auth } from '../firebase-config.js';
import { Captcha } from '../components/captcha.js';

export class LoginController {
  constructor() {
    this.captcha = new Captcha();
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

    if (!this.captcha.validate(userCaptcha)) {
      alert('❌ Kode Captcha salah!');
      this.captcha.refresh();
      this.showLoading(false);
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Jika berhasil, redirect ke dashboard
      window.location.href = 'dashboard.html'; 
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
