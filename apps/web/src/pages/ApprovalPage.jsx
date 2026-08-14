import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle2, GraduationCap, Loader2, ShieldAlert, XCircle } from 'lucide-react';
import { Logo } from '@/components/Header';
import pb from '@/lib/pocketbaseClient';
import { STUDENT_TYPES } from '@/lib/studentType';

// Halaman ACC ringkas lewat magic link: /acc/<token>
//
// Dibuka admin dari tombol di email "pendaftar baru", TANPA perlu login
// dashboard. Admin tinggal centang mata kuliah, pilih kelas, klik ACC. Semua
// pengaman ada di server (signup-approve.pb.js): token sekali pakai, hanya untuk
// siswa yang masih menunggu ACC, dan setiap pilihan divalidasi ulang di sana.
//
// Halaman ini sengaja berdiri sendiri (bukan di balik ProtectedRoute) - yang
// menggantikan login adalah token di URL.

const REASON_TEXT = {
  kosong: 'Link tidak lengkap. Pastikan kamu membuka link ACC dari email secara utuh.',
  'tidak dikenal': 'Link tidak dikenal atau sudah pernah dipakai.',
  'sudah diproses': 'Pendaftaran ini sudah diproses sebelumnya. Tidak perlu di-ACC lagi.',
  'bukan siswa': 'Akun ini bukan siswa. ACC pengajar/admin dilakukan dari dashboard.',
  kedaluwarsa: 'Link ini sudah kedaluwarsa (berlaku 7 hari). Silakan ACC dari dashboard admin.',
};

