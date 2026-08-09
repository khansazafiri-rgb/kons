// Skrip Google Apps Script untuk spreadsheet Peta Konten.
//
// SUMBER TUNGGAL skrip itu ada di file ini — admin menyalinnya lewat tombol di
// Dashboard Admin → Peta Konten → Sambungkan ke Google Sheets. Kalau skripnya
// perlu diubah, ubah di sini, lalu admin menempel ulang di spreadsheet-nya.
//
// Kenapa perlu skrip, padahal datanya sudah masuk lewat =IMPORTDATA():
// tab hasil impor isinya seluruh BAB dari semua mata kuliah menumpuk jadi satu
// daftar panjang (ratusan baris), jadi bagus untuk rekap tapi payah untuk
// memeriksa satu mata kuliah. Skrip ini menambah satu tab "Cek Cepat": pilih
// kategori, pilih mata kuliah, dan seluruh BAB-nya langsung terpampang beserta
// tanda sudah/belum dan tombol untuk membukanya di web.
//
// Catatan penulisan: isi skrip di bawah disimpan sebagai template literal, jadi
// JANGAN memakai backtick atau ${...} di dalamnya.

export const GSHEET_SCRIPT = `/**
 * PETA KONTEN - PCV Classroom
 *
 * Menambah tab "Cek Cepat": pilih kategori + mata kuliah, lalu seluruh BAB-nya
 * langsung tampil beserta tanda sudah/belum dan tombol buka ke web.
 *
 * Cara pakai: Ekstensi > Apps Script > tempel seluruh isi ini > Simpan >
 * muat ulang spreadsheet > menu "Peta Konten" muncul di deretan menu atas.
 */

var TAB_CEK = 'Cek Cepat';
var BARIS_TABEL = 8; // baris judul tabel; isinya mulai baris berikutnya

// Susunan kolom tiap tab hasil impor (nomor kolom, 1 = A). Kolom "link" selalu
// yang terakhir - urutannya ditentukan oleh endpoint CSV di server.
var LEMBAR = {
  'Cicil Belajar': {
    mk: 1, bab: 2, hidden: 3, nilai: 4, status: 5, link: 6, lebar: 6,
    judul: ['No', 'BAB', 'Jumlah soal', 'Status', 'Buka'],
    tombol: 'Lihat pembahasan', satuan: 'soal', apa: 'soal'
  },
  'Perdalam Materi': {
    mk: 1, bab: 2, hidden: 3, ppt: 4, video: 5, status: 6, link: 7, lebar: 7,
    judul: ['No', 'BAB', 'PPT', 'Video', 'Buka'],
    tombol: 'Buka PPT', satuan: '', apa: 'PPT'
  },
  'Simulasi CBT': {
    mk: 1, univ: 2, bab: 3, hidden: 4, nilai: 5, status: 6, link: 7, lebar: 7,
    judul: ['No', 'Universitas', 'BAB', 'Jumlah soal', 'Status', 'Buka'],
    tombol: 'Lihat soal', satuan: 'soal', apa: 'soal'
  },
  'Bank Soal': {
    mk: 1, bab: 2, hidden: 3, nilai: 4, status: 5, link: 6, lebar: 6,
    judul: ['No', 'BAB', 'Jumlah soal', 'Status', 'Buka'],
    tombol: 'Buka', satuan: 'soal', apa: 'soal'
  }
};

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Peta Konten')
    .addItem('Pasang / perbarui tab Cek Cepat', 'pasangCekCepat')
    .addItem('Segarkan hasil', 'segarkanCek')
    .addItem('Rapikan semua tab', 'rapikanSemuaTab')
    .addToUi();
}

/** Ganti kategori atau mata kuliah -> daftarnya langsung dibangun ulang. */
function onEdit(e) {
  if (!e || !e.range) return;
  var sh = e.range.getSheet();
  if (sh.getName() !== TAB_CEK) return;
  var sel = e.range.getA1Notation();
  if (sel !== 'B3' && sel !== 'B4') return;
  // Ganti kategori: mata kuliah lama belum tentu ada di kategori baru, jadi
  // dikosongkan dan biar segarkanCek yang memilihkan penggantinya.
  if (sel === 'B3') sh.getRange('B4').clearContent();
  segarkanCek();
}

function pasangCekCepat() {
  var ss = SpreadsheetApp.getActive();
  var sh = ss.getSheetByName(TAB_CEK);
  if (!sh) sh = ss.insertSheet(TAB_CEK, 0);
  sh.clear();
  sh.clearConditionalFormatRules();

  sh.getRange('A1').setValue('PETA KONTEN - CEK CEPAT').setFontSize(14).setFontWeight('bold');
  sh.getRange('A2')
    .setValue('Pilih kategori lalu mata kuliahnya. Seluruh BAB langsung tampil di bawah.')
    .setFontColor('#666666');
  sh.getRange('A3').setValue('Kategori');
  sh.getRange('A4').setValue('Mata kuliah');
  sh.getRange('A3:A4').setFontWeight('bold');

  var halaman = [];
  for (var nama in LEMBAR) {
    if (ss.getSheetByName(nama)) halaman.push(nama);
  }
  if (!halaman.length) {
    sh.getRange('A6').setValue(
      'Tab impor belum ada. Buat dulu tab bernama persis: Cicil Belajar, Perdalam Materi, Simulasi CBT, Bank Soal.'
    ).setFontColor('#b3261e');
    return;
  }

  sh.getRange('B3').setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(halaman, true).setAllowInvalid(false).build()
  );
  if (halaman.indexOf(String(sh.getRange('B3').getValue())) === -1) {
    sh.getRange('B3').setValue(halaman[0]);
  }
  sh.getRange('B3:B4').setBackground('#fff8e1').setBorder(true, true, true, true, false, false);
  sh.setColumnWidth(1, 60);
  sh.setColumnWidth(2, 420);
  sh.setColumnWidth(3, 130);
  sh.setColumnWidth(4, 130);

  segarkanCek();

  // Isi tab ini disimpan SEKARANG, sebelum langkah kosmetik di bawah. Kalau
  // tidak, kegagalan saat merapikan tab lain bisa membatalkan seluruh tulisan
  // di atas dan yang tersisa cuma lembar kosong tanpa penjelasan apa pun.
  SpreadsheetApp.flush();

  try {
    rapikanSemuaTab();
  } catch (err) {
    SpreadsheetApp.getActive().toast('Tab Cek Cepat jadi, tapi perapian tab lain gagal: ' + err, 'Peta Konten', 8);
    return;
  }
  SpreadsheetApp.getActive().toast('Tab "' + TAB_CEK + '" siap dipakai.', 'Peta Konten', 5);
}

/** Bangun ulang daftar mata kuliah + tabel hasilnya. */
function segarkanCek() {
  var ss = SpreadsheetApp.getActive();
  var sh = ss.getSheetByName(TAB_CEK);
  if (!sh) return;

  var namaLembar = String(sh.getRange('B3').getValue());
  var k = LEMBAR[namaLembar];
  var sumber = ss.getSheetByName(namaLembar);
  if (!k || !sumber) {
    pesan(sh, 'Tab "' + namaLembar + '" tidak ditemukan. Nama tab harus persis seperti di daftar rumus.');
    return;
  }

  var baris = bacaBaris(sumber, k.lebar);
  if (!baris.length) {
    pesan(sh, 'Tab "' + namaLembar + '" masih kosong. Tunggu IMPORTDATA selesai, atau periksa rumusnya.');
    return;
  }

  var daftarMk = unik(baris.map(function (r) { return r[k.mk - 1]; }));
  sh.getRange('B4').setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(daftarMk, true).setAllowInvalid(false).build()
  );
  var mk = String(sh.getRange('B4').getValue() || '');
  if (daftarMk.indexOf(mk) === -1) {
    mk = daftarMk[0];
    sh.getRange('B4').setValue(mk);
  }
  sh.getRange('C4').setValue('dari ' + daftarMk.length + ' mata kuliah').setFontColor('#888888');

  var cocok = baris.filter(function (r) { return String(r[k.mk - 1]) === mk; });
  tulisTabel(sh, k, cocok);
}

/** Tulis ringkasan + seluruh BAB mata kuliah terpilih, lengkap dengan tombolnya. */
function tulisTabel(sh, k, cocok) {
  bersihkan(sh);

  var jumlahBaris = cocok.length;
  var sudah = 0;
  var totalNilai = 0;
  var punyaVideo = 0;
  for (var i = 0; i < cocok.length; i++) {
    if (String(cocok[i][k.status - 1]) === 'sudah') sudah++;
    if (k.nilai) totalNilai += Number(cocok[i][k.nilai - 1]) || 0;
    if (k.video && String(cocok[i][k.video - 1]) === 'ada') punyaVideo++;
  }

  var ringkas = jumlahBaris + ' BAB  |  ' + sudah + ' sudah ada ' + k.apa +
    '  |  ' + (jumlahBaris - sudah) + ' belum';
  if (k.satuan) ringkas += '  |  total ' + totalNilai + ' ' + k.satuan;
  if (k.video) ringkas += '  |  ' + punyaVideo + ' punya video';
  sh.getRange('A6').setValue(ringkas).setFontWeight('bold');

  var judul = k.judul;
  sh.getRange(BARIS_TABEL, 1, 1, judul.length).setValues([judul])
    .setFontWeight('bold').setBackground('#efebe9');
  sh.setFrozenRows(BARIS_TABEL);

  if (!jumlahBaris) {
    sh.getRange(BARIS_TABEL + 1, 1).setValue('Mata kuliah ini belum punya BAB.');
    return;
  }

  var isi = [];
  var tautan = [];
  for (var n = 0; n < cocok.length; n++) {
    var r = cocok[n];
    var namaBab = String(r[k.bab - 1]);
    if (String(r[k.hidden - 1]) === 'ya') namaBab += '  (disembunyikan dari siswa)';

    var satuBaris = [n + 1];
    if (k.univ) satuBaris.push(r[k.univ - 1]);
    satuBaris.push(namaBab);
    if (k.ppt) {
      satuBaris.push(String(r[k.ppt - 1]) === 'belum' ? 'belum' : 'sudah');
      satuBaris.push(String(r[k.video - 1]) === 'ada' ? 'ada' : 'belum');
    } else {
      satuBaris.push(Number(r[k.nilai - 1]) || 0);
      satuBaris.push(r[k.status - 1]);
    }
    isi.push(satuBaris);

    var url = String(r[k.link - 1] || '');
    // Tanda kutip ganda di dalam rumus HYPERLINK harus digandakan.
    tautan.push([url ? '=HYPERLINK("' + url.replace(/"/g, '""') + '","' + k.tombol + '")' : '']);
  }

  var kolomIsi = isi[0].length;
  sh.getRange(BARIS_TABEL + 1, 1, isi.length, kolomIsi).setValues(isi);
  sh.getRange(BARIS_TABEL + 1, kolomIsi + 1, tautan.length, 1).setFormulas(tautan);

  // Warnai kolom penanda supaya sudah/belum kelihatan tanpa dibaca satu-satu.
  var kolomTanda = k.ppt ? (k.univ ? 4 : 3) : kolomIsi;
  var rentang = sh.getRange(BARIS_TABEL + 1, kolomTanda, isi.length, 1);
  sh.setConditionalFormatRules([
    SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo('belum').setBackground('#fdecea').setFontColor('#b3261e')
      .setRanges([rentang]).build(),
    SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo('sudah').setBackground('#e8f5e9').setFontColor('#1b5e20')
      .setRanges([rentang]).build()
  ]);
}

/** Beri warna pada kolom status di semua tab impor supaya sekali lihat kelihatan. */
function rapikanSemuaTab() {
  var ss = SpreadsheetApp.getActive();
  for (var nama in LEMBAR) {
    var sh = ss.getSheetByName(nama);
    if (!sh) continue;
    var k = LEMBAR[nama];
    var lebar = Math.min(k.lebar, sh.getMaxColumns());

    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, lebar).setFontWeight('bold').setBackground('#efebe9');

    // Jangan minta baris melebihi yang benar-benar dimiliki tab-nya: tab baru
    // hanya punya 1000 baris, dan getRange di luar batas itu MELEMPAR error.
    var tinggi = Math.max(sh.getMaxRows() - 1, 1);
    var kolomStatus = sh.getRange(2, Math.min(k.status, lebar), tinggi, 1);
    sh.setConditionalFormatRules([
      SpreadsheetApp.newConditionalFormatRule()
        .whenTextEqualTo('belum').setBackground('#fdecea').setFontColor('#b3261e')
        .setRanges([kolomStatus]).build(),
      SpreadsheetApp.newConditionalFormatRule()
        .whenTextEqualTo('sudah').setBackground('#e8f5e9').setFontColor('#1b5e20')
        .setRanges([kolomStatus]).build()
    ]);

    for (var c = 1; c <= lebar; c++) sh.autoResizeColumn(c);
  }
  var ring = ss.getSheetByName('Ringkasan');
  if (ring) {
    ring.setFrozenRows(1);
    ring.getRange(1, 1, 1, Math.min(10, ring.getMaxColumns())).setFontWeight('bold').setBackground('#efebe9');
  }
}

// ---- perkakas kecil ----

/** Kosongkan area hasil (baris 6 ke bawah) tanpa menyentuh pilihan di atasnya. */
function bersihkan(sh) {
  var tinggi = Math.max(sh.getMaxRows() - 5, 1);
  var lebar = Math.min(12, sh.getMaxColumns());
  sh.setFrozenRows(0);
  sh.clearConditionalFormatRules();
  var area = sh.getRange(6, 1, tinggi, lebar);
  area.clearContent();
  area.setBackground(null).setFontWeight('normal').setFontColor(null);
}

function pesan(sh, teks) {
  bersihkan(sh);
  sh.getRange('A6').setValue(teks).setFontColor('#b3261e');
}

function bacaBaris(sheet, lebar) {
  var akhir = sheet.getLastRow();
  if (akhir < 2) return [];
  var kolom = Math.min(lebar, sheet.getMaxColumns());
  return sheet.getRange(2, 1, akhir - 1, kolom).getValues().filter(function (r) {
    return String(r[0] || '').length > 0;
  });
}

function unik(nilai) {
  var terlihat = {};
  var out = [];
  for (var i = 0; i < nilai.length; i++) {
    var v = String(nilai[i] || '');
    if (!v || terlihat[v]) continue;
    terlihat[v] = true;
    out.push(v);
  }
  return out;
}
`;
