# MarketHub — Real Supabase + Netlify

This folder is a Netlify-compatible OLX-style marketplace connected to Supabase.

## Supabase setup
1. Create a Supabase project.
2. Run `supabase/schema.sql` in the Supabase SQL Editor.
3. Create Netlify environment variables:
   - `SUPABASE_URL`
   - `SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Keep the service-role key server-side only.
5. Deploy/redeploy on Netlify.

The database supports profiles, ads, favorites and participant-only realtime messages. Listing images use the `listing-images` Storage bucket.

## Important
The current browser prototype remains usable without Supabase; the Supabase schema is the backend foundation. The next client wiring should use Supabase Auth, Database, Storage and Realtime.