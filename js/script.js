 {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

body {
  background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
  min-height: 100vh;
  padding-bottom: 70px;
}

/* Header */
.header {
  background: #1a1a1a;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: 0 2px 10px rgba(0,0,0,0.3);
}

.menu-btn {
  background: none;
  border: 2px solid #fff;
  color: #fff;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 18px;
}

.logo {
  height: 50px;
  object-fit: contain;
}

.logo-text {
  color: #fff;
  font-size: 24px;
  font-weight: bold;
  text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
}

.logo-text span {
  color: #FFD700;
}

/* Main Container */
.container {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px 16px;
}

.page-title {
  color: #fff;
  font-size: 24px;
  margin-bottom: 24px;
  text-align: center;
  text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
}

/* Login Form */
.login-box {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 20px;
  box-shadow: 0 8px 20px rgba(0,0,0,0.2);
}

.form-group {
  margin-bottom: 16px;
  position: relative;
}

.form-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #666;
  font-size: 18px;
}

.form-control {
  width: 100%;
  padding: 14px 14px 14px 45px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 15px;
  transition: all 0.3s;
}

.form-control:focus {
  outline: none;
  border-color: #2a5298;
  box-shadow: 0 0 0 3px rgba(42, 82, 152, 0.1);
}

.captcha-box {
  display: flex;
  gap: 10px;
  align-items: center;
}

.captcha-image {
  background: #f0f0f0;
  padding: 10px 16px;
  border-radius: 6px;
  font-size: 24px;
  font-weight: bold;
  letter-spacing: 4px;
  color: #333;
  font-family: 'Courier New', monospace;
  user-select: none;
}

.refresh-captcha {
  background: #666;
  color: #fff;
  border: none;
  padding: 10px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
}

.button-group {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 20px;
}

.btn {
  padding: 14px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
  text-transform: uppercase;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
}

.btn-secondary {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: #fff;
}

.btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
}

.btn:active {
  transform: translateY(0);
}

.wap-btn {
  display: block;
  text-align: center;
  background: #4CAF50;
  color: #fff;
  padding: 10px;
  border-radius: 6px;
  text-decoration: none;
  margin: 20px 0;
  font-weight: bold;
  transition: all 0.3s;
}

.wap-btn:hover {
  background: #45a049;
}

/* Promo Banner */
.promo-banner {
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  border-radius: 12px;
  padding: 24px;
  margin: 20px 0;
  text-align: center;
  color: #fff;
  box-shadow: 0 8px 20px rgba(0,0,0,0.2);
  position: relative;
  overflow: hidden;
}

.promo-banner::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: repeating-linear-gradient(
    45deg,
    transparent,
    transparent 10px,
    rgba(255,255,255,0.05) 10px,
    rgba(255,255,255,0.05) 20px
  );
  animation: shine 20s linear infinite;
}

@keyframes shine {
  0% { transform: translate(-50%, -50%); }
  100% { transform: translate(0, 0); }
}

.promo-title {
  font-size: 32px;
  font-weight: bold;
  margin-bottom: 8px;
  text-shadow: 3px 3px 6px rgba(0,0,0,0.3);
  position: relative;
}

.promo-subtitle {
  font-size: 14px;
  margin-bottom: 16px;
  opacity: 0.95;
  position: relative;
}

.promo-cta {
  background: #FFD700;
  color: #000;
  padding: 12px 32px;
  border-radius: 25px;
  display: inline-block;
  font-weight: bold;
  text-decoration: none;
  margin-top: 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  position: relative;
  transition: all 0.3s;
}

.promo-cta:hover {
  transform: scale(1.05);
}

/* Social Media */
.social-section {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  margin: 20px 0;
  text-align: center;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.social-title {
  color: #2a5298;
  font-size: 16px;
  margin-bottom: 16px;
  font-weight: bold;
}

.social-icons {
  display: flex;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
}

.social-icon {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 24px;
  text-decoration: none;
  transition: all 0.3s;
  box-shadow: 0 4px 8px rgba(0,0,0,0.2);
}

.social-icon:hover {
  transform: translateY(-4px) rotate(5deg);
  box-shadow: 0 6px 16px rgba(0,0,0,0.3);
}

.instagram { background: linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%); }
.facebook { background: #1877f2; }
.telegram { background: #0088cc; }
.twitter { background: #000; }
.youtube { background: #ff0000; }
.whatsapp { background: #25d366; }

/* Bottom Navigation */
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  display: flex;
  justify-content: space-around;
  padding: 8px 0;
  box-shadow: 0 -2px 10px rgba(0,0,0,0.1);
  z-index: 100;
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-decoration: none;
  color: #666;
  padding: 4px 12px;
  transition: all 0.3s;
}

.nav-item:hover, .nav-item.active {
  color: #2a5298;
}

.nav-icon {
  font-size: 24px;
  margin-bottom: 2px;
}

.nav-label {
  font-size: 11px;
  font-weight: 600;
}

/* Responsive */
@media (max-width: 480px) {
  .button-group {
    grid-template-columns: 1fr;
  }
  
  .promo-title {
    font-size: 24px;
  }
  
  .social-icon {
    width: 45px;
    height: 45px;
    font-size: 20px;
  }
}

/* Loading Animation */
.loading {
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.7);
  z-index: 9999;
  justify-content: center;
  align-items: center;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 5px solid #fff;
  border-top: 5px solid #2a5298;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
