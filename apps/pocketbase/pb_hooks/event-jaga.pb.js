/// <reference path="../pb_data/types.d.ts" />

// PENGAMAN JAWABAN PESERTA
//
// `event_answers.question` berelasi ke `event_questions` dengan cascadeDelete:
// menghapus sebuah soal OTOMATIS menghapus jawaban semua peserta untuk soal itu,
// tanpa tanda apa pun. Di tengah atau sesudah lomba, itu cara tercepat untuk
// membuat skor semua orang jadi nol (mis. soal dihapus lalu ditempel ulang
// untuk membetulkan salah ketik).
//
// Karena itu soal yang SUDAH dijawab tidak boleh dihapus lewat API. Yang boleh:
// mengubah isinya (teks, opsi, kunci) - ID soalnya tetap, jadi jawaban aman.
// Hapus lomba utuh tetap bisa; itu memang disengaja menghapus semuanya.
onRecordDeleteRequest((e) => {
  let dijawab = [];
  try {
    dijawab = e.app.findRecordsByFilter("event_answers", "question = '" + e.record.id + "'", "", 0, 0);
  } catch (_) { dijawab = []; }
  if (dijawab.length > 0) {
    throw new BadRequestError(
      "Soal ini sudah dijawab " + dijawab.length + " peserta. Menghapusnya ikut menghapus jawaban mereka "
      + "dan membuat skor jadi nol. Ubah isi soalnya saja (teks, opsi, atau kunci) supaya jawaban tetap aman.",
    );
  }
  e.next();
}, "event_questions");
