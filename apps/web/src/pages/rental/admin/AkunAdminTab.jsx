import React, { useCallback, useEffect, useState } from 'react';
import { KeyRound, Loader2, Plus, Power, Trash2, UserPlus } from 'lucide-react';
import pb from '@/lib/rentalClient';
import { PERAN_ADMIN, salinTeks } from '@/lib/rental';

// AKUN ADMIN PEMINJAMAN (PRD bagian 6)
//
// Admin peminjaman punya akunnya sendiri - bukan akun PCV. Hanya SUPER_ADMIN
// (dan pemilik platform) yang bisa membuat, mengubah peran, atau
// menonaktifkan akun; aturan itu ditegakkan aturan API collection
// `rental_admins`, jadi lembar ini hanya antarmukanya.
//
// MENONAKTIFKAN lebih disarankan daripada MENGHAPUS: akun yang dihapus
// menghilangkan nama di balik tindakan-tindakan lama di audit log, sedangkan
// akun nonaktif tetap tercatat tapi tidak bisa masuk lagi - termasuk dengan
// token yang masih ia pegang, karena setiap aturan akses ikut memeriksa
// `active`.

const inputCls = 'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-sewa focus:outline-none';

function sandiAcak() {
  // Tanpa huruf yang mudah tertukar (l/1/I, O/0) - sandi ini akan dibacakan
  // atau diketik ulang dari chat WhatsApp.
  const abjad = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from(crypto.getRandomValues(new Uint32Array(14)), (x) => abjad[x % abjad.length]).join('');
}

