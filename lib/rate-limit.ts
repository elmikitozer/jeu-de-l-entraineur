/**
 * rate-limit.ts — Limiteur de débit en mémoire (best-effort).
 *
 * Fenêtre glissante par clé. Note : l'état est par instance de fonction et se
 * réinitialise au cold start — c'est un garde-fou contre le brute-force et le
 * burst de requêtes, pas une garantie distribuée. Pour un quota strict, brancher
 * Upstash/Vercel KV ultérieurement (même interface).
 */

const buckets = new Map<string, number[]>()

/**
 * @returns true si la requête est autorisée, false si la limite est atteinte.
 */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs)
  if (hits.length >= limit) {
    buckets.set(key, hits)
    return false
  }
  hits.push(now)
  buckets.set(key, hits)
  return true
}

/** Extrait une IP cliente exploitable depuis les en-têtes proxy (Vercel). */
export function clientIp(headers: Headers): string {
  const fwd = headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0]!.trim()
  return headers.get('x-real-ip') ?? 'unknown'
}
