import React, { useCallback, useEffect, useState } from 'react';
import { Building2, Link2, Loader2, Pencil, Plus, Stethoscope, Trash2, X } from 'lucide-react';
import pb from '@/lib/rentalClient';
import { menitKeJam, rupiah } from '@/lib/rental';

// DASHBOARD PEMINJAMAN - TAB KATALOG (PRD bagian 10.3)
//
// Ruang, alat, dan rekomendasi terkait ditulis LANGSUNG lewat SDK collection,
// bukan lewat endpoint khusus. Aturan API ketiga collection itu sudah
// admin-only, dan tidak ada satu pun akibat sampingan yang perlu dijalankan
// server saat katalog berubah: mengganti harga ruang tidak menyentuh pesanan
// yang sudah ada (harganya disalin saat checkout), dan menonaktifkan alat
// tidak membatalkan peminjaman yang sedang berjalan.
//
// Menulis endpoint CRUD untuk ini cuma akan menambah satu lapis yang harus
// ikut diperbarui setiap kali ada field baru.

const SATUAN = ['JAM', 'HARI', 'SESI'];

const RUANG_KOSONG = {
  name: '', slug: '', description: '', address: '', capacity: 0,
  photos: [], facilities: [], price: 0, priceUnit: 'JAM',
  openMinute: 480, closeMinute: 1260, needsGuardian: false,
  policy: '', active: true, order: 0,
};

const ALAT_KOSONG = {
  name: '', slug: '', sku: '', description: '', category: '',
  photos: [], price: 0, priceUnit: 'HARI', totalQuantity: 1,
  rules: '', active: true, order: 0,
};

// "a, b, c" <-> ["a","b","c"]. Dipakai untuk fasilitas, foto, dan Calendar ID.
// Satu kolom teks jauh lebih cepat diisi admin daripada UI daftar dinamis,
// dan isinya memang selalu pendek.
const keDaftar = (teks) => String(teks || '').split(/[\n,]/).map((x) => x.trim()).filter(Boolean);
const keTeks = (daftar) => (Array.isArray(daftar) ? daftar : []).join('\n');

const slugify = (teks) => String(teks || '')
  .toLowerCase().trim()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 120);

function Kolom({ label, children, lebar }) {
  return (
    <label className={`block ${lebar || ''}`}>
      <span className="mb-1.5 block text-[12px] font-semibold text-slate-600">{label}</span>
      {children}
    </label>
  );
}

const inputCls = 'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-sewa focus:outline-none';

