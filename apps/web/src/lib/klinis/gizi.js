import { ada, ang, angZ } from './format';
import { cariLMS, hitungZ, nilaiPadaSD, persentilTeks, tabelLMS } from './zscore';

// STATUS GIZI ANAK - z-score antropometri WHO + kategori Permenkes RI No. 2/2020
//
// Empat sampai lima indeks dihitung sekaligus karena masing-masing menjawab
// pertanyaan yang berbeda, dan menilai satu saja gampang menyesatkan:
//   BB/U    - ringkasan kasar, tidak bisa membedakan "kurus" dari "pendek"
//   PB/U TB/U - kekurangan gizi KRONIK (stunting), akibat bertahun-tahun
//   BB/PB BB/TB - kekurangan gizi AKUT (wasting), sedang berlangsung sekarang
//   IMT/U   - pengganti BB/TB untuk anak di atas 5 tahun
//   LK/U    - pertumbuhan kepala/otak, bukan status gizi
//
// Anak pendek tapi proporsional bisa terlihat "berat badan kurang" di BB/U
// padahal gizinya baik; itulah sebabnya kesimpulan utama di sini diambil dari
// indeks AKUT bila tersedia, bukan dari BB/U.

const HARI_PER_BULAN = 30.4375; // 365,25 ÷ 12

export function usiaDariTanggal(lahir, periksa) {
  if (!lahir) return null;
  const d1 = new Date(`${lahir}T00:00:00`);
  const d2 = new Date(`${periksa || new Date().toISOString().slice(0, 10)}T00:00:00`);
  const hari = Math.round((d2 - d1) / 86400000);
  if (!Number.isFinite(hari) || hari < 0) return null;
  return { hari, bulan: hari / HARI_PER_BULAN };
}

export function usiaDariManual(tahun, bulan, hari) {
  const y = tahun || 0;
  const m = bulan || 0;
  const d = hari || 0;
  if (!y && !m && !d) return null;
  const totalBulan = y * 12 + m + d / HARI_PER_BULAN;
  return { hari: Math.round(totalBulan * HARI_PER_BULAN), bulan: totalBulan };
}

export function usiaTeks(u) {
  const th = Math.floor(u.hari / 365.25);
  const sisa = u.hari - th * 365.25;
  const bl = Math.floor(sisa / HARI_PER_BULAN);
  const hr = Math.round(sisa - bl * HARI_PER_BULAN);
  return `${th ? `${th} tahun ` : ''}${bl} bulan${hr ? ` ${hr} hari` : ''} — total ${u.hari} hari ≈ ${ang(u.bulan, 1)} bulan`;
}

/* ---------- kategori Permenkes RI No. 2 Tahun 2020 ---------- */

function katBBU(z, bulan) {
  if (bulan > 60) return { teks: 'Di luar rentang klasifikasi Permenkes (BB/U hanya 0–60 bulan)', tone: 'info', tag: '—' };
  if (z < -3) return { teks: 'Berat badan sangat kurang', tone: 'bad', tag: 'severely underweight' };
  if (z < -2) return { teks: 'Berat badan kurang', tone: 'warn', tag: 'underweight' };
  if (z <= 1) return { teks: 'Berat badan normal', tone: 'ok', tag: 'normal' };
  return { teks: 'Risiko berat badan lebih', tone: 'warn', tag: 'risk of overweight' };
}

function katTBU(z) {
  if (z < -3) return { teks: 'Sangat pendek', tone: 'bad', tag: 'severely stunted' };
  if (z < -2) return { teks: 'Pendek', tone: 'warn', tag: 'stunted' };
  if (z <= 3) return { teks: 'Normal', tone: 'ok', tag: 'normal' };
  return { teks: 'Tinggi', tone: 'info', tag: 'tall' };
}

