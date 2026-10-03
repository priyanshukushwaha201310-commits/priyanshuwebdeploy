# MarketHub — OLX-style Netlify Test Model

A Netlify-compatible marketplace prototype.

## Included
- Login/demo accounts
- Create and delete listings
- Search, category, price and location filters
- Sorting
- Favorites
- Listing details
- Buyer-to-seller demo chat
- Admin dashboard demo
- Responsive UI
- Netlify Functions health endpoint

## Deploy on Netlify
Set the Netlify **Base directory** to `olx-marketplace`, then deploy this folder/repository.

This version intentionally uses browser localStorage so it works immediately without a paid API or database. For a real public marketplace, replace storage/auth/chat with Supabase (database, Auth, Storage and Realtime), add moderation/rate limits, and keep secrets server-side.

Admin demo: sign in with `admin@markethub.test`; for the prototype, the role can be enabled by changing the user object in localStorage if needed.
