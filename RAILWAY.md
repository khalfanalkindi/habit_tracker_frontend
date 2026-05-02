# Railway (frontend only)

Use this repo as its **own** Railway service. The API lives in your **backend** repo / service.

## Variables

| Name | Purpose |
|------|--------|
| `NEXT_PUBLIC_API_URL` | Public backend base URL, e.g. `https://your-api.up.railway.app` — **no trailing slash**. Must be set **before** build; change → redeploy so Next bakes in the new value. |
| `NEXT_PUBLIC_APP_TOKEN` | **Same string** as backend `APP_TOKEN`. Sent as `Authorization: Bearer …` on every API call. |
| `NEXT_PUBLIC_API_KEY` | Optional **legacy** alias for the same value if you already created this variable; prefer `NEXT_PUBLIC_APP_TOKEN` for new projects. |

**Why login still fails after you set variables:** Next.js bakes `NEXT_PUBLIC_*` into the JS bundle at **`pnpm build`** inside Docker. The `Dockerfile` forwards these names into the build stage; you must **redeploy** (new build) after changing them. A trailing slash on the URL is fine — the app strips it.

## Service setup

1. New Railway service → deploy **this** GitHub repo.
2. If the repo root is only the frontend app, leave **Root Directory** empty; otherwise set it to the folder that contains this `Dockerfile`.
3. **Networking** → generate a public URL for the site.
4. Put that frontend URL into the backend’s `CORS_ORIGINS` and redeploy the backend.
