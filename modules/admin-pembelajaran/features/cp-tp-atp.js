// modules/admin-pembelajaran/features/cp-tp-atp.js
// ==========================================================================
// FITUR: CP, TP, & ATP GENERATOR (UNIVERSAL)
// REVISI:
// 1. Perbaikan teks bocor ke UI & validasi user pada loadCTAData.
// 2. Penambahan fitur sinkronisasi manual ke Global Monitoring (Master Data TP).
// 3. AUTO-SAVE CP ke Master Data CP (data_cp collection).
// ==========================================================================

import { db } from '../../../js/firebase-config.js';
import { 
    collection, addDoc, query, where, orderBy, onSnapshot, 
    serverTimestamp, doc, getDoc 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');

// Konfigurasi Groq API
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';
let groqApiKey = null;
let lastGeneratedData = null; // ⭐ Menyimpan data hasil generate untuk sinkronisasi [2]

const CSS_PATH = '../../../css/modules/cp-generator.css';
const CSS_ID = 'cp-generator-css';

/**
 * Init - Dipanggil oleh main.js
 */
export async function init(container) {
    loadFeatureCSS();
    await loadGroqApiKey();
    renderCTAGenerator(container);
    attachEventListeners(container);
    loadCTAData(container);
}

/**
 * Cleanup - Membersihkan CSS saat modul berpindah
 */
export function cleanup() {
    const cssLink = document.getElementById(CSS_ID);
    if (cssLink) cssLink.remove();
}

function loadFeatureCSS() {
    if (document.getElementById(CSS_ID)) return;
    const cssLink = document.createElement('link');
    cssLink.rel = 'stylesheet';
    cssLink.href = CSS_PATH;
    cssLink.id = CSS_ID;
    document.head.appendChild(cssLink);
}

async function loadGroqApiKey() {
    try {
        // Ambil API Key dari koleksi settings/groq di Firestore
        const settingsRef = doc(db, 'settings', 'groq');
        const docSnap = await getDoc(settingsRef);
        if (docSnap.exists()) {
            groqApiKey = docSnap.data().apiKey;
        }
    } catch (error) {
        console.error("Gagal memuat Groq API Key:", error);
    }
}

/**
 * RENDER UI
 */
function renderCTAGenerator(container) {
    const userNama = currentUser.namaLengkap || 'Guru';
    const userSekolah = currentUser.namaSekolah || 'SDN 139 LAMANDA';

    container.innerHTML = `
        <div class="cta-container">
            <div class="cta-header">
                <h3>CP, TP, & ATP Generator AI</h3>
                <p>Pengguna: <strong>${userNama}</strong> | ${userSekolah}</p>
            </div>
            
            <div class="cta-form-grid">
                <div class="form-group">
                    <label>Mata Pelajaran</label>
                    <input type="text" id="input-mapel" placeholder="Contoh: Matematika">
                </div>
                <div class="form-group">
                    <label>Fase</label>
                    <input type="text" id="input-fase" placeholder="Contoh: Fase A">
                </div>
                <div class="form-group">
                    <label>Elemen</label>
                    <input type="text" id="input-elemen" placeholder="Contoh: Bilangan">
                </div>
                <button id="btn-generate-ai" class="btn-primary">Generate dengan AI</button>
            </div>

            <div id="ai-result-area" class="result-card hidden">
                <h4>Hasil Penyusunan:</h4>
                <div id="ai-content" class="content-preview"></div>
                <div class="cta-actions">
                    <button id="btn-sync-tp" class="btn-success">
                        <i class="fas fa-sync"></i> Sinkronkan ke Data TP
                    </button>
                </div>
            </div>

            <div class="history-section">
                <h4>Riwayat Penyusunan (Master Data CP)</h4>
                <div id="cta-history-list">Memuat riwayat...</div>
            </div>
        </div>
    `;
}

/**
 * EVENT LISTENERS
 */
function attachEventListeners(container) {
    const btnGenerate = container.querySelector('#btn-generate-ai');
    const btnSyncTP = container.querySelector('#btn-sync-tp');

    btnGenerate.addEventListener('click', () => handleAIGenerate(container));
    
    // Fitur Sinkronisasi Manual ke Data TP [1]
    btnSyncTP.addEventListener('click', () => {
        if (lastGeneratedData) {
            simpanKeDataTP(lastGeneratedData);
        } else {
            alert("Tidak ada data untuk disinkronkan.");
        }
    });
}

/**
 * LOGIKA AI & AUTO-SAVE CP
 */
async function handleAIGenerate(container) {
    const mapel = document.getElementById('input-mapel').value;
    const fase = document.getElementById('input-fase').value;
    const elemen = document.getElementById('input-elemen').value;

    if (!mapel || !fase || !elemen) return alert("Mohon lengkapi semua data!");
    if (!groqApiKey) return alert("API Key belum terkonfigurasi. Hubungi Admin.");

    const resultArea = container.querySelector('#ai-result-area');
    const contentArea = container.querySelector('#ai-content');
    
    contentArea.innerHTML = "<em>Sedang menyusun data menggunakan AI...</em>";
    resultArea.classList.remove('hidden');

    try {
        const response = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${groqApiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: GROQ_MODEL,
                messages: [{
                    role: "user",
                    content: `Buatkan CP, TP, dan ATP untuk Mata Pelajaran ${mapel}, ${fase}, pada elemen ${elemen}. Format rapi.`
                }]
            })
        });

        const data = await response.json();
        const aiResponse = data.choices.message.content;

        lastGeneratedData = {
            mapel, fase, elemen,
            content: aiResponse,
            guru: currentUser.namaLengkap,
            uid: currentUser.uid
        };

        contentArea.innerHTML = `<div class="formatted-text">${aiResponse.replace(/\n/g, '<br>')}</div>`;
        
        // AUTO-SAVE CP ke Master Data CP (koleksi data_cp) [1]
        await autoSaveCP(lastGeneratedData);

    } catch (error) {
        console.error("AI Error:", error);
        contentArea.innerHTML = "<span class='error'>Gagal memproses data. Silakan coba lagi.</span>";
    }
}

