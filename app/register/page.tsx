'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { Loader2, AlertCircle, ArrowLeft, GraduationCap, School, Check, User, Mail, Lock } from 'lucide-react'

export default function RegisterPage() {
  const [role, setRole] = useState<'student' | 'teacher'>('student')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  
  const router = useRouter()
  const supabase = createClient()

  // --- LÓGICA DE TEXTOS DINÁMICOS ---
  const texts = {
    student: {
      back: "Back to Home",
      heroTitle: "Start your journey.",
      heroDesc: "Join thousands of students mastering Spanish through real human connection.",
      formTitle: "Create Account",
      subTitle: "Select your role to get started",
      roleStudent: "I'm a Student",
      roleTeacher: "Soy Profesor", // Mantenemos este en español para que el maestro lo entienda
      labelName: "Full Name",
      placeholderName: "e.g. John Doe",
      labelEmail: "Email Address",
      labelPass: "Password",
      btnSubmit: "Create Student Account",
      loading: "Creating Account...",
      footerText: "Already have an account?",
      footerLink: "Sign in here",
      note: null
    },
    teacher: {
      back: "Volver al Inicio",
      heroTitle: "Comparte tu pasión.",
      heroDesc: "Sé parte de una red selecta de educadores latinos y genera ingresos enseñando tu idioma.",
      formTitle: "Crear Cuenta",
      subTitle: "Selecciona tu perfil para comenzar",
      roleStudent: "I'm a Student",
      roleTeacher: "Soy Profesor",
      labelName: "Nombre Completo",
      placeholderName: "Ej. María González",
      labelEmail: "Correo Electrónico",
      labelPass: "Contraseña",
      btnSubmit: "Unirme como Instructor",
      loading: "Creando Cuenta...",
      footerText: "¿Ya tienes una cuenta?",
      footerLink: "Inicia sesión aquí",
      note: "Nota Profesional: Al registrarte, aceptas pasar por nuestro proceso de verificación. Configurarás tus tarifas en el siguiente paso."
    }
  }

  const t = texts[role] // Selecciona el idioma según el rol actual

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: role,
          },
        },
      })

      if (error) throw error

      router.refresh()
      if (role === 'teacher') {
        router.push('/dashboard/teacher/profile-setup') 
      } else {
        router.push('/dashboard/student') 
      }
      
    } catch (err: any) {
      setError(err.message || (role === 'student' ? 'Error creating account' : 'Error al crear cuenta'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-white font-sans text-slate-900">
      
      {/* --- LADO IZQUIERDO (Visual + Texto Dinámico) --- */}
      <div className="hidden md:flex md:w-5/12 bg-slate-900 text-white p-12 flex-col justify-between relative overflow-hidden">
        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-2 text-indigo-400 font-bold text-xl mb-6">
            <ArrowLeft className="w-5 h-5"/> {t.back}
          </Link>
          <h2 className="text-3xl font-bold mb-4">{t.heroTitle}</h2>
          <p className="text-indigo-200 text-lg leading-relaxed">
            {t.heroDesc}
          </p>
        </div>

        {/* Decoración */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600 rounded-full blur-[120px] opacity-20 translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-violet-600 rounded-full blur-[120px] opacity-20 -translate-x-1/2 translate-y-1/2"></div>
        <div className="absolute inset-0 z-0 opacity-10 mix-blend-overlay" style={{backgroundImage: 'url("https://www.transparenttextures.com/patterns/cubes.png")'}}></div>
      </div>

      {/* --- LADO DERECHO (Formulario Dinámico) --- */}
      <div className="flex-1 flex flex-col justify-center p-6 md:p-20 overflow-y-auto">
        <div className="max-w-md w-full mx-auto">
          
          <div className="mb-10 text-center">
            <h1 className="text-4xl font-extrabold text-slate-900 mb-2">{t.formTitle}</h1>
            <p className="text-slate-500">{t.subTitle}</p>
          </div>

          {/* SELECTOR DE ROL */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <button
              type="button"
              onClick={() => setRole('student')}
              className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-3 transition-all ${
                role === 'student' 
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-200 ring-offset-2' 
                  : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <GraduationCap className={`w-8 h-8 ${role === 'student' ? 'text-indigo-600' : 'text-slate-400'}`} />
              <span className="font-bold text-sm">{t.roleStudent}</span>
              {role === 'student' && <div className="absolute top-2 right-2"><Check className="w-4 h-4 text-indigo-600"/></div>}
            </button>

            <button
              type="button"
              onClick={() => setRole('teacher')}
              className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-3 transition-all ${
                role === 'teacher' 
                  ? 'border-violet-600 bg-violet-50 text-violet-700 ring-2 ring-violet-200 ring-offset-2' 
                  : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <School className={`w-8 h-8 ${role === 'teacher' ? 'text-violet-600' : 'text-slate-400'}`} />
              <span className="font-bold text-sm">{t.roleTeacher}</span>
              {role === 'teacher' && <div className="absolute top-2 right-2"><Check className="w-4 h-4 text-violet-600"/></div>}
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl flex items-center gap-3 text-sm font-medium animate-shake">
              <AlertCircle className="w-5 h-5 shrink-0" />
              {error}
            </div>
          )}

          {/* FORMULARIO */}
          <form onSubmit={handleRegister} className="space-y-5">
            
            <div className="relative">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1 ml-1">{t.labelName}</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-medium text-slate-900"
                  placeholder={t.placeholderName}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
            </div>

            <div className="relative">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1 ml-1">{t.labelEmail}</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="email"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-medium text-slate-900"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="relative">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1 ml-1">{t.labelPass}</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="password"
                  required
                  minLength={6}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-medium text-slate-900"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {/* Mensaje solo para maestro */}
            {role === 'teacher' && t.note && (
               <div className="bg-violet-50 p-4 rounded-xl border border-violet-100 text-xs text-violet-700 leading-relaxed">
                  {t.note}
               </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full font-bold py-4 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                role === 'student' 
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200'
                  : 'bg-slate-900 hover:bg-slate-800 text-white shadow-slate-300'
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {t.loading}
                </>
              ) : (
                t.btnSubmit
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-slate-500">
            {t.footerText}{' '}
            <Link href="/login" className="font-bold text-indigo-600 hover:text-indigo-700">
              {t.footerLink}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}