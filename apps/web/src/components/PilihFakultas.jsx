import React from 'react';
import { FK_INDONESIA } from '@/data/fakultasKedokteran';

// Pemilih FK multi-select yang dipakai bersama di beberapa tempat (jadwal
// ujian per FK, BAB Simulasi CBT per FK). Daftar FK di Indonesia panjang
// (ratusan), jadi bukan deretan chip semua - dipilih satu per satu lewat
// dropdown bergrup yang sama dengan halaman Sign Up, lalu yang terpilih muncul
// sebagai chip yang bisa dilepas.
//
// Daftar kosong = berlaku untuk SEMUA FK. Konvensi ini dipakai konsisten di
// exam_schedules.universities maupun chapters.universities, supaya data lama
// (sebelum multi-FK ada) tetap terbaca tampil ke semua orang seperti sebelumnya.
export default function PilihFakultas({ nilai, onChange, ringkas = false }) {
  const dipilih = Array.isArray(nilai) ? nilai : [];
  const tambah = (fk) => { if (fk && !dipilih.includes(fk)) onChange([...dipilih, fk]); };
  const lepas = (fk) => onChange(dipilih.filter((x) => x !== fk));

  return (
    <div className="space-y-1.5">
      <select
        value=""
        onChange={(e) => { tambah(e.target.value); e.target.value = ''; }}
        className={`rounded-lg border px-2 py-2 text-xs bg-alba-50 max-w-full ${ringkas ? 'border-dashed border-alba-300' : 'border-alba-300'}`}
      >
        <option value="">{dipilih.length ? '+ Tambah FK lain' : 'Semua FK (klik untuk membatasi)'}</option>
        {FK_INDONESIA.map((g) => (
          <optgroup key={g.group} label={g.group}>
            {g.items.filter((fk) => !dipilih.includes(fk)).map((fk) => (
              <option key={fk} value={fk}>{fk}</option>
            ))}
          </optgroup>
        ))}
      </select>
      {dipilih.length === 0 ? (
        <p className="text-[11px] text-stone-400">Tampil ke <b>semua FK</b>.</p>
      ) : (
        <div className="flex flex-wrap gap-1">
          {dipilih.map((fk) => (
            <button
              key={fk}
              onClick={() => lepas(fk)}
              title="Klik untuk melepas"
              className="text-[11px] rounded-full border border-maroon-200 bg-maroon-50 text-maroon-700 px-2.5 py-0.5 hover:bg-maroon-100"
            >
              {fk} ×
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
