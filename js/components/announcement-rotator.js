import { rtdb } from '../firebase-config.js';
import { ref, onValue } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

export class AnnouncementRotator {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.slideEl = this.container?.querySelector('.info-slide');
    this.judulEl = this.container?.querySelector('.info-judul');
    this.teksEl = this.container?.querySelector('.info-isi-running');
    this.currentIndex = 0;
    this.rotationTimer = null;
  }

  init() {
    if (!this.container) return;
    const pengumumanRef = ref(rtdb, 'config/pengumuman_login');
    onValue(pengumumanRef, (snapshot) => this.handleUpdate(snapshot));
  }

  handleUpdate(snapshot) {
    if (this.rotationTimer) clearTimeout(this.rotationTimer);
    const data = snapshot.val();
    
    if (data?.aktif !== false && Array.isArray(data?.daftar) && data.daftar.length > 0) {
      this.container.style.display = 'flex';
      this.currentIndex = 0;
      this.startRotation(data.daftar);
    } else {
      this.container.style.display = 'none';
    }
  }

  startRotation(daftar) {
    this.showSlide(daftar, this.currentIndex);
  }

  showSlide(daftar, index) {
    if (!this.slideEl || !this.judulEl || !this.teksEl) return;
    
    const item = daftar[index];
    this.slideEl.classList.add('slide-out');
    
    setTimeout(() => {
      this.judulEl.textContent = item.judul;
      this.teksEl.innerHTML = `<span>${item.isi}</span>`;
      this.slideEl.classList.remove('slide-out');
      this.slideEl.classList.add('slide-in');
      
      setTimeout(() => {
        this.slideEl.classList.remove('slide-in');
        const randomDuration = Math.floor(Math.random() * 6000) + 6000;
        this.currentIndex = (index + 1) % daftar.length;
        this.rotationTimer = setTimeout(() => this.showSlide(daftar, this.currentIndex), randomDuration);
      }, 500);
    }, 500);
  }
}
