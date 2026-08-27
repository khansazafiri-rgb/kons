import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle, CalendarDays, CheckCircle2, Clock, Download, LogIn,
  ShieldCheck, Timer, Trophy, Users, Wallet,
} from 'lucide-react';
import LandingLayout from '@/pages/landing/LandingLayout';
import {
  STATUS_BAYAR, identitasEvent, panggilEvent, rupiah, sisaWaktuKalimat,
  tanggalPanjang, tautanWaPembayaran, unduhSebEvent,
} from '@/lib/eventLomba';

// DETAIL SATU LOMBA (halaman publik, /event/:slug)
//
// Halaman ini menjawab dua pertanyaan sekaligus, dan itu sebabnya ia panjang:
//   1. "Lomba ini apa?"    - banner, jadwal, harga, aturan
//   2. "Sekarang saya harus apa?" - satu tombol besar yang isinya berubah
//      menurut jadwal DAN menurut keadaan pendaftaran orang yang membukanya
//
// Bagian kedua sengaja dihitung di server (/api/event/detail mengembalikan
// `saya`), bukan disimpulkan di sini dari tanggal: jam peramban peserta bisa
// saja salah, dan yang menentukan boleh-tidaknya mengerjakan tetap server.

function Baris({ icon: Icon, label, isi, catatan }) {
  return (
    <div className="flex gap-3">
      <Icon size={16} className="mt-0.5 shrink-0 text-maroon-500" />
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">{label}</p>
        <p className="text-sm font-medium text-stone-800">{isi}</p>
        {catatan && <p className="text-[11px] text-stone-500">{catatan}</p>}
      </div>
    </div>
  );
}

