/// <reference path="../pb_data/types.d.ts" />

// SOAL TAHUN SEBELUMNYA BISA DILANJUTKAN
//
// Dulu pengerjaan yang terputus (halaman di-refresh, Safari memuat ulang tab,
// koneksi putus, tombol Keluar tersentuh) tidak pernah dilanjutkan: siswa
// kembali ke layar pilihan dan "Mulai" membuat pengerjaan baru dari soal 1
// dengan timer penuh. Jawaban sementaranya tersimpan, tapi tidak dipakai lagi.
//
// Empat field tambahan supaya pengerjaan bisa dibuka lagi persis di tempatnya:
//   urutan    : ID soal menurut urutan pengerjaan (BAB yang diacak tidak boleh
//               teracak ulang di tengah jalan). ~18 byte per ID.
//   posisi    : nomor soal yang sedang dibuka (mulai 0).
//   sisaDetik : sisa waktu mode simulasi. Waktu berhenti selama halaman
//               tertutup, jadi refresh tidak memakan waktu siswa.
//   tanda     : { ragu: [id], dicek: [id] } - tanda ragu-ragu dan soal yang
//               sudah dicek di mode learning (jawabannya terkunci).
//
// Semua field opsional. Pengerjaan lama tanpa field ini tetap bisa dilanjutkan
// dengan urutan asli dari soal pertama yang belum dijawab.

const FIELD = ["urutan", "posisi", "sisaDetik", "tanda"];

migrate(
  (app) => {
    const col = app.findCollectionByNameOrId("cbt_attempts");
    if (!col.fields.getByName("urutan")) col.fields.add(new JSONField({ name: "urutan", maxSize: 30000 }));
    if (!col.fields.getByName("posisi")) col.fields.add(new NumberField({ name: "posisi", onlyInt: true, min: 0 }));
    if (!col.fields.getByName("sisaDetik")) col.fields.add(new NumberField({ name: "sisaDetik", onlyInt: true, min: 0 }));
    if (!col.fields.getByName("tanda")) col.fields.add(new JSONField({ name: "tanda", maxSize: 60000 }));
    app.save(col);
  },
  (app) => {
    const col = app.findCollectionByNameOrId("cbt_attempts");
    for (const nama of FIELD) {
      const f = col.fields.getByName(nama);
      if (f) col.fields.removeById(f.id);
    }
    app.save(col);
  },
);
