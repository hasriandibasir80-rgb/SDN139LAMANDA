import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from '../../../js/firebase-config.js'; // Sesuaikan path relatif ke firebase-config

// Fungsi untuk mengambil data CP dari Firebase
export async function loadCapaianPembelajaran() {
  const userData = JSON.parse(localStorage.getItem('currentUser') || '{}');
  const npsn = userData.npsn || userData.idSekolah;
  
  if (!npsn) {
    console.warn('NPSN tidak ditemukan, tidak bisa memuat data CP.');
    return [];
  }

  try {
    // Mengambil data langsung dari path terpusat di Firebase
    const collectionPath = `sekolah/${npsn}/data_cp`;
    const q = query(collection(db, collectionPath), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Gagal memuat data CP dari Firebase:', error);
    return [];
  }
}
