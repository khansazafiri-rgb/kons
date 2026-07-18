/// <reference path="../pb_data/types.d.ts" />

// PEMULIH: kembalikan kurikulum LENGKAP 37 mata kuliah + 491 BAB.
//
// Migration 1783714100 (penyempit ke 10 mata kuliah) SUDAH DIHAPUS karena
// keliru — penyempitan 10 mata kuliah itu hanya untuk tampilan LANDING PAGE,
// bukan untuk dashboard admin. Dashboard admin harus tetap punya semua mata
// kuliah & BAB.
//
// Migration ini aman dijalankan pada kedua kondisi:
//  (a) Server BELUM sempat menjalankan migration penyempit -> tidak ada yang
//      berubah (semua sudah lengkap, find-or-create tidak membuat duplikat).
//  (b) Server SUDAH terlanjur menjalankan migration penyempit -> semua mata
//      kuliah & BAB yang terhapus dibuat ulang, rename "Patologi Klinis"
//      dikembalikan ke "Patologi Klinik", dan 7 BAB yang sempat dipindah dari
//      "Endokrin" dikembalikan ke tempatnya.
//
// Catatan: PPT & soal yang di-upload user untuk mata kuliah yang terlanjur
// terhapus TIDAK bisa dipulihkan otomatis (file-nya ikut ter-cascade). Struktur
// mata kuliah & BAB dipulihkan penuh; PPT/soal perlu di-upload ulang bila ada.

// BAB yang dipindah oleh migration penyempit dari "Endokrin" -> "Patologi Klinis".
// Urutannya = 7 BAB pertama "Endokrin" pada kurikulum asli.
const MOVED_BACK_TO_ENDOKRIN = [
  "Autoimun disease",
  "Tumor Markers",
  "Laboratory Testing Diabetes Mellitus",
  "Laboratory Testing Thyroid",
  "Hipersensitivitas",
  "Analisis Cairan Tubuh",
  "Covid-19",
];

