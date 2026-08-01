/**
 * ============================================================================
 * PROTA.JS — Modul Program Tahunan Kurikulum Merdeka
 * ============================================================================
 * Deskripsi: Mengelola perhitungan, distribusi, dan render Program Tahunan
 *            sesuai standar BSKAP Kemendikbudristek.
 * Versi    : 1.0.0
 * Author   : Tim Pengembang Situs Sekolah (Kolaborasi)
 * Lisensi  : Internal Sekolah
 * ============================================================================
 */

// ============================================================================
// 1. KONSTANTA & DEFAULT CONFIG
// ============================================================================
export const DEFAULT_CONFIG = {
  semester: {
    count: 2,
    names: ['SEMESTER 1', 'SEMESTER 2'],
  },
  jpPerWeek: 5, // default JP per minggu (bisa di-override per mapel)
  bufferWeeks: 1, // minggu cadangan per semester
  minEffectiveWeeks: 12,
};

export const ELEMEN_CP = {
  BAHASA_INDONESIA: ['Menyimak', 'Membaca & Memirsa', 'Berbicara', 'Menulis'],
  MATEMATIKA:       ['Bilangan', 'Aljabar', 'Pengukuran', 'Geometri', 'Analisis Data & Peluang'],
  IPAS:             ['Pemahaman IPAS', 'Keterampilan Proses'],
  PAI:              ["Al-Qur'an & Hadis", "Akidah", "Akhlak", "Fikih", "SPI"],
  PJOK:             ['Keterampilan Gerak', 'Pengetahuan Gerak', 'Pemanfaatan Gerak', 'Pengembangan Karakter'],
};

// ============================================================================
// 2. KELAS UTAMA: ProtaManager
// ============================================================================
/**
 * Manager utama untuk Program Tahunan.
 * Bertugas: validasi, kalkulasi, distribusi, render, dan export.
 */
export class ProtaManager {
  /**
   * @param {Object} identitas - Data identitas sekolah & mapel
   * @param {Object} options   - Konfigurasi tambahan
   */
  constructor(identitas = {}, options = {}) {
    this.config = { ...DEFAULT_CONFIG, ...options };
    this.identitas = this._validateIdentitas(identitas);
    this.kalender = { semester1: null, semester2: null };
    this.atp = []; // daftar Tujuan Pembelajaran
    this.distribusi = []; // hasil distribusi JP
  }

  // --------------------------------------------------------------------------
  // 2.1. Validasi & Setter
  // --------------------------------------------------------------------------
  _validateIdentitas(id) {
    const required = ['sekolah', 'mapel', 'fase', 'kelas', 'tahunPelajaran'];
    for (const key of required) {
      if (!id[key]) throw new Error(`[ProtaManager] Identitas wajib: ${key}`);
    }
    return {
      sekolah: id.sekolah,
      mapel: id.mapel,
      fase: id.fase,
      kelas: id.kelas,
      tahunPelajaran: id.tahunPelajaran,
      guru: id.guru || '',
      nip: id.nip || '',
      kepsek: id.kepsek || '',
      nipKepsek: id.nipKepsek || '',
    };
  }

  /**
   * Set data kalender pendidikan per semester.
   * @param {1|2} semester
   * @param {Object} data - { totalMinggu, mingguTidakEfektif[] }
   */
  setKalender(semester, data) {
    if (![1, 2].includes(semester)) throw new Error('Semester harus 1 atau 2');
    const key = `semester${semester}`;
    this.kalender[key] = {
      totalMinggu: data.totalMinggu,
      mingguTidakEfektif: data.mingguTidakEfektif || [],
    };
    return this;
  }

  /**
   * Set daftar ATP/TP.
   * @param {Array<Object>} atpList - [{id, elemen, tp, jpEstimasi, semester}]
   */
  setATP(atpList) {
    if (!Array.isArray(atpList)) throw new Error('ATP harus berupa array');
    this.atp = atpList.map((item, idx) => ({
      no: idx + 1,
      id: item.id || `TP-${idx + 1}`,
      semester: item.semester || 1,
      elemen: item.elemen || '-',
      tp: item.tp || '',
      jpEstimasi: Number(item.jpEstimasi) || 0,
      keterangan: item.keterangan || '',
    }));
    return this;
  }

