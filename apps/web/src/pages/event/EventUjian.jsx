import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Clock, LayoutList, Loader2, ShieldCheck, Timer,
} from 'lucide-react';
import { identitasEvent, jamMundur, panggilEvent, tanggalPanjang } from '@/lib/eventLomba';
import { olimpDeviceName, olimpFingerprint } from '@/lib/olimp';
import { isSeb } from '@/lib/seb';
import TandaAirUjian from '@/components/TandaAirUjian';

// LAYAR UJIAN LOMBA (/event/:slug/ujian)
//
// Ini BUKAN layar kuis Web Olimp. Bedanya disengaja dan penting (PRD bagian 8):
//
//   - tidak ada tombol "Cek Jawaban", tidak ada tanda benar/salah
//   - tidak ada pembahasan selama ujian berlangsung
//   - jawaban disimpan per soal ("Simpan & Lanjut"), bukan sekali di akhir,
//     supaya SEB yang tertutup paksa tidak menghapus pekerjaan setengah jalan
//   - peserta boleh kembali ke soal sebelumnya dan mengubah jawaban, tetap
//     tanpa umpan balik apa pun
//
// Sisa waktu dihitung mundur di layar untuk kenyamanan, TAPI yang berkuasa
// tetap server: tiap kali jawaban disimpan, sisa waktunya diselaraskan lagi
// dari jawaban server, dan server menolak jawaban yang masuk lewat batas.
// Jam peramban yang dimajukan karena itu tidak menambah waktu sedetik pun.
//
// Kerangkanya sengaja polos - tanpa header navigasi, tanpa tautan keluar -
// supaya tidak ada yang bisa diklik selain mengerjakan soal.

function Layar({ children }) {
  return (
    <div className="min-h-screen bg-alba-50">
      <div className="h-1 bg-gradient-to-r from-maroon-600 via-gold-400 to-maroon-600" />
      <div className="mx-auto w-full max-w-3xl px-6 py-12">{children}</div>
    </div>
  );
}

function Pesan({ judul, isi, anak }) {
  return (
    <Layar>
      <div className="rounded-2xl border border-alba-200 bg-alba-50 p-8 text-center shadow-card">
        <h1 className="font-display text-2xl font-semibold text-stone-800">{judul}</h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-stone-600">{isi}</p>
        {anak}
      </div>
    </Layar>
  );
}

// KE MANA PESERTA DILEMPAR DARI LAYAR YANG BUNTU
//
// Dulu semua layar penolakan menawarkan satu tautan: halaman publik lomba ini.
// Di dalam SEB itu jalan buntu yang lain - halaman publik penuh tombol yang
// tidak bisa dipakai dari sana, dan tetap tidak menjawab pertanyaan yang
// sebenarnya ("kalau bukan sekarang, kapan? lomba saya yang lain bagaimana?").
//
// Pusat Ujian menjawabnya: daftar semua lomba yang ia ikuti, hitungan mundur
// masing-masing, dan tombol yang menyala sendiri. Jadi dari layar buntu mana
// pun, ke sanalah tujuannya - dan tokennya ikut dibawa supaya ia tidak perlu
// login ulang kalau memang sedang di dalam SEB.
function KePusat({ token, teks = 'Ke Pusat Ujian' }) {
  return (
    <Link
      to={token ? `/ujian?t=${encodeURIComponent(token)}` : '/ujian'}
      className="inline-flex items-center gap-2 rounded-xl bg-maroon-600 px-6 py-2.5 text-sm font-semibold text-alba-50"
    >
      <LayoutList size={15} /> {teks}
    </Link>
  );
}

