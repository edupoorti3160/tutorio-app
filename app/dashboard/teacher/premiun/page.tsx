'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { 
  Lock, Loader2, Clock, X, Zap, Brain, FileText, Printer, Copy, MessageSquareText, ShieldCheck, Wallet, CheckCircle2, Wand2, Save, Download
} from 'lucide-react'

// --- 1. AQUÍ DEFINIMOS EL PROMPT MAESTRO (CONSTANTE) ---
const ARCHITECT_PROMPT = `
# ROL Y OBJETIVO
Actúas como el "Arquitecto Pedagógico" de Tutorio. Tu misión es generar una Guía Docente exhaustiva y densa para una clase de Español (ELE) de 60-90 minutos.

IMPORTANTE: El profesor necesita material de sobra. La brevedad es un error. Tu salida debe ser extensa, rigurosa y masiva en ejemplos.

# VARIABLES DE CONFIGURACIÓN
* **ÁREA:** {INSERTAR_AREA_AQUI}
* **TEMA ESPECÍFICO:** {INSERTAR_TEMA_AQUI}
* **NIVEL OBJETIVO:** {INSERTAR_NIVEL_AQUI}

# ESTRUCTURA OBLIGATORIA DE RESPUESTA

## MÓDULO 1: FICHA TÉCNICA
* **Tema:** {INSERTAR_TEMA_AQUI}
* **Nivel:** {INSERTAR_NIVEL_AQUI}
* **Cronograma Sugerido:** Propuesta de tiempos para cubrir los 60 min.
* **Objetivos:** 3 metas medibles y ambiciosas.

## MÓDULO 2: EXPLICACIÓN TEÓRICA PROFUNDA
* Desarrollo académico detallado (mínimo 500 palabras).
* **Tablas:** Obligatorias y extensas.
* **Excepciones:** Lista detallada.
* **Matices Regionales:** Diferencias España vs. Latinoamérica.

## MÓDULO 3: BANCO MASIVO DE EJEMPLOS (25 ORACIONES)
* Genera **25 ejemplos** en total, divididos en 5 sub-categorías.
* Cada ejemplo incluye nota explicativa.
* Adaptados al nivel {INSERTAR_NIVEL_AQUI}.

## MÓDULO 4: DINÁMICAS DE CLASE (GUION)
* **Rompehielos (10 min):** Dinámica compleja.
* **Role-Play Extenso (20 min):** Guion largo Personaje A y B.

## MÓDULO 5: MATERIAL DE PRÁCTICA INTENSIVA
* **Ejercicio A (Mecánico):** 20 frases.
* **Ejercicio B (Analítico):** 10 situaciones.
* **Solucionario:** Al final.

## MÓDULO 6: LECTURA CULTURAL Y DEBATE
* **Texto:** 400-500 palabras denso y rico.
* **Comprensión:** 5 preguntas.
* **Debate:** 3 preguntas polémicas.

# INSTRUCCIONES DE CALIDAD
1. Prioriza cantidad y calidad.
2. Formato Markdown impecable.
3. Tono Experto.

GENERA LA GUÍA EXTENSA AHORA.
`

