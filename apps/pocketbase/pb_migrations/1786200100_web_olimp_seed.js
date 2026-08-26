/// <reference path="../pb_data/types.d.ts" />

// ISI AWAL WEB OLIMP - satu cabang, satu paket contoh, dan kalender 8 lomba.
//
// Gunanya supaya begitu web dibuka pertama kali, halaman Olimp TIDAK kosong:
// blueprint, kuis, "Cek Jawaban", pembahasan 8 bagian, dan kalender langsung
// bisa dicoba tanpa admin harus mengetik apa pun dulu. Contohnya diambil dari
// PRD bagian 5.4-5.5 (International Infectious Disease Olympiad).
//
// Seed hanya jalan SEKALI: kalau collection olimp_subjects sudah berisi apa
// pun, migrasi ini tidak melakukan apa-apa. Jadi aman dijalankan di server yang
// datanya sudah diisi admin.

const SOAL = [
  {
    code: "ID-01",
    primaryDomain: "Bacteriology",
    secondaryTopic: "Gram-negative diplococci",
    organismSyndrome: "Neisseria meningitidis",
    questionText:
      "<p>A 19-year-old university student is brought to the emergency department with a 12-hour history of fever, severe headache, and neck stiffness. On examination he is somnolent, temperature 39.4&deg;C, and there is a non-blanching petechial rash over the trunk and lower limbs. Lumbar puncture yields cloudy CSF with 4,200 leukocytes/&micro;L (88% neutrophils), glucose 22 mg/dL (serum 96 mg/dL), and protein 180 mg/dL. Gram stain shows gram-negative diplococci.</p><p>Which structural component of the organism is <em>most directly</em> responsible for the petechial rash?</p>",
    optionA: "Polysaccharide capsule",
    optionB: "Lipooligosaccharide (endotoxin)",
    optionC: "IgA1 protease",
    optionD: "Pili (type IV fimbriae)",
    optionE: "Outer membrane porin PorA",
    correctAnswer: "B",
    cognitiveLevel: "multi_step_basic_to_clinical",
    difficulty: 5,
    estimatedTimeSeconds: 90,
    learningObjective:
      "Menghubungkan komponen dinding sel Neisseria meningitidis dengan manifestasi klinis yang ditimbulkannya, khususnya peran endotoksin pada koagulopati dan purpura.",
    questionArchitecture: "Kasus klinis -> patofisiologi -> pemilihan komponen penyebab",
    hint: "Ruam petekie = kebocoran pembuluh darah kecil akibat aktivasi koagulasi, bukan akibat penghindaran fagositosis.",
    optionReasons: {
      A: "Melindungi bakteri dari fagositosis - menentukan apakah bakteri bertahan, bukan bentuk ruamnya.",
      B: "Memicu pelepasan sitokin masif dan aktivasi kaskade koagulasi di endotel.",
      C: "Memecah IgA sekretorik di mukosa - berperan pada kolonisasi nasofaring.",
      D: "Mediator perlekatan awal ke epitel nasofaring.",
      E: "Porin, target vaksin berbasis outer membrane vesicle.",
    },
    explanation: {
      correctStatement:
        "Correct answer: B. Lipooligosaccharide (LOS) meningokokus adalah endotoksin yang paling langsung menyebabkan ruam petekie.",
      testedConcept:
        "Peran endotoksin (LOS) N. meningitidis dalam memicu DIC dan purpura fulminans pada meningococcemia.",
      reasoning:
        "LOS yang terlepas dari membran luar meningokokus (dalam bentuk blebs) mengikat TLR4/MD-2 pada monosit dan sel endotel. Hasilnya pelepasan TNF-\u03b1 dan IL-1 secara masif, ekspresi tissue factor di endotel, penurunan protein C teraktivasi, dan trombosis mikrovaskular. Kebocoran serta trombosis pembuluh kecil inilah yang tampak sebagai petekie sampai purpura fulminans. Kadar LOS dalam darah berkorelasi dengan derajat syok dan mortalitas.",
      distractors: {
        A: "Kapsul polisakarida menentukan serogrup (A, B, C, W, Y) dan melindungi dari opsonofagositosis, sehingga menentukan apakah bakteremia terjadi - tetapi bukan mediator kerusakan endotel.",
        C: "IgA1 protease memecah IgA sekretorik dan membantu kolonisasi nasofaring, satu langkah sebelum invasi. Tidak berhubungan dengan koagulopati.",
        D: "Pili tipe IV memediasi perlekatan awal ke epitel nasofaring dan twitching motility. Tidak memicu kaskade sitokin secara langsung.",
        E: "PorA adalah protein porin dan antigen vaksin 4CMenB, bukan pemicu langsung koagulopati.",
      },
      basicToClinical:
        "Struktur lipid A pada LOS = motif yang dikenali TLR4. Konsep dasar mikrobiologi ini menjelaskan mengapa antibiotik yang melisiskan bakteri dapat memperberat syok sesaat setelah dosis pertama (pelepasan endotoksin), dan mengapa dukungan hemodinamik agresif berjalan bersamaan dengan antibiotik.",
      pearl:
        "Demam + kaku kuduk + ruam petekie yang tidak memucat pada penekanan = meningococcemia sampai terbukti sebaliknya. Beri seftriakson SEGERA, jangan menunggu hasil pungsi lumbal.",
      references: [
        "Murray PR. Medical Microbiology, 9th ed., Ch. 24 - Neisseria",
        "Rosenstein NE et al. Meningococcal Disease. N Engl J Med 2001;344:1378-88",
      ],
    },
    verifiedStatus: "VERIFIED",
  },
  {
    code: "ID-02",
    primaryDomain: "Virology",
    secondaryTopic: "Antiviral mechanism",
    organismSyndrome: "Influenza A",
    questionText:
      "<p>A 34-year-old woman presents 28 hours after the abrupt onset of fever, myalgia, and dry cough during a documented influenza A outbreak. A rapid molecular assay is positive for influenza A. She is otherwise healthy and not pregnant.</p><p>Oseltamivir is started. Which step of the viral life cycle does this drug inhibit?</p>",
    optionA: "Attachment of hemagglutinin to sialic acid receptors",
    optionB: "Uncoating via the M2 ion channel",
    optionC: "Synthesis of viral mRNA by the polymerase acidic (PA) endonuclease",
    optionD: "Release of progeny virions from the host cell surface",
    optionE: "Assembly of the ribonucleoprotein complex in the nucleus",
    correctAnswer: "D",
    cognitiveLevel: "one_step_mechanism",
    difficulty: 3,
    estimatedTimeSeconds: 60,
    learningObjective:
      "Memetakan kelas obat antiinfluenza ke tahap siklus hidup virus yang dihambatnya.",
    questionArchitecture: "Skenario terapi -> identifikasi target molekuler",
    hint: "Neuraminidase memotong asam sialat. Apa yang terjadi kalau pemotongan itu gagal?",
    optionReasons: {
      A: "Dihambat oleh antibodi penetral hasil vaksinasi, bukan oleh oseltamivir.",
      B: "Target amantadin/rimantadin - sudah ditinggalkan karena resistensi luas.",
      C: "Target baloxavir marboxil.",
      D: "Neuraminidase memotong asam sialat sehingga virion anakan bisa lepas.",
      E: "Belum ada obat klinis yang bekerja di tahap ini.",
    },
    explanation: {
      correctStatement:
        "Correct answer: D. Oseltamivir menghambat neuraminidase sehingga virion anakan gagal dilepaskan dari permukaan sel.",
      testedConcept: "Mekanisme kerja inhibitor neuraminidase pada influenza A dan B.",
      reasoning:
        "Hemagglutinin virion anakan tetap terikat pada residu asam sialat di permukaan sel inang. Neuraminidase memotong ikatan tersebut sehingga virion terlepas dan menyebar. Oseltamivir adalah analog keadaan transisi asam sialat yang menempati sisi aktif neuraminidase; akibatnya virion menggumpal di permukaan sel dan penyebaran terhenti. Karena obat ini hanya menghentikan penyebaran (bukan membunuh virus yang sudah masuk sel), manfaatnya bergantung pada waktu - paling besar bila dimulai dalam 48 jam pertama.",
      distractors: {
        A: "Perlekatan HA-asam sialat dicegah oleh antibodi penetral, bukan oleh oseltamivir.",
        B: "Kanal ion M2 adalah target amantadin dan rimantadin; hampir seluruh strain H3N2 dan H1N1 yang beredar kini resisten.",
        C: "PA endonuclease (cap-snatching) adalah target baloxavir marboxil, dosis tunggal per oral.",
        E: "Perakitan kompleks ribonukleoprotein di nukleus belum menjadi target obat yang dipakai klinis.",
      },
      basicToClinical:
        "Pasangan HA-NA adalah tarik-menarik 'menempel' versus 'melepas'. Memahami keseimbangan ini menjelaskan penamaan strain (H1N1, H3N2), dasar pergeseran antigenik, sekaligus mengapa jendela terapi 48 jam itu penting.",
      pearl:
        "Oseltamivir dalam 48 jam pertama memangkas durasi gejala sekitar 1 hari pada orang sehat; pada pasien risiko tinggi atau rawat inap tetap diberikan walau lewat 48 jam.",
      references: [
        "Katzung BG. Basic & Clinical Pharmacology, 15th ed., Ch. 49",
        "CDC Influenza Antiviral Medications: Summary for Clinicians, 2026",
      ],
    },
    verifiedStatus: "VERIFIED",
  },
  {
    code: "ID-03",
    primaryDomain: "Parasitology",
    secondaryTopic: "Malaria species identification",
    organismSyndrome: "Plasmodium falciparum",
    questionText:
      "<p>A 27-year-old man returns from a three-week trip to Papua and develops daily spiking fevers, headache, and jaundice. Thick and thin blood smears show 8% parasitaemia with multiple ring forms per erythrocyte, some with double chromatin dots, and banana-shaped gametocytes. No schizonts are seen in peripheral blood.</p><p>Which feature most strongly indicates <em>Plasmodium falciparum</em> rather than the other species?</p>",
    optionA: "Enlarged erythrocytes with Schuffner dots",
    optionB: "Banana-shaped (crescentic) gametocytes",
    optionC: "Band-form trophozoites",
    optionD: "Presence of hypnozoites in the liver",
    optionE: "Fever recurring strictly every 72 hours",
    correctAnswer: "B",
    cognitiveLevel: "lab_imaging_interpretation",
    difficulty: 4,
    estimatedTimeSeconds: 75,
    learningObjective:
      "Membedakan spesies Plasmodium berdasarkan morfologi apusan darah dan implikasi tata laksananya.",
    questionArchitecture: "Kasus perjalanan -> pembacaan apusan -> penentuan spesies",
    hint: "Satu bentuk gametosit hanya dimiliki oleh satu spesies, dan bentuknya diabadikan pada namanya di banyak buku teks.",
    optionReasons: {
      A: "Ciri P. vivax dan P. ovale.",
      B: "Gametosit berbentuk pisang khas dan patognomonik untuk P. falciparum.",
      C: "Ciri P. malariae.",
      D: "Hipnozoit ada pada P. vivax dan P. ovale, tidak pada falciparum.",
      E: "Demam kuartana adalah pola P. malariae.",
    },
    explanation: {
      correctStatement:
        "Correct answer: B. Gametosit berbentuk pisang (crescentic) hanya ditemukan pada P. falciparum.",
      testedConcept: "Identifikasi spesies Plasmodium dari morfologi apusan darah tepi.",
      reasoning:
        "Pada P. falciparum, eritrosit yang terinfeksi menempel di endotel kapiler (sekuestrasi lewat PfEMP1), sehingga tahap schizont jarang terlihat di darah tepi - yang tampak hanya ring form dan gametosit. Gametosit falciparum berbentuk sabit/pisang, berbeda dari gametosit bulat pada spesies lain, dan merupakan temuan patognomonik. Ring form ganda dalam satu eritrosit serta parasitaemia tinggi (>5%) juga mendukung falciparum, dan keduanya menandakan malaria berat yang memerlukan artesunat intravena.",
      distractors: {
        A: "Eritrosit membesar dengan Schuffner dots adalah ciri P. vivax dan P. ovale, yang menginfeksi retikulosit muda.",
        C: "Trofozoit bentuk pita (band form) adalah ciri P. malariae, yang menginfeksi eritrosit tua.",
        D: "Hipnozoit hati hanya dimiliki P. vivax dan P. ovale, sehingga hanya keduanya yang memerlukan primakuin untuk terapi radikal.",
        E: "Demam tiap 72 jam (kuartana) adalah pola P. malariae; falciparum justru sering memberi demam tidak teratur atau harian.",
      },
      basicToClinical:
        "Sekuestrasi lewat PfEMP1 menjelaskan sekaligus tiga hal: mengapa schizont hilang dari darah tepi, mengapa terjadi malaria serebral, dan mengapa parasitaemia perifer dapat meremehkan beban parasit sesungguhnya.",
      pearl:
        "Parasitaemia >5%, gangguan kesadaran, atau disfungsi organ = malaria berat: artesunat intravena, bukan terapi oral.",
      references: [
        "WHO Guidelines for Malaria, 2025 update",
        "Garcia LS. Diagnostic Medical Parasitology, 6th ed., Ch. 8",
      ],
    },
    verifiedStatus: "VERIFIED",
  },
  {
    code: "ID-04",
    primaryDomain: "Pharmacology",
    secondaryTopic: "Antibiotic mechanism & resistance",
    organismSyndrome: "MRSA",
    questionText:
      "<p>A 61-year-old man on haemodialysis develops fever and a tender, erythematous exit site at his tunnelled catheter. Blood cultures grow <em>Staphylococcus aureus</em> resistant to oxacillin. Vancomycin is started.</p><p>The resistance observed in this isolate is best explained by which molecular change?</p>",
    optionA: "Production of an extended-spectrum beta-lactamase",
    optionB: "Acquisition of mecA encoding PBP2a with low beta-lactam affinity",
    optionC: "Porin loss reducing drug entry into the periplasm",
    optionD: "Substitution of D-Ala-D-Ala with D-Ala-D-Lac in the peptidoglycan precursor",
    optionE: "Efflux pump overexpression via the mexAB-oprM operon",
    correctAnswer: "B",
    cognitiveLevel: "multi_step_basic_to_clinical",
    difficulty: 4,
    estimatedTimeSeconds: 80,
    learningObjective:
      "Menjelaskan dasar molekuler resistensi metisilin pada S. aureus dan membedakannya dari mekanisme resistensi lain.",
    questionArchitecture: "Kasus infeksi kateter -> hasil kepekaan -> mekanisme molekuler",
    hint: "Resistensi ini bukan karena obatnya dirusak, melainkan karena targetnya diganti.",
    optionReasons: {
      A: "Mekanisme khas Enterobacterales, bukan S. aureus.",
      B: "mecA menyandi PBP2a yang tetap bekerja walau ada beta-laktam.",
      C: "Butuh membran luar - S. aureus gram positif, tidak punya porin.",
      D: "Mekanisme resistensi vankomisin (VRE/VRSA), bukan metisilin.",
      E: "Operon efluks khas Pseudomonas aeruginosa.",
    },
    explanation: {
      correctStatement:
        "Correct answer: B. MRSA terjadi karena gen mecA (dibawa kaset SCCmec) menyandi PBP2a.",
      testedConcept: "Dasar molekuler resistensi metisilin pada Staphylococcus aureus.",
      reasoning:
        "Beta-laktam bekerja dengan mengikat penicillin-binding protein (PBP), yaitu transpeptidase yang menyilangkan peptidoglikan. PBP2a yang disandi mecA memiliki afinitas sangat rendah terhadap seluruh beta-laktam, sehingga sintesis dinding sel tetap berjalan meski obat hadir pada kadar terapeutik. Karena targetnya yang berubah - bukan obatnya yang dirusak - penghambat beta-laktamase seperti asam klavulanat tidak menolong, dan resistensi berlaku untuk hampir semua beta-laktam sekaligus (kecuali seftarolin yang mengikat PBP2a).",
      distractors: {
        A: "ESBL adalah enzim perusak beta-laktam pada Enterobacterales seperti E. coli dan Klebsiella, bukan mekanisme S. aureus.",
        C: "Kehilangan porin memerlukan membran luar; S. aureus adalah gram positif dan tidak memiliki porin.",
        D: "Penggantian D-Ala-D-Ala menjadi D-Ala-D-Lac (gen vanA) adalah mekanisme resistensi VANKOMISIN, relevan untuk VRE/VRSA - bukan untuk resistensi oksasilin.",
        E: "Operon efluks mexAB-oprM adalah ciri Pseudomonas aeruginosa.",
      },
      basicToClinical:
        "Karena mecA mengubah target dan bukan merusak obat, laporan 'resisten oksasilin' pada laboratorium otomatis berarti resisten terhadap seluruh golongan beta-laktam - inilah alasan satu baris hasil kultur mengubah seluruh rencana antibiotik.",
      pearl:
        "Oksasilin/sefoksitin resisten pada S. aureus = MRSA = jangan pakai beta-laktam apa pun kecuali seftarolin. Bakteremia MRSA memerlukan vankomisin atau daptomisin dan pencarian sumber infeksi.",
      references: [
        "Katzung BG. Basic & Clinical Pharmacology, 15th ed., Ch. 43",
        "Liu C et al. IDSA Guidelines for MRSA Infections",
      ],
    },
    verifiedStatus: "VERIFIED",
  },
  {
    code: "ID-05",
    primaryDomain: "Immunology",
    secondaryTopic: "Innate immune recognition",
    organismSyndrome: "Sepsis",
    questionText:
      "<p>A researcher studies mice with a targeted deletion of the gene encoding MyD88. Compared with wild-type animals, the knockout mice fail to produce TNF-&alpha; after intraperitoneal injection of purified lipopolysaccharide, yet retain a normal type I interferon response to intracellular double-stranded RNA.</p><p>Which conclusion is best supported by these findings?</p>",
    optionA: "MyD88 is required for antigen presentation by MHC class II",
    optionB: "MyD88 is the shared adaptor for most TLR signalling but is dispensable for RIG-I-like receptor signalling",
    optionC: "MyD88 functions downstream of the complement membrane attack complex",
    optionD: "MyD88 is required for class switch recombination in B cells",
    optionE: "MyD88 mediates NK-cell cytotoxicity through perforin release",
    correctAnswer: "B",
    cognitiveLevel: "experimental_reasoning",
    difficulty: 5,
    estimatedTimeSeconds: 100,
    learningObjective:
      "Menyimpulkan letak sebuah molekul adaptor dalam jalur sinyal imun bawaan dari pola fenotipe knockout.",
    questionArchitecture: "Rancangan percobaan -> pola fenotipe -> penempatan jalur",
    hint: "Dua rangsang berbeda memberi hasil berbeda - bandingkan reseptor mana yang mengenali masing-masing rangsang.",
    optionReasons: {
      A: "Presentasi antigen tidak diuji dalam percobaan ini.",
      B: "LPS dikenali TLR4 (butuh MyD88); dsRNA sitosolik dikenali RIG-I/MDA5 (tidak butuh MyD88).",
      C: "Komplemen tidak memakai MyD88.",
      D: "Class switching digerakkan CD40L dan sitokin sel T.",
      E: "Sitotoksisitas NK berjalan lewat jalur granul, bukan MyD88.",
    },
    explanation: {
      correctStatement:
        "Correct answer: B. MyD88 adalah adaptor bersama bagi hampir seluruh TLR, tetapi tidak diperlukan oleh reseptor RIG-I-like.",
      testedConcept: "Pemetaan jalur sinyal imun bawaan menggunakan fenotipe knockout selektif.",
      reasoning:
        "LPS dikenali oleh kompleks TLR4/MD-2 di permukaan sel; sinyalnya berjalan lewat MyD88 menuju IRAK4-TRAF6-NF-\u03baB dan menghasilkan TNF-\u03b1. Tanpa MyD88, cabang ini terputus - persis yang terlihat pada tikus knockout. Sebaliknya, dsRNA sitosolik dikenali RIG-I/MDA5 yang memakai adaptor MAVS, bukan MyD88, sehingga respons interferon tipe I tetap utuh. Pola 'satu rangsang mati, satu rangsang hidup' inilah yang menempatkan MyD88 secara spesifik di jalur TLR.",
      distractors: {
        A: "Presentasi antigen MHC kelas II tidak diukur; lagipula MyD88 bukan komponen jalur pemrosesan antigen.",
        C: "Membrane attack complex melisiskan sel secara langsung dan tidak memakai adaptor sitoplasmik.",
        D: "Class switch recombination digerakkan CD40L dan sitokin sel T melalui AID, bukan MyD88.",
        E: "Sitotoksisitas sel NK berjalan lewat pelepasan granul perforin/granzim setelah keseimbangan reseptor aktivasi-inhibisi, bukan lewat MyD88.",
      },
      basicToClinical:
        "Manusia dengan defisiensi MyD88 atau IRAK4 mengalami infeksi piogenik berat berulang (terutama pneumokokus dan stafilokokus) pada masa kanak, tetapi respons antivirusnya relatif normal - cerminan langsung dari pola knockout dalam soal ini.",
      pearl:
        "TLR (kecuali TLR3) -> MyD88. TLR3 dan cabang endosom TLR4 -> TRIF. RIG-I/MDA5 -> MAVS. Tiga adaptor ini menjelaskan hampir seluruh soal jalur imun bawaan.",
      references: [
        "Abbas AK. Cellular and Molecular Immunology, 10th ed., Ch. 4",
        "Picard C et al. Inherited MyD88 and IRAK-4 deficiency. Medicine 2010",
      ],
    },
    verifiedStatus: "VERIFIED",
  },
];

