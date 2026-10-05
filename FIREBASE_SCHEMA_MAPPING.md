# Chaitanya 2k26 — Firebase Schema Implementation Guide
### Mapping PostgreSQL/Supabase Relational Schema (`chaitanya_schema.sql`) to Google Cloud Firestore

This document details the complete translation and deployment of the SQL schema defined in [`chaitanya_schema.sql`](./chaitanya_schema.sql) into **Google Cloud Firestore**, including security rules, composite indexes, real-time sync, and automated seeders.

---

## 1. Schema Entity Mapping (SQL ➔ Firestore)

| SQL Table (`chaitanya_schema.sql`) | Firestore Collection | Document ID Format | Core Schema Fields & Types |
| :--- | :--- | :--- | :--- |
| **`users`** | `/users/{uid}` | Firebase Auth `UID` | `id`, `firebase_uid`, `name`, `email`, `phone`, `university`, `category`, `google_provider` (`bool`), `google_email`, `student_id`, `role` (`'admin' \| 'attendee'`), `created_at`, `updated_at` |
| **`events`** | `/events/{eventId}` | Event slug (e.g. `ai-hackathon`) | `id`, `title`, `type` (`'workshop' \| 'competition'`), `description`, `venue`, `start_time` (ISO), `end_time` (ISO), `registration_deadline` (ISO), `capacity` (`int`), `status` (`'draft' \| 'published' \| 'completed' \| 'cancelled'`), `created_by`, `created_at`, `updated_at`, `entryFeeNum`, `prizePool` |
| **`teams`** | `/teams/{teamId}` | `team_{eventId}_{timestamp}` | `id`, `event_id`, `team_name`, `team_code` (unique, e.g. `BYTE-408`), `leader_id` (`uid`), `members` (array of participant records), `maxTeamSize`, `paymentStatus`, `created_at` |
| **`team_members`** | `/team_members/{id}` | `{teamId}_{userId}` | `team_id`, `user_id`, `role` (`'leader' \| 'member'`), `joined_at` |
| **`registrations`** | `/registrations/{regId}` | `reg_{eventId}_{userId}` | `id`, `user_id`, `event_id`, `participation_type` (`'individual' \| 'team'`), `team_id`, `registration_status` (`'registered' \| 'cancelled' \| 'attended'`), `registration_qr_id` (unique), `registered_at` |
| **`event_analytics`** | `/event_analytics/{eventId}` | `eventId` (matching event) | `event_id`, `total_registrations`, `individual_registrations`, `team_registrations`, `total_teams`, `last_updated` |
| **`event_daily_analytics`** | `/event_daily_analytics/{id}` | `{eventId}_{YYYY-MM-DD}` | `id`, `event_id`, `date` (`YYYY-MM-DD`), `registrations`, `individual_registrations`, `team_registrations` |
| **`faqs`** | `/faqs/{faqId}` | e.g. `faq_eligibility` | `id`, `question`, `answer`, `display_order` (`int`), `published` (`bool`), `created_at`, `updated_at` |
| **`queries`** | `/queries/{queryId}` | `query_{timestamp}_{hash}` | `id`, `user_id`, `name`, `email`, `phone`, `team_name`, `subject`, `message`, `status` (`'open' \| 'in_progress' \| 'resolved' \| 'closed'`), `created_at`, `updated_at` |

---

## 2. Security Rules (`firestore.rules`)

The declarative rules in [`firestore.rules`](./firestore.rules) strictly enforce all constraints declared in SQL:

- **Check Constraints (`CHECK`)**:
  - `type in ['workshop', 'competition']` for `/events`
  - `status in ['draft', 'published', 'completed', 'cancelled']` for `/events`
  - `participation_type in ['individual', 'team']` for `/registrations`
  - `role in ['leader', 'member']` for `/team_members`
  - `status in ['open', 'in_progress', 'resolved', 'closed']` for `/queries`
- **Ownership & Foreign Key Enforcement**:
  - Users can only read/write their own records (`request.auth.uid == userId`).
  - Only the team leader or fest admin can edit team rosters.
  - Anyone can submit a contact query (`/queries`), but only admins can update/close tickets.
- **Admin Privilege**:
  - Authorized email (`chaitanyahptu@gmail.com`) has full read/write privileges over all collections and event analytics.

---

## 3. Composite Indexes (`firestore.indexes.json`)

Firestore indexes match the SQL `CREATE INDEX` statements:
- `events`: `(status ASC, start_time ASC)`, `(type ASC, start_time ASC)`
- `teams`: `(event_id ASC, created_at DESC)`
- `team_members`: `(user_id ASC, joined_at DESC)`
- `registrations`: `(user_id ASC, registered_at DESC)`, `(event_id ASC, registration_status ASC)`
- `event_daily_analytics`: `(event_id ASC, date ASC)`
- `queries`: `(status ASC, created_at DESC)`, `(user_id ASC, created_at DESC)`
- `faqs`: `(published ASC, display_order ASC)`

---

## 4. How to Apply Schema & Seed to Firebase

### Step 1: Ensure Cloud Firestore is Initialized
If Cloud Firestore has not been clicked in your Firebase project yet:
1. Visit the [Firebase Console Firestore Database](https://console.firebase.google.com/project/chaitainya-hptu/firestore).
2. Click **"Create database"**.
3. Select your location (e.g. `asia-south1` for Mumbai, India).
4. Start in **Production mode** (or Test mode).

### Step 2: Deploy Rules & Indexes via CLI
Run from the project root:
```bash
npm run deploy:rules
```
*(or run `firebase deploy --only firestore:rules,firestore:indexes`)*

### Step 3: Seed Collections (Events, FAQs, Analytics)
You have two easy ways to apply and populate all collections:

#### Method A: From the Browser Admin Command Center (Recommended)
1. Open [http://localhost:3000](http://localhost:3000).
2. In the top navigation bar, open the user modal and click **Fest Command Center** (or run `openAuthModal('admin')` in the developer console).
3. Switch to the **`[ 04. SCHEMA & FIREBASE SYNC ]`** tab.
4. Click **`[ ⚡ Apply Schema & Seed Events/FAQs to Firebase ]`**.
5. The system will seed all 12 flagship events, FAQs, and analytics counters with live progress feedback!

#### Method B: Via Node CLI Script
Run:
```bash
npm run seed:firebase
```
*(or run `node scripts/apply-schema-firebase.mjs`)*
