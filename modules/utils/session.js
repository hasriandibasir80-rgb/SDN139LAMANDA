/**
 * Session & Auto-Fill Helper - FASE 1 FINAL V3
 * Lokasi FINAL: public_html/modules/utils/session.js
 * Agar bisa di-import oleh: public_html/modules/admin-pembelajaran/features/*.js
 * firebase-config ada di: public_html/js/firebase-config.js
 * Maka import = ../../js/firebase-config.js
 */
import { auth, db, doc, getDoc, onAuthStateChanged } from "../../js/firebase-config.js";

const STORAGE_KEY = 'profil_login_salamdmataska';
const CACHE_DURATION = 1000 * 60 * 30;

function getField(data, keys, fallback = "") {
  for (let key of keys) {
    if (data[key] !== undefined && data[key] !== null && String(data[key]).trim() !== "") {
      return data[key];
    }
  }
  return fallback;
}

export async function getCurrentGuruProfile() {
  return new Promise((resolve) => {
    try {
      const cached = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (cached && cached._timestamp) {
        const isExpired = Date.now() - cached._timestamp > CACHE_DURATION;
        if (!isExpired && cached.data) { resolve(cached.data); return; }
      }
    } catch (e) { localStorage.removeItem(STORAGE_KEY); }
    onAuthStateChanged(auth, async (user) => {
      if (!user) { resolve(null); return; }
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          const data = snap.data();
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ data, _timestamp: Date.now(), uid: user.uid }));
          resolve(data);
        } else resolve(null);
      } catch (err) { console.error(err); resolve(null); }
    });
  });
}

export async function autoFillGuru(namaGuruId, sekolahId = null, kelasId = null, nipId = null) {
  const profile = await getCurrentGuruProfile();
  if (!profile) return null;
  const namaLengkap = getField(profile, ['displayName', 'nama', 'nama_lengkap'], '');
  const kelasFase = getField(profile, ['kelas', 'kelas_fase'], '');
  const nip = getField(profile, ['nip', 'nuptk'], '');
  const sekolah = getField(profile, ['nama_sekolah', 'sekolah', 'unit_kerja'], '');
  const email = getField(profile, ['email'], '');

  if (namaGuruId) {
    const el = document.getElementById(namaGuruId);
    if (el) {
      el.value = namaLengkap;
      el.readOnly = true;
      el.style.backgroundColor = "#f3f4f6";
      el.style.cursor = "not-allowed";
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }
  if (sekolahId) {
    const el = document.getElementById(sekolahId);
    if (el) { el.value = sekolah; el.readOnly = true; el.style.backgroundColor = "#f3f4f6"; el.dispatchEvent(new Event('change', { bubbles: true })); }
  }
  if (kelasId) {
    const el = document.getElementById(kelasId);
    if (el) { el.value = kelasFase; el.dispatchEvent(new Event('change', { bubbles: true })); }
  }
  if (nipId) {
    const el = document.getElementById(nipId);
    if (el) { el.value = nip; el.dispatchEvent(new Event('change', { bubbles: true })); }
  }
  return { namaLengkap, sekolah, kelasFase, nip, email, raw: profile };
}

export function clearGuruSession() { localStorage.removeItem(STORAGE_KEY); }
onAuthStateChanged(auth, (user) => { if (!user) clearGuruSession(); });