migrate(
  (app) => {
    const subjects = app.findCollectionByNameOrId("subjects");
    const chapters = app.findCollectionByNameOrId("chapters");

    // 1. Balikkan rename "Patologi Klinis" -> "Patologi Klinik" (hanya bila
    //    belum ada yang bernama "Patologi Klinik").
    let hasKlinik = true;
    try {
      app.findFirstRecordByFilter("subjects", "name = 'Patologi Klinik'");
    } catch (_) {
      hasKlinik = false;
    }
    if (!hasKlinik) {
      try {
        const s = app.findFirstRecordByFilter("subjects", "name = 'Patologi Klinis'");
        s.set("name", "Patologi Klinik");
        app.save(s);
      } catch (_) {}
    }

    const CURRICULUM = [
      {
        name: "Anatomi",
        chapters: ["Terminologi Dasar, Osteologi, Arthrologi", "Regio femoralis, Glutea, Plexus Lumbosacralis", "Genu, Poplitea, Cruris, Pedis", "Regio pectoralis & scapularis, Fossa axillaris, Plexus brachialis, Regio brachii", "Fossa cubiti, Regio antebrachii, Manus", "Regio thorax, Mediastinum, Pulmo & pleura, Cor & pericardium", "Anterior & Posterior abdominal wall, Diaphragm, Blood supply of the abdominal viscera", "Hollow organ, accessory digestive organs (Liver, gallbladder, pancreas, lien)", "Regio pelvis, tractus urinarius", "Genitalia feminina dan masculina", "Superficial face region, Deep face region", "Superficial neck region, Deep neck region", "Skull, Overview nervous system, Cranial nerve", "Meninges, sinus durae maters, system ventrikuli, CSF, auris et ocullus", "Overview SSP, Forebrain (Telencephalon, Dienchepalon)", "Brainstem (mesencephalon, pons, medong), Medspin, Cerebellum"],
      },
      {
        name: "Fisiologi",
        chapters: ["Endokrin 1", "Endokrin 2", "Integumen", "Urinaria", "Reproduksi", "Saraf 1 (Introduction)", "Saraf Perifer & Muskulokeletal", "Faal Kardiologi", "Faal Respirasi", "Fisiologi Olahraga", "Sirkulasi & Cairan Tubuh", "Saraf 2 (Sistem somatosensorik dan motorik)", "Saraf 3 (Higher brain function dan ANS)", "Darah & Imun", "Metabolisme", "EKG", "Pencernaan", "Indra"],
      },
      {
        name: "Histologi",
        chapters: ["Pendahuluan dan Sel (Introduction and Cell)", "BAS dan Jaringan Ikat (Extracellular Matrix and Connective Tissue)", "Darah Tepi dan Sumsum tulang (Peripheral Blood and Bone Marrow)", "Jaringan Epitel (Epithelial Tissue)", "Kulit dan Adneksa (Integumentary System)", "Jaringan Tulang dan Tulang Rawan (Bone and Cartilage)", "Jaringan Otot (Muscle)", "Jaringan Saraf Tepi dan Saraf Pusat (Peripheral and Central Nervous System)", "Sistem Cardiovascular (Cardiovascular System)", "Sistem Limfatik (Lymphatic System)", "Rongga Mulut, Gigi Dewasa dan Pertumbuhan Gigi (Oral Cavity, Teeth and Teeth Formation)", "Kelenjar Liur, Pankreas, Hepar dan Kandung Empedu (Salivary Glands, Pancreas, Liver and Gallbladder)", "Esofagus sampai Anus (Esophagus to Anal Canal/Gastrointestinal Tract)", "Sistem Urinaria (Urinary System)", "Sistem Reproduksi Pria (Male Reproductive System)", "Sistem Reproduksi Wanita (Female Reproductive System)", "Sistem Endokrin (Endocrine System)", "Sistem Respirasi (Respiratory System)", "Mata (Eye)", "Telinga (Ear)"],
      },
      {
        name: "Biologi Kedokteran",
        chapters: ["Sel, Membran Sel, dan Komunikasi antar sel", "RNA, DNA, Sintesis protein", "Pembelahan Sel dan Kematian Sel", "Bioteknologi", "Sistem reproduksi pria", "Sistem reproduksi wanita", "Andrologi", "Embriologi & Teratologi", "Epigenetik dan Genetika populasi", "Onkogenetik"],
      },
      {
        name: "Farmakologi",
        chapters: ["Perkenalan : General Pharmacology", "SSO; Obat kolinergik & adrenergik", "Analgesik & antigout", "Antihistamine, Autacoid, Ergot alkaloid", "Obat sistem respirasi, P drug", "Obat jantung (Hipertensi, Gagal Jantung, Angina, Aritmia)", "Antikoagulan, antiplatelet, trombolitik, obat dislipidemia", "Antibiotik & Antimycobacteria", "Antivirus, antifungi, antiparasit", "Immunofarmakologi & antikanker", "BSO, Dosis, Waktu & Cara Pemberian Obat", "Obat Endokrin", "Obat GIT", "Obat SSP", "Toxicology & Interaksi Obat", "Perihal Resep + Latihan Menulis Resep"],
      },
      {
        name: "Biokimia",
        chapters: ["Enzim", "Oksidasi Biologi & Redoks", "Metabolisme Lipid", "Metabolisme Kolesterol", "Metabolisme Asam amino", "Metabolisme Terpadu", "Metabolisme Karbohidrat 1", "Metabolisme Karbohidrat 2", "Asam Basa", "Metabolisme Heme, Porfirin, Bilirubin", "Darah-Immunogenetic", "Metabolisme Nukleotida & Sintesis Protein", "Membran & Transpor Membran", "Metabolisme Air-Mineral", "Metabolisme Vitamin", "Biokimia Jaringan", "Xenobiotik & Oksidan-Antioksidan", "Hormon"],
      },
      {
        name: "Mikrobiologi",
        chapters: ["Taksonomi bakteri; Morfologi dan Ultrastruktur bakteri, pewarnaan bakteri, Genetika bakteri", "Metabolisme dan Pertumbuhan bakteri; Metode dan medium kultur bakteri", "Sterilisasi, Desinfeksi, dan Antiseptik, Antibiotik dan Mekanisme Resistensi Bakteri, Metode Uji Kepekaan Antibiotik", "Staphylococcus spp. (termasuk MRSA); Streptococcus spp. dan post Streptococcal Disease, Spore forming bacteria aerob", "Mycoplasma, Chlamydia, Ricketsia, Haemophilus spp., Bordetella pertusis, Legionella pneumophila, Leptospira spp.", "Mycobacterium tuberculosis dan MOTT; Mycobacterium leprae", "Corynebacterium diphtheriae, Vibrio spp., Campylobacter spp., Helicobacter pylori, Acinetobacter spp., Pseudomonas spp.", "Neisseria spp., Treponema pallidum, bacterial vaginosis, Bakteri anaerob", "Enterobacteriaceae 1", "Enterobacteriaceae 2", "Imunologi infeksi + Imunoprofilaksis", "Virologi Dasar; Patogenesis infeksi virus; Mekanisme kerja obat antivirus; Pemeriksaan laboratorium mikrobiologi pada infeksi virus", "Influenza, Coronavirus, Rhinovirus", "Mumps, Measless, Rubella (MMR) virus; Rotavirus", "ARBO virus; Virus zoonosis", "Herpesviridae, Human papiloma virus", "Virus Hepatitis, HIV / AIDS", "Respon imun pada infeksi jamur dan Mekanisme Obat antifungi, Superficial mycosis, dermatophytosis dan subcutaneus mycosis", "Oppotunistik mycosis I: Candida, Cryptococcus, Pneumocystis jiroveci", "Opportunistic mycosis II: Zygomycosis, Aspergillosis, Systemic mycosis"],
      },
      {
        name: "Parasitologi",
        chapters: ["Ascaris lumbricoides, Hookworm, Strongyloides stercoralis, CLM, VLM", "Trichuris trichiura, Enterobius vermicularis, Trichinella, Filaria, Dracunculus, Angiostrongylus", "Cestoda, Taenia, cysticercosis", "Hymenolepis nana, Hymenolepis diminuta, Dipylidium caninum, Echinococcus granulosus", "Diphyllobothrium latum, Trematoda Hati", "Trematoda Usus : Fasciolopsis buski, Heterophyes, Metagonimus, Echinostoma", "Schistosoma, Paragonimus westermani", "Balantidium, Entamoeba, Free living Amoeba, Cryptosporidium", "Giardiasis, Chilomastix mesnili, Trichomonas spp., Trichomonas vaginalis", "Trypanosoma, Leishmania, Toxoplasma", "Plasmodium", "Nyamuk", "Hymenoptera, coleoptera, lepidoptera", "Lalat, termasuk Myiasis; Parasitologi Forensik", "Tick dan Mites; Venomous Arthropoda", "Hemiptera, Ortoptera, Anoplura, Siphonaptera", "Imunoparasitologi, Arthropod Control", "Pemeriksaan lab, Teknik diagnostik parasit; Zoonosis"],
      },
      {
        name: "Patologi Anatomi",
        chapters: [],
      },
      {
        name: "Patologi Klinik",
        chapters: ["Hematologi 1", "Hematologi 2", "Imunologi Serologi", "Infeksi", "Pemeriksaan Laboratorium Daerah Steril dan Tidak Steril", "GIT", "Ginjal & Urinaria"],
      },
      {
        name: "Kardiorespi",
        chapters: ["Anatomi histologi kardiorespi", "Rehab kardiorespi dan keseimbangan asam basa", "Patfis gangguan nafas atas, patfis paru", "Onkologi toraks, kegawat respi, imunopato infeksi paru", "Patologi anatomi pada pneumonia, TB, tumor paru", "PK PD OAT, bronkodilator, dan steroid", "Parasit penyebab infeksi paru dan diagnosis mikrobiologi penyebab infeksi paru", "Pendekatan batuk sesak pada anak", "Embriologi jantung, fetal and newborn circulation; patfis congenital heart disease", "Histologi sistem arteri dan vena, siklus kardiak", "PJK sistem arteri koroner, PJK patfis PJK", "Patfis kardiomiopati dan miokarditis, histo PA infark, kardiomiopati, dan miokarditis", "Hipertensi, patfis jantung rematik", "Patfis aritmia, patfis gagal jantung", "Farmako PJK, HT, anti-aritmia, dan gagal jantung", "Vaskular 1 dan 2", "Patfis shock cardiogenik, patfis cardiac arrest", "Spirometri, EKG, dan CXR"],
      },
      {
        name: "Muskuloskeletal",
        chapters: ["Plexus Brachialis dan Plexus Lumbosacral", "Histologi otot dan tulang", "Fisiologi NM 1 NM 2", "Neuroanatomi aspek Neurologi dan Ortopedi", "Introduksi rehab medik, rehab fraktur, gangguan berjalan, dan rehab dasar olahraga", "Anamnesis dan px fisik aspek neurologi dan ortopedi", "Modalitas imaging pada MSK, analisis sistematis pada foto konvensional tulang, dan imaging pada fraktur", "Nyeri MSK 1 dan 2", "Gangguan tulang belakang, fraktur pada tulang anak", "Fraktur ekstremitas dan peripheral nerve compression", "Gangguan metabolisme tulang dan aspek neoplasma tulang", "Gangguan otot, tendon, dan ligamen", "OA dan RA, patfis dan strategi manajemen OA RA", "infeksi MSK dan kelainan kongenital MSK", "Sports medicine dan PK PD analgesik neuromuskuler"],
      },
      {
        name: "Endokrin",
        chapters: ["Autoimun disease", "Tumor Markers", "Laboratory Testing Diabetes Mellitus", "Laboratory Testing Thyroid", "Hipersensitivitas", "Analisis Cairan Tubuh", "Covid-19", "Anatomi & Histologi Endokrin", "HPT & HPA axis", "Sekresi glukagon dan insulin", "DM Tipe 1, 2, dan lain, komplikasi DM, hipoglikemia", "Cushing dan krisis adrenal", "Goiter, hipotiroid, hipertiroid", "Dislipidemia dan hiperurisemia", "Obesitas dan sindroma metabolik", "DM 1 dan DM 2 pediatri", "Adrenal disorder dan DSD", "Vitamin A defficiency, pediatric calcium disorder, dan severe malnutrition", "Growth and puberty", "Therapy DM", "Therapy Thyroid", "Therapy Dislipidemia", "Antigout", "Endocrine pathology"],
      },
      {
        name: "Gastrohepatoenterologi",
        chapters: ["Anatomi dan Histologi GHEP", "Faal dan biokim GHEP", "Peptic ulcer, gastritis, dan perdarahan GI", "GERD, diare, dan konstipasi pada anak", "PK PD gangguan as lambung dan motilitas usus", "Infeksi GHEP dan Hepatitis A B C", "Gangguan fungsional GIT", "Radang infeksi GIT pada kasus bedah, anorectal disease", "NAFLD, sirosis, hepatoma, dan abses", "Lab GHEP dan Radiologi GHEP", "PA GHEP", "Gawatdarurat abdomen, hernia", "Kelainan kongenital GIT", "Food allergy, keracunan makanan"],
      },
      {
        name: "Growth and Development",
        chapters: ["Prinsip Dasar & Embryonic Development", "Genetik & Regulasi Perkembangan", "Perkembangan Neonatal & Gangguan", "Kelainan Kongenital & Penyakit Terkait", "Pharmacogenomics & Adult-Onset Disorders", "Cell Death, Aging & Degenerasi", "Psychosocial & Behavioral Development"],
      },
      {
        name: "Hematologi & Imunologi",
        chapters: ["Sel dan Komponen Sistem Imun & Respon imun terhadap malaria, parasit, bakteri dan virus", "Faal Hematologi dan Hematopoiesis Normal, Metabolisme Eritrosit dan Regulasi Eritropoiesis", "Gambaran Histopatologi (Patologi Anatomi) Pada Kelainan Limfadenopati & Kelainan Hematologi", "Pemeriksaan Laboratorium (PK) Untuk Infeksi Bakteri, Parasit dan Virus", "Manajemen Penyakit Infeksi Umum Pada Anak: Sepsis & Malaria", "Imunisasi dan KIPI (Kejadian Ikutan Pasca Imunisasi)", "Penyakit Alergi dan Anafilaksis: Syok Anafilaktik, Alergi Makanan", "Penyakit Autoimun Umum", "Pemeriksaan Laboratorium (PK) Untuk Imunohematologi Dan Kelainan Leukosit", "Manajemen Penyakit Infeksi Umum Pada Dewasa", "Farmakologi Anti-Alergi dan Anti Infeksi", "Kelenjar Getah Bening dan Abnormalitasnya", "Kelainan Hematologi Pada Anak dan Dewasa"],
      },
      {
        name: "Neuropsikiatri",
        chapters: ["Pengantar Sindrom Neuropsikiatri & Genetika", "Kejang Demam", "Bangkitan Epileptik & Epilepsi", "Embriologi & Anatomi serta gangguan neurodevelopmental", "Faal Neurologi", "Obat Gangguan Keseimbangan", "Gangguan Memori & Gangguan Kesadaran serta Neuroradiologi Gangguan kesadaran", "Gangguan Gerak Neurologi & Psikiatri", "Gangguan Keseimbangan bidang Neurologi dan Psikiatri", "Gangguan Neurovaskular Sentral", "Diagnosis & Tata Laksana Stroke", "Bioetik & Anamnesis Psikiatri", "Ketergantungan obat", "Kejang Psikogenik", "Nyeri Kepala"],
      },
      {
        name: "Sistem Indra",
        chapters: ["Imunologi Dasar Pada Kulit & Patofisiologi Pruritus", "Cara Pemeriksaan dan Efloresensi di bidang Dermatologi", "Pendekatan Diagnosis: Vesikobulosa", "Pendekatan Diagnosis: Eritropapuloskuamosa", "Pendekatan Diagnosis: Pigmentasi Kulit", "Pendekatan Diagnosis: Tumor Kulit", "Ekstraorbita & Intraorbita, Anatomi & Fisiologi Mata & Gerakan Bola Mata", "Embriologi Mata & Sistem Imun pada Mata", "Mata sebagai Sistem Optik & Gangguan Penglihatan", "Mata Merah", "Mekanisme & Gangguan Pendengaran & Keseimbangan", "Mekanisme & Gangguan Penghidu", "Histologi & Faal Sistem Indera dan Integumen", "Fisiologi dan Gangguan Pengecapan", "Terapi Topikal pada Sistem Indera & Integumen", "Patologi Anatomi & Patologi Klinik Sistem Indera & Integumen", "Mikrobiologi & Parasitologi Sistem Indera & Integumen"],
      },
      {
        name: "Sistem Ginjal",
        chapters: ["Anatomi & Embriologi, serta kelainan kongenital Ginjal dan Saluran Kemih", "Histologi Sistem Ginjal dan Saluran Kemih", "Fisiologi & Biokimia Ginjal", "Pemeriksaan Mikrobiologi Ginjal dan Saluran Kemih & Parasit Penyebab Penyakit Ginjal", "Farmakoterapi pada Infeksi Saluran Kemih", "Obat Penyebab Nefrotoksisitas & Farmakokinetika Obat pada Gangguan Fungsi Ginjal", "PK Sistem Ginjal", "Patologi Anatomi Sistem Urogenitalia", "Radiologi Ginjal dan Saluran Kemih & Batu Saluran Kemih (BSK)", "Gonorrhoe & Chancroid", "Acute Kidney Injury (AKI) & Penyakit Ginjal Kronik (PGK) pada Dewasa", "Sindroma Nefrotik & Nefritik pada Anak", "Pembesaran Prostat dan Infeksi Urogenitalia Pria", "Tumor Urogenital & Trauma Saluran Kemih", "Infeksi Saluran Kemih pada Anak dan Dewasa & Manajemennya", "Disfungsi Ereksi, Priapismus, dan Infertilitas Pria"],
      },
      {
        name: "Sistem Reproduksi",
        chapters: ["Embriologi & Anatomi sistem reproduksi pria dan wanita", "Farmakokinetik dan Farmakodinamik Antiandrogen, Estrogen, Progestoren, dan Bromokriptin & Farmakokinetik dan farmakodinamik kontrasepsi hormonal", "Obat-Obatan Yang Aman Untuk Ibu Hamil dan Menyusui", "Fertilisasi dan Konsepsi, Plasenta dan pertumbuhan janin, Fisiologi Kehamilan dan Laktasi", "Kelainan Anatomis Sistem Reproduksi Pria", "Proses persalinan normal", "Patologi Anatomi Neoplasma Dan Non Neoplasma Sistem Reproduksi", "Anestesi Terkait Obstetri dan Ginekologi", "Fisiologi: Folikulogenesis, regulasi hormonal wanita dan siklus menstruasi", "Pubertas pria dan wanita serta menopause", "Gangguan Haid, Perdarahan Uterus Disfungsional", "Infeksi dan neoplasma sistem reproduksi wanita & Pemeriksaan Vaginal Swab", "Kegawatdaruratan & Hipertensi Pada Kehamilan", "Anemia dalam kehamilan & Masalah pada kehamilan muda: hipermesis dan perdarahan kehamilan", "Masa Nifas, laktasi dan permasalahannya & KB"],
      },
      {
        name: "GELS 1",
        chapters: ["FISIOLOGI & ANATOMI AIRWAY, BREATHING, SIRCULATION", "DISABILTY & EXPOSURE", "BASIC LIFE SUPPORT DAN ADVANCED LIFE SUPPORT PADA ANAK DAN DEWASA", "DRUGS USED IN RESCUCITATION", "TRANSPORTATION", "CODE BLUE TEAM & KOORDINASI KEGAWATDARURATAN DAN BENCANA", "LEGAL ASPECT & ETHICAL PROBLEM"],
      },
      {
        name: "Tramed 3",
        chapters: ["Sirkumsisi", "Leopold", "Kateter", "Px Abdomen", "Anamnesis Infeksi, Anamnesis Ibu Hamil, Anamnesis Neurologi, Anamnesis Psikiatri", "Suture"],
      },
      {
        name: "IPD",
        chapters: ["Diagnostic Approach to Autoimmune Diseases; Drug Allergies", "Diabetes Mellitus and Thyroid Diseases", "GI Bleeding", "Hepatitis", "Hepatobiliary Anatomy &, Gastrointestinal System Anatomy and Physiology", "Unit Pelayanan Intensif (UPI)", "Intro Nefrologi & CKD-AKI", "Anemia & Bleeding disorders, Immune Thrombocytopenia", "Leukemia & Lymphoma; Multiple Myeloma", "CV system physical examination; Coronary Heart Disease;", "HF; Hypertension; Rheumatoid Heart Disease", "Airway disease; Lung Parenkim disease", "Occupational lung disease; TB Paru; Pemeriksaan fisik Respirasi;", "Infeksi Tropis", "Osteoporosis & Gout"],
      },
      {
        name: "IKA",
        chapters: ["Tetanus; Difteri", "Hepatitis akut; Kolestasis; Hiperbilirubinemia", "Newborn physical examination, Gawat darurat pada anak", "Kejang Demam, Bacterial meningitis, Status epileptikus pada Anak", "Permasalahan respirasi pada anak (ISPA, Asma pada Anak, Pertusis, TBC Anak)", "Diare pada anak, Tatalaksana cairan dan elektrolit pada anak", "Nutrisi pada anak, Gizi Buruk", "Polio, Imunisasi", "Demam Tifoid", "Penyakit Metabolik pada anak (Thyroid, Diabetes, Hipoglikemia)", "Lupus Nephritis pada anak & Sindroma nefritik & Nefrotik", "ASI & MPASI"],
      },
      {
        name: "Neuropsiki-rehab",
        chapters: ["Headache & Fascial Pain (TTH) (4A), Migraine (4A), Cluster (3A), Trigeminal Neuralgia (3A)", "Radicular Syndrome (3A), HNP (3A), Reffered Pain (3A), Neuropathic Pain (3A)", "Complete Spinal Transection (3B), Acute Medulla Compression (3B), Trauma Medulla Spinalis (2)", "Loss of Consciousness (Ensefalopati (3B), Ensefalopati Hipertensi (3B), Koma (3B))", "Parkinson's Disease & Dementia (3A)", "SDH (2), EDH (2), Tumor Cerebri (Primer, Sekunder, Neurofibromatosis) (2)", "Epilepsi (3A) & Kejang (3B), Kejang Demam (4B), Status Epileptikus (3B)", "Disorder of Vestibular Sistem (BBPV (4A), Menier Disease (3A))", "Neuroinfeksi 1 (Meningitis (3B), Ensefalitis (3B), Malaria serebral (3B), Tetanus (4A))", "Neuroinfeksi 2 (HIV/AIDS (4A), Poliomyelitis (3B), HIV/AIDS pada system syaraf (3A), CMV (2) Toksoplasmosis Rabies (3B), Spondilytis (3A)", "GBS (3B), Myastenis gravis (3B)", "CTS (3A), TTS (3A), Peroneal Palsy (3A), Bells Palsy (4A)", "Hemorrhagic Stroke (SAH and ICH) (3B); TIA and stroke infark", "Rehabilitasi Saraf (Neuroplasticity; Rehab lesi saraf perifer)", "Rehabilitasi Kardiorespirasi & rehab luka bakar", "Rehabilitasi Muskuloskeletal (Tirah baring lama; Ankle sprain, OA Genu;Neck & Back Pain)", "Psikotik Fungsional & Organik", "Psikogeriatri & Perawatan Akhir Hayat", "Gangguan Mood (Depresi-Baby Blues & Bipolar-Depresi Post Partum Mania); Gangguan Cemas (F41.1-F41.2-Gangguan panic-Gangguan TIC-Reaksi stress akut)", "Psikiatri Kultural, Psikiatri Sosial, Psikiatri Rehab & Forensik; Psikiatri Emergency, KDRT-Psikiatri Bencana", "Gangguan Perkembangan Pervasif-RM-GTL-ADHD;Gangguan Tidur Insomnia-Hipersomia", "Gangguan Somatoform-OCD-Trikotilomania; Kelainan Disfungsi Seksual (Gangguan Gairan-Gangguan Orgasme-ED-Sexual Pain)", "Napza (Intoksikasi akut zat psikoaktif-PTRIM-Adiksi)"],
      },
      {
        name: "Kedokteran Tropis",
        chapters: ["Karakteristik dan siklus hidup Parasit", "Karakteristik dan siklus hidup serta respon imun terhadap Virus", "Respon imun terhadap Fungal infection", "Faktor lingkungan &Aspek genetik penyakit infeksi & Sociobehavioral aspect of infection", "Vector borne disease & Infeksi Dengue", "TB Anak & Modalitas diagnostik TB", "Mikrobiologi Water Sanitation", "Survey & Identification Dengue Vector", "Communication in the Community", "Clinical Tropical Disease & Related Management", "Gangguan Gizi dan penyakit tropis", "Campak dan Rubella", "Leptospirosis & Ricketsia", "Penyakit kulit tropik (Bakteri, Virus, dan Fungal)", "Travel Medicine & Pediatric congenital infection of malaria"],
      },
      {
        name: "Tramed 4",
        chapters: ["IM IV", "Rawat Luka", "Resusitasi neonatus", "Resusitasi anak", "Infus", "Pemasangan NGT", "REVIEW TRAMED 4"],
      },
      {
        name: "GELS 2",
        chapters: ["Integrated Emergency Medical System", "Risk Analysis & Hazard Mapping", "Pre-Hospital Management & Transportasi Korban", "Manajemen Korban di RS & Sistem Rujukan", "Surveillance Praktis dalam Bencana & Manajemen Lingkungan, Pengungsi & Secondary Disaster", "Penguatan Resiliensi Masyarakat", "Post Traumatic Stress Disorder", "Koordinasi Lintas Sektor , Klaster Kesehatan & Emergency Medical Team"],
      },
      {
        name: "IKM-KP 2",
        chapters: ["Konsep Penanggulangan Penyakit Menular & Tidak Menular", "Penyakit Karantina, Wabah & KLB", "PMS, HIV/AIDS, Campak, Polio & Zoonosis", "Emerging & Re-Emerging Infectious Disease", "Masalah Gizi Makro & Masalah Gizi Sindroma Metabolik", "Masalah Gizi Mikro", "Ergonomi & Toksikologi", "Penyakit Akibat Kerja & Sistem Manajemen K3", "Perubahan Perilaku Kesehatan"],
      },
      {
        name: "Forensik dan medikolegal",
        chapters: ["Toksikologi Forensik Dan Barang Bukti", "Aborsi", "KDRT", "Asfiksia dan Tenggelam", "Trauma Kimia, Deskripsi Luka, dan Infanticide", "Luka Akibat Benda Tajam dan Tumpul", "TKP dan Ekshumasi", "Aspek Hukum Kesehatan", "DVI dan Prosedur Medikolegal", "Surat Keterangan Medis dan Visum et Repertum", "Forensik Klinik"],
      },
      {
        name: "Ilmu Bedah",
        chapters: ["Kasus infeksi di bidang Bedah , Shock perdarahan, luka dan penyembuhan luka", "Trauma maksilofasial, tumor leher, tiroid dan Karsinoma Rongga Mulut", "Kelainan lambung dan esophagus, duodenum dan usus halus & Hernia", "Kelainan pada hati, pankreas, empedu", "Kegawat Daruratan abdomen, trauma abdomen dan appendisitis & Kelainan Bedah pada kolon, rektum dan usus", "Kelainan kongenital GI tract anak dan Kedaruratan pada bayi dan anak", "Kelainan-kelainan payudara dan aspek Onkologi pada payudara & Kelainan kulit jaringan lunak Bedah Onkologi", "Aspek Bedah Toraks dan paru Kasus trauma dan non trauma & Aspek Bedah jantung Kasus trauma dan non trauma", "Bedah Vaskular- Arteri/vena, Kasus trauma dan non trauma", "Pemeriksaan fisik dasar kelainan Orthopaedi dan infeksi / inflamasi & Kelainan kongenital / Pediatrik Orthopaedi", "Traumatologi / fraktur dislokasi & Neoplasma jaringan tulang", "Pemeriksaan dasar kasus Urologi, bath kemih, infertilitas pria & Kelainan kongenital traktus Urogenitas", "BPH, Karsinoma, prostat, tumor Urogenitas & Trauma saluran kemih, disfungsi ereksi", "Trauma dan proses degeneratif myelum dan saraf tepi & Patofisiologi dan penatalaksanaan trauma kepala", "Trauma kepala anak dan hidrosefalus malformasi kongenital sistem saraf", "Dasar – dasar Bedah Plastik & Penyakit – penyakit Kongenital Bedah Plastik", "Luka bakar dan perawatan luka & Cheilognato Palatoshiziz, Skin Graft dan Flap"],
      },
      {
        name: "Obgyn",
        chapters: ["Hipertensi dalam kehamilan", "Infertilitas dan Kontrasepsi", "Perdarahan Pasca Salin", "Tumor Organ Reproduksi dan Bedah Ginekologi", "Kanker Ginekologi", "Antenatal care dan kehamilan resiko tinggi", "Lesi Prakanker", "Gangguan pada kehamilan (KPD,IGR,PRETERM,POSTERM)", "Fisiologi dan gangguan haid", "Asesmen antepartum dan fetal imaging, Infeksi pada kehamilan dan nifas", "Distosia dan Bedah Kebidanan", "Persalinan Normal", "Fisiologi haid dan Gangguan haid", "Prolaps Organ Panggul, Kista Vulva Vagina dan Rupture Perineum", "Pemeriksaan Ginekologi Dasar"],
      },
      {
        name: "Ilmu Penunjang Klinik",
        chapters: ["Dasar Anestesi Umum & Toksisitas Obat Lokal Anestesi, Manajemen, Efek Samping", "Persiapan Pasien Preoperative Elektif dan Emergency & Farmakologi Obat Anestesi dan Gawat Darurat", "Asam Basa dan Kegawatan Nafas dan Sirkulasi & Kegawatan Sirkulasi dan macam macam syok", "Dasar Pengelolaan pasien gawat darurat & Kegawatan Nafas dan terapi Oksigen", "Resusitasi Jantung Paru Otak (Advance Life Support) & Konsep ICU dan Monitoring dan Perawatan Pasien Kritis di ICU", "Patofisiologi Nyeri Akut, Kronik dan Burn pada dewasa, pediatri dan neonatus", "Terapi Cairan dan Transfusi pada Kondisi Gawat Darurat dan Perioperative & Terapi Cairan dan Transfusi pada Kondisi Gawat Darurat dan Perioperative", "Manajemen Nyeri Akut, Kronik dan Burn pada dewasa, pediatri dan neonatus", "Dasar dan Modalitas Radiologi & Thyroid, Sinus paranasalis, telinga tengah", "Fraktur, Dislokasi dan Neoplasma & Radiologi Imejing Urologi / Genetalia Laki-laki", "Stroke, Infeksi dan Tumor & Anatomi dan Trauma Otak", "Penyakit Gastrointestinal Umum & Skrining dan diagnosis keganasan payudara dan organ reproduksi wanita", "Penyakit Paru – Umum & Kelainan Sendi, Osteomyelitis", "Radiologi / Imejing Thoraks - kardiovaskuler & Kegawatdaruratan Gastrointestinal", "Radiologi Kasus Kegawatdaruratan Pada Foto Polos Thorax & Penyakit Hepatobilier"],
      },
      {
        name: "CCS (tramed)",
        chapters: ["Insisi Abses", "Eksisi Lipoma", "Colok Dubur/ RT", "Teknik Imunisasi", "IVA & PAP SMEAR", "IUD & IMPLAN", "REVIEW CCS"],
      },
      {
        name: "Ilmu Penyakit Indera",
        chapters: ["Kelainan Kelopak, Konjungtiva & Lakrimal", "Retina, Saraf Optik & Uvea", "Glaukoma, Katarak & Bedah Refraktif", "Trauma Mata & Kelainan Refraksi", "Mata Anak & Sindroma Mata Kering", "Telinga & Vestibular", "Hidung & Sinus", "Faring, Laring & Mulut", "Tumor Kepala-Leher", "Dasar Dermatologi & Infeksi Kulit", "Penyakit Kolagen & Imunologi", "Tumor Kulit & PMS", "Dermatitis, Pigmen & Rambut", "Dermatosis Kronik & Genetik", "Dermatoterapi"],
      },
      {
        name: "Penelitian 1",
        chapters: ["Dasar dasar penelitian", "Penulisan Introduction", "Penulisan Tinjauan Pustaka", "Penulisan Kerangka Konseptual", "Penulisan Metodologi", "Etika Penelitian dan Penyusunan Laporan"],
      },
      {
        name: "Penelitian 2",
        chapters: ["Strategi Publikasi Ilmiah", "Menghadapi Editor & Reviewer", "Repositori & Manajemen Referensi", "Penyusunan Hasil Penelitian", "Metode Analisis Data", "Penyusunan Makalah Ilmiah"],
      },
    ];

    // 2. find-or-create semua 37 mata kuliah (buat ulang yang terhapus).
    //    order hanya di-set saat membuat baru, supaya urutan hasil reorder
    //    manual admin tidak tertimpa.
    const subjectRecords = {};
    CURRICULUM.forEach((item, idx) => {
      let rec;
      try {
        rec = app.findFirstRecordByFilter("subjects", "name = {:n}", { n: item.name });
      } catch (_) {
        rec = new Record(subjects);
        rec.set("name", item.name);
        rec.set("order", idx + 1);
        app.save(rec);
      }
      subjectRecords[item.name] = rec;
    });

    // 3. Kembalikan 7 BAB yang sempat dipindah dari "Endokrin" ke "Patologi
    //    Klinik", dan hapus BAB liar "Endokrin" yang dibuat migration penyempit.
    const endokrin = subjectRecords["Endokrin"];
    const klinik = subjectRecords["Patologi Klinik"];
    if (endokrin && klinik) {
      MOVED_BACK_TO_ENDOKRIN.forEach((title, i) => {
        try {
          const ch = app.findFirstRecordByFilter(
            "chapters",
            "title = {:t} && subject = {:s}",
            { t: title, s: klinik.id },
          );
          ch.set("subject", endokrin.id);
          ch.set("order", i + 1);
          ch.set("guestAccessible", i === 0);
          app.save(ch);
        } catch (_) {}
      });
      try {
        const stray = app.findFirstRecordByFilter(
          "chapters",
          "title = 'Endokrin' && subject = {:s}",
          { s: klinik.id },
        );
        app.delete(stray);
      } catch (_) {}
    }

    // 4. find-or-create semua BAB untuk semua mata kuliah (buat ulang yang hilang).
    CURRICULUM.forEach((item) => {
      const rec = subjectRecords[item.name];
      if (!rec) return;
      item.chapters.forEach((title, ci) => {
        try {
          app.findFirstRecordByFilter(
            "chapters",
            "title = {:t} && subject = {:s}",
            { t: title, s: rec.id },
          );
        } catch (_) {
          const ch = new Record(chapters);
          ch.set("title", title);
          ch.set("subject", rec.id);
          ch.set("order", ci + 1);
          ch.set("guestAccessible", ci === 0);
          app.save(ch);
        }
      });
    });
  },
  (_app) => {
    // Tidak ada rollback — memulihkan data tidak boleh dibatalkan otomatis.
  },
);
