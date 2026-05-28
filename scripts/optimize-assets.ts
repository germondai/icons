#!/usr/bin/env bun

// Losslessly optimize every SVG in assets/ using SVGO.
//
// Usage:
//   bun scripts/optimize-assets.ts           # optimize in place
//   bun scripts/optimize-assets.ts --dry-run # report savings without writing

import { readdir } from "node:fs/promises"
import { join } from "node:path"
import { parseArgs } from "node:util"
import { optimize } from "svgo"

const ASSETS_DIR = join(process.cwd(), "assets")

const SVGO_CONFIG = {
  plugins: [
    {
      name: "preset-default",
      params: {
        overrides: {
          mergePaths: false,
          inlineStyles: {
            onlyMatchedOnce: false,
            removeMatchedSelectors: true,
          },
        },
      },
    },
    "convertStyleToAttrs",
    "removeTitle",
    "removeDesc",
    { name: "removeAttrs", params: { attrs: ["data-.*", "aria-.*", "role"] } },
  ],
} as const

async function run() {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: { "dry-run": { type: "boolean", default: false } },
    allowPositionals: false,
  })
  const dryRun = values["dry-run"]

  const slugs = await readdir(ASSETS_DIR)
  let totalBefore = 0
  let totalAfter = 0
  let optimized = 0
  let unchanged = 0
  let errors = 0

  for (const slug of slugs) {
    const dir = join(ASSETS_DIR, slug)
    let files: string[]
    try {
      files = await readdir(dir)
    } catch {
      continue
    }

    for (const file of files) {
      if (!file.endsWith(".svg")) continue
      const path = join(dir, file)
      const raw = await Bun.file(path).text()

      try {
        const result = optimize(raw, { ...SVGO_CONFIG, path })
        const before = Buffer.byteLength(raw)
        const after = Buffer.byteLength(result.data)
        totalBefore += before
        totalAfter += after

        const changed = result.data !== raw
        if (changed) {
          if (!dryRun) await Bun.write(path, result.data)
          optimized++
        } else {
          unchanged++
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        console.error(`  ✗ ${slug}/${file}: ${msg}`)
        errors++
        totalBefore += Buffer.byteLength(raw)
        totalAfter += Buffer.byteLength(raw)
      }
    }
  }

  const saved = totalBefore - totalAfter
  const pct = totalBefore > 0 ? ((saved / totalBefore) * 100).toFixed(1) : "0.0"

  console.log(dryRun ? "\n[dry-run — nothing written]\n" : "")
  console.log(
    `Files:   ${optimized + unchanged + errors} total  |  ${optimized} optimized  |  ${unchanged} unchanged${errors ? `  |  ${errors} errors` : ""}`,
  )
  console.log(`Before:  ${(totalBefore / 1024).toFixed(1)} KB`)
  console.log(`After:   ${(totalAfter / 1024).toFixed(1)} KB`)
  console.log(`Saved:   ${(saved / 1024).toFixed(1)} KB  (${pct}%)`)
}

run()
