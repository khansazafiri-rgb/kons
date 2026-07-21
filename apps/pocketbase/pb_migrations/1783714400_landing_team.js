/// <reference path="../pb_data/types.d.ts" />

// Collection "landing_team": data Tim Pengajar & Management yang tampil di
// landing page, kini bisa DITAMBAH / DIEDIT / DIHAPUS lewat panel admin
// (sebelumnya hardcoded di apps/web/src/data/team.js).
//
// - kind = "teacher" -> kartu Tim Pengajar (pakai bidang + achievements)
// - kind = "manager" -> kartu Tim Manager (pakai category + quote)
//
// Seed di bawah memindahkan seluruh data lama dari team.js ke database supaya
// tidak ada yang hilang. Seed hanya jalan sekali (kalau collection masih kosong).

const KATEGORI_MANAGER = ["Executive Board","HRD & Project Division","Operational Division","Marketing Division"];

const SEED = [
  {
    "kind": "teacher",
    "name": "dr. Muhammad Yasir Syafa'atulloh",
    "photo": "https://lh3.googleusercontent.com/d/15Uce3u8_0Ku-BQjGcjaojFwJ8fn83P5W",
    "bidang": "Olimpiade Bidang Infeksi Tropis, All Basic Medical Science, All Clinical Medicine",
    "achievements": [
      "Gold Medalist (Highest Score) and 2nd Runner Up of 9th Chiang-Mai University International Medical Challenge (CMU-IMC) 2024 : Basic to Clinical Infectious Diseases, Chiang Mai, Thailand",
      "Gold Medalist and 1st Runner Up of 12th Siriraj International Medical Microbiology, Parasitology, and Immunology Competition (SIMPIC) 2023 and 2 Individual Medals (2 Silver Medals) of the 11th and 13th SIMPIC, Bangkok, Thailand",
      "1st Winner RMO Tropical Infection Branch 2022, Indonesia"
    ],
    "category": "",
    "quote": "",
    "instagram": "https://instagram.com/yasirsyafa",
    "order": 0
  },
  {
    "kind": "teacher",
    "name": "Deva Fitra Firdausa Anwar S.Ked",
    "photo": "https://lh3.googleusercontent.com/d/1l-jKjbXHTmdjFXpRkNbFfrLSiH0WBP0Z",
    "bidang": "Olimpiade Bidang Muskuloskeletal, Olimpiade Bidang Faal, Olimpiade Bidang Anatomi, All Basic Medical Science, All Clinical Medicine",
    "achievements": [
      "3 Medal Winner (2 Gold & 1 Silver Medals) RMO-IMO Musculoskeletal Branch 2024-2025, Indonesia",
      "2nd Winner Chiang-Mai University International Medical Challenge (CMU-IMC) 2023 : Basic to Clinical Anatomy, Chiang Mai, Thailand",
      "1st Winner & Top 5 Individuals Indonesian Medical Physiology Olympiad (IMPhO) 2023, Surabaya, Indonesia"
    ],
    "category": "",
    "quote": "",
    "instagram": "https://instagram.com/deva_fitra",
    "order": 1
  },
  {
    "kind": "teacher",
    "name": "dr. Achmad Rifai",
    "photo": "https://lh3.googleusercontent.com/d/1gQR7cfW321IDSNp3OEMeUrZZ1N9iVHAH",
    "bidang": "Olimpiade Bidang Infeksi Tropis, All Basic Medical Science, All Clinical Medicine",
    "achievements": [
      "2nd Winner and Bronze Individual Medalist of the 14th Siriraj International Medical Microbiology, Parasitology, and Microbiology Competition (SIMPIC) 2025 in Mahidol, Thailand",
      "3rd Runner Up Chiang-Mai University International Medical Challenge (CMU-IMC) 2024 : Basic to Clinical Infectious Diseases, Chiang Mai, Thailand",
      "2 Medal Winner (2 Gold Medals) RMO-IMO Tropical Infection Branch 2023, Indonesia"
    ],
    "category": "",
    "quote": "",
    "instagram": "https://instagram.com/ach.rifai16",
    "order": 2
  },
  {
    "kind": "teacher",
    "name": "Khafiyah Hikmah S.Ked",
    "photo": "https://lh3.googleusercontent.com/d/16vgfyazZTuA-UxN-fDvstPKKD_-V7cfQ",
    "bidang": "Olimpiade Bidang Digestif, All Basic Medical Science, All Clinical Medicine",
    "achievements": [
      "Top 10 Batch Faculty of Medicine Universitas Airlangga Batch 2021 Subprogram I & II",
      "2 Medal Winner (1 Gold & 1 Bronze Medals) RMO-IMO Tropical Infection Branch 2024, Indonesia",
      "2nd Winner Medsmotion Medical Olympiad 2024, Surakarta, Indonesia"
    ],
    "category": "",
    "quote": "",
    "instagram": "https://instagram.com/khafiyahh_r",
    "order": 3
  },
  {
    "kind": "teacher",
    "name": "dr. Yosi Yohanes",
    "photo": "https://lh3.googleusercontent.com/d/1qPplZ5jjwJwhkmyuaBfIc_3OnKce8N9d",
    "bidang": "All Ilmiah",
    "achievements": [
      "Certified Member of Cochrane Collaboration, UK + Research Assistant Rheumatology Division Internal Medicine Department RSCM-RSUI",
      "+20 National and International awards and honors",
      "5 Scopus-indexed publications (Q1-Q3) + Invited peer reviewer for Q1 journal Frontiers Open + Judge for 5+ Scientific Competitions"
    ],
    "category": "",
    "quote": "",
    "instagram": "https://instagram.com/yosiyohanes",
    "order": 4
  },
  {
    "kind": "teacher",
    "name": "Illoney Nindya Kamila S.Ked",
    "photo": "https://lh3.googleusercontent.com/d/1vD7L_LCM53VOLTR34UpVDVbYTmy5zzou",
    "bidang": "Olimpiade Bidang Infeksi Tropis, All Basic Medical Science, All Clinical Medicine",
    "achievements": [
      "2nd Winner and Silver Individual Medalist of the 14th Siriraj International Medical Microbiology, Parasitology, and Microbiology Competition (SIMPIC) 2025 in Mahidol, Thailand",
      "4 Medal Winner (3 Gold & 1 Silver Medals) RMO-IMO Tropical Infection Branch 2023-2024, Indonesia",
      "3rd Runner Up Chiang-Mai University International Medical Challenge (CMU-IMC) 2024 : Basic to Clinical Infectious Diseases, Chiang Mai, Thailand"
    ],
    "category": "",
    "quote": "",
    "instagram": "https://instagram.com/illoneyn",
    "order": 5
  },
  {
    "kind": "teacher",
    "name": "Zaskia Nafisa Salma S.Ked",
    "photo": "https://lh3.googleusercontent.com/d/1HboUnLg_I3GTA4xe1i8HEuYpCDYha4dw",
    "bidang": "Olimpiade Bidang Kardiologi-Respiratori, Olimpiade Bidang Faal, Olimpiade Bidang Anatomi, All Basic Medical Science, All Clinical Medicine",
    "achievements": [
      "2 Medal Winner (2 Gold Medals) RMO Cardiology-Respiratory Branch 2025, Indonesia",
      "3rd Winner & Top 10 Individuals Indonesian Medical Physiology Olympiad (IMPhO) 2025, Surabaya, Indonesia",
      "The Best Strategy Award AORTA National Anatomy Olympiad 2024, Makassar, Indonesia"
    ],
    "category": "",
    "quote": "",
    "instagram": "https://instagram.com/zaskiansalma",
    "order": 6
  },
  {
    "kind": "teacher",
    "name": "Christalenta Renata Dwi Aristawati S.Ked",
    "photo": "https://lh3.googleusercontent.com/d/1qhEYdxF4xx7z21Dpn7DcT2yrDK1LXwJL",
    "bidang": "Olimpiade Bidang Infeksi Tropis, All Basic Medical Science, All Clinical Medicine",
    "achievements": [
      "1st Winner and Bronze Individual Medalist of the 14th Siriraj International Medical Microbiology, Parasitology, and Microbiology Competition (SIMPIC) 2025 in Mahidol, Thailand",
      "3 Medal Winner (2 Gold & 1 Bronze Medals) RMO-IMO Tropical Infection Branch 2025, Indonesia",
      "3 Place Winner of Medical Olympiad in Travel Health Scientific"
    ],
    "category": "",
    "quote": "",
    "instagram": "https://instagram.com/christalenta",
    "order": 7
  },
  {
    "kind": "teacher",
    "name": "Emilda Puteri Aulia S.Ked",
    "photo": "",
    "bidang": "Olimpiade Bidang Urologi-Reproduksi, Olimpiade Bidang Faal & Farmakologi, Olimpiade ON-MIPA Bidang Kimia, All Basic Medical Science, All Clinical Medicine",
    "achievements": [
      "3 Medal Winner (3 Silver Medals) ON-MIPA Chemistry 2023-2025, Indonesia",
      "2nd Winner RMO Urology-Reproduction Branch 2025, Indonesia & 2nd Winner LUMOS National Pharmacology Olympiad 2024, Banjarmasin, Indonesia",
      "Cast Clash of Champions (CoC) by Ruangguru Season 1 2024"
    ],
    "category": "",
    "quote": "",
    "instagram": "https://instagram.com/emildaulia",
    "order": 8
  },
  {
    "kind": "teacher",
    "name": "Alexandrena Maive",
    "photo": "https://lh3.googleusercontent.com/d/1vO5shtDjNmmaLRPIUZPPB2YC5Al3Ys07",
    "bidang": "Olimpiade Bidang Neurologi-Psikiatri, Olimpiade Bidang Urologi-Reproduksi, Olimpiade Bidang Faal, Olimpiade Bidang Anatomi, All Basic Medical Science, All Clinical Medicine",
    "achievements": [
      "2 Medal Winner (1 Gold & 1 Silver Medal) RMO-IMO Neurology-Psychiatry Branch 2025, Indonesia",
      "1st Winner Homeostasis National Physiology Olympiad 2026, Makassar, Indonesia",
      "1st Winner Minerfa National Physiology and Anatomy Olympiad 2024, Padang, Indonesia"
    ],
    "category": "",
    "quote": "",
    "instagram": "https://instagram.com/alex.maive",
    "order": 9
  },
  {
    "kind": "teacher",
    "name": "dr. Marselia Sihotang",
    "photo": "",
    "bidang": "Olimpiade Bidang Neuropsikiatri, Olimpiade SIMPIC, All Basic Medical Science, All Clinical Medicine",
    "achievements": [
      "2nd Winner and Bronze Individual Medalist of the 12th Siriraj International Medical Microbiology, Parasitology, and Microbiology Competition (SIMPIC) 2023 in Mahidol, Thailand",
      "1st winner TELESCOPIA Quiz on Celebrating world AIDS Day by CIMSA UNAIR",
      "Top 5 CBT & OSCE UKMPPD FK UNAIR Batch Februari 2024"
    ],
    "category": "",
    "quote": "",
    "instagram": "",
    "order": 10
  },
  {
    "kind": "teacher",
    "name": "dr. Nurlinah Amalia",
    "photo": "",
    "bidang": "All Ilmiah",
    "achievements": [
      "Best IPK dan CBT UKMPPD November 2025 ~ Doctor Oath UB",
      "Research Assistant Rheumatology Division Internal Medicine RSCM-RSUI & Gastroenterohepatology Division Internal Medicine RSSA",
      "30+ Scopus Indexed Scientific Publications + Invited Reviewer Scopus Q1 BMJ Open + Judge for 5+ Scientific Competitions"
    ],
    "category": "",
    "quote": "",
    "instagram": "https://instagram.com/lina_maxlin",
    "order": 11
  },
  {
    "kind": "teacher",
    "name": "dr. Garuda Nusantara Putra Utomo",
    "photo": "https://lh3.googleusercontent.com/d/1RELI8Yr2Ruu4NNIXubELjs4kIK1BN-qR",
    "bidang": "Olimpiade Bidang Infeksi Tropis, All Basic Medical Science, All Clinical Medicine",
    "achievements": [
      "Bronze Medalist and 2nd Runner Up of 9th Chiang-Mai University International Medical Challenge (CMU-IMC) 2024 : Basic to Clinical Infectious Diseases, Chiang Mai, Thailand",
      "Silver Medalist and 1st Runner Up of 12th Siriraj International Medical Microbiology, Parasitology, and Immunology Competition (SIMPIC) 2023 and 2 Individual Medals (1 Silver & 1 Bronze Medals) of 11th and 13th SIMPIC, Bangkok, Thailand",
      "1st Winner RMO Tropical Infection Branch 2022, Indonesia"
    ],
    "category": "",
    "quote": "",
    "instagram": "https://instagram.com/garuda.npu",
    "order": 12
  },
  {
    "kind": "teacher",
    "name": "dr. Ali Mustofa",
    "photo": "https://lh3.googleusercontent.com/d/1sW5SJ3zV9tQtfLbljbeMKcDiMrPIIvFO",
    "bidang": "Olimpiade Bidang Digestif, All Basic Medical Science, All Clinical Medicine",
    "achievements": [
      "1st Winner IMO Gastroenterology Branch 2023, Indonesia",
      "10+ Publications and Scientific Essay Competitions",
      "Faculty of Medicine Universitas Airlangga: Cardiovascular Research Team—Research Assistant"
    ],
    "category": "",
    "quote": "",
    "instagram": "https://instagram.com/ali.mustofa._",
    "order": 13
  },
  {
    "kind": "teacher",
    "name": "dr. Jeremi Christianto Jalil Tanggulungan",
    "photo": "https://lh3.googleusercontent.com/d/1ZXyARtDtrsW1OC27e4_J_2bC3qiw4O7y",
    "bidang": "Olimpiade Bidang Muskuloskeletal, Olimpiade Bidang Anatomi, All Basic Medical Science, All Clinical Medicine",
    "achievements": [
      "Bronze Individual Medalist Chiang-Mai University International Medical Challenge (CMU-IMC) 2023 : Basic to Clinical Anatomy, Chiang Mai, Thailand",
      "3 Medal Winner (3 Gold Medals) RMO Musculoskeletal Branch 2021-2023, Indonesia",
      "2nd Winner Medstar’s National Anatomy Competition 2022"
    ],
    "category": "",
    "quote": "",
    "instagram": "https://instagram.com/jeremichristianto_",
    "order": 14
  },
  {
    "kind": "teacher",
    "name": "Marcellino Maatita S.Ked",
    "photo": "https://lh3.googleusercontent.com/d/1aLkhvdXIuodlWhWFWmbWNMl627hS2tgQ",
    "bidang": "All Ilmiah",
    "achievements": [
      "Third Runner-Up of the National Outstanding Student Award 2025, Indonesia and 20+ Competition Achievements in Research and Essay Competitions",
      "Third Place, Scientific Paper, Pre-Conference Competition, Asian Medical Students’ Conference (AMSC) 2024, AMSA-International",
      "First Place, National Research Paper Competition (NRPC) 2023, AMSA-Indonesia"
    ],
    "category": "",
    "quote": "",
    "instagram": "https://instagram.com/marcellinomaatita",
    "order": 15
  },
  {
    "kind": "teacher",
    "name": "Syauqie Alifian Wandhara S.Ked",
    "photo": "https://lh3.googleusercontent.com/d/16FSN6M2-L06rqQDmdSPdjxsfowtTXJrA",
    "bidang": "Olimpiade Bidang Muskuloskeletal, Olimpiade Bidang Faal & Farmakologi, Olimpiade Bidang Anatomi, Olimpiade Bidang Patologi Anatomi, All Basic Medical Science, All Clinical Medicine",
    "achievements": [
      "1st Winner AORTA National Anatomy Olympiad 2024, Makassar, Indonesia",
      "2 Medal Winner (1 Gold & 1 Silver Medals) RMO-IMO Musculoskeletal Branch 2024, Indonesia",
      "2nd Winner Indonesian Medical Physiology Olympiad (IMPhO) 2023, Surabaya, Indonesia"
    ],
    "category": "",
    "quote": "",
    "instagram": "https://instagram.com/syauqie_alfian",
    "order": 16
  },
  {
    "kind": "teacher",
    "name": "Fathiy Zakariya A. S.Ked",
    "photo": "https://lh3.googleusercontent.com/d/1lshi7lSv9ycUr2FY83WCRTC52hzH0G7V",
    "bidang": "Olimpiade Bidang Infeksi Tropis, All Basic Medical Science, All Clinical Medicine",
    "achievements": [
      "2 Medal Winner (1 Gold & 1 Silver Medals) RMO-IMO Tropical Infection Branch 2024, Indonesia",
      "Silver Medal World Science, Environment, and Engineering Competition (WSEEC) 2024",
      "2nd Place Educational Video Competition Indonesian Medical Students Training and Competition (IMSTC) AMSA-Indonesia 2023"
    ],
    "category": "",
    "quote": "",
    "instagram": "https://instagram.com/fathz.aslama",
    "order": 17
  },
  {
    "kind": "teacher",
    "name": "Tiffney Tyara Setyoko",
    "photo": "https://lh3.googleusercontent.com/d/1bKiUbSB16VVV-hZqPHjNPDZlbE13TdYR",
    "bidang": "Olimpiade Bidang Muskuloskeletal, Olimpiade Bidang Anatomi, All Basic Medical Science, All Clinical Medicine",
    "achievements": [
      "Most Outstanding Student Universitas Pelita Harapan, 2025",
      "1st Winner RMO Musculoskeletal Branch 2025, Indonesia",
      "2nd Winner Oral Presentation - Siloam Neuroscience Summit 2025"
    ],
    "category": "",
    "quote": "",
    "instagram": "https://instagram.com/tifffsetyoko_",
    "order": 18
  },
  {
    "kind": "teacher",
    "name": "Michael Purnama",
    "photo": "",
    "bidang": "Olimpiade Bidang Digestif, Olimpiade Bidang Urologi-Reproduksi, Olimpiade Bidang Faal, All Basic Medical Science, All Clinical Medicine",
    "achievements": [
      "2 Medal Winner (2 Gold Medals) RMO-IMO Gastroenterology Branch 2025, Indonesia",
      "Top 4 Individuals Indonesian Medical Physiology Olympiad (IMPhO) 2024, Surabaya, Indonesia",
      "Cast Clash of Champions (CoC) by Ruangguru Season 2 2025"
    ],
    "category": "",
    "quote": "",
    "instagram": "https://instagram.com/michael_purnama",
    "order": 19
  },
  {
    "kind": "teacher",
    "name": "Anthony Camilo Lim S.Ked",
    "photo": "https://lh3.googleusercontent.com/d/10QDR_ybWcvvNiMg6iscLUmDAciTCDshc",
    "bidang": "Olimpiade Bidang Kardiologi-Respiratori, All Basic Medical Science, All Clinical Medicine",
    "achievements": [
      "1st Winner IMO Cardiology-Respiratory Branch 2025, Indonesia",
      "1st Winner RMO Cardiology-Respiratory Branch 2025, Indonesia",
      "3rd Winner RMO Cardiology-Respiratory Branch 2024, Indonesia"
    ],
    "category": "",
    "quote": "",
    "instagram": "https://instagram.com/limcamilo09",
    "order": 20
  },
  {
    "kind": "teacher",
    "name": "Fatih Ismail S.Ked",
    "photo": "https://lh3.googleusercontent.com/d/1eLuhGUnXe3y2pR_XbEtBLdzXeDs_k-O9",
    "bidang": "Olimpiade Bidang Neurologi-Psikiatri, All Basic Medical Science, All Clinical Medicine",
    "achievements": [
      "1st Winner Literature Review Category FASCIA 2025, Surabaya, Indonesia",
      "2nd Winner RMO Neurology-Psychiatry Branch 2024, Indonesia",
      "1st Winner MMO Neurology-Psychiatry Branch 2024, Indonesia"
    ],
    "category": "",
    "quote": "",
    "instagram": "https://instagram.com/alfatih_mi",
    "order": 21
  },
  {
    "kind": "teacher",
    "name": "M. Nabiel Firdausi S.Ked",
    "photo": "https://lh3.googleusercontent.com/d/1hG13ythyuwzb7HN5I1cIiBX7aurcPGET",
    "bidang": "Olimpiade Bidang Infeksi Tropis, Olimpiade Bidang Faal, All Basic Medical Science, All Clinical Medicine",
    "achievements": [
      "2 Medal Winner (1 Silver & 1 Bronze Medal) RMO-IMO Tropical Infection Branch 2025, Indonesia",
      "1st Winner Minerfa National Physiology and Anatomy Olympiad 2024, Padang, Indonesia",
      "1st Winner Indonesian Medical Physiology Olympiad (IMPhO) 2023, Surabaya, Indonesia"
    ],
    "category": "",
    "quote": "",
    "instagram": "https://instagram.com/nabiel.f",
    "order": 22
  },
  {
    "kind": "teacher",
    "name": "Dhiya' Ulhaq",
    "photo": "https://lh3.googleusercontent.com/d/1pMQXQ-W4HDggmq2Cw9b2HN_OnGnvUEu3",
    "bidang": "Olimpiade Bidang Faal & Farmakologi, Olimpiade ON-MIPA Bidang Biologi, All Basic Medical Science, All Clinical Medicine",
    "achievements": [
      "Top 8 Individuals Indonesian Medical Physiology Olympiad (IMPhO) 2025, Surabaya, Indonesia",
      "1st Winner LUMOS National Pharmacology Olympiad 2024, Banjarmasin, Indonesia",
      "Gold Medal ON-MIPA Biology 2025, Indonesia"
    ],
    "category": "",
    "quote": "",
    "instagram": "https://instagram.com/dhiyaulhwq",
    "order": 23
  },
  {
    "kind": "teacher",
    "name": "Ave Zangkila Langit",
    "photo": "https://lh3.googleusercontent.com/d/1MD7BzfLg_us35Uoh0pg_X3tR4Am6Gn3x",
    "bidang": "Olimpiade Bidang Faal, All Basic Medical Science, All Clinical Medicine",
    "achievements": [
      "1st Winner Homeostasis National Physiology Olympiad 2026, Makassar, Indonesia",
      "1st Winner Indonesian Medical Physiology Olympiad (IMPhO) 2025, Surabaya, Indonesia",
      "Top 1 Individuals Indonesian Medical Physiology Olympiad (IMPhO) 2025, Surabaya, Indonesia"
    ],
    "category": "",
    "quote": "",
    "instagram": "https://instagram.com/avezangkila",
    "order": 24
  },
  {
    "kind": "teacher",
    "name": "Muhammad Anthony Maulana",
    "photo": "https://lh3.googleusercontent.com/d/1Xfk4bKkgKebhoIR6N1Rn94fn9KirN87H",
    "bidang": "Olimpiade Bidang Muskuloskeletal, Olimpiade Bidang Faal, Olimpiade Bidang Anatomi, All Basic Medical Science, All Clinical Medicine",
    "achievements": [
      "1st Winner Homeostasis National Physiology Olympiad 2026, Makassar, Indonesia",
      "2nd Winner AORTA National Anatomy Olympiad 2025, Makassar, Indonesia",
      "3rd Winner RMO Musculoskeletal Branch 2025, Indonesia"
    ],
    "category": "",
    "quote": "",
    "instagram": "https://instagram.com/m.anthony_m",
    "order": 25
  },
  {
    "kind": "teacher",
    "name": "Ichsan Abdillah S.Ked",
    "photo": "https://lh3.googleusercontent.com/d/1AsFGFa2NTRv9B8JCry_uMfqF32V9oPr8",
    "bidang": "Olimpiade Bidang Digestif, All Basic Medical Science, All Clinical Medicine",
    "achievements": [
      "3rd Winner IMO Gastroenterology Branch 2024, Indonesia",
      "1st Winner RMO Gastroenterology Branch 2024, Indonesia",
      "2nd winner of Educational Video Competition, Indonesia Medical Student Training and Competition 2023 by AMSA-Indonesia"
    ],
    "category": "",
    "quote": "",
    "instagram": "https://instagram.com/ichsanam_",
    "order": 26
  },
  {
    "kind": "teacher",
    "name": "Nathaniel Suyanto S.Ked",
    "photo": "https://lh3.googleusercontent.com/d/1mbfZCijUxUYpfSHjCJ73oM93pNkfjB2l",
    "bidang": "Olimpiade Bidang Neurologi-Psikiatri, Olimpiade Bidang Faal, Olimpiade Anatomi, All Basic Medical Science, All Clinical Medicine",
    "achievements": [
      "2 Medal Winner (1 Gold & 1 Silver Medal) RMO-IMO Bidang Neurology-Psychiatry Branch 2025, Indonesia",
      "1st Winner Indonesian Medical Physiology Olympiad (IMPhO) 2025, Surabaya, Indonesia",
      "1st Winner & Top 3 Individuals Minerfa National Physiology and Anatomy Olympiad, Padang, Indonesia"
    ],
    "category": "",
    "quote": "",
    "instagram": "https://instagram.com/nath_el_75",
    "order": 27
  },
  {
    "kind": "teacher",
    "name": "Stephen Hilkia Pramatya S.Ked",
    "photo": "https://lh3.googleusercontent.com/d/14qy8a4LcY6OEXQYiE4zEVewYxxVTYDIK",
    "bidang": "All Basic Medical Science, All Clinical Medicine",
    "achievements": [
      "2 Articles Published at Q1 Scopus Journal Publications as First Author",
      "Oral Presentation The International Conference on Recent Advances in Neurotraumatology 2025",
      "Finalist Inhescom 2024"
    ],
    "category": "",
    "quote": "",
    "instagram": "https://instagram.com/stephenprm",
    "order": 28
  },
  {
    "kind": "teacher",
    "name": "Allysa Aditya",
    "photo": "https://lh3.googleusercontent.com/d/19O1p3AQb5Eaq2S8vZSTfEsRgOeZKRgvg",
    "bidang": "Olimpiade Bidang Muskuloskeletal, Olimpiade Bidang Faal, All Basic Medical Science, All Clinical Medicine",
    "achievements": [
      "Best Student Top 10 Batch Faculty of Medicine Universitas Airlangga Batch 2023 Subprogram II",
      "2nd Winner IMO Musculoskeletal Branch 2025, Indonesia",
      "1st Winner RMO Musculoskeletal Branch 2025, Indonesia"
    ],
    "category": "",
    "quote": "",
    "instagram": "https://instagram.com/allysaaditya",
    "order": 29
  },
  {
    "kind": "teacher",
    "name": "dr. Sofia Zahra Kamila",
    "photo": "https://lh3.googleusercontent.com/d/1rG_UEHuRL65Ap3pU2xJym4yQFaiTeL-R",
    "bidang": "All Basic Medical Science, All Clinical Medicine",
    "achievements": [
      "Best Student Top 10 Batch Faculty of Medicine Universitas Airlangga Batch 2019 Subprogram II"
    ],
    "category": "",
    "quote": "",
    "instagram": "https://instagram.com/sofiazzahra_",
    "order": 30
  },
  {
    "kind": "teacher",
    "name": "Krishna Suryoadi Prabowo S.Ked",
    "photo": "https://lh3.googleusercontent.com/d/1eTQYUUFYbQ3th75ebcuHKPfoZv1508UG",
    "bidang": "All Basic Medical Science, All Clinical Medicine",
    "achievements": [
      "Top 10 Batch Faculty of Medicine Universitas Airlangga Batch 2022 Subprogram III",
      "Top 10 Batch Faculty of Medicine Universitas Airlangga Batch 2022 Subprogram II",
      "Top 10 Batch Faculty of Medicine Universitas Airlangga Batch 2022 Subprogram II"
    ],
    "category": "",
    "quote": "",
    "instagram": "https://instagram.com/krishnaa.sp",
    "order": 31
  },
  {
    "kind": "teacher",
    "name": "Kenichi Abrar Danuardi S.Ked",
    "photo": "https://lh3.googleusercontent.com/d/1tw-lDahcMfcKDIxVGO1gg62aM36nj79z",
    "bidang": "Olimpiade Bidang Muskuloskeletal, All Basic Medical Science, All Clinical Medicine",
    "achievements": [
      "2nd Winner IMO Musculoskeletal Branch 2025, Indonesia",
      "3rd Winner RMO Musculoskeletal Branch 2025, Indonesia",
      "Finalist, World Arthritis Day Olympiad 2025"
    ],
    "category": "",
    "quote": "",
    "instagram": "https://instagram.com/kenichi_abrar.d",
    "order": 32
  },
  {
    "kind": "teacher",
    "name": "Rachmanisa Puspaningrum S.Ked",
    "photo": "https://lh3.googleusercontent.com/d/1VvJIOgjm51ettDtYyTRirZBv7ILXa2Wd",
    "bidang": "Olimpiade Bidang Neurologi-Psikiatri, All Basic Medical Science, All Clinical Medicine",
    "achievements": [
      "2nd Winner Brain Bee 13th Jakarta Neurology Exhibition Workshop and Symposium (JakNews) 2026, Indonesia",
      "Semifinalist RMO Neurology-Psychiatry Branch 2025, Indonesia"
    ],
    "category": "",
    "quote": "",
    "instagram": "https://instagram.com/rapsningrm",
    "order": 33
  },
  {
    "kind": "teacher",
    "name": "Belia Nurmaulida Anindito Putri S.Ked",
    "photo": "https://lh3.googleusercontent.com/d/1uW0y5KoLFpMMRVppO0sM8K6t957bvS7U",
    "bidang": "Olimpiade Bidang Neurologi-Psikiatri, All Basic Medical Science, All Clinical Medicine",
    "achievements": [
      "Top 10 Batch Faculty of Medicine Universitas Airlangga Batch 2021 Subprogram III",
      "2nd Winner RMO Neurology-Psychiatry Branch 2024, Indonesia"
    ],
    "category": "",
    "quote": "",
    "instagram": "https://instagram.com/beliaputri29",
    "order": 34
  },
  {
    "kind": "teacher",
    "name": "Fortuna Filly Firdausi S.Ked",
    "photo": "https://lh3.googleusercontent.com/d/1JgosGKcJVI36sQigAFrdMDEXvqQXNT9n",
    "bidang": "All Basic Medical Science, All Clinical Medicine",
    "achievements": [
      "2 Scopus Publications",
      "20+ Academic Awards and Conference"
    ],
    "category": "",
    "quote": "",
    "instagram": "https://instagram.com/fortunafilly.f",
    "order": 35
  },
  {
    "kind": "teacher",
    "name": "Rendy Steven Pratama S.Ked",
    "photo": "https://lh3.googleusercontent.com/d/10Ur96dz-bgb1YaesK2TovFnhxCHtWW2B",
    "bidang": "Olimpiade Bidang Urologi-Reproduksi, All Basic Medical Science, All Clinical Medicine",
    "achievements": [
      "3rd Winner (Gold Medal) IMO Urology-Reproduction Branch 2024, Indonesia",
      "3rd Winner (Gold Medal) RMO Urology-Reproduction Branch 2024, Indonesia"
    ],
    "category": "",
    "quote": "",
    "instagram": "https://instagram.com/rendystvp",
    "order": 36
  },
  {
    "kind": "teacher",
    "name": "Axel Jostanto S.Ked",
    "photo": "https://lh3.googleusercontent.com/d/1YBCDVHLL9I-wzZCfk6aWWgEkzEgsrLHI",
    "bidang": "Olimpiade Bidang Digestif, All Basic Medical Science, All Clinical Medicine",
    "achievements": [
      "1st Winner (Gold Medal) IMO Gastroenterology Branch 2025, Indonesia",
      "1st Winner (Gold Medal) RMO Gastroenterology Branch 2025, Indonesia",
      "Bronze Medalist Warmadewa Aesculapius Scientific Competition by KIAs FKIK Unwar"
    ],
    "category": "",
    "quote": "",
    "instagram": "https://instagram.com/axelemper",
    "order": 37
  },
  {
    "kind": "teacher",
    "name": "Cleodylon Reinard Susanto S.Ked",
    "photo": "https://lh3.googleusercontent.com/d/18SXr6o-v4f_4_OnnM4eYPFJRLrZFX29R",
    "bidang": "Olimpiade Bidang Urologi-Reproduksi, Olimpiade Bidang Anatomi, All Basic Medical Science, All Clinical Medicine",
    "achievements": [
      "2 Medal Winner (2 Bronze Medals) RMO-IMO Urology-Reproduction Branch 2024, Indonesia",
      "2nd Winner AORTA National Anatomy Olympiad 2024, Makassar, Indonesia",
      "3rd Winner AORTA National Anatomy Olympiad 2023, Makassar, Indonesia"
    ],
    "category": "",
    "quote": "",
    "instagram": "https://instagram.com/cleodylonrs",
    "order": 38
  },
  {
    "kind": "teacher",
    "name": "Diana Annabelle Situmorang S.Ked",
    "photo": "https://lh3.googleusercontent.com/d/1fGItnkPMRmVIZxWlqamEMYdpjQSxxubR",
    "bidang": "Olimpiade Bidang Kardiologi-Respiratori, All Basic Medical Science, All Clinical Medicine",
    "achievements": [
      "2nd Winner RMO Cardiology-Respiratory Branch 2025, Indonesia"
    ],
    "category": "",
    "quote": "",
    "instagram": "https://instagram.com/dianannabelle",
    "order": 39
  },
  {
    "kind": "teacher",
    "name": "Nazwa Febry Savira S.Ked",
    "photo": "https://lh3.googleusercontent.com/d/11yhSSq7fpMq_MxNnzCrim9gKuQDtKapJ",
    "bidang": "Olimpiade Bidang Infeksi Tropis, All Basic Medical Science, All Clinical Medicine",
    "achievements": [
      "Bronze Individual Medalist of the 15th Siriraj International Medical Microbiology, Parasitology, and Microbiology Competition (SIMPIC) in Mahidol, Thailand",
      "1st Winner in the Anatomy Poster Contest, Respiratory Category—“Breathe Easy: Understanding Upper Respiratory Tract Problems” at the “Anatomy The Movies” event hosted by the Faculty of Medicine and Dentistry, Gadjah Mada University, in 2024",
      "Top 10 Batch Faculty of Medicine Universitas Airlangga Batch 2022 Subprogram II"
    ],
    "category": "",
    "quote": "",
    "instagram": "https://instagram.com/nzsavira",
    "order": 40
  },
  {
    "kind": "teacher",
    "name": "Annisa Vidya Asmara",
    "photo": "https://lh3.googleusercontent.com/d/1oTcEL1VnhFhAHfY6CvIKIK_v18jiTYKq",
    "bidang": "Olimpiade Bidang Infeksi Tropis, All Basic Medical Science, All Clinical Medicine",
    "achievements": [
      "2nd Winner IMO Tropical Infection Branch 2025, Indonesia",
      "3rd Winner RMO Tropical Infection Branch 2025, Indonesia",
      "3rd Winner of KIM Universitas Airlangga"
    ],
    "category": "",
    "quote": "",
    "instagram": "https://instagram.com/annisavidyaa",
    "order": 41
  },
  {
    "kind": "teacher",
    "name": "Avriza Zenia Nur Asmadhynegara S.Ked",
    "photo": "https://lh3.googleusercontent.com/d/1C-wk7wRPttqZq5OxU7nbzTkCP8tqXech",
    "bidang": "All Basic Medical Science, All Clinical Medicine",
    "achievements": [
      "Best Student Top 10 Batch Faculty of Medicine Universitas Airlangga Batch 2022 Subprogram III",
      "Top 10 Batch Faculty of Medicine Universitas Airlangga Batch 2022 Subprogram II",
      "1st Winner and Most Influential Ambassador in SDG’s Faculty of Medicine Universitas Airlangga 2023"
    ],
    "category": "",
    "quote": "",
    "instagram": "https://instagram.com/avrizazenia",
    "order": 42
  },
  {
    "kind": "teacher",
    "name": "Feranita Kumalasari",
    "photo": "https://lh3.googleusercontent.com/d/1Fkwl24rP1igoybnzH1Ep9MGjTF4dU39R",
    "bidang": "All Ilmiah",
    "achievements": [
      "Editorial Board for Original Research at Journal of Asian Medical Students’ Association (JAMSA)",
      "Bronze Medal Bangkok Intellectual Property Invention Innovation and Technology Exposition (IPITEx) Thailand Inventors’ Day 2026",
      "First Place Outstanding Student at Faculty of Medicine Universitas Airlangga 2026"
    ],
    "category": "",
    "quote": "",
    "instagram": "https://instagram.com/feranita_k",
    "order": 43
  },
  {
    "kind": "teacher",
    "name": "Naufal Razzan S.Ked",
    "photo": "",
    "bidang": "Olimpiade Bidang Faal, All Basic Medical Science, All Clinical Medicine",
    "achievements": [
      "Top 9 Individuals Indonesian Medical Physiology Olympiad (IMPhO) 2025, Surabaya, Indonesia",
      "Top 10 Batch Faculty of Medicine Universitas Airlangga Batch 2022 Subprogram II & III"
    ],
    "category": "",
    "quote": "",
    "instagram": "https://instagram.com/naufal_razzan",
    "order": 44
  },
  {
    "kind": "teacher",
    "name": "Keysa Putra Syahrinto S.Ked",
    "photo": "https://lh3.googleusercontent.com/d/19oFLh-_luEA4ybl6TIdFTIlOxse_om8g",
    "bidang": "Olimpiade Bidang Faal, All Basic Medical Science, All Clinical Medicine",
    "achievements": [
      "2nd Winner Indonesian Medical Physiology Olympiad (IMPhO) 2024, Surabaya, Indonesia"
    ],
    "category": "",
    "quote": "",
    "instagram": "https://instagram.com/dewikemalangan",
    "order": 45
  },
  {
    "kind": "teacher",
    "name": "Dian Rahayu S.Ked",
    "photo": "https://lh3.googleusercontent.com/d/1bERlK2u7kEbz_BJgdFQsosHHAO1H93Tf",
    "bidang": "Olimpiade Bidang Faal & Farmakologi, All Basic Medical Science, All Clinical Medicine",
    "achievements": [
      "4th Winner Public Poster ISMKI 2025",
      "2nd Winner LUMOS National Pharmacology Olympiad 2024, Banjarmasin, Indonesia",
      "Best 10 Nominee International Oral Presentation Post-Graduate FK Unair 2023"
    ],
    "category": "",
    "quote": "",
    "instagram": "https://instagram.com/dianrhay",
    "order": 46
  },
  {
    "kind": "teacher",
    "name": "Mayandra Alif Anggita Putri S.Ked",
    "photo": "https://lh3.googleusercontent.com/d/1eCAT73vMVDJwKrSTkSqd-LA81VCl-_-w",
    "bidang": "Olimpiade Bidang Urologi-Reproduksi, All Basic Medical Science, All Clinical Medicine",
    "achievements": [
      "Semifinalist RMO-IMO Urology-Reproduction Branch 2025, Indonesia",
      "Top 10 Batch Faculty of Medicine Universitas Airlangga Batch 2022 Subprogram I",
      "1st Winner Scientific Essay MEDSCO FKIK Universitas Jambi 2023 and 1st Winner Public Poster LOTION AMSA Universitas Padjajaran 2023"
    ],
    "category": "",
    "quote": "",
    "instagram": "https://instagram.com/mayandraalif",
    "order": 47
  },
  {
    "kind": "teacher",
    "name": "Michelle Angelina Ruslie S.Ked",
    "photo": "",
    "bidang": "Olimpiade Bidang Urologi-Reproduksi, All Basic Medical Science, All Clinical Medicine",
    "achievements": [
      "2nd Winner RMO Urology-Reproduction Branch 2025, Indonesia"
    ],
    "category": "",
    "quote": "",
    "instagram": "https://instagram.com/michelle.ruslie",
    "order": 48
  },
  {
    "kind": "teacher",
    "name": "Muhammad Rafif Sulthan Habibi S.Ked",
    "photo": "https://lh3.googleusercontent.com/d/1CTvKV5tta0q8520fkP0rvth5JIqSH-zm",
    "bidang": "Olimpiade Bidang Kardiologi-Respiratori, All Basic Medical Science, All Clinical Medicine",
    "achievements": [
      "2nd Winner RMO Cardiology-Respiratory Branch 2025, Indonesia",
      "3rd Winner Rafflesia National Scientific Competition (RNASE) 2024",
      "2nd Winner Baiturarahmah Medical Olympiad (BMO) Musculoskeletal & Cardiology-Respiratory Branch 2024"
    ],
    "category": "",
    "quote": "",
    "instagram": "https://instagram.com/rafifhbibi",
    "order": 49
  },
  {
    "kind": "teacher",
    "name": "Daphne Cheryl Marvella",
    "photo": "https://lh3.googleusercontent.com/d/1h97bkTqjGpgUoRSd5RCMNpPyrJT71QqF",
    "bidang": "All Basic Medical Science, All Clinical Medicine",
    "achievements": [
      "Top 10 Batch Faculty of Medicine Universitas Airlangga Batch 2023 Subprogram I"
    ],
    "category": "",
    "quote": "",
    "instagram": "https://instagram.com/daphne_cheryl",
    "order": 50
  },
  {
    "kind": "teacher",
    "name": "Adam Rafi Saputra",
    "photo": "https://lh3.googleusercontent.com/d/1JvAepqxEGm4Kz5FGwJ-Wo5hTRT618ZjC",
    "bidang": "Olimpiade Bidang Kardiologi-Respirasi, All Basic Medical Science, All Clinical Medicine",
    "achievements": [
      "2nd Winner RMO Cardiology-Respiratory Branch 2025, Indonesia"
    ],
    "category": "",
    "quote": "",
    "instagram": "https://instagram.com/mada_11112",
    "order": 51
  },
  {
    "kind": "teacher",
    "name": "Ayu Nazilla Fatimahtuz Zahra",
    "photo": "https://lh3.googleusercontent.com/d/1tlpA6GxsOUsV2UIEV3_bh8IZFrrXzbhM",
    "bidang": "All Basic Medical Science, All Clinical Medicine",
    "achievements": [
      "2nd Winner 6th International Competition on Family and Consumer Sciences 2025",
      "3rd Winner International Public Poster Competition at SNF 2024",
      "3rd Winner International Infographic Competition at BMU 2024"
    ],
    "category": "",
    "quote": "",
    "instagram": "https://instagram.com/nazilazahr_",
    "order": 52
  },
  {
    "kind": "teacher",
    "name": "Shella Harjono S.Ked",
    "photo": "https://lh3.googleusercontent.com/d/1Vvv_PAJWV4MEulkVpJKnEySP1ObSOvgr",
    "bidang": "All Basic Medical Science, All Clinical Medicine",
    "achievements": [
      "Article Published at Sinta 2 Journal Publication as First Author"
    ],
    "category": "",
    "quote": "",
    "instagram": "https://instagram.com/shella_674_",
    "order": 53
  },
  {
    "kind": "teacher",
    "name": "Syavira Dwi Oktaviani S.Ked",
    "photo": "",
    "bidang": "All Basic Medical Science, All Clinical Medicine",
    "achievements": [
      "3rd Place GEMATIKA UINSA 2023",
      "Assistant on Circumcision Awareness for Enhanced Health’ 2024",
      "Delegation for RMO Gastroenterology Branch 2024, Indonesia"
    ],
    "category": "",
    "quote": "",
    "instagram": "https://instagram.com/syaviradwiii",
    "order": 54
  },
  {
    "kind": "teacher",
    "name": "Dimas Aryq Ijlal Wafi S.Ked",
    "photo": "",
    "bidang": "",
    "achievements": [],
    "category": "",
    "quote": "",
    "instagram": "",
    "order": 55
  },
  {
    "kind": "teacher",
    "name": "Luthfi Hamda",
    "photo": "https://lh3.googleusercontent.com/d/1QMxooScUK6S_I5fhWrCXvWWhnc1IpYb1",
    "bidang": "All Basic Medical Science, All Clinical Medicine",
    "achievements": [
      "1st Place SPORA National Cardiovascular Medical Olympiad 2025, Palembang, Indonesia",
      "1st Place, RMO/IMO Delegate Selection (Cardiorespiratory) FK USK 2025",
      "Anatomy Teaching Assistant, Faculty of Medicine, Universitas Syiah Kuala"
    ],
    "category": "",
    "quote": "",
    "instagram": "https://instagram.com/luhamluham",
    "order": 56
  },
  {
    "kind": "teacher",
    "name": "Richard Lim",
    "photo": "https://lh3.googleusercontent.com/d/1-6Y2Fpu5qK9SBQQJHaGyrJy_sbqiSt9K",
    "bidang": "All Basic Medical Science, All Clinical Medicine",
    "achievements": [
      "Semifinalist of IMO Urology-Reproduction Branch 2025, Indonesia",
      "2nd Winner RMO Urology-Reproduction Branch 2025, Indonesia",
      "Top 9 Individuals Indonesian Medical Physiology Olympiad (IMPhO) 2024, Surabaya, Indonesia"
    ],
    "category": "",
    "quote": "",
    "instagram": "https://instagram.com/chad_877",
    "order": 57
  },
  {
    "kind": "teacher",
    "name": "Nathania Gwendy Indarmastuti",
    "photo": "https://lh3.googleusercontent.com/d/1xvjYPgFLytmbns47J4ELBVXZNQ8AuX6j",
    "bidang": "All Basic Medical Science, All Clinical Medicine",
    "achievements": [
      "Top 10 Batch Faculty of Medicine Universitas Airlangga Batch 2023 Subprogram I",
      "1st Winner Scientific Essay Medsmotion 2024"
    ],
    "category": "",
    "quote": "",
    "instagram": "https://instagram.com/thania_gwendy",
    "order": 58
  },
  {
    "kind": "teacher",
    "name": "dr. Salsabila Firdausi R.",
    "photo": "https://lh3.googleusercontent.com/d/1kT5pp7wtWTDTCh-D73RhVmo4AE_V675B",
    "bidang": "All Basic Medical Science, All Clinical Medicine",
    "achievements": [],
    "category": "",
    "quote": "",
    "instagram": "",
    "order": 59
  },
  {
    "kind": "teacher",
    "name": "dr. Arifian Hardi Putri Ratnani",
    "photo": "https://lh3.googleusercontent.com/d/1eOUDWjkrx39_vWL7ZLluswZL7vl3K3by",
    "bidang": "All Basic Medical Science, All Clinical Medicine",
    "achievements": [
      "5+ Symposiums in Medical Updates"
    ],
    "category": "",
    "quote": "",
    "instagram": "https://instagram.com/arifian.ratnani",
    "order": 60
  },
  {
    "kind": "teacher",
    "name": "Dija Melati Sastri S.Ked",
    "photo": "https://lh3.googleusercontent.com/d/1Nxkati4YawaRruXqTv0JsCIqSCRTIJcD",
    "bidang": "All Basic Medical Science, All Clinical Medicine",
    "achievements": [
      "2 Articles Published at Q1 Scopus Journal Publications"
    ],
    "category": "",
    "quote": "",
    "instagram": "https://instagram.com/dijamelati_",
    "order": 61
  },
  {
    "kind": "teacher",
    "name": "Joanne Darmawan",
    "photo": "",
    "bidang": "Olimpiade Bidang Muskuloskeletal, All Basic Medical Science",
    "achievements": [],
    "category": "",
    "quote": "",
    "instagram": "",
    "order": 62
  },
  {
    "kind": "teacher",
    "name": "Albert Steven Purnama",
    "photo": "https://lh3.googleusercontent.com/d/1RR4u-RRQf_NUKyO3TLDQLEcB__2Kwztg",
    "bidang": "All Basic Medical Science",
    "achievements": [
      "2nd Winner KIM Universitas Airlangga",
      "1st Winner Anatomy and Biomedical Competition for Neuron 2024"
    ],
    "category": "",
    "quote": "",
    "instagram": "https://instagram.com/alst02",
    "order": 63
  },
  {
    "kind": "teacher",
    "name": "Nabilah Najmul Ummah",
    "photo": "https://lh3.googleusercontent.com/d/1PUg9a7ojaoh9BDLGz6AUh-vKvpLlCmRq",
    "bidang": "All Basic Medical Science",
    "achievements": [
      "Finalist Scientific Essay RETINA – Universitas Wijaya Kusuma Surabaya"
    ],
    "category": "",
    "quote": "",
    "instagram": "https://instagram.com/nabilah.najmul",
    "order": 64
  },
  {
    "kind": "teacher",
    "name": "Siti Shofiyyah Isra Amri",
    "photo": "https://lh3.googleusercontent.com/d/19ARpuwE7Y18kWX-UF_21oXM0KBDFzkHe",
    "bidang": "All Basic Medical Science, All Clinical Medicine",
    "achievements": [
      "Delegate of RMO Urology-Reproduction Branch 2025, Indonesia",
      "Anatomy Teaching Assistant, Faculty of Medicine, Universitas Hasanuddin"
    ],
    "category": "",
    "quote": "",
    "instagram": "https://instagram.com/israshof",
    "order": 65
  },
  {
    "kind": "teacher",
    "name": "Jong Aini Apriyanti",
    "photo": "https://lh3.googleusercontent.com/d/11W9plmGMI-voaZulRYM2RYCrYNw0OEE_",
    "bidang": "All Basic Medical Science, All Clinical Medicine",
    "achievements": [
      "Advocacy Staff Student Senate Organization, Faculty of Medicine, Universitas Katolik Soegijapranata"
    ],
    "category": "",
    "quote": "",
    "instagram": "https://instagram.com/aini.apriyanti",
    "order": 66
  },
  {
    "kind": "manager",
    "name": "dr. Muhammad Yasir Syafa'atulloh",
    "photo": "https://lh3.googleusercontent.com/d/1gYAGVYu88IzrcA93zEn_o111aRd_SQlf",
    "bidang": "",
    "achievements": [],
    "category": "Executive Board",
    "quote": "Learn Deeper. Perform Better. Lead Further",
    "instagram": "https://instagram.com/yasirsyafa",
    "order": 0
  },
  {
    "kind": "manager",
    "name": "Deva Fitra Firdausa Anwar, S.Ked",
    "photo": "https://lh3.googleusercontent.com/d/1l-jKjbXHTmdjFXpRkNbFfrLSiH0WBP0Z",
    "bidang": "",
    "achievements": [],
    "category": "HRD & Project Division",
    "quote": "You Are What You Think",
    "instagram": "https://instagram.com/deva_fitra",
    "order": 1
  },
  {
    "kind": "manager",
    "name": "Muhammad Abdillah Roikhan, S.Ked",
    "photo": "https://lh3.googleusercontent.com/d/1o3PLfNz3M3Z-4mWUoGw6gJEeI7HF9g-c",
    "bidang": "",
    "achievements": [],
    "category": "Operational Division",
    "quote": "To teach sometimes, to guide often, to support always",
    "instagram": "https://instagram.com/m.a.roikhan",
    "order": 2
  },
  {
    "kind": "manager",
    "name": "Avriza Zenia Nur Asmadhynegara, S.Ked",
    "photo": "https://lh3.googleusercontent.com/d/1FaTqOSHcN4XlfxwXxvYcCf_EPEITDIaV",
    "bidang": "",
    "achievements": [],
    "category": "Operational Division",
    "quote": "Even the smallest step forward is still progress",
    "instagram": "https://instagram.com/avrizazenia",
    "order": 3
  },
  {
    "kind": "manager",
    "name": "Ayu Nazilla",
    "photo": "https://lh3.googleusercontent.com/d/1tlpA6GxsOUsV2UIEV3_bh8IZFrrXzbhM",
    "bidang": "",
    "achievements": [],
    "category": "Operational Division",
    "quote": "Love the life you live. Live the life you love",
    "instagram": "https://instagram.com/nazilazahr_",
    "order": 4
  },
  {
    "kind": "manager",
    "name": "Aulia Febrina Maharani, S.Ked",
    "photo": "",
    "bidang": "",
    "achievements": [],
    "category": "Operational Division",
    "quote": "Your next level starts here",
    "instagram": "https://instagram.com/auly_fm",
    "order": 5
  },
  {
    "kind": "manager",
    "name": "Dhinda Adilia Zulia Rahma, S.Ked",
    "photo": "",
    "bidang": "",
    "achievements": [],
    "category": "Operational Division",
    "quote": "Believe and act as if it were impossible to fail",
    "instagram": "https://instagram.com/dhinda_rahmaa",
    "order": 6
  },
  {
    "kind": "manager",
    "name": "Dimas Dzaky",
    "photo": "",
    "bidang": "",
    "achievements": [],
    "category": "Operational Division",
    "quote": "The right answers start with the right teachers",
    "instagram": "https://instagram.com/dimasdzaky.a",
    "order": 7
  },
  {
    "kind": "manager",
    "name": "Syavira Dwi Oktaviani, S.Ked",
    "photo": "https://lh3.googleusercontent.com/d/1JZmY_sTqRf5RSkmUYpK6zSvr3j76Yomj",
    "bidang": "",
    "achievements": [],
    "category": "Marketing Division",
    "quote": "You were never given more than you can bear",
    "instagram": "https://instagram.com/syaviradwiii",
    "order": 8
  },
  {
    "kind": "manager",
    "name": "Joya Ananda, S.Ked",
    "photo": "",
    "bidang": "",
    "achievements": [],
    "category": "Marketing Division",
    "quote": "",
    "instagram": "https://instagram.com/joystagram16",
    "order": 9
  },
  {
    "kind": "manager",
    "name": "Dian Rahayu, S.Ked",
    "photo": "",
    "bidang": "",
    "achievements": [],
    "category": "Marketing Division",
    "quote": "",
    "instagram": "https://instagram.com/dianrhay",
    "order": 10
  },
  {
    "kind": "manager",
    "name": "Nazwa Febry, S.Ked",
    "photo": "https://lh3.googleusercontent.com/d/11yhSSq7fpMq_MxNnzCrim9gKuQDtKapJ",
    "bidang": "",
    "achievements": [],
    "category": "Marketing Division",
    "quote": "",
    "instagram": "https://instagram.com/nzsavira",
    "order": 11
  }
];

