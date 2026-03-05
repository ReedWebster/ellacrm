import { useState } from 'react'
import { Flower2, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'

export default function LoginScreen() {
  const { signIn }          = useAuth()
  const { theme, toggle }   = useTheme()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const err = await signIn(email, password)
    if (err) { setError('Incorrect email or password.'); setLoading(false) }
  }

  return (
    <div className="min-h-[100dvh] bg-blush-50 dark:bg-mauve-900 flex items-center justify-center p-4">
      <button
        onClick={toggle}
        className="absolute top-4 right-4 p-2 rounded-xl text-mauve-400 hover:bg-black/[0.05] dark:hover:bg-white/[0.05] transition-colors"
      >
        {theme === 'dark'
          ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
          : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
        }
      </button>

      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-[20px] bg-gradient-to-br from-blush-400 to-blush-600 flex items-center justify-center shadow-card-md mb-4">
            <Flower2 size={24} className="text-white" />
          </div>
          <h1 className="text-[28px] font-black text-plum-800 dark:text-white tracking-[-0.06em] uppercase">SWAGR</h1>
          <p className="text-[13px] text-mauve-400 mt-1">Ella's hub</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white dark:bg-mauve-800 rounded-3xl shadow-card-md border border-black/[0.05] dark:border-white/[0.05] p-6 space-y-4">
          <div>
            <label className="field-label">Email</label>
            <input
              type="email"
              className="input-field"
              placeholder="ella@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              autoFocus
            />
          </div>
          <div>
            <label className="field-label">Password</label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                className="input-field pr-10"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPass(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-mauve-400 hover:text-mauve-600 transition-colors"
              >
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {error && <p className="text-[12px] text-rose-500 font-medium">{error}</p>}

          <button
            type="submit"
            disabled={loading || !email || !password}
            className="w-full py-3 rounded-xl bg-blush-500 hover:bg-blush-600 disabled:opacity-50 text-white text-[14px] font-semibold transition-colors shadow-sm"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
