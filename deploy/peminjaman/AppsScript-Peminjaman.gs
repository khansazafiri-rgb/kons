/**
 * GOOGLE SHEET OPERASIONAL PEMINJAMAN — Apps Script
 * (PRD "Sistem Peminjaman Ruang dan Alat Medis" bagian 13.3)
 *
 * Tempel seluruh berkas ini ke Extensions → Apps Script pada workbook
 * peminjaman, isi KONFIGURASI di bawah, lalu jalankan `pasangSemua()` sekali.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * APA YANG DILAKUKAN BERKAS INI, DAN APA YANG TIDAK
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Sheet ini BUKAN basis data. Basis datanya ada di server; Sheet cuma
 * antarmuka operasional. Karena itu:
 *
 *   - Edit di tab `Blok Internal`, `Jadwal Penjaga`, dan `Reschedule` dikirim
 *     ke server sebagai PERMINTAAN. Server memeriksa bentrok, jam operasional,
 *     penjaga, dan stok dulu.
 *   - Hasilnya ditulis balik ke kolom `Status Sinkronisasi` dan `Keterangan`
 *     pada baris yang sama. Kalau ditolak, isinya `DITOLAK_KONFLIK` beserta
 *     alasan yang bisa dibaca — bukan kode error.
 *   - Tab `Peminjaman Aktif`, `Arsip Peminjaman`, dan `Bukti Pembayaran`
 *     ditulis SERVER. Jangan diedit tangan: isinya akan tertimpa pada sinkron
 *     berikutnya.
 *
 * `onEdit` biasa TIDAK dipakai. Trigger sederhana tidak boleh memanggil
 * UrlFetchApp, jadi yang dipasang adalah installable trigger lewat
 * `pasangSemua()`.
 */

// ═══════════════════════════════════════════════════════════════════════════
// KONFIGURASI — isi dua baris ini
// ═══════════════════════════════════════════════════════════════════════════

/** Alamat aplikasi, tanpa garis miring di ujung. Mis. https://pcvclassroom.com */
var APP_URL = 'https://GANTI-DENGAN-DOMAIN-ANDA';

/**
 * Token sinkronisasi dari dashboard admin peminjaman (/peminjaman/admin) → Pengaturan →
 * "Token sinkronisasi Sheet".
 *
 * Disimpan di Script Properties, BUKAN di dalam berkas ini: siapa pun yang
 * bisa membuka Sheet bisa membuka Apps Script-nya juga, dan token yang
 * tertulis di kode bisa dipakai siapa saja untuk mengubah jadwal.
 * Jalankan `simpanToken()` sekali untuk mengisinya.
 */
function simpanToken() {
  var t = SpreadsheetApp.getUi()
    .prompt('Token sinkronisasi', 'Tempel token dari Dashboard Admin:', SpreadsheetApp.getUi().ButtonSet.OK_CANCEL);
  if (t.getSelectedButton() !== SpreadsheetApp.getUi().Button.OK) return;
  PropertiesService.getScriptProperties().setProperty('RENTAL_TOKEN', t.getResponseText().trim());
  SpreadsheetApp.getUi().alert('Token tersimpan.');
}

function token_() {
  var t = PropertiesService.getScriptProperties().getProperty('RENTAL_TOKEN');
  if (!t) throw new Error('Token belum diisi. Jalankan simpanToken() dulu.');
  return t;
}

// ═══════════════════════════════════════════════════════════════════════════
// STRUKTUR TAB
// ═══════════════════════════════════════════════════════════════════════════
//
// Kolom yang ditulis SERVER diberi latar abu dan diproteksi — admin tidak
// boleh mengubahnya tangan (PRD bagian 13.3: "Jangan biarkan admin mengedit
// langsung kolom booking_id, calendar_event_id, sync_version, atau status
// yang dihitung sistem").

var TAB = {
  BLOK: 'Blok Internal',
  PENJAGA: 'Jadwal Penjaga',
  RESCHEDULE: 'Reschedule',
  AKTIF: 'Peminjaman Aktif',
  ARSIP: 'Arsip Peminjaman',
  BUKTI: 'Bukti Pembayaran',
  LOG: 'Log Sinkronisasi',
  RUANG: 'Ruang',
  ALAT: 'Alat',
  REFERENSI: 'Referensi',
};

