// TEST ATURAN KONFLIK JADWAL PEMINJAMAN (PRD bagian 22)
//
// Yang diuji di sini cuma pb_hooks/rental-aturan.js - berkas aturan murni yang
// sengaja tidak menyentuh PocketBase. Jadi test ini jalan tanpa server, tanpa
// database, dan tanpa berkas .env: `node test/konflik-jadwal.test.mjs`.
//
// KENAPA DIMUAT LEWAT vm, BUKAN import BIASA
// apps/pocketbase/package.json memakai "type": "module", sedangkan berkas hook
// PocketBase ditulis CommonJS (`module.exports`) karena itulah yang dimengerti
// runtime JSVM-nya. Kalau di-import langsung, Node membacanya sebagai ESM dan
// gagal di `module is not defined`. Membungkusnya di vm membuat satu berkas
// yang sama bisa dipakai dua runtime tanpa disalin dua kali.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const DIR = dirname(fileURLToPath(import.meta.url));

function muatHook(namaBerkas) {
  const kode = readFileSync(join(DIR, '..', 'pb_hooks', namaBerkas), 'utf8');
  const modul = { exports: {} };
  const konteks = vm.createContext({ module: modul, exports: modul.exports, console, Date, Math, JSON });
  vm.runInContext(kode, konteks, { filename: namaBerkas });
  return modul.exports;
}

const A = muatHook('rental-aturan.js');

// Pembantu: "2026-09-20 09:00" WIB -> ms epoch.
const wib = (tanggal, jam) => A.awalHariWib(tanggal) + Number(jam.slice(0, 2)) * A.JAM + Number(jam.slice(3, 5)) * A.MENIT;

let lulus = 0;
let gagal = 0;
const kasus = [];

function uji(nama, fn) {
  kasus.push([nama, fn]);
}

// ---------------------------------------------------------------------------
// 1. Aturan irisan: request_start < existing_end && request_end > existing_start
// ---------------------------------------------------------------------------

uji('rentang yang beririsan dianggap bentrok', () => {
  assert.equal(A.bentrok(wib('2026-09-20', '09:00'), wib('2026-09-20', '11:00'),
                         wib('2026-09-20', '10:00'), wib('2026-09-20', '12:00')), true);
});

uji('rentang yang bersambungan TIDAK bentrok (09-10 lalu 10-11)', () => {
  // Ini pembeda `<` dari `<=`. Kalau ini gagal, ruang tidak bisa dipakai
  // beruntun sama sekali dan setiap jeda antar-peminjaman jadi wajib.
  assert.equal(A.bentrok(wib('2026-09-20', '09:00'), wib('2026-09-20', '10:00'),
                         wib('2026-09-20', '10:00'), wib('2026-09-20', '11:00')), false);
});

uji('rentang yang membungkus rentang lain dianggap bentrok', () => {
  assert.equal(A.bentrok(wib('2026-09-20', '08:00'), wib('2026-09-20', '17:00'),
                         wib('2026-09-20', '10:00'), wib('2026-09-20', '11:00')), true);
});

uji('rentang yang berada di dalam rentang lain dianggap bentrok', () => {
  assert.equal(A.bentrok(wib('2026-09-20', '10:15'), wib('2026-09-20', '10:45'),
                         wib('2026-09-20', '10:00'), wib('2026-09-20', '11:00')), true);
});

uji('rentang yang terpisah jauh tidak bentrok', () => {
  assert.equal(A.bentrok(wib('2026-09-20', '09:00'), wib('2026-09-20', '10:00'),
                         wib('2026-09-21', '09:00'), wib('2026-09-21', '10:00')), false);
});

// ---------------------------------------------------------------------------
// 2. Grid 30 menit
// ---------------------------------------------------------------------------

uji('jam bulat dan setengah jam ada di grid', () => {
  assert.equal(A.diGrid(wib('2026-09-20', '09:00')), true);
  assert.equal(A.diGrid(wib('2026-09-20', '09:30')), true);
});

uji('jam di luar kelipatan 30 menit ditolak', () => {
  assert.equal(A.diGrid(wib('2026-09-20', '09:00') + 10 * A.MENIT), false);
  assert.equal(A.diGrid(wib('2026-09-20', '09:00') + 45 * A.MENIT), false);
});

// ---------------------------------------------------------------------------
// 3. Jam operasional
// ---------------------------------------------------------------------------

