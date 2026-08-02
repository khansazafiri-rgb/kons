// Daftar Fakultas Kedokteran di Indonesia - dipakai untuk dropdown "Asal Kuliah"
// di halaman Sign Up.
//
// Dikelompokkan per jenis (Negeri / Swasta / Kedinasan) supaya dropdown-nya
// enak dibaca lewat <optgroup>. Nama ditulis apa adanya seperti yang umum
// dipakai mahasiswa ("FK UNAIR", bukan "Fakultas Kedokteran Universitas
// Airlangga") supaya cocok dengan cara siswa menyebut kampusnya.
//
// Daftar ini TIDAK dijamin lengkap/mutakhir - FK baru bermunculan tiap tahun.
// Karena itu halaman Sign Up selalu menyediakan opsi "Lainnya" yang membuka
// isian bebas, jadi pendaftar dari kampus yang belum terdaftar tetap bisa
// mendaftar tanpa harus menunggu daftar ini diperbarui.

export const FK_LAINNYA = '__lainnya__';

export const FK_INDONESIA = [
  {
    group: 'PTN - Sumatera',
    items: [
      'FK Universitas Syiah Kuala (Banda Aceh)',
      'FK Universitas Malikussaleh (Lhokseumawe)',
      'FK Universitas Sumatera Utara (Medan)',
      'FK Universitas Andalas (Padang)',
      'FK Universitas Riau (Pekanbaru)',
      'FK Universitas Jambi (Jambi)',
      'FK Universitas Sriwijaya (Palembang)',
      'FK Universitas Bengkulu (Bengkulu)',
      'FK Universitas Lampung (Bandar Lampung)',
      'FK Universitas Maritim Raja Ali Haji (Tanjungpinang)',
      'FK Universitas Bangka Belitung (Pangkalpinang)',
    ],
  },
  {
    group: 'PTN - Jawa',
    items: [
      'FK Universitas Indonesia (Jakarta)',
      'FK UPN Veteran Jakarta (Jakarta)',
      'FK Universitas Pembangunan Jaya (Tangerang Selatan)',
      'FK Universitas Sultan Ageng Tirtayasa (Serang)',
      'FK Universitas Padjadjaran (Bandung)',
      'FK Universitas Siliwangi (Tasikmalaya)',
      'FK Universitas Singaperbangsa Karawang (Karawang)',
      'FK Universitas Diponegoro (Semarang)',
      'FK Universitas Sebelas Maret (Surakarta)',
      'FK Universitas Jenderal Soedirman (Purwokerto)',
      'FK Universitas Tidar (Magelang)',
      'FK Universitas Gadjah Mada (Yogyakarta)',
      'FK Universitas Airlangga (Surabaya)',
      'FK Universitas Brawijaya (Malang)',
      'FK Universitas Jember (Jember)',
      'FK Universitas Negeri Surabaya (Surabaya)',
      'FK Universitas Trunojoyo Madura (Bangkalan)',
    ],
  },
  {
    group: 'PTN - Bali, NTB, NTT',
    items: [
      'FK Universitas Udayana (Denpasar)',
      'FK Universitas Mataram (Mataram)',
      'FK Universitas Nusa Cendana (Kupang)',
    ],
  },
  {
    group: 'PTN - Kalimantan',
    items: [
      'FK Universitas Tanjungpura (Pontianak)',
      'FK Universitas Palangka Raya (Palangka Raya)',
      'FK Universitas Lambung Mangkurat (Banjarmasin)',
      'FK Universitas Mulawarman (Samarinda)',
      'FK Universitas Borneo Tarakan (Tarakan)',
    ],
  },
  {
    group: 'PTN - Sulawesi',
    items: [
      'FK Universitas Hasanuddin (Makassar)',
      'FK Universitas Sam Ratulangi (Manado)',
      'FK Universitas Tadulako (Palu)',
      'FK Universitas Halu Oleo (Kendari)',
      'FK Universitas Negeri Gorontalo (Gorontalo)',
      'FK Universitas Sulawesi Barat (Majene)',
    ],
  },
  {
    group: 'PTN - Maluku & Papua',
    items: [
      'FK Universitas Pattimura (Ambon)',
      'FK Universitas Khairun (Ternate)',
      'FK Universitas Cenderawasih (Jayapura)',
      'FK Universitas Papua (Manokwari)',
    ],
  },
  {
    group: 'PTS - Jakarta, Bogor, Depok, Tangerang, Bekasi',
    items: [
      'FK Universitas Trisakti (Jakarta)',
      'FK Universitas Tarumanagara (Jakarta)',
      'FK Universitas Atma Jaya (Jakarta)',
      'FK Universitas Kristen Indonesia (Jakarta)',
      'FK Universitas YARSI (Jakarta)',
      'FK Universitas Muhammadiyah Jakarta (Jakarta)',
      'FK UIN Syarif Hidayatullah (Tangerang Selatan)',
      'FK Universitas Pelita Harapan (Tangerang)',
      'FK Universitas Katolik Indonesia Atma Jaya (Jakarta)',
      'FK Universitas Pembangunan Nasional Veteran Jakarta (Jakarta)',
      'FK Universitas Gunadarma (Depok)',
      'FK Universitas Binawan (Jakarta)',
      'FK Universitas Esa Unggul (Jakarta)',
    ],
  },
  {
    group: 'PTS - Jawa Barat & Banten',
    items: [
      'FK Universitas Kristen Maranatha (Bandung)',
      'FK Universitas Islam Bandung (Bandung)',
      'FK Universitas Jenderal Achmad Yani (Cimahi)',
      'FK Universitas Swadaya Gunung Jati (Cirebon)',
      'FK Universitas Muhammadiyah Bandung (Bandung)',
    ],
  },
  {
    group: 'PTS - Jawa Tengah & DIY',
    items: [
      'FK Universitas Islam Sultan Agung (Semarang)',
      'FK Universitas Muhammadiyah Semarang (Semarang)',
      'FK Universitas Muhammadiyah Surakarta (Surakarta)',
      'FK Universitas Islam Indonesia (Yogyakarta)',
      'FK Universitas Muhammadiyah Yogyakarta (Yogyakarta)',
      'FK Universitas Kristen Duta Wacana (Yogyakarta)',
      'FK Universitas Ahmad Dahlan (Yogyakarta)',
      'FK Universitas Alma Ata (Yogyakarta)',
      'FK Universitas Muhammadiyah Purwokerto (Purwokerto)',
      'FK Universitas Katolik Soegijapranata (Semarang)',
    ],
  },
  {
    group: 'PTS - Jawa Timur',
    items: [
      'FK Universitas Katolik Widya Mandala (Surabaya)',
      'FK Universitas Hang Tuah (Surabaya)',
      'FK Universitas Wijaya Kusuma (Surabaya)',
      'FK Universitas Muhammadiyah Surabaya (Surabaya)',
      'FK Universitas Nahdlatul Ulama Surabaya (Surabaya)',
      'FK Universitas Ciputra (Surabaya)',
      'FK Universitas Islam Malang (Malang)',
      'FK Universitas Muhammadiyah Malang (Malang)',
      'FK UIN Maulana Malik Ibrahim (Malang)',
      'FK Universitas Jenderal Soedirman Jember (Jember)',
    ],
  },
  {
    group: 'PTS - Sumatera',
    items: [
      'FK Universitas Baiturrahmah (Padang)',
      'FK Universitas Abulyatama (Aceh Besar)',
      'FK Universitas Methodist Indonesia (Medan)',
      'FK Universitas HKBP Nommensen (Medan)',
      'FK Universitas Islam Sumatera Utara (Medan)',
      'FK Universitas Prima Indonesia (Medan)',
      'FK Universitas Batam (Batam)',
      'FK Universitas Malahayati (Bandar Lampung)',
      'FK Universitas Muhammadiyah Palembang (Palembang)',
      'FK Universitas Abdurrab (Pekanbaru)',
    ],
  },
  {
    group: 'PTS - Bali, Kalimantan, Sulawesi, Timur',
    items: [
      'FK Universitas Warmadewa (Denpasar)',
      'FK Universitas Muhammadiyah Banjarmasin (Banjarmasin)',
      'FK Universitas Muslim Indonesia (Makassar)',
      'FK Universitas Bosowa (Makassar)',
      'FK Universitas Kristen Indonesia Tomohon (Tomohon)',
      'FK Universitas Alkhairaat (Palu)',
      'FK Universitas Widya Mandira (Kupang)',
      'FK Universitas Nusa Nipa (Maumere)',
    ],
  },
  {
    group: 'Kedinasan & TNI/Polri',
    items: [
      'FK Universitas Pertahanan RI (Bogor)',
      'FK Universitas Kristen Krida Wacana (Jakarta)',
    ],
  },
];

// Semua nama kampus digabung jadi satu daftar datar (untuk validasi/pencarian).
export const FK_FLAT = FK_INDONESIA.flatMap((g) => g.items);
