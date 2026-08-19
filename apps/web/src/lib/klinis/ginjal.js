import { ada, ang } from './format';

// KLIRENS KREATININ & eGFR
//
// Dua angka yang sering dikira sama padahal dipakai untuk hal berbeda:
//   - Cockcroft-Gault  -> mL/menit, TIDAK dinormalisasi ke luas tubuh.
//                         Ini yang dipakai label kebanyakan obat untuk
//                         penyesuaian dosis.
//   - CKD-EPI / MDRD   -> mL/menit/1,73 m², sudah dinormalisasi.
//                         Ini yang dipakai untuk stadium PGK (KDIGO).
// Menukar keduanya pada pasien yang jauh dari ukuran tubuh rata-rata adalah
// sumber kesalahan dosis antibiotik yang paling sering, jadi keduanya selalu
// ditampilkan berdampingan lengkap dengan satuannya.

// Kreatinin: lab Indonesia umumnya mg/dL, sebagian memakai µmol/L.
export const keMgDl = (v, satuan) => (satuan === 'umol' ? v / 88.4 : v);

export const bsaMosteller = (tinggi, berat) => Math.sqrt((tinggi * berat) / 3600);

// Berat badan ideal Devine - rumusnya dalam inci, jadi tinggi dikonversi dulu.
export function ibwDevine(sex, tinggiCm) {
  const inci = tinggiCm / 2.54;
  const dasar = sex === 1 ? 50 : 45.5;
  return inci <= 60 ? dasar : dasar + 2.3 * (inci - 60);
}

export function stadiumPGK(g) {
  if (g >= 90) return { kode: 'G1', teks: 'Normal / tinggi', tone: 'ok' };
  if (g >= 60) return { kode: 'G2', teks: 'Penurunan ringan', tone: 'ok' };
  if (g >= 45) return { kode: 'G3a', teks: 'Ringan–sedang', tone: 'warn' };
  if (g >= 30) return { kode: 'G3b', teks: 'Sedang–berat', tone: 'warn' };
  if (g >= 15) return { kode: 'G4', teks: 'Berat', tone: 'bad' };
  return { kode: 'G5', teks: 'Gagal ginjal', tone: 'bad' };
}

export const PILIHAN_BERAT = [
  { id: 'auto', label: 'Otomatis (dianjurkan)' },
  { id: 'abw', label: 'Berat aktual (ABW)' },
  { id: 'ibw', label: 'Berat ideal (IBW)' },
  { id: 'adj', label: 'Berat terkoreksi (AdjBW)' },
  { id: 'lbw', label: 'Lean body weight (LBW)' },
];

// Memilih berat badan mana yang masuk ke rumus Cockcroft-Gault.
// Pilihan ini berpengaruh besar - pada pasien obes selisihnya bisa > 50
// mL/menit - jadi alasannya selalu ikut dikembalikan untuk ditampilkan.
function pilihBerat(mode, { bw, ibw, adj, lbw, bmi }) {
  if (mode === 'abw') return { nilai: bw, nama: 'Berat aktual' };
  if (mode === 'ibw') return ibw === null ? null : { nilai: ibw, nama: 'Berat ideal' };
  if (mode === 'adj') return adj === null ? null : { nilai: adj, nama: 'Berat terkoreksi' };
  if (mode === 'lbw') return lbw === null ? null : { nilai: lbw, nama: 'Lean body weight' };

  if (ibw === null) {
    return { nilai: bw, nama: 'Berat aktual', alasan: 'tinggi badan tidak diisi sehingga berat ideal tidak bisa dihitung' };
  }
  if (bw < ibw) {
    return {
      nilai: bw,
      nama: 'Berat aktual',
      alasan: 'berat aktual di bawah berat ideal — dipakai yang lebih rendah agar dosis tidak berlebih',
    };
  }
  if (bmi >= 30 || bw > 1.2 * ibw) {
    return {
      nilai: adj,
      nama: 'Berat terkoreksi (AdjBW)',
      alasan: `berat aktual ${ang((bw / ibw) * 100, 0)}% dari berat ideal${ada(bmi) ? ` (IMT ${ang(bmi, 1)})` : ''} — masuk kategori obesitas`,
    };
  }
  return { nilai: ibw, nama: 'Berat ideal (IBW)', alasan: 'berat aktual dalam 20% berat ideal — konvensi memakai berat ideal' };
}

