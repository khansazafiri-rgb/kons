import pb from '@/lib/pocketbaseClient';

// Semua konten bergambar di web ini (poster event, prestasi, foto pengajar &
// management) menerima DUA cara pengisian: upload file langsung, atau tempel
// link Google Drive format lh3. Helper di bawah memilih mana yang dipakai:
// file hasil upload selalu menang, link jadi cadangan.
//
// `fileField` = nama field file di collection-nya, `urlField` = nama field teks
// berisi link lh3.
export function resolvePhoto(rec, fileField, urlField) {
  if (!rec) return '';
  if (rec[fileField]) {
    try {
      return pb.files.getURL(rec, rec[fileField]);
    } catch (_) {
      /* record tanpa konteks collection - jatuh ke link di bawah */
    }
  }
  const url = rec[urlField] || '';
  // Placeholder contoh di panel admin jangan sampai dirender sebagai gambar.
  return url.includes('FILE_ID') ? '' : url;
}

// Pintasan untuk tiap collection.
export const teamPhotoSrc = (rec) => resolvePhoto(rec, 'photoFile', 'photo');
export const achievementPhotoSrc = (rec) => resolvePhoto(rec, 'photo', 'photoUrl');

// Satu poster bisa punya BEBERAPA gambar (tampil seperti slide). Urutannya:
//   image (berkas lama) -> images (berkas) -> imageUrl (link lh3) -> imageUrls
//   (link lh3 tambahan, satu per baris).
// Poster lama yang hanya punya `image` atau `imageUrl` tetap menghasilkan satu
// gambar, jadi tampilannya tidak berubah.
export function posterImageList(rec) {
  if (!rec) return [];
  const hasil = [];
  const tambah = (src) => { if (src && !src.includes('FILE_ID') && !hasil.includes(src)) hasil.push(src); };
  const berkas = (nama) => {
    try { tambah(pb.files.getURL(rec, nama)); } catch (_) { /* record tanpa konteks collection */ }
  };
  if (rec.image) berkas(rec.image);
  (Array.isArray(rec.images) ? rec.images : rec.images ? [rec.images] : []).forEach(berkas);
  tambah(rec.imageUrl);
  String(rec.imageUrls || '').split(/\r?\n/).map((x) => x.trim()).filter((x) => /^https?:\/\//i.test(x)).forEach(tambah);
  return hasil;
}

// Gambar sampul (pertama): dipakai kartu hero dan thumbnail daftar admin.
export const posterImageSrc = (rec) => posterImageList(rec)[0] || '';
