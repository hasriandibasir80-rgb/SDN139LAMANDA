// js/controllers/login-controller.js
import { auth, db, doc, getDoc } from '../firebase-config.js';

export class LoginController {
  // ✅ Terima instance captcha dari luar
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
      // ✅ JALUR UTAMA: Gunakan fungsi login asli dari auth-login.js 
      if (typeof window.handleEmailLogin === 'function') {
        console.log('🔐 Menggunakan sistem login utama...');
        await window.handleEmailLogin(email, password);
        // handleEmailLogin sudah menangani redirect ke dashboard.html secara internal
        return; 
      } 
      
      // ⚠️ JALUR FALLBACK: Jika auth-login.js tidak ter-load, lakukan login manual + ambil hakAkses
      console.log('⚠️ Fallback login digunakan...');
      const { signInWithEmailAndPassword } = await import('../firebase-config.js');
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // ✅ PERBAIKAN: Ambil role & hakAkses dari Firestore agar data akses tidak hilang
      let role = 'user';
      let hakAkses = [];
      try {
        const userDocRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userDocRef);
        
        if (userSnap.exists()) {
          const data = userSnap.data();
          role = data.role || 'user';
          hakAkses = data.hakAkses || [];
        }
      } catch (err) {
        console.warn('⚠️ Gagal ambil data user di fallback:', err);
      }

      // ✅ SIMPAN LENGKAP ke localStorage (termasuk role dan hakAkses)
      localStorage.setItem('currentUser', JSON.stringify({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || user.email.split('@')[0],
        role: role,
        hakAkses: hakAkses
      }));
      localStorage.setItem('userRole', role);
      localStorage.setItem('userHakAkses', JSON.stringify(hakAkses));
      
      window.location.href = 'dashboard.html';

    } catch (error) {
      console.error('Login failed:', error);
      
      const messages = {
        'auth/invalid-email': 'Format email tidak valid.',
        'auth/user-disabled': 'Akun ini telah dinonaktifkan.',
        'auth/user-not-found': 'Email tidak terdaftar.',
        'auth/wrong-password': 'Password salah.',
        'auth/invalid-credential': 'Email atau password salah.'
      };
      
      alert('❌ Login gagal: ' + (messages[error.code] || error.message));
      this.captcha.refresh();
      this.showLoading(false);
    }
  }

  showLoading(show) {
    if (this.loading) this.loading.style.display = show ? 'flex' : 'none';
    if (this.submitBtn) this.submitBtn.disabled = show;
  }
}
