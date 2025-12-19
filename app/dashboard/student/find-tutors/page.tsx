'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Search, MapPin, Calendar, Clock, Loader2, CreditCard } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function FindTutorsPage() {
  const router = useRouter()
  const [supabase] = useState(() => createClient())
  
  const [loading, setLoading] = useState(true)
  const [tutors, setTutors] = useState<any[]>([])
  const [selectedTutor, setSelectedTutor] = useState<any>(null)
  const [availableSlots, setAvailableSlots] = useState<any[]>([])
  const [bookingLoading, setBookingLoading] = useState<string | null>(null)

  // 1. Fetch Tutors
  useEffect(() => {
    const fetchTutors = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('role', 'teacher')
        
        if (data) setTutors(data)
      } catch (error) {
        console.error("Error fetching tutors:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchTutors()
  }, [supabase])

  // 2. Fetch Schedule (CORREGIDO: Lee de 'availability')
  const handleViewSchedule = async (tutor: any) => {
    setSelectedTutor(tutor)
    setAvailableSlots([])
    
    // Obtenemos disponibilidad de la tabla NUEVA
    const { data } = await supabase
        .from('availability')
        .select('*')
        .eq('teacher_id', tutor.id)
        // Opcional: Filtrar fechas pasadas si quieres
        // .gte('day_of_week', new Date().toISOString().split('T')[0]) 
    
    if (data) {
        // Ordenamos por fecha y hora
        const sorted = data.sort((a:any, b:any) => {
            if (a.day_of_week !== b.day_of_week) return a.day_of_week.localeCompare(b.day_of_week)
            return a.start_time.localeCompare(b.start_time)
        })
        setAvailableSlots(sorted)
    }
  }

  // 3. Book Slot logic (CORREGIDO: Crea reserva nueva)
  const handleBookSlot = async (slot: any) => {
    if (!selectedTutor) return;
    setBookingLoading(slot.id)

    try {
        // A. Usuario Actual
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return router.push('/login')

        // B. Verificar Saldo
        const { data: wallet } = await supabase
            .from('wallets')
            .select('balance')
            .eq('user_id', user.id)
            .single()

        const studentBalance = Number(wallet?.balance || 0)
        const classPrice = Number(selectedTutor.hourly_rate || 15)

        if (studentBalance < classPrice) {
            alert(`⚠️ Saldo insuficiente.\nTu saldo: $${studentBalance}\nPrecio: $${classPrice}`)
            return
        }

        // C. Transacción: Descontar Saldo
        const { error: walletError } = await supabase
            .from('wallets')
            .update({ balance: studentBalance - classPrice })
            .eq('user_id', user.id)

        if (walletError) throw new Error("Error procesando pago.")

        // D. CREAR RESERVA (Insertar en 'bookings')
        const { error: bookingError } = await supabase
            .from('bookings')
            .insert({
                teacher_id: selectedTutor.id,
                student_id: user.id,
                date: slot.day_of_week, // Usamos la fecha del slot
                time: slot.start_time,  // Usamos la hora de inicio
                status: 'confirmed',
                topic: 'Clase Reservada',
                price_paid: classPrice,
                meeting_link: `room-${selectedTutor.id}-${Date.now()}` // Link único
            })

        if (bookingError) {
            // Rollback (Devolver dinero si falla)
            await supabase.from('wallets').update({ balance: studentBalance }).eq('user_id', user.id)
            throw new Error("Error creando reserva. Saldo devuelto.")
        }

        // E. (Opcional) Borrar el slot de disponibilidad para que nadie más lo tome
        await supabase.from('availability').delete().eq('id', slot.id)

        alert(`✅ ¡Clase reservada con éxito!\nSe descontaron $${classPrice.toFixed(2)}`)
        setSelectedTutor(null)
        router.push('/dashboard/student')

    } catch (error: any) {
        console.error(error)
        alert("Error: " + error.message)
    } finally {
        setBookingLoading(null)
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="w-8 h-8 animate-spin text-indigo-600"/></div>

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8 font-sans text-slate-900">
        
        <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900">Find a Tutor</h1>
            <p className="text-slate-500">Explore our list of experts and book your class today.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tutors.length === 0 ? (
                <div className="col-span-full text-center py-12 bg-white rounded-2xl border border-dashed border-slate-300">
                    <p className="text-slate-500">No tutors registered yet.</p>
                </div>
            ) : (
                tutors.map((tutor) => (
                    <div key={tutor.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col">
                        <div className="p-6 flex flex-col items-center text-center border-b border-slate-50">
                            <div className="w-24 h-24 bg-indigo-100 rounded-full mb-4 flex items-center justify-center text-3xl font-bold text-indigo-600 overflow-hidden">
                                {tutor.avatar_url ? <img src={tutor.avatar_url} alt="Avatar" className="w-full h-full object-cover"/> : tutor.first_name?.charAt(0)}
                            </div>
                            <h2 className="text-xl font-bold text-slate-900">{tutor.first_name} {tutor.last_name}</h2>
                            <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                                <MapPin className="w-3 h-3"/> {tutor.location || 'Online'}
                            </p>
                            
                            <div className="flex gap-2 mt-3 items-center justify-center flex-wrap">
                                <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full flex items-center gap-1">
                                    <CreditCard className="w-3 h-3"/> ${tutor.hourly_rate || 15}/h
                                </span>
                                <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-full capitalize">
                                    {tutor.specialty || 'General'}
                                </span>
                            </div>
                        </div>
                        
                        <div className="p-4 bg-slate-50 flex-1 flex items-end">
                            <button 
                                onClick={() => handleViewSchedule(tutor)}
                                className="w-full bg-white border border-slate-300 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 text-slate-700 font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                            >
                                <Calendar className="w-4 h-4"/> View Schedule
                            </button>
                        </div>
                    </div>
                ))
            )}
        </div>

        {/* MODAL: AVAILABLE SLOTS */}
        {selectedTutor && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                    <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
                        <div>
                            <h3 className="text-xl font-bold">Book with {selectedTutor.first_name}</h3>
                            <p className="text-slate-400 text-xs">Price per class: <span className="text-green-400 font-bold">${selectedTutor.hourly_rate || 15}</span></p>
                        </div>
                        <button onClick={() => setSelectedTutor(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors">✕</button>
                    </div>

                    <div className="p-6 overflow-y-auto">
                        {availableSlots.length === 0 ? (
                            <div className="text-center py-8">
                                <Calendar className="w-12 h-12 text-slate-200 mx-auto mb-3"/>
                                <p className="text-slate-600 font-bold">No slots available</p>
                                <p className="text-sm text-slate-400">This tutor hasn't posted any availability yet.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-3">
                                {availableSlots.map((slot) => (
                                    <div key={slot.id} className="border border-slate-200 rounded-xl p-4 flex items-center justify-between hover:border-indigo-500 hover:bg-indigo-50 transition-all group">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-indigo-100 text-indigo-700 p-2 rounded-lg">
                                                <Clock className="w-5 h-5"/>
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900">{slot.start_time.slice(0,5)} - {slot.end_time.slice(0,5)}</p>
                                                <p className="text-xs text-slate-500 uppercase font-bold">{slot.day_of_week}</p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => handleBookSlot(slot)}
                                            disabled={bookingLoading === slot.id}
                                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md transition-all disabled:opacity-50 flex items-center gap-2"
                                        >
                                            {bookingLoading === slot.id ? <Loader2 className="w-4 h-4 animate-spin"/> : "Book & Pay"}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}

    </div>
  )
}
