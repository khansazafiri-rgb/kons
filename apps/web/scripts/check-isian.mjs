// Uji cepat penilaian soal isian (lihat src/lib/isian.js).
// Jalankan: npm run check:isian --prefix apps/web
//
// Yang dijaga dua arah: jawaban yang benar tapi ditulis sedikit beda (salah
// ketik, imbuhan, urutan, kata tambahan) harus diterima, dan jawaban yang
// memang lain (obat lain, spesies lain, angka lain, disangkal) harus ditolak.
import { bersebelahan, cocokIsian, isianSiswa, jawabanDiterima, kunciHarusPersis, nilaiSub, pisahBentuk, subSudahDiisi } from '../src/lib/isian.js';
import { frasaBertabrakan, kanonisKata } from '../src/lib/istilahMedis.js';

const cocok = (siswa, kunci) => !!cocokIsian(siswa, kunci);

const pencegahan = {
  label: 'B',
  validAnswers: [
    'Menggunakan alas kaki ketika kontak dengan tanah / alas kaki / sepatu / sandal',
    'Cuci tangan dan kaki setelah kontak dengan tanah',
    'Hindari bermain di tanah yang terdapat banyak hewan',
  ],
};
const spesies = {
  label: 'C',
  answerCount: 3,
  validAnswers: ['Ancylostoma braziliense', 'Ancylostoma caninum', 'Uncinaria stenocephala'],
};

// "Bagaimana cara mendapatkan angka 2?" - beberapa cara berbeda, semuanya benar.
const angkaDua = {
  label: 'A',
  validAnswers: ['1 + 1', '1/2 + 1/2 + 1', '2 x 1 / 2 * 1 / dua kali satu'],
};

