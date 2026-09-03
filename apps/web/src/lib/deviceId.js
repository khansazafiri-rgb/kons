import pb from '@/lib/pocketbaseClient';

// PENANDA PERANGKAT
//
// Satu nilai acak yang menjawab satu pertanyaan: "HP/laptop ini, yang sekarang
// membuka web, apakah HP yang sama dengan yang kemarin?" Dipakai kunci device
// PCV (AuthContext), sidik jari Web Olimp (lib/olimp), dan kunci per
// pendaftaran lomba.
//
// KENAPA TIDAK CUKUP localStorage SAJA
//
// Dulu isinya cuma tiga baris: baca localStorage, kalau kosong bikin baru.
// Yang tidak disadari, localStorage bisa hilang sendiri padahal HP-nya tidak
// diapa-apakan:
//
//   - Safari iPhone/iPad menghapusnya setelah 7 hari situsnya tidak dibuka;
//   - pindah domain menghapusnya (localStorage terikat alamat, dan web ini
//     memang pernah pindah ke pcvclassroom.com);
//   - "bersihkan data situs", mode penyamaran, ganti peramban.
//
// Begitu penandanya hilang, HP yang sama dianggap perangkat baru dan siswa
// ditolak dengan "akun sudah terkunci ke device lain" - keluhan yang muncul
// justru dari siswa yang lama tidak membuka web.
//
// Sekarang penandanya disimpan di DUA tempat, dan yang mana pun selamat bisa
// memulihkan yang hilang:
//
//   1. localStorage - cepat, dan satu-satunya yang ada sebelum perbaikan ini;
//   2. kuki `pcv_did` yang DIPASANG SERVER (pb_hooks/device-id.pb.js) - inilah
//      yang tahan aturan 7 hari Safari, karena pemangkasan umur itu hanya
//      berlaku untuk kuki yang ditulis JavaScript.
//
// Yang tidak bisa diselamatkan siapa pun: siswa yang mengganti HP, atau yang
// penandanya sudah telanjur hilang sebelum perbaikan ini terpasang. Untuk
// mereka ada dua jalan - kunci yang kedaluwarsa sendiri (lihat AuthContext) dan
// tombol "Reset Device" di panel admin.

const KUNCI_LOKAL = 'pcv_device_id';
const NAMA_KUKI = 'pcv_did';
const UMUR_KUKI = 400 * 24 * 60 * 60; // detik

// Bentuk yang dianggap sah. Nilai yang tidak lolos diperlakukan seperti tidak
// ada - lebih baik menerbitkan penanda baru daripada memakai nilai rusak yang
// tidak akan pernah cocok dengan catatan di server.
const SAH = /^[A-Za-z0-9_-]{6,64}$/;
const sah = (v) => typeof v === 'string' && SAH.test(v);

function bacaLokal() {
  try {
    return localStorage.getItem(KUNCI_LOKAL) || '';
  } catch (_) {
    return '';
  }
}

function bacaKuki() {
  try {
    const cocok = document.cookie.match(new RegExp('(?:^|; )' + NAMA_KUKI + '=([^;]*)'));
    return cocok ? decodeURIComponent(cocok[1]) : '';
  } catch (_) {
    return '';
  }
}

// Tulis ke dua-duanya sekaligus. Kuki dari sini cuma cadangan: yang benar-benar
// awet adalah kuki bernama sama yang dipasang server, dan penulisan ini akan
// ditimpa olehnya pada permintaan berikutnya. Gunanya untuk keadaan server
// belum sempat dihubungi - mis. peserta yang langsung masuk halaman ujian.
function simpan(id) {
  try {
    localStorage.setItem(KUNCI_LOKAL, id);
  } catch (_) {
    /* localStorage ditolak (mode penyamaran ketat) - kuki masih dicoba */
  }
  try {
    const aman = window.location.protocol === 'https:' ? '; secure' : '';
    document.cookie = `${NAMA_KUKI}=${encodeURIComponent(id)}; path=/; max-age=${UMUR_KUKI}; samesite=lax${aman}`;
  } catch (_) {
    /* kuki ditolak - localStorage masih dipakai */
  }
}

// Penanda perangkat, seketika dan tanpa menunggu jaringan.
//
// Urutannya penting: localStorage dulu (nilai yang sudah lama dipakai dan
// tercatat di server), baru kuki. Kuki dibaca sebagai PEMULIHAN - kalau
// localStorage-nya yang terhapus, nilai lamanya masih utuh di sini, dan
// siswanya tidak jadi terkunci di luar.
export function getDeviceId() {
  let id = bacaLokal();
  if (!sah(id)) id = bacaKuki();
  if (!sah(id)) id = 'dev_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
  simpan(id);
  return id;
}

// Titipkan penanda ini ke server supaya dipasang sebagai kuki yang benar-benar
// awet, dan pakai jawabannya sebagai yang sah.
//
// Dipanggil sekali saat web dibuka dan sekali lagi sebelum kunci device
// diperiksa. Perlu ditunggu (await) di tempat kedua: kalau localStorage-nya
// baru saja terhapus, nilai yang benar justru baru datang dari sini.
//
// Kegagalannya sengaja tidak dianggap masalah - server versi lama belum punya
// jalur ini, dan kalau PocketBase dipasang di domain terpisah kukinya memang
// tidak akan ikut terkirim. Dua-duanya jatuh kembali ke perilaku lama.
export async function siapkanDeviceId() {
  const lokal = getDeviceId();
  try {
    const jawab = await pb.send(`/api/pcv/device-id?usul=${encodeURIComponent(lokal)}`, { method: 'GET' });
    if (sah(jawab?.deviceId)) {
      simpan(jawab.deviceId);
      return jawab.deviceId;
    }
  } catch (_) {
    /* jalur belum ada / jaringan putus - penanda lokal tetap berlaku */
  }
  return lokal;
}
