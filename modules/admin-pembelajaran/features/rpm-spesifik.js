// modules/admin-pembelajaran/features/rpm-spesifik.js
// =========================================
// FITUR: RPM SPESIFIK (Rencana Pembelajaran Mendalam)
// TEMPLATE KHUSUS PER METODE PEMBELAJARAN
// TERINTEGRASI: Firestore, AI Groq, Data Mapel JSON
// =========================================

import { db } from '../../../js/firebase-config.js';
import { 
  collection, addDoc, getDocs, query, where, orderBy, 
  onSnapshot, doc, updateDoc, deleteDoc, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');

// Groq API Configuration
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';
let groqApiKey = null;

const CSS_ID = 'rpm-spesifik-css';
let currentEditId = null;
let dataMapel = [];

// Default Tanda Tangan
const DEFAULT_TTD = {
  namaKepsek: 'Imam Munandar SP.d',
  nipKepsek: '198512192011011007',
  namaGuru: 'Hasriandi Basir SP.d',
  nipGuru: '198110182025211059'
};

// Fallback Data Mapel
const FALLBACK_MAPEL = [
  { id: 'paibd', nama: 'Pendidikan Agama Islam dan Budi Pekerti', singkatan: 'PAIBD', icon: '🕌' },
  { id: 'matematika', nama: 'Matematika', singkatan: 'Matematika', icon: '' },
  { id: 'ipas', nama: 'IPAS', singkatan: 'IPAS', icon: '🔬' },
  { id: 'pjok', nama: 'PJOK', singkatan: 'PJOK', icon: '' },
  { id: 'bahasa-indonesia', nama: 'Bahasa Indonesia', singkatan: 'Bhs.Indonesia', icon: '📖' },
  { id: 'pendidikan-pancasila', nama: 'Pendidikan Pancasila', singkatan: 'Pendidikan Pancasila', icon: '🇮🇩' },
  { id: 'seni-budaya', nama: 'Seni dan Budaya', singkatan: 'Seni dan Budaya', icon: '🎨' },
  { id: 'bahasa-inggris', nama: 'Bahasa Inggris', singkatan: 'Bhs.Inggris', icon: '🇬🇧' },
  { id: 'coding-kka', nama: 'Coding/KKA', singkatan: 'Coding/KKA', icon: '💻' },
  { id: 'bahasa-ibu', nama: 'Bahasa Ibu', singkatan: 'Bhs.Ibu', icon: '🗣️' },
  { id: 'bta', nama: 'BTA', singkatan: 'BTA', icon: '📿' }
];

// Template Langkah Pembelajaran per Metode
const METODE_TEMPLATES = {
  'Project Based Learning (PjBL)': {
    nama: 'Project Based Learning (PjBL)',
    deskripsi: 'Pembelajaran berbasis proyek dengan menghasilkan produk nyata',
    langkah: [
      { judul: 'Pertemuan 1: Penentuan Pertanyaan Mendasar', memahami: 'Guru menyampaikan pertanyaan mendasar yang memicu rasa ingin tahu siswa tentang topik proyek. Siswa diajak mengidentifikasi masalah nyata yang relevan dengan kehidupan mereka.', mengaplikasikan: 'Siswa bekerja dalam kelompok untuk merancang rencana proyek, menentukan produk yang akan dibuat, dan membagi tugas. Guru memfasilitasi diskusi dan memberikan scaffolding.', merefleksikan: 'Siswa merefleksikan pemahaman awal mereka tentang topik proyek dan menuliskan pertanyaan yang ingin mereka jawab melalui proyek ini.' },
      { judul: 'Pertemuan 2: Mendesain Perencanaan Proyek', memahami: 'Siswa mempelajari konsep dan teori yang mendukung proyek mereka melalui berbagai sumber (buku, video, wawancara).', mengaplikasikan: 'Siswa membuat timeline proyek, daftar bahan/alat yang dibutuhkan, dan kriteria keberhasilan produk. Guru memonitor perkembangan perencanaan.', merefleksikan: 'Siswa mengevaluasi kesiapan mereka untuk memulai proyek dan mengidentifikasi tantangan yang mungkin dihadapi.' },
      { judul: 'Pertemuan 3-4: Menyusun Jadwal & Monitoring', memahami: 'Siswa mulai melaksanakan proyek sesuai rencana. Mereka mengumpulkan data, melakukan eksperimen, atau membuat draft produk.', mengaplikasikan: 'Guru melakukan monitoring berkala, memberikan feedback, dan membantu mengatasi hambatan. Siswa mendokumentasikan proses kerja mereka.', merefleksikan: 'Siswa mencatat progres yang dicapai, masalah yang dihadapi, dan solusi yang diterapkan.' },
      { judul: 'Pertemuan 5: Menguji Hasil & Presentasi', memahami: 'Siswa menyelesaikan produk proyek dan melakukan uji coba atau validasi hasil.', mengaplikasikan: 'Siswa mempresentasikan hasil proyek di depan kelas, menjawab pertanyaan dari teman dan guru. Mereka menjelaskan proses, hasil, dan pembelajaran yang didapat.', merefleksikan: 'Siswa melakukan self-assessment dan peer-assessment terhadap kualitas produk dan proses kerja.' }
    ]
  },
  'Problem Based Learning (PBL)': {
    nama: 'Problem Based Learning (PBL)',
    deskripsi: 'Pembelajaran berbasis masalah dengan fokus pada pemecahan masalah kompleks',
    langkah: [
      { judul: 'Pertemuan 1: Orientasi pada Masalah', memahami: 'Guru menyajikan masalah autentik dan kompleks yang relevan dengan kehidupan siswa. Masalah disajikan dalam bentuk studi kasus atau skenario nyata.', mengaplikasikan: 'Siswa dalam kelompok mengidentifikasi apa yang mereka ketahui (known), apa yang perlu mereka ketahui (need to know), dan ide solusi awal.', merefleksikan: 'Siswa menuliskan pertanyaan-pertanyaan kunci yang perlu dijawab untuk memecahkan masalah.' },
      { judul: 'Pertemuan 2: Organisasi Belajar', memahami: 'Siswa melakukan brainstorming hipotesis dan kemungkinan solusi. Mereka mengorganisir ide-ide yang muncul.', mengaplikasikan: 'Siswa membagi tugas penelitian, menentukan sumber informasi yang akan digunakan, dan merencanakan strategi pengumpulan data.', merefleksikan: 'Siswa mengevaluasi pemahaman mereka tentang masalah dan mengidentifikasi gap pengetahuan.' },
      { judul: 'Pertemuan 3-4: Penyelidikan Mandiri', memahami: 'Siswa secara mandiri atau berkelompok mencari informasi dari berbagai sumber (buku, internet, wawancara, observasi).', mengaplikasikan: 'Siswa menganalisis informasi yang didapat, menguji hipotesis, dan mengembangkan solusi. Guru memfasilitasi diskusi dan memberikan scaffolding.', merefleksikan: 'Siswa mencatat temuan penting dan merevisi pemahaman mereka berdasarkan informasi baru.' },
      { judul: 'Pertemuan 5: Analisis & Presentasi Solusi', memahami: 'Siswa mensintesis informasi dan mengembangkan solusi final untuk masalah yang diberikan.', mengaplikasikan: 'Siswa mempresentasikan solusi mereka dengan argumen yang didukung bukti. Kelompok lain memberikan feedback dan pertanyaan kritis.', merefleksikan: 'Siswa merefleksikan proses pemecahan masalah, efektivitas solusi, dan pembelajaran yang didapat.' }
    ]
  },
  'Discovery Learning': {
    nama: 'Discovery Learning',
    deskripsi: 'Pembelajaran penemuan di mana siswa membangun pemahaman melalui eksplorasi',
    langkah: [
      { judul: 'Pertemuan 1: Stimulation (Pemberian Rangsangan)', memahami: 'Guru memberikan stimulus berupa pertanyaan, gambar, video, atau fenomena yang memicu rasa ingin tahu siswa. Siswa diajak mengamati dan mencatat hal-hal menarik.', mengaplikasikan: 'Siswa dalam kelompok mendiskusikan stimulus dan mengidentifikasi pola atau hubungan yang mereka lihat.', merefleksikan: 'Siswa menuliskan pertanyaan-pertanyaan yang muncul dari hasil pengamatan mereka.' },
      { judul: 'Pertemuan 2: Problem Statement (Pernyataan Masalah)', memahami: 'Siswa merumuskan masalah atau hipotesis berdasarkan stimulus yang diberikan.', mengaplikasikan: 'Siswa dalam kelompok menyepakati masalah yang akan diselidiki dan merencanakan cara menguji hipotesis mereka.', merefleksikan: 'Siswa mengevaluasi apakah masalah yang dirumuskan sudah jelas dan dapat diselidiki.' },
      { judul: 'Pertemuan 3: Data Collection (Pengumpulan Data)', memahami: 'Siswa melakukan eksperimen, observasi, atau penelitian untuk mengumpulkan data yang relevan.', mengaplikasikan: 'Siswa mencatat data secara sistematis, menggunakan alat ukur yang tepat, dan memastikan validitas data.', merefleksikan: 'Siswa memeriksa kelengkapan dan keakuratan data yang telah dikumpulkan.' },
      { judul: 'Pertemuan 4: Data Processing (Pengolahan Data)', memahami: 'Siswa mengolah dan menganalisis data yang telah dikumpulkan menggunakan metode yang sesuai.', mengaplikasikan: 'Siswa membuat tabel, grafik, atau diagram untuk memvisualisasikan data. Mereka mencari pola dan hubungan antar variabel.', merefleksikan: 'Siswa mengevaluasi apakah hasil pengolahan data mendukung atau menolak hipotesis awal.' },
      { judul: 'Pertemuan 5: Verification & Generalization', memahami: 'Siswa memverifikasi hasil temuan mereka dengan membandingkan dengan teori atau sumber lain.', mengaplikasikan: 'Siswa membuat kesimpulan umum (generalisasi) dari hasil penemuan mereka dan mempresentasikan kepada kelas.', merefleksikan: 'Siswa merefleksikan proses penemuan, kesulitan yang dihadapi, dan konsep baru yang mereka pahami.' }
    ]
  },
  'Game-Based Learning': {
    nama: 'Game-Based Learning',
    deskripsi: 'Pembelajaran berbasis permainan yang menyenangkan dan edukatif',
    langkah: [
      { judul: 'Pertemuan 1: Pengenalan Konsep & Aturan Permainan', memahami: 'Guru memperkenalkan konsep pembelajaran melalui game. Siswa mempelajari aturan, tujuan, dan mekanisme permainan.', mengaplikasikan: 'Siswa berlatih memainkan game dalam kelompok kecil untuk memahami alur dan strategi dasar.', merefleksikan: 'Siswa menuliskan pemahaman mereka tentang hubungan antara game dan materi pembelajaran.' },
      { judul: 'Pertemuan 2-3: Bermain & Eksplorasi', memahami: 'Siswa bermain game secara intensif, mengeksplorasi berbagai strategi dan pendekatan untuk mencapai tujuan.', mengaplikasikan: 'Siswa bekerja sama dalam tim, berdiskusi strategi, dan saling membantu. Guru memonitor perkembangan dan memberikan hints jika diperlukan.', merefleksikan: 'Siswa mencatat strategi yang berhasil dan yang gagal, serta pembelajaran yang didapat dari setiap ronde permainan.' },
      { judul: 'Pertemuan 4: Analisis & Diskusi', memahami: 'Siswa menganalisis pengalaman bermain mereka dan mengidentifikasi konsep-konsep pembelajaran yang terkandung dalam game.', mengaplikasikan: 'Siswa berdiskusi dalam kelompok tentang hubungan antara mekanisme game dengan materi pelajaran. Mereka membuat catatan konseptual.', merefleksikan: 'Siswa merefleksikan bagaimana game membantu mereka memahami materi dengan cara yang menyenangkan.' },
      { judul: 'Pertemuan 5: Presentasi & Aplikasi', memahami: 'Siswa mempresentasikan pembelajaran mereka dari game dan bagaimana konsep tersebut dapat diterapkan dalam konteks nyata.', mengaplikasikan: 'Siswa membuat proyek kecil atau menyelesaikan tantangan yang mengaitkan konsep dari game dengan situasi dunia nyata.', merefleksikan: 'Siswa melakukan self-assessment tentang pemahaman mereka dan bagaimana game mempengaruhi motivasi belajar mereka.' }
    ]
  },
  'Inquiry Learning': {
    nama: 'Inquiry Learning',
    deskripsi: 'Pembelajaran inkuiri yang menekankan pada proses bertanya dan menyelidiki',
    langkah: [
      { judul: 'Pertemuan 1: Merumuskan Pertanyaan Inkuiri', memahami: 'Guru menyajikan fenomena atau topik yang memicu rasa ingin tahu. Siswa diajak mengajukan pertanyaan-pertanyaan inkuiri yang mendalam.', mengaplikasikan: 'Siswa dalam kelompok memilih satu pertanyaan inkuiri yang akan diselidiki dan merumuskan hipotesis awal.', merefleksikan: 'Siswa mengevaluasi apakah pertanyaan mereka cukup fokus dan dapat diselidiki.' },
      { judul: 'Pertemuan 2: Merancang Penyelidikan', memahami: 'Siswa mempelajari metode penelitian yang sesuai untuk menjawab pertanyaan inkuiri mereka.', mengaplikasikan: 'Siswa merancang prosedur penyelidikan, menentukan variabel, alat, dan bahan yang dibutuhkan. Guru memberikan feedback terhadap rancangan.', merefleksikan: 'Siswa memprediksi hasil yang mungkin didapat dan mengidentifikasi potensi kendala.' },
      { judul: 'Pertemuan 3-4: Melakukan Penyelidikan', memahami: 'Siswa melaksanakan penyelidikan sesuai rancangan, mengumpulkan data dan bukti secara sistematis.', mengaplikasikan: 'Siswa bekerja dalam tim, saling membantu, dan mendokumentasikan setiap tahap proses. Guru memfasilitasi dan memberikan scaffolding.', merefleksikan: 'Siswa mencatat observasi, temuan tak terduga, dan pertanyaan baru yang muncul selama penyelidikan.' },
      { judul: 'Pertemuan 5: Analisis & Kesimpulan', memahami: 'Siswa menganalisis data dan bukti yang telah dikumpulkan untuk menjawab pertanyaan inkuiri.', mengaplikasikan: 'Siswa membuat kesimpulan yang didukung bukti, mempresentasikan hasil penyelidikan, dan menjawab pertanyaan dari audiens.', merefleksikan: 'Siswa merefleksikan proses inkuiri, validitas kesimpulan, dan pembelajaran yang didapat tentang cara memperoleh pengetahuan.' }
    ]
  },
  'Cooperative Learning': {
    nama: 'Cooperative Learning',
    deskripsi: 'Pembelajaran kooperatif dengan kerja sama tim dan interdependensi positif',
    langkah: [
      { judul: 'Pertemuan 1: Pembentukan Tim & Goal Setting', memahami: 'Guru menjelaskan prinsip-prinsip cooperative learning dan membentuk kelompok heterogen (4-5 siswa).', mengaplikasikan: 'Siswa dalam tim saling mengenal, menetapkan norma kelompok, dan menyepakati tujuan pembelajaran bersama.', merefleksikan: 'Siswa menuliskan harapan mereka terhadap kerja sama tim dan kontribusi yang akan mereka berikan.' },
      { judul: 'Pertemuan 2: Pembelajaran Konsep Dasar', memahami: 'Guru menyampaikan materi dasar atau siswa mempelajari materi melalui sumber yang disediakan.', mengaplikasikan: 'Siswa dalam tim menggunakan strategi Jigsaw atau Think-Pair-Share untuk memastikan semua anggota memahami konsep dasar.', merefleksikan: 'Siswa mengevaluasi pemahaman individu dan mengidentifikasi bagian yang masih perlu dipelajari.' },
      { judul: 'Pertemuan 3-4: Tugas Kelompok & Interdependensi', memahami: 'Siswa mengerjakan tugas kelompok yang memerlukan kontribusi setiap anggota (interdependensi positif).', mengaplikasikan: 'Siswa saling mengajar (peer teaching), saling membantu, dan memastikan semua anggota menguasai materi. Guru memonitor dinamika kelompok.', merefleksikan: 'Siswa mencatat bagaimana kerja sama tim membantu pembelajaran mereka dan tantangan yang dihadapi.' },
      { judul: 'Pertemuan 5: Evaluasi Kelompok & Refleksi', memahami: 'Siswa mempresentasikan hasil kerja kelompok atau mengikuti evaluasi individu dan kelompok.', mengaplikasikan: 'Siswa melakukan peer evaluation dan group processing, memberikan feedback konstruktif kepada anggota tim.', merefleksikan: 'Siswa merefleksikan efektivitas kerja sama tim, keterampilan sosial yang dikembangkan, dan pembelajaran tentang kolaborasi.' }
    ]
  }
};

export async function init(container, db) {
  loadCSS();
  await loadGroqApiKey();
  await loadMataPelajaran();
  renderUI(container);
  attachEvents(container);
  loadTTDDefaults();
  loadRPMList(container);
}

export function cleanup() {
  const css = document.getElementById(CSS_ID);
  if (css) css.remove();
}

async function loadGroqApiKey() {
  try {
    const { doc, getDoc } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
    const docRef = doc(db, 'settings', 'api_key');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data.keys) {
        const activeKeys = Object.values(data.keys).filter(k => k.active === true);
        if (activeKeys.length > 0) groqApiKey = activeKeys[0].value;
      }
    }
  } catch (error) {
    console.error('Error loading API key:', error);
  }
}