var SKEMA = {};
SKEMA[TAB.BLOK] = {
  header: ['Ruang', 'Mulai (WIB)', 'Selesai (WIB)', 'Jenis', 'Alasan', 'Aktif', 'ID Baris', 'Status Sinkronisasi', 'Keterangan'],
  kolomInput: 6,   // kolom 1..6 boleh diisi admin; sisanya milik server
  jenis: 'BLOK',
};
SKEMA[TAB.PENJAGA] = {
  header: ['Nama Penjaga', 'Ruang (kosong = semua)', 'Mulai (WIB)', 'Selesai (WIB)', 'Catatan', 'Aktif', 'ID Baris', 'Status Sinkronisasi', 'Keterangan'],
  kolomInput: 6,
  jenis: 'PENJAGA',
};
SKEMA[TAB.RESCHEDULE] = {
  header: ['Kode Booking', 'Item', 'Mulai Baru (WIB)', 'Selesai Baru (WIB)', 'Alasan', 'Status Sinkronisasi', 'Keterangan'],
  kolomInput: 5,
  jenis: 'RESCHEDULE',
};
SKEMA[TAB.AKTIF] = {
  header: ['Kode Booking', 'Pelanggan', 'WhatsApp', 'Institusi', 'Item & Jadwal', 'Mulai', 'Selesai', 'Status', 'Total', 'Bukti URL', 'Alasan Batal', 'Sync Version', 'Terakhir Sinkron', 'Dashboard'],
  kolomInput: 0,   // seluruhnya milik server
};
SKEMA[TAB.ARSIP] = SKEMA[TAB.AKTIF];
SKEMA[TAB.BUKTI] = {
  header: ['ID Bukti', 'Kode Booking', 'Drive URL', 'Waktu Unggah', 'Sumber', 'Status Verifikasi'],
  kolomInput: 0,
};
SKEMA[TAB.LOG] = {
  header: ['Waktu', 'Sumber', 'Entity ID', 'Aksi', 'Hasil', 'Pesan'],
  kolomInput: 0,
};
SKEMA[TAB.RUANG] = {
  header: ['room_id', 'Nama', 'Alamat', 'Kapasitas', 'Jam Buka (menit)', 'Jam Tutup (menit)', 'Butuh Penjaga', 'Harga', 'Satuan', 'Aktif'],
  kolomInput: 0,
  tarik: 'ruang',
};
SKEMA[TAB.ALAT] = {
  header: ['item_id', 'SKU', 'Nama', 'Kategori', 'Stok', 'Harga', 'Satuan', 'Aktif'],
  kolomInput: 0,
  tarik: 'alat',
};
SKEMA[TAB.REFERENSI] = {
  header: ['Status Booking', 'Ruang', 'Alat', 'Jenis Blok', 'Hasil Validasi'],
  kolomInput: 0,
};

// ═══════════════════════════════════════════════════════════════════════════
// PEMASANGAN
// ═══════════════════════════════════════════════════════════════════════════

/** Jalankan SEKALI: membuat semua tab, header, proteksi, dan trigger. */
function pasangSemua() {
  buatTab_();
  pasangTrigger_();
  tarikReferensi();
  SpreadsheetApp.getUi().alert(
    'Selesai.\n\n' +
    'Langkah berikutnya:\n' +
    '1. Jalankan simpanToken() dan tempel token dari Dashboard Admin.\n' +
    '2. Isi APP_URL di baris paling atas skrip ini.\n' +
    '3. Coba isi satu baris di tab "Blok Internal" — kolom Status Sinkronisasi\n' +
    '   harus terisi sendiri dalam beberapa detik.',
  );
}

function buatTab_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(SKEMA).forEach(function (nama) {
    var sh = ss.getSheetByName(nama) || ss.insertSheet(nama);
    var skema = SKEMA[nama];

    sh.getRange(1, 1, 1, skema.header.length)
      .setValues([skema.header])
      .setFontWeight('bold')
      .setBackground('#8E0100')
      .setFontColor('#FDFBF7');
    sh.setFrozenRows(1);

    // Kolom milik server: latar abu + proteksi. Yang dikunci bukan sekadar
    // hiasan — tanpa ini, satu paste yang meleset satu kolom bisa menimpa
    // ID baris dan membuat server kehilangan jejak baris mana yang diubah.
    var mulaiKunci = skema.kolomInput + 1;
    if (mulaiKunci <= skema.header.length) {
      var lebar = skema.header.length - skema.kolomInput;
      sh.getRange(2, mulaiKunci, Math.max(sh.getMaxRows() - 1, 1), lebar).setBackground('#F8F4EC');
      var lindungi = sh.getRange(1, mulaiKunci, sh.getMaxRows(), lebar).protect();
      lindungi.setDescription('Ditulis server — jangan diedit tangan');
      lindungi.setWarningOnly(true);
    }
    sh.autoResizeColumns(1, skema.header.length);
  });
}

