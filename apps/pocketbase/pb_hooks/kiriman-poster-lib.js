// Pembantu tautan kontribusi poster. Dipisah dari kiriman-poster.pb.js karena
// PocketBase menjalankan tiap handler di runtime terpisah: fungsi di tingkat
// atas berkas .pb.js tidak terlihat dari dalam handler, jadi harus di-require.

const BATAS_PER_JAM = 10; // kiriman per tautan per jam, rem terhadap spam
const MAKS_HARI = 60;
const MAKS_PAKAI = 100;

function hashToken(t) {
  return $security.sha256(String(t || ""));
}

// Teks polos satu baris/paragraf: buang karakter kendali (kecuali baris baru),
// rapikan spasi. Landing menampilkannya sebagai teks, bukan HTML, jadi ini
// bukan satu-satunya pengaman - tapi isi aneh tidak ikut tersimpan.
function bersih(v, maks, multiBaris) {
  let s = String(v == null ? "" : v);
  s = s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
  if (!multiBaris) s = s.replace(/\s+/g, " ");
  else s = s.replace(/\r\n?/g, "\n").replace(/\n{3,}/g, "\n\n");
  s = s.trim();
  return s.length > maks ? null : s;
}

function urlSah(u) {
  if (!u) return true;
  if (u.length > 500) return false;
  if (!/^https?:\/\/[^\s<>"']+$/i.test(u)) return false;
  const host = u.replace(/^https?:\/\//i, "").split(/[/?#]/)[0];
  return host.indexOf(".") > 0 && !/^(localhost|127\.|10\.|192\.168\.)/i.test(host);
}

// Mencari undangan dari token dan menilai keadaannya. Dipakai cek & kirim.
function nilaiUndangan(app, token) {
  if (!token || String(token).length < 20 || String(token).length > 100) return { ok: false, alasan: "TIDAK_DIKENAL" };
  let inv = null;
  try { inv = app.findFirstRecordByData("poster_invites", "tokenHash", hashToken(token)); } catch (_) { inv = null; }
  if (!inv) return { ok: false, alasan: "TIDAK_DIKENAL" };
  if (!inv.getBool("active")) return { ok: false, alasan: "DICABUT", inv: inv };
  const exp = Date.parse(String(inv.getString("expiresAt")).replace(" ", "T"));
  if (!Number.isFinite(exp) || exp < Date.now()) return { ok: false, alasan: "KEDALUWARSA", inv: inv };
  const maks = inv.getInt("maxUses");
  if (maks > 0 && inv.getInt("usedCount") >= maks) return { ok: false, alasan: "HABIS", inv: inv };
  return { ok: true, inv: inv };
}

const PESAN_ALASAN = {
  TIDAK_DIKENAL: "Tautan ini tidak dikenal. Periksa lagi tautan yang kamu terima, atau minta tautan baru ke admin PCV.",
  DICABUT: "Tautan ini sudah dicabut oleh admin. Minta tautan baru ke admin PCV.",
  KEDALUWARSA: "Masa berlaku tautan ini sudah habis. Minta tautan baru ke admin PCV.",
  HABIS: "Tautan ini sudah mencapai batas jumlah kiriman. Minta tautan baru ke admin PCV.",
};


module.exports = { BATAS_PER_JAM, MAKS_HARI, MAKS_PAKAI, hashToken, bersih, urlSah, nilaiUndangan, PESAN_ALASAN };
