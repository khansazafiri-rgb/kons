import pb from '@/lib/pocketbaseClient';

// BAB dipakai oleh DUA hal yang berbeda dan tidak boleh saling bocor:
//
// - kind "latihan" -> BAB Cicil Belajar & Perdalam Materi. Milik mata kuliah,
//   berlaku untuk semua siswa. BAB lama (sebelum ada field kind) nilainya masih
//   kosong dan tetap dibaca sebagai latihan, jadi data lama aman.
// - kind "cbt"     -> BAB Simulasi CBT. Selain milik mata kuliah, dia juga
//   milik SATU universitas, karena soal simulasi tiap kampus beda.
//
// Semua tempat yang membaca BAB harus lewat helper di sini supaya filternya
// seragam - kalau tidak, BAB Simulasi ikut muncul di daftar Cicil Belajar.

export const KIND_LATIHAN = 'latihan';
export const KIND_CBT = 'cbt';

// Nilai `university` kosong = BAB dipakai bersama semua universitas. Dipakai
// juga sebagai jaring pengaman untuk siswa yang asalKuliah-nya belum diisi.
export const UNIV_SEMUA = '';
export const LABEL_UNIV_SEMUA = 'Semua Universitas';

export const labelUniversitas = (u) => (u && u.trim() ? u : LABEL_UNIV_SEMUA);

// Di dropdown, string kosong sudah dipakai untuk "belum memilih", jadi pilihan
// "Semua Universitas" butuh nilai penanda sendiri yang diterjemahkan balik ke
// string kosong sebelum disimpan.
export const OPSI_UNIV_SEMUA = '__semua__';
export const univKeDb = (nilai) => (nilai === OPSI_UNIV_SEMUA ? '' : nilai);
export const univKeOpsi = (db) => (db && db.trim() ? db : OPSI_UNIV_SEMUA);

// BAB latihan: yang kind-nya "latihan" ATAU masih kosong (data lama).
export const filterLatihan = () => `(kind = '' || kind = '${KIND_LATIHAN}')`;

// BAB simulasi milik satu universitas tertentu (kosong = semua universitas).
export const filterCbt = (university) =>
  pb.filter('kind = {:kind} && university = {:univ}', {
    kind: KIND_CBT,
    univ: university || '',
  });

// Yang boleh DILIHAT siswa: BAB khusus kampusnya + BAB milik semua universitas.
export const filterCbtUntukSiswa = (asalKuliah) => {
  const univ = String(asalKuliah || '').trim();
  if (!univ) return pb.filter('kind = {:kind} && university = {:kosong}', { kind: KIND_CBT, kosong: '' });
  return pb.filter('kind = {:kind} && (university = {:univ} || university = {:kosong})', {
    kind: KIND_CBT,
    univ,
    kosong: '',
  });
};

// Gabungkan beberapa potongan filter dengan &&, buang yang kosong.
export const gabung = (...bagian) => bagian.filter(Boolean).join(' && ');
