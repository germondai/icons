import { readdir } from "node:fs/promises"
import { join } from "node:path"

const ASSETS_DIR = join(process.cwd(), "assets")

export type VariantName = "original" | "plain" | "line" | "mono"
export const ALL_VARIANTS: VariantName[] = ["original", "plain", "line", "mono"]
export const DEFAULT_VARIANTS: VariantName[] = ["original", "plain", "line", "mono"]

export interface AssetEntry {
  slug: string
  variant: VariantName
  viewBox: string
  content: string
  fullBleed: boolean // rect covering ≥90% of viewBox (e.g. typescript, css3)
}

// slug → variant → entry
const store = new Map<string, Map<VariantName, AssetEntry>>()
let slugList: string[] = []

const parseSvg = (
  raw: string,
  variant: VariantName,
  slug: string,
): { viewBox: string; content: string; fullBleed: boolean } => {
  const viewBox = raw.match(/viewBox="([^"]+)"/)?.[1] ?? "0 0 24 24"

  // Capture fill from root <svg> before stripping it (gen-originals.ts injects fill there)
  const rootFill = raw.match(/<svg\b[^>]*\sfill="((?!none)[^"]+)"/i)?.[1]

  let content = raw
    .replace(/<\?xml[^>]*\?>\s*/g, "")
    .replace(/<!DOCTYPE[^>]*>\s*/g, "")
    .replace(/<svg[^>]*>\s*/, "")
    .replace(/\s*<\/svg>\s*$/, "")
    .replace(/<title>[^<]*<\/title>\s*/g, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>\s*/gi, "")
    .replace(/xlink:href/g, "href")
    .replace(/\s*xmlns(?::[a-z]+)?="[^"]*"/g, "")
    .trim()

  // Namespace IDs to prevent conflicts when multiple icons are combined in one SVG document.
  // SVGO minifies IDs to short names (a, b, c…) — without prefixing, two icons sharing id="a" would collide.
  const hasIds = /\bid="/.test(content)
  if (hasIds) {
    const pfx = slug.replace(/[^a-z0-9]/gi, "")
    content = content
      .replace(/\bid="([^"]+)"/g, `id="${pfx}-$1"`)
      .replace(/\burl\(#([^)]+)\)/g, `url(#${pfx}-$1)`)
      .replace(/\bhref="#([^"]+)"/g, `href="#${pfx}-$1"`)
  }

  // Propagate the root fill onto shape elements that have no explicit fill
  if (rootFill && variant !== "mono") {
    content = content.replace(
      /<(path|circle|rect|ellipse|polygon|polyline)\b(?![^>]*\bfill\s*=)/gi,
      `<$1 fill="${rootFill}"`,
    )
  }

  if (variant === "mono") {
    content = content
      .replace(/\s+fill="(?!none)[^"]*"/gi, ' fill="currentColor"')
      .replace(/fill:\s*(?!none)[^;}"]+/gi, "fill:currentColor")
  }

  let fullBleed = false
  const vbParts = viewBox.trim().split(/\s+/)
  const vw = parseFloat(vbParts[2] ?? "0")
  const vh = parseFloat(vbParts[3] ?? "0")

  if (vw > 0 && vh > 0) {
    const rectRe = /<rect([^>]*)(?:\/>|>)/gi
    let match = rectRe.exec(content)
    while (match !== null) {
      const attrs = match[1] ?? ""
      const hasFill = /fill=/i.test(attrs) && !/fill="none"/i.test(attrs)
      if (hasFill) {
        const dim = (key: string, ref: number) => {
          const v = attrs.match(new RegExp(`\\b${key}="([^"]+)"`))?.[1] ?? "0"
          return v.endsWith("%") ? (parseFloat(v) / 100) * ref : parseFloat(v)
        }
        if (dim("width", vw) >= vw * 0.9 && dim("height", vh) >= vh * 0.9) {
          fullBleed = true
          break
        }
      }
      match = rectRe.exec(content)
    }
  }

  return { viewBox, content, fullBleed }
}

export const loadAssets = async (): Promise<void> => {
  const entries = await readdir(ASSETS_DIR)

  await Promise.all(
    entries.map(async (slug) => {
      const dir = join(ASSETS_DIR, slug)
      let files: string[]
      try {
        files = await readdir(dir)
      } catch {
        return
      }

      const variantMap = new Map<VariantName, AssetEntry>()
      await Promise.all(
        ALL_VARIANTS.map(async (variant) => {
          const filename = `${variant}.svg`
          if (!files.includes(filename)) return
          const raw = await Bun.file(join(dir, filename)).text()
          const { viewBox, content, fullBleed } = parseSvg(raw, variant, slug)
          variantMap.set(variant, { slug, variant, viewBox, content, fullBleed })
        }),
      )

      if (variantMap.size > 0) store.set(slug, variantMap)
    }),
  )

  slugList = [...store.keys()].sort()
  const total = [...store.values()].reduce((s, m) => s + m.size, 0)
  console.log(`Loaded ${store.size} icons (${total} variants total)`)
}

export const resolveAsset = (slug: string, priority: VariantName[]): AssetEntry | null => {
  const variants = store.get(slug)
  if (!variants) return null
  for (const v of priority) {
    const entry = variants.get(v)
    if (entry) return entry
  }
  return null
}

export const getVariants = (slug: string): VariantName[] => [...(store.get(slug)?.keys() ?? [])]

export const listSlugs = (): string[] => slugList

export const isFullBleed = (slug: string): boolean => {
  const variants = store.get(slug)
  return variants ? [...variants.values()].some((e) => e.fullBleed) : false
}
