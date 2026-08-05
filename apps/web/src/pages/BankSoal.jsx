import React, { useEffect, useMemo, useState, useRef } from 'react';
import { Library, Lock } from 'lucide-react';
import Header, { bumpStreak, fetchEnrolledSubjectIds } from '@/components/Header';
import pb from '@/lib/pocketbaseClient';
import useUrlState from '@/lib/useUrlState';
import { filterLatihan, gabung } from '@/lib/chapterScope';
import { useAuth } from '@/context/AuthContext';
import QuestionRunner from '@/components/QuestionRunner';
import ChapterSelect from '@/components/ChapterSelect';
import { touchActivity } from '@/lib/activityLog';

// BANK SOAL - kumpulan soal dalam jumlah besar per mata kuliah/BAB
// (soal bertipe 'bank' di collection questions).
//
// Fitur ini DISIAPKAN tapi belum dirilis: halaman hanya bisa dibuka kalau
// admin menyalakan saklar "Bank Soal" di Dashboard Admin → Landing Page →
// Teks & Fitur (landing_settings.showBankSoal). Selama mati, kartu menunya
// tidak muncul di beranda dan akses langsung lewat URL diblokir.
export default function BankSoal() {
  const { user, role } = useAuth();
  const [enabled, setEnabled] = useState(null); // null = masih cek saklar
  const [subjects, setSubjects] = useState([]);
  // Pilihan disimpan di URL supaya refresh tidak melempar balik ke daftar awal.
  const [subjectId, setSubjectId] = useUrlState('subject', '');
  const [chapters, setChapters] = useState([]);
  const [chapterId, setChapterId] = useUrlState('chapter', '');
  const mkSebelumnya = useRef(subjectId);
  const [questions, setQuestions] = useState(null);
  const [enrolled, setEnrolled] = useState(null);

  useEffect(() => {
    let alive = true;
    pb.collection('landing_settings')
      .getFullList()
      .then((rows) => { if (alive) setEnabled(!!rows[0]?.showBankSoal); })
      .catch(() => { if (alive) setEnabled(false); });
    fetchEnrolledSubjectIds(pb, user, role).then((ids) => { if (alive) setEnrolled(ids); });
    return () => { alive = false; };
  }, [user, role]);

  useEffect(() => {
    if (!enabled) return;
    pb.collection('subjects').getFullList({ sort: 'order' }).then(setSubjects).catch(() => {});
  }, [enabled]);

  useEffect(() => {
    // Hanya kosongkan BAB kalau mata kuliahnya benar-benar berganti, supaya BAB
    // yang dipulihkan dari URL tidak ikut terhapus saat halaman dibuka ulang.
    if (mkSebelumnya.current !== subjectId) {
      setChapterId('');
      mkSebelumnya.current = subjectId;
    }
    if (!subjectId) return setChapters([]);
    pb.collection('chapters')
      .getFullList({ sort: 'order', filter: gabung(pb.filter('subject = {:s}', { s: subjectId }), 'hidden != true', filterLatihan()) })
      .then(setChapters)
      .catch(() => setChapters([]));
  }, [subjectId]);

  const visibleSubjects = useMemo(
    () => (enrolled ? subjects.filter((s) => enrolled.includes(s.id)) : subjects),
    [subjects, enrolled],
  );

  const start = async () => {
    if (!subjectId) return;
    let filter = `subject = '${subjectId}' && type = 'bank'`;
    if (chapterId) filter += ` && chapter = '${chapterId}'`;
    const qs = await pb.collection('questions').getFullList({ filter, sort: 'order', expand: 'chapter' });
    if (!qs.length) {
      alert('Belum ada soal bank untuk pilihan ini.');
      return;
    }
    setQuestions(qs);
  };

  const submit = async ({ score }) => {
    await bumpStreak(pb, user);
    const namaMk = subjects.find((s) => s.id === subjectId)?.name || '';
    touchActivity(pb, user, `Mengerjakan Bank Soal ${namaMk} (nilai ${score})`);
  };

  if (enabled === null) return null;

  if (!enabled) {
    return (
      <div className="min-h-screen bg-grid-soft">
        <Header />
        <div className="max-w-md mx-auto px-6 py-24 text-center">
          <div className="w-16 h-16 bg-maroon-50 text-maroon-600 rounded-full flex items-center justify-center mx-auto mb-5 border border-maroon-100">
            <Lock size={26} />
          </div>
          <h2 className="font-display text-xl font-semibold text-maroon-700 mb-2">Bank Soal Belum Dibuka</h2>
          <p className="text-sm text-stone-600">Fitur ini sedang disiapkan. Nantikan pengumumannya ya!</p>
        </div>
      </div>
    );
  }

  if (questions) {
    return (
      <div className="min-h-screen bg-grid-soft">
        <Header />
        <div className="max-w-5xl mx-auto px-6 py-10">
          <QuestionRunner
            questions={questions}
            mode="learning"
            initialAnswers={{}}
            onExit={() => setQuestions(null)}
            onSubmit={submit}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-grid-soft">
      <Header />
      <div className="max-w-3xl mx-auto px-6 py-14">
        <p className="text-maroon-600 font-bold tracking-[0.2em] text-xs mb-2 flex items-center gap-2">
          <Library size={14} />
          BANK SOAL
        </p>
        <h1 className="font-display text-3xl font-semibold mb-2">Latihan dari Bank Soal</h1>
        <p className="text-stone-600 font-medium mb-8">Pilih mata kuliah (dan BAB kalau mau lebih spesifik), lalu kerjakan sebanyak yang kamu sanggup.</p>

        <div className="bg-alba-50 rounded-2xl border border-alba-200 p-8 shadow-card space-y-6">
          <div>
            <label className="block text-sm font-bold text-stone-700 mb-3">1. Pilih Mata Kuliah</label>
            <div className="grid sm:grid-cols-2 gap-2.5">
              {visibleSubjects.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSubjectId(s.id)}
                  className={`text-left rounded-xl border p-4 text-sm font-bold transition-all ${
                    subjectId === s.id ? 'border-maroon-600 bg-maroon-50 text-maroon-700' : 'border-alba-200 text-stone-700 hover:border-maroon-200 hover:bg-alba-100/60'
                  }`}
                >
                  {s.name}
                </button>
              ))}
              {visibleSubjects.length === 0 && <p className="text-sm text-stone-400 col-span-2">Belum ada mata kuliah tersedia.</p>}
            </div>
          </div>

          {subjectId && (
            <div className="animate-fade-in space-y-6">
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-2">2. BAB (opsional, kosongkan untuk semua BAB)</label>
                <ChapterSelect
                  chapters={chapters}
                  value={chapterId}
                  onChange={setChapterId}
                  openSignal={subjectId}
                  placeholder="Semua BAB"
                />
              </div>
              <button
                onClick={start}
                className="w-full rounded-xl bg-maroon-600 text-alba-50 font-bold py-3.5 shadow-card hover:bg-maroon-700 transition-colors"
              >
                Mulai Mengerjakan
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
