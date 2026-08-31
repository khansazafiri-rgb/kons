import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle, CalendarClock, CheckCircle2, ClipboardList, Clock, FileWarning,
  KeyRound, ListChecks, Loader2, LogOut, ShieldCheck, Trophy, User,
} from 'lucide-react';
import {
  jamMundur, keluarPeserta, masukPeserta, panggilEvent,
  tanggalPanjang, TIPE_EVENT,
} from '@/lib/eventLomba';
import { isSeb } from '@/lib/seb';

// PUSAT UJIAN (/ujian) — ruang tunggu bersama untuk semua lomba
//
// MASALAH YANG DIPECAHKAN
//
// Berkas .seb dulu menunjuk langsung ke halaman ujian satu lomba. Peserta yang
// membukanya di luar jam ujian - mencoba berkasnya sehari sebelumnya, atau
// datang kepagian - disambut satu kalimat: "belum waktunya ujian". Layarnya
// buntu. Tidak ada keterangan kapan ujiannya mulai, tidak ada cara melihat
// lomba lain yang mungkin justru sedang berjalan untuknya, dan tidak ada yang
// bisa ditekan.
//
// Padahal satu orang bisa terdaftar di beberapa lomba dengan tanggal yang
// berbeda-beda. Yang ia butuhkan bukan pintu ke satu lomba, tapi ruang tunggu:
// daftar lomba yang ia ikuti, jadwal masing-masing, hitungan mundur, dan tombol
// yang menyala sendiri begitu waktunya tiba.
//
// SATU LAYAR, BANYAK KONFIGURASI
//
// Tiap lomba tetap punya berkas .seb-nya sendiri (kunci, kata sandi keluar, dan
// daftar alamat yang diizinkan memang berbeda-beda). Yang disatukan bukan
// konfigurasinya, melainkan LAYARNYA: berkas mana pun yang dijalankan mendarat
// di halaman yang sama, dengan alur yang sama - login, lihat daftar, masuk.
//
// HITUNGAN MUNDUR TIDAK MEMAKAI JAM KOMPUTER PESERTA
//
// Server mengirim `sekarang` bersama daftarnya. Halaman menghitung selisih
// dengan jamnya sendiri SEKALI, lalu memakai selisih itu seterusnya. Peserta
// yang memundurkan jam komputernya tidak mendapat tambahan waktu sedetik pun -
// dan yang jamnya kebetulan meleset tidak melihat hitungan yang ngawur.
//
// Yang memutuskan boleh-tidaknya masuk tetap server (`bolehUjian` dari
// endpoint). Halaman ini tidak menghitung ulang jadwal; kalau ia menghitung
// sendiri, cepat atau lambat akan ada dua pendapat yang berbeda soal apakah
// ujian sudah dibuka.

function Layar({ children }) {
  return (
    <div className="min-h-screen bg-alba-50">
      <div className="h-1 bg-gradient-to-r from-maroon-600 via-gold-400 to-maroon-600" />
      <div className="mx-auto w-full max-w-3xl px-5 py-10 sm:px-6 sm:py-14">{children}</div>
    </div>
  );
}

function Kepala({ peserta, onKeluar }) {
  return (
    <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-maroon-600">
          PCV Classroom
        </p>
        <h1 className="mt-1 font-display text-3xl font-semibold text-stone-800">Pusat Ujian</h1>
        <p className="mt-1.5 text-sm text-stone-600">
          Semua lomba yang kamu ikuti ada di sini, lengkap dengan jadwalnya.
        </p>
      </div>
      {peserta && (
        <div className="rounded-2xl border border-alba-200 bg-white px-4 py-3 text-right shadow-card">
          <p className="flex items-center justify-end gap-1.5 text-[13px] font-semibold text-stone-800">
            <User size={13} className="text-stone-400" /> {peserta.nama || peserta.email}
          </p>
          <p className="text-[11px] text-stone-500">{peserta.email}</p>
          <button
            onClick={onKeluar}
            className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-stone-500 hover:text-maroon-600"
          >
            <LogOut size={11} /> Keluar
          </button>
        </div>
      )}
    </header>
  );
}

