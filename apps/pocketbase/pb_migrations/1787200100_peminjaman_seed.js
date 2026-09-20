/// <reference path="../pb_data/types.d.ts" />

// DATA AWAL MODUL PEMINJAMAN
//
// Dua hal berbeda dikerjakan berkas ini, dan bedanya penting:
//
//   1. SATU BARIS KONFIGURASI di rental_settings. Ini bukan contoh - modul
//      peminjaman butuh baris ini ada supaya endpoint punya tempat membaca
//      template pesan dan jam operasional. Semua isinya bisa diubah admin dari
//      dashboard, dan seluruh kolom rahasia (token Telegram, kredensial
//      Google) sengaja DIBIARKAN KOSONG: mengisinya dari berkas migrasi akan
//      menaruh rahasia di dalam source code, yang dilarang PRD bagian 17.
//
//   2. KATALOG CONTOH: dua ruang, empat alat, dan rekomendasi antar-keduanya.
//      Ini memang contoh (PRD bagian 22: "gunakan data contoh yang mudah
//      diganti dari dashboard"), supaya alur lengkap - pilih jadwal, masuk
//      keranjang, checkout, notifikasi - bisa dicoba sebelum admin sempat
//      mengisi katalog aslinya. Semuanya bisa dihapus dari dashboard.
//
// Saklar `enabled` dibiarkan MATI. Halaman publik peminjaman baru muncul
// setelah admin menyalakannya dari dashboard - jadi deploy migrasi ini tidak
// pernah menampilkan katalog contoh ke pengunjung web PCV.

