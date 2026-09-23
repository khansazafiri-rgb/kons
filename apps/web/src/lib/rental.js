// MODUL PEMINJAMAN - sisi peramban
//
// Seluruh isi modul peminjaman dilayani endpoint khusus di server
// (pb_hooks/rental*.js), BUKAN lewat API collection biasa. Alasannya ada di
// sana; yang penting di sisi ini:
//
//   - Harga & ketersediaan yang ditampilkan halaman selalu datang dari server.
//     Tidak ada satu pun hitungan harga di berkas ini. Kalau peramban ikut
//     menghitung, cepat atau lambat angkanya akan berbeda dari yang ditagihkan
//     admin - dan yang dipercaya pelanggan adalah yang dilihatnya di layar.
//
//   - Keranjang hidup DI PERAMBAN (PRD bagian 7). Pelanggan tidak punya akun,
//     jadi tidak ada tempat lain untuk menyimpannya. Konsekuensinya: isinya
//     bisa basi berjam-jam, dan wajib diperiksa ulang ke server sebelum
//     checkout - itu yang dilakukan periksaKeranjang().

import pbr from '@/lib/rentalClient';

const KUNCI_KERANJANG = 'pcv.rental.keranjang.v1';
const KUNCI_BIODATA = 'pcv.rental.biodata.v1';

// ---------------------------------------------------------------------------
// Pemanggil API
// ---------------------------------------------------------------------------
//
// Memakai klien PocketBase KHUSUS peminjaman (rentalClient), bukan klien PCV.
// Token admin peminjaman ikut terbawa sendiri - itu yang membuat admin bisa
// melihat katalog sebelum modulnya dinyalakan untuk umum - dan sesi admin PCV
// yang kebetulan terbuka di peramban yang sama TIDAK ikut terbawa.
export async function panggil(path, { method = 'GET', body, query } = {}) {
  try {
    return await pbr.send(path, {
      method,
      query,
      body,
      // Kesalahan validasi di sini datang sebagai HTTP 4xx dengan pesan yang
      // memang ditulis untuk dibaca pelanggan; pb.send melemparnya sebagai
      // ClientResponseError, dan pesannya diambil lagi di bawah.
    });
  } catch (err) {
    const pesan = err?.response?.message || err?.message || 'Permintaan gagal.';
    const baru = new Error(pesan);
    baru.status = err?.status || 0;
    baru.data = err?.response || null;
    throw baru;
  }
}

export const ambilKonfigurasi = () => panggil('/api/rental/konfigurasi');

export const ambilKatalog = (opsi = {}) =>
  panggil('/api/rental/katalog', { query: opsi });

export const ambilDetail = (tipe, kunci) =>
  panggil('/api/rental/detail', { query: { tipe, id: kunci } });

export const ambilSlot = (ruang, tanggal) =>
  panggil('/api/rental/slot', { query: { ruang, tanggal } });

export const ambilStok = (alat, mulai, selesai) =>
  panggil('/api/rental/stok', { query: { alat, mulai, selesai } });

export const periksaKeranjang = (item) =>
  panggil('/api/rental/periksa', { method: 'POST', body: { item } });

export const kirimCheckout = (data) =>
  panggil('/api/rental/checkout', { method: 'POST', body: data });

export const ambilPesanan = (kode, token) =>
  panggil('/api/rental/pesanan', { query: { kode, token } });

// --- dashboard admin ---
export const adminRingkasan = () => panggil('/api/rental/admin/ringkasan');
export const adminPesanan = (q = {}) => panggil('/api/rental/admin/pesanan', { query: q });
export const adminTeksWa = (kode) => panggil('/api/rental/admin/teks-wa', { query: { kode } });
export const adminUbahStatus = (body) => panggil('/api/rental/admin/status', { method: 'POST', body });
export const adminBatal = (body) => panggil('/api/rental/admin/batal', { method: 'POST', body });
export const adminReschedule = (body) => panggil('/api/rental/admin/reschedule', { method: 'POST', body });
export const adminVerifikasi = (body) => panggil('/api/rental/admin/verifikasi', { method: 'POST', body });
export const adminKalender = (q) => panggil('/api/rental/admin/kalender', { query: q });
export const adminSyncStatus = () => panggil('/api/rental/admin/sync/status');
export const adminSyncUlang = (body = {}) => panggil('/api/rental/admin/sync/ulang', { method: 'POST', body });
export const adminTelegramPasang = () => panggil('/api/rental/admin/telegram/pasang', { method: 'POST', body: {} });
export const adminTelegramUji = () => panggil('/api/rental/admin/telegram/uji');
export const adminSaya = () => panggil('/api/rental/admin/saya');
export const adminKalenderTerpadu = (q) => panggil('/api/rental/admin/kalender-terpadu', { query: q });
export const kalenderKelasSinkron = (id) => panggil('/api/rental/admin/kalender-kelas/sinkron', { method: 'POST', body: { id: id || '' } });
export const kalenderKelasUji = (url) => panggil('/api/rental/admin/kalender-kelas/uji', { method: 'POST', body: { url } });
export const kalenderKelasDariPcv = () => panggil('/api/rental/admin/kalender-kelas/dari-pcv');
export const adminAntreanJalankan = () => panggil('/api/rental/admin/antrean/jalankan', { method: 'POST', body: {} });

