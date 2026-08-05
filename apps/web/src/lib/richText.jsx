import React, { useState } from 'react';

// Teks pembahasan/hint disimpan sebagai teks biasa, TAPI kalau di dalamnya ada
// link gambar Google (lh3.googleusercontent.com, atau link Drive mentah yang
// masih bisa dikenali), link itu ditampilkan sebagai GAMBAR - bukan sebagai
// tulisan panjang yang tidak berguna buat siswa.
//
// Jadi admin/pengajar cukup menempel linknya di kolom pembahasan seperti biasa;
// tidak perlu field khusus dan tidak perlu ubah struktur database.

const LH3_PREFIX = 'https://lh3.googleusercontent.com/d/';

// Cocokkan link lh3 maupun link Drive mentah. Tanda baca penutup yang umum
// menempel di akhir kalimat (titik, koma, kurung tutup) sengaja tidak ikut.
const IMAGE_LINK_RE = new RegExp(
  [
    'https?://lh3\\.googleusercontent\\.com/[^\\s<>"\'\\)\\]]+',
    'https?://drive\\.google\\.com/file/d/[\\w-]{10,}[^\\s<>"\'\\)\\]]*',
    'https?://drive\\.google\\.com/(?:open|uc)\\?[^\\s<>"\'\\)\\]]*',
  ].join('|'),
  'gi',
);

// Samakan semua bentuk link Google Drive ke format lh3 yang bisa dipasang
// langsung di <img>. Mengembalikan null kalau file id-nya tidak ketemu.
export function toLh3(rawUrl) {
  const url = String(rawUrl || '').trim().replace(/[.,;]+$/, '');
  if (!url) return null;
  if (/^https?:\/\/lh3\.googleusercontent\.com\//i.test(url)) return url;
  const byPath = url.match(/\/file\/d\/([\w-]{10,})/);
  if (byPath) return LH3_PREFIX + byPath[1];
  const byQuery = url.match(/[?&]id=([\w-]{10,})/);
  if (byQuery) return LH3_PREFIX + byQuery[1];
  return null;
}

// Pecah teks jadi potongan teks biasa & potongan gambar, urutannya tetap.
export function splitImageLinks(raw) {
  const text = String(raw ?? '');
  const parts = [];
  let last = 0;
  for (const m of text.matchAll(IMAGE_LINK_RE)) {
    // Tanda baca yang cuma nempel di akhir kalimat bukan bagian dari link,
    // dan harus tetap muncul sebagai teks.
    const link = m[0].replace(/[.,;:!?]+$/, '');
    const src = toLh3(link);
    if (!src) continue; // link Google tapi bukan link file -> biarkan jadi teks
    if (m.index > last) parts.push({ type: 'text', value: text.slice(last, m.index) });
    parts.push({ type: 'image', value: src });
    last = m.index + link.length;
  }
  if (last < text.length) parts.push({ type: 'text', value: text.slice(last) });
  return parts;
}

export function hasImageLink(raw) {
  return splitImageLinks(raw).some((p) => p.type === 'image');
}

// Gambar pembahasan: bisa diklik untuk dibuka ukuran penuh di tab baru, dan
// kalau linknya mati tetap ada jejaknya (tidak hilang tanpa penjelasan).
function ExplanationImage({ src }) {
  const [gagal, setGagal] = useState(false);
  if (gagal) {
    return (
      <a href={src} target="_blank" rel="noopener noreferrer" className="block my-1 text-xs underline break-all text-stone-500">
        Gambar tidak bisa dimuat — buka langsung: {src}
      </a>
    );
  }
  return (
    <a href={src} target="_blank" rel="noopener noreferrer" title="Klik untuk lihat ukuran penuh" className="block my-2">
      <img
        src={src}
        alt="Gambar pembahasan"
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setGagal(true)}
        className="block max-h-80 max-w-full w-auto mx-auto rounded-lg border border-alba-200 bg-alba-50"
      />
    </a>
  );
}

// Hasil konverter soal memakai <br> untuk pindah baris (teks pembahasan wajib
// satu baris di dalam string), jadi tag itu diterjemahkan jadi ganti baris
// betulan - bukan ditampilkan mentah sebagai tulisan "<br>".
const BR_RE = /<br\s*\/?>/gi;

function TextSegment({ value }) {
  const baris = String(value).split(BR_RE);
  return (
    <>
      {baris.map((b, i) => (
        <React.Fragment key={i}>
          {i > 0 && <br />}
          {b}
        </React.Fragment>
      ))}
    </>
  );
}

// Tampilkan teks apa adanya, kecuali link gambar yang langsung jadi <img>.
export default function RichText({ text }) {
  const parts = splitImageLinks(text);
  return (
    <>
      {parts.map((p, i) =>
        p.type === 'image'
          ? <ExplanationImage key={i} src={p.value} />
          : <TextSegment key={i} value={p.value} />,
      )}
    </>
  );
}
