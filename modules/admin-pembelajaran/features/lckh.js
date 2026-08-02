/**
 * modules/admin-pembelajaran/features/lckh.js
 * Sub Fitur: Laporan Capaian Kinerja Harian (LCKH)
 * Setara dengan: bank-soal.js, jurnal.js, rpm spesifik, dll
 * Penempatan: /modules/admin-pembelajaran/features/lckh.js
 * Dependensi: Firebase Firestore (collection: lckh), Auth
 */

const LCKHFeature = (() => {
  const COLLECTION = 'lckh';
  const RHK_LIST = [
    "Melaksanakan proses pembelajaran",
    "Melaksanakan evaluasi & penilaian",
    "Menyusun perangkat ajar (Modul/RPP)",
    "Tugas tambahan Wali Kelas",
    "Pembinaan ekstrakurikuler",
    "Pengembangan kompetensi (PMM)",
    "Tugas piket / upacara / administrasi",
    "Tugas lain dari Kepala Sekolah"
  ];

  const getCurrentUser = () => {
    try {
      return JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
    } catch { return {}; }
  };

  const todayISO = () => new Date().toISOString().split('T')[0];

  function render() {
    return `
    <div class="feature-lckh" style="padding:16px">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:16px">
        <div>
          <h2 style="margin:0; font-size:20px">Laporan Capaian Kinerja Harian (LCKH)</h2>
          <small style="color:#64748b">Sub fitur Adm. Pembelajaran • Sinkron E-Kinerja BKN</small>
        </div>
        <div style="display:flex; gap:8px">
          <input type="month" id="lckh-filter-bulan" value="${new Date().toISOString().slice(0,7)}" style="padding:8px; border-radius:8px; border:1px solid #cbd5e1">
          <button onclick="LCKHFeature.exportCSV()" style="padding:8px 12px; border-radius:8px; border:1px solid #cbd5e1; background:white; cursor:pointer">Export Excel</button>
          <button onclick="LCKHFeature.print()" style="padding:8px 12px; border-radius:8px; background:#1e3a8a; color:white; border:none; cursor:pointer">Cetak</button>
        </div>
      </div>

      <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:16px; margin-bottom:20px">
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px,1fr)); gap:12px">
          <div><label>Tanggal</label><input type="date" id="lckh-tgl" value="${todayISO()}" style="width:100%; padding:8px; border-radius:8px; border:1px solid #cbd5e1"></div>
          <div><label>RHK / SKP</label><select id="lckh-rhk" style="width:100%; padding:8px; border-radius:8px; border:1px solid #cbd5e1">${RHK_LIST.map(r=>`<option>${r}</option>`).join('')}</select></div>
          <div><label>Target</label><input type="number" id="lckh-target" value="1" min="0" style="width:100%; padding:8px; border-radius:8px; border:1px solid #cbd5e1"></div>
          <div><label>Realisasi</label><input type="number" id="lckh-realisasi" value="1" min="0" style="width:100%; padding:8px; border-radius:8px; border:1px solid #cbd5e1"></div>
        </div>
        <div style="margin-top:12px; display:grid; gap:12px">
          <input type="text" id="lckh-kegiatan" placeholder="Uraian kegiatan (mis: Mengajar Kelas 5 Tema 2 - 2 JP)" style="padding:10px; border-radius:8px; border:1px solid #cbd5e1">
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px">
            <input type="text" id="lckh-bukti" placeholder="Link bukti dukung (Drive / foto / link PMM)">
            <input type="text" id="lckh-kendala" placeholder="Kendala (opsional)">
          </div>
        </div>
        <div style="margin-top:12px; text-align:right">
          <button onclick="LCKHFeature.save()" style="padding:10px 18px; border-radius:8px; background:#1e3a8a; color:white; border:none; cursor:pointer; font-weight:600">+ Simpan LCKH</button>
        </div>
      </div>

      <div id="lckh-rekap" style="margin-bottom:12px; padding:10px 14px; background:#eff6ff; border-radius:8px; color:#1e40af; font-size:14px"></div>

      <div style="overflow:auto; background:white; border:1px solid #e2e8f0; border-radius:12px">
        <table style="width:100%; border-collapse:collapse; font-size:14px">
          <thead style="background:#f1f5f9; text-align:left"><tr>
            <th style="padding:10px">Tanggal</th><th>RHK & Kegiatan</th><th>T</th><th>R</th><th>Capaian</th><th>Bukti</th><th>Aksi</th>
          </tr></thead>
          <tbody id="lckh-tbody"><tr><td colspan="7" style="padding:20px; text-align:center">Memuat data...</td></tr></tbody>
        </table>
      </div>
    </div>`;
  }

  let cacheData = [];

  async function init() {
    document.getElementById('lckh-filter-bulan')?.addEventListener('change', loadData);
    await loadData();
  }

  async function loadData() {
    const bulan = document.getElementById('lckh-filter-bulan')?.value || new Date().toISOString().slice(0,7);
    const tbody = document.getElementById('lckh-tbody');
    const rekapEl = document.getElementById('lckh-rekap');
    try {
      if (window.db && window.firebase) {
        const user = getCurrentUser();
        const snap = await window.db.collection(COLLECTION)
          .where('email', '==', user.email || '')
          .where('bulan', '==', bulan)
          .orderBy('tanggal','desc')
          .get();
        cacheData = snap.docs.map(d => ({id:d.id, ...d.data()}));
      } else {
        const all = JSON.parse(localStorage.getItem('lckh_sdn139') || '[]');
        cacheData = all.filter(x => x.bulan === bulan || x.tanggal?.startsWith(bulan));
      }

      if (!cacheData.length) {
        tbody.innerHTML = `<tr><td colspan="7" style="padding:20px; text-align:center; color:#64748b">Belum ada LCKH di bulan ${bulan}</td></tr>`;
        if(rekapEl) rekapEl.innerHTML = `Bulan ${bulan}: 0 laporan`;
        return;
      }

      const total = cacheData.length;
      const avg = Math.round(cacheData.reduce((s,x)=>s+(x.capaian||0),0)/total);
      if(rekapEl) rekapEl.innerHTML = `Bulan <b>${bulan}</b> • ${total} laporan • Rata-rata capaian <b>${avg}%</b>`;

      tbody.innerHTML = cacheData.map(item => `
        <tr style="border-top:1px solid #e2e8f0">
          <td style="padding:10px">${item.tanggal}</td>
          <td style="padding:10px"><small style="color:#64748b">${item.rhk}</small><br><b>${item.kegiatan}</b></td>
          <td style="padding:10px; text-align:center">${item.target}</td>
          <td style="padding:10px; text-align:center">${item.realisasi}</td>
          <td style="padding:10px; text-align:center"><span style="background:${item.capaian>=100?'#16a34a':item.capaian>=80?'#f59e0b':'#dc2626'}; color:white; padding:2px 8px; border-radius:10px; font-size:12px">${item.capaian}%</span></td>
          <td style="padding:10px">${item.bukti && item.bukti !== '-' ? `<a href="${item.bukti}" target="_blank">Lihat</a>` : '-'}<br><small>${item.kendala||''}</small></td>
          <td style="padding:10px"><button onclick="LCKHFeature.remove('${item.id}')" style="border:none; background:#fee2e2; color:#b91c1c; padding:5px 8px; border-radius:6px; cursor:pointer">Hapus</button></td>
        </tr>
      `).join('');
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="7" style="padding:12px; color:red">Error load: ${e.message}</td></tr>`;
    }
  }

  async function save() {
    const tgl = document.getElementById('lckh-tgl').value;
    const rhk = document.getElementById('lckh-rhk').value;
    const kegiatan = document.getElementById('lckh-kegiatan').value.trim();
    const target = parseFloat(document.getElementById('lckh-target').value) || 0;
    const realisasi = parseFloat(document.getElementById('lckh-realisasi').value) || 0;
    const bukti = document.getElementById('lckh-bukti').value.trim() || '-';
    const kendala = document.getElementById('lckh-kendala').value.trim() || '-';
    if(!kegiatan) return alert('Uraian kegiatan wajib diisi');
    const capaian = target>0 ? Math.min(100, Math.round((realisasi/target)*100)) : 100;
    const bulan = tgl.slice(0,7);
    const user = getCurrentUser();
    const payload = { tanggal:tgl, bulan, rhk, kegiatan, target, realisasi, capaian, bukti, kendala, email:user.email||'anonim', nama:user.nama||user.displayName||'Guru', createdAt: new Date().toISOString() };
    try {
      if (window.db && window.firebase) {
        await window.db.collection(COLLECTION).add(payload);
      } else {
        const all = JSON.parse(localStorage.getItem('lckh_sdn139') || '[]');
        payload.id = Date.now().toString();
        all.push(payload);
        localStorage.setItem('lckh_sdn139', JSON.stringify(all));
      }
      document.getElementById('lckh-kegiatan').value = '';
      document.getElementById('lckh-bukti').value = '';
      await loadData();
    } catch (e) { alert('Gagal simpan: '+e.message); }
  }

  async function remove(id) {
    if(!confirm('Hapus LCKH ini?')) return;
    try {
      if (window.db && window.firebase) {
        await window.db.collection(COLLECTION).doc(id).delete();
      } else {
        let all = JSON.parse(localStorage.getItem('lckh_sdn139') || '[]');
        all = all.filter(x=>x.id != id);
        localStorage.setItem('lckh_sdn139', JSON.stringify(all));
      }
      loadData();
    } catch(e){ alert(e.message) }
  }

  function exportCSV() {
    if(!cacheData.length) return alert('Tidak ada data');
    let csv = "Tanggal,Bulan,RHK,Kegiatan,Target,Realisasi,Capaian,Bukti,Kendala,Nama,Email\n";
    cacheData.forEach(r=>{
      csv += `"${r.tanggal}","${r.bulan}","${(r.rhk||'').replace(/"/g,'""')}","${(r.kegiatan||'').replace(/"/g,'""')}",${r.target},${r.realisasi},${r.capaian}%,"${r.bukti}","${r.kendala}","${r.nama}","${r.email}"\n`;
    });
    const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download=`LCKH_${document.getElementById('lckh-filter-bulan').value}_SDN139.csv`; a.click();
  }

  function print(){ window.print(); }

  return { render, init, save, remove, exportCSV, print, loadData };
})();

if(typeof module !== 'undefined') module.exports = LCKHFeature;
window.LCKHFeature = LCKHFeature;