/**
 * SINKRONISASI KE DATA TP (Global Monitoring)
 */
async function simpanKeDataTP(data) {
    try {
        // Menyimpan ke koleksi 'master_data_tp' agar muncul di sub fitur Data TP
        await addDoc(collection(db, 'master_data_tp'), {
            mapel: data.mapel,
            fase: data.fase,
            elemen: data.elemen,
            rincian_tp: data.content,
            namaGuru: data.guru,
            uid: data.uid,
            sekolah: currentUser.namaSekolah,
            sumber: 'AI Generator',
            timestamp: serverTimestamp()
        });

        alert("Berhasil disinkronkan ke Master Data TP (Global Monitoring)!");
    } catch (error) {
        console.error("Gagal sinkronisasi TP:", error);
        alert("Gagal sinkronisasi data.");
    }
}

/**
 * AUTO-SAVE KE MASTER CP
 */
async function autoSaveCP(data) {
    try {
        await addDoc(collection(db, 'data_cp'), {
            mapel: data.mapel,
            fase: data.fase,
            elemen: data.elemen,
            isi_cp: data.content,
            created_by: data.guru,
            uid: data.uid,
            timestamp: serverTimestamp()
        });
        console.log("CP Otomatis tersimpan ke Master Data CP.");
    } catch (error) {
        console.error("Auto-save CP gagal:", error);
    }
}

/**
 * LOAD DATA RIWAYAT (Dengan Validasi User) [1]
 */
function loadCTAData(container) {
    const listContainer = container.querySelector('#cta-history-list');
    
    // Validasi: Hanya ambil data milik user yang sedang login
    const q = query(
        collection(db, 'data_cp'), 
        where('uid', '==', currentUser.uid),
        orderBy('timestamp', 'desc')
    );

    onSnapshot(q, (snapshot) => {
        if (snapshot.empty) {
            listContainer.innerHTML = "<p class='empty-state'>Belum ada riwayat penyusunan.</p>";
            return;
        }

        listContainer.innerHTML = snapshot.docs.map(doc => {
            const d = doc.data();
            const tgl = d.timestamp?.toDate().toLocaleDateString('id-ID') || '-';
            return `
                <div class="history-item">
                    <div class="hist-info">
                        <strong>${d.mapel} (${d.fase})</strong>
                        <span>Elemen: ${d.elemen}</span>
                        <small>Tanggal: ${tgl}</small>
                    </div>
                </div>
            `;
        }).join('');
    });
}
