export class Captcha {
  constructor() {
    this.currentCaptcha = '';
    this.captchaEl = document.getElementById('captcha');
    this.inputEl = document.getElementById('captchaInput');
  }

  generate() {
    this.currentCaptcha = Math.floor(10000 + Math.random() * 90000).toString();
    if (this.captchaEl) this.captchaEl.textContent = this.currentCaptcha;
    return this.currentCaptcha;
  }

  validate(input) {
    return input === this.currentCaptcha;
  }

  refresh() {
    this.generate();
    if (this.inputEl) this.inputEl.value = '';
  }
}
