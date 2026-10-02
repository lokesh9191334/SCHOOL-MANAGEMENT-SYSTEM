# Deploy the website, API, and data on Vercel

Vercel serves the Vite build from `dist/` and rewrites `/api/*` to the
`api/index.js` function. That function restores the original API path before
passing the request to the Express app in `server.js`.
Production JSON data is stored in a **private Vercel Blob store**, not in the
function's temporary filesystem.

## Connect Vercel Blob

1. Push the app changes to the GitHub branch connected to the Vercel project.
2. In the Vercel project, open **Storage** and create a **private Blob** store.
3. Connect that store to this project and enable it for **Production** and
   **Preview**. Vercel provides the storage credentials to the server function.
4. Add these environment variables in the Vercel project (Production and
   Preview), then redeploy:
   - `AUTH_TOKEN_SECRET`: a newly generated random secret with at least 32
     characters.
   - `BOOTSTRAP_SUPER_ADMIN_EMAIL` and `BOOTSTRAP_SUPER_ADMIN_PASSWORD` (at
     least 12 characters): the initial owner login. On its first login request,
     the app creates this account in the private Blob store. Optionally set
     `BOOTSTRAP_SUPER_ADMIN_NAME`.
   - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, optionally `SMTP_FROM`
     and `SMTP_SECURE`: a real email provider is required because admin login
     sends an OTP and a rotating special key. Keep SMTP credentials in Vercel
     Environment Variables, never in client-prefixed variables.
5. Check `https://www.schoolmanagementsystem.me/api/health` returns
   `{"status":"ok"}`, then sign in with the bootstrap owner account and confirm
   a test student record appears after saving and reloading.

The Blob token is used only by the server and must never use a `VITE_` prefix
or be committed to Git. Vercel Blob has usage limits and may incur charges
according to the Vercel plan and current storage pricing.

The private Blob store starts empty. Existing local `data/*.json` files and
browser-only student records are not automatically copied into it.

The app detects a concurrent change to the same JSON file and returns an error
instead of silently overwriting newer data. This file-based store is intended
for light usage; it is not a transactional database.
