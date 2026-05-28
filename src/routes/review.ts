import Elysia from "elysia"
import { ALL_VARIANTS, getVariants, listSlugs } from "~/lib/assets"

export const reviewRoute = new Elysia().get("/review", () => {
  const slugs = listSlugs()
  const SIZE = 48

  let rows = ""
  for (const slug of slugs) {
    const available = new Set(getVariants(slug))
    let cells = ""
    for (const v of ALL_VARIANTS) {
      if (available.has(v)) {
        const src = `/icons?i=${encodeURIComponent(slug)}&variant=${v}&size=${SIZE}`
        cells += `<td class="cell has-${v}" title="${slug}:${v}"><img src="${src}" width="${SIZE}" height="${SIZE}" loading="lazy"></td>`
      } else {
        cells += `<td class="cell empty" title="${slug}:${v} — missing"></td>`
      }
    }
    const varCount = available.size
    rows += `<tr data-slug="${slug}" data-variants="${varCount}"><td class="name">${slug}<span class="vc">${varCount}</span></td>${cells}</tr>\n`
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Icon Review — ${slugs.length} icons</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#1e2030;color:#cdd6f4;font:12px/1 monospace}
h1{padding:14px 16px 10px;font-size:13px;color:#7f849c;border-bottom:1px solid #313244;background:#181825;position:sticky;top:0;z-index:2}
h1 b{color:#cdd6f4}
table{border-collapse:collapse;width:100%}
thead th{position:sticky;top:37px;z-index:1;background:#181825;padding:6px 12px;font-size:10px;color:#6c7086;text-transform:uppercase;letter-spacing:.08em;border-bottom:1px solid #313244;text-align:center}
thead th.icon-col{text-align:left}
td.name{padding:3px 12px;color:#6c7086;white-space:nowrap;vertical-align:middle;font-size:11px}
td.name:hover{color:#cdd6f4}
.vc{display:inline-block;margin-left:6px;padding:0 5px;background:#313244;border-radius:10px;font-size:9px;color:#7f849c;vertical-align:middle}
td.cell{padding:4px;text-align:center;vertical-align:middle;width:58px}
td.cell.empty{background:repeating-linear-gradient(45deg,transparent,transparent 5px,rgba(255,255,255,.015) 5px,rgba(255,255,255,.015) 10px)}
tr:nth-child(even) td{background:rgba(255,255,255,.015)}
tr:nth-child(even) td.cell.empty{background:repeating-linear-gradient(45deg,rgba(255,255,255,.01),rgba(255,255,255,.01) 5px,rgba(255,255,255,.025) 5px,rgba(255,255,255,.025) 10px)}
tr:hover td{background:rgba(137,180,250,.07)!important}
</style>
</head>
<body>
<h1>Icon Review &nbsp;·&nbsp; <b>${slugs.length}</b> icons &nbsp;·&nbsp; ${ALL_VARIANTS.join(" / ")}</h1>
<table>
<thead><tr>
  <th class="icon-col">icon</th>
  <th>original</th><th>plain</th><th>line</th><th>mono</th>
</tr></thead>
<tbody>${rows}</tbody>
</table>
</body></html>`

  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } })
})
