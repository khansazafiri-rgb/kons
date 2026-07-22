// Merakit "korpus" sub-topik dari banyak hasil parse PPT menjadi daftar dokumen
// datar yang siap diindeks matcher. Tiap sub-topik = satu dokumen referensi.
//
// Masukan: array hasil pptparser (lihat segment.mjs), masing-masing bisa dilekati
// chapterId (id BAB di PocketBase) supaya hasil klasifikasi bisa dipetakan balik.

import { cleanContent } from './text.mjs';

// parsedList: [{ chapterId?, chapterTitle, topics: [{name, slideStart, slideEnd, content}] }]
export function buildCorpus(parsedList) {
  const docs = [];
  for (const parsed of parsedList) {
    const chapterTitle = parsed.chapterTitle || '';
    for (const t of parsed.topics || []) {
      docs.push({
        id: `${parsed.chapterId || chapterTitle}::${t.name}`,
        chapter: parsed.chapterId || null,
        chapterTitle,
        topic: t.name,
        slideStart: t.slideStart ?? null,
        slideEnd: t.slideEnd ?? null,
        content: cleanContent(t.content || '', chapterTitle),
      });
    }
  }
  return docs;
}
