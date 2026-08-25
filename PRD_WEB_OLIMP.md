# PRD Web Olimp - Complete Specification
> Sumber: dokumen PRD dari klien (PRD_WEB_OLIMP_CLEAN.docx), diubah ke Markdown apa adanya.
> Status: PRODUCTION READY · Versi 1.0 · Terakhir diperbarui Agustus 2026
>
> Catatan implementasi (apa yang sudah jadi, apa yang menyimpang, apa yang ditunda)
> ada di [WEB_OLIMP.md](WEB_OLIMP.md).


## Table of Contents
Project Overview
Registration & Subscription Flow
Device Locking Mechanism
User Roles & Permissions
Question Bank Architecture
Question Display & Student Experience
Admin Dashboard & Features
Authentication & Session Management
Secure Exam Browser (SEB) Integration
Exam Schedule & Calendar
Performance Tracking & Analytics
Data Privacy & Security
Error Handling & Recovery
Integration with Web PCV
Database Schema
Implementation Roadmap
Outstanding Items & Pending Clarification
Glossary


## 1. PROJECT OVERVIEW
### 1.1 Platform Description
Name: Web Olimp
Purpose: Question bank platform untuk soal-soal olimpiade FK dengan SEB integration
Target Users: Pre-clinical medical students (mahasiswa FK)
Key Features: Device locking (1 device per student), SEB integration, comprehensive question bank, leaderboard, detailed analytics
Integration Points: Web PCV (existing platform), SEB (Secure Exam Browser), PocketBase (database)
### 1.2 Core Concept
Siswa dapat mengakses bank soal olimpiade lengkap melalui SEB dengan device locking mechanism (1 device per student). Platform menampilkan soal dalam format akademik dengan blueprint overview sebelum quiz, instant feedback ("Cek Jawaban"), dan detailed explanations.


## 2. REGISTRATION & SUBSCRIPTION FLOW
### 2.1 Registration Process
Step 1: Siswa registrasi di Web PCV (bukan di Olimp)

           ↓

Step 2: Submit registration form

           ↓

Step 3: Konfirmasi admin (via email)

           ↓

Step 4: Siswa melakukan pembayaran

           ↓

Step 5: Sistem auto-generate download link untuk SEB config

           ↓

Step 6: Siswa dapat download configuration file

           ↓

Step 7: Install/import config ke SEB app

           ↓

Step 8: Login di SEB → Device A terregistrasi otomatis
### 2.2 Package Selection
Siswa memilih paket (e.g., "1 bulan", dengan mata kuliah tertentu)
Detail spesifikasi paket: PENDING (akan dikirim nanti)
Package validity determines course access dan timeline validity
### 2.3 Device Registration
Device dicatat pada saat pertama kali siswa login melalui SEB
Device identifier (hardware ID, machine fingerprint) di-capture otomatis
Binding permanent sampai admin reset


## 3. DEVICE LOCKING MECHANISM
### 3.1 Core Rules
✓ Login pertama di Device A

  → Device A menjadi "registered device" selamanya

  → Database: simpan device ID + user ID binding

✓ Logout/keluar app di Device A

  → Bisa login lagi di Device A (session baru)

  → Session tetap valid di Device A

✗ Coba login di Device B

  → REJECT: "Device tidak terdaftar"

  → Error message: "Akses hanya tersedia di device terdaftar Anda"

✗ Keluar app tanpa logout (crash/force close)

  → Login berikutnya tetap hanya valid di Device A
### 3.2 Technical Implementation Approach
Recommended: Hybrid Approach

Combine hardware fingerprint (CPU ID, HDD serial, MAC address)
Combine SEB-generated token (unique per installation)
Combine browser fingerprint
If any mismatch → REJECT
Backup identifier hierarchy untuk recovery
### 3.3 Device Reset Scenario
Admin bisa reset device binding (e.g., siswa lost laptop)
Process: Student submit request → Admin approve → Device binding cleared
Siswa bisa register device baru setelah reset
### 3.4 Session Management
Session timeout: 24 jam idle timeout (recommended)
Concurrent session: Jika login dari device yang sama → auto-logout session lama
Session refresh: Detail TBD, need backend architecture
Logout: Clear session token, device binding tetap tersimpan


## 4. USER ROLES & PERMISSIONS
### 4.1 Role Hierarchy
Role
Web PCV
Web Olimp
Edit Soal
View Soal
Quiz Access
Admin Dashboard
Student
✓
✓
✗
✓
✓
✗
Teacher
✓
✓ (limited)
✗
✓
✗
✗
Admin
✓
✓
✓
✓
✓
✓
Super Admin
✓
✓
✓
✓
✓
✓
### 4.2 Role Details
Student/Peserta

