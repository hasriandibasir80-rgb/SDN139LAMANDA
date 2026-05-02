import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
const firebaseConfig = {
  apiKey: "AIzaSyDyRS8oVmg6euIvCo20cGpDSilDXe04Bl0",
  authDomain: "ddi-quis.firebaseapp.com",
  databaseURL: "https://ddi-quis-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "ddi-quis",
  storageBucket: "ddi-quis.firebasestorage.app",
  messagingSenderId: "907614060325",
  appId: "1:907614060325:web:f29dd9a35d9d79623ee4cc"
};

export const app = initializeApp(firebaseConfig);
