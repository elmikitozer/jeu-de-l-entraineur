import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

async function loginAction(formData: FormData) {
  'use server'
  const password = formData.get('password') as string
  const adminPassword = process.env.ADMIN_PASSWORD

  if (password && adminPassword && password === adminPassword) {
    const cookieStore = await cookies()
    cookieStore.set('admin_token', password, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })
    redirect('/admin')
  }

  redirect('/admin/login?error=1')
}

interface Props {
  searchParams: Promise<{ error?: string }>
}

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams
  const hasError = params.error === '1'

  return (
    <main className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
      <div className="w-full max-w-sm">
        <h1 className="text-white text-2xl font-bold mb-6 text-center">
          ⚽ Jeu de l&apos;Entraîneur
        </h1>
        <div className="bg-[#141414] border border-[#2a2a2a] rounded-lg p-6">
          <h2 className="text-white text-lg font-semibold mb-4">Administration</h2>

          {hasError && (
            <div className="bg-red-900/30 border border-red-700 text-red-400 text-sm rounded px-3 py-2 mb-4">
              Mot de passe incorrect.
            </div>
          )}

          <form action={loginAction} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-gray-400 text-sm mb-1">
                Mot de passe
              </label>
              <input
                id="password"
                type="password"
                name="password"
                required
                autoFocus
                className="w-full bg-[#1a1a1a] border border-[#333] rounded px-3 py-2 text-white text-sm outline-none focus:border-[#C9A84C] transition-colors"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-[#C9A84C] text-black font-semibold py-2 rounded hover:bg-[#D4B85A] transition-colors"
            >
              Accéder à l&apos;admin
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
