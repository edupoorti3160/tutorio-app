'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import { 
  UploadCloud, Video, Users, Calendar, 
  Loader2, Camera, Edit2, Save, X, DollarSign, BookOpen, User, LogOut, Wallet, ChevronRight, FileText, Trash2, MessageSquare, Clock, ShoppingBag
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function TeacherDashboard() {
  const [supabase] = useState(() => createClient())
  const router = useRouter()
  
  // Estados Generales
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  
  // Estados del Dashboard
  const [todaySchedule, setTodaySchedule] = useState<any[]>([])
  const [incomingRequest, setIncomingRequest] = useState<any>(null)
  const [stats, setStats] = useState({ classes: 0, earnings: 0 })

  // Estados Perfil
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [profileData, setProfileData] = useState({
    first_name: '', last_name: '', headline: '', biography: '',
    hourly_rate: 15, specialty: 'spanish', avatar_url: ''
  })

  // Estados Pagos
  const [showPayoutModal, setShowPayoutModal] = useState(false)
  const [payoutLoading, setPayoutLoading] = useState(false)
  const [payoutMethod, setPayoutMethod] = useState<'paypal' | 'crypto'>('paypal')
  const [payoutAddress, setPayoutAddress] = useState('')

  // Estados Recursos
  const [showResourceModal, setShowResourceModal] = useState(false)
  const [resources, setResources] = useState<any[]>([])
  const [uploadingResource, setUploadingResource] = useState(false)
  const resourceInputRef = useRef<HTMLInputElement>(null)

  // LOGOUT
  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.refresh()
    router.push('/')
  }

  // CARGAR DATOS
  useEffect(() => {
    const initDashboard = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push('/login'); return }
        setUser(user)

        // 1. Perfil
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        if (profile) {
          setProfileData({
            first_name: profile.first_name || '', last_name: profile.last_name || '',
            headline: profile.headline || '', biography: profile.biography || '',
            hourly_rate: profile.hourly_rate || 15, specialty: profile.specialty || 'spanish',
            avatar_url: profile.avatar_url || ''
          })
        }

        // 2. Agenda Hoy
        const today = new Date().toISOString().split('T')[0]
        const { data: bookings, count } = await supabase.from('bookings')
          .select(`id, date, time, status, topic, meeting_link, student:profiles!student_id(first_name, last_name)`, { count: 'exact' })
          .eq('teacher_id', user.id).gte('date', today).order('time', { ascending: true })

        // 3. Ganancias
        let totalEarnings = 0;
        const { data: completed } = await supabase.from('bookings').select('price_paid').eq('teacher_id', user.id).eq('status', 'completed')
        if (completed) totalEarnings = completed.reduce((sum, b) => sum + (b.price_paid || 0), 0)

        if (bookings) {
          const formatted = bookings.map((b: any) => ({
             id: b.id, time: b.time, student: b.student ? `${b.student.first_name} ${b.student.last_name}` : 'Disponible',
             type: b.topic || 'Clase', status: b.status, date: b.date, link: b.meeting_link || 'demo-room'
          })).filter((b: any) => b.date === today)
          setTodaySchedule(formatted)
          setStats({ classes: count || 0, earnings: totalEarnings })
        }

        // 4. Recursos del Maestro
        const { data: myResources } = await supabase.from('resources').select('*').eq('teacher_id', user.id).order('created_at', { ascending: false })
        if (myResources) setResources(myResources)

        // 5. Canal Realtime (SOLICITUDES DE LLAMADA)
        const channel = supabase.channel('room-requests')
          .on(
            'postgres_changes', 
            { event: 'INSERT', schema: 'public', table: 'class_requests', filter: `teacher_id=eq.${user.id}` }, 
            (payload: any) => {
                // Solo reaccionar si está en espera
                if(payload.new.status === 'waiting') {
                    setIncomingRequest({ 
                        id: payload.new.id, 
                        student: payload.new.student_name, 
                        roomId: payload.new.room_id 
                    })
                    // SONIDO DE ALERTA
                    try {
                        const audio = new Audio('/notification.mp3') // Asegúrate de tener este archivo en public/
                        audio.play().catch(e => console.log("Audio play failed interaction required"))
                    } catch(e) {}
                }
            }
          )
          .subscribe()

        return () => { supabase.removeChannel(channel) }

      } catch (error) { console.error(error) } finally { setLoading(false) }
    }
    initDashboard()
  }, [supabase, router])

  // --- CORRECCIÓN 1: ACEPTAR LLAMADA (HANDSHAKE) ---
  const handleAcceptCall = async () => {
      if(!incomingRequest) return
      
      try {
          // Actualizamos el estado a 'accepted' para que el alumno reciba la notificación
          await supabase
            .from('class_requests')
            .update({ status: 'accepted' })
            .eq('id', incomingRequest.id)

          // Redirigimos a la sala
          router.push(`/room/${incomingRequest.roomId}`)
      } catch (error) {
          console.error("Error aceptando llamada", error)
          // Fallback: ir a la sala de todos modos
          router.push(`/room/${incomingRequest.roomId}`)
      }
  }

  // --- FUNCIONES PERFIL ---
  const handleUpdateProfile = async () => {
    setSavingProfile(true)
    try {
      await supabase.from('profiles').update({ ...profileData, hourly_rate: Number(profileData.hourly_rate) }).eq('id', user.id)
      setIsEditingProfile(false)
    } catch (e) { alert('Error al guardar') } finally { setSavingProfile(false) }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return
    const file = e.target.files[0]
    const filePath = `${user.id}-${Math.random()}.${file.name.split('.').pop()}`
    setSavingProfile(true)
    try {
      await supabase.storage.from('avatars').upload(filePath, file)
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath)
      setProfileData(prev => ({ ...prev, avatar_url: publicUrl }))
      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id)
    } catch (e:any) { alert(e.message) } finally { setSavingProfile(false) }
  }

  // --- FUNCIONES PAGOS ---
  const handleRequestPayout = async () => {
    if(!payoutAddress) return alert("Ingresa una cuenta")
    setPayoutLoading(true)
    try {
      await supabase.from('payout_requests').insert({ teacher_id: user.id, amount: stats.earnings, method: payoutMethod, payment_address: payoutAddress })
      alert('Solicitud enviada'); setShowPayoutModal(false)
    } catch (e:any) { alert(e.message) } finally { setPayoutLoading(false) }
  }

  // --- CORRECCIÓN 2: BUCKET CORRECTO ('class-resources') ---
  const handleResourceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files?.[0]) return
      const file = e.target.files[0]
      const fileType = file.type.startsWith('image/') ? 'image' : 'pdf'
      const fileName = `${Date.now()}-${file.name}`
      
      setUploadingResource(true)
      try {
          // CORREGIDO: Usar 'class-resources' que es el bucket que creamos en SQL
          const { error: uploadError } = await supabase.storage.from('class-resources').upload(fileName, file)
          if(uploadError) throw uploadError

          const { data: { publicUrl } } = supabase.storage.from('class-resources').getPublicUrl(fileName)

          const { data: newResource, error: dbError } = await supabase.from('resources').insert({
              teacher_id: user.id,
              title: file.name,
              file_url: publicUrl,
              file_type: fileType
          }).select().single()

          if(dbError) throw dbError

          setResources([newResource, ...resources])

      } catch (error: any) {
          alert("Error subiendo recurso: " + error.message)
      } finally {
          setUploadingResource(false)
      }
  }

  const handleDeleteResource = async (id: string, url: string) => {
      if(!confirm("¿Borrar este archivo?")) return
      try {
          await supabase.from('resources').delete().eq('id', id)
          setResources(resources.filter(r => r.id !== id))
      } catch (e) { alert("Error eliminando") }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="w-8 h-8 animate-spin text-indigo-600"/></div>

  return (
    <div className="p-4 md:p-8 font-sans text-slate-900 bg-slate-50 min-h-screen relative">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Hola, {profileData.first_name}</h1>
          <p className="text-slate-500 mt-1">Gestiona tus clases y tu perfil profesional desde aquí.</p>
        </div>
        <div className="flex items-center gap-4">
           <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 rounded-full border border-red-200 text-red-600 font-bold text-sm hover:bg-red-50 transition-colors">
             <LogOut className="w-4 h-4" /> Cerrar Sesión
           </button>
           <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm border border-slate-200">
             <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
             <p className="text-xs text-green-700 font-bold uppercase">Perfil Visible</p>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* COLUMNA PRINCIPAL */}
        <div className="lg:col-span-2 space-y-8">
            
            {/* ALERTAS (CORREGIDO: Botón conectado a handleAcceptCall) */}
            {incomingRequest && (
                <div className="bg-indigo-600 rounded-2xl p-6 text-white shadow-xl flex flex-col sm:flex-row justify-between items-center gap-4 animate-in slide-in-from-top duration-300">
                    <div className="flex items-center gap-4">
                         <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-2xl animate-bounce">🎓</div>
                         <div>
                            <h2 className="font-bold text-lg">¡Alumno Esperando!</h2>
                            <p className="text-indigo-100">El estudiante {incomingRequest.student} solicita una clase ahora.</p>
                         </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setIncomingRequest(null)} className="px-4 py-2 text-indigo-200 hover:text-white text-sm font-bold">Ignorar</button>
                        <button onClick={handleAcceptCall} className="px-6 py-3 bg-white text-indigo-600 font-bold rounded-xl shadow-lg hover:bg-indigo-50 flex items-center gap-2 transition-transform hover:scale-105">
                            <Video className="w-5 h-5" /> ACEPTAR Y ENTRAR
                        </button>
                    </div>
                </div>
            )}

            {/* PERFIL */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative">
                <div className="h-24 bg-gradient-to-r from-indigo-500 to-violet-600"></div>
                <div className="px-8 pb-8">
                    <div className="flex justify-between items-start -mt-10 mb-6">
                         <div className="relative group">
                            <div className="w-24 h-24 rounded-full border-4 border-white bg-slate-200 overflow-hidden">
                                {profileData.avatar_url ? <img src={profileData.avatar_url} className="w-full h-full object-cover"/> : <User className="w-full h-full p-4 text-slate-400"/>}
                            </div>
                            <button onClick={() => fileInputRef.current?.click()} className="absolute bottom-0 right-0 bg-slate-900 text-white p-2 rounded-full"><Camera className="w-4 h-4"/></button>
                            <input type="file" hidden ref={fileInputRef} accept="image/*" onChange={handleImageUpload} />
                         </div>
                         <button onClick={isEditingProfile ? handleUpdateProfile : () => setIsEditingProfile(true)} className="mt-12 px-4 py-2 rounded-lg border border-slate-200 font-bold text-sm hover:bg-slate-50 flex gap-2">
                            {isEditingProfile ? <Save className="w-4 h-4"/> : <Edit2 className="w-4 h-4"/>} {isEditingProfile ? 'Guardar' : 'Editar'}
                         </button>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase">Titular</label>
                                {isEditingProfile ? <input type="text" className="w-full p-2 border rounded font-bold" value={profileData.headline} onChange={e=>setProfileData({...profileData, headline: e.target.value})}/> : <h2 className="text-xl font-bold">{profileData.headline || 'Sin titular'}</h2>}
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase">Bio</label>
                                {isEditingProfile ? <textarea className="w-full p-2 border rounded" rows={3} value={profileData.biography} onChange={e=>setProfileData({...profileData, biography: e.target.value})}/> : <p className="text-sm text-slate-600">{profileData.biography || 'Sin biografía'}</p>}
                            </div>
                        </div>
                        <div className="space-y-4 bg-slate-50 p-6 rounded-xl">
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase">Tarifa</label>
                                {isEditingProfile ? <input type="number" className="w-full p-2 border rounded font-bold" value={profileData.hourly_rate} onChange={e=>setProfileData({...profileData, hourly_rate: Number(e.target.value)})}/> : <div className="text-2xl font-black text-green-600">${profileData.hourly_rate}</div>}
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase">Idioma</label>
                                {isEditingProfile ? <select className="w-full p-2 border rounded" value={profileData.specialty} onChange={e=>setProfileData({...profileData, specialty: e.target.value})}><option value="spanish">Español</option><option value="english">Inglés</option></select> : <div className="font-bold text-indigo-700 capitalize">{profileData.specialty}</div>}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. GESTIÓN DE RECURSOS */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 flex justify-between items-center">
                <div>
                      <h3 className="font-bold text-slate-900 text-lg">Biblioteca de Recursos</h3>
                      <p className="text-slate-500 text-sm">{resources.length} archivos disponibles para tus clases.</p>
                </div>
                <button 
                    onClick={() => setShowResourceModal(true)} 
                    className="bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all shadow-md"
                >
                    <UploadCloud className="w-4 h-4" /> Gestionar Archivos
                </button>
            </div>
        </div>

        {/* SIDEBAR */}
        <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col max-h-[400px]">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-6"><Calendar className="w-5 h-5 text-indigo-600" /> Agenda Hoy</h3>
                {todaySchedule.map(cls => (
                    <div key={cls.id} className="flex items-center gap-3 p-3 border-b border-slate-50">
                        <div className="bg-indigo-50 text-indigo-700 font-bold text-xs px-2 py-1 rounded">{cls.time}</div>
                        <div className="flex-1"><h4 className="text-sm font-bold">{cls.student}</h4></div>
                        <Link href={`/room/${cls.link}`}><Video className="w-8 h-8 p-2 bg-green-100 text-green-600 rounded-full hover:bg-green-600 hover:text-white"/></Link>
                    </div>
                ))}
                {todaySchedule.length === 0 && <p className="text-center text-sm text-slate-400">Sin clases hoy</p>}
            </div>
            
            {/* BOTONES DEL SIDEBAR */}
            <div className="space-y-3">
                <Link href="/dashboard/teacher/schedule" className="block bg-white rounded-2xl shadow-sm border border-slate-200 p-4 hover:shadow-md transition-shadow group">
                    <div className="flex items-center gap-4">
                        <div className="bg-purple-100 text-purple-600 p-3 rounded-xl group-hover:bg-purple-600 group-hover:text-white transition-colors">
                            <Clock className="w-6 h-6"/>
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-800">Mi Horario</h4>
                            <p className="text-xs text-slate-500">Configura tu disponibilidad</p>
                        </div>
                        <ChevronRight className="ml-auto w-5 h-5 text-slate-300 group-hover:text-slate-500"/>
                    </div>
                </Link>

                {/* BOTÓN: PROBAR EQUIPO */}
                <Link href="/room/test-setup" className="block bg-white rounded-2xl shadow-sm border border-slate-200 p-4 hover:shadow-md transition-shadow group">
                    <div className="flex items-center gap-4">
                        <div className="bg-cyan-100 text-cyan-600 p-3 rounded-xl group-hover:bg-cyan-600 group-hover:text-white transition-colors">
                            <Camera className="w-6 h-6"/>
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-800">Probar Equipo</h4>
                            <p className="text-xs text-slate-500">Test de Cámara y Micrófono</p>
                        </div>
                        <ChevronRight className="ml-auto w-5 h-5 text-slate-300 group-hover:text-slate-500"/>
                    </div>
                </Link>

                <Link href="/dashboard/teacher/messages" className="block bg-white rounded-2xl shadow-sm border border-slate-200 p-4 hover:shadow-md transition-shadow group">
                    <div className="flex items-center gap-4">
                        <div className="bg-blue-100 text-blue-600 p-3 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                            <MessageSquare className="w-6 h-6"/>
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-800">Mensajes</h4>
                            <p className="text-xs text-slate-500">Chatea con tus alumnos</p>
                        </div>
                        <ChevronRight className="ml-auto w-5 h-5 text-slate-300 group-hover:text-slate-500"/>
                    </div>
                </Link>

                {/* BOTÓN: TIENDA PREMIUM */}
                <Link href="/dashboard/teacher/premium" className="block bg-white rounded-2xl shadow-sm border border-slate-200 p-4 hover:shadow-md transition-shadow group">
                    <div className="flex items-center gap-4">
                        <div className="bg-amber-100 text-amber-600 p-3 rounded-xl group-hover:bg-amber-600 group-hover:text-white transition-colors">
                            <ShoppingBag className="w-6 h-6"/>
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-800">Tienda Premium</h4>
                            <p className="text-xs text-slate-500">Mejora tus clases</p>
                        </div>
                        <ChevronRight className="ml-auto w-5 h-5 text-slate-300 group-hover:text-slate-500"/>
                    </div>
                </Link>
            </div>

            {/* MODULO DE SALDO COMPACTO (REDISEÑADO) */}
            <div className="bg-slate-900 rounded-2xl p-4 text-white shadow-lg relative overflow-hidden">
                <div className="relative z-10 flex items-center justify-between gap-2">
                    <div className="flex flex-col">
                        <h3 className="text-[10px] font-bold text-slate-400 uppercase leading-none mb-1">Saldo Total</h3>
                        <div className="text-2xl font-black leading-none">${stats.earnings.toFixed(2)}</div>
                    </div>
                    <button onClick={() => setShowPayoutModal(true)} className="bg-indigo-600 hover:bg-indigo-500 font-bold px-4 py-2 rounded-lg text-xs flex items-center gap-1 transition-colors">
                        Cobrar <ChevronRight className="w-3 h-3"/>
                    </button>
                </div>
            </div>
        </div>
      </div>

      {/* MODAL DE RECURSOS */}
      {showResourceModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full h-[600px] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                  <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                      <h3 className="font-bold text-lg text-slate-900">Mis Recursos de Clase</h3>
                      <button onClick={() => setShowResourceModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                      {resources.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center text-slate-400">
                              <UploadCloud className="w-16 h-16 mb-4 opacity-20"/>
                              <p>No has subido archivos aún.</p>
                          </div>
                      ) : (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                              {resources.map(file => (
                                  <div key={file.id} className="bg-white p-3 rounded-xl border border-slate-200 hover:shadow-md transition-shadow group relative">
                                      <div className="h-24 bg-slate-100 rounded-lg flex items-center justify-center mb-3 text-slate-400">
                                          {file.file_type === 'image' ? <Camera className="w-8 h-8"/> : <FileText className="w-8 h-8"/>}
                                      </div>
                                      <p className="text-xs font-bold text-slate-700 truncate" title={file.title}>{file.title}</p>
                                      <p className="text-[10px] text-slate-400">{new Date(file.created_at).toLocaleDateString()}</p>
                                      <button onClick={() => handleDeleteResource(file.id, file.file_url)} className="absolute top-2 right-2 bg-white text-red-500 p-1.5 rounded-md shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50">
                                          <Trash2 className="w-3 h-3"/>
                                      </button>
                                  </div>
                              ))}
                          </div>
                      )}
                  </div>

                  <div className="p-4 border-t border-slate-200 bg-white">
                      <input 
                          type="file" 
                          hidden 
                          ref={resourceInputRef} 
                          accept="image/*,application/pdf"
                          onChange={handleResourceUpload}
                      />
                      <button 
                          onClick={() => resourceInputRef.current?.click()} 
                          disabled={uploadingResource}
                          className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
                      >
                          {uploadingResource ? <Loader2 className="w-5 h-5 animate-spin"/> : <UploadCloud className="w-5 h-5"/>}
                          {uploadingResource ? 'Subiendo...' : 'Subir Nuevo Archivo (PDF o Imagen)'}
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* MODAL DE PAGOS */}
      {showPayoutModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
                  <div className="flex justify-between mb-4">
                      <h3 className="font-bold text-lg">Retirar Fondos</h3>
                      <button onClick={() => setShowPayoutModal(false)}><X className="w-5 h-5"/></button>
                  </div>
                  <p className="text-3xl font-black mb-6 text-center">${stats.earnings.toFixed(2)}</p>
                  
                  <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-2">
                            <button onClick={() => setPayoutMethod('paypal')} className={`p-2 border rounded ${payoutMethod==='paypal'?'bg-indigo-50 border-indigo-600':''}`}>PayPal</button>
                            <button onClick={() => setPayoutMethod('crypto')} className={`p-2 border rounded ${payoutMethod==='crypto'?'bg-indigo-50 border-indigo-600':''}`}>Crypto</button>
                      </div>
                      <input type="text" placeholder={payoutMethod==='paypal' ? 'Email PayPal' : 'Wallet Address'} className="w-full p-3 border rounded" value={payoutAddress} onChange={e=>setPayoutAddress(e.target.value)}/>
                      <button onClick={handleRequestPayout} disabled={payoutLoading} className="w-full bg-indigo-600 text-white font-bold py-3 rounded">
                          {payoutLoading ? 'Procesando...' : 'Confirmar'}
                      </button>
                  </div>
              </div>
          </div>
      )}

    </div>
  )
}
