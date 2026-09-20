import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle, ArrowLeft, Building2, CheckCircle2, MapPin, Minus,
  Package, Plus, ShoppingCart, Stethoscope, Users,
} from 'lucide-react';
import RentalLayout, { RentalMati, RentalMemuat, useKonfigurasiRental } from '@/components/rental/RentalLayout';
import PemilihJadwal from '@/components/rental/PemilihJadwal';
import IsiHtml from '@/components/rental/IsiHtml';
import {
  SATUAN, ambilDetail, ambilStok, jadwalKalimat, rupiah, tambahKeKeranjang,
} from '@/lib/rental';

// DETAIL RUANG / ALAT (PRD bagian 7.1 poin 3 & 4)
//
// Perbedaan pokok antara keduanya, dan kenapa keduanya tetap satu berkas:
//
//   RUANG - jadwal dipilih lewat grid 30 menit, jumlahnya selalu satu.
//   ALAT  - jadwal juga lewat grid 30 menit (dipinjam dari ruang mana pun,
//           lihat catatan di bawah), tapi ada pemilih jumlah, dan sisa stok
//           baru bisa dihitung SETELAH jadwalnya dipilih.
//
// Sisanya - galeri, deskripsi, kebijakan, rekomendasi terkait, tombol tambah
// ke keranjang - identik.

