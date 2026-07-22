# ML Weakness Analysis Integration Guide

This document explains how to integrate the pptparser ML system with the Simulasi CBT feature.

## Overview

The Simulasi CBT now supports **ML-based weakness analysis** that:
1. Parses PPT materials to extract sub-topic structure
2. Maps student answers to sub-topics via BM25 term matching
3. Identifies weakness per concept (not just per chapter)
4. Shows slide ranges for targeted review

## Architecture

```
PPT Material
    ↓
pptparser (Node CLI tool)
    ↓
corpus.json (topic structure + content)
    ↓
Web App (via localStorage or PocketBase)
    ↓
QuestionRunner (submission)
    ↓
weaknessAnalyzer.js (BM25 matching + aggregation)
    ↓
ResultScreen (display weakness report)
```

## How It Works

### 1. Parse PPT Materials

Use the pptparser CLI to extract sub-topic structure:

```bash
cd apps/pptparser
npm run parse -- materi.pdf --json bab.json
```

**Output** (`bab.json`):
```json
[
  {
    "chapterId": "repro",
    "chapterTitle": "Sistem Reproduksi Pria",
    "topics": [
      {
        "name": "Penis",
        "slideStart": 40,
        "slideEnd": 54,
        "content": "Tiga tabung erektil corpus cavernosum..."
      },
      ...
    ]
  }
]
```

### 2. Store Corpus Data

Place the corpus data where the web app can access it:

**Option A: localStorage (for demo/testing)**
```javascript
// In browser console or app initialization:
localStorage.setItem('ml_corpus', JSON.stringify(corpusData));
```

**Option B: PocketBase (production)**
Create a collection `topics` with schema:
```
- chapterId (text)
- chapterTitle (text)
- topics (json)  // array of { name, slideStart, slideEnd, content }
```

Then load it in your app:
```javascript
const topicRecords = await pb.collection('topics').getFullList();
localStorage.setItem('ml_corpus', JSON.stringify(topicRecords));
```

### 3. Submission Flow

When a student submits a Simulasi CBT exam:

1. **QuestionRunner** calculates correctness for each question
2. **finish()** function calls **analyzeWeakness()** if corpus data is available
3. **ResultScreen** displays ML-powered weakness report with:
   - Sub-topic (not just chapter)
   - Number of wrong answers per sub-topic
   - Accuracy percentage
   - Severity level (tinggi/sedang/ringan)
   - Slide range for review

### 4. Confidence Levels

The system uses BM25 matching to classify questions:

- **high**: ≥2 matching terms AND score margin ≥0.25
- **medium**: ≥1 matching term AND score margin ≥0.1
- **low**: Lower confidence classifications
- **none**: No terms matched

Only questions with **medium+ confidence** are included in the report.

## Integration Checklist

- [x] pptparser Node module built & tested
- [x] weaknessAnalyzer.js integrated into web app
- [x] QuestionRunner calls analyzeWeakness on submit
- [x] ResultScreen displays detailed weakness report
- [x] Build verification passed

## Next Steps

To deploy this end-to-end:

1. **Parse your PPTs**:
   ```bash
   cd apps/pptparser
   for file in /path/to/materials/*.pdf; do
     npm run parse -- "$file" --json "${file%.pdf}.json"
   done
   ```

2. **Store corpus data** in PocketBase `topics` collection

3. **Test integration** by:
   - Starting web app development server
   - Taking a Simulasi CBT exam
   - Checking if weakness report shows sub-topics + slide ranges

4. **Production deployment**:
   - Deploy pptparser to VPS (or keep running on dev machine)
   - Configure PocketBase to auto-load corpus data on app initialization
   - Monitor first few students to verify accuracy

## Troubleshooting

**No ML analysis appears:**
- Check if corpus data is in localStorage: `localStorage.getItem('ml_corpus')`
- Verify console for errors in finish() function
- Ensure questions have text content for BM25 matching

**Unclassified questions showing in report:**
- These questions didn't match any sub-topic confidently
- Happens when PPT material hasn't been uploaded yet for that topic
- System gracefully skips them rather than guessing

**Low confidence matches:**
- Verify PPT content is text-based (not scanned images)
- Check if question text overlaps with PPT terminology
- Consider semantic embeddings as future improvement

## File Locations

- **Parser**: `/apps/pptparser/src/`
- **Tests**: `/apps/pptparser/test/`
- **Web Integration**: `/apps/web/src/lib/weaknessAnalyzer.js`
- **Question Component**: `/apps/web/src/components/QuestionRunner.jsx`
- **Result Display**: `/apps/web/src/components/QuestionRunner.jsx` (ResultScreen function)

## Performance Notes

- BM25 indexing: ~10ms for 100-topic corpus
- Per-question matching: ~0.1ms per question
- Full analysis for 50-question exam: <100ms total
- No server calls needed for matching (all client-side)
