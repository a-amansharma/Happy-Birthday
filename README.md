# Our Little World ♡ — Happy Birthday

A cozy, romantic little world for two hearts — a private app built for **two phones / two users / one shared relationship**.

Built with vanilla JavaScript (no build step, no frameworks) + [Supabase](https://supabase.com) for auth, database, realtime chat and private image storage.

## What's inside

- 🐻 **Animated companion characters** — hand-built, animated SVG characters (3D-inspired gradients, CSS-driven poses, `prefers-reduced-motion` friendly) that greet you, celebrate with you, and wait for your person. No names anywhere on screen — just the cute graphics.
- 💬 **Real-time couple chat** — text + photos (private signed URLs), live presence dot, unread badges.
- 📷 **Chat Info** — every photo and shared link in one place, with a lightbox.
- 🎲 **Daily Bond Quiz** — 5 questions a day, deterministic per couple + date, answered independently on both phones, match result computed in the database and revealed live to both devices.
- 🔗 **Pairing — no email or password.** Each phone silently gets a private anonymous identity, and a `LOVE-XXXXX` code pairs them. No login screens anywhere.
- 🎵 **Romantic background music** — synthesized (no audio files), starts OFF with a muted slant-cross icon; tap to hear soft, dreamy chords with a playing equalizer.
- ✨ Everything else from the original: AI companion chat, love notes, memories, daily question, date ideas, love timers, themes, settings.

## Project structure

```
js/
  config.js          ← your Supabase URL + anon key (public) + APP_VERSION
  supabase.js        ← loads @supabase/supabase-js from CDN, restores session
  core.js            ← state, router, nav, toasts, modal, music, particles
  dudu.js / dudu.css ← the character system (internal names only, never on screen)
  services/          ← db, auth (anonymous), relationship, chat, presence, quiz
  landing.js         ← hero + "I already have our space" pairing-code modal
  onboarding.js      ← wizard (no account step) + partner code
  dashboard.js       ← personalized home + connection status
  partner.js         ← /partner — codes, connection, bond
  couplechat.js      ← /chat — real-time couple chat
  chatinfo.js        ← /chatinfo — photos & shared links
  chat.js            ← /companion — the AI companion
  quiz.js            ← /quiz — Daily Bond Quiz
  ... (love notes, memories, dates, settings, creator, app)
supabase/schema.sql  ← full database schema, RLS, RPCs, storage, admin insights
admin/               ← PRIVATE owner insights page (see below)
```

## Setup

1. **Create a Supabase project** at https://supabase.com (free tier is plenty).

2. **Run the schema.** In the Supabase dashboard → SQL Editor, open `supabase/schema.sql` and run the whole file. It creates:
   - tables: `profiles`, `relationships`, `messages`, `daily_quizzes`, `quiz_answers`
   - Row Level Security on everything (only the two members of a relationship can read/write)
   - RPCs: `connect_with_partner`, `get_or_create_daily_quiz`, `submit_quiz_answers`, `delete_my_data`, `admin_get_insights`
   - the private `relationship-media` storage bucket + policies
   - realtime publication for `messages`, `relationships`, `profiles`, `daily_quizzes`, `quiz_answers`

3. **Enable Realtime.** Dashboard → Database → Realtime → ensure `public.messages`, `public.relationships`, `public.profiles`, `public.daily_quizzes`, `public.quiz_answers` are added to the publication (the schema adds them, but double-check).

4. **Add your keys** to `js/config.js` (already filled in for this project — verify it matches):
   ```js
   window.APP_CONFIG = {
     SUPABASE_URL: 'https://zbnbuhpmctxocupunbdo.supabase.co',
     SUPABASE_ANON_KEY: 'sb_publishable_4oofZDsULDJNbb8ChWXJvA_ptd98GFM',
     APP_VERSION: '2.1.0',
     DEBUG: false,
     configured: true
   };
   ```
   ⚠️ Only ever use the **anon (public)** key — never the service_role key.

   Then enable anonymous sign-ins (needed because there's no email/password):
   **Authentication → Providers → enable "Anonymous sign-ins".**

5. **Deploy** the folder as a static site. No build step:
   - **GitHub Pages:** push to your repo, enable Pages (the included `.nojekyll` prevents Jekyll mangling).
   - **Netlify / Vercel:** drag-and-drop or connect the repo.

## How the two-phone pairing works

1. Person A opens the app → *Create Our Space* → answers the wizard (no email/password) → their phone quietly signs in as an anonymous user and a **pairing code** (`LOVE-XXXXX`) is shown with a **copy icon**.
2. Person A shares that code.
3. Person B opens the app on *their* phone → *I already have our space* → enters the code → answers a few quick questions → **connected.**
4. Now both phones share the same chat, quiz, photos and relationship details in real time.

Both people are equal — there's no "owner" in the UI. The code owner's shared story/relationship settings are copied to the relationship at connection time, and either of you can update them from Settings.

## 🔐 Private owner insights (admin)

The **admin page is hidden from the public website** — it's never linked, never mentioned in the UI, and carries `noindex`. It lives at:

```
https://YOUR-SITE-DOMAIN/admin/
```

It's protected by **real Supabase Auth + RLS**, not a hidden URL or a browser-side secret:

1. You sign in on that page with **your own Supabase account** (the owner email `amanxrishi@gmail.com` + your password).
2. Behind the scenes, the database function `admin_get_insights()` is **security definer** and compares your session's user ID to the owner UID stored in `admin_settings.owner_uid` (already seeded to `e65fabbb-cc49-48c6-adc0-ef1d59f41896`).
3. Only that exact account gets the data — everyone else gets a hard deny, and the function isn't even callable by anonymous visitors. The owner session is kept in a separate storage key so signing in here never affects the public app.

It shows **who registered/logged in**: name, age, pairing code, partner/connection status, joined and last-active times — with CSV export and a live 20-second auto-refresh. Nothing about it is ever shown on the public website.

> To point it at a different owner later, run in Supabase SQL Editor:
> ```sql
> update public.admin_settings set value = '<NEW-OWNER-UID>'
> where key = 'owner_uid';
> ```
> The owner UID is their row in **Authentication → Users**.

## Notes

- `APP_VERSION` in `js/config.js` is the single version source (shown in Settings).
- Images are stored privately and shown via short-lived signed URLs (cached in memory). Max photo size: 8 MB (jpeg/png/webp/heic/heif).
- The partner's age is private — it's never synced or shown to the other device.
- Music always starts muted (slant-cross icon). Tap to toggle the romantic music + equalizer animation.
- `test/smoke.js` (`node test/smoke.js`) sanity-checks the core modules without a browser.

## Creator

- Instagram: https://www.instagram.com/_ar.sharma/
- LinkedIn: https://www.linkedin.com/in/a-amansharma/

---

# ☕ Buy Me a Coffee

[![☕ Buy Me a Coffee](https://img.shields.io/badge/☕%20Buy%20Me%20a%20Coffee-Support%20the%20Project-yellow?style=for-the-badge)](https://a-amansharma.github.io/Portfolio/images/my-qr.webp)

---

© 2026 Rishi. All rights reserved.