// --- Layar masuk -----------------------------------------------------------
//
// Satu kotak isian untuk dua jenis akun (PCV dan Web Olimp). Di dalam SEB
// peserta tidak punya cara memilih - yang ada cuma layar ini - jadi yang mana
// akunnya ditebak sendiri oleh masukPeserta().
function LayarMasuk({ onMasuk, catatanBerkas }) {
  const [identity, setIdentity] = useState('');
  const [password, setPassword] = useState('');
  const [sibuk, setSibuk] = useState(false);
  const [error, setError] = useState('');

  const kirim = async (e) => {
    e.preventDefault();
    setError('');
    setSibuk(true);
    try {
      await masukPeserta(identity, password);
      await onMasuk();
    } catch (err) {
      setError(err?.message || 'Gagal masuk.');
      setSibuk(false);
    }
  };

  const input = 'w-full rounded-xl border border-alba-300 bg-alba-50 px-4 py-3 text-sm '
    + 'focus:outline-none focus:border-maroon-400 focus:ring-4 focus:ring-maroon-600/10 transition';

  return (
    <div className="mx-auto max-w-md">
      <div className="rounded-2xl border border-alba-200 bg-white p-7 shadow-card">
        <div className="mb-5 flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-maroon-50 text-maroon-600">
            <KeyRound size={16} />
          </span>
          <div>
            <h2 className="font-display text-lg font-semibold text-stone-800">Masuk dulu</h2>
            <p className="text-[12px] text-stone-500">
              Pakai akun PCV atau akun Web Olimp — sama saja, keduanya diterima.
            </p>
          </div>
        </div>

        {catatanBerkas && (
          <p className="mb-4 rounded-xl border border-gold-200 bg-gold-50 px-4 py-3 text-[12px] leading-relaxed text-gold-700">
            {catatanBerkas}
          </p>
        )}

        <form onSubmit={kirim} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-[13px] font-semibold text-stone-700">
              Email / Login ID
            </label>
            <input
              type="text"
              required
              autoCapitalize="none"
              autoCorrect="off"
              value={identity}
              onChange={(ev) => setIdentity(ev.target.value)}
              className={input}
              placeholder="email yang kamu pakai mendaftar"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-semibold text-stone-700">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
              className={input}
              placeholder="••••••••"
            />
          </div>
          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={sibuk}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-maroon-600 px-5 py-3 text-sm font-bold text-alba-50 transition hover:bg-maroon-700 disabled:opacity-60"
          >
            {sibuk ? <Loader2 size={15} className="animate-spin" /> : <ShieldCheck size={15} />}
            {sibuk ? 'Memeriksa…' : 'Masuk'}
          </button>
        </form>
      </div>

      <p className="mt-5 text-center text-[12px] leading-relaxed text-stone-500">
        Lupa password, atau akunmu belum bisa dipakai? Hubungi admin — di dalam
        Safe Exam Browser kamu tidak bisa membuka halaman lain untuk mengurusnya
        sendiri.
      </p>
    </div>
  );
}

// --- Satu baris lomba ------------------------------------------------------

// Kalimat status + warnanya. Sengaja satu tempat: tiap keadaan cuma boleh punya
// satu kalimat, supaya peserta tidak menerima dua keterangan berbeda untuk hal
// yang sama di dua sudut layar.
function keadaanLomba(d, sisaMulai) {
  if (!d.disetujui) {
    if (d.statusBayar === 'REJECTED') {
      return {
        nada: 'merah',
        judul: 'Pendaftaran ditolak',
        isi: d.alasanTolak
          ? `Alasan dari admin: ${d.alasanTolak}`
          : 'Hubungi admin kalau menurutmu ini keliru.',
      };
    }
    if (d.statusBayar === 'CANCELLED') {
      return { nada: 'abu', judul: 'Pendaftaran dibatalkan', isi: 'Hubungi admin kalau mau ikut lagi.' };
    }
    return {
      nada: 'kuning',
      judul: 'Menunggu ACC admin',
      isi: 'Pembayaranmu belum dikonfirmasi. Kamu belum bisa masuk ujian sampai admin menyetujuinya.',
    };
  }
  if (d.sudahKumpul) {
    return {
      nada: 'hijau',
      judul: 'Jawabanmu sudah dikumpulkan',
      isi: d.hasilDirilis ? 'Hasilnya sudah dirilis.' : 'Hasil keluar setelah dirilis admin.',
    };
  }
  if (d.kodeJendela === 'BELUM_MULAI') {
    return {
      nada: 'biru',
      judul: sisaMulai ? `Mulai dalam ${sisaMulai}` : 'Ujian belum dibuka',
      isi: `Tombolnya menyala sendiri pada ${tanggalPanjang(d.mulaiUjian)}. Tidak perlu memuat ulang halaman.`,
    };
  }
  if (d.kodeJendela === 'SUDAH_SELESAI') {
    return { nada: 'abu', judul: 'Ujian sudah ditutup', isi: 'Jendela waktunya sudah lewat.' };
  }
  if (d.kodeJendela === 'WAKTU_HABIS') {
    return { nada: 'abu', judul: 'Waktu pengerjaanmu habis', isi: 'Jawaban yang sempat tersimpan tetap dinilai.' };
  }
  if (d.sudahMulai) {
    return { nada: 'merah', judul: 'Ujian sedang berjalan', isi: 'Lanjutkan dari soal terakhir yang kamu kerjakan.' };
  }
  return { nada: 'hijau', judul: 'Ujian sudah dibuka', isi: 'Silakan mulai kapan saja selama jendela waktunya masih terbuka.' };
}

