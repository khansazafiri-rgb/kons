import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import pbo from '@/lib/olimpClient';
import pb from '@/lib/pocketbaseClient';
import { useAuth } from '@/context/AuthContext';

// SIAPA YANG SEDANG MEMBUKA WEB OLIMP
//
// Ada dua jenis orang yang bisa masuk, dan keduanya datang dari collection
// yang berbeda:
//
//   peserta -> collection `olimp_users`, login lewat /olimp/masuk
//   admin   -> collection `users` (akun PCV), login lewat /login
//
// Konteks ini menyatukan keduanya jadi satu jawaban: `kind` ('peserta' |
// 'admin' | null), `user` (record yang bersangkutan), dan `pbFor` (klien
// PocketBase mana yang harus dipakai untuk menulis atas nama orang itu).
//
// Admin sengaja TIDAK diminta membuat akun Olimp: mereka mengelola Web Olimp
// sebagai bagian dari pekerjaan admin PCV, dan menambah satu akun lagi cuma
// menambah satu password yang harus diingat.

const OlimpAuthContext = createContext(null);

export const STATUS_PESAN = {
  pending: 'Pendaftaranmu sudah masuk dan sedang menunggu konfirmasi admin. Kamu akan dihubungi lewat WhatsApp begitu akunnya dibuka.',
  rejected: 'Pendaftaran akun ini tidak disetujui. Hubungi admin PCV kalau menurutmu ini keliru.',
  expired: 'Masa berlaku paketmu sudah berakhir. Hubungi admin untuk memperpanjang.',
};

export function OlimpAuthProvider({ children }) {
  const [peserta, setPeserta] = useState(pbo.authStore.record);
  // Paket langganan peserta dimuat sekali di sini, bukan di tiap halaman:
  // isinya menentukan paket soal mana yang boleh dibuka, dan hampir semua
  // halaman peserta memerlukannya.
  const [plan, setPlan] = useState(null);
  const { user: pcvUser, role: pcvRole } = useAuth();

  useEffect(() => {
    const unsub = pbo.authStore.onChange((_t, record) => setPeserta(record));
    return unsub;
  }, []);

  useEffect(() => {
    // Sesi lama yang tokennya sudah tidak sah dibersihkan di awal, supaya
    // panggilan berikutnya tidak gagal dengan 404 yang membingungkan.
    if (pbo.authStore.isValid) {
      pbo.collection('olimp_users').authRefresh().catch(() => pbo.authStore.clear());
    }
  }, []);

  useEffect(() => {
    if (!peserta?.plan) { setPlan(null); return undefined; }
    let hidup = true;
    pbo.collection('olimp_plans').getOne(peserta.plan)
      .then((p) => { if (hidup) setPlan(p); })
      .catch(() => { if (hidup) setPlan(null); });
    return () => { hidup = false; };
  }, [peserta?.plan]);

  const adminPcv = pcvRole === 'admin' || pcvRole === 'super_admin';

  const login = async (email, password) => {
    await pbo.collection('olimp_users').authWithPassword(email, password);
    const rec = pbo.authStore.record;
    // Status diperiksa SESUDAH autentikasi berhasil, bukan lewat authRule di
    // server. Alasannya pesan: authRule yang menolak cuma menghasilkan
    // "gagal login" tanpa sebab, sedangkan di sini kita tahu persis apakah
    // orangnya menunggu ACC, ditolak, atau paketnya habis.
    if (rec?.disabled) {
      pbo.authStore.clear();
      throw new Error('Akun ini dinonaktifkan. Hubungi admin PCV.');
    }
    const status = rec?.status;
    if (status !== 'active') {
      pbo.authStore.clear();
      throw new Error(STATUS_PESAN[status] || 'Akun ini belum aktif. Hubungi admin PCV.');
    }
    return rec;
  };

  const logout = () => { pbo.authStore.clear(); };

  const nilai = useMemo(() => {
    // Peserta menang atas admin kalau dua-duanya kebetulan login di browser
    // yang sama: yang sedang dilihat memang halaman peserta.
    if (peserta?.id) {
      return { kind: 'peserta', user: peserta, plan, pbFor: pbo, isAdmin: false, login, logout, adminPcv };
    }
    if (adminPcv && pcvUser?.id) {
      return { kind: 'admin', user: pcvUser, plan: null, pbFor: pb, isAdmin: true, login, logout, adminPcv };
    }
    return { kind: null, user: null, plan: null, pbFor: pbo, isAdmin: false, login, logout, adminPcv };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peserta, plan, pcvUser, adminPcv]);

  return <OlimpAuthContext.Provider value={nilai}>{children}</OlimpAuthContext.Provider>;
}

export function useOlimpAuth() {
  return useContext(OlimpAuthContext);
}