uji('peminjaman di dalam jam operasional lolos', () => {
  assert.equal(A.dalamJamOperasional(wib('2026-09-20', '09:00'), wib('2026-09-20', '11:00'), 8 * 60, 21 * 60), true);
});

uji('peminjaman yang mulai sebelum jam buka ditolak', () => {
  assert.equal(A.dalamJamOperasional(wib('2026-09-20', '07:00'), wib('2026-09-20', '09:00'), 8 * 60, 21 * 60), false);
});

uji('peminjaman yang selesai setelah jam tutup ditolak', () => {
  assert.equal(A.dalamJamOperasional(wib('2026-09-20', '20:00'), wib('2026-09-20', '22:00'), 8 * 60, 21 * 60), false);
});

uji('peminjaman yang melewati tengah malam ditolak, bukan dipotong', () => {
  assert.equal(A.dalamJamOperasional(wib('2026-09-20', '20:00'), wib('2026-09-21', '02:00'), 8 * 60, 21 * 60), false);
});

uji('peminjaman yang berakhir tepat di jam tutup lolos', () => {
  assert.equal(A.dalamJamOperasional(wib('2026-09-20', '19:00'), wib('2026-09-20', '21:00'), 8 * 60, 21 * 60), true);
});

// ---------------------------------------------------------------------------
// 4. Cakupan penjaga
// ---------------------------------------------------------------------------

uji('satu shift yang membungkus peminjaman dianggap tercakup', () => {
  const jadwal = [{ mulai: wib('2026-09-20', '08:00'), selesai: wib('2026-09-20', '16:00') }];
  assert.equal(A.tercakupPenjaga(wib('2026-09-20', '09:00'), wib('2026-09-20', '11:00'), jadwal), true);
});

uji('dua shift bersambungan menutupi peminjaman yang melintasi pergantiannya', () => {
  // Kalau shift tidak digabung dulu, peminjaman yang melewati jam 12:00 akan
  // selalu ditolak padahal penjaganya tidak pernah kosong.
  const jadwal = [
    { mulai: wib('2026-09-20', '08:00'), selesai: wib('2026-09-20', '12:00') },
    { mulai: wib('2026-09-20', '12:00'), selesai: wib('2026-09-20', '16:00') },
  ];
  assert.equal(A.tercakupPenjaga(wib('2026-09-20', '11:00'), wib('2026-09-20', '13:00'), jadwal), true);
});

uji('shift yang bolong di tengah tidak menutupi peminjaman', () => {
  const jadwal = [
    { mulai: wib('2026-09-20', '08:00'), selesai: wib('2026-09-20', '11:00') },
    { mulai: wib('2026-09-20', '12:00'), selesai: wib('2026-09-20', '16:00') },
  ];
  assert.equal(A.tercakupPenjaga(wib('2026-09-20', '10:00'), wib('2026-09-20', '13:00'), jadwal), false);
});

uji('tanpa jadwal penjaga sama sekali, tidak tercakup', () => {
  assert.equal(A.tercakupPenjaga(wib('2026-09-20', '09:00'), wib('2026-09-20', '10:00'), []), false);
});

// ---------------------------------------------------------------------------
// 5. Stok alat
// ---------------------------------------------------------------------------

uji('peminjaman alat pada jam yang tidak bersentuhan tidak saling memakan stok', () => {
  const pakai = [
    { mulai: wib('2026-09-20', '09:00'), selesai: wib('2026-09-20', '10:00'), jumlah: 2 },
    { mulai: wib('2026-09-20', '14:00'), selesai: wib('2026-09-20', '15:00'), jumlah: 2 },
  ];
  // Stok 2, dua pemakaian masing-masing 2, tapi jamnya terpisah: pada
  // 09:00-10:00 yang terpakai tetap 2, bukan 4.
  assert.equal(A.sisaStok(2, wib('2026-09-20', '09:00'), wib('2026-09-20', '10:00'), pakai), 0);
  assert.equal(A.sisaStok(2, wib('2026-09-20', '11:00'), wib('2026-09-20', '12:00'), pakai), 2);
});

