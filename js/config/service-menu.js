// js/config/service-menu.js
// Berisi daftar semua fitur dan sub-fitur aplikasi
// Link disesuaikan dengan arsitektur: SPA (?fitur=) vs Multi-Page (.html)

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
    },
    // ✨ TAMBAHAN BARU: Data Perpustakaan ✨
    { 
      nama: 'Data Perpustakaan', 
      icon: '📚', // Anda bisa menggantinya dengan URL favicon jika ada (misal: 'https://data.perpusnas.go.id/favicon.ico')
      link: 'https://data.perpusnas.go.id/login',
      isExternal: true
    }
  ],
  
  // ✅ MULTI-PAGE HTML (Langsung ke file .html)
  'dokumen-arsip': [
    { nama: 'Upload Dokumen', icon: '📤', link: 'modules/arsip/arsip-upload.html' },
    { nama: 'Katalog Arsip', icon: '📚', link: 'modules/arsip/arsip-katalog.html' },
    { nama: 'Simpan File', icon: '💾', link: 'modules/arsip/simpan-file.html' }
  ],
  
  // ✅ MULTI-PAGE HTML (Langsung ke file .html)
  'data-statistik': [
    { nama: 'Demografi Sekolah', icon: '👥', link: 'modules/statistik/demografi.html' },
    { nama: 'Kehadiran & Absensi', icon: '📈', link: 'modules/statistik/kehadiran.html' },
    { nama: 'Prestasi & Akademik', icon: '🏆', link: 'modules/statistik/prestasi.html' }
  ],
  
  // ✅ SPA (Single Page Application) dengan parameter ?fitur=
  'admin-pembelajaran': [
    { nama: 'CP, TP, & ATP', icon: '🎯', link: 'modules/admin-pembelajaran/adm-pembelajaran.html?fitur=cp-tp-atp' },
    { nama: 'Program Tahunan', icon: '', link: 'modules/admin-pembelajaran/adm-pembelajaran.html?fitur=prota' },
    { nama: 'Program Semester', icon: '🗓️', link: 'modules/admin-pembelajaran/adm-pembelajaran.html?fitur=promes' },
    { nama: 'lckh', icon: '📖', link: 'modules/admin-pembelajaran/adm-pembelajaran.html?fitur=lckh' },
    { nama: 'Jurnal Harian', icon: '', link: 'modules/admin-pembelajaran/adm-pembelajaran.html?fitur=jurnal' },
    { nama: 'Bank Soal', icon: '❓', link: 'modules/admin-pembelajaran/adm-pembelajaran.html?fitur=bank-soal' },
    { nama: 'Analisis KKTP', icon: '', link: 'modules/admin-pembelajaran/adm-pembelajaran.html?fitur=kktp' },
    { nama: 'Rumus 8-3-3-4', icon: '🔢', link: 'modules/admin-pembelajaran/adm-pembelajaran.html?fitur=rumus-8-3-3-4' },
    { nama: 'Refleksi Guru', icon: '🔍', link: 'modules/admin-pembelajaran/adm-pembelajaran.html?fitur=refleksi' },
    { nama: 'Kalender Pendidikan', icon: '📆', link: 'modules/admin-pembelajaran/adm-pembelajaran.html?fitur=kalender' },
    { nama: 'Jadwal Pembelajaran', icon: '⏰', link: 'modules/admin-pembelajaran/adm-pembelajaran.html?fitur=jadwal' },
    { nama: 'Presensi Siswa', icon: '✅', link: 'modules/admin-pembelajaran/adm-pembelajaran.html?fitur=presensi' },
    { nama: 'LKPD', icon: '📄', link: 'modules/admin-pembelajaran/adm-pembelajaran.html?fitur=lkpd' },
    { nama: 'Penilaian', icon: '', link: 'modules/admin-pembelajaran/adm-pembelajaran.html?fitur=penilaian' },
    { nama: 'Pembuat Soal', icon: '✍️', link: 'modules/admin-pembelajaran/adm-pembelajaran.html?fitur=pembuat-soal' },
    { nama: 'Pembuat Kisi-kisi', icon: '📋', link: 'modules/admin-pembelajaran/adm-pembelajaran.html?fitur=kisi-kisi' },
    { nama: 'coming-soon', icon: '📝', link: 'modules/admin-pembelajaran/adm-pembelajaran.html?fitur=coming-soon' },
    { nama: 'RPM Spesifik', icon: '', link: 'modules/admin-pembelajaran/adm-pembelajaran.html?fitur=rpm-spesifik' },
    { nama: 'Bantuan AI', icon: '🤖', link: 'modules/bantuan-ai/bantuan-ai.html' }
  ],
  
  // ⏳ PLACEHOLDER (Belum ada implementasi)
  'kolaborasi-global': [
    { nama: 'Kolaborasi Fitur 1', icon: '', link: 'modules/kolaborasi/fitur-1.html' },
    { nama: 'Kolaborasi Fitur 2', icon: '', link: 'modules/kolaborasi/fitur-2.html' }
  ],

  // ✅ SPA (Single Page Application) dengan parameter ?fitur=
  'global-monitoring': [
    { nama: 'Data Peserta Didik', icon: '👨‍🎓', link: 'modules/global-monitoring/global-monitoring.html?fitur=data-peserta-didik' },
    { nama: 'Supervisi Akademik', icon: '', link: 'modules/global-monitoring/global-monitoring.html?fitur=supervisi-akademik' },
    { nama: 'Aset Sarana', icon: '🏫', link: 'modules/global-monitoring/global-monitoring.html?fitur=aset-sarana' },
    { nama: 'Program Rencana', icon: '📝', link: 'modules/global-monitoring/global-monitoring.html?fitur=program-rencana' },
    { nama: 'Evaluasi Mandiri', icon: '📈', link: 'modules/global-monitoring/global-monitoring.html?fitur=evaluasi-mandiri' },
    { nama: 'Data TP', icon: '🎯', link: 'modules/global-monitoring/global-monitoring.html?fitur=data-tp' }
  ]
};

export const controlCenterFitur = {
  'control-center': [
    { nama: 'Manajemen Pengguna', icon: '👥', link: 'modules/control-center/manajemen-pengguna.html' },
    { nama: 'Data & Statistik', icon: '📊', link: 'modules/control-center/data-statistik.html' },
    { nama: 'Keamanan & Log', icon: '🔒', link: 'modules/control-center/keamanan-log.html' },
    { nama: 'Pengaturan Situs', icon: '⚙️', link: 'modules/control-center/pengaturan-situs.html' },
    { nama: 'Monitoring', icon: '📡', link: 'modules/control-center/monitoring.html' }
  ]
};
