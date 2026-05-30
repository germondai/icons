#!/usr/bin/env bun
// Generate mono.svg from original.svg (or plain.svg).
//
// Classification (ported from svg-mono-bulk.py):
//   box_icon  — one large background box + icon/text inside
//               → knockout: box=currentColor, icon shapes cut out via SVG <mask>
//   simple    — flat logo/shapes / gradients / complex illustrations
//               → all fills replaced with currentColor
//
// Box detection heuristics:
//   <rect>   — covers ≥ 80 % of the viewBox
//   <path>   — 4–20 commands, all axis-aligned/arc/Bezier/smooth-cubic (no diagonal L),
//              first M within 10 px of any viewBox edge, no transform= outside defs,
//              only the first colored shape in the SVG is a box candidate
//              (matches rounded-rect/circle backgrounds like Lightroom, AIHubMix, Premiere…)
//
// Usage:
//   bun scripts/gen-mono.ts              # fill in missing mono icons
//   bun scripts/gen-mono.ts react vue    # specific slugs only
//   bun scripts/gen-mono.ts --force      # regenerate everything
//   bun scripts/gen-mono.ts --dry-run    # preview without writing

import { readdir } from "node:fs/promises"
import { join } from "node:path"
import { parseArgs } from "node:util"

const ASSETS_DIR = join(process.cwd(), "assets")

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseViewBox(svg: string): { vw: number; vh: number } | null {
  const parts =
    svg
      .match(/viewBox="([^"]+)"/)?.[1]
      ?.trim()
      .split(/\s+/) ?? []
  const vw = parseFloat(parts[2] ?? "0")
  const vh = parseFloat(parts[3] ?? "0")
  if (vw > 0 && vh > 0) return { vw, vh }
  const pw = parseFloat(svg.match(/<svg[^>]*\bwidth="([\d.]+)"/)?.[1] ?? "0")
  const ph = parseFloat(svg.match(/<svg[^>]*\bheight="([\d.]+)"/)?.[1] ?? "0")
  return pw > 0 && ph > 0 ? { vw: pw, vh: ph } : null
}

function getFill(attrs: string): string {
  const m = attrs.match(/\bfill="([^"]*)"/)
  if (m) return m[1]
  const s = attrs.match(/\bstyle="[^"]*fill\s*:\s*([^;}"]+)/)
  return s ? s[1].trim() : ""
}

function isNone(f: string): boolean {
  const v = f.toLowerCase().trim()
  return v === "none" || v === "transparent" || v === ""
}
function isWhite(f: string): boolean {
  const v = f.toLowerCase().trim()
  return v === "#fff" || v === "#ffffff" || v === "white"
}
function isGradient(f: string): boolean {
  return f.startsWith("url(")
}

/** Strip <defs>…</defs> so regex scans skip clipPaths/masks/gradients */
function stripDefs(svg: string): string {
  return svg.replace(/<defs[\s\S]*?<\/defs>/gi, "")
}

// ── Box detection ─────────────────────────────────────────────────────────────

/**
 * True if path looks like a background box shape:
 *  - Only axis-aligned / arc / cubic-Bezier / smooth-cubic commands (H/V/A/C/S — no diagonal L)
 *  - 4–20 explicit commands (degenerate paths like mzm are rejected)
 *  - First M coordinate within 10 px of any viewBox edge
 *
 * Matches rounded-rect/circle backgrounds (Adobe, AIHubMix…) while rejecting
 * triangles / logo shapes that start near the edge (Vue.js, etc.).
 */