async function loadMataPelajaran() {
  const possiblePaths = [
    '../../../assets/data-mapel.json',
    '/SDN139LAMANDA/assets/data-mapel.json',
    '/assets/data-mapel.json',
    './assets/data-mapel.json',
    '../assets/data-mapel.json',
    '../../assets/data-mapel.json'
  ];
  
  for (const path of possiblePaths) {
    try {
      const response = await fetch(path);
      if (!response.ok) continue;
      const data = await response.json();
      dataMapel = data.mataPelajaran || [];
      if (dataMapel.length > 0) {
        console.log(`✅ Data mapel berhasil dimuat: ${dataMapel.length} mapel`);
        return;
      }
    } catch (error) {
      continue;
    }
  }
  
  console.warn('⚠️ Menggunakan data mapel fallback');
  dataMapel = FALLBACK_MAPEL;
}

function loadCSS() {
  if (document.getElementById(CSS_ID)) return;
  const style = document.createElement('style');
  style.id = CSS_ID;
  style.textContent = `
    .rpm-container { background: linear-gradient(135deg, #fce7f3 0%, #fbcfe8 50%, #e0e7ff 100%); border-radius: 16px; padding: 25px; font-family: 'Segoe UI', sans-serif; max-width: 1200px; margin: 0 auto; box-shadow: 0 8px 24px rgba(236, 72, 153, 0.15); }
    .rpm-header { background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); color: white; padding: 30px; border-radius: 12px; margin-bottom: 25px; box-shadow: 0 4px 12px rgba(236, 72, 153, 0.3); }
    .rpm-header h2 { margin: 0 0 8px 0; font-size: 28px; font-weight: 700; }
    .rpm-header p { margin: 0; opacity: 0.95; font-size: 15px; }
    .rpm-tabs { display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap; }
    .rpm-tab { padding: 12px 24px; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 14px; background: white; color: #be185d; transition: all 0.2s; }
    .rpm-tab.active { background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); color: white; }
    .rpm-section { background: white; padding: 25px; border-radius: 12px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(236, 72, 153, 0.1); }
    .rpm-section-title { font-size: 18px; font-weight: 700; color: #be185d; margin: 0 0 15px 0; padding-bottom: 10px; border-bottom: 3px solid #fce7f3; }
    .rpm-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px; }
    .rpm-form-group { margin-bottom: 15px; }
    .rpm-form-group label { display: block; margin-bottom: 6px; font-weight: 600; font-size: 13px; color: #831843; }
    .rpm-form-control { width: 100%; padding: 12px 14px; border: 2px solid #fbcfe8; border-radius: 8px; font-size: 14px; box-sizing: border-box; background: white; color: #831843; font-family: inherit; }
    .rpm-form-control:focus { outline: none; border-color: #ec4899; box-shadow: 0 0 0 3px rgba(236, 72, 153, 0.15); }
    textarea.rpm-form-control { resize: vertical; min-height: 80px; }
    select.rpm-form-control { cursor: pointer; }
    .rpm-btn { padding: 12px 24px; border: none; border-radius: 8px; font-weight: 600; font-size: 14px; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; transition: all 0.2s; color: white; }
    .rpm-btn:hover { transform: translateY(-2px); }
    .rpm-btn-primary { background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); }
    .rpm-btn-success { background: linear-gradient(135deg, #10b981 0%, #059669 100%); }
    .rpm-btn-warning { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); }
    .rpm-btn-danger { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); }
    .rpm-btn-secondary { background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%); }
    .rpm-actions { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 20px; justify-content: center; }
    .rpm-list { margin-top: 20px; }
    .rpm-item { background: linear-gradient(135deg, #fff1f2 0%, #fce7f3 100%); padding: 15px; border-radius: 10px; margin-bottom: 10px; border-left: 4px solid #ec4899; }
    .rpm-item-header { display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px; flex-wrap: wrap; gap: 5px; }
    .rpm-item-title { font-weight: 700; color: #be185d; font-size: 15px; }
    .rpm-item-meta { font-size: 12px; color: #64748b; }
    .rpm-item-actions { display: flex; gap: 5px; }
    .rpm-item-actions button { padding: 6px 12px; font-size: 12px; border: none; border-radius: 6px; cursor: pointer; color: white; }
    .rpm-empty { text-align: center; padding: 30px; color: #64748b; background: white; border-radius: 10px; }
    .rpm-loading { text-align: center; padding: 20px; color: #831843; }
    .rpm-badge { display: inline-block; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; }
    .rpm-badge-spesifik { background: #ddd6fe; color: #5b21b6; }
    .rpm-toast { position: fixed; top: 20px; right: 20px; padding: 14px 24px; border-radius: 10px; z-index: 10001; color: white; font-weight: 600; box-shadow: 0 4px 16px rgba(0,0,0,0.15); animation: rpmSlideIn 0.3s ease; }
    .rpm-toast-success { background: linear-gradient(135deg, #10b981 0%, #059669 100%); }
    .rpm-toast-error { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); }
    @keyframes rpmSlideIn { from { transform: translateX(400px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    .metode-info { background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 15px; border-radius: 10px; border-left: 4px solid #f59e0b; margin-bottom: 20px; }
    .metode-info h4 { margin: 0 0 8px 0; color: #92400e; }
    .metode-info p { margin: 0; color: #78350f; font-size: 14px; }
    @media (max-width: 768px) { .rpm-form-grid { grid-template-columns: 1fr; } .rpm-actions { flex-direction: column; } .rpm-btn { width: 100%; justify-content: center; } }
  `;
  document.head.appendChild(style);
}

