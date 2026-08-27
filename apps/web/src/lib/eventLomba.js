// MODUL EVENT/LOMBA - sisi peramban
//
// Seluruh isi lomba dilayani endpoint khusus di server
// (pb_hooks/event-lomba.pb.js), BUKAN lewat API collection biasa. Alasannya
// ada di sana; yang penting di sisi ini: soal tidak pernah datang bersama
// kunci jawabannya selama ujian masih berjalan, jadi tidak ada gunanya mencari
// kunci jawaban di dalam data yang diterima halaman kuis.
//
// Satu hal yang membuat berkas ini ada: peserta lomba bisa masuk dengan DUA
// jenis akun - siswa web PCV (`users`) atau peserta Web Olimp (`olimp_users`) -
// dan keduanya menyimpan tokennya di tempat yang berbeda. Semua pemanggilan
// karena itu lewat panggilEvent(), yang memilih token yang benar sendiri.

import pb from '@/lib/pocketbaseClient';
import pbo from '@/lib/olimpClient';

// Siapa yang sedang login, dan token siapa yang harus dipakai.
//
// Akun PCV didahulukan kalau kebetulan dua-duanya aktif di peramban yang sama:
// PRD menyebut akun PCV sebagai jalur utama pendaftaran lomba, dan peserta
// Olimp jadi jalur tambahan supaya mereka tidak terkunci di luar.
export function identitasEvent() {
  if (pb.authStore.isValid && pb.authStore.record?.id) {
    const rec = pb.authStore.record;
    return {
      kind: 'users',
      token: pb.authStore.token,
      user: rec,
      nama: rec.name || '',
      email: rec.email || '',
      wa: rec.whatsapp || rec.noWa || '',
      asal: rec.asalKuliah || rec.asalKampus || '',
      // Admin boleh melihat-lihat, tapi tidak boleh ikut jadi peserta.
      isAdmin: rec.role === 'admin' || rec.role === 'super_admin',
    };
  }
  if (pbo.authStore.isValid && pbo.authStore.record?.id) {
    const rec = pbo.authStore.record;
    return {
      kind: 'olimp_users',
      token: pbo.authStore.token,
      user: rec,
      nama: rec.name || '',
      email: rec.email || '',
      wa: rec.whatsapp || '',
      asal: rec.asalKampus || '',
      isAdmin: false,
    };
  }
  return null;
}

