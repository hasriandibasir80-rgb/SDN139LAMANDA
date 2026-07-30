// js/auth-forgot-password.js
import { auth } from './firebase-config.js'; // Pastikan path ini sesuai dengan struktur Anda
import { sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

export class ForgotPasswordHandler {
  constructor() {
    this.modal = document.getElementById('modalLupaPassword');
    this.btnOpen = document.getElementById('btnForgotPassword');
    this.btnClose = document.getElementById('btnCloseLupaPassword');
    this.btnCancel = document.getElementById('btnCancelLupaPassword');
    this.btnSubmit = document.getElementById('btnSubmitResetEmail');
    this.emailInput = document.getElementById('resetEmailInput');
    this.messageBox = document.getElementById('lupaPasswordMessage');
    
    this.init();
  }

  init() {
    // 1. Buka Modal
    if (this.btnOpen) {
      this.btnOpen.addEventListener('click', (e) => {
        e.preventDefault();
        this.openModal();
      });
    }

    // 2. Tutup Modal
    [this.btnClose, this.btnCancel].forEach(btn => {
      if (btn) btn.addEventListener('click', () => this.closeModal());
    });

    // Tutup modal jika klik di luar area konten
    if (this.modal) {
      this.modal.addEventListener('click', (e) => {
        if (e.target === this.modal) this.closeModal();
      });
    }

    // 3. Proses Kirim Email Reset
    if (this.btnSubmit) {
      this.btnSubmit.addEventListener('click', () => this.handleResetRequest());
    }
  }

  openModal() {
    this.modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    this.emailInput.value = ''; // Reset input
    this.hideMessage();
  }

  closeModal() {
    this.modal.classList.remove('active');
    document.body.style.overflow = '';
  }

  showMessage(text, type = 'error') {
    this.messageBox.textContent = text;
    this.messageBox.style.display = 'block';
    this.messageBox.style.color = type === 'error' ? '#dc3545' : '#28a745';
    this.messageBox.style.backgroundColor = type === 'error' ? '#f8d7da' : '#d4edda';
    this.messageBox.style.padding = '10px';
    this.messageBox.style.borderRadius = '5px';
  }

  hideMessage() {
    this.messageBox.style.display = 'none';
  }

  async handleResetRequest() {
    const email = this.emailInput.value.trim();

    if (!email) {
      this.showMessage('Alamat email wajib diisi.', 'error');
      return;
    }

    // Validasi format email sederhana
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      this.showMessage('Format alamat email tidak valid.', 'error');
      return;
    }

    // Ubah state tombol menjadi loading
    const originalBtnText = this.btnSubmit.textContent;
    this.btnSubmit.textContent = 'Mengirim...';
    this.btnSubmit.disabled = true;
    this.hideMessage();

    try {
      // Panggil API Firebase untuk kirim email reset
      await sendPasswordResetEmail(auth, email);
      this.showMessage('Tautan reset password berhasil dikirim! Silakan cek inbox atau folder spam email Anda.', 'success');
      this.emailInput.value = ''; // Kosongkan setelah sukses
      
      // Opsional: Tutup modal otomatis setelah 3 detik
      setTimeout(() => this.closeModal(), 3000);
      
    } catch (error) {
      console.error("Error sending password reset email:", error);
      let errorMsg = 'Gagal mengirim tautan. Pastikan email terdaftar.';
      
      if (error.code === 'auth/user-not-found') {
        errorMsg = 'Email ini tidak terdaftar di sistem kami.';
      } else if (error.code === 'auth/invalid-email') {
        errorMsg = 'Format email yang Anda masukkan tidak valid.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMsg = 'Terlalu banyak permintaan. Silakan coba lagi nanti.';
      }
      
      this.showMessage(errorMsg, 'error');
    } finally {
      // Kembalikan state tombol
      this.btnSubmit.textContent = originalBtnText;
      this.btnSubmit.disabled = false;
    }
  }
}
