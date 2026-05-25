type Window = { timestamps: number[] }
const windows = new Map<string, Window>()

// prune stale entries every 5 min so the map doesn't grow forever
setInterval(() => {
  const now = Date.now()
  for (const [key, win] of windows) {
    win.timestamps = win.timestamps.filter((t) => now - t < 5 * 60_000)
    if (!win.timestamps.length) windows.delete(key)
  }
}, 5 * 60_000).unref()

export const checkLimit = (key: string, max: number, windowMs: number): { ok: boolean; retryAfter: number } => {
  const now = Date.now()
  const cutoff = now - windowMs
  let win = windows.get(key)
  if (!win) {
    win = { timestamps: [] }
    windows.set(key, win)
  }
  win.timestamps = win.timestamps.filter((t) => t > cutoff)
  if (win.timestamps.length >= max) {
    const retryAfter = Math.ceil(((win.timestamps[0] as number) + windowMs - now) / 1000)
    return { ok: false, retryAfter }
  }
  win.timestamps.push(now)
  return { ok: true, retryAfter: 0 }
}

// CF-Connecting-IP is set by Cloudflare and can't be spoofed - prefer it
// Fall back to X-Forwarded-For (also trustworthy behind CF), then direct socket
export const clientIp = (
  request: Request,
  server?: { requestIP?: (r: Request) => { address: string } | null } | null,
) => {
  const cf = request.headers.get("cf-connecting-ip")
  if (cf) return cf.trim()
  const fwd = request.headers.get("x-forwarded-for")
  if (fwd) return (fwd.split(",")[0] ?? fwd).trim()
  return server?.requestIP?.(request)?.address ?? "unknown"
}
