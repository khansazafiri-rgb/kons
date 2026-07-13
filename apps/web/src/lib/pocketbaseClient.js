// CATATAN: File ini tidak ikut ter-export di dokumen code, jadi ini adalah
// implementasi referensi. Kalau projectmu di Horizons sudah punya
// src/lib/pocketbaseClient.js sendiri, PERTAHANKAN versimu.
import PocketBase from 'pocketbase';

const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL || '/');
pb.autoCancellation(false);

export default pb;