migrate(
  (app) => {
    let col;
    try {
      col = app.findCollectionByNameOrId("landing_team");
    } catch (_) {
      col = new Collection({
        type: "base",
        name: "landing_team",
        // Publik: landing page bisa dibaca tanpa login. Ubah data hanya admin.
        listRule: "",
        viewRule: "",
        createRule: "@request.auth.role = 'admin'",
        updateRule: "@request.auth.role = 'admin'",
        deleteRule: "@request.auth.role = 'admin'",
        fields: [
          { name: "kind", type: "select", required: true, maxSelect: 1, values: ["teacher", "manager"] },
          { name: "name", type: "text", required: true, max: 300 },
          { name: "photo", type: "text", max: 500 },
          { name: "bidang", type: "text", max: 2000 },
          { name: "achievements", type: "json", maxSize: 50000 },
          { name: "category", type: "text", max: 100 },
          { name: "quote", type: "text", max: 1000 },
          { name: "instagram", type: "text", max: 300 },
          { name: "order", type: "number", onlyInt: true },
          { name: "created", type: "autodate", onCreate: true, onUpdate: false },
          { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
        ],
      });
      app.save(col);
    }

    // Jangan seed ulang kalau sudah ada isinya.
    try {
      const existing = app.findRecordsByFilter("landing_team", "id != ''", "", 1, 0);
      if (existing.length > 0) return;
    } catch (_) {
      // collection baru saja dibuat -> lanjut seed
    }

    SEED.forEach((d, i) => {
      const r = new Record(col);
      r.set("kind", d.kind);
      r.set("name", d.name);
      r.set("photo", d.photo || "");
      r.set("bidang", d.bidang || "");
      r.set("achievements", d.achievements || []);
      r.set("category", d.category || "");
      r.set("quote", d.quote || "");
      r.set("instagram", d.instagram || "");
      r.set("order", d.order != null ? d.order : i);
      app.save(r);
    });
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId("landing_team");
      app.delete(col);
    } catch (_) {
      // sudah tidak ada
    }
  },
);
