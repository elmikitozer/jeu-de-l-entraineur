/**
 * admin-guard.ts — Garde d'authentification réutilisable dans les Route Handlers admin.
 *
 * Defense-in-depth : même si le middleware protège déjà /api/admin/*, chaque
 * handler revérifie le cookie. Si jamais le middleware était contourné (mauvaise
 * config de matcher, CVE de bypass...), les handlers restent fermés.
 *
 * Importe next/headers → à n'utiliser QUE depuis des Route Handlers (jamais le middleware).
 */

import { cookies } from 'next/headers'
import { verifyAdminToken } from './admin-auth'

/** True si la requête courante porte un cookie admin_token valide. */
export async function isAdminAuthenticated(): Promise<boolean> {
  const token = (await cookies()).get('admin_token')?.value
  return verifyAdminToken(token, process.env.ADMIN_PASSWORD)
}
