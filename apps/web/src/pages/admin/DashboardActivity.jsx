import React, { useEffect, useMemo, useState } from 'react';
import { Activity, ChevronDown, Mail, MessageCircle, RefreshCw, Search, Users, X } from 'lucide-react';
import pb from '@/lib/pocketbaseClient';
import {
  ACTIVITY_SECTIONS,
  ACTIVITY_STATUS,
  AKTIF_HARI,
  ONLINE_MENIT,
  activityStatus,
  isAktif,
  isOnline,
  sectionIcon,
  sectionLabel,
  timeAgo,
} from '@/lib/activityLog';
import { WA_TEMPLATES } from '@/lib/waTemplates';

// ==========================================================================
// TAB "DASHBOARD ACTIVITY"
//
// Dua bagian:
//   1. Kartu ringkas jumlah pengajar & siswa yang aktif - diklik untuk melihat
//      siapa saja beserta aktivitas terakhirnya, lengkap dengan tombol kirim
//      email penyemangat per orang.
//   2. Riwayat perubahan web (collection activity_log): siapa mengubah apa,
//      pukul berapa, dan preview soal yang ditambah/diubah/dihapus.
//      Bisa diurutkan menurut waktu / pelaku / jenis perubahan.
// ==========================================================================
export default function DashboardActivity() {
  const [tab, setTab] = useState('orang'); // 'orang' | 'riwayat'

  return (
    <div className="space-y-5">
      <div className="bg-alba-50 rounded-2xl border border-alba-200 p-6 shadow-card">
        <h2 className="font-display text-lg font-semibold text-maroon-600 flex items-center gap-2">
          <Activity size={19} /> Dashboard Activity
        </h2>
        <p className="text-sm text-stone-500 mt-1 leading-relaxed">
          Pantau siapa yang aktif dan apa saja yang berubah di web: siapa mengubahnya, kapan, dan isi perubahannya.
        </p>
        <div className="flex flex-wrap gap-2 mt-4">
          {[['orang', 'Akun Aktif'], ['riwayat', 'Riwayat Perubahan']].map(([k, label]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                tab === k ? 'bg-maroon-600 text-alba-50' : 'border border-alba-300 text-stone-600 hover:bg-maroon-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'orang' ? <AkunAktif /> : <RiwayatPerubahan />}
    </div>
  );
}

// ==========================================================================
// BAGIAN 1 - AKUN AKTIF + KIRIM EMAIL PENYEMANGAT
// ==========================================================================
function AkunAktif() {
  const [users, setUsers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [exams, setExams] = useState([]);
  const [openRole, setOpenRole] = useState(null); // 'teacher' | 'student' | null
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [us, subs, ex] = await Promise.all([
        pb.collection('users').getFullList({ filter: "role = 'student' || role = 'teacher'" }),
        pb.collection('subjects').getFullList({ sort: 'order', fields: 'id,name' }),
        pb.collection('exam_schedules').getFullList({ sort: 'examDate' }).catch(() => []),
      ]);
      setUsers(us);
      setSubjects(subs);
      setExams(ex);
    } catch (e) {
      setError('Gagal memuat data: ' + (e?.message || ''));
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const subjectName = useMemo(() => {
    const m = {};
    subjects.forEach((s) => { m[s.id] = s.name; });
    return m;
  }, [subjects]);

  const teachers = users.filter((u) => u.role === 'teacher');
  const students = users.filter((u) => u.role === 'student');

  // Ujian terdekat untuk seorang user (dipakai sebagai pengingat di kartu).
  const ujianTerdekat = (u) => {
    const mine = Array.isArray(u.teachingSubjects) ? u.teachingSubjects : [];
    if (!mine.length) return null;
    const today = new Date().setHours(0, 0, 0, 0);
    const upcoming = exams
      .filter((x) => mine.includes(x.subject) && x.examDate)
      .map((x) => ({ ...x, sisa: Math.ceil((new Date(x.examDate).getTime() - today) / 86400000) }))
      .filter((x) => x.sisa >= 0)
      .sort((a, b) => a.sisa - b.sisa);
    return upcoming[0] || null;
  };

  const listFor = (role) => {
    const base = role === 'teacher' ? teachers : students;
    const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const filtered = terms.length
      ? base.filter((u) => {
          const hay = [u.name, u.userId, u.email, u.lastActivityText].filter(Boolean).join(' ').toLowerCase();
          return terms.every((t) => hay.includes(t));
        })
      : base;
    // Yang paling baru aktif di atas; yang belum pernah aktif paling bawah.
    return [...filtered].sort((a, b) => {
      const ta = a.lastActivityAt ? new Date(a.lastActivityAt).getTime() : 0;
      const tb = b.lastActivityAt ? new Date(b.lastActivityAt).getTime() : 0;
      return tb - ta;
    });
  };

  return (
    <div className="space-y-4">
      {error && <p className="text-sm bg-red-50 border border-red-200 text-red-600 rounded-lg px-4 py-2">{error}</p>}

      <div className="grid sm:grid-cols-2 gap-4">
        <KartuAktif
          label="Pengajar"
          online={teachers.filter(isOnline).length}
          mingguIni={teachers.filter((u) => isAktif(u)).length}
          total={teachers.length}
          open={openRole === 'teacher'}
          onClick={() => setOpenRole(openRole === 'teacher' ? null : 'teacher')}
        />
        <KartuAktif
          label="Siswa"
          online={students.filter(isOnline).length}
          mingguIni={students.filter((u) => isAktif(u)).length}
          total={students.length}
          open={openRole === 'student'}
          onClick={() => setOpenRole(openRole === 'student' ? null : 'student')}
        />
      </div>

      <div className="rounded-xl border border-alba-200 bg-alba-100/50 px-4 py-3">
        <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-2">Arti status</p>
        <div className="flex flex-wrap gap-x-5 gap-y-1.5">
          {Object.entries(ACTIVITY_STATUS).map(([key, s]) => (
            <span key={key} className="inline-flex items-center gap-1.5 text-[11px] text-stone-500">
              <span className={`w-2 h-2 rounded-full ${TONE_DOT[s.tone]}`} />
              <b className="text-stone-600">{s.label}</b> {s.desc}
            </span>
          ))}
        </div>
        <p className="text-[11px] text-stone-400 mt-2 leading-relaxed">
          Jejak aktivitas tercatat saat mengerjakan soal, membaca materi, atau sekadar membuka web
          (dicatat maksimal sekali tiap 10 menit). Jadi akun yang tidak menyentuh web selama{' '}
          {ONLINE_MENIT} menit otomatis tidak lagi dihitung online.
        </p>
      </div>

      {openRole && (
        <div className="bg-alba-50 rounded-2xl border border-alba-200 p-5 shadow-card space-y-3 animate-fade-in">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h3 className="font-bold text-sm text-stone-700">
              {openRole === 'teacher' ? 'Daftar Pengajar' : 'Daftar Siswa'}
              <span className="ml-2 font-normal text-xs text-stone-400">{listFor(openRole).length} orang</span>
            </h3>
            <button onClick={load} disabled={loading} className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-maroon-600 disabled:opacity-50">
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Muat ulang
            </button>
          </div>

          <div className="relative">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari nama, Login ID, email, atau aktivitas…"
              className="w-full rounded-lg border border-alba-300 bg-alba-50 pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-maroon-400 focus:ring-4 focus:ring-maroon-600/10"
            />
          </div>

          <div className="space-y-2">
            {listFor(openRole).map((u) => (
              <BarisOrang key={u.id} u={u} ujian={ujianTerdekat(u)} subjectName={subjectName} />
            ))}
            {listFor(openRole).length === 0 && (
              <p className="text-sm text-stone-400 px-1 py-2">Tidak ada yang cocok.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const TONE_DOT = {
  green: 'bg-green-500',
  gold: 'bg-gold-400',
  stone: 'bg-stone-400',
  red: 'bg-red-400',
};

const TONE_BADGE = {
  green: 'text-green-800 bg-green-100 border-green-200',
  gold: 'text-gold-600 bg-gold-100 border-gold-200',
  stone: 'text-stone-600 bg-alba-200 border-alba-300',
  red: 'text-red-600 bg-red-50 border-red-200',
};

// Angka besar = yang SEDANG online; jumlah aktif sepekan jadi keterangan kedua.
function KartuAktif({ label, online, mingguIni, total, open, onClick }) {
  const pct = total ? Math.round((online / total) * 100) : 0;
  return (
    <button
      onClick={onClick}
      className={`text-left rounded-2xl border-2 p-5 shadow-card transition-all ${
        open ? 'border-maroon-600 bg-maroon-50' : 'border-alba-200 bg-alba-50 hover:border-maroon-300'
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 text-stone-500">
          <Users size={16} />
          <span className="text-xs font-bold uppercase tracking-wider">{label} online</span>
        </div>
        <ChevronDown size={16} className={`text-stone-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </div>
      <p className="font-display text-3xl font-semibold text-maroon-700 flex items-center gap-2">
        {online > 0 && <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />}
        {online}
        <span className="text-lg font-medium text-stone-400">/ {total}</span>
      </p>
      <div className="h-1.5 rounded-full bg-alba-200 overflow-hidden mt-3">
        <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[11px] font-semibold text-stone-500 mt-2">
        {mingguIni} aktif dalam {AKTIF_HARI} hari terakhir
      </p>
      <p className="text-[11px] font-semibold text-stone-400 mt-0.5">
        {open ? 'Klik untuk menutup daftar' : 'Klik untuk lihat siapa saja'}
      </p>
    </button>
  );
}

function BarisOrang({ u, ujian, subjectName }) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState('');
  const [waOpen, setWaOpen] = useState(false);
  const status = activityStatus(u);
  const info = ACTIVITY_STATUS[status];
  const online = status === 'online';
  const kapan = timeAgo(u.lastActivityAt);

  // Email dirakit & dikirim di server (hook nudge-email.pb.js) supaya kredensial
  // SMTP tidak pernah keluar dari VPS.
  const kirim = async () => {
    if (!u.email) { setSent('❌ Akun ini tidak punya email.'); return; }
    if (!window.confirm(`Kirim email penyemangat ke ${u.name || u.userId} (${u.email})?`)) return;
    setSending(true);
    setSent('');
    try {
      const res = await pb.send('/api/pcv/nudge', {
        method: 'POST',
        body: { userId: u.id },
      });
      setSent('✅ ' + (res?.message || 'Email terkirim.'));
    } catch (e) {
      setSent('❌ Gagal: ' + (e?.response?.message || e?.message || 'coba lagi'));
    }
    setSending(false);
  };

  // Isi pesan dirakit server dari template yang bisa diedit admin di tab
  // Notifikasi WA, jadi teksnya konsisten dengan pengiriman otomatis.
  const kirimWa = async (templateKey, templateLabel) => {
    setWaOpen(false);
    if (!u.phone) { setSent('❌ Akun ini belum punya nomor WA. Isi dulu di tab Siswa.'); return; }
    if (!window.confirm(`Kirim WA "${templateLabel}" ke ${u.name || u.userId} (${u.phone})?`)) return;
    setSending(true);
    setSent('');
    try {
      const res = await pb.send('/api/pcv/wa-send', {
        method: 'POST',
        body: { userId: u.id, template: templateKey },
      });
      setSent('✅ ' + (res?.message || 'WA terkirim.'));
    } catch (e) {
      setSent('❌ Gagal: ' + (e?.response?.message || e?.message || 'coba lagi'));
    }
    setSending(false);
  };

  return (
    <div className={`rounded-xl border px-4 py-3 ${online ? 'border-green-200 bg-green-50/40' : 'border-alba-200 bg-alba-50'}`}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <p className="font-bold text-sm text-stone-800 truncate">
            {u.name || '(tanpa nama)'}
            <span className="ml-2 font-normal text-xs text-stone-400">{u.userId}</span>
            <span className={`ml-2 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase border rounded-full px-2 py-0.5 ${TONE_BADGE[info.tone]}`}>
              {online && <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />}
              {info.label}
            </span>
          </p>
          <p className="text-xs text-stone-600 mt-1 leading-relaxed">
            {u.lastActivityText ? (
              <>
                <span className="font-semibold text-stone-500">Terakhir:</span> {u.lastActivityText}
                {kapan && <span className="text-stone-400"> · {kapan}</span>}
              </>
            ) : (
              <span className="text-stone-400 italic">Belum ada jejak aktivitas tercatat.</span>
            )}
          </p>
          {ujian && (
            <p className="text-[11px] text-maroon-600 font-semibold mt-1">
              📅 {ujian.examName}{subjectName[ujian.subject] ? ` - ${subjectName[ujian.subject]}` : ''} ·{' '}
              {ujian.sisa === 0 ? 'HARI INI' : ujian.sisa === 1 ? 'besok' : `${ujian.sisa} hari lagi`}
            </p>
          )}
        </div>
        <div className="shrink-0 flex items-start gap-2">
          <button
            onClick={kirim}
            disabled={sending || !u.email}
            title={u.email ? `Kirim email penyemangat ke ${u.email}` : 'Akun ini tidak punya email'}
            className="inline-flex items-center gap-1.5 text-xs font-bold rounded-full border border-maroon-300 text-maroon-600 px-3 py-1.5 hover:bg-maroon-50 disabled:opacity-40"
          >
            <Mail size={13} /> {sending ? 'Mengirim…' : 'Kirim Email'}
          </button>

          {/* Kirim WA: pilih dulu template pesannya */}
          <div className="relative">
            <button
              onClick={() => setWaOpen((o) => !o)}
              disabled={sending || !u.phone}
              title={u.phone ? `Kirim WA ke ${u.phone}` : 'Akun ini belum punya nomor WA'}
              className="inline-flex items-center gap-1.5 text-xs font-bold rounded-full border border-green-300 text-green-700 px-3 py-1.5 hover:bg-green-50 disabled:opacity-40"
            >
              <MessageCircle size={13} /> Kirim WA
              <ChevronDown size={12} className={`transition-transform ${waOpen ? 'rotate-180' : ''}`} />
            </button>
            {waOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setWaOpen(false)} />
                <div className="absolute right-0 z-20 mt-2 w-64 rounded-xl border border-alba-200 bg-alba-50 shadow-card-hover p-1.5 animate-fade-in">
                  <p className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-stone-400">
                    Pilih template pesan
                  </p>
                  {WA_TEMPLATES.map((t) => (
                    <button
                      key={t.key}
                      onClick={() => kirimWa(t.key, t.label)}
                      className="w-full text-left rounded-lg px-2.5 py-2 text-xs font-semibold text-stone-700 hover:bg-green-50 hover:text-green-800"
                    >
                      {t.label}
                    </button>
                  ))}
                  <p className="px-2.5 py-1.5 text-[10px] text-stone-400 border-t border-alba-200 mt-1">
                    Isi tiap template bisa diubah di tab Notifikasi WA.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      {sent && <p className="text-[11px] mt-2 text-stone-600 bg-alba-100 border border-alba-200 rounded-lg px-3 py-1.5">{sent}</p>}
    </div>
  );
}

// ==========================================================================
// BAGIAN 2 - RIWAYAT PERUBAHAN WEB
// ==========================================================================
function RiwayatPerubahan() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('waktu'); // 'waktu' | 'pelaku' | 'section'
  const [filterSection, setFilterSection] = useState('');
  const [filterActor, setFilterActor] = useState('');
  const [query, setQuery] = useState('');
  const [preview, setPreview] = useState(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const list = await pb.collection('activity_log').getList(1, 300, { sort: '-created' });
      setRows(list.items || []);
    } catch (e) {
      setError(
        e?.status === 404
          ? 'Collection activity_log belum ada - jalankan migrasi PocketBase terbaru dulu.'
          : 'Gagal memuat riwayat: ' + (e?.message || '')
      );
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const actors = useMemo(() => {
    const m = new Map();
    rows.forEach((r) => { if (r.actorName) m.set(r.actorName, true); });
    return [...m.keys()].sort();
  }, [rows]);

  const shown = useMemo(() => {
    const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    let list = rows.filter((r) => {
      if (filterSection && r.section !== filterSection) return false;
      if (filterActor && r.actorName !== filterActor) return false;
      if (terms.length) {
        const hay = [r.summary, r.targetLabel, r.actorName].filter(Boolean).join(' ').toLowerCase();
        if (!terms.every((t) => hay.includes(t))) return false;
      }
      return true;
    });
    list = [...list];
    if (sortBy === 'pelaku') {
      list.sort((a, b) => (a.actorName || '').localeCompare(b.actorName || '') || new Date(b.created) - new Date(a.created));
    } else if (sortBy === 'section') {
      list.sort((a, b) => (a.section || '').localeCompare(b.section || '') || new Date(b.created) - new Date(a.created));
    } else {
      list.sort((a, b) => new Date(b.created) - new Date(a.created));
    }
    return list;
  }, [rows, sortBy, filterSection, filterActor, query]);

  return (
    <div className="bg-alba-50 rounded-2xl border border-alba-200 p-5 shadow-card space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="font-bold text-sm text-stone-700">
          Riwayat Perubahan Web
          <span className="ml-2 font-normal text-xs text-stone-400">{shown.length} dari {rows.length} catatan</span>
        </h3>
        <button onClick={load} disabled={loading} className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-maroon-600 disabled:opacity-50">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Muat ulang
        </button>
      </div>

      {error && <p className="text-sm bg-red-50 border border-red-200 text-red-600 rounded-lg px-4 py-2">{error}</p>}

      {/* Urutkan & saring */}
      <div className="grid sm:grid-cols-3 gap-2">
        <label className="block">
          <span className="block text-[11px] font-bold uppercase tracking-wider text-stone-400 mb-1">Urutkan</span>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="w-full rounded-lg border border-alba-300 px-3 py-2 text-sm bg-alba-50">
            <option value="waktu">Waktu perubahan (terbaru)</option>
            <option value="pelaku">Siapa yang mengubah</option>
            <option value="section">Jenis perubahan</option>
          </select>
        </label>
        <label className="block">
          <span className="block text-[11px] font-bold uppercase tracking-wider text-stone-400 mb-1">Jenis perubahan</span>
          <select value={filterSection} onChange={(e) => setFilterSection(e.target.value)} className="w-full rounded-lg border border-alba-300 px-3 py-2 text-sm bg-alba-50">
            <option value="">Semua jenis</option>
            {Object.entries(ACTIVITY_SECTIONS).map(([k, v]) => (
              <option key={k} value={k}>{v.icon} {v.label}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="block text-[11px] font-bold uppercase tracking-wider text-stone-400 mb-1">Pelaku</span>
          <select value={filterActor} onChange={(e) => setFilterActor(e.target.value)} className="w-full rounded-lg border border-alba-300 px-3 py-2 text-sm bg-alba-50">
            <option value="">Semua orang</option>
            {actors.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </label>
      </div>

      <div className="relative">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari di riwayat…"
          className="w-full rounded-lg border border-alba-300 bg-alba-50 pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-maroon-400 focus:ring-4 focus:ring-maroon-600/10"
        />
      </div>

      <div className="space-y-2">
        {shown.map((r) => (
          <BarisRiwayat key={r.id} r={r} onPreview={setPreview} />
        ))}
        {!loading && rows.length === 0 && !error && (
          <p className="text-sm text-stone-400 px-1 py-2">Belum ada perubahan tercatat. Riwayat mulai terisi begitu ada soal/PPT yang diubah.</p>
        )}
        {rows.length > 0 && shown.length === 0 && (
          <p className="text-sm text-stone-400 px-1 py-2">Tidak ada catatan yang cocok dengan saringan ini.</p>
        )}
      </div>

      {preview && <PreviewRiwayat data={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}

function BarisRiwayat({ r, onPreview }) {
  const waktu = r.created ? new Date(r.created) : null;
  const punyaPreview = !!r.detail && (Array.isArray(r.detail) ? r.detail.length > 0 : Object.keys(r.detail).length > 0);
  return (
    <div className="rounded-xl border border-alba-200 bg-alba-50 px-4 py-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-stone-800">
            <span className="mr-1.5">{sectionIcon(r.section)}</span>
            {r.summary}
          </p>
          <p className="text-xs text-stone-500 mt-1">
            <span className="font-semibold text-maroon-600">{r.actorName || 'Tidak diketahui'}</span>
            {r.actorRole && <span className="text-stone-400"> ({r.actorRole})</span>}
            {waktu && (
              <>
                {' · '}
                {waktu.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                {' pukul '}
                {waktu.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                <span className="text-stone-400"> · {timeAgo(r.created)}</span>
              </>
            )}
          </p>
          {r.targetLabel && (
            <p className="text-[11px] text-stone-400 mt-1 truncate">{r.targetLabel}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 bg-alba-100 border border-alba-200 rounded-full px-2.5 py-1">
            {sectionLabel(r.section)}
          </span>
          {punyaPreview && (
            <button onClick={() => onPreview(r)} className="text-xs font-semibold text-maroon-600 hover:underline">
              Preview
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Preview isi perubahan - untuk soal, tampilkan pertanyaan + pilihan/kunci.
function PreviewRiwayat({ data, onClose }) {
  const items = Array.isArray(data.detail) ? data.detail : [data.detail];
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-alba-50 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto scrollbar-thin p-6 shadow-card-hover" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h3 className="font-display text-lg font-semibold text-maroon-700">{data.summary}</h3>
            <p className="text-xs text-stone-500 mt-0.5">
              {data.actorName} · {data.created && new Date(data.created).toLocaleString('id-ID')}
            </p>
          </div>
          <button onClick={onClose} className="shrink-0 text-stone-400 hover:text-maroon-600"><X size={20} /></button>
        </div>

        <div className="space-y-4">
          {items.filter(Boolean).map((it, i) => (
            <div key={i} className="rounded-xl border border-alba-200 bg-alba-100/50 p-4">
              {/* Perubahan PPT: tampilkan nama file lama → baru */}
              {it.from || it.to ? (
                <div className="text-sm space-y-1">
                  {it.subject && <p className="text-xs text-stone-500">{it.subject}{it.chapter ? ` · ${it.chapter}` : ''}</p>}
                  {it.from && <p><span className="font-bold text-stone-500">Sebelum:</span> {it.from}</p>}
                  {it.to && <p><span className="font-bold text-stone-500">Sesudah:</span> {it.to}</p>}
                </div>
              ) : (
                <>
                  <p className="font-medium text-sm text-stone-800 leading-relaxed">{it.text || '(teks soal kosong)'}</p>
                  {it.imageUrl && (
                    <img src={it.imageUrl} alt="Gambar soal" referrerPolicy="no-referrer" loading="lazy" className="mt-3 max-h-56 max-w-full rounded-lg border border-alba-200" />
                  )}
                  {(it.choices || []).length > 0 && (
                    <div className="mt-3 space-y-1.5">
                      {it.choices.map((c, j) => (
                        <p key={j} className={`text-xs rounded-lg px-3 py-1.5 border ${c.correct ? 'bg-green-50 border-green-300 text-green-900 font-semibold' : 'bg-alba-50 border-alba-200 text-stone-600'}`}>
                          <span className="font-bold mr-1.5">{String.fromCharCode(65 + j)}.</span>{c.text}
                          {c.correct && ' ✓'}
                        </p>
                      ))}
                    </div>
                  )}
                  {(it.subQuestions || []).length > 0 && (
                    <div className="mt-3 space-y-1.5">
                      {it.subQuestions.map((s, j) => (
                        <p key={j} className="text-xs bg-alba-50 border border-alba-200 rounded-lg px-3 py-1.5 text-stone-600">
                          <span className="font-bold mr-1.5">{s.label}.</span>{s.question}
                          {s.validAnswers?.length > 0 && (
                            <span className="text-green-800 font-semibold"> - {s.validAnswers.join(' | ')}</span>
                          )}
                        </p>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>

        <div className="pt-4 mt-4 border-t border-alba-200 text-right">
          <button onClick={onClose} className="px-5 py-2 bg-alba-200 hover:bg-alba-300 rounded-lg text-sm font-semibold">Tutup</button>
        </div>
      </div>
    </div>
  );
}