  // --------------------------------------------------------------------------
  // 2.2. Kalkulasi Waktu
  // --------------------------------------------------------------------------
  /**
   * Hitung minggu efektif & total JP per semester.
   * @returns {Object} { semester1: {...}, semester2: {...}, totalJP }
   */
  hitungWaktu() {
    const result = {};
    let totalJP = 0;

    for (const sem of [1, 2]) {
      const key = `semester${sem}`;
      const kal = this.kalender[key];
      if (!kal) throw new Error(`Kalender semester ${sem} belum diatur`);

      const mingguTidakEfektif = kal.mingguTidakEfektif.length;
      const mingguEfektif = kal.totalMinggu - mingguTidakEfektif;

      if (mingguEfektif < this.config.minEffectiveWeeks) {
        console.warn(`[Prota] Semester ${sem}: minggu efektif (${mingguEfektif}) di bawah minimum`);
      }

      const jpTersedia = mingguEfektif * this.config.jpPerWeek;
      result[key] = {
        semester: sem,
        nama: this.config.semester.names[sem - 1],
        totalMinggu: kal.totalMinggu,
        mingguTidakEfektif,
        mingguEfektif,
        jpPerWeek: this.config.jpPerWeek,
        jpTersedia,
      };
      totalJP += jpTersedia;
    }

    result.totalJP = totalJP;
    this._waktuResult = result;
    return result;
  }

  // --------------------------------------------------------------------------
  // 2.3. Distribusi Materi
  // --------------------------------------------------------------------------
  /**
   * Distribusikan ATP ke dalam tabel Prota + hitung total JP terpakai.
   * @returns {Array<Object>} data siap render
   */
  distribusikan() {
    if (!this._waktuResult) this.hitungWaktu();

    const grouped = { 1: [], 2: [] };
    this.atp.forEach(tp => {
      if (grouped[tp.semester]) grouped[tp.semester].push(tp);
    });

    const distribusi = [];
    let totalTerpakai = 0;

    for (const sem of [1, 2]) {
      distribusi.push({ type: 'semester-header', nama: this.config.semester.names[sem - 1] });
      grouped[sem].forEach(tp => {
        distribusi.push({ type: 'tp', ...tp });
        totalTerpakai += tp.jpEstimasi;
      });
      // Baris cadangan
      const sisa = this._waktuResult[`semester${sem}`].jpTersedia -
                   grouped[sem].reduce((s, t) => s + t.jpEstimasi, 0);
      if (sisa > 0) {
        distribusi.push({
          type: 'buffer',
          elemen: 'Cadangan / Pengayaan',
          tp: 'Kegiatan literasi, remedial, & pembelajaran berdiferensiasi',
          jpEstimasi: sisa,
          keterangan: 'Fleksibel',
        });
      }
    }

    this.distribusi = distribusi;
    this._totalTerpakai = totalTerpakai;
    return distribusi;
  }

  // --------------------------------------------------------------------------
  // 2.4. Render HTML
  // --------------------------------------------------------------------------
  /**
   * Render Prota ke dalam container DOM.
   * @param {string|HTMLElement} container - selector atau elemen
   */
  render(container) {
    const el = typeof container === 'string'
      ? document.querySelector(container)
      : container;
    if (!el) throw new Error('Container tidak ditemukan');

    if (!this.distribusi.length) this.distribusikan();

    el.innerHTML = `
      <div class="prota-wrapper">
        ${this._renderIdentitas()}
        ${this._renderTabel()}
        ${this._renderTTD()}
      </div>
    `;

    this._bindEvents(el);
  }

  _renderIdentitas() {
    const id = this.identitas;
    return `
      <div class="prota-identitas">
        <h2 class="prota-title">PROGRAM TAHUNAN (PROTA)</h2>
        <p class="prota-subtitle">Kurikulum Merdeka — Tahun Pelajaran ${id.tahunPelajaran}</p>
        <table class="prota-meta">
          <tr><td>Satuan Pendidikan</td><td>: ${id.sekolah}</td></tr>
          <tr><td>Mata Pelajaran</td><td>: ${id.mapel}</td></tr>
          <tr><td>Fase / Kelas</td><td>: ${id.fase} / ${id.kelas}</td></tr>
          <tr><td>Tahun Pelajaran</td><td>: ${id.tahunPelajaran}</td></tr>
        </table>
      </div>
    `;
  }

