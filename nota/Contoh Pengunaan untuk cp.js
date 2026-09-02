// Di dalam fitur lain (misal: program-tahunan.js)
import { loadCapaianPembelajaran } from './data-cp.js'; // Atau copy fungsi di atas

async function init() {
  // 1. Panggil fungsi untuk ambil data dari Firebase
  const daftarCP = await loadCapaianPembelajaran();
  
  // 2. Gunakan datanya (misal: isi ke dropdown/select option)
  const selectElement = document.getElementById('dropdown-cp');
  selectElement.innerHTML = '<option value="">Pilih CP...</option>';
  
  daftarCP.forEach(cp => {
    const option = document.createElement('option');
    option.value = cp.id;
    option.textContent = `${cp.kode} - ${cp.deskripsi.substring(0, 50)}...`;
    selectElement.appendChild(option);
  });
}
