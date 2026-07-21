import React, { useEffect, useState } from 'react';
import pb from '@/lib/pocketbaseClient';

// Manajemen BAB per mata kuliah: tambah, ubah nama, hide/tampilkan, urutkan,
// hapus, dan PILIH bab. Dipakai bersama di "Edit Soal" (Cicil Belajar) & "PPT
// Mata Kuliah", untuk admin maupun pengajar (izin ditegakkan oleh API rules).
//
// Props:
// - subjectId          : mata kuliah aktif
// - selectedChapterId  : id bab yang sedang dipilih
// - onSelect(id)       : dipanggil saat sebuah bab diklik (untuk dipilih)
export default function ChapterManager({ subjectId, selectedChapterId, onSelect }) {
  const [chapters, setChapters] = useState([]);
  const [newTitle, setNewTitle] = useState('');
  const [error, setError] = useState('');

  const errMsg = (e) => {
    if (e?.status === 404 || e?.status === 403) {
      return 'Tidak diizinkan mengubah BAB mata kuliah ini (pastikan ini mata kuliah ajar Anda / login sebagai admin).';
    }
    const data = e?.response?.data || e?.data || {};
    const fields = Object.entries(data).map(([f, info]) => `${f}: ${info?.message || 'tidak valid'}`).join(' | ');
    return fields ? `Gagal: ${fields}` : ('Gagal: ' + (e?.message || 'terjadi kesalahan.'));
  };

  const load = () => {
    if (!subjectId) { setChapters([]); return; }
    pb.collection('chapters')
      .getFullList({ sort: 'order', filter: `subject = '${subjectId}'` })
      .then(setChapters)
      .catch((e) => setError('Gagal memuat BAB: ' + (e?.message || '')));
  };
  useEffect(() => { setError(''); load(); }, [subjectId]); // eslint-disable-line react-hooks/exhaustive-deps

  const addChapter = async () => {
    if (!newTitle.trim() || !subjectId) return;
    setError('');
    try {
      await pb.collection('chapters').create({ title: newTitle.trim(), subject: subjectId, order: chapters.length + 1 });
      setNewTitle('');
      load();
    } catch (e) { setError(errMsg(e)); }
  };

  const renameChapter = async (c) => {
    const title = prompt('Ubah nama BAB:', c.title);
    if (title == null) return; // batal
    const t = title.trim();
    if (!t || t === c.title) return;
    setError('');
    try { await pb.collection('chapters').update(c.id, { title: t }); load(); }
    catch (e) { setError(errMsg(e)); }
  };

  const toggleHide = async (c) => {
    setError('');
    try { await pb.collection('chapters').update(c.id, { hidden: !c.hidden }); load(); }
    catch (e) { setError(errMsg(e)); }
  };

  const move = async (index, dir) => {
    const target = index + dir;
    if (target < 0 || target >= chapters.length) return;
    const a = chapters[index], b = chapters[target];
    const aOrder = Number.isFinite(a.order) ? a.order : index + 1;
    const bOrder = Number.isFinite(b.order) ? b.order : target + 1;
    setError('');
    try {
      await pb.collection('chapters').update(a.id, { order: bOrder });
      await pb.collection('chapters').update(b.id, { order: aOrder });
      load();
    } catch (e) { setError(errMsg(e)); }
  };

  const remove = async (c) => {
    if (!confirm(`Hapus BAB "${c.title}"? Semua soal & PPT di dalamnya ikut terhapus dan tidak bisa dikembalikan.`)) return;
    setError('');
    try {
      await pb.collection('chapters').delete(c.id);
      if (selectedChapterId === c.id) onSelect?.('');
      load();
    } catch (e) { setError(errMsg(e)); }
  };

  if (!subjectId) return null;

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addChapter(); } }}
          placeholder="Tambah BAB baru"
          className="flex-1 min-w-0 rounded-lg border border-alba-300 px-3 py-2 text-sm bg-alba-50"
        />
        <button onClick={addChapter} className="shrink-0 rounded-lg bg-maroon-600 text-alba-50 text-sm font-semibold px-4">Tambah</button>
      </div>
      <p className="text-xs text-stone-400">Panah ↑ ↓ mengatur urutan. ✏️ ubah nama, 👁 sembunyikan/tampilkan dari siswa, 🗑 hapus BAB beserta isinya. Klik nama BAB untuk memilih.</p>
      {error && <p className="text-xs whitespace-pre-wrap bg-red-50 border border-red-200 text-red-600 rounded-lg px-3 py-2">{error}</p>}
      <div className="grid gap-2 max-h-64 overflow-y-auto scrollbar-thin">
        {chapters.map((c, i) => (
          <div key={c.id} className={`flex items-center gap-1 rounded-lg border pl-1 pr-1.5 ${selectedChapterId === c.id ? 'border-maroon-600 bg-maroon-50' : c.hidden ? 'border-alba-200 bg-alba-100/50' : 'border-alba-200'}`}>
            <div className="flex flex-col shrink-0">
              <button onClick={() => move(i, -1)} disabled={i === 0} className="px-1 leading-none text-stone-400 disabled:opacity-25 hover:text-maroon-600" title="Naik">▲</button>
              <button onClick={() => move(i, +1)} disabled={i === chapters.length - 1} className="px-1 leading-none text-stone-400 disabled:opacity-25 hover:text-maroon-600" title="Turun">▼</button>
            </div>
            {/* min-w-0 + truncate: judul sepanjang apa pun tidak mendorong tombol ✏️ 👁 🗑 keluar layar */}
            <button onClick={() => onSelect?.(c.id)} title={c.title} className={`flex-1 min-w-0 truncate text-left px-2 py-2 text-sm ${selectedChapterId === c.id ? 'font-semibold text-maroon-700' : ''} ${c.hidden ? 'text-stone-400' : ''}`}>
              <span className="text-stone-400 mr-1">{i + 1}.</span>
              {c.hidden && <span className="mr-1.5 text-[9px] font-bold uppercase tracking-wide text-stone-500 bg-alba-200 rounded-full px-2 py-0.5">Hidden</span>}
              {c.title}
            </button>
            <button onClick={() => renameChapter(c)} className="w-8 h-8 shrink-0 rounded-md text-stone-400 hover:bg-gold-100 hover:text-gold-600" title="Ubah nama BAB">✏️</button>
            <button onClick={() => toggleHide(c)} className="w-8 h-8 shrink-0 rounded-md text-stone-400 hover:bg-maroon-50 hover:text-maroon-600" title={c.hidden ? 'Tampilkan ke siswa' : 'Sembunyikan dari siswa'}>{c.hidden ? '🙈' : '👁'}</button>
            <button onClick={() => remove(c)} className="w-8 h-8 shrink-0 rounded-md text-stone-400 hover:bg-red-50 hover:text-red-600" title="Hapus BAB">🗑</button>
          </div>
        ))}
        {chapters.length === 0 && <p className="text-xs text-stone-400 px-1 py-2">Belum ada BAB.</p>}
      </div>
    </div>
  );
}
