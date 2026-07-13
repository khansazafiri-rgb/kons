// Koneksi ke database PocketBase. Semua halaman mengimport "pb" dari file ini.
// Kalau web-mu di Horizons sudah bisa login/memuat data, berarti file serupa
// sebenarnya sudah ada (mungkin tersembunyi di file explorer Horizons).
// Pakai file ini hanya kalau memang benar-benar belum ada.
import PocketBase from 'pocketbase';

const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL || '/');
pb.autoCancellation(false);

export default pb;
