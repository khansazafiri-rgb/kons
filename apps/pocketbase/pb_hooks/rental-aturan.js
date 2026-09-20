/// <reference path="../pb_data/types.d.ts" />

// MODUL PEMINJAMAN - ATURAN MURNI (tanpa PocketBase sama sekali)
//
// Berkas ini sengaja tidak menyentuh `app`, `$http`, `$os`, atau apa pun dari
// runtime PocketBase. Isinya cuma hitungan: apakah dua rentang waktu bentrok,
// apakah jamnya jatuh di grid 30 menit, berapa sisa stok pada suatu rentang,
// berapa harga satu baris pesanan.
//
// Dipisah begini karena PRD bagian 22 meminta ada test untuk aturan konflik
// jadwal - dan aturan itulah satu-satunya bagian yang benar-benar berbahaya
// kalau salah: satu tanda `<` yang keliru jadi `<=` membuat dua pelanggan
// memegang ruang yang sama. Dengan dipisah, `test/konflik-jadwal.test.mjs`
// bisa memuatnya apa adanya dan mengujinya tanpa menyalakan server.
//
// Semua waktu di sini berupa milidetik epoch (UTC). Penampilan ke WIB
// (Asia/Jakarta, +07:00 tanpa DST) ditangani fungsi wib* di bagian bawah.

var MENIT = 60 * 1000;
var JAM = 60 * MENIT;
var HARI = 24 * JAM;

// Grid peminjaman (PRD bagian 4 & 20.2). Semua jam mulai/selesai harus jatuh
// tepat di kelipatan ini.
var GRID_MENIT = 30;

// Selisih WIB terhadap UTC. Tetap +7 sepanjang tahun - Indonesia tidak punya
// daylight saving, jadi tidak ada gunanya menyeret pustaka zona waktu ke dalam
// runtime hook yang tidak punya Intl lengkap.
var WIB_OFFSET = 7 * JAM;

// ---------------------------------------------------------------------------
// 1. Status yang memblok jadwal
// ---------------------------------------------------------------------------
//
// PRD bagian 9: yang memblok bukan cuma yang sudah dibayar. Booking yang baru
// saja checkout (`MENUNGGU_PEMBAYARAN`) langsung memblok, dan tetap memblok
// sampai admin membatalkannya - TIDAK ADA auto-expire di MVP.
//
// `DITOLAK` ikut memblok dengan sengaja: bukti yang ditolak tidak berarti
// pelanggannya batal, cuma buktinya salah. Slotnya baru terbuka kalau admin
// benar-benar menekan Batalkan.
var STATUS_MEMBLOK = [
  'MENUNGGU_PEMBAYARAN',
  'BUKTI_DIUNGGAH',
  'TERKONFIRMASI',
  'SEDANG_DIPINJAM',
  'DITOLAK',
];

var STATUS_SEMUA = STATUS_MEMBLOK.concat(['SELESAI', 'DIBATALKAN']);

function memblok(status) {
  return STATUS_MEMBLOK.indexOf(String(status || '')) !== -1;
}

// ---------------------------------------------------------------------------
// 2. Bentrok antar rentang waktu
// ---------------------------------------------------------------------------
//
// PRD bagian 14: `request_start < existing_end && request_end > existing_start`.
//
// Dua tanda `<` dan `>` itu (bukan `<=`/`>=`) yang membuat peminjaman
// bersambungan boleh: 09:00-10:00 dan 10:00-11:00 TIDAK bentrok, karena yang
// satu berakhir tepat saat yang lain mulai. Kalau dipakai `<=`, ruang jadi
// tidak bisa dipakai beruntun sama sekali.
function bentrok(aMulai, aSelesai, bMulai, bSelesai) {
  return aMulai < bSelesai && aSelesai > bMulai;
}

// Rentang yang sah: dua-duanya angka, selesai benar-benar sesudah mulai.
function rentangSah(mulai, selesai) {
  return (
    typeof mulai === 'number' && typeof selesai === 'number' &&
    isFinite(mulai) && isFinite(selesai) && selesai > mulai
  );
}

// Jam mulai/selesai harus jatuh tepat di grid 30 menit WIB.
//
// Dihitung terhadap WIB, bukan UTC. Untuk kelipatan 30 menit keduanya
// kebetulan sama (selisih WIB tepat 7 jam bulat), tapi ditulis eksplisit
// supaya tetap benar kalau kelak gridnya diubah ke 20 atau 45 menit.
function diGrid(ms) {
  if (typeof ms !== 'number' || !isFinite(ms)) return false;
  var wib = ms + WIB_OFFSET;
  return wib % (GRID_MENIT * MENIT) === 0;
}

