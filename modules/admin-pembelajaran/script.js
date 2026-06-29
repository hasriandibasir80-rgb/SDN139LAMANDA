// =========================================
// MODUL: ADM PEMBELAJARAN (DYNAMIC)
// =========================================

import { db } from '../../js/firebase-config.js';
import { collection, addDoc, getDocs, query, where, serverTimestamp, orderBy } 
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// 1. KEAMANAN & USER
const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
if (!currentUser.uid) {
  alert('Sesi berakhir. Silakan login kembali.');
  window.location.href = '../../index.html';
}

// 2. KONFIGURASI 9 SUB-FITUR
const SUB_FITUR_CONFIG = {
  'cp-tp-atp': { id: 'cp-tp-atp', icon: '🎯', title: 'CP, TP, & ATP', collection: 'tp_bank', fields: [
    { name: 'fase', type: 'select', label: 'Fase', options: ['A', 'B', 'C', 'D', 'E', 'F'], required: true },
    { name: 'mapel', type: 'text', label: 'Mata Pelajaran', required: true },
    { name: 'tpKode', type: 'text', label: 'Kode TP (Contoh: TP.4.1)', required: true },
    { name: 'tpTeks', type: 'textarea', label: 'Rumusan Tujuan Pembelajaran', required: true }
  ]},
  'prota': { id: 'prota', icon: '', title: 'Program Tahunan', collection: 'prota', fields: [
    { name: 'tahunAjaran', type: 'text', label: 'Tahun Ajaran', required: true },
    { name: 'mapel', type: 'text', label: 'Mata Pelajaran', required: true },
    { name: 'topik', type: 'text', label: 'Topik / Bab', required: true },
    { name: 'alokasiJP', type: 'number', label: 'Alokasi JP', required: true }
  ]},
  'promes': { id: 'promes', icon: '🗓️', title: 'Program Semester', collection: 'promes', fields: [
    { name: 'semester', type: 'select', label: 'Semester', options: ['1', '2'], required: true },
    { name: 'topik', type: 'text', label: 'Topik', required: true },
    { name: 'mingguKe', type: 'number', label: 'Minggu Ke-', required: true },
    { name: 'alokasiJP', type: 'number', label: 'Alokasi JP', required: true }
  ]},
  'modul-ajar': { id: 'modul-ajar', icon: '', title: 'Modul Ajar', collection: 'modul_ajar', fields: [
    { name: 'topik', type: 'text', label: 'Topik', required: true },
    { name: 'alokasiWaktu', type: 'text', label: 'Alokasi Waktu', required: true },
    { name: 'modelPembelajaran', type: 'text', label: 'Model Pembelajaran', required: true },
    { name: 'kegiatan', type: 'textarea', label: 'Kegiatan Pembelajaran', required: true }
  ]},
  'jurnal': { id: 'jurnal', icon: '📝', title: 'Jurnal Harian', collection: 'jurnal_harian', fields: [
    { name: 'tanggal', type: 'date', label: 'Tanggal', required: true },
    { name: 'topik', type: 'text', label: 'Topik yang Diajarkan', required: true },
    { name: 'ketercapaian', type: 'number', label: 'Ketercapaian (%)', required: true },
    { name: 'refleksi', type: 'textarea', label: 'Refleksi Harian', required: true }
  ]},
  'bank-soal': { id: 'bank-soal', icon: '', title: 'Bank Soal', collection: 'bank_soal', fields: [
    { name: 'topik', type: 'text', label: 'Topik', required: true },
    { name: 'tipeSoal', type: 'select', label: 'Tipe Soal', options: ['Pilihan Ganda', 'Isian', 'Uraian'], required: true },
    { name: 'soalTeks', type: 'textarea', label: 'Teks Soal', required: true },
    { name: 'jawabanBenar', type: 'text', label: 'Jawaban Benar', required: true }
  ]},
  'kktp': { id: 'kktp', icon: '📊', title: 'Analisis KKTP', collection: 'hasil_belajar', fields: [
    { name: 'namaSiswa', type: 'text', label: 'Nama Siswa', required: true },
    { name: 'topik', type: 'text', label: 'Topik', required: true },
    { name: 'nilai', type: 'number', label: 'Nilai', required: true },
    { name: 'kktp', type: 'number', label: 'KKTP', required: true }
  ]},
  'p5': { id: 'p5', icon: '🤝', title: 'Modul P5', collection: 'modul_p5', fields: [
    { name: 'tema', type: 'text', label: 'Tema P5', required: true },
    { name: 'topik', type: 'text', label: 'Topik', required: true },
    { name: 'alokasiWaktu', type: 'text', label: 'Alokasi Waktu', required: true },
    { name: 'tahapan', type: 'textarea', label: 'Tahapan Aktivitas', required: true }
  ]},
  'refleksi': { id: 'refleksi', icon: '🔍', title: 'Refleksi Guru', collection: 'refleksi_guru', fields: [
    { name: 'periode', type: 'select', label: 'Periode', options: ['Mingguan', 'Bulanan', 'Semester'], required: true },
    { name: 'tanggal', type: 'date', label: 'Tanggal', required: true },
    { name: 'kendala', type: 'textarea', label: 'Kendala yang Dihadapi', required: true },
    { name: 'solusi', type: 'textarea', label: 'Solusi yang Dilakukan', required: true }
  ]}
};

