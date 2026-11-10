// JADWAL OFFLINE - pembaca kisi ruangan dari Google Sheet
//
// Berkas ini MURNI: tidak menyentuh PocketBase, jaringan, maupun jam sistem.
// Karena itu ia bisa diuji langsung dengan Node (lihat
// apps/pocketbase/test/jadwal-offline.test.js) memakai salinan isi sheet.
//
// BENTUK SHEET YANG DIBACA (sheet "Jadwal Offline Integrasi")
//
//   - Satu tab per bulan, judulnya "November '26" (nama bulan + tahun).
//   - Tiap ruang punya blok 8 kolom: "Jam", lalu Senin sampai Minggu. Nama
//     ruang ada di baris judul di atasnya: "NOVEMBER (RUANG 1 WISPER)".
//   - Tiap minggu satu blok ke bawah: baris "Jam | Senin ... Minggu", baris
//     tanggal (angka), lalu baris jam "06.00-07.00" sampai "20.00-21.00".
//   - Satu sel = satu jam. Kelas dua jam ditulis sebagai sel GABUNGAN (merge)
//     dua baris, jadi lama kelas dibaca dari merge, bukan dari teksnya.
//   - Warna sel dipakai admin per siswa/kelas, BUKAN per kategori. Karena itu
//     kategori ditentukan dari teks. Satu-satunya warna yang dibaca adalah
//     warna legenda "Penyewaan", sebab sewa tidak bisa dikenali dari teks.
//
// Yang dikembalikan: daftar sesi { tanggal, mulaiMs, selesaiMs, ruang, teks,
// judul, pengajar, kategori, baris, kolom, tinggi } plus daftar peringatan
// untuk hal yang tidak bisa dibaca (tidak pernah dilewati diam-diam).

const BULAN = ["januari", "februari", "maret", "april", "mei", "juni", "juli", "agustus", "september", "oktober", "november", "desember"];
const HARI = ["senin", "selasa", "rabu", "kamis", "jumat", "sabtu", "minggu"];
const WIB_MS = 7 * 3600000;

function rapi(v) {
  return String(v == null ? "" : v).replace(/\s+/g, " ").trim();
}

// "November '26" / "Nov 2026" / "NOVEMBER 26" -> { bulan: 11, tahun: 2026 }
function bulanDariJudul(judul) {
  const t = rapi(judul).toLowerCase();
  let bulan = 0;
  BULAN.forEach((nama, i) => {
    if (bulan) return;
    if (t.indexOf(nama) !== -1 || new RegExp("\\b" + nama.slice(0, 3) + "\\b").test(t)) bulan = i + 1;
  });
  if (!bulan) return null;
  const m = t.match(/(\d{4})|'?\s*(\d{2})\s*$/);
  if (!m) return null;
  const tahun = m[1] ? Number(m[1]) : 2000 + Number(m[2]);
  if (!(tahun >= 2020 && tahun <= 2100)) return null;
  return { bulan: bulan, tahun: tahun };
}

// "06.00-07.00" / "6:00 - 7:00" -> { a: 360, b: 420 } (menit sejak 00.00)
function jamBaris(v) {
  const m = rapi(v).match(/^(\d{1,2})[.:](\d{2})\s*[-–]\s*(\d{1,2})[.:](\d{2})$/);
  if (!m) return null;
  const a = Number(m[1]) * 60 + Number(m[2]);
  const b = Number(m[3]) * 60 + Number(m[4]);
  if (!(a >= 0 && b > a && b <= 24 * 60)) return null;
  return { a: a, b: b };
}

function hex(warna) {
  if (!warna) return "";
  const k = (x) => ("0" + Math.round((Number(x) || 0) * 255).toString(16)).slice(-2);
  return "#" + k(warna.red) + k(warna.green) + k(warna.blue);
}

// Jawaban spreadsheets.get (satu sheet, dengan data & merges) -> bentuk netral
// { tab, sheetId, nilai[][], gabung[], warna[][] }. Indeks baris/kolom mulai 0.
function dariApiSheets(sheet) {
  const props = (sheet && sheet.properties) || {};
  const data = ((sheet && sheet.data) || [])[0] || {};
  const awalBaris = Number(data.startRow || 0);
  const awalKolom = Number(data.startColumn || 0);
  const nilai = [];
  const warna = [];
  (data.rowData || []).forEach((row, i) => {
    const r = awalBaris + i;
    nilai[r] = [];
    warna[r] = [];
    ((row && row.values) || []).forEach((sel, j) => {
      const c = awalKolom + j;
      nilai[r][c] = sel && sel.formattedValue != null ? String(sel.formattedValue) : "";
      warna[r][c] = hex(sel && sel.effectiveFormat && sel.effectiveFormat.backgroundColor);
    });
  });
  const gabung = ((sheet && sheet.merges) || []).map((g) => ({
    r1: Number(g.startRowIndex || 0), r2: Number(g.endRowIndex || 0),
    c1: Number(g.startColumnIndex || 0), c2: Number(g.endColumnIndex || 0),
  }));
  return { tab: String(props.title || ""), sheetId: Number(props.sheetId || 0), nilai: nilai, gabung: gabung, warna: warna };
}

// "NOVEMBER (RUANG 5 - RUANG VIP WISPER 19)" -> "Ruang 5 - Ruang VIP Wisper 19"
function namaRuang(v) {
  const t = rapi(v);
  const m = t.match(/\(([^)]*ruang[^)]*)\)/i);
  if (!m) return "";
  return rapi(m[1]).toLowerCase().replace(/(^|[\s-])([a-z])/g, (s, a, b) => a + b.toUpperCase()).replace(/\bVip\b/g, "VIP");
}

