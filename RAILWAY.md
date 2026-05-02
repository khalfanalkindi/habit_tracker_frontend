# Railway (frontend only)

Use this repo as its **own** Railway service. The API lives in your **backend** repo / service.

## Variables

| Name | Purpose |
|------|--------|
| `NEXT_PUBLIC_API_URL` | Public backend base URL, e.g. `https://your-api.up.railway.app` — **no trailing slash**. Must be set **before** build; change → redeploy so Next bakes in the new value. |
| `NEXT_PUBLIC_APP_TOKEN` | **Same string** as backend `APP_TOKEN`. Sent as `Authorization: Bearer …` on every API call. |
| `NEXT_PUBLIC_API_KEY` | Optional **legacy** alias for the same value if you already created this variable; prefer `NEXT_PUBLIC_APP_TOKEN` for new projects. |

**Runtime config:** Even when the Next bundle was built without `NEXT_PUBLIC_*`, the container runs `write-runtime-env.cjs` before `server.js` and writes `public/runtime-env.json` from Railway’s environment. The browser loads that file on startup so your existing `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_API_KEY` variables work after a normal deploy.

## Service setup

1. New Railway service → deploy **this** GitHub repo.
2. If the repo root is only the frontend app, leave **Root Directory** empty; otherwise set it to the folder that contains this `Dockerfile`.
3. **Networking** → generate a public URL for the site.
4. Put that frontend URL into the backend’s `CORS_ORIGINS` and redeploy the backend.
