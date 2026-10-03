# ThumbFetch — Free Video Thumbnail Fetcher

A responsive, free thumbnail-fetching website for **YouTube, Vimeo and Dailymotion**.

## Netlify-ready

- Frontend: plain HTML/CSS/JavaScript in `public/`
- Backend: Netlify Function at `netlify/functions/thumbnail.js`
- Public API path: `/api/thumbnail`
- Netlify redirect maps `/api/thumbnail` to the serverless function
- No database
- No login
- No paid API
- No API key required
- YouTube HD thumbnail with fallback
- Vimeo and Dailymotion oEmbed thumbnail lookup
- Host allow-list so the API is not a generic URL proxy

## Request flow

1. User pastes a supported video URL into `public/index.html`.
2. `public/app.js` sends a GET request to `/api/thumbnail?url=...`.
3. `netlify.toml` internally routes that request to the Netlify Function.
4. `netlify/functions/thumbnail.js` validates the URL protocol and hostname.
5. For YouTube, the function extracts the video ID and builds the official image URL.
6. For Vimeo/Dailymotion, the function calls the platform's public oEmbed endpoint.
7. The function returns JSON with platform, title and thumbnail URL.
8. The browser displays the image and provides an open/download link.

## Authentication and credentials

This application has **no application authentication** because thumbnail fetching does not require user accounts.

There are therefore no:
- passwords
- JWTs
- session cookies
- OAuth tokens
- client-side secrets
- paid API keys

The browser only calls the app's own public endpoint. GitHub and Netlify deployment credentials are not included in frontend files.

## Security notes

The backend accepts only HTTP/HTTPS URLs whose host is explicitly allow-listed for supported video platforms. It does not act as a generic fetch/proxy endpoint.

Do not put GitHub tokens, Netlify tokens, private keys, or other secrets into frontend files.

## Deploy on Netlify

### Option 1 — GitHub import

1. Open Netlify and choose **Add new project → Import an existing project**.
2. Select this GitHub repository.
3. Netlify reads `netlify.toml` automatically.
4. Deploy. No environment variables are required.

### Option 2 — Netlify Drop

Because this project uses a Netlify Function, use Netlify's deploy workflow that packages Functions rather than treating the project as static-only. GitHub import is recommended for automatic redeploys.

## Local development

Install the Netlify CLI and run:

```bash
npm install -g netlify-cli
netlify dev
```

Then open the local URL printed by Netlify.

## Repository

`priyanshukushwaha201310-commits/priyanshuwebdeploy`


## Full-stack Supabase setup

This version adds optional accounts, per-user thumbnail history, and an admin dashboard.

### Required Netlify environment variables

Set these in **Netlify → Project configuration → Environment variables**:

- `SUPABASE_URL` — your Supabase project URL
- `SUPABASE_PUBLISHABLE_KEY` — your Supabase publishable/anon key
- `SUPABASE_SERVICE_ROLE_KEY` — your Supabase service-role key (**server only; never expose this to the browser**)

### Database setup

1. Open Supabase SQL Editor.
2. Run `supabase/schema.sql`.
3. Create a normal user through ThumbFetch.
4. Promote that account to admin using the SQL comment at the bottom of the schema.
5. Redeploy/reload the Netlify site.

### New API flow

- `/api/config` exposes only the public Supabase URL and publishable key.
- `/api/history` validates the Supabase access token and stores/reads/deletes only the signed-in user's history.
- `/api/admin` validates the access token, checks the server-side profile role, and uses the service-role key only inside the Netlify Function.

The service-role key is never sent to the client.

### Current full-stack features

- Email/password signup and login
- Session persistence through Supabase Auth
- Per-user thumbnail history
- Delete history items
- Admin dashboard
- User and recent-request statistics
- Existing YouTube/Vimeo/Dailymotion thumbnail API preserved
- No payment API or paid service required

