'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { Loader2, AlertCircle, ArrowLeft, Globe, CheckCircle } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null) // Nuevo estado para mensajes de éxito
  const [loading, setLoading] = useState(false)
  
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setLoading(true)

    try {
      const { data: { user }, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) throw signInError
      if (!user) throw new Error('Could not identify the user.')

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      const userRole = profile?.role || 'student'

      router.refresh()

      if (userRole === 'admin') {
         router.push('/admin/dashboard')
      } else if (userRole === 'teacher') {
        router.push('/dashboard/teacher')
      } else {
        router.push('/dashboard/student')
      }
      
    } catch (err: any) {
      console.error("Login error:", err)
      setError(err.message || 'Error signing in')
      setLoading(false)
    }
  }

  // --- NUEVA FUNCIÓN: RECUPERAR CONTRASEÑA ---
  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email address first to reset your password.')
      return
    }
    setError(null)
    setMessage(null)
    setLoading(true)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        // CORRECCIÓN: Cambiamos /dashboard/settings por /reset-password
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      })
      if (error) throw error
      setMessage('Reset link sent! Please check your email inbox.')
    } catch (err: any) {
      setError(err.message || 'Error sending reset email')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-white font-sans text-slate-900">
      
      <div className="hidden md:flex md:w-1/2 bg-slate-900 text-white p-12 flex-col justify-between relative overflow-hidden">
        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-2 text-indigo-400 font-bold text-xl mb-2">
            <Globe className="w-6 h-6"/> Tutorio
          </Link>
          <p className="text-slate-400">Welcome back to your classroom.</p>
        </div>
        
        <div className="relative z-10">
          <blockquote className="text-xl font-medium leading-relaxed">
            "The limits of my language mean the limits of my world."
          </blockquote>
          <p className="mt-4 text-slate-500 font-semibold">— Ludwig Wittgenstein</p>
        </div>

        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600 rounded-full blur-[100px] opacity-20 translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-violet-600 rounded-full blur-[100px] opacity-20 -translate-x-1/2 translate-y-1/2"></div>
      </div>

      <div className="flex-1 flex flex-col justify-center p-8 md:p-24 relative">
        <Link href="/" className="absolute top-8 left-8 text-slate-500 hover:text-indigo-600 flex items-center gap-2 text-sm font-bold md:hidden">
            <ArrowLeft className="w-4 h-4" /> Back
        </Link>

        <div className="max-w-sm w-full mx-auto">
          <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Sign In</h1>
          <p className="text-slate-500 mb-8">Enter your credentials to access your account.</p>

          {/* MENSAJE DE ERROR */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl flex items-center gap-3 text-sm font-medium animate-shake">
              <AlertCircle className="w-5 h-5 shrink-0" />
              {error}
            </div>
          )}

          {/* MENSAJE DE ÉXITO (NUEVO) */}
          {message && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-600 rounded-xl flex items-center gap-3 text-sm font-medium">
              <CheckCircle className="w-5 h-5 shrink-0" />
              {message}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Email Address</label>
              <input
                type="email"
                required
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-medium text-slate-900"
                placeholder="john.doe@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-bold text-slate-700">Password</label>
                {/* BOTÓN ARREGLADO */}
                <button 
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:underline cursor-pointer focus:outline-none"
                >
                Forgot password?
                </button>
              </div>
              <input
                type="password"
                required
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-medium text-slate-900"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing...
                </>
              ) : (
                'Log In'
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-slate-500">
            Don't have an account?{' '}
            <Link href="/register" className="font-bold text-indigo-600 hover:text-indigo-700">
              Create one for free
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}