uji('pemakaian yang beririsan dijumlahkan', () => {
  const pakai = [
    { mulai: wib('2026-09-20', '09:00'), selesai: wib('2026-09-20', '11:00'), jumlah: 2 },
    { mulai: wib('2026-09-20', '10:00'), selesai: wib('2026-09-20', '12:00'), jumlah: 3 },
  ];
  // Puncaknya di 10:00-11:00 = 5.
  assert.equal(A.puncakPemakaian(wib('2026-09-20', '09:00'), wib('2026-09-20', '12:00'), pakai), 5);
  assert.equal(A.sisaStok(6, wib('2026-09-20', '09:00'), wib('2026-09-20', '12:00'), pakai), 1);
});

uji('sisa stok tidak pernah negatif', () => {
  const pakai = [{ mulai: wib('2026-09-20', '09:00'), selesai: wib('2026-09-20', '10:00'), jumlah: 99 }];
  assert.equal(A.sisaStok(2, wib('2026-09-20', '09:00'), wib('2026-09-20', '10:00'), pakai), 0);
});

// ---------------------------------------------------------------------------
// 6. Status yang memblok
// ---------------------------------------------------------------------------

uji('MENUNGGU_PEMBAYARAN memblok slot (tidak ada auto-expire di MVP)', () => {
  assert.equal(A.memblok('MENUNGGU_PEMBAYARAN'), true);
});

uji('DITOLAK masih memblok sampai admin membatalkan', () => {
  assert.equal(A.memblok('DITOLAK'), true);
});

uji('DIBATALKAN dan SELESAI tidak memblok', () => {
  assert.equal(A.memblok('DIBATALKAN'), false);
  assert.equal(A.memblok('SELESAI'), false);
});

// ---------------------------------------------------------------------------
// 7. periksaRuang: urutan alasan
// ---------------------------------------------------------------------------

const dasar = {
  aktif: true,
  bukaMenit: 8 * 60,
  tutupMenit: 21 * 60,
  blok: [],
  peminjaman: [],
  penjaga: [{ mulai: wib('2026-09-20', '08:00'), selesai: wib('2026-09-20', '21:00') }],
  butuhPenjaga: true,
};

uji('ruang bebas pada jam kerja: lolos', () => {
  assert.equal(A.periksaRuang({ ...dasar, mulai: wib('2026-09-20', '09:00'), selesai: wib('2026-09-20', '11:00') }), null);
});

uji('kelas mengalahkan segalanya dan disebut sebagai alasannya', () => {
  const hasil = A.periksaRuang({
    ...dasar,
    mulai: wib('2026-09-20', '09:00'),
    selesai: wib('2026-09-20', '11:00'),
    blok: [{ mulai: wib('2026-09-20', '10:00'), selesai: wib('2026-09-20', '12:00'), jenis: 'KELAS' }],
    peminjaman: [{ id: 'x', mulai: wib('2026-09-20', '09:00'), selesai: wib('2026-09-20', '11:00') }],
  });
  assert.equal(hasil.kode, 'KELAS');
});

uji('blok internal menolak peminjaman', () => {
  const hasil = A.periksaRuang({
    ...dasar,
    mulai: wib('2026-09-20', '09:00'),
    selesai: wib('2026-09-20', '11:00'),
    blok: [{ mulai: wib('2026-09-20', '10:00'), selesai: wib('2026-09-20', '12:00'), jenis: 'INTERNAL' }],
  });
  assert.equal(hasil.kode, 'BLOK');
});

uji('booking aktif lain menolak peminjaman', () => {
  const hasil = A.periksaRuang({
    ...dasar,
    mulai: wib('2026-09-20', '09:00'),
    selesai: wib('2026-09-20', '11:00'),
    peminjaman: [{ id: 'oi1', mulai: wib('2026-09-20', '10:30'), selesai: wib('2026-09-20', '11:30') }],
  });
  assert.equal(hasil.kode, 'TERPAKAI');
});

uji('reschedule boleh menempati slotnya sendiri (abaikanOrderItem)', () => {
  // Tanpa ini, memindahkan booking ke jam yang sama persis akan ditolak oleh
  // dirinya sendiri, dan admin tidak bisa mengubah apa pun selain jamnya.
  const hasil = A.periksaRuang({
    ...dasar,
    mulai: wib('2026-09-20', '09:00'),
    selesai: wib('2026-09-20', '11:00'),
    peminjaman: [{ id: 'oi1', mulai: wib('2026-09-20', '09:00'), selesai: wib('2026-09-20', '11:00') }],
    abaikanOrderItem: 'oi1',
  });
  assert.equal(hasil, null);
});