export function hitungGinjalDewasa(inp) {
  const { sex, usia, berat, tinggi, kreatinin, satuanKreatinin, modeBerat } = inp;
  const scr = ada(kreatinin) ? keMgDl(kreatinin, satuanKreatinin) : null;
  if (!ada(usia) || !ada(scr) || !ada(berat)) {
    return { error: 'Usia, kreatinin serum, dan berat badan wajib diisi.' };
  }
  if (scr <= 0) return { error: 'Kreatinin serum harus lebih besar dari 0.' };

  const ibw = ada(tinggi) ? ibwDevine(sex, tinggi) : null;
  const adj = ibw !== null ? ibw + 0.4 * (berat - ibw) : null;
  const bmi = ada(tinggi) ? berat / Math.pow(tinggi / 100, 2) : null;
  const lbw =
    bmi !== null
      ? sex === 1
        ? (9270 * berat) / (6680 + 216 * bmi)
        : (9270 * berat) / (8780 + 244 * bmi)
      : null;

  const dipilih = pilihBerat(modeBerat, { bw: berat, ibw, adj, lbw, bmi });
  if (!dipilih) return { error: 'Isi tinggi badan dulu untuk memakai pilihan berat tersebut.' };

  const cg = (((140 - usia) * dipilih.nilai) / (72 * scr)) * (sex === 2 ? 0.85 : 1);

  // CKD-EPI 2021: versi tanpa koefisien ras, yang kini jadi anjuran.
  const kappa = sex === 2 ? 0.7 : 0.9;
  const alfa = sex === 2 ? -0.241 : -0.302;
  const epi =
    142 *
    Math.pow(Math.min(scr / kappa, 1), alfa) *
    Math.pow(Math.max(scr / kappa, 1), -1.2) *
    Math.pow(0.9938, usia) *
    (sex === 2 ? 1.012 : 1);
  const mdrd = 175 * Math.pow(scr, -1.154) * Math.pow(usia, -0.203) * (sex === 2 ? 0.742 : 1);

  const bsa = ada(tinggi) ? bsaMosteller(tinggi, berat) : null;
  const cgNorm = bsa ? (cg * 1.73) / bsa : null;
  const epiAbs = bsa ? (epi * bsa) / 1.73 : null;
  const st = stadiumPGK(epi);

  const cgDengan = (w) => (((140 - usia) * w) / (72 * scr)) * (sex === 2 ? 0.85 : 1);

  const langkah = [
    `Kreatinin serum = ${ang(scr, 2)} mg/dL${satuanKreatinin === 'umol' ? ` (dari ${ang(kreatinin, 0)} µmol/L ÷ 88,4)` : ''}`,
    ibw !== null
      ? `IBW Devine      = ${sex === 1 ? '50' : '45,5'} + 2,3 × (${ang(tinggi / 2.54, 1)} inci − 60) = ${ang(ibw, 1)} kg`
      : 'IBW             = tinggi badan tidak diisi',
    adj !== null ? `AdjBW           = ${ang(ibw, 1)} + 0,4 × (${ang(berat, 1)} − ${ang(ibw, 1)}) = ${ang(adj, 1)} kg` : '',
    `Berat dipakai   = ${ang(dipilih.nilai, 1)} kg (${dipilih.nama})`,
    `Cockcroft-Gault = (140 − ${ang(usia, 0)}) × ${ang(dipilih.nilai, 1)} ÷ (72 × ${ang(scr, 2)})${sex === 2 ? ' × 0,85' : ''} = ${ang(cg, 1)} mL/menit`,
    `CKD-EPI 2021    = 142 × min(${ang(scr, 2)}/${kappa};1)^${alfa} × max(${ang(scr, 2)}/${kappa};1)^−1,200 × 0,9938^${ang(usia, 0)}${sex === 2 ? ' × 1,012' : ''}`,
    `                = ${ang(epi, 1)} mL/menit/1,73 m²`,
    bsa ? `BSA (Mosteller) = √(${ang(tinggi, 1)} × ${ang(berat, 1)} ÷ 3600) = ${ang(bsa, 2)} m²` : '',
  ].filter(Boolean);

  const catatan = [];
  if (dipilih.alasan) {
    catatan.push({ tone: 'accent', isi: `Pilihan berat otomatis: ${dipilih.alasan}.` });
  }
  const selisih = Math.abs(cg - epi);
  if (bsa && selisih > 15) {
    catatan.push({
      tone: 'warn',
      isi: `Selisih ${ang(selisih, 0)} mL/menit antara Cockcroft-Gault dan CKD-EPI. Untuk penyesuaian dosis obat ikuti yang dipakai label obatnya (mayoritas label lama memakai Cockcroft-Gault, mL/menit tanpa normalisasi); untuk stadium PGK pakai CKD-EPI.`,
    });
  }
  if (usia < 18) {
    catatan.push({
      tone: 'bad',
      isi: 'Usia di bawah 18 tahun — Cockcroft-Gault dan CKD-EPI tidak divalidasi untuk anak. Gunakan mode Anak (Schwartz).',
    });
  }
  if (scr < 0.6) {
    catatan.push({
      tone: 'warn',
      isi: `Kreatinin ${ang(scr, 2)} mg/dL sangat rendah. Pada massa otot kecil, sarkopenia, sirosis, atau amputasi, kreatinin melebih-lebihkan fungsi ginjal. Pertimbangkan cystatin C atau klirens urin 24 jam.`,
    });
  }
  if (scr > 1.5) {
    catatan.push({
      tone: 'info',
      isi: 'Semua rumus estimasi mengasumsikan kreatinin dalam kondisi steady state. Pada AKI yang sedang berubah cepat, nilai ini tidak dapat dipakai.',
    });
  }

  return {
    utama: ang(cg, 1),
    satuan: 'mL/menit',
    judul: `Cockcroft-Gault · ${dipilih.nama} ${ang(dipilih.nilai, 1)} kg`,
    kategori: { teks: `${st.kode} · ${st.teks}`, tone: st.tone },
    baris: [
      { k: 'CKD-EPI 2021 (eGFR)', v: `${ang(epi, 1)} mL/mnt/1,73m²` },
      { k: 'Stadium PGK (KDIGO)', v: `${st.kode} · ${st.teks}`, tone: st.tone, tag: '' },
      { k: 'MDRD-4 (IDMS)', v: `${ang(mdrd, 1)} mL/mnt/1,73m²` },
      ...(bsa
        ? [
            { k: 'Luas permukaan tubuh', v: `${ang(bsa, 2)} m²` },
            { k: 'Cockcroft-Gault dinormalisasi 1,73 m²', v: `${ang(cgNorm, 1)}` },
            { k: 'CKD-EPI absolut', v: `${ang(epiAbs, 1)} mL/menit` },
          ]
        : []),
      ...(bmi ? [{ k: 'IMT', v: `${ang(bmi, 1)} kg/m²` }] : []),
    ],
    catatan,
    langkah,
    // Perbandingan berat: memperlihatkan langsung betapa besar pengaruh
    // pilihan berat badan terhadap angka yang dipakai untuk dosis.
    tabelBerat: [
      { nama: 'Berat aktual (ABW)', nilai: `${ang(berat, 1)} kg`, cg: ang(cgDengan(berat), 1) },
      ...(ibw !== null
        ? [
            { nama: 'Berat ideal (Devine)', nilai: `${ang(ibw, 1)} kg`, cg: ang(cgDengan(ibw), 1) },
            { nama: 'Berat terkoreksi (0,4)', nilai: `${ang(adj, 1)} kg`, cg: ang(cgDengan(adj), 1) },
            { nama: 'Lean body weight', nilai: `${ang(lbw, 1)} kg`, cg: ang(cgDengan(lbw), 1) },
          ]
        : []),
    ],
    ringkas: [
      ['Cockcroft-Gault', `${ang(cg, 1)} mL/menit`],
      ['Berat dipakai', `${ang(dipilih.nilai, 1)} kg (${dipilih.nama})`],
      ['CKD-EPI 2021', `${ang(epi, 1)} mL/mnt/1,73m²`],
      ['Stadium', `${st.kode} — ${st.teks}`],
    ],
  };
}