// ---------------------------------------------------------------------------
// Keranjang
// ---------------------------------------------------------------------------
//
// Satu baris keranjang = satu item DENGAN jadwalnya sendiri (PRD bagian 4).
// Bentuknya sengaja minimal - cuma { tipe, id, jumlah, mulai, selesai } plus
// beberapa field tampilan. Nama, foto, dan harga IKUT disimpan supaya halaman
// keranjang bisa langsung menggambar isinya tanpa menunggu server, tapi yang
// dipakai saat checkout tetap yang dikirim balik server.

function bacaLocal(kunci, bawaan) {
  try {
    const teks = window.localStorage.getItem(kunci);
    if (!teks) return bawaan;
    const isi = JSON.parse(teks);
    return isi === null || isi === undefined ? bawaan : isi;
  } catch (_) {
    // localStorage bisa melempar di mode privat / kalau penyimpanan penuh.
    // Keranjang yang tidak bisa dibaca sebaiknya dianggap kosong daripada
    // membuat seluruh halaman gagal digambar.
    return bawaan;
  }
}

function tulisLocal(kunci, nilai) {
  try {
    window.localStorage.setItem(kunci, JSON.stringify(nilai));
    return true;
  } catch (_) {
    return false;
  }
}

export function bacaKeranjang() {
  const isi = bacaLocal(KUNCI_KERANJANG, []);
  return Array.isArray(isi) ? isi : [];
}

export function simpanKeranjang(isi) {
  tulisLocal(KUNCI_KERANJANG, Array.isArray(isi) ? isi : []);
  // Halaman lain (dan bar keranjang di header) perlu tahu isinya berubah.
  // Event `storage` bawaan hanya menyala di TAB LAIN, jadi tab ini harus
  // memberi tahu dirinya sendiri.
  try { window.dispatchEvent(new CustomEvent('rental:keranjang')); } catch (_) { /* SSR/jsdom */ }
}

// Baris dianggap sama kalau item DAN jadwalnya sama - bukan cuma itemnya.
// Kalau cuma itemnya yang dibandingkan, memesan ruang yang sama untuk dua hari
// berbeda akan saling menimpa.
const kunciBaris = (b) => `${b.tipe}:${b.id}:${b.mulai}:${b.selesai}`;

export function tambahKeKeranjang(baris) {
  const isi = bacaKeranjang();
  const kunci = kunciBaris(baris);
  const adaIdx = isi.findIndex((b) => kunciBaris(b) === kunci);

  if (adaIdx >= 0) {
    // Jadwal identik: jumlahnya ditambah, bukan barisnya digandakan.
    isi[adaIdx] = { ...isi[adaIdx], jumlah: (isi[adaIdx].jumlah || 1) + (baris.jumlah || 1) };
  } else {
    isi.push({ ...baris, jumlah: baris.jumlah || 1, ditambah: new Date().toISOString() });
  }
  simpanKeranjang(isi);
  return isi;
}

export function hapusDariKeranjang(indeks) {
  const isi = bacaKeranjang();
  isi.splice(indeks, 1);
  simpanKeranjang(isi);
  return isi;
}

export function ubahBarisKeranjang(indeks, patch) {
  const isi = bacaKeranjang();
  if (!isi[indeks]) return isi;
  isi[indeks] = { ...isi[indeks], ...patch };
  simpanKeranjang(isi);
  return isi;
}

export function kosongkanKeranjang() {
  simpanKeranjang([]);
}

export const jumlahKeranjang = () => bacaKeranjang().reduce((t, b) => t + (b.jumlah || 1), 0);

// Bentuk yang dikirim ke server - tanpa field tampilan.
export const keranjangUntukServer = (isi) =>
  (isi || bacaKeranjang()).map((b) => ({
    tipe: b.tipe,
    id: b.id,
    jumlah: b.jumlah || 1,
    mulai: b.mulai,
    selesai: b.selesai,
  }));