function pasangTrigger_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'saatDiedit') ScriptApp.deleteTrigger(t);
  });
  // Installable trigger: trigger sederhana onEdit tidak diizinkan memanggil
  // UrlFetchApp, jadi ia tidak akan pernah bisa menghubungi server.
  ScriptApp.newTrigger('saatDiedit').forSpreadsheet(ss).onEdit().create();
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Peminjaman')
    .addItem('Pasang / perbaiki struktur', 'pasangSemua')
    .addItem('Isi token sinkronisasi', 'simpanToken')
    .addItem('Tarik daftar Ruang & Alat', 'tarikReferensi')
    .addItem('Kirim ulang baris terpilih', 'kirimUlangBarisTerpilih')
    .addToUi();
}

// ═══════════════════════════════════════════════════════════════════════════
// PENGIRIMAN PERUBAHAN
// ═══════════════════════════════════════════════════════════════════════════

function saatDiedit(e) {
  if (!e || !e.range) return;
  var sh = e.range.getSheet();
  var skema = SKEMA[sh.getName()];
  if (!skema || !skema.jenis) return;                 // tab yang bukan input
  if (e.range.getRow() < 2) return;                   // header
  if (e.range.getColumn() > skema.kolomInput) return; // kolom milik server

  // Satu edit bisa mengenai beberapa baris sekaligus (paste blok).
  for (var r = e.range.getRow(); r < e.range.getRow() + e.range.getNumRows(); r++) {
    kirimBaris_(sh, r, skema);
  }
}

function kirimBaris_(sh, baris, skema) {
  var nilai = sh.getRange(baris, 1, 1, skema.header.length).getValues()[0];
  var kolomStatus = skema.header.indexOf('Status Sinkronisasi') + 1;
  var kolomPesan = skema.header.indexOf('Keterangan') + 1;
  var kolomId = skema.header.indexOf('ID Baris') + 1;

  var isi = null;
  if (skema.jenis === 'BLOK') {
    if (!nilai[0] || !nilai[1] || !nilai[2]) return;   // baris belum lengkap
    isi = {
      jenis: 'BLOK',
      ruang: String(nilai[0]),
      mulai: iso_(nilai[1]),
      selesai: iso_(nilai[2]),
      tipe: String(nilai[3] || 'INTERNAL'),
      alasan: String(nilai[4] || ''),
      aktif: nilai[5] === '' ? true : !!nilai[5],
      barisId: String(nilai[6] || ''),
    };
  } else if (skema.jenis === 'PENJAGA') {
    if (!nilai[0] || !nilai[2] || !nilai[3]) return;
    isi = {
      jenis: 'PENJAGA',
      penjaga: String(nilai[0]),
      ruang: String(nilai[1] || ''),
      mulai: iso_(nilai[2]),
      selesai: iso_(nilai[3]),
      catatan: String(nilai[4] || ''),
      aktif: nilai[5] === '' ? true : !!nilai[5],
      barisId: String(nilai[6] || ''),
    };
  } else if (skema.jenis === 'RESCHEDULE') {
    if (!nilai[0] || !nilai[2] || !nilai[3]) return;
    isi = {
      jenis: 'RESCHEDULE',
      kode: String(nilai[0]),
      item: String(nilai[1] || ''),
      mulaiBaru: iso_(nilai[2]),
      selesaiBaru: iso_(nilai[3]),
      alasan: String(nilai[4] || ''),
    };
  }
  if (!isi) return;

  if (kolomStatus) sh.getRange(baris, kolomStatus).setValue('MENGIRIM…').setBackground(null);
  var jawab = panggil_(isi);

  var hasil = jawab.hasil || 'GAGAL';
  var warna = hasil === 'OK' ? '#E8F5E9' : (hasil === 'DITOLAK_KONFLIK' ? '#FFEBEE' : '#FFF8E1');
  if (kolomStatus) sh.getRange(baris, kolomStatus).setValue(hasil).setBackground(warna);
  if (kolomPesan) sh.getRange(baris, kolomPesan).setValue(jawab.pesan || '');
  // ID Baris diberikan server pada penyimpanan pertama, lalu dipakai lagi
  // untuk memperbarui baris yang SAMA — tanpa ini, tiap edit membuat blok baru.
  if (kolomId && jawab.barisId) sh.getRange(baris, kolomId).setValue(jawab.barisId);
}

function panggil_(isi) {
  isi.token = token_();
  try {
    var res = UrlFetchApp.fetch(APP_URL.replace(/\/+$/, '') + '/api/rental/sheet/perubahan', {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(isi),
      muteHttpExceptions: true,
    });
    var teks = res.getContentText();
    try {
      return JSON.parse(teks);
    } catch (_) {
      return { hasil: 'GAGAL', pesan: 'Jawaban server tidak terbaca (HTTP ' + res.getResponseCode() + ').' };
    }
  } catch (err) {
    return { hasil: 'GAGAL', pesan: 'Tidak bisa menghubungi server: ' + err };
  }
}