function renderUI(container) {
  const aiReady = groqApiKey ? '✅ AI Siap' : '⚠️ API Key Belum Aktif';
  const aiStatusClass = groqApiKey ? 'rpm-badge-spesifik' : '';
  
  let mapelOptions = '<option value="">-- Pilih Mapel --</option>';
  dataMapel.forEach(m => {
    mapelOptions += `<option value="${m.nama}">${m.icon} ${m.singkatan}</option>`;
  });

  let metodeOptions = '<option value="">-- Pilih Metode Pembelajaran --</option>';
  Object.keys(METODE_TEMPLATES).forEach(metode => {
    metodeOptions += `<option value="${metode}">${metode}</option>`;
  });

  container.innerHTML = `
    <div class="rpm-container">
      <div class="rpm-header">
        <h2>🎯 RPM Spesifik</h2>
        <p>Rencana Pembelajaran Mendalam - Template Khusus per Metode Pembelajaran 
          <span class="rpm-badge ${aiStatusClass}" style="margin-left: 10px;">${aiReady}</span>
        </p>
      </div>

      <div class="rpm-tabs">
        <button class="rpm-tab active" data-tab="form">📝 Buat/Edit RPM</button>
        <button class="rpm-tab" data-tab="list">📚 RPM Tersimpan</button>
      </div>

      <div id="rpm-form-section">
        <div class="rpm-section">
          <h3 class="rpm-section-title">📋 1. Identitas Dokumen</h3>
          <div class="rpm-form-grid">
            <div class="rpm-form-group">
              <label>🏫 Sekolah</label>
              <input type="text" id="rpm-sekolah" class="rpm-form-control" value="${currentUser.namaSekolah || 'SDN 139 LAMANDA'}">
            </div>
            <div class="rpm-form-group">
              <label>👩‍🏫 Nama Guru</label>
              <input type="text" id="rpm-guru" class="rpm-form-control" value="${DEFAULT_TTD.namaGuru}">
            </div>
          </div>
          <div class="rpm-form-grid">
            <div class="rpm-form-group">
              <label> Mata Pelajaran</label>
              <select id="rpm-mapel" class="rpm-form-control">${mapelOptions}</select>
            </div>
            <div class="rpm-form-group">
              <label>🎓 Kelas / Fase</label>
              <select id="rpm-kelas" class="rpm-form-control">
                <option value="">-- Pilih --</option>
                <option value="1|A">Kelas 1 (Fase A)</option>
                <option value="2|A">Kelas 2 (Fase A)</option>
                <option value="3|B">Kelas 3 (Fase B)</option>
                <option value="4|B">Kelas 4 (Fase B)</option>
                <option value="5|C">Kelas 5 (Fase C)</option>
                <option value="6|C">Kelas 6 (Fase C)</option>
              </select>
            </div>
          </div>
          <div class="rpm-form-grid">
            <div class="rpm-form-group">
              <label>📝 Topik / Materi</label>
              <input type="text" id="rpm-topik" class="rpm-form-control" placeholder="Contoh: Bagian Tubuh Tumbuhan">
            </div>
            <div class="rpm-form-group">
              <label>⏰ Alokasi Waktu</label>
              <input type="text" id="rpm-alokasi" class="rpm-form-control" placeholder="Contoh: 4 Pertemuan (8 x 35 Menit)">
            </div>
          </div>
          <div class="rpm-form-group">
            <label>🎨 Metode Pembelajaran</label>
            <select id="rpm-metode" class="rpm-form-control">${metodeOptions}</select>
          </div>
          <div id="metode-info-container"></div>
        </div>

        <div class="rpm-section">
          <h3 class="rpm-section-title"> 2. Analisis Kesiapan Murid</h3>
          <div class="rpm-form-group">
            <label>🔴 Kelompok Belum Siap</label>
            <textarea id="rpm-belum-siap" class="rpm-form-control" rows="2" placeholder="Karakteristik & strategi diferensiasi..."></textarea>
          </div>
          <div class="rpm-form-group">
            <label>🟡 Kelompok Siap</label>
            <textarea id="rpm-siap" class="rpm-form-control" rows="2" placeholder="Karakteristik & strategi diferensiasi..."></textarea>
          </div>
          <div class="rpm-form-group">
            <label>🟢 Kelompok Mahir</label>
            <textarea id="rpm-mahir" class="rpm-form-control" rows="2" placeholder="Karakteristik & strategi diferensiasi..."></textarea>
          </div>
        </div>

        <div class="rpm-section">
          <h3 class="rpm-section-title"> 3. Tujuan & Profil Lulusan</h3>
          <div class="rpm-form-group">
            <label>📖 Capaian Pembelajaran (CP)</label>
            <textarea id="rpm-cp" class="rpm-form-control" rows="3" placeholder="Paste CP dari kurikulum..."></textarea>
          </div>
          <div class="rpm-form-group">
            <label>✅ Tujuan Pembelajaran (satu per baris)</label>
            <textarea id="rpm-tp" class="rpm-form-control" rows="4" placeholder="1. Siswa mampu...&#10;2. Siswa dapat..."></textarea>
          </div>
          <div class="rpm-form-group">
            <label>🌟 Profil Lulusan yang Disasar (pilih 3-4)</label>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
              <label style="font-weight: normal;"><input type="checkbox" class="rpm-profil" value="Keimanan dan Ketakwaan"> Keimanan & Ketakwaan</label>
              <label style="font-weight: normal;"><input type="checkbox" class="rpm-profil" value="Kewargaan"> Kewargaan</label>
              <label style="font-weight: normal;"><input type="checkbox" class="rpm-profil" value="Penalaran Kritis"> Penalaran Kritis</label>
              <label style="font-weight: normal;"><input type="checkbox" class="rpm-profil" value="Kreatif"> Kreatif</label>
              <label style="font-weight: normal;"><input type="checkbox" class="rpm-profil" value="Kolaborasi"> Kolaborasi</label>
              <label style="font-weight: normal;"><input type="checkbox" class="rpm-profil" value="Kemandirian"> Kemandirian</label>
              <label style="font-weight: normal;"><input type="checkbox" class="rpm-profil" value="Kesehatan"> Kesehatan</label>
              <label style="font-weight: normal;"><input type="checkbox" class="rpm-profil" value="Komunikasi"> Komunikasi</label>
            </div>
          </div>
        </div>

        <div class="rpm-section">
          <h3 class="rpm-section-title">📚 4. Langkah Pembelajaran (Template Metode)</h3>
          <div id="rpm-pertemuan-container"></div>
        </div>

        <div class="rpm-section">
          <h3 class="rpm-section-title"> 5. Asesmen Holistik</h3>
          <div class="rpm-form-group">
            <label>🔍 Asesmen Diagnostik</label>
            <textarea id="rpm-diagnostik" class="rpm-form-control" rows="2"></textarea>
          </div>
          <div class="rpm-form-group">
            <label>📈 Asesmen Formatif</label>
            <textarea id="rpm-formatif" class="rpm-form-control" rows="2"></textarea>
          </div>
          <div class="rpm-form-group">
            <label>🎯 Asesmen Sumatif</label>
            <textarea id="rpm-sumatif" class="rpm-form-control" rows="2"></textarea>
          </div>
          <div class="rpm-form-group">
            <label>📋 Rubrik Penilaian (skala 1-4)</label>
            <textarea id="rpm-rubrik" class="rpm-form-control" rows="4" placeholder="4 (Mahir): ...&#10;3 (Cakap): ...&#10;2 (Berkembang): ...&#10;1 (Belum Siap): ..."></textarea>
          </div>
        </div>

        <div class="rpm-section">
          <h3 class="rpm-section-title">🎨 6. Diferensiasi</h3>
          <div class="rpm-form-group">
            <label>🔴 Remedial (Belum Siap)</label>
            <textarea id="rpm-remedial" class="rpm-form-control" rows="2"></textarea>
          </div>
          <div class="rpm-form-group">
            <label>🟢 Pengayaan (Mahir)</label>
            <textarea id="rpm-pengayaan" class="rpm-form-control" rows="2"></textarea>
          </div>
        </div>

        <div class="rpm-section">
          <h3 class="rpm-section-title">🔄 7. Refleksi</h3>
          <div class="rpm-form-group">
            <label>🧑‍🏫 Refleksi Guru</label>
            <textarea id="rpm-refleksi-guru" class="rpm-form-control" rows="2"></textarea>
          </div>
          <div class="rpm-form-group">
            <label>🧒 Refleksi Siswa</label>
            <textarea id="rpm-refleksi-siswa" class="rpm-form-control" rows="2"></textarea>
          </div>
        </div>

        <div class="rpm-section">
          <h3 class="rpm-section-title">📎 8. Lampiran</h3>
          <div class="rpm-form-group">
            <label>📄 LKPD / LKM</label>
            <textarea id="rpm-lkpd" class="rpm-form-control" rows="3"></textarea>
          </div>
          <div class="rpm-form-group">
            <label>📚 Bahan Bacaan</label>
            <textarea id="rpm-bahan" class="rpm-form-control" rows="2"></textarea>
          </div>
          <div class="rpm-form-group">
            <label>📖 Glosarium</label>
            <textarea id="rpm-glosarium" class="rpm-form-control" rows="2"></textarea>
          </div>
        </div>

        <div class="rpm-section">
          <h3 class="rpm-section-title">️ 9. Tanda Tangan</h3>
          <div class="rpm-form-grid">
            <div class="rpm-form-group">
              <label>👨‍💼 Nama Kepala Sekolah</label>
              <input type="text" id="rpm-kepsek" class="rpm-form-control" value="${DEFAULT_TTD.namaKepsek}">
            </div>
            <div class="rpm-form-group">
              <label> NIP Kepala Sekolah</label>
              <input type="text" id="rpm-nip-kepsek" class="rpm-form-control" value="${DEFAULT_TTD.nipKepsek}">
            </div>
          </div>
          <div class="rpm-form-grid">
            <div class="rpm-form-group">
              <label>👩‍ Nama Guru Pengampu</label>
              <input type="text" id="rpm-guru-pengampu" class="rpm-form-control" value="${DEFAULT_TTD.namaGuru}">
            </div>
            <div class="rpm-form-group">
              <label>🔢 NIP Guru Pengampu</label>
              <input type="text" id="rpm-nip-guru" class="rpm-form-control" value="${DEFAULT_TTD.nipGuru}">
            </div>
          </div>
        </div>

        <div class="rpm-actions">
          <button class="rpm-btn rpm-btn-primary" id="btn-generate-ai">✨ Generate dengan AI</button>
          <button class="rpm-btn rpm-btn-success" id="btn-simpan">💾 Simpan ke Database</button>
          <button class="rpm-btn rpm-btn-warning" id="btn-export">📥 Export Word</button>
          <button class="rpm-btn rpm-btn-secondary" id="btn-reset">🔄 Reset Form</button>
        </div>
      </div>

      <div id="rpm-list-section" style="display: none;">
        <div class="rpm-section">
          <h3 class="rpm-section-title">📚 Daftar RPM Tersimpan</h3>
          <div id="rpm-list-container">
            <div class="rpm-loading"> Memuat data...</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function attachEvents(container) {
  // Tab switching
  container.querySelectorAll('.rpm-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      container.querySelectorAll('.rpm-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const target = tab.dataset.tab;
      container.querySelector('#rpm-form-section').style.display = target === 'form' ? 'block' : 'none';
      container.querySelector('#rpm-list-section').style.display = target === 'list' ? 'block' : 'none';
    });
  });

  // Metode change - load template
  container.querySelector('#rpm-metode').addEventListener('change', function() {
    const metode = this.value;
    if (metode && METODE_TEMPLATES[metode]) {
      const info = METODE_TEMPLATES[metode];
      const infoContainer = container.querySelector('#metode-info-container');
      infoContainer.innerHTML = `
        <div class="metode-info">
          <h4>📚 ${info.nama}</h4>
          <p>${info.deskripsi}</p>
          <p style="margin-top: 8px;"><strong>📋 Template:</strong> ${info.langkah.length} Pertemuan</p>
        </div>
      `;
      loadTemplatePertemuan(metode);
    } else {
      container.querySelector('#metode-info-container').innerHTML = '';
      container.querySelector('#rpm-pertemuan-container').innerHTML = '';
    }
  });

  // Generate AI
  container.querySelector('#btn-generate-ai').addEventListener('click', () => handleGenerateAI(container));

  // Simpan
  container.querySelector('#btn-simpan').addEventListener('click', () => handleSimpan(container));

  // Export Word
  container.querySelector('#btn-export').addEventListener('click', () => handleExportWord(container));

  // Reset
  container.querySelector('#btn-reset').addEventListener('click', () => {
    if (confirm(' Reset semua form?')) {
      currentEditId = null;
      container.querySelectorAll('input[type="text"], textarea').forEach(el => {
        if (el.id === 'rpm-guru' || el.id === 'rpm-guru-pengampu') {
          el.value = DEFAULT_TTD.namaGuru;
        } else if (el.id === 'rpm-kepsek') {
          el.value = DEFAULT_TTD.namaKepsek;
        } else if (el.id === 'rpm-nip-kepsek') {
          el.value = DEFAULT_TTD.nipKepsek;
        } else if (el.id === 'rpm-nip-guru') {
          el.value = DEFAULT_TTD.nipGuru;
        } else if (el.id === 'rpm-sekolah') {
          el.value = currentUser.namaSekolah || 'SDN 139 LAMANDA';
        } else {
          el.value = '';
        }
      });
      container.querySelectorAll('input[type="checkbox"]').forEach(el => el.checked = false);
      container.querySelector('#rpm-metode').value = '';
      container.querySelector('#metode-info-container').innerHTML = '';
      container.querySelector('#rpm-pertemuan-container').innerHTML = '';
      showToast('✅ Form direset!');
    }
  });
}

function loadTemplatePertemuan(metode) {
  const template = METODE_TEMPLATES[metode];
  if (!template) return;

  const container = document.querySelector('#rpm-pertemuan-container');
  container.innerHTML = '';

  template.langkah.forEach((langkah, idx) => {
    const div = document.createElement('div');
    div.className = 'rpm-pertemuan-item';
    div.style.cssText = 'background: #fff1f2; padding: 15px; border-radius: 10px; margin-bottom: 15px; border-left: 4px solid #ec4899;';
    div.innerHTML = `
      <div style="margin-bottom: 10px;">
        <strong style="color: #be185d;">${langkah.judul}</strong>
      </div>
      <div class="rpm-form-group">
        <label>🧠 A. Memahami (Mindful)</label>
        <textarea class="rpm-form-control rpm-memahami" rows="2" placeholder="${langkah.memahami.substring(0, 50)}...">${langkah.memahami}</textarea>
      </div>
      <div class="rpm-form-group">
        <label>🛠️ B. Mengaplikasikan (Meaningful & Joyful)</label>
        <textarea class="rpm-form-control rpm-mengaplikasikan" rows="3" placeholder="${langkah.mengaplikasikan.substring(0, 50)}...">${langkah.mengaplikasikan}</textarea>
      </div>
      <div class="rpm-form-group">
        <label>🔄 C. Merefleksikan</label>
        <textarea class="rpm-form-control rpm-merefleksikan" rows="2" placeholder="${langkah.merefleksikan.substring(0, 50)}...">${langkah.merefleksikan}</textarea>
      </div>
    `;
    container.appendChild(div);
  });
}

function loadTTDDefaults() {
  const saved = localStorage.getItem('rpm_ttd');
  let ttdData = { ...DEFAULT_TTD };
  
  if (saved) {
    try {
      ttdData = { ...ttdData, ...JSON.parse(saved) };
    } catch (e) {}
  }
  
  setTimeout(() => {
    const fields = {
      'rpm-kepsek': ttdData.namaKepsek,
      'rpm-nip-kepsek': ttdData.nipKepsek,
      'rpm-guru-pengampu': ttdData.namaGuru,
      'rpm-nip-guru': ttdData.nipGuru
    };
    
    Object.entries(fields).forEach(([id, value]) => {
      const el = document.getElementById(id);
      if (el) el.value = value;
    });
  }, 100);
}

function saveTTDDefaults() {
  const ttdData = {
    namaKepsek: document.getElementById('rpm-kepsek')?.value || DEFAULT_TTD.namaKepsek,
    nipKepsek: document.getElementById('rpm-nip-kepsek')?.value || DEFAULT_TTD.nipKepsek,
    namaGuru: document.getElementById('rpm-guru-pengampu')?.value || DEFAULT_TTD.namaGuru,
    nipGuru: document.getElementById('rpm-nip-guru')?.value || DEFAULT_TTD.nipGuru
  };
  
  localStorage.setItem('rpm_ttd', JSON.stringify(ttdData));
}

// ... (fungsi handleGenerateAI, handleSimpan, loadRPMList, editRPM, deleteRPM, handleExportWord, gatherFormData, showToast sama seperti rpm-standar.js, hanya field 'jenis' yang berbeda)

async function handleGenerateAI(container) {
  if (!groqApiKey) {
    showToast('⚠️ API Key belum aktif!', 'error');
    return;
  }

  const mapel = container.querySelector('#rpm-mapel').value;
  const kelas = container.querySelector('#rpm-kelas').value;
  const topik = container.querySelector('#rpm-topik').value;
  const metode = container.querySelector('#rpm-metode').value;

  if (!mapel || !kelas || !topik || !metode) {
    showToast('⚠️ Isi Mapel, Kelas, Topik, dan Metode terlebih dahulu!', 'error');
    return;
  }

  const [kelasNum, fase] = kelas.split('|');
  
  const prompt = `Bertindaklah sebagai Ahli Kurikulum Merdeka dan Pengembang RPM profesional dengan keahlian khusus dalam metode ${metode}.

Buatkan Rencana Pembelajaran Mendalam (RPM) SPESIFIK untuk metode ${metode} dengan format JSON valid berdasarkan data:
- Mata Pelajaran: ${mapel}
- Kelas: ${kelasNum} (Fase ${fase})
- Topik: ${topik}
- Metode: ${metode}
- Sekolah: SDN 139 LAMANDA

WAJIB output dalam format JSON berikut (tanpa markdown tambahan):
{
  "analisis_kesiapan": {
    "belum_siap": "deskripsi...",
    "siap": "deskripsi...",
    "mahir": "deskripsi..."
  },
  "cp": "Capaian Pembelajaran...",
  "tujuan_pembelajaran": ["TP 1", "TP 2", "TP 3"],
  "profil_lulusan": ["Dimensi 1", "Dimensi 2", "Dimensi 3"],
  "langkah_pembelajaran": [
    {
      "judul": "Pertemuan 1: ...",
      "memahami": "...",
      "mengaplikasikan": "...",
      "merefleksikan": "..."
    }
  ],
  "asesmen": {
    "diagnostik": "...",
    "formatif": "...",
    "sumatif": "...",
    "rubrik_penilaian": "4 (Mahir): ... 3 (Cakap): ... 2 (Berkembang): ... 1 (Belum Siap): ..."
  },
  "diferensiasi": {
    "remedial": "...",
    "pengayaan": "..."
  },
  "refleksi": {
    "guru": "...",
    "siswa": "..."
  },
  "lampiran": {
    "lkpd": "...",
    "bahan_bacaan": "...",
    "glosarium": "..."
  }
}

PENTING:
- Langkah pembelajaran HARUS mengikuti karakteristik metode ${metode}
- Integrasi 3 Prinsip: Mindful, Meaningful, Joyful
- Pilih 3-4 Profil Lulusan yang paling relevan
- Gunakan bahasa Indonesia formal dan edukatif
- Jumlah pertemuan sesuai kompleksitas topik (biasanya 4-5 pertemuan)`;

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqApiKey}`
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: 'Anda adalah ahli kurikulum Merdeka Indonesia. Output HARUS JSON valid.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 4000
      })
    });

    if (!response.ok) throw new Error(`API Error: ${response.status}`);

    const data = await response.json();
    const aiText = data.choices[0].message.content;
    
    let parsed;
    const jsonMatch = aiText.match(/```json\s*([\s\S]*?)\s*```/) || aiText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);
    } else {
      parsed = JSON.parse(aiText);
    }

    // Isi form dengan data AI (sama seperti rpm-standar.js)
    if (parsed.analisis_kesiapan) {
      container.querySelector('#rpm-belum-siap').value = parsed.analisis_kesiapan.belum_siap || '';
      container.querySelector('#rpm-siap').value = parsed.analisis_kesiapan.siap || '';
      container.querySelector('#rpm-mahir').value = parsed.analisis_kesiapan.mahir || '';
    }
    if (parsed.cp) container.querySelector('#rpm-cp').value = parsed.cp;
    if (parsed.tujuan_pembelajaran) {
      container.querySelector('#rpm-tp').value = parsed.tujuan_pembelajaran.join('\n');
    }
    if (parsed.profil_lulusan) {
      container.querySelectorAll('.rpm-profil').forEach(cb => {
        cb.checked = parsed.profil_lulusan.includes(cb.value);
      });
    }
    if (parsed.langkah_pembelajaran) {
      container.querySelector('#rpm-pertemuan-container').innerHTML = '';
      parsed.langkah_pembelajaran.forEach((p, idx) => {
        const div = document.createElement('div');
        div.className = 'rpm-pertemuan-item';
        div.style.cssText = 'background: #fff1f2; padding: 15px; border-radius: 10px; margin-bottom: 15px; border-left: 4px solid #ec4899;';
        div.innerHTML = `
          <div style="margin-bottom: 10px;">
            <strong style="color: #be185d;">${p.judul || `Pertemuan ${idx + 1}`}</strong>
          </div>
          <div class="rpm-form-group">
            <label>🧠 A. Memahami (Mindful)</label>
            <textarea class="rpm-form-control rpm-memahami" rows="2">${p.memahami || ''}</textarea>
          </div>
          <div class="rpm-form-group">
            <label>🛠️ B. Mengaplikasikan (Meaningful & Joyful)</label>
            <textarea class="rpm-form-control rpm-mengaplikasikan" rows="3">${p.mengaplikasikan || ''}</textarea>
          </div>
          <div class="rpm-form-group">
            <label>🔄 C. Merefleksikan</label>
            <textarea class="rpm-form-control rpm-merefleksikan" rows="2">${p.merefleksikan || ''}</textarea>
          </div>
        `;
        container.querySelector('#rpm-pertemuan-container').appendChild(div);
      });
    }
    if (parsed.asesmen) {
      container.querySelector('#rpm-diagnostik').value = parsed.asesmen.diagnostik || '';
      container.querySelector('#rpm-formatif').value = parsed.asesmen.formatif || '';
      container.querySelector('#rpm-sumatif').value = parsed.asesmen.sumatif || '';
      container.querySelector('#rpm-rubrik').value = parsed.asesmen.rubrik_penilaian || '';
    }
    if (parsed.diferensiasi) {
      container.querySelector('#rpm-remedial').value = parsed.diferensiasi.remedial || '';
      container.querySelector('#rpm-pengayaan').value = parsed.diferensiasi.pengayaan || '';
    }
    if (parsed.refleksi) {
      container.querySelector('#rpm-refleksi-guru').value = parsed.refleksi.guru || '';
      container.querySelector('#rpm-refleksi-siswa').value = parsed.refleksi.siswa || '';
    }
    if (parsed.lampiran) {
      container.querySelector('#rpm-lkpd').value = parsed.lampiran.lkpd || '';
      container.querySelector('#rpm-bahan').value = parsed.lampiran.bahan_bacaan || '';
      container.querySelector('#rpm-glosarium').value = parsed.lampiran.glosarium || '';
    }

    showToast('✅ RPM Spesifik berhasil di-generate dengan AI!');
  } catch (error) {
    console.error('Error AI:', error);
    showToast('❌ Gagal generate: ' + error.message, 'error');
  }
}