const kasusLama = [
  // --- banyak cara menjawab, termasuk pecahan dan desimal ---
  ['angka 2: cara pertama', nilaiSub(angkaDua, '1 + 1').benar, true],
  ['angka 2: tanpa spasi', nilaiSub(angkaDua, '1+1').benar, true],
  ['angka 2: cara kedua dengan pecahan', nilaiSub(angkaDua, '1/2 + 1/2 + 1').benar, true],
  ['angka 2: pecahan urutan lain', nilaiSub(angkaDua, '1 + 1/2 + 1/2').benar, true],
  ['angka 2: bentuk sinonim dipisah "/" di antara huruf', nilaiSub(angkaDua, 'dua kali satu').benar, true],
  ['angka 2: bentuk sinonim "2 * 1"', nilaiSub(angkaDua, '2 * 1').benar, true],
  ['angka 2: "1 + 5" ditolak (angka 1 tidak dihitung dua kali)', nilaiSub(angkaDua, '1 + 5').benar, false],
  ['angka 2: "3 - 1" ditolak', nilaiSub(angkaDua, '3 - 1').benar, false],
  ['angka 2: "1/2 + 1/2" ditolak (hasilnya 1)', nilaiSub(angkaDua, '1/2 + 1/2').benar, false],
  ['angka 2: jawaban kosong ditolak', nilaiSub(angkaDua, '').benar, false],
  ['pecahan di kunci tidak dipecah jadi sinonim', JSON.stringify(pisahBentuk('1/2 + 1/2 + 1')), '["1/2 + 1/2 + 1"]'],
  ['sinonim dengan spasi tetap dipecah', JSON.stringify(pisahBentuk('Striated duct / Duktus striata')), '["Striated duct","Duktus striata"]'],
  ['sinonim tanpa spasi (data lama) tetap dipecah', JSON.stringify(pisahBentuk('lidah/lingual')), '["lidah","lingual"]'],
  ['tampilan jawaban diterima untuk siswa tidak dirusak', JSON.stringify(jawabanDiterima(angkaDua).slice(0, 2)), '["1 + 1","1/2 + 1/2 + 1"]'],
  ['desimal koma = desimal titik', cocok('0,5 mg', '0.5 mg'), true],
  ['dosis 0,5 mg bukan 5 mg', cocok('0,5 mg', '5 mg'), false],
  ['dosis 5 mg bukan 0,5 mg', cocok('5 mg', '0,5 mg'), false],
  ['dosis 1,5 mg bukan 5 mg', cocok('1,5 mg', '5 mg'), false],
  ['pecahan 1/2 bukan 1 atau 2', cocok('1/2', '1'), false],

  // --- harus DITERIMA ---
  ['persis, beda huruf besar & tanda baca', cocok('ivermectin.', 'Ivermectin'), true],
  ['salah ketik 1 huruf', cocok('Ancylostoma brazilense', 'Ancylostoma braziliense'), true],
  ['salah ketik di nama obat', cocok('albendazol', 'Albendazole'), true],
  ['kata tambahan di jawaban', cocok('ivermectin 12 mg dosis tunggal', 'Ivermectin'), true],
  ['imbuhan beda (menggunakan/gunakan/penggunaan)', cocok('gunakan alas kaki saat kontak tanah', 'Menggunakan alas kaki ketika kontak dengan tanah'), true],
  ['urutan kata beda', cocok('kaki dan tangan dicuci', 'cuci tangan dan kaki'), true],
  ['sebagian kata kunci panjang (2/3)', cocok('cuci tangan', 'Cuci tangan dan kaki'), true],
  ['kata sambung diabaikan', cocok('hindari tanah banyak hewan', 'Hindari bermain di tanah yang terdapat banyak hewan'), true],
  ['aksen & strip', cocok('Clonorchis-sinensis', 'Clonorchis sinensis'), true],
  ['satu dari banyak kunci sudah benar', nilaiSub(pencegahan, 'pakai sandal').benar, true],
  ['kunci kalimat panjang: jawaban singkat lewat bentuk "alas kaki"', nilaiSub(pencegahan, 'memakai alas kaki').benar, true],
  ['keterangan kunci yang dicocokkan', nilaiSub(pencegahan, 'sepatu').cocok[0]?.kunci, 'sepatu'],
  ['perilaku lama: elemen array = bentuk lain', nilaiSub({ validAnswers: ['Striated duct', 'Duktus striata'] }, 'duktus striata').benar, true],

  // --- harus DITOLAK ---
  ['obat lain yang mirip (mebendazole ≠ albendazole)', cocok('Mebendazole', 'Albendazole'), false],
  ['spesies lain, genus sama', cocok('Ancylostoma caninum', 'Ancylostoma braziliense'), false],
  ['spesies lain yang mirip (canis ≠ cati)', cocok('Toxocara cati', 'Toxocara canis'), false],
  ['angka dosis harus persis', cocok('ivermectin 21 mg', 'Ivermectin 12 mg'), false],
  ['kata pendek tanpa toleransi (HIV ≠ HPV)', cocok('HPV', 'HIV'), false],
  ['penyangkal di jawaban', cocok('tanpa alas kaki', 'alas kaki'), false],
  ['penyangkal di kunci', cocok('telur fertil', 'telur non fertil'), false],
  ['kata kunci kurang (1 dari 5)', cocok('tanah', 'Menggunakan alas kaki ketika kontak dengan tanah'), false],
  ['jawaban kosong', nilaiSub(pencegahan, '').benar, false],
  ['sinonim yang tidak ditulis di kunci', cocok('pakai boots', 'alas kaki'), false],

  // --- banyak kotak (answerCount) ---
  ['banyak kotak: urutan bebas + typo', nilaiSub(spesies, ['uncinaria stenocephala', 'ancylostoma caninum', 'Ancylostoma brazilense']).benar, true],
  ['banyak kotak: jawaban dobel dihitung sekali', JSON.stringify(nilaiSub(spesies, ['ancylostoma caninum', 'Ancylostoma caninum', 'uncinaria stenocephala']).perKotak), '[true,false,true]'],
  ['banyak kotak: jawaban lama string cuma mengisi kotak 1', JSON.stringify(isianSiswa(spesies, 'x')), '["x","",""]'],
  ['banyak kotak: sebagian terisi = sudah dijawab', subSudahDiisi(spesies, ['a', '', '']), true],
  ['banyak kotak: semua kosong = belum dijawab', subSudahDiisi(spesies, ['', ' ', '']), false],
  ['answerCount dibatasi 20', isianSiswa({ answerCount: 999, validAnswers: [] }, []).length, 20],
  ['daftar jawaban untuk siswa', JSON.stringify(jawabanDiterima(spesies).slice(0, 2)), '["Ancylostoma braziliense","Ancylostoma caninum"]'],
];

