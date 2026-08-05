import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

// Simpan pilihan yang sedang aktif (tab dashboard, mata kuliah, BAB, dsb) di
// alamat halaman, bukan cuma di memori komponen.
//
// Sebelumnya semua pilihan itu hilang begitu halaman di-refresh: admin yang
// sedang di tab "Edit Soal" balik lagi ke "Pengajar", siswa yang sedang membuka
// satu BAB balik ke daftar mata kuliah. Dengan disimpan di query string
// (?tab=Edit+Soal&mk=...&bab=...), refresh mempertahankan posisi, tombol back
// browser bekerja seperti yang diharapkan, dan alamatnya bisa dibagikan.
//
// Dipakai persis seperti useState:
//   const [tab, setTab] = useUrlState('tab', 'Pengajar');
//
// Nilai yang sama dengan `awal` tidak ditulis ke URL supaya alamatnya tetap
// bersih, dan penulisannya memakai replace supaya riwayat browser tidak penuh
// oleh tiap klik.
// Dua pemanggilan set dalam SATU penanganan klik (mis. "ganti mata kuliah, lalu
// kosongkan BAB") sama-sama membaca alamat yang sama, karena alamat baru belum
// sempat terpasang di antara keduanya. Tanpa penampung di bawah ini, tulisan
// kedua menimpa tulisan pertama dan pilihan mata kuliahnya hilang lagi.
// Penampung ini menyimpan hasil tulisan terakhir beserta alamat dasarnya,
// supaya tulisan berikutnya di tik yang sama menumpuk, bukan menimpa.
let antrian = { dasar: null, hasil: null };

export default function useUrlState(kunci, awal = '') {
  const [params, setParams] = useSearchParams();
  const nilai = params.get(kunci) ?? awal;
  const sekarang = params.toString();

  const set = useCallback(
    (berikutnya) => {
      const dasar =
        antrian.dasar === sekarang && antrian.hasil
          ? new URLSearchParams(antrian.hasil)
          : new URLSearchParams(sekarang);

      const v = typeof berikutnya === 'function' ? berikutnya(dasar.get(kunci) ?? awal) : berikutnya;
      if (v === '' || v === null || v === undefined || v === awal) dasar.delete(kunci);
      else dasar.set(kunci, String(v));

      antrian = { dasar: sekarang, hasil: dasar.toString() };
      setParams(dasar, { replace: true });
    },
    [kunci, awal, sekarang, setParams],
  );

  return [nilai, set];
}
