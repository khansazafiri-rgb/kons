/// <reference path="../pb_data/types.d.ts" />

// Migration inti untuk pindah ke VPS.
//
// Di Horizons, collection ppt_files & questions terlanjur dibuat dengan rules
// admin-only, sehingga teacher selalu gagal create/update ("Failed to create
// record" 400). Migration schema (1783713347) hanya memasang rules yang benar
// saat collection DIBUAT BARU — collection yang sudah ada tidak tersentuh.
//
// Migration ini menimpa rules pada collection yang SUDAH ADA, jadi aman
// dijalankan baik pada database baru maupun pada data.db lama yang di-restore
// dari Horizons.

const TEACHER_WRITE =
  "@request.auth.role = 'admin' || (@request.auth.role = 'teacher' && subject ?= @request.auth.teachingSubjects)";

migrate(
  (app) => {
    const apply = (name, rules) => {
      let col;
      try {
        col = app.findCollectionByNameOrId(name);
      } catch (_) {
        return; // collection belum ada (akan dibuat oleh migration schema)
      }
      Object.keys(rules).forEach((k) => {
        col[k] = rules[k];
      });
      app.save(col);
    };

    apply("ppt_files", {
      listRule: "@request.auth.id != '' || chapter.guestAccessible = true",
      viewRule: "@request.auth.id != '' || chapter.guestAccessible = true",
      createRule: TEACHER_WRITE,
      updateRule: TEACHER_WRITE,
      deleteRule: "@request.auth.role = 'admin'",
    });

    apply("questions", {
      listRule: "@request.auth.id != '' || chapter.guestAccessible = true",
      viewRule: "@request.auth.id != '' || chapter.guestAccessible = true",
      createRule: TEACHER_WRITE,
      updateRule: TEACHER_WRITE,
      deleteRule: TEACHER_WRITE,
    });

    apply("subjects", {
      listRule: "",
      viewRule: "",
      createRule: "@request.auth.role = 'admin'",
      updateRule: "@request.auth.role = 'admin'",
      deleteRule: "@request.auth.role = 'admin'",
    });

    apply("chapters", {
      listRule: "",
      viewRule: "",
      createRule: "@request.auth.role = 'admin'",
      updateRule: "@request.auth.role = 'admin'",
      deleteRule: "@request.auth.role = 'admin'",
    });

    apply("users", {
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      updateRule: "id = @request.auth.id || @request.auth.role = 'admin'",
      deleteRule: "id = @request.auth.id || @request.auth.role = 'admin'",
    });
  },
  (app) => {
    // Down: kembalikan ppt_files & questions ke admin-only (kondisi lama Horizons).
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
      createRule: "@request.auth.role = 'admin'",
      updateRule: "@request.auth.role = 'admin'",
    });
    apply("questions", {
      createRule: "@request.auth.role = 'admin'",
      updateRule: "@request.auth.role = 'admin'",
      deleteRule: "@request.auth.role = 'admin'",
    });
  },
);
