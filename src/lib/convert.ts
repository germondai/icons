import { Resvg } from "@resvg/resvg-js"

export type ImageFormat = "svg" | "png" | "webp"
export const IMAGE_FORMATS: ImageFormat[] = ["svg", "png", "webp"]

const renderPng = (svg: string, scale: number): Buffer => {
  const resvg = new Resvg(svg, scale !== 1 ? { fitTo: { mode: "zoom", value: scale } } : {})
  return Buffer.from(resvg.render().asPng())
}

// svg → raster; scale only applies to png/webp
export const toBuffer = async (
  svg: string,
  format: ImageFormat,
  scale = 1,
): Promise<{ data: Buffer | string; mime: string }> => {
  if (format === "png") return { data: renderPng(svg, scale), mime: "image/png" }
  if (format === "webp") {
    const webp = await new Bun.Image(renderPng(svg, scale)).webp({ quality: 90 }).toBuffer()
    return { data: webp, mime: "image/webp" }
  }
  return { data: svg, mime: "image/svg+xml" }
}

export const isRaster = (format: ImageFormat) => format === "png" || format === "webp"

export const mimeFor = (format: ImageFormat) => {
  if (format === "png") return "image/png"
  if (format === "webp") return "image/webp"
  return "image/svg+xml"
}
