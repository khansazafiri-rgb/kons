import React, { createContext, useContext, useEffect, useState } from 'react';
import pb from '@/lib/pocketbaseClient';
import { getDeviceId } from '@/lib/deviceId';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(pb.authStore.record);
  const [guest, setGuest] = useState(false);

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

  const login = async (email, password) => {
    await pb.collection('users').authWithPassword(email, password);
    const record = pb.authStore.record;
    if (record.disabled) {
      pb.authStore.clear();
      throw new Error('Akun ini telah dinonaktifkan. Silakan hubungi admin.');
    }
    // Batas jumlah device per akun:
    // - admin  : BEBAS (tanpa batas, tidak dilacak)
    // - teacher & student : maksimal 3 device
    const DEVICE_LIMIT = 3;
    if (record.role !== 'admin') {
      const deviceId = getDeviceId();
      const devices = Array.isArray(record.deviceIds) ? record.deviceIds : [];
      if (!devices.includes(deviceId)) {
        if (devices.length >= DEVICE_LIMIT) {
          pb.authStore.clear();
          throw new Error(
            `Akun ini sudah login di ${DEVICE_LIMIT} device lain. Hubungi admin untuk reset device.`,
          );
        }
        const updated = [...devices, deviceId];
        await pb.collection('users').update(record.id, { deviceIds: updated });
      }
    }
    setGuest(false);
    return record;
  };

  const enterGuest = () => setGuest(true);

  const logout = () => {
    pb.authStore.clear();
    setGuest(false);
  };

  const isAuthed = pb.authStore.isValid;
  const role = guest ? 'guest' : user?.role;

  return (
    <AuthContext.Provider value={{ user, guest, role, isAuthed, login, logout, enterGuest }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