// ---------------------------------------------------------------------------
// Biodata autofill (PRD bagian 7.2)
// ---------------------------------------------------------------------------
//
// Disimpan HANYA kalau pelanggan mencentang persetujuannya, HANYA di peramban
// ini, dan dengan masa simpan yang ditentukan admin. Tidak ada login
// terselubung, tidak ada OTP, dan tidak ada pemulihan lintas perangkat - kalau
// pelanggan ganti perangkat atau membuka mode penyamaran, ia mengisi lagi.

export function bacaBiodata() {
  const isi = bacaLocal(KUNCI_BIODATA, null);
  if (!isi || typeof isi !== 'object') return null;

  // Kedaluwarsa diperiksa saat DIBACA, bukan lewat timer. Tab yang ditutup
  // tidak menjalankan timer apa pun, dan satu-satunya saat yang berarti untuk
  // memeriksa masa simpan adalah tepat sebelum datanya dipakai.
  const sampai = Date.parse(isi.kedaluwarsa || '');
  if (Number.isFinite(sampai) && sampai < Date.now()) {
    hapusBiodata();
    return null;
  }
  return isi;
}

export function simpanBiodata(data, hariSimpan) {
  const hari = Number(hariSimpan) || 0;
  const kedaluwarsa = hari > 0
    ? new Date(Date.now() + hari * 24 * 3600 * 1000).toISOString()
    : '';
  return tulisLocal(KUNCI_BIODATA, {
    nama: data.nama || '',
    wa: data.wa || '',
    email: data.email || '',
    institusi: data.institusi || '',
    kedaluwarsa,
    disimpan: new Date().toISOString(),
  });
}

export function hapusBiodata() {
  try { window.localStorage.removeItem(KUNCI_BIODATA); } catch (_) { /* mode privat */ }
}

// ---------------------------------------------------------------------------
// Format & label
// ---------------------------------------------------------------------------

export const rupiah = (n) => {
  const angka = Number(n) || 0;
  return `Rp${angka.toLocaleString('id-ID')}`;
};

export const SATUAN = { JAM: 'per jam', HARI: 'per hari', SESI: 'per sesi' };