function isBoxPath(d: string, vw: number, vh: number): boolean {
  const cmds = d.match(/[MLHVCSQTAZmlhvcsqtaz]/g) ?? []
  if (cmds.length < 4 || cmds.length > 20) return false
  if (!cmds.every((c) => "MmHhVvAaZzCcSs".includes(c))) return false
  // Reject paths that use few command letters but many implicit repetitions (logo shapes
  // encode as one 'c' with dozens of parameter sets; real boxes have ~30–60 numeric tokens)
  const numCount = (d.match(/-?(?:\d+(?:\.\d*)?|\.\d+)/g) ?? []).length
  if (numCount > 60) return false
  // Reject ring/donut paths (multiple subpaths via M/m = outer circle minus inner = not a box)
  const mCount = cmds.filter((c) => c === "M" || c === "m").length
  if (mCount > 1) return false
  // Extract M coordinates handling adjacent decimals (e.g. M5.688.4 = x=5.688, y=0.4)
  const mPart = d.match(/^[Mm]\s*([^A-Za-z]+)/)?.[1] ?? ""
  const mNums = mPart.match(/-?(?:\d+(?:\.\d*)?|\.\d+)/g) ?? []
  if (mNums.length < 2) return false
  const mx = parseFloat(mNums[0])
  const my = parseFloat(mNums[1])
  const edge = 10
  return mx <= edge || mx >= vw - edge || my <= edge || my >= vh - edge
}

/** True if rect covers ≥ 80 % of the viewBox */
function isBoxRect(attrs: string, vw: number, vh: number): boolean {
  const dim = (k: string, ref: number) => {
    const v = attrs.match(new RegExp(`\\b${k}="([^"]+)"`))?.[1] ?? "0"
    return v.endsWith("%") ? (parseFloat(v) / 100) * ref : parseFloat(v)
  }
  return dim("width", vw) >= vw * 0.8 && dim("height", vh) >= vh * 0.8
}

// ── Shape types ───────────────────────────────────────────────────────────────

interface PathShp {
  kind: "path"
  d: string
  fill: string
}
interface RectShp {
  kind: "rect"
  x: string
  y: string
  w: string
  h: string
  rx?: string
  fill: string
}
interface CircleShp {
  kind: "circle"
  cx: string
  cy: string
  r: string
  fill: string
}
type Shp = PathShp | RectShp | CircleShp

function collectShapes(svg: string, vw: number, vh: number): Shp[] {
  const body = stripDefs(svg)
  const out: Shp[] = []

  for (const [, a] of body.matchAll(/<path([^>]*)(?:\/>|>[\s\S]*?<\/path>)/gi)) {
    const d = a.match(/\bd="([^"]+)"/)?.[1]
    if (d) out.push({ kind: "path", d, fill: getFill(a) })
  }

  for (const [, a] of body.matchAll(/<rect([^>]*)(?:\/>|>[\s\S]*?<\/rect>)/gi)) {
    const dim = (k: string, ref: number) => {
      const v = a.match(new RegExp(`\\b${k}="([^"]+)"`))?.[1] ?? "0"
      return v.endsWith("%") ? String((parseFloat(v) / 100) * ref) : v
    }
    out.push({
      kind: "rect",
      fill: getFill(a),
      x: a.match(/\bx="([^"]+)"/)?.[1] ?? "0",
      y: a.match(/\by="([^"]+)"/)?.[1] ?? "0",
      w: dim("width", vw),
      h: dim("height", vh),
      rx: a.match(/\brx="([^"]+)"/)?.[1],
    })
  }

  for (const [, a] of body.matchAll(/<(?:circle|ellipse)([^>]*)(?:\/>|>[\s\S]*?<\/(?:circle|ellipse)>)/gi)) {
    out.push({
      kind: "circle",
      fill: getFill(a),
      cx: a.match(/\bcx="([^"]+)"/)?.[1] ?? "0",
      cy: a.match(/\bcy="([^"]+)"/)?.[1] ?? "0",
      r: a.match(/\br="([^"]+)"/)?.[1] ?? "0",
    })
  }

  return out
}

// ── Knockout builder ──────────────────────────────────────────────────────────