function katBBTB(z) {
  if (z < -3) return { teks: 'Gizi buruk', tone: 'bad', tag: 'severely wasted' };
  if (z < -2) return { teks: 'Gizi kurang', tone: 'warn', tag: 'wasted' };
  if (z <= 1) return { teks: 'Gizi baik', tone: 'ok', tag: 'normal' };
  if (z <= 2) return { teks: 'Berisiko gizi lebih', tone: 'warn', tag: 'possible risk of overweight' };
  if (z <= 3) return { teks: 'Gizi lebih', tone: 'warn', tag: 'overweight' };
  return { teks: 'Obesitas', tone: 'bad', tag: 'obese' };
}

function katIMT(z, bulan) {
  if (bulan <= 60) return katBBTB(z);
  if (z < -3) return { teks: 'Gizi buruk', tone: 'bad', tag: 'severely thinness' };
  if (z < -2) return { teks: 'Gizi kurang', tone: 'warn', tag: 'thinness' };
  if (z <= 1) return { teks: 'Gizi baik', tone: 'ok', tag: 'normal' };
  if (z <= 2) return { teks: 'Gizi lebih', tone: 'warn', tag: 'overweight' };
  return { teks: 'Obesitas', tone: 'bad', tag: 'obese' };
}

function katLK(z) {
  if (z < -2) return { teks: 'Mikrosefali', tone: 'bad', tag: 'microcephaly' };
  if (z <= 2) return { teks: 'Normosefali', tone: 'ok', tag: 'normal' };
  return { teks: 'Makrosefali', tone: 'bad', tag: 'macrocephaly' };
}

// Ambang "tidak masuk akal secara biologis" dari WHO Anthro. Z-score sejauh ini
// nyaris selalu berarti salah ukur atau salah ketik (berat dalam gram, tinggi
// dalam meter, tanggal lahir keliru) - bukan temuan klinis.
const BATAS_WAJAR = { bbu: [-6, 5], tbu: [-6, 6], bbtb: [-5, 5], imt: [-5, 5], lk: [-5, 5] };

/* ---------- kebutuhan gizi ---------- */

const RDA = [
  { max: 0.5, kkal: 108, protein: 2.2, label: '0–6 bulan' },
  { max: 1, kkal: 98, protein: 1.6, label: '6–12 bulan' },
  { max: 3, kkal: 102, protein: 1.2, label: '1–3 tahun' },
  { max: 6, kkal: 90, protein: 1.1, label: '4–6 tahun' },
  { max: 10, kkal: 70, protein: 1.0, label: '7–10 tahun' },
  { max: 14, kkal: null, protein: 1.0, label: '11–14 tahun' },
  { max: 18, kkal: null, protein: 0.9, label: '15–18 tahun' },
];

function rdaUntuk(tahun, sex) {
  for (const r of RDA) {
    if (tahun <= r.max) {
      const kkal = r.kkal ?? (r.max === 14 ? (sex === 1 ? 55 : 47) : sex === 1 ? 45 : 40);
      return { kkal, protein: r.protein, label: r.label };
    }
  }
  return { kkal: sex === 1 ? 45 : 40, protein: 0.9, label: '≥ 18 tahun' };
}

// Height-age: umur saat tinggi anak ini justru menjadi tinggi MEDIAN. Dipakai
// sebagai dasar kebutuhan energi, karena anak stunting yang diberi kebutuhan
// menurut umur kalendernya akan kelebihan asupan.
function heightAge(sex, tinggi) {
  let hasil = null;
  // Disisir dari tabel 0–5 tahun lalu 5–19 tahun. Yang terakhir cocok yang
  // dipakai, sehingga anak yang tingginya juga muat di tabel balita tetap
  // mendapat height-age dari rentang umur yang lebih tinggi bila ada.
  for (const [std, ind] of [['who06', 'lhfa'], ['who07', 'hfa']]) {
    const tab = tabelLMS(std, ind, sex);
    if (!tab) continue;
    for (let i = 1; i < tab.length; i += 1) {
      const a = tab[i - 1];
      const b = tab[i];
      const antara = (tinggi >= a[2] && tinggi <= b[2]) || (tinggi <= a[2] && tinggi >= b[2]);
      if (!antara || b[2] === a[2]) continue;
      const w = (tinggi - a[2]) / (b[2] - a[2]);
      hasil = a[0] + w * (b[0] - a[0]);
    }
  }
  return hasil;
}

