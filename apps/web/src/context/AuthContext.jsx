// CATATAN: File ini tidak ikut ter-export di dokumen code, jadi ini adalah
// implementasi referensi berdasarkan cara pemakaiannya di seluruh halaman
// (login, enterGuest, logout, user, guest, role, isAuthed) + aturan PRD
// "1 akun maksimal aktif di 2 device". Kalau projectmu di Horizons sudah
// punya src/context/AuthContext.jsx sendiri, PERTAHANKAN versimu.
import React, { createContext, useContext, useEffect, useState } from 'react';
import pb from '@/lib/pocketbaseClient';
import { getDeviceId } from '@/lib/deviceId';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
 const [user, setUser] = useState(pb.authStore.record || null);
 const [guest, setGuest] = useState(sessionStorage.getItem('pcv_guest') === '1');

 useEffect(() => {
   return pb.authStore.onChange(() => {
     setUser(pb.authStore.record || null);
   });
 }, []);

 const login = async (email, password) => {
   const auth = await pb.collection('users').authWithPassword(email, password);
   const record = auth.record;

   if (record.disabled) {
     pb.authStore.clear();
     throw new Error('Akun ini telah dinonaktifkan oleh admin.');
   }

   // Batas 2 device per akun (lihat PRD): device dikenali lewat id acak
   // yang disimpan di localStorage browser.
   const deviceId = getDeviceId();
   const devices = Array.isArray(record.deviceIds) ? record.deviceIds : [];
   if (!devices.includes(deviceId)) {
     if (devices.length >= 2) {
       pb.authStore.clear();
       throw new Error('Akun ini sudah aktif di 2 device. Hubungi admin untuk mereset device.');
     }
     await pb.collection('users').update(record.id, { deviceIds: [...devices, deviceId] });
   }

   sessionStorage.removeItem('pcv_guest');
   setGuest(false);
   setUser(pb.authStore.record);
 };

 const enterGuest = () => {
   pb.authStore.clear();
   sessionStorage.setItem('pcv_guest', '1');
   setGuest(true);
   setUser(null);
 };

 const logout = () => {
   pb.authStore.clear();
   sessionStorage.removeItem('pcv_guest');
   setGuest(false);
   setUser(null);
 };

 const value = {
   user,
   guest,
   role: guest ? 'guest' : user?.role || null,
   isAuthed: !!user,
   login,
   enterGuest,
   logout,
 };

 return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
 return useContext(AuthContext);
}
