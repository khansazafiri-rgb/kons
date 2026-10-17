import React, { useState } from 'react';
import { AlertTriangle, Save, ShieldCheck } from 'lucide-react';
import pb from '@/lib/pocketbaseClient';
import { buatSlug, inputWibKeIso, isoKeInputWib, jamWib, tanggalPanjang } from '@/lib/eventLomba';

// TAB 1 - INFO DASAR (PRD bagian 3.2 & 9.2)
//
// Satu formulir dengan field baku, bukan penyunting halaman bebas. Itu
// keputusan PRD bagian 3.1, dan alasannya: halaman publik tiap lomba jadi
// seragam dan bisa dirakit sendiri oleh sistem, tanpa admin harus menata letak
// tiap kali ada lomba baru.

const inputCls =
  'w-full rounded-xl border border-alba-300 bg-alba-50 px-3.5 py-2.5 text-sm text-stone-800 focus:border-maroon-300 focus:outline-none';
const labelCls = 'mb-1 block text-[13px] font-semibold text-stone-700';

// Jam di formulir ini selalu WIB (lihat isoKeInputWib di lib/eventLomba),
// apa pun zona waktu laptop admin - lombanya diumumkan dalam WIB.
const keInput = isoKeInputWib;
const dariInput = inputWibKeIso;

// Durasi lomba serentak = selisih mulai & selesai, dalam menit.
function selisihMenit(mulai, selesai) {
  const a = new Date(mulai).getTime();
  const b = new Date(selesai).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return 0;
  return Math.round((b - a) / 60000);
}
function tambahMenit(iso, menit) {
  const a = new Date(iso).getTime();
  if (!iso || !Number.isFinite(a) || !(menit > 0)) return '';
  return new Date(a + menit * 60000).toISOString();
}

