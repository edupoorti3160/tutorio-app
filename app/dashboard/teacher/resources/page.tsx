'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { FileText, Music, Video, Trash2, UploadCloud, Plus, Loader2, ChevronLeft, Clock, Tag, Download } from 'lucide-react'
import Link from 'next/link'

// Credenciales
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// --- INICIO DEL COMPONENTE ---
export default function TeacherResourcesPage() {
  const [supabase] = useState(() => createClient(supabaseUrl, supabaseAnonKey))
  
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [resources, setResources] = useState<any[]>([])
  const [isFormOpen, setIsFormOpen] = useState(false)

  // Formulario
  const [form, setForm] = useState({
      title: '',
      content_text: '',
      duration: '',
      resource_type: 'reading',
      file_format: 'PDF',
  })
  const [file, setFile] = useState<File | null>(null)

  // 1. Cargar Recursos
  const loadResources = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('learning_resources')
        .select('*')
        .eq('teacher_id', user.id)
        .order('id', { ascending: false })

      if (data) setResources(data)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadResources()
  }, [])

  // 2. Subir Archivo
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return alert('Por favor selecciona un archivo.')

    setUploading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No usuario')

      // A. Subir al Bucket 'materials'
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}/${Date.now()}.${fileExt}`
      
      const { error: uploadError } = await supabase.storage
        .from('materials') 
        .upload(fileName, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('materials')
        .getPublicUrl(fileName)

      // B. Guardar en BD (Usando file_url)
      const { error: dbError } = await supabase.from('learning_resources').insert({
          teacher_id: user.id,
          title: form.title,
          content_text: form.content_text,
          duration: form.duration,
          resource_type: form.resource_type,
          file_format: fileExt?.toUpperCase() || 'FILE',
          file_url: publicUrl 
      })

      if (dbError) throw dbError

      alert('Recurso creado exitosamente')
      setIsFormOpen(false)
      setForm({ title: '', content_text: '', duration: '', resource_type: 'reading', file_format: '' })
      setFile(null)
      loadResources()

    } catch (error: any) {
      console.error(error)
      alert('Error: ' + error.message)
    } finally {
      setUploading(false)
    }
  }

  // 3. Eliminar
  const handleDelete = async (id: number) => {
      if(!confirm('¿Estás seguro de eliminar este recurso?')) return;
      const { error } = await supabase.from('learning_resources').delete().eq('id', id)
      if (!error) loadResources()
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="w-8 h-8 animate-spin text-indigo-600"/></div>

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12 font-sans text-slate-900">
        <div className="max-w-6xl mx-auto">
            
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/teacher" className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                        <ChevronLeft className="w-6 h-6 text-slate-600"/>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">Biblioteca de Recursos</h1>
                        <p className="text-slate-500">Administra el material de aprendizaje.</p>
                    </div>
                </div>
                <button 
                    onClick={() => setIsFormOpen(!isFormOpen)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg flex items-center gap-2"
                >
                    {isFormOpen ? 'Cancelar' : <><Plus className="w-5 h-5"/> Nuevo Recurso</>}
                </button>
            </div>

            {/* Formulario */}
            {isFormOpen && (
                <div className="bg-white p-6 rounded-2xl shadow-lg border border-indigo-100 mb-8 animate-in fade-in slide-in-from-top-4">
                    <h2 className="font-bold text-lg mb-4 text-slate-800">Detalles del Material</h2>
                    <form onSubmit={handleUpload} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Título</label>
                                <input required type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"/>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase">Tipo</label>
                                    <select value={form.resource_type} onChange={e => setForm({...form, resource_type: e.target.value})} className="w-full p-3 border rounded-lg bg-white">
                                        <option value="reading">Lectura (Reading)</option>
                                        <option value="listening">Audio (Listening)</option>
                                        <option value="grammar">Gramática</option>
                                        <option value="vocabulary">Vocabulario</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase">Duración / Pág.</label>
                                    <input placeholder="Ej: 10 min" type="text" value={form.duration} onChange={e => setForm({...form, duration: e.target.value})} className="w-full p-3 border rounded-lg"/>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Descripción / Contenido</label>
                                <textarea rows={3} value={form.content_text} onChange={e => setForm({...form, content_text: e.target.value})} className="w-full p-3 border rounded-lg resize-none"/>
                            </div>
                        </div>

                        <div className="flex flex-col">
                            <label className="text-xs font-bold text-slate-500 uppercase mb-2">Archivo (PDF, MP3, IMG)</label>
                            <div className="flex-1 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center p-6 hover:bg-slate-50 relative cursor-pointer">
                                <input type="file" required onChange={e => setFile(e.target.files?.[0] || null)} className="absolute inset-0 opacity-0 cursor-pointer"/>
                                <UploadCloud className="w-10 h-10 text-indigo-400 mb-2"/>
                                <p className="text-sm font-medium text-slate-600">{file ? file.name : "Click para subir archivo"}</p>
                            </div>
                            <button type="submit" disabled={uploading} className="mt-4 w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl flex justify-center items-center gap-2">
                                {uploading ? <Loader2 className="w-5 h-5 animate-spin"/> : "Guardar en Biblioteca"}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Lista */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {resources.length === 0 ? (
                    <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200">
                        <p>No hay recursos. Sube el primero.</p>
                    </div>
                ) : (
                    resources.map((res) => (
                        <div key={res.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-300 transition-all relative group">
                            <div className="flex justify-between items-start mb-3">
                                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                                    res.resource_type === 'listening' ? 'bg-purple-100 text-purple-700' : 
                                    res.resource_type === 'grammar' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                                }`}>
                                    {res.resource_type}
                                </span>
                                <div className="flex items-center gap-1 text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-full">
                                    <Clock className="w-3 h-3"/> {res.duration || 'N/A'}
                                </div>
                            </div>

                            <h3 className="font-bold text-slate-800 text-lg mb-1 line-clamp-1">{res.title}</h3>
                            <p className="text-sm text-slate-500 mb-4 line-clamp-2">{res.content_text}</p>

                            <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                                <div className="flex items-center gap-2">
                                    {res.resource_type === 'listening' ? <Music className="w-4 h-4 text-slate-400"/> : <FileText className="w-4 h-4 text-slate-400"/>}
                                    <span className="text-xs font-bold text-slate-400">{res.file_format || 'FILE'}</span>
                                </div>
                                <div className="flex gap-2">
                                    <a href={res.file_url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 text-xs font-bold hover:underline flex items-center gap-1">
                                        <Download className="w-3 h-3"/> Descargar
                                    </a>
                                    <button onClick={() => handleDelete(res.id)} className="text-slate-300 hover:text-red-500">
                                        <Trash2 className="w-4 h-4"/>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

        </div>
    </div>
  )
}
// --- FIN DEL COMPONENTE: Asegúrate de que esta llave cierre todo ---