function FormRuang({ awal, onSimpan, onBatal, sibuk }) {
  const [f, setF] = useState(() => ({
    ...RUANG_KOSONG,
    ...awal,
    photos: keTeks(awal?.photos),
    facilities: keTeks(awal?.facilities),
  }));
  const ubah = (k) => (ev) => {
    const v = ev.target.type === 'checkbox' ? ev.target.checked : ev.target.value;
    setF((x) => ({ ...x, [k]: v }));
  };

  return (
    <form
      onSubmit={(ev) => {
        ev.preventDefault();
        onSimpan({
          ...f,
          slug: f.slug || slugify(f.name),
          capacity: Number(f.capacity) || 0,
          price: Number(f.price) || 0,
          openMinute: Number(f.openMinute) || 0,
          closeMinute: Number(f.closeMinute) || 0,
          order: Number(f.order) || 0,
          photos: keDaftar(f.photos),
          facilities: keDaftar(f.facilities),
        });
      }}
      className="space-y-4 rounded-2xl border border-sewa/30 bg-white p-5 shadow-lembut"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Kolom label="Nama ruang *"><input required value={f.name} onChange={ubah('name')} className={inputCls} /></Kolom>
        <Kolom label="Slug (alamat halaman)">
          <input value={f.slug} onChange={ubah('slug')} placeholder={slugify(f.name) || 'otomatis dari nama'} className={inputCls} />
        </Kolom>
        <Kolom label="Alamat / lokasi" lebar="sm:col-span-2"><input value={f.address} onChange={ubah('address')} className={inputCls} /></Kolom>
        <Kolom label="Kapasitas (orang)"><input type="number" min={0} value={f.capacity} onChange={ubah('capacity')} className={inputCls} /></Kolom>
        <Kolom label="Urutan tampil"><input type="number" value={f.order} onChange={ubah('order')} className={inputCls} /></Kolom>
        <Kolom label="Harga sewa"><input type="number" min={0} value={f.price} onChange={ubah('price')} className={inputCls} /></Kolom>
        <Kolom label="Satuan harga">
          <select value={f.priceUnit} onChange={ubah('priceUnit')} className={inputCls}>
            {SATUAN.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Kolom>
        <Kolom label={`Jam buka (menit dari 00:00 — ${menitKeJam(f.openMinute)})`}>
          <input type="number" min={0} max={1440} step={30} value={f.openMinute} onChange={ubah('openMinute')} className={inputCls} />
        </Kolom>
        <Kolom label={`Jam tutup (${menitKeJam(f.closeMinute)})`}>
          <input type="number" min={0} max={1440} step={30} value={f.closeMinute} onChange={ubah('closeMinute')} className={inputCls} />
        </Kolom>
        <Kolom label="Foto (satu URL per baris)" lebar="sm:col-span-2">
          <textarea rows={2} value={f.photos} onChange={ubah('photos')} placeholder="https://lh3.googleusercontent.com/d/FILE_ID" className={inputCls} />
        </Kolom>
        <Kolom label="Fasilitas (satu per baris)" lebar="sm:col-span-2">
          <textarea rows={3} value={f.facilities} onChange={ubah('facilities')} className={inputCls} />
        </Kolom>
        <p className="rounded-xl bg-sky-50 px-3.5 py-2.5 text-[12px] leading-relaxed text-sky-800 sm:col-span-2">
          Jadwal kelas yang memblok ruang ini diatur di menu <b>Kalender Kelas</b> — satu kalender bisa memblok
          beberapa ruang sekaligus, jadi tidak perlu diketik ulang di tiap ruang.
        </p>
        <Kolom label="Deskripsi (boleh HTML)" lebar="sm:col-span-2">
          <textarea rows={3} value={f.description} onChange={ubah('description')} className={inputCls} />
        </Kolom>
        <Kolom label="Kebijakan (boleh HTML)" lebar="sm:col-span-2">
          <textarea rows={2} value={f.policy} onChange={ubah('policy')} className={inputCls} />
        </Kolom>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <label className="inline-flex cursor-pointer items-center gap-2 text-[13px] font-semibold text-slate-700">
          <input type="checkbox" checked={f.needsGuardian} onChange={ubah('needsGuardian')} className="h-4 w-4 accent-[rgb(var(--sewa-rgb))]" />
          Wajib ada penjaga
        </label>
        <label className="inline-flex cursor-pointer items-center gap-2 text-[13px] font-semibold text-slate-700">
          <input type="checkbox" checked={f.active} onChange={ubah('active')} className="h-4 w-4 accent-[rgb(var(--sewa-rgb))]" />
          Aktif (tampil di katalog)
        </label>
      </div>

      <div className="flex gap-2 border-t border-slate-200 pt-4">
        <button type="submit" disabled={sibuk} className="rounded-xl bg-sewa px-5 py-2.5 text-[13px] font-bold text-white hover:bg-sewa-tua disabled:opacity-50">
          Simpan ruang
        </button>
        <button type="button" onClick={onBatal} className="rounded-xl border border-slate-300 px-5 py-2.5 text-[13px] font-semibold text-slate-600 hover:border-sewa/50">
          Batal
        </button>
      </div>
    </form>
  );
}

function FormAlat({ awal, onSimpan, onBatal, sibuk }) {
  const [f, setF] = useState(() => ({ ...ALAT_KOSONG, ...awal, photos: keTeks(awal?.photos) }));
  const ubah = (k) => (ev) => {
    const v = ev.target.type === 'checkbox' ? ev.target.checked : ev.target.value;
    setF((x) => ({ ...x, [k]: v }));
  };

  return (
    <form
      onSubmit={(ev) => {
        ev.preventDefault();
        onSimpan({
          ...f,
          slug: f.slug || slugify(f.name),
          price: Number(f.price) || 0,
          totalQuantity: Number(f.totalQuantity) || 0,
          order: Number(f.order) || 0,
          photos: keDaftar(f.photos),
        });
      }}
      className="space-y-4 rounded-2xl border border-sewa/30 bg-white p-5 shadow-lembut"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Kolom label="Nama alat *"><input required value={f.name} onChange={ubah('name')} className={inputCls} /></Kolom>
        <Kolom label="Slug"><input value={f.slug} onChange={ubah('slug')} placeholder={slugify(f.name) || 'otomatis'} className={inputCls} /></Kolom>
        <Kolom label="SKU"><input value={f.sku} onChange={ubah('sku')} className={inputCls} /></Kolom>
        <Kolom label="Kategori"><input value={f.category} onChange={ubah('category')} className={inputCls} /></Kolom>
        <Kolom label="Harga sewa"><input type="number" min={0} value={f.price} onChange={ubah('price')} className={inputCls} /></Kolom>
        <Kolom label="Satuan harga">
          <select value={f.priceUnit} onChange={ubah('priceUnit')} className={inputCls}>
            {SATUAN.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Kolom>
        <Kolom label="Jumlah unit dimiliki">
          <input type="number" min={0} value={f.totalQuantity} onChange={ubah('totalQuantity')} className={inputCls} />
          <span className="mt-1 block text-[11px] text-slate-500">
            Yang tersedia pada jam tertentu dihitung sendiri dari peminjaman yang beririsan.
          </span>
        </Kolom>
        <Kolom label="Urutan tampil"><input type="number" value={f.order} onChange={ubah('order')} className={inputCls} /></Kolom>
        <Kolom label="Foto (satu URL per baris)" lebar="sm:col-span-2">
          <textarea rows={2} value={f.photos} onChange={ubah('photos')} className={inputCls} />
        </Kolom>
        <Kolom label="Deskripsi (boleh HTML)" lebar="sm:col-span-2">
          <textarea rows={3} value={f.description} onChange={ubah('description')} className={inputCls} />
        </Kolom>
        <Kolom label="Aturan sewa (boleh HTML)" lebar="sm:col-span-2">
          <textarea rows={2} value={f.rules} onChange={ubah('rules')} className={inputCls} />
        </Kolom>
      </div>

      <label className="inline-flex cursor-pointer items-center gap-2 text-[13px] font-semibold text-slate-700">
        <input type="checkbox" checked={f.active} onChange={ubah('active')} className="h-4 w-4 accent-[rgb(var(--sewa-rgb))]" />
        Aktif (tampil di katalog)
      </label>

      <div className="flex gap-2 border-t border-slate-200 pt-4">
        <button type="submit" disabled={sibuk} className="rounded-xl bg-sewa px-5 py-2.5 text-[13px] font-bold text-white hover:bg-sewa-tua disabled:opacity-50">
          Simpan alat
        </button>
        <button type="button" onClick={onBatal} className="rounded-xl border border-slate-300 px-5 py-2.5 text-[13px] font-semibold text-slate-600 hover:border-sewa/50">
          Batal
        </button>
      </div>
    </form>
  );
}

// Pemasang rekomendasi (PRD bagian 8). Maksimal 4 yang ditampilkan ke
// pelanggan, tapi admin boleh mendaftarkan lebih - yang tampil empat teratas
// menurut urutan.
function PanelRekomendasi({ sumber, ruang, alat, rekomendasi, onUbah, sibuk }) {
  const [tipe, setTipe] = useState('ALAT');
  const [target, setTarget] = useState('');

  const milik = rekomendasi.filter((r) => r.sourceType === sumber.tipe && r.sourceId === sumber.id);
  const namaDari = (t, id) => (t === 'ALAT' ? alat : ruang).find((x) => x.id === id)?.name || '(terhapus)';

  return (
    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-[12px] font-bold uppercase tracking-wider text-slate-500">
        Rekomendasi terkait ({milik.length})
      </p>
      {milik.length > 4 && (
        <p className="mt-1 text-[11px] text-amber-700">
          Hanya 4 teratas (urutan terkecil) yang ditampilkan ke pelanggan.
        </p>
      )}

      <ul className="mt-2 space-y-1.5">
        {milik.map((r) => (
          <li key={r.id} className="flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 text-[13px]">
            <span className="inline-flex items-center gap-2 text-slate-700">
              <Link2 size={13} className="text-sewa" />
              {namaDari(r.targetType, r.targetId)}
              <span className="text-[11px] uppercase text-slate-400">{r.targetType}</span>
            </span>
            <button
              disabled={sibuk}
              onClick={() => onUbah('hapus', r)}
              className="text-slate-400 hover:text-red-600 disabled:opacity-50"
              aria-label="Hapus rekomendasi"
            >
              <X size={14} />
            </button>
          </li>
        ))}
        {!milik.length && <li className="text-[12px] text-slate-500">Belum ada.</li>}
      </ul>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select value={tipe} onChange={(ev) => { setTipe(ev.target.value); setTarget(''); }} className="rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-[12px] font-semibold">
          <option value="ALAT">Alat</option>
          <option value="RUANG">Ruang</option>
        </select>
        <select value={target} onChange={(ev) => setTarget(ev.target.value)} className="min-w-[180px] flex-1 rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-[12px]">
          <option value="">Pilih yang direkomendasikan…</option>
          {(tipe === 'ALAT' ? alat : ruang)
            .filter((x) => !(x.id === sumber.id && tipe === sumber.tipe))
            .map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
        </select>
        <button
          disabled={!target || sibuk}
          onClick={() => { onUbah('tambah', { targetType: tipe, targetId: target, order: milik.length + 1 }); setTarget(''); }}
          className="rounded-lg bg-sewa px-3.5 py-2 text-[12px] font-bold text-white hover:bg-sewa-tua disabled:opacity-40"
        >
          Tambah
        </button>
      </div>
    </div>
  );
}

export default function RentalKatalogTab({ lapor }) {
  const [ruang, setRuang] = useState([]);
  const [alat, setAlat] = useState([]);
  const [rekomendasi, setRekomendasi] = useState([]);
  const [memuat, setMemuat] = useState(true);
  const [sibuk, setSibuk] = useState(false);
  const [edit, setEdit] = useState(null); // {jenis:'RUANG'|'ALAT', data|null}
  const [bukaReko, setBukaReko] = useState('');

  const muat = useCallback(async () => {
    setMemuat(true);
    try {
      const [r, a, k] = await Promise.all([
        pb.collection('rental_rooms').getFullList({ sort: 'order,name' }),
        pb.collection('rental_items').getFullList({ sort: 'order,name' }),
        pb.collection('rental_recommendations').getFullList({ sort: 'order' }),
      ]);
      setRuang(r); setAlat(a); setRekomendasi(k);
    } catch (err) {
      lapor(err?.response?.message || err.message || 'Gagal memuat katalog.', 'galat');
    } finally {
      setMemuat(false);
    }
  }, [lapor]);

  useEffect(() => { muat(); }, [muat]);

  async function simpan(koleksi, data, id) {
    setSibuk(true);
    try {
      if (id) await pb.collection(koleksi).update(id, data);
      else await pb.collection(koleksi).create(data);
      setEdit(null);
      lapor('Tersimpan.', 'ok');
      await muat();
    } catch (err) {
      lapor(err?.response?.message || err.message || 'Gagal menyimpan.', 'galat');
    } finally {
      setSibuk(false);
    }
  }

  async function hapus(koleksi, rec, nama) {
    if (!window.confirm(
      `Hapus "${nama}" dari katalog?\n\nPeminjaman yang sudah ada TIDAK ikut terhapus — nama dan harganya sudah disalin ke pesanan.\nKalau cuma mau menyembunyikannya, lebih baik matikan saklar Aktif.`,
    )) return;
    setSibuk(true);
    try {
      await pb.collection(koleksi).delete(rec.id);
      lapor('Terhapus.', 'ok');
      await muat();
    } catch (err) {
      lapor(err?.response?.message || err.message || 'Gagal menghapus.', 'galat');
    } finally {
      setSibuk(false);
    }
  }

  async function ubahReko(sumber, aksi, data) {
    setSibuk(true);
    try {
      if (aksi === 'hapus') {
        await pb.collection('rental_recommendations').delete(data.id);
      } else {
        await pb.collection('rental_recommendations').create({
          sourceType: sumber.tipe, sourceId: sumber.id,
          targetType: data.targetType, targetId: data.targetId,
          order: data.order, active: true,
        });
      }
      await muat();
    } catch (err) {
      lapor(err?.response?.message || err.message || 'Gagal mengubah rekomendasi.', 'galat');
    } finally {
      setSibuk(false);
    }
  }

  if (memuat) {
    return <p className="inline-flex items-center gap-2 text-[13px] text-slate-500"><Loader2 size={14} className="animate-spin" /> Memuat katalog…</p>;
  }

  const baris = (jenis, x) => {
    const sumber = { tipe: jenis, id: x.id };
    return (
      <li key={x.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-lembut">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-sewa text-[15px] font-semibold text-slate-800">
              {x.name}
              {!x.active && <span className="ml-2 rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-500">nonaktif</span>}
              {jenis === 'RUANG' && x.needsGuardian && (
                <span className="ml-2 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-700">perlu penjaga</span>
              )}
            </p>
            <p className="mt-0.5 text-[12px] text-slate-500">
              {rupiah(x.price)} / {x.priceUnit}
              {jenis === 'RUANG'
                ? ` · ${menitKeJam(x.openMinute)}–${menitKeJam(x.closeMinute)} · kapasitas ${x.capacity || '—'}`
                : ` · ${x.totalQuantity} unit${x.category ? ` · ${x.category}` : ''}`}
            </p>
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={() => setBukaReko(bukaReko === `${jenis}:${x.id}` ? '' : `${jenis}:${x.id}`)}
              className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 hover:border-sewa/50 hover:text-sewa"
            >
              Rekomendasi
            </button>
            <button
              onClick={() => setEdit({ jenis, data: x })}
              className="grid h-8 w-8 place-items-center rounded-lg border border-slate-300 text-slate-600 hover:border-sewa/50 hover:text-sewa"
              aria-label={`Ubah ${x.name}`}
            >
              <Pencil size={13} />
            </button>
            <button
              onClick={() => hapus(jenis === 'RUANG' ? 'rental_rooms' : 'rental_items', x, x.name)}
              className="grid h-8 w-8 place-items-center rounded-lg border border-slate-300 text-slate-500 hover:border-red-300 hover:text-red-600"
              aria-label={`Hapus ${x.name}`}
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        {bukaReko === `${jenis}:${x.id}` && (
          <PanelRekomendasi
            sumber={sumber}
            ruang={ruang}
            alat={alat}
            rekomendasi={rekomendasi}
            sibuk={sibuk}
            onUbah={(aksi, data) => ubahReko(sumber, aksi, data)}
          />
        )}
      </li>
    );
  };

  return (
    <div className="space-y-8">
      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="inline-flex items-center gap-2 font-sewa text-lg font-semibold text-slate-800">
            <Building2 size={18} className="text-sewa" /> Ruang ({ruang.length})
          </h3>
          <button
            onClick={() => setEdit({ jenis: 'RUANG', data: null })}
            className="inline-flex items-center gap-1.5 rounded-xl bg-sewa px-4 py-2.5 text-[13px] font-bold text-white hover:bg-sewa-tua"
          >
            <Plus size={15} /> Tambah ruang
          </button>
        </div>

        {edit?.jenis === 'RUANG' && (
          <div className="mt-4">
            <FormRuang
              awal={edit.data}
              sibuk={sibuk}
              onBatal={() => setEdit(null)}
              onSimpan={(d) => simpan('rental_rooms', d, edit.data?.id)}
            />
          </div>
        )}

        <ul className="mt-4 space-y-3">{ruang.map((x) => baris('RUANG', x))}</ul>
        {!ruang.length && <p className="mt-3 text-[13px] text-slate-500">Belum ada ruang.</p>}
      </section>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="inline-flex items-center gap-2 font-sewa text-lg font-semibold text-slate-800">
            <Stethoscope size={18} className="text-sewa" /> Alat ({alat.length})
          </h3>
          <button
            onClick={() => setEdit({ jenis: 'ALAT', data: null })}
            className="inline-flex items-center gap-1.5 rounded-xl bg-sewa px-4 py-2.5 text-[13px] font-bold text-white hover:bg-sewa-tua"
          >
            <Plus size={15} /> Tambah alat
          </button>
        </div>

        {edit?.jenis === 'ALAT' && (
          <div className="mt-4">
            <FormAlat
              awal={edit.data}
              sibuk={sibuk}
              onBatal={() => setEdit(null)}
              onSimpan={(d) => simpan('rental_items', d, edit.data?.id)}
            />
          </div>
        )}

        <ul className="mt-4 space-y-3">{alat.map((x) => baris('ALAT', x))}</ul>
        {!alat.length && <p className="mt-3 text-[13px] text-slate-500">Belum ada alat.</p>}
      </section>
    </div>
  );
}
