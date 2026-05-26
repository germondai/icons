import { beforeAll, describe, expect, test } from "bun:test"
import { listSlugs, loadAssets } from "~/lib/assets"
import { IMAGE_FORMATS, isRaster, toBuffer } from "~/lib/convert"
import { generateSVG } from "~/lib/svg"

let testSvg: string

beforeAll(async () => {
  await loadAssets()
  const slug = listSlugs()[0]
  if (!slug) throw new Error("no icons loaded - check assets dir")
  ;({ svg: testSvg } = generateSVG({
    icons: [{ slug }],
    bg: "111827",
    perline: 15,
    size: 48,
    radius: 0.25,
    pad: 0.12,
    variants: ["original", "plain", "line", "mono"],
  }))
})

describe("IMAGE_FORMATS", () => {
  test("contains svg, png, webp", () => {
    expect(IMAGE_FORMATS).toContain("svg")
    expect(IMAGE_FORMATS).toContain("png")
    expect(IMAGE_FORMATS).toContain("webp")
  })
})

describe("isRaster", () => {
  test("png and webp are raster", () => {
    expect(isRaster("png")).toBe(true)
    expect(isRaster("webp")).toBe(true)
  })
  test("svg is not raster", () => {
    expect(isRaster("svg")).toBe(false)
  })
})

describe("toBuffer", () => {
  test("svg format returns the svg string as-is", async () => {
    const { data, mime } = await toBuffer(testSvg, "svg")
    expect(mime).toBe("image/svg+xml")
    expect(data).toBe(testSvg)
  })

  test("png format returns a Buffer", async () => {
    const { data, mime } = await toBuffer(testSvg, "png")
    expect(mime).toBe("image/png")
    expect(data).toBeInstanceOf(Buffer)
    // PNG magic bytes: 89 50 4e 47
    const buf = data as Buffer
    expect(buf[0]).toBe(0x89)
    expect(buf[1]).toBe(0x50) // P
    expect(buf[2]).toBe(0x4e) // N
    expect(buf[3]).toBe(0x47) // G
  })

  test("webp format returns a Buffer", async () => {
    const { data, mime } = await toBuffer(testSvg, "webp")
    expect(mime).toBe("image/webp")
    expect(data).toBeInstanceOf(Buffer)
    // WebP magic: RIFF....WEBP
    const buf = data as Buffer
    expect(buf.subarray(0, 4).toString()).toBe("RIFF")
    expect(buf.subarray(8, 12).toString()).toBe("WEBP")
  })

  test("scale=2 produces a larger PNG than scale=1", async () => {
    const { data: s1 } = await toBuffer(testSvg, "png", 1)
    const { data: s2 } = await toBuffer(testSvg, "png", 2)
    expect((s2 as Buffer).length).toBeGreaterThan((s1 as Buffer).length)
  })
})
