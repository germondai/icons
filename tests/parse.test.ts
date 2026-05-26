import { describe, expect, test } from "bun:test"
import { ALL_VARIANTS, DEFAULT_VARIANTS } from "~/lib/assets"
import { THEMES } from "~/lib/color"
import { parseIconSpec, parseVariants } from "~/lib/parse"

describe("parseIconSpec", () => {
  test("slug only", () => {
    const s = parseIconSpec("react")
    expect(s.slug).toBe("react")
    expect(s.variant).toBeUndefined()
    expect(s.color).toBeUndefined()
    expect(s.fullBleed).toBeUndefined()
  })

  test("lowercases the slug", () => {
    expect(parseIconSpec("React").slug).toBe("react")
    expect(parseIconSpec("TypeScript").slug).toBe("typescript")
  })

  test("variant", () => {
    for (const v of ALL_VARIANTS) {
      expect(parseIconSpec(`react:${v}`).variant).toBe(v)
    }
  })

  test("hex color", () => {
    expect(parseIconSpec("react:61dafb").color).toBe("61dafb")
    expect(parseIconSpec("react:fff").color).toBe("fff")
  })

  test("fullBleed truthy values", () => {
    expect(parseIconSpec("typescript:full").fullBleed).toBe(true)
    expect(parseIconSpec("typescript:1").fullBleed).toBe(true)
    expect(parseIconSpec("typescript:true").fullBleed).toBe(true)
  })

  test("fullBleed falsy values", () => {
    expect(parseIconSpec("typescript:0").fullBleed).toBe(false)
    expect(parseIconSpec("typescript:false").fullBleed).toBe(false)
  })

  test("radius r<float>", () => {
    expect(parseIconSpec("react:r0.5").radius).toBeCloseTo(0.5)
    expect(parseIconSpec("react:r0").radius).toBeCloseTo(0)
    expect(parseIconSpec("react:r1").radius).toBeCloseTo(1)
  })

  test("radius is clamped 0–1", () => {
    expect(parseIconSpec("react:r5").radius).toBe(1)
    expect(parseIconSpec("react:r-1").radius).toBeUndefined() // doesn't match regex
  })

  test("transparent bg", () => {
    expect(parseIconSpec("react:transparent").bg).toBeNull()
  })

  test("explicit bg hex via bg<hex>", () => {
    expect(parseIconSpec("react:bg3178c6").bg).toBe("3178c6")
  })

  test("theme name resolves to hex bg", () => {
    expect(parseIconSpec("react:dark").bg).toBe(THEMES.dark)
    expect(parseIconSpec("react:violet").bg).toBe(THEMES.violet)
  })

  test("explicit bg beats theme", () => {
    // both bg and theme detected - explicit bg wins
    const s = parseIconSpec("react:bgff0000:dark")
    expect(s.bg).toBe("ff0000")
  })

  test("transparent beats theme", () => {
    const s = parseIconSpec("react:transparent:dark")
    expect(s.bg).toBeNull()
  })

  test("all options combined, any order", () => {
    const s = parseIconSpec("typescript:original:3178c6:full")
    expect(s).toMatchObject({ slug: "typescript", variant: "original", color: "3178c6", fullBleed: true })
  })

  test("unknown options are silently ignored", () => {
    const s = parseIconSpec("react:unknown:option")
    expect(s.slug).toBe("react")
    expect(s.variant).toBeUndefined()
  })
})

describe("parseVariants", () => {
  test("returns defaults when empty", () => {
    expect(parseVariants()).toEqual(DEFAULT_VARIANTS)
    expect(parseVariants("")).toEqual(DEFAULT_VARIANTS)
  })

  test("puts listed variants first", () => {
    const v = parseVariants("mono,plain")
    expect(v[0]).toBe("mono")
    expect(v[1]).toBe("plain")
  })

  test("appends unlisted variants as fallbacks", () => {
    const v = parseVariants("mono")
    expect(v[0]).toBe("mono")
    expect(v).toContain("original")
    expect(v).toContain("plain")
    expect(v).toContain("line")
    expect(v.length).toBe(ALL_VARIANTS.length)
  })

  test("ignores unknown variant names", () => {
    const v = parseVariants("mono,bogus,plain")
    expect(v).not.toContain("bogus")
  })

  test("returns defaults when all names are unknown", () => {
    expect(parseVariants("nope,also-nope")).toEqual(DEFAULT_VARIANTS)
  })
})
