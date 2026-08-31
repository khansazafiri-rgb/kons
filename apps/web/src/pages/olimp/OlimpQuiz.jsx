import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle, BookOpenCheck, CheckCircle2, ChevronLeft, ChevronRight, CloudOff,
  Flag, Lightbulb, ListChecks, RotateCcw, XCircle,
} from 'lucide-react';
import pbo from '@/lib/olimpClient';
import { useOlimpAuth } from '@/context/OlimpAuthContext';
import OlimpShell, { OlimpGate } from '@/components/olimp/OlimpShell';
import TandaAirUjian from '@/components/TandaAirUjian';
import { ambilInfoSeb } from '@/lib/seb';
import {
  canOpenPackage, cognitiveLabel, formatClock, olimpLog, questionOptions, questionSeconds,
} from '@/lib/olimp';
import Explanation from '@/components/olimp/Explanation';

// LAYAR KUIS (PRD 6.2-6.6).
//
// Bedanya dengan Simulasi CBT di web PCV: di sini tidak ada "submit lalu baru
// dinilai". Tiap soal dicek saat itu juga lewat tombol Cek Jawaban, pembahasan
// 8 bagian langsung terbuka, dan siswa boleh mengulang soal yang sama. Nilainya
// tetap dicatat - yang dihitung adalah jawaban PERTAMA per soal, supaya
// mengulang tidak dipakai untuk menaikkan angka.
//
// Penyimpanan: jawaban disimpan ke server tiap 5 detik SELAMA ada perubahan
// (PRD 13.1). Kalau koneksi putus, jawaban tetap tersimpan di localStorage dan
// dikirim ulang begitu online - jadi kuis tidak perlu diulang dari awal.

const SIMPAN_TIAP_MS = 5000;
const cadanganKey = (attemptId) => `olimp_attempt_${attemptId}`;

