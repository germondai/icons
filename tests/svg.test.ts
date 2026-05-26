import { beforeAll, describe, expect, test } from "bun:test"
import { listSlugs, loadAssets } from "~/lib/assets"
import { generateSVG } from "~/lib/svg"

beforeAll(async () => {
  await loadAssets()
})

const opts = {
  bg: "111827" as string | null,
  perline: 15,
  size: 48,
  radius: 0.25,
  pad: 0.12,
  variants: ["original", "plain", "line", "mono"] as import("~/lib/assets").VariantName[],
}

describe("generateSVG", () => {
  test("returns valid svg string", () => {
    const slugs = listSlugs().slice(0, 3)
    const { svg } = generateSVG({ ...opts, icons: slugs.map((slug) => ({ slug })) })
    expect(svg).toContain('<svg xmlns="http://www.w3.org/2000/svg"')
    expect(svg).toContain("</svg>")
  })

  test("empty icons list produces empty svg", () => {
    const { svg, found, missing } = generateSVG({ ...opts, icons: [] })
    expect(found).toHaveLength(0)
    expect(missing).toHaveLength(0)
    expect(svg).toContain("<svg")
  })

  test("unknown slugs land in missing", () => {
    const { found, missing } = generateSVG({ ...opts, icons: [{ slug: "__no_such_icon__" }] })
    expect(missing).toContain("__no_such_icon__")
    expect(found).toHaveLength(0)
  })

  test("found + missing = total icons", () => {
    const slugs = listSlugs().slice(0, 5)
    const icons = [...slugs.map((s) => ({ slug: s })), { slug: "__missing__" }]
    const { found, missing } = generateSVG({ ...opts, icons })
    expect(found.length + missing.length).toBe(icons.length)
  })

  test("svg width/height match perline and icon count", () => {
    const GAP = 11
    const size = 48
    const count = 3
    const slugs = listSlugs().slice(0, count)
    const { svg } = generateSVG({ ...opts, size, perline: 15, icons: slugs.map((s) => ({ slug: s })) })
    const expectedW = count * size + (count - 1) * GAP
    expect(svg).toContain(`width="${expectedW}"`)
  })

  test("transparent bg produces no background rect", () => {
    const slugs = listSlugs().slice(0, 1)
    const { svg } = generateSVG({ ...opts, bg: null, icons: slugs.map((s) => ({ slug: s })) })
    // no rect with a fill matching a bg color should appear at top level
    expect(svg).not.toMatch(/<rect[^>]+fill="#[0-9a-f]{6}"[^>]*\/>/)
  })

  test("loads at least one icon", () => {
    expect(listSlugs().length).toBeGreaterThan(0)
  })

  test("defs clip-path is included", () => {
    const slugs = listSlugs().slice(0, 1)
    const { svg } = generateSVG({ ...opts, icons: slugs.map((s) => ({ slug: s })) })
    expect(svg).toContain("<defs>")
    expect(svg).toContain("clipPath")
  })
})
