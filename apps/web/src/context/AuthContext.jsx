import React, { createContext, useContext, useEffect, useState } from 'react';
import pb from '@/lib/pocketbaseClient';
import { getDeviceId } from '@/lib/deviceId';
import { studentTypeDevices } from '@/lib/studentType';

const AuthContext = createContext(null);

// Batas jumlah device per akun:
// - admin   : BEBAS (tanpa batas, tidak dilacak)
// - teacher : 1 device
// - student : sesuai tipenya (reguler & private 1 device, web 2 device)
export function deviceLimitFor(record) {
  if (record?.role === 'admin') return Infinity;
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
          throw new Error(
            limit > 1
              ? `Akun ini sedang login di ${limit} device. Logout dulu dari salah satu device, atau hubungi admin untuk reset device.`
              : 'Akun ini sedang login di device lain. Logout dulu dari device tersebut, atau hubungi admin untuk reset device.',
          );
        }
        const updated = [...devices, deviceId];
        await pb.collection('users').update(record.id, { deviceIds: updated });
      }
    }
    return record;
  };

  // Logout MELEPAS slot device: setelah logout, akun bisa dipakai login dari
  // device lain (sesuai alur yang diminta). Kalau pelepasan gagal (mis. offline),
  // sesi lokal tetap dibersihkan; slot bisa dilepas admin lewat Reset Device.
  const logout = async () => {
    const record = pb.authStore.record;
    try {
      if (record && deviceLimitFor(record) !== Infinity) {
        const deviceId = getDeviceId();
        const devices = Array.isArray(record.deviceIds) ? record.deviceIds : [];
        if (devices.includes(deviceId)) {
          await pb.collection('users').update(record.id, {
            deviceIds: devices.filter((d) => d !== deviceId),
          });
        }
      }
    } catch (_) {
      // dibiarkan: logout lokal tetap jalan
    }
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
