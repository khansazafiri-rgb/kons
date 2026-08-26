import React, { useEffect, useState } from 'react';
import { AlertTriangle, Apple, CheckCircle2, Download, Loader2, Monitor, ShieldCheck, Tablet } from 'lucide-react';
import { ambilInfoSeb, unduhKonfigurasiSeb } from '@/lib/seb';

// LANGKAH PERSIAPAN SEB - dipakai di dua tempat yang isinya harus sama:
// layar akhir pendaftaran, dan halaman akun peserta.
//
// Dua berkas, dan urutannya penting:
//   1. APLIKASI Safe Exam Browser - dipasang sekali per komputer
//   2. BERKAS KONFIGURASI (.seb) - milik peserta itu sendiri, dijalankan tiap
//      kali mau membuka Web Olimp
//
// Kalau nomor 2 dijalankan sebelum nomor 1 terpasang, komputer tidak tahu harus
// membuka berkas itu dengan apa - itu kebingungan yang paling sering terjadi,
// jadi urutannya ditulis sebagai langkah bernomor, bukan dua tombol sejajar.

const SISTEM = [
  { key: 'windows', label: 'Windows', icon: Monitor },
  { key: 'mac', label: 'macOS', icon: Apple },
  { key: 'ipad', label: 'iPad', icon: Tablet },
];

