// HAPUS AKUN: LUNAK, BUKAN SUNGGUHAN
//
// PRD Revisi 2 bagian 7.3 memilih soft-delete, dan alasannya bukan kehati-hatian
// berlebihan: papan peringkat, hasil ujian, riwayat pembayaran, dan laporan
// lama semuanya menunjuk ke baris akun. Kalau barisnya benar-benar dibuang,
// semua angka historis yang menyebutnya ikut rusak - peringkat jadi bolong,
// jumlah peserta tidak cocok, dan tidak ada cara mengembalikannya.
//
// Jadi "hapus" di sini berarti: tandai tanggalnya, sembunyikan dari semua
// daftar, dan tutup pintu masuknya. Yang terakhir dikerjakan server lewat
// authRule (lihat migrasi 1786800000) - tanpa itu akun yang "sudah dihapus"
// masih bisa login seperti biasa.

import pb from '@/lib/pocketbaseClient';

// Ditempel ke filter daftar mana pun yang tidak boleh menampilkan akun terhapus.
export const HANYA_AKTIF = 'deletedAt = ""';

// Gabungkan dengan filter lain tanpa perlu memikirkan tanda kurung.
export function saringAktif(filterLain) {
  const f = String(filterLain || '').trim();
  return f ? `(${f}) && ${HANYA_AKTIF}` : HANYA_AKTIF;
}

// Buang baris yang sudah ditandai terhapus dari daftar yang sudah terlanjur
// diambil. Dipakai di tempat yang mengambil seluruh isi collection sekaligus.
export const yangAktif = (baris) => (baris || []).filter((r) => !r?.deletedAt);

// Kalimat konfirmasi yang menyebut identitas yang sedang dihapus, supaya admin
// tidak salah menghapus orang (PRD Revisi 2 bagian 7.2).
//
// `jenis` membedakan dua hal yang sekilas mirip tapi akibatnya tidak sama:
// menghapus AKUN menutup pintu login orangnya di seluruh aplikasi, sedangkan
// menghapus PENDAFTARAN cuma mengeluarkan dia dari satu lomba - akunnya tetap
// hidup. Kalau keduanya diberi kalimat yang sama, admin bisa mengira ia baru
// saja memblokir seseorang padahal tidak, atau sebaliknya.
export function konfirmasiHapus(label, jenis = 'akun') {
  if (jenis === 'pendaftaran') {
    return `Yakin hapus pendaftaran ${label} dari lomba ini?\n\n`
      + 'Dia langsung hilang dari daftar peserta, dan berkas SEB yang sudah terlanjur '
      + 'diunduh tidak bisa dipakai lagi. Akun miliknya sendiri tidak ikut terhapus. '
      + 'Hasil ujian yang sudah masuk sengaja tetap disimpan supaya laporan tidak rusak.';
  }
  return `Yakin hapus akun ${label}?\n\n`
    + 'Akunnya langsung tidak bisa dipakai masuk dan hilang dari semua daftar. '
    + 'Data lamanya (hasil ujian, peringkat) sengaja tetap disimpan supaya laporan tidak rusak.';
}

// Tandai satu akun/pendaftaran sebagai terhapus.
//
// `collection` bisa 'users', 'olimp_users', atau 'event_registrations' - ketiganya
// punya field deletedAt yang sama.
export async function hapusLunak(collection, id) {
  return pb.collection(collection).update(id, { deletedAt: new Date().toISOString() });
}

// Batalkan penghapusan. Tidak dipasang di layar mana pun untuk saat ini, tapi
// inilah yang membuat soft-delete berarti - tanpa fungsi ini, "lunak" cuma
// istilah.
export async function pulihkan(collection, id) {
  return pb.collection(collection).update(id, { deletedAt: null });
}
