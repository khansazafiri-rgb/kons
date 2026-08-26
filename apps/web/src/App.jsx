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

// Kalkulator Klinis dimuat terpisah (lazy): halaman ini membawa tabel standar
// pertumbuhan WHO ~50 KB yang tidak ada gunanya diunduh siswa yang cuma mau
// mengerjakan soal. Dengan dipisah, berkas itu baru diambil saat halamannya
// benar-benar dibuka.
const KalkulatorKlinis = lazy(() => import('./pages/KalkulatorKlinis'));

// Layar tunggu seragam untuk semua halaman Olimp yang dimuat terpisah.
function OlimpFallback({ children }) {
 return <Suspense fallback={<div className="min-h-screen bg-alba-50" />}>{children}</Suspense>;
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
       </Routes>
       </OlimpAuthProvider>
     </AuthProvider>
   </Router>
 );
}

export default App;