function buildKnockout(svg: string, vw: number, vh: number): string | null {
  // Any transform= outside <defs> means paths use local coordinate systems —
  // extracting them without their transform context will misposition mask shapes.
  if (/\btransform\s*=/i.test(stripDefs(svg))) return null
  // Skip knockout for banner/wide logos (aspect ratio > 3.5:1) — no meaningful box shape
  const ratio = vw / vh
  if (ratio > 3.5 || ratio < 1 / 3.5) return null

  const shapes = collectShapes(svg, vw, vh)

  // Only the FIRST colored shape can be a background box.
  // If it isn't one, there's no box — don't scan further shapes to avoid false hits.
  let box: Shp | null = null
  for (const s of shapes) {
    if (isNone(s.fill) || isGradient(s.fill)) continue
    if (s.kind === "rect" && isBoxRect(`w="${s.w}" h="${s.h}"`, vw, vh)) box = s
    else if (s.kind === "path" && isBoxPath(s.d, vw, vh)) box = s
    break
  }
  if (!box) return null

  // All other shapes become black cutouts in the mask
  const maskItems: string[] = []
  for (const s of shapes) {
    if (s === box) continue
    const fv = s.fill.toLowerCase().trim()
    if (fv === "none" || fv === "transparent") continue // explicitly invisible — skip
    if (s.kind === "path") maskItems.push(`<path fill="black" d="${s.d}"/>`)
    else if (s.kind === "rect")
      maskItems.push(`<rect fill="black" x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}"/>`)
    else if (s.kind === "circle") maskItems.push(`<circle fill="black" cx="${s.cx}" cy="${s.cy}" r="${s.r}"/>`)
  }
  if (maskItems.length === 0) return null

  // Build box element with currentColor + mask
  let boxEl: string
  if (box.kind === "rect") {
    const rx = box.rx ? ` rx="${box.rx}"` : ""
    boxEl = `<rect fill="currentColor" mask="url(#ko)" x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}"${rx}/>`
  } else if (box.kind === "path") {
    boxEl = `<path fill="currentColor" mask="url(#ko)" d="${box.d}"/>`
  } else {
    boxEl = `<circle fill="currentColor" mask="url(#ko)" cx="${box.cx}" cy="${box.cy}" r="${box.r}"/>`
  }

  const svgOpen = svg.match(/(<svg[^>]*>)/)?.[1] ?? "<svg>"
  const clipDefs = [...svg.matchAll(/<clipPath[\s\S]*?<\/clipPath>/gi)].map((m) => m[0]).join("\n    ")
  const clipRef = svg.match(/<g\b[^>]*\bclip-path="([^"]+)"/)?.[1]
  const clipAttr = clipRef ? ` clip-path="${clipRef}"` : ""

  const mask = `<mask id="ko">\n      <rect width="${vw}" height="${vh}" fill="white"/>\n      ${maskItems.join("\n      ")}\n    </mask>`
  const defs = [clipDefs, mask].filter(Boolean).join("\n    ")

  return `${svgOpen}\n  <defs>\n    ${defs}\n  </defs>\n  <g${clipAttr}>\n    ${boxEl}\n  </g>\n</svg>`
}

// ── White-eraser knockout builder ─────────────────────────────────────────────
// Handles icons where white-fill paths are "eraser layers" painted on top of
// colored shapes to create visual holes (e.g. Chromium: 3 colored sectors +
// white circle separator + inner colored circle).
// White paths that appear AFTER the first colored path become mask cutouts.
// Colored paths AFTER the last white path are drawn outside the mask (overlay).

