import type { VariantName } from "~/lib/assets"
import { ALL_VARIANTS, DEFAULT_VARIANTS } from "~/lib/assets"
import type { Theme } from "~/lib/color"
import { THEME_NAMES, THEMES } from "~/lib/color"
import type { IconRequest } from "~/lib/svg"

// parse "slug[:option...]" - options are auto-detected by shape:
//   original|plain|line|mono → variant
//   3–6 hex digits           → color
//   theme name               → bg from theme
//   bg<hex>                  → explicit bg hex
//   transparent              → transparent bg (null)
//   r<float>                 → corner radius 0–1
//   full | 1 | true          → fullBleed
export const parseIconSpec = (raw: string): IconRequest => {
  const parts = raw.split(":")
  const slug = (parts[0] as string).toLowerCase()
  let variant: VariantName | undefined
  let color: string | undefined
  let bg: string | null | undefined
  let themeBg: string | undefined
  let radius: number | undefined
  let fullBleed: boolean | undefined

  for (let i = 1; i < parts.length; i++) {
    const p = parts[i]?.toLowerCase()
    if (!p) continue
    if ((ALL_VARIANTS as string[]).includes(p)) variant = p as VariantName
    else if (p === "transparent") bg = null
    else if (/^bg[0-9a-f]{3,6}$/.test(p)) bg = p.slice(2)
    else if ((THEME_NAMES as string[]).includes(p)) themeBg = THEMES[p as Theme]
    else if (/^r\d*\.?\d+$/.test(p)) radius = Math.max(0, Math.min(1, parseFloat(p.slice(1))))
    else if (/^[0-9a-f]{3,6}$/.test(p)) color = p
    else if (p === "1" || p === "true" || p === "full") fullBleed = true
    else if (p === "0" || p === "false") fullBleed = false
  }

  // explicit bg (including null/transparent) beats theme
  return { slug, variant, color, bg: bg !== undefined ? bg : themeBg, radius, fullBleed }
}

// build variant priority list - user-specified first, rest appended as fallbacks
export const parseVariants = (raw?: string): VariantName[] => {
  if (!raw) return DEFAULT_VARIANTS
  const listed = raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s): s is VariantName => (ALL_VARIANTS as string[]).includes(s))
  if (!listed.length) return DEFAULT_VARIANTS
  return [...listed, ...ALL_VARIANTS.filter((v) => !listed.includes(v))]
}
