import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  AlertCircle, CheckCircle2, ChevronRight, Clock3, Loader2, MapPin, Minus, Package,
  Plus, ShieldCheck, ShoppingBag, Sparkles, Users,
} from 'lucide-react';
import RentalLayout, { BarBawah, RentalMati, RentalMemuat, useKonfigurasiRental } from '@/components/rental/RentalLayout';
import PemilihJadwal from '@/components/rental/PemilihJadwal';
import FotoItem from '@/components/rental/FotoItem';
import IsiHtml from '@/components/rental/IsiHtml';
import {
  SATUAN, ambilDetail, ambilStok, durasiKalimat, jadwalKalimat, menitKeJam, periksaKeranjang,
  pitaTanggal, rupiah, tambahKeKeranjang, tanggalWibHariIni,
} from '@/lib/rental';

// DETAIL RUANG / ALAT (PRD bagian 7.1 poin 3 & 4)
//
// Susunannya dari dua sumber yang saling melengkapi:
//
//   Airbnb - mosaik foto 1 besar + 4 kecil, dua kolom dengan KARTU PESAN yang
//            lengket di kanan, dan bar harga di bawah layar HP.
//   Klook  - pemilihan jadwal di KOLOM UTAMA, bukan dijejalkan ke kartu kecil.
//            Pita tanggal + pil jam butuh ruang; di kartu samping ia jadi
//            deretan tombol mungil yang susah diketuk.
//
// HARGA DI KARTU DIHITUNG SERVER. Begitu jadwal lengkap, halaman bertanya ke
// /api/rental/periksa - endpoint yang sama yang dipakai checkout - jadi angka
// yang dilihat pelanggan di sini persis angka yang nanti ditagihkan admin.

const JAM_PILIHAN = [];
for (let m = 0; m < 24 * 60; m += 30) JAM_PILIHAN.push(menitKeJam(m));