let activeSubFitur = null;

// 3. INISIALISASI
document.addEventListener('DOMContentLoaded', () => { renderSubMenu(); });

// 4. RENDER MENU
function renderSubMenu() {
  const container = document.getElementById('subMenuContainer');
  container.innerHTML = '';
  Object.values(SUB_FITUR_CONFIG).forEach(config => {
    const btn = document.createElement('button');
    btn.className = 'sub-menu-btn';
    btn.innerHTML = `<span class="sub-menu-icon">${config.icon}</span>${config.title}`;
    btn.onclick = () => loadSubFitur(config.id, btn);
    container.appendChild(btn);
  });
}

// 5. LOAD SUB-FITUR (DYNAMIC FORM BUILDER)
function loadSubFitur(id, clickedBtn) {
  document.querySelectorAll('.sub-menu-btn').forEach(b => b.classList.remove('active'));
  if(clickedBtn) clickedBtn.classList.add('active');

  const config = SUB_FITUR_CONFIG[id];
  activeSubFitur = config;
  const contentDiv = document.getElementById('dynamicContent');

  let formHTML = `<h3 style="margin-top:0;">📝 Form Input: ${config.title}</h3><form id="dynamicForm">`;
  config.fields.forEach(field => {
    formHTML += `<div class="form-group"><label>${field.label}</label>`;
    if (field.type === 'textarea') {
      formHTML += `<textarea name="${field.name}" class="form-control" ${field.required ? 'required' : ''}></textarea>`;
    } else if (field.type === 'select') {
      const options = field.options.map(opt => `<option value="${opt}">${opt}</option>`).join('');
      formHTML += `<select name="${field.name}" class="form-control" ${field.required ? 'required' : ''}>${options}</select>`;
    } else {
      formHTML += `<input type="${field.type}" name="${field.name}" class="form-control" ${field.required ? 'required' : ''}>`;
    }
    formHTML += `</div>`;
  });

  formHTML += `
    <div class="action-bar">
      <button type="submit" class="btn btn-save">💾 Simpan Data</button>
      <button type="button" class="btn btn-reset" onclick="document.getElementById('dynamicForm').reset()">🔄 Reset</button>
    </div>
  </form>
  <hr style="margin: 25px 0; border: 0; border-top: 1px solid #e5e7eb;">
  <h3>📋 Data Tersimpan</h3>
  <div id="dataListContainer"></div>`;

  contentDiv.innerHTML = formHTML;
  document.getElementById('dynamicForm').addEventListener('submit', handleSaveData);
  loadExistingData(config.collection);
}

// 6. SIMPAN DATA
async function handleSaveData(e) {
  e.preventDefault();
  const formData = new FormData(e.target);
  const dataToSave = Object.fromEntries(formData.entries());
  dataToSave.createdBy = currentUser.uid;
  dataToSave.createdAt = serverTimestamp();

  try {
    await addDoc(collection(db, activeSubFitur.collection), dataToSave);
    alert('✅ Data berhasil disimpan!');
    e.target.reset();
    loadExistingData(activeSubFitur.collection);
  } catch (error) {
    console.error(error);
    alert(' Gagal menyimpan: ' + error.message);
  }
}

// 7. LOAD DATA
async function loadExistingData(collectionName) {
  const container = document.getElementById('dataListContainer');
  container.innerHTML = '<p style="text-align:center;">Memuat data...</p>';

  try {
    const q = query(
      collection(db, collectionName), 
      where('createdBy', '==', currentUser.uid),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      container.innerHTML = '<p class="empty-state">Belum ada data.</p>';
      return;
    }

    let html = '';
    snapshot.forEach(doc => {
      const data = doc.data();
      const title = data.tpTeks || data.topik || data.tahunAjaran || data.namaSiswa || data.tema || 'Data';
      const desc = data.tpKode || data.alokasiJP || data.nilai || data.periode || '';
      html += `<div class="data-card"><h4>${title}</h4><p>${desc}</p></div>`;
    });
    container.innerHTML = html;
  } catch (error) {
    console.error(error);
    container.innerHTML = '<p class="empty-state">Gagal memuat data.</p>';
  }
}
