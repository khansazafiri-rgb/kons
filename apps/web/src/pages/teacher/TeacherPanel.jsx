import React, { useEffect, useState } from 'react';
import Header from '@/components/Header';
import pb from '@/lib/pocketbaseClient';
import { useAuth } from '@/context/AuthContext';
import { EditSoalHub, StudentCards } from '@/pages/admin/AdminPanel';
import PPTUpload from '@/components/PPTUpload';

const TABS = ['Profil Pengajar', 'Siswa', 'Edit Soal', 'PPT Mata Kuliah'];

export default function TeacherPanel() {
  const [tab, setTab] = useState('Profil Pengajar');
  const { user } = useAuth();
  const teachingSubjects = Array.isArray(user?.teachingSubjects) ? user.teachingSubjects : [];

  return (
    <div className="min-h-screen bg-alba-50">
      <Header />
      <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-1 md:grid-cols-[230px_1fr] gap-8 items-start">
        <nav className="md:sticky md:top-24 rounded-2xl border border-alba-200 bg-alba-50 shadow-card p-3 space-y-1">
          <p className="px-3 pt-1 pb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-maroon-500">Dashboard Pengajar</p>
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`w-full text-left rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors ${tab === t ? 'bg-maroon-600 text-alba-50 shadow-sm' : 'hover:bg-maroon-50 hover:text-maroon-600 text-stone-600'}`}>
              {t}
            </button>
          ))}
        </nav>
        <div>
          {tab === 'Profil Pengajar' && <ProfilPengajar />}
          {/* Siswa: hanya yang mengambil mata kuliah ajar teacher ini; progres dihitung dari mata kuliah ajarnya saja */}
          {tab === 'Siswa' && <StudentCards subjectScope={teachingSubjects} />}
          {/* Edit Soal: dibatasi ke mata kuliah ajar (allowedSubjectIds) */}
          {tab === 'Edit Soal' && <EditSoalHub allowedSubjectIds={teachingSubjects} />}
          {tab === 'PPT Mata Kuliah' && <PPTUpload allowedSubjectIds={teachingSubjects} />}
        </div>
      </div>
    </div>
  );
}

function ProfilPengajar() {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState([]);
  useEffect(() => {
    if (user?.teachingSubjects?.length) {
      pb.collection('subjects').getFullList({ filter: user.teachingSubjects.map((id) => `id = '${id}'`).join(' || ') }).then(setSubjects);
    }
  }, [user]);
  return (
    <div className="bg-alba-50 rounded-2xl border border-alba-200 p-6 space-y-3 shadow-card">
      <h2 className="font-display text-lg font-semibold">Profil Pengajar</h2>
      <div className="grid sm:grid-cols-2 gap-4 pt-2">
        <ProfField label="ID User" value={user?.userId} />
        <ProfField label="Nama" value={user?.name} />
        <ProfField label="Gmail" value={user?.email} />
        <ProfField label="Semester" value={user?.semester} />
        <ProfField label="Asal kuliah" value={user?.asalKuliah} />
        <ProfField label="Jumlah mata kuliah ajar" value={subjects.length} />
      </div>
      <div className="rounded-xl bg-alba-100/60 border border-alba-200 px-4 py-3">
        <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-stone-400 mb-2">Mata kuliah yang diajar</p>
        {subjects.length ? (
          <div className="flex flex-wrap gap-2">
            {subjects.map((s) => (
              <span key={s.id} className="rounded-full bg-maroon-50 border border-maroon-100 text-maroon-700 text-xs font-bold px-3.5 py-1.5">{s.name}</span>
            ))}
          </div>
        ) : (
          <p className="text-sm font-medium text-stone-500">Belum dipilihkan oleh admin.</p>
        )}
      </div>
    </div>
  );
}

function ProfField({ label, value }) {
  return (
    <div className="rounded-xl bg-alba-100/60 border border-alba-200 px-4 py-3">
      <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-stone-400 mb-1">{label}</p>
      <p className="font-semibold text-stone-800">{value || '-'}</p>
    </div>
  );
}

