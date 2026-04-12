# AMK_HR - Backend scaffold

This adds a minimal Node.js + Express backend to serve the existing `index.html` and provide a tiny API.

Quick start (Windows):

1. Install Node.js (16.x or 18.x recommended).
2. In project root run:

```powershell
cd d:\AMK\AMK_HR
npm install
npm start
```

The server listens on port `3000` by default. Visit http://localhost:3000 to see the site.

API examples:

- Health: `GET /api/health`
- Echo: `POST /api/echo` with JSON body

Deploying worldwide (recommended quick options):

- Railway / Render / Heroku: Connect your GitHub repo, set the build to `npm install`, and start command `npm start`. They will provide a public URL.
- Temporary public URL: use `ngrok` to expose local port `3000`:

```powershell
npm install -g ngrok
ngrok http 3000
```

Notes:
- Ensure `index.html` is at the project root (it already is). Server serves files from the workspace root.
- After `npm install` the `node_modules` folder will be created; it's ignored by `.gitignore`.
