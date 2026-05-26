import { describe, expect, test } from "bun:test"
import {
  contrastRatio,
  hexToRgb,
  iconColor,
  isValidHex,
  relativeLuminance,
  resolveBackground,
  THEMES,
} from "~/lib/color"

describe("isValidHex", () => {
  test("accepts 3 and 6 char hex", () => {
    expect(isValidHex("fff")).toBe(true)
    expect(isValidHex("ffffff")).toBe(true)
    expect(isValidHex("3178c6")).toBe(true)
    expect(isValidHex("abc")).toBe(true)
  })
  test("rejects invalid values", () => {
    expect(isValidHex("#fff")).toBe(false) // has #
    expect(isValidHex("gg")).toBe(false) // not hex
    expect(isValidHex("1234567")).toBe(false) // 7 chars
    expect(isValidHex("")).toBe(false)
  })
})

describe("hexToRgb", () => {
  test("parses 6-char hex", () => {
    expect(hexToRgb("ffffff")).toEqual([255, 255, 255])
    expect(hexToRgb("000000")).toEqual([0, 0, 0])
    expect(hexToRgb("ff0000")).toEqual([255, 0, 0])
  })
  test("expands 3-char shorthand", () => {
    expect(hexToRgb("fff")).toEqual([255, 255, 255])
    expect(hexToRgb("f00")).toEqual([255, 0, 0])
    expect(hexToRgb("0f0")).toEqual([0, 255, 0])
  })
})

describe("relativeLuminance", () => {
  test("black is 0, white is 1", () => {
    expect(relativeLuminance(0, 0, 0)).toBe(0)
    expect(relativeLuminance(255, 255, 255)).toBeCloseTo(1)
  })
  test("stays in 0–1 range for all inputs", () => {
    const lum = relativeLuminance(128, 64, 200)
    expect(lum).toBeGreaterThanOrEqual(0)
    expect(lum).toBeLessThanOrEqual(1)
  })
})

describe("iconColor", () => {
  test("white on dark backgrounds", () => {
    expect(iconColor("000000")).toBe("ffffff")
    expect(iconColor(THEMES.dark)).toBe("ffffff")
    expect(iconColor(THEMES.slate)).toBe("ffffff")
  })
  test("dark on light backgrounds", () => {
    expect(iconColor("ffffff")).toBe("1a1a1a")
    expect(iconColor(THEMES.light)).toBe("1a1a1a")
    expect(iconColor(THEMES.white)).toBe("1a1a1a")
  })
})

describe("contrastRatio", () => {
  test("black vs white is max contrast (~21)", () => {
    expect(contrastRatio("000000", "ffffff")).toBeCloseTo(21, 0)
  })
  test("same color is 1:1", () => {
    expect(contrastRatio("3178c6", "3178c6")).toBeCloseTo(1)
  })
  test("is symmetric", () => {
    const a = contrastRatio("ff0000", "0000ff")
    const b = contrastRatio("0000ff", "ff0000")
    expect(a).toBeCloseTo(b)
  })
})

describe("resolveBackground", () => {
  test("returns null for transparent", () => {
    expect(resolveBackground("transparent")).toBeNull()
    expect(resolveBackground("none")).toBeNull()
    expect(resolveBackground(undefined, "transparent")).toBeNull()
  })
  test("resolves theme names", () => {
    expect(resolveBackground(undefined, "dark")).toBe(THEMES.dark)
    expect(resolveBackground(undefined, "slate")).toBe(THEMES.slate)
    expect(resolveBackground(undefined, "violet")).toBe(THEMES.violet)
  })
  test("resolves hex directly", () => {
    expect(resolveBackground("ff0000")).toBe("ff0000")
    expect(resolveBackground("abc")).toBe("abc")
  })
  test("theme takes priority over bg hex", () => {
    // ?bg=ff0000&theme=dark → theme wins; use ?bg alone for a custom hex
    expect(resolveBackground("ff0000", "dark")).toBe(THEMES.dark)
  })
  test("falls back to dark theme", () => {
    expect(resolveBackground()).toBe(THEMES.dark)
    expect(resolveBackground("not-hex")).toBe(THEMES.dark)
  })
})

describe("THEMES", () => {
  test("all values are valid 6-char hex", () => {
    for (const [name, hex] of Object.entries(THEMES)) {
      expect(isValidHex(hex), `${name}: "${hex}" is not a valid hex`).toBe(true)
      expect(hex.length, `${name}: should be 6 chars`).toBe(6)
    }
  })
})
