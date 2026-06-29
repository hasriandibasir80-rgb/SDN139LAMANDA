// 5. PROSES UPLOAD LANGSUNG (DENGAN FAIL-SAFE)
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const namaDokumen = document.getElementById('namaDokumen').value.trim();
  const kategori = document.getElementById('kategori').value;
  const levelAkses = document.getElementById('levelAkses').value;
  const deskripsi = document.getElementById('deskripsi').value.trim();
  const file = fileInput.files[0];

  if (!file) {
    showStatus('error', '⚠️ Silakan pilih file terlebih dahulu.');
    return;
  }

  uploadAborted = false;
  btnUpload.disabled = true;
  btnText.textContent = '⏳ Menyiapkan upload...';
  showStatus('loading', '📤 Memulai upload...');

  try {
    // Step 1: Init upload session
    showStatus('loading', '📤 Menginisialisasi session upload...');
    
    const sessionRes = await fetch(APP_SCRIPT_URL + '?action=initUpload', {
      method: 'POST',
      body: JSON.stringify({
        fileName: `${Date.now()}_${file.name.replace(/\s+/g, '_')}`,
        mimeType: file.type || 'application/octet-stream',
        folderName: kategori,
        totalSize: file.size
      })
    });
    
    const sessionData = await sessionRes.json();
    if (sessionData.status !== 'ready') {
      throw new Error(sessionData.message || 'Gagal inisialisasi upload');
    }
    
    const { uploadId, fileId } = sessionData;
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

    // Step 2: Upload per chunk
    let finalResult = null;
    let uploadSuccess = false;

    for (let i = 0; i < totalChunks; i++) {
      if (uploadAborted) throw new Error('Upload dibatalkan');

      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const chunk = file.slice(start, end);
      const base64Chunk = await blobToBase64(chunk);

      btnText.textContent = `⏳ Upload ${i+1}/${totalChunks}`;
      showStatus('loading', `☁️ Mengunggah chunk ${i+1} dari ${totalChunks}... (${(end/file.size*100).toFixed(1)}%)`);

      const chunkRes = await fetch(APP_SCRIPT_URL + '?action=uploadChunk', {
        method: 'POST',
        body: JSON.stringify({
          uploadId,
          fileId,
          chunkIndex: i,
          totalChunks,
          data: base64Chunk.split(',')[1]
        })
      });

      const chunkResult = await chunkRes.json();
      
      // ✅ ACCEPT 'complete', 'success', ATAU 'error' DENGAN FILE ID
      if (chunkResult.status === 'error' && !chunkResult.id) {
        throw new Error(chunkResult.message || 'Gagal upload chunk');
      }

      // Simpan hasil chunk terakhir
      if (i === totalChunks - 1) {
        finalResult = chunkResult;
        // ✅ Tandai sukses jika ada file ID atau status complete/success
        uploadSuccess = chunkResult.id || chunkResult.status === 'complete' || chunkResult.status === 'success';
      }
    }

    // Step 3: SIMPAN METADATA (Fail-Safe)
    if (finalResult) {
      console.log('📦 Hasil upload:', finalResult);
      
      // ✅ CEK: Apakah file ID ada? (artinya file sudah terupload ke Drive)
      if (uploadSuccess || finalResult.id) {
        console.log('✅ File terdeteksi sudah terupload ke Drive. Menyimpan metadata...');
        
        await simpanMetadata({
          namaDokumen, kategori, levelAkses, deskripsi, file,
          url: finalResult.url || `https://drive.google.com/file/d/${finalResult.id}/view`,
          id: finalResult.id,
          name: finalResult.name || file.name,
          hasError: finalResult.status === 'error' // Flag untuk tracking
        });
      } else {
        throw new Error('Upload selesai tapi tidak ada file ID dari Apps Script.');
      }
    } else {
      throw new Error('Tidak ada respons dari Apps Script.');
    }

  } catch (error) {
    console.error('❌ Upload error:', error);
    showStatus('error', `❌ Gagal upload: ${error.message}`);
    cleanupUpload();
  }
});

// 6. FUNGSI SIMPAN METADATA (FAIL-SAFE VERSION)
async function simpanMetadata(uploadData) {
  try {
    showStatus('loading', '💾 Menyimpan metadata ke Firestore...');
    
    const metadata = {
      namaDokumen: uploadData.namaDokumen,
      kategori: uploadData.kategori,
      levelAkses: uploadData.levelAkses,
      deskripsi: uploadData.deskripsi,
      namaFile: uploadData.file.name,
      ukuranFile: uploadData.file.size,
      tipeFile: uploadData.file.type || 'unknown',
      urlFile: uploadData.url,
      driveFileId: uploadData.id,
      uploaderUid: currentUser.uid,
      uploaderEmail: currentUser.email || 'unknown',
      tanggalUpload: serverTimestamp(),
      versi: 1,
      status: uploadData.hasError ? 'warning' : 'aktif', // Track jika ada error
      uploadError: uploadData.hasError ? 'File terupload tapi Apps Script mengembalikan error' : null
    };
    
    console.log(' Data yang akan disimpan:', metadata);
    
    const docRef = await addDoc(collection(db, 'documents'), metadata);
    console.log('✅ Metadata berhasil disimpan dengan ID:', docRef.id);
    
    // ✅ PESAN YANG LEBIH AKURAT
    if (uploadData.hasError) {
      showStatus('warning', '⚠️ File berhasil terupload ke Drive, tapi ada error dari Apps Script. Metadata tetap disimpan.');
    } else {
      showStatus('success', '✅ Dokumen berhasil diunggah ke Google Drive dan disimpan!');
    }
    
    form.reset();
    fileInfo.style.display = 'none';
    
    // Muat ulang daftar dokumen terbaru
    await muatRecentUploads();
    
  } catch (error) {
    console.error('❌ Error saving metadata:', error);
    
    // ✅ FAIL-SAFE: Tampilkan URL manual jika Firestore gagal
    const manualUrl = uploadData.url || `https://drive.google.com/file/d/${uploadData.id}/view`;
    showStatus('error', `❌ Gagal simpan metadata: ${error.message}\n\n URL File (simpan manual): ${manualUrl}`);
  } finally {
    cleanupUpload();
  }
}