function OlimpQuizInner() {
  const { packageId } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const sesi = useOlimpAuth();
  const { user } = sesi;

  const [pkg, setPkg] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [attempt, setAttempt] = useState(null);
  const [answers, setAnswers] = useState({});
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [showReasons, setShowReasons] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [online, setOnline] = useState(() => navigator.onLine);
  const [tersimpan, setTersimpan] = useState(true);
  const [selesai, setSelesai] = useState(false);
  // Saklar tanda air, dibaca dari pengaturan SEB global. Bawaannya MENYALA:
  // kalau pengaturannya gagal diambil (atau belum pernah dibuat), yang benar
  // adalah tetap menandai, bukan diam-diam berhenti menandai.
  const [tandaAirAktif, setTandaAirAktif] = useState(true);

  const kotor = useRef(false);           // ada perubahan yang belum tersimpan
  const mulaiSoal = useRef(Date.now());  // penanda waktu masuk soal ini
  const jawabanRef = useRef({});         // salinan terkini untuk timer & unload

  // Dibaca lewat /api/olimp/seb-info, BUKAN dari collection olimp_seb langsung:
  // baris itu memuat kata sandi keluar dan kunci SEB, jadi aturannya memang
  // tertutup untuk peserta - membacanya dari sini akan selalu gagal, dan
  // saklarnya jadi tidak pernah benar-benar berlaku.
  useEffect(() => {
    let hidup = true;
    ambilInfoSeb().then((info) => {
      if (!hidup) return;
      // `terpasang: false` berarti pengaturannya belum pernah dibuat. Yang benar
      // di keadaan itu adalah tetap menandai, bukan diam-diam berhenti.
      if (info?.terpasang && typeof info.tandaAir === 'boolean') setTandaAirAktif(info.tandaAir);
    });
    return () => { hidup = false; };
  }, []);

  // --- muat paket + soal + attempt -----------------------------------------
  useEffect(() => {
    let hidup = true;
    (async () => {
      try {
        const p = await pbo.collection('olimp_packages').getOne(packageId);
        if (!hidup) return;
        setPkg(p);
        const ids = Array.isArray(p.questionIds) ? p.questionIds : [];
        const soal = ids.length
          ? await pbo.collection('olimp_questions').getFullList({ filter: ids.map((id) => `id = "${id}"`).join(' || ') })
          : [];
        if (!hidup) return;
        const urut = ids.map((id) => soal.find((s) => s.id === id)).filter(Boolean);
        setQuestions(urut);

        // Attempt mana yang dipakai:
        //   ?attempt=<id> -> lanjutkan yang itu
        //   ?baru=1       -> paksa bikin baru
        //   selain itu    -> pakai yang masih in_progress, atau bikin baru
        const paksaBaru = params.get('baru') === '1';
        const idDiminta = params.get('attempt');
        let a = null;
        if (idDiminta) {
          a = await pbo.collection('olimp_attempts').getOne(idDiminta).catch(() => null);
        } else if (!paksaBaru) {
          const lama = await pbo.collection('olimp_attempts').getFullList({
            filter: `user = "${user.id}" && package = "${p.id}" && status = "in_progress"`,
            sort: '-created',
          }).catch(() => []);
          a = lama[0] || null;
        }
        if (!a) {
          a = await pbo.collection('olimp_attempts').create({
            user: user.id,
            package: p.id,
            mode: 'latihan',
            answers: {},
            score: 0,
            totalQuestions: urut.length,
            answeredCount: 0,
            durationSeconds: 0,
            status: 'in_progress',
            startedAt: new Date().toISOString(),
            deviceId: localStorage.getItem('pcv_device_id') || '',
          });
          olimpLog('quiz_start', `Mulai paket ${p.name}`);
        }
        if (!hidup) return;

        // Cadangan lokal menang kalau lebih lengkap: itu berarti sesi sebelumnya
        // sempat putus sebelum penyimpanan terakhir sampai ke server.
        let jawaban = a.answers && typeof a.answers === 'object' ? a.answers : {};
        try {
          const lokal = JSON.parse(localStorage.getItem(cadanganKey(a.id)) || 'null');
          if (lokal && Object.keys(lokal).length > Object.keys(jawaban).length) jawaban = lokal;
        } catch (_) { /* cadangan rusak - abaikan */ }

        setAttempt(a);
        setAnswers(jawaban);
        jawabanRef.current = jawaban;
        // Lanjut dari soal pertama yang belum dijawab.
        const lanjut = urut.findIndex((q) => !jawaban[q.id]?.picked);
        setIdx(lanjut === -1 ? 0 : lanjut);
      } catch (err) {
        if (hidup) setError('Gagal menyiapkan kuis: ' + (err?.message || 'terjadi kesalahan.'));
      } finally {
        if (hidup) setLoading(false);
      }
    })();
    return () => { hidup = false; };
    // params sengaja tidak masuk daftar: kuis hanya disiapkan sekali per paket.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packageId, user?.id]);

  // --- pantau koneksi -------------------------------------------------------
  useEffect(() => {
    const naik = () => setOnline(true);
    const turun = () => setOnline(false);
    window.addEventListener('online', naik);
    window.addEventListener('offline', turun);
    return () => {
      window.removeEventListener('online', naik);
      window.removeEventListener('offline', turun);
    };
  }, []);

  const soal = questions[idx];
  const jawabanSoal = soal ? answers[soal.id] : null;
  const sudahDicek = !!jawabanSoal?.checked;

  // Pindah soal -> setel ulang tampilan bantuan dan penanda waktu.
  useEffect(() => {
    setPicked(jawabanSoal?.picked || '');
    setShowHint(false);
    setShowReasons(false);
    setShowExplanation(!!jawabanSoal?.checked);
    mulaiSoal.current = Date.now();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, soal?.id]);

  // --- simpan berkala -------------------------------------------------------
  const simpan = useCallback(async (tambahan = {}) => {
    if (!attempt?.id) return;
    const jawaban = jawabanRef.current;
    const daftar = Object.values(jawaban);
    const isi = {
      answers: jawaban,
      score: daftar.filter((a) => a.correct).length,
      answeredCount: daftar.filter((a) => a.picked).length,
      totalQuestions: questions.length,
      durationSeconds: daftar.reduce((s, a) => s + (Number(a.seconds) || 0), 0),
      ...tambahan,
    };
    try {
      localStorage.setItem(cadanganKey(attempt.id), JSON.stringify(jawaban));
    } catch (_) { /* penyimpanan lokal penuh - lanjut saja */ }
    try {
      await pbo.collection('olimp_attempts').update(attempt.id, isi);
      kotor.current = false;
      setTersimpan(true);
    } catch (_) {
      setTersimpan(false);
    }
  }, [attempt?.id, questions.length]);

  useEffect(() => {
    const t = setInterval(() => { if (kotor.current) simpan(); }, SIMPAN_TIAP_MS);
    return () => clearInterval(t);
  }, [simpan]);

  // Simpan sekali lagi saat halaman ditutup, supaya jawaban terakhir tidak
  // hilang gara-gara jeda 5 detik.
  useEffect(() => {
    const keluar = () => {
      if (!kotor.current || !attempt?.id) return;
      try { localStorage.setItem(cadanganKey(attempt.id), JSON.stringify(jawabanRef.current)); } catch (_) { /* abaikan */ }
    };
    window.addEventListener('beforeunload', keluar);
    return () => { window.removeEventListener('beforeunload', keluar); keluar(); };
  }, [attempt?.id]);

  const tulisJawaban = (questionId, patch) => {
    setAnswers((lama) => {
      const baru = { ...lama, [questionId]: { ...(lama[questionId] || {}), ...patch } };
      jawabanRef.current = baru;
      kotor.current = true;
      setTersimpan(false);
      return baru;
    });
  };

  const cekJawaban = () => {
    if (!soal || !picked) return;
    const detik = Math.round((Date.now() - mulaiSoal.current) / 1000);
    const sebelumnya = answers[soal.id] || {};
    // Nilai dikunci pada percobaan PERTAMA. Percobaan berikutnya tetap dicatat
    // (retries) supaya admin bisa melihat soal mana yang perlu diulang siswa,
    // tapi tidak mengubah benar/salahnya.
    const pertama = !sebelumnya.checked;
    tulisJawaban(soal.id, {
      picked,
      checked: true,
      correct: pertama ? picked === soal.correctAnswer : !!sebelumnya.correct,
      lastCorrect: picked === soal.correctAnswer,
      seconds: (Number(sebelumnya.seconds) || 0) + detik,
      retries: (Number(sebelumnya.retries) || 0) + (pertama ? 0 : 1),
    });
    mulaiSoal.current = Date.now();
    setShowExplanation(true);
  };

  const ulangSoal = () => {
    setPicked('');
    setShowExplanation(false);
    setShowReasons(false);
    mulaiSoal.current = Date.now();
  };

  const pindah = (arah) => {
    if (kotor.current) simpan();
    setIdx((i) => Math.min(questions.length - 1, Math.max(0, i + arah)));
  };

  const akhiri = async () => {
    await simpan({
      status: 'finished',
      finishedAt: new Date().toISOString(),
    });
    olimpLog('quiz_finish', `Selesai paket ${pkg?.name}`);
    try { localStorage.removeItem(cadanganKey(attempt.id)); } catch (_) { /* abaikan */ }
    setSelesai(true);
    navigate(`/olimp/hasil/${attempt.id}`);
  };

  const dijawab = Object.values(answers).filter((a) => a.picked).length;
  const benar = Object.values(answers).filter((a) => a.correct).length;
  const opsi = useMemo(() => questionOptions(soal), [soal]);
  const alasan = soal?.optionReasons && typeof soal.optionReasons === 'object' ? soal.optionReasons : {};

  if (loading) return <OlimpShell><p className="text-sm text-stone-500">Menyiapkan kuis…</p></OlimpShell>;
  if (error) {
    return (
      <OlimpShell>
        <p className="rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm px-4 py-3">{error}</p>
        <Link to="/olimp" className="inline-flex items-center gap-1.5 mt-4 text-sm font-semibold text-maroon-600">
          <ChevronLeft size={14} /> Kembali
        </Link>
      </OlimpShell>
    );
  }
  if (!pkg || !canOpenPackage(sesi, pkg)) {
    return <OlimpShell><p className="text-sm text-stone-600">Paket ini tidak bisa kamu buka.</p></OlimpShell>;
  }
  if (!soal) {
    return <OlimpShell><p className="text-sm text-stone-600">Paket ini belum berisi soal.</p></OlimpShell>;
  }

  return (
    <OlimpShell>
      {/* Tanda air identitas — lihat components/TandaAirUjian.jsx.
          Identitasnya diambil dari sesi yang sedang berjalan: berbeda dari
          layar ujian lomba, Web Olimp memang selalu menuntut login, jadi di
          sini sesi itu pasti ada. */}
      <TandaAirUjian
        aktif={tandaAirAktif}
        nama={user?.name}
        email={user?.email}
        kode={String(user?.id || '').slice(0, 8).toUpperCase()}
      />

      {/* ---- kepala: nomor, kemajuan, status simpan ---- */}
      <div className="rounded-2xl border border-alba-200 bg-alba-50 shadow-card p-5 mb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-maroon-500">
              Soal {idx + 1} dari {questions.length}
            </p>
            <h1 className="mt-1 font-display text-lg font-semibold text-stone-800 leading-snug">{pkg.name}</h1>
          </div>
          <div className="flex items-center gap-2 text-xs">
            {!online && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 font-semibold px-3 py-1.5">
                <CloudOff size={12} /> Offline — jawaban disimpan di device
              </span>
            )}
            {online && !tersimpan && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-alba-200 text-stone-600 font-semibold px-3 py-1.5">
                Menyimpan…
              </span>
            )}
            {online && tersimpan && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold px-3 py-1.5">
                <CheckCircle2 size={12} /> Tersimpan
              </span>
            )}
          </div>
        </div>

        <div className="mt-4 h-2 rounded-full bg-alba-200 overflow-hidden">
          <div className="h-full bg-maroon-600 transition-all" style={{ width: `${Math.round((dijawab / questions.length) * 100)}%` }} />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-stone-500">
          <span>{dijawab}/{questions.length} dijawab</span>
          <span>{benar} benar</span>
          <span>{soal.primaryDomain || '—'}</span>
          <span>Level {soal.difficulty || '?'}/5</span>
          <span>{cognitiveLabel(soal.cognitiveLevel)}</span>
          <span className="ml-auto">Target {formatClock(questionSeconds(soal, pkg))}</span>
        </div>
      </div>

      {/* ---- peta nomor soal ---- */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {questions.map((q, i) => {
          const a = answers[q.id];
          const warna = !a?.picked
            ? 'bg-alba-200 text-stone-500 hover:bg-alba-300'
            : a.correct
              ? 'bg-emerald-500 text-white'
              : 'bg-maroon-600 text-alba-50';
          return (
            <button
              key={q.id}
              onClick={() => { if (kotor.current) simpan(); setIdx(i); }}
              title={`Soal ${i + 1}${a?.picked ? ` — jawabanmu ${a.picked}` : ''}`}
              className={`w-8 h-8 rounded-lg text-xs font-bold tabular-nums transition-colors ${warna} ${i === idx ? 'ring-2 ring-offset-2 ring-maroon-400 ring-offset-alba-50' : ''}`}
            >
              {i + 1}
            </button>
          );
        })}
      </div>

      {/* ---- badan soal ---- */}
      <article className="rounded-2xl border border-alba-200 bg-alba-50 shadow-card p-6">
        {soal.imageUrl && (
          <img
            src={soal.imageUrl}
            alt=""
            referrerPolicy="no-referrer"
            className="w-full max-w-lg mx-auto rounded-xl border border-alba-200 mb-5"
          />
        )}
        <div
          className="prose-olimp text-[15px] text-stone-800 leading-relaxed [&_p]:mb-3 [&_em]:italic [&_strong]:font-semibold"
          dangerouslySetInnerHTML={{ __html: soal.questionText || '' }}
        />

        <div className="mt-6 space-y-2.5">
          {opsi.map((o) => {
            const dipilih = picked === o.key;
            const kunci = o.key === soal.correctAnswer;
            let gaya = 'border-alba-300 bg-alba-50 hover:border-maroon-300 hover:bg-maroon-50/40';
            if (sudahDicek && showExplanation) {
              if (kunci) gaya = 'border-emerald-400 bg-emerald-50';
              else if (dipilih) gaya = 'border-red-400 bg-red-50';
              else gaya = 'border-alba-200 bg-alba-50 opacity-70';
            } else if (dipilih) {
              gaya = 'border-maroon-500 bg-maroon-50';
            }
            return (
              <button
                key={o.key}
                onClick={() => { if (!(sudahDicek && showExplanation)) setPicked(o.key); }}
                disabled={sudahDicek && showExplanation}
                className={`w-full flex items-start gap-3 rounded-xl border-2 px-4 py-3 text-left transition-colors ${gaya}`}
              >
                <span className={`shrink-0 w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center ${dipilih ? 'bg-maroon-600 text-alba-50' : 'bg-alba-200 text-stone-600'}`}>
                  {o.key}
                </span>
                <span className="min-w-0 flex-1 text-sm text-stone-700 leading-relaxed">
                  {o.text}
                  {showReasons && alasan[o.key] && (
                    <span className="block mt-1.5 text-[12px] text-stone-500 italic">{alasan[o.key]}</span>
                  )}
                </span>
                {sudahDicek && showExplanation && kunci && <CheckCircle2 size={17} className="shrink-0 text-emerald-600" />}
                {sudahDicek && showExplanation && dipilih && !kunci && <XCircle size={17} className="shrink-0 text-red-500" />}
              </button>
            );
          })}
        </div>

        {/* ---- bantuan sebelum cek jawaban ---- */}
        <div className="mt-4 flex flex-wrap gap-2">
          {soal.hint && (
            <button
              onClick={() => setShowHint((h) => !h)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gold-200 bg-gold-100/60 text-gold-600 text-xs font-semibold px-3.5 py-2 hover:bg-gold-100 transition-colors"
            >
              <Lightbulb size={13} /> {showHint ? 'Sembunyikan Hint' : 'Show Hint'}
            </button>
          )}
          {Object.keys(alasan).length > 0 && (
            <button
              onClick={() => setShowReasons((r) => !r)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-alba-300 text-stone-600 text-xs font-semibold px-3.5 py-2 hover:border-maroon-300 hover:text-maroon-600 transition-colors"
            >
              <ListChecks size={13} /> {showReasons ? 'Sembunyikan Alasan' : 'Show Reasons'}
            </button>
          )}
        </div>
        {showHint && soal.hint && (
          <p className="mt-3 rounded-xl border border-gold-200 bg-gold-100/40 px-4 py-3 text-sm text-stone-700 leading-relaxed">
            <span className="font-semibold text-gold-600">Hint: </span>{soal.hint}
          </p>
        )}

        {/* ---- hasil cek jawaban ---- */}
        {sudahDicek && showExplanation && (
          <div className={`mt-5 rounded-xl border-2 px-5 py-4 ${jawabanSoal.lastCorrect ?? jawabanSoal.correct ? 'border-emerald-300 bg-emerald-50' : 'border-red-300 bg-red-50'}`}>
            <p className={`flex items-center gap-2 font-display text-lg font-semibold ${jawabanSoal.lastCorrect ?? jawabanSoal.correct ? 'text-emerald-700' : 'text-red-700'}`}>
              {jawabanSoal.lastCorrect ?? jawabanSoal.correct ? <><CheckCircle2 size={19} /> BENAR!</> : <><XCircle size={19} /> SALAH!</>}
            </p>
            <p className="mt-1.5 text-sm text-stone-700">
              Jawabanmu: <span className="font-bold">{jawabanSoal.picked}</span>
              {' · '}Jawaban benar: <span className="font-bold">{soal.correctAnswer}</span>
              {jawabanSoal.retries > 0 && <span className="text-stone-500"> · percobaan ke-{jawabanSoal.retries + 1}</span>}
            </p>
            {jawabanSoal.retries > 0 && !jawabanSoal.correct && (
              <p className="mt-1 text-[11px] text-stone-500">
                Nilai tetap mengikuti percobaan pertama - mengulang di sini gunanya untuk belajar, bukan menaikkan skor.
              </p>
            )}
          </div>
        )}

        {/* ---- tombol aksi ---- */}
        <div className="mt-5 flex flex-wrap items-center gap-2 pt-4 border-t border-alba-100">
          <button
            onClick={() => pindah(-1)}
            disabled={idx === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-alba-300 text-stone-600 text-sm font-semibold px-4 py-2.5 hover:border-maroon-300 hover:text-maroon-600 disabled:opacity-40 transition-colors"
          >
            <ChevronLeft size={15} /> Prev
          </button>

          {!(sudahDicek && showExplanation) ? (
            <button
              onClick={cekJawaban}
              disabled={!picked}
              className="inline-flex items-center gap-1.5 rounded-lg bg-maroon-600 text-alba-50 text-sm font-semibold px-6 py-2.5 hover:bg-maroon-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <BookOpenCheck size={15} /> Cek Jawaban
            </button>
          ) : (
            <button
              onClick={ulangSoal}
              className="inline-flex items-center gap-1.5 rounded-lg border border-maroon-300 text-maroon-600 text-sm font-semibold px-4 py-2.5 hover:bg-maroon-50 transition-colors"
            >
              <RotateCcw size={15} /> Ulang
            </button>
          )}

          <button
            onClick={() => pindah(1)}
            disabled={idx >= questions.length - 1}
            className="inline-flex items-center gap-1.5 rounded-lg border border-alba-300 text-stone-600 text-sm font-semibold px-4 py-2.5 hover:border-maroon-300 hover:text-maroon-600 disabled:opacity-40 transition-colors"
          >
            Next <ChevronRight size={15} />
          </button>

          {idx < questions.length - 1 && (
            <button
              onClick={() => pindah(1)}
              className="text-xs font-semibold text-stone-500 hover:text-maroon-600 px-2 py-2.5"
            >
              Lewati
            </button>
          )}

          <button
            onClick={akhiri}
            disabled={selesai}
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-stone-800 text-alba-50 text-sm font-semibold px-5 py-2.5 hover:bg-stone-900 disabled:opacity-40 transition-colors"
          >
            <Flag size={14} /> Selesai &amp; Lihat Hasil
          </button>
        </div>

        {dijawab < questions.length && (
          <p className="mt-3 flex items-start gap-2 text-[11px] text-stone-500">
            <AlertTriangle size={13} className="mt-0.5 shrink-0 text-amber-500" />
            Masih ada {questions.length - dijawab} soal yang belum kamu jawab. Kalau ditutup sekarang, soal itu dihitung salah.
          </p>
        )}
      </article>

      {/* ---- pembahasan 8 bagian ---- */}
      {sudahDicek && showExplanation && (
        <div className="mt-4">
          <Explanation question={soal} />
        </div>
      )}
    </OlimpShell>
  );
}

export default function OlimpQuiz() {
  return (
    <OlimpGate>
      <OlimpQuizInner />
    </OlimpGate>
  );
}
