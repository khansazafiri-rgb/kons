/// <reference path="../pb_data/types.d.ts" />

// REVISI 2 - Modul Event/Lomba & perbaikan lintas platform
// (PRD Revisi 2 bagian 9: Perubahan Database Schema)
//
// Empat kelompok perubahan:
//
//   1. events            -> tipe (Lomba/Olimpiade) + saklar apa yang boleh
//                           terlihat publik
//   2. users, olimp_users-> penanda hapus lunak (soft delete)
//   3. event_registrations -> penanda hapus lunak + jejak berkas konfigurasi
//                           untuk menelusuri bug "tidak terdaftar"
//   4. authRule          -> akun yang sudah dihapus tidak bisa login lagi
//
// ---------------------------------------------------------------------------
// PENYIMPANGAN DARI PRD (disengaja)
// ---------------------------------------------------------------------------
//
// PRD bagian 9.1 menamai saklarnya `hide_question_count_public` dan kawan-kawan,
// dengan default true (tersembunyi). Di sini namanya DIBALIK jadi
// `showQuestionCountPublic` dst, default false.
//
// Alasannya bukan selera: field bool di PocketBase selalu lahir bernilai false.
// Kalau namanya "hide...", event baru yang dibuat lewat API tanpa menyebut field
// itu akan lahir dengan hide=false - artinya BOCOR. Dengan nama "show...",
// keadaan lahirnya justru tersembunyi, dan admin harus sengaja menyalakannya.
// Perilaku yang diminta PRD bagian 3 sama persis; yang berubah cuma arah
// defaultnya supaya aman kalau ada yang lupa mengisi.
//
// Nama field tetap camelCase mengikuti seluruh isi repo ini, bukan snake_case
// seperti di PRD - lihat catatan yang sama di migrasi 1786600000.

migrate(
  (app) => {
    const tambahField = (colName, buat) => {
      let col;
      try { col = app.findCollectionByNameOrId(colName); } catch (_) { return null; }
      const sebelum = col.fields.length;
      buat(col);
      if (col.fields.length !== sebelum) app.save(col);
      return col;
    };

    // -----------------------------------------------------------------
    // 1. events - tipe & saklar tampilan publik
    // -----------------------------------------------------------------
    tambahField("events", (col) => {
      if (!col.fields.getByName("eventType")) {
        col.fields.add(new SelectField({
          name: "eventType",
          maxSelect: 1,
          values: ["LOMBA", "OLIMPIADE"],
        }));
      }
      // Tiga saklar "boleh dilihat umum". Semuanya lahir mati = tersembunyi.
      ["showQuestionCountPublic", "showMechanismPublic", "showParticipantCountPublic"]
        .forEach((nama) => {
          if (!col.fields.getByName(nama)) col.fields.add(new BoolField({ name: nama }));
        });
    });

    // Event yang sudah terlanjur ada diberi tipe LOMBA supaya kartunya tidak
    // tampil tanpa label. Saklar tampilan sengaja dibiarkan mati - itu memang
    // keadaan yang diminta PRD bagian 3.
    try {
      app.findRecordsByFilter("events", "eventType = ''", "", 0, 0).forEach((ev) => {
        ev.set("eventType", "LOMBA");
        app.save(ev);
      });
    } catch (_) { /* collection belum ada */ }

    // -----------------------------------------------------------------
    // 2 & 3. Penanda hapus lunak + jejak berkas konfigurasi
    // -----------------------------------------------------------------
    //
    // Hapus LUNAK, bukan hapus sungguhan (PRD bagian 7.3, rekomendasi yang
    // dipilih): baris yang dihapus admin cuma ditandai tanggalnya lalu
    // disembunyikan dari daftar. Papan peringkat, hasil ujian, dan laporan
    // lama tetap utuh - kalau barisnya benar-benar dibuang, semua angka
    // historis yang menunjuk ke sana ikut rusak.
    ["users", "olimp_users", "event_registrations"].forEach((nama) => {
      tambahField(nama, (col) => {
        if (!col.fields.getByName("deletedAt")) {
          col.fields.add(new DateField({ name: "deletedAt" }));
        }
      });
    });

    tambahField("event_registrations", (col) => {
      // Dua tanggal ini murni untuk menelusuri keluhan "berkas konfigurasi saya
      // ditolak" (PRD bagian 6.2): kapan tokennya dibuat, dan kapan berkasnya
      // terakhir diunduh. Tanpa keduanya, admin cuma bisa menebak.
      if (!col.fields.getByName("configTokenGeneratedAt")) {
        col.fields.add(new DateField({ name: "configTokenGeneratedAt" }));
      }
      if (!col.fields.getByName("configLastDownloadedAt")) {
        col.fields.add(new DateField({ name: "configLastDownloadedAt" }));
      }
    });

    // -----------------------------------------------------------------
    // 4. Akun yang sudah dihapus tidak boleh login lagi
    // -----------------------------------------------------------------
    //
    // Menyembunyikan baris dari daftar admin saja tidak cukup - tanpa ini,
    // akun yang "sudah dihapus" masih bisa masuk seperti biasa. Syaratnya
    // DITAMBAHKAN ke authRule yang sudah ada, bukan menggantinya, supaya
    // pemeriksaan lain (mis. akun dinonaktifkan) tidak ikut hilang.
    ["users", "olimp_users"].forEach((nama) => {
      let col;
      try { col = app.findCollectionByNameOrId(nama); } catch (_) { return; }
      const syarat = "deletedAt = ''";
      const lama = col.authRule === null || col.authRule === undefined
        ? ""
        : String(col.authRule);
      if (lama.indexOf(syarat) !== -1) return; // sudah pernah dipasang
      col.authRule = lama.trim() === "" ? syarat : "(" + lama + ") && " + syarat;
      app.save(col);
    });
  },

  (app) => {
    const buangField = (colName, namaField) => {
      let col;
      try { col = app.findCollectionByNameOrId(colName); } catch (_) { return; }
      let berubah = false;
      namaField.forEach((n) => {
        const f = col.fields.getByName(n);
        if (f) { col.fields.removeById(f.id); berubah = true; }
      });
      if (berubah) app.save(col);
    };

    // authRule dikembalikan lebih dulu - ia menyebut field yang mau dibuang.
    ["users", "olimp_users"].forEach((nama) => {
      let col;
      try { col = app.findCollectionByNameOrId(nama); } catch (_) { return; }
      const teks = col.authRule === null || col.authRule === undefined ? "" : String(col.authRule);
      if (teks === "deletedAt = ''") {
        col.authRule = "";
      } else if (teks.indexOf(" && deletedAt = ''") !== -1) {
        const tanpa = teks.split(" && deletedAt = ''").join("");
        col.authRule = tanpa.replace(/^\((.*)\)$/, "$1");
      }
      app.save(col);
    });

    buangField("events", ["eventType", "showQuestionCountPublic", "showMechanismPublic", "showParticipantCountPublic"]);
    buangField("users", ["deletedAt"]);
    buangField("olimp_users", ["deletedAt"]);
    buangField("event_registrations", ["deletedAt", "configTokenGeneratedAt", "configLastDownloadedAt"]);
  },
);
