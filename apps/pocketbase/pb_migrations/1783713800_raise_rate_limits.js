/// <reference path="../pb_data/types.d.ts" />

// Naikkan batas kecepatan API. Batas lama (200 request / 5 menit) terlalu kecil
// untuk fitur "import banyak soal" — mengunggah puluhan soal sekaligus langsung
// menabrak batas dan gagal di tengah jalan (error 429). Aplikasi ini dipakai
// internal (bimbel), jadi batas tinggi aman. Proteksi brute-force login tetap ada.

migrate(
  (app) => {
    const settings = app.settings();

    settings.rateLimits = {
      enabled: true,
      rules: [
        // Batas umum API dinaikkan jauh: 3000 request / menit.
        { label: "/api", audience: "", duration: 60, maxRequests: 3000 },
        // Proteksi brute-force login (tamu) tetap ketat.
        { label: "*:auth", audience: "@guest", duration: 5 * 60, maxRequests: 20 },
        // Reset password / verifikasi / OTP tetap dibatasi wajar.
        { label: "POST /api/collections/users/request-password-reset", audience: "", duration: 60 * 60, maxRequests: 5 },
        { label: "POST /api/collections/users/request-verification", audience: "", duration: 60 * 60, maxRequests: 5 },
        { label: "POST /api/collections/users/request-email-change", audience: "@auth", duration: 60 * 60, maxRequests: 5 },
        { label: "POST /api/collections/users/request-otp", audience: "", duration: 60 * 60, maxRequests: 10 },
      ],
    };

    app.save(settings);
  },
  (app) => {
    // Down: kembalikan ke batas lama (200 / 5 menit).
    const settings = app.settings();
    settings.rateLimits = {
      enabled: true,
      rules: [
        { label: "/api", audience: "", duration: 5 * 60, maxRequests: 200 },
        { label: "*:auth", audience: "@guest", duration: 5 * 60, maxRequests: 20 },
        { label: "POST /api/collections/users/request-password-reset", audience: "", duration: 60 * 60, maxRequests: 5 },
        { label: "POST /api/collections/users/request-verification", audience: "", duration: 60 * 60, maxRequests: 5 },
        { label: "POST /api/collections/users/request-email-change", audience: "@auth", duration: 60 * 60, maxRequests: 3 },
        { label: "POST /api/collections/users/request-otp", audience: "", duration: 60 * 60, maxRequests: 10 },
      ],
    };
    app.save(settings);
  },
);
