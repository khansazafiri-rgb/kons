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
export const posterImageSrc = (rec) => resolvePhoto(rec, 'image', 'imageUrl');
