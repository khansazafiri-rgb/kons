import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

// Potongan tampilan yang dipakai bersama ketiga kalkulator klinis.
//
// Warnanya SELURUHNYA memakai palet PCV (Alba + Maroon + Gold) dan hanya kelas
// yang sudah punya padanan mode gelap di index.css - jangan menambah warna baru
// di sini tanpa menambahkan padanan gelapnya juga, karena halaman ini ikut
// tombol mode gelap di Header seperti halaman siswa lainnya.

// Lima nada makna. "accent" dipakai untuk keterangan netral yang tetap perlu
// menonjol (mis. alasan pemilihan berat badan), bukan untuk peringatan.
export const NADA = {
  ok: { teks: 'text-green-800', kotak: 'bg-green-50 border-green-200', pil: 'bg-green-50 text-green-800 border-green-200' },
  warn: { teks: 'text-gold-600', kotak: 'bg-gold-100/60 border-gold-200', pil: 'bg-gold-100 text-gold-600 border-gold-200' },
  bad: { teks: 'text-red-600', kotak: 'bg-red-50 border-red-200', pil: 'bg-red-50 text-red-600 border-red-200' },
  accent: { teks: 'text-maroon-700', kotak: 'bg-maroon-50 border-maroon-100', pil: 'bg-maroon-50 text-maroon-700 border-maroon-100' },
  info: { teks: 'text-stone-600', kotak: 'bg-alba-100 border-alba-200', pil: 'bg-alba-100 text-stone-600 border-alba-300' },
};
const nada = (t) => NADA[t] || NADA.info;

