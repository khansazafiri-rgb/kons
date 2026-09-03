/// <reference path="../pb_data/types.d.ts" />

// PENANDA PERANGKAT YANG TIDAK IKUT TERHAPUS
//
// MASALAH YANG DIPERBAIKI
//
// Kunci device PCV (satu akun = satu HP/laptop) bersandar pada satu nilai acak
// bernama `pcv_device_id`. Dulu nilai itu cuma disimpan di localStorage
// peramban - dan localStorage bukan tempat yang awet:
//
//   - Safari di iPhone/iPad MENGHAPUS localStorage sebuah situs setelah 7 HARI
//     tanpa dibuka (aturan Intelligent Tracking Prevention). Ini bukan bug HP
//     siswa, melainkan perilaku bawaan iOS;
//   - pindah domain ikut menghapusnya, karena localStorage terikat ke alamat.
//     Web ini memang pernah pindah dari alamat bawaan hosting ke
//     pcvclassroom.com (lihat app-url.pb.js);
//   - "bersihkan data situs", mode penyamaran, dan ganti peramban juga.
//
// Akibatnya persis seperti yang dikeluhkan peserta: HP-nya sama, tapi setelah
// lama tidak dibuka, akunnya ditolak dengan pesan "sudah terkunci ke device
// lain" - sebab dari sisi web, HP itu memperkenalkan diri sebagai device baru.
//
// KENAPA PENYELESAIANNYA HARUS DARI SERVER
//
// Kuki yang ditulis JavaScript (`document.cookie`) tidak menolong di Safari:
// umurnya ikut dipangkas jadi 7 hari. Yang TIDAK dipangkas adalah kuki yang
// dikirim server lewat header Set-Cookie pada permintaan pihak pertama - itu
// boleh hidup sampai 400 hari. Karena PocketBase dilayani di domain yang sama
// dengan webnya (Caddy mem-proxy /api ke sini), kuki dari sini terhitung pihak
// pertama, jadi jalur ini memang tersedia.
//
// Titipannya cuma nilai acak tanpa arti - bukan token, bukan sandi. Ia tidak
// memberi akses apa pun; gunanya hanya supaya HP yang sama tetap dikenali.
// Karena itu httpOnly sengaja dimatikan: peramban perlu bisa membacanya sendiri
// supaya pemulihan tetap jalan walau permintaan ke sini gagal.
//
// Catatan penulisan: seluruh isi handler berdiri sendiri tanpa konstanta di
// luar blok - runtime hook PocketBase tidak bisa membaca variabel dari lingkup
// file (kalau dilanggar: "ReferenceError: ... is not defined" saat server start).

routerAdd("GET", "/api/pcv/device-id", (e) => {
  // Bentuk yang diterima. Nilai dari peramban tidak boleh dipercaya mentah:
  // ia berakhir di header Set-Cookie, jadi yang aneh-aneh ditolak lebih dulu.
  const SAH = /^[A-Za-z0-9_-]{6,64}$/;
  const NAMA = "pcv_did";
  const UMUR = 400 * 24 * 60 * 60; // detik; batas atas yang diizinkan peramban

  let id = "";
  let sumber = "";

  // 1. Kuki yang sudah ada - ini yang membuat HP lama tetap dikenali.
  try {
    const kuki = e.request.cookie(NAMA);
    const nilai = kuki ? String(kuki.value || "") : "";
    if (SAH.test(nilai)) {
      id = nilai;
      sumber = "kuki";
    }
  } catch (_) {
    /* belum punya kuki - wajar pada kunjungan pertama */
  }

  // 2. Belum ada kuki, tapi peramban masih memegang penanda lamanya di
  //    localStorage. Nilai ITU yang dipakai, bukan bikin baru - kalau di sini
  //    diterbitkan nilai baru, semua siswa yang penandanya masih utuh akan
  //    berganti identitas sekaligus dan justru terkunci massal.
  if (!id) {
    let usul = "";
    try {
      usul = String(e.request.url.query().get("usul") || "");
    } catch (_) {
      /* tanpa usul - lanjut bikin baru */
    }
    if (SAH.test(usul)) {
      id = usul;
      sumber = "usul";
    }
  }

  // 3. Benar-benar perangkat baru.
  if (!id) {
    id = "dev_" + $security.randomString(24);
    sumber = "baru";
  }

  // Kuki selalu ditulis ulang, termasuk waktu sumbernya "kuki": umurnya jadi
  // ikut diperpanjang tiap kali web dibuka, bukan menghitung mundur sejak
  // pertama kali dibuat.
  //
  // `secure` menyesuaikan keadaan: di produksi TLS diputus Caddy, jadi sambungan
  // ke PocketBase sendiri polos dan isTLS() bernilai salah - yang benar dibaca
  // dari X-Forwarded-Proto. Di localhost (http) secure sengaja dibiarkan mati,
  // sebab kuki secure tidak akan disimpan peramban di sana.
  let proto = "";
  try {
    proto = String(e.request.header.get("X-Forwarded-Proto") || "").toLowerCase();
  } catch (_) {
    /* tanpa proxy di depan */
  }
  let tls = false;
  try {
    tls = !!e.isTLS();
  } catch (_) {
    /* abaikan */
  }

  try {
    e.setCookie(new Cookie({
      name: NAMA,
      value: id,
      path: "/",
      maxAge: UMUR,
      secure: tls || proto === "https",
      httpOnly: false,
      sameSite: 2, // Lax - cukup, dan tidak ikut hilang saat pindah halaman
    }));
  } catch (_) {
    // Gagal memasang kuki bukan alasan menggagalkan permintaannya: peramban
    // masih punya salinan di localStorage, jadi keadaannya sama seperti sebelum
    // perbaikan ini - tidak lebih buruk.
  }

  return e.json(200, { deviceId: id, sumber: sumber });
});