migrate(
  (app) => {
    const cari = (name) => {
      try { return app.findCollectionByNameOrId(name); } catch (_) { return null; }
    };

    const settings = cari("rental_settings");
    const rooms = cari("rental_rooms");
    const items = cari("rental_items");
    const recos = cari("rental_recommendations");
    if (!settings || !rooms || !items || !recos) return;

    // -----------------------------------------------------------------
    // 1. Baris konfigurasi
    // -----------------------------------------------------------------
    let sudah = [];
    try { sudah = app.findRecordsByFilter("rental_settings", "id != ''", "", 1, 0); } catch (_) {}

    if (!sudah.length) {
      const s = new Record(settings);
      s.set("enabled", false);
      s.set("companyName", "PCV Rental");
      s.set("tagline", "Sewa ruang dan alat medis untuk praktik, pelatihan, dan tindakan.");

      // Nomor & rekening dibiarkan kosong: keduanya data perusahaan yang harus
      // diisi admin sebelum go-live (PRD bagian 21). Kalau diisi contoh, ada
      // risiko nyata pelanggan pertama mentransfer ke rekening karangan.
      s.set("waAdminNumber", "");
      s.set("bankDetail", "");
      s.set("qrisUrl", "");
      s.set(
        "paymentInstruction",
        "<p>Pembayaran diverifikasi manual oleh admin. Setelah checkout, tekan tombol " +
        "<b>Chat Admin WhatsApp</b>, lalu admin akan mengirimkan rincian dan tujuan transfer. " +
        "Kirim bukti transfer pada chat yang sama.</p>",
      );

      // Template PRD bagian 11.1 & 11.2, apa adanya.
      s.set(
        "waTemplatePelanggan",
        "Halo Admin [NAMA_PERUSAHAAN], saya [NAMA_PELANGGAN].\n" +
        "Saya telah membuat booking dengan kode [KODE_BOOKING].\n" +
        "Mohon informasi pembayaran untuk pesanan saya. Terima kasih.",
      );
      s.set(
        "waTemplateAdmin",
        "Halo Kak [NAMA_PELANGGAN],\n\n" +
        "Berikut rincian peminjaman dengan kode [KODE_BOOKING]:\n" +
        "[DAFTAR_ITEM_DAN_JADWAL]\n\n" +
        "Total pembayaran: [TOTAL_FORMAT_RUPIAH].\n" +
        "Silakan transfer ke:\n" +
        "[DETAIL_REKENING_ATAU_QRIS]\n\n" +
        "Setelah transfer, kirimkan bukti pembayaran pada chat ini. Terima kasih.",
      );

      s.set("defaultOpenMinute", 8 * 60);   // 08:00 WIB
      s.set("defaultCloseMinute", 21 * 60); // 21:00 WIB
      s.set("extraFees", []);

      s.set("biodataRetentionDays", 90);
      s.set(
        "privacyNote",
        "Biodata yang kamu isi dipakai admin untuk memproses peminjaman dan menghubungimu " +
        "lewat WhatsApp. Kalau kotak persetujuan dicentang, biodata ini juga disimpan di " +
        "peramban perangkat ini saja supaya tidak perlu diketik ulang - tidak dikirim ke " +
        "perangkat lain dan bisa dihapus kapan saja dari halaman checkout.",
      );

      s.set("telegramEnabled", false);
      s.set("googleEnabled", false);
      // Token bersama untuk Apps Script. Diacak sekarang supaya endpoint
      // Sheet tidak pernah berdiri tanpa penjaga; admin bisa memutarnya dari
      // dashboard kapan saja.
      s.set("sheetSyncToken", $security.randomString(40));

      s.set("kodeTanggal", "");
      s.set("kodeUrut", 0);
      app.save(s);
    }

    // -----------------------------------------------------------------
    // 2. Katalog contoh
    // -----------------------------------------------------------------
    let adaRuang = [];
    try { adaRuang = app.findRecordsByFilter("rental_rooms", "id != ''", "", 1, 0); } catch (_) {}
    if (adaRuang.length) return; // sudah pernah di-seed / admin sudah mengisi

    const buatRuang = (d) => {
      const r = new Record(rooms);
      Object.keys(d).forEach((k) => r.set(k, d[k]));
      r.set("active", true);
      r.set("syncOrigin", "SISTEM");
      r.set("syncVersion", 1);
      app.save(r);
      return r;
    };

    const ruangTindakan = buatRuang({
      name: "Ruang Tindakan Minor",
      slug: "ruang-tindakan-minor",
      description:
        "<p>Ruang tindakan bedah minor dengan meja tindakan, lampu sorot, dan wastafel scrub. " +
        "Cocok untuk pelatihan hecting, ekstraksi kuku, dan tindakan minor lain.</p>",
      address: "Gedung A Lantai 2, Jl. Contoh No. 1",
      capacity: 8,
      photos: [],
      facilities: ["Meja tindakan", "Lampu sorot", "Wastafel scrub", "AC", "Tempat sampah medis"],
      price: 150000,
      priceUnit: "JAM",
      openMinute: 8 * 60,
      closeMinute: 21 * 60,
      // Ruang tindakan diberi needsGuardian supaya alur "tidak ada penjaga =
      // tidak bisa dipinjam" benar-benar terlihat di data contoh - kalau semua
      // ruang contoh bebas penjaga, aturan itu tidak pernah teruji di tangan
      // admin yang baru belajar dashboardnya.
      needsGuardian: true,
      classCalendarIds: [],
      policy:
        "<p>Alat habis pakai tidak termasuk. Ruang harus dikembalikan dalam keadaan bersih. " +
        "Pembatalan mendadak dikonfirmasi lewat WhatsApp admin.</p>",
      order: 1,
    });

    const ruangSkill = buatRuang({
      name: "Ruang Skill Lab",
      slug: "ruang-skill-lab",
      description:
        "<p>Ruang latihan keterampilan klinis dengan manekin dan meja peserta. " +
        "Cocok untuk belajar kelompok, tutor sebaya, dan simulasi OSCE.</p>",
      address: "Gedung A Lantai 1, Jl. Contoh No. 1",
      capacity: 20,
      photos: [],
      facilities: ["Manekin CPR", "Proyektor", "Whiteboard", "AC", "Kursi 20"],
      price: 100000,
      priceUnit: "JAM",
      openMinute: 8 * 60,
      closeMinute: 21 * 60,
      needsGuardian: false,
      classCalendarIds: [],
      policy: "<p>Manekin dipakai sesuai instruksi. Kerusakan dilaporkan ke admin.</p>",
      order: 2,
    });

    const buatAlat = (d) => {
      const r = new Record(items);
      Object.keys(d).forEach((k) => r.set(k, d[k]));
      r.set("active", true);
      r.set("syncOrigin", "SISTEM");
      r.set("syncVersion", 1);
      app.save(r);
      return r;
    };

    const setMinor = buatAlat({
      name: "Set Instrumen Bedah Minor",
      slug: "set-instrumen-bedah-minor",
      sku: "ALT-001",
      category: "Instrumen",
      description: "<p>Satu set steril: needle holder, pinset anatomis & sirurgis, gunting, klem arteri.</p>",
      photos: [],
      price: 75000,
      priceUnit: "HARI",
      totalQuantity: 6,
      rules: "<p>Dikembalikan lengkap. Instrumen hilang diganti sesuai harga penggantian.</p>",
      order: 1,
    });

    const sarungTangan = buatAlat({
      name: "Sarung Tangan Steril (per box)",
      slug: "sarung-tangan-steril",
      sku: "ALT-002",
      category: "Habis pakai",
      description: "<p>Box isi 50 pasang, ukuran 7 dan 7,5.</p>",
      photos: [],
      price: 90000,
      priceUnit: "SESI",
      totalQuantity: 20,
      rules: "<p>Barang habis pakai - dihitung per box terpakai, tidak dikembalikan.</p>",
      order: 2,
    });

    const lampuTindakan = buatAlat({
      name: "Lampu Tindakan Portabel",
      slug: "lampu-tindakan-portabel",
      sku: "ALT-003",
      category: "Alat penunjang",
      description: "<p>Lampu LED berdiri dengan lengan fleksibel, terang dan tidak panas.</p>",
      photos: [],
      price: 50000,
      priceUnit: "HARI",
      totalQuantity: 3,
      rules: "<p>Dibawa dengan hati-hati. Kabel digulung rapi saat dikembalikan.</p>",
      order: 3,
    });

    const manekin = buatAlat({
      name: "Manekin CPR Dewasa",
      slug: "manekin-cpr-dewasa",
      sku: "ALT-004",
      category: "Simulasi",
      description: "<p>Manekin latihan resusitasi jantung paru dengan indikator kedalaman kompresi.</p>",
      photos: [],
      price: 120000,
      priceUnit: "HARI",
      totalQuantity: 2,
      rules: "<p>Permukaan dibersihkan dengan alkohol swab setelah dipakai.</p>",
      order: 4,
    });

    // -----------------------------------------------------------------
    // 3. Rekomendasi terkait (PRD bagian 8 - contohnya persis ini)
    // -----------------------------------------------------------------
    const reko = (sType, sId, tType, tId, urutan, catatan) => {
      const r = new Record(recos);
      r.set("sourceType", sType);
      r.set("sourceId", sId);
      r.set("targetType", tType);
      r.set("targetId", tId);
      r.set("order", urutan);
      r.set("note", catatan || "");
      r.set("active", true);
      app.save(r);
    };

    // "Alat tindakan minor dapat merekomendasikan sarung tangan, set instrumen,
    // lampu tindakan, dan ruang tindakan." - PRD bagian 8.
    reko("ALAT", setMinor.id, "ALAT", sarungTangan.id, 1, "Hampir selalu dipakai bersama");
    reko("ALAT", setMinor.id, "ALAT", lampuTindakan.id, 2, "");
    reko("ALAT", setMinor.id, "RUANG", ruangTindakan.id, 3, "Tempat tindakannya");

    reko("RUANG", ruangTindakan.id, "ALAT", setMinor.id, 1, "");
    reko("RUANG", ruangTindakan.id, "ALAT", sarungTangan.id, 2, "");
    reko("RUANG", ruangTindakan.id, "ALAT", lampuTindakan.id, 3, "");

    reko("RUANG", ruangSkill.id, "ALAT", manekin.id, 1, "");
  },

  (app) => {
    // Turun: hanya membuang data contoh, dan hanya kalau masih persis seperti
    // yang ditanam di sini. Katalog yang sudah diubah/ditambah admin tidak
    // ikut terhapus - migrasi turun tidak boleh membuang pekerjaan orang.
    const slugContoh = [
      "ruang-tindakan-minor",
      "ruang-skill-lab",
      "set-instrumen-bedah-minor",
      "sarung-tangan-steril",
      "lampu-tindakan-portabel",
      "manekin-cpr-dewasa",
    ];
    ["rental_rooms", "rental_items"].forEach((col) => {
      slugContoh.forEach((slug) => {
        try {
          const rec = app.findFirstRecordByFilter(col, "slug = {:slug}", { slug: slug });
          if (rec) app.delete(rec);
        } catch (_) { /* tidak ada / sudah dipakai relasi */ }
      });
    });
  },
);
