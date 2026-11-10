// Contract tests for one Google Sheet and one Google Calendar.
// Run with: node test/jadwal-terpadu.test.mjs
// No live Google, Telegram, PocketBase, or customer data is accessed.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'pb_hooks');
let lulus = 0;
function test(nama, fn) { fn(); console.log('  ok  ' + nama); lulus++; }
function load(name, resolve, globals = {}) {
  const module = { exports: {} };
  vm.runInNewContext(readFileSync(join(root, name), 'utf8'), {
    module, exports: module.exports, __hooks: '/hooks', require: resolve, console, Date, JSON, Math, ...globals,
  }, { filename: name });
  return module.exports;
}
class Rec {
  constructor() { this.d = {}; this.id = ''; }
  getString(k) { return String(this.d[k] ?? ''); }
  getInt(k) { return Number(this.d[k] || 0); }
  getBool(k) { return !!this.d[k]; }
  set(k,v) { this.d[k] = v; }
}
const hash = (s) => {
  let v = 0;
  for (const c of String(s)) v = (v * 31 + c.charCodeAt(0)) | 0;
  return Math.abs(v).toString(16).padStart(8, '0').repeat(8).slice(0, 64);
};

test('Calendar: kelas + sewa manual masuk; sewa web tidak duplikat', () => {
  const links = [];
  let up = 0, down = 0;
  const google = {
    googleSiap: () => true,
    calendarUpsert: (_, d) => { up++; return { ok: true, eventId: d.eventId || d.createId }; },
    calendarDelete: () => { down++; return { ok: true }; },
  };
  const C = load('jadwal-calendar.js', (k) => k.includes('rental-integrasi') ? google : {}, {
    Record: Rec, $security: { sha256: hash },
  });
  const app = {
    findCollectionByNameOrId: () => ({}),
    findRecordsByFilter: (_, q, sort, limit, offset, p) => links.filter((x) => x.getString('tab') === p.t),
    save: (r) => { if (!links.includes(r)) links.push(r); },
    delete: (r) => links.splice(links.indexOf(r), 1),
  };
  const ops = { getBool: (x) => x === 'calendarEnabled' };
  const rental = { getString: (x) => x === 'googleRentalCalendarId' ? 'cal@example.com' : '' };
  const sesi = (teks, baris) => ({
    teks, judul: teks, baris, kolom: 2, ruang: 'Ruang 1 Wisper',
    kategori: teks.includes('Penyewaan') ? 'SEWA' : 'KELAS',
    mulaiMs: 1000000, selesaiMs: 4600000, pengajar: '',
  });
  const all = [{ tab: "November '26", sesi: [
    sesi('RAFIF', 11), sesi('Penyewaan manual', 12),
    sesi('Penyewaan web [PCV123] 10.00-11.00', 13),
  ] }];
  const a = C.sinkronKalender(app, ops, rental, 'sheet1', all);
  assert.equal(a.tambah, 2);
  assert.equal(up, 2);
  assert.equal(links.length, 2);
  assert.equal(C.bookingWeb('Penyewaan web [PCV123] 10.00-11.00'), true);
  assert.equal(C.bookingWeb('Penyewaan manual'), false);
  const b = C.sinkronKalender(app, ops, rental, 'sheet1', all);
  assert.equal(b.tambah + b.ubah + b.hapus, 0);
  assert.equal(up, 2);
  const c = C.sinkronKalender(app, ops, rental, 'sheet1', [{
    tab: "November '26", sesi: [sesi('RAFIF UAB', 11)],
  }]);
  assert.equal(c.ubah, 1);
  assert.equal(c.hapus, 1);
  assert.equal(down, 1);
});

test('Rental: booking web ditulis sekali, pembatalan hanya membersihkan sel miliknya', () => {
  const links = [];
  const sheet = { text: '', merge: null };
  let writes = 0, clears = 0;
  const order = new Rec();
  order.d = { bookingCode: 'PCV123', status: 'MENUNGGU_PEMBAYARAN' };
  const item = new Rec(); item.id = 'item1';
  item.d = {
    resourceName: 'Ruang 1', status: 'AKTIF', resourceType: 'RUANG',
    room: 'room1', startAt: Date.parse('2026-11-11T10:00:00Z'),
    endAt: Date.parse('2026-11-11T12:00:00Z'),
  };
  const J = {
    siapTulis: () => ({ ok: true, sheetId: 'sheet1', sR: {}, o: {} }),
    namaSheetUntuk: () => 'Ruang 1 Wisper',
    tanggalWib: (ms) => new Date(ms + 7 * 3600000).toISOString().slice(0, 10),
    tabUntukTanggal: () => ({ ok: true, tab: { judul: "November '26", sheetId: 88 } }),
    ambilLembar: () => ({ ok: true, lembar: {
      sheetId: 88, nilai: Array.from({ length: 20 }, (_, r) => r === 12 ? ['', sheet.text] : []),
      gabung: sheet.merge ? [sheet.merge] : [],
    } }),
    selKosong: () => !sheet.text,
    tambahSesi: (_, data) => {
      if (sheet.text) return { ok: false, pesan: 'Sel terisi' };
      sheet.text = data.teks; sheet.merge = { r1: 12, r2: 14, c1: 1, c2: 2 };
      writes++; return { ok: true };
    },
    rentang: (_, r, c, h) => ({
      sheetId: 88, startRowIndex: r, endRowIndex: r + h, startColumnIndex: c, endColumnIndex: c + 1,
    }),
    batchUpdate: (_, id, req) => {
      if (req.some((x) => x.repeatCell)) { sheet.text = ''; sheet.merge = null; clears++; }
      else if (req[0].updateCells) sheet.text = req[0].updateCells.rows[0].values[0].userEnteredValue.stringValue;
      return { ok: true };
    },
    sinkron: () => ({ ok: true }),
  };
  const P = { cariSel: () => ({ ok: true, baris: 12, kolom: 1, tinggi: 2 }), a1: () => 'B13' };
  const SH = { ms: (rec, field) => rec.d[field] };
  const app = {
    findRecordById: () => order,
    findRecordsByFilter: () => [item],
    findFirstRecordByFilter: (_, q, p) => {
      const found = links.find((x) => x.getString('itemId') === p.id);
      if (!found) throw Error('Not found');
      return found;
    },
    findCollectionByNameOrId: () => ({}),
    save: (r) => { if (r !== order && !links.includes(r)) links.push(r); },
    delete: (r) => links.splice(links.indexOf(r), 1),
  };
  const B = load('jadwal-booking-grid.js', (k) =>
    k.includes('jadwal-offline.js') ? J : k.includes('jadwal-offline-parse.js') ? P : SH,
    { Record: Rec });
  assert.equal(B.sinkronOrder(app, 'order1').ok, true);
  assert.equal(writes, 1);
  assert.match(sheet.text, /^Penyewaan web \[PCV123\]/);
  assert.equal(B.sinkronOrder(app, 'order1').ok, true);
  assert.equal(writes, 1);
  item.d.status = 'DIBATALKAN';
  assert.equal(B.sinkronOrder(app, 'order1').ok, true);
  assert.equal(clears, 1);
  assert.equal(sheet.text, '');
  assert.equal(links.length, 0);
  item.d.status = 'AKTIF';
  sheet.text = 'Kelas Offline 1-1';
  assert.equal(B.sinkronOrder(app, 'order1').ok, false);
  assert.equal(sheet.text, 'Kelas Offline 1-1');
  assert.equal(writes, 1);
});

console.log('\n' + lulus + ' grup uji berhasil.');
