import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';

// Dropdown pemilih BAB yang rapi: satu tombol ringkas yang membuka panel
// berisi pencarian + daftar BAB. Menggantikan daftar BAB panjang yang dulu
// memenuhi halaman dan mendorong tombol "Kerjakan" jauh ke bawah.
//
// props:
// - chapters   : array record BAB ({ id, title })
// - value      : id BAB terpilih ('' = belum memilih)
// - onChange   : (id) => void
// - doneIds    : Set id BAB yang sudah dituntaskan (badge "Selesai"), opsional
// - placeholder: teks tombol saat belum ada yang dipilih
export default function ChapterSelect({ chapters, value, onChange, doneIds, placeholder = 'Pilih BAB...' }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const rootRef = useRef(null);
  const searchRef = useRef(null);

  const selected = chapters.find((c) => c.id === value) || null;

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return chapters;
    return chapters.filter((c) => c.title.toLowerCase().includes(q));
  }, [chapters, search]);

  // Tutup panel saat klik di luar / tekan Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Fokus otomatis ke kolom cari begitu panel terbuka (kalau BAB-nya banyak).
  useEffect(() => {
    if (open && chapters.length > 6) setTimeout(() => searchRef.current?.focus(), 30);
    if (!open) setSearch('');
  }, [open, chapters.length]);

  const pick = (id) => {
    onChange(id);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center justify-between gap-3 rounded-xl border-2 px-4 py-3 text-left text-sm font-semibold transition-all ${
          selected
            ? 'border-maroon-600 bg-maroon-50 text-maroon-700'
            : 'border-alba-300 bg-alba-50 text-stone-500 hover:border-maroon-300'
        }`}
      >
        <span className="truncate">{selected ? selected.title : placeholder}</span>
        <span className="flex items-center gap-2 shrink-0">
          {selected && doneIds?.has(selected.id) && (
            <span className="text-[10px] font-bold text-green-800 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">Selesai</span>
          )}
          <ChevronDown size={16} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </span>
      </button>

      {open && (
        <div className="absolute z-30 mt-2 w-full rounded-xl border border-alba-200 bg-alba-50 shadow-card-hover overflow-hidden animate-fade-in">
          {chapters.length > 6 && (
            <div className="relative border-b border-alba-200 bg-alba-100/50">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                ref={searchRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={`Cari di ${chapters.length} BAB...`}
                className="w-full bg-transparent pl-9 pr-4 py-2.5 text-sm focus:outline-none"
              />
            </div>
          )}
          <div className="max-h-64 overflow-y-auto scrollbar-thin p-1.5">
            {visible.map((c) => {
              const active = c.id === value;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => pick(c.id)}
                  className={`w-full flex items-center justify-between gap-3 text-left rounded-lg px-3 py-2.5 text-sm transition-colors ${
                    active ? 'bg-maroon-600 text-alba-50 font-semibold' : 'text-stone-700 hover:bg-maroon-50 hover:text-maroon-700'
                  }`}
                >
                  <span className="truncate">{c.title}</span>
                  <span className="flex items-center gap-2 shrink-0">
                    {doneIds?.has(c.id) && (
                      <span className={`text-[10px] font-bold rounded-full px-2 py-0.5 border ${active ? 'text-alba-50 border-alba-50/40' : 'text-green-800 bg-green-50 border-green-200'}`}>
                        Selesai
                      </span>
                    )}
                    {active && <Check size={14} />}
                  </span>
                </button>
              );
            })}
            {visible.length === 0 && (
              <p className="text-sm text-stone-400 px-3 py-3">
                {chapters.length === 0 ? 'Belum ada BAB tersedia.' : 'Tidak ada BAB yang cocok dengan pencarian.'}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
