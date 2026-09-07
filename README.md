# Our Little World ♡ — Happy Birthday

A cozy, romantic little world for two hearts — a private app built for **two phones / two users / one shared relationship**.

Built with vanilla JavaScript (no build step, no frameworks) + [Supabase](https://supabase.com) for auth, database, and realtime sync.

## What's inside

- 🐻 **Animated companion characters** — hand-built, animated SVG characters (3D-inspired gradients, CSS-driven poses, `prefers-reduced-motion` friendly) that greet you, celebrate with you, and wait for your person.
- 💬 **Real-time couple chat** — text + photos (base64 data URLs, no storage bucket needed), live presence dot, unread badges.
- 📷 **Chat Info** — every photo and shared link in one place, with a lightbox.
- 🎲 **Daily Bond Quiz** — 5 questions a day, deterministic per couple + date, answered independently on both phones.
- 🔗 **Pairing — no email or password.** Each phone silently gets a private anonymous identity, and a single-use `LOVE-XXXXX` code pairs them. No login screens anywhere, and no duplicate relationships — one canonical record, two participants.
- 🎵 **Romantic background music** — synthesized (no audio files), starts OFF; tap to hear soft, dreamy chords.
- ✨ AI companion chat, love notes, two-column memories gallery, daily question, date ideas, love timers, themes, settings.

## Project structure

```
index.html              ← Entry point (single HTML page)
supabase/run-all.sql     ← DATABASE SETUP — run in Supabase SQL Editor
js/
  config.js             ← Supabase URL + anon key (public) + APP_VERSION
  supabase.js           ← Boots Supabase client, restores session
  core.js               ← State, router, nav, toasts, modal, music, particles
  data.js               ← Themes, vibes, relationships, questions
  services/
    db.js               ← Supabase client wrapper + realtime registry
    auth.js             ← Anonymous authentication
    relationship.js     ← ONE relationship + two participants (perspective,
                          create/join pairing, realtime)
    chat.js             ← Chat messages keyed by relationship_id
    shared.js           ← Love notes + memories (DB-backed, realtime)
    presence.js         ← Online status + typing indicators
    quiz.js             ← Daily quiz (both phones, result in real time)
    net.js              ← Connectivity detection
  landing.js            ← Hero + pairing code entry
  onboarding.js         ← 9-step wizard + account setup
  dashboard.js          ← Home dashboard
  couplechat.js         ← Real-time couple chat
  chat.js               ← AI companion chat
  ... (memories, notes, dates, settings, etc.)
  vendor/supabase.min.js ← Vendored supabase-js v2 (works offline)
admin/                  ← PRIVATE owner insights page (not linked in UI)
```

## Setup

1. **Create a Supabase project** at https://supabase.com (free tier is plenty).

2. **Run the schema.** In the Supabase dashboard → SQL Editor, paste the entire contents of `supabase/run-all.sql` and run it. It creates:
   - Tables: `relationships`, `profiles`, `messages`, `love_notes`, `memories`, `quiz_days`, `quiz_answers`
   - RLS policies (strict access for the two members only)
   - RPC functions: `create_relationship`, `complete_pairing`, `update_my_profile`, `update_relationship`, `update_my_avatar`, `update_partner_avatar`, `update_couple_dp`, `update_relationship_theme`, `delete_my_data`, `finalize_quiz`, `admin_get_insights`
   - Realtime publication for all seven tables

3. **Enable anonymous sign-ins.** Dashboard → Authentication → Providers → enable "Anonymous sign-ins".

4. **Verify your keys** in `js/config.js`:
   ```js
   window.APP_CONFIG = {
     SUPABASE_URL: 'https://zbnbuhpmctxocupunbdo.supabase.co',
     SUPABASE_ANON_KEY: 'sb_publishable_4oofZDsULDJNbb8ChWXJvA_ptd98GFM',
     APP_VERSION: '2.4.0',
     DEBUG: false
   };
   ```
   ⚠️ Only ever use the **anon (public)** key — never the service_role key.

5. **Deploy** as a static site. No build step:
   - **GitHub Pages:** push to your repo, enable Pages (`.nojekyll` prevents Jekyll mangling).
   - **Netlify / Vercel:** drag-and-drop or connect the repo.

## How the two-phone pairing works

1. Person A opens the app → *Create Our Space* → answers the 9-step wizard → their phone quietly signs in anonymously and creates **one canonical relationship record** with a fresh single-use **pairing code** (`LOVE-XXXXX`) and a copy button.
2. Person A shares that code.
3. Person B opens the app → *I already have our space* → enters the code → the pairing is claimed atomically in the database, Person B's profile joins the same relationship, and Person A's phone flips from *waiting* to *connected* in real time (no refresh).
4. Now both phones share the same chat, love notes, memories, quiz and shared relationship details — perspective (who is "you" vs "partner") is derived from the authenticated user id, never stored.

## Erase everything (fresh start)

Settings → *Erase all data & start fresh* deletes the relationship (both participants, all chat/notes/memories/quiz) via `delete_my_data`, signs out, clears the device, and returns to a clean landing page — all in-app, no page reload.

## Private owner insights (admin)

The admin page is at `https://YOUR-DOMAIN/admin/` — never linked in the UI. Protected by Supabase Auth + RLS: you sign in with the owner account, and only that account gets data. Shows user registrations, connection status, and last-active times with CSV export.

## Running locally

Open `index.html` in a browser, or use any static server:

```bash
# Python
python3 -m http.server 8000

# Node
npx serve .
```

## Notes

- Images in chat use base64 data URLs (no storage bucket required).
- The partner's age and name come from their own profile row — your person edits their own, you edit yours.
- Music always starts muted. Tap to toggle.
- See `INSTRUCTION_FOR_ADMIN.md` for the complete admin & developer manual.

## Creator

- Instagram: https://www.instagram.com/_ar.sharma/
- LinkedIn: https://www.linkedin.com/in/a-amansharma/

---

© 2026 Rishi. All rights reserved.
