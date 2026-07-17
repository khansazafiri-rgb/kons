/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    let settings = app.settings()

    settings.meta.appName = "PCV Classroom"
    // APP_URL diisi lewat environment (mis. https://pcvclassroom.id).
    // Dipakai PocketBase untuk link di email (reset password, dll).
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
