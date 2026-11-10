// TEST PEMBACA KISI JADWAL OFFLINE (pb_hooks/jadwal-offline-parse.js)
// Berkas murni, jalan tanpa server: `node test/jadwal-offline.test.mjs`.
// Kisi mini di bawah meniru bentuk sheet asli: judul ruang, baris Jam/hari,
// baris tanggal, baris jam, dan sel gabungan untuk sesi dua jam atau lebih.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const DIR = dirname(fileURLToPath(import.meta.url));
const modul = { exports: {} };
vm.runInContext(readFileSync(join(DIR, '..', 'pb_hooks', 'jadwal-offline-parse.js'), 'utf8'),
  vm.createContext({ module: modul, exports: modul.exports, console, Date, Math, JSON }));
const P = modul.exports;
const J = (x) => JSON.parse(JSON.stringify(x)); // objek dari konteks vm: bandingkan lewat JSON

let lulus = 0;
const uji = (nama, fn) => { fn(); lulus += 1; console.log('  ok   ' + nama); };
const HARI = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

// Satu ruang, satu minggu (2-8 Nov 2026), jam 06.00 sampai 21.00.
function kisi(sel = {}, gabung = []) {
  const nilai = [];
  nilai[0] = ["NOVEMBER (RUANG 1 WISPER)"];
  nilai[1] = ['Jam', ...HARI];
  nilai[2] = ['', '2', '3', '4', '5', '6', '7', '8'];
  for (let j = 6; j < 21; j++) {
    const p = (n) => String(n).padStart(2, '0');
    nilai[3 + (j - 6)] = [`${p(j)}.00-${p(j + 1)}.00`];
  }
  for (const [k, v] of Object.entries(sel)) { const [r, c] = k.split(':').map(Number); nilai[r] = nilai[r] || []; nilai[r][c] = v; }
  return { tab: "November '26", sheetId: 1, nilai, warna: [], gabung };
}
const baris = (jam) => 3 + (jam - 6); // jam mulai -> indeks baris

uji('judul tab dibaca (bulan + tahun)', () => {
  assert.deepEqual(J(P.bulanDariJudul("November '26")), { bulan: 11, tahun: 2026 });
  assert.deepEqual(J(P.bulanDariJudul('Desember 2026')), { bulan: 12, tahun: 2026 });
  assert.equal(P.bulanDariJudul('Catatan'), null);
});

uji('sel gabungan dua jam = satu sesi 2 jam', () => {
  const h = P.parseKisi(kisi({ [`${baris(17)}:1`]: 'ZANEVA' }, [{ r1: baris(17), r2: baris(19), c1: 1, c2: 2 }]));
  assert.equal(h.sesi.length, 1);
  const s = h.sesi[0];
  assert.equal(s.tanggal, '2026-11-02');
  assert.equal((s.selesaiMs - s.mulaiMs) / 3600000, 2);
  assert.equal(new Date(s.mulaiMs).toISOString(), '2026-11-02T10:00:00.000Z'); // 17.00 WIB
  assert.equal(h.ruang[0], 'Ruang 1 Wisper');
});

uji('empat jam gabungan = satu sesi 4 jam', () => {
  const h = P.parseKisi(kisi({ [`${baris(15)}:7`]: 'AFNAN' }, [{ r1: baris(15), r2: baris(19), c1: 7, c2: 8 }]));
  assert.equal(h.sesi.length, 1);
  assert.equal((h.sesi[0].selesaiMs - h.sesi[0].mulaiMs) / 3600000, 4);
  assert.equal(h.sesi[0].tanggal, '2026-11-08');
});

uji('dua sel berurutan bernama sama (tanpa merge) digabung', () => {
  const h = P.parseKisi(kisi({ [`${baris(9)}:2`]: 'INDRA', [`${baris(10)}:2`]: 'INDRA' }));
  assert.equal(h.sesi.length, 1);
  assert.equal((h.sesi[0].selesaiMs - h.sesi[0].mulaiMs) / 3600000, 2);
});

uji('sel kosong tidak dianggap sesi; peringatan kosong', () => {
  const h = P.parseKisi(kisi());
  assert.equal(h.sesi.length, 0);
  assert.deepEqual(J(h.peringatan), []);
});

uji('kategori dari teks', () => {
  assert.equal(P.kategoriTeks('Kelas Offline 1-2'), 'KELAS');
  assert.equal(P.kategoriTeks('KEBUT CCS BATCH 2'), 'TRAMED');
  assert.equal(P.kategoriTeks('ZANEVA'), 'PRIVAT');
  assert.equal(P.kategoriTeks('(NASYWA)'), 'PRIVAT');
  assert.equal(P.kategoriTeks('Penyewaan Bu Ani'), 'SEWA');
});

uji('pengajar dari (HANA) / [Rossyane]', () => {
  assert.deepEqual(J(P.pecahJudul('(HANA) Review UAB1 Bioked')), { judul: 'Review UAB1 Bioked', pengajar: 'Hana' });
  assert.deepEqual(J(P.pecahJudul('[Rossyane] Superficial neck region')), { judul: 'Superficial neck region', pengajar: 'Rossyane' });
  assert.deepEqual(J(P.pecahJudul('(NASYWA)')), { judul: 'NASYWA', pengajar: '' });
  assert.deepEqual(J(P.pecahJudul('ZANEVA')), { judul: 'ZANEVA', pengajar: '' });
});

uji('sel di kolom tanpa tanggal dilaporkan, tidak dibuang diam-diam', () => {
  const g = kisi({ [`${baris(10)}:1`]: 'HANTU' });
  g.nilai[2][1] = ''; // tanggal hilang
  const h = P.parseKisi(g);
  assert.equal(h.sesi.length, 0);
  assert.equal(h.peringatan.length, 1);
  assert.match(h.peringatan[0], /HANTU/);
});

uji('tab tanpa bulan ditolak dengan pesan jelas', () => {
  const g = kisi(); g.tab = 'Catatan';
  const h = P.parseKisi(g);
  assert.equal(h.ok, false);
  assert.match(h.peringatan[0], /nama bulan/);
});

uji('cariSel: letak sel + tinggi untuk tulis-balik', () => {
  const g = kisi();
  assert.deepEqual(J(P.cariSel(g, 'Ruang 1 Wisper', '2026-11-04', 17 * 60, 19 * 60)), { ok: true, baris: baris(17), kolom: 3, tinggi: 2 });
  assert.equal(P.cariSel(g, 'Ruang 9', '2026-11-04', 1020, 1140).ok, false);
  assert.equal(P.cariSel(g, 'Ruang 1 Wisper', '2026-12-04', 1020, 1140).ok, false);
  assert.equal(P.cariSel(g, 'Ruang 1 Wisper', '2026-11-04', 17 * 60 + 30, 19 * 60).ok, false); // bukan jam penuh
});

uji('notasi A1', () => {
  assert.equal(P.a1("November '26", 36, 11, 37, 11), "'November ''26'!L37:L38");
  assert.equal(P.a1('X', 0, 0), "'X'!A1");
  assert.equal(P.a1('X', 0, 27, 0, 27), "'X'!AB1");
});

console.log(`\n${lulus} lulus, 0 gagal.`);
