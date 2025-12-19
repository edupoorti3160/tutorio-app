'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { 
  Lock, 
  ShieldCheck, 
  Loader2, 
  AlertCircle, 
  CheckCircle2,
  Globe,
  ArrowRight
} from 'lucide-react'
import Link from 'next/link'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  
  const supabase = createClient()
  const router = useRouter()

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validación básica de coincidencia
    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.")
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({ password })
      
      if (error) throw error

      // 1. Mostrar estado de éxito
      setSuccess(true)
      
      // 2. Redirección inteligente tras 3 segundos
      setTimeout(() => {
        router.push('/login')
      }, 3000)

    } catch (err: any) {
      setError(err.message || 'An error occurred while updating your password.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans text-slate-900">
      
      {/* HEADER / LOGO */}
      <div className="p-8">
        <Link href="/" className="flex items-center gap-2 text-indigo-600 font-bold text-xl">
          <Globe className="w-6 h-6"/> Tutorio
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          
          <div className="bg-white p-8 md:p-10 rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-100 relative overflow-hidden">
            
            {/* Decoración visual sutil */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-50"></div>

            {!success ? (
              <>
                <div className="mb-8">
                  <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 mb-6">
                    <Lock className="w-7 h-7" />
                  </div>
                  <h1 className="text-3xl font-extrabold text-slate-900 mb-2">New Password</h1>
                  <p className="text-slate-500">Please enter a strong password to secure your account.</p>
                </div>

                {error && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl flex items-center gap-3 text-sm font-medium">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    {error}
                  </div>
                )}

                <form onSubmit={handleReset} className="space-y-5">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">New Password</label>
                    <input 
                      type="password" 
                      required
                      placeholder="••••••••" 
                      className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-medium"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Confirm New Password</label>
                    <input 
                      type="password" 
                      required
                      placeholder="••••••••" 
                      className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-medium"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>

                  <button 
                    type="submit"
                    disabled={loading} 
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-4"
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      'Update Password'
                    )}
                  </button>
                </form>
              </>
            ) : (
              /* ESTADO DE ÉXITO */
              <div className="text-center py-4 animate-in fade-in zoom-in duration-500">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-600 mx-auto mb-6">
                  <ShieldCheck className="w-10 h-10" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 mb-2">All set!</h2>
                <p className="text-slate-500 mb-8">Your password has been updated successfully. Redirecting you to login...</p>
                <div className="flex items-center justify-center gap-2 text-indigo-600 font-bold">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Taking you back...</span>
                </div>
              </div>
            )}
          </div>
          
          <p className="mt-8 text-center text-sm text-slate-400">
            Secure connection by Tutorio Auth Services
          </p>
        </div>
      </div>
    </div>
  )
}