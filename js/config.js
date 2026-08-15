/* ============================================================
   CONFIG — single source of truth for app constants & backend
   ------------------------------------------------------------
   SUPABASE:
   Project: Happy-Birthday
   Backend: Supabase

   The publishable key is safe for frontend use when your
   database tables have proper Row Level Security (RLS) policies.

   NEVER put a Supabase secret/service_role key in this file.
   ============================================================ */

window.APP_CONFIG = {
  SUPABASE_URL: 'https://zbnbuhpmctxocupunbdo.supabase.co',

  SUPABASE_ANON_KEY:
    'sb_publishable_4oofZDsULDJNbb8ChWXJvA_ptd98GFM',

  APP_VERSION: '2.4.0',

  DEBUG: false
};

/* True once a real backend is configured */
window.APP_CONFIG.configured =
  !!window.APP_CONFIG.SUPABASE_URL &&
  window.APP_CONFIG.SUPABASE_URL.indexOf('YOUR-PROJECT') === -1 &&
  !!window.APP_CONFIG.SUPABASE_ANON_KEY &&
  window.APP_CONFIG.SUPABASE_ANON_KEY.indexOf('YOUR-ANON-KEY') === -1;