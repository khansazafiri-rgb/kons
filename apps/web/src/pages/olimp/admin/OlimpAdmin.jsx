import React from 'react';
import { Navigate } from 'react-router-dom';
import OlimpShell from '@/components/olimp/OlimpShell';
import { useAuth } from '@/context/AuthContext';
import useUrlState from '@/lib/useUrlState';
import { isOlimpAdmin } from '@/lib/olimp';
import PaketManager from '@/pages/olimp/admin/PaketManager';
import EditSoalOlimp from '@/pages/olimp/admin/EditSoalOlimp';
import PesertaOlimp from '@/pages/olimp/admin/PesertaOlimp';
import JadwalOlimp from '@/pages/olimp/admin/JadwalOlimp';
import AnalitikOlimp from '@/pages/olimp/admin/AnalitikOlimp';
import MataKuliahOlimp from '@/pages/olimp/admin/MataKuliahOlimp';
import PaketLangganan from '@/pages/olimp/admin/PaketLangganan';
import SebOlimp from '@/pages/olimp/admin/SebOlimp';

// DASHBOARD OLIMP - panel admin untuk Web Olimp.
//
// Dipisah dari Dashboard Admin PCV (halaman /admin) karena isinya benar-benar
// beda: paket + blueprint + soal A-E + device lock. Yang menyambungkan keduanya
// adalah kartu "Web Olimp" di sidebar /admin, yang menjelaskan letak dashboard
// ini dan langsung menautkannya.
//
// Tata letaknya sengaja meniru /admin (sidebar kiri + isi kanan) supaya admin
// yang sudah terbiasa dengan PCV tidak perlu belajar ulang.

const TABS = [
  { key: 'Paket Soal', desc: 'Rancang paket, blueprint, dan terbitkan' },
  { key: 'Edit Soal', desc: 'Mata kuliah → topik → soal' },
  { key: 'Mata Kuliah', desc: 'Cabang olimpiade & kode soal' },
  { key: 'Paket Langganan', desc: 'Yang dipilih peserta saat mendaftar' },
  { key: 'Peserta', desc: 'Hak akses, langganan, reset device' },
  { key: 'Jadwal Lomba', desc: 'Kalender & agenda perlombaan' },
  { key: 'Analitik', desc: 'Keaktifan, akurasi, siswa tertinggal' },
  { key: 'SEB', desc: 'Penguncian ujian & berkas konfigurasi' },
];

export default function OlimpAdmin() {
  const { user, role, isAuthed } = useAuth();
  const [tab, setTab] = useUrlState('tab', 'Paket Soal');

  if (!isAuthed || !user?.id) return <Navigate to="/login" replace />;
  if (!isOlimpAdmin(role)) return <Navigate to="/olimp" replace />;

  return (
    <OlimpShell wide>
      <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-8 items-start">
        <nav className="md:sticky md:top-28 rounded-2xl border border-alba-200 bg-alba-50 shadow-card p-3 space-y-1">
          <p className="px-3 pt-1 pb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-maroon-500">Dashboard Olimp</p>
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`w-full text-left rounded-xl px-3.5 py-2.5 transition-colors ${
                tab === t.key ? 'bg-maroon-600 text-alba-50 shadow-sm' : 'hover:bg-maroon-50 text-stone-600'
              }`}
            >
              <span className="block text-sm font-semibold">{t.key}</span>
              <span className={`block text-[10px] leading-tight mt-0.5 ${tab === t.key ? 'text-alba-200' : 'text-stone-400'}`}>
                {t.desc}
              </span>
            </button>
          ))}
          {role === 'super_admin' && (
            <p className="mt-3 rounded-xl bg-gold-100/60 border border-gold-200 px-3 py-2 text-[10px] leading-relaxed text-gold-600 font-semibold">
              Kamu masuk sebagai Super Admin. Akun super admin hanya bisa dibuat langsung lewat PocketBase.
            </p>
          )}
        </nav>

        {/* min-w-0 supaya tabel lebar (daftar soal, peserta) menggulung di
            dalam kolomnya, bukan melebarkan seluruh halaman. */}
        <div className="min-w-0">
          {tab === 'Paket Soal' && <PaketManager />}
          {tab === 'Edit Soal' && <EditSoalOlimp />}
          {tab === 'Mata Kuliah' && <MataKuliahOlimp />}
          {tab === 'Paket Langganan' && <PaketLangganan />}
          {tab === 'Peserta' && <PesertaOlimp />}
          {tab === 'Jadwal Lomba' && <JadwalOlimp />}
          {tab === 'Analitik' && <AnalitikOlimp />}
          {tab === 'SEB' && <SebOlimp />}
        </div>
      </div>
    </OlimpShell>
  );
}
