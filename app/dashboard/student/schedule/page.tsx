'use client'

import { useEffect, useState } from 'react'
import { Calendar, Clock, MapPin, ArrowLeft, Video, Loader2, AlertCircle } from "lucide-react"
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

export default function SchedulePage() {
  const router = useRouter()
  const [supabase] = useState(() => createClient())
  
  const [loading, setLoading] = useState(true)
  const [classes, setClasses] = useState<any[]>([])

  // --- CARGAR CLASES REALES ---
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          router.push('/login')
          return
        }

        // Obtener fecha de hoy para filtrar pasadas vs futuras
        const today = new Date().toISOString().split('T')[0]

        // Consulta a la tabla 'bookings'
        // Traemos también información del profesor (profiles)
        const { data, error } = await supabase
            .from('bookings')
            .select(`
                *,
                teacher:profiles!teacher_id(first_name, last_name)
            `)
            .eq('student_id', user.id)
            .gte('date', today) // Solo clases desde hoy en adelante
            .order('date', { ascending: true })
            .order('time', { ascending: true })

        if (error) throw error
        
        if (data) setClasses(data)

      } catch (error) {
        console.error("Error fetching schedule:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchClasses()
  }, [supabase, router])

  if (loading) {
      return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="w-8 h-8 animate-spin text-indigo-600"/></div>
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12 font-sans text-slate-900">
      
      {/* HEADER & BACK BUTTON */}
      <div className="max-w-4xl mx-auto mb-8">
          <Link href="/dashboard/student" className="inline-flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold mb-4 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Link>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
                <h1 className="text-3xl font-bold text-slate-900">My Class Schedule</h1>
                <p className="text-slate-500">Manage your upcoming lessons and sessions.</p>
            </div>
            
            {classes.length > 0 && (
                <div className="bg-white px-4 py-2 rounded-full border border-indigo-100 text-indigo-600 text-sm font-bold shadow-sm">
                    Next Class: {classes[0].date} at {classes[0].time}
                </div>
            )}
          </div>
      </div>

      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* LISTA DE CLASES */}
        {classes.length === 0 ? (
            // ESTADO VACÍO (EMPTY STATE)
            <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-slate-300 shadow-sm">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Calendar className="w-8 h-8 text-slate-300" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">No classes scheduled yet</h3>
                <p className="text-slate-500 mb-6 max-w-md mx-auto">You don't have any upcoming classes. Find a tutor and book your first lesson today!</p>
                <Link href="/dashboard/student/find-tutors" className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-md shadow-indigo-200">
                    Find a Tutor
                </Link>
            </div>
        ) : (
            // LISTA DE TARJETAS
            classes.map((cls) => (
                <div key={cls.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-all hover:border-indigo-200 group">
                    <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-bold text-xl border border-indigo-100">
                                {cls.teacher?.first_name?.charAt(0) || "T"}
                            </div>
                            <div>
                                <h3 className="font-bold text-xl text-slate-900">{cls.topic || "General Lesson"}</h3>
                                <p className="text-slate-500 font-medium">with Teacher {cls.teacher?.first_name} {cls.teacher?.last_name}</p>
                            </div>
                        </div>
                        
                        <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                            cls.status === 'confirmed' ? 'bg-green-100 text-green-700' : 
                            cls.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
                        }`}>
                            {cls.status === 'confirmed' ? 'Confirmed' : cls.status}
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="flex items-center gap-3 text-slate-600">
                            <Calendar className="w-5 h-5 text-indigo-400" />
                            <span className="font-medium">{cls.date}</span>
                        </div>
                        <div className="flex items-center gap-3 text-slate-600">
                            <Clock className="w-5 h-5 text-indigo-400" />
                            <span className="font-medium">{cls.time}</span>
                        </div>
                        <div className="flex items-center gap-3 text-slate-600">
                            <Video className="w-5 h-5 text-indigo-400" />
                            <span className="font-medium">Virtual Classroom</span>
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end">
                        {cls.status === 'confirmed' ? (
                            <Link href={`/room/${cls.meeting_link || 'demo-class'}`} className="w-full md:w-auto text-center bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2">
                                <Video className="w-4 h-4" /> Join Class
                            </Link>
                        ) : (
                            <button disabled className="w-full md:w-auto bg-slate-200 text-slate-400 font-bold py-3 px-8 rounded-xl cursor-not-allowed flex items-center justify-center gap-2">
                                <AlertCircle className="w-4 h-4" /> Waiting for confirmation
                            </button>
                        )}
                    </div>
                </div>
            ))
        )}

      </div>
    </div>
  )
}