export default function UnduhSeb({ bisaUnduhKonfigurasi = true, ringkas = false }) {
  const [info, setInfo] = useState(null);
  const [sibuk, setSibuk] = useState(false);
  const [pesan, setPesan] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { ambilInfoSeb().then(setInfo); }, []);

  const unduh = async () => {
    setSibuk(true);
    setError('');
    setPesan('');
    try {
      const nama = await unduhKonfigurasiSeb();
      setPesan(`Berkas ${nama} tersimpan. Jalankan berkas itu untuk membuka Web Olimp.`);
    } catch (e) {
      setError(e?.message || 'Gagal mengunduh berkas konfigurasi.');
    } finally {
      setSibuk(false);
    }
  };

  if (info && !info.terpasang) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800 leading-relaxed">
        Pengaturan Safe Exam Browser belum disiapkan admin, jadi berkas konfigurasinya belum bisa diunduh.
        Hubungi admin PCV — akunmu sendiri tetap tercatat dan tidak perlu didaftarkan ulang.
      </div>
    );
  }

  return (
    <section className={ringkas ? '' : 'rounded-2xl border border-alba-200 bg-alba-50 shadow-card p-6'}>
      {!ringkas && (
        <>
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-stone-800">
            <ShieldCheck size={18} className="text-maroon-600" /> Persiapan Safe Exam Browser
          </h2>
          <p className="mt-2 text-sm text-stone-600 leading-relaxed">
            Web Olimp dibuka lewat <b>Safe Exam Browser (SEB)</b> — peramban khusus ujian yang mengunci layar
            selama kamu mengerjakan soal. Ada dua berkas, dan urutannya tidak boleh dibalik.
          </p>
        </>
      )}

      <ol className="mt-5 space-y-5">
        {/* Langkah 1 - aplikasinya */}
        <li className="flex gap-4">
          <span className="shrink-0 w-7 h-7 rounded-lg bg-maroon-600 text-alba-50 text-xs font-bold flex items-center justify-center">1</span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-stone-800">Pasang aplikasi Safe Exam Browser</p>
            <p className="mt-0.5 text-[13px] text-stone-600 leading-relaxed">
              Cukup sekali per komputer. Pilih sesuai sistem operasimu.
              {info?.sebVersion ? ` Versi yang dipakai: ${info.sebVersion}.` : ''}
            </p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {SISTEM.map((s) => {
                const url = info?.installer?.[s.key];
                if (!url) return null;
                return (
                  <a
                    key={s.key}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-alba-300 text-stone-700 text-sm font-semibold px-4 py-2 hover:border-maroon-300 hover:text-maroon-600 transition-colors"
                  >
                    <s.icon size={14} /> {s.label}
                  </a>
                );
              })}
              {!info && <span className="text-sm text-stone-500">Memuat tautan…</span>}
            </div>
          </div>
        </li>

        {/* Langkah 2 - berkas konfigurasinya */}
        <li className="flex gap-4">
          <span className="shrink-0 w-7 h-7 rounded-lg bg-maroon-600 text-alba-50 text-xs font-bold flex items-center justify-center">2</span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-stone-800">Unduh berkas konfigurasi milikmu</p>
            <p className="mt-0.5 text-[13px] text-stone-600 leading-relaxed">
              Berkas <code className="text-[12px]">.seb</code> ini berisi alamat Web Olimp dan aturan penguncian
              layarnya. <b>Jangan dibagikan ke orang lain</b> — berkas ini menandai akunmu.
            </p>
            {bisaUnduhKonfigurasi ? (
              <>
                <button
                  onClick={unduh}
                  disabled={sibuk}
                  className="mt-2.5 inline-flex items-center gap-2 rounded-lg bg-maroon-600 text-alba-50 text-sm font-semibold px-5 py-2.5 hover:bg-maroon-700 disabled:opacity-50 transition-colors"
                >
                  {sibuk ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
                  Unduh berkas konfigurasi (.seb)
                </button>
                {pesan && (
                  <p className="mt-2 flex items-start gap-2 text-[13px] text-emerald-700">
                    <CheckCircle2 size={14} className="mt-0.5 shrink-0" /> {pesan}
                  </p>
                )}
                {error && (
                  <p className="mt-2 flex items-start gap-2 text-[13px] text-red-700">
                    <AlertTriangle size={14} className="mt-0.5 shrink-0" /> {error}
                  </p>
                )}
              </>
            ) : (
              <p className="mt-2.5 rounded-lg border border-alba-300 bg-alba-100/50 px-4 py-2.5 text-[13px] text-stone-600">
                Berkas konfigurasi bisa diunduh setelah kamu masuk ke akun Web Olimp-mu.
              </p>
            )}
          </div>
        </li>

        {/* Langkah 3 - menjalankannya */}
        <li className="flex gap-4">
          <span className="shrink-0 w-7 h-7 rounded-lg bg-maroon-600 text-alba-50 text-xs font-bold flex items-center justify-center">3</span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-stone-800">Buka berkas itu, bukan alamat webnya</p>
            <p className="mt-0.5 text-[13px] text-stone-600 leading-relaxed">
              Klik dua kali berkas <code className="text-[12px]">.seb</code> tadi. Safe Exam Browser terbuka penuh
              layar dan langsung membawa kamu ke halaman masuk Web Olimp. Setiap kali mau belajar, mulai dari
              berkas ini — bukan dari peramban biasa.
            </p>
          </div>
        </li>
      </ol>

      {info?.wajibSeb && (
        <p className="mt-5 flex items-start gap-2 rounded-xl border border-maroon-200 bg-maroon-50/50 px-4 py-3 text-[13px] text-stone-700 leading-relaxed">
          <ShieldCheck size={14} className="mt-0.5 shrink-0 text-maroon-600" />
          Penguncian SEB <b>sudah menyala</b>: soal Web Olimp tidak bisa dibuka dari peramban biasa.
        </p>
      )}
      {info && info.terpasang && !info.wajibSeb && (
        <p className="mt-5 flex items-start gap-2 rounded-xl border border-alba-300 bg-alba-100/50 px-4 py-3 text-[13px] text-stone-600 leading-relaxed">
          <AlertTriangle size={14} className="mt-0.5 shrink-0 text-stone-400" />
          Penguncian SEB belum dinyalakan, jadi untuk sekarang Web Olimp masih bisa dibuka dari peramban biasa.
          Siapkan tetap dari sekarang — begitu dinyalakan, hanya jalur inilah yang bekerja.
        </p>
      )}
    </section>
  );
}
