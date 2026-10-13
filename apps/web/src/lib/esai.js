// SOAL ESAI TIDAK DINILAI
//
// Tipe `esai` / `esai_img` untuk soal yang jawabannya tidak bisa dinilai komputer
// dengan tepat (mengenali gambar preparat, menjelaskan mekanisme, dst). Siswa
// boleh menulis jawabannya, lalu membuka KUNCI dan membandingkannya sendiri.
// Soal ini tidak pernah dinilai benar/salah dan tidak ikut dihitung di skor.
//
// Satu soal esai punya satu atau lebih sub-pertanyaan (A, B, ...), bentuknya
// mirip isian supaya form admin dan format import-nya sama:
//
//   {
//     label: "A",
//     question: "Spesies dan stadium yang ditunjukkan pada gambar adalah:",
//     validAnswers: ["Ascaris lumbricoides — telur dibuahi (fertilized egg)"],
//     keyPointsTitle: "Ciri-ciri",               // opsional, bawaan "Poin kunci"
//     keyPoints: ["Bentuk bulat sampai oval", "Dinding tebal berlapis", ...],
//     explanation: "teks + link lh3 gambar",     // opsional, seperti isian
//   }
//
// - validAnswers  : JAWABAN UTAMA yang ditanyakan. Satu isi = satu baris tebal.
//                   Beberapa isi (atau dipisah " / ") = daftar berpoin.
// - keyPoints     : butir-butir pendukung kunci, tampil sebagai daftar berpoin
//                   di bawah judulnya.
//
// Di dokumen sumber, butir-butir sering ditulis dalam satu baris yang dipisah
// " / " ("bentuk bulat / dinding tebal / berwarna cokelat"). Di sini "/" yang
// diapit spasi itu dibaca sebagai pemisah poin, jadi baris seperti itu boleh
// ditempel apa adanya dan tetap tampil sebagai daftar. "/" tanpa spasi
// ("larva/L3", "µm/hari") bagian dari teks dan tidak dipecah.

export const adalahEsai = (q) => String(q?.qtype || '').startsWith('esai');

// Satu butir kunci bisa memuat beberapa poin (dipisah baris baru atau " / ").
// Tanda poin di awal ("• ", "- ", "* ", "1. ") dibuang, dan butir kosong dilewati.
export function pecahPoin(teks) {
  const hasil = [];
  for (const baris of String(teks ?? '').split(/\r?\n|<br\s*\/?>/i)) {
    for (const potong of baris.split(/\s+\/\s+/)) {
      // Pemisah yang berdempetan (" /  / ") menyisakan "/" di ujung potongan.
      const bersih = potong
        .replace(/^\s*(?:[•·▪◦*-]|\d{1,2}[.)])\s+/, '')
        .replace(/^(?:\/\s+)+|(?:\s+\/)+$/g, '')
        .trim();
      if (bersih) hasil.push(bersih);
    }
  }
  return hasil;
}

const jadiPoin = (nilai) => {
  const daftar = Array.isArray(nilai) ? nilai : nilai == null ? [] : [nilai];
  return daftar.flatMap(pecahPoin);
};

// Bentuk kunci yang siap ditampilkan untuk satu sub-pertanyaan.
//   jawaban    : jawaban utama (daftar poin)
//   judulPoin  : judul daftar butir pendukung
//   poin       : butir pendukung
//   kosong     : true kalau sub-pertanyaan ini tidak punya kunci sama sekali
export function kunciEsai(sub) {
  const jawaban = jadiPoin(sub?.validAnswers);
  const poin = jadiPoin(sub?.keyPoints);
  const judulPoin = String(sub?.keyPointsTitle || '').trim() || 'Poin kunci';
  return { jawaban, judulPoin, poin, kosong: !jawaban.length && !poin.length };
}

// Jawaban siswa untuk satu sub-pertanyaan esai: selalu satu teks bebas.
// Jawaban yang tersimpan dalam bentuk lain (mis. soal dulu isian lalu diubah
// jadi esai, sehingga isinya berupa daftar kotak) digabung jadi satu teks.
export function teksEsaiSiswa(nilai) {
  if (Array.isArray(nilai)) return nilai.map((t) => String(t ?? '').trim()).filter(Boolean).join('\n');
  return nilai == null ? '' : String(nilai);
}

// Soal esai dianggap "ditulis" kalau salah satu sub-pertanyaannya ada isinya.
// Hanya untuk penanda progres: esai tidak pernah salah, jadi kosong pun sah.
export function esaiSudahDitulis(q, ans) {
  const obj = typeof ans === 'object' && ans !== null && !Array.isArray(ans) ? ans : {};
  return (q?.subQuestions || []).some((sub) => teksEsaiSiswa(obj[sub.label]).trim() !== '');
}

// Berapa soal yang benar-benar dinilai (bukan esai). Dipakai untuk skor dan
// untuk memutuskan apakah angka nilai layak ditampilkan sama sekali.
export const jumlahDinilai = (daftar) => (daftar || []).filter((q) => !adalahEsai(q)).length;
