'use client'

import { useState, useEffect, useRef } from 'react'
import { User, Mail, Camera, Save, Loader2, MapPin, Calendar, BookOpen, Languages, ArrowLeft } from 'lucide-react' // Calendar agregado
import { createClient } from '@/utils/supabase/client' 
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function ProfilePage() {
    const [supabase] = useState(() => createClient())
    const router = useRouter()
    
    // --- RASTREADOR DE CÓDIGO ---
    useEffect(() => {
        console.log("✅ CÓDIGO NUEVO CARGADO - USANDO TABLA PROFILES")
    }, [])
    // -----------------------------

    const [loading, setLoading] = useState(false)
    const [fetching, setFetching] = useState(true)
    const [uploading, setUploading] = useState(false)
    
    const [formData, setFormData] = useState({
        firstName: '', lastName: '', email: '', avatarUrl: '',
        age: '', educationLevel: '', nativeLanguage: '', bio: '', location: ''
    })
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        const getProfile = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) { router.push('/login'); return }
                
                setFormData(prev => ({ ...prev, email: user.email || '' }))

                // LEEMOS DE PROFILES
                const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()

                if (data) {
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
            } catch (error) { console.error(error) } finally { setFetching(false) }
        }
        getProfile()
    }, [supabase, router])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('No user')

            const updates = {
                id: user.id,
                first_name: formData.firstName,
                last_name: formData.lastName,
                age: formData.age ? parseInt(formData.age) : null,
                education_level: formData.educationLevel,
                native_language: formData.nativeLanguage,
                location: formData.location,
                bio: formData.bio,
                avatar_url: formData.avatarUrl,
                updated_at: new Date().toISOString(),
            }

            // --- AQUÍ ESTÁ LA CLAVE: .from('profiles') ---
            console.log("Intentando guardar en PROFILES...", updates)
            const { error } = await supabase.from('profiles').upsert(updates)
            
            if (error) throw error

            alert("✅ Perfil actualizado correctamente")
            router.refresh()
            
        } catch (error: any) {
            console.error('Error updating profile:', error)
            alert(`Error: ${error.message} (Revisa la consola F12)`)
        } finally {
            setLoading(false)
        }
    }

    // ... (El resto del JSX se mantiene igual, usa el de mi mensaje anterior o mantén el tuyo si ya incluiste los imports)
    // Para abreviar, asegúrate de que el return incluya el formulario completo
    if (fetching) return <div className="p-12"><Loader2 className="animate-spin"/></div>

    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-12 font-sans text-slate-900">
             {/* ... (Pega aquí el JSX del formulario que te di antes) ... */}
             <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow">
                <h1 className="text-2xl font-bold mb-6">Edit Profile</h1>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <input name="firstName" placeholder="First Name" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} className="border p-2 rounded w-full"/>
                        <input name="lastName" placeholder="Last Name" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} className="border p-2 rounded w-full"/>
                    </div>
                    {/* ... Resto de campos ... */}
                    <button type="submit" disabled={loading} className="bg-indigo-600 text-white px-6 py-2 rounded font-bold">{loading ? 'Saving...' : 'Save Changes'}</button>
                </form>
             </div>
        </div>
    )
}
