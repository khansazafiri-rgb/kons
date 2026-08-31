// KEMBALI KE HALAMAN YANG TADI DIBUKA SETELAH LOGIN
//
// Masalah yang dipecahkan (PRD Revisi 2 bagian 2.1): orang yang sedang membuka
// halaman lomba lalu diminta login akan dilempar ke beranda platform asal
// akunnya setelah berhasil masuk - bukan kembali ke lomba yang tadi sedang ia
// daftari. Pekerjaannya terputus di tengah, dan ia harus menyusuri jalannya
// lagi dari awal.
//
// Caranya: alamat yang tadi dituju dititipkan sebagai `return_to`, lalu dipakai
// lagi setelah autentikasi berhasil.
//
// SATU HAL YANG TIDAK BOLEH DILEWATI: alamat itu datang dari luar (query
// string), jadi ia TIDAK boleh dipercaya begitu saja. Tanpa pemeriksaan,
// /login?return_to=https://situs-jahat.example bisa dipakai memancing orang -
// mereka melihat domain kita di bilah alamat, login betulan, lalu dilempar ke
// situs orang lain yang mirip. Karena itu hanya alamat internal yang diterima.

export const PARAM = 'return_to';

// Alamat internal yang sah: dimulai dengan satu garis miring, dan bukan
// "//host" (yang oleh peramban dibaca sebagai alamat ke domain lain).
export function alamatAman(mentah) {
  const s = String(mentah || '').trim();
  if (!s) return '';
  if (!s.startsWith('/')) return '';
  if (s.startsWith('//')) return '';
  // "/\evil.com" juga dibaca sebagian peramban sebagai alamat luar.
  if (s.startsWith('/\\')) return '';
  return s;
}

// Baca tujuan kembali dari alamat yang sedang dibuka.
export function bacaReturnTo(search) {
  try {
    return alamatAman(new URLSearchParams(search || window.location.search).get(PARAM));
  } catch (_) {
    return '';
  }
}

// Rakit alamat login/daftar yang membawa tujuan kembali.
//   tautanMasuk('/login')  -> '/login?return_to=%2Fevent%2Flomba-x'
export function tautanMasuk(tujuanLogin, alamatSekarang) {
  const asal = alamatAman(
    alamatSekarang
    || (typeof window !== 'undefined'
      ? window.location.pathname + window.location.search
      : ''),
  );
  if (!asal) return tujuanLogin;
  return `${tujuanLogin}?${PARAM}=${encodeURIComponent(asal)}`;
}

// Ke mana harus pergi setelah login berhasil.
// `bawaan` dipakai kalau tidak ada titipan alamat - perilaku lama tetap
// berlaku untuk orang yang membuka /login langsung dari beranda.
export function tujuanSetelahMasuk(bawaan) {
  return bacaReturnTo() || bawaan;
}
