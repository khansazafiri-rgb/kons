// Pemeriksaan antrian simpan pengerjaan (src/lib/antrianSimpan.js).
// Jalankan: npm run check:antrian
import { buatAntrianSimpan, gabungDenganCadangan } from '../src/lib/antrianSimpan.js';

let lulus = 0;
let gagal = 0;
const cek = (kondisi, pesan) => {
  if (kondisi) lulus += 1;
  else { gagal += 1; console.log('GAGAL ' + pesan); }
};
const tidur = (ms) => new Promise((r) => setTimeout(r, ms));

// 1. Satu permintaan pada satu waktu, nilai terbaru menang, walau jaringan acak.
{
  let server = {};
  let berjalan = 0;
  let puncak = 0;
  let jumlahKirim = 0;
  const a = buatAntrianSimpan(async (patch) => {
    berjalan += 1; puncak = Math.max(puncak, berjalan); jumlahKirim += 1;
    await tidur(5 + Math.random() * 30);
    server = { ...server, ...patch };
    berjalan -= 1;
  });
  const janji = [];
  for (let i = 1; i <= 10; i++) janji.push(a.simpan({ answers: { q1: i } }));
  const hasil = await Promise.all(janji);
  cek(puncak === 1, `paling banyak satu permintaan berjalan (puncak ${puncak})`);
  cek(server.answers.q1 === 10, `nilai terakhir yang tersimpan (${server.answers.q1})`);
  cek(jumlahKirim <= 2, `klik beruntun digabung (${jumlahKirim} permintaan untuk 10 simpanan)`);
  cek(hasil.every(Boolean), 'semua simpanan dilaporkan berhasil');
}

// 2. Simpan akhir lewat antrian yang sama selalu jadi yang terakhir.
{
  let server = {};
  const a = buatAntrianSimpan(async (patch) => { await tidur(10); server = { ...server, ...patch }; });
  a.simpan({ answers: { q1: 1 } });
  a.simpan({ posisi: 3 });
  const ok = await a.simpan({ answers: { q1: 2 }, status: 'completed' });
  cek(ok && server.status === 'completed' && server.answers.q1 === 2 && server.posisi === 3, 'simpan akhir tidak tertimpa simpanan sementara');
}

// 3. Gagal: dilaporkan false, lalu dicoba lagi sendiri sampai berhasil.
{
  let server = {};
  let percobaan = 0;
  const a = buatAntrianSimpan(async (patch) => {
    percobaan += 1;
    if (percobaan <= 2) throw new Error('putus');
    server = { ...server, ...patch };
  }, { jedaUlang: 20 });
  const ok = await a.simpan({ answers: { q1: 7 } });
  cek(ok === false, 'kegagalan dilaporkan ke pemanggil');
  await tidur(120);
  cek(server.answers?.q1 === 7, `dicoba ulang otomatis sampai tersimpan (percobaan ${percobaan})`);
  cek(!a.sibuk(), 'antrian kosong setelah berhasil');
}

// 4. Isi yang gagal tidak menimpa isi baru yang datang sesudahnya.
{
  let server = {};
  let pertama = true;
  const a = buatAntrianSimpan(async (patch) => {
    await tidur(5);
    if (pertama) { pertama = false; throw new Error('putus'); }
    server = { ...server, ...patch };
  }, { jedaUlang: 10 });
  const p1 = a.simpan({ answers: { q1: 1 } });
  await p1;
  await a.simpan({ answers: { q1: 2 } });
  await tidur(50);
  cek(server.answers?.q1 === 2, `isi terbaru menang atas isi yang gagal (${server.answers?.q1})`);
}

// 5. Cadangan peramban dipakai hanya kalau lebih baru dari server.
{
  const rec = { id: 'x', answers: { a: 1 }, posisi: 1, updated: '2026-11-08 10:00:00.000Z' };
  const lama = { answers: { a: 9 }, t: Date.parse('2026-11-08T09:59:00Z') };
  const baru = { answers: { a: 2 }, posisi: 4, t: Date.parse('2026-11-08T10:00:05Z') };
  cek(gabungDenganCadangan(rec, lama) === rec, 'cadangan yang lebih lama diabaikan');
  const g = gabungDenganCadangan(rec, baru);
  cek(g.answers.a === 2 && g.posisi === 4 && g.id === 'x' && !('t' in g), 'cadangan yang lebih baru dipakai');
  cek(gabungDenganCadangan(rec, null) === rec, 'tanpa cadangan: record apa adanya');
}

console.log(`${lulus} lulus, ${gagal} gagal.`);
if (gagal) process.exit(1);
