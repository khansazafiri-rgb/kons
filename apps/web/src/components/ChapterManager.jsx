import React, { useEffect, useState } from 'react';
import pb from '@/lib/pocketbaseClient';
import PilihFakultas from '@/components/PilihFakultas';
import SortableList from '@/components/SortableList';
import { KIND_CBT, SCOPE_MATERI, SCOPE_SOAL, cocokUniversitas, filterCbtKind, filterLatihan, gabung, labelUniversitas } from '@/lib/chapterScope';

// Manajemen BAB per mata kuliah: tambah, ubah nama, hide/tampilkan, urutkan,
// hapus, dan PILIH bab. Dipakai bersama di "Edit Soal" (Cicil Belajar) & "PPT
// Mata Kuliah", untuk admin maupun pengajar (izin ditegakkan oleh API rules).
//
// Menambah/mengubah nama/mengurutkan/menghapus BAB itu BERSAMA: satu record
// dipakai kedua halaman, jadi BAB baru langsung muncul di dua-duanya. Yang
// berdiri sendiri cuma tombol sembunyikannya - lihat prop `scope`.
//
// Props:
// - subjectId          : mata kuliah aktif
// - selectedChapterId  : id bab yang sedang dipilih
// - onSelect(id)       : dipanggil saat sebuah bab diklik (untuk dipilih)
// - indicator          : 'ppt' -> tanda ✓ bila bab sudah punya file PPT
//                        'soal' -> badge jumlah soal pada bab
// - refreshSignal      : ubah nilainya untuk memaksa muat ulang (mis. setelah
//                        upload PPT / tambah soal dari komponen induk)
// - kind               : 'latihan' (default) untuk BAB Cicil Belajar & PPT,
//                        'cbt' untuk BAB Simulasi CBT
// - universityFilter    : hanya dipakai saat kind 'cbt' - daftar FK (array)
//                        untuk MENYARING BAB mana yang ditampilkan (BAB "semua
//                        FK" selalu ikut tampil apa pun isi filternya). Array
//                        kosong = tampilkan semua BAB tanpa disaring. FK yang
//                        sedang dipilih di filter ini JUGA dipakai sebagai nilai
//                        awal saat membuat BAB baru, supaya BAB baru langsung
//                        menempel ke FK yang sedang dilihat admin.
// - scope              : HALAMAN MANA yang disembunyikan tombol 👁 di sini.
//                        SCOPE_SOAL (bawaan)  -> field `hidden`, mempengaruhi
//                          Cicil Belajar / Bank Soal / Simulasi CBT.
//                        SCOPE_MATERI         -> field `hiddenMateri`,
//                          mempengaruhi Perdalam Materi saja.
// - sections           : true -> BAB dikelompokkan ke SECTION buatan admin (mis.
//                        UTB, UAB, Helminth, Protozoa). Admin bisa menambah,
//                        mengganti nama, menghapus, dan menyeret section; BAB di
//                        dalamnya ikut pindah. Hanya dipakai di Simulasi CBT.
//
// URUTAN diubah dengan menyeret pegangan ⠿ (panah ▲▼ tetap ada untuk layar
// sentuh kecil dan keyboard). Urutan tampil = urutan section, lalu urutan BAB di
// dalam section. `chapters.order` selalu ditulis ulang sebagai nomor urut pada
// tampilan itu (1..n), jadi halaman lain yang cuma mengurutkan BAB lewat `order`
// tetap mendapat susunan yang sama.
export default function ChapterManager({ subjectId, selectedChapterId, onSelect, indicator, refreshSignal, kind = 'latihan', universityFilter = [], scope = SCOPE_SOAL, sections = false }) {
  const cbt = kind === KIND_CBT;
  // BAB Simulasi cuma punya satu halaman, jadi di sana tidak ada "halaman
  // sebelah" yang perlu dilaporkan statusnya.
  const scopeLain = cbt ? null : (scope === SCOPE_SOAL ? SCOPE_MATERI : SCOPE_SOAL);
  const namaHalaman = scope === SCOPE_MATERI ? 'Perdalam Materi' : (cbt ? 'Simulasi CBT' : 'Cicil Belajar');
  const namaHalamanLain = scope === SCOPE_MATERI ? 'Cicil Belajar' : 'Perdalam Materi';
  const disembunyikan = (c) => !!c?.[scope];
  const [chapters, setChapters] = useState([]);
  const [sectionList, setSectionList] = useState([]);       // section milik mata kuliah ini (urut)
  const [newTitle, setNewTitle] = useState('');
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [targetSection, setTargetSection] = useState('');   // section tujuan BAB yang baru ditambah
  const [ciut, setCiut] = useState(() => new Set());        // id section yang sedang dilipat
  const [error, setError] = useState('');
  const [pptSet, setPptSet] = useState(() => new Set()); // chapterId yang sudah punya PPT
  const [soalCount, setSoalCount] = useState({});          // { chapterId: jumlah soal }
  const [editFkId, setEditFkId] = useState(null);          // id BAB yang popover FK-nya sedang terbuka

  const errMsg = (e) => {
    if (e?.status === 404 || e?.status === 403) {
      return 'Tidak diizinkan mengubah BAB mata kuliah ini (pastikan ini mata kuliah ajar Anda / login sebagai admin).';
    }
    const data = e?.response?.data || e?.data || {};
    const fields = Object.entries(data).map(([f, info]) => `${f}: ${info?.message || 'tidak valid'}`).join(' | ');
    return fields ? `Gagal: ${fields}` : ('Gagal: ' + (e?.message || 'terjadi kesalahan.'));
  };

  const load = () => {
    if (!subjectId) { setChapters([]); setSectionList([]); return; }
    // Query filter cuma menyaring subject + kind - pencocokan FK (array JSON,
    // banyak-ke-banyak) tidak bisa diandalkan lewat filter PocketBase, jadi
    // dilakukan di JS sesudah data terunduh (lihat cocokUniversitas()).
    const lingkup = cbt ? filterCbtKind() : filterLatihan();
    pb.collection('chapters')
      .getFullList({ sort: 'order', filter: gabung(pb.filter('subject = {:s}', { s: subjectId }), lingkup) })
      .then((list) => {
        if (!cbt || universityFilter.length === 0) return setChapters(list);
        setChapters(list.filter((c) => universityFilter.some((fk) => cocokUniversitas(c.universities, fk))));
      })
      .catch((e) => setError('Gagal memuat BAB: ' + (e?.message || '')));

    if (sections) {
      pb.collection('chapter_sections')
        .getFullList({ sort: 'order', filter: pb.filter('subject = {:s}', { s: subjectId }) })
        .then(setSectionList)
        .catch((e) => { setSectionList([]); setError('Gagal memuat section: ' + (e?.message || '')); });
    }
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
        .getFullList({ filter: pb.filter('subject = {:s} && type = {:t}', { s: subjectId, t: cbt ? 'cbt' : 'latihan' }), fields: 'chapter' })
        .then((rows) => {
          const m = {};
          rows.forEach((r) => { if (r.chapter) m[r.chapter] = (m[r.chapter] || 0) + 1; });
          setSoalCount(m);
        })
        .catch(() => setSoalCount({}));
    }
  };

  const reload = () => { load(); loadIndicators(); };
  // universityFilter dibandingkan sebagai string gabungan, bukan array mentah -
  // array baru dibuat tiap render di komponen induk, jadi kalau dipakai
  // langsung sebagai dependency, effect ini akan berjalan ulang terus-menerus.
  const universityFilterKey = cbt ? universityFilter.join('|') : '';
  useEffect(() => { setError(''); reload(); }, [subjectId, indicator, refreshSignal, kind, universityFilterKey, sections]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- susunan tampil: BAB tanpa section dulu, lalu section demi section ----
  const adaSection = sections && sectionList.length > 0;
  const idSectionAda = new Set(sectionList.map((s) => s.id));
  const punyaSection = (c) => !!c.section && idSectionAda.has(c.section);
  const lepas = adaSection ? chapters.filter((c) => !punyaSection(c)) : chapters;
  const perSection = adaSection
    ? sectionList.map((s) => ({ section: s, items: chapters.filter((c) => c.section === s.id) }))
    : [];
  const ratakan = (bebas, grup) => [...bebas, ...grup.flatMap((g) => g.items)];
  // Nomor urut BAB pada tampilan, untuk label "1. 2. 3." yang berlanjut antar section.
  const nomorBab = new Map(ratakan(lepas, perSection).map((c, i) => [c.id, i + 1]));

  // Susunan baru setelah isi satu kelompok diganti. idGrup '' = BAB tanpa section.
  const gantiKelompok = (idGrup, itemsBaru) => (idGrup === ''
    ? ratakan(itemsBaru, perSection)
    : ratakan(lepas, perSection.map((g) => (g.section.id === idGrup ? { ...g, items: itemsBaru } : g))));

  // Tulis urutan ke server. `flat` = semua BAB dalam urutan tampil, `daftarSection`
  // = section dalam urutan tampil. Hanya record yang nilainya berubah yang ditulis.
  const simpanUrutan = async (flat, daftarSection, perubahan = {}) => {
    setError('');
    setChapters(flat.map((c, i) => ({ ...c, ...(perubahan[c.id] || {}), order: i + 1 })));
    setSectionList(daftarSection.map((s, i) => ({ ...s, order: i + 1 })));
    try {
      const tulis = [];
      flat.forEach((c, i) => {
        const data = { ...(perubahan[c.id] || {}) };
        // Tulis ulang order menjadi 1..n untuk SEMUA bab yang nilainya berubah.
        // Cara ini tahan terhadap data lama yang order-nya duplikat / kosong
        // (PocketBase mengembalikan field number kosong sebagai 0), yang bikin
        // metode "tukar dua nilai" jadi tidak berpengaruh (0 <-> 0).
        if (c.order !== i + 1) data.order = i + 1;
        if (Object.keys(data).length) tulis.push(pb.collection('chapters').update(c.id, data));
      });
      daftarSection.forEach((s, i) => {
        if (s.order !== i + 1) tulis.push(pb.collection('chapter_sections').update(s.id, { order: i + 1 }));
      });
      await Promise.all(tulis);
    } catch (e) {
      setError(errMsg(e));
    }
    reload(); // selalu selaraskan dengan server, termasuk saat gagal
  };

  const addChapter = async () => {
    if (!newTitle.trim() || !subjectId) return;
    setError('');
    try {
      const section = adaSection && idSectionAda.has(targetSection) ? targetSection : '';
      await pb.collection('chapters').create({
        title: newTitle.trim(),
        subject: subjectId,
        order: chapters.length + 1,
        kind,
        section,
        // FK yang sedang dipilih di filter dijadikan nilai awal BAB baru -
        // kosong (filter tidak menyaring apa pun) berarti BAB baru berlaku
        // untuk semua FK, konsisten dengan makna array kosong di tempat lain.
        universities: cbt ? universityFilter : [],
      });
      setNewTitle('');
      // Urutan tampil = section dulu, jadi BAB baru di section yang bukan
      // paling bawah belum tentu nomor terakhir. Muat ulang lalu ratakan.
      reload();
    } catch (e) { setError(errMsg(e)); }
  };

  // Simpan daftar FK baru untuk satu BAB (dipanggil dari popover pemilih FK).
  const saveUniversities = async (c, universities) => {
    setError('');
    try {
      await pb.collection('chapters').update(c.id, { universities });
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

  // Cuma menyentuh field milik halaman ini - halaman sebelah tidak ikut berubah.
  const toggleHide = async (c) => {
    setError('');
    try { await pb.collection('chapters').update(c.id, { [scope]: !disembunyikan(c) }); reload(); }
    catch (e) { setError(errMsg(e)); }
  };

  // Panah ▲▼: geser satu langkah di dalam kelompoknya (seluruh daftar kalau
  // tanpa section). Cara cepat lainnya adalah menyeret pegangan ⠿.
  const geser = (idGrup, items, index, arah) => {
    const target = index + arah;
    if (target < 0 || target >= items.length) return;
    const baru = [...items];
    [baru[index], baru[target]] = [baru[target], baru[index]];
    simpanUrutan(gantiKelompok(idGrup, baru), sectionList);
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

  // ---- section ----
  const addSection = async () => {
    const judul = newSectionTitle.trim();
    if (!judul || !subjectId) return;
    setError('');
    try {
      const baru = await pb.collection('chapter_sections').create({ title: judul, subject: subjectId, order: sectionList.length + 1 });
      setNewSectionTitle('');
      setTargetSection(baru.id); // BAB berikutnya yang ditambah langsung masuk ke section ini
      reload();
    } catch (e) { setError(errMsg(e)); }
  };

  const renameSection = async (s) => {
    const judul = prompt('Ubah nama section:', s.title);
    if (judul == null) return;
    const t = judul.trim();
    if (!t || t === s.title) return;
    setError('');
    try { await pb.collection('chapter_sections').update(s.id, { title: t }); reload(); }
    catch (e) { setError(errMsg(e)); }
  };

  const removeSection = async (s) => {
    const isi = chapters.filter((c) => c.section === s.id).length;
    const catatan = isi ? ` ${isi} BAB di dalamnya TIDAK ikut terhapus, hanya menjadi BAB tanpa section.` : '';
    if (!confirm(`Hapus section "${s.title}"?${catatan}`)) return;
    setError('');
    try {
      await pb.collection('chapter_sections').delete(s.id);
      if (targetSection === s.id) setTargetSection('');
      reload();
    } catch (e) { setError(errMsg(e)); }
  };

  // Pindahkan BAB ke section lain (atau ke "tanpa section"). BAB mendarat di
  // paling bawah section tujuan.
  const pindahSection = (c, idTujuan) => {
    const tanpa = chapters.filter((x) => x.id !== c.id);
    const bebas = tanpa.filter((x) => !punyaSection(x));
    const grup = sectionList.map((s) => ({ section: s, items: tanpa.filter((x) => x.section === s.id) }));
    const dipindah = { ...c, section: idTujuan };
    if (idTujuan === '') bebas.push(dipindah);
    else grup.find((g) => g.section.id === idTujuan)?.items.push(dipindah);
    simpanUrutan(ratakan(bebas, grup), sectionList, { [c.id]: { section: idTujuan } });
  };

  const geserSection = (index, arah) => {
    const target = index + arah;
    if (target < 0 || target >= sectionList.length) return;
    const baru = [...sectionList];
    [baru[index], baru[target]] = [baru[target], baru[index]];
    const grup = baru.map((s) => ({ section: s, items: chapters.filter((c) => c.section === s.id) }));
    simpanUrutan(ratakan(lepas, grup), baru);
  };

  const urutSection = (baru) => {
    const grup = baru.map((s) => ({ section: s, items: chapters.filter((c) => c.section === s.id) }));
    simpanUrutan(ratakan(lepas, grup), baru);
  };

  const toggleCiut = (id) => setCiut((lama) => {
    const baru = new Set(lama);
    if (baru.has(id)) baru.delete(id); else baru.add(id);
    return baru;
  });
  const semuaCiut = adaSection && sectionList.every((s) => ciut.has(s.id));

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

  // Satu baris BAB. `idGrup`/`items`/`i` dipakai panah ▲▼, `drag` adalah
  // props pegangan seret dari SortableList.
  const renderBab = (c, i, drag, idGrup, items) => (
    <div className={`flex flex-col sm:flex-row sm:items-center gap-1 rounded-lg border bg-alba-50 pl-1 pr-1.5 ${selectedChapterId === c.id ? 'border-maroon-600 bg-maroon-50' : disembunyikan(c) ? 'border-alba-200 bg-alba-100/50' : 'border-alba-200'}`}>
      {/* Di layar sempit judul dapat satu baris penuh dan tombol aksinya
          turun ke bawah, supaya nama BAB tetap kebaca dan semua tombol
          tetap kepencet tanpa perlu geser layar ke samping. */}
      <div className="flex items-center gap-1 min-w-0 sm:flex-1">
        <button type="button" {...drag} className="shrink-0 w-6 h-8 flex items-center justify-center rounded text-stone-400 hover:text-maroon-600 hover:bg-maroon-50 select-none">⠿</button>
        <div className="flex flex-col shrink-0">
          <button onClick={() => geser(idGrup, items, i, -1)} disabled={i === 0} className="px-1 leading-none text-stone-400 disabled:opacity-25 hover:text-maroon-600" title="Naik">▲</button>
          <button onClick={() => geser(idGrup, items, i, +1)} disabled={i === items.length - 1} className="px-1 leading-none text-stone-400 disabled:opacity-25 hover:text-maroon-600" title="Turun">▼</button>
        </div>
        {/* min-w-0 + line-clamp: judul sepanjang apa pun dikemas maksimal
            dua baris, tidak mendorong penanda/tombol keluar layar.
            Judul utuhnya tetap bisa dilihat lewat tooltip. */}
        <button onClick={() => onSelect?.(c.id)} title={c.title} className={`flex-1 min-w-0 line-clamp-2 text-left px-2 py-2 text-sm ${selectedChapterId === c.id ? 'font-semibold text-maroon-700' : ''} ${disembunyikan(c) ? 'text-stone-400' : ''}`}>
          <span className="text-stone-400 mr-1">{nomorBab.get(c.id)}.</span>
          {disembunyikan(c) && <span className="mr-1.5 text-[9px] font-bold uppercase tracking-wide text-stone-500 bg-alba-200 rounded-full px-2 py-0.5">Hidden</span>}
          {/* Status halaman sebelah ikut ditampilkan (sekadar keterangan,
              tidak bisa diklik di sini) supaya tidak bingung waktu BAB
              kelihatan normal di layar ini tapi hilang di halaman satunya. */}
          {scopeLain && c[scopeLain] && (
            <span className="mr-1.5 text-[9px] font-semibold uppercase tracking-wide text-stone-400 border border-alba-300 rounded-full px-2 py-0.5" title={`BAB ini disembunyikan dari ${namaHalamanLain}. Ubahnya lewat halaman itu.`}>
              Hidden di {namaHalamanLain}
            </span>
          )}
          {c.title}
          {/* FK pemilik BAB ini - "Semua FK" kalau kosong. Ditampilkan
              supaya admin tidak perlu buka popover cuma untuk tahu BAB
              ini sudah menempel ke kampus mana saja. */}
          {cbt && (
            <span className="block text-[10px] font-normal text-stone-400 mt-0.5" title={labelUniversitas(c.universities)}>
              🎓 {labelUniversitas(c.universities)}
            </span>
          )}
        </button>
      </div>
      <div className="flex items-center gap-1 shrink-0 self-end sm:self-auto pb-1 sm:pb-0">
        {renderIndicator(c)}
        {adaSection && (
          <select
            value={punyaSection(c) ? c.section : ''}
            onChange={(e) => pindahSection(c, e.target.value)}
            title="Pindahkan BAB ini ke section lain"
            className="max-w-[7.5rem] shrink-0 rounded-md border border-alba-300 bg-alba-50 px-1.5 py-1 text-[11px] text-stone-600"
          >
            <option value="">Tanpa section</option>
            {sectionList.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
          </select>
        )}
        {cbt && (
          <button onClick={() => setEditFkId(editFkId === c.id ? null : c.id)} className="w-8 h-8 shrink-0 rounded-md text-stone-400 hover:bg-gold-100 hover:text-gold-600" title="Atur FK pemilik BAB ini">🎓</button>
        )}
        <button onClick={() => renameChapter(c)} className="w-8 h-8 shrink-0 rounded-md text-stone-400 hover:bg-gold-100 hover:text-gold-600" title="Ubah nama BAB">✏️</button>
        <button onClick={() => toggleHide(c)} className="w-8 h-8 shrink-0 rounded-md text-stone-400 hover:bg-maroon-50 hover:text-maroon-600" title={disembunyikan(c) ? `Tampilkan di ${namaHalaman}` : `Sembunyikan dari ${namaHalaman}`}>{disembunyikan(c) ? '🙈' : '👁'}</button>
        <button onClick={() => remove(c)} className="w-8 h-8 shrink-0 rounded-md text-stone-400 hover:bg-red-50 hover:text-red-600" title="Hapus BAB">🗑</button>
      </div>
      {cbt && editFkId === c.id && (
        <div className="w-full sm:pl-8 pb-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">
            FK yang boleh membaca BAB &amp; soal ini:
          </p>
          <PilihFakultas
            ringkas
            nilai={Array.isArray(c.universities) ? c.universities : []}
            onChange={(v) => saveUniversities(c, v)}
          />
        </div>
      )}
    </div>
  );

  // Daftar BAB yang bisa diseret. Dipakai di mode datar dan di dalam tiap section.
  const daftarBab = (idGrup, items) => (
    <SortableList
      items={items}
      getKey={(c) => c.id}
      onChange={(baru) => setChapters(gantiKelompok(idGrup, baru))}
      onCommit={(baru) => simpanUrutan(gantiKelompok(idGrup, baru), sectionList)}
      className="grid grid-cols-1 gap-2"
    >
      {(c, i, drag) => renderBab(c, i, drag, idGrup, items)}
    </SortableList>
  );

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
        {adaSection && (
          <select
            value={idSectionAda.has(targetSection) ? targetSection : ''}
            onChange={(e) => setTargetSection(e.target.value)}
            title="BAB baru masuk ke section ini"
            className="max-w-[9rem] shrink-0 rounded-lg border border-alba-300 bg-alba-50 px-2 py-2 text-xs text-stone-600"
          >
            <option value="">Tanpa section</option>
            {sectionList.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
          </select>
        )}
        <button onClick={addChapter} className="shrink-0 rounded-lg bg-maroon-600 text-alba-50 text-sm font-semibold px-4">Tambah</button>
      </div>
      {sections && (
        <div className="flex gap-2">
          <input
            value={newSectionTitle}
            onChange={(e) => setNewSectionTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSection(); } }}
            placeholder="Tambah section baru (mis. UTB, UAB, Helminth, Protozoa)"
            className="flex-1 min-w-0 rounded-lg border border-gold-300 px-3 py-2 text-sm bg-alba-50"
          />
          <button onClick={addSection} className="shrink-0 rounded-lg border border-gold-400 bg-gold-100 text-gold-700 text-sm font-semibold px-4 hover:bg-gold-200">+ Section</button>
        </div>
      )}
      <p className="text-xs text-stone-400">
        Seret <span className="font-semibold text-stone-500">⠿</span> untuk mengubah urutan (panah ▲ ▼ juga bisa). ✏️ ubah nama, 👁 sembunyikan/tampilkan dari siswa, 🗑 hapus BAB beserta isinya. Klik nama BAB untuk memilih.
      </p>
      {sections && (
        <p className="text-xs text-stone-400">
          Section mengelompokkan BAB di halaman siswa. Seret sebuah section ke atas/bawah dan semua BAB di dalamnya ikut pindah. Mau memindahkan BAB ke section lain? Pakai pilihan section di barisnya.
        </p>
      )}
      <p className="text-xs text-stone-400">
        {scopeLain
          ? <>👁 di sini cuma mengatur <span className="font-semibold text-stone-500">{namaHalaman}</span>. Untuk menyembunyikan dari {namaHalamanLain}, pakai tombol 👁 di halaman itu. Menambah, mengubah nama, mengurutkan, dan menghapus BAB tetap berlaku untuk dua-duanya.</>
          : <>👁 di sini mengatur tampil/tidaknya BAB di <span className="font-semibold text-stone-500">{namaHalaman}</span>.</>}
      </p>
      {error && <p className="text-xs whitespace-pre-wrap bg-red-50 border border-red-200 text-red-600 rounded-lg px-3 py-2">{error}</p>}
      {adaSection && (
        <button onClick={() => setCiut(semuaCiut ? new Set() : new Set(sectionList.map((s) => s.id)))} className="text-[11px] font-semibold text-stone-500 hover:text-maroon-600 underline underline-offset-2">
          {semuaCiut ? 'Buka semua section' : 'Lipat semua section'}
        </button>
      )}
      {/* grid-cols-1 = minmax(0, 1fr): kolom daftar dikunci selebar wadahnya.
          Tanpa itu kolom otomatis melebar seukuran judul BAB terpanjang, jadi
          truncate di bawah tidak pernah kena dan barisnya meluber ke samping.
          Kotak ini bergulir sendiri; saat menyeret mendekati tepinya, dnd-kit
          menggulirnya otomatis. */}
      <div className="max-h-[28rem] overflow-y-auto scrollbar-thin space-y-2">
        {lepas.length > 0 && daftarBab('', lepas)}
        {adaSection && (
          <SortableList
            items={sectionList}
            getKey={(s) => s.id}
            onChange={setSectionList}
            onCommit={urutSection}
            className="space-y-3"
          >
            {(s, si, dragSection) => {
              const grup = perSection.find((g) => g.section.id === s.id);
              const items = grup?.items || [];
              const terlipat = ciut.has(s.id);
              return (
                <div className="rounded-xl border-2 border-gold-200 bg-gold-100/30 p-1.5 space-y-2">
                  <div className="flex items-center gap-1 rounded-lg bg-gold-100/70 pl-1 pr-1.5">
                    <button type="button" {...dragSection} className="shrink-0 w-6 h-9 flex items-center justify-center rounded text-gold-600 hover:bg-gold-200 select-none">⠿</button>
                    <div className="flex flex-col shrink-0">
                      <button onClick={() => geserSection(si, -1)} disabled={si === 0} className="px-1 leading-none text-gold-600 disabled:opacity-25 hover:text-maroon-600" title="Section naik">▲</button>
                      <button onClick={() => geserSection(si, +1)} disabled={si === sectionList.length - 1} className="px-1 leading-none text-gold-600 disabled:opacity-25 hover:text-maroon-600" title="Section turun">▼</button>
                    </div>
                    <button onClick={() => toggleCiut(s.id)} className="flex-1 min-w-0 flex items-center gap-2 text-left px-2 py-2" title={terlipat ? 'Buka section' : 'Lipat section'}>
                      <span className="text-xs text-gold-700">{terlipat ? '▸' : '▾'}</span>
                      <span className="text-sm font-bold text-stone-700 truncate">{s.title}</span>
                      <span className="shrink-0 text-[10px] font-bold text-gold-700 bg-gold-100 border border-gold-200 rounded-full px-2 py-0.5">{items.length} BAB</span>
                    </button>
                    <button onClick={() => renameSection(s)} className="w-8 h-8 shrink-0 rounded-md text-stone-400 hover:bg-gold-100 hover:text-gold-600" title="Ubah nama section">✏️</button>
                    <button onClick={() => removeSection(s)} className="w-8 h-8 shrink-0 rounded-md text-stone-400 hover:bg-red-50 hover:text-red-600" title="Hapus section (BAB di dalamnya tidak ikut terhapus)">🗑</button>
                  </div>
                  {!terlipat && (items.length > 0
                    ? daftarBab(s.id, items)
                    : <p className="text-xs text-stone-400 px-2 pb-1">Section kosong. Pindahkan BAB ke sini lewat pilihan section di baris BAB, atau pilih section ini saat menambah BAB baru.</p>)}
                </div>
              );
            }}
          </SortableList>
        )}
        {chapters.length === 0 && !adaSection && <p className="text-xs text-stone-400 px-1 py-2">Belum ada BAB.</p>}
      </div>
    </div>
  );
}
