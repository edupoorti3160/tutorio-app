'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { UploadCloud, Plus, Video, Users, Calendar, MoreVertical, Loader2, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

// Credenciales
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export default function TeacherDashboard() {
  const [supabase] = useState(() => createClient(supabaseUrl, supabaseAnonKey))
  const router = useRouter()
  
  const [loading, setLoading] = useState(true)
  const [teacherName, setTeacherName] = useState('')
  const [todaySchedule, setTodaySchedule] = useState<any[]>([])
  const [incomingRequest, setIncomingRequest] = useState<any>(null)
  
  // Estado para estadísticas reales
  const [stats, setStats] = useState({ classes: 0, earnings: 0 })

  useEffect(() => {
    const initDashboard = async () => {
      try {
        // 1. Obtener usuario autenticado
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/login')
          return
        }

        // 2. Obtener Perfil
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', user.id)
          .single()
        
        if (profile) setTeacherName(`${profile.first_name} ${profile.last_name}`)

        // 3. Obtener AGENDA DE HOY (Real)
        const today = new Date().toISOString().split('T')[0]
        
        const { data: bookings } = await supabase
          .from('bookings') 
          .select(`
            id, 
            date, 
            time, 
            status,
            topic,
            student:profiles!student_id(first_name, last_name)
          `)
          .eq('teacher_id', user.id)
          .eq('date', today)
          .order('time', { ascending: true })

        // 4. Obtener SALDO REAL (Wallet)
        const { data: wallet } = await supabase
          .from('wallets')
          .select('balance')
          .eq('user_id', user.id)
          .single()

        if (bookings) {
            const formatted = bookings.map((b: any) => ({
                id: b.id,
                time: b.time, 
                student: b.student ? `${b.student.first_name} ${b.student.last_name}` : 'Estudiante',
                type: b.topic || 'Clase General',
                status: b.status
            }))
            setTodaySchedule(formatted)
            
            // ACTUALIZACIÓN: Usamos datos reales de conteo y saldo
            setStats({
                classes: bookings.length,
                earnings: wallet ? wallet.balance : 0 // Dinero real de la DB
            })
        }

        // 5. SUSCRIPCIÓN REALTIME (Solicitudes)
        const channel = supabase
          .channel('room-requests')
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'class_requests',
              filter: `teacher_id=eq.${user.id}`,
            },
            (payload: any) => {
              console.log('Nueva solicitud recibida:', payload)
              setIncomingRequest({
                  id: payload.new.id,
                  student: payload.new.student_name || 'Estudiante',
                  level: payload.new.level || 'General',
                  topic: payload.new.topic || 'Solicitud Inmediata',
                  roomId: payload.new.room_id
              })
            }
          )
          .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }

      } catch (error) {
        console.error("Error cargando dashboard:", error)
      } finally {
        setLoading(false)
      }
    }

    initDashboard()
  }, [supabase, router])

  if (loading) {
      return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="w-8 h-8 animate-spin text-indigo-600"/></div>
  }

  return (
    <div className="p-8 font-sans text-slate-900 bg-slate-50 min-h-screen">
      
      {/* HEADER */}
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Bienvenido, {teacherName || 'Profesor'}</h1>
          <p className="text-slate-500 mt-1">Resumen de tu día y acciones.</p>
        </div>
        <div className="flex items-center gap-3">
             <div className="text-right hidden md:block">
                <p className="text-sm font-bold text-slate-900">{teacherName}</p>
                <div className="flex items-center justify-end gap-1">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    <p className="text-xs text-green-600 font-bold">En Línea</p>
                </div>
             </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* COLUMNA PRINCIPAL */}
        <div className="lg:col-span-2 space-y-8">
            
            {/* TARJETA DE SOLICITUD EN VIVO */}
            {incomingRequest ? (
                <div className="bg-indigo-600 rounded-2xl p-6 text-white shadow-xl shadow-indigo-200 relative overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                        <Video className="w-40 h-40" />
                    </div>
                    
                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                </span>
                                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-3xl shadow-inner">🎓</div>
                            </div>
                            <div>
                                <h2 className="text-xl font-bold">¡Alumno Esperando!</h2>
                                <p className="text-indigo-100 flex items-center gap-2 mt-1">
                                    <Users className="w-4 h-4"/> Estudiante: <strong>{incomingRequest.student}</strong>
                                </p>
                                <p className="text-xs text-indigo-200 mt-1 uppercase tracking-wider font-bold bg-indigo-800/30 px-2 py-1 rounded inline-block">
                                    {incomingRequest.topic} • {incomingRequest.level}
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-3 w-full md:w-auto">
                            <button 
                                onClick={() => setIncomingRequest(null)}
                                className="px-4 py-3 rounded-xl border border-white/20 hover:bg-white/10 text-white font-bold transition-all text-sm"
                            >
                                Omitir
                            </button>
                            <button 
                                onClick={() => router.push(`/room/${incomingRequest.roomId}`)}
                                className="px-6 py-3 rounded-xl bg-white text-indigo-600 font-bold hover:bg-indigo-50 shadow-lg transition-all flex items-center gap-2 animate-pulse"
                            >
                                <Video className="w-5 h-5" />
                                ENTRAR A SALA
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-white p-6 rounded-2xl border border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                            <Video className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-700">Sin solicitudes en vivo</h3>
                            <p className="text-xs text-slate-500">Aparecerán aquí cuando un estudiante te llame.</p>
                        </div>
                    </div>
                    <div className="h-2 w-2 bg-slate-300 rounded-full"></div>
                </div>
            )}

            {/* GESTIÓN DE CONTENIDO - BOTÓN REPARADO */}
            <div>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-slate-800">Recursos de Clase</h2>
                    <Link href="/dashboard/teacher/resources" className="bg-white border border-slate-200 text-slate-600 hover:border-indigo-500 hover:text-indigo-600 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all">
                        <Plus className="w-4 h-4" /> Nuevo Recurso
                    </Link>
                </div>

                {/* AHORA TODA LA TARJETA ES UN LINK */}
                <Link href="/dashboard/teacher/resources">
                    <div className="bg-white border-2 border-dashed border-slate-300 rounded-2xl p-10 flex flex-col items-center justify-center text-center hover:border-indigo-400 hover:bg-indigo-50/10 transition-all cursor-pointer group">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform group-hover:bg-indigo-100">
                            <UploadCloud className="w-8 h-8 text-slate-400 group-hover:text-indigo-600" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">Sube material didáctico</h3>
                        <p className="text-slate-500 max-w-md mt-2 mb-6 text-sm">
                            Documentos PDF, Audios o Imágenes para usar en la pizarra.
                        </p>
                        {/* Botón visual (dentro del link) */}
                        <div className="bg-green-600 group-hover:bg-green-700 text-white px-8 py-3 rounded-full font-bold shadow-lg shadow-green-200 transition-all transform active:scale-95 inline-block">
                            IR A BIBLIOTECA
                        </div>
                    </div>
                </Link>
            </div>

        </div>

        {/* COLUMNA LATERAL - AGENDA REAL */}
        <div className="space-y-6">
            
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 h-full flex flex-col">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-indigo-600" />
                        Agenda de Hoy
                    </h3>
                    <Link href="/dashboard/teacher/schedule" className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1">
                        Ver Calendario <ArrowRight className="w-3 h-3"/>
                    </Link>
                </div>

                {todaySchedule.length > 0 ? (
                    <div className="space-y-4 overflow-y-auto max-h-[400px]">
                        {todaySchedule.map((cls) => (
                            <div key={cls.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 cursor-pointer group">
                                <div className="bg-indigo-50 text-indigo-700 font-bold text-xs px-2 py-1 rounded-md min-w-[65px] text-center flex items-center justify-center">
                                    {cls.time}
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{cls.student}</h4>
                                    <p className="text-xs text-slate-500">{cls.type}</p>
                                </div>
                                <button className="text-slate-300 hover:text-indigo-600">
                                    <MoreVertical className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                        <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-2">
                            <Calendar className="w-6 h-6 text-slate-300" />
                        </div>
                        <p className="text-sm font-bold text-slate-400">Sin clases para hoy</p>
                        <p className="text-xs text-slate-300">Relájate o prepara material.</p>
                        <Link href="/dashboard/teacher/schedule" className="mt-4 px-4 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50">
                            Configurar Horario
                        </Link>
                    </div>
                )}
            </div>

            {/* ESTADÍSTICAS REALES (Wallet) */}
            <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-lg">
                <h3 className="text-sm font-bold text-slate-400 uppercase mb-4">Saldo Disponible</h3>
                <div className="flex justify-between items-end">
                    <div>
                        <span className="text-3xl font-bold">{stats.classes}</span>
                        <span className="text-sm text-slate-400 ml-2">Clases Hoy</span>
                    </div>
                    <div className="text-right">
                        <span className="text-3xl font-bold text-green-400">${stats.earnings.toFixed(2)}</span>
                    </div>
                </div>
                <div className="mt-4 w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    {/* Barra de progreso decorativa */}
                    <div className="bg-indigo-500 h-full transition-all" style={{ width: '70%' }}></div>
                </div>
                <p className="text-xs text-slate-500 mt-2 text-right">Saldo total en billetera</p>
            </div>

        </div>

      </div>
    </div>
  )
}