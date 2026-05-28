# Contributing

Thanks for your interest in contributing to `@germondai/icons`.  
Bug reports, feature requests, and pull requests are all welcome.

For larger changes, **open an issue first** to discuss the approach — this avoids wasted effort if the direction doesn't fit the project.

## Getting started

```bash
git clone https://github.com/germondai/icons.git
cd icons
bun install
bun dev
```

The API will be available at `http://localhost:3000`.  
You can also try the [live API](https://icons.germondai.com) to compare behavior.

## Self-hosting options

**Bun**
```bash
bun install
bun dev     # watch mode
bun start   # production
```

**Docker**
```bash
docker build -t icons .
docker run -p 3000:3000 icons

# custom port
docker run -p 8080:8080 -e PORT=8080 icons
```

## Environment variables

| Variable   | Default       | Description                                                     |
| ---------- | ------------- | --------------------------------------------------------------- |
| `PORT`     | `3000`        | Listening port                                                  |
| `NODE_ENV` | `development` | `development` \| `production` \| `test` \| `staging` \| `local` |

Bun automatically loads `.env` — no `dotenv` needed.

## Commands

| Command             | Description                |
| ------------------- | -------------------------- |
| `bun dev`           | Start with watch mode      |
| `bun start`         | Start in production mode   |
| `bun test`          | Run tests                  |
| `bun run lint`      | Lint with Biome            |
| `bun run fmt`       | Format with Biome          |
| `bun run typecheck` | Type-check with TypeScript |

## Stack

- **[Bun](https://bun.sh)** — runtime + package manager
- **[Elysia](https://elysiajs.com)** — web framework
- **[@resvg/resvg-js](https://github.com/yisibl/resvg-js)** — SVG → PNG rendering
- **[Bun.Image](https://bun.sh/docs/api/image)** — PNG → WebP conversion
- **[Biome](https://biomejs.dev)** — linting and formatting

## Project structure

```
src/
  config/     env validation
  lib/        asset loading, SVG composition, rendering helpers
  routes/     Elysia route handlers (/icons, /meta)
tests/        bun:test test files
assets/       SVG source files
```

## Code style

This project uses [Biome](https://biomejs.dev) for linting and formatting. Run `bun run fmt` before committing. CI will fail on lint or format errors.

## Tests

Tests live in `tests/` and use `bun:test`. Add or update tests for any logic you change.

```bash
bun test
```

## Commit messages

This project follows [Conventional Commits](https://www.conventionalcommits.org):

```
type(scope): short description
```

**Types:** `feat`, `fix`, `chore`, `docs`, `test`, `refactor`, `perf`  
**Scope:** optional, refers to the area changed — `lib`, `routes`, `config`, `docker`, `assets`

```
feat(routes): add perline param to icon strip endpoint
fix(lib): correct hex parsing for 3-digit colors
chore: update bun lockfile
docs: add self-hosting example to README
test: add coverage for transparent theme
```

Rules: lowercase, imperative mood, no trailing period, keep it short.

## Legal

All brand logos and icons are trademarks of their respective owners. This project is not affiliated with or endorsed by any of the brands displayed.

By contributing you agree that your contributions will be licensed under the [MIT License](LICENSE).
