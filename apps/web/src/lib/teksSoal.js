// TEKS SOAL -> HTML, TANPA KEHILANGAN ENTER
//
// Teks soal dan pembahasan lomba disimpan di field `editor` PocketBase dan
// ditampilkan lewat dangerouslySetInnerHTML - supaya HTML sederhana yang
// ditulis admin (<b>, <sub>, <img>, tabel) ikut tampil.
//
// Masalahnya: di HTML, baris baru biasa (`\n`) dianggap SPASI. Admin yang
// mengetik soal di kotak teks lalu menekan Enter melihat soalnya rapi di
// formulir, tapi di layar ujian semuanya menempel jadi satu baris panjang.
// Basis datanya sendiri tidak salah - `\n`-nya tersimpan utuh - jadi yang
// diperbaiki di sini adalah cara menampilkannya, dan otomatis berlaku juga
// untuk soal-soal lama yang sudah terlanjur diinput.
//
// KENAPA TIDAK SEKADAR replace(/\n/g, '<br>')
//
// Sebagian soal memang ditulis dengan HTML blok (hasil konverter memakai <p>
// dan <br>, sebagian memuat <table>). Kalau setiap `\n` diganti <br>, baris
// baru yang cuma merapikan kode HTML - misalnya di antara `</tr>` dan `<tr>` -
// ikut jadi <br>, dan tabelnya pecah dengan baris kosong nyasar di atasnya.
//
// Jadi `\n` HANYA diubah jadi <br> kalau ia berada di antara teks biasa. Kalau
// ia menempel pada tag blok (sebelum atau sesudahnya), ia dibiarkan - HTML
// bloknya sudah mengatur pindah barisnya sendiri.

const TAG_BLOK = /^(p|div|br|ul|ol|li|table|thead|tbody|tfoot|tr|td|th|h[1-6]|blockquote|pre|hr|img|figure|figcaption|section)$/i;

// Apakah potongan teks ini BERAKHIR dengan tag blok (pembuka atau penutup)?
function berakhirTagBlok(s) {
  const m = /<\/?([a-zA-Z0-9]+)[^>]*>\s*$/.exec(s);
  return !!(m && TAG_BLOK.test(m[1]));
}

// Apakah potongan teks ini DIAWALI tag blok?
function diawaliTagBlok(s) {
  const m = /^\s*<\/?([a-zA-Z0-9]+)[^>]*>/.exec(s);
  return !!(m && TAG_BLOK.test(m[1]));
}

export function teksKeHtml(teks) {
  if (teks === null || teks === undefined) return '';
  const s = String(teks).replace(/\r\n?/g, '\n');
  if (s.indexOf('\n') === -1) return s;

  const baris = s.split('\n');
  let out = baris[0];
  for (let i = 1; i < baris.length; i++) {
    // Yang diperiksa baris ASLI tulisan admin, bukan `out` yang sudah
    // terakumulasi. Kalau `out` yang diperiksa, <br> yang baru saja dipasang
    // fungsi ini sendiri akan dikira tag blok milik penulis - dan baris kosong
    // di antara dua paragraf lenyap jadi satu pindah-baris saja.
    const sebelum = baris[i - 1];
    const sesudah = baris[i];
    const kosong = sesudah.trim() === '' || sebelum.trim() === '';
    const nempelBlok = !kosong && (berakhirTagBlok(sebelum) || diawaliTagBlok(sesudah));
    out += (nempelBlok ? '\n' : '<br>') + sesudah;
  }
  return out;
}