export default function EliteBoutiquePage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState<any[]>([])
  const [userProfile, setUserProfile] = useState<any>(null)
  const [purchasedIds, setPurchasedIds] = useState<string[]>([])
  const [selectedProduct, setSelectedProduct] = useState<any>(null)
  const [walletBalance, setWalletBalance] = useState(0)
  
  // --- 2. NUEVOS ESTADOS PARA LA CONFIGURACIÓN ---
  const [config, setConfig] = useState({
    area: 'Gramática',
    topic: '',
    level: 'B1'
  })

  // IA States
  const [generating, setGenerating] = useState(false)
  const [generatedLesson, setGeneratedLesson] = useState<string | null>(null)
  const [saving, setSaving] = useState(false) // <--- NUEVO ESTADO AGREGADO

  useEffect(() => {
    fetchEliteData()
  }, [])

  // Cuando se selecciona un producto, pre-llenamos el formulario con sus datos
  useEffect(() => {
    if (selectedProduct) {
      setConfig({
        area: selectedProduct.category || 'Gramática',
        topic: selectedProduct.title || '',
        level: selectedProduct.difficulty_level || 'B1'
      })
    }
  }, [selectedProduct])

  const fetchEliteData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [productsRes, purchasesRes] = await Promise.all([
        supabase.from('platform_resources').select('*').order('created_at', { ascending: false }),
        supabase.from('resource_purchases').select('resource_id').eq('teacher_id', user.id)
      ])

      setProducts(productsRes.data || [])
      setPurchasedIds(purchasesRes.data?.map((p: any) => p.resource_id) || [])

      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (profileData) setUserProfile(profileData)

      const { data: walletData } = await supabase.from('wallets').select('balance').eq('user_id', user.id)
      
      if (walletData && walletData.length > 0) {
        setWalletBalance(walletData[0].balance)
      } else {
        setWalletBalance(0)
      }

    } catch (e) { console.error(e) } finally { setLoading(false) }
  }

  // --- NUEVA FUNCIÓN: GUARDAR EN LA NUBE ---
  const handleSaveToLibrary = async () => {
    if (!generatedLesson || !userProfile) return
    setSaving(true)

    try {
      // Insertamos en la tabla 'learning_resources'
      const { error } = await supabase.from('learning_resources').insert({
        teacher_id: userProfile.id,
        title: `Clase IA: ${config.topic} (${config.level})`, 
        content_text: generatedLesson, 
        resource_type: 'grammar', 
        duration: '60 min',
        file_format: 'IA-DOC'
      })

      if (error) throw error

      alert("✅ ¡Clase guardada exitosamente en tu Biblioteca!")
      
    } catch (error: any) {
      alert("Error al guardar: " + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleSubscribe = async () => {
    const PRECIO = 19.99
    if (walletBalance < PRECIO) return alert(`Saldo insuficiente. Tienes $${walletBalance.toFixed(2)}`)
    setLoading(true)
    try {
      const { error } = await supabase.from('profiles').update({ 
        is_premium_member: true, 
        premium_until: new Date(Date.now() + 30*24*60*60*1000).toISOString() 
      }).eq('id', userProfile.id)
      if (error) throw error

      await supabase.from('wallets').update({ balance: walletBalance - PRECIO }).eq('user_id', userProfile.id)
      setWalletBalance(prev => prev - PRECIO)
      setUserProfile({ ...userProfile, is_premium_member: true })
      alert("¡Bienvenido al Nivel Élite!")
    } catch (e: any) { alert("Error: " + e.message) } finally { setLoading(false) }
  }

  const handlePurchase = async (product: any) => {
    if (walletBalance < product.price) return alert(`Saldo insuficiente. Tienes $${walletBalance.toFixed(2)}`)
    setLoading(true)
    try {
      const { error } = await supabase.from('resource_purchases').insert({
        teacher_id: userProfile.id,
        resource_id: product.id,
        price_paid: product.price
      })
      if (error) throw error
      await supabase.from('wallets').update({ balance: walletBalance - product.price }).eq('user_id', userProfile.id)
      setPurchasedIds([...purchasedIds, product.id])
      setWalletBalance(prev => prev - product.price)
      alert("Recurso desbloqueado")
    } catch (e: any) { alert("Error: " + e.message) } finally { setLoading(false) }
  }

  // --- 3. LÓGICA DE IA ACTUALIZADA (CON INYECCIÓN DE VARIABLES) ---
  const handleGenerateLesson = async () => {
    if (!selectedProduct) return
    setGenerating(true)
    setGeneratedLesson(null)

    const API_KEY = "AIzaSyC8A8c5ceMoIonb1xw4NoS6M756xvuISVI" // ⚠️ Cuidado: Expuesta en cliente
    const MODEL_NAME = "gemini-flash-lite-latest"

    // AQUÍ HACEMOS LA MAGIA: REEMPLAZAR LAS VARIABLES
    const finalPrompt = ARCHITECT_PROMPT
      .replace(/{INSERTAR_AREA_AQUI}/g, config.area)
      .replace(/{INSERTAR_TEMA_AQUI}/g, config.topic)
      .replace(/{INSERTAR_NIVEL_AQUI}/g, config.level)

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: finalPrompt }] }] })
      })
      
      const data = await response.json()
      
      if (data.error) {
         console.error("Error de Google:", data.error)
         throw new Error(`Error del Modelo: ${data.error.message}`)
      }
      
      if (data.candidates && data.candidates[0]) {
        setGeneratedLesson(data.candidates[0].content.parts[0].text)
      } else {
        throw new Error("La IA no devolvió contenido.")
      }
      
    } catch (error: any) { 
      alert(error.message) 
    } finally { 
      setGenerating(false) 
    }
  }

  const isAdmin = userProfile?.role === 'admin'
  const isPremium = userProfile?.is_premium_member && new Date(userProfile.premium_until) > new Date()
  const categories = Array.from(new Set(products.map(p => p.category || 'General')))

  if (loading && !products.length) return <div className="min-h-screen flex items-center justify-center bg-white"><Loader2 className="animate-spin text-indigo-600 w-12 h-12"/></div>

  return (
    <div className="min-h-screen bg-[#FDFDFF] font-sans pb-24 text-slate-900">
      <div className="bg-slate-900 text-white pt-16 pb-24 px-8 md:px-20 relative overflow-hidden mb-12">
        <div className="relative z-10 max-w-6xl flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-indigo-400 font-bold mb-4">
              <Brain size={20}/> <span className="text-xs uppercase tracking-widest text-white">Tecnología Tutorio</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black mb-6 leading-tight">Material Docente de Élite</h1>
            <div className="flex flex-wrap gap-4">
              {isAdmin ? (
                <div className="inline-flex items-center gap-2 bg-indigo-500/20 border border-indigo-400 px-4 py-2 rounded-xl text-indigo-300 font-bold text-sm">
                  <ShieldCheck size={18}/> MODO ADMINISTRADOR
                </div>
              ) : isPremium ? (
                <div className="inline-flex items-center gap-2 bg-green-500/20 border border-green-500/50 px-4 py-2 rounded-xl text-green-300 font-bold text-sm">
                  <CheckCircle2 size={18}/> MIEMBRO ÉLITE ACTIVO
                </div>
              ) : (
                <button onClick={handleSubscribe} className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-xl font-black flex items-center gap-2 shadow-lg transition-all active:scale-95 text-sm">
                  <Zap fill="currentColor" size={18}/> ACTIVAR PASE ($19.99)
                </button>
              )}
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-md border border-white/10 p-6 rounded-2xl min-w-[200px]">
             <div className="flex items-center gap-2 text-slate-400 mb-2">
                <Wallet size={16}/>
                <p className="text-[10px] font-black uppercase tracking-widest">TUS GANANCIAS</p>
             </div>
             <p className="text-4xl font-black text-white tracking-tight">${walletBalance.toFixed(2)}</p>
          </div>
        </div>
      </div>

      <div className="px-6 md:px-20 space-y-20">
        {categories.map(category => (
          <section key={category}>
            <h2 className="text-3xl font-black text-slate-900 mb-8 border-b border-slate-100 pb-4">{category}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {products.filter(p => p.category === category).map(product => {
                const hasAccess = isAdmin || isPremium || purchasedIds.includes(product.id)
                return (
                  <div key={product.id} onClick={() => {setSelectedProduct(product); setGeneratedLesson(null)}} className="bg-white rounded-[2rem] p-5 border border-slate-100 hover:shadow-2xl transition-all cursor-pointer group hover:-translate-y-1">
                    <div className="aspect-[4/3] rounded-[1.5rem] bg-indigo-50 mb-4 overflow-hidden relative shadow-inner">
                      {/* --- IMAGEN ORIGINAL PRESERVADA --- */}
                      <img src={`https://picsum.photos/seed/${product.id}/800/600`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="" />
                    </div>
                    <h3 className="text-lg font-black text-slate-900 mb-2 line-clamp-2">{product.title}</h3>
                    <div className="flex items-center justify-between mt-4">
                      <span className="text-slate-400 font-bold text-[10px] uppercase flex items-center gap-1"><Clock size={12}/> 60 MIN</span>
                      <span className={`font-black text-xs py-1 px-3 rounded-full ${hasAccess ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                        {hasAccess ? (isAdmin ? 'ADMIN' : 'ABIERTO') : `$${product.price}`}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        ))}
      </div>

      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-6xl rounded-[3rem] overflow-hidden flex flex-col md:flex-row h-[90vh]">
            
            {/* --- SIDEBAR DEL MODAL --- */}
            <div className="md:w-1/3 p-10 bg-slate-50 flex flex-col border-r border-slate-100 overflow-y-auto">
              <button onClick={() => setSelectedProduct(null)} className="self-start mb-8 font-black text-xs uppercase text-slate-400 flex items-center gap-2 hover:text-red-500 transition-colors"><X size={14}/> Cerrar</button>
              
              <h2 className="text-2xl font-black text-slate-900 mb-1">Configura tu Clase</h2>
              <p className="text-xs text-slate-400 mb-6">La IA generará material para 60 minutos.</p>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-6 space-y-4">
                
                {/* 1. INPUT ÁREA */}
                <div>
                  <label className="text-[10px] font-black text-indigo-600 uppercase mb-2 block">1. Área de Estudio</label>
                  <select 
                    value={config.area} 
                    onChange={(e) => setConfig({...config, area: e.target.value})}
                    className="w-full p-3 bg-slate-50 border-none rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-100"
                  >
                    <option value="Gramática">Gramática</option>
                    <option value="Vocabulario">Vocabulario</option>
                    <option value="Conversación">Conversación</option>
                    <option value="Cultura">Cultura</option>
                    <option value="Fonética">Fonética</option>
                  </select>
                </div>

                {/* 2. INPUT TEMA */}
                <div>
                  <label className="text-[10px] font-black text-indigo-600 uppercase mb-2 block">2. Tema Específico</label>
                  <input 
                    type="text" 
                    value={config.topic} 
                    onChange={(e) => setConfig({...config, topic: e.target.value})}
                    placeholder="Ej: Pretérito vs Imperfecto" 
                    className="w-full p-3 bg-slate-50 border-none rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-100"
                  />
                </div>

                {/* 3. INPUT NIVEL */}
                <div>
                  <label className="text-[10px] font-black text-indigo-600 uppercase mb-2 block">3. Nivel Objetivo</label>
                  <select 
                    value={config.level} 
                    onChange={(e) => setConfig({...config, level: e.target.value})}
                    className="w-full p-3 bg-slate-50 border-none rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-100"
                  >
                    <option value="A1">A1 - Acceso</option>
                    <option value="A2">A2 - Plataforma</option>
                    <option value="B1">B1 - Umbral</option>
                    <option value="B2">B2 - Avanzado</option>
                    <option value="C1">C1 - Dominio</option>
                    <option value="C2">C2 - Maestría</option>
                  </select>
                </div>

              </div>

              <div className="mt-auto">
                {(isAdmin || isPremium || purchasedIds.includes(selectedProduct.id)) ? (
                  <button onClick={handleGenerateLesson} disabled={generating} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-3 shadow-xl hover:bg-indigo-700 disabled:bg-slate-300 transition-all">
                    {generating ? <Loader2 className="animate-spin"/> : <Wand2 size={18}/>} 
                    {generating ? 'CONSTRUYENDO GUÍA...' : 'GENERAR CLASE MAESTRA'}
                  </button>
                ) : (
                  <button onClick={() => handlePurchase(selectedProduct)} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-3 hover:bg-black transition-all">
                    <Lock size={18}/> DESBLOQUEAR (${selectedProduct.price})
                  </button>
                )}
              </div>
            </div>

            {/* --- VISOR DE RESULTADOS --- */}
            <div className="md:w-2/3 p-12 bg-white overflow-y-auto">
              {!generatedLesson ? (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-30">
                  {generating ? (
                      <div className="text-center animate-pulse">
                         <Brain size={80} className="text-indigo-400 mx-auto mb-4"/>
                         <h3 className="text-xl font-black text-indigo-400">Diseñando Estructura Pedagógica...</h3>
                         <p className="text-sm">Redactando 25 ejemplos y material teórico.</p>
                      </div>
                   ) : (
                    <>
                      <FileText size={100} className="text-slate-300"/>
                      <h3 className="text-2xl font-black text-slate-300 uppercase mt-6">Visor Académico</h3>
                      <p className="text-slate-400 max-w-sm mt-2">Configura los parámetros a la izquierda y genera tu guía docente.</p>
                    </>
                  )}
                </div>
              ) : (
                <div className="prose prose-indigo max-w-none">
                  
                  {/* --- BARRA DE HERRAMIENTAS ACTUALIZADA --- */}
                  <div className="flex justify-between items-center mb-8 border-b pb-4 sticky top-0 bg-white z-10 flex-wrap gap-2">
                    <h4 className="font-black text-2xl text-slate-900">Guía Generada</h4>
                    
                    <div className="flex gap-2">
                        {/* COPIAR */}
                        <button onClick={() => navigator.clipboard.writeText(generatedLesson || "")} className="p-3 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors" title="Copiar"><Copy size={20}/></button>
                        
                        {/* PDF (IMPRIMIR) */}
                        <button onClick={() => window.print()} className="p-3 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors" title="Guardar PDF"><Download size={20}/></button>
                        
                        {/* GUARDAR EN BIBLIOTECA (EL IMPORTANTE) */}
                        <button 
                            onClick={handleSaveToLibrary} 
                            disabled={saving}
                            className="flex items-center gap-2 px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 font-bold transition-colors shadow-md"
                        >
                            {saving ? <Loader2 size={20} className="animate-spin"/> : <Save size={20}/>} 
                            {saving ? 'Guardando...' : 'Guardar en Biblioteca'}
                        </button>
                    </div>
                  </div>

                  <div className="whitespace-pre-wrap text-base leading-relaxed text-slate-700 font-medium">
                    {generatedLesson}
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  )
}