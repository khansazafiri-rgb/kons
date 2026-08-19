// RIWAYAT PERHITUNGAN
//
// Disimpan di localStorage, BUKAN di database. Alasannya: angka yang diketik di
// sini bisa berasal dari pasien sungguhan waktu siswa berlatih di lahan praktik,
// dan data seperti itu tidak boleh menumpang di server web belajar. Dengan
// localStorage, isinya tidak pernah meninggalkan perangkat pemakainya.
//
// Alat rujukan aslinya menyimpan riwayat di memori halaman saja, jadi hilang
// tiap kali tab ditutup atau di-refresh - padahal justru saat membandingkan
// beberapa skenario riwayat itu yang paling dibutuhkan. Karena itu di sini
// dibuat bertahan, dengan tombol Kosongkan sebagai gantinya.

const KUNCI = 'pcv_klinis_riwayat';
const MAKS = 50; // cukup untuk satu sesi belajar; yang terlama terbuang sendiri

export function bacaRiwayat() {
  try {
    const isi = JSON.parse(localStorage.getItem(KUNCI) || '[]');
    return Array.isArray(isi) ? isi : [];
  } catch (_) {
    return []; // isi rusak / localStorage diblokir - anggap saja kosong
  }
}

export function simpanRiwayat(entri) {
  const baru = [
    { ...entri, id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, waktu: new Date().toISOString() },
    ...bacaRiwayat(),
  ].slice(0, MAKS);
  try {
    localStorage.setItem(KUNCI, JSON.stringify(baru));
  } catch (_) {
    /* kuota penuh / mode privat - riwayat memang bukan data kritis */
  }
  return baru;
}

export function hapusRiwayat(id) {
  const baru = bacaRiwayat().filter((r) => r.id !== id);
  try {
    localStorage.setItem(KUNCI, JSON.stringify(baru));
  } catch (_) {}
  return baru;
}

export function kosongkanRiwayat() {
  try {
    localStorage.removeItem(KUNCI);
  } catch (_) {}
  return [];
}

export const waktuTeks = (iso) =>
  new Date(iso).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

// Satu entri jadi teks polos - dipakai tombol Salin, dan sebagai bahan
// "Salin semua" di tab Riwayat.
export const entriKeTeks = (r) =>
  [`${r.judul} · ${waktuTeks(r.waktu)}`, ...(r.ringkas || []).map(([k, v]) => `  ${k}: ${v}`)].join('\n');
