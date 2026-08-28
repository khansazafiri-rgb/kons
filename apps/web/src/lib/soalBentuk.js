// BENTUK SOAL YANG DITERIMA SAAT MENEMPEL KODE
//
// Di web ini ada tiga tempat yang menerima tempelan kode soal, dan dulunya
// masing-masing punya bentuk sendiri:
//
//   Edit Soal PCV   { text, hint, options: [ { text, correct, explanation } ] }
//   Web Olimp       { questionText, optionA..E, correctAnswer, explanation{...} }
//   Event/Lomba     { questionText, optionA..E, correctAnswer, explanation:"" }
//
// Akibatnya kode yang sudah jadi untuk Edit Soal ditolak mentah-mentah di dua
// tempat lainnya - padahal isinya soal pilihan ganda yang sama persis, cuma
// beda susunan field. Berkas ini menghapus perbedaan itu: SEMUA bentuk di atas
// dibaca jadi satu bentuk baku, lalu tiap halaman menyesuaikannya sendiri.
//
// Aturannya sengaja longgar di sisi masuk dan ketat di sisi keluar: apa pun
// yang bisa dimengerti diterima, tapi yang keluar selalu bentuk yang sama.

import { fixText } from '@/lib/textRepair';

export const HURUF = ['A', 'B', 'C', 'D', 'E'];

// ---------------------------------------------------------------------------
// Link gambar
// ---------------------------------------------------------------------------

// Google Drive tidak bisa dipakai langsung sebagai sumber <img> - link
// "drive.google.com/file/d/ID/view" menampilkan halaman pratinjau, bukan
// gambarnya. Yang bisa ditempel di <img> adalah bentuk lh3.
export function driveToLh3(url) {
  const s = String(url || '').trim();
  if (!s) return '';
  if (s.startsWith('https://lh3.googleusercontent.com/')) return s;
  const m =
    s.match(/drive\.google\.com\/file\/d\/([A-Za-z0-9_-]{10,})/) ||
    s.match(/drive\.google\.com\/(?:open|uc)\?(?:export=view&)?id=([A-Za-z0-9_-]{10,})/) ||
    s.match(/docs\.google\.com\/[^?]*[?&]id=([A-Za-z0-9_-]{10,})/);
  if (m) return `https://lh3.googleusercontent.com/d/${m[1]}`;
  // FILE_ID mentah (tanpa http) - sering ditempel begitu saja dari Drive.
  if (/^[A-Za-z0-9_-]{20,}$/.test(s)) return `https://lh3.googleusercontent.com/d/${s}`;
  return s;
}

// ---------------------------------------------------------------------------
// Membaca teks tempelan jadi array
// ---------------------------------------------------------------------------

// Menerima JSON murni MAUPUN array JavaScript (kunci tanpa tanda kutip, koma di
// akhir) - itu bentuk yang biasanya keluar dari Claude/Gemini, dan memaksa
// admin merapikannya dulu cuma menambah satu langkah yang gampang salah.
// Pagar tiga-backtick dan awalan "const soal =" ikut dibuang.
export function bacaArraySoal(teks) {
  let bersih = String(teks || '').trim();
  if (!bersih) throw new Error('Kotaknya masih kosong.');

  bersih = bersih.replace(/^```[a-z]*\s*/i, '').replace(/```\s*$/, '').trim();
  // "const soal = [...]" / "export default [...]" / diakhiri titik koma.
  bersih = bersih
    .replace(/^(?:export\s+default\s+|(?:const|let|var)\s+[A-Za-z_$][\w$]*\s*=\s*)/i, '')
    .replace(/;\s*$/, '')
    .trim();

  let parsed;
  try {
    // eslint-disable-next-line no-new-func
    parsed = Function('return (' + bersih + ')')();
  } catch (e) {
    throw new Error(
      'Kodenya tidak bisa dibaca sebagai array. Pastikan diawali "[" dan diakhiri "]", '
      + 'dan tidak ada teks lain di luar itu. (' + e.message + ')',
    );
  }
  if (!Array.isArray(parsed)) throw new Error('Isinya harus berupa daftar [ ... ], bukan satu objek { ... }.');
  if (parsed.length === 0) throw new Error('Daftarnya kosong - tidak ada soal untuk di-import.');
  return parsed;
}

// ---------------------------------------------------------------------------
// Menyeragamkan satu soal
// ---------------------------------------------------------------------------

