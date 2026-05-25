import type { VariantName } from "~/lib/assets"
import { resolveAsset } from "~/lib/assets"
import { iconColor } from "~/lib/color"

export interface IconRequest {
  slug: string
  variant?: VariantName
  color?: string // hex without #, overrides global color
  bg?: string | null // hex, or null = transparent; overrides global bg
  radius?: number // 0–1 ratio, overrides global radius
  fullBleed?: boolean // skip padding, icon fills the full cell
}

export interface GenerateOptions {
  icons: IconRequest[]
  bg: string | null
  perline: number
  size: number
  radius: number
  pad: number
  variants: VariantName[]
  color?: string
}

export interface GenerateResult {
  svg: string
  found: string[]
  missing: string[]
}

const GAP = 11

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

export const generateSVG = (opts: GenerateOptions): GenerateResult => {
  const { bg, perline, size, radius, variants, color } = opts
  const r = Math.round(size * clamp(radius, 0, 1))
  const pad = Math.round(size * clamp(opts.pad, 0, 0.4))

  const found: string[] = []
  const missing: string[] = []
  const cells: string[] = []
  const usedRadii = new Set<number>()

  for (const req of opts.icons) {
    // per-icon variant first, global list as fallbacks
    const iconVariants = req.variant ? [req.variant, ...variants.filter((v) => v !== req.variant)] : variants
    const entry = resolveAsset(req.slug, iconVariants)

    if (!entry) {
      missing.push(req.slug)
      continue
    }
    found.push(req.slug)

    const idx = found.length - 1
    const x = (idx % perline) * (size + GAP)
    const y = Math.floor(idx / perline) * (size + GAP)

    const isFullBleed = req.fullBleed ?? entry.fullBleed
    const cellPad = isFullBleed ? 0 : pad
    const cellInner = size - 2 * cellPad
    const cellBg = req.bg !== undefined ? req.bg : bg
    const cellR = req.radius !== undefined ? Math.round(size * clamp(req.radius, 0, 1)) : r
    usedRadii.add(cellR)

    let fillAttr = ""
    let content = entry.content
    if (req.color) {
      fillAttr = ` fill="#${req.color}"`
      if (entry.variant !== "mono") {
        // strip hardcoded fills so the parent svg fill attr takes over (same trick as mono)
        content = content.replace(/\s+fill="(?!none)[^"]*"/gi, "").replace(/\bfill:\s*(?!none)[^;}"]*;?/gi, "")
      }
    } else if (entry.variant === "mono") {
      fillAttr = ` fill="#${color ?? iconColor(cellBg ?? "1e2030")}"`
    }

    cells.push(
      `<g transform="translate(${x},${y})">` +
        (cellBg ? `<rect x="0" y="0" width="${size}" height="${size}" rx="${r}" ry="${r}" fill="#${cellBg}"/>` : "") +
        `<g clip-path="url(#clip-${cellR})">` +
        `<svg x="${cellPad}" y="${cellPad}" width="${cellInner}" height="${cellInner}" ` +
        `viewBox="${entry.viewBox}" preserveAspectRatio="xMidYMid meet"${fillAttr}>` +
        content +
        `</svg></g></g>`,
    )
  }

  const cols = Math.min(found.length, perline)
  const rows = Math.ceil(found.length / perline)
  const totalW = cols * size + (cols - 1) * GAP
  const totalH = rows * size + (rows - 1) * GAP

  const clipDefs = [...usedRadii]
    .map(
      (cr) =>
        `<clipPath id="clip-${cr}"><rect x="0" y="0" width="${size}" height="${size}"` +
        (cr > 0 ? ` rx="${cr}" ry="${cr}"` : "") +
        `/></clipPath>`,
    )
    .join("")

  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${totalH}" viewBox="0 0 ${totalW} ${totalH}">`,
    `<defs>${clipDefs}</defs>`,
    ...cells,
    `</svg>`,
  ].join("\n")

  return { svg, found, missing }
}