  _renderTabel() {
    let rows = '';
    let noCounter = 0;

    this.distribusi.forEach(row => {
      if (row.type === 'semester-header') {
        rows += `<tr class="semester-row"><td colspan="6">${row.nama}</td></tr>`;
      } else if (row.type === 'tp') {
        noCounter++;
        rows += `
          <tr>
            <td class="center">${noCounter}</td>
            <td></td>
            <td>${row.elemen}</td>
            <td>${row.tp}</td>
            <td class="center">${row.jpEstimasi}</td>
            <td>${row.keterangan}</td>
          </tr>`;
      } else if (row.type === 'buffer') {
        rows += `
          <tr class="buffer-row">
            <td></td><td></td>
            <td>${row.elemen}</td>
            <td>${row.tp}</td>
            <td class="center">${row.jpEstimasi}</td>
            <td>${row.keterangan}</td>
          </tr>`;
      }
    });

    const totalJP = this._waktuResult?.totalJP || 0;
    rows += `
      <tr class="total-row">
        <td colspan="4" class="center"><strong>TOTAL JAM PELAJARAN 1 TAHUN</strong></td>
        <td class="center"><strong>${totalJP}</strong></td>
        <td></td>
      </tr>`;

    return `
      <table class="prota-table">
        <thead>
          <tr>
            <th>No</th><th>Semester</th><th>Elemen CP</th>
            <th>Tujuan Pembelajaran (TP)</th><th>JP</th><th>Keterangan</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  _renderTTD() {
    const id = this.identitas;
    const today = new Date().toLocaleDateString('id-ID', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
    return `
      <table class="prota-ttd">
        <tr>
          <td>
            Mengetahui,<br>Kepala Sekolah<br><br><br><br>
            (<u>${id.kepsek || '...........................'}</u>)<br>
            NIP. ${id.nipKepsek || ''}
          </td>
          <td>
            ${today}<br>Guru Mata Pelajaran<br><br><br><br>
            (<u>${id.guru || '...........................'}</u>)<br>
            NIP. ${id.nip || ''}
          </td>
        </tr>
      </table>
    `;
  }

  _bindEvents(root) {
    // Hook untuk event custom (bisa di-extend oleh repo)
    root.dispatchEvent(new CustomEvent('prota:rendered', { detail: this }));
  }

  // --------------------------------------------------------------------------
  // 2.5. Export
  // --------------------------------------------------------------------------
  /**
   * Cetak Prota (gunakan CSS @media print).
   */
  print() {
    window.print();
  }

  /**
   * Export data Prota ke JSON (untuk backup / API).
   */
  toJSON() {
    return {
      identitas: this.identitas,
      kalender: this.kalender,
      waktu: this._waktuResult,
      distribusi: this.distribusi,
      totalJP: this._waktuResult?.totalJP || 0,
      exportedAt: new Date().toISOString(),
    };
  }

  /**
   * Download JSON.
   */
  downloadJSON(filename = 'prota.json') {
    const blob = new Blob([JSON.stringify(this.toJSON(), null, 2)],
      { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }
}

// ============================================================================
// 3. FUNGSI UTILITAS (Standalone)
// ============================================================================
/**
 * Hitung cepat minggu efektif tanpa instansiasi class.
 * @param {number} totalMinggu
 * @param {number} mingguTidakEfektif
 * @param {number} jpPerWeek
 * @returns {Object}
 */
export function hitungMingguEfektif(totalMinggu, mingguTidakEfektif, jpPerWeek = 5) {
  const efektif = totalMinggu - mingguTidakEfektif;
  return {
    totalMinggu,
    mingguTidakEfektif,
    mingguEfektif: efektif,
    jpPerWeek,
    jpTersedia: efektif * jpPerWeek,
  };
}

/**
 * Validasi apakah total JP ATP tidak melebihi JP tersedia.
 * @param {Array} atpList
 * @param {number} jpTersedia
 * @returns {Object} { valid, selisih, pesan }
 */
export function validasiDistribusi(atpList, jpTersedia) {
  const terpakai = atpList.reduce((s, t) => s + Number(t.jpEstimasi || 0), 0);
  const selisih = jpTersedia - terpakai;
  return {
    valid: selisih >= 0,
    terpakai,
    jpTersedia,
    selisih,
    pesan: selisih < 0
      ? `⚠️ JP terpakai (${terpakai}) melebihi tersedia (${jpTersedia})`
      : `✅ Sisa JP: ${selisih} (untuk cadangan/pengayaan)`,
  };
}

// ============================================================================
// 4. DEFAULT EXPORT (untuk kemudahan import)
// ============================================================================
export default ProtaManager;
