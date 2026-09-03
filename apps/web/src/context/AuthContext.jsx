import React, { createContext, useContext, useEffect, useState } from 'react';
import pb from '@/lib/pocketbaseClient';
import { siapkanDeviceId } from '@/lib/deviceId';
import { studentTypeDevices } from '@/lib/studentType';

const AuthContext = createContext(null);

// Pengurus web utama: "admin" DAN "super_admin".
//
// super_admin ditambahkan belakangan untuk Web Olimp, dan tiap layar yang lupa
// menyebutnya jadi setengah terkunci - menunya terlihat, isinya tidak bisa
// dipakai. Semua pemeriksaan peran pengurus lewat sini supaya penambahan peran
// berikutnya cukup diubah di satu tempat. (Layar khusus Olimp sengaja TIDAK
// memakai ini - di sana memang hanya super_admin yang boleh.)
export const isAdminRole = (role) => role === 'admin' || role === 'super_admin';

// Batas jumlah device per akun:
// - admin & super_admin : BEBAS (tanpa batas, tidak dilacak)
// - teacher              : 1 device
// - student              : sesuai tipenya (reguler & private 1 device, web 2 device)
export function deviceLimitFor(record) {
  if (isAdminRole(record?.role)) return Infinity;
  if (record?.role === 'student') return studentTypeDevices(record.studentType);
  return 1;
}

// KUNCI DEVICE YANG KEDALUWARSA SENDIRI
//
// Berapa lama akun boleh menganggur sebelum slot device-nya bisa diambil alih
// perangkat lain. Angkanya 7 hari, dan itu bukan angka karangan: Safari di
// iPhone menghapus penyimpanan situs yang tidak dibuka selama 7 HARI, termasuk
// penanda perangkat kita. Jadi siswa yang libur seminggu lalu membuka web lagi
// dari HP yang SAMA akan datang tanpa penanda - dan dulu langsung ditolak
// "sudah terkunci ke device lain", tanpa jalan keluar selain minta admin.
//
// Kuki dari server (lib/deviceId) mencegah itu terjadi lagi ke depan, tapi ia
// tidak bisa memulihkan siswa yang penandanya sudah telanjur hilang - termasuk
// semua yang ikut hilang waktu web pindah domain. Aturan ini pintu keluarnya.
//
// Apa yang HILANG dengan aturan ini, supaya jujur: akun yang tidak dipakai
// seminggu bisa dipindahkan ke perangkat lain tanpa izin admin. Yang TETAP
// terjaga adalah maksud aslinya - satu akun tidak bisa dipakai BERSAMAAN di dua
// HP. Slotnya berpindah, bukan bertambah: begitu teman memakainya, pemilik
// aslinya yang balik ditolak. Berbagi akun tetap tidak jalan, sementara siswa
// jujur yang HP-nya itu-itu saja tidak lagi terkunci di luar.
const HARI_KUNCI_KEDALUWARSA = 7;

// Sudah berapa lama akun ini tidak dipakai?
//
// Yang dibaca `lastActivityAt` - jejak "masih membuka web" yang ditulis Header
// paling sering tiap 10 menit. Kalau field-nya belum pernah terisi (akun lama,
// atau belum pernah login sejak fitur itu ada), dipakai `updated`/`created`
// sekadar supaya ada patokan. Urutannya sengaja tidak diambil yang terbaru:
// `updated` ikut berubah saat ADMIN menyunting akun itu, dan kalau itu ikut
// dihitung sebagai "aktif", akun yang sudah berbulan-bulan menganggur akan
// terlihat segar hanya karena datanya baru saja dirapikan admin.
function menganggurTerlaluLama(record) {
  const jejak = record?.lastActivityAt || record?.updated || record?.created;
  const waktu = Date.parse(jejak);
  if (!Number.isFinite(waktu)) return false;
  return Date.now() - waktu > HARI_KUNCI_KEDALUWARSA * 86400000;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(pb.authStore.record);

  useEffect(() => {
    const unsub = pb.authStore.onChange((_t, record) => setUser(record));
    return unsub;
  }, []);

  // Pasang/perpanjang kuki penanda perangkat tiap kali web dibuka, tanpa
  // menunggu siswa login. Dua gunanya: umur kukinya ikut diperpanjang selama
  // web masih dipakai, dan penanda yang hilang dari localStorage dipulihkan
  // lebih awal - jadi saat halaman lain memanggil getDeviceId() secara
  // langsung, nilainya sudah yang benar.
  useEffect(() => { siapkanDeviceId(); }, []);

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
      // Ditunggu, bukan dipanggil sambil lalu: kalau penyimpanan peramban baru
      // saja terhapus (Safari 7 hari, pindah domain, bersihkan data situs),
      // penanda yang BENAR ada di kuki server dan baru sampai setelah ini.
      // Memeriksa kunci sebelum itu selesai = menolak HP yang sebenarnya sah.
      const deviceId = await siapkanDeviceId();
      const devices = Array.isArray(record.deviceIds) ? record.deviceIds : [];
      if (!devices.includes(deviceId)) {
        // Slot penuh, tapi akunnya sendiri sudah lama tidak dipakai - berarti
        // ini hampir pasti orang yang sama dengan penanda yang keburu terhapus,
        // bukan akun yang sedang dipakai berdua. Slot paling lama dilepas,
        // perangkat ini menggantikannya.
        const bolehGantiSlot = devices.length >= limit && menganggurTerlaluLama(record);
        if (devices.length >= limit && !bolehGantiSlot) {
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
        // Yang dibuang dari depan: daftar ini selalu ditambah dari belakang,
        // jadi isi paling awal adalah slot yang paling lama terpasang.
        const disimpan = bolehGantiSlot ? devices.slice(devices.length - limit + 1) : devices;
        await pb.collection('users').update(record.id, { deviceIds: [...disimpan, deviceId] });
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
