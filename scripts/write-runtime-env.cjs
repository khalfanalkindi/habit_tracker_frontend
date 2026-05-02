/**
 * Runs before `node server.js` in production Docker.
 * Writes public/runtime-env.json from process.env so the browser can load real Railway values
 * even when Next did not inline NEXT_PUBLIC_* at build time.
 */
const fs = require("fs")
const path = require("path")

const root = process.cwd()
const pub = path.join(root, "public")

const base = String(process.env.NEXT_PUBLIC_API_URL ?? "")
  .trim()
  .replace(/\/$/, "")
const appToken = String(
  process.env.NEXT_PUBLIC_APP_TOKEN ?? process.env.NEXT_PUBLIC_API_KEY ?? "",
).trim()

const payload = {
  baseUrl: base,
  appToken,
  configured: Boolean(base && appToken),
}

try {
  fs.mkdirSync(pub, { recursive: true })
  fs.writeFileSync(path.join(pub, "runtime-env.json"), JSON.stringify(payload), "utf8")
} catch (err) {
  console.error("[write-runtime-env]", err instanceof Error ? err.message : err)
}