export function Kartu({ judul, kanan, children, className = '' }) {
  return (
    <div className={`bg-alba-50 rounded-2xl border border-alba-200 shadow-card overflow-hidden ${className}`}>
      {judul && (
        <div className="flex items-center gap-2 px-5 py-3 border-b border-alba-200 bg-alba-100/60">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-stone-500">{judul}</h3>
          {kanan && <div className="ml-auto">{kanan}</div>}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}

export function Pil({ tone = 'info', children }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${nada(tone).pil}`}>
      {children}
    </span>
  );
}

// Blok label + kotak isian dengan satuan menempel di kanan. Satuannya bisa
// berupa teks mati, atau <select> kalau lab bisa melaporkan beberapa satuan.
//
// Kotak angka SENGAJA bukan <input type="number">. Peramban menolak koma pada
// type="number" - isinya dianggap tidak sah lalu ditampilkan KOSONG - padahal
// koma justru pemisah desimal yang dipakai di Indonesia. Akibatnya "1,4" hilang
// dari layar tanpa pesan apa pun. Dengan type="text" + inputMode="decimal",
// koma tetap terbaca dan papan tik ponsel tetap membuka mode angka.
export function Isian({ label, petunjuk, nilai, onChange, satuan, satuanPilihan, satuanNilai, onSatuan, tipe = 'desimal', ...sisa }) {
  const angka = tipe === 'desimal';
  return (
    <label className="flex flex-col gap-1.5 min-w-0">
      <span className="text-xs font-semibold text-stone-600">
        {label}
        {petunjuk && <span className="ml-1.5 font-normal text-stone-400">{petunjuk}</span>}
      </span>
      <span className="flex rounded-lg border border-alba-300 bg-alba-50 overflow-hidden focus-within:border-maroon-300 focus-within:ring-2 focus-within:ring-maroon-50 transition-colors">
        <input
          type={angka ? 'text' : tipe}
          inputMode={angka ? 'decimal' : undefined}
          value={nilai}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 min-w-0 bg-transparent px-3 py-2 text-sm outline-none"
          {...sisa}
        />
        {satuanPilihan ? (
          <select
            value={satuanNilai}
            onChange={(e) => onSatuan(e.target.value)}
            className="shrink-0 border-l border-alba-200 bg-alba-100/70 px-2 text-[11px] font-semibold text-stone-600 outline-none cursor-pointer"
          >
            {satuanPilihan.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        ) : (
          satuan && (
            <span className="shrink-0 flex items-center border-l border-alba-200 bg-alba-100/70 px-2.5 text-[11px] text-stone-500">
              {satuan}
            </span>
          )
        )}
      </span>
    </label>
  );
}

// Deret tombol saling-eksklusif (jenis kelamin, mode, dsb).
export function Segmen({ label, pilihan, nilai, onChange }) {
  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      {label && <span className="text-xs font-semibold text-stone-600">{label}</span>}
      <div className="flex rounded-lg border border-alba-300 overflow-hidden bg-alba-100/60">
        {pilihan.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onChange(p.id)}
            className={`flex-1 min-w-0 truncate px-3 py-2 text-xs font-semibold border-r border-alba-200 last:border-r-0 transition-colors ${
              nilai === p.id ? 'bg-maroon-600 text-alba-50' : 'text-stone-600 hover:bg-alba-100'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Kelompok({ judul, children }) {
  return (
    <fieldset className="min-w-0">
      {judul && (
        <legend className="text-[11px] font-bold uppercase tracking-[0.1em] text-stone-400 pb-2.5">{judul}</legend>
      )}
      {children}
    </fieldset>
  );
}

export const Baris = ({ children }) => (
  <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(140px,1fr))]">{children}</div>
);

export function Tombol({ utama, children, ...sisa }) {
  const dasar = 'inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold transition-colors disabled:opacity-50';
  return (
    <button
      type="button"
      className={
        utama
          ? `${dasar} bg-maroon-600 text-alba-50 hover:bg-maroon-700`
          : `${dasar} border border-alba-300 text-stone-600 hover:border-maroon-300 hover:text-maroon-600 hover:bg-maroon-50`
      }
      {...sisa}
    >
      {children}
    </button>
  );
}

export function Catatan({ tone = 'info', children }) {
  return (
    <div className={`rounded-r-lg border border-l-[3px] px-3.5 py-2.5 text-xs leading-relaxed ${nada(tone).kotak} ${nada(tone).teks}`}>
      {children}
    </div>
  );
}

export function Kosong({ children }) {
  return <p className="text-center text-sm text-stone-400 py-10 px-4">{children}</p>;
}

// Angka besar hasil utama + label & badge kategori.
export function Hasil({ nilai, satuan, judul, kategori }) {
  return (
    <div>
      <div className="flex items-baseline gap-2">
        <span className={`font-display text-4xl font-semibold tracking-tight tabular-nums ${nada(kategori?.tone).teks}`}>
          {nilai}
        </span>
        <span className="text-xs font-semibold text-stone-400">{satuan}</span>
      </div>
      <p className="mt-1.5 text-xs text-stone-500 flex flex-wrap items-center gap-2">
        {judul}
        {kategori && <Pil tone={kategori.tone}>{kategori.teks}</Pil>}
      </p>
    </div>
  );
}

// Daftar kunci-nilai bergaris putus, untuk angka pendamping di bawah hasil utama.
export function DaftarNilai({ baris }) {
  if (!baris?.length) return null;
  return (
    <div className="mt-4">
      {baris.map((b, i) => (
        <div key={`${b.k}-${i}`} className="py-2 text-[13px] border-b border-dashed border-alba-200 last:border-b-0">
          <div className="flex justify-between gap-3">
            <span className="text-stone-500 min-w-0">{b.k}</span>
            <span className={`font-semibold tabular-nums text-right ${b.tone ? nada(b.tone).teks : 'text-stone-800'}`}>
              {b.v}
              {b.tag && <span className="ml-1.5"><Pil tone={b.tone}>{b.tag}</Pil></span>}
            </span>
          </div>
          {/* Keterangan menempel pada barisnya sendiri - mis. "median berat
              menurut tinggi" yang menerangkan dari mana BBI itu diambil. */}
          {b.catatan && <p className="text-[11px] text-stone-400 mt-1">{b.catatan}</p>}
        </div>
      ))}
    </div>
  );
}

// Rincian langkah hitung, tertutup secara bawaan.
//
// Ini SENGAJA bukan "mode belajar" yang dinyalakan global: yang dibutuhkan
// bukan saklar di kepala halaman, melainkan jawaban atas satu pertanyaan
// sesaat - "angka ini datang dari mana?" - jadi bentuknya rincian per hasil
// yang bisa dibuka lalu ditutup lagi tanpa mengubah keadaan halaman.
export function CaraHitung({ langkah }) {
  const [buka, setBuka] = useState(false);
  if (!langkah?.length) return null;
  return (
    <div className="mt-4 rounded-lg border border-alba-200 bg-alba-100/60 overflow-hidden">
      <button
        type="button"
        onClick={() => setBuka((b) => !b)}
        className="w-full flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold text-stone-600 hover:text-maroon-600"
      >
        <ChevronDown size={14} className={`transition-transform ${buka ? '' : '-rotate-90'}`} />
        Cara hitung
        <span className="ml-auto font-normal text-stone-400">{langkah.length} langkah</span>
      </button>
      {buka && (
        <pre className="px-3.5 pb-3.5 text-[11.5px] leading-relaxed text-stone-600 whitespace-pre-wrap break-words font-mono">
          {langkah.join('\n')}
        </pre>
      )}
    </div>
  );
}

// Penjelasan lipat untuk latar belakang rumus / batas kategori.
export function Lipat({ judul, children }) {
  const [buka, setBuka] = useState(false);
  return (
    <div className="rounded-lg border border-alba-200 bg-alba-100/60 overflow-hidden">
      <button
        type="button"
        onClick={() => setBuka((b) => !b)}
        className="w-full flex items-center gap-2 px-3.5 py-2.5 text-left text-xs font-semibold text-stone-600 hover:text-maroon-600"
      >
        <ChevronDown size={14} className={`shrink-0 transition-transform ${buka ? '' : '-rotate-90'}`} />
        {judul}
      </button>
      {buka && <div className="px-3.5 pb-3.5 text-xs leading-relaxed text-stone-600 space-y-2">{children}</div>}
    </div>
  );
}

// Pita z-score: lima pita SD dengan penanda posisi anak.
// Lebar pita sengaja tidak sama - pita tengah (−2..+2) mewakili 4 SD sekaligus,
// sehingga proporsinya benar terhadap sumbu yang linier.
export function PitaZ({ z }) {
  const batas = Math.max(-4, Math.min(4, z));
  const posisi = ((batas + 4) / 8) * 100;
  return (
    <div className="mt-2.5">
      <div className="relative h-2.5 rounded-full overflow-hidden flex">
        <i className="block bg-red-600/70" style={{ flex: 1 }} />
        <i className="block bg-gold-400/70" style={{ flex: 1 }} />
        <i className="block bg-green-600/60" style={{ flex: 4 }} />
        <i className="block bg-gold-400/70" style={{ flex: 1 }} />
        <i className="block bg-red-600/70" style={{ flex: 1 }} />
        <span
          className="absolute -top-1 w-[3px] h-[18px] rounded-sm bg-stone-800 dark:bg-alba-200 ring-2 ring-alba-50"
          style={{ left: `${posisi}%`, transform: 'translateX(-50%)' }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-stone-400 mt-1 tabular-nums">
        <span>−4</span><span>−2</span><span>0</span><span>+2</span><span>+4</span>
      </div>
    </div>
  );
}
