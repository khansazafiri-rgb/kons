import React, { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Daftar yang urutannya bisa diubah dengan DRAG. Dipakai untuk BAB dan section
// di panel admin, supaya memindahkan BAB nomor 18 ke atas tidak perlu menekan
// panah belasan kali.
//
// Cara pakai:
//   <SortableList items={daftar} getKey={(x) => x.id} onChange={setDaftar} onCommit={simpan}>
//     {(item, indeks, drag) => (
//       <div>
//         <button {...drag}>⠿</button>   // pegangan: HANYA dari sini daftar bisa diseret
//         ...isi baris...
//       </div>
//     )}
//   </SortableList>
//
// - onChange(daftarBaru): dipanggil saat item dilepas di tempat barunya.
// - onCommit(daftarBaru): dipanggil tepat sesudahnya, HANYA kalau urutannya
//   benar-benar berubah. Simpan ke server di sini.
//
// Seretnya sengaja lewat pegangan, bukan seluruh baris: tombol, kotak isian,
// dan geser layar dengan jari di dalam baris tetap berfungsi normal. Pegangan
// juga bisa dipakai dengan keyboard (Tab ke pegangan, spasi untuk mengangkat,
// panah atas/bawah untuk memindah, spasi lagi untuk meletakkan).
//
// Gulir otomatis (daftar panjang yang bergulir sendiri maupun halaman) ditangani
// dnd-kit: menyeret mendekati tepi kotak/layar menggulirnya, dan item yang
// diseret tetap menempel di pointer.

// Hanya naik-turun. Tanpa ini item bisa ikut melenceng ke samping.
const sumbuVertikal = ({ transform }) => ({ ...transform, x: 0 });

const PETUNJUK = {
  draggable:
    'Untuk mengubah urutan: tekan spasi untuk mengangkat, panah atas atau bawah untuk memindahkan, lalu spasi lagi untuk meletakkan. Esc membatalkan.',
};

const PENGUMUMAN = {
  onDragStart: () => 'Item diangkat.',
  onDragOver: ({ over }) => (over ? 'Item dipindahkan.' : 'Item di luar daftar.'),
  onDragEnd: ({ over }) => (over ? 'Item diletakkan.' : 'Item kembali ke tempat semula.'),
  onDragCancel: () => 'Pemindahan dibatalkan.',
};

function Baris({ id, children }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const drag = {
    ...attributes,
    ...listeners,
    // touch-action none: jari di pegangan menyeret baris, bukan menggulir halaman.
    style: { touchAction: 'none', cursor: 'grab' },
    title: 'Seret untuk mengubah urutan',
    'aria-label': 'Seret untuk mengubah urutan',
  };
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
        position: 'relative',
        // Yang ikut pointer adalah salinannya di DragOverlay (tidak terpotong
        // tepi kotak yang bergulir). Aslinya tinggal bayangan penanda tempat jatuh.
        opacity: isDragging ? 0.35 : undefined,
      }}
    >
      {children(drag)}
    </div>
  );
}

export default function SortableList({ items, getKey, onChange, onCommit, className, children }) {
  const sensors = useSensors(
    // Jarak minimal 4px: klik biasa di pegangan tidak dianggap seretan.
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const ids = items.map(getKey);
  const [aktif, setAktif] = useState(null); // id item yang sedang diseret

  const selesai = ({ active, over }) => {
    setAktif(null);
    if (!over || active.id === over.id) return;
    const dari = ids.indexOf(active.id);
    const ke = ids.indexOf(over.id);
    if (dari < 0 || ke < 0) return;
    const baru = arrayMove(items, dari, ke);
    onChange?.(baru);
    onCommit?.(baru);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[sumbuVertikal]}
      onDragStart={({ active }) => setAktif(active.id)}
      onDragEnd={selesai}
      onDragCancel={() => setAktif(null)}
      accessibility={{ screenReaderInstructions: PETUNJUK, announcements: PENGUMUMAN }}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className={className}>
          {items.map((item, i) => (
            <Baris key={ids[i]} id={ids[i]}>
              {(drag) => children(item, i, drag)}
            </Baris>
          ))}
        </div>
      </SortableContext>
      <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' }}>
        {aktif != null && ids.indexOf(aktif) >= 0 ? (
          <div style={{ borderRadius: '0.75rem', boxShadow: '0 12px 30px rgba(0,0,0,0.22)', cursor: 'grabbing' }}>
            {children(items[ids.indexOf(aktif)], ids.indexOf(aktif), { style: { cursor: 'grabbing' }, tabIndex: -1 })}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
