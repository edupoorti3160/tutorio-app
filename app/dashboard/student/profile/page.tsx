'use client'

import { useState, useEffect, useRef } from 'react'
import { User, Mail, Camera, Save, Loader2, MapPin, Calendar, BookOpen, Languages, ArrowLeft } from 'lucide-react'
import { createClient } from '@/utils/supabase/client' 
import Link from 'next/link'
import { useRouter } from 'next/navigation'

// Estado inicial VACÍO
const EMPTY_FORM = {
    firstName: '',
    lastName: '',
    email: '',
    avatarUrl: '',
    age: '',
    educationLevel: '',
    nativeLanguage: '',
    bio: '',
    location: '',
}

export default function ProfilePage() {
    const [supabase] = useState(() => createClient())
    const router = useRouter()
    
    const [loading, setLoading] = useState(false) // Para guardar
    const [fetching, setFetching] = useState(true) // Para cargar
    const [uploading, setUploading] = useState(false)
    
    const [formData, setFormData] = useState(EMPTY_FORM)
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // --- 1. CARGAR DATOS AL INICIAR ---
    useEffect(() => {
        const getProfile = async () => {
            try {
                setFetching(true)
                
                // 1. Obtener usuario autenticado
                const { data: { user }, error: authError } = await supabase.auth.getUser()
                
                if (authError || !user) {
                    router.push('/login')
                    return
                }
                
                setFormData(prev => ({ ...prev, email: user.email || '' }))

                // 2. Buscar perfil existente en 'profiles'
                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single()

                if (data && !error) {
                    setFormData({
                        firstName: data.first_name || '',
                        lastName: data.last_name || '',
                        email: user.email || '',
                        avatarUrl: data.avatar_url || '',
                        age: data.age || '',
                        educationLevel: data.education_level || '',
                        nativeLanguage: data.native_language || '',
                        bio: data.bio || '',
                        location: data.location || '',
                    })
                    if (data.avatar_url) setAvatarPreview(data.avatar_url)
                }
                
            } catch (error) {
                console.error('Error loading user data:', error)
            } finally {
                setFetching(false)
            }
        }

        getProfile()
    }, [supabase, router])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    // --- LOGICA DE AVATAR ---
    const handleAvatarClick = () => {
        fileInputRef.current?.click()
    }

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Preview inmediato
        const objectUrl = URL.createObjectURL(file)
        setAvatarPreview(objectUrl)
        setUploading(true)

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('No user session')

            // Nombre único para evitar caché
            const fileExt = file.name.split('.').pop()
            const fileName = `${user.id}-${Date.now()}.${fileExt}`

            // Subida REAL
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(fileName, file)

            if (uploadError) throw uploadError

            // Obtener URL pública
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(fileName)

            setFormData(prev => ({ ...prev, avatarUrl: publicUrl }))
            
            // Guardar URL inmediatamente en BD
            await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id)
            
        } catch (error: any) {
            console.error('Error uploading avatar:', error)
            alert('Error al subir imagen: ' + error.message)
        } finally {
            setUploading(false)
        }
    }

    // --- GUARDAR PERFIL ---
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const { data: { user }, error: authError } = await supabase.auth.getUser()
            
            if (authError || !user) {
                throw new Error('Sesión expirada. Por favor recarga la página.')
            }

            const updates = {
                id: user.id, // ID obligatorio para el upsert
                first_name: formData.firstName,
                last_name: formData.lastName,
                age: formData.age ? parseInt(formData.age) : null, // Asegurar tipo número si es int en BD
                education_level: formData.educationLevel,
                native_language: formData.nativeLanguage,
                location: formData.location,
                bio: formData.bio,
                avatar_url: formData.avatarUrl,
                updated_at: new Date().toISOString(),
            }

            // Upsert maneja Insert o Update automáticamente
            const { error } = await supabase.from('profiles').upsert(updates)
            
            if (error) throw error

            alert("✅ Perfil actualizado correctamente")
            router.refresh()
            
        } catch (error: any) {
            console.error('Error updating profile:', error)
            alert(`Error al guardar: ${error.message}`)
        } finally {
            setLoading(false)
        }
    }

    if (fetching) {
        return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="w-8 h-8 animate-spin text-indigo-600"/></div>
    }

    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-12 font-sans text-slate-900">
            <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
                
                {/* Header with Gradient */}
                <div className="h-32 bg-gradient-to-r from-indigo-600 to-purple-600 relative">
                    <Link href="/dashboard/student" className="absolute top-4 left-4 text-white/80 hover:text-white flex items-center gap-2 font-bold z-10 bg-black/20 px-3 py-1 rounded-full backdrop-blur-sm transition-colors">
                        <ArrowLeft size={16}/> Dashboard
                    </Link>

                    <div className="absolute -bottom-16 left-8">
                        <div className="relative group cursor-pointer" onClick={handleAvatarClick} title="Change Profile Picture">
                            {/* Avatar Circle */}
                            <div className="w-32 h-32 rounded-full border-4 border-white bg-slate-200 overflow-hidden relative shadow-md">
                                {avatarPreview ? (
                                    <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400">
                                        <User className="w-16 h-16" />
                                    </div>
                                )}
                                
                                {uploading && (
                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
                                        <Loader2 className="w-8 h-8 text-white animate-spin" />
                                    </div>
                                )}
                            </div>

                            {/* Camera Icon Overlay */}
                            <div className="absolute bottom-0 right-0 bg-indigo-600 text-white p-2 rounded-full shadow-lg border-2 border-white group-hover:scale-110 transition-transform">
                                <Camera className="w-5 h-5" />
                            </div>
                            
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                className="hidden" 
                                accept="image/*"
                                onChange={handleFileChange}
                            />
                        </div>
                    </div>
                </div>

                {/* Form Content */}
                <div className="pt-20 px-8 pb-8">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">
                                {formData.firstName || 'New Student'} {formData.lastName}
                            </h1>
                            <p className="text-slate-500">Student Profile</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        {/* SECTION 1: PERSONAL INFO */}
                        <div className="col-span-1 md:col-span-2">
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b pb-2">Personal Information</h3>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">First Name</label>
                            <div className="relative">
                                <User className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                                <input type="text" name="firstName" placeholder="Enter your first name" value={formData.firstName} onChange={handleChange} className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Last Name</label>
                            <div className="relative">
                                <User className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                                <input type="text" name="lastName" placeholder="Enter your last name" value={formData.lastName} onChange={handleChange} className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                                <input type="email" name="email" value={formData.email} disabled className="w-full pl-10 pr-4 py-2.5 border border-slate-200 bg-slate-50 rounded-lg text-slate-500 cursor-not-allowed" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Age</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                                <input type="number" name="age" placeholder="e.g., 24" value={formData.age} onChange={handleChange} className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                            </div>
                        </div>

                         <div className="col-span-1 md:col-span-2 mt-4">
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b pb-2">Academic Profile</h3>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Education Level</label>
                            <div className="relative">
                                <BookOpen className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                                <select name="educationLevel" value={formData.educationLevel} onChange={handleChange} className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white">
                                    <option value="">Select Level...</option>
                                    <option value="HighSchool">High School</option>
                                    <option value="Bachelor">Bachelor's Degree</option>
                                    <option value="Master">Master's Degree</option>
                                    <option value="PhD">PhD / Doctorate</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Native Language</label>
                            <div className="relative">
                                <Languages className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                                <select name="nativeLanguage" value={formData.nativeLanguage} onChange={handleChange} className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white">
                                    <option value="">Select Language...</option>
                                    <option value="English">English</option>
                                    <option value="Spanish">Spanish</option>
                                    <option value="Portuguese">Portuguese</option>
                                    <option value="French">French</option>
                                    <option value="German">German</option>
                                    <option value="Mandarin">Mandarin</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Location</label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                                <input type="text" name="location" value={formData.location} onChange={handleChange} placeholder="City, Country" className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                            </div>
                        </div>

                        <div className="col-span-1 md:col-span-2 space-y-2">
                            <label className="text-sm font-medium text-slate-700">About Me & Learning Goals</label>
                            <textarea name="bio" rows={4} value={formData.bio} onChange={handleChange} placeholder="Tell us a bit about yourself and why you want to learn..." className="w-full p-4 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none" />
                        </div>

                        <div className="col-span-1 md:col-span-2 flex justify-end mt-4">
                            <button type="submit" disabled={loading} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg shadow-indigo-200 disabled:opacity-70">
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                {loading ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>

                    </form>
                </div>
            </div>
        </div>
    )
}
