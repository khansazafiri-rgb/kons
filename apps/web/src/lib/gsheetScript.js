// Skrip Google Apps Script untuk spreadsheet Peta Konten.
//
// SUMBER TUNGGAL skrip itu ada di file ini — admin menyalinnya lewat tombol di
// Dashboard Admin → Peta Konten → Sambungkan ke Google Sheets. Kalau skripnya
// perlu diubah, ubah di sini, lalu admin menempel ulang di spreadsheet-nya.
//
// Kenapa perlu skrip, padahal datanya sudah masuk lewat =IMPORTDATA():
// tab hasil impor isinya seluruh BAB dari semua mata kuliah menumpuk jadi satu
// daftar panjang (ratusan baris), jadi bagus untuk rekap tapi payah untuk
// memeriksa satu BAB tertentu. Skrip ini menambah satu tab "Cek Cepat" berisi
// tiga pilihan bertingkat (halaman → mata kuliah → BAB) yang menyaring isinya,
// tanpa mengubah tab-tab impor yang sudah ada.
//
// Hasil saringannya ditulis sebagai rumus FILTER, bukan nilai mati, supaya ikut
// ter-update sendiri tiap kali IMPORTDATA menyegarkan datanya.
//
// Catatan penulisan: isi skrip di bawah disimpan sebagai template literal, jadi
// JANGAN memakai backtick atau ${...} di dalamnya.

