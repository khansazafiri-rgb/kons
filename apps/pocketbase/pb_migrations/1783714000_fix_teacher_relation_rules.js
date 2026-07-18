/// <reference path="../pb_data/types.d.ts" />

// FIX: teacher gagal upload PPT / edit soal ("Failed to create record" 400).
//
// Rule lama memakai:  subject ?= @request.auth.teachingSubjects
// Di PocketBase 0.38 perbandingan relation (single) langsung ke relation
// multi milik auth TIDAK terevaluasi benar, sehingga teacher selalu ditolak
// walaupun subject-nya termasuk mata kuliah ajarnya.
//
// Perbaikannya: bandingkan .id secara eksplisit:
//   subject.id ?= @request.auth.teachingSubjects.id
//
// Sudah diverifikasi: rule baru MENGIZINKAN upload/edit pada mata kuliah ajar,
// MENGIZINKAN update record sendiri, dan tetap MENOLAK mata kuliah lain.

const TEACHER_WRITE_FIXED =
  "@request.auth.role = 'admin' || (@request.auth.role = 'teacher' && subject.id ?= @request.auth.teachingSubjects.id)";

const TEACHER_WRITE_OLD =
  "@request.auth.role = 'admin' || (@request.auth.role = 'teacher' && subject ?= @request.auth.teachingSubjects)";

migrate(
  (app) => {
    const apply = (name, rules) => {
      let col;
      try {
        col = app.findCollectionByNameOrId(name);
      } catch (_) {
        return; // collection belum ada
      }
      Object.keys(rules).forEach((k) => {
        col[k] = rules[k];
      });
      app.save(col);
    };

    apply("ppt_files", {
      createRule: TEACHER_WRITE_FIXED,
      updateRule: TEACHER_WRITE_FIXED,
    });

    apply("questions", {
      createRule: TEACHER_WRITE_FIXED,
      updateRule: TEACHER_WRITE_FIXED,
      deleteRule: TEACHER_WRITE_FIXED,
    });
  },
  (app) => {
    // Down: kembalikan ke rule lama (yang bermasalah).
    const apply = (name, rules) => {
      let col;
      try {
        col = app.findCollectionByNameOrId(name);
      } catch (_) {
        return;
      }
      Object.keys(rules).forEach((k) => {
        col[k] = rules[k];
      });
      app.save(col);
    };

    apply("ppt_files", {
      createRule: TEACHER_WRITE_OLD,
      updateRule: TEACHER_WRITE_OLD,
    });

    apply("questions", {
      createRule: TEACHER_WRITE_OLD,
      updateRule: TEACHER_WRITE_OLD,
      deleteRule: TEACHER_WRITE_OLD,
    });
  },
);
