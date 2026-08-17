# Our Little World ♡ — Happy Birthday

A cozy, romantic little world for two hearts — a private app built for **two phones / two users / one shared relationship**.

Built with vanilla JavaScript (no build step, no frameworks) + [Supabase](https://supabase.com) for auth, database, and realtime sync.

## What's inside

- 🐻 **Animated companion characters** — hand-built, animated SVG characters (3D-inspired gradients, CSS-driven poses, `prefers-reduced-motion` friendly) that greet you, celebrate with you, and wait for your person.
- 💬 **Real-time couple chat** — text + photos (base64 data URLs, no storage bucket needed), live presence dot, unread badges.
- 📷 **Chat Info** — every photo and shared link in one place, with a lightbox.
- 🎲 **Daily Bond Quiz** — 5 questions a day, deterministic per couple + date, answered independently on both phones.
- 🔗 **Pairing — no email or password.** Each phone silently gets a private anonymous identity, and a `LOVE-XXXXX` code pairs them. No login screens anywhere.
- 🎵 **Romantic background music** — synthesized (no audio files), starts OFF; tap to hear soft, dreamy chords.
- ✨ AI companion chat, love notes, two-column memories gallery, daily question, date ideas, love timers, themes, settings.

## Project structure

```
index.html              ← Entry point (single HTML page)
supabase.sql            ← DATABASE SETUP — run in Supabase SQL Editor
js/
  config.js             ← Supabase URL + anon key (public) + APP_VERSION
  supabase.js           ← Boots Supabase client, restores session
  core.js               ← State, router, nav, toasts, modal, music, particles
  data.js               ← Themes, vibes, relationships, questions
  services/
    db.js               ← Supabase client wrapper + realtime
    auth.js             ← Anonymous authentication
    relationship.js     ← Pairing, profiles, connection state
    chat.js             ← Chat messages (send/load/subscribe)
    presence.js         ← Online status + typing indicators
    quiz.js             ← Quiz DB queries
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

2. **Run the schema.** In the Supabase dashboard → SQL Editor, paste the entire contents of `supabase.sql` and run it. It creates:
   - Tables: `profiles`, `messages`
   - RLS policies (strict two-person access)
   - RPC functions: `connect_with_partner`, `delete_my_data`, `is_couple_pair`, `admin_get_insights`
   - Realtime publications for `profiles` and `messages`

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

1. Person A opens the app → *Create Our Space* → answers the 9-step wizard → their phone quietly signs in anonymously and a **pairing code** (`LOVE-XXXXX`) appears with a copy button.
2. Person A shares that code.
3. Person B opens the app → *I already have our space* → enters the code → paired instantly.
4. Now both phones share the same chat, quiz, photos and relationship details in real time.

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
- The partner's age is private — never synced or shown to the other device.
- Music always starts muted. Tap to toggle.
- See `INSTRUCTION_FOR_ADMIN.md` for the complete admin & developer manual.

## Creator

- Instagram: https://www.instagram.com/_ar.sharma/
- LinkedIn: https://www.linkedin.com/in/a-amansharma/

---

© 2026 Rishi. All rights reserved.
