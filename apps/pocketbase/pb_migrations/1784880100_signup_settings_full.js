/// <reference path="../pb_data/types.d.ts" />

// Pengaturan halaman Sign Up yang LENGKAP.
//
// Sebelumnya admin hanya bisa mengubah judul + satu paragraf info. Sekarang
// seluruh teks halaman sign up (label tiap kolom, placeholder, teks tombol,
// langkah-langkah di panel kiri, pesan sukses, sampai pesan saat pendaftaran
// ditutup) bisa diedit dari dashboard admin.
//
// Semua teks disimpan dalam satu field JSON "texts" supaya menambah teks baru
// di kemudian hari tidak perlu migration lagi — daftar teks yang dipakai
// didefinisikan di apps/web/src/lib/signupContent.js. Field lama
// (headline & info) dipindahkan ke dalam "texts" lalu dihapus.
//
// CATATAN JSVM: record.get() pada field JSON mengembalikan RAW BYTES, bukan
// objek JS. Jadi isinya dibaca lewat readJson() di bawah, dan yang disimpan
// selalu objek JS baru (record.set menerima objek biasa dengan benar).

migrate(
  (app) => {
    const readJson = (rec, field) => {
      const raw = rec.get(field);
      if (!raw) return {};
      try {
        let s = "";
        if (typeof raw === "string") {
          s = raw;
        } else {
          for (let i = 0; i < raw.length; i++) s += String.fromCharCode(raw[i]);
        }
        if (!s.trim()) return {};
        const parsed = JSON.parse(s);
        return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
      } catch (_) {
        return {};
      }
    };

    const col = app.findCollectionByNameOrId("signup_settings");
    if (!col.fields.getByName("texts")) {
      col.fields.add(new JSONField({ name: "texts", maxSize: 200000 }));
      app.save(col);
    }

    // Pindahkan headline & info lama ke dalam texts supaya teks yang sudah
    // pernah diubah admin tidak hilang.
    const rows = app.findRecordsByFilter("signup_settings", "id != ''", "", 0, 0);
    rows.forEach((r) => {
      const texts = readJson(r, "texts");
      const headline = r.getString("headline");
      const info = r.getString("info");
      if (headline && !texts.sideHeadline) texts.sideHeadline = headline;
      if (info && !texts.formInfo) texts.formInfo = info;
      r.set("texts", texts);
      app.save(r);
    });

    const after = app.findCollectionByNameOrId("signup_settings");
    ["headline", "info"].forEach((name) => {
      const f = after.fields.getByName(name);
      if (f) after.fields.removeById(f.id);
    });
    app.save(after);
  },
  (app) => {
    const readJson = (rec, field) => {
      const raw = rec.get(field);
      if (!raw) return {};
      try {
        let s = "";
        if (typeof raw === "string") {
          s = raw;
        } else {
          for (let i = 0; i < raw.length; i++) s += String.fromCharCode(raw[i]);
        }
        if (!s.trim()) return {};
        const parsed = JSON.parse(s);
        return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
      } catch (_) {
        return {};
      }
    };

    const col = app.findCollectionByNameOrId("signup_settings");
    if (!col.fields.getByName("headline")) {
      col.fields.add(new TextField({ name: "headline", max: 300 }));
    }
    if (!col.fields.getByName("info")) {
      col.fields.add(new TextField({ name: "info", max: 3000 }));
    }
    app.save(col);

    const rows = app.findRecordsByFilter("signup_settings", "id != ''", "", 0, 0);
    rows.forEach((r) => {
      const texts = readJson(r, "texts");
      if (texts.sideHeadline) r.set("headline", texts.sideHeadline);
      if (texts.formInfo) r.set("info", texts.formInfo);
      app.save(r);
    });

    const after = app.findCollectionByNameOrId("signup_settings");
    const f = after.fields.getByName("texts");
    if (f) {
      after.fields.removeById(f.id);
      app.save(after);
    }
  },
);