// Kategori dari teks. Urutannya penting: "KEBUT CCS BATCH 2" adalah Tramed/CCS
// walau tidak memuat kata "kelas".
function kategoriTeks(teks, warnaSel, warnaSewa) {
  const t = rapi(teks).toLowerCase();
  if (/\b(sewa|penyewaan|peminjaman|disewa|booking)\b/.test(t)) return "SEWA";
  if (warnaSewa && warnaSel && warnaSel === warnaSewa) return "SEWA";
  if (/\b(ccs|tramed)\b/.test(t)) return "TRAMED";
  if (/^kelas\s+offline\b/.test(t) || /\bkelas\s+offline\b/.test(t)) return "KELAS";
  // Pada kisi ruangan PCV, entri tanpa marker sewa/CCS adalah kegiatan
  // belajar offline. Warna siswa sudah tidak menjadi kategori privat.
  return "KELAS";
}

// "(HANA) Review UAB1 Bioked" -> { judul: "Review UAB1 Bioked", pengajar: "Hana" }
// "[Rossyane] Superficial neck" -> pengajar "Rossyane"
// "(NASYWA)" saja -> judul "NASYWA" (tanda kurung dipertahankan di teks asli)
function pecahJudul(teks) {
  const t = rapi(teks);
  const m = t.match(/^[(\[]\s*([^)\]]{2,40})\s*[)\]]\s*(.+)$/);
  if (m && rapi(m[2]).length >= 3) {
    const p = rapi(m[1]);
    return { judul: rapi(m[2]), pengajar: p.charAt(0).toUpperCase() + p.slice(1).toLowerCase() };
  }
  const polos = t.match(/^[(\[]\s*([^)\]]+)\s*[)\]]$/);
  return { judul: polos ? rapi(polos[1]) : t, pengajar: "" };
}

// Ambil warna sewa dari legenda nyata di atas kisi (mis. #d9d2e9 pada
// November '26). Jangan samakan semua nuansa ungu: ada warna ungu lain
// yang dipakai untuk siswa, bukan penyewaan.
function warnaSewaDariLegenda(lembar) {
  const nilai = (lembar && lembar.nilai) || [];
  const warna = (lembar && lembar.warna) || [];
  const sel = (r, c) => rapi((nilai[r] || [])[c]);
  for (let r = 0; r < Math.min(nilai.length, 8); r++) {
    for (let c = 1; c < (nilai[r] || []).length; c++) {
      if (/^penyewaan$/i.test(sel(r, c))) {
        const w = (warna[r] || [])[c - 1] || "";
        if (w && w !== "#ffffff") return w.toLowerCase();
      }
    }
  }
  return "";
}

