// features/demografi.js - REVISI FINAL DENGAN FORM EDIT ADMIN DI HALAMAN YANG SAMA
// Struktur tetap preservasi, hanya tambah form edit agar bisa isi angka tanpa buka Firebase Console
import { collection, getDocs, query, orderBy, doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export async function init(container, db) {
  container.innerHTML = `
    <div style="background:white; border-radius:12px; padding:20px; border:1px solid #e2e8f0;">
      <div style="display:flex; align-items:center; gap:12px; margin-bottom:20px; border-bottom:1px solid #f1f5f9; padding-bottom:16px;">
        <span style="font-size:32px;">🏫</span>
        <div>
          <h2 style="margin:0; color:#1e293b; font-size:20px;">Demografi Sekolah</h2>
          <p style="margin:4px 0 0 0; color:#64748b; font-size:13px;">Data umum sekolah, jumlah siswa, rombel, dan sarana</p>
        </div>
      </div>
      <div id="statGrid" class="stat-grid">
        <div class="stat-card"><h4>Memuat...</h4><div class="value">-</div></div>
      </div>
      <div id="chartArea" style="margin-top:20px;">
        <canvas id="chartCanvas" style="width:100%; height:300px; background:#f8fafc; border-radius:8px; display:flex; align-items:center; justify-content:center; color:#94a3b8;">Grafik akan tampil di sini</canvas>
      </div>
      <div id="dataTable" style="margin-top:24px;"></div>
      <div id="editArea" style="margin-top:24px; display:none;"></div>
    </div>
  `;

  try {
    let data = [];
    try {
      const q = query(collection(db, "demografi"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
      console.log("Koleksi demografi belum ada:", e.message);
    }

    let settings = null;
    try {
      const settingsRef = doc(db, "settings", "statistik");
      const settingsSnap = await getDoc(settingsRef);
      if(settingsSnap.exists()){
        settings = settingsSnap.data();
      }
    } catch(e){
      console.log("Settings statistik belum ada:", e.message);
    }

    renderStats(data, settings, db);
  } catch (err) {
    console.error(err);
    document.getElementById('statGrid').innerHTML = `<div class="stat-card"><h4>Error</h4><div class="value" style="color:#ef4444;">${err.message}</div></div>`;
  }

  function renderStats(list, settings, db) {
    const grid = document.getElementById('statGrid');
    const total = list.length || 0;
    
    const demografiCfg = settings?.demografi || {};
    const gtkCfg = settings?.gtk || {};

    let cards = "";
    if ("demografi" === "demografi") {
      const totalSiswa = demografiCfg.totalSiswa ?? (total || 0);
      const rombel = demografiCfg.rombel ?? 0;
      const guru = demografiCfg.guru ?? 0;
      const rasio = demografiCfg.rasio ?? "1:16";
      const tahun = demografiCfg.tahun ?? "2025/2026";
      const ketKelas = demografiCfg.ketKelas ?? "Kelas 1-6";
      const ketGuru = demografiCfg.ketGuru ?? "GT K + Tendik";
      const ketRasio = demografiCfg.ketRasio ?? "Guru : Siswa";

      cards = `
        <div class="stat-card"><h4>Total Siswa</h4><div class="value">${totalSiswa}</div><div class="desc">Aktif tahun ${tahun}</div></div>
        <div class="stat-card"><h4>Rombel</h4><div class="value">${rombel}</div><div class="desc">${ketKelas}</div></div>
        <div class="stat-card"><h4>Guru</h4><div class="value">${guru}</div><div class="desc">${ketGuru}</div></div>
        <div class="stat-card"><h4>Rasio</h4><div class="value">${rasio}</div><div class="desc">${ketRasio}</div></div>
      `;
    } else if ("demografi" === "gtk") {
      cards = `
        <div class="stat-card"><h4>Total GTK</h4><div class="value">${gtkCfg.totalGTK ?? total ?? 0}</div><div class="desc">Guru + Tendik</div></div>
        <div class="stat-card"><h4>PNS</h4><div class="value">${gtkCfg.pns ?? 4}</div><div class="desc">ASN Tetap</div></div>
        <div class="stat-card"><h4>PPPK</h4><div class="value">${gtkCfg.pppk ?? 3}</div><div class="desc">Kontrak</div></div>
        <div class="stat-card"><h4>Honorer</h4><div class="value">${gtkCfg.honorer ?? 5}</div><div class="desc">Non-ASN</div></div>
      `;
    } else {
      cards = `
        <div class="stat-card"><h4>Total Data</h4><div class="value">${total || 0}</div><div class="desc">Records</div></div>
        <div class="stat-card"><h4>Update Terakhir</h4><div class="value" style="font-size:16px;">${new Date().toLocaleDateString('id-ID')}</div><div class="desc">Sinkron Dapodik</div></div>
      `;
    }
    grid.innerHTML = cards;

    const tableDiv = document.getElementById('dataTable');
    const editArea = document.getElementById('editArea');
    
    if (list.length > 0) {
      let rows = list.map((item, i) => `<tr><td style="padding:8px; border:1px solid #e2e8f0;">${i+1}</td><td style="padding:8px; border:1px solid #e2e8f0;">${item.nama || item.title || item.id}</td></tr>`).join('');
      tableDiv.innerHTML = `<h4 style="margin-bottom:8px;">Data Terbaru</h4><table style="width:100%; border-collapse:collapse; font-size:13px;"><tr style="background:#f8fafc;"><th style="padding:8px; border:1px solid #e2e8f0;">No</th><th style="padding:8px; border:1px solid #e2e8f0;">Nama</th></tr>${rows}</table>`;
    } else {
      if(settings?.demografi){
        tableDiv.innerHTML = `<div style="padding:12px; background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px; color:#166534; font-size:12px;">✓ Data dari <b>settings/statistik</b>. Edit di bawah untuk update.</div>`;
      } else {
        tableDiv.innerHTML = `<div style="padding:12px; background:#fffbeb; border:1px solid #fde68a; border-radius:8px; color:#92400e; font-size:12px;">Belum ada data di <code>settings/statistik</code>. Isi form di bawah untuk pertama kali.</div>`;
      }
    }

    // === FORM EDIT ADMIN - MUNCUL DI HALAMAN YANG SAMA ===
    editArea.style.display = 'block';
    editArea.innerHTML = `
      <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:16px;">
        <h4 style="margin:0 0 12px 0; font-size:14px; color:#1e293b;">✏️ Edit Angka (Tanpa Coding) - Simpan ke Firestore</h4>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
          <div><label style="font-size:11px; font-weight:600; color:#64748b;">TOTAL SISWA</label><input id="edit_totalSiswa" type="number" value="${demografiCfg.totalSiswa||''}" placeholder="187" style="width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:6px; margin-top:4px;"></div>
          <div><label style="font-size:11px; font-weight:600; color:#64748b;">ROMBEL</label><input id="edit_rombel" type="number" value="${demografiCfg.rombel||''}" placeholder="6" style="width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:6px; margin-top:4px;"></div>
          <div><label style="font-size:11px; font-weight:600; color:#64748b;">GURU</label><input id="edit_guru" type="number" value="${demografiCfg.guru||''}" placeholder="12" style="width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:6px; margin-top:4px;"></div>
          <div><label style="font-size:11px; font-weight:600; color:#64748b;">RASIO</label><input id="edit_rasio" type="text" value="${demografiCfg.rasio||''}" placeholder="1:16" style="width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:6px; margin-top:4px;"></div>
          <div><label style="font-size:11px; font-weight:600; color:#64748b;">TAHUN AJARAN</label><input id="edit_tahun" type="text" value="${demografiCfg.tahun||''}" placeholder="2025/2026" style="width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:6px; margin-top:4px;"></div>
          <div><label style="font-size:11px; font-weight:600; color:#64748b;">KET KELAS</label><input id="edit_ketKelas" type="text" value="${demografiCfg.ketKelas||''}" placeholder="Kelas 1-6" style="width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:6px; margin-top:4px;"></div>
        </div>
        <button id="btnSimpanDemografi" style="margin-top:14px; width:100%; padding:10px; background:#6366f1; color:#fff; border:none; border-radius:8px; font-weight:700; cursor:pointer;">💾 Simpan Perubahan</button>
        <div id="editMsg" style="margin-top:8px; font-size:12px; display:none;"></div>
      </div>
    `;

    document.getElementById('btnSimpanDemografi').onclick = async () => {
      const btn = document.getElementById('btnSimpanDemografi');
      const msg = document.getElementById('editMsg');
      btn.textContent = 'Menyimpan...'; btn.disabled = true;
      try{
        const newData = {
          totalSiswa: parseInt(document.getElementById('edit_totalSiswa').value)||0,
          rombel: parseInt(document.getElementById('edit_rombel').value)||0,
          guru: parseInt(document.getElementById('edit_guru').value)||0,
          rasio: document.getElementById('edit_rasio').value||'1:16',
          tahun: document.getElementById('edit_tahun').value||'2025/2026',
          ketKelas: document.getElementById('edit_ketKelas').value||'Kelas 1-6',
          ketGuru: 'GT K + Tendik',
          ketRasio: 'Guru : Siswa'
        };
        await setDoc(doc(db, "settings", "statistik"), {
          demografi: newData,
          updatedAt: new Date()
        }, { merge: true });
        msg.style.display='block';
        msg.style.color='#166534';
        msg.style.background='#dcfce7';
        msg.style.padding='8px';
        msg.style.borderRadius='6px';
        msg.textContent = '✓ Berhasil disimpan! Refresh halaman, angka akan berubah.';
        // Update grid langsung tanpa refresh
        grid.innerHTML = `
          <div class="stat-card"><h4>Total Siswa</h4><div class="value">${newData.totalSiswa}</div><div class="desc">Aktif tahun ${newData.tahun}</div></div>
          <div class="stat-card"><h4>Rombel</h4><div class="value">${newData.rombel}</div><div class="desc">${newData.ketKelas}</div></div>
          <div class="stat-card"><h4>Guru</h4><div class="value">${newData.guru}</div><div class="desc">${newData.ketGuru}</div></div>
          <div class="stat-card"><h4>Rasio</h4><div class="value">${newData.rasio}</div><div class="desc">${newData.ketRasio}</div></div>
        `;
      }catch(e){
        msg.style.display='block';
        msg.style.color='#991b1b';
        msg.style.background='#fee2e2';
        msg.style.padding='8px';
        msg.style.borderRadius='6px';
        msg.textContent = 'Gagal: '+e.message+' Pastikan Rules settings/statistik sudah publish.';
      }
      btn.textContent='💾 Simpan Perubahan'; btn.disabled=false;
    };
  }
}