// Berat badan ideal = berat median untuk panjang/tinggi anak ini.
function beratIdeal(sex, tinggi, bulan) {
  let lms = tinggi >= 45 && tinggi <= 110 ? cariLMS('who06', 'wfl', sex, tinggi) : null;
  if (tinggi >= 65 && tinggi <= 120 && bulan >= 24) lms = cariLMS('who06', 'wfh', sex, tinggi);
  if (lms) return { berat: lms.M, cara: 'median berat menurut tinggi (WHO 2006)' };

  const ha = heightAge(sex, tinggi);
  if (ha !== null) {
    const b = ha <= 60 ? cariLMS('who06', 'bmifa', sex, ha) : cariLMS('who07', 'bmifa', sex, ha, 1.2);
    if (b) {
      return {
        berat: b.M * Math.pow(tinggi / 100, 2),
        cara: `median IMT pada height-age ${ang(ha / 12, 1)} tahun (WHO)`,
      };
    }
  }
  return null;
}

/* ---------- perhitungan utama ---------- */

export function hitungGizi(inp) {
  const { sex, usia, berat, tinggi: tinggiInput, posisiUkur, lingkarKepala, lila, edema } = inp;
  if (!usia) return { error: 'Isi tanggal lahir atau usia manual dulu.' };
  const bulan = usia.bulan;
  if (bulan > 228) return { error: 'Usia di atas 19 tahun — di luar rentang standar WHO.' };
  if (!ada(berat) && !ada(tinggiInput)) return { error: 'Isi minimal berat atau tinggi badan.' };

  // Panjang (telentang) rata-rata 0,7 cm lebih besar daripada tinggi (berdiri)
  // pada anak yang sama. Standar WHO memakai PANJANG di bawah 24 bulan dan
  // TINGGI di atasnya, jadi cara ukur yang tidak sesuai umur dikoreksi dulu -
  // kalau tidak, z-score-nya bergeser sekitar 0,3 SD tanpa disadari.
  let tinggi = null;
  let catatanUkur = '';
  if (ada(tinggiInput)) {
    if (bulan < 24 && posisiUkur === 'berdiri') {
      tinggi = tinggiInput + 0.7;
      catatanUkur = 'diukur berdiri pada usia < 24 bulan → +0,7 cm menjadi panjang badan';
    } else if (bulan >= 24 && posisiUkur === 'telentang') {
      tinggi = tinggiInput - 0.7;
      catatanUkur = 'diukur telentang pada usia ≥ 24 bulan → −0,7 cm menjadi tinggi badan';
    } else {
      tinggi = tinggiInput;
    }
  }

  const langkah = [`Usia = ${usia.hari} hari = ${ang(bulan, 2)} bulan`];
  if (catatanUkur) langkah.push(`Panjang/tinggi: ${ang(tinggiInput, 1)} cm → ${ang(tinggi, 1)} cm (${catatanUkur})`);

  const indikator = [];
  const meragukan = [];
  const tambah = (kunci, nama, z, kat, rinci) => {
    const batas = BATAS_WAJAR[kunci];
    if (batas && (z < batas[0] || z > batas[1])) meragukan.push(`${nama.split(' —')[0]} (${angZ(z)} SD)`);
    indikator.push({ kunci, nama, z, kat, rinci });
  };

  // BB/U - hanya sampai 10 tahun; di atas itu WHO tidak menyediakan tabelnya
  // karena berat saja tidak lagi bermakna tanpa memperhitungkan tinggi.
  if (ada(berat)) {
    let lms = null;
    let sumber = '';
    if (bulan <= 60.5) {
      lms = cariLMS('who06', 'wfa', sex, bulan, 0.6);
      sumber = 'WHO 2006';
    } else if (bulan <= 120.5) {
      lms = cariLMS('who07', 'wfa', sex, bulan, 1.2);
      sumber = 'WHO 2007';
    }
    if (lms) {
      const z = hitungZ(berat, lms, true);
      tambah('bbu', 'BB/U — berat menurut umur', z, katBBU(z, bulan), `Median ${ang(lms.M, 2)} kg · persentil ${persentilTeks(z)} · ${sumber}`);
      langkah.push(`BB/U  : L=${ang(lms.L, 4)} M=${ang(lms.M, 3)} S=${ang(lms.S, 5)} → z = ${angZ(z)}`);
    } else if (bulan > 120.5) {
      indikator.push({
        kunci: 'bbu',
        nama: 'BB/U — berat menurut umur',
        lewat: 'Standar WHO tidak menyediakan BB/U di atas 10 tahun. Gunakan IMT/U dan TB/U.',
      });
    }
  }

  // PB/U atau TB/U
  if (ada(tinggi)) {
    const lms = bulan <= 60.5 ? cariLMS('who06', 'lhfa', sex, bulan, 0.6) : cariLMS('who07', 'hfa', sex, bulan, 1.2);
    const sumber = bulan <= 60.5 ? 'WHO 2006' : 'WHO 2007';
    if (lms) {
      const z = hitungZ(tinggi, lms, false);
      tambah(
        'tbu',
        bulan < 24 ? 'PB/U — panjang menurut umur' : 'TB/U — tinggi menurut umur',
        z,
        katTBU(z),
        `Median ${ang(lms.M, 1)} cm · persentil ${persentilTeks(z)} · ${sumber}`,
      );
      langkah.push(`TB/U  : L=${ang(lms.L, 4)} M=${ang(lms.M, 3)} S=${ang(lms.S, 5)} → z = ${angZ(z)}`);
    }
  }

  // BB/PB atau BB/TB - indeks AKUT, hanya sampai 5 tahun
  if (ada(berat) && ada(tinggi) && bulan <= 60.5) {
    const pakaiPanjang = bulan < 24;
    const lms = cariLMS('who06', pakaiPanjang ? 'wfl' : 'wfh', sex, tinggi, 0);
    if (lms) {
      const z = hitungZ(berat, lms, true);
      tambah(
        'bbtb',
        pakaiPanjang ? 'BB/PB — berat menurut panjang' : 'BB/TB — berat menurut tinggi',
        z,
        katBBTB(z),
        `Median ${ang(lms.M, 2)} kg pada ${ang(tinggi, 1)} cm · persentil ${persentilTeks(z)}`,
      );
      langkah.push(`BB/TB : L=${ang(lms.L, 4)} M=${ang(lms.M, 3)} S=${ang(lms.S, 5)} → z = ${angZ(z)}`);
    } else {
      indikator.push({
        kunci: 'bbtb',
        nama: 'BB/PB atau BB/TB',
        lewat: `Panjang/tinggi ${ang(tinggi, 1)} cm di luar rentang tabel (BB/PB 45–110 cm, BB/TB 65–120 cm).`,
      });
    }
  }

  // IMT/U
  let imt = null;
  if (ada(berat) && ada(tinggi)) {
    imt = berat / Math.pow(tinggi / 100, 2);
    const lms = bulan <= 60.5 ? cariLMS('who06', 'bmifa', sex, bulan, 0.6) : cariLMS('who07', 'bmifa', sex, bulan, 1.2);
    const sumber = bulan <= 60.5 ? 'WHO 2006' : 'WHO 2007';
    if (lms) {
      const z = hitungZ(imt, lms, true);
      tambah('imt', 'IMT/U — indeks massa tubuh menurut umur', z, katIMT(z, bulan), `IMT ${ang(imt, 1)} kg/m² · median ${ang(lms.M, 1)} · persentil ${persentilTeks(z)} · ${sumber}`);
      langkah.push(`IMT   = ${ang(berat, 2)} ÷ (${ang(tinggi / 100, 3)})² = ${ang(imt, 2)} kg/m² → z = ${angZ(z)}`);
    }
  }

  // LK/U
  if (ada(lingkarKepala) && bulan <= 60.5) {
    const lms = cariLMS('who06', 'hcfa', sex, bulan, 0.6);
    if (lms) {
      const z = hitungZ(lingkarKepala, lms, false);
      tambah('lk', 'LK/U — lingkar kepala menurut umur', z, katLK(z), `Median ${ang(lms.M, 1)} cm · persentil ${persentilTeks(z)}`);
      langkah.push(`LK/U  : → z = ${angZ(z)}`);
    }
  }

  /* ---- kesimpulan ---- */
  const cari = (k) => indikator.find((r) => r.kunci === k && !r.lewat);
  const bbtb = cari('bbtb');
  const imtR = cari('imt');
  const tbu = cari('tbu');
  const bbu = cari('bbu');
  const akut = bbtb || imtR;

  let tone = 'ok';
  let teks = 'Status gizi baik';
  if (edema) {
    tone = 'bad';
    teks = 'Gizi buruk (edema bilateral)';
  } else if (akut) {
    tone = akut.kat.tone;
    teks = akut.kat.teks;
  } else if (bbu) {
    tone = bbu.kat.tone;
    teks = bbu.kat.teks;
  }
  const zUtama = akut ? akut.z : bbu ? bbu.z : null;

  const baris = [
    tbu ? { k: `Perawakan (${tbu.nama.split(' —')[0]})`, v: tbu.kat.teks, tone: tbu.kat.tone } : null,
    bbu ? { k: 'BB/U', v: bbu.kat.teks, tone: bbu.kat.tone } : null,
    imt ? { k: 'IMT', v: `${ang(imt, 1)} kg/m²` } : null,
    { k: 'Usia', v: `${usia.hari} hari (${ang(bulan, 1)} bulan)` },
  ].filter(Boolean);

  const catatan = [];
  if (meragukan.length) {
    catatan.push({
      tone: 'bad',
      isi: `Nilai di luar batas biologis yang masuk akal — ${meragukan.join(', ')}. Menurut kriteria WHO Anthro, z-score sejauh ini hampir selalu berarti salah ukur atau salah ketik: cek ulang satuan berat (kg, bukan gram), tinggi (cm, bukan meter), dan tanggal lahir. Jangan pakai angka ini sebelum diverifikasi.`,
    });
  }
  if (edema) {
    catatan.push({
      tone: 'bad',
      isi: 'Edema bilateral pitting = gizi buruk apa pun nilai z-score-nya (kwashiorkor / marasmik-kwashiorkor). Perlu tata laksana gizi buruk rawat inap sesuai 10 langkah WHO.',
    });
  }
  const stunting = tbu && tbu.z < -2;
  const wasting = akut && akut.z < -2;
  if (stunting && wasting) {
    catatan.push({
      tone: 'bad',
      isi: 'Stunting dan wasting bersamaan — risiko mortalitas paling tinggi di antara semua kombinasi. Perlu rujukan dan penelusuran penyebab (asupan, infeksi kronik, TB, HIV, penyakit jantung bawaan, celiac, malabsorpsi).',
    });
  } else if (wasting) {
    catatan.push({
      tone: 'warn',
      isi: 'Wasting menandakan kekurangan gizi AKUT — masalahnya sedang berlangsung sekarang. Nilai nafsu makan, cari infeksi aktif, mulai terapi gizi.',
    });
  } else if (stunting) {
    catatan.push({
      tone: 'warn',
      isi: 'Stunting menandakan kekurangan gizi KRONIK — akumulasi berbulan-bulan hingga bertahun. Telusuri riwayat gizi sejak lahir, ASI/MPASI, infeksi berulang, sanitasi, dan tinggi orang tua.',
    });
  }
  if (tbu && tbu.z > 3) {
    catatan.push({
      tone: 'info',
      isi: 'Tinggi jauh di atas rerata (> +3 SD). Pastikan pengukuran benar; bila konsisten, pertimbangkan penyebab perawakan tinggi patologis.',
    });
  }
  if (ada(lila)) {
    if (bulan >= 6 && bulan <= 59) {
      const t = lila < 11.5 ? ['bad', 'gizi buruk akut (SAM)'] : lila < 12.5 ? ['warn', 'gizi kurang akut (MAM)'] : ['ok', 'normal'];
      catatan.push({
        tone: t[0],
        isi: `LILA ${ang(lila, 1)} cm — ${t[1]}. Ambang: < 11,5 cm gizi buruk, 11,5–12,5 cm gizi kurang, ≥ 12,5 cm normal (usia 6–59 bulan).`,
      });
    } else {
      catatan.push({ tone: 'info', isi: 'Ambang LILA yang dipakai di sini hanya berlaku untuk usia 6–59 bulan.' });
    }
  }

  return {
    utama: zUtama !== null ? angZ(zUtama) : '—',
    satuan: 'SD (z-score)',
    judul: akut ? `Berdasarkan ${akut.nama.split(' —')[0]}` : 'Ringkasan status gizi',
    kategori: { teks, tone },
    baris,
    catatan,
    langkah,
    indikator,
    imt,
    tinggiDipakai: tinggi,
    kebutuhan: rencanaGizi(sex, bulan, berat, tinggi, indikator),
    ringkas: [
      ['Usia', `${usia.hari} hari`],
      ...(ada(berat) ? [['Berat', `${ang(berat, 2)} kg`]] : []),
      ...(ada(tinggi) ? [['Panjang/tinggi', `${ang(tinggi, 1)} cm`]] : []),
      ...indikator.filter((r) => !r.lewat).map((r) => [r.nama.split(' —')[0], `${angZ(r.z)} SD — ${r.kat.teks}`]),
      ['Kesimpulan', teks],
    ],
  };
}

