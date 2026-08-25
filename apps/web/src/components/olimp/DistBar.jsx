import React from 'react';
import { percentOf } from '@/lib/olimp';

// Satu baris distribusi: label, batang, jumlah, persen.
//
// Dipakai di tiga tempat sekaligus (blueprint siswa, tab Distribusi admin, dan
// kartu performa per domain di halaman hasil), jadi tampilannya sengaja
// sederhana: satu batang penuh sebagai latar, satu batang isi di atasnya.
export default function DistBar({ label, value, max, total, tone = 'maroon', right = null, hint = '' }) {
  const width = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0;
  const tones = {
    maroon: 'bg-maroon-600',
    gold: 'bg-gold-400',
    stone: 'bg-stone-400',
    green: 'bg-emerald-500',
    red: 'bg-red-500',
  };
  return (
    <div className="py-1.5">
      <div className="flex items-baseline justify-between gap-3 text-xs">
        <span className="font-semibold text-stone-700 truncate" title={label}>{label}</span>
        <span className="shrink-0 tabular-nums text-stone-500">
          {right !== null ? right : (
            <>
              <span className="font-bold text-stone-700">{value}</span>
              {total > 0 && <span className="ml-1.5">({percentOf(value, total)}%)</span>}
            </>
          )}
        </span>
      </div>
      <div className="mt-1 h-2 rounded-full bg-alba-200 overflow-hidden">
        <div className={`h-full rounded-full ${tones[tone] || tones.maroon} transition-all`} style={{ width: `${width}%` }} />
      </div>
      {hint && <p className="mt-1 text-[11px] text-stone-500">{hint}</p>}
    </div>
  );
}

// Kartu pembungkus satu kelompok distribusi.
export function DistCard({ title, subtitle, children, action = null }) {
  return (
    <section className="rounded-2xl border border-alba-200 bg-alba-50 shadow-card p-5">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <h3 className="font-display text-base font-semibold text-stone-800">{title}</h3>
          {subtitle && <p className="text-[11px] text-stone-500 mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="divide-y divide-alba-100">{children}</div>
    </section>
  );
}
