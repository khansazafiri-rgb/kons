import React, { useState } from 'react';
import { Calculator, Copy, RotateCcw, Save, Wand2 } from 'lucide-react';
import {
  Baris, Catatan, CaraHitung, DaftarNilai, Hasil, Isian, Kartu, Kelompok, Kosong, Lipat, Segmen, Tombol,
} from '@/components/klinis/UiKlinis';
import { baca } from '@/lib/klinis/format';
import { PILIHAN_BERAT, hitungGinjalAnak, hitungGinjalDewasa, hitungGinjalUrin } from '@/lib/klinis/ginjal';

const SATUAN_KREATININ = [{ id: 'mgdl', label: 'mg/dL' }, { id: 'umol', label: 'µmol/L' }];
const SEX = [{ id: 1, label: 'Laki-laki' }, { id: 2, label: 'Perempuan' }];
const MODE = [{ id: 'dewasa', label: 'Dewasa' }, { id: 'anak', label: 'Anak (Schwartz)' }, { id: 'urin', label: 'Urin 24 jam' }];

const KOSONG = {
  sex: 1, usia: '', berat: '', tinggi: '', kreatinin: '', satuanKreatinin: 'mgdl', modeBerat: 'auto',
  kreatininUrin: '', volume: '', durasi: '24',
};