// Kalender 8 lomba (PRD 10.1). Tanggalnya sengaja relatif terhadap hari migrasi
// dijalankan supaya kalender contoh tidak langsung tampak kedaluwarsa.
const EVENTS = [
  { title: "Pendaftaran Olimpiade Infectious Disease", stage: "pendaftaran", offsetStart: 3, days: 14 },
  { title: "Try Out Nasional 1", stage: "try out", offsetStart: 21, days: 1 },
  { title: "Babak Penyisihan Regional", stage: "penyisihan", offsetStart: 35, days: 2 },
  { title: "Pengumuman Peserta Semifinal", stage: "pengumuman", offsetStart: 42, days: 1 },
  { title: "Try Out Nasional 2", stage: "try out", offsetStart: 49, days: 1 },
  { title: "Babak Semifinal", stage: "semifinal", offsetStart: 63, days: 2 },
  { title: "Karantina & Pembekalan Finalis", stage: "pembekalan", offsetStart: 77, days: 3 },
  { title: "Grand Final Olimpiade Kedokteran", stage: "final", offsetStart: 91, days: 2 },
];

migrate(
  (app) => {
    // Sudah ada isinya -> jangan sentuh apa pun.
    try {
      const ada = app.findRecordsByFilter("olimp_subjects", "id != ''", "", 1, 0);
      if (ada.length > 0) return;
    } catch (_) {
      return; // collection belum ada (migrasi utama belum jalan)
    }

    const subjects = app.findCollectionByNameOrId("olimp_subjects");
    const questions = app.findCollectionByNameOrId("olimp_questions");
    const packages = app.findCollectionByNameOrId("olimp_packages");
    const events = app.findCollectionByNameOrId("olimp_events");

    const sub = new Record(subjects);
    sub.set("name", "Infectious Disease");
    sub.set("code", "ID");
    sub.set("description", "Bakteriologi, virologi, mikologi, parasitologi, imunologi, dan farmakologi antimikroba.");
    sub.set("order", 1);
    sub.set("active", true);
    app.save(sub);

    const ids = [];
    SOAL.forEach((s) => {
      const r = new Record(questions);
      Object.keys(s).forEach((k) => r.set(k, s[k]));
      r.set("subject", sub.id);
      r.set("verifiedAt", new Date().toISOString());
      r.set("verifiedBy", "seed");
      app.save(r);
      ids.push(r.id);
    });

    const pkg = new Record(packages);
    pkg.set("name", "International Infectious Disease Olympiad");
    pkg.set("subject", sub.id);
    pkg.set(
      "description",
      "Paket contoh berisi soal-soal olimpiade Infectious Disease tingkat internasional. Pakai paket ini untuk mencoba alur Olimp: blueprint, kuis, Cek Jawaban, dan pembahasan 8 bagian.",
    );
    pkg.set("questionIds", ids);
    pkg.set("language", "English");
    pkg.set("answerLanguage", "Bahasa Indonesia");
    pkg.set("targetAudience", "Pre-clinical medical students");
    pkg.set("competitionLevel", "International Olympiad");
    pkg.set("answerFormat", "Single Best Answer (A-E)");
    pkg.set("secondsPerQuestion", 90);
    pkg.set("referenceCutoff", "August 2026");
    pkg.set("blueprint", {
      // Blueprint TARGET paket penuh 20 soal (PRD 5.5). Isi paket contoh baru 5
      // soal, jadi halaman admin akan menandai selisihnya - itu memang gunanya.
      domain: {
        Bacteriology: 3,
        Virology: 2,
        Mycology: 2,
        Parasitology: 3,
        Immunology: 2,
        Pharmacology: 3,
        "Clinical Syndromes": 3,
        Diagnostics: 2,
      },
      cognitive: {
        precision_foundational: 2,
        one_step_mechanism: 4,
        multi_step_basic_to_clinical: 8,
        lab_imaging_interpretation: 4,
        experimental_reasoning: 2,
      },
      difficulty: { 1: 0, 2: 0, 3: 2, 4: 10, 5: 8 },
      answer: { A: 4, B: 4, C: 4, D: 4, E: 4 },
    });
    pkg.set("learningTips", [
      "Baca vignette sampai habis sebelum melihat pilihan jawaban - kalimat terakhir biasanya menyimpan kuncinya.",
      "Untuk soal mekanisme, tentukan dulu organ/molekul yang terlibat, baru cocokkan dengan pilihan.",
      "Kalau ragu antara dua pilihan, cari mana yang menjelaskan SELURUH temuan pada kasus, bukan sebagian.",
      "Target 90 detik per soal. Lewati dulu soal yang macet, jangan habiskan waktu di satu nomor.",
    ]);
    pkg.set("status", "PUBLISHED");
    pkg.set("sebOnly", false);
    app.save(pkg);

    const hariIni = new Date();
    EVENTS.forEach((e) => {
      const r = new Record(events);
      const start = new Date(hariIni.getTime() + e.offsetStart * 86400000);
      const end = new Date(start.getTime() + e.days * 86400000);
      r.set("title", e.title);
      r.set("stage", e.stage);
      r.set("startDate", start.toISOString());
      r.set("endDate", end.toISOString());
      r.set("notifyEmail", true);
      r.set("description", "Jadwal contoh - admin bisa mengubah, menambah, atau menghapusnya dari Dashboard Olimp.");
      if (e.stage === "try out") r.set("package", pkg.id);
      app.save(r);
    });
  },

  (app) => {
    // Turun: hapus isi seed saja (collection-nya diurus migrasi utama).
    ["olimp_events", "olimp_packages", "olimp_questions", "olimp_subjects"].forEach((name) => {
      try {
        app.findRecordsByFilter(name, "id != ''", "", 0, 0).forEach((r) => app.delete(r));
      } catch (_) {
        /* sudah tidak ada */
      }
    });
  },
);