// Perkiraan kebutuhan energi & protein dengan metode RDA-menurut-height-age
// dikali BERAT IDEAL (bukan berat aktual). Ini cara baku terapi gizi anak:
// memakai berat aktual pada anak gizi kurang justru mengunci dia di berat
// rendahnya, sedangkan memakai umur kalender pada anak stunting memberi beban
// berlebih.
function rencanaGizi(sex, bulan, berat, tinggi, indikator) {
  if (!ada(tinggi)) return null;
  const bbi = beratIdeal(sex, tinggi, bulan);
  const ha = heightAge(sex, tinggi);
  const tahun = ha !== null ? ha / 12 : bulan / 12;
  const rda = rdaUntuk(tahun, sex);

  const baris = [];
  if (bbi) baris.push({ k: 'Berat badan ideal (BBI)', v: `${ang(bbi.berat, 2)} kg`, catatan: bbi.cara });
  if (bbi && ada(berat)) {
    const persen = (berat / bbi.berat) * 100;
    const w =
      persen < 70
        ? ['Gizi buruk', 'bad']
        : persen < 90
        ? ['Gizi kurang', 'warn']
        : persen <= 110
        ? ['Gizi baik', 'ok']
        : persen <= 120
        ? ['Gizi lebih', 'warn']
        : ['Obesitas', 'bad'];
    baris.push({ k: '% BB terhadap BBI', v: `${ang(persen, 0)}%`, tone: w[1], tag: w[0] });
  }
  if (ha !== null) baris.push({ k: 'Height-age (usia tinggi)', v: `${ang(ha, 1)} bulan (${ang(ha / 12, 1)} tahun)` });
  baris.push({ k: `RDA energi (${rda.label})`, v: `${rda.kkal} kkal/kg/hari` });
  if (bbi) {
    baris.push({ k: 'Kebutuhan energi = RDA × BBI', v: `${Math.round((rda.kkal * bbi.berat) / 10) * 10} kkal/hari`, kuat: true });
    baris.push({ k: `Kebutuhan protein = ${String(rda.protein).replace('.', ',')} g/kg × BBI`, v: `${ang(rda.protein * bbi.berat, 1)} g/hari`, kuat: true });
  }

  const akut = indikator.find((r) => (r.kunci === 'bbtb' || r.kunci === 'imt') && !r.lewat);
  const catatan = [];
  if (akut && akut.z < -3) {
    catatan.push({
      tone: 'bad',
      isi: 'Fase stabilisasi dulu. Pada gizi buruk jangan langsung memberi kebutuhan penuh — risiko refeeding syndrome. Mulai F-75 sekitar 80–100 kkal/kg/hari berat aktual, baru naik ke fase rehabilitasi (F-100, 150–220 kkal/kg/hari) setelah nafsu makan pulih dan edema berkurang.',
    });
  } else if (akut && akut.z < -2) {
    catatan.push({
      tone: 'warn',
      isi: 'Target catch-up: naikkan asupan bertahap menuju angka di atas, pantau kenaikan berat mingguan (target ≥ 5 g/kg/hari pada fase rehabilitasi).',
    });
  }
  return { baris, catatan };
}

