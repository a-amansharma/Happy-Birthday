# INSTRUCTION_FOR_ADMIN.md — Complete Admin & Developer Manual

> **Our Little World** — the permanent, single-source-of-truth manual for anyone managing, deploying, or modifying this website.

---

## Quick Admin Reference

| Item | Details |
|---|---|
| **Website URL** | `https://YOUR-DOMAIN/` (hosted as static site) |
| **Admin panel** | `https://YOUR-DOMAIN/admin/` (private, not linked anywhere) |
| **Supabase project** | `zbnbuhpmctxocupunbdo.supabase.co` |
| **Supabase SQL Editor** | Dashboard → SQL Editor (paste + run `supabase.sql`) |
| **Main DB tables** | `profiles`, `messages` |
| **Main config file** | `js/config.js` (Supabase URL + anon key) |
| **SQL setup file** | `supabase.sql` (root of project) |
| **Local dev** | Open `index.html` in browser or use any static server |
| **Deployment** | Push to GitHub → GitHub Pages auto-deploys |

---

## 1. What This Website Is

**Our Little World** is a private, romantic web app designed for **two people** (two phones, one relationship). There is no public user registration — each phone silently gets a private anonymous identity, and a `LOVE-XXXXX` code pairs two phones into one relationship.

### What it does

- 💬 **Real-time couple chat** — text + photos, live typing indicators, unread badges
- 🎲 **Daily Bond Quiz** — 5 questions a day, answered independently, match result revealed live
- 📸 **Memories** — two-column gallery (one per person), sticky notes + polaroids
- 💌 **Love Notes** — private notes between the two
- ☀️ **Daily Question** — one sweet question a day
- 🐻 **AI Companion** — a cozy chatbot companion
- 🎨 **Themes** — 7 visual themes, changeable anytime
- 🎵 **Background music** — soft synthesized romantic music (starts muted)
- 🌐 **Pairing** — no email/password, just a `LOVE-XXXXX` code

---

## 2. Architecture — How It All Works

```
User on Phone A          User on Phone B
      │                        │
      ▼                        ▼
  Website Frontend        Website Frontend
  (vanilla JS)            (vanilla JS)
      │                        │
      ▼                        ▼
  Anonymous Auth ──────► Supabase Auth
      │                        │
      ▼                        ▼
  profiles table ◄────► profiles table
  (pairing code)       (entering code)
      │                        │
      └────────┬───────────────┘
               ▼
         messages table
         (real-time chat)
               │
               ▼
         Supabase Realtime
         (live sync both phones)
```

### Frontend Technology

- **Vanilla JavaScript** — no React, no Vue, no build step
- **IIFE modules** on `window.HB` namespace (each file is self-contained)
- **History API router** — clean URLs like `/settings`, `/chat`, `/home`
- **CSS custom properties** for theming
- **No npm, no webpack, no bundler** — just static files

### Backend Technology

- **Supabase** (hosted at supabase.com)
  - **Database**: PostgreSQL (managed)
  - **Auth**: Anonymous authentication (no email/password for users)
  - **Realtime**: Postgres changes + Presence channels
  - **Storage**: Not used (chat images use base64 data URLs)

### How Data Flows

