# Public deployment

The website is hosted by Vercel. The Express API and its JSON files need a
separate Node.js host with persistent disk storage; Vercel's static website
deployment does not run `server.js` or preserve local files.

## Deploy the API to Render

1. Push the project changes to the GitHub branch used for deployment.
2. In Render, create a new Blueprint and select this repository. Render will
   read `render.yaml` and create the API service with a persistent disk.
   The Starter service and persistent disk are paid Render resources.
3. In the Render service's environment settings, enter the real SMTP values
   from your private `.env` file for `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, and
   `SMTP_FROM`. Never commit `.env` or paste its credentials into source code.
4. Wait for `https://schoolmanagementsystem-api-20261002.onrender.com/api/health` to
   return `{"status":"ok"}`. If Render assigns a different service URL, update
   the destination in `vercel.json` to that exact URL.
5. Deploy the same branch to Vercel. Its `/api/*` rewrite forwards browser API
   requests to Render, keeping the frontend API paths same-origin.
6. Verify `https://www.schoolmanagementsystem.me/api/health`, then test account
   registration/login and student registration. New server-side JSON data is
   stored on Render's persistent disk at `/var/data`.

The local `data/` files are not deployed automatically. The deployed API starts
with its own data directory; create or register the needed accounts on the
deployed site after SMTP is configured.
