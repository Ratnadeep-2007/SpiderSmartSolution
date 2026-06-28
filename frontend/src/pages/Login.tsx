import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck, Lock, Mail, Loader2 } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import api from '@/lib/api'
import { useLanguageStore } from '@/store/languageStore'
import { AxiosError } from 'axios'

interface ApiErrorResponse {
  detail?: string | { msg: string }[]
}

export default function Login() {
  const { translate } = useLanguageStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const navigate = useNavigate()
  const login = useAuthStore((state) => state.login)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      // 1. Get Token
      const params = new URLSearchParams()
      params.append('username', email)
      params.append('password', password)

      const tokenResponse = await api.post('/auth/login', params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      })

      const { access_token } = tokenResponse.data
      
      // 2. Get User Details using the token
      // Temporarily store token so the interceptor picks it up for the next call
      localStorage.setItem('access_token', access_token)
      
      const userResponse = await api.get('/auth/me')
      
      // 3. Update Store
      login(userResponse.data, access_token)
      
      navigate('/')
    } catch (err) {
      console.error('Login error:', err)
      let errorMessage = translate('Invalid email or password. Please check your credentials.') || 'Invalid email or password. Please check your credentials.'
      const axiosError = err as AxiosError<ApiErrorResponse>
      
      if (axiosError.response?.data?.detail) {
        const detail = axiosError.response.data.detail
        if (typeof detail === 'string') {
          errorMessage = detail
        } else if (Array.isArray(detail)) {
          errorMessage = detail[0]?.msg || errorMessage
        }
      }
      setError(errorMessage)
      localStorage.removeItem('access_token')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-md space-y-8 rounded-xl border bg-card p-8 shadow-lg">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <ShieldCheck className="h-8 w-8 text-primary" />
          </div>
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-foreground">
            SpiderSmart IMS
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {translate('Sign in to manage your inventory')}
          </p>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive p-3 rounded-md text-xs font-medium">
            {error}
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="space-y-4 rounded-md shadow-sm">
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
              <input
                type="email"
                required
                className="block w-full rounded-md border border-input py-2.5 pl-10 pr-3 text-foreground placeholder-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary sm:text-sm outline-none"
                placeholder={translate('Email address')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
              <input
                type="password"
                required
                className="block w-full rounded-md border border-input py-2.5 pl-10 pr-3 text-foreground placeholder-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary sm:text-sm outline-none"
                placeholder={translate('Password')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative flex w-full justify-center rounded-md bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-all disabled:opacity-70"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {translate('Signing in...')}
                </>
              ) : translate('Sign In')}
            </button>
          </div>
        </form>

        <div className="mt-6 text-center text-xs text-muted-foreground">
          <p>{translate('Phase 1 build • Secured via JWT')}</p>
        </div>
      </div>
    </div>
  )
}