export function hitungGinjalAnak(inp) {
  const { sex, usia, tinggi, kreatinin, satuanKreatinin } = inp;
  const scr = ada(kreatinin) ? keMgDl(kreatinin, satuanKreatinin) : null;
  if (!ada(tinggi) || !ada(scr) || scr <= 0) {
    return { error: 'Tinggi badan dan kreatinin serum wajib diisi.' };
  }

  const bedside = (0.413 * tinggi) / scr;

  // Schwartz "klasik" memakai konstanta k yang berbeda menurut umur & jenis
  // kelamin, karena massa otot per cm tinggi berubah seiring pertumbuhan.
  let k;
  let kdesc;
  if (!ada(usia)) {
    k = 0.55;
    kdesc = 'anak 1–13 tahun (bawaan)';
  } else if (usia < 1) {
    k = 0.45;
    kdesc = 'bayi cukup bulan < 1 tahun';
  } else if (usia < 13) {
    k = 0.55;
    kdesc = 'anak 1–13 tahun';
  } else {
    k = sex === 1 ? 0.7 : 0.55;
    kdesc = sex === 1 ? 'remaja laki-laki' : 'remaja perempuan';
  }
  const klasik = (k * tinggi) / scr;
  const st = stadiumPGK(bedside);

  const catatan = [
    {
      tone: 'info',
      isi: 'Rumus bedside 0,413 hanya valid untuk kreatinin yang terstandardisasi IDMS (metode enzimatik). Kalau lab masih memakai Jaffe non-kompensasi, hasilnya akan overestimasi.',
    },
  ];
  if (ada(usia) && usia < 1) {
    catatan.unshift({
      tone: 'warn',
      isi: 'Pada bayi di bawah 1 tahun, GFR memang fisiologis rendah dan baru mencapai nilai dewasa (dinormalisasi) sekitar usia 2 tahun. Jangan tafsirkan angka rendah sebagai penyakit ginjal tanpa konteks.',
    });
  }
  if (ada(usia) && usia > 18) {
    catatan.unshift({ tone: 'warn', isi: 'Usia di atas 18 tahun — gunakan mode Dewasa.' });
  }

  return {
    utama: ang(bedside, 1),
    satuan: 'mL/mnt/1,73m²',
    judul: 'Schwartz bedside 2009 (k = 0,413)',
    kategori: { teks: `${st.kode} · ${st.teks}`, tone: st.tone },
    baris: [
      { k: 'Stadium PGK (KDIGO)', v: `${st.kode} · ${st.teks}`, tone: st.tone },
      { k: `Schwartz klasik (k = ${String(k).replace('.', ',')})`, v: ang(klasik, 1) },
      { k: 'Konstanta k dipilih', v: kdesc },
    ],
    catatan,
    langkah: [
      'Schwartz bedside: eGFR = 0,413 × TB(cm) ÷ SCr(mg/dL)',
      `                       = 0,413 × ${ang(tinggi, 1)} ÷ ${ang(scr, 2)}`,
      `                       = ${ang(bedside, 1)} mL/menit/1,73 m²`,
      `Schwartz klasik (k = ${String(k).replace('.', ',')}, ${kdesc}): ${String(k).replace('.', ',')} × ${ang(tinggi, 1)} ÷ ${ang(scr, 2)} = ${ang(klasik, 1)}`,
    ],
    ringkas: [
      ['Schwartz bedside', `${ang(bedside, 1)} mL/mnt/1,73m²`],
      [`Schwartz klasik k=${String(k).replace('.', ',')}`, ang(klasik, 1)],
      ['Stadium', `${st.kode} — ${st.teks}`],
    ],
  };
}

