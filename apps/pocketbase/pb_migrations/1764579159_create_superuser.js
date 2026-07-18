/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    const email = $os.getenv("PB_SUPERUSER_EMAIL")
    const password = $os.getenv("PB_SUPERUSER_PASSWORD")

    // Kalau env belum diisi, lewati saja — superuser bisa dibuat manual:
    //   ./pocketbase superuser upsert email@contoh.com password123
    if (!email || !password) {
        return
    }

    // Jangan duplikat kalau sudah ada.
    try {
        app.findAuthRecordByEmail("_superusers", email)
        return
    } catch (_) {
        // belum ada, lanjut buat
    }

    const superusers = app.findCollectionByNameOrId("_superusers")
    const record = new Record(superusers)

    record.set("email", email)
    record.set("password", password)

    app.save(record)
})