function parseKisi(lembar) {
  const peringatan = [];
  const sesi = [];
  const tab = String((lembar && lembar.tab) || "");
  const bt = bulanDariJudul(tab);
  if (!bt) return { ok: false, tab: tab, sesi: [], ruang: [], peringatan: ["Judul tab \"" + tab + "\" tidak memuat nama bulan dan tahun (contoh: November '26)."] };

  const nilai = (lembar && lembar.nilai) || [];
  const warna = (lembar && lembar.warna) || [];
  const sel = (r, c) => rapi((nilai[r] || [])[c]);

  // Merge: kiri-atas -> tinggi. Sel lain di dalam merge ditandai supaya tidak
  // dibaca sebagai sel kosong yang berdiri sendiri.
  const tinggiGabung = {};
  const tertutup = {};
  ((lembar && lembar.gabung) || []).forEach((g) => {
    tinggiGabung[g.r1 + ":" + g.c1] = g.r2 - g.r1;
    for (let r = g.r1; r < g.r2; r++) for (let c = g.c1; c < g.c2; c++) if (r !== g.r1 || c !== g.c1) tertutup[r + ":" + c] = true;
  });

  const warnaSewa = warnaSewaDariLegenda(lembar);

  // Baris judul ruang: nama ruang berlaku untuk blok yang kolom "Jam"-nya
  // sama dengan kolom judul itu.
  const ruangKolom = {};
  for (let r = 0; r < nilai.length; r++) {
    for (let c = 0; c < (nilai[r] || []).length; c++) {
      const n = namaRuang(sel(r, c));
      if (n) ruangKolom[c] = n;
    }
  }
  const daftarRuang = Object.keys(ruangKolom).map(Number).sort((a, b) => a - b).map((c) => ruangKolom[c]);
  if (!daftarRuang.length) peringatan.push("Tab " + tab + ": tidak menemukan baris judul ruang, mis. \"NOVEMBER (RUANG 1 WISPER)\".");

  for (let r = 0; r < nilai.length; r++) {
    for (let c = 0; c < (nilai[r] || []).length; c++) {
      if (sel(r, c).toLowerCase() !== "jam") continue;
      const namaHari = [];
      for (let d = 0; d < 7; d++) namaHari.push(sel(r, c + 1 + d).toLowerCase());
      if (namaHari[0] !== HARI[0] || namaHari[6] !== HARI[6]) continue;

      const ruang = ruangKolom[c] || "";
      if (!ruang) {
        peringatan.push("Tab " + tab + ": blok jam di baris " + (r + 1) + " tidak punya judul ruang di kolom yang sama.");
        continue;
      }
      // Baris tanggal tepat di bawah baris nama hari.
      const tanggal = [];
      for (let d = 0; d < 7; d++) {
        const v = sel(r + 1, c + 1 + d);
        const n = /^\d{1,2}$/.test(v) ? Number(v) : 0;
        tanggal.push(n >= 1 && n <= 31 ? n : 0);
      }

      // Baris jam sampai blok berikutnya.
      const barisJam = [];
      for (let rr = r + 2; rr < nilai.length; rr++) {
        const j = jamBaris(sel(rr, c));
        if (!j) { if (sel(rr, c).toLowerCase() === "jam" || barisJam.length) break; continue; }
        barisJam.push({ r: rr, a: j.a, b: j.b });
      }
      const jamDi = {};
      barisJam.forEach((b) => { jamDi[b.r] = b; });

      for (let d = 0; d < 7; d++) {
        const kol = c + 1 + d;
        let sebelum = null;
        barisJam.forEach((b) => {
          if (tertutup[b.r + ":" + kol]) return;
          const teks = sel(b.r, kol);
          if (!teks) { sebelum = null; return; }
          if (!tanggal[d]) {
            peringatan.push("Tab " + tab + ", " + ruang + ": \"" + teks + "\" (baris " + (b.r + 1) + ") ada di kolom tanpa tanggal, jadi tidak dibaca.");
            return;
          }
          const tinggi = Math.max(1, tinggiGabung[b.r + ":" + kol] || 1);
          const akhir = jamDi[b.r + tinggi - 1] || b;
          const awalHari = Date.UTC(bt.tahun, bt.bulan - 1, tanggal[d]) - WIB_MS;
          const mulaiMs = awalHari + b.a * 60000;
          const selesaiMs = awalHari + akhir.b * 60000;
          const pj = pecahJudul(teks);

          // Dua sel berurutan berisi teks yang sama (tidak digabung) = satu sesi.
          if (sebelum && sebelum.selesaiMs === mulaiMs && sebelum.teks.toLowerCase() === teks.toLowerCase()) {
            sebelum.selesaiMs = selesaiMs;
            sebelum.tinggi += tinggi;
            return;
          }
          const s = {
            tab: tab,
            tanggal: bt.tahun + "-" + ("0" + bt.bulan).slice(-2) + "-" + ("0" + tanggal[d]).slice(-2),
            mulaiMs: mulaiMs,
            selesaiMs: selesaiMs,
            ruang: ruang,
            teks: teks,
            judul: pj.judul,
            pengajar: pj.pengajar,
            kategori: kategoriTeks(teks, (warna[b.r] || [])[kol] || "", warnaSewa),
            baris: b.r,
            kolom: kol,
            tinggi: tinggi,
          };
          sesi.push(s);
          sebelum = s;
        });
      }
    }
  }

  sesi.sort((x, y) => x.mulaiMs - y.mulaiMs || x.ruang.localeCompare(y.ruang));
  return { ok: true, tab: tab, bulan: bt.bulan, tahun: bt.tahun, sesi: sesi, ruang: daftarRuang, peringatan: peringatan };
}