function buildWhiteKnockout(svg: string, vw: number, vh: number): string | null {
  const body = stripDefs(svg)

  // Collect self-closing shape elements in document order (the norm in SVG)
  const elems: { fill: string; raw: string; hasTransform: boolean }[] = []
  for (const [raw, a] of body.matchAll(/<(?:path|rect|circle|ellipse|polygon|polyline)([^>]*)\/>/gi))
    elems.push({ fill: getFill(a), raw, hasTransform: /\btransform\s*=/i.test(a) })

  // fill="" means no explicit fill attr — SVG default is black (colored), not transparent.
  // Only truly invisible if "none" or "transparent".
  const wkoInvisible = (f: string) => {
    const v = f.toLowerCase().trim()
    return v === "none" || v === "transparent"
  }

  // First shape that is neither none nor white (gradients count as colored)
  const firstColoredIdx = elems.findIndex((e) => !wkoInvisible(e.fill) && !isWhite(e.fill))
  if (firstColoredIdx === -1) return null

  // Last white (without transform) that appears AFTER firstColoredIdx
  // — white shapes with transforms can't be reliably placed in a mask
  let lastWhiteIdx = -1
  for (let i = firstColoredIdx + 1; i < elems.length; i++)
    if (isWhite(elems[i].fill) && !elems[i].hasTransform) lastWhiteIdx = i
  if (lastWhiteIdx === -1) return null

  // Reject if any MAIN (colored) shape uses a transform — would misposition it
  const mainHasTransform = elems.some(
    (e, i) => i >= firstColoredIdx && !isWhite(e.fill) && !isNone(e.fill) && i <= lastWhiteIdx && e.hasTransform,
  )
  if (mainHasTransform) return null

  // Replace fill= on an element string (leaves fill-rule, opacity etc. intact)
  const setFill = (raw: string, fill: string) =>
    /\bfill="/.test(raw)
      ? raw.replace(/\bfill="[^"]*"/, `fill="${fill}"`)
      : raw.replace(/^(<[a-z]+)/i, `$1 fill="${fill}"`)

  const mainEls: string[] = []
  const koEls: string[] = []
  const overEls: string[] = []

  for (let i = 0; i < elems.length; i++) {
    const { fill, raw, hasTransform } = elems[i]
    if (i < firstColoredIdx || wkoInvisible(fill)) continue
    // White with transform: skip (wrong position in mask), but don't add to main either
    if (isWhite(fill) && hasTransform) continue
    if (isWhite(fill) && i <= lastWhiteIdx) {
      koEls.push(setFill(raw, "black"))
      continue
    }
    if (!isWhite(fill)) {
      const el = setFill(raw, "currentColor")
      if (i <= lastWhiteIdx) mainEls.push(el)
      else overEls.push(el)
    }
  }

  if (koEls.length === 0) return null

  const svgOpen = svg.match(/(<svg[^>]*>)/)?.[1] ?? "<svg>"
  const clipDefs = [...svg.matchAll(/<clipPath[\s\S]*?<\/clipPath>/gi)].map((m) => m[0]).join("\n    ")
  const mask = `<mask id="wko">\n      <rect width="${vw}" height="${vh}" fill="white"/>\n      ${koEls.join("\n      ")}\n    </mask>`
  const defs = [clipDefs, mask].filter(Boolean).join("\n    ")

  let result = `${svgOpen}\n  <defs>\n    ${defs}\n  </defs>\n  <g fill="currentColor" mask="url(#wko)">\n    ${mainEls.join("\n    ")}\n  </g>`
  if (overEls.length) result += `\n  ${overEls.join("\n  ")}`
  return `${result}\n</svg>`
}

// ── Matrix-badge builder ──────────────────────────────────────────────────────
// Handles icons like LINE Pay: multiple <g transform="matrix(…)"> groups where
// some groups are text (no fill), one is a colored box, and some are white badge
// text (to knock out of the box).  Ported from svg-mono-bulk.ts.

interface MatrixGroupInfo {
  gAttrs: string
  inner: string
  firstFill: string
}

