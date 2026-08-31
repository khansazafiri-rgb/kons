import React, { Suspense, lazy } from 'react';
import { Route, Routes, BrowserRouter as Router } from 'react-router-dom';
import ScrollToTop from './components/ScrollToTop';
import { AuthProvider } from './context/AuthContext';
import { OlimpAuthProvider } from './context/OlimpAuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import HomeLanding from './pages/landing/HomeLanding';
import StudentProgramPage from './pages/landing/StudentProgramPage';
import OlympiadProgramPage from './pages/landing/OlympiadProgramPage';
import TeamPage from './pages/landing/TeamPage';
import StudentWebPage from './pages/landing/StudentWebPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import StaffSignupPage from '@/pages/StaffSignupPage';
import ApprovalPage from './pages/ApprovalPage';
import LearningHome from './pages/LearningHome';
import ProfilePage from './pages/ProfilePage';
import PerdalamMateri from './pages/PerdalamMateri';
import PembelajaranPPT from './pages/PembelajaranPPT';
import CicilBelajar from './pages/CicilBelajar';
import SimulasiCBT from './pages/SimulasiCBT';
import BankSoal from './pages/BankSoal';
import JadwalKelas from './pages/JadwalKelas';
import AdminPanel from './pages/admin/AdminPanel';
import TeacherPanel from './pages/teacher/TeacherPanel';

// Web Olimp - "web kedua" di dalam aplikasi yang sama. Seluruhnya dimuat
// terpisah (lazy) karena siswa PCV biasa tidak pernah membukanya: tanpa ini,
// setiap orang yang cuma mau mengerjakan latihan ikut mengunduh seluruh
// halaman blueprint, kuis, kalender, dan dashboard Olimp.
const OlimpHome = lazy(() => import('./pages/olimp/OlimpHome'));
const OlimpBlueprint = lazy(() => import('./pages/olimp/OlimpBlueprint'));
const OlimpQuiz = lazy(() => import('./pages/olimp/OlimpQuiz'));
const OlimpResult = lazy(() => import('./pages/olimp/OlimpResult'));
const OlimpLeaderboard = lazy(() => import('./pages/olimp/OlimpLeaderboard'));
const OlimpJadwal = lazy(() => import('./pages/olimp/OlimpJadwal'));
const OlimpProgres = lazy(() => import('./pages/olimp/OlimpProgres'));
const OlimpAdmin = lazy(() => import('./pages/olimp/admin/OlimpAdmin'));
const OlimpLogin = lazy(() => import('./pages/olimp/OlimpLogin'));
const OlimpSignup = lazy(() => import('./pages/olimp/OlimpSignup'));
const OlimpAkun = lazy(() => import('./pages/olimp/OlimpAkun'));
const OlimpKeluar = lazy(() => import('./pages/olimp/OlimpKeluar'));

// Event/Lomba - halaman publik lomba berkala. Ikut dimuat terpisah (lazy)
// dengan alasan yang sama seperti Web Olimp: siswa yang cuma mau mengerjakan
// latihan tidak perlu ikut mengunduh layar ujian lomba beserta timernya.
const EventList = lazy(() => import('./pages/event/EventList'));
const EventDetail = lazy(() => import('./pages/event/EventDetail'));
const EventDaftar = lazy(() => import('./pages/event/EventDaftar'));
const EventUjian = lazy(() => import('./pages/event/EventUjian'));
const EventHasil = lazy(() => import('./pages/event/EventHasil'));
const PusatUjian = lazy(() => import('./pages/event/PusatUjian'));

// Kalkulator Klinis dimuat terpisah (lazy): halaman ini membawa tabel standar
// pertumbuhan WHO ~50 KB yang tidak ada gunanya diunduh siswa yang cuma mau
// mengerjakan soal. Dengan dipisah, berkas itu baru diambil saat halamannya
// benar-benar dibuka.
const KalkulatorKlinis = lazy(() => import('./pages/KalkulatorKlinis'));

// KENAPA HALAMAN INI PERNAH TAMPIL PUTIH POLOS
//
// Halaman Olimp dan Event dimuat terpisah (lazy). Kalau berkas potongannya
// gagal diambil, `import()` menolak - dan Suspense TIDAK menangani penolakan,
// cuma penundaan. Tanpa error boundary, React membuang seluruh pohonnya dan
// yang tersisa di layar adalah kotak kosong: tanpa pesan, tanpa tombol, tanpa
// petunjuk apa pun tentang apa yang salah.
//
// Itu paling sering terjadi TEPAT SETELAH DEPLOY. Nama berkas potongan memuat
// hash isinya, jadi build baru menghasilkan nama baru; tab yang sudah terbuka
// sejak sebelum deploy masih memegang daftar nama yang lama, dan begitu
// halamannya dibuka, berkas yang dimintanya sudah tidak ada lagi di server.
//
// Karena itu di sini ada dua hal, bukan satu:
//   - layar tunggu yang benar-benar terlihat sedang menunggu (bukan kosong),
//   - error boundary yang mengubah kegagalan jadi kalimat yang bisa dibaca,
//     lengkap dengan tombol muat ulang - yang memang menyelesaikan kasus
//     "berkasnya sudah berganti nama" di atas.
class BatasGalat extends React.Component {
  constructor(props) {
    super(props);
    this.state = { galat: null };
  }

