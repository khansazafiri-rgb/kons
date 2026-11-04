import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Check, CircleDashed, Clock3, Minus } from 'lucide-react';
import { LABEL_STATUS, STATUS } from '@/lib/belajar';

// Penanda status kegiatan belajar. Selalu ikon + teks: status tidak pernah
// dibedakan lewat warna saja (WCAG 1.4.1).
const GAYA = {
  [STATUS.TIDAK_ADA]: { ikon: Minus, cls: 'border-alba-300 bg-alba-100 text-stone-500' },
  [STATUS.BELUM]: { ikon: CircleDashed, cls: 'border-alba-300 bg-white text-stone-700' },
  [STATUS.PROSES]: { ikon: Clock3, cls: 'border-gold-200 bg-gold-100 text-[#6f5814]' },
  [STATUS.SELESAI]: { ikon: Check, cls: 'border-green-200 bg-green-50 text-green-800' },
};

export function StatusPill({ status, label, className = '' }) {
  const g = GAYA[status] || GAYA[STATUS.BELUM];
  const Ikon = g.ikon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold leading-5 ${g.cls} ${className}`}>
      <Ikon size={12} aria-hidden strokeWidth={2.5} />
      {label || LABEL_STATUS[status]}
    </span>
  );
}

// Batang progres dengan label yang bisa dibaca pembaca layar.
export function BatangProgres({ nilai, maks, label, className = '' }) {
  const pct = maks ? Math.round((nilai / maks) * 100) : 0;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={maks || 0}
      aria-valuenow={nilai}
      aria-valuetext={`${nilai} dari ${maks}`}
      className={`h-1.5 overflow-hidden rounded-full bg-alba-200 ${className}`}
    >
      <div className="h-full rounded-full bg-maroon-600 transition-[width] duration-500" style={{ width: `${pct}%` }} />
    </div>
  );
}

// Jejak navigasi ringkas: "Mata Kuliah / Anatomi".
export function Jejak({ items }) {
  return (
    <nav aria-label="Jejak halaman" className="mb-4 text-sm">
      <ol className="flex flex-wrap items-center gap-1 text-stone-500">
        {items.map((it, i) => (
          <li key={it.label} className="inline-flex items-center gap-1">
            {i > 0 && <ChevronRight size={14} aria-hidden className="text-stone-400" />}
            {it.to ? (
              <Link to={it.to} className="rounded font-semibold text-stone-600 underline-offset-2 hover:text-maroon-600 hover:underline">
                {it.label}
              </Link>
            ) : (
              <span aria-current="page" className="font-semibold text-stone-800">{it.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

// Kerangka judul halaman siswa: eyebrow, judul, keterangan.
export function KepalaHalaman({ eyebrow, judul, sub, children }) {
  return (
    <header className="mb-8">
      {eyebrow && <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-maroon-600">{eyebrow}</p>}
      <h1 tabIndex={-1} id="judul-halaman" className="font-display text-3xl font-semibold leading-tight text-stone-900 outline-none md:text-4xl">
        {judul}
      </h1>
      {sub && <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-stone-600">{sub}</p>}
      {children}
    </header>
  );
}

export function KotakKosong({ judul, isi, aksi }) {
  return (
    <div className="rounded-2xl border border-dashed border-alba-300 bg-alba-50 px-6 py-10 text-center">
      <p className="font-display text-lg font-semibold text-stone-800">{judul}</p>
      {isi && <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-stone-600">{isi}</p>}
      {aksi && <div className="mt-5">{aksi}</div>}
    </div>
  );
}

export function KerangkaMemuat({ baris = 3 }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-live="polite">
      <span className="sr-only">Memuat…</span>
      {Array.from({ length: baris }).map((_, i) => (
        <div key={i} className="h-24 animate-pulse rounded-2xl border border-alba-200 bg-alba-100/70" />
      ))}
    </div>
  );
}
