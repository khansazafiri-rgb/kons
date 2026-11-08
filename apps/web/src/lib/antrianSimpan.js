// ANTRIAN PENYIMPANAN PENGERJAAN
//
// Kenapa perlu: klien PocketBase di web ini memakai autoCancellation(false),
// jadi tiap klik jawaban mengirim PATCH sendiri-sendiri secara bersamaan. Di
// koneksi HP yang naik-turun, PATCH yang dikirim belakangan bisa sampai di
// server lebih dulu, lalu ditimpa PATCH lama yang datang terlambat. Hasilnya
// jawaban terakhir siswa hilang, dan "lanjutkan" membuka keadaan yang lebih
// lama dari yang ia lihat. Hal yang sama bisa terjadi pada simpan akhir:
// simpanan sementara yang terlambat menimpa hasil yang sudah selesai.
//
// Aturannya di sini:
//   - paling banyak SATU permintaan berjalan pada satu waktu;
//   - yang datang selagi ada yang berjalan digabung (nilai terbaru menang),
//     jadi sepuluh klik cepat = paling banyak dua permintaan;
//   - kalau gagal, isinya disimpan untuk dicoba lagi (digabung dengan yang
//     lebih baru), dan dicoba ulang sendiri beberapa detik kemudian;
//   - simpan akhir lewat antrian yang sama, jadi selalu yang terakhir sampai.
//
// `simpan(patch)` mengembalikan Promise<boolean>: true kalau patch itu (atau
// gabungan yang memuatnya) sudah diterima server.

const JEDA_ULANG_MS = 4000;

export function buatAntrianSimpan(kirim, { jedaUlang = JEDA_ULANG_MS } = {}) {
  let berjalan = null;
  let tunda = null;
  let penanti = [];
  let timerUlang = null;

  const jalan = async () => {
    while (tunda) {
      const patch = tunda;
      const menunggu = penanti;
      tunda = null;
      penanti = [];
      try {
        await kirim(patch);
        menunggu.forEach((r) => r(true));
      } catch (_) {
        // Yang lebih baru (kalau ada) tetap menang atas isi yang gagal.
        tunda = { ...patch, ...(tunda || {}) };
        menunggu.forEach((r) => r(false));
        if (!timerUlang) {
          timerUlang = setTimeout(() => {
            timerUlang = null;
            if (!berjalan && tunda) berjalan = jalan();
          }, jedaUlang);
        }
        break;
      }
    }
    berjalan = null;
  };

  const simpan = (patch) => new Promise((resolve) => {
    tunda = { ...(tunda || {}), ...patch };
    penanti.push(resolve);
    if (timerUlang) { clearTimeout(timerUlang); timerUlang = null; }
    if (!berjalan) berjalan = jalan();
  });

  const hentikan = () => {
    if (timerUlang) clearTimeout(timerUlang);
    timerUlang = null;
    tunda = null;
    penanti.forEach((r) => r(false));
    penanti = [];
  };

  return { simpan, hentikan, sibuk: () => !!berjalan || !!tunda };
}

// Cadangan di peramban untuk pengerjaan yang sedang berjalan. Dipakai kalau
// simpanan terakhir belum sempat sampai di server waktu halaman dimuat ulang
// (Safari di iPad bisa memuat ulang tab kapan saja). Kegagalan localStorage
// (mode privat, penuh) diabaikan: server tetap sumber utamanya.
const kunciCadangan = (id) => `pcv_kerja_${id}`;

export function tulisCadangan(id, isi) {
  if (!id) return;
  try {
    const lama = JSON.parse(localStorage.getItem(kunciCadangan(id)) || '{}');
    localStorage.setItem(kunciCadangan(id), JSON.stringify({ ...lama, ...isi, t: Date.now() }));
  } catch (_) { /* abaikan */ }
}

export function bacaCadangan(id) {
  if (!id) return null;
  try {
    const isi = JSON.parse(localStorage.getItem(kunciCadangan(id)) || 'null');
    return isi && typeof isi === 'object' ? isi : null;
  } catch (_) {
    return null;
  }
}

export function hapusCadangan(id) {
  if (!id) return;
  try { localStorage.removeItem(kunciCadangan(id)); } catch (_) { /* abaikan */ }
}

// Gabungkan record server dengan cadangan peramban: cadangan dipakai hanya
// kalau ia ditulis SETELAH record server terakhir diperbarui (berarti ada
// perubahan yang belum sempat terkirim).
export function gabungDenganCadangan(record, cadangan) {
  if (!record) return record;
  if (!cadangan?.t) return record;
  const waktuServer = Date.parse(String(record.updated || '').replace(' ', 'T')) || 0;
  if (cadangan.t <= waktuServer) return record;
  const { t, ...isi } = cadangan;
  return { ...record, ...isi };
}