uji('tanpa penjaga pada jamnya, ruang yang mewajibkan penjaga ditolak', () => {
  const hasil = A.periksaRuang({
    ...dasar,
    mulai: wib('2026-09-20', '09:00'),
    selesai: wib('2026-09-20', '11:00'),
    penjaga: [{ mulai: wib('2026-09-20', '13:00'), selesai: wib('2026-09-20', '17:00') }],
  });
  assert.equal(hasil.kode, 'PENJAGA');
});

uji('ruang yang tidak mewajibkan penjaga tetap lolos walau penjaganya kosong', () => {
  const hasil = A.periksaRuang({
    ...dasar,
    mulai: wib('2026-09-20', '09:00'),
    selesai: wib('2026-09-20', '11:00'),
    penjaga: [],
    butuhPenjaga: false,
  });
  assert.equal(hasil, null);
});

uji('ruang nonaktif ditolak sebelum apa pun diperiksa', () => {
  const hasil = A.periksaRuang({ ...dasar, aktif: false, mulai: wib('2026-09-20', '09:00'), selesai: wib('2026-09-20', '11:00') });
  assert.equal(hasil.kode, 'NONAKTIF');
});

// ---------------------------------------------------------------------------
// 8. Grid slot harian
// ---------------------------------------------------------------------------

uji('grid harian memuat satu slot per 30 menit di dalam jam operasional', () => {
  const slots = A.slotHarian({
    awalHari: A.awalHariWib('2026-09-20'),
    bukaMenit: 8 * 60,
    tutupMenit: 12 * 60,
    aktif: true,
    blok: [],
    peminjaman: [],
    penjaga: [],
    butuhPenjaga: false,
  });
  assert.equal(slots.length, 8);          // 08:00 s/d 12:00 = 8 x 30 menit
  assert.equal(slots[0].jam, '08:00');
  assert.equal(slots[7].jam, '11:30');
  assert.ok(slots.every((s) => s.bisa));
});

uji('slot yang terkena kelas ditandai beserta sebabnya', () => {
  const slots = A.slotHarian({
    awalHari: A.awalHariWib('2026-09-20'),
    bukaMenit: 8 * 60,
    tutupMenit: 12 * 60,
    aktif: true,
    blok: [{ mulai: wib('2026-09-20', '09:00'), selesai: wib('2026-09-20', '10:00'), jenis: 'KELAS' }],
    peminjaman: [],
    penjaga: [],
    butuhPenjaga: false,
  });
  const terkunci = slots.filter((s) => !s.bisa);
  assert.equal(terkunci.length, 2);       // 09:00 dan 09:30
  assert.equal(terkunci[0].kode, 'KELAS');
  assert.ok(terkunci[0].alasan.length > 0);
});

uji('slot yang sudah lewat tidak bisa dipilih', () => {
  const slots = A.slotHarian({
    awalHari: A.awalHariWib('2026-09-20'),
    bukaMenit: 8 * 60,
    tutupMenit: 12 * 60,
    aktif: true,
    blok: [],
    peminjaman: [],
    penjaga: [],
    butuhPenjaga: false,
    sekarang: wib('2026-09-20', '10:00'),
  });
  assert.equal(slots[0].kode, 'LAMPAU');
  assert.equal(slots[0].bisa, false);
  assert.equal(slots[4].bisa, true);      // 10:00
});

uji('rentang yang menabrak satu slot terkunci ditolak seluruhnya', () => {
  const slots = A.slotHarian({
    awalHari: A.awalHariWib('2026-09-20'),
    bukaMenit: 8 * 60,
    tutupMenit: 12 * 60,
    aktif: true,
    blok: [{ mulai: wib('2026-09-20', '09:30'), selesai: wib('2026-09-20', '10:00'), jenis: 'INTERNAL' }],
    peminjaman: [],
    penjaga: [],
    butuhPenjaga: false,
  });
  const hasil = A.rentangDariSlot(slots,
    new Date(wib('2026-09-20', '09:00')).toISOString(),
    new Date(wib('2026-09-20', '11:00')).toISOString());
  assert.equal(hasil.bisa, false);
});

