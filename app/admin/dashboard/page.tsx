'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { 
  Users, DollarSign, Settings, BarChart3, LogOut, 
  Search, Trash2, Edit, Save, CheckCircle, XCircle, Loader2,
  ShoppingBag, UploadCloud, Plus
} from 'lucide-react'

const ADMIN_EMAIL = "azureusvip@proton.me"

// --- TIPOS BASADOS EN TU SCHEMA ---
interface Profile {
  id: string
  email: string | null
  first_name: string | null
  last_name: string | null
  role: 'student' | 'teacher' | 'admin'
}

interface DepositRequest {
  id: string
  student_id: string
  amount: number
  method: string
  reference_id: string | null
  status: string
  created_at: string
  student_email?: string
}

interface PayoutRequest {
  id: string
  teacher_id: string
  amount: number
  method: string
  payment_address: string
  status: string
  created_at: string
  teacher_email?: string
}

// NUEVO TIPO PARA PRODUCTOS
interface PlatformResource {
  id: string
  title: string
  description: string
  price: number
  category: string
  download_url: string
  created_at: string
}

export default function AdminDashboard() {
  const router = useRouter()
  const [supabase] = useState(() => createClient())
  const [loading, setLoading] = useState(true)
  
  // Agregamos 'products' a las secciones
  const [section, setSection] = useState<'overview' | 'users' | 'finance' | 'products' | 'settings'>('overview')
  const [activeTab, setActiveTab] = useState<'deposits' | 'payouts'>('deposits')
  
  // DATOS GLOBALES
  const [users, setUsers] = useState<Profile[]>([])
  const [deposits, setDeposits] = useState<DepositRequest[]>([])
  const [payouts, setPayouts] = useState<PayoutRequest[]>([])
  const [products, setProducts] = useState<PlatformResource[]>([]) // Nuevo estado
  
  const [config, setConfig] = useState({ platformFee: 15 }) 
  const [processingId, setProcessingId] = useState<string | null>(null)

  // Estados para nuevo producto (Formulario)
  const [isUploading, setIsUploading] = useState(false)
  const productFileRef = useRef<HTMLInputElement>(null)
  const [newProduct, setNewProduct] = useState({
    title: '', description: '', price: 0, category: 'Gramática'
  })

  useEffect(() => {
    checkAuthAndLoad()
  }, [])

  const checkAuthAndLoad = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || user.email !== ADMIN_EMAIL) {
      router.push('/login')
      return
    }
    await loadAllData()
    setLoading(false)
  }

  const loadAllData = async () => {
    // 1. Cargar Usuarios
    const { data: allUsers } = await supabase.from('profiles').select('*')
    if (allUsers) setUsers(allUsers as any)

    // 2. Cargar Finanzas
    const { data: deps } = await supabase.from('deposit_requests').select('*').order('created_at', { ascending: false })
    if (deps) {
        const enrichedDeposits = deps.map((d: any) => ({
            ...d,
            student_email: allUsers?.find(u => u.id === d.student_id)?.email || 'Desconocido'
        }))
        setDeposits(enrichedDeposits)
    }

    const { data: pays } = await supabase.from('payout_requests').select('*').order('created_at', { ascending: false })
    if (pays) {
         const enrichedPayouts = pays.map((p: any) => ({
            ...p,
            teacher_email: allUsers?.find(u => u.id === p.teacher_id)?.email || 'Desconocido'
        }))
        setPayouts(enrichedPayouts)
    }

    // 3. Cargar Productos (NUEVO)
    const { data: prods } = await supabase.from('platform_resources').select('*').order('created_at', { ascending: false })
    if (prods) setProducts(prods)
  }

  // --- ACCIONES DE FINANZAS ---
  const handleApproveDeposit = async (deposit: DepositRequest) => {
      if(!confirm(`¿Aprobar $${deposit.amount}?`)) return
      setProcessingId(deposit.id)
      try {
          let { data: wallet } = await supabase.from('wallets').select('*').eq('user_id', deposit.student_id).single()
          
          if (!wallet) {
             const { data: newWallet, error } = await supabase.from('wallets').insert({ user_id: deposit.student_id, balance: 0 }).select().single()
             if (error) throw error
             wallet = newWallet
          }

          await supabase.from('wallets').update({ balance: (wallet.balance || 0) + deposit.amount }).eq('user_id', deposit.student_id)
          await supabase.from('deposit_requests').update({ status: 'approved' }).eq('id', deposit.id)
          
          await loadAllData()
      } catch (e: any) { alert("Error: " + e.message) } finally { setProcessingId(null) }
  }

  const handleMarkPaid = async (payout: PayoutRequest) => {
      if(!confirm("¿Confirmar pago enviado?")) return
      setProcessingId(payout.id)
      try {
          await supabase.from('payout_requests').update({ status: 'paid', processed_at: new Date() }).eq('id', payout.id)
          await loadAllData()
      } catch (e: any) { alert("Error: " + e.message) } finally { setProcessingId(null) }
  }

  // --- ACCIONES DE PRODUCTOS (NUEVO) ---
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!productFileRef.current?.files?.[0]) return alert("Falta el archivo")
    
    setIsUploading(true)
    try {
      const file = productFileRef.current.files[0]
      const fileName = `premium/${Date.now()}-${file.name}`
      
      // 1. Subir a Storage ('class-resources')
      const { error: uploadError } = await supabase.storage.from('class-resources').upload(fileName, file)
      if (uploadError) throw uploadError
      
      const { data: { publicUrl } } = supabase.storage.from('class-resources').getPublicUrl(fileName)

      // 2. Guardar en BD
      const { error: dbError } = await supabase.from('platform_resources').insert({
        title: newProduct.title,
        description: newProduct.description,
        price: newProduct.price,
        category: newProduct.category,
        download_url: publicUrl,
        preview_url: 'https://via.placeholder.com/150?text=Recurso' 
      })

      if (dbError) throw dbError

      alert("Producto creado exitosamente")
      setNewProduct({ title: '', description: '', price: 0, category: 'Gramática' })
      if(productFileRef.current) productFileRef.current.value = ''
      loadAllData() // Recargar lista

    } catch (error: any) {
      console.error(error)
      alert("Error creando producto: " + error.message)
    } finally {
      setIsUploading(false)
    }
  }

  const handleDeleteProduct = async (id: string) => {
    if(!confirm("¿Borrar este producto de la tienda?")) return
    await supabase.from('platform_resources').delete().eq('id', id)
    setProducts(products.filter(p => p.id !== id))
  }

  // --- COMPONENTES DE SECCIÓN ---

  const OverviewSection = () => {
    const totalDeposited = deposits.filter(d => d.status === 'approved').reduce((acc, curr) => acc + curr.amount, 0)
    const platformFees = totalDeposited * (config.platformFee / 100)

    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500">
          <h3 className="text-gray-500 text-sm font-bold uppercase">Usuarios</h3>
          <p className="text-3xl font-bold">{users.length}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-500">
          <h3 className="text-gray-500 text-sm font-bold uppercase">Ingresos Totales</h3>
          <p className="text-3xl font-bold">${totalDeposited.toFixed(2)}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-purple-500">
          <h3 className="text-gray-500 text-sm font-bold uppercase">Ganancias Estimadas</h3>
          <p className="text-3xl font-bold">${platformFees.toFixed(2)}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-amber-500">
          <h3 className="text-gray-500 text-sm font-bold uppercase">Productos en Venta</h3>
          <p className="text-3xl font-bold">{products.length}</p>
        </div>
      </div>
    )
  }

  const UsersSection = () => (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-4 border-b flex justify-between items-center">
        <h3 className="font-bold text-lg">Directorio</h3>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400"/>
          <input type="text" placeholder="Buscar..." className="pl-9 pr-4 py-2 border rounded bg-slate-50 text-sm w-64"/>
        </div>
      </div>
      <table className="w-full text-sm text-left">
        <thead className="bg-slate-50 text-gray-500 font-bold uppercase text-xs">
          <tr><th className="p-4">Nombre</th><th className="p-4">Email</th><th className="p-4">Rol</th><th className="p-4 text-right">Acción</th></tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id} className="border-t hover:bg-slate-50">
              <td className="p-4 font-bold">{u.first_name || 'Sin nombre'} {u.last_name || ''}</td>
              <td className="p-4 text-gray-600">{u.email}</td>
              <td className="p-4"><span className={`px-2 py-1 rounded text-xs font-bold uppercase ${u.role==='teacher'?'bg-purple-100 text-purple-700': u.role==='admin'?'bg-red-100 text-red-700':'bg-blue-100 text-blue-700'}`}>{u.role}</span></td>
              <td className="p-4 text-right"><button className="text-blue-600 hover:underline">Editar</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  const ProductsSection = () => (
    <div className="space-y-8">
      {/* Formulario de Creación */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Plus className="w-5 h-5"/> Agregar Nuevo Recurso</h2>
        <form onSubmit={handleCreateProduct} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500">Título</label>
            <input required className="w-full p-2 border rounded" value={newProduct.title} onChange={e=>setNewProduct({...newProduct, title: e.target.value})} placeholder="Ej: Guía de Verbos"/>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500">Precio (USD)</label>
            <input required type="number" min="0" step="0.01" className="w-full p-2 border rounded" value={newProduct.price} onChange={e=>setNewProduct({...newProduct, price: Number(e.target.value)})}/>
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-xs font-bold text-slate-500">Descripción</label>
            <textarea required className="w-full p-2 border rounded" rows={2} value={newProduct.description} onChange={e=>setNewProduct({...newProduct, description: e.target.value})} placeholder="Describe qué incluye este recurso..."/>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500">Categoría</label>
            <select className="w-full p-2 border rounded" value={newProduct.category} onChange={e=>setNewProduct({...newProduct, category: e.target.value})}>
              <option>Gramática</option>
              <option>Vocabulario</option>
              <option>Pedagogía</option>
              <option>Plan de Clase</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500">Archivo (PDF/ZIP)</label>
            <input required type="file" ref={productFileRef} className="w-full p-1 border rounded text-sm"/>
          </div>
          <div className="md:col-span-2">
            <button disabled={isUploading} type="submit" className="w-full py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex justify-center gap-2">
              {isUploading ? <Loader2 className="animate-spin"/> : <UploadCloud/>}
              {isUploading ? 'Subiendo y Publicando...' : 'Publicar Producto'}
            </button>
          </div>
        </form>
      </div>

      {/* Lista de Productos */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b font-bold bg-slate-50">Inventario Actual</div>
        <table className="w-full text-sm text-left">
          <thead className="text-slate-500 uppercase text-xs">
            <tr>
              <th className="p-4">Producto</th>
              <th className="p-4">Categoría</th>
              <th className="p-4">Precio</th>
              <th className="p-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {products.map(p => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="p-4 font-medium text-slate-900">{p.title}</td>
                <td className="p-4"><span className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded text-xs font-bold">{p.category}</span></td>
                <td className="p-4 font-bold text-green-600">${p.price}</td>
                <td className="p-4 text-right">
                  <button onClick={() => handleDeleteProduct(p.id)} className="text-red-500 hover:bg-red-50 p-2 rounded"><Trash2 size={16}/></button>
                </td>
              </tr>
            ))}
            {products.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-slate-400">No hay productos en la tienda.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )

  const FinanceSection = () => (
    <div className="bg-white rounded-lg shadow p-6">
        <div className="flex gap-4 mb-6 border-b">
            <button onClick={() => setActiveTab('deposits')} className={`pb-2 px-4 font-bold border-b-2 ${activeTab==='deposits' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-400'}`}>Depósitos</button>
            <button onClick={() => setActiveTab('payouts')} className={`pb-2 px-4 font-bold border-b-2 ${activeTab==='payouts' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-400'}`}>Pagos</button>
        </div>

        {activeTab === 'deposits' ? (
            <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 font-bold text-gray-500 uppercase text-xs">
                    <tr><th className="p-3">Usuario</th><th className="p-3">Monto</th><th className="p-3">Ref</th><th className="p-3">Estado</th><th className="p-3">Acción</th></tr>
                </thead>
                <tbody>
                    {deposits.map(d => (
                        <tr key={d.id} className="border-t">
                            <td className="p-3">{d.student_email}</td>
                            <td className="p-3 font-bold text-green-600">+${d.amount}</td>
                            <td className="p-3 font-mono text-xs">{d.reference_id}</td>
                            <td className="p-3"><span className={`px-2 py-1 rounded text-xs font-bold ${d.status==='approved'?'bg-green-100 text-green-700':'bg-yellow-100 text-yellow-800'}`}>{d.status}</span></td>
                            <td className="p-3">
                                {d.status === 'pending' && (
                                    <button disabled={!!processingId} onClick={() => handleApproveDeposit(d)} className="bg-green-600 text-white px-3 py-1 rounded text-xs font-bold hover:bg-green-700">
                                        {processingId === d.id ? <Loader2 className="animate-spin w-4 h-4"/> : 'Aprobar'}
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))}
                    {deposits.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-gray-400">Sin registros</td></tr>}
                </tbody>
            </table>
        ) : (
            <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 font-bold text-gray-500 uppercase text-xs">
                    <tr><th className="p-3">Maestro</th><th className="p-3">Monto</th><th className="p-3">Destino</th><th className="p-3">Estado</th><th className="p-3">Acción</th></tr>
                </thead>
                <tbody>
                    {payouts.map(p => (
                        <tr key={p.id} className="border-t">
                            <td className="p-3">{p.teacher_email}</td>
                            <td className="p-3 font-bold text-slate-800">${p.amount}</td>
                            <td className="p-3 font-mono text-xs">{p.payment_address}</td>
                            <td className="p-3"><span className={`px-2 py-1 rounded text-xs font-bold ${p.status==='paid'?'bg-blue-100 text-blue-700':'bg-yellow-100 text-yellow-800'}`}>{p.status}</span></td>
                            <td className="p-3">
                                {p.status === 'pending' && (
                                    <button disabled={!!processingId} onClick={() => handleMarkPaid(p)} className="bg-slate-900 text-white px-3 py-1 rounded text-xs font-bold hover:bg-slate-700">
                                        {processingId === p.id ? <Loader2 className="animate-spin w-4 h-4"/> : 'Pagar'}
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))}
                      {payouts.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-gray-400">Sin registros</td></tr>}
                </tbody>
            </table>
        )}
    </div>
  )

  const SettingsSection = () => (
    <div className="max-w-xl bg-white p-8 rounded-lg shadow">
      <h3 className="font-bold text-xl mb-6">Configuración</h3>
      <div className="mb-6">
        <label className="block text-sm font-bold mb-2">Comisión (%)</label>
        <div className="flex gap-4">
          <input type="number" value={config.platformFee} onChange={(e) => setConfig({...config, platformFee: Number(e.target.value)})} className="border p-2 rounded w-32 font-bold"/>
          <button className="bg-indigo-600 text-white px-4 py-2 rounded font-bold">Guardar</button>
        </div>
      </div>
    </div>
  )

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600 w-10 h-10"/></div>

  return (
    <div className="flex min-h-screen bg-slate-100 font-sans text-slate-900">
      <aside className="w-64 bg-slate-900 text-white flex flex-col fixed h-full z-10">
        <div className="p-6 font-bold text-xl tracking-tight">Tutorio<span className="text-indigo-400">Admin</span></div>
        <nav className="flex-1 px-4 space-y-2 mt-4">
          <button onClick={() => setSection('overview')} className={`w-full flex items-center gap-3 px-4 py-3 rounded text-sm font-medium ${section==='overview' ? 'bg-indigo-600' : 'hover:bg-slate-800'}`}><BarChart3 size={18}/> Resumen</button>
          <button onClick={() => setSection('users')} className={`w-full flex items-center gap-3 px-4 py-3 rounded text-sm font-medium ${section==='users' ? 'bg-indigo-600' : 'hover:bg-slate-800'}`}><Users size={18}/> Usuarios</button>
          <button onClick={() => setSection('finance')} className={`w-full flex items-center gap-3 px-4 py-3 rounded text-sm font-medium ${section==='finance' ? 'bg-indigo-600' : 'hover:bg-slate-800'}`}><DollarSign size={18}/> Finanzas</button>
          {/* NUEVO BOTÓN */}
          <button onClick={() => setSection('products')} className={`w-full flex items-center gap-3 px-4 py-3 rounded text-sm font-medium ${section==='products' ? 'bg-indigo-600' : 'hover:bg-slate-800'}`}><ShoppingBag size={18}/> Productos Premium</button>
          <button onClick={() => setSection('settings')} className={`w-full flex items-center gap-3 px-4 py-3 rounded text-sm font-medium ${section==='settings' ? 'bg-indigo-600' : 'hover:bg-slate-800'}`}><Settings size={18}/> Configuración</button>
        </nav>
        <div className="p-4 border-t border-slate-800">
          <button onClick={() => { supabase.auth.signOut(); router.push('/') }} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm"><LogOut size={16}/> Salir</button>
        </div>
      </aside>

      <main className="flex-1 ml-64 p-8">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-slate-800">
            {section === 'overview' && 'Visión General'}
            {section === 'users' && 'Gestión de Usuarios'}
            {section === 'finance' && 'Control Financiero'}
            {section === 'products' && 'Gestión de Tienda Premium'}
            {section === 'settings' && 'Ajustes'}
          </h1>
        </header>

        {section === 'overview' && <OverviewSection />}
        {section === 'users' && <UsersSection />}
        {section === 'finance' && <FinanceSection />}
        {section === 'products' && <ProductsSection />}
        {section === 'settings' && <SettingsSection />}
      </main>
    </div>
  )
}