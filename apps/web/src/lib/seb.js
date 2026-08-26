// SAFE EXAM BROWSER - sisi peramban
//
// Yang benar-benar menegakkan "harus lewat SEB" ada di server
// (pb_hooks/olimp-seb.pb.js): tanpa header hash yang cocok, soal tidak keluar.
// Berkas ini cuma pelengkapnya - untuk memberi tahu peserta dengan kalimat yang
// masuk akal, bukan membiarkan mereka menatap layar kosong.
//
// Jadi jangan pernah memakai isSeb() sebagai penjaga keamanan: apa pun yang
// diperiksa di peramban bisa dipalsukan dari peramban.

import pbo from '@/lib/olimpClient';

// SEB menyisipkan namanya ke User-Agent, mis.
//   "... Safari/537.36 SEB/3.5.0" (Windows)
//   "... SEB_MacOS/3.2" (macOS)
export function isSeb() {
  const ua = String(navigator.userAgent || '');
  return /\bSEB[/_]|SafeExamBrowser/i.test(ua);
}

// Keterangan SEB dari server: tautan pemasang, alamat mulai, dan apakah
// penjagaannya sudah menyala. Aman dipanggil tanpa login.
export async function ambilInfoSeb() {
  try {
    return await pbo.send('/api/olimp/seb-info', { method: 'GET' });
  } catch (_) {
    return { terpasang: false };
  }
}

// Unduh berkas .seb milik peserta yang sedang login.
//
// Tidak bisa memakai <a href> biasa: endpoint-nya perlu header Authorization,
// dan tautan biasa tidak membawanya. Jadi berkasnya diambil lewat fetch lalu
// disodorkan sebagai unduhan dari memori.
export async function unduhKonfigurasiSeb() {
  if (!pbo.authStore.isValid) {
    throw new Error('Masuk dulu dengan akun Web Olimp untuk mengunduh berkas konfigurasi.');
  }
  const res = await fetch(pbo.buildURL('/api/olimp/seb-config'), {
    headers: { Authorization: pbo.authStore.token },
  });
  if (!res.ok) {
    let pesan = 'Gagal mengunduh berkas konfigurasi.';
    try { pesan = (await res.json()).message || pesan; } catch (_) { /* jawabannya bukan JSON */ }
    throw new Error(pesan);
  }
  const blob = await res.blob();
  // Nama berkasnya ditentukan server lewat Content-Disposition; kalau header
  // itu tidak terbaca (mis. lewat proxy), dipakai nama cadangan.
  const disposisi = res.headers.get('Content-Disposition') || '';
  const cocok = disposisi.match(/filename="?([^"]+)"?/);
  const nama = cocok ? cocok[1] : 'WebOlimp.seb';

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nama;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return nama;
}
