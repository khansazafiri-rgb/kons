import React, { useEffect, useState } from 'react';
import { Baby, Copy, Droplets, FlaskConical, History, Printer, Stethoscope, Trash2 } from 'lucide-react';
import Header from '@/components/Header';
import useUrlState from '@/lib/useUrlState';
import { Kartu, Kosong, Pil, Tombol } from '@/components/klinis/UiKlinis';
import PanelOsmolalitas from '@/components/klinis/PanelOsmolalitas';
import PanelGinjal from '@/components/klinis/PanelGinjal';
import PanelGizi from '@/components/klinis/PanelGizi';
import { bacaRiwayat, entriKeTeks, hapusRiwayat, kosongkanRiwayat, simpanRiwayat, waktuTeks } from '@/lib/klinis/riwayat';

// KALKULATOR KLINIS - ruang coba-coba interaktif di web siswa.
//
// Bedanya dengan halaman lain: di sini tidak ada soal, skor, atau progres yang
// tercatat. Siswa memasukkan angka, melihat hasilnya berubah, lalu membongkar
// "cara hitung"-nya. Yang dilatih adalah kebiasaan memeriksa angka - termasuk
// menyadari kapan sebuah rumus TIDAK boleh dipakai, yang di tiap kalkulator
// ditampilkan sebagai catatan berwarna, bukan disembunyikan di catatan kaki.
//
// Tiga kalkulator dipilih karena ketiganya sering dihitung salah justru pada
// hal kecil: satuan ureum vs BUN, berat badan mana untuk Cockcroft-Gault, dan
// panjang telentang vs tinggi berdiri pada balita.
//
// Isian TIDAK pernah dikirim ke server. Riwayat pun hanya di localStorage
// perangkat (lihat lib/klinis/riwayat.js) - angka pasien tidak boleh menumpang
// di server web belajar.

const TAB = [
  { id: 'osmolalitas', label: 'Osmolalitas', ikon: Droplets },
  { id: 'ginjal', label: 'Klirens Kreatinin', ikon: FlaskConical },
  { id: 'gizi', label: 'Status Gizi Anak', ikon: Baby },
  { id: 'riwayat', label: 'Riwayat', ikon: History },
];

