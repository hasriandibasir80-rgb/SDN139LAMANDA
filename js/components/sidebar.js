export class Sidebar {
  constructor() {
    this.menuBtn = document.getElementById('menuBtn');
    this.sidebar = document.getElementById('sidebar');
    this.overlay = document.getElementById('sidebarOverlay');
    this.closeBtn = document.getElementById('closeSidebar');
  }

  init() {
    if (this.menuBtn) this.menuBtn.addEventListener('click', () => this.open());
    if (this.closeBtn) this.closeBtn.addEventListener('click', () => this.close());
    if (this.overlay) this.overlay.addEventListener('click', () => this.close());
  }

  open() {
    this.sidebar?.classList.add('active');
    this.overlay?.classList.add('active');
  }

  close() {
    this.sidebar?.classList.remove('active');
    this.overlay?.classList.remove('active');
  }
}
