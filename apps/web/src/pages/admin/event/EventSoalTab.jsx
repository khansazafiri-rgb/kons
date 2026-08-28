import React, { useCallback, useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Code2, Eye, Plus, Save, Trash2, X } from 'lucide-react';
import pb from '@/lib/pocketbaseClient';
import { bacaArraySoal, gabungPembahasan, normalisasiMcq } from '@/lib/soalBentuk';

// TAB 2 - SOAL (PRD bagian 10)
//
// Soal lomba SENGAJA lebih sederhana dari soal Web Olimp: tidak ada blueprint
// distribusi (domain %, level kognitif %, tingkat kesulitan %), tidak ada
// pembahasan delapan bagian. Yang ada cuma yang benar-benar dipakai saat
// menilai: teks soal, opsi, kunci, bobot, dan pembahasan opsional.
//
// Pembahasan di sini hanya muncul ke peserta SETELAH hasil dirilis, dan cuma
// kalau saklarnya dinyalakan di tab Hasil & Rilis.

const inputCls =
  'w-full rounded-xl border border-alba-300 bg-alba-50 px-3.5 py-2.5 text-sm text-stone-800 focus:border-maroon-300 focus:outline-none';
const labelCls = 'mb-1 block text-[12px] font-semibold text-stone-700';
const OPSI = ['A', 'B', 'C', 'D', 'E'];

const soalKosong = (urutan) => ({
  orderIndex: urutan,
  questionText: '',
  optionA: '', optionB: '', optionC: '', optionD: '', optionE: '',
  correctAnswer: 'A',
  explanation: '',
  imageUrl: '',
  points: 1,
});