// Pemanggil tunggal semua endpoint lomba.
//
// Dipakai fetch langsung, bukan pb.send(), karena token yang dipakai belum
// tentu milik klien PocketBase yang sedang dipegang halaman itu.
export async function panggilEvent(path, { method = 'GET', body, query } = {}) {
  const id = identitasEvent();
  const headers = {};
  if (id?.token) headers.Authorization = id.token;
  if (body) headers['Content-Type'] = 'application/json';

  let url = pb.buildURL(path);
  if (query) {
    const q = new URLSearchParams(query).toString();
    if (q) url += (url.includes('?') ? '&' : '?') + q;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try { data = await res.json(); } catch (_) { data = null; }
  if (!res.ok) {
    const err = new Error(data?.message || 'Permintaan gagal.');
    err.kode = data?.kode || '';
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

// Unduh berkas .seb milik peserta untuk satu lomba.
//
// Tidak bisa memakai <a href> biasa: endpoint-nya perlu header Authorization,
// dan tautan biasa tidak membawanya.
export async function unduhSebEvent(slug) {
  const id = identitasEvent();
  if (!id) throw new Error('Masuk dulu untuk mengunduh berkas konfigurasi.');

  const res = await fetch(pb.buildURL(`/api/event/seb-config?slug=${encodeURIComponent(slug)}`), {
    headers: { Authorization: id.token },
  });
  if (!res.ok) {
    let pesan = 'Gagal mengunduh berkas konfigurasi.';
    try { pesan = (await res.json()).message || pesan; } catch (_) { /* jawabannya bukan JSON */ }
    throw new Error(pesan);
  }
  const blob = await res.blob();
  const disposisi = res.headers.get('Content-Disposition') || '';
  const cocok = disposisi.match(/filename="?([^"]+)"?/);
  const nama = cocok ? cocok[1] : `${slug}.seb`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nama;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return nama;
}

// ---------------------------------------------------------------------------
// Label & format
// ---------------------------------------------------------------------------

export const STATUS_EVENT = {
  DRAFT: { teks: 'Draf', cls: 'bg-stone-100 text-stone-600 border-stone-200' },
  PUBLISHED: { teks: 'Terbit', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  REGISTRATION_CLOSED: { teks: 'Pendaftaran ditutup', cls: 'bg-gold-100 text-gold-600 border-gold-200' },
  ONGOING: { teks: 'Sedang berlangsung', cls: 'bg-maroon-50 text-maroon-600 border-maroon-200' },
  FINISHED: { teks: 'Selesai', cls: 'bg-stone-100 text-stone-600 border-stone-200' },
  ARCHIVED: { teks: 'Arsip', cls: 'bg-stone-100 text-stone-500 border-stone-200' },
};

export const STATUS_BAYAR = {
  PENDING_PAYMENT: { teks: 'Belum bayar', cls: 'bg-gold-100 text-gold-600 border-gold-200' },
  PAID_PENDING_APPROVAL: { teks: 'Sudah bayar, menunggu ACC', cls: 'bg-sky-50 text-sky-700 border-sky-200' },
  APPROVED: { teks: 'Disetujui', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  REJECTED: { teks: 'Ditolak', cls: 'bg-red-50 text-red-700 border-red-200' },
  CANCELLED: { teks: 'Dibatalkan', cls: 'bg-stone-100 text-stone-600 border-stone-200' },
};

export const rupiah = (n) => {
  const angka = Number(n) || 0;
  if (angka <= 0) return 'Gratis';
  return 'Rp' + angka.toLocaleString('id-ID');
};

export function tanggalPanjang(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function tanggalPendek(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// "01:23:45" - dipakai timer ujian & hitung mundur.
export function jamMundur(totalDetik) {
  const d = Math.max(0, Math.floor(Number(totalDetik) || 0));
  const j = Math.floor(d / 3600);
  const m = Math.floor((d % 3600) / 60);
  const s = d % 60;
  const dua = (n) => String(n).padStart(2, '0');
  return j > 0 ? `${dua(j)}:${dua(m)}:${dua(s)}` : `${dua(m)}:${dua(s)}`;
}

// Berapa lama lagi sampai `iso`, dalam kalimat ("2 hari 3 jam lagi").
export function sisaWaktuKalimat(iso) {
  if (!iso) return '';
  const selisih = new Date(iso).getTime() - Date.now();
  if (!Number.isFinite(selisih) || selisih <= 0) return '';
  const detik = Math.floor(selisih / 1000);
  const hari = Math.floor(detik / 86400);
  const jam = Math.floor((detik % 86400) / 3600);
  const menit = Math.floor((detik % 3600) / 60);
  if (hari > 0) return `${hari} hari ${jam} jam lagi`;
  if (jam > 0) return `${jam} jam ${menit} menit lagi`;
  return `${menit} menit lagi`;
}

// Pesan template WhatsApp untuk pembayaran (PRD bagian 4.1 langkah 4).
export function tautanWaPembayaran(nomor, namaPeserta, namaEvent, harga) {
  const digit = String(nomor || '').replace(/\D/g, '');
  if (!digit) return '';
  const nomorWa = digit.startsWith('0') ? `62${digit.slice(1)}` : digit.startsWith('62') ? digit : `62${digit}`;
  const pesan = `Halo, saya ${namaPeserta || '...'} mau daftar ${namaEvent}. Nominalnya ${rupiah(harga)}.`;
  return `https://api.whatsapp.com/send/?phone=${nomorWa}&text=${encodeURIComponent(pesan)}&type=phone_number&app_absent=0`;
}

// Slug dari nama event - dipakai form admin untuk mengisi otomatis.
export function buatSlug(nama) {
  return String(nama || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}