// Jadwal alat: tanggal ambil (pita), lama pinjam (chip hari), jam ambil & kembali.
function PemilihJadwalAlat({ onUbah }) {
  const hariIni = tanggalWibHariIni();
  const [tanggal, setTanggal] = useState(hariIni);
  const [hari, setHari] = useState(1);
  const [jamAmbil, setJamAmbil] = useState('09:00');
  const [jamKembali, setJamKembali] = useState('17:00');
  const pita = useMemo(() => pitaTanggal(hariIni, 14), [hariIni]);

  useEffect(() => {
    // +07:00 ditulis eksplisit supaya jamnya diartikan WIB, bukan zona waktu
    // perangkat pelanggan.
    const awal = new Date(`${tanggal}T${jamAmbil}:00+07:00`);
    const akhir = new Date(`${tanggal}T${jamKembali}:00+07:00`);
    akhir.setUTCDate(akhir.getUTCDate() + (hari - 1));
    onUbah(akhir > awal ? { mulai: awal.toISOString(), selesai: akhir.toISOString() } : null);
  }, [tanggal, hari, jamAmbil, jamKembali, onUbah]);

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-[12px] font-bold uppercase tracking-wide text-slate-500">Tanggal ambil</p>
        <div className="-my-1 flex gap-2 overflow-x-auto py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {pita.map((t) => {
            const aktif = t.tanggal === tanggal;
            return (
              <button
                key={t.tanggal}
                type="button"
                onClick={() => setTanggal(t.tanggal)}
                className={`flex w-[52px] shrink-0 flex-col items-center rounded-2xl border py-2 transition-colors ${
                  aktif ? 'border-sewa bg-sewa text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'
                }`}
              >
                <span className={`text-[10px] font-bold uppercase ${aktif ? 'text-white/80' : 'text-slate-400'}`}>{t.tanggal === hariIni ? 'Ini' : t.hari}</span>
                <span className="text-lg font-extrabold leading-tight">{t.tgl}</span>
                <span className={`text-[10px] font-semibold ${aktif ? 'text-white/80' : 'text-slate-400'}`}>{t.bulan}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-2 text-[12px] font-bold uppercase tracking-wide text-slate-500">Lama pinjam</p>
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 5, 7].map((h) => (
            <button
              key={h}
              type="button"
              onClick={() => setHari(h)}
              className={`rounded-full px-4 py-2 text-[13px] font-bold transition-colors ${
                hari === h ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {h} hari
            </button>
          ))}
          <label className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-[13px] font-bold text-slate-600">
            <input
              type="number"
              min={1}
              max={30}
              value={hari}
              onChange={(ev) => setHari(Math.max(1, Math.min(30, Number(ev.target.value) || 1)))}
              className="w-10 bg-transparent text-center focus:outline-none"
              aria-label="Jumlah hari lain"
            />
            hari
          </label>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Jam ambil', nilai: jamAmbil, ubah: setJamAmbil },
          { label: hari > 1 ? 'Jam kembali (hari terakhir)' : 'Jam kembali', nilai: jamKembali, ubah: setJamKembali },
        ].map((f) => (
          <label key={f.label} className="block rounded-2xl bg-slate-100 px-4 py-2.5 focus-within:bg-white focus-within:ring-2 focus-within:ring-sewa">
            <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-500">{f.label}</span>
            <select value={f.nilai} onChange={(ev) => f.ubah(ev.target.value)} className="w-full bg-transparent text-[15px] font-bold text-slate-900 focus:outline-none">
              {JAM_PILIHAN.map((j) => <option key={j} value={j}>{j}</option>)}
            </select>
          </label>
        ))}
      </div>
    </div>
  );
}

function Mosaik({ foto, tipe, nama }) {
  if (!foto?.length) {
    return (
      <div className="h-56 overflow-hidden rounded-3xl sm:h-72">
        <FotoItem tipe={tipe} nama={nama} besar />
      </div>
    );
  }
  if (foto.length === 1) {
    return <div className="h-64 overflow-hidden rounded-3xl sm:h-[26rem]"><FotoItem src={foto[0]} tipe={tipe} nama={nama} /></div>;
  }
  const kecil = foto.slice(1, 5);
  return (
    <div className="grid h-64 grid-cols-4 grid-rows-2 gap-2 overflow-hidden rounded-3xl sm:h-[26rem]">
      <div className="col-span-4 row-span-2 sm:col-span-2"><FotoItem src={foto[0]} tipe={tipe} nama={nama} /></div>
      {kecil.map((f, i) => (
        <div key={f} className={`hidden sm:block ${kecil.length < 3 && i === 0 ? 'col-span-2' : ''} ${kecil.length === 1 ? 'row-span-2' : ''}`}>
          <FotoItem src={f} tipe={tipe} nama={nama} />
        </div>
      ))}
    </div>
  );
}

function Rekomendasi({ daftar, sorot }) {
  if (!daftar?.length) return null;
  return (
    <section id="rekomendasi" className={`scroll-mt-24 rounded-3xl p-5 transition-colors sm:p-6 ${sorot ? 'bg-sewa/10 ring-2 ring-sewa/30' : 'bg-white ring-1 ring-slate-200/70'}`}>
      <h2 className="flex items-center gap-2 text-lg font-extrabold text-slate-900">
        <Sparkles size={18} className="text-sewa" /> Sering disewa bersamaan
      </h2>
      <p className="mt-0.5 text-[13px] text-slate-500">Dipilihkan admin. Tidak otomatis masuk keranjang.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {daftar.map((r) => (
          <Link
            key={`${r.tipe}-${r.id}`}
            to={r.tipe === 'ALAT' ? `/peminjaman/alat/${r.slug}` : `/peminjaman/ruang/${r.slug}`}
            className="group flex items-center gap-3 rounded-2xl bg-white p-2.5 ring-1 ring-slate-200 transition-shadow hover:shadow-lembut"
          >
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl"><FotoItem src={r.foto?.[0]} tipe={r.tipe} nama={r.nama} /></div>
            <div className="min-w-0 flex-1">
              <p className="line-clamp-1 text-[14px] font-bold text-slate-900">{r.nama}</p>
              <p className="text-[12px] text-slate-500">{r.catatan || (r.tipe === 'ALAT' ? 'Alat' : 'Ruang')} · <b className="text-slate-800">{rupiah(r.harga)}</b></p>
            </div>
            <ChevronRight size={16} className="shrink-0 text-slate-300 group-hover:text-sewa" />
          </Link>
        ))}
      </div>
    </section>
  );
}

export default function RentalDetail({ tipe = 'RUANG' }) {
  const { slug } = useParams();
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const { memuat: memuatKonfigurasi, konfigurasi } = useKonfigurasiRental();

  const [data, setData] = useState(null);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState('');
  const [jadwal, setJadwal] = useState(null);
  const [jumlah, setJumlah] = useState(1);
  const [stok, setStok] = useState(null);
  const [harga, setHarga] = useState(null); // { total, pesan } dari server
  const [menghitung, setMenghitung] = useState(false);
  const [masuk, setMasuk] = useState(false);

  const isAlat = tipe === 'ALAT';
  const ubahJadwal = useCallback((j) => { setJadwal(j); setMasuk(false); }, []);

  useEffect(() => {
    let hidup = true;
    setMemuat(true);
    setJadwal(null);
    setMasuk(false);
    ambilDetail(tipe, slug)
      .then((d) => { if (hidup) { setData(d); setGalat(''); } })
      .catch((err) => { if (hidup) setGalat(err.message || 'Gagal memuat data.'); })
      .finally(() => { if (hidup) setMemuat(false); });
    return () => { hidup = false; };
  }, [tipe, slug]);

  // Sisa stok alat baru berarti setelah jadwalnya diketahui (PRD bagian 15).
  useEffect(() => {
    if (!isAlat || !jadwal || !data?.item) { setStok(null); return undefined; }
    let hidup = true;
    ambilStok(data.item.slug, jadwal.mulai, jadwal.selesai)
      .then((s) => { if (hidup) setStok(s); })
      .catch(() => { if (hidup) setStok(null); });
    return () => { hidup = false; };
  }, [isAlat, jadwal, data]);

  // Harga dari server, untuk jadwal & jumlah yang sedang dipilih.
  useEffect(() => {
    if (!jadwal || !data?.item) { setHarga(null); return undefined; }
    let hidup = true;
    setMenghitung(true);
    const t = setTimeout(() => {
      periksaKeranjang([{ tipe, id: data.item.slug, jumlah: isAlat ? jumlah : 1, mulai: jadwal.mulai, selesai: jadwal.selesai }])
        .then((h) => {
          if (!hidup) return;
          if (h.bisa) setHarga({ total: h.baris?.[0]?.total || 0, pesan: '' });
          else setHarga({ total: 0, pesan: h.galat?.[0]?.pesan || 'Jadwal ini tidak bisa dipesan.' });
        })
        .catch(() => { if (hidup) setHarga(null); })
        .finally(() => { if (hidup) setMenghitung(false); });
    }, 250);
    return () => { hidup = false; clearTimeout(t); };
  }, [jadwal, jumlah, data, tipe, isAlat]);

  if (memuatKonfigurasi) return <RentalMemuat />;
  if (!konfigurasi?.aktif) return <RentalMati />;

  if (memuat) {
    return (
      <RentalLayout konfigurasi={konfigurasi}>
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <div className="h-6 w-64 animate-pulse rounded bg-slate-200" />
          <div className="mt-6 h-72 animate-pulse rounded-3xl bg-slate-200/70" />
        </div>
      </RentalLayout>
    );
  }

  if (galat || !data?.item) {
    return (
      <RentalLayout konfigurasi={konfigurasi}>
        <div className="mx-auto max-w-md px-6 py-24 text-center">
          <h1 className="text-xl font-extrabold text-slate-900">{galat || 'Tidak ditemukan.'}</h1>
          <Link to={isAlat ? '/peminjaman/alat' : '/peminjaman/ruang'} className="mt-5 inline-block rounded-full bg-sewa px-5 py-2.5 text-sm font-bold text-white">
            Kembali ke katalog
          </Link>
        </div>
      </RentalLayout>
    );
  }

  const it = data.item;
  const stokKurang = isAlat && stok && stok.sisa < jumlah;
  const bisaTambah = !!jadwal && !stokKurang && !!harga && !harga.pesan && !menghitung;

  function tambah() {
    tambahKeKeranjang({
      tipe,
      id: it.slug,
      nama: it.nama,
      foto: it.foto?.[0] || '',
      harga: it.harga,
      satuan: it.satuan,
      jumlah: isAlat ? jumlah : 1,
      mulai: jadwal.mulai,
      selesai: jadwal.selesai,
    });
    setMasuk(true);
    // Tidak langsung pindah ke keranjang: PRD bagian 8 meminta rekomendasi
    // terkait ditampilkan SETELAH item masuk. Deretannya disorot dan
    // digulirkan ke layar.
    if (data.rekomendasi?.length) {
      setTimeout(() => document.getElementById('rekomendasi')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 150);
    }
  }

  const tombolUtama = masuk ? (
    <button
      type="button"
      onClick={() => navigate('/peminjaman/keranjang')}
      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3.5 text-[15px] font-extrabold text-white hover:bg-slate-700"
    >
      <ShoppingBag size={17} /> <span className="hidden sm:inline">Lihat</span> Keranjang
    </button>
  ) : (
    <button
      type="button"
      disabled={!bisaTambah}
      onClick={tambah}
      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-sewa px-5 py-3.5 text-[15px] font-extrabold text-white transition-colors hover:bg-sewa-tua disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
    >
      <Plus size={17} /> <span className="sm:hidden lg:inline">Tambah</span><span className="hidden sm:inline lg:hidden">Tambah ke keranjang</span><span className="hidden lg:inline"> ke keranjang</span>
    </button>
  );

  const ringkasHarga = (
    <div>
      {menghitung && <p className="flex items-center gap-2 text-[13px] text-slate-400"><Loader2 size={14} className="animate-spin" /> Menghitung…</p>}
      {!menghitung && harga && !harga.pesan && (
        <p className="text-[13px] text-slate-500">
          Total <span className="text-xl font-extrabold text-slate-900">{rupiah(harga.total)}</span>
        </p>
      )}
      {!menghitung && !harga && (
        <p className="text-[13px] text-slate-500">
          <span className="text-xl font-extrabold text-slate-900">{rupiah(it.harga)}</span> {SATUAN[it.satuan] || ''}
        </p>
      )}
    </div>
  );

  return (
    <RentalLayout konfigurasi={konfigurasi}>
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6">
        <nav className="flex items-center gap-1 text-[13px] font-semibold text-slate-500">
          <Link to="/peminjaman" className="hover:text-slate-900">Beranda</Link>
          <ChevronRight size={14} />
          <Link to={isAlat ? '/peminjaman/alat' : '/peminjaman/ruang'} className="hover:text-slate-900">{isAlat ? 'Sewa alat' : 'Sewa ruang'}</Link>
          <ChevronRight size={14} />
          <span className="line-clamp-1 text-slate-800">{it.nama}</span>
        </nav>

        <div className="mt-3">
          {isAlat && it.kategori && <p className="text-[12px] font-extrabold uppercase tracking-wide text-sewa">{it.kategori}</p>}
          <h1 className="text-[28px] font-extrabold leading-tight tracking-tight text-slate-900 sm:text-[34px]">{it.nama}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[14px] text-slate-600">
            {it.alamat && <span className="inline-flex items-center gap-1.5"><MapPin size={15} />{it.alamat}</span>}
            {it.kapasitas > 0 && <span className="inline-flex items-center gap-1.5"><Users size={15} />Maks. {it.kapasitas} orang</span>}
            {!isAlat && it.jamBuka !== it.jamTutup && (
              <span className="inline-flex items-center gap-1.5"><Clock3 size={15} />{menitKeJam(it.jamBuka)}–{menitKeJam(it.jamTutup)} WIB</span>
            )}
            {isAlat && <span className="inline-flex items-center gap-1.5"><Package size={15} />{it.stok} unit dimiliki</span>}
            {it.sku && <span className="text-slate-400">SKU {it.sku}</span>}
          </div>
        </div>

        <div className="mt-5"><Mosaik foto={it.foto} tipe={tipe} nama={it.nama} /></div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_22rem] lg:items-start">
          {/* KOLOM UTAMA */}
          <div className="min-w-0 space-y-6">
            <section className="rounded-3xl bg-white p-5 shadow-lembut ring-1 ring-slate-200/70 sm:p-6">
              <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-lg font-extrabold text-slate-900">{isAlat ? 'Kapan dipinjam?' : 'Pilih tanggal & jam'}</h2>
                {!isAlat && it.butuhPenjaga && (
                  <span className="inline-flex items-center gap-1 text-[12px] font-bold text-amber-700">
                    <ShieldCheck size={14} /> Didampingi penjaga
                  </span>
                )}
              </div>
              {isAlat
                ? <PemilihJadwalAlat onUbah={ubahJadwal} />
                : <PemilihJadwal ruangSlug={it.slug} onPilih={ubahJadwal} tanggalAwal={sp.get('tanggal') || ''} />}
            </section>

            {it.deskripsi && (
              <section className="rounded-3xl bg-white p-5 ring-1 ring-slate-200/70 sm:p-6">
                <h2 className="text-lg font-extrabold text-slate-900">Tentang {isAlat ? 'alat' : 'ruang'} ini</h2>
                <div className="mt-3 text-[15px] leading-relaxed text-slate-600"><IsiHtml html={it.deskripsi} /></div>
              </section>
            )}

            {it.fasilitas?.length > 0 && (
              <section className="rounded-3xl bg-white p-5 ring-1 ring-slate-200/70 sm:p-6">
                <h2 className="text-lg font-extrabold text-slate-900">Fasilitas</h2>
                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                  {it.fasilitas.map((f) => (
                    <li key={f} className="flex items-center gap-3 text-[14px] text-slate-700">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-sewa/10 text-sewa"><CheckCircle2 size={16} /></span>
                      {f}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {(it.kebijakan || it.aturan) && (
              <section className="rounded-3xl bg-white p-5 ring-1 ring-slate-200/70 sm:p-6">
                <h2 className="text-lg font-extrabold text-slate-900">{isAlat ? 'Aturan peminjaman' : 'Kebijakan ruang'}</h2>
                <div className="mt-3 text-[14px] leading-relaxed text-slate-600"><IsiHtml html={it.kebijakan || it.aturan} /></div>
              </section>
            )}

            <Rekomendasi daftar={data.rekomendasi} sorot={masuk} />
          </div>

          {/* KARTU PESAN - lengket di layar lebar */}
          <aside className="hidden lg:sticky lg:top-24 lg:block">
            <div className="rounded-3xl bg-white p-5 shadow-angkat ring-1 ring-slate-200/70">
              <p className="text-[13px] text-slate-500">
                <span className="text-2xl font-extrabold text-slate-900">{rupiah(it.harga)}</span> {SATUAN[it.satuan] || ''}
              </p>

              {isAlat && (
                <div className="mt-5 flex items-center justify-between rounded-2xl bg-slate-100 px-4 py-3">
                  <span className="text-[13px] font-bold text-slate-600">Jumlah unit</span>
                  <span className="flex items-center gap-3">
                    <button type="button" onClick={() => setJumlah((n) => Math.max(1, n - 1))} className="grid h-8 w-8 place-items-center rounded-full bg-white text-slate-700 shadow-sm hover:bg-slate-50" aria-label="Kurangi"><Minus size={14} /></button>
                    <span className="w-6 text-center text-[16px] font-extrabold tabular-nums">{jumlah}</span>
                    <button type="button" onClick={() => setJumlah((n) => Math.min(999, n + 1))} className="grid h-8 w-8 place-items-center rounded-full bg-white text-slate-700 shadow-sm hover:bg-slate-50" aria-label="Tambah"><Plus size={14} /></button>
                  </span>
                </div>
              )}

              <div className="mt-5 space-y-3 border-t border-slate-100 pt-5">
                {jadwal ? (
                  <div className="text-[13px]">
                    <p className="font-bold text-slate-900">{jadwalKalimat(jadwal.mulai, jadwal.selesai)}</p>
                    <p className="text-slate-500">{durasiKalimat(jadwal.mulai, jadwal.selesai)}{isAlat ? ` · ${jumlah} unit` : ''}</p>
                  </div>
                ) : (
                  <p className="flex items-start gap-2 text-[13px] text-slate-500">
                    <AlertCircle size={15} className="mt-0.5 shrink-0 text-amber-500" />
                    {isAlat ? 'Tentukan tanggal & jam pinjamnya dulu.' : 'Ketuk jam mulai lalu jam selesai di sebelah kiri.'}
                  </p>
                )}

                {isAlat && stok && (
                  <p className={`text-[13px] font-semibold ${stok.sisa < jumlah ? 'text-rose-600' : 'text-emerald-700'}`}>
                    {stok.sisa <= 0 ? 'Stok habis di jadwal ini' : `Tersedia ${stok.sisa} dari ${stok.total} unit`}
                  </p>
                )}
                {harga?.pesan && <p className="rounded-xl bg-rose-50 px-3 py-2 text-[12px] text-rose-700">{harga.pesan}</p>}
                {ringkasHarga}
              </div>

              {masuk && (
                <p className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 text-[13px] font-bold text-emerald-700">
                  <CheckCircle2 size={16} /> Masuk keranjang
                </p>
              )}
              <div className="mt-4">{tombolUtama}</div>
              {masuk && (
                <button type="button" onClick={() => setMasuk(false)} className="mt-2 w-full text-center text-[13px] font-bold text-sewa hover:underline">
                  Tambah jadwal lain untuk {isAlat ? 'alat' : 'ruang'} ini
                </button>
              )}
              <p className="mt-4 text-center text-[12px] text-slate-400">Belum ditagih. Pembayaran diatur admin setelah checkout.</p>
            </div>
          </aside>
        </div>
      </div>

      {/* Bar bawah HP */}
      <BarBawah>
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            {jadwal
              ? <p className="line-clamp-1 text-[12px] font-semibold text-slate-500">{jadwalKalimat(jadwal.mulai, jadwal.selesai)}</p>
              : <p className="text-[12px] font-semibold text-slate-400">Belum pilih jadwal</p>}
            {ringkasHarga}
          </div>
          {isAlat && (
            <span className="flex items-center gap-2">
              <button type="button" onClick={() => setJumlah((n) => Math.max(1, n - 1))} className="grid h-8 w-8 place-items-center rounded-full bg-slate-100" aria-label="Kurangi"><Minus size={14} /></button>
              <span className="w-5 text-center font-extrabold tabular-nums">{jumlah}</span>
              <button type="button" onClick={() => setJumlah((n) => n + 1)} className="grid h-8 w-8 place-items-center rounded-full bg-slate-100" aria-label="Tambah"><Plus size={14} /></button>
            </span>
          )}
          <div className="w-36 shrink-0">{tombolUtama}</div>
        </div>
        {(harga?.pesan || stokKurang) && (
          <p className="mt-2 text-[12px] font-semibold text-rose-600">{harga?.pesan || 'Stok tidak cukup di jadwal ini.'}</p>
        )}
      </BarBawah>
    </RentalLayout>
  );
}
