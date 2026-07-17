/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    // ---- extend users ----
    const users = app.findCollectionByNameOrId("users");
    if (!users.fields.getByName("role")) {
      users.fields.add(
        new SelectField({
          name: "role",
          required: true,
          maxSelect: 1,
          values: ["student", "teacher", "admin", "guest"],
        }),
      );
    }
    if (!users.fields.getByName("semester")) {
      users.fields.add(new NumberField({ name: "semester", onlyInt: true }));
    }
    if (!users.fields.getByName("asalKuliah")) {
      users.fields.add(new TextField({ name: "asalKuliah", max: 200 }));
    }
    if (!users.fields.getByName("activeUntil")) {
      users.fields.add(new DateField({ name: "activeUntil" }));
    }
    if (!users.fields.getByName("deviceIds")) {
      users.fields.add(new JSONField({ name: "deviceIds", maxSize: 10000 }));
    }
    if (!users.fields.getByName("disabled")) {
      users.fields.add(new BoolField({ name: "disabled" }));
    }
    users.listRule = "@request.auth.id != ''";
    users.viewRule = "@request.auth.id != ''";
    app.save(users);

    // ---- subjects ----
    let subjects;
    try {
      subjects = app.findCollectionByNameOrId("subjects");
    } catch (_) {
      subjects = new Collection({
        type: "base",
        name: "subjects",
        listRule: "",
        viewRule: "",
        createRule: "@request.auth.role = 'admin'",
        updateRule: "@request.auth.role = 'admin'",
        deleteRule: "@request.auth.role = 'admin'",
        fields: [
          { name: "name", type: "text", required: true, max: 200 },
          { name: "order", type: "number", onlyInt: true },
          { name: "created", type: "autodate", onCreate: true, onUpdate: false },
          { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
        ],
      });
      app.save(subjects);
    }

    // hook up teachingSubjects relation now that subjects exists
    const usersCol = app.findCollectionByNameOrId("users");
    if (!usersCol.fields.getByName("teachingSubjects")) {
      usersCol.fields.add(
        new RelationField({
          name: "teachingSubjects",
          collectionId: subjects.id,
          maxSelect: 99,
          required: false,
        }),
      );
      app.save(usersCol);
    }

    // ---- chapters ----
    let chapters;
    try {
      chapters = app.findCollectionByNameOrId("chapters");
    } catch (_) {
      chapters = new Collection({
        type: "base",
        name: "chapters",
        listRule: "",
        viewRule: "",
        createRule: "@request.auth.role = 'admin'",
        updateRule: "@request.auth.role = 'admin'",
        deleteRule: "@request.auth.role = 'admin'",
        fields: [
          { name: "title", type: "text", required: true, max: 300 },
          {
            name: "subject",
            type: "relation",
            required: true,
            maxSelect: 1,
            collectionId: subjects.id,
            cascadeDelete: true,
          },
          { name: "order", type: "number", onlyInt: true },
          { name: "guestAccessible", type: "bool" },
          { name: "created", type: "autodate", onCreate: true, onUpdate: false },
          { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
        ],
      });
      app.save(chapters);
    }

    // ---- ppt_files ----
    let pptFiles;
    try {
      pptFiles = app.findCollectionByNameOrId("ppt_files");
    } catch (_) {
      pptFiles = new Collection({
        type: "base",
        name: "ppt_files",
        listRule: "@request.auth.id != '' || chapter.guestAccessible = true",
        viewRule: "@request.auth.id != '' || chapter.guestAccessible = true",
        createRule:
          "@request.auth.role = 'admin' || (@request.auth.role = 'teacher' && subject ?= @request.auth.teachingSubjects)",
        updateRule:
          "@request.auth.role = 'admin' || (@request.auth.role = 'teacher' && subject ?= @request.auth.teachingSubjects)",
        deleteRule: "@request.auth.role = 'admin'",
        fields: [
          {
            name: "subject",
            type: "relation",
            required: true,
            maxSelect: 1,
            collectionId: subjects.id,
          },
          {
            name: "chapter",
            type: "relation",
            required: true,
            maxSelect: 1,
            collectionId: chapters.id,
            cascadeDelete: true,
          },
          {
            name: "file",
            type: "file",
            maxSelect: 1,
            maxSize: 20971520,
            mimeTypes: ["application/pdf"],
          },
          { name: "created", type: "autodate", onCreate: true, onUpdate: false },
          { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
        ],
      });
      app.save(pptFiles);
    }

    // ---- questions ----
    let questions;
    try {
      questions = app.findCollectionByNameOrId("questions");
    } catch (_) {
      questions = new Collection({
        type: "base",
        name: "questions",
        listRule: "@request.auth.id != '' || chapter.guestAccessible = true",
        viewRule: "@request.auth.id != '' || chapter.guestAccessible = true",
        createRule:
          "@request.auth.role = 'admin' || (@request.auth.role = 'teacher' && subject ?= @request.auth.teachingSubjects)",
        updateRule:
          "@request.auth.role = 'admin' || (@request.auth.role = 'teacher' && subject ?= @request.auth.teachingSubjects)",
        deleteRule:
          "@request.auth.role = 'admin' || (@request.auth.role = 'teacher' && subject ?= @request.auth.teachingSubjects)",
        fields: [
          {
            name: "subject",
            type: "relation",
            required: true,
            maxSelect: 1,
            collectionId: subjects.id,
          },
          {
            name: "chapter",
            type: "relation",
            required: true,
            maxSelect: 1,
            collectionId: chapters.id,
            cascadeDelete: true,
          },
          {
            name: "type",
            type: "select",
            required: true,
            maxSelect: 1,
            values: ["latihan", "cbt"],
          },
          { name: "year", type: "number", onlyInt: true },
          { name: "text", type: "editor" },
          { name: "options", type: "json", maxSize: 20000 },
          { name: "hint", type: "text", max: 2000 },
          { name: "order", type: "number", onlyInt: true },
          { name: "created", type: "autodate", onCreate: true, onUpdate: false },
          { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
        ],
      });
      app.save(questions);
    }

    // ---- materi_progress ----
    try {
      app.findCollectionByNameOrId("materi_progress");
    } catch (_) {
      const materiProgress = new Collection({
        type: "base",
        name: "materi_progress",
        listRule: "@request.auth.id != '' && @request.auth.id = owner",
        viewRule: "@request.auth.id != '' && @request.auth.id = owner",
        createRule: "@request.auth.id != '' && @request.auth.id = @request.body.owner",
        updateRule: "@request.auth.id != '' && @request.auth.id = owner",
        deleteRule: "@request.auth.id != '' && @request.auth.id = owner",
        fields: [
          {
            name: "owner",
            type: "relation",
            required: true,
            maxSelect: 1,
            collectionId: users.id,
            cascadeDelete: true,
          },
          {
            name: "chapter",
            type: "relation",
            required: true,
            maxSelect: 1,
            collectionId: chapters.id,
            cascadeDelete: true,
          },
          { name: "completed", type: "bool" },
          { name: "created", type: "autodate", onCreate: true, onUpdate: false },
          { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
        ],
      });
      app.save(materiProgress);
    }

    // ---- soal_progress (cicil belajar) ----
    try {
      app.findCollectionByNameOrId("soal_progress");
    } catch (_) {
      const soalProgress = new Collection({
        type: "base",
        name: "soal_progress",
        listRule: "@request.auth.id != '' && @request.auth.id = owner",
        viewRule: "@request.auth.id != '' && @request.auth.id = owner",
        createRule: "@request.auth.id != '' && @request.auth.id = @request.body.owner",
        updateRule: "@request.auth.id != '' && @request.auth.id = owner",
        deleteRule: "@request.auth.id != '' && @request.auth.id = owner",
        fields: [
          {
            name: "owner",
            type: "relation",
            required: true,
            maxSelect: 1,
            collectionId: users.id,
            cascadeDelete: true,
          },
          {
            name: "chapter",
            type: "relation",
            required: true,
            maxSelect: 1,
            collectionId: chapters.id,
            cascadeDelete: true,
          },
          {
            name: "status",
            type: "select",
            maxSelect: 1,
            values: ["in_progress", "completed"],
          },
          { name: "answers", type: "json", maxSize: 20000 },
          { name: "score", type: "number" },
          { name: "created", type: "autodate", onCreate: true, onUpdate: false },
          { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
        ],
      });
      app.save(soalProgress);
    }

    // ---- cbt_attempts ----
    try {
      app.findCollectionByNameOrId("cbt_attempts");
    } catch (_) {
      const cbtAttempts = new Collection({
        type: "base",
        name: "cbt_attempts",
        listRule: "@request.auth.id != '' && @request.auth.id = owner",
        viewRule: "@request.auth.id != '' && @request.auth.id = owner",
        createRule: "@request.auth.id != '' && @request.auth.id = @request.body.owner",
        updateRule: "@request.auth.id != '' && @request.auth.id = owner",
        deleteRule: "@request.auth.id != '' && @request.auth.id = owner",
        fields: [
          {
            name: "owner",
            type: "relation",
            required: true,
            maxSelect: 1,
            collectionId: users.id,
            cascadeDelete: true,
          },
          {
            name: "subject",
            type: "relation",
            required: true,
            maxSelect: 1,
            collectionId: subjects.id,
          },
          { name: "year", type: "number", onlyInt: true },
          {
            name: "mode",
            type: "select",
            maxSelect: 1,
            values: ["simulasi", "learning"],
          },
          { name: "answers", type: "json", maxSize: 20000 },
          {
            name: "status",
            type: "select",
            maxSelect: 1,
            values: ["in_progress", "completed"],
          },
          { name: "startedAt", type: "date" },
          { name: "score", type: "number" },
          { name: "created", type: "autodate", onCreate: true, onUpdate: false },
          { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
        ],
      });
      app.save(cbtAttempts);
    }

    // ---- seed subjects + chapters ----
    const subjectNames = [
      "Anatomi",
      "Biologi Kedokteran",
      "Trampilan Medik 1",
      "Histologi",
      "Fisiologi",
      "Biokimia",
      "Mikrobiologi",
      "Parasitologi",
      "Farmakologi",
      "Patologi Anatomi",
      "Patologi Klinik",
    ];
    const subjectRecords = {};
    subjectNames.forEach((name, idx) => {
      let rec;
      try {
        rec = app.findFirstRecordByFilter("subjects", `name = '${name}'`);
      } catch (_) {
        rec = new Record(subjects);
        rec.set("name", name);
        rec.set("order", idx + 1);
        app.save(rec);
      }
      subjectRecords[name] = rec;
      for (let b = 1; b <= 5; b++) {
        const title = `BAB ${b} - ${name}`;
        try {
          app.findFirstRecordByFilter(
            "chapters",
            `title = '${title}' && subject = '${rec.id}'`,
          );
        } catch (_) {
          const ch = new Record(chapters);
          ch.set("title", title);
          ch.set("subject", rec.id);
          ch.set("order", b);
          ch.set("guestAccessible", b === 1);
          app.save(ch);
        }
      }
    });

    // ---- seed demo accounts ----
    const seedUser = (email, password, name, role, extra) => {
      try {
        app.findAuthRecordByEmail("users", email);
      } catch (_) {
        const r = new Record(usersCol);
        r.setEmail(email);
        r.setPassword(password);
        r.set("name", name);
        r.set("role", role);
        r.set("verified", true);
        r.set("deviceIds", []);
        if (extra) {
          Object.keys(extra).forEach((k) => r.set(k, extra[k]));
        }
        app.save(r);
      }
    };

    seedUser("admin@pcvclassroom.id", "pcvadmin123", "Admin PCV", "admin");
    seedUser(
      "teacher@pcvclassroom.id",
      "pcvteacher123",
      "dr. Budi Santoso",
      "teacher",
      { teachingSubjects: [subjectRecords["Anatomi"].id, subjectRecords["Histologi"].id] },
    );
    seedUser("student@pcvclassroom.id", "pcvstudent123", "Rangga Pratama", "student", {
      semester: 2,
      asalKuliah: "Universitas Airlangga",
      activeUntil: "2026-12-31 00:00:00",
    });
    seedUser("guest@pcvclassroom.id", "pcvguest123", "Guest User", "guest");
  },
  (app) => {
    for (const name of [
      "cbt_attempts",
      "soal_progress",
      "materi_progress",
      "questions",
      "ppt_files",
      "chapters",
      "subjects",
    ]) {
      try {
        const c = app.findCollectionByNameOrId(name);
        app.delete(c);
      } catch (_) {
        continue;
      }
    }
  },
);