export default function ApprovalPage() {
  const { token } = useParams();
  const [state, setState] = useState('loading'); // loading | form | invalid | done | error
  const [reason, setReason] = useState('');
  const [student, setStudent] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);

  // Pilihan admin
  const [picked, setPicked] = useState([]); // id mata kuliah
  const [kelas, setKelas] = useState('');
  const [studentType, setStudentType] = useState('reguler');

  const [saving, setSaving] = useState(false);
  const [errMsg, setErrMsg] = useState('');
  const [doneName, setDoneName] = useState('');

  useEffect(() => {
    let alive = true;
    pb.send('/api/pcv/approve/load', { method: 'GET', query: { token } })
      .then((res) => {
        if (!alive) return;
        if (!res.valid) {
          setReason(res.reason || '');
          setState('invalid');
          return;
        }
        setStudent(res.student);
        setSubjects(res.subjects || []);
        setClasses(res.classes || []);
        setPicked(Array.isArray(res.student.teachingSubjects) ? res.student.teachingSubjects : []);
        setKelas(res.student.kelas || '');
        setStudentType(res.student.studentType || 'reguler');
        setState('form');
      })
      .catch(() => {
        if (alive) setState('error');
      });
    return () => {
      alive = false;
    };
  }, [token]);

  const toggleSubject = (id) =>
    setPicked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const submit = async () => {
    setSaving(true);
    setErrMsg('');
    try {
      const res = await pb.send('/api/pcv/approve/submit', {
        method: 'POST',
        body: { token, teachingSubjects: picked, kelas, studentType },
      });
      setDoneName(res.name || student?.name || '');
      setState('done');
    } catch (e) {
      setErrMsg(e?.message || 'Gagal meng-ACC. Coba lagi.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-alba-100 flex flex-col items-center px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="flex justify-center mb-6">
          <Logo />
        </div>

        {state === 'loading' && (
          <div className="rounded-2xl border border-alba-200 bg-alba-50 p-8 text-center">
            <Loader2 className="w-8 h-8 mx-auto animate-spin text-maroon-600" />
            <p className="text-sm text-stone-500 mt-3">Memuat data pendaftar…</p>
          </div>
        )}

        {state === 'error' && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
            <XCircle className="w-10 h-10 mx-auto text-red-500" />
            <p className="font-semibold mt-3">Gagal memuat</p>
            <p className="text-sm text-stone-500 mt-1">
              Ada gangguan koneksi ke server. Muat ulang halaman ini, atau ACC dari dashboard admin.
            </p>
          </div>
        )}

        {state === 'invalid' && (
          <div className="rounded-2xl border border-gold-200 bg-gold-100/40 p-8 text-center">
            <ShieldAlert className="w-10 h-10 mx-auto text-gold-600" />
            <p className="font-semibold mt-3">Link tidak berlaku</p>
            <p className="text-sm text-stone-600 mt-1">{REASON_TEXT[reason] || 'Link ACC ini tidak dapat digunakan.'}</p>
            <Link
              to="/admin"
              className="inline-block mt-5 rounded-lg bg-maroon-600 text-alba-50 text-sm font-bold px-5 py-2.5 hover:bg-maroon-700"
            >
              Buka Dashboard Admin
            </Link>
          </div>
        )}

        {state === 'done' && (
          <div className="rounded-2xl border border-green-200 bg-green-50 p-8 text-center">
            <CheckCircle2 className="w-12 h-12 mx-auto text-green-600" />
            <p className="font-display text-lg font-semibold mt-3">Berhasil di-ACC!</p>
            <p className="text-sm text-stone-600 mt-1">
              <b>{doneName}</b> sekarang bisa mengakses web siswa. Email pemberitahuan sudah dikirim otomatis ke pendaftar.
            </p>
            <p className="text-xs text-stone-400 mt-4">Link ini sudah tidak aktif lagi — aman untuk ditutup.</p>
          </div>
        )}

        {state === 'form' && student && (
          <div className="rounded-2xl border border-alba-200 bg-alba-50 p-6 shadow-card">
            <div className="flex items-center gap-2 text-maroon-700 mb-1">
              <GraduationCap className="w-5 h-5" />
              <h1 className="font-display text-lg font-semibold">ACC Pendaftaran Siswa</h1>
            </div>
            <p className="text-xs text-stone-500 mb-4">
              Pilih mata kuliah &amp; kelasnya, lalu klik <b>ACC</b>. Pendaftar otomatis menerima email bahwa web sudah bisa diakses.
            </p>

            {/* Ringkasan pendaftar */}
            <div className="rounded-xl border border-gold-200 bg-gold-100/30 p-4 mb-5">
              <p className="font-semibold">
                {student.name} <span className="text-stone-400 font-normal">({student.userId})</span>
              </p>
              <p className="text-xs text-stone-500 mt-0.5">
                {student.email} · WA {student.phone || '-'} · Semester {student.semester || '-'} · {student.asalKuliah || '-'}
              </p>
            </div>

            {/* Tipe siswa */}
            <label className="block mb-5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Tipe siswa</span>
              <select
                value={studentType}
                onChange={(e) => setStudentType(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-alba-300 bg-alba-50 px-3 py-2 text-sm font-semibold"
              >
                {STUDENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </label>

            {/* Mata kuliah */}
            <div className="mb-5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-2">
                Mata kuliah yang boleh diakses
              </p>
              {subjects.length === 0 ? (
                <p className="text-xs text-stone-400">Belum ada mata kuliah di database.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {subjects.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggleSubject(s.id)}
                      className={`text-xs rounded-full px-3 py-1 border transition-colors ${
                        picked.includes(s.id)
                          ? 'bg-maroon-600 text-alba-50 border-maroon-600'
                          : 'border-alba-300 hover:border-maroon-300 hover:text-maroon-600'
                      }`}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Kelas reguler */}
            {classes.length > 0 && (
              <div className="mb-6">
                <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-2">
                  Kelas reguler (untuk reminder jadwal H-1)
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {classes.map((k) => (
                    <button
                      key={k.id}
                      type="button"
                      onClick={() => setKelas((cur) => (cur === k.id ? '' : k.id))}
                      className={`text-xs rounded-full px-3 py-1 border transition-colors ${
                        kelas === k.id
                          ? 'bg-maroon-600 text-alba-50 border-maroon-600'
                          : 'border-alba-300 hover:border-maroon-300 hover:text-maroon-600'
                      }`}
                    >
                      {k.name}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-stone-400 mt-1.5">
                  {kelas
                    ? 'Klik kelas yang sedang aktif untuk melepaskannya.'
                    : 'Boleh dikosongkan — tapi selama kosong, siswa ini tidak akan dapat reminder jadwal.'}
                </p>
              </div>
            )}

            {errMsg && (
              <p className="text-sm rounded-lg bg-red-50 border border-red-200 text-red-600 px-3 py-2 mb-4">{errMsg}</p>
            )}

            <button
              onClick={submit}
              disabled={saving}
              className="w-full rounded-xl bg-green-600 text-alba-50 font-bold py-3 hover:bg-green-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {saving ? 'Memproses…' : 'ACC & Kirim Email'}
            </button>
            <p className="text-[11px] text-center text-stone-400 mt-3">
              Link ACC ini sekali pakai &amp; berlaku 7 hari sejak pendaftaran.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