// Hasilnya:
//   {
//     questionText, imageUrl, hint,
//     opsi: { A..E },  kunci: 'A'..'E',
//     alasanBenar,                 // penjelasan opsi yang benar
//     alasanSalah: { A..E },       // penjelasan tiap opsi yang salah
//     bentuk: 'options' | 'optionA-E',
//     asli,                        // objek mentahnya, untuk field khas Olimp
//   }
//
// Melempar Error yang menyebut NOMOR soalnya, supaya admin tahu baris mana yang
// harus dibetulkan tanpa menghitung kurung sendiri.
export function normalisasiMcq(item, nomor) {
  const no = nomor || 1;
  const kode = item?.code ? ` (${item.code})` : '';
  const gagal = (pesan) => { throw new Error(`Soal #${no}${kode}: ${pesan}`); };

  if (!item || typeof item !== 'object' || Array.isArray(item)) gagal('bukan objek soal.');

  // Soal isian singkat punya "subQuestions" dan tidak punya pilihan sama
  // sekali. Ditolak dengan sebab yang jelas, bukan dengan keluhan "opsi A
  // kosong" yang menyesatkan.
  if (Array.isArray(item.subQuestions) && item.subQuestions.length) {
    gagal('ini soal isian singkat ("subQuestions"), sedangkan di sini hanya bisa soal pilihan ganda.');
  }

  const questionText = fixText(item.questionText ?? item.text ?? item.soal ?? item.pertanyaan ?? '');
  if (!questionText.trim()) gagal('teks soalnya kosong ("questionText" atau "text").');

  const opsi = { A: '', B: '', C: '', D: '', E: '' };
  const alasanSalah = { A: '', B: '', C: '', D: '', E: '' };
  let kunci = '';
  let alasanBenar = '';
  let bentuk = 'optionA-E';

  if (Array.isArray(item.options) && item.options.length) {
    // --- Bentuk Edit Soal PCV: options: [ { text, correct, explanation } ] ---
    bentuk = 'options';
    const daftar = item.options;
    if (daftar.length > HURUF.length) {
      gagal(`ada ${daftar.length} pilihan, sedangkan yang didukung paling banyak ${HURUF.length} (A-E).`);
    }
    if (daftar.length < 2) gagal('pilihan jawabannya kurang dari dua.');

    const benar = [];
    daftar.forEach((o, i) => {
      const huruf = HURUF[i];
      // Opsi boleh ditulis sebagai string biasa, bukan cuma objek.
      const teksOpsi = typeof o === 'string' ? o : (o?.text ?? o?.teks ?? '');
      opsi[huruf] = fixText(teksOpsi);
      const penjelasan = fixText(typeof o === 'string' ? '' : (o?.explanation ?? o?.pembahasan ?? ''));
      if (typeof o === 'object' && o && (o.correct === true || o.benar === true)) {
        benar.push(huruf);
        alasanBenar = penjelasan;
      } else {
        alasanSalah[huruf] = penjelasan;
      }
    });

    if (benar.length === 0) {
      // Sebagian generator menaruh kuncinya terpisah, bukan sebagai flag.
      const tebak = cocokkanKunci(item, opsi);
      if (!tebak) gagal('tidak ada pilihan yang ditandai "correct": true.');
      kunci = tebak;
      alasanBenar = alasanSalah[kunci];
      alasanSalah[kunci] = '';
    } else if (benar.length > 1) {
      gagal(`ada ${benar.length} pilihan yang ditandai benar (${benar.join(', ')}); harus tepat satu.`);
    } else {
      [kunci] = benar;
    }
  } else {
    // --- Bentuk Olimp/Event: optionA..optionE + correctAnswer ---
    HURUF.forEach((k) => {
      opsi[k] = fixText(item[`option${k}`] ?? item[`option${k.toLowerCase()}`] ?? item[k.toLowerCase()] ?? '');
    });
    if (!opsi.A.trim() && !opsi.B.trim()) {
      gagal('pilihan jawabannya tidak terbaca. Pakai "options": [ … ] atau "optionA"/"optionB"/…');
    }
    const tebak = cocokkanKunci(item, opsi);
    if (!tebak) {
      gagal(`"correctAnswer" harus salah satu dari A/B/C/D/E, bukan "${item.correctAnswer ?? '(kosong)'}".`);
    }
    kunci = tebak;

    // Pembahasan per opsi kalau kebetulan ditulis dalam bentuk Olimp.
    const sumberDistraktor = item.explanation?.distractors || item.distractors || {};
    HURUF.forEach((k) => { alasanSalah[k] = fixText(sumberDistraktor[k] || ''); });
    alasanBenar = fixText(item.explanation?.reasoning || item.explanation?.correctStatement || '');
    if (!alasanBenar && typeof item.explanation === 'string') alasanBenar = fixText(item.explanation);
  }

  if (!opsi.A.trim() || !opsi.B.trim()) gagal('minimal opsi A dan B harus terisi.');
  if (!opsi[kunci].trim()) gagal(`kunci jawabannya ${kunci}, tapi opsi ${kunci} tidak diisi.`);

  return {
    questionText,
    imageUrl: driveToLh3(item.imageUrl ?? item.gambar ?? ''),
    hint: fixText(item.hint ?? item.petunjuk ?? ''),
    opsi,
    kunci,
    alasanBenar,
    alasanSalah,
    bentuk,
    asli: item,
  };
}

// Mencari huruf kunci dari berbagai cara penulisan: huruf ("B"), angka (1-5),
// atau teks pilihannya ditulis ulang apa adanya.
function cocokkanKunci(item, opsi) {
  const mentah = item.correctAnswer ?? item.answer ?? item.kunci ?? item.jawaban ?? '';
  const s = String(mentah).trim();
  if (!s) return '';

  const huruf = s.toUpperCase();
  if (HURUF.includes(huruf)) return huruf;

  // "1".."5" - sebagian generator menomori, bukan menghurufi.
  const angka = Number(s);
  if (Number.isInteger(angka) && angka >= 1 && angka <= HURUF.length) return HURUF[angka - 1];

  // Teks pilihannya disalin utuh sebagai kunci.
  const rapikan = (t) => String(t || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const cari = rapikan(s);
  const ketemu = HURUF.find((k) => opsi[k] && rapikan(opsi[k]) === cari);
  return ketemu || '';
}

// Gabungkan penjelasan per opsi jadi SATU teks - dipakai Event/Lomba, yang
// pembahasannya memang satu blok, bukan delapan bagian seperti Web Olimp.
export function gabungPembahasan(n) {
  const bagian = [];
  if (n.alasanBenar) bagian.push(`<p><strong>Jawaban ${n.kunci} benar.</strong> ${n.alasanBenar}</p>`);
  const salah = HURUF.filter((k) => k !== n.kunci && n.alasanSalah[k]);
  if (salah.length) {
    bagian.push(
      '<p><strong>Kenapa pilihan lain kurang tepat:</strong></p><ul>'
      + salah.map((k) => `<li><strong>${k}.</strong> ${n.alasanSalah[k]}</li>`).join('')
      + '</ul>',
    );
  }
  return bagian.join('');
}
