// js/config/features.js
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
    { nama: 'Katalog Arsip', icon: '📚', link: 'modules/arsip/arsip-katalog.html' }
  ],
  
  'data-statistik': [
    { nama: 'Demografi Sekolah', icon: '👥', link: 'modules/statistik/demografi.html' },
    { nama: 'Kehadiran & Absensi', icon: '📈', link: 'modules/statistik/kehadiran.html' },
    { nama: 'Prestasi & Akademik', icon: '🏆', link: 'modules/statistik/prestasi.html' }
  ],
  
  // ✅ UPDATED: Administrasi Pembelajaran + Bantuan AI (Groq)
  'admin-pembelajaran': [
    { 
      nama: 'Administrasi Pembelajaran', 
      icon: '📚', 
      link: 'modules/admin-pembelajaran/adm-pembelajaran.html' 
    },
    { 
      nama: 'Bantuan AI (Groq)', 
      icon: '🤖', 
      link: 'modules/bantuan-ai/bantuan-ai.html' 
    }
  ],
  
  'kolaborasi-global': [
    { nama: 'Sub-Fitur 1 (Placeholder)', icon: '🤝', link: 'kolaborasi/sub-1.html' }
  ],
  'monitoring': [
    { nama: 'Sub-Fitur 1 (Placeholder)', icon: '👁️', link: 'monitoring/sub-1.html' }
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