export const GSHEET_SCRIPT = `/**
 * PETA KONTEN - PCV Classroom
 *
 * Menambah tab "Cek Cepat" berisi pilihan bertingkat untuk memeriksa satu BAB,
 * dan merapikan tab-tab hasil IMPORTDATA supaya lebih mudah dibaca.
 *
 * Cara pakai: Ekstensi > Apps Script > tempel seluruh isi ini > Simpan >
 * muat ulang spreadsheet > menu "Peta Konten" akan muncul di atas.
 */

var TAB_CEK = 'Cek Cepat';
var SEMUA = '(Semua)';
// Rumus hitungan memakai rentang kolom penuh (mis. A2:A), BUKAN batas baris
// tetap: tab baru Google Sheets cuma punya 1000 baris, jadi menyebut baris
// ke-5000 membuat rumusnya menunjuk ke luar lembar dan hitungannya gagal.

// Susunan kolom tiap tab hasil impor (nomor kolom, 1 = A).
var LEMBAR = {
  'Cicil Belajar':   { mk: 1, bab: 2, nilai: 4, status: 5, lebar: 5, labelNilai: 'Total soal latihan' },
  'Perdalam Materi': { mk: 1, bab: 2, nilai: 0, status: 6, lebar: 6, labelNilai: 'BAB yang PPT-nya sudah ada' },
  'Simulasi CBT':    { mk: 1, bab: 3, nilai: 5, status: 6, lebar: 6, labelNilai: 'Total soal simulasi' },
  'Bank Soal':       { mk: 1, bab: 2, nilai: 4, status: 5, lebar: 5, labelNilai: 'Total soal bank' }
};

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Peta Konten')
    .addItem('Pasang / perbarui tab Cek Cepat', 'pasangCekCepat')
    .addItem('Rapikan semua tab', 'rapikanSemuaTab')
    .addToUi();
}

/** Dijalankan otomatis tiap kali sel diubah. Pilihan bertingkat: mengubah
 *  halaman mengosongkan pilihan di bawahnya, begitu juga mata kuliah. */
function onEdit(e) {
  if (!e || !e.range) return;
  var sh = e.range.getSheet();
  if (sh.getName() !== TAB_CEK) return;
  var sel = e.range.getA1Notation();
  if (sel !== 'B3' && sel !== 'B4' && sel !== 'B5') return;
  // Perubahan lewat skrip tidak memicu onEdit lagi, jadi aman.
  if (sel === 'B3') { sh.getRange('B4').setValue(SEMUA); sh.getRange('B5').setValue(SEMUA); }
  if (sel === 'B4') { sh.getRange('B5').setValue(SEMUA); }
  segarkanCek();
}

function pasangCekCepat() {
  var ss = SpreadsheetApp.getActive();
  var sh = ss.getSheetByName(TAB_CEK);
  if (!sh) {
    sh = ss.insertSheet(TAB_CEK, 0);
  }
  sh.clear();
  sh.clearConditionalFormatRules();

  sh.getRange('A1').setValue('PETA KONTEN - CEK CEPAT')
    .setFontSize(14).setFontWeight('bold');
  sh.getRange('A2').setValue('Pilih dari kotak di bawah. Hasilnya ikut ter-update sendiri tiap data disegarkan.')
    .setFontColor('#666666');

  sh.getRange('A3').setValue('Halaman');
  sh.getRange('A4').setValue('Mata kuliah');
  sh.getRange('A5').setValue('BAB');
  sh.getRange('A3:A5').setFontWeight('bold');

  var halaman = [];
  for (var nama in LEMBAR) {
    if (ss.getSheetByName(nama)) halaman.push(nama);
  }
  if (!halaman.length) {
    sh.getRange('B3').setValue('Tab impor belum ada');
    return;
  }

  sh.getRange('B3').setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(halaman, true).setAllowInvalid(false).build()
  );
  if (halaman.indexOf(sh.getRange('B3').getValue()) === -1) {
    sh.getRange('B3').setValue(halaman[0]);
  }
  sh.getRange('B4').setValue(SEMUA);
  sh.getRange('B5').setValue(SEMUA);
  sh.getRange('B3:B5').setBackground('#fff8e1').setBorder(true, true, true, true, false, false);

  sh.setColumnWidth(1, 190);
  sh.setColumnWidth(2, 380);
  segarkanCek();

  // Tulisan di atas disimpan ke spreadsheet SEKARANG, sebelum langkah kosmetik
  // di bawah dijalankan. Kalau tidak, kegagalan saat merapikan tab lain bisa
  // membatalkan seluruh isi tab ini dan yang tersisa cuma lembar kosong tanpa
  // penjelasan apa pun.
  SpreadsheetApp.flush();

  // Pewarnaan tab lain sifatnya mempercantik, jadi kegagalannya tidak boleh
  // menggagalkan hasil utama - cukup dilaporkan.
  try {
    rapikanSemuaTab();
  } catch (err) {
    SpreadsheetApp.getActive().toast('Tab "' + TAB_CEK + '" jadi, tapi perapian tab lain gagal: ' + err, 'Peta Konten', 8);
    return;
  }
  SpreadsheetApp.getActive().toast('Tab "' + TAB_CEK + '" siap dipakai.', 'Peta Konten', 5);
}

/** Membangun ulang daftar pilihan + rumus hasil sesuai isi B3/B4. */
function segarkanCek() {
  var ss = SpreadsheetApp.getActive();
  var sh = ss.getSheetByName(TAB_CEK);
  if (!sh) return;

  var namaLembar = String(sh.getRange('B3').getValue());
  var k = LEMBAR[namaLembar];
  var sumber = ss.getSheetByName(namaLembar);
  if (!k || !sumber) return;

  var baris = bacaBaris(sumber, k.lebar);

  // Daftar mata kuliah
  var mkTerpilih = String(sh.getRange('B4').getValue() || SEMUA);
  var daftarMk = [SEMUA].concat(unik(baris.map(function (r) { return r[k.mk - 1]; })));
  sh.getRange('B4').setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(daftarMk, true).setAllowInvalid(false).build()
  );
  if (daftarMk.indexOf(mkTerpilih) === -1) {
    mkTerpilih = SEMUA;
    sh.getRange('B4').setValue(SEMUA);
  }

  // Daftar BAB mengikuti mata kuliah yang sedang dipilih. Kalau mata kuliahnya
  // masih "(Semua)", daftar BAB-nya akan berisi ratusan judul dari semua mata
  // kuliah sekaligus - terlalu panjang untuk dipilih di dropdown, dan itu juga
  // yang bikin tab impor terasa berantakan. Jadi BAB baru bisa dipilih setelah
  // mata kuliahnya ditentukan.
  var babTerpilih = String(sh.getRange('B5').getValue() || SEMUA);
  var daftarBab = [SEMUA];
  if (mkTerpilih !== SEMUA) {
    var cocok = baris.filter(function (r) { return String(r[k.mk - 1]) === mkTerpilih; });
    daftarBab = daftarBab.concat(unik(cocok.map(function (r) { return r[k.bab - 1]; })));
  }
  sh.getRange('B5').setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(daftarBab, true).setAllowInvalid(false).build()
  );
  if (daftarBab.indexOf(babTerpilih) === -1) {
    sh.getRange('B5').setValue(SEMUA);
  }
  sh.getRange('C5')
    .setValue(mkTerpilih === SEMUA ? 'Pilih mata kuliah dulu untuk bisa memilih BAB' : daftarBab.length - 1 + ' BAB di mata kuliah ini')
    .setFontColor('#888888');
  sh.getRange('C4').setValue(daftarMk.length - 1 + ' mata kuliah').setFontColor('#888888');

  tulisHasil(sh, namaLembar, k);
}

/** Ringkasan angka + tabel hasil, semuanya berupa rumus supaya tidak basi. */
function tulisHasil(sh, namaLembar, k) {
  // Sama seperti di rapikanSemuaTab: rentangnya dipangkas ke ukuran tab yang
  // sebenarnya supaya getRange tidak melempar error.
  var tinggi = Math.min(200, Math.max(sh.getMaxRows() - 6, 1));
  var lebarBersih = Math.min(12, sh.getMaxColumns());
  sh.getRange(7, 1, tinggi, lebarBersih).clearContent();
  sh.getRange(7, 1, tinggi, lebarBersih).setBackground(null).setFontWeight('normal');

  var s = "'" + namaLembar + "'!";
  var kMk = huruf(k.mk);
  var kBab = huruf(k.bab);
  var kStatus = huruf(k.status);

  // Bagian yang dipakai berulang: baris mana saja yang lolos kedua pilihan.
  var lolos =
    '((($B$4="' + SEMUA + '")+(' + s + kMk + '2:' + kMk + '=$B$4))>0)*' +
    '((($B$5="' + SEMUA + '")+(' + s + kBab + '2:' + kBab + '=$B$5))>0)*' +
    '(' + s + kMk + '2:' + kMk + '<>"")';

  var label = ['BAB yang cocok', 'Sudah terisi', 'Belum terisi'];
  var rumus = [
    '=SUMPRODUCT(' + lolos + ')',
    '=SUMPRODUCT(' + lolos + '*(' + s + kStatus + '2:' + kStatus + '="sudah"))',
    '=SUMPRODUCT(' + lolos + '*(' + s + kStatus + '2:' + kStatus + '="belum"))'
  ];
  if (k.nilai > 0) {
    var kNilai = huruf(k.nilai);
    label.push(k.labelNilai);
    rumus.push('=SUMPRODUCT(' + lolos + '*' + s + kNilai + '2:' + kNilai + ')');
  } else {
    label.push(k.labelNilai);
    rumus.push('=SUMPRODUCT(' + lolos + '*(' + s + huruf(4) + '2:' + huruf(4) + '<>"belum")*(' + s + huruf(4) + '2:' + huruf(4) + '<>""))');
  }

  for (var i = 0; i < label.length; i++) {
    sh.getRange(7 + i, 1).setValue(label[i]).setFontWeight('bold');
    sh.getRange(7 + i, 2).setFormula(rumus[i]).setHorizontalAlignment('left');
  }
  sh.getRange(7, 2, label.length, 1).setBackground('#f5f5f5');

  // Tabel hasil: judul kolom disalin dari tab sumbernya, isinya disaring.
  var kAkhir = huruf(k.lebar);
  sh.getRange(12, 1).setFormula('=IFERROR(' + s + 'A1:' + kAkhir + '1,"")');
  sh.getRange(12, 1, 1, k.lebar).setFontWeight('bold').setBackground('#efebe9');
  sh.getRange(13, 1).setFormula(
    '=IFERROR(FILTER(' + s + 'A2:' + kAkhir + ', ' +
    '(($B$4="' + SEMUA + '")+(' + s + kMk + '2:' + kMk + '=$B$4))>0, ' +
    '(($B$5="' + SEMUA + '")+(' + s + kBab + '2:' + kBab + '=$B$5))>0, ' +
    s + kMk + '2:' + kMk + '<>""), "Tidak ada baris yang cocok.")'
  );
  sh.setFrozenRows(12);
}

/** Beri warna pada kolom status di semua tab impor supaya sekali lihat kelihatan. */
function rapikanSemuaTab() {
  var ss = SpreadsheetApp.getActive();
  for (var nama in LEMBAR) {
    var sh = ss.getSheetByName(nama);
    if (!sh) continue;
    var k = LEMBAR[nama];

    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, k.lebar).setFontWeight('bold').setBackground('#efebe9');

    // Jangan minta baris melebihi yang benar-benar dimiliki tab-nya: tab baru
    // hanya punya 1000 baris, dan getRange di luar batas itu MELEMPAR error -
    // inilah yang bikin pemasangan gagal di tengah jalan.
    var kolomStatus = sh.getRange(2, k.status, Math.max(sh.getMaxRows() - 1, 1), 1);
    var aturan = [
      SpreadsheetApp.newConditionalFormatRule()
        .whenTextEqualTo('belum').setBackground('#fdecea').setFontColor('#b3261e')
        .setRanges([kolomStatus]).build(),
      SpreadsheetApp.newConditionalFormatRule()
        .whenTextEqualTo('sudah').setBackground('#e8f5e9').setFontColor('#1b5e20')
        .setRanges([kolomStatus]).build()
    ];
    sh.setConditionalFormatRules(aturan);

    for (var c = 1; c <= k.lebar; c++) sh.autoResizeColumn(c);
  }
  var ring = ss.getSheetByName('Ringkasan');
  if (ring) {
    ring.setFrozenRows(1);
    ring.getRange(1, 1, 1, 10).setFontWeight('bold').setBackground('#efebe9');
  }
}

// ---- perkakas kecil ----

function bacaBaris(sheet, lebar) {
  var akhir = sheet.getLastRow();
  if (akhir < 2) return [];
  // Jangan minta kolom melebihi yang benar-benar ada - getRange akan menolak
  // kalau tab-nya lebih sempit (mis. datanya belum selesai masuk).
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

function huruf(nomor) {
  return String.fromCharCode(64 + nomor);
}
`;
