// Penanda versi kode, dipakai untuk mendeteksi deploy yang belum lengkap.
//
// Nilai ini HARUS SAMA dengan SERVER_VERSION di apps/pocketbase/pb_hooks/pcv-shared.js.
// Tab admin "Kelas & Reminder" membandingkan versi tampilan (konstanta ini,
// terbawa di build frontend) dengan versi server (endpoint /api/pcv/version,
// terbawa di hook PocketBase). Kalau beda, berarti salah satu dari build web /
// restart PocketBase terlewat saat deploy, dan admin diberi tahu terang-terangan.
// Naikkan versinya setiap kali ada perubahan pada hook PocketBase.
export const APP_VERSION = 'v9.9';