// ---------------------------------------------------------------------------
// 3. Jam operasional
// ---------------------------------------------------------------------------
//
// Jam buka/tutup disimpan sebagai menit sejak tengah malam WIB (mis. 08:00 =
// 480, 21:00 = 1260). Peminjaman harus utuh berada di dalamnya.
//
// Peminjaman yang melewati tengah malam ditolak, bukan dipotong: ruang yang
// tutup jam 21:00 tidak bisa dipinjam 20:00-02:00, dan memotongnya diam-diam
// jadi 20:00-21:00 akan mengejutkan pelanggan yang sudah menekan checkout.
function dalamJamOperasional(mulai, selesai, bukaMenit, tutupMenit) {
  if (!rentangSah(mulai, selesai)) return false;
  // Tanpa konfigurasi jam, ruang dianggap buka 24 jam - itu bawaan yang aman
  // untuk data demo, dan admin mengisinya sebelum go-live (PRD bagian 21).
  if (!bukaMenit && !tutupMenit) return true;
  var buka = Number(bukaMenit) || 0;
  var tutup = Number(tutupMenit) || 0;
  if (tutup <= buka) return false;

  var mMulai = menitWibHarian(mulai);
  var mSelesai = menitWibHarian(selesai);
  // Selesai tepat di tengah malam WIB terbaca sebagai menit 0; itu sah selama
  // peminjamannya memang berakhir di hari yang sama.
  if (mSelesai === 0 && selesai - mulai <= HARI) mSelesai = 24 * 60;

  // Beda hari = melewati tengah malam.
  if (tanggalWib(mulai) !== tanggalWib(selesai) && mSelesai !== 24 * 60) return false;

  return mMulai >= buka && mSelesai <= tutup;
}

// ---------------------------------------------------------------------------
// 4. Cakupan penjaga
// ---------------------------------------------------------------------------
//
// PRD bagian 14 poin 6: kalau ruang mewajibkan penjaga, SELURUH rentang
// peminjaman harus tertutup jadwal penjaga - bukan cuma bersinggungan.
//
// Dua shift yang bersambungan dihitung sebagai satu cakupan utuh (08:00-12:00
// lalu 12:00-16:00 menutupi 09:00-15:00), karena itu jadwalnya digabung dulu
// baru diperiksa. Kalau tidak digabung, peminjaman yang melintasi pergantian
// shift akan selalu ditolak padahal penjaganya tidak pernah kosong.
function gabungRentang(daftar) {
  var rapi = (daftar || [])
    .filter(function (r) { return r && rentangSah(r.mulai, r.selesai); })
    .map(function (r) { return { mulai: r.mulai, selesai: r.selesai }; })
    .sort(function (a, b) { return a.mulai - b.mulai; });

  var hasil = [];
  for (var i = 0; i < rapi.length; i++) {
    var akhir = hasil[hasil.length - 1];
    if (akhir && rapi[i].mulai <= akhir.selesai) {
      if (rapi[i].selesai > akhir.selesai) akhir.selesai = rapi[i].selesai;
    } else {
      hasil.push({ mulai: rapi[i].mulai, selesai: rapi[i].selesai });
    }
  }
  return hasil;
}