// ---------------------------------------------------------------------------
// Salah ketik, ejaan Inggris/Latin vs Indonesia, padanan istilah
// ---------------------------------------------------------------------------
const terima = (siswa, kunci) => !!cocokIsian(siswa, kunci);
// tolak: ditolak di KEDUA arah (dua istilah yang memang berbeda).
const tolak = (siswa, kunci) => !cocokIsian(siswa, kunci) && !cocokIsian(kunci, siswa);
// ditolak: ditolak pada satu arah saja (jawaban siswa vs kunci tertentu).
const ditolak = (siswa, kunci) => !cocokIsian(siswa, kunci);

const ketik = [
  // huruf "h" hilang
  ['h hilang di tengah (Schistosoma)', terima('Scistosoma', 'Schistosoma'), true],
  ['h hilang di depan (histologi)', terima('istologi', 'histologi'), true],
  ['h hilang di kata pendek (hepar)', terima('epar', 'hepar'), true],
  ['h kelebihan', terima('Ahscaris', 'Ascaris') || terima('Ascharis', 'Ascaris'), true],
  // tombol bersebelahan di keyboard
  ['tombol sebelah: e/w', terima('Ivermwctin', 'Ivermectin'), true],
  ['tombol sebelah: n/m', terima('albemdazole', 'albendazole'), true],
  ['tombol sebelah di huruf pertama', terima('Mebendazole', 'Nebendazole'), true],
  ['bersebelahan(): s dekat e, z, x, w', ['e', 'z', 'x', 'w', 'a', 'd'].every((h) => bersebelahan('s', h)), true],
  ['bersebelahan(): a tidak dekat l', bersebelahan('a', 'l'), false],
  // dua huruf bertukar
  ['huruf bertukar (Plasmodium)', terima('Plasmoidum', 'Plasmodium'), true],
  ['huruf bertukar (Strongyloides)', terima('Strongylodies', 'Strongyloides'), true],
  // kata pendek harus persis
  ['kata 3 huruf persis: HIV bukan HPV', tolak('HIV', 'HPV'), true],
  ['kata 4 huruf persis: otak bukan otot', tolak('otak', 'otot'), true],
  ['dua selip ringan di kata 6 huruf ditolak', tolak('mulut', 'kulit'), true],
];

const bahasa = [
  ['thyroid = tiroid', terima('thyroid', 'tiroid'), true],
  ['anaemia = anemia', terima('anaemia', 'anemia'), true],
  ['oesophagus = esofagus', terima('oesophagus', 'esofagus'), true],
  ['physiology = fisiologi', terima('physiology', 'fisiologi'), true],
  ['cholesterol = kolesterol', terima('cholesterol', 'kolesterol'), true],
  ['hypertension = hipertensi', terima('hypertension', 'hipertensi'), true],
  ['hyperthyroidism = hipertiroidisme', terima('hyperthyroidism', 'hipertiroidisme'), true],
  ['erythrocyte = eritrosit', terima('erythrocyte', 'eritrosit'), true],
  ['lymphocyte = limfosit', terima('lymphocyte', 'limfosit'), true],
  ['calcium = kalsium', terima('calcium', 'kalsium'), true],
  ['glucose = glukosa', terima('glucose', 'glukosa'), true],
  ['inflammation = inflamasi', terima('inflammation', 'inflamasi'), true],
  ['infection = infeksi', terima('infection', 'infeksi'), true],
  ['circulation = sirkulasi', terima('circulation', 'sirkulasi'), true],
  ['mechanism = mekanisme', terima('mechanism', 'mekanisme'), true],
  ['phosphate = fosfat', terima('phosphate', 'fosfat'), true],
  ['haemoglobin = hemoglobin', terima('haemoglobin', 'hemoglobin'), true],
  ['Taenia = tenia', terima('Taenia', 'tenia'), true],
  ['toxin = toksin', terima('toxin', 'toksin'), true],
  ['Rhesus = resus', terima('Rhesus', 'resus'), true],
  ['urethra = uretra', terima('urethra', 'uretra'), true],
  ['clinical = klinis', terima('clinical', 'klinis'), true],
  ['ejaan Inggris + salah ketik sekaligus', terima('phisiology', 'fisiologi'), true],
  ['kata Indonesia dengan "rh" tidak dirusak (terhadap)', kanonisKata('terhadap'), 'terhadap'],
  ['kata Indonesia dengan "rh" tidak dirusak (berhasil)', kanonisKata('berhasil'), 'berhasil'],
  ['ejaan bukan kata ber-angka dibiarkan', kanonisKata('hba1c'), 'hba1c'],
  // kalimat: istilah di dalam jawaban yang lebih panjang
  ['dalam kalimat: "hypertension grade 2"', terima('hypertension grade 2', 'hipertensi grade 2'), true],
  ['angka tetap harus sama', tolak('hypertension grade 3', 'hipertensi grade 2'), true],
  ['penyangkal tetap harus sama', tolak('non infection', 'infeksi'), true],
];

