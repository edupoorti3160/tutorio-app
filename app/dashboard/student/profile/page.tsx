'use client'

import { useState, useEffect, useRef } from 'react'
import { User, Mail, Camera, Save, Loader2, MapPin, BookOpen, Languages, ArrowLeft } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function ProfilePage() {
    const [supabase] = useState(() => createClient())
    const router = useRouter()
    
    // --- RASTREADOR DE CÓDIGO ---
    useEffect(() => {
        console.log("✅ CÓDIGO NUEVO CARGADO - USANDO RPC DINÁMICO (JSON)")
    }, [])
    // -----------------------------

    const [loading, setLoading] = useState(false)
    const [fetching, setFetching] = useState(true)
    const [uploading, setUploading] = useState(false)
    
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        avatarUrl: '',
        age: '',
        educationLevel: '',
        nativeLanguage: '',
        bio: '',
        location: ''
    })
    
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // 1. CARGAR DATOS
    useEffect(() => {
        const getProfile = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) { router.push('/login'); return }
                
                setFormData(prev => ({ ...prev, email: user.email || '' }))

                // Leemos los datos actuales
                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single()

                if (data) {
                    setFormData({
                        firstName: data.first_name || '',
                        lastName: data.last_name || '',
                        email: user.email || '',
                        avatarUrl: data.avatar_url || '',
                        age: data.age ? String(data.age) : '',
                        educationLevel: data.education_level || '',
                        nativeLanguage: data.native_language || '',
                        bio: data.bio || '',
                        location: data.location || '',
                    })
                    if (data.avatar_url) setAvatarPreview(data.avatar_url)
                }
            } catch (error) {
                console.error("Error cargando perfil:", error)
            } finally {
                setFetching(false)
            }
        }
        getProfile()
    }, [supabase, router])

    // 2. MANEJAR SUBIDA DE AVATAR (Opcional, si tienes Storage configurado)
    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setUploading(true)
            if (!event.target.files || event.target.files.length === 0) return

            const file = event.target.files[0]
            const fileExt = file.name.split('.').pop()
            const fileName = `${Math.random()}.${fileExt}`
            const filePath = `${fileName}`

            // Subir imagen al bucket 'avatars' (Asegúrate de tener este bucket creado)
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file)

            if (uploadError) throw uploadError

            // Obtener URL pública
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath)

            setFormData(prev => ({ ...prev, avatarUrl: publicUrl }))
            setAvatarPreview(publicUrl)

        } catch (error: any) {
            alert('Error subiendo imagen: ' + error.message)
        } finally {
            setUploading(false)
        }
    }

    // 3. GUARDAR DATOS (Usando la nueva función "update_profile_dynamic")
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('No user')

            // Preparamos el paquete de datos JSON
            const payload = {
                id: user.id,
                email: user.email,
                first_name: formData.firstName,
                last_name: formData.lastName,
                age: formData.age, // Se envía como string, SQL lo convierte
                education_level: formData.educationLevel,
                native_language: formData.nativeLanguage,
                bio: formData.bio,
                location: formData.location,
                avatar_url: formData.avatarUrl
            }

            // LLAMADA A LA FUNCIÓN UNIVERSAL
            // Enviamos todo en un solo argumento llamado 'payload'
            const { error } = await supabase.rpc('update_profile_dynamic', { payload })
            
            if (error) throw error

            alert("✅ Success! Your profile has been saved")
            router.refresh()
            
        } catch (error: any) {
            console.error('Error updating profile:', error)
            alert(`Error guardando: ${error.message}`)
        } finally {
            setLoading(false)
        }
    }

    if (fetching) return (
        <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600"/>
        </div>
    )

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900">
            <div className="max-w-3xl mx-auto">
                <Link href="/dashboard" className="inline-flex items-center text-slate-500 hover:text-slate-800 mb-6 transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Dashboard
                </Link>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    {/* Header Image Pattern */}
                    <div className="h-32 bg-gradient-to-r from-indigo-500 to-purple-600"></div>

                    <div className="px-8 pb-8">
                        {/* Avatar Section */}
                        <div className="relative -mt-16 mb-8 flex flex-col items-center md:items-start">
                            <div className="relative group">
                                <div className="w-32 h-32 rounded-full border-4 border-white bg-slate-200 overflow-hidden shadow-md">
                                    {avatarPreview ? (
                                        <img src={avatarPreview} alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                                            <User className="w-12 h-12" />
                                        </div>
                                    )}
                                </div>
                                <button 
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploading}
                                    className="absolute bottom-0 right-0 bg-indigo-600 text-white p-2 rounded-full shadow-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                                >
                                    {uploading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Camera className="w-4 h-4" />}
                                </button>
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    className="hidden" 
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                />
                            </div>
                            <div className="mt-4 text-center md:text-left">
                                <h1 className="text-2xl font-bold text-slate-900">{formData.firstName} {formData.lastName || 'Student'}</h1>
                                <p className="text-slate-500">{formData.email}</p>
                            </div>
                        </div>

                        {/* Formulario */}
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700">First Name</label>
                                    <input 
                                        type="text" 
                                        className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                                        value={formData.firstName}
                                        onChange={e => setFormData({...formData, firstName: e.target.value})}
                                        placeholder="Juan"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700">Last Name</label>
                                    <input 
                                        type="text" 
                                        className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                                        value={formData.lastName}
                                        onChange={e => setFormData({...formData, lastName: e.target.value})}
                                        placeholder="Perez"
                                    />
                                </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                        <Languages className="w-4 h-4 text-slate-400"/> Native Language
                                    </label>
                                    <select 
                                        className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                                        value={formData.nativeLanguage}
                                        onChange={e => setFormData({...formData, nativeLanguage: e.target.value})}
                                    >
                                        <option value="">Select Language</option>
                                        <option value="Spanish">Spanish</option>
                                        <option value="English">English</option>
                                        <option value="French">French</option>
                                        <option value="German">German</option>
                                        <option value="Portuguese">Portuguese</option>
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                        <BookOpen className="w-4 h-4 text-slate-400"/> Education Level
                                    </label>
                                    <select 
                                        className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                                        value={formData.educationLevel}
                                        onChange={e => setFormData({...formData, educationLevel: e.target.value})}
                                    >
                                        <option value="">Select Level</option>
                                        <option value="High School">High School</option>
                                        <option value="Undergraduate">Undergraduate</option>
                                        <option value="Graduate">Graduate</option>
                                        <option value="PhD">PhD</option>
                                        <option value="Self Taught">Self Taught</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700">Age</label>
                                    <input 
                                        type="number" 
                                        className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                        value={formData.age}
                                        onChange={e => setFormData({...formData, age: e.target.value})}
                                        placeholder="25"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                        <MapPin className="w-4 h-4 text-slate-400"/> Location
                                    </label>
                                    <input 
                                        type="text" 
                                        className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                        value={formData.location}
                                        onChange={e => setFormData({...formData, location: e.target.value})}
                                        placeholder="City, Country"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700">Bio</label>
                                <textarea 
                                    className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none h-32 resize-none"
                                    value={formData.bio}
                                    onChange={e => setFormData({...formData, bio: e.target.value})}
                                    placeholder="Tell us a bit about yourself..."
                                />
                            </div>

                            <div className="pt-4 border-t border-slate-100 flex justify-end">
                                <button 
                                    type="submit" 
                                    disabled={loading}
                                    className="flex items-center gap-2 bg-indigo-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-200"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-5 h-5" />
                                            Save Changes
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    )
}