function tercakupPenjaga(mulai, selesai, jadwal) {
  if (!rentangSah(mulai, selesai)) return false;
  var blok = gabungRentang(jadwal);
  for (var i = 0; i < blok.length; i++) {
    if (blok[i].mulai <= mulai && blok[i].selesai >= selesai) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// 5. Sisa stok alat
// ---------------------------------------------------------------------------
//
// PRD bagian 15: `available_quantity` dihitung dari booking aktif yang
// beririsan - bukan dari satu angka yang dikurangi setiap kali ada pesanan.
//
// Yang dicari adalah PUNCAK pemakaian di dalam rentang yang diminta, bukan
// jumlah seluruh pemakaian. Dua peminjaman 09:00-10:00 dan 14:00-15:00 tidak
// saling memakan stok; kalau dijumlahkan begitu saja, alat dengan stok 2 akan
// terlihat habis padahal jam pakainya tidak bersentuhan sama sekali.
//
// Caranya: kumpulkan semua titik waktu tempat pemakaian bisa berubah, lalu
// hitung pemakaian di setiap potongan di antaranya, dan ambil yang terbesar.
function puncakPemakaian(mulai, selesai, pemakaian) {
  var relevan = (pemakaian || []).filter(function (p) {
    return p && rentangSah(p.mulai, p.selesai) && bentrok(mulai, selesai, p.mulai, p.selesai);
  });
  if (!relevan.length) return 0;

  var titik = [mulai];
  for (var i = 0; i < relevan.length; i++) {
    if (relevan[i].mulai > mulai && relevan[i].mulai < selesai) titik.push(relevan[i].mulai);
    if (relevan[i].selesai > mulai && relevan[i].selesai < selesai) titik.push(relevan[i].selesai);
  }
  titik.push(selesai);
  titik.sort(function (a, b) { return a - b; });

  var puncak = 0;
  for (var t = 0; t < titik.length - 1; t++) {
    var a = titik[t];
    var b = titik[t + 1];
    if (b <= a) continue;
    var jumlah = 0;
    for (var j = 0; j < relevan.length; j++) {
      if (bentrok(a, b, relevan[j].mulai, relevan[j].selesai)) {
        jumlah += Number(relevan[j].jumlah) || 0;
      }
    }
    if (jumlah > puncak) puncak = jumlah;
  }
  return puncak;
}

function sisaStok(total, mulai, selesai, pemakaian) {
  var punya = Number(total) || 0;
  var terpakai = puncakPemakaian(mulai, selesai, pemakaian);
  var sisa = punya - terpakai;
  return sisa > 0 ? sisa : 0;
}

// ---------------------------------------------------------------------------
// 6. Pemeriksaan satu rentang ruang
// ---------------------------------------------------------------------------
//
// Mengembalikan alasan pertama yang membuat rentang ini tidak bisa dipakai,
// atau null kalau semuanya lolos. Urutan pemeriksaannya mengikuti PRD bagian
// 14 supaya alasan yang ditampilkan ke pelanggan selalu yang paling pokok:
// percuma bilang "penjaganya tidak ada" kalau ruangnya memang sedang ada kelas.
var ALASAN = {
  NONAKTIF: 'Ruang ini sedang tidak disewakan.',
  GRID: 'Jam mulai dan selesai harus kelipatan 30 menit.',
  RENTANG: 'Jam selesai harus lebih akhir daripada jam mulai.',
  JAM_OPERASIONAL: 'Di luar jam operasional ruang.',
  KELAS: 'Sedang dipakai kelas.',
  BLOK: 'Diblok internal (rapat/maintenance).',
  TERPAKAI: 'Sudah ada peminjaman lain.',
  PENJAGA: 'Tidak ada penjaga yang bertugas pada jam ini.',
};

function periksaRuang(opts) {
  var mulai = opts.mulai;
  var selesai = opts.selesai;

  if (opts.aktif === false) return { kode: 'NONAKTIF', pesan: ALASAN.NONAKTIF };
  if (!rentangSah(mulai, selesai)) return { kode: 'RENTANG', pesan: ALASAN.RENTANG };
  if (!diGrid(mulai) || !diGrid(selesai)) return { kode: 'GRID', pesan: ALASAN.GRID };
  if (!dalamJamOperasional(mulai, selesai, opts.bukaMenit, opts.tutupMenit)) {
    return { kode: 'JAM_OPERASIONAL', pesan: ALASAN.JAM_OPERASIONAL };
  }

  var blok = opts.blok || [];
  for (var i = 0; i < blok.length; i++) {
    if (!bentrok(mulai, selesai, blok[i].mulai, blok[i].selesai)) continue;
    var jenis = String(blok[i].jenis || 'INTERNAL');
    if (jenis === 'KELAS') return { kode: 'KELAS', pesan: ALASAN.KELAS, sumber: blok[i] };
    return { kode: 'BLOK', pesan: ALASAN.BLOK, sumber: blok[i] };
  }

  var pakai = opts.peminjaman || [];
  for (var j = 0; j < pakai.length; j++) {
    if (opts.abaikanOrderItem && pakai[j].id === opts.abaikanOrderItem) continue;
    if (bentrok(mulai, selesai, pakai[j].mulai, pakai[j].selesai)) {
      return { kode: 'TERPAKAI', pesan: ALASAN.TERPAKAI, sumber: pakai[j] };
    }
  }

  if (opts.butuhPenjaga && !tercakupPenjaga(mulai, selesai, opts.penjaga || [])) {
    return { kode: 'PENJAGA', pesan: ALASAN.PENJAGA };
  }

  return null;
}

// ---------------------------------------------------------------------------
// 7. Grid slot 30 menit untuk satu hari
// ---------------------------------------------------------------------------
//
// Dipakai pemilih jadwal di halaman detail ruang. Tiap slot dibalas beserta
// ALASAN kenapa ia tidak bisa dipilih - halaman yang cuma menerima true/false
// tidak bisa menjelaskan apa-apa ke pelanggan, dan "tidak tersedia" tanpa
// sebab adalah keluhan yang paling sering mendarat ke admin WhatsApp.
function slotHarian(opts) {
  var awalHari = opts.awalHari;          // ms UTC untuk 00:00 WIB hari itu
  var buka = Number(opts.bukaMenit) || 0;
  var tutup = Number(opts.tutupMenit) || 24 * 60;
  if (tutup <= buka) { buka = 0; tutup = 24 * 60; }

  var hasil = [];
  for (var m = buka; m + GRID_MENIT <= tutup; m += GRID_MENIT) {
    var mulai = awalHari + m * MENIT;
    var selesai = mulai + GRID_MENIT * MENIT;
    var galat = periksaRuang({
      mulai: mulai,
      selesai: selesai,
      aktif: opts.aktif,
      bukaMenit: buka,
      tutupMenit: tutup,
      blok: opts.blok,
      peminjaman: opts.peminjaman,
      penjaga: opts.penjaga,
      butuhPenjaga: opts.butuhPenjaga,
    });
    // Slot yang sudah lewat tidak pernah bisa dipilih, apa pun keadaan lain.
    var lampau = typeof opts.sekarang === 'number' && mulai < opts.sekarang;

    hasil.push({
      mulai: new Date(mulai).toISOString(),
      selesai: new Date(selesai).toISOString(),
      jam: jamWib(mulai),
      bisa: !galat && !lampau,
      kode: lampau ? 'LAMPAU' : (galat ? galat.kode : ''),
      alasan: lampau ? 'Sudah lewat.' : (galat ? galat.pesan : ''),
    });
  }
  return hasil;
}

// Rentang yang dipilih pelanggan harus utuh terdiri dari slot yang bisa
// dipilih. Diperiksa terpisah dari periksaRuang() karena halaman bisa
// mengirim rentang panjang sekaligus (09:00-12:00), dan yang harus dipastikan
// adalah TIDAK ADA satu pun setengah jam di dalamnya yang terkunci.
function rentangDariSlot(slots, mulaiIso, selesaiIso) {
  var mulai = Date.parse(mulaiIso);
  var selesai = Date.parse(selesaiIso);
  if (!rentangSah(mulai, selesai)) return { bisa: false, alasan: ALASAN.RENTANG };

  var ketemu = 0;
  for (var i = 0; i < slots.length; i++) {
    var s = Date.parse(slots[i].mulai);
    var e = Date.parse(slots[i].selesai);
    if (s < mulai || e > selesai) continue;
    ketemu++;
    if (!slots[i].bisa) return { bisa: false, alasan: slots[i].alasan, jam: slots[i].jam };
  }
  var perlu = Math.round((selesai - mulai) / (GRID_MENIT * MENIT));
  if (ketemu !== perlu) return { bisa: false, alasan: ALASAN.JAM_OPERASIONAL };
  return { bisa: true, alasan: '' };
}

// ---------------------------------------------------------------------------
// 8. Harga
// ---------------------------------------------------------------------------
//
// Satuan sewa menentukan apa yang dikalikan:
//   JAM  - per jam, dibulatkan NAIK ke setengah jam terdekat, minimum 1 jam.
//   HARI - per hari kalender pemakaian, dibulatkan naik, minimum 1 hari.
//   SESI - harga borongan sekali pakai, durasinya tidak menambah apa pun.
//
// Pembulatan naik ke setengah jam dipilih supaya cocok dengan grid 30 menit:
// dengan pembulatan ke jam penuh, peminjaman 09:00-09:30 dan 09:00-10:00 akan
// berharga sama, dan slot setengah jam kehilangan gunanya.
function satuanJumlah(satuan, mulai, selesai) {
  var durasi = Math.max(0, selesai - mulai);
  if (satuan === 'HARI') {
    return Math.max(1, Math.ceil(durasi / HARI));
  }
  if (satuan === 'SESI') {
    return 1;
  }
  var setengahJam = Math.ceil(durasi / (30 * MENIT));
  var jam = setengahJam / 2;
  return Math.max(1, jam);
}

function hitungBaris(hargaSatuan, satuan, mulai, selesai, jumlah) {
  var qty = Math.max(1, Math.floor(Number(jumlah) || 1));
  var harga = Math.max(0, Number(hargaSatuan) || 0);
  var banyak = satuanJumlah(String(satuan || 'JAM').toUpperCase(), mulai, selesai);
  // Dibulatkan ke rupiah utuh: setengah jam dari harga ganjil bisa
  // menghasilkan pecahan, dan nominal transfer harus bisa diketik apa adanya.
  return Math.round(harga * banyak * qty);
}

// ---------------------------------------------------------------------------
// 9. Kode booking
// ---------------------------------------------------------------------------
//
// PRD bagian 16: `PMJ-20260920-0001`. Tanggalnya WIB, bukan UTC - kode yang
// dibacakan lewat telepon harus cocok dengan tanggal yang dilihat admin di
// kalendernya sendiri.
function kodeBooking(ms, urut) {
  var t = tanggalWib(ms).replace(/-/g, '');
  var n = String(Math.max(1, Math.floor(Number(urut) || 1)));
  while (n.length < 4) n = '0' + n;
  return 'PMJ-' + t + '-' + n;
}

// ---------------------------------------------------------------------------
// 10. Waktu WIB
// ---------------------------------------------------------------------------
//
// Dihitung manual dengan menggeser +7 jam lalu membaca bagian UTC-nya. Cara
// ini dipakai (bukan toLocaleString dengan timeZone) karena runtime hook
// PocketBase tidak menjamin basis data zona waktu ICU tersedia, dan
// toLocaleString yang diam-diam jatuh ke UTC akan menggeser semua jam tampilan
// tujuh jam tanpa ada yang error.
function geser(ms) { return new Date(ms + WIB_OFFSET); }

function pad(n) { return n < 10 ? '0' + n : String(n); }

function tanggalWib(ms) {
  var d = geser(ms);
  return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate());
}

function jamWib(ms) {
  var d = geser(ms);
  return pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes());
}

