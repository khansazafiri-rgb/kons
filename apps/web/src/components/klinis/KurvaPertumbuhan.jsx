import React from 'react';

// Kurva pertumbuhan WHO: lima garis SD plus satu titik posisi anak.
//
// Digambar sebagai SVG buatan sendiri, bukan lewat pustaka grafik, karena yang
// dibutuhkan justru hal yang tidak disediakan grafik biasa: sumbu X-nya bisa
// berarti UMUR atau PANJANG BADAN, garisnya bukan data melainkan kurva rujukan,
// dan tiap garis harus berlabel SD di ujung kanannya.
//
// Semua warna memakai `currentColor` + kelas Tailwind, supaya ikut berubah
// sendiri saat mode gelap dinyalakan dari Header (lihat padanan .dark di
// index.css) - kalau warnanya ditulis langsung sebagai hex, kurva akan hilang
// di latar gelap.

const L = 44;   // ruang kiri untuk label sumbu Y
const R = 30;   // ruang kanan untuk label SD
const T = 12;
const B = 34;
const W = 560;
const H = 320;

// Jarak antar-garis bantu yang "bulat" (1, 2, 2,5, 5, 10 × pangkat sepuluh),
// supaya angka pada sumbu enak dibaca alih-alih 3,7 / 7,4 / 11,1.
function langkahBulat(lo, hi) {
  const kasar = Math.pow(10, Math.floor(Math.log10((hi - lo) / 5)));
  for (const m of [1, 2, 2.5, 5, 10]) if ((hi - lo) / (kasar * m) <= 6) return kasar * m;
  return kasar * 10;
}

const fmt = (v) => String(Number(v.toFixed(2))).replace('.', ',');

const GAYA_SD = {
  '-3': { warna: 'text-red-600', tebal: 1, putus: '4 3' },
  '-2': { warna: 'text-gold-600', tebal: 1.1, putus: '' },
  0: { warna: 'text-maroon-600', tebal: 1.7, putus: '' },
  2: { warna: 'text-gold-600', tebal: 1.1, putus: '' },
  3: { warna: 'text-red-600', tebal: 1, putus: '4 3' },
};

export default function KurvaPertumbuhan({ data, sumbuX, sumbuY }) {
  if (!data?.garis?.length) return null;

  const semuaY = data.garis.flatMap((g) => g.titik.map((t) => t.y));
  if (data.anak) semuaY.push(data.anak.y);
  let yMin = Math.min(...semuaY);
  let yMax = Math.max(...semuaY);
  const bantal = (yMax - yMin) * 0.06 || 1;
  yMin -= bantal;
  yMax += bantal;

  const sx = (x) => L + ((x - data.xMin) / (data.xMax - data.xMin)) * (W - L - R);
  const sy = (y) => H - B - ((y - yMin) / (yMax - yMin)) * (H - T - B);

  const jalur = (titik) => titik.map((t, i) => `${i === 0 ? 'M' : 'L'}${sx(t.x).toFixed(1)},${sy(t.y).toFixed(1)}`).join(' ');

  const stepY = langkahBulat(yMin, yMax);
  const tickY = [];
  for (let v = Math.ceil(yMin / stepY) * stepY; v <= yMax; v += stepY) tickY.push(v);

  const stepX = langkahBulat(data.xMin, data.xMax);
  const tickX = [];
  for (let v = Math.ceil(data.xMin / stepX) * stepX; v <= data.xMax; v += stepX) tickX.push(v);

  return (
    <div className="overflow-x-auto scrollbar-thin">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[440px] h-auto block" role="img" aria-label={`Kurva ${sumbuY} terhadap ${sumbuX}`}>
        {/* garis bantu */}
        {tickY.map((v) => (
          <g key={`y${v}`} className="text-stone-400">
            <line x1={L} y1={sy(v)} x2={W - R} y2={sy(v)} stroke="currentColor" strokeWidth="1" opacity="0.2" />
            <text x={L - 6} y={sy(v) + 3.5} textAnchor="end" fill="currentColor" fontSize="9.5">{fmt(v)}</text>
          </g>
        ))}
        {tickX.map((v) => (
          <g key={`x${v}`} className="text-stone-400">
            <line x1={sx(v)} y1={T} x2={sx(v)} y2={H - B} stroke="currentColor" strokeWidth="1" opacity="0.14" />
            <text x={sx(v)} y={H - B + 14} textAnchor="middle" fill="currentColor" fontSize="9.5">{fmt(v)}</text>
          </g>
        ))}

        {/* kurva SD */}
        {data.garis.map((g) => {
          const gaya = GAYA_SD[String(g.sd)] || GAYA_SD[0];
          const akhir = g.titik[g.titik.length - 1];
          return (
            <g key={g.sd} className={gaya.warna}>
              <path
                d={jalur(g.titik)}
                fill="none"
                stroke="currentColor"
                strokeWidth={gaya.tebal}
                strokeDasharray={gaya.putus || undefined}
                opacity={g.sd === 0 ? 0.95 : 0.75}
              />
              <text x={sx(akhir.x) + 4} y={sy(akhir.y) + 3} fill="currentColor" fontSize="9" fontWeight="700">
                {g.sd > 0 ? `+${g.sd}` : g.sd}
              </text>
            </g>
          );
        })}

        {/* posisi anak */}
        {data.anak && (
          <g className="text-maroon-700">
            <circle cx={sx(data.anak.x)} cy={sy(data.anak.y)} r="5.5" fill="currentColor" opacity="0.18" />
            <circle cx={sx(data.anak.x)} cy={sy(data.anak.y)} r="3.2" fill="currentColor" />
          </g>
        )}

        {/* sumbu */}
        <g className="text-stone-400">
          <line x1={L} y1={H - B} x2={W - R} y2={H - B} stroke="currentColor" strokeWidth="1" opacity="0.45" />
          <line x1={L} y1={T} x2={L} y2={H - B} stroke="currentColor" strokeWidth="1" opacity="0.45" />
          <text x={(L + W - R) / 2} y={H - 4} textAnchor="middle" fill="currentColor" fontSize="9.5">{sumbuX}</text>
          <text x={-(H - B + T) / 2} y={11} textAnchor="middle" transform="rotate(-90)" fill="currentColor" fontSize="9.5">
            {sumbuY}
          </text>
        </g>
      </svg>
    </div>
  );
}
