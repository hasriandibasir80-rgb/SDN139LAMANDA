// js/config/service-menu.js
// Berisi daftar semua fitur dan sub-fitur aplikasi
// Path link bersifat RELATIF terhadap dashboard.html (root folder)

export const konfigurasiFitur = {
  'layanan-portal': [
    { 
      nama: 'SIAGA Pendis (Login)', 
      icon: 'https://siagapendis.kemenag.go.id/favicon.ico',
      link: 'modules/siaga-pendis.html',
      isExternal: true
    },
    { 
      nama: 'SIMPKB (Portal Guru)', 
      icon: 'https://portal.simpkb.id/favicon.ico',
      link: 'modules/simpkb.html',
      isExternal: true
    }
  ],
  
  'dokumen-arsip': [
    { nama: 'Upload Dokumen', icon: '📤', link: 'modules/arsip/arsip-upload.html' },
    { nama: 'Katalog Arsip', icon: '', link: 'modules/arsip/arsip-katalog.html' },
    { nama: 'Simpan File', icon: '💾', link: 'modules/arsip/simpan-file.html' }
  ],
  
  'data-statistik': [
    { nama: 'Demografi Sekolah', icon: '👥', link: 'modules/statistik/demografi.html' },
    { nama: 'Kehadiran & Absensi', icon: '', link: 'modules/statistik/kehadiran.html' },
    { nama: 'Prestasi & Akademik', icon: '🏆', link: 'modules/statistik/prestasi.html' }
  ],
  
  // ✅ DIPERBARUI LENGKAP: Semua sub-fitur Administrasi Pembelajaran
  'admin-pembelajaran': [
    { 
      nama: 'CP, TP, & ATP', 
      icon: '🎯', 
      link: 'modules/admin-pembelajaran/cp-tp-atp.html' 
    },
    { 
      nama: 'Program Tahunan', 
      icon: '📅', 
      link: 'modules/admin-pembelajaran/program-tahunan.html' 
    },
    { 
      nama: 'Program Semester', 
      icon: '📆', 
      link: 'modules/admin-pembelajaran/program-semester.html' 
    },
    { 
      nama: 'Modul Ajar', 
      icon: '📖', 
      link: 'modules/admin-pembelajaran/modul-ajar.html' 
    },
    { 
      nama: 'Jurnal Harian', 
      icon: '📝', 
      link: 'modules/admin-pembelajaran/jurnal-harian.html' 
    },
    { 
      nama: 'Bank Soal', 
      icon: '❓', 
      link: 'modules/admin-pembelajaran/bank-soal.html' 
    },
    { 
      nama: 'Analisis KKTP', 
      icon: '📊', 
      link: 'modules/admin-pembelajaran/analisis-kktp.html' 
    },
    { 
      nama: 'Rumus 8-3-3-4', 
      icon: '🔢', 
      link: 'modules/admin-pembelajaran/rumus-8-3-3-4.html' 
    },
    { 
      nama: 'Refleksi Guru', 
      icon: '🔍', 
      link: 'modules/admin-pembelajaran/refleksi-guru.html' 
    },
    { 
      nama: 'Kalender Pendidikan', 
      icon: '📆', 
      link: 'modules/admin-pembelajaran/kalender-pendidikan.html' 
    },
    { 
      nama: 'Jadwal Pembelajaran', 
      icon: '⏰', 
      link: 'modules/admin-pembelajaran/jadwal-pembelajaran.html' 
    },
    { 
      nama: 'Presensi Siswa', 
      icon: '✅', 
      link: 'modules/admin-pembelajaran/presensi-siswa.html' 
    },
    { 
      nama: 'LKPD', 
      icon: '📄', 
      link: 'modules/admin-pembelajaran/lkpd.html' 
    },
    { 
      nama: 'Penilaian', 
      icon: '📊', 
      link: 'modules/admin-pembelajaran/penilaian.html' 
    },
    { 
      nama: 'Pembuat Soal', 
      icon: '✏️', 
      link: 'modules/admin-pembelajaran/pembuat-soal.html' 
    },
    { 
      nama: 'Pembuat Kisi-kisi', 
      icon: '📋', 
      link: 'modules/admin-pembelajaran/pembuat-kisi-kisi.html' 
    },
    { 
      nama: 'RPM Standar', 
      icon: '📄', 
      link: 'modules/admin-pembelajaran/rpm-standar.html' 
    },
    { 
      nama: 'RPM Spesifik', 
      icon: '🎯', 
      link: 'modules/admin-pembelajaran/rpm-spesifik.html' 
    },
    { 
      nama: 'Administrasi Pembelajaran', 
      icon: '📚', 
      link: 'modules/admin-pembelajaran/adm-pembelajaran.html' 
    },
    { 
      nama: 'Bantuan AI', 
      icon: '🤖', 
      link: 'modules/bantuan-ai/bantuan-ai.html' 
    }
  ],
  
  'kolaborasi-global': [
    { nama: 'Sub-Fitur 1 (Placeholder)', icon: '', link: 'kolaborasi/sub-1.html' }
  ],

  // ✅ DIPERBARUI LENGKAP: Semua sub-fitur Global Monitoring
  'global-monitoring': [
    { 
      nama: 'Data Peserta Didik', 
      icon: '‍🎓', 
      link: 'modules/global-monitoring/data-peserta-didik.html' 
    },
    { 
      nama: 'Supervisi Akademik', 
      icon: '🎓', 
      link: 'modules/global-monitoring/supervisi-akademik.html' 
    },
    { 
      nama: 'Aset Sarana', 
      icon: '', 
      link: 'modules/global-monitoring/aset-sarana.html' 
    },
    { 
      nama: 'Program Rencana', 
      icon: '📝', 
      link: 'modules/global-monitoring/program-rencana.html' 
    },
    { 
      nama: 'Evaluasi Mandiri', 
      icon: '', 
      link: 'modules/global-monitoring/evaluasi-mandiri.html' 
    },
    { 
      nama: 'Data TP', 
      icon: '🎯', 
      link: 'modules/global-monitoring/data-tp.html' 
    }
  ]
};

export const controlCenterFitur = {
  'control-center': [
    { nama: 'Manajemen Pengguna', icon: '👥', link: 'modules/control-center/manajemen-pengguna.html' },
    { nama: 'Data & Statistik', icon: '', link: 'modules/control-center/data-statistik.html' },
    { nama: 'Keamanan & Log', icon: '🔒', link: 'modules/control-center/keamanan-log.html' },
    { nama: 'Pengaturan Situs', icon: '️', link: 'modules/control-center/pengaturan-situs.html' },
    { nama: 'Monitoring', icon: '📡', link: 'modules/control-center/monitoring.html' }
  ]
};
