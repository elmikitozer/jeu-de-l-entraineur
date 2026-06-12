/**
 * admin-auth.ts — Jeton d'authentification admin signé (HMAC-SHA256).
 *
 * Le cookie `admin_token` ne contient PLUS le mot de passe en clair : il contient
 * un jeton `<expiration>.<signature>` où la signature est un HMAC-SHA256 du timestamp
 * d'expiration, clé = ADMIN_PASSWORD. Avantages :
 *   - le mot de passe ne transite jamais dans le cookie (pas de fuite directe via logs),
 *   - le jeton est infalsifiable sans connaître le mot de passe,
 *   - l'expiration est embarquée et vérifiée.
 *
 * Pur Web Crypto (crypto.subtle) → fonctionne à la fois en runtime Node (Route
 * Handlers, Server Actions) et Edge (middleware). Aucune dépendance Next ici.
 */

const encoder = new TextEncoder()

/** Durée de vie du jeton (secondes) — alignée sur le maxAge du cookie. */
export const ADMIN_TOKEN_MAX_AGE = 60 * 60 * 24 * 7 // 7 jours

function base64url(bytes: Uint8Array): string {
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function hmac(password: string, msg: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(msg))
  return base64url(new Uint8Array(sig))
}

/** Comparaison à temps constant (longueurs égales requises). */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

/** Génère un jeton signé valable ADMIN_TOKEN_MAX_AGE secondes. */
export async function signAdminToken(password: string): Promise<string> {
  const exp = Date.now() + ADMIN_TOKEN_MAX_AGE * 1000
  const sig = await hmac(password, String(exp))
  return `${exp}.${sig}`
}

/** Vérifie un jeton : signature valide ET non expiré. */
export async function verifyAdminToken(
  token: string | undefined | null,
  password: string | undefined | null
): Promise<boolean> {
  if (!token || !password) return false
  const dot = token.indexOf('.')
  if (dot === -1) return false
  const expStr = token.slice(0, dot)
  const sig = token.slice(dot + 1)
  const exp = Number(expStr)
  if (!Number.isFinite(exp) || exp < Date.now()) return false
  const expected = await hmac(password, expStr)
  return timingSafeEqual(sig, expected)
}