1. User opens website → browser loads static HTML/JS/CSS
2. `js/config.js` provides Supabase URL + anon key
3. `js/supabase.js` creates Supabase client, restores any saved session
4. `js/app.js` boots the app, initializes backend connection
5. Anonymous sign-in creates a Supabase user (no email needed)
6. Profile data stored in `profiles` table (RLS: users can only see their own + partner's row)
7. Chat messages stored in `messages` table (RLS: only paired couple can see their messages)
8. Realtime subscriptions push changes to both phones instantly

---

## 3. Project Structure

```
Happy-Birthday/
├── index.html              ← Entry point (single HTML page)
├── supabase.sql            ← DATABASE SETUP — run in Supabase SQL Editor
├── README.md               ← Project description
├── INSTRUCTION_FOR_ADMIN.md← THIS FILE
├── .nojekyll               ← Prevents GitHub Pages from processing with Jekyll
├── 404.html                ← SPA fallback for GitHub Pages
├── css/
│   ├── styles.css          ← Main styles (1265 lines)
│   ├── dudu.css            ← Character animations
│   └── characters.css      ← Character poses
├── js/
│   ├── config.js           ← Supabase URL + anon key (PUBLIC — safe to expose)
│   ├── supabase.js         ← Boots Supabase client, restores session
│   ├── core.js             ← State, router, nav, toasts, modal, music, particles
│   ├── data.js             ← App data constants (themes, vibes, relationships, etc.)
│   ├── bears.js            ← Bear character SVGs
│   ├── dudu.js             ← Dudu character system
│   ├── characters.js       ← Character hero/stage rendering
│   ├── notes.js            ← Notes data helpers
│   ├── chatdata.js         ← Chat/companion AI data
│   ├── landing.js          ← Landing page (hero + pairing code entry)
│   ├── onboarding.js       ← 9-step wizard + account setup
│   ├── dashboard.js        ← Home dashboard
│   ├── couplechat.js       ← Real-time couple chat page
│   ├── chatinfo.js         ← Chat photos & links page
│   ├── chat.js             ← AI companion chat page
│   ├── lovenotes.js        ← Love notes page
│   ├── daily.js            ← Daily question page
│   ├── memories.js         ← Memories gallery page
│   ├── quiz.js             ← Couple quiz page
│   ├── dateideas.js        ← Date ideas page
│   ├── dates.js            ← Special dates/timer page
│   ├── partner.js          ← Partner/connection page
│   ├── settings.js         ← Settings page + erase data
│   ├── creator.js          ← Creator info
│   ├── app.js              ← Boot sequence, backend init
│   ├── vendor/
│   │   └── supabase.min.js ← Vendored supabase-js v2 (works offline)
│   └── services/
│       ├── db.js           ← Supabase client wrapper + realtime registry
│       ├── auth.js         ← Anonymous authentication
│       ├── relationship.js ← Pairing, profiles, connection state
│       ├── chat.js         ← Chat messages (send/load/subscribe)
│       ├── presence.js     ← Online status + typing indicators
│       ├── quiz.js         ← Quiz service (DB queries)
│       └── net.js          ← Connectivity detection + status bar
├── admin/
│   ├── index.html          ← Admin insights page (private)
│   ├── insights.js         ← Admin dashboard logic
│   └── styles.css          ← Admin styles
├── images/                 ← Static images
└── test/
    ├── smoke.js            ← Core module smoke tests
    └── router.js           ← Router tests
```

### Files safe to modify

- `css/styles.css` — visual design changes
- `js/data.js` — themes, vibes, relationships, questions
- `js/characters.js`, `js/dudu.js` — character rendering
- Any page file (`js/landing.js`, `js/dashboard.js`, etc.) — UI changes

### Files to modify carefully

- `js/config.js` — Supabase connection (wrong values = app breaks)
- `supabase.sql` — database schema (wrong SQL = app breaks + data loss risk)
- `js/core.js` — router and state (breaking changes = all pages break)
- `js/services/*.js` — backend services (wrong code = data corruption risk)
- `js/supabase.js` — client bootstrap (wrong code = auth breaks)

### Files NOT to modify

- `js/vendor/supabase.min.js` — vendored library (revert any changes)
- `.nojekyll` — GitHub Pages config
- `404.html` — SPA fallback

---

## 4. How Authentication Works

### Method: Anonymous Authentication

This website uses **Supabase Anonymous Authentication**. There are no email/password login screens for regular users.

**How it works:**
1. User opens the website
2. The app calls `signInAnonymously()` on the Supabase client
3. Supabase creates a private anonymous user (UUID like `e65fabbb-cc49-...`)
4. This UUID is stored in the browser's localStorage (as `sb-*` keys)
5. The user's profile row in the `profiles` table is linked to this UUID
6. Row Level Security (RLS) ensures users can only see their own data + their partner's data

**Key points:**
- Each phone gets its own anonymous identity
- The identity persists across browser sessions (stored in localStorage)
- No email or password is ever collected
- Signing out destroys the anonymous identity
- "Erase Everything" in Settings signs out and clears all data

### Where auth state is stored

- `window.HB.authSession` — current Supabase session (in memory)
- `window.HB.authUser` — current Supabase user object (in memory)
- `localStorage` keys starting with `sb-` — Supabase auth tokens (persist across sessions)
- `localStorage` key `ourLittleWorld_v1` — app state (profile, memories, settings)

### How to troubleshoot auth errors

| Symptom | Likely cause | Fix |
|---|---|---|
| "We couldn't create your little identity" | Anonymous sign-in disabled in Supabase | Dashboard → Authentication → Providers → enable "Anonymous sign-ins" |
| "Your session expired" | Token expired, no refresh | Reload the page (Supabase auto-refreshes) |
| App says "Cloud connection isn't set up" | `js/config.js` has wrong URL/key | Check `SUPABASE_URL` and `SUPABASE_ANON_KEY` in `js/config.js` |
| Users disappear after reload | localStorage cleared or incognito mode | Normal in incognito; in regular mode, check browser storage settings |

---

## 5. How Pairing Works

### Person 1 (Creator)

1. Opens the website → clicks "Create Our Space ♡"
2. Goes through the 9-step wizard (name, partner's name, ages, relationship, vibes, chat style, special story, theme)
3. After Step 9, their phone silently signs in anonymously
4. A profile row is created in the `profiles` table with a `LOVE-XXXXX` pairing code
5. The pairing code is displayed on screen with a copy button
6. Person 1 shares this code with Person 2

### Person 2 (Joiner)

1. Opens the website → clicks "I already have our space"
2. A modal appears → enters the `LOVE-XXXXX` code
3. Their phone silently signs in anonymously
4. The `connect_with_partner` RPC runs:
   - Creates Person 2's profile row (with empty name/age)
   - Looks up Person 1's code in the `profiles` table
   - Links both profiles via `partner_id`
   - Clears the pairing code (single-use)
   - Returns Person 1's name/age to Person 2
5. Person 2's local state is hydrated with Person 1's info
6. Both phones are now connected — all features (chat, quiz, memories) work in sync

### RLS policies for pairing

- Users can only read/update/delete their **own** profile row
- Users can **read** their partner's profile row (via `partner_id` lookup)
- The `connect_with_partner` RPC is `security definer` (runs with elevated privileges to link two users)
- Pairing codes are **single-use** — once claimed, the code is cleared

---

## 6. Supabase Complete Guide

### Accessing Supabase

1. Go to https://supabase.com/dashboard
2. Select the project: `zbnbuhpmctxocupunbdo` (or your project name)
3. You'll see the project dashboard

### Key areas in the dashboard

| Area | What's there | When to use |
|---|---|---|
| **SQL Editor** | Run SQL queries | Schema changes, data fixes, troubleshooting |
| **Table Editor** | View/edit rows | Debug data issues, check if users exist |
| **Authentication → Users** | List of all anonymous users | Find a user's UUID, check if auth is working |
| **Authentication → Providers** | Auth provider settings | Enable/disable anonymous sign-ins |
| **Database → Tables** | Table structure | Verify columns, indexes, RLS policies |
| **Database → Publications** | Realtime publications | Check which tables have realtime enabled |
| **Storage** | File storage buckets | Not used in this app (images use base64) |

### SQL Editor — Step-by-step

1. Open Supabase Dashboard → SQL Editor
2. Click "New query" (or open an existing saved query)
3. Paste the SQL you want to run
4. Click "Run" (or press Cmd/Ctrl + Enter)
5. Check the results panel below for success/error messages
6. If error → read the error message carefully → fix the SQL → run again

**Safe vs dangerous SQL:**
- `CREATE TABLE IF NOT EXISTS` — safe, idempotent
- `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` — safe, idempotent
- `CREATE OR REPLACE FUNCTION` — safe, overwrites existing
- `DROP TABLE` — dangerous, deletes data
- `DELETE FROM` — dangerous, deletes rows
- `UPDATE ... SET` without `WHERE` — dangerous, affects all rows

---

## 7. The SQL File — `supabase.sql`

### What it does

This single file sets up the **entire database** for the app. It creates:

| What | Name | Purpose |
|---|---|---|
| Table | `profiles` | One row per user (name, age, pairing code, partner link) |
| Table | `messages` | Private couple chat (text + images as base64) |
| Function | `connect_with_partner(code)` | Pairs two users using a LOVE-XXXXX code |
| Function | `delete_my_data()` | Erases a user's profile and unlinks partner |
| Function | `is_couple_pair(a, b)` | Security helper — checks if two UUIDs are a paired couple |
| Function | `admin_get_insights()` | Returns admin data (owner-only, security definer) |
| Index | `profiles_pairing_code_uniq` | Fast lookup of pairing codes |
| Index | `profiles_partner_id_idx` | Fast partner lookups |
| Index | `messages_pair_idx` | Fast chat message queries |
| RLS policies | 8 policies | Strict two-person access control |
| Realtime | 2 publications | `profiles` + `messages` tables stream live to both phones |

### When to run it

- **First setup** — when creating the Supabase project
- **After schema changes** — if you modify the SQL file
- **To fix errors** — if the database is in a broken state

### How to run it

1. Open `supabase.sql` in a text editor (or copy its contents)
2. Open Supabase Dashboard → SQL Editor
3. Paste the **entire contents** of `supabase.sql`
4. Click "Run"
5. You should see: `DATABASE SETUP COMPLETED SUCCESSFULLY`
6. If you see errors → read them carefully → they tell you exactly what's wrong

### Important notes

- The file is **idempotent** — running it multiple times is safe
- `CREATE TABLE IF NOT EXISTS` won't overwrite existing data
- `ALTER TABLE ADD COLUMN IF NOT EXISTS` won't duplicate columns
- `CREATE OR REPLACE FUNCTION` replaces the function if it exists
- `DROP POLICY IF EXISTS` removes old policies before creating new ones
- **Back up important data** before running on a production database with real users

---

## 8. Database Documentation

### Table: `profiles`

One row per user. This is the core table — everything (pairing, names, connection) depends on it.

| Column | Type | Purpose | Required |
|---|---|---|---|
| `id` | uuid (PK) | Supabase auth user ID | Yes (auto from auth) |
| `name` | text | User's display name | No (default: `''`) |
| `age` | integer | User's age | No (default: null) |
| `pairing_code` | text | Unique LOVE-XXXXX code | No (set during onboarding) |
| `partner_id` | uuid (FK→profiles) | Linked partner's user ID | No (set when paired) |
| `partner_code` | text | Code used to pair | No (set during pairing) |
| `created_at` | timestamptz | When the user joined | Yes (auto) |
| `last_active` | timestamptz | Last heartbeat timestamp | No (updated periodically) |

**RLS Policies:**
- `profiles select self` — users can read their own row
- `profiles select member` — users can read their partner's row
- `profiles insert own` — users can insert their own row
- `profiles update own` — users can update their own row
- `profiles delete own` — users can delete their own row

### Table: `messages`

Private couple chat. Text messages and image messages (base64 data URLs).

| Column | Type | Purpose | Required |
|---|---|---|---|
| `id` | uuid (PK) | Unique message ID | Yes (auto) |
| `user_a` | uuid | Lesser UUID of the pair | Yes |
| `user_b` | uuid | Greater UUID of the pair | Yes |
| `sender_id` | uuid | Who sent this message | Yes |
| `type` | text | `'text'` or `'image'` | Yes (default: `'text'`) |
| `message` | text | Message text (or image filename) | Yes (default: `''`) |
| `media_path` | text | Base64 data URL for images | No (default: `''`) |
| `created_at` | timestamptz | When the message was sent | Yes (auto) |

**Constraint:** `user_a < user_b` — pair UUIDs are always sorted for deterministic lookups.

**RLS Policies:**
- `messages select own pair` — only paired couples can read their own messages
- `messages insert own pair` — only paired couples can send messages (sender must be one of the pair)
- `messages delete own` — users can only delete their own messages

---

## 9. User Management

### How a new user is created

1. User opens the website
2. `signInAnonymously()` creates a Supabase auth user (UUID)
3. On first "Create Our Space" or "I already have our space":
   - `ensureProfile()` upserts a row into `profiles` with the user's UUID, name, age, and a generated pairing code
4. The user now has a profile row linked to their auth identity

### How to view users

1. Supabase Dashboard → Authentication → Users
2. Shows all anonymous users (UUIDs, creation date, last sign-in)
3. For profile data → Table Editor → `profiles` table

### How to identify a specific user

- By UUID: match the auth user ID to the `profiles.id` column
- By name: search the `profiles` table for `name` column
- By pairing code: search for `pairing_code` column

### How pairing codes work

- Generated during onboarding: `LOVE-` + 5 random alphanumeric characters (e.g., `LOVE-XK7MP`)
- Unique (enforced by database unique index)
- Single-use — cleared from both profiles after pairing
- Case-insensitive matching (SQL uses `upper()`)

### What happens after page refresh

- Auth tokens persist in localStorage → user stays signed in
- App state persists in `ourLittleWorld_v1` localStorage key
- On reload, the app restores state and re-initializes the backend connection
- Realtime subscriptions are re-established automatically

---

## 10. Complete User Flow

### Step 1: Landing Page (`/`)

- User sees the landing page with animated characters
- Two options: "Create Our Space ♡" or "I already have our space"
- **"Create Our Space"** → goes to onboarding wizard
- **"I already have our space"** → opens pairing code modal (Person 2)

### Step 2: Onboarding — About You (Step 1 of 9)

- Asks for user's name
- Stored locally in `draft.name`

### Step 3: Onboarding — About Them (Step 2 of 9)

- Asks for partner's name
- Stored locally in `draft.partner`

### Step 4: Onboarding — Your Age (Step 3 of 9)

- Asks for user's age
- Stored locally in `draft.age`

### Step 5: Onboarding — Their Age (Step 4 of 9)

- Asks for partner's age
- Stored locally in `draft.partnerAge`

### Step 6: Onboarding — Relationship (Step 5 of 9)

- Asks for relationship type (Couple, Best Friends, Crush, etc.)
- Stored locally in `draft.relationship`

### Step 7: Onboarding — Your Vibe (Step 6 of 9)

- Asks for vibe tags (Romantic, Funny, Emotional, etc.)
- Multiple selection allowed
- Stored locally in `draft.vibes`

### Step 8: Onboarding — How We Talk (Step 7 of 9)

- Asks for chat style tags (Sweet, Playful, Deep, etc.)
- Multiple selection allowed
- Stored locally in `draft.chatStyle`

### Step 9: Onboarding — Something Special (Step 8 of 9)

- Asks for a special story/memory and "together since" date
- Stored locally in `draft.story` and `draft.togetherSince`

### Step 10: Onboarding — Pick a Vibe Theme (Step 9 of 9)

- Asks for a visual theme (Milk & Mocha, Lovebirds, Pink Love, etc.)
- Theme applies live as a preview
- Stored locally in `draft.theme`

### Step 11: Finalize

- "Create Our World ♡" button clicked
- `finalize()` runs:
  1. All draft data saved to `HB.state.profile` (localStorage)
  2. `HB.state.onboarded = true` set
  3. Confetti celebration + toast
  4. If backend is configured → `setupAccount()` runs:
     a. Anonymous sign-in (if not already signed in)
     b. `ensureProfile()` creates/updates profile in Supabase
     c. `rel.init(true)` queries Supabase for relationship status
     d. If no partner → redirects to `/` (landing) showing pairing code
     e. If partner already connected → redirects to `/home`
- If backend is NOT configured → redirects straight to `/home`

### Step 12: Waiting / Home

- **Waiting**: Shows pairing code with copy button, hero characters, "Go to my little world" button
- **Connected**: Shows full dashboard with all feature tiles (Chat, Memories, Notes, etc.)

### Person 2's Flow (Joiner)

1. Opens website → clicks "I already have our space"
2. Enters the `LOVE-XXXXX` code
3. Anonymous sign-in happens
4. `connect_with_partner` RPC pairs them with Person 1
5. Person 2's local state is hydrated with Person 1's info
6. Both phones are now connected → all features work in sync

---

## 11. Step 9 Troubleshooting

### The Error

When the onboarding wizard reached **Step 9 of 9 · Pick a vibe theme** and the user clicked "Create Our World ♡", the error **"Hmm, something went wrong. Please try again ♡"** appeared.

### Root Cause

**Two independent bugs combined:**

#### Bug 1 (Primary): SQL Schema Failed to Execute

The old database setup file (`supabase/schema.sql`) tried to create functions on PostgreSQL's `storage` schema. In Supabase's hosted environment, this requires superuser privileges and fails with:

```
ERROR: 42501: permission denied for schema storage
```

Because this error occurred mid-script, the **entire SQL execution failed**. This meant:
- The `profiles` table was **never created**
- The `messages` table was **never created**
- No RLS policies were created
- No RPC functions were created

When Step 9 tried to call `ensureProfile()` (which upserts into the `profiles` table), it failed because the table didn't exist. The error message from Supabase was `42P01` ("relation does not exist"), which was caught by the error handler and displayed as the generic "Hmm, something went wrong."

#### Bug 2 (Secondary): Missing `.catch()` on Anonymous Sign-In

In `js/onboarding.js`, the `setupAccount()` function called `signInAnonymously().then()` **without a `.catch()` handler**. If the sign-in promise rejected (network error, auth not enabled, etc.), the rejection propagated unhandled, causing the UI to either:
- Stay stuck on "Setting up your little world…"
- Eventually show the generic error message

### What Was Changed

#### File: `supabase.sql` (created — replaces old `supabase/schema.sql`)

- **Completely rewritten** with zero references to the `storage` schema
- All SQL statements are idempotent (`CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`)
- Chat images now use base64 data URLs stored in the `messages.media_path` column (no storage bucket needed)
- Deleted the old `supabase/schema.sql` to prevent confusion

#### File: `js/onboarding.js`

- Added `.catch()` handler to `signInAnonymously()` promise chain
- Added error pattern for disabled anonymous auth → shows actionable message: "Anonymous sign-in isn't enabled — go to Supabase Dashboard → Authentication → Settings → enable 'Allow anonymous sign-ins'"
- Improved retry button to reload onboarding fresh

#### File: `js/services/chat.js`

- `sendImage()` rewritten to read photos as base64 data URLs via `FileReader`
- Stores the data URL directly in `media_path` column
- No storage upload, no bucket dependency

#### File: `js/couplechat.js`

- `bubbleHtml()` — if `media_path` is a data URL, sets `src` directly (instant display)
- `loadImage()` — data URLs skip the `signedUrl` lookup entirely

#### File: `js/services/db.js`

- `signedUrl()` short-circuits data URLs (returns immediately)

### How to Verify the Fix

1. **Run the new SQL**: Open Supabase SQL Editor → paste contents of `supabase.sql` → Run → should see "DATABASE SETUP COMPLETED SUCCESSFULLY"
2. **Clear browser storage**: Open DevTools → Application → Clear site data (start fresh)
3. **Test the full flow**: Open the website → click "Create Our Space" → go through all 9 steps → click "Create Our World ♡" → should see "Setting up your little world…" → should redirect to landing page showing pairing code
4. **Test Step 9 specifically**: The theme cards should load, be selectable, and "Create Our World ♡" should work without error

### What to Check If the Error Happens Again

1. **Open browser DevTools** (F12) → Console tab → look for error messages
2. **Check the exact error**: The console now shows detailed logs:
   - `[ONBOARDING] Starting account setup…` — run() started
   - `[ONBOARDING] DB configured:` — whether Supabase is connected
   - `[ONBOARDING] Auth user:` — whether user is authenticated
   - `[ONBOARDING] Supabase client:` — whether the client exists
   - `[PROFILE] Upsert error:` — the ACTUAL Supabase error with code, message, details, and hint
   - `[ONBOARDING] Setup account failed:` — the caught error with full details
   - `[ONBOARDING] Full error object:` — JSON of the complete error
3. **Common causes:**
   - If "relation does not exist" → SQL hasn't been run → run `supabase.sql`
   - If "permission denied" → RLS issue → check policies in Supabase Dashboard
   - If "Anonymous sign-ins are disabled" → enable in Authentication → Providers
   - If network error → check internet connection
   - If "Could not find the function" → SQL functions haven't been created → run `supabase.sql`
   - If "NOT_CONFIGURED" → `js/config.js` has wrong values
   - If "NOT_AUTHENTICATED" → anonymous auth not working → check Supabase auth settings
4. **The error message now shows a hint of the actual error** (e.g., "Hmm, something went wrong — new row violates row-level security policy. Please try again") — report this exact text when asking for help

---

## 12. Environment Variables

All configuration lives in one file: **`js/config.js`**

```javascript
window.APP_CONFIG = {
  SUPABASE_URL: 'https://YOUR-PROJECT.supabase.co',  // Your Supabase project URL
  SUPABASE_ANON_KEY: 'sb_publishable_...',              // Your Supabase anon/public key
  APP_VERSION: '2.4.0',                                 // Displayed in Settings
  DEBUG: false                                          // Set true for console logs
};
```

| Variable | Purpose | Public/Secret | Where to find it |
|---|---|---|---|
| `SUPABASE_URL` | Your Supabase project URL | **Public** (safe to expose) | Supabase Dashboard → Settings → API → Project URL |
| `SUPABASE_ANON_KEY` | Your Supabase anon key | **Public** (safe to expose) | Supabase Dashboard → Settings → API → anon/public key |
| `APP_VERSION` | Version number shown in Settings | Public | Set to current version |
| `DEBUG` | Enables verbose console logging | Public | Set `true` for troubleshooting |

> ⚠️ **NEVER** put the `service_role` key in this file. The anon key is safe because RLS protects all data. The service_role key bypasses RLS and would expose all user data.

### Configuring on a new computer

1. Clone or download the project
2. Open `js/config.js`
3. Verify the `SUPABASE_URL` and `SUPABASE_ANON_KEY` match your Supabase project
4. Open `index.html` in a browser — the app should work

---

## 13. Running the Website Locally

### Option 1: Just open the file

1. Navigate to the project folder
2. Double-click `index.html`
3. The website opens in your browser
4. Works for most features (Supabase requires HTTPS for auth, so some features may not work on `file://`)

### Option 2: Use a static server (recommended)

**Using Python:**
```bash
cd /path/to/Happy-Birthday
python3 -m http.server 8000
# Open http://localhost:8000 in your browser
```

**Using Node.js (if installed):**
```bash
npx serve .
# Open http://localhost:3000 in your browser
```

**Using VS Code:**
1. Install the "Live Server" extension
2. Right-click `index.html` → "Open with Live Server"

### Testing the production build

There's no build step — the production files ARE the source files. To test:
1. Open the website locally (using one of the methods above)
2. Go through the complete user flow: landing → onboarding → all 9 steps → home → all features
3. Check that Supabase connection works (create profile, check pairing code appears)
4. Check the browser console for errors

---

## 14. Deployment

### Where the website is hosted

- **GitHub Pages** (most likely) — static site hosting from a GitHub repository
- The `.nojekyll` file prevents GitHub Pages from processing with Jekyll
- The `404.html` file provides SPA routing fallback

### How to deploy

1. Commit all changes to the repository
2. Push to GitHub
3. GitHub Pages auto-deploys from the configured branch (usually `main`)
4. Wait 1-2 minutes for deployment
5. Visit the website URL to verify

### How to verify deployment

1. Open the deployed website
2. Check the landing page loads
3. Open browser DevTools → Console → look for errors
4. Test the full onboarding flow (Step 1 → Step 9 → completion)
5. Test pairing (two phones with a code)
6. Test chat (send a message, verify it appears on both phones)

### How to roll back

1. Go to the GitHub repository
2. View the commit history
3. Revert the problematic commit(s)
4. Push → GitHub Pages re-deploys automatically

---

## 15. Making Future Changes

### Recommended workflow

1. **Understand** the requested change
2. **Identify** affected files (use the project structure above)
3. **Check** if the database is affected (does the change add/modify tables or columns?)
4. **Check** if Supabase is affected (RLS policies, RPC functions, realtime)
5. **Implement** the change
6. **Test locally** — open `index.html` or use a local server
7. **Test the affected user flow** — go through every step that could be impacted
8. **Test the database** if applicable — create/update/delete operations
9. **Test authentication** if applicable — sign in, sign out, pairing
10. **Deploy** — push to GitHub
11. **Verify production** — test the live website
12. **Update this file** (`INSTRUCTION_FOR_ADMIN.md`) — document what changed
13. **Update the Change Log** at the bottom of this file

---

## 16. Common Errors and Troubleshooting

### Login / Authentication Problems

| Problem | Cause | Solution | Verification |
|---|---|---|---|
| "We couldn't create your little identity" | Anonymous sign-in is disabled | Dashboard → Authentication → Providers → enable "Anonymous sign-ins" | Try onboarding again |
| "Your session expired" | Token expired, no refresh | Reload the page | Should auto-restore session |
| User UUID changes on every visit | localStorage cleared (incognito mode) | Use regular browsing mode | UUID should persist across refreshes |

### Supabase Connection Problems

| Problem | Cause | Solution | Verification |
|---|---|---|---|
| "Cloud connection isn't set up" | `js/config.js` has wrong values | Check `SUPABASE_URL` and `SUPABASE_ANON_KEY` | Open browser console, look for connection errors |
| Red "You're not connected" banner | Network issue or Supabase down | Check internet connection; check https://status.supabase.com | Banner should turn green |
| App works locally but not deployed | Wrong URL in config or CORS issue | Check Supabase dashboard → Settings → API → check URL | Test deployed site |

### Permission Denied / RLS Errors

| Problem | Cause | Solution | Verification |
|---|---|---|---|
| `42501: permission denied` | SQL tried to access `storage` schema (requires superuser) | Run the new `supabase.sql` (no storage references) | SQL should execute without errors |
| RLS blocks profile creation | RLS policy missing or incorrect | Re-run `supabase.sql` to recreate policies | Can create profile during onboarding |
| Can't see partner's data | Partner not linked (`partner_id` is null) | Re-pair using a fresh code | Both phones show as connected |

### SQL Errors

| Problem | Cause | Solution | Verification |
|---|---|---|---|
| `42501: permission denied for schema storage` | Old SQL tried to create storage functions | Run the new `supabase.sql` (no storage references) | SQL executes without errors |
| `42P01: relation "profiles" does not exist` | SQL never ran or failed mid-execution | Run `supabase.sql` in full | Table appears in Table Editor |
| `23505: duplicate key value` | Pairing code collision | This is auto-retried with a new code; shouldn't happen to users | Onboarding completes normally |
| `PGRST205: Could not find the table` | Table doesn't exist | Run `supabase.sql` | Table appears in Table Editor |

### Data Not Appearing

| Problem | Cause | Solution | Verification |
|---|---|---|---|
| Profile not in Supabase | `ensureProfile()` failed during onboarding | Check browser console for errors; re-run onboarding | Profile row appears in Table Editor |
| Chat messages missing | `messages` table doesn't exist | Run `supabase.sql` (creates messages table) | Send a test message, verify it persists |
| Memories not saving | localStorage full or cleared | Check browser storage settings | Memories appear after page refresh |

### Step 9 Vibe-Theme Error

| Problem | Cause | Solution | Verification |
|---|---|---|---|
| "Hmm, something went wrong" on Step 9 | SQL never created `profiles` table OR anonymous auth not enabled | 1. Run `supabase.sql` 2. Enable anonymous auth 3. Clear browser storage 4. Retry onboarding | Complete onboarding Step 1→9 without error |
| Theme cards not showing | JavaScript error in `data.js` | Check browser console; verify `HB.THEMES` exists | Theme cards appear on Step 9 |
| Theme selection not saving | `finalize()` failed before save | Check console for auth/DB errors; ensure backend is configured | Theme applies after onboarding |

### Website Not Loading

| Problem | Cause | Solution | Verification |
|---|---|---|---|
| Blank page | JavaScript error preventing boot | Open browser console; check for syntax errors | Page loads with landing page |
| 404 error on GitHub Pages | SPA routing issue | Check `404.html` exists and redirects correctly | Navigation works after refresh |
| Styles not loading | CSS file path wrong | Check `css/styles.css` exists; verify HTML `<link>` tag | Website looks correct |

### Deployment Problems

| Problem | Cause | Solution | Verification |
|---|---|---|---|
| Changes not appearing | Browser cache | Hard refresh (Cmd+Shift+R / Ctrl+Shift+R) or clear cache | New version appears |
| GitHub Pages 404 | Wrong branch configured | Check GitHub Pages settings → correct branch | Site loads at the URL |
| Supabase doesn't work on deployed site | Wrong URL in config or missing CORS | Check Supabase dashboard settings | Auth and data work on live site |

---

## 17. Security Rules

### Never do these

- ❌ Never put the **service_role key** in frontend code or this file
- ❌ Never commit secrets (API keys, passwords) to GitHub
- ❌ Never disable RLS without understanding the consequences
- ❌ Never delete production tables without verification
- ❌ Never run destructive SQL (`DELETE FROM`, `DROP TABLE`) without backing up first
- ❌ Never change authentication settings without testing
- ❌ Never expose user data to unauthorized parties

### Always do these

- ✅ Use the **anon/public key** only (safe with proper RLS)
- ✅ Test SQL changes in a development Supabase project first
- ✅ Back up important data before major database changes
- ✅ Use `IF NOT EXISTS` and `IF EXISTS` in SQL for safety
- ✅ Verify RLS policies after schema changes
- ✅ Check the browser console after deployment
- ✅ Test the complete user flow after any change

---

## 18. Backup and Recovery

### How to back up the database

1. Open Supabase Dashboard → SQL Editor
2. Run: `SELECT * FROM profiles;` → copy the results
3. Run: `SELECT * FROM messages;` → copy the results
4. Save both exports as `.csv` files

### Before major database changes

1. Export all data from the `profiles` and `messages` tables
2. Note the current SQL file contents (commit to git)
3. Make the changes
4. Verify data is intact after changes
5. If something goes wrong → re-run the previous SQL file to restore

### If a table is accidentally modified

1. Don't panic — the SQL file has the complete schema
2. Re-run `supabase.sql` to recreate tables and policies
3. If data was deleted and you have a backup → re-insert the data
4. If no backup → the data is lost (there's no undo in SQL)

---

## 19. Admin Panel

The admin page is hidden from the public website. It's at:

```
https://YOUR-DOMAIN/admin/
```

### How it works

1. The admin page has its own login (email + password via Supabase Auth)
2. The owner account UUID: `e65fabbb-cc49-48c6-adc0-ef1d59f41896`
3. The `admin_get_insights()` function checks the caller's UUID against this owner UUID
4. Only the owner account gets data — everyone else gets a hard deny
5. The admin session is stored separately (doesn't affect the public app)

### What the admin page shows

- Total registered users
- Total connected couples
- Per-user details: name, age, pairing code, partner, connection status, join date, last active
- CSV export
- Auto-refresh every 20 seconds

### How to change the owner UUID

Run in Supabase SQL Editor:
```sql
-- First, find the new owner's UUID from Authentication → Users
-- Then update the admin_get_insights function:
CREATE OR REPLACE FUNCTION public.admin_get_insights()
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE result json;
BEGIN
  IF auth.uid() <> 'NEW-OWNER-UUID'::uuid THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  -- ... (rest of function unchanged)
END $$;
```

---

## 20. Change Log

| Date | Change | Files Affected | Database Changes | Reason |
|---|---|---|---|---|
| 17 Aug 2026 | Rewrote `supabase.sql` — removed all `storage` schema references, made all statements idempotent, switched chat images to base64 data URLs | `supabase.sql` (new), deleted `supabase/schema.sql` | New `supabase.sql` must be run in SQL Editor | Old SQL failed with `42501: permission denied for schema storage`, preventing all database tables from being created |
| 17 Aug 2026 | Fixed Step 9 onboarding error — added `.catch()` to `signInAnonymously()`, improved error messages | `js/onboarding.js` | None | Missing error handler caused unhandled promise rejection |
| 17 Aug 2026 | Added comprehensive diagnostic logging to `setupAccount()`, `ensureProfile()`, and `signInAnonymously()` — shows actual Supabase error in browser console | `js/onboarding.js`, `js/services/relationship.js`, `js/services/auth.js` | None | Generic "Hmm, something went wrong" made debugging impossible; now the actual error is logged with full details |
| 17 Aug 2026 | Added 15-second safety timeout in `setupAccount()` — prevents loading state from hanging forever | `js/onboarding.js` | None | If backend setup hangs, user now gets a retryable error instead of infinite loading |
| 17 Aug 2026 | Improved `friendly()` error handler — unknown errors now show a hint of the actual error message instead of generic text | `js/onboarding.js` | None | Helps users report the actual problem instead of just "something went wrong" |
| 17 Aug 2026 | Rewrote chat image handling — use base64 data URLs instead of storage bucket | `js/services/chat.js`, `js/couplechat.js`, `js/services/db.js` | `messages.media_path` now stores base64 data URLs instead of storage paths | Removed dependency on `relationship-media` storage bucket |
| 17 Aug 2026 | Removed navigation animation delay (170ms) for faster page rendering | `js/core.js` | None | Performance improvement |
| 17 Aug 2026 | Reduced various timeouts for faster UX (Supabase readiness: 4s→2s, welcome toast: 900ms→500ms, ping: 2s→1s, periodic ping: 15s→30s) | `index.html`, `js/app.js`, `js/services/net.js` | None | Performance improvement |
| 17 Aug 2026 | Added navigation lock — waiting state blocks all tabs except `/`, `/home`, `/settings`, `/partner` | `js/core.js` | None | Prevents confused navigation while waiting for partner |
| 17 Aug 2026 | Rewrote memories page — two-column layout (one per person), sticky notes, polaroid cards, responsive modal | `js/memories.js`, `css/styles.css` | None | Better UX for two-person memories |
| 17 Aug 2026 | Rewrote settings erase — full state reset, localStorage purge, Supabase signout, reload | `js/settings.js` | `delete_my_data` RPC clears profile + unlinks partner | "Erase Everything" now properly resets all state |
| 17 Aug 2026 | Created `INSTRUCTION_FOR_ADMIN.md` | `INSTRUCTION_FOR_ADMIN.md` (new) | None | Complete admin documentation |