export function hitungGinjalUrin(inp) {
  const { sex, kreatininUrin, volume, durasi, berat, tinggi, kreatinin, satuanKreatinin } = inp;
  const scr = ada(kreatinin) ? keMgDl(kreatinin, satuanKreatinin) : null;
  const jam = ada(durasi) ? durasi : 24;
  if (!ada(kreatininUrin) || !ada(volume) || !ada(scr) || scr <= 0) {
    return { error: 'Kreatinin urin, volume urin, dan kreatinin serum wajib diisi.' };
  }

  const menit = jam * 60;
  const crcl = (kreatininUrin * volume) / (scr * menit);
  const bsa = ada(tinggi) && ada(berat) ? bsaMosteller(tinggi, berat) : null;
  const norm = bsa ? (crcl * 1.73) / bsa : null;
  const st = stadiumPGK(norm ?? crcl);

  // Ekskresi kreatinin 24 jam adalah pemeriksa kelengkapan tampungan: kalau
  // jauh di bawah rentang yang diharapkan, kemungkinan besar ada urin yang
  // terbuang, bukan ginjalnya yang buruk.
  const ekskresi24 = ((kreatininUrin * volume) / 100) * (24 / jam);
  const perKg = ada(berat) ? ekskresi24 / berat : null;
  const hLo = sex === 1 ? 20 : 15;
  const hHi = sex === 1 ? 25 : 20;

  const catatan = [];
  if (perKg !== null) {
    const kurang = perKg < hLo;
    const lebih = perKg > hHi;
    catatan.push({
      tone: kurang ? 'warn' : lebih ? 'warn' : 'ok',
      isi: kurang
        ? `Ekskresi kreatinin ${ang(perKg, 1)} mg/kg/24 jam, di bawah rentang harapan ${hLo}–${hHi} mg/kg. Tampungan urin kemungkinan TIDAK LENGKAP — ada berkemih yang tidak ikut tertampung, sehingga klirens jadi terlalu rendah. Ulangi penampungan sebelum menyimpulkan.`
        : lebih
        ? `Ekskresi kreatinin ${ang(perKg, 1)} mg/kg/24 jam, di atas rentang harapan ${hLo}–${hHi} mg/kg. Bisa karena massa otot besar, atau ada urin di luar periode penampungan yang ikut tertampung.`
        : `Ekskresi kreatinin ${ang(perKg, 1)} mg/kg/24 jam, sesuai rentang harapan ${hLo}–${hHi} mg/kg — tampungan tampak lengkap.`,
    });
  } else {
    catatan.push({
      tone: 'info',
      isi: 'Isi berat badan untuk menilai kelengkapan tampungan urin lewat ekskresi kreatinin per kg.',
    });
  }
  catatan.push({
    tone: 'info',
    isi: 'Klirens kreatinin urin melebih-lebihkan GFR sekitar 10–20% karena sebagian kreatinin disekresi tubulus, dan selisih itu makin besar pada gagal ginjal lanjut.',
  });

  return {
    utama: ang(crcl, 1),
    satuan: 'mL/menit',
    judul: `Klirens kreatinin urin ${ang(jam, 0)} jam`,
    kategori: { teks: `${st.kode} · ${st.teks}`, tone: st.tone },
    baris: [
      ...(norm !== null ? [{ k: 'Dinormalisasi 1,73 m²', v: `${ang(norm, 1)} mL/mnt/1,73m²` }] : []),
      { k: 'Stadium PGK (KDIGO)', v: `${st.kode} · ${st.teks}`, tone: st.tone },
      ...(bsa ? [{ k: 'Luas permukaan tubuh', v: `${ang(bsa, 2)} m²` }] : []),
      { k: 'Ekskresi kreatinin 24 jam', v: `${ang(ekskresi24, 0)} mg` },
      ...(perKg !== null ? [{ k: 'Per kg berat badan', v: `${ang(perKg, 1)} mg/kg/24 jam` }] : []),
    ],
    catatan,
    langkah: [
      'CrCl = (kreatinin urin × volume urin) ÷ (kreatinin serum × waktu dalam menit)',
      `     = (${ang(kreatininUrin, 1)} × ${ang(volume, 0)}) ÷ (${ang(scr, 2)} × ${ang(menit, 0)})`,
      `     = ${ang(crcl, 1)} mL/menit`,
      bsa ? `Dinormalisasi = ${ang(crcl, 1)} × 1,73 ÷ ${ang(bsa, 2)} = ${ang(norm, 1)} mL/mnt/1,73 m²` : '',
      `Ekskresi 24 jam = ${ang(kreatininUrin, 1)} mg/dL × ${ang(volume, 0)} mL ÷ 100 × (24 ÷ ${ang(jam, 0)}) = ${ang(ekskresi24, 0)} mg`,
    ].filter(Boolean),
    ringkas: [
      ['Klirens kreatinin urin', `${ang(crcl, 1)} mL/menit`],
      ...(norm !== null ? [['Dinormalisasi 1,73 m²', `${ang(norm, 1)}`]] : []),
      ['Stadium', `${st.kode} — ${st.teks}`],
    ],
  };
}