const NADA = {
  hijau: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  biru: 'border-sky-200 bg-sky-50 text-sky-800',
  kuning: 'border-gold-200 bg-gold-50 text-gold-700',
  merah: 'border-maroon-200 bg-maroon-50 text-maroon-700',
  abu: 'border-alba-300 bg-alba-100 text-stone-600',
};

function Baris({ d, sekarangMs }) {
  const tipe = TIPE_EVENT[d.tipe] || TIPE_EVENT.LOMBA;

  // Hitungan mundur ke jam mulai. Memakai jam server yang sudah diselaraskan,
  // bukan Date.now() mentah.
  const keMulai = d.mulaiUjian ? new Date(d.mulaiUjian).getTime() - sekarangMs : 0;
  const sisaMulai = d.kodeJendela === 'BELUM_MULAI' && keMulai > 0
    ? jamMundur(Math.floor(keMulai / 1000))
    : '';

  // Sisa waktu pengerjaan - HANYA untuk yang ujiannya sudah benar-benar
  // berjalan. Sebelum menekan Mulai, `batas` masih berupa penutupan jendela
  // lomba, bukan jam pribadinya; menampilkannya sebagai "sisa waktu" membuat
  // peserta mengira waktunya sudah berjalan padahal belum.
  const keBatas = d.batas ? new Date(d.batas).getTime() - sekarangMs : 0;
  const sisaKerja = d.sudahMulai && !d.sudahKumpul && d.bolehUjian && keBatas > 0
    ? jamMundur(Math.floor(keBatas / 1000))
    : '';

  const k = keadaanLomba(d, sisaMulai);

  return (
    <article className="rounded-2xl border border-alba-200 bg-white p-5 shadow-card sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${tipe.cls}`}>
              {tipe.teks}
            </span>
            {d.iniBerkasnya && (
              <span className="inline-flex items-center gap-1 rounded-full border border-maroon-200 bg-maroon-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-maroon-600">
                <ShieldCheck size={10} /> Berkas ini
              </span>
            )}
          </div>
          <h3 className="mt-2 font-display text-xl font-semibold text-stone-800">{d.nama}</h3>
          {d.subjek && <p className="text-[12px] text-stone-500">{d.subjek}</p>}
        </div>

        {sisaKerja && (
          <div className="rounded-xl border border-maroon-200 bg-maroon-50 px-3.5 py-2 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-maroon-500">Sisa waktu</p>
            <p className="font-mono text-lg font-bold tabular-nums text-maroon-700">{sisaKerja}</p>
          </div>
        )}
      </div>

      <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
        <Fakta ikon={CalendarClock} label="Ujian mulai" nilai={tanggalPanjang(d.mulaiUjian)} />
        <Fakta ikon={CalendarClock} label="Ujian selesai" nilai={tanggalPanjang(d.selesaiUjian)} />
        {d.durasiMenit ? (
          <Fakta ikon={Clock} label="Durasi" nilai={`${d.durasiMenit} menit`} />
        ) : null}
        {d.modelWaktu ? (
          <Fakta
            ikon={ListChecks}
            label="Cara pengerjaan"
            nilai={d.modelWaktu === 'PERSONAL_DURATION'
              ? 'Hitung mundur sejak kamu menekan Mulai'
              : 'Serentak, mengikuti jendela waktu di atas'}
          />
        ) : null}
      </div>

      <div className={`mt-4 rounded-xl border px-4 py-3 ${NADA[k.nada]}`}>
        <p className="text-[13px] font-bold">{k.judul}</p>
        <p className="mt-0.5 text-[12px] leading-relaxed opacity-90">{k.isi}</p>
      </div>

      {d.perluBerkasLain && (
        <p className="mt-3 flex items-start gap-2 rounded-xl border border-gold-200 bg-gold-50 px-4 py-3 text-[12px] leading-relaxed text-gold-700">
          <FileWarning size={14} className="mt-0.5 shrink-0" />
          <span>
            Lomba ini memakai berkas Safe Exam Browser sendiri, berbeda dari yang
            sedang kamu jalankan. Keluar dari SEB, lalu buka berkas .seb milik
            lomba ini — kalau dipaksa dari sini, servernya akan menolak.
          </span>
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {d.bolehUjian && (
          <Link
            to={`/event/${d.slug}/ujian`}
            className="inline-flex items-center gap-2 rounded-xl bg-maroon-600 px-5 py-2.5 text-[13px] font-bold text-alba-50 transition hover:bg-maroon-700"
          >
            <ClipboardList size={14} />
            {d.sudahMulai ? 'Lanjutkan Ujian' : 'Mulai Ujian'}
          </Link>
        )}
        {d.sudahKumpul && d.hasilDirilis && (
          <Link
            to={`/event/${d.slug}/hasil`}
            className="inline-flex items-center gap-2 rounded-xl border border-alba-300 px-5 py-2.5 text-[13px] font-bold text-stone-700 transition hover:border-maroon-300"
          >
            <Trophy size={14} /> Lihat Hasil
          </Link>
        )}
      </div>
    </article>
  );
}

function Fakta({ ikon: Ikon, label, nilai }) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-alba-200 bg-alba-50 px-3.5 py-2.5">
      <Ikon size={13} className="mt-0.5 shrink-0 text-stone-400" />
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">{label}</p>
        <p className="text-[12.5px] font-semibold leading-snug text-stone-700">{nilai}</p>
      </div>
    </div>
  );
}

