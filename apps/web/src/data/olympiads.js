// Daftar kesempatan olimpiade FK sepanjang tahun.
//
// Sumber tunggal untuk dua tempat yang harus selalu sama isinya:
//   - halaman landing "Olympiad Program" (tabel "Olimpiade yang Bisa Kami Bantu")
//   - halaman pendaftaran Web Olimp (pilihan "lomba yang kamu incar")
//
// Kalau daftar ini dipisah jadi dua salinan, cepat atau lambat calon peserta
// akan memilih lomba yang tidak ada di tabel landing - atau sebaliknya.
//
// Data yang tampil di landing sebenarnya dikelola admin lewat collection
// `landing_olympiads`; daftar di bawah adalah cadangan selama collection itu
// belum terisi, sekaligus pilihan bawaan di halaman pendaftaran.
//
// level: 'N' = Nasional, 'I' = Internasional.
export const OLYMPIADS = [
  ['N', 'Baiturrahmah Medical Olympiad (BMO)', 'Universitas Baiturrahmah', 'Padang, Indonesia', 'Januari'],
  ['N', 'An Adventure Towards The Human Body (AORTA)', 'Universitas Hasanuddin', 'Makassar, Indonesia', 'Januari-Februari'],
  ['I', 'Siriraj International Medical Microbiology, Parasitology, and Immunology Competition (SIMPIC)', 'Siriraj Hospital Mahidol University', 'Bangkok, Thailand', 'Maret'],
  ['I', 'USIM International Microbiology Quiz Competition (IMICROBE)', 'Universiti Sains Islam Malaysia', 'Nilai, Malaysia', 'April'],
  ['N', 'Homeostasis', 'Universitas Hasanuddin', 'Makassar, Indonesia', 'April'],
  ['N', 'Medsmotion', 'Universitas Sebelas Maret', 'Solo, Indonesia', 'Juli'],
  ['N', 'Trescom', 'Universitas Warmadewa', 'Bali, Indonesia', 'Agustus'],
  ['N', 'Annual Medical Career Day (AMCD)', 'Universitas Brawijaya', 'Malang, Indonesia', 'Agustus'],
  ['N', 'Indonesian Medical Physiology Olympiad (IMPhO)', 'Universitas Airlangga', 'Surabaya, Indonesia', 'September'],
  ['I', 'Inter-Medical School Physiology Quiz (IMSPQ)', 'Universiti Malaya', 'Kuala Lumpur, Malaysia', 'September'],
  ['N', 'Regional Medical Olympiad (RMO)', 'Menyesuaikan', 'Indonesia', 'September'],
  ['N', 'Lambung Mangkurat Medical Pharmacology Championship (LUMOS)', 'Universitas Lambung Mangkurat', 'Banjarmasin, Indonesia', 'Oktober'],
  ['N', 'Staccatto', 'Universitas Tarumanegara', 'Jakarta, Indonesia', 'Oktober'],
  ['N', 'Amygdala', 'Universitas Muhammadiyah Malang', 'Malang, Indonesia', 'Oktober'],
  ['N', 'Scientific Project and Olympiad of Sriwijaya (Spora)', 'Universitas Sriwijaya', 'Palembang, Indonesia', 'Oktober'],
  ['I', 'International Medical Biochemistry Competition (IMBC)', 'Thai Nguyen University', 'Thai Nguyen, Vietnam', 'November'],
  ['N', 'Minerfa Health Competition (MHC)', 'Universitas Andalas', 'Padang, Indonesia', 'November'],
  ['N', 'Indonesian Medical Olympiad (IMO)', 'Menyesuaikan', 'Indonesia', 'November'],
  ['I', 'Chiang Mai University-International Medical Challenge (CMU-IMC)', 'Chiang Mai University', 'Chiang Mai, Thailand', 'Desember'],
];

// Bentuk siap-pakai untuk daftar pilihan di halaman pendaftaran.
export const olympiadChoices = () =>
  OLYMPIADS.map(([level, name, host, location, timeframe]) => ({
    level, name, host, location, timeframe,
    short: name.replace(/^.*\(([^)]+)\)\s*$/, '$1'), // ambil singkatan dalam kurung kalau ada
  }));