function scanMatrixGroups(svg: string): {
  textGroups: MatrixGroupInfo[]
  boxGroup: MatrixGroupInfo
  badgeGroups: MatrixGroupInfo[]
} | null {
  const body = stripDefs(svg)
  const groups: MatrixGroupInfo[] = []

  for (const [, attrs, inner] of body.matchAll(/<g\b([^>]*)>([\s\S]*?)<\/g>/gi)) {
    if (!attrs.includes("transform=")) continue
    if (!/matrix\(/i.test(attrs)) continue
    if (/<g\b/i.test(inner)) continue // skip groups with nested <g> (complex structure)
    const firstPathAttrs = inner.match(/<path([^>]*)(?:\/>|>)/i)?.[1] ?? ""
    groups.push({ gAttrs: attrs, inner, firstFill: getFill(firstPathAttrs) })
  }
  if (groups.length < 2) return null

  const textGroups: MatrixGroupInfo[] = []
  let boxGroup: MatrixGroupInfo | null = null
  const badgeGroups: MatrixGroupInfo[] = []

  for (const g of groups) {
    const fv = g.firstFill.toLowerCase().trim()
    if (isNone(fv)) {
      textGroups.push(g)
      continue
    }
    if (isWhite(fv)) {
      badgeGroups.push(g)
      continue
    }
    if (isGradient(fv)) continue
    if (!boxGroup) {
      boxGroup = g
    } else return null // multiple boxes → ambiguous
  }

  if (!textGroups.length || !boxGroup || !badgeGroups.length) return null
  return { textGroups, boxGroup, badgeGroups }
}

function buildMatrixBadge(svg: string, groups: NonNullable<ReturnType<typeof scanMatrixGroups>>): string {
  const vb = parseViewBox(svg)
  const vw = vb?.vw ?? 100
  const vh = vb?.vh ?? 100
  const svgOpen = svg.match(/(<svg[^>]*>)/)?.[1] ?? "<svg>"
  const clipDefs = [...svg.matchAll(/<clipPath[\s\S]*?<\/clipPath>/gi)].map((m) => m[0]).join("\n    ")

  // Mask: badge groups with all fills overridden to black
  const maskItems = groups.badgeGroups.map((g) => {
    const inner = g.inner
      .replace(/\sfill="[^"]*"/gi, ' fill="black"')
      .replace(/<(path|circle|rect|ellipse)\b(?![^>]*\bfill\s*=)/gi, '<$1 fill="black"')
    return `<g${g.gAttrs}>${inner}</g>`
  })
  const mask = `<mask id="badge_ko">\n      <rect width="${vw}" height="${vh}" fill="white"/>\n      ${maskItems.join("\n      ")}\n    </mask>`
  const defs = [clipDefs, mask].filter(Boolean).join("\n    ")

  // Text groups: add fill="currentColor" to paths that lack one
  const textStr = groups.textGroups
    .map((g) => {
      const inner = g.inner.replace(/<(path|circle|rect|ellipse)\b(?![^>]*\bfill\s*=)/gi, '<$1 fill="currentColor"')
      return `<g${g.gAttrs}>${inner}</g>`
    })
    .join("\n  ")

  // Box group: currentColor + knockout mask
  const boxInner = groups.boxGroup.inner
    .replace(/\sfill="(?!none)[^"]*"/gi, ' fill="currentColor"')
    .replace(/<(path|circle|rect|ellipse)\b(?![^>]*\bfill\s*=)/gi, '<$1 fill="currentColor"')
  const boxG = `<g mask="url(#badge_ko)">\n    <g${groups.boxGroup.gAttrs}>${boxInner}</g>\n  </g>`

  return `${svgOpen}\n  <defs>\n    ${defs}\n  </defs>\n  ${textStr}\n  ${boxG}\n</svg>`
}

// ── Simple mono (currentColor replacement) ────────────────────────────────────

function removeFullBleed(svg: string, vw: number, vh: number): string {
  // Remove full-bleed <rect> (solid or gradient fill covering ≥90% of both dimensions)
  // Also strip full-width gradient rects regardless of height (decorative overlay strips)
  svg = svg.replace(/<rect([^>]*)(?:\/>|>[\s\S]*?<\/rect>)/gi, (m, a) => {
    const hasFill = /fill=/i.test(a) && !/fill="none"/i.test(a)
    if (!hasFill) return m
    const dim = (k: string, ref: number) => {
      const v = a.match(new RegExp(`\\b${k}="([^"]+)"`))?.[1] ?? "0"
      return v.endsWith("%") ? (parseFloat(v) / 100) * ref : parseFloat(v)
    }
    const w = dim("width", vw),
      h = dim("height", vh)
    if (w >= vw * 0.9 && h >= vh * 0.9) return ""
    // Strip full-width gradient overlay strips (e.g. highlight/glow rects that span the canvas width)
    if (isGradient(getFill(a)) && w >= vw * 0.9) return ""
    return m
  })

  // Remove the first background-box <path> from the visible body only.
  // Operate on the non-defs portion so clipPath/mask internal paths are never touched
  // (a clipPath's rect would otherwise pass isBoxPath and be removed, emptying the clip).
  const defsStash: string[] = []
  let body = svg.replace(/<defs[\s\S]*?<\/defs>/gi, (m) => {
    defsStash.push(m)
    return `￾DEFS${defsStash.length - 1}￾`
  })
  let removedBox = false
  body = body.replace(/<path([^>]*)(?:\/>|>[\s\S]*?<\/path>)/gi, (m, a) => {
    if (removedBox) return m
    if (/\btransform\s*=/i.test(a)) return m
    const d = a.match(/\bd="([^"]+)"/)?.[1]
    if (!d) return m
    const fill = getFill(a)
    if (isNone(fill) || isGradient(fill)) return m
    if (isBoxPath(d, vw, vh)) {
      removedBox = true
      return ""
    }
    return m
  })
  svg = body.replace(/￾DEFS(\d+)￾/g, (_, i) => defsStash[Number(i)] ?? "")

  return svg
}

