<h1 align="center">
  <a href="https://icons.germondai.com" target="_blank">
    <img align="center" src="https://icons.germondai.com/icons?i=typescript:transparent:full" /><br/><br/>
    <span>Germond's Icons</span>
  </a>
</h1>

<p align="center">
  On-demand tech icon SVG strips, fully styleable via URL params.
</p>

<p align="center">
  <img src="https://icons.germondai.com/icons?i=nuxt,vuejs,bun,tailwindcss,docker,git&theme=dark&size=48" />
</p>

<p align="center">
  <a href="https://icons.germondai.com" target="_blank"><strong>Live API</strong></a> &nbsp;·&nbsp;
  <a href="#endpoints">Endpoints</a> &nbsp;·&nbsp;
  <a href="#parameters">Parameters</a> &nbsp;·&nbsp;
  <a href="#themes">Themes</a> &nbsp;·&nbsp;
  <a href="#self-hosting">Self-hosting</a>
</p>

---

## Usage

Drop an `<img>` tag anywhere - GitHub READMEs, docs, portfolios:

```md
![icons](https://icons.germondai.com/icons?i=nuxt,vuejs,bun)
```

```html
<img src="https://icons.germondai.com/icons?i=nuxt,vuejs,bun" />
```

---

## Endpoints

| Method | Path             | Description                                           |
| ------ | ---------------- | ----------------------------------------------------- |
| `GET`  | `/icons`         | Generate an icon strip (SVG / PNG / WebP)             |
| `GET`  | `/icons/all`     | Browse all available icons as a grid                  |
| `GET`  | `/icons/list`    | List all icon slugs (`?detail=true` for variant info) |
| `GET`  | `/meta`          | Overview of themes, variants, and formats             |
| `GET`  | `/meta/themes`   | Theme palette with hex values                         |
| `GET`  | `/meta/variants` | Available icon variant styles                         |
| `GET`  | `/meta/formats`  | Supported output formats                              |

---

## Parameters

### Global