// Penyunting satu soal. Dipisah jadi komponen sendiri supaya mengetik di satu
// soal tidak memaksa seluruh daftar ikut digambar ulang.
function Penyunting({ awal, onSimpan, onBatal, sibuk }) {
  const [f, setF] = useState(awal);
  const ubah = (k) => (e) => setF((l) => ({ ...l, [k]: e.target.value }));

  return (
    <div className="rounded-2xl border border-maroon-200 bg-maroon-50/30 p-5">
      <div>
        <label htmlFor="sl-teks" className={labelCls}>Teks soal</label>
        <textarea id="sl-teks" rows={5} value={f.questionText} onChange={ubah('questionText')} className={inputCls} />
        <p className="mt-1 text-[11px] text-stone-500">Boleh HTML sederhana: &lt;p&gt;, &lt;strong&gt;, &lt;em&gt;.</p>
      </div>

      <div className="mt-4">
        <label htmlFor="sl-gambar" className={labelCls}>Gambar (opsional)</label>
        <input id="sl-gambar" value={f.imageUrl || ''} onChange={ubah('imageUrl')} className={inputCls} placeholder="https://lh3.googleusercontent.com/d/FILE_ID" />
      </div>

      <div className="mt-4 space-y-2">
        <p className={labelCls}>Pilihan jawaban</p>
        {OPSI.map((k) => (
          <div key={k} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setF((l) => ({ ...l, correctAnswer: k }))}
              title={`Tandai ${k} sebagai kunci jawaban`}
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[12px] font-bold transition-colors ${
                f.correctAnswer === k ? 'bg-emerald-600 text-alba-50' : 'bg-alba-200 text-stone-600 hover:bg-alba-300'
              }`}
            >
              {k}
            </button>
            <input
              value={f[`option${k}`] || ''}
              onChange={ubah(`option${k}`)}
              placeholder={k === 'D' || k === 'E' ? `Opsi ${k} (boleh kosong)` : `Opsi ${k}`}
              className={inputCls}
              aria-label={`Opsi ${k}`}
            />
          </div>
        ))}
        <p className="text-[11px] text-stone-500">
          Tombol huruf yang hijau adalah kunci jawabannya. Opsi yang dikosongkan tidak ditampilkan ke peserta.
        </p>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-[1fr_140px]">
        <div>
          <label htmlFor="sl-bahas" className={labelCls}>Pembahasan (opsional)</label>
          <textarea id="sl-bahas" rows={3} value={f.explanation || ''} onChange={ubah('explanation')} className={inputCls} />
        </div>
        <div>
          <label htmlFor="sl-poin" className={labelCls}>Bobot poin</label>
          <input id="sl-poin" type="number" min={0} value={f.points ?? 1} onChange={(e) => setF((l) => ({ ...l, points: Number(e.target.value) }))} className={inputCls} />
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          onClick={() => onSimpan(f)}
          disabled={sibuk || !f.questionText.trim() || !f.optionA.trim() || !f.optionB.trim()}
          className="inline-flex items-center gap-2 rounded-xl bg-maroon-600 px-5 py-2.5 text-sm font-semibold text-alba-50 hover:bg-maroon-700 disabled:opacity-50"
        >
          <Save size={14} /> Simpan soal
        </button>
        <button onClick={onBatal} className="rounded-xl border border-alba-300 px-5 py-2.5 text-sm font-semibold text-stone-600 hover:border-maroon-300">
          Batal
        </button>
      </div>
    </div>
  );
}

// Tempel banyak soal sekaligus sebagai JSON (PRD bagian 9.3 & 10.3).
function TempelKode({ onImpor, onTutup, sibuk }) {
  const [teks, setTeks] = useState('');
  const [galat, setGalat] = useState('');

  const jalan = () => {
    setGalat('');
    let bersih;
    try {
      // Penyeragaman bentuk dikerjakan lib/soalBentuk.js - sama persis dengan
      // yang dipakai Web Olimp. Jadi kode yang sudah jadi untuk Edit Soal PCV
      // ({ text, options: [ { text, correct, explanation } ] }) bisa ditempel
      // di sini apa adanya, tanpa diubah dulu.
      bersih = bacaArraySoal(teks).map((item, i) => {
        const n = normalisasiMcq(item, i + 1);
        return {
          questionText: n.questionText,
          optionA: n.opsi.A,
          optionB: n.opsi.B,
          optionC: n.opsi.C,
          optionD: n.opsi.D,
          optionE: n.opsi.E,
          correctAnswer: n.kunci,
          // Pembahasan lomba cuma satu blok, bukan delapan bagian seperti
          // Web Olimp - jadi penjelasan per opsi digabung jadi satu.
          explanation: String(item.explanation ?? item.pembahasan ?? '').trim() || gabungPembahasan(n),
          imageUrl: n.imageUrl,
          points: Number(item.points ?? item.poin ?? 1) || 1,
        };
      });
    } catch (err) {
      setGalat(err?.message || 'Kodenya tidak bisa dibaca.');
      return;
    }
    onImpor(bersih);
  };

  return (
    <div className="rounded-2xl border border-alba-300 bg-alba-100/40 p-5">
      <div className="flex items-center justify-between">
        <h4 className="font-display text-sm font-semibold text-stone-800">Tempel banyak soal (JSON)</h4>
        <button onClick={onTutup} className="text-stone-400 hover:text-stone-600" aria-label="Tutup"><X size={16} /></button>
      </div>
      <p className="mt-1 text-[12px] leading-relaxed text-stone-600">
        Bentuknya array objek. <span className="font-semibold">Dua bentuk diterima</span>, jadi kode
        yang sudah kamu buat untuk <span className="font-semibold">Edit Soal</span> web biasa bisa
        ditempel di sini apa adanya:
      </p>
      <ul className="mt-1.5 space-y-1 text-[12px] leading-relaxed text-stone-600">
        <li>
          · <code className="text-[11px]">text</code> + <code className="text-[11px]">options: [{'{'} text, correct, explanation {'}'}]</code>
          {' '}— bentuk Edit Soal PCV
        </li>
        <li>
          · <code className="text-[11px]">questionText</code> + <code className="text-[11px]">optionA</code>–<code className="text-[11px]">optionE</code> + <code className="text-[11px]">correctAnswer</code>
          {' '}— bentuk Web Olimp
        </li>
      </ul>
      <p className="mt-1.5 text-[12px] leading-relaxed text-stone-500">
        Tambahan opsional di kedua bentuk: <code className="text-[11px]">imageUrl</code> (link Drive
        boleh apa adanya), <code className="text-[11px]">hint</code>, <code className="text-[11px]">points</code>.
        Penjelasan tiap opsi otomatis digabung jadi pembahasan soal.
      </p>
      <textarea
        rows={10}
        value={teks}
        onChange={(e) => setTeks(e.target.value)}
        placeholder={'[\n  {\n    "text": "Apa fungsi utama nefron?",\n    "hint": "",\n    "options": [\n      { "text": "Filtrasi darah", "correct": true, "explanation": "Nefron menyaring…" },\n      { "text": "Produksi empedu", "correct": false, "explanation": "Itu hati." }\n    ]\n  }\n]'}
        className={`mt-3 ${inputCls} font-mono text-[12px]`}
      />
      {galat && <p className="mt-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-[12px] text-red-700">{galat}</p>}
      <button
        onClick={jalan}
        disabled={sibuk || !teks.trim()}
        className="mt-3 rounded-xl bg-maroon-600 px-5 py-2.5 text-sm font-semibold text-alba-50 hover:bg-maroon-700 disabled:opacity-50"
      >
        {sibuk ? 'Mengimpor…' : 'Impor soal'}
      </button>
    </div>
  );
}

export default function EventSoalTab({ ev }) {
  const [soal, setSoal] = useState(null);
  const [sunting, setSunting] = useState(null); // 'baru' | id
  const [tempel, setTempel] = useState(false);
  const [pratinjau, setPratinjau] = useState(null);
  const [sibuk, setSibuk] = useState(false);
  const [error, setError] = useState('');

  const muat = useCallback(() => {
    pb.collection('event_questions')
      .getFullList({ filter: `event = "${ev.id}"`, sort: 'orderIndex,created' })
      .then(setSoal)
      .catch((err) => setError('Gagal memuat soal: ' + (err?.message || '')));
  }, [ev.id]);

  useEffect(muat, [muat]);

  const simpanSoal = async (isi) => {
    setSibuk(true);
    setError('');
    try {
      if (sunting === 'baru') {
        await pb.collection('event_questions').create({ ...isi, event: ev.id, orderIndex: (soal?.length || 0) + 1 });
      } else {
        await pb.collection('event_questions').update(sunting, isi);
      }
      setSunting(null);
      muat();
    } catch (err) {
      setError('Gagal menyimpan soal: ' + (err?.message || ''));
    } finally {
      setSibuk(false);
    }
  };

  const hapus = async (s) => {
    if (!window.confirm('Hapus soal ini? Jawaban peserta untuk soal ini ikut terhapus.')) return;
    setSibuk(true);
    try {
      await pb.collection('event_questions').delete(s.id);
      muat();
    } catch (err) {
      setError('Gagal menghapus: ' + (err?.message || ''));
    } finally {
      setSibuk(false);
    }
  };

  // Tukar urutan dengan tetangganya. Nomor urut disimpan sebagai angka, jadi
  // yang ditukar cuma dua baris - bukan menomori ulang seluruh daftar.
  const geser = async (i, arah) => {
    const j = i + arah;
    if (!soal || j < 0 || j >= soal.length) return;
    setSibuk(true);
    try {
      await Promise.all([
        pb.collection('event_questions').update(soal[i].id, { orderIndex: j + 1 }),
        pb.collection('event_questions').update(soal[j].id, { orderIndex: i + 1 }),
      ]);
      muat();
    } catch (err) {
      setError('Gagal mengubah urutan: ' + (err?.message || ''));
    } finally {
      setSibuk(false);
    }
  };

  const impor = async (baris) => {
    setSibuk(true);
    setError('');
    try {
      let urut = (soal?.length || 0);
      for (const r of baris) {
        urut += 1;
        await pb.collection('event_questions').create({ ...r, event: ev.id, orderIndex: urut });
      }
      setTempel(false);
      muat();
    } catch (err) {
      setError('Gagal mengimpor: ' + (err?.message || ''));
    } finally {
      setSibuk(false);
    }
  };

  const totalPoin = (soal || []).reduce((a, s) => a + (Number(s.points) || 1), 0);

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-semibold text-stone-800">Soal lomba</h3>
          <p className="mt-0.5 text-[13px] text-stone-500">
            {soal ? `${soal.length} soal · total ${totalPoin} poin` : 'Memuat…'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => { setTempel((t) => !t); setSunting(null); }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-alba-300 px-4 py-2.5 text-[13px] font-semibold text-stone-600 hover:border-maroon-300"
          >
            <Code2 size={14} /> Tempel kode
          </button>
          <button
            onClick={() => { setSunting('baru'); setTempel(false); }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-maroon-600 px-4 py-2.5 text-[13px] font-semibold text-alba-50 hover:bg-maroon-700"
          >
            <Plus size={14} /> Tambah soal
          </button>
        </div>
      </header>

      {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      {tempel && <TempelKode onImpor={impor} onTutup={() => setTempel(false)} sibuk={sibuk} />}

      {sunting === 'baru' && (
        <Penyunting
          awal={soalKosong((soal?.length || 0) + 1)}
          onSimpan={simpanSoal}
          onBatal={() => setSunting(null)}
          sibuk={sibuk}
        />
      )}

      {soal && soal.length === 0 && !tempel && sunting !== 'baru' && (
        <div className="rounded-2xl border border-alba-200 bg-alba-100/50 px-6 py-10 text-center">
          <p className="font-display text-base font-semibold text-stone-700">Belum ada soal</p>
          <p className="mt-1 text-[13px] text-stone-500">
            Tambahkan satu per satu, atau tempel banyak sekaligus lewat “Tempel kode”.
          </p>
        </div>
      )}

      <div className="space-y-2.5">
        {(soal || []).map((s, i) => (
          <div key={s.id}>
            {sunting === s.id ? (
              <Penyunting awal={s} onSimpan={simpanSoal} onBatal={() => setSunting(null)} sibuk={sibuk} />
            ) : (
              <div className="rounded-2xl border border-alba-200 bg-alba-50 p-4 shadow-card">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-maroon-100 text-[12px] font-bold text-maroon-600">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div
                      className="line-clamp-2 text-sm leading-relaxed text-stone-800 [&_p]:inline"
                      dangerouslySetInnerHTML={{ __html: s.questionText || '' }}
                    />
                    <p className="mt-1 text-[11px] text-stone-500">
                      Kunci <span className="font-semibold text-emerald-700">{s.correctAnswer}</span>
                      {' · '}{Number(s.points) || 1} poin
                      {s.explanation ? ' · ada pembahasan' : ' · tanpa pembahasan'}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button onClick={() => geser(i, -1)} disabled={i === 0 || sibuk} className="rounded-lg p-1.5 text-stone-400 hover:bg-alba-200 hover:text-stone-700 disabled:opacity-30" aria-label="Naikkan"><ChevronUp size={15} /></button>
                    <button onClick={() => geser(i, 1)} disabled={i === (soal.length - 1) || sibuk} className="rounded-lg p-1.5 text-stone-400 hover:bg-alba-200 hover:text-stone-700 disabled:opacity-30" aria-label="Turunkan"><ChevronDown size={15} /></button>
                    <button onClick={() => setPratinjau(s)} className="rounded-lg p-1.5 text-stone-400 hover:bg-alba-200 hover:text-stone-700" aria-label="Pratinjau"><Eye size={15} /></button>
                    <button onClick={() => { setSunting(s.id); setTempel(false); }} className="rounded-lg px-2.5 py-1.5 text-[12px] font-semibold text-maroon-600 hover:bg-maroon-50">Edit</button>
                    <button onClick={() => hapus(s)} className="rounded-lg p-1.5 text-stone-400 hover:bg-red-50 hover:text-red-600" aria-label="Hapus"><Trash2 size={15} /></button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Pratinjau: memperlihatkan soal PERSIS seperti yang dilihat peserta -
          tanpa tanda kunci jawaban, karena begitulah tampilannya saat ujian. */}
      {pratinjau && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 p-4" onClick={() => setPratinjau(null)}>
          <div className="max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-alba-50 p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="font-display text-sm font-semibold text-stone-800">Seperti yang dilihat peserta</p>
              <button onClick={() => setPratinjau(null)} className="text-stone-400 hover:text-stone-600" aria-label="Tutup"><X size={18} /></button>
            </div>
            {pratinjau.imageUrl && <img src={pratinjau.imageUrl} alt="" className="mt-4 max-h-64 w-full rounded-xl object-contain" />}
            <div className="mt-4 text-[15px] leading-relaxed text-stone-800 [&_p]:mb-3" dangerouslySetInnerHTML={{ __html: pratinjau.questionText || '' }} />
            <div className="mt-3 space-y-2">
              {OPSI.filter((k) => (pratinjau[`option${k}`] || '').trim()).map((k) => (
                <div key={k} className="flex items-start gap-3 rounded-xl border border-alba-200 px-4 py-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-alba-200 text-[12px] font-bold text-stone-600">{k}</span>
                  <span className="min-w-0 flex-1 text-sm text-stone-800">{pratinjau[`option${k}`]}</span>
                </div>
              ))}
            </div>
            <p className="mt-4 rounded-xl bg-alba-100/60 px-4 py-2.5 text-[11px] leading-relaxed text-stone-500">
              Peserta tidak melihat kunci jawaban maupun pembahasan selama ujian berlangsung —
              keduanya baru muncul setelah kamu merilis hasil.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
