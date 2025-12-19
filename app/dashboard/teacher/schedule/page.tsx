'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ChevronLeft, ChevronRight, Plus, Trash2, Clock, Calendar as CalIcon, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'

export default function TeacherSchedule() {
  const router = useRouter()
  const [supabase] = useState(() => createClient())
  
  // Estado del Calendario
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedSlots, setSelectedSlots] = useState<any[]>([])
  
  // Estado para Nuevo Rango
  const [rangeStart, setRangeStart] = useState("09:00")
  const [rangeEnd, setRangeEnd] = useState("13:00")
  
  // Carga de datos
  const [existingSlots, setExistingSlots] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // 1. CARGAR DISPONIBILIDAD
  useEffect(() => {
      fetchAvailability()
  }, [currentDate])

  const fetchAvailability = async () => {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')

      // Cargar TODOS los slots del maestro
      // (Podríamos filtrar por mes, pero para simplificar cargamos todo el calendario futuro)
      const { data } = await supabase
          .from('availability')
          .select('*')
          .eq('teacher_id', user.id)
      
      if (data) setExistingSlots(data)
      setLoading(false)
  }

  // --- LÓGICA DEL CALENDARIO ---
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate()
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay()

  const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))

  const handleDayClick = (day: number) => {
      const clickedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
      setSelectedDate(clickedDate)
      
      // Filtrar slots de este día específico
      // Nota: Guardamos "day_of_week" como la fecha completa YYYY-MM-DD para simplificar la recurrencia manual por ahora
      const dateStr = clickedDate.toISOString().split('T')[0]
      const slots = existingSlots.filter(s => s.day_of_week === dateStr).sort((a,b) => a.start_time.localeCompare(b.start_time))
      setSelectedSlots(slots)
  }

  // --- GESTIÓN DE RANGOS ---
  const addTimeRange = async () => {
      if (!selectedDate) return
      
      const startHour = parseInt(rangeStart.split(':')[0])
      const endHour = parseInt(rangeEnd.split(':')[0])

      if (startHour >= endHour) {
          alert("La hora de fin debe ser posterior a la de inicio.")
          return
      }

      setSaving(true)
      
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if(!user) throw new Error("No hay usuario")

        // Usaremos el campo 'day_of_week' para guardar la FECHA EXACTA (YYYY-MM-DD)
        // Esto permite que el estudiante busque por fecha específica
        const year = selectedDate.getFullYear()
        const month = String(selectedDate.getMonth() + 1).padStart(2, '0')
        const day = String(selectedDate.getDate()).padStart(2, '0')
        const dateStr = `${year}-${month}-${day}`
        
        const newSlots = []

        // Generar bloques de 1 hora
        for (let h = startHour; h < endHour; h++) {
            const timeStrStart = `${h.toString().padStart(2, '0')}:00:00`
            const timeStrEnd = `${(h+1).toString().padStart(2, '0')}:00:00`
            
            // Verificar si ya existe
            const exists = selectedSlots.some(s => s.start_time.startsWith(timeStrStart.slice(0,5)))
            
            if (!exists) {
                newSlots.push({
                    teacher_id: user.id,
                    day_of_week: dateStr, // Guardamos la fecha
                    start_time: timeStrStart,
                    end_time: timeStrEnd,
                    is_recurring: false // Por ahora son slots únicos por fecha
                })
            }
        }

        if (newSlots.length > 0) {
            // INSERTAR EN TABLA AVAILABILITY (NO BOOKINGS)
            const { data, error } = await supabase.from('availability').insert(newSlots).select()
            
            if (error) throw error

            if (data) {
                const updatedGlobal = [...existingSlots, ...data]
                setExistingSlots(updatedGlobal)
                setSelectedSlots([...selectedSlots, ...data].sort((a,b) => a.start_time.localeCompare(b.start_time)))
            }
        } else {
            alert("Esas horas ya están agregadas.")
        }

      } catch (error: any) {
          alert("Error al guardar: " + error.message)
      } finally {
          setSaving(false)
      }
  }

  const deleteSlot = async (id: string) => {
      if(!confirm("¿Eliminar este horario?")) return
      setSaving(true)
      // BORRAR DE AVAILABILITY
      const { error } = await supabase.from('availability').delete().eq('id', id)
      
      if (error) {
           alert("Error al eliminar: " + error.message)
      } else {
           setExistingSlots(existingSlots.filter(s => s.id !== id))
           setSelectedSlots(selectedSlots.filter(s => s.id !== id))
      }
      setSaving(false)
  }

  // --- RENDERIZADO DEL CALENDARIO ---
  const renderCalendarDays = () => {
      const days = []
      const daysInMonth = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth())
      const startDay = getFirstDayOfMonth(currentDate.getFullYear(), currentDate.getMonth()) 

      for (let i = 0; i < startDay; i++) days.push(<div key={`empty-${i}`} className="h-24 bg-slate-50/50 border border-slate-100"></div>)

      for (let day = 1; day <= daysInMonth; day++) {
          const dateStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toISOString().split('T')[0]
          // Filtrar slots de este día
          const daySlots = existingSlots.filter(s => s.day_of_week === dateStr)
          const isSelected = selectedDate?.getDate() === day && selectedDate?.getMonth() === currentDate.getMonth()
          
          days.push(
              <div key={day} onClick={() => handleDayClick(day)} className={`h-24 border border-slate-100 p-2 cursor-pointer hover:bg-indigo-50 relative ${isSelected ? 'bg-indigo-50 ring-2 ring-indigo-500 z-10' : 'bg-white'}`}>
                  <span className={`text-sm font-bold w-6 h-6 flex items-center justify-center rounded-full ${isSelected ? 'bg-indigo-600 text-white' : 'text-slate-700'}`}>{day}</span>
                  <div className="mt-2 space-y-1 overflow-hidden h-12">
                      {daySlots.slice(0, 3).map(slot => (
                          <div key={slot.id} className="text-[10px] px-1 rounded truncate bg-indigo-100 text-indigo-600 font-bold">
                             {slot.start_time.slice(0,5)}
                          </div>
                      ))}
                      {daySlots.length > 3 && <div className="text-[10px] text-slate-400">+{daySlots.length - 3}</div>}
                  </div>
              </div>
          )
      }
      return days
  }

  const hoursOptions = [...Array(24)].map((_, i) => `${i.toString().padStart(2,'0')}:00`)

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col md:flex-row">
      
      {/* 1. CALENDARIO */}
      <div className="flex-1 p-6 md:p-8 overflow-y-auto">
          <div className="flex items-center gap-4 mb-6">
            <Link 
                href="/dashboard/teacher" 
                className="p-2 bg-white rounded-lg hover:bg-slate-100 border border-slate-200 text-slate-600 transition-colors flex items-center justify-center"
            >
                <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-2xl font-bold">Mi Disponibilidad</h1>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 flex justify-between border-b border-slate-200">
                  <h2 className="text-xl font-bold capitalize flex items-center gap-2"><CalIcon className="w-5 h-5 text-indigo-600"/> {currentDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' })}</h2>
                  <div className="flex gap-2">
                      <button onClick={handlePrevMonth} className="p-2 hover:bg-slate-100 rounded"><ChevronLeft/></button>
                      <button onClick={handleNextMonth} className="p-2 hover:bg-slate-100 rounded"><ChevronRight/></button>
                  </div>
              </div>
              <div className="grid grid-cols-7 bg-slate-50 border-b text-center py-2 font-bold text-xs text-slate-400 uppercase">
                  {['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'].map(d => <div key={d}>{d}</div>)}
              </div>
              <div className="grid grid-cols-7 bg-slate-200 gap-[1px]">{loading ? <div className="col-span-7 h-64 flex justify-center items-center bg-white"><Loader2 className="animate-spin"/></div> : renderCalendarDays()}</div>
          </div>
      </div>

      {/* 2. PANEL LATERAL (RANGOS) */}
      <div className="w-full md:w-96 bg-white border-l border-slate-200 p-6 flex flex-col shadow-xl z-20">
          {!selectedDate ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-center"><CalIcon className="w-16 h-16 mb-4 opacity-20"/><p>Selecciona un día para gestionar.</p></div>
          ) : (
              <>
                  <div className="mb-6 pb-6 border-b border-slate-100">
                      <h3 className="text-2xl font-bold text-slate-800 capitalize">{selectedDate.toLocaleDateString('es-ES', {weekday: 'long', day: 'numeric', month: 'long'})}</h3>
                      <p className="text-sm text-slate-500">{selectedSlots.length} horas disponibles</p>
                  </div>

                  {/* FORMULARIO DE RANGO */}
                  <div className="bg-slate-50 p-4 rounded-xl mb-6 border border-slate-200">
                      <p className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2"><Clock className="w-3 h-3"/> Agregar Bloque de Horas</p>
                      <div className="flex items-center gap-2 mb-4">
                          <select value={rangeStart} onChange={e=>setRangeStart(e.target.value)} className="bg-white border p-2 rounded w-full font-bold text-sm">{hoursOptions.map(h=><option key={h} value={h}>{h}</option>)}</select>
                          <span className="text-slate-400">-</span>
                          <select value={rangeEnd} onChange={e=>setRangeEnd(e.target.value)} className="bg-white border p-2 rounded w-full font-bold text-sm">{hoursOptions.map(h=><option key={h} value={h}>{h}</option>)}</select>
                      </div>
                      <button onClick={addTimeRange} disabled={saving} className="w-full bg-indigo-600 text-white font-bold py-3 rounded-lg shadow-md hover:bg-indigo-700 disabled:opacity-50 flex justify-center items-center gap-2">
                          {saving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Plus className="w-4 h-4"/>} Guardar Disponibilidad
                      </button>
                  </div>

                  {/* LISTA DE SLOTS */}
                  <div className="flex-1 overflow-y-auto space-y-2">
                      {selectedSlots.map((slot) => (
                          <div key={slot.id} className="p-3 rounded-lg border flex justify-between items-center bg-white border-slate-100 hover:border-indigo-200">
                              <span className="font-bold text-slate-700">{slot.start_time.slice(0,5)} - {slot.end_time.slice(0,5)}</span>
                              <button onClick={() => deleteSlot(slot.id)} className="text-slate-300 hover:text-red-500"><Trash2 className="w-4 h-4"/></button>
                          </div>
                      ))}
                      {selectedSlots.length === 0 && <p className="text-center text-xs text-slate-400 mt-4">No hay horas para este día.</p>}
                  </div>
              </>
          )}
      </div>
    </div>
  )
}
