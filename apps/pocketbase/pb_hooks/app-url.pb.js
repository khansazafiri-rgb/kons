/// <reference path="../pb_data/types.d.ts" />

// PASTIKAN SEMUA LINK KELUAR MEMAKAI DOMAIN ASLI (pcvclassroom.com)
//
// Setiap alamat yang dikirim ke luar dibangun dari SATU sumber yang sama:
// settings.meta.appURL. Yang ikut terpengaruh:
//   - email verifikasi & reset sandi bawaan PocketBase (placeholder {APP_URL})
//   - email pendaftaran/persetujuan akun  (pb_hooks/signup-email.pb.js)
//   - email pengingat belajar             (pb_hooks/nudge-email.pb.js)
//   - pesan WhatsApp                      (pb_hooks/wa-notify.pb.js)
//   - link BAB di spreadsheet Peta Konten (pb_hooks/konten-export.pb.js)
//
// Masalahnya: appURL dulu cuma diisi SEKALI oleh migration
// 1759383931_initial_app_settings.js. Waktu web masih menumpang alamat bawaan
// Hostinger (srv1836059.hstgr.cloud) nilai itu ikut tersimpan, dan tidak
// pernah berubah lagi walaupun domain aslinya sudah aktif - jadi siswa yang
// mengklik link di email konfirmasi tetap dilempar ke alamat hostinger.
//
// Karena itu penyetelannya dipindah ke sini. onSettingsReload jalan tiap kali
// settings dimuat - saat PocketBase start DAN setiap kali ada yang menyimpan
// settings - jadi nilainya selalu dikoreksi ulang, bukan sekali seumur hidup
// database. Kalau nanti pindah domain lagi, cukup ubah APP_URL di
// /opt/pcv/pocketbase.env lalu restart; tidak perlu migration baru.
//
// Catatan penulisan: seluruh isi handler berdiri sendiri tanpa konstanta atau
// fungsi bantu di luar blok ini - handler hook PocketBase dijalankan di runtime
// terpisah dan tidak bisa membaca variabel dari lingkup file (kalau dilanggar,
// hasilnya "ReferenceError: ... is not defined" saat server start).

onSettingsReload((e) => {
  e.next(); // muat settings-nya dulu, baru dikoreksi

  try {
    const DOMAIN_ASLI = "https://pcvclassroom.com";

    // Alamat bawaan penyedia hosting/tunnel dan alamat IP mentah: bukan domain
    // milik sendiri, jadi tidak boleh dipakai untuk link yang dikirim ke siswa.
    // Alamat begini gampang berubah kalau paket hostingnya diganti, dan bikin
    // siswa ragu karena tidak kelihatan seperti alamat resmi.
    const BUKAN_DOMAIN_ASLI = /hstgr\.cloud|duckdns\.org|sslip\.io|nip\.io|ngrok|trycloudflare|\/\/srv\d|\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/i;

    const settings = e.app.settings();
    const sekarang = String(settings.meta.appURL || "").replace(/\/+$/, "");

    // Komputer developer dibiarkan apa adanya - di lokal memang seharusnya
    // localhost, dan link email lokal tidak dikirim ke siapa-siapa.
    if (/^https?:\/\/(localhost|127\.0\.0\.1)/i.test(sekarang)) return;

    // APP_URL dari environment yang menentukan, TAPI kalau isinya ternyata
    // masih alamat bawaan hosting (kasus nyata: pocketbase.env di VPS belum
    // ikut diperbarui waktu pindah domain), nilai itu diabaikan.
    const dariEnv = String($os.getenv("APP_URL") || "").trim().replace(/\/+$/, "");
    const target = dariEnv && !BUKAN_DOMAIN_ASLI.test(dariEnv) ? dariEnv : DOMAIN_ASLI;

    // Berhenti di sini kalau sudah benar - sekaligus yang memutus daur ulang,
    // karena app.save(settings) di bawah memicu reload berikutnya.
    if (sekarang === target) return;

    settings.meta.appURL = target;
    e.app.save(settings);
    console.log("[app-url] appURL dikoreksi: " + (sekarang || "(kosong)") + " -> " + target);
  } catch (err) {
    // Jangan sampai server gagal start cuma gara-gara penyetelan ini.
    console.log("[app-url] gagal menyetel appURL: " + err);
  }
});