// --- Halaman ---------------------------------------------------------------

export default function PusatUjian() {
  const [params] = useSearchParams();
  const token = params.get('t') || '';

  const [data, setData] = useState(null);
  const [keadaan, setKeadaan] = useState('memuat'); // memuat | siap | masuk | galat
  const [pesan, setPesan] = useState('');

  // Selisih jam server dengan jam peramban, dihitung sekali saat data datang.
  // Semua hitungan mundur memakai ini - lihat catatan panjang di atas.
  const selisihRef = useRef(0);
  const [sekarangMs, setSekarangMs] = useState(Date.now());

  const muat = useCallback(async () => {
    setKeadaan('memuat');
    setPesan('');
    try {
      const hasil = await panggilEvent('/api/event/saya', {
        query: token ? { t: token } : undefined,
      });
      const jamServer = new Date(hasil.sekarang).getTime();
      if (Number.isFinite(jamServer)) selisihRef.current = jamServer - Date.now();
      setSekarangMs(Date.now() + selisihRef.current);
      setData(hasil);
      // Token saja cukup untuk melihat satu lomba, tapi peserta tetap diminta
      // login supaya lomba-lombanya yang lain ikut kelihatan.
      setKeadaan(hasil.perluLogin ? 'masuk' : 'siap');
    } catch (err) {
      if (err?.status === 401) { setData(null); setKeadaan('masuk'); return; }
      setPesan(err?.message || 'Gagal memuat daftar lomba.');
      setKeadaan('galat');
    }
  }, [token]);

  useEffect(() => { muat(); }, [muat]);

  // Detak sekali per detik untuk hitungan mundur. Berhenti sendiri saat tidak
  // ada yang perlu dihitung, supaya halaman ini tidak menyala terus tanpa guna
  // di komputer peserta yang sedang menunggu berjam-jam.
  const adaHitungan = (data?.daftar || []).some(
    (d) => d.kodeJendela === 'BELUM_MULAI' || (d.bolehUjian && d.batas),
  );
  useEffect(() => {
    if (!adaHitungan) return undefined;
    const id = setInterval(() => setSekarangMs(Date.now() + selisihRef.current), 1000);
    return () => clearInterval(id);
  }, [adaHitungan]);

  // Begitu hitungan mundur menyentuh nol, keadaan "boleh masuk" ada di server,
  // bukan di sini - jadi daftarnya diambil ulang sekali. Tanpa ini peserta harus
  // menekan muat ulang sendiri tepat di detik ujian dibuka.
  const sudahMintaUlang = useRef(false);
  useEffect(() => {
    if (sudahMintaUlang.current) return;
    const lewat = (data?.daftar || []).some(
      (d) => d.kodeJendela === 'BELUM_MULAI'
        && d.mulaiUjian
        && new Date(d.mulaiUjian).getTime() <= sekarangMs,
    );
    if (lewat) {
      sudahMintaUlang.current = true;
      muat().finally(() => { sudahMintaUlang.current = false; });
    }
  }, [sekarangMs, data, muat]);

  const keluar = () => {
    keluarPeserta();
    setData(null);
    setKeadaan('masuk');
  };

  if (keadaan === 'memuat') {
    return (
      <Layar>
        <div className="flex items-center justify-center gap-2 py-24 text-sm text-stone-500">
          <Loader2 size={16} className="animate-spin" /> Memuat daftar lombamu…
        </div>
      </Layar>
    );
  }

  if (keadaan === 'masuk') {
    // Kalau berkas .seb-nya dikenali, sebut lombanya sekarang juga - peserta
    // jadi tahu ia membuka berkas yang benar sebelum sempat salah sangka.
    const punyaBerkas = data?.daftar?.find((d) => d.iniBerkasnya);
    return (
      <Layar>
        <Kepala peserta={null} />
        <LayarMasuk
          onMasuk={muat}
          catatanBerkas={punyaBerkas
            ? `Berkas yang kamu jalankan ini untuk ${punyaBerkas.nama}. Masuk dengan akun yang kamu pakai mendaftar lomba itu.`
            : ''}
        />
      </Layar>
    );
  }

  if (keadaan === 'galat') {
    return (
      <Layar>
        <Kepala peserta={null} />
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
          <AlertTriangle size={22} className="mx-auto text-red-500" />
          <p className="mt-2 text-sm font-semibold text-red-800">{pesan}</p>
          <button
            onClick={muat}
            className="mt-4 rounded-xl bg-maroon-600 px-5 py-2.5 text-[13px] font-bold text-alba-50 hover:bg-maroon-700"
          >
            Coba lagi
          </button>
        </div>
      </Layar>
    );
  }

  const daftar = data?.daftar || [];

  return (
    <Layar>
      <Kepala peserta={data?.peserta} onKeluar={keluar} />

      {daftar.length === 0 ? (
        <div className="rounded-2xl border border-alba-200 bg-white p-8 text-center shadow-card">
          <ClipboardList size={22} className="mx-auto text-stone-300" />
          <h2 className="mt-3 font-display text-xl font-semibold text-stone-800">
            Belum ada lomba yang kamu ikuti
          </h2>
          <p className="mx-auto mt-2 max-w-md text-[13px] leading-relaxed text-stone-600">
            Akun ini belum terdaftar di lomba mana pun — atau pendaftarannya
            dipakai akun lain. Kalau kamu yakin sudah mendaftar, coba keluar lalu
            masuk lagi dengan akun yang kamu pakai saat mendaftar.
          </p>
          {!isSeb() && (
            <Link
              to="/event"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-maroon-600 px-5 py-2.5 text-[13px] font-bold text-alba-50 hover:bg-maroon-700"
            >
              Lihat lomba yang dibuka
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {daftar.map((d) => (
            <Baris key={d.pendaftaranId} d={d} sekarangMs={sekarangMs} />
          ))}
        </div>
      )}

      <div className="mt-8 rounded-2xl border border-alba-200 bg-alba-100 px-5 py-4">
        <p className="flex items-start gap-2 text-[12px] leading-relaxed text-stone-600">
          <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-stone-400" />
          <span>
            Halaman ini menyegarkan hitungannya sendiri dan membuka tombol ujian
            begitu waktunya tiba — kamu tidak perlu menutup lalu membuka SEB
            lagi. Jamnya mengikuti jam server, bukan jam komputermu.
          </span>
        </p>
      </div>
    </Layar>
  );
}
