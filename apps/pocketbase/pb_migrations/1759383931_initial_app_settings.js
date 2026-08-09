/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    let settings = app.settings()

    settings.meta.appName = "PCV Classroom"
    // Nilai awal saja. Migration ini cuma jalan SEKALI seumur hidup database,
    // jadi sejak pindah ke domain sendiri penyetelan appURL yang sebenarnya
    // dipegang pb_hooks/app-url.pb.js — hook itu jalan tiap PocketBase start
    // dan selalu mengoreksi nilainya ke domain asli (pcvclassroom.com).
    settings.meta.appURL = $os.getenv("APP_URL") || "http://localhost:8090"
    settings.meta.hideControls = false

    settings.logs.maxDays = 7
    settings.logs.minLevel = 8
    settings.logs.logIP = true

    settings.trustedProxy.headers = [
        "X-Real-IP",
        "X-Forwarded-For",
        "CF-Connecting-IP",
    ]

    app.save(settings)
})
