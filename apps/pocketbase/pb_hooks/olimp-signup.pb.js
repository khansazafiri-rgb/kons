/// <reference path="../pb_data/types.d.ts" />

// PENDAFTARAN PESERTA WEB OLIMP
//
// Aturan `createRule` pada collection olimp_users memaksa SETIAP pendaftar
// masuk sebagai "pending". Itu disengaja: kalau statusnya boleh ditentukan
// data yang dikirim browser, siapa pun bisa mendaftar lalu langsung
// mengaktifkan dirinya sendiri.
//
// Yang boleh mengubahnya jadi "active" cuma server, dan cuma dalam satu
// keadaan: paket langganan yang dipilih memang bertanda `autoApprove` (itulah
// Paket Percobaan). Paket berbayar tetap menunggu admin memeriksa
// pembayarannya di Dashboard Olimp.
//
// Masa berlaku dihitung dari `durationDays` milik paketnya. Paket tanpa
// durasi berarti tanpa batas waktu.
//
// CATATAN: handler PocketBase jalan terisolasi - tidak bisa membaca variabel
// atau fungsi dari luar bloknya, jadi semuanya ditulis di dalam.

onRecordCreateRequest((e) => {
  // Semua pendaftar dipaksa mulai dari keadaan yang sama, apa pun yang
  // dikirim browser.
  e.record.set("status", "pending");
  e.record.set("disabled", false);
  e.record.set("approvedBy", "");
  e.record.set("approvedAt", null);
  e.record.set("activeUntil", null);
  // Daftar paket soal per akun hanya boleh diisi admin - saat mendaftar,
  // hak bukanya diturunkan dari paket langganan yang dipilih.
  e.record.set("packageIds", []);

  const planId = e.record.getString("plan");
  let plan = null;
  if (planId) {
    try { plan = e.app.findRecordById("olimp_plans", planId); } catch (_) { plan = null; }
  }

  // Paket yang tidak aktif tidak boleh dipakai mendaftar.
  if (plan && !plan.getBool("active")) {
    throw new BadRequestError("Paket yang dipilih sedang tidak dibuka. Pilih paket lain.");
  }

  if (plan && plan.getBool("autoApprove")) {
    e.record.set("status", "active");
    e.record.set("approvedBy", "otomatis (paket " + plan.getString("name") + ")");
    e.record.set("approvedAt", new Date().toISOString());
    const hari = plan.getInt("durationDays");
    if (hari > 0) {
      e.record.set("activeUntil", new Date(Date.now() + hari * 86400000).toISOString());
    }
  }

  e.next();

  // Beri tahu admin ada pendaftar baru.
  //
  // Pengiriman email berjalan DI DALAM permintaan pendaftaran, jadi kalau
  // server SMTP tidak bisa dihubungi, tombol "Daftar" ikut menggantung sampai
  // koneksinya menyerah. Karena itu diperiksa dulu apakah SMTP memang
  // dinyalakan: di server pengembangan yang belum diatur, pendaftaran tetap
  // selesai seketika dan cuma emailnya yang dilewati.
  try {
    const settings = e.app.settings();
    if (!settings.smtp || !settings.smtp.enabled) return;
    const appUrl = (settings.meta.appURL || "https://pcvclassroom.com").replace(/\/+$/, "");
    const status = e.record.getString("status");
    const namaPaket = plan ? plan.getString("name") : "(tanpa paket)";
    const minat = e.record.get("minatLomba");
    const daftarMinat = Array.isArray(minat) && minat.length ? minat.join(", ") : "-";

    const judul =
      status === "active"
        ? "[Web Olimp] Peserta baru langsung aktif: " + e.record.getString("name")
        : "[Web Olimp] Pendaftar baru menunggu ACC: " + e.record.getString("name");

    const badan =
      '<div style="font-family:sans-serif;line-height:1.6">' +
      "<h2>Pendaftar Web Olimp</h2>" +
      "<p><b>Nama:</b> " + e.record.getString("name") + "<br>" +
      "<b>Email:</b> " + e.record.getString("email") + "<br>" +
      "<b>WhatsApp:</b> " + (e.record.getString("whatsapp") || "-") + "<br>" +
      "<b>Asal kampus:</b> " + (e.record.getString("asalKampus") || "-") + "<br>" +
      "<b>Semester:</b> " + (e.record.getInt("semester") || "-") + "<br>" +
      "<b>Angkatan:</b> " + (e.record.getString("angkatan") || "-") + "<br>" +
      "<b>Paket:</b> " + namaPaket + "<br>" +
      "<b>Minat lomba:</b> " + daftarMinat + "</p>" +
      (status === "active"
        ? "<p>Paketnya bertanda aktif-otomatis, jadi akunnya <b>sudah bisa dipakai</b> tanpa ACC.</p>"
        : '<p>Akun ini <b>menunggu ACC</b>. Buka <a href="' + appUrl +
          '/olimp/admin?tab=Peserta">Dashboard Olimp &rarr; Peserta</a> untuk mengaktifkannya.</p>') +
      "</div>";

    const message = new MailerMessage({
      from: { address: settings.meta.senderAddress, name: settings.meta.senderName },
      to: [{ address: "khansazafiri@gmail.com" }],
      subject: judul,
      html: badan,
    });
    e.app.newMailClient().send(message);
  } catch (_) {
    /* email bukan bagian penting dari pendaftaran */
  }
}, "olimp_users");

// Masa berlaku yang sudah lewat ditandai "expired" saat peserta login, bukan
// lewat pekerjaan terjadwal - dengan begitu tidak ada proses latar yang perlu
// dijaga, dan hasilnya sama saja: yang kedaluwarsa tetap tidak bisa masuk.
onRecordAuthRequest((e) => {
  try {
    const sampai = e.record.getString("activeUntil");
    if (
      sampai &&
      e.record.getString("status") === "active" &&
      new Date(sampai).getTime() < Date.now()
    ) {
      e.record.set("status", "expired");
      e.app.save(e.record);
    }
  } catch (_) {
    /* penandaan kedaluwarsa tidak boleh menggagalkan login */
  }
  e.next();
}, "olimp_users");
