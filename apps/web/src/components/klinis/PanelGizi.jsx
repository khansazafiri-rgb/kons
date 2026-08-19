import React, { useMemo, useState } from 'react';
import { Calculator, Copy, RotateCcw, Save, Wand2 } from 'lucide-react';
import {
  Baris, Catatan, CaraHitung, DaftarNilai, Hasil, Isian, Kartu, Kelompok, Kosong, Lipat, Pil, PitaZ, Segmen, Tombol,
} from '@/components/klinis/UiKlinis';
import KurvaPertumbuhan from '@/components/klinis/KurvaPertumbuhan';
import { ada, angZ, baca } from '@/lib/klinis/format';
import { KURVA, dataKurva, hitungGizi, usiaDariManual, usiaDariTanggal, usiaTeks } from '@/lib/klinis/gizi';

const SEX = [{ id: 1, label: 'Laki-laki' }, { id: 2, label: 'Perempuan' }];
const MODE_USIA = [{ id: 'tanggal', label: 'Tanggal lahir' }, { id: 'manual', label: 'Usia manual' }];
const POSISI = [{ id: 'telentang', label: 'Telentang (panjang)' }, { id: 'berdiri', label: 'Berdiri (tinggi)' }];
const EDEMA = [{ id: false, label: 'Tidak ada' }, { id: true, label: 'Ada, bilateral' }];

const hariIni = () => new Date().toISOString().slice(0, 10);
const KOSONG = {
  nama: '', sex: 1, modeUsia: 'tanggal', lahir: '', periksa: hariIni(),
  tahun: '', bulan: '', hari: '', berat: '', tinggi: '', posisiUkur: 'telentang',
  lingkarKepala: '', lila: '', edema: false,
};