const padanan = [
  ['hookworm = cacing tambang', terima('hookworm', 'cacing tambang'), true],
  ['cacing tambang = hookworm (arah sebaliknya)', terima('cacing tambang', 'hookworm'), true],
  ['tapeworm = cacing pita', terima('tapeworm', 'cacing pita'), true],
  ['whipworm = Trichuris trichiura', terima('whipworm', 'Trichuris trichiura'), true],
  ['pinworm = cacing kremi', terima('pinworm', 'cacing kremi'), true],
  ['liver = hati', terima('liver', 'hati'), true],
  ['liver = hepar', terima('liver', 'hepar'), true],
  ['kidney = ginjal', terima('kidney', 'ginjal'), true],
  ['red blood cell = eritrosit', terima('red blood cell', 'eritrosit'), true],
  ['sel darah merah = erythrocyte', terima('sel darah merah', 'erythrocyte'), true],
  ['platelet = trombosit', terima('platelet', 'trombosit'), true],
  ['padanan + salah ketik: "hokworm"', terima('hokworm', 'cacing tambang'), true],
  ['padanan di dalam kalimat: "blood pressure"', terima('blood pressure', 'tekanan darah'), true],
  ['padanan di dalam kalimat: "intermediate host"', terima('intermediate host', 'inang perantara'), true],
  ['dilaporkan sebagai "mirip", bukan "persis"', cocokIsian('hookworm', 'cacing tambang'), 'mirip'],
  ['cacing saja bukan cacing tambang', ditolak('cacing', 'cacing tambang'), true],
  ['hookworm bukan cacing gelang', tolak('hookworm', 'cacing gelang'), true],
  ['hati bukan ginjal', tolak('hati', 'ginjal'), true],
  ['liver bukan kidney', tolak('liver', 'kidney'), true],
  ['padanan tidak ditumpuk imbuhan: obat bukan tatalaksana', tolak('obatan', 'tatalaksana'), true],
  ['tidak ada frasa yang masuk dua grup padanan', JSON.stringify(frasaBertabrakan()), '[]'],
];