/* ---------- data untuk kurva pertumbuhan ---------- */

export const KURVA = [
  { id: 'bbu', label: 'BB/U', sumbuY: 'Berat badan (kg)', sumbuX: 'Umur (bulan)' },
  { id: 'tbu', label: 'TB/U', sumbuY: 'Panjang / tinggi badan (cm)', sumbuX: 'Umur (bulan)' },
  { id: 'imt', label: 'IMT/U', sumbuY: 'IMT (kg/m²)', sumbuX: 'Umur (bulan)' },
  { id: 'lk', label: 'LK/U', sumbuY: 'Lingkar kepala (cm)', sumbuX: 'Umur (bulan)' },
  { id: 'bbtb', label: 'BB/TB', sumbuY: 'Berat badan (kg)', sumbuX: 'Panjang / tinggi badan (cm)' },
];

const AMBIL = {
  bbu: (sex, x) => (x <= 60 ? cariLMS('who06', 'wfa', sex, x) : x <= 120.5 ? cariLMS('who07', 'wfa', sex, x, 1.2) : null),
  tbu: (sex, x) => (x <= 60 ? cariLMS('who06', 'lhfa', sex, x) : cariLMS('who07', 'hfa', sex, x, 1.2)),
  imt: (sex, x) => (x <= 60 ? cariLMS('who06', 'bmifa', sex, x) : cariLMS('who07', 'bmifa', sex, x, 1.2)),
  lk: (sex, x) => (x <= 60 ? cariLMS('who06', 'hcfa', sex, x) : null),
  bbtb: (sex, x, bulan) => (bulan < 24 ? cariLMS('who06', 'wfl', sex, x) : cariLMS('who06', 'wfh', sex, x)),
};