async function handleSimpan(container) {
  const sekolah = container.querySelector('#rpm-sekolah').value;
  const guru = container.querySelector('#rpm-guru').value;
  const mapel = container.querySelector('#rpm-mapel').value;
  const kelas = container.querySelector('#rpm-kelas').value;
  const topik = container.querySelector('#rpm-topik').value;
  const metode = container.querySelector('#rpm-metode').value;

  if (!sekolah || !guru || !mapel || !kelas || !topik || !metode) {
    showToast('⚠️ Lengkapi Identitas Dokumen dan Pilih Metode!', 'error');
    return;
  }

  const [kelasNum, fase] = kelas.split('|');

  const profilLulusan = [];
  container.querySelectorAll('.rpm-profil:checked').forEach(cb => profilLulusan.push(cb.value));

  const langkahPembelajaran = [];
  container.querySelectorAll('.rpm-pertemuan-item').forEach((item, idx) => {
    langkahPembelajaran.push({
      judul: item.querySelector('strong').textContent,
      memahami: item.querySelector('.rpm-memahami').value,
      mengaplikasikan: item.querySelector('.rpm-mengaplikasikan').value,
      merefleksikan: item.querySelector('.rpm-merefleksikan').value
    });
  });

  const dataRPM = {
    jenis: 'spesifik', // Berbeda dengan rpm-standar
    metode_pembelajaran: metode,
    identitas: {
      sekolah, guru, mapel,
      kelas: kelasNum,
      fase,
      topik,
      alokasi_waktu: container.querySelector('#rpm-alokasi').value
    },
    analisis_kesiapan: {
      belum_siap: container.querySelector('#rpm-belum-siap').value,
      siap: container.querySelector('#rpm-siap').value,
      mahir: container.querySelector('#rpm-mahir').value
    },
    tujuan_dan_profil: {
      cp: container.querySelector('#rpm-cp').value,
      tujuan_pembelajaran: container.querySelector('#rpm-tp').value.split('\n').filter(t => t.trim()),
      profil_lulusan: profilLulusan
    },
    langkah_pembelajaran: langkahPembelajaran,
    asesmen: {
      diagnostik: container.querySelector('#rpm-diagnostik').value,
      formatif: container.querySelector('#rpm-formatif').value,
      sumatif: container.querySelector('#rpm-sumatif').value,
      rubrik_penilaian: container.querySelector('#rpm-rubrik').value
    },
    diferensiasi: {
      remedial: container.querySelector('#rpm-remedial').value,
      pengayaan: container.querySelector('#rpm-pengayaan').value
    },
    refleksi: {
      guru: container.querySelector('#rpm-refleksi-guru').value,
      siswa: container.querySelector('#rpm-refleksi-siswa').value
    },
    lampiran: {
      lkpd: container.querySelector('#rpm-lkpd').value,
      bahan_bacaan: container.querySelector('#rpm-bahan').value,
      glosarium: container.querySelector('#rpm-glosarium').value
    },
    tanda_tangan: {
      kepala_sekolah: {
        nama: container.querySelector('#rpm-kepsek').value,
        nip: container.querySelector('#rpm-nip-kepsek').value
      },
      guru_pengampu: {
        nama: container.querySelector('#rpm-guru-pengampu').value,
        nip: container.querySelector('#rpm-nip-guru').value
      }
    }
  };

  try {
    if (currentEditId) {
      const docRef = doc(db, 'rpm_data', currentEditId);
      await updateDoc(docRef, dataRPM);
      showToast('✅ RPM berhasil diupdate!');
      currentEditId = null;
    } else {
      await addDoc(collection(db, 'rpm_data'), {
        ...dataRPM,
        userId: currentUser.uid,
        createdAt: serverTimestamp()
      });
      showToast('✅ RPM berhasil disimpan!');
    }
    
    saveTTDDefaults();
    container.querySelector('#btn-reset').click();
  } catch (error) {
    console.error('Error saving:', error);
    showToast('❌ Gagal menyimpan: ' + error.message, 'error');
  }
}

