# Railway (frontend only)

Use this repo as its **own** Railway service. The API lives in your **backend** repo / service.

## Variables

| Name | Purpose |
|------|--------|
| `NEXT_PUBLIC_API_URL` | Public backend base URL, e.g. `https://your-api.up.railway.app` — **no trailing slash**. Must be set **before** build; change → redeploy so Next bakes in the new value. |

## Service setup

1. New Railway service → deploy **this** GitHub repo.
2. If the repo root is only the frontend app, leave **Root Directory** empty; otherwise set it to the folder that contains this `Dockerfile`.
3. **Networking** → generate a public URL for the site.
4. Put that frontend URL into the backend’s `CORS_ORIGINS` and redeploy the backend.