// Menyusun titik-titik garis SD (−3…+3) plus posisi anak, siap digambar SVG.
export function dataKurva(jenis, sex, bulan, nilaiAnak) {
  const ambil = AMBIL[jenis];
  if (!ambil) return null;

  let xMin;
  let xMax;
  if (jenis === 'bbtb') {
    const pakaiPanjang = bulan < 24;
    xMin = pakaiPanjang ? 45 : 65;
    xMax = pakaiPanjang ? 110 : 120;
  } else {
    xMin = 0;
    xMax = jenis === 'lk' ? 60 : jenis === 'bbu' ? (bulan <= 60 ? 60 : 120) : bulan <= 60 ? 60 : 228;
  }

  const langkah = (xMax - xMin) / 120;
  const xs = [];
  for (let x = xMin; x <= xMax + 1e-9; x += langkah) xs.push(x);

  const SD = [-3, -2, 0, 2, 3];
  const garis = SD.map((n) => ({
    sd: n,
    titik: xs.map((x) => {
      const lms = ambil(sex, x, bulan);
      return lms ? { x, y: nilaiPadaSD(lms.L, lms.M, lms.S, n) } : null;
    }).filter(Boolean),
  })).filter((g) => g.titik.length > 1);

  if (!garis.length) return null;
  const xAnak = jenis === 'bbtb' ? nilaiAnak?.x : bulan;
  return { garis, xMin, xMax, anak: ada(xAnak) && ada(nilaiAnak?.y) ? { x: xAnak, y: nilaiAnak.y } : null };
}