export default function PanelGinjal({ onSimpan, onSalin, onPesan }) {
  const [mode, setMode] = useState('dewasa');
  const [f, setF] = useState(KOSONG);
  const [hasil, setHasil] = useState(null);
  const ubah = (k) => (v) => setF((p) => ({ ...p, [k]: v }));

  const gantiMode = (m) => { setMode(m); setHasil(null); };

  const hitung = () => {
    const dasar = { sex: f.sex, kreatinin: baca(f.kreatinin), satuanKreatinin: f.satuanKreatinin };
    let r;
    if (mode === 'dewasa') {
      r = hitungGinjalDewasa({ ...dasar, usia: baca(f.usia), berat: baca(f.berat), tinggi: baca(f.tinggi), modeBerat: f.modeBerat });
    } else if (mode === 'anak') {
      r = hitungGinjalAnak({ ...dasar, usia: baca(f.usia), tinggi: baca(f.tinggi) });
    } else {
      r = hitungGinjalUrin({
        ...dasar, kreatininUrin: baca(f.kreatininUrin), volume: baca(f.volume),
        durasi: baca(f.durasi), berat: baca(f.berat), tinggi: baca(f.tinggi),
      });
    }
    if (r.error) { onPesan(r.error); setHasil(null); return; }
    setHasil(r);
  };

  const contoh = () => {
    if (mode === 'dewasa') {
      setF({ ...KOSONG, sex: 2, usia: '72', kreatinin: '1,4', berat: '88', tinggi: '155' });
      onPesan('Contoh dimuat: perempuan 72 tahun, obesitas, kreatinin 1,4. Tekan Hitung.');
    } else if (mode === 'anak') {
      setF({ ...KOSONG, sex: 1, usia: '5', tinggi: '105', kreatinin: '0,45' });
      onPesan('Contoh dimuat: anak 5 tahun, tinggi 105 cm. Tekan Hitung.');
    } else {
      setF({ ...KOSONG, sex: 1, kreatininUrin: '95', volume: '1500', durasi: '24', kreatinin: '1,1', berat: '65', tinggi: '168' });
      onPesan('Contoh dimuat: tampungan urin 24 jam 1500 mL. Tekan Hitung.');
    }
    setHasil(null);
  };

  const judulSimpan =
    mode === 'dewasa' ? 'Klirens kreatinin (dewasa)' : mode === 'anak' ? 'eGFR anak (Schwartz)' : 'Klirens kreatinin urin';

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px] items-start">
      <div className="space-y-5">
        <Kartu judul="Data pasien">
          <div className="space-y-5">
            <Segmen label="Mode perhitungan" pilihan={MODE} nilai={mode} onChange={gantiMode} />

            <Kelompok judul="Identitas & antropometri">
              <Baris>
                <Segmen label="Jenis kelamin" pilihan={SEX} nilai={f.sex} onChange={ubah('sex')} />
                {mode !== 'urin' && (
                  <Isian
                    label="Usia"
                    petunjuk={mode === 'dewasa' ? 'wajib' : 'opsional'}
                    satuan="tahun"
                    nilai={f.usia}
                    onChange={ubah('usia')}
                    placeholder={mode === 'anak' ? '5' : '60'}
                  />
                )}
                <Isian
                  label="Berat badan"
                  petunjuk={mode === 'dewasa' ? 'wajib' : 'opsional'}
                  satuan="kg"
                  nilai={f.berat}
                  onChange={ubah('berat')}
                  placeholder="60"
                />
                <Isian
                  label="Tinggi badan"
                  petunjuk={mode === 'anak' ? 'wajib' : 'opsional'}
                  satuan="cm"
                  nilai={f.tinggi}
                  onChange={ubah('tinggi')}
                  placeholder="165"
                />
              </Baris>
              {mode === 'dewasa' && (
                <p className="text-[11px] text-stone-400 mt-2">
                  Tinggi badan opsional, tapi tanpa itu berat ideal, luas permukaan tubuh, dan pilihan berat otomatis tidak bisa dihitung.
                </p>
              )}
            </Kelompok>

            <Kelompok judul="Laboratorium">
              <Baris>
                <Isian
                  label="Kreatinin serum"
                  petunjuk="wajib"
                  nilai={f.kreatinin}
                  onChange={ubah('kreatinin')}
                  placeholder="1,0"
                  satuanPilihan={SATUAN_KREATININ}
                  satuanNilai={f.satuanKreatinin}
                  onSatuan={ubah('satuanKreatinin')}
                />
                {mode === 'urin' && (
                  <>
                    <Isian label="Kreatinin urin" petunjuk="wajib" satuan="mg/dL" nilai={f.kreatininUrin} onChange={ubah('kreatininUrin')} placeholder="95" />
                    <Isian label="Volume urin" petunjuk="wajib" satuan="mL" nilai={f.volume} onChange={ubah('volume')} placeholder="1500" />
                    <Isian label="Lama tampung" satuan="jam" nilai={f.durasi} onChange={ubah('durasi')} placeholder="24" />
                  </>
                )}
              </Baris>
            </Kelompok>

            {mode === 'dewasa' && (
              <Kelompok judul="Berat badan untuk Cockcroft-Gault">
                <label className="flex flex-col gap-1.5">
                  <select
                    value={f.modeBerat}
                    onChange={(e) => ubah('modeBerat')(e.target.value)}
                    className="w-full rounded-lg border border-alba-300 bg-alba-50 px-3 py-2 text-sm"
                  >
                    {PILIHAN_BERAT.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                  </select>
                  <span className="text-[11px] text-stone-400">
                    Pilihan ini sering luput padahal pengaruhnya besar — pada pasien obesitas selisihnya bisa lebih dari 50 mL/menit.
                  </span>
                </label>
              </Kelompok>
            )}

            <div className="flex flex-wrap gap-2 pt-1">
              <Tombol utama onClick={hitung}><Calculator size={13} /> Hitung</Tombol>
              <Tombol onClick={contoh}><Wand2 size={13} /> Isi contoh</Tombol>
              <Tombol onClick={() => { setF(KOSONG); setHasil(null); }}><RotateCcw size={13} /> Kosongkan</Tombol>
            </div>
          </div>
        </Kartu>

        {hasil?.tabelBerat?.length > 1 && (
          <Kartu judul="Pengaruh pilihan berat badan">
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-[12.5px] border-collapse">
                <thead>
                  <tr className="border-b border-alba-200">
                    <th className="text-left text-[11px] uppercase tracking-wider font-bold text-stone-400 py-2 pr-2">Estimasi berat</th>
                    <th className="text-right text-[11px] uppercase tracking-wider font-bold text-stone-400 py-2 px-2">Nilai</th>
                    <th className="text-right text-[11px] uppercase tracking-wider font-bold text-stone-400 py-2 pl-2">C-G bila dipakai</th>
                  </tr>
                </thead>
                <tbody>
                  {hasil.tabelBerat.map((b) => (
                    <tr key={b.nama} className="border-b border-alba-200/60 last:border-b-0">
                      <td className="py-2 pr-2 text-stone-600">{b.nama}</td>
                      <td className="py-2 px-2 text-right font-semibold tabular-nums text-stone-800">{b.nilai}</td>
                      <td className="py-2 pl-2 text-right font-semibold tabular-nums text-stone-800">{b.cg}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-stone-400 mt-3">
              Ini sumber kesalahan dosis antibiotik yang paling sering: angka yang sama bisa berubah drastis hanya karena berat yang dimasukkan berbeda.
            </p>
          </Kartu>
        )}

        <div className="space-y-2.5">
          <Lipat judul="Panduan singkat penyesuaian dosis">
            <ul className="list-disc pl-4 space-y-1.5">
              <li><b>&gt; 50 mL/menit</b> — umumnya dosis penuh.</li>
              <li><b>30–50</b> — banyak antibiotik (sefalosporin, karbapenem) perlu perpanjangan interval.</li>
              <li><b>10–30</b> — kurangi dosis dan/atau perpanjang interval; hindari NSAID, metformin, nitrofurantoin.</li>
              <li><b>&lt; 10 atau dialisis</b> — dosis khusus, sesuaikan waktu pemberian dengan sesi dialisis.</li>
            </ul>
            <p>Ini hanya rambu kasar. Selalu cek referensi dosis spesifik obatnya.</p>
          </Lipat>
          <Lipat judul="Kapan estimasi berbasis kreatinin menyesatkan">
            <ul className="list-disc pl-4 space-y-1.5">
              <li>Massa otot ekstrem (binaragawan, amputasi, tetraplegia, sarkopenia lansia)</li>
              <li>Kehamilan, sirosis, asites masif</li>
              <li>Diet vegetarian ketat atau konsumsi daging berlebih sesaat sebelum pemeriksaan</li>
              <li>Obat yang menghambat sekresi tubular kreatinin (trimetoprim, simetidin, cobicistat) — kreatinin naik tanpa GFR turun</li>
              <li>AKI aktif, karena kreatinin tertinggal beberapa jam di belakang GFR sesungguhnya</li>
            </ul>
          </Lipat>
          <Lipat judul="eGFR normal anak menurut usia (mL/mnt/1,73m², rerata ± SD)">
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-[12.5px]">
                <tbody>
                  {[
                    ['1 minggu (cukup bulan)', '41 ± 15', '41 ± 15'],
                    ['2–8 minggu', '66 ± 25', '66 ± 25'],
                    ['> 8 minggu', '96 ± 22', '96 ± 22'],
                    ['2–12 tahun', '133 ± 27', '133 ± 27'],
                    ['13–21 tahun', '140 ± 30', '126 ± 22'],
                  ].map((r) => (
                    <tr key={r[0]} className="border-b border-alba-200/60 last:border-b-0">
                      <td className="py-1.5 pr-2">{r[0]}</td>
                      <td className="py-1.5 px-2 text-right tabular-nums">{r[1]}</td>
                      <td className="py-1.5 pl-2 text-right tabular-nums">{r[2]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Lipat>
        </div>
      </div>

      <div className="lg:sticky lg:top-24 space-y-5">
        <Kartu
          judul="Hasil"
          kanan={hasil && (
            <div className="flex gap-1.5">
              <button onClick={() => onSimpan({ judul: judulSimpan, kategori: hasil.kategori, ringkas: hasil.ringkas })} title="Simpan ke riwayat" className="w-7 h-7 rounded-md text-stone-400 hover:bg-maroon-50 hover:text-maroon-600 flex items-center justify-center"><Save size={13} /></button>
              <button onClick={() => onSalin(hasil.ringkas, judulSimpan)} title="Salin teks" className="w-7 h-7 rounded-md text-stone-400 hover:bg-maroon-50 hover:text-maroon-600 flex items-center justify-center"><Copy size={13} /></button>
            </div>
          )}
        >
          {!hasil ? (
            <Kosong>Lengkapi data lalu tekan <b>Hitung</b>.</Kosong>
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
