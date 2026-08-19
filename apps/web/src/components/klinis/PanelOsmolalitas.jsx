import React, { useState } from 'react';
import { Calculator, Copy, RotateCcw, Save, Wand2 } from 'lucide-react';
import {
  Baris, Catatan, CaraHitung, DaftarNilai, Hasil, Isian, Kartu, Kelompok, Kosong, Lipat, Pil, Segmen, Tombol,
} from '@/components/klinis/UiKlinis';
import { baca } from '@/lib/klinis/format';
import { RUMUS_OSM, hitungOsmolalitas, normalGlukosa, normalUreum } from '@/lib/klinis/osmolalitas';

const KOSONG = {
  na: '', k: '', glukosa: '', satuanGlukosa: 'mgdl', ureum: '', satuanUreum: 'ureum',
  etanol: '', terukur: '', protein: '', rumus: 'std', sertakanEtanol: true,
};

export default function PanelOsmolalitas({ onSimpan, onSalin, onPesan }) {
  const [f, setF] = useState(KOSONG);
  const [hasil, setHasil] = useState(null);
  const ubah = (k) => (v) => setF((p) => ({ ...p, [k]: v }));

  const hitung = () => {
    const r = hitungOsmolalitas({
      na: baca(f.na),
      k: baca(f.k),
      glukosa: normalGlukosa(baca(f.glukosa), f.satuanGlukosa),
      ureum: normalUreum(baca(f.ureum), f.satuanUreum),
      etanol: baca(f.etanol),
      terukur: baca(f.terukur),
      protein: baca(f.protein),
      rumus: f.rumus,
      sertakanEtanol: f.sertakanEtanol,
    });
    if (r.error) { onPesan(r.error); setHasil(null); return; }
    setHasil(r);
  };

  const contoh = () => {
    setF({ ...KOSONG, na: '128', k: '4,2', glukosa: '110', ureum: '45', terukur: '305' });
    setHasil(null);
    onPesan('Contoh dimuat: hiponatremia dengan osmolal gap melebar. Tekan Hitung.');
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px] items-start">
      <div className="space-y-5">
        <Kartu judul="Input laboratorium">
          <div className="space-y-5">
            <Kelompok judul="Elektrolit & metabolit">
              <Baris>
                <Isian label="Natrium" petunjuk="wajib" satuan="mEq/L" nilai={f.na} onChange={ubah('na')} placeholder="140" />
                <Isian label="Kalium" satuan="mEq/L" nilai={f.k} onChange={ubah('k')} placeholder="4,0" />
                <Isian
                  label="Glukosa"
                  nilai={f.glukosa}
                  onChange={ubah('glukosa')}
                  placeholder="90"
                  satuanPilihan={[{ id: 'mgdl', label: 'mg/dL' }, { id: 'mmol', label: 'mmol/L' }]}
                  satuanNilai={f.satuanGlukosa}
                  onSatuan={ubah('satuanGlukosa')}
                />
                <Isian
                  label="Ureum / BUN"
                  nilai={f.ureum}
                  onChange={ubah('ureum')}
                  placeholder="20"
                  satuanPilihan={[
                    { id: 'ureum', label: 'ureum mg/dL' },
                    { id: 'bun', label: 'BUN mg/dL' },
                    { id: 'mmol', label: 'urea mmol/L' },
                  ]}
                  satuanNilai={f.satuanUreum}
                  onSatuan={ubah('satuanUreum')}
                />
              </Baris>
              <p className="text-[11px] text-stone-400 mt-2">
                Lab di Indonesia umumnya melaporkan <b>ureum</b>, bukan BUN. Salah pilih satuan menggeser hasil 3–4 mOsm/kg.
              </p>
            </Kelompok>

            <Kelompok judul="Pelengkap">
              <Baris>
                <Isian label="Osmolalitas terukur" petunjuk="osmometer" satuan="mOsm/kg" nilai={f.terukur} onChange={ubah('terukur')} placeholder="290" />
                <Isian label="Etanol" satuan="mg/dL" nilai={f.etanol} onChange={ubah('etanol')} placeholder="—" />
                <Isian label="Protein total" satuan="g/dL" nilai={f.protein} onChange={ubah('protein')} placeholder="7,0" />
              </Baris>
              <label className="mt-3 inline-flex items-center gap-2 text-xs text-stone-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={f.sertakanEtanol}
                  onChange={(e) => setF((p) => ({ ...p, sertakanEtanol: e.target.checked }))}
                  className="accent-maroon-600"
                />
                Sertakan etanol dalam osmolalitas terhitung
                <span className="text-stone-400">(matikan bila ingin etanol tampak sebagai gap)</span>
              </label>
            </Kelompok>

            <Kelompok judul="Rumus">
              <Segmen pilihan={RUMUS_OSM.map((r) => ({ id: r.id, label: r.label }))} nilai={f.rumus} onChange={ubah('rumus')} />
            </Kelompok>

            <div className="flex flex-wrap gap-2 pt-1">
              <Tombol utama onClick={hitung}><Calculator size={13} /> Hitung</Tombol>
              <Tombol onClick={contoh}><Wand2 size={13} /> Isi contoh</Tombol>
              <Tombol onClick={() => { setF(KOSONG); setHasil(null); }}><RotateCcw size={13} /> Kosongkan</Tombol>
            </div>
          </div>
        </Kartu>

        {hasil?.turunan?.length > 0 && (
          <Kartu judul="Turunan klinis">
            <div className="space-y-2.5">
              {hasil.turunan.map((t) => (
                <div key={t.nama} className="rounded-xl border border-alba-200 p-3.5">
                  <div className="flex items-start gap-2">
                    <span className="text-[13px] font-bold text-stone-800">{t.nama}</span>
                    <span className="ml-auto shrink-0"><Pil tone={t.tone}>{t.nilai} {t.satuan}</Pil></span>
                  </div>
                  {t.rinci.map((r) => (
                    <p key={r} className="text-[11.5px] text-stone-500 mt-1.5 leading-relaxed">{r}</p>
                  ))}
                </div>
              ))}
            </div>
          </Kartu>
        )}

        <div className="space-y-2.5">
          <Lipat judul="Kenapa ada beberapa rumus?">
            <ul className="list-disc pl-4 space-y-1.5">
              <li><b>2Na + Glu/18 + BUN/2,8</b> — paling banyak dipakai, sederhana, cocok untuk hitung cepat di bangsal.</li>
              <li><b>2(Na+K) + …</b> — menambahkan kalium; sedikit menaikkan hasil, dipakai sebagian ICU.</li>
              <li><b>1,86Na + Glu/18 + BUN/2,8 + 9</b> (Bhagat/Dorwart) — koefisien hasil regresi, sering paling dekat dengan osmometer sehingga gap-nya lebih dapat dipercaya.</li>
            </ul>
            <p>Yang penting: <b>pakai rumus yang sama</b> setiap kali menilai gap, karena batas normal gap bergantung pada rumusnya.</p>
          </Lipat>
          <Lipat judul="Konversi satuan yang dipakai">
            <p>Glukosa mg/dL ÷ 18,016 = mmol/L · Ureum mg/dL ÷ 2,144 = BUN mg/dL · Urea mmol/L × 2,8 = BUN mg/dL · Etanol mg/dL ÷ 3,7 = mOsm/kg.</p>
          </Lipat>
        </div>
      </div>

      <div className="lg:sticky lg:top-24 space-y-5">
        <Kartu
          judul="Hasil"
          kanan={hasil && (
            <div className="flex gap-1.5">
              <button onClick={() => onSimpan({ judul: 'Osmolalitas serum', kategori: hasil.kategori, ringkas: hasil.ringkas })} title="Simpan ke riwayat" className="w-7 h-7 rounded-md text-stone-400 hover:bg-maroon-50 hover:text-maroon-600 flex items-center justify-center"><Save size={13} /></button>
              <button onClick={() => onSalin(hasil.ringkas, 'Osmolalitas serum')} title="Salin teks" className="w-7 h-7 rounded-md text-stone-400 hover:bg-maroon-50 hover:text-maroon-600 flex items-center justify-center"><Copy size={13} /></button>
            </div>
          )}
        >
          {!hasil ? (
            <Kosong>Isi natrium lalu tekan <b>Hitung</b>.</Kosong>
          ) : (
            <>
              <Hasil nilai={hasil.utama} satuan={hasil.satuan} judul={hasil.judul} kategori={hasil.kategori} />
              <DaftarNilai baris={hasil.baris} />
              <div className="mt-4 space-y-2.5">
                {hasil.catatan.map((c, i) => <Catatan key={i} tone={c.tone}>{c.isi}</Catatan>)}
              </div>
              <CaraHitung langkah={hasil.langkah} />
            </>
          )}
        </Kartu>
      </div>
    </div>
  );
}
