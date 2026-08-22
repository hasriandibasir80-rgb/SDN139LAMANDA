// features/gtk.js - Statistik GTK
import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export async function init(container, db) {
  container.innerHTML = `
    <div style="background:white; border-radius:12px; padding:20px; border:1px solid #e2e8f0;">
      <div style="display:flex; align-items:center; gap:12px; margin-bottom:20px; border-bottom:1px solid #f1f5f9; padding-bottom:16px;">
        <span style="font-size:32px;">👩‍🏫</span>
        <div>
          <h2 style="margin:0; color:#1e293b; font-size:20px;">Statistik GTK</h2>
          <p style="margin:4px 0 0 0; color:#64748b; font-size:13px;">PENGGANTI Kehadiran & Absensi - Analisis komposisi guru dan tendik</p>
        </div>
      </div>
      <div id="statGrid" class="stat-grid">
        <div class="stat-card"><h4>Memuat...</h4><div class="value">-</div></div>
      </div>
      <div id="chartArea" style="margin-top:20px;">
        <canvas id="chartCanvas" style="width:100%; height:300px; background:#f8fafc; border-radius:8px; display:flex; align-items:center; justify-content:center; color:#94a3b8;">Grafik akan tampil di sini</canvas>
      </div>
      <div id="dataTable" style="margin-top:24px;"></div>
    </div>
  `;

  try {
    // Coba ambil dari koleksi Firestore jika ada, fallback dummy
    let data = [];
    try {
      const q = query(collection(db, "gtk"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
      console.log("Koleksi gtk belum ada, pakai dummy:", e.message);
    }

    renderStats(data);
  } catch (err) {
    console.error(err);
    document.getElementById('statGrid').innerHTML = `<div class="stat-card"><h4>Error</h4><div class="value" style="color:#ef4444;">${err.message}</div></div>`;
  }

  function renderStats(list) {
    const grid = document.getElementById('statGrid');
    const total = list.length || 0;
    
    // Dummy statistik sesuai judul
    let cards = "";
    if ("gtk" === "demografi") {
      cards = `
        <div class="stat-card"><h4>Total Siswa</h4><div class="value">${total || 187}</div><div class="desc">Aktif tahun 2025/2026</div></div>
        <div class="stat-card"><h4>Rombel</h4><div class="value">6</div><div class="desc">Kelas 1-6</div></div>
        <div class="stat-card"><h4>Guru</h4><div class="value">12</div><div class="desc">GT K + Tendik</div></div>
        <div class="stat-card"><h4>Rasio</h4><div class="value">1:16</div><div class="desc">Guru : Siswa</div></div>
      `;
    } else if ("gtk" === "gtk") {
      cards = `
        <div class="stat-card"><h4>Total GTK</h4><div class="value">${total || 12}</div><div class="desc">Guru + Tendik</div></div>
        <div class="stat-card"><h4>PNS</h4><div class="value">4</div><div class="desc">ASN Tetap</div></div>
        <div class="stat-card"><h4>PPPK</h4><div class="value">3</div><div class="desc">Kontrak</div></div>
        <div class="stat-card"><h4>Honorer</h4><div class="value">5</div><div class="desc">Non-ASN</div></div>
      `;
    } else {
      cards = `
        <div class="stat-card"><h4>Total Data</h4><div class="value">${total || 0}</div><div class="desc">Records</div></div>
        <div class="stat-card"><h4>Update Terakhir</h4><div class="value" style="font-size:16px;">${new Date().toLocaleDateString('id-ID')}</div><div class="desc">Sinkron Dapodik</div></div>
      `;
    }
    grid.innerHTML = cards;

    const tableDiv = document.getElementById('dataTable');
    if (list.length > 0) {
      let rows = list.map((item, i) => `<tr><td style="padding:8px; border:1px solid #e2e8f0;">${i+1}</td><td style="padding:8px; border:1px solid #e2e8f0;">${item.nama || item.title || item.id}</td></tr>`).join('');
      tableDiv.innerHTML = `<h4 style="margin-bottom:8px;">Data Terbaru</h4><table style="width:100%; border-collapse:collapse; font-size:13px;"><tr style="background:#f8fafc;"><th style="padding:8px; border:1px solid #e2e8f0;">No</th><th style="padding:8px; border:1px solid #e2e8f0;">Nama</th></tr>${rows}</table>`;
    } else {
      tableDiv.innerHTML = `<div style="padding:16px; background:#fffbeb; border:1px solid #fde68a; border-radius:8px; color:#92400e; font-size:13px;">Belum ada data di koleksi <code>gtk</code>. Data dummy statistik ditampilkan di atas. Silakan input data melalui Dapodik atau modul admin.</div>`;
    }
  }
}