Access sesuai package yang dibeli
Bisa lihat & kerjakan soal, quiz access penuh
Progress tracking otomatis
Leaderboard visible
Device lock applies

Teacher

Access terbatas (view only)
TIDAK bisa edit soal
TIDAK ada akses quiz/exam functionality
TIDAK bisa akses admin dashboard
Device lock applies (same as student)

Admin

Edit soal di kedua platform (PCV + Olimp)
Manage peserta (CRUD, bulk import/reset)
Manage exam schedule
Access admin dashboard semua metrics
Tidak ada device lock restriction

Super Admin

Full system access
HANYA bisa ditambah via PocketBase database (tidak via web UI)
Authority untuk manage users & permissions


## 5. QUESTION BANK ARCHITECTURE
### 5.1 Hierarchical Organization
Web Olimp Question Bank

├── Subject/Mata Kuliah

│   ├── Primary Domain

│   │   ├── Secondary Topic

│   │   │   ├── Question 1

│   │   │   ├── Question 2

│   │   │   └── Question N

│   │   └── Secondary Topic 2

│   └── Primary Domain 2

└── Subject 2
### 5.2 Question ID Format
Format: [SUBJECT_CODE]-[SEQUENTIAL_NUMBER]
Examples: ID-06, ID-14, ANAT-01, FARM-02
### 5.3 Question Metadata Fields
Field
Description
Example
Question ID
Unique identifier
ID-06
Subject
Mata kuliah
Infectious Disease
Primary Domain
Main knowledge domain
Bacteriology, Virology
Secondary Topic
Specific topic
Gram-negative bacteria
Organism/Syndrome
Specific condition
Neisseria meningitidis
Question Text
Full case/scenario
[Long clinical case]
Options A-E
Answer choices
[5 options]
Correct Answer
Right option
C
Cognitive Level
Bloom's taxonomy
Multi-step basic-to-clinical
Difficulty (1-5)
Question difficulty
4/5
Learning Objective
What student should learn
[Long description]
Question Architecture
How structured
Clinical → pathophysiology → intervention
Estimated Time
Time to answer
90 seconds
Hint
Optional hint
[If applicable]
Explanation (Sections 1-8)
Full explanation
[See section 6.2]
### 5.4 Question Package Parameters
Parameter
Value
Example
Package Name
Descriptive name
International Infectious Disease Olympiad
Total Questions
Number of questions
20
Question Language
Language
English
Answer Language
Language
Bahasa Indonesia
Target Audience
Student level
Pre-clinical medical students
Competition Level
Scope
International Olympiad
Answer Format
Question type
Single Best Answer (A-E)
Estimated Time
Total duration
30 menit (90 detik/soal)
Mode
Creation approach
Blueprint First
Reference Cut-off
Date
August 2026
### 5.5 Blueprint Distribution Example
Domain Distribution (20 questions):

Bacteriology: 3 (15%)
Virology: 2 (10%)
Mycology: 2 (10%)
Parasitology: 3 (15%)
Immunology: 2 (10%)
Pharmacology: 3 (15%)
Clinical Syndromes: 3 (15%)
Diagnostics: 2 (10%)

Cognitive Level Distribution (20 questions):

Precision Foundational: 2 (10%)
One-Step Mechanism: 4 (20%)
Multi-Step Basic-to-Clinical: 8 (40%)
Lab/Imaging Interpretation: 4 (20%)
Experimental Reasoning: 2 (10%)

Difficulty Distribution (20 questions):

Level 3/5: 2 (10%)
Level 4/5: 10 (50%)
Level 5/5: 8 (40%)

Correct Answer Distribution (20 questions):

A: 4, B: 4, C: 4, D: 4, E: 4


## 6. QUESTION DISPLAY & STUDENT EXPERIENCE
### 6.1 Pre-Quiz Blueprint Overview Page
Before students start quiz, they see:

QUIZ BLUEPRINT & LEARNING GUIDE

├── Package info (name, ID, duration)

├── Domain distribution (visual breakdown)

├── Cognitive level distribution

├── Difficulty distribution

├── Learning tips

└── [MULAI QUIZ] button

Student dapat expand setiap section untuk lihat detail lebih lanjut.
### 6.2 Quiz Interface
┌─────────────────────────────────────────┐