uji('rentang yang keluar dari jam operasional ditolak', () => {
  const slots = A.slotHarian({
    awalHari: A.awalHariWib('2026-09-20'),
    bukaMenit: 8 * 60,
    tutupMenit: 12 * 60,
    aktif: true,
    blok: [],
    peminjaman: [],
    penjaga: [],
    butuhPenjaga: false,
  });
  const hasil = A.rentangDariSlot(slots,
    new Date(wib('2026-09-20', '11:00')).toISOString(),
    new Date(wib('2026-09-20', '13:00')).toISOString());
  assert.equal(hasil.bisa, false);
});

// ---------------------------------------------------------------------------
// 9. Harga
// ---------------------------------------------------------------------------

uji('satuan JAM dibulatkan naik ke setengah jam, minimum 1 jam', () => {
  assert.equal(A.satuanJumlah('JAM', wib('2026-09-20', '09:00'), wib('2026-09-20', '09:30')), 1);
  assert.equal(A.satuanJumlah('JAM', wib('2026-09-20', '09:00'), wib('2026-09-20', '10:30')), 1.5);
  assert.equal(A.satuanJumlah('JAM', wib('2026-09-20', '09:00'), wib('2026-09-20', '12:00')), 3);
});

uji('satuan HARI dibulatkan naik per 24 jam, minimum 1 hari', () => {
  assert.equal(A.satuanJumlah('HARI', wib('2026-09-20', '09:00'), wib('2026-09-20', '11:00')), 1);
  assert.equal(A.satuanJumlah('HARI', wib('2026-09-20', '09:00'), wib('2026-09-22', '09:00')), 2);
});

uji('satuan SESI tidak dipengaruhi durasi', () => {
  assert.equal(A.satuanJumlah('SESI', wib('2026-09-20', '09:00'), wib('2026-09-20', '17:00')), 1);
});

uji('total baris = harga x satuan x jumlah, dibulatkan ke rupiah utuh', () => {
  assert.equal(A.hitungBaris(50000, 'JAM', wib('2026-09-20', '09:00'), wib('2026-09-20', '11:00'), 1), 100000);
  assert.equal(A.hitungBaris(50000, 'JAM', wib('2026-09-20', '09:00'), wib('2026-09-20', '10:30'), 2), 150000);
  assert.equal(A.hitungBaris(25000, 'SESI', wib('2026-09-20', '09:00'), wib('2026-09-20', '17:00'), 3), 75000);
});

// ---------------------------------------------------------------------------
// 10. Kode booking & format
// ---------------------------------------------------------------------------

uji('kode booking memakai tanggal WIB dan nomor urut 4 digit', () => {
  assert.equal(A.kodeBooking(wib('2026-09-20', '09:00'), 1), 'PMJ-20260920-0001');
  assert.equal(A.kodeBooking(wib('2026-09-20', '09:00'), 123), 'PMJ-20260920-0123');
});

uji('kode booking memakai tanggal WIB, bukan UTC, di jam-jam awal', () => {
  // 20 Sep 2026 00:30 WIB = 19 Sep 17:30 UTC. Kode harus berbunyi 20260920,
  // karena itulah tanggal yang dilihat admin di kalendernya.
  assert.equal(A.kodeBooking(wib('2026-09-20', '00:30'), 7), 'PMJ-20260920-0007');
});

uji('rupiah diberi titik ribuan', () => {
  assert.equal(A.rupiah(0), 'Rp0');
  assert.equal(A.rupiah(50000), 'Rp50.000');
  assert.equal(A.rupiah(1234567), 'Rp1.234.567');
});

uji('jadwal ditulis utuh dalam satu baris untuk chat', () => {
  assert.equal(
    A.jadwalKalimat(wib('2026-09-20', '09:00'), wib('2026-09-20', '11:00')),
    'Min, 20 Sep 2026 09:00-11:00',
  );
});

// ---------------------------------------------------------------------------
// Jalankan
// ---------------------------------------------------------------------------

for (const [nama, fn] of kasus) {
  try {
    fn();
    lulus++;
    console.log('  ok   ' + nama);
  } catch (err) {
    gagal++;
    console.log('  GAGAL ' + nama);
    console.log('        ' + String(err && err.message).split('\n').join('\n        '));
  }
}

console.log('\n' + lulus + ' lulus, ' + gagal + ' gagal, dari ' + kasus.length + ' kasus.');
if (gagal > 0) process.exit(1);
