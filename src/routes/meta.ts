import Elysia from "elysia"
import { ALL_VARIANTS } from "~/lib/assets"
import type { Theme } from "~/lib/color"
import { iconColor, THEME_NAMES, THEMES } from "~/lib/color"
import { IMAGE_FORMATS } from "~/lib/convert"

const VARIANT_DESCRIPTIONS: Record<string, string> = {
  original: "Full-color brand SVG",
  plain: "Simplified flat-color version",
  line: "Outline / stroke style",
  mono: "Single color - inherits fill from the color param",
}

export const metaRoute = new Elysia({ prefix: "/meta" })

  .get("/", () => ({
    themes: THEME_NAMES,
    variants: ALL_VARIANTS,
    formats: IMAGE_FORMATS,
    endpoints: {
      "GET /meta/themes": "Theme palette with hex values",
      "GET /meta/variants": "Available icon variant styles",
      "GET /meta/formats": "Supported output image formats",
    },
  }))

  .get("/themes", () => ({
    total: THEME_NAMES.length,
    themes: [
      ...Object.entries(THEMES).map(([name, hex]) => ({
        name: name as Theme,
        hex: `#${hex}`,
        textColor: `#${iconColor(hex)}`,
      })),
      { name: "transparent", hex: null, textColor: null },
    ],
  }))

  .get("/variants", () => ({
    total: ALL_VARIANTS.length,
    variants: ALL_VARIANTS.map((name) => ({
      name,
      description: VARIANT_DESCRIPTIONS[name] ?? name,
    })),
  }))

  .get("/formats", () => ({
    total: IMAGE_FORMATS.length,
    formats: [
      { name: "svg", mime: "image/svg+xml", raster: false, description: "Scalable vector, default output" },
      { name: "png", mime: "image/png", raster: true, description: "PNG at requested scale (1–4×)" },
      { name: "webp", mime: "image/webp", raster: true, description: "WebP at requested scale, quality 90" },
    ],
  }))