function loadRPMList(container) {
  const listContainer = container.querySelector('#rpm-list-container');
  
  const q = query(
    collection(db, 'rpm_data'),
    where('userId', '==', currentUser.uid),
    where('jenis', '==', 'spesifik'), // Berbeda dengan rpm-standar
    orderBy('createdAt', 'desc')
  );

  onSnapshot(q, (snapshot) => {
    if (snapshot.empty) {
      listContainer.innerHTML = '<div class="rpm-empty">📭 Belum ada RPM Spesifik tersimpan</div>';
      return;
    }

    listContainer.innerHTML = snapshot.docs.map(docSnap => {
      const d = docSnap.data();
      const date = d.createdAt?.toDate?.()?.toLocaleString('id-ID') || '-';
      return `
        <div class="rpm-item">
          <div class="rpm-item-header">
            <div>
              <div class="rpm-item-title">${d.identitas?.mapel || '-'} - ${d.identitas?.topik || '-'}</div>
              <div class="rpm-item-meta">Kelas ${d.identitas?.kelas || '-'} | Metode: ${d.metode_pembelajaran || '-'} | ${date}</div>
            </div>
            <div class="rpm-item-actions">
              <button onclick="editRPM('${docSnap.id}')" style="background: #3b82f6;">✏️ Edit</button>
              <button onclick="deleteRPM('${docSnap.id}')" style="background: #ef4444;">🗑️ Hapus</button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }, (error) => {
    console.warn('Error loading RPM list:', error);
    if (error.code === 'failed-precondition') {
      listContainer.innerHTML = '<div class="rpm-empty">⚠️ Index Firestore sedang diproses. Silakan tunggu beberapa menit.</div>';
    } else {
      listContainer.innerHTML = '<div class="rpm-empty">❌ Gagal memuat data</div>';
    }
  });
}

// ... (fungsi editRPM, deleteRPM, handleExportWord, gatherFormData, showToast sama seperti rpm-standar.js)

window.editRPM = async function(id) {
  try {
    const { getDoc, doc } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
    const docRef = doc(db, 'rpm_data', id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      showToast('❌ Data tidak ditemukan!', 'error');
      return;
    }

    const d = docSnap.data();
    currentEditId = id;

    document.querySelector('#rpm-sekolah').value = d.identitas?.sekolah || '';
    document.querySelector('#rpm-guru').value = d.identitas?.guru || '';
    document.querySelector('#rpm-mapel').value = d.identitas?.mapel || '';
    document.querySelector('#rpm-kelas').value = `${d.identitas?.kelas}|${d.identitas?.fase}` || '';
    document.querySelector('#rpm-topik').value = d.identitas?.topik || '';
    document.querySelector('#rpm-alokasi').value = d.identitas?.alokasi_waktu || '';
    document.querySelector('#rpm-metode').value = d.metode_pembelajaran || '';
    
    // Trigger change event untuk load template
    document.querySelector('#rpm-metode').dispatchEvent(new Event('change'));

    document.querySelector('#rpm-belum-siap').value = d.analisis_kesiapan?.belum_siap || '';
    document.querySelector('#rpm-siap').value = d.analisis_kesiapan?.siap || '';
    document.querySelector('#rpm-mahir').value = d.analisis_kesiapan?.mahir || '';

    document.querySelector('#rpm-cp').value = d.tujuan_dan_profil?.cp || '';
    document.querySelector('#rpm-tp').value = (d.tujuan_dan_profil?.tujuan_pembelajaran || []).join('\n');
    
    document.querySelectorAll('.rpm-profil').forEach(cb => {
      cb.checked = (d.tujuan_dan_profil?.profil_lulusan || []).includes(cb.value);
    });

    document.querySelector('#rpm-pertemuan-container').innerHTML = '';
    (d.langkah_pembelajaran || []).forEach((p, idx) => {
      const div = document.createElement('div');
      div.className = 'rpm-pertemuan-item';
      div.style.cssText = 'background: #fff1f2; padding: 15px; border-radius: 10px; margin-bottom: 15px; border-left: 4px solid #ec4899;';
      div.innerHTML = `
        <div style="margin-bottom: 10px;">
          <strong style="color: #be185d;">${p.judul || `Pertemuan ${idx + 1}`}</strong>
        </div>
        <div class="rpm-form-group">
          <label>🧠 A. Memahami (Mindful)</label>
          <textarea class="rpm-form-control rpm-memahami" rows="2">${p.memahami || ''}</textarea>
        </div>
        <div class="rpm-form-group">
          <label>🛠️ B. Mengaplikasikan (Meaningful & Joyful)</label>
          <textarea class="rpm-form-control rpm-mengaplikasikan" rows="3">${p.mengaplikasikan || ''}</textarea>
        </div>
        <div class="rpm-form-group">
          <label>🔄 C. Merefleksikan</label>
          <textarea class="rpm-form-control rpm-merefleksikan" rows="2">${p.merefleksikan || ''}</textarea>
        </div>
      `;
      document.querySelector('#rpm-pertemuan-container').appendChild(div);
    });

    document.querySelector('#rpm-diagnostik').value = d.asesmen?.diagnostik || '';
    document.querySelector('#rpm-formatif').value = d.asesmen?.formatif || '';
    document.querySelector('#rpm-sumatif').value = d.asesmen?.sumatif || '';
    document.querySelector('#rpm-rubrik').value = d.asesmen?.rubrik_penilaian || '';

    document.querySelector('#rpm-remedial').value = d.diferensiasi?.remedial || '';
    document.querySelector('#rpm-pengayaan').value = d.diferensiasi?.pengayaan || '';

    document.querySelector('#rpm-refleksi-guru').value = d.refleksi?.guru || '';
    document.querySelector('#rpm-refleksi-siswa').value = d.refleksi?.siswa || '';

    document.querySelector('#rpm-lkpd').value = d.lampiran?.lkpd || '';
    document.querySelector('#rpm-bahan').value = d.lampiran?.bahan_bacaan || '';
    document.querySelector('#rpm-glosarium').value = d.lampiran?.glosarium || '';

    if (d.tanda_tangan) {
      document.querySelector('#rpm-kepsek').value = d.tanda_tangan.kepala_sekolah?.nama || DEFAULT_TTD.namaKepsek;
      document.querySelector('#rpm-nip-kepsek').value = d.tanda_tangan.kepala_sekolah?.nip || DEFAULT_TTD.nipKepsek;
      document.querySelector('#rpm-guru-pengampu').value = d.tanda_tangan.guru_pengampu?.nama || DEFAULT_TTD.namaGuru;
      document.querySelector('#rpm-nip-guru').value = d.tanda_tangan.guru_pengampu?.nip || DEFAULT_TTD.nipGuru;
    }

    document.querySelector('[data-tab="form"]').click();
    showToast('✅ RPM dimuat untuk edit!');
  } catch (error) {
    console.error('Error loading RPM:', error);
    showToast('❌ Gagal memuat RPM!', 'error');
  }
};

window.deleteRPM = async function(id) {
  if (!confirm('⚠️ Yakin hapus RPM ini?')) return;
  
  try {
    await deleteDoc(doc(db, 'rpm_data', id));
    showToast('✅ RPM berhasil dihapus!');
  } catch (error) {
    console.error('Error deleting:', error);
    showToast('❌ Gagal menghapus!', 'error');
  }
};

function handleExportWord(container) {
  // Sama seperti rpm-standar.js, hanya menambahkan info metode
  const data = gatherFormData(container);
  if (!data.identitas.topik) {
    showToast('⚠️ Isi data terlebih dahulu!', 'error');
    return;
  }

  const d = data;
  let html = `
    <html><head><meta charset="utf-8"><title>RPM Spesifik - ${d.identitas.topik}</title>
    <style>
      body { font-family: 'Times New Roman', serif; margin: 2cm; line-height: 1.6; }
      h1 { text-align: center; font-size: 16pt; margin-bottom: 5px; }
      h2 { font-size: 13pt; border-bottom: 2px solid #000; padding-bottom: 5px; margin-top: 20px; }
      h3 { font-size: 12pt; margin-top: 15px; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
      th, td { border: 1px solid #000; padding: 8px; text-align: left; }
      th { background: #f0f0f0; }
      ul { margin: 5px 0; padding-left: 20px; }
      .ttd-section { margin-top: 50px; }
      .ttd-table { width: 100%; border: none; }
      .ttd-table td { width: 50%; border: none; text-align: center; vertical-align: top; }
      .ttd-name { font-weight: bold; border-bottom: 1px solid #000; display: inline-block; min-width: 200px; margin-bottom: 5px; }
    </style></head><body>
    <h1>RENCANA PEMBELAJARAN MENDALAM (RPM) - SPESIFIK</h1>
    <h2 style="text-align: center; border: none;">${d.identitas.topik}</h2>
    <p style="text-align: center; font-style: italic;">Metode: ${d.metode_pembelajaran}</p>
    
    <h2>A. IDENTITAS DOKUMEN</h2>
    <table>
      <tr><td style="width: 30%;"><strong>Sekolah</strong></td><td>${d.identitas.sekolah}</td></tr>
      <tr><td><strong>Guru</strong></td><td>${d.identitas.guru}</td></tr>
      <tr><td><strong>Mata Pelajaran</strong></td><td>${d.identitas.mapel}</td></tr>
      <tr><td><strong>Kelas/Fase</strong></td><td>${d.identitas.kelas} (Fase ${d.identitas.fase})</td></tr>
      <tr><td><strong>Topik</strong></td><td>${d.identitas.topik}</td></tr>
      <tr><td><strong>Alokasi Waktu</strong></td><td>${d.identitas.alokasi_waktu}</td></tr>
      <tr><td><strong>Metode</strong></td><td>${d.metode_pembelajaran}</td></tr>
    </table>

    <h2>B. ANALISIS KESIAPAN MURID</h2>
    <p><strong>🔴 Belum Siap:</strong> ${d.analisis_kesiapan.belum_siap}</p>
    <p><strong>🟡 Siap:</strong> ${d.analisis_kesiapan.siap}</p>
    <p><strong> Mahir:</strong> ${d.analisis_kesiapan.mahir}</p>

    <h2>C. TUJUAN & PROFIL LULUSAN</h2>
    <p><strong>CP:</strong> ${d.tujuan_dan_profil.cp}</p>
    <h3>Tujuan Pembelajaran:</h3>
    <ul>${d.tujuan_dan_profil.tujuan_pembelajaran.map(t => `<li>${t}</li>`).join('')}</ul>
    <h3>Profil Lulusan:</h3>
    <ul>${d.tujuan_dan_profil.profil_lulusan.map(p => `<li>${p}</li>`).join('')}</ul>

    <h2>D. LANGKAH PEMBELAJARAN</h2>
    ${d.langkah_pembelajaran.map(p => `
      <h3>${p.judul}</h3>
      <p><strong>A. Memahami:</strong> ${p.memahami}</p>
      <p><strong>B. Mengaplikasikan:</strong> ${p.mengaplikasikan}</p>
      <p><strong>C. Merefleksikan:</strong> ${p.merefleksikan}</p>
    `).join('')}

    <h2>E. ASESMEN</h2>
    <p><strong>Diagnostik:</strong> ${d.asesmen.diagnostik}</p>
    <p><strong>Formatif:</strong> ${d.asesmen.formatif}</p>
    <p><strong>Sumatif:</strong> ${d.asesmen.sumatif}</p>
    <p><strong>Rubrik:</strong> ${d.asesmen.rubrik_penilaian}</p>

    <h2>F. DIFERENSIASI</h2>
    <p><strong>Remedial:</strong> ${d.diferensiasi.remedial}</p>
    <p><strong>Pengayaan:</strong> ${d.diferensiasi.pengayaan}</p>

    <h2>G. REFLEKSI</h2>
    <p><strong>Guru:</strong> ${d.refleksi.guru}</p>
    <p><strong>Siswa:</strong> ${d.refleksi.siswa}</p>

    <h2>H. LAMPIRAN</h2>
    <p><strong>LKPD:</strong> ${d.lampiran.lkpd}</p>
    <p><strong>Bahan Bacaan:</strong> ${d.lampiran.bahan_bacaan}</p>
    <p><strong>Glosarium:</strong> ${d.lampiran.glosarium}</p>

    <div class="ttd-section">
      <table class="ttd-table">
        <tr>
          <td>
            <div>Mengetahui,</div>
            <div style="margin-bottom: 60px;">Kepala Sekolah<br>SDN 139 LAMANDA</div>
            <div class="ttd-name">${d.tanda_tangan.kepala_sekolah.nama}</div>
            <div>NIP: ${d.tanda_tangan.kepala_sekolah.nip}</div>
          </td>
          <td>
            <div>Guru Pengampu,</div>
            <div style="margin-bottom: 60px;">Guru Mata Pelajaran</div>
            <div class="ttd-name">${d.tanda_tangan.guru_pengampu.nama}</div>
            <div>NIP: ${d.tanda_tangan.guru_pengampu.nip}</div>
          </td>
        </tr>
      </table>
    </div>
    </body></html>
  `;

  const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `RPM_Spesifik_${d.metode_pembelajaran.replace(/\s+/g, '_')}_${d.identitas.mapel}_${d.identitas.topik.replace(/\s+/g, '_')}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  showToast('📥 Word berhasil diunduh!');
}

function gatherFormData(container) {
  const kelas = container.querySelector('#rpm-kelas').value;
  const [kelasNum, fase] = kelas.split('|');

  const profilLulusan = [];
  container.querySelectorAll('.rpm-profil:checked').forEach(cb => profilLulusan.push(cb.value));

  const langkahPembelajaran = [];
  container.querySelectorAll('.rpm-pertemuan-item').forEach((item, idx) => {
    langkahPembelajaran.push({
      judul: item.querySelector('strong').textContent,
      memahami: item.querySelector('.rpm-memahami').value,
      mengaplikasikan: item.querySelector('.rpm-mengaplikasikan').value,
      merefleksikan: item.querySelector('.rpm-merefleksikan').value
    });
  });

  return {
    identitas: {
      sekolah: container.querySelector('#rpm-sekolah').value,
      guru: container.querySelector('#rpm-guru').value,
      mapel: container.querySelector('#rpm-mapel').value,
      kelas: kelasNum,
      fase,
      topik: container.querySelector('#rpm-topik').value,
      alokasi_waktu: container.querySelector('#rpm-alokasi').value
    },
    metode_pembelajaran: container.querySelector('#rpm-metode').value,
    analisis_kesiapan: {
      belum_siap: container.querySelector('#rpm-belum-siap').value,
      siap: container.querySelector('#rpm-siap').value,
      mahir: container.querySelector('#rpm-mahir').value
    },
    tujuan_dan_profil: {
      cp: container.querySelector('#rpm-cp').value,
      tujuan_pembelajaran: container.querySelector('#rpm-tp').value.split('\n').filter(t => t.trim()),
      profil_lulusan: profilLulusan
    },
    langkah_pembelajaran: langkahPembelajaran,
    asesmen: {
      diagnostik: container.querySelector('#rpm-diagnostik').value,
      formatif: container.querySelector('#rpm-formatif').value,
      sumatif: container.querySelector('#rpm-sumatif').value,
      rubrik_penilaian: container.querySelector('#rpm-rubrik').value
    },
    diferensiasi: {
      remedial: container.querySelector('#rpm-remedial').value,
      pengayaan: container.querySelector('#rpm-pengayaan').value
    },
    refleksi: {
      guru: container.querySelector('#rpm-refleksi-guru').value,
      siswa: container.querySelector('#rpm-refleksi-siswa').value
    },
    lampiran: {
      lkpd: container.querySelector('#rpm-lkpd').value,
      bahan_bacaan: container.querySelector('#rpm-bahan').value,
      glosarium: container.querySelector('#rpm-glosarium').value
    },
    tanda_tangan: {
      kepala_sekolah: {
        nama: container.querySelector('#rpm-kepsek').value,
        nip: container.querySelector('#rpm-nip-kepsek').value
      },
      guru_pengampu: {
        nama: container.querySelector('#rpm-guru-pengampu').value,
        nip: container.querySelector('#rpm-nip-guru').value
      }
    }
  };
}

function showToast(msg, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `rpm-toast rpm-toast-${type}`;
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(400px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
