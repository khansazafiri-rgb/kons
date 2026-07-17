# Codebase Map

npm workspaces monorepo at `/home/${username}/websites/${sandboxId}/public_html`. The web app ships standalone. Call `enable_pocketbase_integration` to add a database, or `enable_api_server_integration` to add an Express backend — each tool appends its own `## apps/<service>` section to this file.

## apps/web (React + Vite + Tailwind + shadcn/ui, port 3000)

Located at apps/web/. Run: `cd apps/web && npm run dev` (auto-started by the sandbox supervisor).
src/main.jsx — entry point, mounts <App />
src/App.jsx — React Router, all routes defined here
src/index.css — Tailwind theme, CSS variables
src/pages/HomePage.jsx — "/" route, animated hello heading
src/pages/LandingPage.jsx — landing page with PCV CLASSROOM profile, header nav (Home, Student Program, Olympiad Program, Student Web), "Pergi Ke Web Siswa" button
src/pages/LoginPage.jsx — login with email/password, role selection, 2-device limit enforcement, guest mode
src/pages/LearningHome.jsx — main dashboard with 3 cards (Perdalam Materi, Cicil Belajar, CBT Test), user info top-right
src/pages/ProfilePage.jsx — user profile (Student: nama/semester/asal/akun aktif sampai; Teacher: nama/pembimbing mata kuliah/asal; Admin: dashboard)
src/pages/PerdalamMateri.jsx — subject selection, chapter selection, PDF reader flow with progress tracking
src/pages/PdfViewer.jsx — embedded PDF viewer for learning materials, "selesaikan bacaan" button
src/pages/CicilBelajar.jsx — chapter-based practice questions with hints, explanations, progress bar, resume/restart logic
src/pages/SimulasiCBT.jsx — year selection (2016-2026), Simulasi/Learning mode toggle, timer (1 min/question), question runner
src/pages/admin/AdminPanel.jsx — admin dashboard with left nav: Pengajar, Siswa, Edit Soal, Tambah Akun; includes session validation, error handling, and fallback UI for stale/invalid auth
src/pages/admin/ManagePengajar.jsx — list teachers, edit subjects, deactivate/delete accounts
src/pages/admin/ManageSiswa.jsx — list students, view activity, deactivate/delete, view profiles
src/pages/admin/EditSoal.jsx — manage questions per subject, add subjects/chapters, edit questions with explanations per option
src/pages/admin/TambahAkun.jsx — create new teacher/student accounts
src/pages/teacher/TeacherPanel.jsx — teacher dashboard with left nav: Profil Pengajar, Beranda, Edit Soal, PPT Mata Kuliah; PDF upload with client-side validation (PDF type/size), loading state, clear error messages (permission/validation/generic), success feedback, and auto-refresh
src/pages/teacher/ProfilPengajar.jsx — teacher profile display
src/pages/teacher/BerandaPengajar.jsx — student count, activity monitoring, inactive student alerts
src/pages/teacher/EditSoalTeacher.jsx — edit questions for assigned subjects only, one-by-one input with per-option explanations
src/pages/teacher/UploadPPT.jsx — upload PDF materials for assigned subjects
src/components/ScrollToTop.jsx — resets scroll on route change
src/components/ProtectedRoute.jsx — role-based route protection (Student/Teacher/Admin/Guest)
src/components/QuestionRunner.jsx — reusable question UI with options, hints, explanations, timer
src/components/ui/ — shadcn/ui primitives — import from `@/components/ui/<name>`, do not edit the files
src/hooks/use-mobile.jsx — mobile breakpoint detection
src/hooks/use-toast.js — toast notifications
src/lib/utils.js — cn() Tailwind class merge
src/lib/pocketbaseClient.js — PocketBase SDK client (web-side)
src/lib/deviceId.js — device fingerprinting for 2-device limit
src/context/AuthContext.jsx — authentication state, role management, device tracking, guest mode, session validation with stale-session detection and cleanup
vault/wiki/skills/design/SKILL.md — frontend craft, styling, typography, motion, and shadcn policy for UI surfaces.
apps/web/plugins/session-journal/ — infrastructure, DO NOT edit. Vite dev plugin injects the browser session journal client; events go over HMR (`import.meta.hot.send('session-journal:event', …)`); the plugin arranges persistence under `vault/temp/SESSION_JOURNAL.md`.
Routes: / → HomePage, /landing → LandingPage, /login → LoginPage, /learning → LearningHome, /profile → ProfilePage, /perdalam-materi → PerdalamMateri, /pdf-viewer → PdfViewer, /cicil-belajar → CicilBelajar, /simulasi-cbt → SimulasiCBT, /admin → AdminPanel, /admin/pengajar → ManagePengajar, /admin/siswa → ManageSiswa, /admin/edit-soal → EditSoal, /admin/tambah-akun → TambahAkun, /teacher → TeacherPanel, /teacher/profil → ProfilPengajar, /teacher/beranda → BerandaPengajar, /teacher/edit-soal → EditSoalTeacher, /teacher/upload-ppt → UploadPPT


## apps/pocketbase (PocketBase binary + SQLite, port 8090)
Located at apps/pocketbase/. Binary at apps/pocketbase/pocketbase. Dashboard: http://localhost:8090/_/, API: http://localhost:8090/api/
Data: apps/pocketbase/pb_data/ (auto-generated, gitignored).
Migrations: apps/pocketbase/pb_migrations/ — JS files; each exports `migrate(db, app) => { ... }`.
pb_migrations/1783713347_pcv_classroom_schema.js — PCV CLASSROOM schema: users (with role, semester, institution, device tracking, account expiry), subjects (11 subjects: Anatomi, Biologi Kedokteran, Trampilan Medik 1, Histologi, Fisiologi, Biokimia, Mikrobiologi, Parasitologi, Farmakologi, Patologi Anatomi, Patologi Klinik), chapters (per subject with BAB details), ppt_files (PDF storage with owner/subject/file fields, teacher create/read/update/delete rules), questions (per chapter with options and per-option explanations), answers (user responses), progress (chapter completion tracking), device_sessions (2-device limit enforcement).
pb_migrations/1783713500_fix_users_admin_rules.js — grants admins update/delete rights on any user record; fixes 404 errors when toggling teacher subjects, disabling accounts, or deleting users.
Server-side event hooks: apps/pocketbase/pb_hooks/*.pb.js — fire on record / mailer / request events.
Run: `cd apps/pocketbase && npm run dev` (auto-started by the sandbox supervisor).

apps/web/src/lib/pocketbaseClient.js — PocketBase SDK client (web-side); usage: `import pocketbaseClient from '@/lib/pocketbaseClient'`.

PocketBase skill: load `pocketbase/SKILL.md` first (the hub). Sub-references at `pocketbase/references/`: ACCESS_RULES, ADD_FIELD, CREATE_AUTH_COLLECTION, CREATE_COLLECTION, CUSTOM_SMTP, DELETE_COLLECTION, DELETE_RECORDS, FIELD_TYPES, HOOKS, INDEXES, MFA, MIGRATIONS, OAUTH_PROVIDERS, OTP_AUTH, RAW_SQL, RECORD_OPERATIONS, REMOVE_FIELD, RENAME_COLLECTION, RENAME_FIELD, SEED_DATA, UPDATE_FIELD, UPDATE_INDEXES, UPDATE_RECORDS, UPDATE_RULES, USING_IN_REACT — read the relevant one before any pocketbase change.
