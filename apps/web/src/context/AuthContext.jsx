import React, { createContext, useContext, useEffect, useState } from 'react';
import pb from '@/lib/pocketbaseClient';
import { getDeviceId } from '@/lib/deviceId';
import { studentTypeDevices } from '@/lib/studentType';

const AuthContext = createContext(null);

// Batas jumlah device per akun:
// - admin & super_admin : BEBAS (tanpa batas, tidak dilacak)
// - teacher              : 1 device
// - student              : sesuai tipenya (reguler & private 1 device, web 2 device)
export function deviceLimitFor(record) {
  if (record?.role === 'admin' || record?.role === 'super_admin') return Infinity;
  if (record?.role === 'student') return studentTypeDevices(record.studentType);
  return 1;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(pb.authStore.record);

  useEffect(() => {
    const unsub = pb.authStore.onChange((_t, record) => setUser(record));
    return unsub;
  }, []);

  useEffect(() => {
    // Validate the persisted session on load: if the token is stale or the
    // underlying user record no longer exists, clear it instead of letting
    // later PB calls fail with confusing 404s.
    if (pb.authStore.isValid) {
      pb.collection('users')
        .authRefresh()
        .catch(() => {
          pb.authStore.clear();
        });
    }
  }, []);

  // Login memakai "Login ID" (field userId) atau email - keduanya didukung
  // oleh identityFields di PocketBase. Parameter dinamai `identity`.
  const login = async (identity, password) => {
    await pb.collection('users').authWithPassword(identity, password);
    const record = pb.authStore.record;
    // Akun yang baru mendaftar disimpan dengan disabled: true DAN
    // signupPending: true (lihat SignupPage), jadi dua keadaan yang sangat
    // berbeda dulu memakai satu pesan yang sama - pendaftar baru dikira
    // akunnya dinonaktifkan, padahal cuma antre di-ACC admin. Yang menunggu
    // ACC diperiksa lebih dulu supaya dapat pesan yang benar.
    if (record.signupPending) {
      pb.authStore.clear();
      throw new Error('Akun ini belum diverifikasi oleh admin. Tunggu beberapa saat, atau hubungi admin.');
    }
    if (record.disabled) {
      pb.authStore.clear();
      throw new Error('Akun ini telah dinonaktifkan. Silakan hubungi admin.');
    }
    const limit = deviceLimitFor(record);
    if (limit !== Infinity) {
      const deviceId = getDeviceId();
      const devices = Array.isArray(record.deviceIds) ? record.deviceIds : [];
      if (!devices.includes(deviceId)) {
        if (devices.length >= limit) {
          pb.authStore.clear();
          // Sengaja TIDAK menyarankan "logout dulu dari device sana": logout
          // tidak lagi melepas slot (lihat catatan di fungsi logout), jadi
          // saran itu cuma bikin siswa bolak-balik mencoba dan tetap gagal.
          throw new Error(
            limit > 1
              ? `Akun ini sudah terkunci ke ${limit} device. Satu akun hanya bisa dipakai di ${limit} device itu saja (boleh berapa pun tab di dalamnya). Kalau kamu ganti HP/laptop, minta admin melakukan Reset Device.`
              : 'Akun ini sudah terkunci ke device lain. Satu akun hanya bisa dipakai di satu device (boleh berapa pun tab di dalamnya). Kalau kamu ganti HP/laptop, minta admin melakukan Reset Device.',
          );
        }
        const updated = [...devices, deviceId];
        await pb.collection('users').update(record.id, { deviceIds: updated });
      }
    }
    return record;
  };

  // Logout TIDAK melepas slot device - ini disengaja.
  //
  // Yang diminta: satu akun terkunci ke satu device, tapi bebas berapa pun tab
  // di device itu. Kalau logout ikut mengosongkan slotnya, kuncinya jadi tidak
  // ada artinya - siswa tinggal logout, lalu akunnya bisa dipakai login di HP
  // teman. Dengan slot dipertahankan:
  //   - device yang sama (tab mana pun) tetap bisa login lagi kapan saja,
  //     karena deviceId-nya sudah tercatat di daftar;
  //   - device lain tetap ditolak, logout atau tidak.
  //
  // Konsekuensinya yang harus diketahui admin: kalau siswa ganti HP, ganti
  // browser, buka lewat mode Incognito, atau menghapus data situs, deviceId-nya
  // ikut hilang dan ia akan terkunci di luar. Satu-satunya jalan keluar adalah
  // tombol "Reset Device" di Dashboard Admin (siswa otomatis dapat notifikasi
  // WhatsApp setelah di-reset).
  const logout = async () => {
    pb.authStore.clear();
  };

  const isAuthed = pb.authStore.isValid;
  const role = user?.role;

  return (
    <AuthContext.Provider value={{ user, role, isAuthed, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