function Bagian({ judul, catatan, children }) {
  return (
    <section className="rounded-2xl border border-alba-200 bg-alba-50 p-5 shadow-card">
      <h3 className="font-display text-base font-semibold text-stone-800">{judul}</h3>
      {catatan && <p className="mt-0.5 text-[12px] leading-relaxed text-stone-500">{catatan}</p>}
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function Saklar({ nyala, onUbah, judul, isi }) {
  return (
    <button
      type="button"
      onClick={() => onUbah(!nyala)}
      className="flex w-full items-start gap-3 rounded-xl border border-alba-200 bg-alba-100/40 px-4 py-3 text-left transition-colors hover:border-maroon-300"
    >
      <span
        className={`mt-0.5 flex h-5 w-9 shrink-0 items-center rounded-full px-0.5 transition-colors ${
          nyala ? 'bg-maroon-600' : 'bg-stone-300'
        }`}
      >
        <span className={`h-4 w-4 rounded-full bg-alba-50 transition-transform ${nyala ? 'translate-x-4' : ''}`} />
      </span>
      <span className="min-w-0">
        <span className="block text-[13px] font-semibold text-stone-800">{judul}</span>
        <span className="block text-[12px] leading-relaxed text-stone-500">{isi}</span>
      </span>
    </button>
  );
}

export default function EventInfoTab({ ev, onSimpan }) {
  const [f, setF] = useState({
    ...ev,
    // Lomba serentak lama yang durasinya belum pernah diisi: turunkan dari
    // jendela mulai-selesainya, supaya kolom durasi tidak tampil 0.
    durationMinutes: ev.timingModel === 'FIXED_WINDOW' && !(ev.durationMinutes > 0)
      ? selisihMenit(ev.examStartAt, ev.examEndAt)
      : ev.durationMinutes,
    sebAllowedUrls: Array.isArray(ev.sebAllowedUrls) ? ev.sebAllowedUrls.join('\n') : '',
  });
  const [sibuk, setSibuk] = useState(false);
  const [pesan, setPesan] = useState('');
  const [error, setError] = useState('');

  const ubah = (k) => (e) => {
    const v = e?.target?.type === 'number' ? Number(e.target.value) : e?.target?.value;
    setF((lama) => ({ ...lama, [k]: v }));
  };
  const set = (k, v) => setF((lama) => ({ ...lama, [k]: v }));

  const simpan = async () => {
    setSibuk(true);
    setError('');
    setPesan('');
    try {
      const isi = {
        name: f.name,
        slug: buatSlug(f.slug || f.name),
        eventType: f.eventType || 'LOMBA',
        showQuestionCountPublic: !!f.showQuestionCountPublic,
        showMechanismPublic: !!f.showMechanismPublic,
        showParticipantCountPublic: !!f.showParticipantCountPublic,
        subject: f.subject,
        bannerUrl: f.bannerUrl,
        description: f.description,
        price: Number(f.price) || 0,
        quota: Number(f.quota) || 0,
        registrationOpenAt: f.registrationOpenAt || null,
        registrationCloseAt: f.registrationCloseAt || null,
        examStartAt: f.examStartAt || null,
        // Serentak: jam selesai SELALU mulai + durasi, supaya semua peserta
        // berhenti di jam yang sama dan angkanya tidak bisa saling bertentangan.
        examEndAt: (f.timingModel === 'FIXED_WINDOW'
          ? tambahMenit(f.examStartAt, Number(f.durationMinutes) || 0)
          : f.examEndAt) || null,
        timingModel: f.timingModel,
        durationMinutes: Number(f.durationMinutes) || 0,
        paymentContactWa: f.paymentContactWa,
        registrationMode: f.registrationMode === 'GFORM' ? 'GFORM' : 'WEB',
        gformUrl: String(f.gformUrl || '').trim(),
        rulesText: f.rulesText,
        sebRequired: !!f.sebRequired,
        watermarkOff: !!f.watermarkOff,
        sebQuitPassword: f.sebQuitPassword,
        sebAdminPassword: f.sebAdminPassword,
        sebBrowserExamKey: f.sebBrowserExamKey,
        sebConfigKey: f.sebConfigKey,
        sebAllowCalculator: !!f.sebAllowCalculator,
        sebAllowedUrls: String(f.sebAllowedUrls || '')
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
      };
      const rec = await pb.collection('events').update(ev.id, isi);
      onSimpan(rec);
      setPesan('Tersimpan.');
    } catch (err) {
      setError('Gagal menyimpan: ' + (err?.message || ''));
    } finally {
      setSibuk(false);
    }
  };

  return (
    <div className="space-y-5">
      <Bagian judul="Identitas lomba">
        <div>
          <p className={labelCls}>Tipe</p>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {[
              ['LOMBA', 'Lomba', 'Label bawaan untuk kompetisi biasa.'],
              ['OLIMPIADE', 'Olimpiade', 'Label untuk olimpiade. Cara kerjanya sama persis — yang beda cuma sebutannya di halaman publik.'],
            ].map(([nilai, judul, isi]) => (
              <button
                key={nilai}
                type="button"
                onClick={() => set('eventType', nilai)}
                className={`rounded-xl border p-4 text-left transition-colors ${
                  (f.eventType || 'LOMBA') === nilai
                    ? 'border-maroon-300 bg-maroon-50 ring-1 ring-maroon-200'
                    : 'border-alba-200 bg-alba-50 hover:border-maroon-200'
                }`}
              >
                <span className="block text-[13px] font-semibold text-stone-800">{judul}</span>
                <span className="mt-0.5 block text-[12px] leading-relaxed text-stone-500">{isi}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="ev-name" className={labelCls}>Nama lomba</label>
          <input
            id="ev-name"
            value={f.name || ''}
            onChange={(e) => {
              const nama = e.target.value;
              // Slug ikut mengikuti nama SELAMA admin belum menyentuhnya sendiri.
              setF((lama) => ({
                ...lama,
                name: nama,
                slug: !lama.slug || lama.slug === buatSlug(lama.name) ? buatSlug(nama) : lama.slug,
              }));
            }}
            className={inputCls}
            placeholder="Lomba Fisiologi Batch 3"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="ev-slug" className={labelCls}>Alamat halaman</label>
            <input id="ev-slug" value={f.slug || ''} onChange={ubah('slug')} className={inputCls} />
            <p className="mt-1 font-mono text-[11px] text-stone-500">/event/{buatSlug(f.slug || f.name) || '…'}</p>
          </div>
          <div>
            <label htmlFor="ev-subject" className={labelCls}>Subjek / topik</label>
            <input id="ev-subject" value={f.subject || ''} onChange={ubah('subject')} className={inputCls} placeholder="Fisiologi" />
          </div>
        </div>

        <div>
          <label htmlFor="ev-banner" className={labelCls}>Banner (tautan gambar)</label>
          <input id="ev-banner" value={f.bannerUrl || ''} onChange={ubah('bannerUrl')} className={inputCls} placeholder="https://…" />
          {f.bannerUrl && (
            <img src={f.bannerUrl} alt="" className="mt-2 h-28 w-full rounded-xl object-cover" />
          )}
        </div>

        <div>
          <label htmlFor="ev-desc" className={labelCls}>Deskripsi</label>
          <textarea
            id="ev-desc"
            rows={8}
            value={f.description || ''}
            onChange={ubah('description')}
            className={inputCls}
            placeholder="Info lomba, format soal, siapa yang boleh ikut…"
          />
          <p className="mt-1 text-[11px] leading-relaxed text-stone-500">
            Boleh langsung tempel dari broadcast WhatsApp: Enter dan baris kosong tetap seperti aslinya,
            <span className="font-mono"> *tebal*</span>, <span className="font-mono">_miring_</span>,
            <span className="font-mono"> ~coret~</span> ikut terformat, dan tautan bisa diklik.
            HTML sederhana (&lt;p&gt;, &lt;strong&gt;, &lt;ul&gt;&lt;li&gt;) juga tetap boleh.
          </p>
        </div>

        <div>
          <label htmlFor="ev-rules" className={labelCls}>Aturan &amp; instruksi</label>
          <textarea
            id="ev-rules"
            rows={10}
            value={f.rulesText || ''}
            onChange={ubah('rulesText')}
            className={inputCls}
            placeholder="Larangan, sanksi, hal yang perlu disiapkan peserta…"
          />
          <p className="mt-1 text-[11px] text-stone-500">
            Sama seperti deskripsi: Enter, baris kosong, format WhatsApp, dan tautan tampil apa adanya di halaman lomba.
          </p>
        </div>
      </Bagian>

      <Bagian
        judul="Cara pendaftaran"
        catatan="Menentukan apa yang dilihat peserta di halaman daftar dan tombol WhatsApp yang mereka tekan."
      >
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {[
            ['WEB', 'Daftar & bayar di web', 'Peserta isi biodata di web ini, lalu transfer dan kirim bukti bayar ke WA admin. Kamu tandai lunas, lalu ACC.'],
            ['GFORM', 'Sudah daftar lewat Google Form', 'Pendaftaran & pembayaran sudah lewat Google Form. Di web ini peserta cuma buat akun (atau masuk), lalu chat admin untuk konfirmasi. Tidak ada harga & langkah bayar.'],
          ].map(([nilai, judul, isi]) => (
            <button
              key={nilai}
              type="button"
              onClick={() => set('registrationMode', nilai)}
              className={`rounded-xl border p-4 text-left transition-colors ${
                (f.registrationMode === 'GFORM' ? 'GFORM' : 'WEB') === nilai
                  ? 'border-maroon-300 bg-maroon-50 ring-1 ring-maroon-200'
                  : 'border-alba-200 bg-alba-50 hover:border-maroon-200'
              }`}
            >
              <span className="block text-[13px] font-semibold text-stone-800">{judul}</span>
              <span className="mt-0.5 block text-[12px] leading-relaxed text-stone-500">{isi}</span>
            </button>
          ))}
        </div>
        {f.registrationMode === 'GFORM' && (
          <>
            <div>
              <label htmlFor="ev-gform" className={labelCls}>
                Tautan Google Form <span className="font-normal text-stone-400">(opsional)</span>
              </label>
              <input id="ev-gform" value={f.gformUrl || ''} onChange={ubah('gformUrl')} className={inputCls} placeholder="https://forms.gle/…" />
              <p className="mt-1 text-[11px] text-stone-500">
                Kalau diisi, pengunjung yang belum mengisi formulirnya ditunjukkan tautan ini di halaman lomba.
              </p>
            </div>
            <p className="rounded-xl bg-alba-100/60 px-4 py-2.5 text-[12px] leading-relaxed text-stone-600">
              Peserta yang belum punya akun bisa langsung membuat <span className="font-semibold">akun peserta lomba</span> di
              halaman daftar — akunnya langsung bisa dipakai masuk, tanpa ACC akun terpisah. Yang kamu konfirmasi cukup
              pendaftaran lombanya: tab <span className="font-semibold">Peserta</span> → <span className="font-semibold">ACC</span>.
              Akun ini tidak membuka bank soal Web Olimp.
            </p>
          </>
        )}
      </Bagian>

      <Bagian judul={f.registrationMode === 'GFORM' ? 'Kuota & kontak admin' : 'Biaya & kuota'}>
        <div className={`grid grid-cols-1 gap-4 ${f.registrationMode === 'GFORM' ? 'sm:grid-cols-2' : 'sm:grid-cols-3'}`}>
          {f.registrationMode !== 'GFORM' && (
            <div>
              <label htmlFor="ev-price" className={labelCls}>Harga (Rp)</label>
              <input id="ev-price" type="number" min={0} value={f.price ?? 0} onChange={ubah('price')} className={inputCls} />
            </div>
          )}
          <div>
            <label htmlFor="ev-quota" className={labelCls}>Kuota peserta</label>
            <input id="ev-quota" type="number" min={0} value={f.quota ?? 0} onChange={ubah('quota')} className={inputCls} />
            <p className="mt-1 text-[11px] text-stone-500">0 = tanpa batas.</p>
          </div>
          <div>
            <label htmlFor="ev-wa" className={labelCls}>
              {f.registrationMode === 'GFORM' ? 'WA admin (konfirmasi)' : 'WA pembayaran'}
            </label>
            <input id="ev-wa" value={f.paymentContactWa || ''} onChange={ubah('paymentContactWa')} className={inputCls} placeholder="08xxxxxxxxxx" />
          </div>
        </div>
        <p className="rounded-xl bg-alba-100/60 px-4 py-2.5 text-[12px] leading-relaxed text-stone-600">
          Begitu kuota tercapai, tombol daftar di halaman publik menutup sendiri — tidak ada
          daftar tunggu. Pendaftar yang kamu tolak mengembalikan kursinya.
        </p>
      </Bagian>

      <Bagian
        judul="Apa yang boleh dilihat umum"
        catatan="Tiga keterangan ini disembunyikan dari halaman publik. Peserta yang pendaftarannya sudah kamu ACC tetap melihatnya — mereka memang perlu tahu sebelum mengerjakan."
      >
        <Saklar
          nyala={!!f.showQuestionCountPublic}
          onUbah={(v) => set('showQuestionCountPublic', v)}
          judul="Tampilkan jumlah soal ke umum"
          isi="Mati = pengunjung tidak tahu ada berapa soal."
        />
        <Saklar
          nyala={!!f.showMechanismPublic}
          onUbah={(v) => set('showMechanismPublic', v)}
          judul="Tampilkan cara pengerjaan ke umum"
          isi="Mati = model waktu & durasi tidak muncul di halaman publik."
        />
        <Saklar
          nyala={!!f.showParticipantCountPublic}
          onUbah={(v) => set('showParticipantCountPublic', v)}
          judul="Tampilkan jumlah pendaftar & kuota ke umum"
          isi='Mati = angkanya disembunyikan. Tanda "kuota penuh" tetap muncul supaya calon peserta tahu pendaftarannya sudah tutup.'
        />
      </Bagian>

      <Bagian
        judul="Jadwal"
        catatan="Semua jam dalam WIB (UTC+7), apa pun zona waktu perangkatmu."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[
            ['registrationOpenAt', 'Pendaftaran dibuka (WIB)'],
            ['registrationCloseAt', 'Pendaftaran ditutup (WIB)'],
          ].map(([k, label]) => (
            <div key={k}>
              <label htmlFor={`ev-${k}`} className={labelCls}>{label}</label>
              <input
                id={`ev-${k}`}
                type="datetime-local"
                value={keInput(f[k])}
                onChange={(e) => set(k, dariInput(e.target.value))}
                className={inputCls}
              />
            </div>
          ))}
        </div>

        <div>
          <p className={labelCls}>Model waktu pengerjaan</p>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {[
              ['FIXED_WINDOW', 'Serentak', 'Semua peserta mulai dan selesai di jam yang sama. Sebelum jam mulai, tombol Mulai Ujian tampil tapi belum bisa ditekan.'],
              ['PERSONAL_DURATION', 'Timer pribadi', 'Peserta boleh mulai kapan saja dalam jendela ujian. Timernya berjalan sejak dia menekan Mulai.'],
            ].map(([nilai, judul, isi]) => (
              <button
                key={nilai}
                type="button"
                onClick={() => setF((lama) => ({
                  ...lama,
                  timingModel: nilai,
                  // Pindah ke serentak: durasi diturunkan dari jendela yang sudah
                  // ada kalau belum diisi, supaya jam selesainya tidak meloncat.
                  durationMinutes: nilai === 'FIXED_WINDOW' && !(Number(lama.durationMinutes) > 0)
                    ? selisihMenit(lama.examStartAt, lama.examEndAt)
                    : lama.durationMinutes,
                }))}
                className={`rounded-xl border p-4 text-left transition-colors ${
                  f.timingModel === nilai
                    ? 'border-maroon-300 bg-maroon-50 ring-1 ring-maroon-200'
                    : 'border-alba-200 bg-alba-50 hover:border-maroon-200'
                }`}
              >
                <span className="block text-[13px] font-semibold text-stone-800">{judul}</span>
                <span className="mt-0.5 block text-[12px] leading-relaxed text-stone-500">{isi}</span>
              </button>
            ))}
          </div>
        </div>

        {f.timingModel === 'FIXED_WINDOW' ? (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_180px]">
              <div>
                <label htmlFor="ev-examStartAt" className={labelCls}>Ujian mulai (WIB)</label>
                <input
                  id="ev-examStartAt"
                  type="datetime-local"
                  value={keInput(f.examStartAt)}
                  onChange={(e) => set('examStartAt', dariInput(e.target.value))}
                  className={inputCls}
                />
              </div>
              <div>
                <label htmlFor="ev-durasi" className={labelCls}>Durasi (menit)</label>
                <input
                  id="ev-durasi"
                  type="number"
                  min={1}
                  value={f.durationMinutes ?? 0}
                  onChange={ubah('durationMinutes')}
                  className={inputCls}
                />
              </div>
            </div>
            {(() => {
              const selesai = tambahMenit(f.examStartAt, Number(f.durationMinutes) || 0);
              return (
                <div className="rounded-xl border border-maroon-200 bg-maroon-50/50 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-maroon-500">Selesai serentak</p>
                  <p className="mt-0.5 font-display text-lg font-semibold text-maroon-700">
                    {selesai ? tanggalPanjang(selesai) : 'Isi jam mulai dan durasinya dulu'}
                  </p>
                  {selesai && (
                    <p className="mt-1 text-[12px] leading-relaxed text-stone-600">
                      Peserta mengerjakan {jamWib(f.examStartAt)} – {jamWib(selesai)}. Sebelum {jamWib(f.examStartAt)} tombol
                      Mulai Ujian tampil tapi belum bisa ditekan; tepat {jamWib(selesai)} semua jawaban dikumpulkan
                      otomatis. Yang masuk terlambat tetap berhenti di {jamWib(selesai)}.
                    </p>
                  )}
                </div>
              );
            })()}
          </>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {[
                ['examStartAt', 'Jendela ujian dibuka (WIB)'],
                ['examEndAt', 'Jendela ujian ditutup (WIB)'],
              ].map(([k, label]) => (
                <div key={k}>
                  <label htmlFor={`ev-${k}`} className={labelCls}>{label}</label>
                  <input
                    id={`ev-${k}`}
                    type="datetime-local"
                    value={keInput(f[k])}
                    onChange={(e) => set(k, dariInput(e.target.value))}
                    className={inputCls}
                  />
                </div>
              ))}
            </div>
            <div>
              <label htmlFor="ev-durasi" className={labelCls}>Durasi pengerjaan (menit)</label>
              <input
                id="ev-durasi"
                type="number"
                min={1}
                value={f.durationMinutes ?? 0}
                onChange={ubah('durationMinutes')}
                className={`${inputCls} sm:max-w-[200px]`}
              />
              <p className="mt-1 text-[11px] leading-relaxed text-stone-500">
                Kalau timer pribadi ini melewati jam “ditutup”, yang dipakai tetap jam tutupnya — mana yang lebih dulu.
              </p>
            </div>
          </>
        )}
      </Bagian>

      <Bagian
        judul="Safe Exam Browser"
        catatan="Yang dikosongkan di sini mengikuti pengaturan SEB global di Dashboard Olimp."
      >
        <Saklar
          nyala={!!f.sebRequired}
          onUbah={(v) => set('sebRequired', v)}
          judul="Wajib dikerjakan lewat Safe Exam Browser"
          isi="Kalau mati, peserta bisa mengerjakan dari browser biasa."
        />

        {/* Disimpan terbalik (`watermarkOff`): bawaan boolean PocketBase adalah
            false, jadi lomba lama dan baris yang lupa diisi otomatis jatuh ke
            sisi yang MENANDAI, bukan yang membiarkan. */}
        <Saklar
          nyala={!f.watermarkOff}
          onUbah={(v) => set('watermarkOff', !v)}
          judul="Tanda air identitas di layar soal"
          isi="Nama, email, dan kode peserta tercetak samar menyilang di seluruh layar selama ia mengerjakan. SEB memblokir tangkapan layar bawaan sistem, tapi tidak bisa mencegah soal difoto pakai HP — tanda air membuat foto yang beredar menunjuk balik ke orang yang memotretnya."
        />

        {f.sebRequired && !f.sebBrowserExamKey && !f.sebConfigKey && (
          <p className="flex items-start gap-2 rounded-xl border border-gold-200 bg-gold-100/60 px-4 py-3 text-[12px] leading-relaxed text-gold-600">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <span>
              Saklarnya menyala tapi Config Key dan Browser Exam Key dua-duanya masih kosong, jadi
              penjagaannya <span className="font-semibold">membiarkan semua permintaan lewat</span> —
              server belum punya pembanding untuk memverifikasi. Isi kuncinya lewat langkah di bawah.
            </span>
          </p>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="ev-quit" className={labelCls}>Kata sandi keluar</label>
            <input id="ev-quit" value={f.sebQuitPassword || ''} onChange={ubah('sebQuitPassword')} className={inputCls} />
            <p className="mt-1 text-[11px] text-stone-500">Diketik pengawas untuk menutup SEB.</p>
          </div>
          <div>
            <label htmlFor="ev-adminpw" className={labelCls}>Kata sandi pengaturan</label>
            <input id="ev-adminpw" value={f.sebAdminPassword || ''} onChange={ubah('sebAdminPassword')} className={inputCls} />
          </div>
        </div>

        <div>
          <label htmlFor="ev-ck" className={labelCls}>Config Key</label>
          <input
            id="ev-ck"
            value={f.sebConfigKey || ''}
            onChange={ubah('sebConfigKey')}
            className={`${inputCls} font-mono text-[12px]`}
            placeholder="64 karakter, tempel dari SEB Config Tool"
          />
          <p className="mt-1 text-[11px] leading-relaxed text-stone-500">
            Paling praktis: <span className="font-semibold">satu nilai berlaku untuk semua platform</span>
            {' '}(Windows, Mac, iPad), karena versi SEB tidak ikut dihitung.
          </p>
        </div>

        <div>
          <label htmlFor="ev-bek" className={labelCls}>Browser Exam Key — boleh lebih dari satu</label>
          <textarea
            id="ev-bek"
            rows={3}
            value={f.sebBrowserExamKey || ''}
            onChange={ubah('sebBrowserExamKey')}
            className={`${inputCls} font-mono text-[12px]`}
            placeholder={'a1b2… (SEB Windows)\nc3d4… (SEB macOS)'}
          />
          <p className="mt-1 text-[11px] leading-relaxed text-stone-500">
            Satu kunci per baris. BEK <span className="font-semibold">ikut menghitung versi SEB</span>,
            jadi Windows, Mac, dan iPad menghasilkan nilai yang berbeda untuk berkas yang sama —
            daftarkan semua versi yang dipakai pesertamu, atau cukup isi Config Key di atas.
          </p>

          <div className="mt-2 rounded-xl border border-alba-200 bg-alba-100/50 p-4">
            <p className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-stone-700">
              <ShieldCheck size={13} className="text-maroon-600" /> Cara mengisinya
            </p>
            <ol className="mt-1.5 space-y-1 text-[12px] leading-relaxed text-stone-600">
              <li>1. Simpan pengaturan ini dulu, lalu ACC satu pendaftar (boleh akunmu sendiri).</li>
              <li>2. Unduh berkas .seb lomba ini dari halaman publiknya.</li>
              <li>3. Buka berkas itu di aplikasi <span className="font-semibold">SEB Config Tool</span> di komputermu.</li>
              <li>4. Buka tab <span className="font-semibold">Exam</span>, salin Config Key (dan/atau Browser Exam Key), tempel ke kolom di atas, simpan.</li>
            </ol>
            <p className="mt-2 text-[11px] leading-relaxed text-stone-500">
              Kunci ini tidak bisa dihitung server — ia dihasilkan dari isi berkas .seb yang sudah jadi.
              <span className="font-semibold"> Tiap kali kamu mengubah pengaturan SEB di atas, kuncinya berubah</span> —
              unduh ulang berkasnya dan salin kuncinya lagi. Lomba lain dengan pengaturan SEB yang sama
              memakai kunci yang sama, karena berkas .seb-nya identik.
            </p>
          </div>
        </div>

        <div>
          <label htmlFor="ev-urls" className={labelCls}>Alamat lain yang boleh dibuka</label>
          <textarea
            id="ev-urls"
            rows={3}
            value={f.sebAllowedUrls || ''}
            onChange={ubah('sebAllowedUrls')}
            className={`${inputCls} font-mono text-[12px]`}
            placeholder={'^https://lh3\\.googleusercontent\\.com/.*'}
          />
          <p className="mt-1 text-[11px] text-stone-500">
            Satu pola per baris. Biasanya penyimpan gambar soal. Alamat aplikasi ini selalu ikut otomatis.
          </p>
        </div>

        <Saklar
          nyala={!!f.sebAllowCalculator}
          onUbah={(v) => set('sebAllowCalculator', v)}
          judul="Izinkan alat bantu tambahan di dalam SEB"
          isi="Untuk lomba yang butuh hitung-hitungan. Biarkan mati kalau tidak yakin."
        />
      </Bagian>

      <div className="sticky bottom-4 flex flex-wrap items-center gap-3 rounded-2xl border border-alba-200 bg-alba-50/95 p-4 shadow-card backdrop-blur">
        <button
          onClick={simpan}
          disabled={sibuk}
          className="inline-flex items-center gap-2 rounded-xl bg-maroon-600 px-6 py-2.5 text-sm font-semibold text-alba-50 transition-colors hover:bg-maroon-700 disabled:opacity-50"
        >
          <Save size={15} /> {sibuk ? 'Menyimpan…' : 'Simpan perubahan'}
        </button>
        {pesan && <span className="text-[13px] font-semibold text-emerald-700">{pesan}</span>}
        {error && <span className="text-[13px] font-semibold text-red-700">{error}</span>}
      </div>
    </div>
  );
}
