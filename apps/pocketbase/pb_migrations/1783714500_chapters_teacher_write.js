/// <reference path="../pb_data/types.d.ts" />

// Sebelumnya collection "chapters" hanya bisa diubah admin (createRule/
// updateRule/deleteRule = admin). Akibatnya pengajar tidak bisa menambah,
// mengubah nama, menyembunyikan, mengurutkan, atau menghapus BAB pada mata
// kuliah ajarnya sendiri — padahal ia sudah boleh mengelola soal & PPT di BAB
// itu (lihat 1783713600_force_teacher_api_rules.js).
//
// Migrasi ini menyelaraskan aturan chapters dengan questions/ppt_files: admin
// bebas, pengajar boleh mengelola BAB pada mata kuliah yang diajarnya saja.
//
// Catatan: pada collection ini perbandingan relasi harus memakai ".id"
// (@request.auth.teachingSubjects.id ?= subject). Bentuk tanpa ".id" ternyata
// tidak cocok di sini sehingga pengajar selalu tertolak — sudah diuji langsung.

const TEACHER_WRITE =
  "@request.auth.role = 'admin' || (@request.auth.role = 'teacher' && @request.auth.teachingSubjects.id ?= subject)";

migrate(
  (app) => {
    const col = app.findCollectionByNameOrId("chapters");
    col.createRule = TEACHER_WRITE;
    col.updateRule = TEACHER_WRITE;
    col.deleteRule = TEACHER_WRITE;
    app.save(col);
  },
  (app) => {
    const col = app.findCollectionByNameOrId("chapters");
    col.createRule = "@request.auth.role = 'admin'";
    col.updateRule = "@request.auth.role = 'admin'";
    col.deleteRule = "@request.auth.role = 'admin'";
    app.save(col);
  },
);