export default function EventUjian() {
  const { slug } = useParams();
  const [params] = useSearchParams();
  const identitas = identitasEvent();

  // Token dari berkas .seb. Berkas itu membersihkan sesi saat dijalankan
  // (clearSessionOnStart), jadi di dalam SEB peserta SELALU dalam keadaan
  // logout - token inilah yang mengenalinya ke server. Tanpa meneruskannya,
  // peserta yang sudah terdaftar dan sudah di-ACC tetap ditolak "belum
  // terdaftar" (PRD Revisi 2 bagian 6.2).
  const token = params.get('t') || '';

  const [keadaan, setKeadaan] = useState('memuat'); // memuat|siap|mengerjakan|selesai|galat
  const [pesan, setPesan] = useState('');
  const [kode, setKode] = useState('');
  const [ev, setEv] = useState(null);
  const [soal, setSoal] = useState([]);
  const [jawaban, setJawaban] = useState({});
  const [nomor, setNomor] = useState(0);
  const [sisa, setSisa] = useState(null);
  const [sibuk, setSibuk] = useState(false);
  const [tanggalRilis, setTanggalRilis] = useState('');
  // Identitas untuk tanda air. Datang dari SERVER bersama soalnya, bukan dari
  // sesi login: di dalam SEB tidak ada sesi yang bisa dibaca halaman, dan di
  // situlah justru tanda airnya paling perlu ada.
  const [tandaAir, setTandaAir] = useState(null);

  // Dipakai supaya penghitung mundur & auto-kumpul tidak menembak dua kali.
  const sudahKumpul = useRef(false);

  const detail = useCallback(async () => {
    const d = await panggilEvent('/api/event/detail', { query: { slug, t: token } });
    setEv(d);
    return d;
  }, [slug, token]);

  // --- memuat soal (dipanggil setelah "Mulai", dan saat membuka ulang) ---
  const muatSoal = useCallback(async () => {
    const d = await panggilEvent('/api/event/soal', { query: { slug, t: token } });
    setSoal(d.soal || []);
    setTandaAir(d.tandaAir || null);
    const awal = {};
    (d.soal || []).forEach((s) => { if (s.jawabanku) awal[s.id] = s.jawabanku; });
    setJawaban(awal);
    setSisa(d.sisaDetik ?? null);
    if (d.sudahKumpul) {
      sudahKumpul.current = true;
      setKeadaan('selesai');
      return;
    }
    setKeadaan('mengerjakan');
    // Lanjutkan dari soal pertama yang belum dijawab - peserta yang koneksinya
    // putus di tengah tidak perlu menggulung dari nomor satu lagi.
    const pertamaKosong = (d.soal || []).findIndex((s) => !awal[s.id]);
    setNomor(pertamaKosong >= 0 ? pertamaKosong : 0);
  }, [slug, token]);

  // --- pemuatan awal ---
  useEffect(() => {
    let hidup = true;
    (async () => {
      try {
        const d = await detail();
        if (!hidup) return;
        setTanggalRilis(d.tanggalRilis || '');

        // Di dalam SEB tidak ada sesi login sama sekali - yang mengenali
        // peserta cuma token dari berkas .seb. Jadi cukup salah satu ada.
        if (!identitas && !token) { setKeadaan('galat'); setKode('PERLU_MASUK'); return; }
        if (!d.saya) { setKeadaan('galat'); setKode('BELUM_DAFTAR'); return; }
        if (d.saya.status !== 'APPROVED') { setKeadaan('galat'); setKode('BELUM_ACC'); return; }
        if (d.saya.sudahKumpul) { sudahKumpul.current = true; setKeadaan('selesai'); return; }

        if (!d.saya.bolehUjian) {
          setKeadaan('galat');
          setKode(d.saya.kodeJendela || 'TERTUTUP');
          return;
        }
        // Sudah pernah menekan Mulai (mis. koneksi putus lalu masuk lagi):
        // langsung lanjutkan, jangan minta menekan Mulai dua kali.
        if (d.saya.sudahMulai) { await muatSoal(); return; }
        setKeadaan('siap');
      } catch (err) {
        if (!hidup) return;
        setKeadaan('galat');
        setKode(err.kode || '');
        setPesan(err.message || 'Gagal membuka lomba.');
      }
    })();
    return () => { hidup = false; };
    // identitas sengaja tidak masuk daftar: nilainya objek baru tiap render,
    // dan yang menentukan pemuatan ulang cuma slug & tokennya.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail, muatSoal]);

  // --- mengumpulkan ---
  const kumpulkan = useCallback(async (otomatis) => {
    if (sudahKumpul.current) return;
    sudahKumpul.current = true;
    setSibuk(true);
    try {
      const hasil = await panggilEvent('/api/event/selesai', {
        method: 'POST',
        body: { slug, t: token, otomatis: !!otomatis },
      });
      setTanggalRilis(hasil.tanggalRilis || '');
    } catch (_) {
      // Kegagalan jaringan di sini tidak boleh membuat peserta panik: jawaban
      // sudah tersimpan satu per satu sepanjang ujian, dan server menutup
      // sendiri pengerjaan yang lewat batas waktu.
    } finally {
      setSibuk(false);
      setKeadaan('selesai');
    }
  }, [slug, token]);

  // --- penghitung mundur ---
  useEffect(() => {
    if (keadaan !== 'mengerjakan' || sisa === null) return undefined;
    if (sisa <= 0) { kumpulkan(true); return undefined; }
    const t = setTimeout(() => setSisa((s) => (s === null ? null : s - 1)), 1000);
    return () => clearTimeout(t);
  }, [keadaan, sisa, kumpulkan]);

  const mulai = async () => {
    setSibuk(true);
    setPesan('');
    try {
      await panggilEvent('/api/event/mulai', {
        method: 'POST',
        body: {
          slug,
          t: token,
          deviceId: olimpFingerprint(),
          deviceName: olimpDeviceName(),
          userAgent: navigator.userAgent || '',
          seb: isSeb(),
        },
      });
      await muatSoal();
    } catch (err) {
      setPesan(err.message || 'Gagal memulai ujian.');
      setKode(err.kode || '');
    } finally {
      setSibuk(false);
    }
  };

  // Menyimpan satu jawaban. Dipanggil saat peserta memilih opsi - jadi
  // "Simpan & Lanjut" cuma berpindah nomor, tidak menyimpan ulang.
  const simpanJawaban = async (soalId, pilih) => {
    setJawaban((j) => ({ ...j, [soalId]: pilih }));
    try {
      const hasil = await panggilEvent('/api/event/jawab', {
        method: 'POST',
        body: { slug, t: token, soal: soalId, jawaban: pilih, deviceId: olimpFingerprint() },
      });
      // Sisa waktu diselaraskan dari server tiap kali menyimpan - inilah yang
      // membuat jam peramban yang dimajukan tidak berguna.
      if (typeof hasil.sisaDetik === 'number') setSisa(hasil.sisaDetik);
    } catch (err) {
      if (err.kode === 'WAKTU_HABIS' || err.kode === 'SUDAH_SELESAI') {
        kumpulkan(true);
        return;
      }
      setPesan(err.message || 'Jawaban gagal tersimpan. Periksa koneksimu.');
    }
  };

  // -------------------------------------------------------------------------
  // Tampilan
  // -------------------------------------------------------------------------

  if (keadaan === 'memuat') {
    return <Pesan judul="Menyiapkan lomba…" isi="Sebentar ya." />;
  }

  if (keadaan === 'galat') {
    if (kode === 'PERLU_MASUK') {
      return (
        <Pesan
          judul="Masuk dulu"
          isi="Layar ujian cuma bisa dibuka peserta yang sudah terdaftar dan disetujui. Masuk lewat Pusat Ujian dulu."
          anak={<div className="mt-5"><KePusat token={token} teks="Masuk lewat Pusat Ujian" /></div>}
        />
      );
    }
    if (kode === 'BELUM_MULAI') {
      return (
        <Pesan
          judul="Ujian belum dimulai"
          isi={`Ujian dibuka ${tanggalPanjang(ev?.mulaiUjian)}. Di Pusat Ujian ada hitungan mundurnya, dan tombolnya menyala sendiri begitu waktunya tiba.`}
          anak={(
            <div className="mt-5 space-y-4">
              <p className="inline-flex items-center gap-2 rounded-xl bg-alba-100 px-4 py-2.5 text-sm font-semibold text-stone-700">
                <Clock size={15} className="text-maroon-500" /> {tanggalPanjang(ev?.mulaiUjian)}
              </p>
              <div><KePusat token={token} /></div>
            </div>
          )}
        />
      );
    }
    if (kode === 'SEB_REQUIRED' || kode === 'SEB_MISMATCH') {
      return (
        <Pesan
          judul="Harus lewat Safe Exam Browser"
          isi={pesan}
          anak={
            <Link to={`/event/${slug}`} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-maroon-600 px-6 py-2.5 text-sm font-semibold text-alba-50">
              <ShieldCheck size={15} /> Unduh berkas konfigurasi
            </Link>
          }
        />
      );
    }
    return (
      <Pesan
        judul="Belum bisa dibuka"
        isi={pesan || {
          BELUM_DAFTAR: 'Kamu belum terdaftar di lomba ini.',
          BELUM_ACC: 'Pendaftaranmu belum disetujui admin.',
          SUDAH_SELESAI: 'Jendela waktu ujian sudah ditutup.',
          WAKTU_HABIS: 'Waktu pengerjaanmu sudah habis.',
        }[kode] || 'Layar ujian belum bisa dibuka.'}
        anak={<div className="mt-5"><KePusat token={token} /></div>}
      />
    );
  }

  if (keadaan === 'selesai') {
    return (
      <Pesan
        judul="Terima kasih sudah mengerjakan"
        isi={
          tanggalRilis
            ? `Jawabanmu sudah tersimpan. Hasil akan diumumkan pada ${tanggalPanjang(tanggalRilis)}.`
            : 'Jawabanmu sudah tersimpan. Hasil akan diumumkan setelah semua peserta selesai mengerjakan.'
        }
        anak={
          <div className="mt-6 space-y-3">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700">
              <CheckCircle2 size={16} /> Jawaban tersimpan
            </p>
            <div>
              <Link
                to={isSeb() ? (token ? `/ujian?t=${encodeURIComponent(token)}` : '/ujian') : `/event/${slug}`}
                className="inline-block rounded-xl border border-alba-300 px-6 py-2.5 text-sm font-semibold text-stone-700"
              >
                {isSeb() ? 'Kembali ke Pusat Ujian' : 'Kembali ke halaman lomba'}
              </Link>
            </div>
            {isSeb() && (
              <p className="text-[12px] leading-relaxed text-stone-500">
                Kamu masih di dalam Safe Exam Browser. Tekan tombol keluar di pojok layar
                dan masukkan kata sandi keluar dari admin untuk menutupnya.
              </p>
            )}
          </div>
        }
      />
    );
  }

  // --- layar "Mulai Ujian" ---
  if (keadaan === 'siap') {
    const menit = ev?.durasiMenit || 0;
    return (
      <Pesan
        judul={ev?.nama || 'Lomba'}
        isi={
          ev?.modelWaktu === 'PERSONAL_DURATION'
            ? `Begitu kamu menekan Mulai, timer pribadimu berjalan ${menit} menit dan tidak bisa dijeda. Pastikan koneksimu siap sebelum menekannya.`
            : 'Ujian ini dikerjakan serentak. Waktumu berakhir bersamaan dengan peserta lain, jadi mulailah sekarang.'
        }
        anak={
          <div className="mt-6 space-y-4">
            <div className="rounded-xl border border-gold-200 bg-gold-100/50 px-4 py-3 text-left">
              <p className="inline-flex items-center gap-2 text-[13px] font-semibold text-gold-600">
                <AlertTriangle size={14} /> Sebelum menekan Mulai
              </p>
              <ul className="mt-1.5 space-y-1 text-[12px] leading-relaxed text-stone-600">
                <li>· Perangkat ini akan dikunci untuk lomba ini — pindah perangkat perlu izin admin.</li>
                <li>· Tidak ada tanda benar/salah selama mengerjakan. Hasil diumumkan belakangan.</li>
                <li>· Jawaban tersimpan otomatis tiap kali kamu memilih opsi.</li>
              </ul>
            </div>
            {pesan && (
              <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-left text-sm text-red-700">{pesan}</p>
            )}
            <button
              onClick={mulai}
              disabled={sibuk}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-maroon-600 px-6 py-3 text-sm font-semibold text-alba-50 transition-colors hover:bg-maroon-700 disabled:opacity-50"
            >
              {sibuk ? <Loader2 size={16} className="animate-spin" /> : <Timer size={16} />}
              {sibuk ? 'Menyiapkan…' : 'Mulai Ujian'}
            </button>
          </div>
        }
      />
    );
  }

  // --- layar mengerjakan ---
  const aktif = soal[nomor];
  const dijawab = Object.keys(jawaban).filter((k) => jawaban[k]).length;
  const opsiTersedia = aktif
    ? ['A', 'B', 'C', 'D', 'E'].filter((k) => (aktif.opsi[k] || '').trim() !== '')
    : [];
  const hampirHabis = sisa !== null && sisa <= 300;

  return (
    <div className="min-h-screen bg-alba-50">
      <div className="h-1 bg-gradient-to-r from-maroon-600 via-gold-400 to-maroon-600" />

      {/* Tanda air identitas. Menutupi SELURUH layar, termasuk gambar soal -
          foto sepotong pun ikut membawa nama pemotretnya. */}
      <TandaAirUjian
        aktif={tandaAir?.aktif}
        nama={tandaAir?.nama}
        email={tandaAir?.email}
        kode={tandaAir?.kode}
      />

      {/* Bilah atas: nomor soal, sisa waktu, nama lomba (PRD 8.2) */}
      <header className="sticky top-0 z-20 border-b border-alba-200 bg-alba-50/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-3 px-6 py-3">
          <div className="min-w-0">
            <p className="font-display text-sm font-semibold text-stone-800">
              Soal {nomor + 1} dari {soal.length}
            </p>
            <p className="truncate text-[11px] text-stone-500">{ev?.nama}</p>
          </div>
          <div
            className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 font-display text-lg font-semibold tabular-nums ${
              hampirHabis
                ? 'animate-pulse border-red-200 bg-red-50 text-red-700'
                : 'border-alba-300 bg-alba-100 text-stone-800'
            }`}
          >
            <Clock size={15} />
            {sisa === null ? '—' : jamMundur(sisa)}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-6 py-8">
        {pesan && (
          <p className="mb-4 rounded-xl border border-gold-200 bg-gold-100/60 px-4 py-3 text-sm text-gold-600">
            {pesan}
          </p>
        )}

        {aktif && (
          <>
            <div className="rounded-2xl border border-alba-200 bg-alba-50 p-6 shadow-card">
              {aktif.gambar && (
                <img src={aktif.gambar} alt="" className="mb-4 max-h-80 w-full rounded-xl object-contain" />
              )}
              <div
                className="text-[15px] leading-relaxed text-stone-800 [&_em]:italic [&_p]:mb-3 [&_strong]:font-semibold"
                dangerouslySetInnerHTML={{ __html: aktif.teks || '' }}
              />
            </div>

            <div className="mt-4 space-y-2.5">
              {opsiTersedia.map((k) => {
                const dipilih = jawaban[aktif.id] === k;
                return (
                  <button
                    key={k}
                    onClick={() => simpanJawaban(aktif.id, k)}
                    className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                      dipilih
                        ? 'border-maroon-300 bg-maroon-50 ring-1 ring-maroon-200'
                        : 'border-alba-200 bg-alba-50 hover:border-maroon-200 hover:bg-maroon-50/40'
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${
                        dipilih ? 'bg-maroon-600 text-alba-50' : 'bg-alba-200 text-stone-600'
                      }`}
                    >
                      {k}
                    </span>
                    <span className="min-w-0 flex-1 text-sm leading-relaxed text-stone-800">
                      {aktif.opsi[k]}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Sengaja TIDAK ada tombol "Cek Jawaban" di sini. */}
            <div className="mt-6 flex items-center justify-between gap-3">
              <button
                onClick={() => setNomor((n) => Math.max(0, n - 1))}
                disabled={nomor === 0}
                className="inline-flex items-center gap-1.5 rounded-xl border border-alba-300 px-4 py-2.5 text-sm font-semibold text-stone-700 transition-colors hover:border-maroon-300 disabled:opacity-40"
              >
                <ChevronLeft size={15} /> Sebelumnya
              </button>

              {nomor < soal.length - 1 ? (
                <button
                  onClick={() => setNomor((n) => Math.min(soal.length - 1, n + 1))}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-maroon-600 px-5 py-2.5 text-sm font-semibold text-alba-50 transition-colors hover:bg-maroon-700"
                >
                  Simpan &amp; Lanjut <ChevronRight size={15} />
                </button>
              ) : (
                <button
                  onClick={() => {
                    const belum = soal.length - dijawab;
                    const tanya = belum > 0
                      ? `Masih ada ${belum} soal yang belum dijawab. Kumpulkan sekarang?`
                      : 'Kumpulkan jawabanmu sekarang? Setelah dikumpulkan, jawaban tidak bisa diubah lagi.';
                    if (window.confirm(tanya)) kumpulkan(false);
                  }}
                  disabled={sibuk}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-alba-50 transition-colors hover:bg-emerald-700 disabled:opacity-50"
                >
                  <CheckCircle2 size={15} /> Kumpulkan
                </button>
              )}
            </div>
          </>
        )}

        {/* Navigasi nomor soal - yang sudah dijawab ditandai TERISI, bukan
            BENAR: tidak ada satu pun petunjuk benar/salah di layar ini. */}
        <nav className="mt-8 rounded-2xl border border-alba-200 bg-alba-50 p-4 shadow-card">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
              Navigasi soal
            </p>
            <p className="text-[12px] font-semibold text-stone-600">
              {dijawab}/{soal.length} terisi
            </p>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {soal.map((s, i) => {
              const terisi = !!jawaban[s.id];
              const ini = i === nomor;
              return (
                <button
                  key={s.id}
                  onClick={() => setNomor(i)}
                  className={`h-8 w-8 rounded-lg text-[12px] font-semibold transition-colors ${
                    ini
                      ? 'bg-maroon-600 text-alba-50'
                      : terisi
                        ? 'bg-maroon-100 text-maroon-600 hover:bg-maroon-200'
                        : 'bg-alba-200 text-stone-500 hover:bg-alba-300'
                  }`}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
        </nav>
      </main>
    </div>
  );
}
