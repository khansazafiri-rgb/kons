import React from 'react';

// ISI HTML DARI DASHBOARD ADMIN
//
// Deskripsi ruang/alat, kebijakan, aturan sewa, dan instruksi pembayaran
// disimpan sebagai field `editor` PocketBase - isinya memang HTML, dan
// menampilkannya apa adanya membuat halaman penuh tulisan "<p>".
//
// KENAPA dangerouslySetInnerHTML BOLEH DI SINI
//
// Satu-satunya yang bisa menulis field ini adalah admin PCV yang login:
// aturan API rental_rooms, rental_items, dan rental_settings semuanya
// admin-only, dan tidak ada satu pun endpoint publik yang menerima HTML dari
// pengunjung. Jadi yang dirender di sini tidak pernah berasal dari luar -
// sumbernya sama persis dengan deskripsi lomba di halaman Event, yang sudah
// dirender dengan cara yang sama di repo ini.
//
// Yang TIDAK boleh lewat sini: apa pun yang diisi pelanggan (nama, keperluan,
// catatan). Semua itu dirender sebagai teks biasa oleh React di tempatnya
// masing-masing, dan memang harus begitu.
export default function IsiHtml({ html, className }) {
  if (!html) return null;
  return (
    <div
      className={`prose-rental ${className || ''}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
