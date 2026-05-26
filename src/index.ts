import { cors } from "@elysiajs/cors"
import { Elysia } from "elysia"
import { env } from "~/config/env"
import { loadAssets } from "~/lib/assets"
import { iconsRoute } from "~/routes/icons"
import { metaRoute } from "~/routes/meta"
import pkg from "../package.json"

await loadAssets()

const app = new Elysia()
  .use(cors())
  .use(iconsRoute)
  .use(metaRoute)
  .get("/", () => ({
    name: pkg.name,
    version: pkg.version,
    description: pkg.description,
    endpoints: {
      "GET /icons": "Generate icon strip (SVG/PNG/WebP)",
      "GET /icons/all": "Browse all icons as a grid",
      "GET /icons/list": "List icon slugs - add ?detail=true for variant info",
      "GET /meta": "Overview of all configurable options",
      "GET /meta/themes": "Theme palette with hex values",
      "GET /meta/variants": "Available icon variant styles",
      "GET /meta/formats": "Supported output image formats",
    },
    params: {
      i: "Comma-separated icon specs - slug[:variant][:color][:full], fields auto-detected by shape",
      bg: "Background hex without # (e.g. 0d1117)",
      theme: "Theme name (dark|slate|zinc|neutral|stone|sky|emerald|rose|orange|violet|light|white)",
      variant: "Global variant priority, comma-separated (original|plain|line|mono) - first match wins",
      color: "Global hex fill for mono icons (e.g. ffffff) - auto-contrasts if omitted",
      format: "Output format: svg (default) | png | webp",
      scale: "Raster scale multiplier 1–4 (png/webp only, default 1)",
      perline: "Icons per row (default 15)",
      size: "Cell size px (default 48, range 16–128)",
      radius: "Corner radius ratio 0–1 (default 0.25)",
      pad: "Inner padding ratio 0–0.4 (default 0.12)",
    },
    examples: {
      "colored strip": "/icons?i=vuejs,react,bun&theme=dark",
      "mono white": "/icons?i=vuejs,react,bun&theme=dark&variant=mono&color=ffffff",
      "per-icon variant": "/icons?i=vuejs:mono,astro:plain,bun:line&theme=light",
      "per-icon color": "/icons?i=react:61dafb,vuejs:41b883,bun:fbf0d9&theme=dark",
      "force full-cell": "/icons?i=html5:full,css3:full,typescript:full&theme=dark&theme=transparent",
      "mix everything": "/icons?i=vuejs:original:3178c6:full,react:mono:ffffff,bun&theme=dark",
      "png 2x": "/icons?i=vuejs,react,bun&theme=dark&format=png&scale=2",
      "browse all": "/icons/all?theme=dark&perline=20",
      "list with detail": "/icons/list?detail=true",
    },
  }))
  .listen(env.PORT)

export type App = typeof app

console.log(`Icons API running at http://localhost:${env.PORT}`)
