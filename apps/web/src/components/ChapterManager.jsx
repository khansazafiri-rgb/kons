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
// - indicator          : 'ppt' -> tanda ✓ bila bab sudah punya file PPT
//                        'soal' -> badge jumlah soal (latihan) pada bab
// - refreshSignal      : ubah nilainya untuk memaksa muat ulang (mis. setelah
//                        upload PPT / tambah soal dari komponen induk)
export default function ChapterManager({ subjectId, selectedChapterId, onSelect, indicator, refreshSignal }) {
  const [chapters, setChapters] = useState([]);
  const [newTitle, setNewTitle] = useState('');
  const [error, setError] = useState('');
  const [pptSet, setPptSet] = useState(() => new Set()); // chapterId yang sudah punya PPT
  const [soalCount, setSoalCount] = useState({});          // { chapterId: jumlah soal }

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

  // Muat data penanda (✓ PPT atau jumlah soal) sesuai mode.
  const loadIndicators = () => {
    if (!subjectId) return;
    if (indicator === 'ppt') {
      pb.collection('ppt_files')
        .getFullList({ filter: `subject = '${subjectId}'`, fields: 'chapter' })
        .then((rows) => setPptSet(new Set(rows.map((r) => r.chapter))))
        .catch(() => setPptSet(new Set()));
    } else if (indicator === 'soal') {
      pb.collection('questions')
        .getFullList({ filter: `subject = '${subjectId}' && type = 'latihan'`, fields: 'chapter' })
        .then((rows) => {
          const m = {};
          rows.forEach((r) => { if (r.chapter) m[r.chapter] = (m[r.chapter] || 0) + 1; });
          setSoalCount(m);
        })
        .catch(() => setSoalCount({}));
    }
  };

  const reload = () => { load(); loadIndicators(); };
  useEffect(() => { setError(''); reload(); }, [subjectId, indicator, refreshSignal]); // eslint-disable-line react-hooks/exhaustive-deps

  const addChapter = async () => {
    if (!newTitle.trim() || !subjectId) return;
    setError('');
    try {
      await pb.collection('chapters').create({ title: newTitle.trim(), subject: subjectId, order: chapters.length + 1 });
      setNewTitle('');
      reload();
    } catch (e) { setError(errMsg(e)); }
  };

  const renameChapter = async (c) => {
    const title = prompt('Ubah nama BAB:', c.title);
    if (title == null) return; // batal
    const t = title.trim();
    if (!t || t === c.title) return;
    setError('');
    try { await pb.collection('chapters').update(c.id, { title: t }); reload(); }
    catch (e) { setError(errMsg(e)); }
  };

  const toggleHide = async (c) => {
    setError('');
    try { await pb.collection('chapters').update(c.id, { hidden: !c.hidden }); reload(); }
    catch (e) { setError(errMsg(e)); }
  };

  const move = async (index, dir) => {
    const target = index + dir;
    if (target < 0 || target >= chapters.length) return;
    setError('');

    // Susun urutan baru dengan menukar posisi index & target.
    const reordered = [...chapters];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];

    // Tampilkan perubahan langsung (optimistic) supaya terasa responsif.
    setChapters(reordered);

    // Tulis ulang order menjadi 1..n untuk SEMUA bab yang nilainya berubah.
    // Cara ini tahan terhadap data lama yang order-nya duplikat / kosong (PocketBase
    // mengembalikan field number kosong sebagai 0), yang bikin metode "tukar dua
    // nilai" jadi tidak berpengaruh (0 ↔ 0). Dengan normalisasi ini tombol ↑ ↓
    // selalu memindahkan bab.
    try {
      const writes = reordered
        .map((c, i) => (c.order === i + 1 ? null : pb.collection('chapters').update(c.id, { order: i + 1 })))
        .filter(Boolean);
      await Promise.all(writes);
      reload();
    } catch (e) {
      setError(errMsg(e));
      reload(); // kembalikan ke kondisi server bila gagal
    }
  };

  const remove = async (c) => {
    if (!confirm(`Hapus BAB "${c.title}"? Semua soal & PPT di dalamnya ikut terhapus dan tidak bisa dikembalikan.`)) return;
    setError('');
    try {
      await pb.collection('chapters').delete(c.id);
      if (selectedChapterId === c.id) onSelect?.('');
      reload();
    } catch (e) { setError(errMsg(e)); }
  };

  if (!subjectId) return null;

  // Penanda kecil di sebelah nama bab (sebelum tombol aksi).
  const renderIndicator = (c) => {
    if (indicator === 'ppt') {
      return pptSet.has(c.id)
        ? <span className="shrink-0 text-[10px] font-bold text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5" title="Sudah ada PPT">✓ PPT</span>
        : <span className="shrink-0 text-[10px] font-semibold text-stone-400 bg-alba-100 border border-alba-200 rounded-full px-2 py-0.5" title="Belum ada PPT">belum</span>;
    }
    if (indicator === 'soal') {
      const n = soalCount[c.id] || 0;
      return <span className={`shrink-0 text-[10px] font-bold rounded-full px-2 py-0.5 border ${n > 0 ? 'text-maroon-700 bg-maroon-50 border-maroon-100' : 'text-stone-400 bg-alba-100 border-alba-200'}`} title="Jumlah soal">{n} soal</span>;
    }
    return null;
  };

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
      <div className="grid gap-2 max-h-72 overflow-y-auto scrollbar-thin">
        {chapters.map((c, i) => (
          <div key={c.id} className={`flex items-center gap-1 rounded-lg border pl-1 pr-1.5 ${selectedChapterId === c.id ? 'border-maroon-600 bg-maroon-50' : c.hidden ? 'border-alba-200 bg-alba-100/50' : 'border-alba-200'}`}>
            <div className="flex flex-col shrink-0">
              <button onClick={() => move(i, -1)} disabled={i === 0} className="px-1 leading-none text-stone-400 disabled:opacity-25 hover:text-maroon-600" title="Naik">▲</button>
              <button onClick={() => move(i, +1)} disabled={i === chapters.length - 1} className="px-1 leading-none text-stone-400 disabled:opacity-25 hover:text-maroon-600" title="Turun">▼</button>
            </div>
            {/* min-w-0 + truncate: judul sepanjang apa pun tidak mendorong penanda/tombol keluar layar */}
            <button onClick={() => onSelect?.(c.id)} title={c.title} className={`flex-1 min-w-0 truncate text-left px-2 py-2 text-sm ${selectedChapterId === c.id ? 'font-semibold text-maroon-700' : ''} ${c.hidden ? 'text-stone-400' : ''}`}>
              <span className="text-stone-400 mr-1">{i + 1}.</span>
              {c.hidden && <span className="mr-1.5 text-[9px] font-bold uppercase tracking-wide text-stone-500 bg-alba-200 rounded-full px-2 py-0.5">Hidden</span>}
              {c.title}
            </button>
            {renderIndicator(c)}
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