// Pasangan yang HARUS TETAP BEDA. Banyak yang dulu salah diterima sebagai
// "salah ketik" karena cuma beda satu-dua huruf padahal artinya berlawanan.
const bedaArti = [
  ['tiroid / tifoid', 'thyroid', 'tifoid'],
  ['hiper / hipo', 'hipotiroidisme', 'hipertiroidisme'],
  ['makro / mikro', 'mikrositik', 'makrositik'],
  ['sistolik / diastolik', 'diastolik', 'sistolik'],
  ['eksotoksin / endotoksin', 'endotoksin', 'eksotoksin'],
  ['osteoblas / osteoklas', 'osteoklas', 'osteoblas'],
  ['abduksi / adduksi', 'adduksi', 'abduksi'],
  ['intra / inter', 'interseluler', 'intraseluler'],
  ['ileum / ilium / ileus', 'ilium', 'ileum'],
  ['ileum / ileus', 'ileus', 'ileum'],
  ['mitosis / miosis', 'miosis', 'mitosis'],
  ['miosis / mikosis', 'mikosis', 'miosis'],
  ['ureter / uretra', 'uretra', 'ureter'],
  ['ureteritis / uretritis', 'uretritis', 'ureteritis'],
  ['hematologi / hepatologi', 'hepatologi', 'hematologi'],
  ['nefrologi / neurologi', 'neurologi', 'nefrologi'],
  ['nekrosis / nefrosis', 'nefrosis', 'nekrosis'],
  ['nefrotik / nefritik', 'nefritik', 'nefrotik'],
  ['kalium / kalsium', 'kalsium', 'kalium'],
  ['hiperkalemia / hiperkalsemia', 'hiperkalsemia', 'hiperkalemia'],
  ['trombosit / trombosis', 'trombosis', 'trombosit'],
  ['fibrosit / fibrosis', 'fibrosis', 'fibrosit'],
  ['nefritis / nefrosis', 'nefrosis', 'nefritis'],
  ['insulin / inulin', 'inulin', 'insulin'],
  ['tirosin / tiroksin', 'tiroksin', 'tirosin'],
  ['rubela / rubeola', 'rubeola', 'rubela'],
  ['regenerasi / degenerasi', 'degenerasi', 'regenerasi'],
  ['topikal / tropikal', 'topikal', 'tropikal'],
  ['darah / daerah', 'daerah', 'darah'],
  ['nafas / nifas', 'nifas', 'nafas'],
  ['krisis / kritis', 'kritis', 'krisis'],
  ['metronidazol / tinidazol (lewat pemotong imbuhan)', 'tinidazol', 'metronidazol'],
  ['aplasia / displasia (lewat pemotong imbuhan)', 'displasia', 'aplasia'],
  ['simulasi / sirkulasi', 'simulasi', 'sirkulasi'],
  ['kulit / mulut', 'mulut', 'kulit'],
  ['manus / mania', 'mania', 'manus'],
  ['sitologi / etiologi', 'cytology', 'etiology'],
];

// Uji massal: 300-an istilah yang artinya BEDA. Satu pun tidak boleh diterima
// untuk istilah lain. ("tenia" sengaja tidak ikut: itu ejaan lain dari Taenia.)
const ISTILAH_BEDA = `
ileum ilium ileus jejunum duodenum kolon sekum rektum anus
ureter uretra ureteritis uretritis sistitis nefritis neuritis hepatitis hematitis
hipertensi hipotensi hiperglikemia hipoglikemia hipernatremia hiponatremia hiperkalemia hipokalemia hiperkalsemia hipokalsemia
hipertiroidisme hipotiroidisme hipertrofi hipotrofi atrofi hiperplasia hipoplasia aplasia displasia metaplasia anaplasia neoplasia
makrositik mikrositik normositik makrofag mikrofag megaloblas eritroblas osteoblas osteoklas osteosit fibroblas fibrosit kondrosit kondroblas
intraseluler interseluler ekstraseluler intravena intramuskular subkutan intradermal
eksotoksin endotoksin enterotoksin neurotoksin sistolik diastolik sistole diastole
abduksi adduksi fleksi ekstensi rotasi eversi inversi pronasi supinasi
hematologi hepatologi nefrologi neurologi kardiologi pulmonologi gastroenterologi endokrinologi
mitosis meiosis miosis midriasis mikosis insulin inulin glukagon glikogen glukosa fruktosa laktosa galaktosa maltosa sukrosa
kreatinin kreatin urea bilirubin biliverdin eritrosit leukosit trombosit limfosit monosit neutrofil eosinofil basofil
aferen eferen sensorik motorik simpatis parasimpatis anterior posterior superior inferior medial lateral proksimal distal dorsal ventral
albendazol mebendazol ivermektin prazikuantel pirantel niklosamid metronidazol tinidazol klorokuin primakuin
ascaris ancylostoma necator strongyloides trichuris enterobius taenia echinococcus schistosoma fasciola
entamoeba giardia trichomonas plasmodium toxoplasma leishmania trypanosoma cryptosporidium balantidium
vivax falciparum malariae ovale knowlesi mansoni japonicum haematobium solium saginata
tiroid paratiroid timus pankreas adrenal hipofisis hipotalamus pineal aorta vena arteri arteriol venula kapiler atrium ventrikel
bronkus bronkiolus alveolus trakea laring faring natrium kalium kalsium magnesium fosfat klorida bikarbonat
amlodipin amiodaron captopril enalapril losartan valsartan atenolol propranolol furosemid spironolakton
penisilin ampisilin amoksisilin sefalosporin gentamisin streptomisin tetrasiklin doksisiklin eritromisin azitromisin
asidosis alkalosis anemia leukemia limfoma sarkoma karsinoma melanoma nekrosis apoptosis fibrosis sklerosis stenosis trombosis emboli
nefrosis tirosin tiroksin lisin lisis rubela rubeola varisela variola tinea gastrin gastrik sekretin sekresi
laktase laktat amilase amilosa tripsin pepsin pepsinogen tripsinogen albumin globulin globin hemoglobin mioglobin
kolektomi kolostomi kolesistektomi apendektomi gastrektomi nefrektomi hematuria hematemesis hemoptisis melena glikosuria proteinuria albuminuria oliguria anuria poliuria
bradikardia takikardia aritmia fibrilasi dispnea apnea takipnea ortopnea hiperpnea diare konstipasi disentri
tetanus tetani difteri pertusis morbili parotitis herpes neutropenia leukopenia trombositopenia pansitopenia leukositosis eritrositosis trombositosis
protein peptida polipeptida prolin valin leusin isoleusin serin treonin sistein metionin
aspirin asetosal parasetamol ibuprofen naproksen diklofenak heparin warfarin klopidogrel glibenklamid glimepirid metformin omeprazol lansoprazol ranitidin simetidin
regenerasi degenerasi topikal tropikal darah daerah nafas nifas krisis kritis simulasi sirkulasi kulit mulut manus mania
`.split(/\s+/).filter(Boolean).filter((v, i, a) => a.indexOf(v) === i);
let bocor = [];
for (const a of ISTILAH_BEDA) for (const b of ISTILAH_BEDA) {
  if (a !== b && cocokIsian(a, b)) bocor.push(`${a} ~ ${b}`);
}