function menitWibHarian(ms) {
  var d = geser(ms);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

// 00:00 WIB pada tanggal `YYYY-MM-DD`, dikembalikan sebagai ms UTC.
function awalHariWib(tanggal) {
  var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(tanggal || ''));
  if (!m) return NaN;
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 0, 0, 0, 0) - WIB_OFFSET;
}

// "Sab, 20 Sep 2026 09:00-11:00" - dipakai di pesan WhatsApp & Telegram, jadi
// harus terbaca utuh dalam satu baris chat.
var HARI_ID = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
var BULAN_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

function jadwalKalimat(mulaiMs, selesaiMs) {
  var a = geser(mulaiMs);
  var teks = HARI_ID[a.getUTCDay()] + ', ' + a.getUTCDate() + ' ' + BULAN_ID[a.getUTCMonth()] + ' ' + a.getUTCFullYear() +
    ' ' + jamWib(mulaiMs) + '-' + jamWib(selesaiMs);
  if (tanggalWib(mulaiMs) !== tanggalWib(selesaiMs)) {
    var b = geser(selesaiMs);
    teks = HARI_ID[a.getUTCDay()] + ', ' + a.getUTCDate() + ' ' + BULAN_ID[a.getUTCMonth()] + ' ' + jamWib(mulaiMs) +
      ' s/d ' + HARI_ID[b.getUTCDay()] + ', ' + b.getUTCDate() + ' ' + BULAN_ID[b.getUTCMonth()] + ' ' + jamWib(selesaiMs);
  }
  return teks;
}