export default function PanelGizi({ onSimpan, onSalin, onPesan }) {
  const [f, setF] = useState(KOSONG);
  const [hasil, setHasil] = useState(null);
  const [kurva, setKurva] = useState('bbu');
  const ubah = (k) => (v) => setF((p) => ({ ...p, [k]: v }));

  // Usia dihitung ulang di tiap ketikan supaya bisa ditampilkan sebagai
  // umpan balik langsung - salah ketik tanggal lahir paling cepat ketahuan
  // dari umurnya yang jadi aneh, bukan dari z-score di ujung proses.
  const usia = useMemo(
    () => (f.modeUsia === 'tanggal'
      ? usiaDariTanggal(f.lahir, f.periksa)
      : usiaDariManual(baca(f.tahun), baca(f.bulan), baca(f.hari))),
    [f.modeUsia, f.lahir, f.periksa, f.tahun, f.bulan, f.hari],
  );

  const hitung = () => {
    const r = hitungGizi({
      sex: f.sex,
      usia,
      berat: baca(f.berat),
      tinggi: baca(f.tinggi),
      posisiUkur: f.posisiUkur,
      lingkarKepala: baca(f.lingkarKepala),
      lila: baca(f.lila),
      edema: f.edema,
    });
    if (r.error) { onPesan(r.error); setHasil(null); return; }
    setHasil(r);
  };

  const contoh = () => {
    const lahir = new Date(Date.now() - 731 * 86400000).toISOString().slice(0, 10);
    setF({ ...KOSONG, nama: 'Contoh', sex: 1, lahir, berat: '9', tinggi: '82', posisiUkur: 'berdiri', lingkarKepala: '46,5' });
    setHasil(null);
    onPesan('Contoh dimuat: anak laki-laki 24 bulan, 9 kg, 82 cm. Tekan Hitung.');
  };

  // Titik anak pada kurva: sumbu X-nya umur, kecuali kurva BB/TB yang sumbu
  // X-nya justru panjang/tinggi badan.
  const dataGrafik = useMemo(() => {
    if (!hasil || !usia) return null;
    const nilaiY = {
      bbu: baca(f.berat),
      tbu: hasil.tinggiDipakai,
      imt: hasil.imt,
      lk: baca(f.lingkarKepala),
      bbtb: baca(f.berat),
    }[kurva];
    if (!ada(nilaiY)) return null;
    return dataKurva(kurva, f.sex, usia.bulan, { x: hasil.tinggiDipakai, y: nilaiY });
  }, [hasil, usia, kurva, f.sex, f.berat, f.lingkarKepala]);

  const infoKurva = KURVA.find((k) => k.id === kurva);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px] items-start">
      <div className="space-y-5">
        <Kartu judul="Data anak">
          <div className="space-y-5">
            <Kelompok judul="Identitas">
              <Baris>
                <Isian label="Nama / inisial" petunjuk="opsional" tipe="text" nilai={f.nama} onChange={ubah('nama')} placeholder="—" />
                <Segmen label="Jenis kelamin" pilihan={SEX} nilai={f.sex} onChange={ubah('sex')} />
              </Baris>
            </Kelompok>

            <Kelompok judul="Usia">
              <Segmen pilihan={MODE_USIA} nilai={f.modeUsia} onChange={ubah('modeUsia')} />
              <div className="mt-3">
                {f.modeUsia === 'tanggal' ? (
                  <Baris>
                    <Isian label="Tanggal lahir" tipe="date" nilai={f.lahir} onChange={ubah('lahir')} />
                    <Isian label="Tanggal pengukuran" tipe="date" nilai={f.periksa} onChange={ubah('periksa')} />
                  </Baris>
                ) : (
                  <Baris>
                    <Isian label="Tahun" satuan="th" nilai={f.tahun} onChange={ubah('tahun')} placeholder="2" />
                    <Isian label="Bulan" satuan="bln" nilai={f.bulan} onChange={ubah('bulan')} placeholder="0" />
                    <Isian label="Hari" satuan="hr" nilai={f.hari} onChange={ubah('hari')} placeholder="0" />
                  </Baris>
                )}
              </div>
              {usia && (
                <p className="mt-2.5 text-[11.5px] text-stone-600 bg-alba-100 border border-alba-200 rounded-lg px-3 py-2">
                  <b>Usia:</b> {usiaTeks(usia)}
                  {usia.bulan > 228 && <span className="text-red-600"> — di luar rentang standar WHO (maks 19 tahun)</span>}
                </p>
              )}
            </Kelompok>

            <Kelompok judul="Antropometri">
              <Baris>
                <Isian label="Berat badan" satuan="kg" nilai={f.berat} onChange={ubah('berat')} placeholder="9,0" />
                <Isian label="Panjang / tinggi" satuan="cm" nilai={f.tinggi} onChange={ubah('tinggi')} placeholder="82" />
                <Isian label="Lingkar kepala" petunjuk="≤ 5 th" satuan="cm" nilai={f.lingkarKepala} onChange={ubah('lingkarKepala')} placeholder="46,5" />
                <Isian label="LILA" petunjuk="6–59 bln" satuan="cm" nilai={f.lila} onChange={ubah('lila')} placeholder="13,0" />
              </Baris>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Segmen label="Cara ukur panjang/tinggi" pilihan={POSISI} nilai={f.posisiUkur} onChange={ubah('posisiUkur')} />
                <Segmen label="Edema pitting" pilihan={EDEMA} nilai={f.edema} onChange={ubah('edema')} />
              </div>
              <p className="text-[11px] text-stone-400 mt-2">
                Cara ukur penting: standar WHO memakai panjang telentang di bawah 24 bulan dan tinggi berdiri di atasnya.
                Beda keduanya 0,7 cm — cukup untuk menggeser z-score sekitar 0,3 SD, dan dikoreksi otomatis di sini.
              </p>
            </Kelompok>

            <div className="flex flex-wrap gap-2 pt-1">
              <Tombol utama onClick={hitung}><Calculator size={13} /> Hitung</Tombol>
              <Tombol onClick={contoh}><Wand2 size={13} /> Isi contoh</Tombol>
              <Tombol onClick={() => { setF({ ...KOSONG, periksa: hariIni() }); setHasil(null); }}><RotateCcw size={13} /> Kosongkan</Tombol>
            </div>
          </div>
        </Kartu>

        {hasil && (
          <Kartu judul="Indikator antropometri">
            <div className="space-y-2.5">
              {hasil.indikator.length === 0 && <Kosong>Tidak ada indikator yang bisa dihitung dari data ini.</Kosong>}
              {hasil.indikator.map((r) => (
                <div
                  key={r.kunci}
                  className={`rounded-xl border p-3.5 ${
                    r.lewat ? 'border-alba-200' : r.kat.tone === 'bad' ? 'border-red-200' : r.kat.tone === 'warn' ? 'border-gold-200' : 'border-alba-200'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-[13px] font-bold text-stone-800">{r.nama}</span>
                    {r.lewat ? (
                      <span className="ml-auto shrink-0"><Pil tone="info">tidak dihitung</Pil></span>
                    ) : (
                      <span className="ml-auto shrink-0 font-display text-lg font-semibold tabular-nums tracking-tight">
                        {angZ(r.z)}
                      </span>
                    )}
                  </div>
                  {r.lewat ? (
                    <p className="text-[11.5px] text-stone-500 mt-1 leading-relaxed">{r.lewat}</p>
                  ) : (
                    <>
                      <p className="text-[12.5px] font-semibold mt-0.5 flex flex-wrap items-center gap-1.5">
                        <span className={r.kat.tone === 'bad' ? 'text-red-600' : r.kat.tone === 'warn' ? 'text-gold-600' : r.kat.tone === 'ok' ? 'text-green-800' : 'text-stone-600'}>
                          {r.kat.teks}
                        </span>
                        <Pil tone="info">{r.kat.tag}</Pil>
                      </p>
                      <PitaZ z={r.z} />
                      <p className="text-[11px] text-stone-400 mt-1.5">{r.rinci}</p>
                    </>
                  )}
                </div>
              ))}
            </div>
          </Kartu>
        )}

        {hasil && dataGrafik && (
          <Kartu
            judul="Kurva pertumbuhan WHO"
            kanan={
              <select
                value={kurva}
                onChange={(e) => setKurva(e.target.value)}
                className="rounded-lg border border-alba-300 bg-alba-50 px-2 py-1 text-[11px] font-semibold text-stone-600"
              >
                {KURVA.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
              </select>
            }
          >
            <KurvaPertumbuhan data={dataGrafik} sumbuX={infoKurva.sumbuX} sumbuY={infoKurva.sumbuY} />
            <p className="text-[11px] text-stone-400 mt-2">
              Garis tebal = median (0 SD), garis emas = ±2 SD, garis putus merah = ±3 SD. Titik merah adalah posisi anak ini.
            </p>
          </Kartu>
        )}

        <Lipat judul="Batas kategori yang dipakai (Permenkes RI No. 2 Tahun 2020)">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-alba-200 text-[10.5px] uppercase tracking-wider text-stone-400">
                  <th className="text-left py-1.5 pr-2 font-bold">Indeks</th>
                  <th className="text-left py-1.5 px-2 font-bold">Ambang</th>
                  <th className="text-left py-1.5 pl-2 font-bold">Kategori</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['BB/U (0–60 bln)', '< −3 SD', 'Berat badan sangat kurang'],
                  ['', '−3 s.d. < −2 SD', 'Berat badan kurang'],
                  ['', '−2 s.d. +1 SD', 'Berat badan normal'],
                  ['', '> +1 SD', 'Risiko berat badan lebih'],
                  ['PB/U · TB/U', '< −3 SD', 'Sangat pendek'],
                  ['', '−3 s.d. < −2 SD', 'Pendek'],
                  ['', '−2 s.d. +3 SD', 'Normal'],
                  ['', '> +3 SD', 'Tinggi'],
                  ['BB/PB · BB/TB · IMT/U 0–60 bln', '< −3 SD', 'Gizi buruk'],
                  ['', '−3 s.d. < −2 SD', 'Gizi kurang'],
                  ['', '−2 s.d. +1 SD', 'Gizi baik'],
                  ['', '> +1 s.d. +2 SD', 'Berisiko gizi lebih'],
                  ['', '> +2 s.d. +3 SD', 'Gizi lebih'],
                  ['', '> +3 SD', 'Obesitas'],
                  ['IMT/U 5–18 tahun', '< −3 SD', 'Gizi buruk'],
                  ['', '−3 s.d. < −2 SD', 'Gizi kurang'],
                  ['', '−2 s.d. +1 SD', 'Gizi baik'],
                  ['', '> +1 s.d. +2 SD', 'Gizi lebih'],
                  ['', '> +2 SD', 'Obesitas'],
                ].map((r, i) => (
                  <tr key={i} className="border-b border-alba-200/60 last:border-b-0">
                    <td className="py-1.5 pr-2 font-semibold text-stone-600">{r[0]}</td>
                    <td className="py-1.5 px-2 tabular-nums whitespace-nowrap">{r[1]}</td>
                    <td className="py-1.5 pl-2">{r[2]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Lipat>
      </div>

      <div className="lg:sticky lg:top-24 space-y-5">
        <Kartu
          judul="Kesimpulan"
          kanan={hasil && (
            <div className="flex gap-1.5">
              <button
                onClick={() => onSimpan({ judul: `Status gizi ${f.nama || 'anak'}`, kategori: hasil.kategori, ringkas: hasil.ringkas })}
                title="Simpan ke riwayat"
                className="w-7 h-7 rounded-md text-stone-400 hover:bg-maroon-50 hover:text-maroon-600 flex items-center justify-center"
              ><Save size={13} /></button>
              <button
                onClick={() => onSalin(hasil.ringkas, `Status gizi ${f.nama || 'anak'}`)}
                title="Salin teks"
                className="w-7 h-7 rounded-md text-stone-400 hover:bg-maroon-50 hover:text-maroon-600 flex items-center justify-center"
              ><Copy size={13} /></button>
            </div>
          )}
        >
          {!hasil ? (
            <Kosong>Isi usia dan minimal berat atau tinggi, lalu tekan <b>Hitung</b>.</Kosong>
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

        {hasil?.kebutuhan && (
          <Kartu judul="Perkiraan kebutuhan gizi">
            <DaftarNilai baris={hasil.kebutuhan.baris} />
            <div className="mt-3 space-y-2.5">
              <Catatan tone="info">
                Kebutuhan dihitung dari <b>RDA menurut height-age</b> dikalikan <b>berat badan ideal</b>, bukan berat aktual —
                cara yang dipakai untuk terapi gizi anak agar target catch-up growth tercapai tanpa memberi beban berlebih.
              </Catatan>
              {hasil.kebutuhan.catatan.map((c, i) => <Catatan key={i} tone={c.tone}>{c.isi}</Catatan>)}
            </div>
          </Kartu>
        )}
      </div>
    </div>
  );
}