// Kartu keadaan pendaftaran - yang dilihat orang yang SUDAH mendaftar.
function KartuPendaftaran({ ev, saya, onUnduh, sibuk, pesanUnduh }) {
  const gaya = STATUS_BAYAR[saya.status] || STATUS_BAYAR.PENDING_PAYMENT;
  const waPembayaran = tautanWaPembayaran(ev.waPembayaran, '', ev.nama, ev.harga);

  return (
    <div className="rounded-2xl border border-alba-200 bg-alba-50 p-5 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-display text-base font-semibold text-stone-800">Pendaftaranmu</h3>
        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${gaya.cls}`}>
          {gaya.teks}
        </span>
      </div>

      {saya.status === 'PENDING_PAYMENT' && (
        <div className="mt-3 space-y-3">
          <p className="text-sm leading-relaxed text-stone-600">
            Pendaftaranmu sudah tercatat. Langkah berikutnya: transfer biaya lomba, lalu
            kirim bukti transfermu ke admin lewat WhatsApp. Admin yang akan menandai
            pembayaranmu dan menyetujui pendaftaran ini.
          </p>
          {waPembayaran && (
            <a
              href={waPembayaran}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-maroon-600 px-5 py-2.5 text-sm font-semibold text-alba-50 transition-colors hover:bg-maroon-700"
            >
              <Wallet size={15} /> Bayar &amp; konfirmasi lewat WhatsApp
            </a>
          )}
        </div>
      )}

      {saya.status === 'PAID_PENDING_APPROVAL' && (
        <p className="mt-3 text-sm leading-relaxed text-stone-600">
          Admin sudah menandai pembayaranmu diterima. Tinggal menunggu pendaftaranmu
          disetujui — begitu disetujui, berkas konfigurasi Safe Exam Browser-mu bisa
          diunduh di halaman ini.
        </p>
      )}

      {saya.status === 'REJECTED' && (
        <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-relaxed text-red-700">
          Pendaftaranmu tidak disetujui.
          {saya.alasanTolak ? ` Alasan dari admin: ${saya.alasanTolak}` : ' Hubungi admin kalau menurutmu ini keliru.'}
        </p>
      )}

      {saya.status === 'APPROVED' && (
        <div className="mt-3 space-y-4">
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700">
            <CheckCircle2 size={15} /> Pendaftaranmu sudah disetujui.
          </p>

          {ev.wajibSeb && (
            <div className="rounded-xl border border-alba-200 bg-alba-100/60 p-4">
              <h4 className="inline-flex items-center gap-2 font-display text-sm font-semibold text-stone-800">
                <ShieldCheck size={15} className="text-maroon-600" /> Siapkan Safe Exam Browser
              </h4>
              <p className="mt-1.5 text-[13px] leading-relaxed text-stone-600">
                Lomba ini dikerjakan lewat Safe Exam Browser. Unduh berkas konfigurasi di bawah —
                berkas ini <span className="font-semibold">khusus milikmu untuk lomba ini</span>,
                jangan dibagikan ke siapa pun. Menjalankannya akan membuka layar ujian.
              </p>
              <button
                onClick={onUnduh}
                disabled={sibuk}
                className="mt-3 inline-flex items-center gap-2 rounded-xl border border-maroon-300 px-4 py-2.5 text-sm font-semibold text-maroon-600 transition-colors hover:bg-maroon-50 disabled:opacity-50"
              >
                <Download size={15} /> {sibuk ? 'Menyiapkan…' : 'Unduh berkas .seb'}
              </button>
              {pesanUnduh && <p className="mt-2 text-[12px] text-stone-600">{pesanUnduh}</p>}
              {!ev.sebSiap && (
                <p className="mt-2 inline-flex items-start gap-1.5 text-[11px] leading-relaxed text-gold-600">
                  <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                  Penguncian SEB untuk lomba ini belum sepenuhnya aktif (Browser Exam Key belum
                  diisi admin). Berkasnya tetap bisa dipakai.
                </p>
              )}
            </div>
          )}

          {saya.bolehUjian ? (
            <Link
              to={`/event/${ev.slug}/ujian`}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-maroon-600 px-6 py-3 text-sm font-semibold text-alba-50 transition-colors hover:bg-maroon-700"
            >
              <Timer size={16} /> Masuk Ujian
            </Link>
          ) : saya.sudahKumpul ? (
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-relaxed text-emerald-800">
              Jawabanmu sudah dikumpulkan. Hasil akan diumumkan
              {ev.tanggalRilis ? ` pada ${tanggalPanjang(ev.tanggalRilis)}` : ' setelah semua peserta selesai'}.
            </p>
          ) : saya.kodeJendela === 'BELUM_MULAI' ? (
            <p className="rounded-xl border border-alba-200 bg-alba-100/60 px-4 py-3 text-sm leading-relaxed text-stone-600">
              Ujian dimulai {tanggalPanjang(ev.mulaiUjian)}
              {sisaWaktuKalimat(ev.mulaiUjian) && ` — ${sisaWaktuKalimat(ev.mulaiUjian)}`}.
              Buka halaman ini lagi saat waktunya tiba.
            </p>
          ) : (
            <p className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm leading-relaxed text-stone-600">
              Jendela waktu ujian sudah ditutup.
            </p>
          )}
        </div>
      )}

      {ev.hasilDirilis && (
        <Link
          to={`/event/${ev.slug}/hasil`}
          className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-maroon-600 hover:underline"
        >
          <Trophy size={15} /> Lihat hasil &amp; peringkat
        </Link>
      )}
    </div>
  );
}

// Tombol besar untuk orang yang BELUM mendaftar - isinya mengikuti PRD 3.4.
function AjakanDaftar({ ev, identitas }) {
  if (ev.hasilDirilis) {
    return (
      <Link
        to={`/event/${ev.slug}/hasil`}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-maroon-600 px-6 py-3 text-sm font-semibold text-alba-50 transition-colors hover:bg-maroon-700"
      >
        <Trophy size={16} /> Lihat Hasil
      </Link>
    );
  }
  if (ev.fasePendaftaran === 'BELUM_BUKA') {
    return (
      <div className="rounded-xl border border-alba-200 bg-alba-100/60 px-5 py-4 text-center">
        <p className="text-sm font-semibold text-stone-700">Pendaftaran belum dibuka</p>
        <p className="mt-1 text-[13px] text-stone-500">
          Dibuka {tanggalPanjang(ev.bukaPendaftaran)}
          {sisaWaktuKalimat(ev.bukaPendaftaran) && ` — ${sisaWaktuKalimat(ev.bukaPendaftaran)}`}
        </p>
      </div>
    );
  }
  if (ev.fasePendaftaran !== 'BUKA') {
    return (
      <div className="rounded-xl border border-stone-200 bg-stone-50 px-5 py-4 text-center">
        <p className="text-sm font-semibold text-stone-700">Pendaftaran telah ditutup</p>
        <p className="mt-1 text-[13px] text-stone-500">
          Lomba berikutnya akan diumumkan di halaman Event &amp; Lomba.
        </p>
      </div>
    );
  }
  if (ev.kuotaPenuh) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-center">
        <p className="text-sm font-semibold text-red-700">Kuota peserta sudah penuh</p>
        <p className="mt-1 text-[13px] text-red-600">
          Semua {ev.kuota} kursi sudah terisi.
        </p>
      </div>
    );
  }
  if (identitas?.isAdmin) {
    return (
      <p className="rounded-xl border border-alba-200 bg-alba-100/60 px-5 py-4 text-center text-[13px] text-stone-600">
        Kamu masuk sebagai admin — akun admin tidak ikut lomba sebagai peserta.
      </p>
    );
  }
  return (
    <Link
      to={`/event/${ev.slug}/daftar`}
      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-maroon-600 px-6 py-3 text-sm font-semibold text-alba-50 transition-colors hover:bg-maroon-700"
    >
      {identitas ? <>Daftar Sekarang</> : <><LogIn size={16} /> Masuk &amp; Daftar</>}
    </Link>
  );
}

export default function EventDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [ev, setEv] = useState(null);
  const [error, setError] = useState('');
  const [sibuk, setSibuk] = useState(false);
  const [pesanUnduh, setPesanUnduh] = useState('');
  const identitas = identitasEvent();

  const muat = useCallback(() => {
    panggilEvent('/api/event/detail', { query: { slug } })
      .then(setEv)
      .catch((err) => setError(err.message || 'Lomba tidak ditemukan.'));
  }, [slug]);

  useEffect(muat, [muat]);

  const unduh = async () => {
    setSibuk(true);
    setPesanUnduh('');
    try {
      const nama = await unduhSebEvent(slug);
      setPesanUnduh(`Berkas ${nama} tersimpan. Jalankan berkas itu untuk membuka layar ujian.`);
    } catch (err) {
      setPesanUnduh(err.message || 'Gagal mengunduh berkas konfigurasi.');
    } finally {
      setSibuk(false);
    }
  };

  if (error) {
    return (
      <LandingLayout>
        <section className="mx-auto w-full max-w-2xl px-6 py-24 text-center">
          <p className="text-sm text-stone-600">{error}</p>
          <button
            onClick={() => navigate('/event')}
            className="mt-4 rounded-xl bg-maroon-600 px-6 py-2.5 text-sm font-semibold text-alba-50"
          >
            Kembali ke daftar lomba
          </button>
        </section>
      </LandingLayout>
    );
  }

  if (!ev) {
    return (
      <LandingLayout>
        <section className="mx-auto w-full max-w-4xl px-6 py-24">
          <p className="text-sm text-stone-500">Memuat lomba…</p>
        </section>
      </LandingLayout>
    );
  }

  const modelWaktu = ev.modelWaktu === 'FIXED_WINDOW'
    ? 'Serentak — semua peserta mengerjakan dalam jendela waktu yang sama'
    : `Timer pribadi ${ev.durasiMenit || 0} menit, dimulai saat kamu menekan Mulai`;

  return (
    <LandingLayout>
      <article className="mx-auto w-full max-w-5xl px-6 py-12">
        <Link to="/event" className="text-[13px] font-semibold text-maroon-600 hover:underline">
          ← Semua lomba
        </Link>

        {ev.banner ? (
          <img src={ev.banner} alt="" className="mt-4 h-48 w-full rounded-2xl object-cover sm:h-64" />
        ) : (
          <div className="mt-4 flex h-40 w-full items-center justify-center rounded-2xl bg-gradient-to-br from-maroon-600 to-maroon-800 sm:h-52">
            <Trophy size={40} className="text-gold-200" />
          </div>
        )}

        <header className="mt-6">
          {ev.subjek && (
            <span className="inline-flex rounded-full border border-gold-200 bg-gold-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-gold-600">
              {ev.subjek}
            </span>
          )}
          <h1 className="mt-2 font-display text-3xl font-semibold text-stone-800 sm:text-4xl">
            {ev.nama}
          </h1>
        </header>

        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_340px] lg:items-start">
          <div className="min-w-0 space-y-8">
            {ev.deskripsi && (
              <section>
                <h2 className="font-display text-lg font-semibold text-stone-800">Tentang lomba ini</h2>
                <div
                  className="mt-2 text-sm leading-relaxed text-stone-600 [&_li]:ml-5 [&_li]:list-disc [&_p]:mb-3 [&_strong]:font-semibold"
                  dangerouslySetInnerHTML={{ __html: ev.deskripsi }}
                />
              </section>
            )}

            {ev.aturan && (
              <section>
                <h2 className="font-display text-lg font-semibold text-stone-800">Aturan &amp; instruksi</h2>
                <div
                  className="mt-2 text-sm leading-relaxed text-stone-600 [&_li]:ml-5 [&_li]:list-disc [&_p]:mb-3 [&_strong]:font-semibold"
                  dangerouslySetInnerHTML={{ __html: ev.aturan }}
                />
              </section>
            )}

            <section className="rounded-2xl border border-alba-200 bg-alba-50 p-5 shadow-card">
              <h2 className="font-display text-lg font-semibold text-stone-800">Jadwal &amp; format</h2>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Baris icon={CalendarDays} label="Pendaftaran dibuka" isi={tanggalPanjang(ev.bukaPendaftaran)} />
                <Baris icon={CalendarDays} label="Pendaftaran ditutup" isi={tanggalPanjang(ev.tutupPendaftaran)} />
                <Baris icon={Clock} label="Ujian mulai" isi={tanggalPanjang(ev.mulaiUjian)} />
                <Baris icon={Clock} label="Ujian selesai" isi={tanggalPanjang(ev.selesaiUjian)} />
                <Baris icon={Timer} label="Cara pengerjaan" isi={modelWaktu} />
                <Baris
                  icon={Users}
                  label="Peserta"
                  isi={`${ev.terdaftar} pendaftar`}
                  catatan={ev.kuota > 0 ? `Kuota ${ev.kuota} orang` : 'Tanpa batas kuota'}
                />
                <Baris icon={Trophy} label="Jumlah soal" isi={`${ev.jumlahSoal} soal`} />
                <Baris
                  icon={ShieldCheck}
                  label="Pengawasan"
                  isi={ev.wajibSeb ? 'Wajib lewat Safe Exam Browser' : 'Bisa lewat browser biasa'}
                />
              </div>
            </section>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-24">
            <div className="rounded-2xl border border-maroon-200 bg-maroon-50/40 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-maroon-500">
                Biaya pendaftaran
              </p>
              <p className="mt-1 font-display text-3xl font-semibold text-maroon-600">
                {rupiah(ev.harga)}
              </p>
              <p className="mt-1.5 text-[12px] leading-relaxed text-stone-600">
                Pembayaran lewat transfer, dikonfirmasi manual ke admin lewat WhatsApp.
              </p>
              <div className="mt-4">
                {ev.saya
                  ? <p className="text-[13px] font-semibold text-stone-600">Keadaan pendaftaranmu ada di bawah ↓</p>
                  : <AjakanDaftar ev={ev} identitas={identitas} />}
              </div>
            </div>

            {ev.saya && (
              <KartuPendaftaran
                ev={ev}
                saya={ev.saya}
                onUnduh={unduh}
                sibuk={sibuk}
                pesanUnduh={pesanUnduh}
              />
            )}

            {ev.peringkatPublik && ev.hasilDirilis && (
              <Link
                to={`/event/${ev.slug}/hasil`}
                className="flex items-center gap-2 rounded-2xl border border-alba-200 bg-alba-50 px-5 py-4 text-sm font-semibold text-maroon-600 shadow-card hover:border-maroon-300"
              >
                <Trophy size={16} /> Papan peringkat lomba ini
              </Link>
            )}
          </aside>
        </div>
      </article>
    </LandingLayout>
  );
}