│ Question [2] of [20]                    │

│ Timer: [25:45] | Progress: [40%]        │

│ Subject: Infectious Disease             │

├─────────────────────────────────────────┤

│ [QUESTION TEXT - Full case scenario]   │

├─────────────────────────────────────────┤

│ A. ◯ Option A                           │

│ B. ◯ Option B                           │

│ C. ◉ Option C (SELECTED)                │

│ D. ◯ Option D                           │

│ E. ◯ Option E                           │

│ [Show Hint] [Show Reasons]              │

├─────────────────────────────────────────┤

│ [← PREV] [CEK JAWABAN] [NEXT →] [SKIP] │

└─────────────────────────────────────────┘
### 6.3 "Cek Jawaban" (Answer Checking) Flow
Step 1: Student select option

Step 2: Click [CEK JAWABAN]

Step 3: System shows:

        ✓ BENAR! (if correct) or ✗ SALAH! (if wrong)

        Jawaban Anda: C

        Jawaban yang Benar: C

Step 4: [SHOW EXPLANATION] link available

Step 5: Student can [NEXT] or [ULANG] (retry)
### 6.4 Answer Explanation (8 Sections)
Correct Answer Statement: "Correct answer: C. Perform a therapeutic lumbar puncture..."
Tested Concept: "Tata laksana hipertensi intrakranial simptomatik..."
Concise Reasoning: Detailed explanation why correct
Distractor Analysis: For each wrong option (A, B, D, E)
Basic-to-Clinical Connection: Link to basic science
High-Yield Pearl: Key clinical takeaway
References: Citation & links
Verification Status: VERIFIED / NEEDS_REVIEW / DRAFT
### 6.5 "Show Hints" Feature (Optional)
Optional hint per question
Shows clinical pearl or guideline reference
Admin can enable/disable per question
### 6.6 "Show Reasons" Feature
Brief explanation for each option BEFORE answer check
Helps student thinking process
Can be hidden until answer submitted (configurable)
### 6.7 Post-Quiz Results Dashboard
Overall Score: 16/20 (80%)

Time Used: 22:45 minutes

Average: 1:08 per question

Performance by Domain:

├─ Bacteriology: 3/3 (100%)

├─ Virology: 1/2 (50%)

├─ Mycology: 2/2 (100%)

└─ ... (more)

Recommendations:

- Review Virology domain (50% accuracy)

- Practice diagnostic interpretation


## 7. ADMIN DASHBOARD & FEATURES
### 7.1 Integrated Package Manager
Single Dashboard dengan 4 Tabs:

Tab 1: Parameters

Package name, ID, subject
Quiz settings (language, time per question)
Target audience, competition level
Publishing settings

Tab 2: Distribution

Domain distribution editor (with up/down arrows)
Cognitive level distribution editor
Difficulty distribution editor
Correct answer distribution editor
Visual charts & auto-balance feature

Tab 3: Questions

List all questions dalam package
Filter & search
Add/remove questions
Reorder questions
Preview questions

Tab 4: Review & Publish

Final checklist
Distribution verification
Publish button
### 7.2 Student Management
Peserta Admin Page:

List semua siswa dengan biodata
View progress per siswa
View activity log
Edit biodata
Bulk import (CSV/Excel)
Bulk reset device
Deactivate/delete akun
View leaderboard
### 7.3 Question Management
Question Edit Interface:

WYSIWYG editor untuk question text
5 option input fields
Metadata fields (domain, topic, difficulty, cognitive level)
Full explanation editor (8 sections)
Bulk import support
Question versioning
### 7.4 Analytics & Reporting
Metrics:

Progress tracking per siswa (accuracy, time spent, retry history)
Performance by domain & cognitive level
Leaderboard (most questions solved, highest accuracy)
Activity monitoring (who's online, last activity)
Early warning for lagging students
Export capabilities (CSV/Excel)
### 7.5 Exam Schedule Management
Calendar:

Web-based calendar (not Google Calendar integration)
Display 8 olympiad events
Timeline visualization
Notification system (email)
Multiple exams per BAB support
### 7.6 Device Management
Device Admin:

View registered devices per siswa
Reset device binding
View device access history
Cheating detection logs


## 8. AUTHENTICATION & SESSION MANAGEMENT
### 8.1 Login Flow
Browser/SEB → Web Olimp Login Page

            ↓

Input username + password

            ↓

Server validate credentials

            ↓

Check device_id from request

            ↓

IF device not in database:

    → First time login

    → Capture device fingerprint

    → Store in database

ELSE IF device matches registered:

    → Create session

ELSE:

    → REJECT login
### 8.2 Session Configuration
Session timeout: 24 jam idle timeout
Refresh token: TBD (backend architecture)
Session storage: HTTP-only cookies (recommended)
Concurrent login: Auto-logout previous session from same device
### 8.3 Logout
Clear session token
Device binding persists
Can login again from same device


## 9. SECURE EXAM BROWSER (SEB) INTEGRATION
### 9.1 Configuration File
File Format: TBD (JSON / XML / Custom binary)

Content:

Server URL
Device token (unique per installation)
User credentials (encrypted)
Access restrictions
Security policies
Exam settings

Download Process:

Siswa registrasi di Web PCV
Terima link download config file
Config auto-generated per user + package
Download via HTTPS
Import ke SEB app
### 9.2 SEB Access Control
CRITICAL:

Web Olimp HANYA accessible via SEB
Direct browser access → error message / redirect
Admin exception: Super Admin & Admin bisa akses via browser

Implementation:

Detect SEB-specific headers
Check SEB device token
If not from SEB → return 403 (unless admin)
### 9.3 Anti-Cheating Features
Real-time Monitoring:

Detect alt+tab / window switching
External monitor detection
Screenshot attempts prevention
Copy-paste blocking
Console/DevTools disable
Logging semua suspicious activity

Admin can view:

Cheating detection flags
Activity logs per siswa
Device access patterns
### 9.4 Security
Communication:

HTTPS TLS 1.3+ mandatory
Certificate pinning (optional)
Payload validation & signature verification

Data Protection:

Exam answers encrypted in transit & at rest
Passwords: salted + hashed (bcrypt)
Database encryption for sensitive data
Audit trail for all actions


## 10. EXAM SCHEDULE & CALENDAR
### 10.1 Calendar System
Type: Web-based calendar (not Google Calendar)

Display:

8 olympiad events
Timeline/estimasi perlombaan
Notification system (email)
### 10.2 Exam Features
Multiple Exams per BAB: ✓ Possible

Admin can create multiple exam schedules
Each exam has unique ID
Student can access exam within date range

Notifications:

Channel: Email (SMS: TBD)
Types: New exam, deadline approaching, result ready, device reset, account status change

Access Control:

Exam locked before start date
Exam locked after end date
Student can only access during allowed period
### 10.3 Admin Exam Management
Create/edit/delete exam schedules
Set start/end dates
Assign BAB & questions
View exam statistics
Extend deadline if needed


## 11. PERFORMANCE TRACKING & ANALYTICS
### 11.1 Student Progress Metrics
Per-Student:

Total questions attempted
Total questions correct
Accuracy rate (%)
Time spent per question (average)
Total time on platform
Last activity timestamp
Soal yang belum dikerjakan

Per-BAB:

Completion % (berdasarkan soal dikerjakan)
Accuracy rate
Estimated time to completion

Per-Exam:

Score
Time spent
Questions attempted/correct
Result status

Learning Path:

Recommended next topic
Strong areas (high accuracy)
Weak areas (low accuracy)
Retry history
### 11.2 Leaderboard
Display Options:

Global leaderboard (top N students)
Filter by mata kuliah, BAB, time period
Rank by: most questions solved, highest accuracy, most improvement

Privacy: TBD (show name, initials, or anonymous ID)
### 11.3 Admin Dashboard
Metrics:

Keaktifan siswa (active users, frequency)
Early warning system (lagging students)
Progress overview per siswa
Domain/cognitive/difficulty analytics
Export reports (CSV/Excel)


## 12. DATA PRIVACY & SECURITY
### 12.1 Access Control
Disable Developer Tools:

Disable F12 / Right-click inspection
Disable keyboard shortcuts
Disable right-click context menu (in SEB)
Console access disabled
Debugger access disabled

Note: More control possible within SEB environment
### 12.2 Data Protection
Encryption:

All API communication: HTTPS TLS 1.3+
Passwords: bcrypt (salted + hashed)
Exam answers: encrypted before storing
Sensitive data in database: encrypted at rest
Encryption key management: TBD
### 12.3 Audit Trail
What to Log:

Login/logout (timestamp, device, IP)
Question access (which, when, duration)
Answer submission (question, answer, time)
Admin actions (user edit, soal edit, device reset)
Failed login attempts
Unauthorized access attempts
Suspicious activity flags

Log Retention: Minimum 6 bulan (TBD)
### 12.4 Compliance
Standards:

Data encryption
Access control & authentication
Audit logging
User privacy preferences


## 13. ERROR HANDLING & RECOVERY
### 13.1 Connection Loss
During Quiz:

Auto-save jawaban every 5 seconds
Show offline indicator
Buffer jawaban locally
Auto-sync ketika connection kembali
Grace period: 5 menit untuk reconnect
Tidak perlu restart exam

Logging:

Log setiap disconnect event
Log reconnect timestamp
Admin notified tentang problematic users
### 13.2 Browser/App Crash
SEB session persisted ke disk
Saat app dibuka kembali:
Attempt auto-resume exam
Show "Resume previous session?" dialog
Jika confirm: lanjut dari soal terakhir
Jika baru: start dari beginning
### 13.3 Admin Notification System
Admin notified about:

Frequent connection issues
Multiple login failures
Device reset requests
Suspicious activity (cheating flags)
Notification via email (dashboard widget)


## 14. INTEGRATION WITH WEB PCV
### 14.1 Shared Data
Shared:

User credentials (authentication)
User profile (name, email)
Subscription info (package, expiry date)

Separate:

Questions & materials
Progress tracking
Exam results
### 14.2 User Flow Integration
1. Student daftar di Web PCV

2. Buy paket Olimp via Web PCV

3. Download SEB config dari Web PCV

4. Launch SEB → auto-detect Olimp config

5. Login SEB → access Olimp web

6. Manage credentials di Web PCV (change password, etc)
### 14.3 Database
Status: TBD

Separate PocketBase instances? atau shared?
Sync mechanism TBD


## 15. DATABASE SCHEMA
### 15.1 PocketBase Collections
Collection: questions

- id (TEXT, primary key)

- subject_id (TEXT, FK)

- primary_domain (TEXT)

- secondary_topic (TEXT)

- organism_syndrome (TEXT)

- question_text (TEXT, rich HTML)

- option_a, option_b, option_c, option_d, option_e (TEXT)

- correct_answer (TEXT: A/B/C/D/E)

- cognitive_level (TEXT)

- difficulty_level (NUMBER: 1-5)

- learning_objective (TEXT)

- estimated_time_seconds (NUMBER)

- question_architecture (TEXT)

- hint_text (TEXT, optional)

- created_at, updated_at (DATE)

- created_by, updated_by (TEXT, user_id)

- verified_status (TEXT: DRAFT/NEEDS_REVIEW/VERIFIED)

- verified_by (TEXT, optional)

- verified_at (DATE, optional)

Collection: question_explanations

- id (TEXT, primary key)

- question_id (TEXT, FK)

- section (TEXT: correct_answer/tested_concept/reasoning/distractor_a/etc)

- explanation_text (TEXT, rich HTML)

- basic_clinical_connection (TEXT)

- high_yield_pearl (TEXT)

- references (JSON array)

- created_at, updated_at (DATE)

Collection: question_packages

- id (TEXT, primary key)

- package_name (TEXT)

- subject_id (TEXT, FK)

- total_questions (NUMBER)

- question_ids (JSON array)

- language (TEXT: EN/ID/EN_ID)

- answer_language (TEXT)

- target_audience (TEXT)

- competition_level (TEXT)

- created_at, updated_at (DATE)

- published_status (TEXT: DRAFT/PUBLISHED)

Collection: subject_blueprints

- id (TEXT, primary key)

- subject_id (TEXT, FK)

- domain_distribution (JSON)

- cognitive_distribution (JSON)

- difficulty_distribution (JSON)

- correct_answer_distribution (JSON)

- created_at, updated_at (DATE)

Collection: users

- id (TEXT, primary key)

- username (TEXT)

- email (TEXT)

- password_hash (TEXT)

- role (TEXT: student/teacher/admin/super_admin)

- registered_device_id (TEXT, nullable)

- registered_device_info (JSON)

- subscription_package_id (TEXT, FK)

- subscription_start_date (DATE)

- subscription_end_date (DATE)

- created_at, updated_at (DATE)

Collection: registered_devices

- id (TEXT, primary key)

- user_id (TEXT, FK)

- device_fingerprint (TEXT)

- device_token (TEXT)

- device_name (TEXT, optional)

- registered_date (DATE)

- last_login_date (DATE)

- status (TEXT: active/reset_pending/inactive)


## 16. IMPLEMENTATION ROADMAP
### 16.1 MVP (Minimum Viable Product)
Phase 1 (Weeks 1-4):

User authentication & device locking
SEB integration & config download
Question display interface
"Cek Jawaban" functionality
Basic explanation display
Progress tracking (questions attempted/correct)
Admin CRUD for questions
Admin package parameter editor

Phase 2 (Weeks 5-8):

Integrated package manager (4 tabs)
Distribution management interface
Blueprint overview page
Bulk import questions (CSV)
Leaderboard functionality
Student management (list, bulk import/reset)
Exam schedule management
Basic analytics dashboard

Phase 3 (Weeks 9-12):

Detailed explanations (all 8 sections)
Hint system
References/citation system
Timed quiz mode
Answer distribution visualization
Advanced analytics (by domain/cognitive/difficulty)
Email notifications
Device management admin panel
### 16.2 Post-MVP (Phase 2+)
Real-time cheating detection logs
Image/media support in questions
LaTeX math formula rendering
Question difficulty adaptive routing
Question quality scoring system
AI-generated explanations
Mobile app (iOS/Android with SEB)
Peer explanation system
Video content integration
Advanced reporting & exports
### 16.3 Success Metrics
User Adoption: X% of registered students active within 7 days
Performance: Page load < 2s, quiz smooth with 0 crashes
Engagement: Average Y minutes per session, Z% completion rate
Accuracy: A% correct answers on average, improving over time
Satisfaction: NPS > 70, 4.5+ star rating


## 17. OUTSTANDING ITEMS & PENDING CLARIFICATION
### 17.1 Technical Specifications Pending
Question Format Detail: Format soal PDF (akan dikirim)
Payment Integration: Payment gateway details
Scoring Algorithm: Bagaimana grading works
Session Timeout: Exact duration & refresh token strategy
Device Reset Process: Detailed workflow untuk admin reset device
Exam Feedback Timing: Instant atau setelah submit
Performance Recommendations: Recommendation engine untuk next topic
Database Decision: Separate atau shared PocketBase dengan PCV
API Specification: Detailed backend API endpoints
Deployment Infrastructure: Cloud vs on-premise, scaling plan
### 17.2 Business Logic Pending
Package Details: Spesifikasi setiap subscription package
Pricing Model: Price per package
Data Retention Policy: How long to keep data
Refund Policy: Refund terms if any
Teacher Device Lock: Apakah teacher juga ada device lock?
### 17.3 Design/UX Pending
UI/UX Mockup: Detailed wireframe untuk semua halaman
Admin Panel Design: Detailed design untuk package editor
Error Message Copy: Exact wording untuk error messages
Email Templates: Design untuk notification emails
Color Scheme & Typography: Brand guidelines


## 18. GLOSSARY
Term
Definition
SEB
Secure Exam Browser - aplikasi untuk exam security
Device Lock
Mechanism yang restrict access ke 1 device per student
Blueprint
Distribution specification untuk questions (domain %, difficulty %, dll)
Cek Jawaban
Button untuk check if answer correct (not "submit")
Cognitive Level
Bloom's taxonomy level (foundational, one-step, multi-step, dll)
Distractor
Wrong answer option (to distract from correct answer)
Leaderboard
Ranking siswa berdasarkan performance
PocketBase
Lightweight backend database/API server
Web PCV
Existing platform yang akan diintegrasikan
Package
Set of questions dengan blueprint specification
Verification Status
Quality review state (DRAFT/NEEDS_REVIEW/VERIFIED)
Question Architecture
Logical structure of how question is constructed


## APPENDIX: QUICK REFERENCE
### Key Features Summary
✓ One-device-per-student binding with hybrid fingerprinting
✓ SEB-only access (admin can use browser)
✓ Blueprint-first question distribution
✓ Instant feedback ("Cek Jawaban" button)
✓ 8-section detailed explanations
✓ Pre-quiz blueprint overview
✓ Integrated 4-tab package manager
✓ Leaderboard & analytics
✓ Bulk student & question management
✓ Web-based exam calendar (8 olympiad events)
### Critical Decision Points
Device Reset Policy: How to handle student device changes?
Database Architecture: Shared or separate PocketBase instances?
Package Specifications: Detailed pricing & subscription tiers?
Teacher Device Lock: Should teachers have device locking restrictions?
Payment Gateway: Which provider and how to integrate?


Document Status: COMPLETE & PRODUCTION READY  
Format: Clean, structured, ready for Claude integration  
Next Steps: Design phase, then development kickoff
