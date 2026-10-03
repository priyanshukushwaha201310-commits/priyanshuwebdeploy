# ThumbFetch — Free Video Thumbnail Fetcher

A responsive, free thumbnail-fetching website for **YouTube, Vimeo and Dailymotion**.

## What is included

- Frontend: plain HTML/CSS/JavaScript
- Backend: Vercel Node serverless function at `/api/thumbnail`
- No database
- No login
- No paid API
- No API key required
- Responsive mobile/desktop UI
- YouTube HD thumbnail with fallback
- Vimeo and Dailymotion oEmbed thumbnail lookup
- Host allow-list so the API is not a generic URL proxy

## Request flow

1. User pastes a supported video URL into `public/index.html`.
2. `public/app.js` sends a GET request to `/api/thumbnail?url=...`.
3. `api/thumbnail.js` validates the URL protocol and hostname.
4. For YouTube, the server extracts the video ID and builds the official image URL.
5. For Vimeo/Dailymotion, the server calls the platform's public oEmbed endpoint.
6. The backend returns JSON with platform, title and thumbnail URL.
7. The browser displays the image and provides an open/download link.

## Authentication and credentials

This application has **no application authentication** because thumbnail fetching does not require user accounts.

There are therefore no:
- passwords
- JWTs
- session cookies
- OAuth tokens
- client-side secrets
- paid API keys

The browser only calls the app's own public endpoint. The GitHub connection used to publish the source is separate from the deployed app and its credentials are not included in the frontend.

## Security notes

The backend accepts only HTTP/HTTPS URLs whose host is explicitly allow-listed for supported video platforms. It does not act as a generic fetch/proxy endpoint.

Do not put GitHub tokens, deployment tokens, private keys, or other secrets into frontend files.

## Run locally

Install Node.js 20+ and the Vercel CLI:

```bash
npm install
npx vercel dev
```

Then open the local URL printed by Vercel.

## Deploy

The project is ready for Vercel. Import this GitHub repository into a Vercel project and deploy with no environment variables required.

**Important:** GitHub Pages can host the static frontend but cannot execute the Node serverless function. For the complete frontend + backend version, use Vercel or another Node/serverless host.

## Repository

This project lives in the user's public GitHub repository:
`priyanshukushwaha201310-commits/priyanshuwebdeploy`
