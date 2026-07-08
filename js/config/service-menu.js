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
    { nama: 'Katalog Arsip', icon: '📚', link: 'modules/arsip/arsip-katalog.html' },
    { nama: 'Simpan File', icon: '', link: 'modules/arsip/simpan-file.html' }
  ],
  
  'data-statistik': [
    { nama: 'Demografi Sekolah', icon: '👥', link: 'modules/statistik/demografi.html' },
    { nama: 'Kehadiran & Absensi', icon: '📈', link: 'modules/statistik/kehadiran.html' },
    { nama: 'Prestasi & Akademik', icon: '', link: 'modules/statistik/prestasi.html' }
  ],
  
  'admin-pembelajaran': [
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
    { nama: 'Sub-Fitur 1 (Placeholder)', icon: '🤝', link: 'kolaborasi/sub-1.html' }
  ],

  // ✅ ENTRI KHUSUS GLOBAL MONITORING (1 Entry saja)
  // Logic 5 card grid akan dihandle oleh main.js di folder global-monitoring
  'global-monitoring': [
    { 
      nama: 'Global Monitoring', 
      icon: '', 
      link: 'modules/global-monitoring/global-monitoring.html' 
    }
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