const batasKunci = [
  ['kunci "=" harus persis: jawaban sama diterima', cocokIsian('Gastrin', '=gastrin'), 'persis'],
  ['kunci "=" menolak salah ketik', ditolak('gastrim', '=gastrin'), true],
  ['kunci "=" menolak ejaan lain', ditolak('thyroid', '=tiroid'), true],
  ['kunci "=" menolak padanan', ditolak('liver', '= hati'), true],
  ['kunci "=" masih mengabaikan huruf besar dan tanda baca', cocokIsian('GASTRIN.', '=gastrin'), 'persis'],
  ['kunciHarusPersis mengenali "="', kunciHarusPersis('  =abc') && !kunciHarusPersis('abc'), true],
  ['jawaban diterima tidak menampilkan "="', JSON.stringify(jawabanDiterima({ validAnswers: ['=Gastrin / gastrik'] })), '["Gastrin / gastrik"]'],
  ['"=" hanya berlaku untuk bentuknya sendiri', nilaiSub({ validAnswers: ['=gastrin / tiroid'] }, 'thyroid').benar, true],
  ['"=" pada bentuk lain tidak menular', nilaiSub({ validAnswers: ['=gastrin / tiroid'] }, 'gastrim').benar, false],
  ['kunci tanpa "=" tetap toleran terhadap salah ketik', terima('gastrim', 'gastrin'), true],
];

const kasus = [
  ...ketik, ...bahasa, ...padanan, ...batasKunci,
  ...bedaArti.map(([nama, a, b]) => [`BEDA ARTI: ${nama}`, tolak(a, b), true]),
  [`uji massal: ${ISTILAH_BEDA.length} istilah berbeda, tidak ada yang saling diterima`, bocor.join(' | '), ''],
  ...kasusLama,
];

let gagal = 0;
for (const [nama, dapat, harap] of kasus) {
  if (dapat === harap) {
    console.log('  ok   ', nama);
  } else {
    gagal++;
    console.log('  GAGAL', nama);
    console.log('        harap:', JSON.stringify(harap));
    console.log('        dapat:', JSON.stringify(dapat));
  }
}
console.log(`\n${kasus.length - gagal} lulus, ${gagal} gagal.`);
if (gagal) process.exit(1);
