# Railway (frontend only)

Use this repo as its **own** Railway service. The API lives in your **backend** repo / service.

## Variables

| Name | Purpose |
|------|--------|
| `NEXT_PUBLIC_API_URL` | Public backend base URL, e.g. `https://your-api.up.railway.app` — **no trailing slash**. Must be set **before** build; change → redeploy so Next bakes in the new value. |
| `NEXT_PUBLIC_APP_TOKEN` | **Same string** as backend `APP_TOKEN`. Sent as `Authorization: Bearer …` on every API call. |
| `NEXT_PUBLIC_API_KEY` | Optional **legacy** alias for the same value if you already created this variable; prefer `NEXT_PUBLIC_APP_TOKEN` for new projects. |

**Runtime config:** The app calls **`GET /api/runtime-config`**, which reads Railway’s `NEXT_PUBLIC_*` from the Node process at **request time** (so values are not lost to Next’s build-time inlining). A startup script may also write `public/runtime-env.json` as a fallback; `public` is `chown`’d so the `nextjs` user can update it.

## Service setup

1. New Railway service → deploy **this** GitHub repo.
2. If the repo root is only the frontend app, leave **Root Directory** empty; otherwise set it to the folder that contains this `Dockerfile`.
3. **Networking** → generate a public URL for the site.
4. Put that frontend URL into the backend’s `CORS_ORIGINS` and redeploy the backend.