function rupiah(n) {
  var v = Math.round(Number(n) || 0);
  var s = String(Math.abs(v));
  var out = '';
  for (var i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 === 0) out += '.';
    out += s[i];
  }
  return (v < 0 ? '-Rp' : 'Rp') + out;
}

module.exports = {
  MENIT: MENIT,
  JAM: JAM,
  HARI: HARI,
  GRID_MENIT: GRID_MENIT,
  WIB_OFFSET: WIB_OFFSET,
  STATUS_MEMBLOK: STATUS_MEMBLOK,
  STATUS_SEMUA: STATUS_SEMUA,
  ALASAN: ALASAN,
  memblok: memblok,
  bentrok: bentrok,
  rentangSah: rentangSah,
  diGrid: diGrid,
  dalamJamOperasional: dalamJamOperasional,
  gabungRentang: gabungRentang,
  tercakupPenjaga: tercakupPenjaga,
  puncakPemakaian: puncakPemakaian,
  sisaStok: sisaStok,
  periksaRuang: periksaRuang,
  slotHarian: slotHarian,
  rentangDariSlot: rentangDariSlot,
  satuanJumlah: satuanJumlah,
  hitungBaris: hitungBaris,
  kodeBooking: kodeBooking,
  tanggalWib: tanggalWib,
  jamWib: jamWib,
  menitWibHarian: menitWibHarian,
  awalHariWib: awalHariWib,
  jadwalKalimat: jadwalKalimat,
  rupiah: rupiah,
};
