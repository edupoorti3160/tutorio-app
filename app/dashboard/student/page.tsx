'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { BookOpen, Video, CreditCard, LogOut, User, Loader2, Play, Search, MessageSquare, Bell, X, Zap, CheckCircle } from 'lucide-react'
import Link from 'next/link'

export default function StudentDashboard() {
  const router = useRouter()
  const [supabase] = useState(() => createClient())
  
  const [loading, setLoading] = useState(true)
  const [calling, setCalling] = useState(false)
  
  const [studentName, setStudentName] = useState("Student")
  const [userEmail, setUserEmail] = useState("")
  
  // ESTADOS REALES (Datos de BD)
  const [balance, setBalance] = useState(0.00)
  const [nextClass, setNextClass] = useState<any>(null)
  const [classesCount, setClassesCount] = useState(0)
  
  // UI States
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([]) 

  // --- 1. CARGA INICIAL DE DATOS ---
  useEffect(() => {
    const initDashboard = async () => {
      try {
        // Verificar Usuario
        const { data: { user }, error } = await supabase.auth.getUser()
        
        if (error || !user) {
          window.location.href = '/login'
          return
        }
        setUserEmail(user.email || "")

        // Obtener/Crear Perfil
        let { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', user.id)
            .single()
        
        if (!profile) {
            const { data: newProfile } = await supabase.from('profiles').insert({
                id: user.id,
                email: user.email,
                role: 'student',
                first_name: 'Nuevo',
                last_name: 'Usuario',
                created_at: new Date()
            }).select().single()
            profile = newProfile
        }

        if (profile) setStudentName(`${profile.first_name}`)

        // Obtener/Crear Billetera
        let { data: wallet } = await supabase
            .from('wallets')
            .select('balance')
            .eq('user_id', user.id)
            .single()
        
        if (!wallet) {
            const { data: newWallet } = await supabase.from('wallets').insert({
                user_id: user.id,
                balance: 0.00
            }).select().single()
            wallet = newWallet
        }
        
        if (wallet) setBalance(wallet.balance)

        // Obtener Clases
        const today = new Date().toISOString().split('T')[0]
        
        const { data: upcoming } = await supabase
            .from('bookings')
            .select('date, time, topic, meeting_link')
            .eq('student_id', user.id)
            .gte('date', today)
            .order('date', { ascending: true })
            .order('time', { ascending: true })
            .limit(1)
            .single()

        if (upcoming) setNextClass(upcoming)

        const { count } = await supabase
            .from('bookings')
            .select('*', { count: 'exact', head: true })
            .eq('student_id', user.id)
            .lt('date', today)

        setClassesCount(count || 0)

      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    initDashboard()
  }, [router, supabase])

  // --- 2. NUEVO: ESCUCHA EN TIEMPO REAL (NOTIFICACIONES) ---
  useEffect(() => {
    const setupRealtime = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const channel = supabase.channel('student-dashboard-realtime')

        channel
            // A) Escuchar cuando un profesor acepta la llamada instantánea
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'class_requests',
                    filter: `student_id=eq.${user.id}`
                },
                (payload) => {
                    // Si el estado cambia a 'accepted', notificamos
                    if (payload.new.status === 'accepted') {
                        const roomLink = payload.new.room_id
                        
                        // Agregamos notificación visual
                        setNotifications(prev => [{
                            id: Date.now(),
                            title: '¡Profesor Conectado!',
                            message: `Tu solicitud ha sido aceptada.`,
                            actionLabel: 'ENTRAR AHORA',
                            actionLink: roomLink,
                            type: 'urgent'
                        }, ...prev])
                        
                        // Abrimos el panel automáticamente para que lo vea
                        setIsNotificationsOpen(true)
                        
                        // Quitamos el estado de "Llamando" del botón
                        setCalling(false)
                        
                        // Opcional: Sonido de notificación
                        const audio = new Audio('/notification.mp3') // Asegúrate de tener un mp3 o quita esta línea
                        audio.play().catch(() => {}) 
                    }
                }
            )
            // B) Escuchar nuevas reservas confirmadas
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'bookings',
                    filter: `student_id=eq.${user.id}`
                },
                (payload) => {
                    if (payload.new.status === 'confirmed') {
                        setNotifications(prev => [{
                            id: Date.now(),
                            title: 'Nueva Clase Confirmada',
                            message: `Clase agendada para el ${payload.new.date} a las ${payload.new.time}`,
                            type: 'info'
                        }, ...prev])
                        setIsNotificationsOpen(true)
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }
    setupRealtime()
  }, [supabase])


  const handleLogout = async () => {
    await supabase.auth.signOut()
    document.cookie.split(";").forEach((c) => {
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });
    localStorage.clear()
    window.location.href = '/'
  }

  const goToClassroom = () => {
    if (nextClass && nextClass.meeting_link) {
        router.push(`/room/${nextClass.meeting_link}`)
    } else {
        router.push('/room/demo-class')
    }
  }

  const handleInstantCall = async () => {
    setCalling(true)
    try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: teachers } = await supabase.from('profiles').select('id, first_name').eq('role', 'teacher').limit(1)

        if (!teachers || teachers.length === 0) {
            alert("No hay profesores disponibles ahora mismo.")
            setCalling(false)
            return
        }
        
        const targetTeacher = teachers[0]

        // Usamos un ID de sala único
        const uniqueRoomId = `instant-${user.id}-${Date.now().toString().slice(-4)}`

        const { error } = await supabase.from('class_requests').insert({
            student_id: user.id,
            teacher_id: targetTeacher.id,
            student_name: studentName, 
            topic: "Instant Help",
            level: "General",
            room_id: uniqueRoomId,
            status: 'waiting' // Importante para el trigger
        })

        if (error) throw error
        
        // Feedback visual inmediato (No bloqueante)
        setNotifications(prev => [{
            id: Date.now(),
            title: 'Solicitud Enviada',
            message: `Esperando a ${targetTeacher.first_name}... Te avisaremos cuando acepte.`,
            type: 'info'
        }, ...prev])
        setIsNotificationsOpen(true)

    } catch (error: any) {
        alert("Error: " + error.message)
        setCalling(false)
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">
      
      {/* --- SIDEBAR --- */}
      <aside className="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col fixed h-full z-10">
        <div className="p-6 border-b border-slate-100">
          <span className="text-2xl font-bold text-indigo-600">Tutorio</span>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <Link href="/dashboard/student" className="w-full flex items-center gap-3 px-4 py-3 bg-indigo-50 text-indigo-700 rounded-xl font-medium text-left">
            <BookOpen className="w-5 h-5" /> My Classes
          </Link>
          <Link href="/dashboard/student/find-tutors" className="w-full flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 hover:text-indigo-600 rounded-xl font-medium text-left transition-colors">
            <Search className="w-5 h-5" /> Find Tutors
          </Link>
          <Link href="/dashboard/student/messages" className="w-full flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 hover:text-indigo-600 rounded-xl font-medium text-left transition-colors">
            <MessageSquare className="w-5 h-5" /> Messages
          </Link>
          <Link href="/dashboard/student/wallet" className="w-full flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 hover:text-indigo-600 rounded-xl font-medium text-left transition-colors">
            <CreditCard className="w-5 h-5" /> Wallet
          </Link>
          <Link href="/dashboard/student/profile" className="w-full flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 hover:text-indigo-600 rounded-xl font-medium text-left transition-colors">
            <User className="w-5 h-5" /> My Profile
          </Link>
        </nav>

        <div className="p-4 border-t border-slate-100">
          <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 w-full text-left text-red-600 hover:bg-red-50 rounded-xl font-medium transition-colors">
            <LogOut className="w-5 h-5" /> Log Out
          </button>
        </div>
      </aside>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 md:ml-64 p-8">
        
        {/* HEADER */}
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Hello, {studentName}</h1>
            <p className="text-slate-500">Welcome to your student dashboard.</p>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => setIsNotificationsOpen(true)} className="p-3 bg-white rounded-full text-slate-500 hover:text-indigo-600 shadow-md border border-slate-200 relative transition-transform hover:scale-105">
                <Bell className="w-5 h-5"/>
                {notifications.length > 0 && <div className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse"></div>} 
            </button>
            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold border shadow-sm">
              {studentName.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* --- STATS CARDS --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 transition-transform hover:-translate-y-1">
             <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Video className="w-6 h-6" /></div>
             <div><p className="text-sm text-slate-500 font-medium">Classes Taken</p><p className="text-2xl font-bold text-slate-900">{classesCount}</p></div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 transition-transform hover:-translate-y-1">
             <div className="p-3 bg-green-50 text-green-600 rounded-xl"><CreditCard className="w-6 h-6" /></div>
             <div><p className="text-sm text-slate-500 font-medium">Balance</p><p className="text-2xl font-bold text-slate-900">${balance.toFixed(2)}</p></div>
          </div>
          <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-6 rounded-2xl shadow-lg text-white relative overflow-hidden flex flex-col justify-center">
             <div className="relative z-10 flex items-center justify-between">
               <div><p className="font-bold text-lg leading-tight">Need Help Now?</p><p className="text-xs text-indigo-200 mt-1">Talk to a teacher instantly.</p></div>
               <button onClick={handleInstantCall} disabled={calling} className="bg-white text-indigo-700 p-3 rounded-full hover:bg-indigo-50 shadow-md transition-transform hover:scale-110 disabled:opacity-50 disabled:scale-100">
                  {calling ? <Loader2 className="w-5 h-5 animate-spin"/> : <Zap className="w-5 h-5 fill-current"/>}
               </button>
             </div>
             <div className="absolute -right-4 -bottom-8 opacity-20 rotate-12"><Video className="w-24 h-24" /></div>
          </div>
        </div>

        {/* --- MAIN SECTION: CLASSROOM --- */}
        <section className="mb-10">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Your Virtual Classroom</h2>
          <div className="bg-white rounded-2xl p-8 border border-slate-200 border-dashed text-center flex flex-col items-center justify-center gap-4">
            <div className="p-4 bg-slate-50 rounded-full"><Video className="w-8 h-8 text-slate-400" /></div>
            <div>
                {nextClass ? (
                    <>
                        <h3 className="text-lg font-bold text-slate-900">Your class is ready!</h3>
                        <p className="text-slate-500 max-w-sm mx-auto">Topic: {nextClass.topic}. Click below to join the teacher.</p>
                    </>
                ) : (
                    <>
                        <h3 className="text-lg font-medium text-slate-900">No classes scheduled right now</h3>
                        <p className="text-slate-500 max-w-sm mx-auto">Book a class or use the "Instant Help" button above.</p>
                    </>
                )}
            </div>
            <button onClick={goToClassroom} className={`mt-4 px-8 py-4 font-bold rounded-xl shadow-lg flex items-center gap-2 transition-transform hover:scale-105 ${nextClass ? "bg-green-600 hover:bg-green-700 text-white shadow-green-200 animate-pulse" : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200"}`}>
                <Play className="w-5 h-5 fill-current" /> {nextClass ? "JOIN CLASS NOW" : "TEST CLASSROOM NOW"}
            </button>
          </div>
        </section>

      </main>

      {/* --- NOTIFICATIONS MODAL (ACTUALIZADO) --- */}
      {isNotificationsOpen && (
          <div className="fixed inset-0 z-50 flex justify-end">
              <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setIsNotificationsOpen(false)}></div>
              <div className="relative w-full max-w-sm h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                  <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                      <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2"><Bell className="w-5 h-5 text-indigo-600"/> Notifications</h2>
                      <button onClick={() => setIsNotificationsOpen(false)} className="p-1 text-slate-500 hover:text-red-500 transition-colors"><X className="w-6 h-6"/></button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
                      {notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-48 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                            <Bell className="w-8 h-8 mb-2 opacity-50"/>
                            <p className="text-sm font-medium">No new alerts.</p>
                        </div>
                      ) : (
                          notifications.map((notif) => (
                              <div key={notif.id} className={`p-4 rounded-xl border shadow-sm transition-all hover:shadow-md ${notif.type === 'urgent' ? 'bg-green-50 border-green-200' : 'bg-white border-slate-200'}`}>
                                  <div className="flex justify-between items-start mb-1">
                                      <p className={`text-sm font-bold ${notif.type === 'urgent' ? 'text-green-800' : 'text-slate-800'}`}>{notif.title}</p>
                                      {notif.type === 'urgent' && <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>}
                                  </div>
                                  <p className="text-xs text-slate-600 mb-3 leading-relaxed">{notif.message}</p>
                                  
                                  {/* BOTÓN DE ACCIÓN DINÁMICO */}
                                  {notif.actionLabel && notif.actionLink && (
                                      <button 
                                        onClick={() => router.push(`/room/${notif.actionLink}`)}
                                        className="w-full py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-colors shadow-sm"
                                      >
                                          <Video className="w-3 h-3"/> {notif.actionLabel}
                                      </button>
                                  )}
                              </div>
                          ))
                      )}
                  </div>
                  
                  {notifications.length > 0 && (
                      <div className="p-4 border-t border-slate-200 bg-white">
                          <button onClick={() => setNotifications([])} className="w-full py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors">
                              Clear all notifications
                          </button>
                      </div>
                  )}
              </div>
          </div>
      )}
    </div>
  )
}