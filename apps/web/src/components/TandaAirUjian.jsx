import React, { useEffect, useMemo, useState } from 'react';

// TANDA AIR IDENTITAS DI LAYAR UJIAN
//
// UNTUK APA
//
// Yang paling sering bocor dari ujian bukan berkas, melainkan FOTO LAYAR yang
// diambil pakai HP - dan itu tidak bisa dicegah oleh Safe Exam Browser, sekeras
// apa pun penguncian aplikasinya. SEB memang memblokir tangkapan layar bawaan
// sistem, tapi kamera di tangan orang lain berada di luar jangkauannya.
//
// Karena tidak bisa dicegah, yang masuk akal adalah membuatnya BISA DILACAK:
// nama, email, dan kode pendaftaran orang yang sedang membuka soal itu tercetak
// menyilang di seluruh layar. Kalau fotonya beredar, yang menyebarkannya ikut
// beredar bersamanya.
//
// KENAPA MIRING DAN BERULANG, BUKAN SATU DI TENGAH
//
// Satu tanda di tengah gampang dihindari - foto dipotong, atau soalnya difoto
// sepotong-sepotong. Dengan pola yang berulang menyilang di seluruh layar,
// potongan sekecil apa pun yang masih memuat satu soal utuh hampir pasti ikut
// memuat sebagian teks identitasnya. Miring 30 derajat supaya tidak sejajar
// dengan baris teks soal - kalau sejajar, keduanya saling menyamarkan dan
// dua-duanya jadi lebih sulit dibaca.
//
// KENAPA SAMAR TAPI TIDAK TERLALU SAMAR
//
// Ini pertukaran yang harus jujur diakui: makin pekat tanda airnya, makin mudah
// terbaca di foto, tapi makin mengganggu peserta yang sedang mengerjakan.
// Nilainya dipilih supaya nyaris tidak mengganggu saat membaca layar dari jarak
// biasa, dan tetap terbaca pada foto yang di-zoom - karena begitulah bukti
// kebocoran biasanya diperiksa.
//
// YANG TIDAK DIJANJIKAN KOMPONEN INI
//
// Ini bukan penghalang, melainkan jejak. Orang yang paham peramban dan bisa
// membuka alat pengembang tetap bisa menghapus lapisannya. Di dalam SEB alat
// itu terkunci, jadi jejaknya berlaku penuh; di luar SEB (lomba yang memang
// tidak mewajibkannya) anggap saja tanda air ini menghalangi yang tidak niat,
// bukan yang sudah niat.

// Pola: berapa baris/kolom teks yang dicetak. Angkanya sengaja tetap, bukan
// dihitung dari ukuran layar - lebih mudah ditebak hasilnya, dan pada layar
// sekecil apa pun tetap ada beberapa tanda yang utuh.
const BARIS = 7;
const KOLOM = 4;

// `dalamKotak` mengubah lapisannya dari menutupi SELURUH layar (fixed) jadi
// menutupi kotak induknya saja (absolute). Dipakai pratinjau admin, yang
// menampilkan layar ujian di dalam sebuah modal: kalau di sana ia tetap fixed,
// tanda airnya akan tumpah keluar modal dan menutupi dashboard di belakangnya.
// Induknya harus `position: relative`.
export default function TandaAirUjian({ nama, email, kode, aktif = true, dalamKotak = false }) {
  // Jam ikut dicetak supaya foto yang beredar bisa dicocokkan dengan sesi mana.
  // Diperbarui tiap menit, bukan tiap detik: yang dibutuhkan ketelitian menit,
  // dan menyegarkan tiap detik cuma membuat 28 simpul teks digambar ulang
  // 60 kali lebih sering tanpa guna.
  const [jam, setJam] = useState(() => new Date());
  useEffect(() => {
    if (!aktif) return undefined;
    const id = setInterval(() => setJam(new Date()), 60000);
    return () => clearInterval(id);
  }, [aktif]);

  const baris = useMemo(() => {
    const waktu = jam.toLocaleString('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
    return [nama, email, kode ? `#${kode}` : '', waktu].filter(Boolean).join(' · ');
  }, [nama, email, kode, jam]);

  if (!aktif || !baris.trim()) return null;

  const petak = [];
  for (let r = 0; r < BARIS; r += 1) {
    for (let c = 0; c < KOLOM; c += 1) {
      petak.push(
        <span
          key={`${r}-${c}`}
          className="flex items-center justify-center text-center"
          style={{
            // Baris ganjil digeser setengah kolom supaya polanya tidak
            // membentuk garis lurus vertikal - lorong kosong seperti itu justru
            // jadi tempat aman untuk memotong foto.
            transform: `rotate(-30deg) translateX(${r % 2 ? '50%' : '0'})`,
          }}
        >
          {baris}
        </span>,
      );
    }
  }

  return (
    <div
      aria-hidden="true"
      data-tanda-air="ujian"
      // Warnanya lewat className, bukan style, supaya varian gelapnya ikut
      // bekerja: Web Olimp punya mode gelap (kelas `dark` di <html>), dan
      // maroon samar di atas latar gelap praktis tidak terlihat - tanda air
      // yang tidak terlihat sama saja dengan tidak ada.
      className={
        'pointer-events-none inset-0 z-40 select-none overflow-hidden '
        + (dalamKotak ? 'absolute ' : 'fixed ')
        + 'text-[rgba(120,53,53,0.13)] dark:text-[rgba(255,228,228,0.15)]'
      }
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${KOLOM}, 1fr)`,
        gridTemplateRows: `repeat(${BARIS}, 1fr)`,
        // pointer-events:none membuat lapisan ini tidak pernah menghalangi
        // klik - peserta tetap bisa memilih opsi seperti biasa walau tanda
        // airnya menutupi tombolnya.
        fontSize: 'clamp(9px, 1.15vw, 13px)',
        fontWeight: 700,
        letterSpacing: '0.04em',
        whiteSpace: 'nowrap',
        userSelect: 'none',
      }}
    >
      {petak}
    </div>
  );
}