function simpleMono(svg: string): string {
  const vb = parseViewBox(svg)
  if (vb) svg = removeFullBleed(svg, vb.vw, vb.vh)

  // Strip white-fill elements only when colored shapes are also present (eraser-layer pattern).
  // If every visible shape is white/none, the whites ARE the design (white-on-dark icon) and
  // should be converted to currentColor rather than stripped into an empty SVG.
  const bodyForWhiteCheck = svg.replace(/<defs[\s\S]*?<\/defs>/gi, "")
  const hasColoredFills = [
    ...bodyForWhiteCheck.matchAll(/<(?:path|rect|circle|ellipse|polygon|polyline)([^>]*)\/>/gi),
  ].some(([, a]) => {
    const f = getFill(a)
    return f !== "" && !isNone(f) && !isWhite(f)
  })

  if (hasColoredFills) {
    const wfParts: string[] = []
    svg = svg.replace(/<defs[\s\S]*?<\/defs>/gi, (m) => {
      wfParts.push(m)
      return `￾WF${wfParts.length - 1}￾`
    })
    svg = svg.replace(/<(?:path|rect|circle|ellipse|polygon|polyline)([^>]*)\/>/gi, (m, a) =>
      isWhite(getFill(a)) ? "" : m,
    )
    svg = svg.replace(/￾WF(\d+)￾/g, (_, i) => wfParts[Number(i)] ?? "")
  }

  // Add fill="currentColor" to visible shape elements that have no explicit fill
  // (SVG default is black — those shapes must become currentColor too).
  // Exception: if the SVG root sets fill="none", children inherit that and should stay stroke-only.
  // Only process content outside <defs> so clipPath/mask shapes are untouched.
  const svgRootHasNoneFill = /<svg\b[^>]*\bfill\s*=\s*"none"/i.test(svg)
  const defsParts: string[] = []
  const withDefsStripped = svg.replace(/<defs[\s\S]*?<\/defs>/gi, (m) => {
    defsParts.push(m)
    return `￾DEFS${defsParts.length - 1}￾`
  })
  const withNoFillFixed = svgRootHasNoneFill
    ? withDefsStripped
    : withDefsStripped.replace(
        /<(path|circle|rect|ellipse|polygon|polyline)\b(?![^>]*\bfill\s*=)([^>]*(?:\/>|>))/gi,
        '<$1 fill="currentColor"$2',
      )
  svg = withNoFillFixed.replace(/￾DEFS(\d+)￾/g, (_, i) => defsParts[Number(i)])

  return svg
    .replace(/\sfill="(?!none)url\([^)]*\)"/gi, ' fill="currentColor"')
    .replace(/\sfill="(?!none)[^"]+"/gi, ' fill="currentColor"')
    .replace(/fill:\s*url\([^)]*\)/gi, "fill:currentColor")
    .replace(/fill:\s*(?!none)[^;}"]+/gi, "fill:currentColor")
    .replace(/\sstroke="(?!none)[^"]+"/gi, ' stroke="currentColor"')
    .replace(/stroke:\s*(?!none)[^;}"]+/gi, "stroke:currentColor")
}

// ── Main transformation ───────────────────────────────────────────────────────

function toMono(svg: string): string {
  const vb = parseViewBox(svg)
  if (vb) {
    const ko = buildKnockout(svg, vb.vw, vb.vh)
    if (ko) return ko
  }
  // Matrix-badge: multiple <g transform="matrix(…)"> groups with text + box + badge structure
  // (e.g. LINE Pay: LINE text groups + green PAY box + white PAY letter knockouts)
  const matrixGroups = scanMatrixGroups(svg)
  if (matrixGroups) return buildMatrixBadge(svg, matrixGroups)
  // White-eraser: white paths layered over colored paths create visual holes (e.g. Chromium, Kubernetes)
  if (vb) {
    const wko = buildWhiteKnockout(svg, vb.vw, vb.vh)
    if (wko) return wko
  }
  return simpleMono(svg)
}

// ── Asset discovery ───────────────────────────────────────────────────────────

async function getMissingMono(): Promise<string[]> {
  const slugs = await readdir(ASSETS_DIR)
  const result: string[] = []
  for (const slug of slugs) {
    const dir = join(ASSETS_DIR, slug)
    let files: string[]
    try {
      files = await readdir(dir)
    } catch {
      continue
    }
    if (!files.includes("mono.svg") && (files.includes("original.svg") || files.includes("plain.svg")))
      result.push(slug)
  }
  return result
}

async function getAllWithSource(): Promise<string[]> {
  const slugs = await readdir(ASSETS_DIR)
  const result: string[] = []
  for (const slug of slugs) {
    const dir = join(ASSETS_DIR, slug)
    let files: string[]
    try {
      files = await readdir(dir)
    } catch {
      continue
    }
    if (files.includes("original.svg") || files.includes("plain.svg")) result.push(slug)
  }
  return result
}

// ── CLI ───────────────────────────────────────────────────────────────────────

async function run() {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    options: {
      "dry-run": { type: "boolean", default: false },
      force: { type: "boolean", default: false },
    },
    allowPositionals: true,
  })
  const dryRun = values["dry-run"]
  const force = values.force

  const slugs = positionals.length > 0 ? positionals : force ? await getAllWithSource() : await getMissingMono()

  console.log(`Processing ${slugs.length} icons...\n`)

  let added = 0,
    skipped = 0,
    knockout = 0

  for (const slug of slugs) {
    const dir = join(ASSETS_DIR, slug)
    let files: string[]
    try {
      files = await readdir(dir)
    } catch {
      skipped++
      continue
    }

    if (files.includes("mono.svg") && !force) {
      skipped++
      continue
    }

    const hasPlan = files.includes("plain.svg")
    const hasOrig = files.includes("original.svg")
    if (!hasPlan && !hasOrig) {
      skipped++
      continue
    }

    let src = hasPlan ? "plain.svg" : "original.svg"
    let raw = await Bun.file(join(dir, src)).text()
    let mono = toMono(raw)
    let isKo = mono.includes('id="ko"') || mono.includes('id="wko"')

    // plain.svg gave a flat simpleMono — try original.svg if it would produce a knockout
    if (!isKo && hasPlan && hasOrig) {
      const origRaw = await Bun.file(join(dir, "original.svg")).text()
      const origMono = toMono(origRaw)
      if (origMono.includes('id="ko"') || origMono.includes('id="wko"')) {
        src = "original.svg"
        raw = origRaw
        mono = origMono
        isKo = true
      }
    }

    if (dryRun) {
      console.log(`  [dry] ${slug}  ← ${src}  (${isKo ? "knockout" : "simple"})`)
    } else {
      await Bun.write(join(dir, "mono.svg"), mono)
    }

    added++
    if (isKo) knockout++
  }

  console.log(dryRun ? "\n[dry-run — nothing written]\n" : "")
  console.log(`Generated: ${added}  (${knockout} knockout, ${added - knockout} simple)`)
  console.log(`Skipped:   ${skipped}`)
}

run()