// Di mana sebuah sesi baru harus ditulis: sel kiri-atas + tinggi (jumlah baris
// jam) untuk ruang, tanggal, dan jam tertentu. Dipakai tulis-balik dari web.
// Mengembalikan { ok, baris, kolom, tinggi } atau { ok: false, pesan }.
function cariSel(lembar, ruang, tanggal, mulaiMenit, selesaiMenit) {
  const bt = bulanDariJudul(lembar && lembar.tab);
  const m = String(tanggal || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!bt || !m) return { ok: false, pesan: "Tanggal atau tab tidak dikenal." };
  if (Number(m[1]) !== bt.tahun || Number(m[2]) !== bt.bulan) return { ok: false, pesan: "Tanggal itu bukan di tab " + lembar.tab + "." };
  const hariKe = Number(m[3]);
  const nilai = lembar.nilai || [];
  const sel = (r, c) => rapi((nilai[r] || [])[c]);

  let kolomRuang = -1;
  for (let r = 0; r < nilai.length && kolomRuang < 0; r++) {
    for (let c = 0; c < (nilai[r] || []).length; c++) {
      if (namaRuang(sel(r, c)).toLowerCase() === rapi(ruang).toLowerCase()) { kolomRuang = c; break; }
    }
  }
  if (kolomRuang < 0) return { ok: false, pesan: "Ruang \"" + ruang + "\" tidak ada di tab " + lembar.tab + "." };

  for (let r = 0; r < nilai.length; r++) {
    if (sel(r, kolomRuang).toLowerCase() !== "jam") continue;
    for (let d = 0; d < 7; d++) {
      if (Number(sel(r + 1, kolomRuang + 1 + d)) !== hariKe || !/^\d{1,2}$/.test(sel(r + 1, kolomRuang + 1 + d))) continue;
      let awal = -1;
      let akhir = -1;
      for (let rr = r + 2; rr < nilai.length; rr++) {
        const j = jamBaris(sel(rr, kolomRuang));
        if (!j) { if (awal >= 0 || sel(rr, kolomRuang).toLowerCase() === "jam") break; continue; }
        if (j.a === mulaiMenit) awal = rr;
        if (j.b === selesaiMenit) { akhir = rr; break; }
      }
      if (awal < 0 || akhir < awal) return { ok: false, pesan: "Jam itu tidak ada di kisi (kisi berisi jam penuh, mis. 17.00-19.00)." };
      return { ok: true, baris: awal, kolom: kolomRuang + 1 + d, tinggi: akhir - awal + 1 };
    }
  }
  return { ok: false, pesan: "Tanggal " + tanggal + " tidak ada di kisi ruang \"" + ruang + "\"." };
}

// Notasi A1 untuk satu rentang (indeks mulai 0, akhir inklusif).
function a1(tab, r1, c1, r2, c2) {
  const huruf = (c) => {
    let s = "";
    let n = c + 1;
    while (n > 0) { const k = (n - 1) % 26; s = String.fromCharCode(65 + k) + s; n = Math.floor((n - 1) / 26); }
    return s;
  };
  const nama = "'" + String(tab).replace(/'/g, "''") + "'";
  const awal = huruf(c1) + (r1 + 1);
  const akhir = huruf(c2 == null ? c1 : c2) + ((r2 == null ? r1 : r2) + 1);
  return nama + "!" + (awal === akhir ? awal : awal + ":" + akhir);
}

module.exports = {
  bulanDariJudul: bulanDariJudul,
  jamBaris: jamBaris,
  dariApiSheets: dariApiSheets,
  namaRuang: namaRuang,
  kategoriTeks: kategoriTeks,
  warnaSewaDariLegenda: warnaSewaDariLegenda,
  pecahJudul: pecahJudul,
  parseKisi: parseKisi,
  cariSel: cariSel,
  a1: a1,
};