// Grid untuk alat memakai ruang mana pun yang aktif sebagai "penggaris" jam.
// Alat tidak terikat jam operasional ruang, jadi yang dipakai di sini cuma
// pemilih tanggal + jam sederhana, bukan grid ketersediaan ruang.
function PemilihJadwalAlat({ nilai, onUbah }) {
  const [tanggal, setTanggal] = useState(() => (nilai?.mulai
    ? new Date(nilai.mulai).toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
    : new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })));
  const [jamMulai, setJamMulai] = useState('09:00');
  const [jamSelesai, setJamSelesai] = useState('17:00');
  const [hari, setHari] = useState(1);

  // Semua kelipatan 30 menit dalam sehari. Grid 30 menit berlaku untuk alat
  // juga (PRD bagian 4), jadi daftar pilihannya memang cuma ini.
  const JAM = [];
  for (let m = 0; m < 24 * 60; m += 30) {
    JAM.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
  }

  // Dikirim ke induk sebagai ISO UTC. Zona WIB ditulis eksplisit (+07:00)
  // supaya jamnya tidak bergeser kalau perangkat pelanggan ada di zona lain.
  const kirim = useCallback((tgl, mulai, selesai, jumlahHari) => {
    const awal = new Date(`${tgl}T${mulai}:00+07:00`);
    const akhir = new Date(`${tgl}T${selesai}:00+07:00`);
    akhir.setDate(akhir.getDate() + Math.max(0, (Number(jumlahHari) || 1) - 1));
    if (akhir <= awal) return onUbah(null);
    onUbah({ mulai: awal.toISOString(), selesai: akhir.toISOString() });
  }, [onUbah]);

  useEffect(() => { kirim(tanggal, jamMulai, jamSelesai, hari); }, [kirim, tanggal, jamMulai, jamSelesai, hari]);

  const hariIni = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });

  return (
    <div className="rounded-2xl border border-alba-200 bg-alba-50 p-5 shadow-card">
      <h3 className="font-display text-base font-semibold text-stone-800">Pilih jadwal pinjam</h3>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-[12px] font-semibold text-stone-600">Tanggal mulai</span>
          <input
            type="date"
            value={tanggal}
            min={hariIni}
            onChange={(ev) => setTanggal(ev.target.value)}
            className="w-full rounded-xl border border-alba-300 bg-alba-50 px-3 py-2.5 text-sm text-stone-700 focus:border-maroon-400 focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[12px] font-semibold text-stone-600">Lama pinjam (hari)</span>
          <input
            type="number"
            min={1}
            max={30}
            value={hari}
            onChange={(ev) => setHari(Math.max(1, Math.min(30, Number(ev.target.value) || 1)))}
            className="w-full rounded-xl border border-alba-300 bg-alba-50 px-3 py-2.5 text-sm text-stone-700 focus:border-maroon-400 focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[12px] font-semibold text-stone-600">Jam ambil</span>
          <select
            value={jamMulai}
            onChange={(ev) => setJamMulai(ev.target.value)}
            className="w-full rounded-xl border border-alba-300 bg-alba-50 px-3 py-2.5 text-sm text-stone-700 focus:border-maroon-400 focus:outline-none"
          >
            {JAM.map((j) => <option key={j} value={j}>{j}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[12px] font-semibold text-stone-600">Jam kembali</span>
          <select
            value={jamSelesai}
            onChange={(ev) => setJamSelesai(ev.target.value)}
            className="w-full rounded-xl border border-alba-300 bg-alba-50 px-3 py-2.5 text-sm text-stone-700 focus:border-maroon-400 focus:outline-none"
          >
            {JAM.map((j) => <option key={j} value={j}>{j}</option>)}
          </select>
        </label>
      </div>
    </div>
  );
}

function Rekomendasi({ daftar }) {
  if (!daftar?.length) return null;
  return (
    <section className="mt-10">
      <h2 className="font-display text-lg font-semibold text-stone-800">Sering dipinjam bersamaan</h2>
      <p className="mt-1 text-[13px] text-stone-500">
        Disusun admin. Tidak otomatis masuk keranjang — buka kalau memang perlu.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {daftar.map((r) => (
          <Link
            key={`${r.tipe}-${r.id}`}
            to={r.tipe === 'ALAT' ? `/peminjaman/alat/${r.slug}` : `/peminjaman/ruang/${r.slug}`}
            className="group flex flex-col overflow-hidden rounded-2xl border border-alba-200 bg-alba-50 shadow-card transition-colors hover:border-maroon-300"
          >
            {r.foto?.[0] ? (
              <img src={r.foto[0]} alt="" loading="lazy" className="h-24 w-full object-cover" />
            ) : (
              <div className="grid h-24 w-full place-items-center bg-alba-100">
                {r.tipe === 'ALAT'
                  ? <Stethoscope size={20} className="text-maroon-400" />
                  : <Building2 size={20} className="text-maroon-400" />}
              </div>
            )}
            <div className="flex flex-1 flex-col p-4">
              <h3 className="font-display text-[14px] font-semibold leading-snug text-stone-800">{r.nama}</h3>
              {r.catatan && <p className="mt-1 text-[11px] text-stone-500">{r.catatan}</p>}
              <p className="mt-auto pt-2 text-[13px] font-semibold text-maroon-600">{rupiah(r.harga)}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default function RentalDetail({ tipe = 'RUANG' }) {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { memuat: memuatKonfigurasi, konfigurasi } = useKonfigurasiRental();

  const [data, setData] = useState(null);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState('');
  const [jadwal, setJadwal] = useState(null);
  const [jumlah, setJumlah] = useState(1);
  const [stok, setStok] = useState(null);
  const [pesan, setPesan] = useState('');

  useEffect(() => {
    let hidup = true;
    setMemuat(true);
    setJadwal(null);
    setStok(null);
    ambilDetail(tipe, slug)
      .then((d) => { if (hidup) { setData(d); setGalat(''); } })
      .catch((err) => { if (hidup) setGalat(err.message || 'Gagal memuat data.'); })
      .finally(() => { if (hidup) setMemuat(false); });
    return () => { hidup = false; };
  }, [tipe, slug]);

  // Sisa stok alat baru berarti setelah jadwalnya diketahui (PRD bagian 15) -
  // angka "6 unit" di katalog adalah yang dimiliki, bukan yang bebas pada jam
  // itu. Karena itu dihitung ulang tiap kali jadwalnya berubah.
  useEffect(() => {
    if (tipe !== 'ALAT' || !jadwal?.mulai || !jadwal?.selesai || !data?.item?.id) {
      setStok(null);
      return;
    }
    let hidup = true;
    ambilStok(data.item.slug, jadwal.mulai, jadwal.selesai)
      .then((s) => { if (hidup) setStok(s); })
      .catch(() => { if (hidup) setStok(null); });
    return () => { hidup = false; };
  }, [tipe, jadwal, data]);

  if (memuatKonfigurasi) return <RentalMemuat />;
  if (!konfigurasi?.aktif) return <RentalMati />;

  if (memuat) {
    return (
      <RentalLayout konfigurasi={konfigurasi}>
        <p className="py-24 text-center text-sm text-stone-400">Memuat…</p>
      </RentalLayout>
    );
  }

  if (galat || !data?.item) {
    return (
      <RentalLayout konfigurasi={konfigurasi}>
        <div className="mx-auto max-w-md px-6 py-24 text-center">
          <h1 className="font-display text-xl font-semibold text-stone-800">{galat || 'Tidak ditemukan.'}</h1>
          <Link
            to={tipe === 'ALAT' ? '/peminjaman/alat' : '/peminjaman/ruang'}
            className="mt-5 inline-block rounded-xl bg-maroon-600 px-5 py-2.5 text-[13px] font-bold text-alba-50 hover:bg-maroon-700"
          >
            Kembali ke katalog
          </Link>
        </div>
      </RentalLayout>
    );
  }

  const it = data.item;
  const isAlat = tipe === 'ALAT';
  const stokKurang = isAlat && stok && stok.sisa < jumlah;
  const bisaTambah = !!jadwal?.mulai && !!jadwal?.selesai && !stokKurang;

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
    setPesan(`${it.nama} masuk keranjang.`);
    // Halaman sengaja TIDAK langsung pindah ke keranjang: PRD bagian 8 meminta
    // rekomendasi terkait ditampilkan setelah item masuk, dan pindah halaman
    // membuat deretan itu tidak pernah terlihat.
    try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (_) { /* jsdom */ }
  }

  return (
    <RentalLayout konfigurasi={konfigurasi}>
      <div className="mx-auto max-w-6xl px-6 py-10">
        <Link
          to={isAlat ? '/peminjaman/alat' : '/peminjaman/ruang'}
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-stone-500 hover:text-maroon-600"
        >
          <ArrowLeft size={15} /> {isAlat ? 'Semua alat' : 'Semua ruang'}
        </Link>

        {pesan && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
            <span className="inline-flex items-center gap-2 text-[13px] font-semibold text-emerald-700">
              <CheckCircle2 size={16} /> {pesan}
            </span>
            <button
              onClick={() => navigate('/peminjaman/keranjang')}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-[12px] font-bold text-white hover:bg-emerald-700"
            >
              <ShoppingCart size={14} /> Lihat keranjang
            </button>
          </div>
        )}

        <div className="mt-6 grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-start">
          <div>
            {it.foto?.length > 0 ? (
              <div className="grid gap-2">
                <img src={it.foto[0]} alt={it.nama} className="h-64 w-full rounded-2xl object-cover sm:h-80" />
                {it.foto.length > 1 && (
                  <div className="grid grid-cols-4 gap-2">
                    {it.foto.slice(1, 5).map((f) => (
                      <img key={f} src={f} alt="" loading="lazy" className="h-20 w-full rounded-xl object-cover" />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="grid h-64 w-full place-items-center rounded-2xl bg-gradient-to-br from-maroon-600 to-maroon-800 sm:h-80">
                {isAlat ? <Stethoscope size={40} className="text-gold-200" /> : <Building2 size={40} className="text-gold-200" />}
              </div>
            )}

            <h1 className="mt-6 font-display text-2xl font-semibold text-stone-800">{it.nama}</h1>

            <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-stone-600">
              {it.alamat && (
                <div className="flex items-center gap-1.5"><MapPin size={14} className="text-maroon-500" />{it.alamat}</div>
              )}
              {it.kapasitas > 0 && (
                <div className="flex items-center gap-1.5"><Users size={14} className="text-maroon-500" />Kapasitas {it.kapasitas}</div>
              )}
              {isAlat && (
                <div className="flex items-center gap-1.5"><Package size={14} className="text-maroon-500" />{it.stok} unit dimiliki</div>
              )}
              {it.sku && <div className="text-stone-500">SKU {it.sku}</div>}
            </dl>

            {it.deskripsi && (
              <div className="mt-5 text-[14px] leading-relaxed text-stone-700">
                <IsiHtml html={it.deskripsi} />
              </div>
            )}

            {it.fasilitas?.length > 0 && (
              <section className="mt-6">
                <h2 className="font-display text-base font-semibold text-stone-800">Fasilitas</h2>
                <ul className="mt-2.5 grid gap-1.5 sm:grid-cols-2">
                  {it.fasilitas.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-[13px] text-stone-600">
                      <CheckCircle2 size={14} className="shrink-0 text-emerald-600" /> {f}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {(it.kebijakan || it.aturan) && (
              <section className="mt-6 rounded-2xl border border-alba-200 bg-alba-100 p-5">
                <h2 className="font-display text-base font-semibold text-stone-800">
                  {isAlat ? 'Aturan peminjaman' : 'Kebijakan'}
                </h2>
                <div className="mt-2 text-[13px] leading-relaxed text-stone-600">
                  <IsiHtml html={it.kebijakan || it.aturan} />
                </div>
              </section>
            )}
          </div>

          <div className="space-y-5 lg:sticky lg:top-24">
            <div className="rounded-2xl border border-alba-200 bg-alba-50 p-5 shadow-card">
              <p className="font-display text-2xl font-semibold text-maroon-600">
                {rupiah(it.harga)}
                <span className="ml-1.5 text-[13px] font-normal text-stone-500">{SATUAN[it.satuan] || ''}</span>
              </p>
              {!isAlat && it.butuhPenjaga && (
                <p className="mt-2 rounded-lg border border-gold-200 bg-gold-100 px-3 py-2 text-[12px] leading-relaxed text-gold-600">
                  Ruang ini butuh penjaga. Jam tanpa petugas terjadwal tidak bisa dipilih.
                </p>
              )}
            </div>

            {isAlat ? (
              <>
                <PemilihJadwalAlat nilai={jadwal} onUbah={setJadwal} />
                <div className="rounded-2xl border border-alba-200 bg-alba-50 p-5 shadow-card">
                  <span className="block text-[12px] font-semibold text-stone-600">Jumlah unit</span>
                  <div className="mt-2 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setJumlah((n) => Math.max(1, n - 1))}
                      className="grid h-9 w-9 place-items-center rounded-lg border border-alba-300 text-stone-600 hover:border-maroon-300 hover:text-maroon-600"
                      aria-label="Kurangi"
                    >
                      <Minus size={15} />
                    </button>
                    <span className="min-w-[2.5rem] text-center font-display text-lg font-semibold text-stone-800">{jumlah}</span>
                    <button
                      type="button"
                      onClick={() => setJumlah((n) => Math.min(999, n + 1))}
                      className="grid h-9 w-9 place-items-center rounded-lg border border-alba-300 text-stone-600 hover:border-maroon-300 hover:text-maroon-600"
                      aria-label="Tambah"
                    >
                      <Plus size={15} />
                    </button>
                  </div>

                  {stok && (
                    <p className={`mt-3 text-[13px] ${stok.sisa <= 0 ? 'text-red-700' : 'text-stone-600'}`}>
                      {stok.sisa <= 0
                        ? 'Stoknya habis pada jadwal itu. Coba jadwal lain.'
                        : <>Tersedia <b>{stok.sisa}</b> dari {stok.total} unit pada jadwal itu.</>}
                    </p>
                  )}
                </div>
              </>
            ) : (
              <PemilihJadwal
                ruangSlug={it.slug}
                nilai={jadwal}
                onPilih={(j) => setJadwal(j)}
              />
            )}

            <div className="rounded-2xl border border-alba-200 bg-alba-50 p-5 shadow-card">
              {jadwal?.mulai && jadwal?.selesai ? (
                <p className="text-[13px] text-stone-600">
                  Jadwal dipilih:<br />
                  <b className="text-stone-800">{jadwalKalimat(jadwal.mulai, jadwal.selesai)}</b>
                </p>
              ) : (
                <p className="flex items-start gap-2 text-[13px] text-stone-500">
                  <AlertCircle size={15} className="mt-0.5 shrink-0 text-gold-600" />
                  Pilih jadwalnya dulu untuk bisa menambahkan ke keranjang.
                </p>
              )}

              {stokKurang && (
                <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">
                  Jumlah yang diminta melebihi stok yang tersedia pada jadwal itu.
                </p>
              )}

              <button
                type="button"
                disabled={!bisaTambah}
                onClick={tambah}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-maroon-600 px-5 py-3 text-[14px] font-bold text-alba-50 transition-colors hover:bg-maroon-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ShoppingCart size={16} /> Tambahkan ke Keranjang
              </button>
            </div>
          </div>
        </div>

        <Rekomendasi daftar={data.rekomendasi} />
      </div>
    </RentalLayout>
  );
}