/** Mengirim ulang baris yang sedang disorot — untuk baris yang sempat gagal. */
function kirimUlangBarisTerpilih() {
  var sh = SpreadsheetApp.getActiveSheet();
  var skema = SKEMA[sh.getName()];
  if (!skema || !skema.jenis) {
    SpreadsheetApp.getUi().alert('Tab ini tidak mengirim perubahan ke server.');
    return;
  }
  var r = SpreadsheetApp.getActiveRange();
  for (var i = r.getRow(); i < r.getRow() + r.getNumRows(); i++) {
    if (i >= 2) kirimBaris_(sh, i, skema);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TARIK DATA DARI SERVER
// ═══════════════════════════════════════════════════════════════════════════

/** Mengisi tab Ruang, Alat, dan Referensi dari server. */
function tarikReferensi() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  ['ruang', 'alat'].forEach(function (tab) {
    var data = tarik_(tab);
    if (!data || !data.baris) return;
    var nama = tab === 'ruang' ? TAB.RUANG : TAB.ALAT;
    var sh = ss.getSheetByName(nama);
    if (!sh) return;
    if (sh.getMaxRows() > 1) sh.getRange(2, 1, sh.getMaxRows() - 1, sh.getMaxColumns()).clearContent();
    if (data.baris.length) sh.getRange(2, 1, data.baris.length, data.baris[0].length).setValues(data.baris);
  });

  var ref = tarik_('referensi');
  var shRef = ss.getSheetByName(TAB.REFERENSI);
  if (ref && shRef) {
    if (shRef.getMaxRows() > 1) shRef.getRange(2, 1, shRef.getMaxRows() - 1, shRef.getMaxColumns()).clearContent();
    var kolom = [ref.status || [], ref.ruang || [], ref.alat || [], ref.tipeBlok || [], ref.hasilValidasi || []];
    var tinggi = Math.max.apply(null, kolom.map(function (k) { return k.length; }).concat([1]));
    var isi = [];
    for (var i = 0; i < tinggi; i++) {
      isi.push(kolom.map(function (k) { return k[i] || ''; }));
    }
    if (isi.length) shRef.getRange(2, 1, isi.length, 5).setValues(isi);
    pasangDropdown_(ss, ref);
  }
}

function tarik_(tab) {
  try {
    var url = APP_URL.replace(/\/+$/, '') + '/api/rental/sheet/tarik?tab=' + encodeURIComponent(tab) +
      '&token=' + encodeURIComponent(token_());
    var res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    if (res.getResponseCode() !== 200) return null;
    return JSON.parse(res.getContentText());
  } catch (err) {
    return null;
  }
}

/**
 * Dropdown di kolom input. Yang dicegah bukan cuma salah ketik: nama ruang
 * yang meleset satu huruf akan ditolak server dengan "ruang tidak ditemukan",
 * dan admin harus menebak sendiri huruf mana yang salah.
 */
function pasangDropdown_(ss, ref) {
  var pasang = function (namaTab, kolom, daftar, izinkanKosong) {
    var sh = ss.getSheetByName(namaTab);
    if (!sh || !daftar || !daftar.length) return;
    var aturan = SpreadsheetApp.newDataValidation()
      .requireValueInList(izinkanKosong ? [''].concat(daftar) : daftar, true)
      .setAllowInvalid(false)
      .build();
    sh.getRange(2, kolom, Math.max(sh.getMaxRows() - 1, 1), 1).setDataValidation(aturan);
  };

  pasang(TAB.BLOK, 1, ref.ruang, false);
  pasang(TAB.BLOK, 4, ref.tipeBlok, false);
  pasang(TAB.PENJAGA, 2, ref.ruang, true);   // kosong = semua ruang
}

// ═══════════════════════════════════════════════════════════════════════════
// BANTUAN
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Nilai sel waktu → ISO UTC.
 *
 * Sel tanggal Google Sheets dibaca sebagai objek Date pada zona waktu
 * SPREADSHEET-nya. Pastikan File → Settings → Time zone diset ke
 * (GMT+07:00) Jakarta, kalau tidak semua jam akan bergeser.
 *
 * Teks juga diterima ("2026-09-22 14:00"), dan ditafsirkan sebagai WIB.
 */
function iso_(v) {
  if (v instanceof Date) return v.toISOString();
  var s = String(v || '').trim();
  if (!s) return '';
  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/.test(s)) {
    return new Date(s.replace(' ', 'T') + (/[Z+]/.test(s.slice(10)) ? '' : '+07:00')).toISOString();
  }
  var d = new Date(s);
  return isNaN(d.getTime()) ? '' : d.toISOString();
}