export default function KalkulatorKlinis() {
  const [tab, setTab] = useUrlState('alat', 'osmolalitas');
  const [riwayat, setRiwayat] = useState(() => bacaRiwayat());
  const [pesan, setPesan] = useState('');

  const aktif = TAB.some((t) => t.id === tab) ? tab : 'osmolalitas';

  // Pesan singkat (validasi / konfirmasi) yang hilang sendiri, supaya tidak
  // menumpuk jadi daftar peringatan lama yang tidak relevan lagi.
  useEffect(() => {
    if (!pesan) return undefined;
    const t = setTimeout(() => setPesan(''), 4000);
    return () => clearTimeout(t);
  }, [pesan]);

  const simpan = (entri) => {
    setRiwayat(simpanRiwayat(entri));
    setPesan('Tersimpan ke riwayat.');
  };

  const salin = (ringkas, judul) => {
    const teks = [judul, ...ringkas.map(([k, v]) => `${k}: ${v}`)].join('\n');
    navigator.clipboard?.writeText(teks).then(
      () => setPesan('Disalin ke clipboard.'),
      () => setPesan('Gagal menyalin — browser menolak akses clipboard.'),
    );
  };

  const props = { onSimpan: simpan, onSalin: salin, onPesan: setPesan };

  return (
    <div className="min-h-screen bg-grid-soft">
      <Header />

      <div className="max-w-6xl mx-auto px-6 pt-14 pb-6">
        <p className="text-maroon-600 font-bold tracking-[0.2em] text-xs mb-2 flex items-center gap-2">
          <Stethoscope size={14} />
          KALKULATOR KLINIS
        </p>
        <h1 className="font-display text-3xl font-semibold mb-2">Ruang Hitung</h1>
        <p className="text-sm text-stone-500 max-w-2xl leading-relaxed">
          Masukkan angka, lihat hasilnya, lalu buka <b>Cara hitung</b> untuk menelusuri asal setiap angka.
          Tidak ada nilai atau progres yang dicatat di sini — bebas dicoba-coba sampai paham.
        </p>
      </div>

      {/* Tab menempel di bawah Header supaya berpindah alat tidak perlu
          menggulung balik ke atas saat isian sudah panjang. */}
      <div className="sticky top-[57px] md:top-[61px] z-10 bg-alba-50/90 backdrop-blur border-y border-alba-200">
        <div className="max-w-6xl mx-auto px-6 flex gap-1 overflow-x-auto scrollbar-thin">
          {TAB.map((t) => {
            const Ikon = t.ikon;
            const on = aktif === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`shrink-0 flex items-center gap-2 px-4 py-3 text-[13px] font-semibold border-b-[2.5px] -mb-px transition-colors ${
                  on ? 'border-maroon-600 text-maroon-600' : 'border-transparent text-stone-500 hover:text-maroon-600'
                }`}
              >
                <Ikon size={14} />
                {t.label}
                {t.id === 'riwayat' && riwayat.length > 0 && (
                  <span className="rounded-full bg-maroon-600 text-alba-50 text-[10px] font-bold px-1.5 py-0.5 leading-none">
                    {riwayat.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {pesan && (
          <p className="mb-5 text-sm rounded-lg bg-gold-100/60 border border-gold-200 text-gold-600 px-4 py-2.5">
            {pesan}
          </p>
        )}

        {aktif === 'osmolalitas' && <PanelOsmolalitas {...props} />}
        {aktif === 'ginjal' && <PanelGinjal {...props} />}
        {aktif === 'gizi' && <PanelGizi {...props} />}
        {aktif === 'riwayat' && (
          <TabRiwayat
            riwayat={riwayat}
            setRiwayat={setRiwayat}
            onPesan={setPesan}
          />
        )}

        <p className="mt-10 pt-5 border-t border-alba-200 text-[11.5px] text-stone-400 leading-relaxed">
          <b className="text-stone-500">Kalkulator Klinis PCV</b> — alat bantu hitung untuk belajar dan memeriksa ulang,
          bukan pengganti penilaian klinis. Selalu verifikasi angka penting secara manual dan sesuaikan dengan protokol
          institusi tempat kamu bertugas.
          <br />
          Standar antropometri: WHO Child Growth Standards 2006 (0–60 bulan) dan WHO Growth Reference 2007 (5–19 tahun),
          kategori mengikuti Permenkes RI No. 2 Tahun 2020. eGFR: CKD-EPI creatinine 2021 (tanpa koefisien ras).
          Klasifikasi PGK: KDIGO 2012.
        </p>
      </div>
    </div>
  );
}

function TabRiwayat({ riwayat, setRiwayat, onPesan }) {
  const salinSemua = () => {
    const teks = riwayat.map(entriKeTeks).join('\n\n');
    navigator.clipboard?.writeText(teks).then(
      () => onPesan('Seluruh riwayat disalin.'),
      () => onPesan('Gagal menyalin — browser menolak akses clipboard.'),
    );
  };

  const kosongkan = () => {
    if (!window.confirm('Kosongkan seluruh riwayat perhitungan? Tindakan ini tidak bisa dibatalkan.')) return;
    setRiwayat(kosongkanRiwayat());
    onPesan('Riwayat dikosongkan.');
  };

  return (
    <Kartu
      judul="Riwayat perhitungan"
      kanan={<Pil tone="info">{riwayat.length} entri</Pil>}
      className="max-w-3xl"
    >
      <div className="flex flex-wrap gap-2 mb-5">
        <Tombol onClick={salinSemua} disabled={!riwayat.length}><Copy size={13} /> Salin semua</Tombol>
        <Tombol onClick={() => window.print()} disabled={!riwayat.length}><Printer size={13} /> Cetak / simpan PDF</Tombol>
        <Tombol onClick={kosongkan} disabled={!riwayat.length}><Trash2 size={13} /> Kosongkan</Tombol>
      </div>

      {!riwayat.length ? (
        <Kosong>
          Belum ada perhitungan yang disimpan.
          <br />
          Tekan ikon <b>simpan</b> di kartu hasil untuk menyimpannya ke sini.
        </Kosong>
      ) : (
        <div className="space-y-3">
          {riwayat.map((r) => (
            <div key={r.id} className="rounded-xl border border-alba-200 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[13px] font-bold text-stone-800">{r.judul}</span>
                {r.kategori && <Pil tone={r.kategori.tone}>{r.kategori.teks}</Pil>}
                <span className="ml-auto flex items-center gap-2">
                  <span className="text-[11px] text-stone-400">{waktuTeks(r.waktu)}</span>
                  <button
                    onClick={() => setRiwayat(hapusRiwayat(r.id))}
                    title="Hapus entri ini"
                    className="w-7 h-7 rounded-md text-stone-400 hover:bg-red-50 hover:text-red-600 flex items-center justify-center"
                  >
                    <Trash2 size={13} />
                  </button>
                </span>
              </div>
              <div className="mt-2">
                {(r.ringkas || []).map(([k, v], i) => (
                  <div key={i} className="flex justify-between gap-3 py-1 text-[12.5px] border-b border-dashed border-alba-200 last:border-b-0">
                    <span className="text-stone-500">{k}</span>
                    <span className="font-semibold tabular-nums text-right text-stone-800">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="mt-5 text-[11px] text-stone-400 leading-relaxed">
        Riwayat disimpan di perangkat ini saja (localStorage), tidak pernah dikirim ke server PCV. Menghapus data situs
        atau membuka web dari perangkat lain akan membuat daftar ini kosong.
      </p>
    </Kartu>
  );
}
