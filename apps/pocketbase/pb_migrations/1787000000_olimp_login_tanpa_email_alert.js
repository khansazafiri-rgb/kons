/// <reference path="../pb_data/types.d.ts" />

// LOGIN PESERTA OLIMP YANG MENGGANTUNG 15 DETIK
//
// Gejalanya: menekan "Masuk" di Web Olimp - dan di Pusat Ujian - membuat
// tombolnya berputar belasan detik sebelum akhirnya berhasil. Login peserta PCV
// di server yang sama selesai dalam 80 milidetik.
//
// Sebabnya bukan kode kita. PocketBase menyalakan `authAlert` secara bawaan
// untuk setiap collection auth yang baru dibuat. Saat seseorang login dari
// "lokasi baru", PocketBase mengirim email peringatan - dan pengirimannya
// terjadi DI DALAM permintaan login itu sendiri. Kalau server SMTP tidak bisa
// dihubungi, login menunggu sampai koneksinya menyerah. Waktu tunggu itulah
// yang terlihat sebagai 15 detik.
//
// Collection `users` sudah lama dimatikan authAlert-nya; `olimp_users` dibuat
// belakangan dan ikut membawa nilai bawaannya. Migrasi ini menyamakan keduanya.
//
// KENAPA DIMATIKAN, BUKAN SMTP-NYA YANG DIBETULKAN
//
// Peringatan ini justru paling merepotkan tepat di saat paling genting. Berkas
// .seb menghapus seluruh penyimpanan peramban setiap kali dijalankan, jadi SEB
// SELALU tampak sebagai "lokasi baru" bagi PocketBase. Artinya setiap peserta,
// setiap kali membuka SEB di hari ujian:
//
//   - menunggu email terkirim sebelum boleh masuk, dan
//   - menerima email "ada login dari lokasi baru" yang membuatnya cemas
//     padahal itu dirinya sendiri, dua menit sebelum ujian mulai.
//
// Keamanannya tidak berkurang berarti: yang menjaga akun peserta Olimp adalah
// kunci device (`olimp_devices`) dan kunci per pendaftaran di lomba, yang
// dua-duanya lebih ketat daripada email pemberitahuan.

migrate(
  (app) => {
    const col = app.findCollectionByNameOrId("olimp_users");
    if (!col) return;
    if (col.authAlert && col.authAlert.enabled) {
      col.authAlert.enabled = false;
      app.save(col);
      console.log("olimp_users: authAlert dimatikan - login tidak lagi menunggu SMTP.");
    } else {
      console.log("olimp_users: authAlert memang sudah mati, tidak ada yang diubah.");
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId("olimp_users");
    if (!col) return;
    if (col.authAlert && !col.authAlert.enabled) {
      col.authAlert.enabled = true;
      app.save(col);
    }
  },
);