function waktu(iso) {
  if (!iso) return 'belum pernah';
  const d = new Date(iso.replace(' ', 'T'));
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function AkunAdminTab({ lapor, saya }) {
  const [daftar, setDaftar] = useState([]);
  const [memuat, setMemuat] = useState(true);
  const [baru, setBaru] = useState(null);
  const [sibuk, setSibuk] = useState(false);

  const muat = useCallback(async () => {
    try {
      setDaftar(await pb.collection('rental_admins').getFullList({ sort: '-active,role,name' }));
    } catch (err) {
      lapor(err?.response?.message || 'Gagal memuat akun.', 'galat');
    } finally {
      setMemuat(false);
    }
  }, [lapor]);

  useEffect(() => { muat(); }, [muat]);

  async function buat() {
    setSibuk(true);
    try {
      await pb.collection('rental_admins').create({
        name: baru.name.trim(),
        email: baru.email.trim(),
        role: baru.role,
        whatsapp: baru.whatsapp.trim(),
        active: true,
        password: baru.password,
        passwordConfirm: baru.password,
      });
      const pesan = `Akun admin peminjaman\nAlamat: ${window.location.origin}/peminjaman/admin/masuk\nEmail: ${baru.email.trim()}\nKata sandi: ${baru.password}\n\nGanti kata sandinya setelah masuk pertama kali.`;
      const tersalin = await salinTeks(pesan);
      lapor(tersalin ? 'Akun dibuat. Info masuknya sudah tersalin — kirim lewat chat pribadi.' : 'Akun dibuat.', 'ok');
      setBaru(null);
      await muat();
    } catch (err) {
      const d = err?.response?.data || {};
      lapor(d.email ? 'Email itu sudah dipakai akun lain.' : (err?.response?.message || 'Gagal membuat akun.'), 'galat');
    } finally {
      setSibuk(false);
    }
  }

  async function ubah(a, data, pesan) {
    try {
      await pb.collection('rental_admins').update(a.id, data);
      lapor(pesan, 'ok');
      await muat();
    } catch (err) {
      lapor(err?.response?.message || 'Gagal menyimpan.', 'galat');
    }
  }

  if (memuat) return <p className="flex items-center gap-2 text-sm text-slate-500"><Loader2 size={15} className="animate-spin" /> Memuat…</p>;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-extrabold text-slate-900">Akun admin</h3>
          <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-slate-500">
            Akun khusus web peminjaman, terpisah dari akun PCV. Tiap peran hanya melihat menu yang memang tugasnya.
          </p>
        </div>
        <button
          onClick={() => setBaru(baru ? null : { name: '', email: '', whatsapp: '', role: 'OPERASIONAL', password: sandiAcak() })}
          className="inline-flex items-center gap-1.5 rounded-xl bg-sewa px-4 py-2.5 text-[13px] font-bold text-white hover:bg-sewa-tua"
        >
          <UserPlus size={15} /> Tambah admin
        </button>
      </div>

      {baru && (
        <div className="grid gap-4 rounded-2xl border border-sewa/30 bg-white p-5 shadow-lembut sm:grid-cols-2">
          <label className="block"><span className="mb-1.5 block text-[12px] font-bold text-slate-600">Nama</span><input value={baru.name} onChange={(e) => setBaru({ ...baru, name: e.target.value })} className={inputCls} /></label>
          <label className="block"><span className="mb-1.5 block text-[12px] font-bold text-slate-600">Email (untuk masuk)</span><input type="email" value={baru.email} onChange={(e) => setBaru({ ...baru, email: e.target.value })} className={inputCls} /></label>
          <label className="block"><span className="mb-1.5 block text-[12px] font-bold text-slate-600">WhatsApp</span><input value={baru.whatsapp} onChange={(e) => setBaru({ ...baru, whatsapp: e.target.value })} className={inputCls} /></label>
          <label className="block">
            <span className="mb-1.5 block text-[12px] font-bold text-slate-600">Kata sandi awal</span>
            <span className="flex gap-2">
              <input value={baru.password} onChange={(e) => setBaru({ ...baru, password: e.target.value })} className={`${inputCls} font-mono`} />
              <button type="button" onClick={() => setBaru({ ...baru, password: sandiAcak() })} className="shrink-0 rounded-xl border border-slate-300 px-3 text-slate-500 hover:text-sewa" title="Buat acak"><KeyRound size={15} /></button>
            </span>
          </label>
          <div className="sm:col-span-2">
            <span className="mb-1.5 block text-[12px] font-bold text-slate-600">Peran</span>
            <div className="grid gap-2 sm:grid-cols-3">
              {Object.entries(PERAN_ADMIN).map(([k, p]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setBaru({ ...baru, role: k })}
                  className={`rounded-xl border p-3 text-left transition-colors ${baru.role === k ? 'border-sewa bg-sewa/5 ring-1 ring-sewa' : 'border-slate-200 hover:border-slate-300'}`}
                >
                  <p className="text-[13px] font-extrabold text-slate-900">{p.teks}</p>
                  <p className="mt-0.5 text-[11px] leading-snug text-slate-500">{p.ket}</p>
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2 sm:col-span-2">
            <button
              disabled={sibuk || !baru.name.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(baru.email.trim()) || baru.password.length < 8}
              onClick={buat}
              className="inline-flex items-center gap-1.5 rounded-xl bg-sewa px-5 py-2.5 text-[13px] font-bold text-white hover:bg-sewa-tua disabled:opacity-40"
            >
              <Plus size={15} /> Buat akun & salin info masuk
            </button>
            <button onClick={() => setBaru(null)} className="rounded-xl px-4 py-2.5 text-[13px] font-semibold text-slate-500 hover:bg-slate-100">Batal</button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lembut">
        <table className="w-full text-left text-[13px]">
          <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Admin</th>
              <th className="px-4 py-3">Peran</th>
              <th className="hidden px-4 py-3 md:table-cell">Masuk terakhir</th>
              <th className="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {daftar.map((a) => {
              const diriSendiri = saya?.id === a.id;
              return (
                <tr key={a.id} className={a.active ? '' : 'bg-slate-50 text-slate-400'}>
                  <td className="px-4 py-3">
                    <p className="font-bold text-slate-900">{a.name}{diriSendiri && <span className="ml-1.5 text-[11px] font-semibold text-sewa">(kamu)</span>}</p>
                    <p className="text-[12px] text-slate-500">{a.email}{!a.active && ' · nonaktif'}</p>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={a.role}
                      disabled={diriSendiri}
                      onChange={(e) => ubah(a, { role: e.target.value }, `Peran ${a.name} diubah.`)}
                      className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[12px] font-semibold disabled:opacity-60"
                      title={diriSendiri ? 'Peran sendiri tidak bisa diubah dari akun sendiri' : undefined}
                    >
                      {Object.entries(PERAN_ADMIN).map(([k, p]) => <option key={k} value={k}>{p.teks}</option>)}
                    </select>
                  </td>
                  <td className="hidden px-4 py-3 text-slate-500 md:table-cell">{waktu(a.lastLoginAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        title="Buat kata sandi baru"
                        onClick={async () => {
                          const s = sandiAcak();
                          if (!window.confirm(`Buat kata sandi baru untuk ${a.name}? Kata sandi lama langsung tidak berlaku.`)) return;
                          await ubah(a, { password: s, passwordConfirm: s }, 'Kata sandi baru dibuat.');
                          if (await salinTeks(`Kata sandi baru admin peminjaman (${a.email}): ${s}`)) lapor('Kata sandi baru dibuat dan tersalin — kirim lewat chat pribadi.', 'ok');
                        }}
                        className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-sewa"
                      >
                        <KeyRound size={14} />
                      </button>
                      {!diriSendiri && (
                        <button
                          title={a.active ? 'Nonaktifkan' : 'Aktifkan'}
                          onClick={() => ubah(a, { active: !a.active }, a.active ? `${a.name} dinonaktifkan — langsung tidak bisa masuk.` : `${a.name} diaktifkan lagi.`)}
                          className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-amber-600"
                        >
                          <Power size={14} />
                        </button>
                      )}
                      {!diriSendiri && (
                        <button
                          title="Hapus"
                          onClick={async () => {
                            if (!window.confirm(`Hapus akun ${a.name}?\n\nLebih disarankan MENONAKTIFKAN supaya namanya tetap tercatat di riwayat tindakan.`)) return;
                            try { await pb.collection('rental_admins').delete(a.id); lapor('Akun dihapus.', 'ok'); await muat(); }
                            catch (err) { lapor(err?.response?.message || 'Gagal menghapus.', 'galat'); }
                          }}
                          className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {!daftar.length && (
              <tr><td colSpan={4} className="px-4 py-10 text-center text-slate-500">Belum ada akun admin peminjaman. Buat yang pertama di atas.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
