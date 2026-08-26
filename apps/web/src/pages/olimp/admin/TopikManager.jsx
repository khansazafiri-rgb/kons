import React, { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Check, Eye, EyeOff, Pencil, Plus, Trash2, X } from 'lucide-react';
import pb from '@/lib/pocketbaseClient';
import { olimpLog } from '@/lib/olimp';

// TOPIK PER MATA KULIAH - padanan "BAB" di web PCV.
//
// Sengaja dibuat menyerupai ChapterManager di web PCV (tambah, ubah nama,
// sembunyikan, urutkan, hapus, pilih) supaya admin yang sudah terbiasa di sana
// tidak perlu belajar alur baru. Bedanya cuma dua: tidak ada urusan universitas
// FK, dan penanda di kanan tiap baris adalah jumlah soal Olimp.
//
// Props:
// - subjectId        : mata kuliah aktif
// - selectedTopicId  : id topik yang sedang dipilih
// - onSelect(id)     : dipanggil saat sebuah topik diklik
// - refreshSignal    : ubah nilainya untuk memaksa memuat ulang jumlah soal

export default function TopikManager({ subjectId, selectedTopicId, onSelect, refreshSignal }) {
  const [topics, setTopics] = useState([]);
  const [counts, setCounts] = useState({});
  const [judulBaru, setJudulBaru] = useState('');
  const [editId, setEditId] = useState(null);
  const [editJudul, setEditJudul] = useState('');
  const [error, setError] = useState('');

  const muat = () => {
    if (!subjectId) { setTopics([]); setCounts({}); return; }
    setError('');
    pb.collection('olimp_topics')
      .getFullList({ filter: `subject = "${subjectId}"`, sort: 'order' })
      .then(setTopics)
      .catch((e) => setError('Gagal memuat topik: ' + (e?.message || '')));
    pb.collection('olimp_questions')
      .getFullList({ filter: `subject = "${subjectId}"`, fields: 'id,topic' })
      .then((rows) => {
        const m = {};
        rows.forEach((r) => { const k = r.topic || '__tanpa__'; m[k] = (m[k] || 0) + 1; });
        setCounts(m);
      })
      .catch(() => setCounts({}));
  };

  useEffect(muat, [subjectId, refreshSignal]); // eslint-disable-line react-hooks/exhaustive-deps

  const tambah = async () => {
    if (!judulBaru.trim() || !subjectId) return;
    try {
      const t = await pb.collection('olimp_topics').create({
        subject: subjectId,
        title: judulBaru.trim(),
        order: topics.length + 1,
      });
      olimpLog('topic_create', `Tambah topik ${t.title}`);
      setJudulBaru('');
      muat();
      onSelect?.(t.id);
    } catch (e) {
      setError('Gagal menambah topik: ' + (e?.message || ''));
    }
  };

  const simpanNama = async (t) => {
    if (!editJudul.trim()) return;
    try {
      await pb.collection('olimp_topics').update(t.id, { title: editJudul.trim() });
      setEditId(null);
      muat();
    } catch (e) {
      setError('Gagal mengubah nama: ' + (e?.message || ''));
    }
  };

  const toggleHidden = async (t) => {
    try {
      await pb.collection('olimp_topics').update(t.id, { hidden: !t.hidden });
      muat();
    } catch (e) {
      setError('Gagal mengubah: ' + (e?.message || ''));
    }
  };

  // Tukar posisi dengan tetangganya, lalu tulis ulang kedua nomor urutnya.
  const geser = async (i, arah) => {
    const j = i + arah;
    if (j < 0 || j >= topics.length) return;
    const a = topics[i];
    const b = topics[j];
    try {
      await pb.collection('olimp_topics').update(a.id, { order: j + 1 });
      await pb.collection('olimp_topics').update(b.id, { order: i + 1 });
      muat();
    } catch (e) {
      setError('Gagal mengurutkan: ' + (e?.message || ''));
    }
  };

  const hapus = async (t) => {
    const n = counts[t.id] || 0;
    if (n > 0) {
      setError(`Topik "${t.title}" masih berisi ${n} soal. Pindahkan atau hapus soalnya dulu.`);
      return;
    }
    if (!window.confirm(`Hapus topik "${t.title}"?`)) return;
    try {
      await pb.collection('olimp_topics').delete(t.id);
      olimpLog('topic_delete', `Hapus topik ${t.title}`, 'warning');
      if (selectedTopicId === t.id) onSelect?.('');
      muat();
    } catch (e) {
      setError('Gagal menghapus: ' + (e?.message || ''));
    }
  };

  const tanpaTopik = counts.__tanpa__ || 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Topik ({topics.length})</p>
        {tanpaTopik > 0 && (
          <button
            onClick={() => onSelect?.('__tanpa__')}
            className={`text-[11px] font-semibold rounded-full px-2.5 py-1 transition-colors ${
              selectedTopicId === '__tanpa__' ? 'bg-amber-500 text-white' : 'bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100'
            }`}
          >
            {tanpaTopik} soal belum bertopik
          </button>
        )}
      </div>

      {error && <p className="rounded-lg border border-red-200 bg-red-50 text-red-700 text-xs px-3 py-2">{error}</p>}

      <ul className="space-y-1.5">
        {topics.map((t, i) => {
          const dipilih = selectedTopicId === t.id;
          return (
            <li
              key={t.id}
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-2.5 transition-colors ${
                dipilih ? 'border-maroon-400 bg-maroon-50' : 'border-alba-200 bg-alba-50 hover:border-maroon-200'
              }`}
            >
              {editId === t.id ? (
                <>
                  <input
                    value={editJudul}
                    onChange={(e) => setEditJudul(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') simpanNama(t); }}
                    autoFocus
                    className="flex-1 min-w-0 rounded-lg border border-alba-300 bg-alba-50 px-2.5 py-1.5 text-sm focus:border-maroon-300 focus:outline-none"
                  />
                  <button onClick={() => simpanNama(t)} title="Simpan" className="w-7 h-7 rounded-lg text-emerald-600 flex items-center justify-center hover:bg-emerald-50"><Check size={14} /></button>
                  <button onClick={() => setEditId(null)} title="Batal" className="w-7 h-7 rounded-lg text-stone-400 flex items-center justify-center hover:bg-alba-200"><X size={14} /></button>
                </>
              ) : (
                <>
                  <button onClick={() => onSelect?.(t.id)} className="min-w-0 flex-1 text-left">
                    <span className={`block text-sm font-semibold truncate ${t.hidden ? 'text-stone-400 line-through' : 'text-stone-800'}`}>
                      {t.title}
                    </span>
                    <span className="block text-[11px] text-stone-500">{counts[t.id] || 0} soal</span>
                  </button>
                  <button onClick={() => geser(i, -1)} disabled={i === 0} title="Naikkan" className="w-7 h-7 rounded-lg text-stone-400 flex items-center justify-center hover:text-maroon-600 disabled:opacity-25"><ArrowUp size={13} /></button>
                  <button onClick={() => geser(i, 1)} disabled={i === topics.length - 1} title="Turunkan" className="w-7 h-7 rounded-lg text-stone-400 flex items-center justify-center hover:text-maroon-600 disabled:opacity-25"><ArrowDown size={13} /></button>
                  <button onClick={() => { setEditId(t.id); setEditJudul(t.title); }} title="Ubah nama" className="w-7 h-7 rounded-lg text-stone-400 flex items-center justify-center hover:text-maroon-600"><Pencil size={13} /></button>
                  <button
                    onClick={() => toggleHidden(t)}
                    title={t.hidden ? 'Tampilkan lagi' : 'Sembunyikan dari penyusunan paket'}
                    className="w-7 h-7 rounded-lg text-stone-400 flex items-center justify-center hover:text-maroon-600"
                  >
                    {t.hidden ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                  <button onClick={() => hapus(t)} title="Hapus topik" className="w-7 h-7 rounded-lg text-stone-400 flex items-center justify-center hover:text-red-600"><Trash2 size={13} /></button>
                </>
              )}
            </li>
          );
        })}
        {topics.length === 0 && (
          <li className="rounded-xl border border-dashed border-alba-300 bg-alba-100/40 px-4 py-6 text-center text-sm text-stone-500">
            Belum ada topik di mata kuliah ini. Tambahkan satu di bawah.
          </li>
        )}
      </ul>

      <div className="flex gap-2 pt-1">
        <input
          value={judulBaru}
          onChange={(e) => setJudulBaru(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') tambah(); }}
          placeholder="Tambah topik baru, mis. Bakteriologi Dasar"
          className="flex-1 min-w-0 rounded-xl border border-alba-300 bg-alba-50 px-3.5 py-2.5 text-sm focus:border-maroon-300 focus:outline-none"
        />
        <button onClick={tambah} className="inline-flex items-center gap-1.5 rounded-xl bg-maroon-600 text-alba-50 text-sm font-semibold px-4 py-2.5 hover:bg-maroon-700 transition-colors">
          <Plus size={15} /> Tambah
        </button>
      </div>
    </div>
  );
}