| Param     | Type             | Default                    | Description                                                          |
| --------- | ---------------- | -------------------------- | -------------------------------------------------------------------- |
| `i`       | `string`         | -                          | **Required.** Comma-separated icon specs (see [Per-icon](#per-icon)) |
| `theme`   | `string`         | `dark`                     | Named theme (see [Themes](#themes))                                  |
| `bg`      | `hex`            | -                          | Custom background hex without `#` - overridden by `theme`            |
| `variant` | `string`         | `original,plain,line,mono` | Ordered variant preference - first match wins                        |
| `color`   | `hex`            | auto                       | Hex fill for mono icons - auto-contrasts against bg if omitted       |
| `format`  | `svg\|png\|webp` | `svg`                      | Output format                                                        |
| `scale`   | `1–4`            | `1`                        | Pixel density multiplier for PNG/WebP                                |
| `perline` | `1–120`          | `15`                       | Icons per row                                                        |
| `size`    | `16–128`         | `48`                       | Cell size in px                                                      |
| `radius`  | `0–1`            | `0.25`                     | Corner radius as a ratio of cell size                                |
| `pad`     | `0–0.4`          | `0.12`                     | Inner padding as a ratio of cell size                                |

### Per-icon

Each entry in `?i=` follows the format `slug[:option...]`. Options are appended with `:` in any order and auto-detected by shape - no key names needed.

```
typescript:original:3178c6:full
react:mono:61dafb
vuejs:r0:dark
html5:transparent:full
```

| Option            | Shape                         | Example             | Description                         |
| ----------------- | ----------------------------- | ------------------- | ----------------------------------- |
| variant           | `original\|plain\|line\|mono` | `react:mono`        | Override variant for this icon      |
| color             | 3–6 hex digits                | `react:61dafb`      | Fill color - works on any variant   |
| bg                | `bg` + 3–6 hex digits         | `react:bg1e2030`    | Per-icon background hex             |
| theme             | theme name                    | `react:dark`        | Per-icon background from theme      |
| transparent       | `transparent`                 | `react:transparent` | Remove background for this icon     |
| radius            | `r` + float                   | `react:r0.5`        | Per-icon corner radius 0–1          |
| fullBleed         | `full` \| `1` \| `true`       | `typescript:full`   | Fill the full cell - no padding     |
| disable fullBleed | `0` \| `false`                | `typescript:false`  | Force padding even if auto-detected |

> Per-icon options always override their global equivalents.

---

## Themes

All values are exact [Tailwind CSS](https://tailwindcss.com/docs/colors) color-scale entries.

| Name          | Hex       | Tailwind      |
| ------------- | --------- | ------------- |
| `dark`        | `#111827` | gray-900      |
| `slate`       | `#0f172a` | slate-900     |
| `zinc`        | `#18181b` | zinc-900      |
| `neutral`     | `#171717` | neutral-900   |
| `stone`       | `#1c1917` | stone-900     |
| `sky`         | `#082f49` | sky-950       |
| `emerald`     | `#022c22` | emerald-950   |
| `rose`        | `#4c0519` | rose-950      |
| `orange`      | `#431407` | orange-950    |
| `violet`      | `#2e1065` | violet-950    |
| `light`       | `#f1f5f9` | slate-100     |
| `white`       | `#f9fafb` | gray-50       |
| `transparent` | -         | no background |

---

## Variants

| Name       | Description                                |
| ---------- | ------------------------------------------ |
| `original` | Full-color brand SVG                       |
| `plain`    | Simplified flat-color version              |
| `line`     | Outline / stroke style                     |
| `mono`     | Single color - inherits from `color` param |

---

## Examples

**Colored strip**
```
/icons?i=typescript,react,vuejs,bun&theme=dark
```
<img src="https://icons.germondai.com/icons?i=typescript,react,vuejs,bun&theme=dark" />

**Mono white on dark**
```
/icons?i=typescript,react,vuejs,bun&theme=dark&variant=mono&color=ffffff
```
<img src="https://icons.germondai.com/icons?i=typescript,react,vuejs,bun&theme=dark&variant=mono&color=ffffff" />

**Per-icon variants**
```
/icons?i=typescript:original,react:plain,vuejs:line,bun:mono&theme=slate
```
<img src="https://icons.germondai.com/icons?i=typescript:original,react:plain,vuejs:line,bun:mono&theme=slate" />

**Per-icon colors**
```
/icons?i=react:61dafb,vuejs:41b883,bun:fbf0d9,typescript:3178c6&theme=dark
```
<img src="https://icons.germondai.com/icons?i=react:61dafb,vuejs:41b883,bun:fbf0d9,typescript:3178c6&theme=dark" />

**Full-bleed icons (no padding)**
```
/icons?i=typescript:full,html5:full,css3:full&theme=dark
```
<img src="https://icons.germondai.com/icons?i=typescript:full,html5:full,css3:full&theme=dark" />

**Transparent background**
```
/icons?i=typescript,react,bun&theme=transparent
```
<img src="https://icons.germondai.com/icons?i=typescript,react,bun&theme=transparent" />

**PNG at 2× scale**
```
/icons?i=typescript,react,bun&theme=dark&format=png&scale=2
```

**Mix everything**
```
/icons?i=typescript:original:3178c6:full,react:mono:61dafb,vuejs:plain:41b883,bun:line:fbf0d9&theme=slate&size=56&radius=0.35
```
<img src="https://icons.germondai.com/icons?i=typescript:original:3178c6:full,react:mono:61dafb,vuejs:plain:41b883,bun:line:fbf0d9&theme=slate&size=56&radius=0.35" />

---

## Self-hosting

### Docker

```bash
docker build -t icons .
docker run -p 3000:3000 icons
```

With a custom port:

```bash
docker run -p 8080:8080 -e PORT=8080 icons
```

### Bun

```bash
bun install
bun dev       # watch mode
bun start     # production
```

### Environment

| Variable   | Default       | Description                                                     |
| ---------- | ------------- | --------------------------------------------------------------- |
| `PORT`     | `3000`        | Listening port                                                  |
| `NODE_ENV` | `development` | `development` \| `production` \| `test` \| `staging` \| `local` |

---

## Stack

- **[Bun](https://bun.sh)** - runtime + package manager
- **[Elysia](https://elysiajs.com)** - web framework
- **[@resvg/resvg-js](https://github.com/yisibl/resvg-js)** - SVG → PNG rendering
- **[Bun.Image](https://bun.sh/docs/api/image)** - PNG → WebP conversion

---

## Contributing

Bug reports and feature requests are welcome - open an [issue](https://github.com/germondai/icons/issues).

Pull requests are also welcome. For larger changes, open an issue first to discuss the approach.

---

## Legal

All brand logos and icons are trademarks of their respective owners and are used here solely for identification purposes. This project is not affiliated with or endorsed by any of the brands displayed.

This project's source code is licensed under the [MIT License](LICENSE).

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/germondai" target="_blank">@germondai</a>
</p>
