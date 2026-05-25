const HEX_RE = /^([0-9a-f]{3}|[0-9a-f]{6})$/i

export type Theme = keyof typeof THEMES

// exact tailwind color-scale values
export const THEMES = {
  dark: "111827", // gray-900
  slate: "0f172a", // slate-900
  zinc: "18181b", // zinc-900
  neutral: "171717", // neutral-900
  stone: "1c1917", // stone-900
  sky: "082f49", // sky-950
  emerald: "022c22", // emerald-950
  rose: "4c0519", // rose-950
  orange: "431407", // orange-950
  violet: "2e1065", // violet-950
  light: "f1f5f9", // slate-100
  white: "f9fafb", // gray-50
} as const

export const THEME_NAMES = [...Object.keys(THEMES), "transparent"] as (Theme | "transparent")[]

export const resolveBackground = (bg?: string, theme?: string): string | null => {
  if (bg === "none" || bg === "transparent" || theme === "transparent") return null
  if (theme && theme in THEMES) return THEMES[theme as Theme]
  if (bg && HEX_RE.test(bg)) return bg.toLowerCase()
  return THEMES.dark
}

export const hexToRgb = (hex: string): [number, number, number] => {
  const h =
    hex.length === 3
      ? hex
          .split("")
          .map((c) => c + c)
          .join("")
      : hex
  const n = parseInt(h, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

// sRGB linearization per WCAG
const linearize = (c: number) => {
  const s = c / 255
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}

export const relativeLuminance = (r: number, g: number, b: number) =>
  0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b)

export const iconColor = (bgHex: string) => {
  const [r, g, b] = hexToRgb(bgHex)
  return relativeLuminance(r, g, b) > 0.179 ? "1a1a1a" : "ffffff"
}

export const contrastRatio = (hex1: string, hex2: string) => {
  const l1 = relativeLuminance(...hexToRgb(hex1))
  const l2 = relativeLuminance(...hexToRgb(hex2))
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
}

// use brand color if contrast is ok, otherwise fall back to auto
export const resolveIconColor = (brandHex: string, bgHex: string) =>
  contrastRatio(brandHex, bgHex) < 2.5 ? iconColor(bgHex) : brandHex

export const isValidHex = (hex: string) => HEX_RE.test(hex)
