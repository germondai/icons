import Elysia, { t } from "elysia"
import { getVariants, isFullBleed, listSlugs } from "~/lib/assets"
import { fromCache, toCache } from "~/lib/cache"
import { isValidHex, resolveBackground } from "~/lib/color"
import type { ImageFormat } from "~/lib/convert"
import { IMAGE_FORMATS, mimeFor, toBuffer } from "~/lib/convert"
import { parseIconSpec, parseVariants } from "~/lib/parse"
import { checkLimit, clientIp } from "~/lib/ratelimit"
import type { IconRequest } from "~/lib/svg"
import { generateSVG } from "~/lib/svg"

const MAX_ICONS = 120
const DEFAULT_PERLINE = 15
const DEFAULT_SIZE = 48
const DEFAULT_RADIUS = 0.25
const DEFAULT_PAD = 0.12

const parseColor = (raw?: string) => (raw && isValidHex(raw) ? raw.toLowerCase() : undefined)
const parseFormat = (raw?: string): ImageFormat =>
  IMAGE_FORMATS.includes(raw as ImageFormat) ? (raw as ImageFormat) : "svg"

type AnyHeaders = { [k: string]: string | number | undefined }
type ServerLike = Parameters<typeof clientIp>[1]

const setImageHeaders = (headers: AnyHeaders, mime: string, hit: boolean, missing: string[]) => {
  headers["Content-Type"] = mime
  headers["Cache-Control"] = "public, max-age=3600"
  headers["X-Cache"] = hit ? "HIT" : "MISS"
  if (missing.length) headers["X-Missing-Icons"] = missing.join(",")
}

// only png/webp are expensive enough to warrant limiting
const rasterGuard = (
  format: ImageFormat,
  request: Request,
  server: ServerLike,
  set: { status?: unknown; headers: AnyHeaders },
) => {
  if (format !== "png" && format !== "webp") return
  const { ok, retryAfter } = checkLimit(`raster:${clientIp(request, server)}`, 20, 60_000)
  if (!ok) {
    set.status = 429
    set.headers["Retry-After"] = String(retryAfter)
    return `Raster rate limit exceeded - retry in ${retryAfter}s`
  }
}

export const iconsRoute = new Elysia({ prefix: "/icons" })

  .get(
    "/",
    async ({ query, set, request, server }) => {
      const icons: IconRequest[] = (query.i ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, MAX_ICONS)
        .map(parseIconSpec)

      if (!icons.length) {
        set.status = 400
        return "Missing ?i= - example: /icons?i=typescript,react,bun"
      }

      const bg = resolveBackground(query.bg, query.theme)
      const perline = Math.min(Math.max(1, query.perline ?? DEFAULT_PERLINE), MAX_ICONS)
      const size = Math.min(Math.max(16, query.size ?? DEFAULT_SIZE), 128)
      const radius = Math.min(Math.max(0, query.radius ?? DEFAULT_RADIUS), 1)
      const pad = Math.min(Math.max(0, query.pad ?? DEFAULT_PAD), 0.4)
      const variants = parseVariants(query.variant)
      const color = parseColor(query.color)
      const format = parseFormat(query.format)
      const scale = Math.min(Math.max(1, query.scale ?? 1), 4)

      const limited = rasterGuard(format, request, server, set)
      if (limited) return limited

      const key = JSON.stringify({ icons, bg, perline, size, radius, pad, variants, color, format, scale })
      const cached = fromCache<string | Buffer>(key)
      if (cached) {
        setImageHeaders(set.headers, mimeFor(format), true, [])
        return cached
      }

      const { svg, missing } = generateSVG({ icons, bg, perline, size, radius, pad, variants, color })
      const { data, mime } = await toBuffer(svg, format, scale)
      toCache(key, data)
      setImageHeaders(set.headers, mime, false, missing)
      return data
    },
    {
      query: t.Object({
        i: t.Optional(t.String()),
        bg: t.Optional(t.String()),
        theme: t.Optional(t.String()),
        variant: t.Optional(t.String()),
        color: t.Optional(t.String()),
        format: t.Optional(t.String()),
        perline: t.Optional(t.Numeric({ minimum: 1, maximum: 120 })),
        size: t.Optional(t.Numeric({ minimum: 16, maximum: 128 })),
        radius: t.Optional(t.Numeric({ minimum: 0, maximum: 1 })),
        pad: t.Optional(t.Numeric({ minimum: 0, maximum: 0.4 })),
        scale: t.Optional(t.Numeric({ minimum: 1, maximum: 4 })),
      }),
    },
  )

  .get(
    "/all",
    async ({ query, set, request, server }) => {
      const bg = resolveBackground(query.bg, query.theme)
      const perline = Math.min(Math.max(1, query.perline ?? 20), 50)
      const size = Math.min(Math.max(16, query.size ?? DEFAULT_SIZE), 128)
      const radius = Math.min(Math.max(0, query.radius ?? DEFAULT_RADIUS), 1)
      const pad = Math.min(Math.max(0, query.pad ?? DEFAULT_PAD), 0.4)
      const variants = parseVariants(query.variant)
      const color = parseColor(query.color)
      const fb = query.fullbleed === "true"
      const format = parseFormat(query.format)
      const scale = Math.min(Math.max(1, query.scale ?? 1), 4)

      const limited = rasterGuard(format, request, server, set)
      if (limited) return limited

      const icons: IconRequest[] = listSlugs().map((slug) => ({ slug, fullBleed: fb || undefined }))
      const { svg } = generateSVG({ icons, bg, perline, size, radius, pad, variants, color })
      const { data, mime } = await toBuffer(svg, format, scale)
      setImageHeaders(set.headers, mime, false, [])
      return data
    },
    {
      query: t.Object({
        bg: t.Optional(t.String()),
        theme: t.Optional(t.String()),
        variant: t.Optional(t.String()),
        color: t.Optional(t.String()),
        fullbleed: t.Optional(t.String()),
        format: t.Optional(t.String()),
        perline: t.Optional(t.Numeric({ minimum: 1, maximum: 50 })),
        size: t.Optional(t.Numeric({ minimum: 16, maximum: 128 })),
        radius: t.Optional(t.Numeric({ minimum: 0, maximum: 1 })),
        pad: t.Optional(t.Numeric({ minimum: 0, maximum: 0.4 })),
        scale: t.Optional(t.Numeric({ minimum: 1, maximum: 4 })),
      }),
    },
  )

  .get(
    "/list",
    ({ query }) => {
      let slugs = listSlugs()
      if (query.fullbleed === "true") slugs = slugs.filter(isFullBleed)
      const detail = query.detail === "true"
      return {
        total: slugs.length,
        icons: detail ? slugs.map((s) => ({ slug: s, variants: getVariants(s), fullBleed: isFullBleed(s) })) : slugs,
      }
    },
    {
      query: t.Object({
        detail: t.Optional(t.String()),
        fullbleed: t.Optional(t.String()),
      }),
    },
  )
