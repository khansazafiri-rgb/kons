import { ada, ang } from './format';

// OSMOLALITAS SERUM & OSMOLAL GAP
//
// Tiga hal berbeda yang sering tertukar:
//   - osmolalitas TERHITUNG : diperkirakan dari elektrolit lewat rumus
//   - osmolalitas TERUKUR   : hasil osmometer di lab
//   - osmolalitas EFEKTIF   : hanya zat yang benar-benar menarik air melewati
//                             membran sel (tonisitas). Ureum bebas menembus
//                             membran sehingga TIDAK ikut dihitung, walau dia
//                             menaikkan osmolalitas total.
//
// Selisih terukur - terhitung = osmolal gap, penanda adanya zat terlarut yang
// tidak diperiksa (alkohol toksik, manitol, dan seterusnya).

export const RUMUS_OSM = [
  { id: 'std', label: '2×Na + Glu/18 + BUN/2,8', teks: '2 × Na + Glu/18 + BUN/2,8' },
  { id: 'k', label: '2×(Na+K) + …', teks: '2 × (Na + K) + Glu/18 + BUN/2,8' },
  { id: 'bhagat', label: '1,86×Na + … + 9', teks: '1,86 × Na + Glu/18 + BUN/2,8 + 9' },
];

// Lab di Indonesia hampir selalu melaporkan UREUM, sementara rumus-rumus di
// atas memakai BUN (nitrogen-nya saja). Faktor 2,144 adalah perbandingan massa
// molekul urea terhadap dua atom nitrogennya - salah pilih satuan di sini
// menggeser hasil 3-4 mOsm/kg, cukup untuk mengubah kesimpulan soal gap.
export function normalUreum(nilai, satuan) {
  if (!ada(nilai)) return { bun: null, ureumMg: null };
  if (satuan === 'bun') return { bun: nilai, ureumMg: nilai * 2.144 };
  if (satuan === 'ureum') return { bun: nilai / 2.144, ureumMg: nilai };
  return { bun: nilai * 2.8, ureumMg: nilai * 6.006 }; // mmol/L
}

export function normalGlukosa(nilai, satuan) {
  if (!ada(nilai)) return { mgdl: null, mmol: null };
  return satuan === 'mgdl'
    ? { mgdl: nilai, mmol: nilai / 18.016 }
    : { mgdl: nilai * 18.016, mmol: nilai };
}

function kategoriOsm(osm) {
  if (osm < 275) return { teks: 'Hipoosmolar', tone: 'warn' };
  if (osm <= 295) return { teks: 'Normoosmolar', tone: 'ok' };
  if (osm <= 320) return { teks: 'Hiperosmolar ringan', tone: 'warn' };
  return { teks: 'Hiperosmolar berat', tone: 'bad' };
}