export const STATUS_PESANAN = {
  MENUNGGU_PEMBAYARAN: { teks: 'Menunggu pembayaran', cls: 'bg-gold-100 text-gold-600 border-gold-200' },
  BUKTI_DIUNGGAH: { teks: 'Bukti diunggah', cls: 'bg-sky-50 text-sky-700 border-sky-200' },
  TERKONFIRMASI: { teks: 'Terkonfirmasi', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  SEDANG_DIPINJAM: { teks: 'Sedang dipinjam', cls: 'bg-maroon-50 text-maroon-600 border-maroon-200' },
  SELESAI: { teks: 'Selesai', cls: 'bg-stone-100 text-stone-600 border-stone-200' },
  DITOLAK: { teks: 'Bukti ditolak', cls: 'bg-red-50 text-red-700 border-red-200' },
  DIBATALKAN: { teks: 'Dibatalkan', cls: 'bg-stone-100 text-stone-500 border-stone-200' },
};

export const statusLabel = (kode) =>
  STATUS_PESANAN[kode] || { teks: kode || '—', cls: 'bg-stone-100 text-stone-600 border-stone-200' };

// Waktu SELALU ditampilkan dalam WIB, apa pun zona waktu perangkat pelanggan.
//
// Ini bukan kerewelan: kalau seseorang membuka web ini dari perangkat yang
// zonanya WITA, "09:00" yang dilihatnya akan berarti jam 08:00 di ruangannya -
// dan ia akan datang satu jam lebih awal ke gedung yang masih terkunci.
const WIB = { timeZone: 'Asia/Jakarta' };

export function jamWib(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString('id-ID', { ...WIB, hour: '2-digit', minute: '2-digit' });
}

export function tanggalWib(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('id-ID', { ...WIB, weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

export function jadwalKalimat(mulai, selesai) {
  if (!mulai || !selesai) return '—';
  const a = new Date(mulai);
  const b = new Date(selesai);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return '—';
  const hariSama = tanggalWib(mulai) === tanggalWib(selesai);
  return hariSama
    ? `${tanggalWib(mulai)}, ${jamWib(mulai)}–${jamWib(selesai)} WIB`
    : `${tanggalWib(mulai)} ${jamWib(mulai)} s/d ${tanggalWib(selesai)} ${jamWib(selesai)} WIB`;
}

// "YYYY-MM-DD" untuk tanggal hari ini menurut WIB. Dipakai sebagai tanggal awal
// pemilih jadwal; memakai tanggal lokal perangkat akan meleset satu hari untuk
// pengunjung di zona waktu lain.
export function tanggalWibHariIni(geserHari = 0) {
  const d = new Date(Date.now() + geserHari * 24 * 3600 * 1000);
  // en-CA memberi format YYYY-MM-DD apa adanya.
  return d.toLocaleDateString('en-CA', WIB);
}

export const menitKeJam = (menit) => {
  const m = Number(menit) || 0;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};

// Tautan wa.me dengan pesan pembuka. Web TIDAK PERNAH mengirim WhatsApp
// sendiri (PRD bagian 4) - ini cuma membuka aplikasi WhatsApp pelanggan dengan
// kotak ketik yang sudah terisi.
export function tautanWa(nomor, pesan) {
  const digit = String(nomor || '').replace(/\D/g, '');
  if (!digit) return '';
  const tujuan = digit.startsWith('0') ? `62${digit.slice(1)}` : digit;
  return `https://wa.me/${tujuan}?text=${encodeURIComponent(pesan || '')}`;
}

// Menyalin teks ke clipboard. PRD bagian 11 meminta tombol salin yang
// BENAR-BENAR menyalin; navigator.clipboard tidak ada di konteks non-HTTPS dan
// di sebagian peramban dalam-aplikasi, jadi ada jalur cadangan.
export async function salinTeks(teks) {
  try {
    await navigator.clipboard.writeText(teks);
    return true;
  } catch (_) {
    try {
      const ta = document.createElement('textarea');
      ta.value = teks;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch (_) {
      return false;
    }
  }
}

// ---------------------------------------------------------------------------
// Warna merek
// ---------------------------------------------------------------------------
//
// Warna utama web peminjaman diatur admin (rental_settings.brandColor). Tailwind
// membacanya sebagai triplet RGB di variabel CSS --sewa-rgb, supaya kelas
// seperti bg-sewa/10 tetap bisa mengatur transparansinya.

export const WARNA_BAWAAN = '#0F766E';

export function hexKeRgb(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// Variabel CSS untuk satu warna merek: warna utama + versi lebih tua untuk
// keadaan hover/aktif. Warna yang tidak sah jatuh ke bawaan, bukan ke hitam.
export function variabelMerek(hex) {
  const rgb = hexKeRgb(hex) || hexKeRgb(WARNA_BAWAAN);
  const tua = rgb.map((c) => Math.round(c * 0.8));
  return {
    '--sewa-rgb': rgb.join(' '),
    '--sewa-tua-rgb': tua.join(' '),
  };
}

// ---------------------------------------------------------------------------
// Pita tanggal
// ---------------------------------------------------------------------------
//
// Pemilih jadwal memakai deretan "chip" tanggal, bukan kalender bawaan
// peramban: pilihan yang paling sering (hari ini s/d dua minggu ke depan)
// langsung terlihat dan bisa diketuk sekali, pola yang sama dipakai aplikasi
// pemesanan tiket & aktivitas.
const HARI_PENDEK = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const BULAN_PENDEK = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

export function pitaTanggal(mulai, jumlah = 14) {
  const out = [];
  const [y, m, d] = String(mulai || tanggalWibHariIni()).split('-').map(Number);
  for (let i = 0; i < jumlah; i++) {
    // Dihitung di UTC dari tanggal polos, supaya zona waktu perangkat tidak
    // pernah menggeser harinya.
    const t = new Date(Date.UTC(y, m - 1, d + i));
    out.push({
      tanggal: t.toISOString().slice(0, 10),
      hari: HARI_PENDEK[t.getUTCDay()],
      tgl: t.getUTCDate(),
      bulan: BULAN_PENDEK[t.getUTCMonth()],
      akhirPekan: t.getUTCDay() === 0 || t.getUTCDay() === 6,
    });
  }
  return out;
}

// "2 jam 30 menit" dari dua waktu ISO.
export function durasiKalimat(mulai, selesai) {
  const menit = Math.round((new Date(selesai) - new Date(mulai)) / 60000);
  if (!Number.isFinite(menit) || menit <= 0) return '';
  const j = Math.floor(menit / 60);
  const m = menit % 60;
  if (j >= 24 && m === 0 && j % 24 === 0) return `${j / 24} hari`;
  return [j ? `${j} jam` : '', m ? `${m} menit` : ''].filter(Boolean).join(' ');
}

export const PERAN_ADMIN = {
  SUPER_ADMIN: { teks: 'Super Admin', ket: 'Semua menu, termasuk pengaturan & akun admin' },
  OPERASIONAL: { teks: 'Admin Operasional', ket: 'Pesanan, bukti bayar, pembatalan' },
  JADWAL: { teks: 'Admin Jadwal', ket: 'Kalender kelas, blok, penjaga, reschedule' },
};
