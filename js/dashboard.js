* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
}

body {
  background: #f0f2f5;
  padding: 16px;
  min-height: 100vh;
}

.container {
  max-width: 600px;
  margin: 0 auto;
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
}

h1 {
  text-align: center;
  margin-bottom: 24px;
  color: #2c3e50;
  font-size: 1.8rem;
}

label {
  display: block;
  margin-bottom: 12px;
  font-weight: bold;
  color: #374151;
}

select, button {
  width: 100%;
  padding: 16px;
  margin-bottom: 18px;
  border: 1px solid #d1d5db;
  border-radius: 12px;
  font-size: 16px;
  outline: none;
}

button {
  background: #4CAF50;
  color: white;
  border: none;
  cursor: pointer;
  font-weight: bold;
  transition: background 0.2s;
}

button:hover {
  background: #45a049;
}

#resetBtn {
  background: #f44336;
}

#resetBtn:hover {
  background: #d32f2f;
}

#status {
  text-align: center;
  min-height: 24px;
  font-weight: bold;
  margin-bottom: 12px;
  color: #10b981;
}

.error { color: #ef4444; }

#childHouses {
  display: none;
  margin-top: 32px;
}

#childHouses h2 {
  margin-bottom: 20px;
  color: #2c3e50;
  text-align: center;
}

.house-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 16px;
}

.house-btn {
  padding: 16px 12px;
  background: #2196F3;
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  text-align: center;
  cursor: pointer;
  text-decoration: none;
  display: block;
  line-height: 1.4;
  min-height: 60px;
  transition: background 0.2s;
}

.house-btn:hover {
  background: #1976D2;
}

@media (max-width: 480px) {
  .container {
    padding: 20px 16px;
  }
  .house-grid {
    grid-template-columns: 1fr;
  }
  h1 {
    font-size: 1.6rem;
  }
}