export function hitungOsmolalitas(inp) {
  const { na, k, glukosa, ureum, etanol, terukur, protein, rumus, sertakanEtanol } = inp;
  if (!ada(na)) return { error: 'Natrium wajib diisi.' };

  const gTerm = ada(glukosa.mgdl) ? glukosa.mgdl / 18 : 0;
  const uTerm = ada(ureum.bun) ? ureum.bun / 2.8 : 0;
  const eTerm = sertakanEtanol && ada(etanol) ? etanol / 3.7 : 0;

  let dasar;
  if (rumus === 'std') dasar = 2 * na + gTerm + uTerm;
  else if (rumus === 'k') dasar = 2 * (na + (ada(k) ? k : 0)) + gTerm + uTerm;
  else dasar = 1.86 * na + gTerm + uTerm + 9;

  const terhitung = dasar + eTerm;
  const efektif = 2 * na + gTerm; // tonisitas - ureum sengaja tidak ikut
  const gap = ada(terukur) ? terukur - terhitung : null;
  const info = RUMUS_OSM.find((r) => r.id === rumus);

  const langkah = [
    `Rumus     : ${info.teks}${eTerm ? ' + EtOH/3,7' : ''}`,
    `Na        = ${ang(na, 1)} mEq/L`,
    ada(glukosa.mgdl)
      ? `Glukosa   = ${ang(glukosa.mgdl, 0)} mg/dL (${ang(glukosa.mmol, 1)} mmol/L) → ${ang(gTerm, 1)} mOsm/kg`
      : 'Glukosa   = tidak diisi → dianggap 0',
    ada(ureum.bun)
      ? `Ureum     = ${ang(ureum.ureumMg, 1)} mg/dL ≙ BUN ${ang(ureum.bun, 1)} mg/dL → ${ang(uTerm, 1)} mOsm/kg`
      : 'Ureum     = tidak diisi → dianggap 0',
    eTerm ? `Etanol    = ${ang(etanol, 0)} mg/dL → ${ang(eTerm, 1)} mOsm/kg` : '',
    `Terhitung = ${ang(terhitung, 1)} mOsm/kg`,
    `Efektif   = 2×${ang(na, 1)} + ${ang(gTerm, 1)} = ${ang(efektif, 1)} mOsm/kg (ureum diabaikan)`,
    gap !== null ? `Osmolal gap = ${ang(terukur, 0)} − ${ang(terhitung, 1)} = ${ang(gap, 1)} mOsm/kg` : '',
  ].filter(Boolean);

  const catatan = [];
  const belum = [];
  if (!ada(glukosa.mgdl)) belum.push('glukosa');
  if (!ada(ureum.bun)) belum.push('ureum/BUN');
  if (belum.length) {
    catatan.push({
      tone: 'warn',
      isi: `Nilai ${belum.join(' dan ')} belum diisi dan dihitung sebagai 0, sehingga osmolalitas terhitung jadi lebih rendah dari sebenarnya (pada nilai normal glukosa menyumbang ±5 dan ureum ±5 mOsm/kg). Jangan menilai osmolal gap dengan input yang tidak lengkap.`,
    });
  }

  if (gap !== null && gap > 10) {
    catatan.push({
      tone: gap > 14 ? 'bad' : 'warn',
      isi: `Osmolal gap ${ang(gap, 1)} mOsm/kg. Pertimbangkan osmol tak terukur: alkohol toksik (metanol, etilen glikol, isopropanol), propilen glikol (pelarut lorazepam/fenitoin IV), manitol, gliserol, sorbitol/glisin (irigasi TURP), maltosa (IVIG), aseton pada ketoasidosis, atau pseudohiponatremia karena hiperproteinemia/hipertrigliseridemia berat.`,
    });
  } else if (gap !== null) {
    catatan.push({
      tone: 'accent',
      isi: 'Osmolal gap dalam rentang normal (< 10 mOsm/kg). Gap normal tidak menyingkirkan keracunan alkohol toksik pada presentasi lambat, saat alkohol induknya sudah dimetabolisme jadi asam organik — periksa anion gap.',
    });
  } else {
    catatan.push({ tone: 'info', isi: 'Isi osmolalitas terukur dari osmometer untuk mendapatkan osmolal gap.' });
  }

  if (efektif > 320) {
    catatan.push({
      tone: 'bad',
      isi: 'Osmolalitas efektif > 320 mOsm/kg — memenuhi kriteria hiperglikemia hiperosmolar (HHS) bila disertai hiperglikemia berat dan penurunan kesadaran.',
    });
  }

  // Turunan klinis: hal-hal yang biasanya dihitung menyusul begitu angka
  // osmolalitas keluar, supaya tidak perlu pindah kalkulator.
  const turunan = [];
  if (ada(glukosa.mgdl) && glukosa.mgdl > 100) {
    const katz = na + (1.6 * (glukosa.mgdl - 100)) / 100;
    const hillier = na + (2.4 * (glukosa.mgdl - 100)) / 100;
    turunan.push({
      nama: 'Natrium terkoreksi (hiperglikemia)',
      nilai: ang(katz, 1),
      satuan: 'mEq/L',
      tone: 'info',
      rinci: [
        `Katz (faktor 1,6): ${ang(katz, 1)} mEq/L · Hillier (faktor 2,4): ${ang(hillier, 1)} mEq/L`,
        `Na terukur ${ang(na, 1)} mEq/L pada glukosa ${ang(glukosa.mgdl, 0)} mg/dL. Faktor 2,4 lebih akurat saat glukosa > 400 mg/dL.`,
      ],
    });
  }
  if (na > 145) {
    turunan.push({
      nama: 'Defisit air bebas (hipernatremia)',
      nilai: ang(6 * (na / 140 - 1), 2),
      satuan: 'L per 10 kg BB',
      tone: 'warn',
      rinci: [
        'Defisit ≈ TBW × (Na/140 − 1), dengan TBW 60% berat badan pada laki-laki dewasa.',
        `Contoh berat 60 kg → TBW 36 L → defisit ≈ ${ang(36 * (na / 140 - 1), 2)} L. Koreksi maksimal 10–12 mEq/L per 24 jam.`,
      ],
    });
  }
  if (na < 135) {
    const berat = na < 125 ? ['bad', 'Berat'] : na < 130 ? ['warn', 'Sedang'] : ['warn', 'Ringan'];
    turunan.push({
      nama: 'Hiponatremia',
      nilai: berat[1],
      satuan: '',
      tone: berat[0],
      rinci: [
        `Langkah baku: (1) tentukan osmolalitas serum → ${ang(terhitung, 1)} mOsm/kg (${terhitung < 275 ? 'hipotonik — hiponatremia sejati' : 'tidak hipotonik — curigai pseudohiponatremia atau translokasional'}), (2) nilai status volume, (3) periksa natrium & osmolalitas urin.`,
        ada(protein) && protein > 9 ? `Protein total ${ang(protein, 1)} g/dL tinggi — pseudohiponatremia mungkin.` : '',
      ].filter(Boolean),
    });
  }

  const kat = kategoriOsm(terhitung);
  const baris = [
    { k: 'Osmolalitas efektif (tonisitas)', v: `${ang(efektif, 1)} mOsm/kg` },
    ada(k) && rumus !== 'k' ? { k: 'Bila kalium disertakan', v: `${ang(terhitung + 2 * k, 1)} mOsm/kg` } : null,
    gap !== null ? { k: 'Osmolalitas terukur', v: `${ang(terukur, 0)} mOsm/kg` } : null,
    gap !== null
      ? {
          k: 'Osmolal gap',
          v: `${ang(gap, 1)} mOsm/kg`,
          tone: gap > 14 ? 'bad' : gap > 10 ? 'warn' : 'ok',
          tag: gap > 14 ? 'Melebar bermakna' : gap > 10 ? 'Batas atas' : 'Normal',
        }
      : null,
  ].filter(Boolean);

  return {
    utama: ang(terhitung, 1),
    satuan: 'mOsm/kg H₂O',
    judul: 'Osmolalitas serum terhitung',
    kategori: kat,
    baris,
    catatan,
    turunan,
    langkah,
    ringkas: [
      ['Osmolalitas terhitung', `${ang(terhitung, 1)} mOsm/kg`],
      ['Osmolalitas efektif', `${ang(efektif, 1)} mOsm/kg`],
      ...(gap !== null ? [['Osmolal gap', `${ang(gap, 1)} mOsm/kg`]] : []),
      ['Rumus', info.teks],
      ['Interpretasi', kat.teks],
    ],
  };
}