  static getDerivedStateFromError(galat) {
    return { galat };
  }

  render() {
    if (!this.state.galat) return this.props.children;

    const pesan = String(this.state.galat?.message || '');
    // Gagal mengambil potongan berkas: penyebabnya hampir selalu deploy baru,
    // dan muat ulang menyelesaikannya. Dibedakan supaya sarannya tepat.
    const versiBaru = /dynamically imported module|Importing a module script failed|Loading chunk|Failed to fetch/i
      .test(pesan);

    return (
      <div className="min-h-screen bg-alba-50 px-6 py-24">
        <div className="mx-auto max-w-md rounded-2xl border border-alba-200 bg-white p-8 text-center shadow-card">
          <h1 className="font-display text-xl font-semibold text-stone-800">
            {versiBaru ? 'Halamannya baru diperbarui' : 'Halaman ini gagal dibuka'}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-stone-600">
            {versiBaru
              ? 'Ada versi baru web ini sejak tab kamu terbuka, jadi berkas halamannya sudah berganti. Muat ulang sekali dan halamannya akan terbuka normal.'
              : 'Terjadi galat saat menampilkan halaman ini. Muat ulang dulu; kalau masih sama, tunjukkan keterangan di bawah ke admin.'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-5 rounded-xl bg-maroon-600 px-5 py-2.5 text-[13px] font-bold text-alba-50 hover:bg-maroon-700"
          >
            Muat ulang halaman
          </button>
          {!versiBaru && pesan && (
            <p className="mt-5 break-words rounded-xl border border-alba-200 bg-alba-100 px-4 py-3 text-left font-mono text-[11px] leading-relaxed text-stone-500">
              {pesan}
            </p>
          )}
        </div>
      </div>
    );
  }
}

// Layar tunggu seragam untuk semua halaman Olimp/Event yang dimuat terpisah.
function OlimpFallback({ children }) {
 return (
   <BatasGalat>
     <Suspense
       fallback={(
         <div className="grid min-h-screen place-items-center bg-alba-50">
           <p className="animate-pulse text-sm font-semibold text-stone-400">Memuat…</p>
         </div>
       )}
     >
       {children}
     </Suspense>
   </BatasGalat>
 );
}

function App() {
 return (
   <Router>
     <AuthProvider>
       {/* OlimpAuthProvider ada DI DALAM AuthProvider karena ia perlu tahu
           apakah yang sedang membuka adalah admin PCV. */}
       <OlimpAuthProvider>
       <ScrollToTop />
       <Routes>
         <Route path="/" element={<HomeLanding />} />
         <Route path="/student-program" element={<StudentProgramPage />} />
         <Route path="/olympiad-program" element={<OlympiadProgramPage />} />
         <Route path="/tim" element={<TeamPage />} />
         <Route path="/student-web" element={<StudentWebPage />} />
         <Route path="/login" element={<LoginPage />} />
         <Route path="/signup" element={<SignupPage />} />
        {/* Pendaftaran pengajar & admin: dua halaman terpisah, dan keduanya
            hanya bisa dibuka lewat link undangan dari dashboard admin. */}
        <Route path="/daftar-pengajar" element={<StaffSignupPage role="teacher" />} />
        <Route path="/daftar-admin" element={<StaffSignupPage role="admin" />} />
        {/* ACC pendaftaran siswa lewat magic link dari email admin - tanpa perlu
            login dashboard. Pengamanan ada di server (token sekali pakai). */}
        <Route path="/acc/:token" element={<ApprovalPage />} />
         <Route path="/beranda" element={<ProtectedRoute><LearningHome /></ProtectedRoute>} />
         <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
         <Route path="/jadwal-kelas" element={<ProtectedRoute><JadwalKelas /></ProtectedRoute>} />
         <Route path="/perdalam-materi" element={<ProtectedRoute><PerdalamMateri /></ProtectedRoute>} />
         <Route path="/pembelajaran-ppt" element={<ProtectedRoute><PembelajaranPPT /></ProtectedRoute>} />
         <Route path="/cicil-belajar" element={<ProtectedRoute><CicilBelajar /></ProtectedRoute>} />
         <Route path="/simulasi-test" element={<ProtectedRoute><SimulasiCBT /></ProtectedRoute>} />
         <Route
           path="/kalkulator-klinis"
           element={(
             <ProtectedRoute>
               <Suspense fallback={<div className="min-h-screen bg-grid-soft" />}>
                 <KalkulatorKlinis />
               </Suspense>
             </ProtectedRoute>
           )}
         />
         {/* Bank Soal: disiapkan tapi tersembunyi - halaman memblokir diri
             sendiri selama saklar showBankSoal di landing_settings masih mati */}
         <Route path="/bank-soal" element={<ProtectedRoute><BankSoal /></ProtectedRoute>} />
         <Route path="/admin" element={<ProtectedRoute roles={['admin', 'super_admin']}><AdminPanel /></ProtectedRoute>} />
         <Route path="/teacher" element={<ProtectedRoute roles={['teacher']}><TeacherPanel /></ProtectedRoute>} />

         {/* ---- Web Olimp ---- */}
         {/* TIDAK memakai ProtectedRoute: itu memeriksa akun web PCV, sedangkan
             peserta Olimp punya basis data akun sendiri (olimp_users). Yang
             memeriksa hak masuk adalah OlimpGate di dalam tiap halaman - dan ia
             menerima DUA jenis identitas: peserta Olimp, atau admin PCV. */}
         <Route path="/olimp/masuk" element={<OlimpFallback><OlimpLogin /></OlimpFallback>} />
         <Route path="/olimp/daftar" element={<OlimpFallback><OlimpSignup /></OlimpFallback>} />
         <Route path="/olimp" element={<OlimpFallback><OlimpHome /></OlimpFallback>} />
         <Route path="/olimp/akun" element={<OlimpFallback><OlimpAkun /></OlimpFallback>} />
         {/* Tujuan quitURL di berkas konfigurasi SEB - dibuka sesaat sebelum
             aplikasinya menutup diri. Tidak dijaga apa pun: pada saat itu
             sesinya memang sudah selesai. */}
         <Route path="/olimp/keluar" element={<OlimpFallback><OlimpKeluar /></OlimpFallback>} />
         <Route path="/olimp/paket/:packageId" element={<OlimpFallback><OlimpBlueprint /></OlimpFallback>} />
         <Route path="/olimp/kuis/:packageId" element={<OlimpFallback><OlimpQuiz /></OlimpFallback>} />
         <Route path="/olimp/hasil/:attemptId" element={<OlimpFallback><OlimpResult /></OlimpFallback>} />
         <Route path="/olimp/peringkat" element={<OlimpFallback><OlimpLeaderboard /></OlimpFallback>} />
         <Route path="/olimp/jadwal" element={<OlimpFallback><OlimpJadwal /></OlimpFallback>} />
         <Route path="/olimp/progres" element={<OlimpFallback><OlimpProgres /></OlimpFallback>} />
         {/* Dashboard Olimp tetap dijaga ProtectedRoute: yang membukanya memang
             admin web PCV, bukan peserta. */}
         <Route path="/olimp/admin" element={<ProtectedRoute roles={['admin', 'super_admin']}><OlimpFallback><OlimpAdmin /></OlimpFallback></ProtectedRoute>} />

         {/* ---- Event / Lomba berkala ---- */}
         {/* Terbuka tanpa login: halaman listing & detail lomba itu halaman
             promosi. Yang butuh identitas (daftar, ujian, hasil) memeriksanya
             sendiri di dalam halaman - dan peserta lomba bisa datang dari DUA
             collection akun (users PCV atau olimp_users), yang tidak bisa
             diperiksa ProtectedRoute karena ia cuma tahu akun PCV. */}
         {/* Pusat Ujian: tempat mendaratnya SEMUA berkas .seb lomba.
             Sengaja di akar dan sependek mungkin - kalau berkasnya bermasalah,
             alamat ini yang harus bisa diketik ulang peserta dari ingatan. */}
         <Route path="/ujian" element={<OlimpFallback><PusatUjian /></OlimpFallback>} />
         <Route path="/event" element={<OlimpFallback><EventList /></OlimpFallback>} />
         <Route path="/event/:slug" element={<OlimpFallback><EventDetail /></OlimpFallback>} />
         <Route path="/event/:slug/daftar" element={<OlimpFallback><EventDaftar /></OlimpFallback>} />
         <Route path="/event/:slug/ujian" element={<OlimpFallback><EventUjian /></OlimpFallback>} />
         <Route path="/event/:slug/hasil" element={<OlimpFallback><EventHasil /></OlimpFallback>} />
       </Routes>
       </OlimpAuthProvider>
     </AuthProvider>
   </Router>
 );
}

export default App;
