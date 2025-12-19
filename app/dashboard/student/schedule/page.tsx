import { Calendar, Clock, MapPin } from "lucide-react";

export default function SchedulePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Mi Horario de Clases</h1>
        <div className="text-sm text-gray-500">
          Próxima clase: Hoy, 4:00 PM
        </div>
      </div>

      {/* Tarjeta de ejemplo de clase */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="font-semibold text-lg text-indigo-600">Español Básico A1</h3>
            <p className="text-gray-500">Prof. Juan Pérez</p>
          </div>
          <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-medium">
            Confirmada
          </span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span>Lunes y Miércoles</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>16:00 - 17:00</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            <span>Google Meet</span>
          </div>
        </div>
      </div>

      <div className="text-center py-8 text-gray-400 text-sm">
        No tienes más clases programadas esta semana.
      </div>
    </div>
  )
}
