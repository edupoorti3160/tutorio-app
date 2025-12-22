'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { 
  Users, DollarSign, Settings, BarChart3, LogOut, 
  Search, Trash2, Edit, Save, CheckCircle, XCircle, Loader2,
  ShoppingBag, UploadCloud, Plus, Wallet, AlertTriangle, Lock, Unlock, Megaphone
} from 'lucide-react'

const ADMIN_EMAIL = "azureusvip@proton.me"

// --- TIPOS ---
interface Profile {
  id: string
  email: string | null
  first_name: string | null
  last_name: string | null
  role: 'student' | 'teacher' | 'admin'
  status?: string // 'active' | 'banned'
}

interface UserWallet {
  user_id: string
  balance: number
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
  
  // Secciones
  const [section, setSection] = useState<'overview' | 'users' | 'finance' | 'products' | 'settings'>('overview')
  const [activeTab, setActiveTab] = useState<'deposits' | 'payouts' | 'wallets'>('deposits')
  
  // DATOS GLOBALES
  const [users, setUsers] = useState<Profile[]>([])
  const [wallets, setWallets] = useState<UserWallet[]>([]) // NUEVO: Para ver saldo real
  const [deposits, setDeposits] = useState<DepositRequest[]>([])
  const [payouts, setPayouts] = useState<PayoutRequest[]>([])
  const [products, setProducts] = useState<PlatformResource[]>([])
  
  // Configuración
  const [config, setConfig] = useState({ 
    platformFee: 15, 
    maintenanceMode: false,
    globalAnnouncement: ''
  }) 
  const [processingId, setProcessingId] = useState<string | null>(null)

  // Estados Modal Edición Usuario
  const [editingUser, setEditingUser] = useState<Profile | null>(null)
  const [editBalance, setEditBalance] = useState<number>(0)
  const [adjustmentAmount, setAdjustmentAmount] = useState<string>('')

  // Estados Productos
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
    // 1. Usuarios
    const { data: allUsers } = await supabase.from('profiles').select('*')
    if (allUsers) setUsers(allUsers as any)

    // 2. Billeteras (Saldo Real)
    const { data: allWallets } = await supabase.from('wallets').select('*')
    if (allWallets) setWallets(allWallets)

    // 3. Finanzas (Historial)
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

    // 4. Productos
    const { data: prods } = await supabase.from('platform_resources').select('*').order('created_at', { ascending: false })
    if (prods) setProducts(prods)
  }

  // --- GESTIÓN DE USUARIOS (MODAL) ---
  const openUserModal = (user: Profile) => {
    const userWallet = wallets.find(w => w.user_id === user.id)
    setEditBalance(userWallet?.balance || 0)
    setEditingUser(user)
    setAdjustmentAmount('')
  }

  const handleAdjustBalance = async (operation: 'add' | 'subtract') => {
    if (!editingUser || !adjustmentAmount) return
    const amount = parseFloat(adjustmentAmount)
    if (isNaN(amount) || amount <= 0) return alert("Monto inválido")

    if (!confirm(`¿Estás seguro de ${operation === 'add' ? 'agregar' : 'quitar'} $${amount} a este usuario?`)) return

    try {
      const currentBalance = wallets.find(w => w.user_id === editingUser.id)?.balance || 0
      const newBalance = operation === 'add' ? currentBalance + amount : currentBalance - amount

      // Actualizar DB
      const { error } = await supabase.from('wallets').update({ balance: newBalance }).eq('user_id', editingUser.id)
      if (error) throw error

      // Actualizar Estado Local
      setEditBalance(newBalance)
      setAdjustmentAmount('')
      await loadAllData() // Recargar para reflejar en tablas
      alert("✅ Saldo actualizado correctamente")
    } catch (e: any) {
      alert("Error: " + e.message)
    }
  }

  const handleToggleBan = async () => {
    if(!editingUser) return
    const newStatus = editingUser.status === 'banned' ? 'active' : 'banned'
    if(!confirm(`¿${newStatus === 'banned' ? 'BLOQUEAR' : 'DESBLOQUEAR'} acceso a este usuario?`)) return

    try {
        // Asumiendo que existe columna 'status' en profiles, si no, habría que crearla
        // Para este ejemplo usaremos update
        await supabase.from('profiles').update({ status: newStatus }).eq('id', editingUser.id)
        setEditingUser({...editingUser, status: newStatus})
        await loadAllData()
    } catch(e: any) {
        alert("Error actualizando estado: " + e.message)
    }
  }

  const handleDeleteUser = async () => {
      if(!editingUser) return
      if(!confirm("⚠️ ¿ELIMINAR USUARIO PERMANENTEMENTE?\nEsta acción borrará sus clases, saldo y datos.")) return
      try {
          await supabase.from('profiles').delete().eq('id', editingUser.id)
          setEditingUser(null)
          await loadAllData()
      } catch(e:any) {
          alert("Error eliminando: " + e.message)
      }
  }

  // --- FINANZAS ---
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
          // Descontar saldo del maestro
          const currentWallet = wallets.find(w => w.user_id === payout.teacher_id)
          if(currentWallet && currentWallet.balance >= payout.amount) {
             await supabase.from('wallets').update({ balance: currentWallet.balance - payout.amount }).eq('user_id', payout.teacher_id)
          }
          
          await supabase.from('payout_requests').update({ status: 'paid', processed_at: new Date() }).eq('id', payout.id)
          await loadAllData()
      } catch (e: any) { alert("Error: " + e.message) } finally { setProcessingId(null) }
  }

  // --- PRODUCTOS ---
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!productFileRef.current?.files?.[0]) return alert("Falta el archivo")
    setIsUploading(true)
    try {
      const file = productFileRef.current.files[0]
      const fileName = `premium/${Date.now()}-${file.name}`
      const { error: uploadError } = await supabase.storage.from('class-resources').upload(fileName, file)
      if (uploadError) throw uploadError
      const { data: { publicUrl } } = supabase.storage.from('class-resources').getPublicUrl(fileName)
      const { error: dbError } = await supabase.from('platform_resources').insert({
        title: newProduct.title, description: newProduct.description, price: newProduct.price,
        category: newProduct.category, download_url: publicUrl, preview_url: 'https://via.placeholder.com/150'
      })
      if (dbError) throw dbError
      alert("Producto creado"); setNewProduct({ title: '', description: '', price: 0, category: 'Gramática' }); 
      if(productFileRef.current) productFileRef.current.value = ''; loadAllData()
    } catch (error: any) { alert("Error: " + error.message) } finally { setIsUploading(false) }
  }

  const handleDeleteProduct = async (id: string) => {
    if(!confirm("¿Borrar producto?")) return
    await supabase.from('platform_resources').delete().eq('id', id)
    setProducts(products.filter(p => p.id !== id))
  }

  // --- COMPONENTES UI ---

  const OverviewSection = () => {
    // CÁLCULO REAL BASADO EN BILLETERAS
    const totalFundsInSystem = wallets.reduce((acc, w) => acc + w.balance, 0)
    // Estimación de ganancias (15% del dinero que entró, simplificado)
    const estimatedEarnings = totalFundsInSystem * (config.platformFee / 100)

    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500">
          <h3 className="text-gray-500 text-sm font-bold uppercase">Usuarios</h3>
          <p className="text-3xl font-bold">{users.length}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-500">
          <h3 className="text-gray-500 text-sm font-bold uppercase">Fondos en Custodia</h3>
          <p className="text-3xl font-bold">${totalFundsInSystem.toFixed(2)}</p>
          <p className="text-xs text-green-600">Total en Billeteras</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-purple-500">
          <h3 className="text-gray-500 text-sm font-bold uppercase">Ganancias Estimadas</h3>
          <p className="text-3xl font-bold">${estimatedEarnings.toFixed(2)}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-amber-500">
          <h3 className="text-gray-500 text-sm font-bold uppercase">Productos</h3>
          <p className="text-3xl font-bold">{products.length}</p>
        </div>
      </div>
    )
  }

  const UsersSection = () => (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-4 border-b flex justify-between items-center bg-slate-50">
        <h3 className="font-bold text-lg">Directorio de Usuarios</h3>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400"/>
          <input type="text" placeholder="Buscar..." className="pl-9 pr-4 py-2 border rounded bg-white text-sm w-64"/>
        </div>
      </div>
      <table className="w-full text-sm text-left">
        <thead className="bg-slate-100 text-gray-500 font-bold uppercase text-xs">
          <tr><th className="p-4">Nombre</th><th className="p-4">Email</th><th className="p-4">Saldo</th><th className="p-4">Rol</th><th className="p-4 text-right">Acción</th></tr>
        </thead>
        <tbody>
          {users.map(u => {
             const balance = wallets.find(w => w.user_id === u.id)?.balance || 0
             return (
                <tr key={u.id} className={`border-t hover:bg-slate-50 ${u.status === 'banned' ? 'bg-red-50' : ''}`}>
                  <td className="p-4 font-bold">{u.first_name} {u.last_name}</td>
                  <td className="p-4 text-gray-600">{u.email}</td>
                  <td className="p-4 font-mono font-bold text-green-700">${balance.toFixed(2)}</td>
                  <td className="p-4"><span className={`px-2 py-1 rounded text-xs font-bold uppercase ${u.role==='teacher'?'bg-purple-100 text-purple-700': u.role==='admin'?'bg-red-100 text-red-700':'bg-blue-100 text-blue-700'}`}>{u.role}</span></td>
                  <td className="p-4 text-right">
                    <button onClick={() => openUserModal(u)} className="text-indigo-600 hover:bg-indigo-50 px-3 py-1 rounded font-bold text-xs border border-indigo-200">
                        Gestionar
                    </button>
                  </td>
                </tr>
             )
          })}
        </tbody>
      </table>
    </div>
  )

  const FinanceSection = () => (
    <div className="bg-white rounded-lg shadow p-6">
        <div className="flex gap-4 mb-6 border-b">
            <button onClick={() => setActiveTab('deposits')} className={`pb-2 px-4 font-bold border-b-2 ${activeTab==='deposits' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-400'}`}>Depósitos</button>
            <button onClick={() => setActiveTab('payouts')} className={`pb-2 px-4 font-bold border-b-2 ${activeTab==='payouts' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-400'}`}>Pagos</button>
            <button onClick={() => setActiveTab('wallets')} className={`pb-2 px-4 font-bold border-b-2 ${activeTab==='wallets' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-400'}`}>Billeteras (Tiempo Real)</button>
        </div>

        {activeTab === 'wallets' && (
             <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 font-bold text-gray-500 uppercase text-xs">
                    <tr><th className="p-3">Usuario</th><th className="p-3">Rol</th><th className="p-3">Saldo Actual</th></tr>
                </thead>
                <tbody>
                    {wallets.map(w => {
                        const profile = users.find(u => u.id === w.user_id)
                        return (
                            <tr key={w.user_id} className="border-t">
                                <td className="p-3 font-medium">{profile?.email || 'Usuario eliminado'}</td>
                                <td className="p-3 uppercase text-xs text-slate-500">{profile?.role || '-'}</td>
                                <td className="p-3 font-bold text-green-600 text-lg">${w.balance.toFixed(2)}</td>
                            </tr>
                        )
                    })}
                </tbody>
             </table>
        )}

        {activeTab === 'deposits' && (
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
        )}

        {activeTab === 'payouts' && (
            <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 font-bold text-gray-500 uppercase text-xs">
                    <tr><th className="p-3">Maestro</th><th className="p-3">Monto</th><th className="p-3">Destino</th><th className="p-3">Estado</th><th className="p-3">Acción</th></tr>
                </thead>
                <tbody>
                    {payouts.map(p => (
                        <tr key={p.id} className="border-t">
                            <td className="p-3">{p.teacher_email}</td>
                            <td className="p-3 font-bold text-slate-800">${p.amount}</td>
                            <td className="p-3 font-mono text-xs flex items-center gap-2">
                                {p.payment_address} 
                                {/* Icono de copiar simple */}
                                <button onClick={() => navigator.clipboard.writeText(p.payment_address)} title="Copiar" className="text-indigo-500 hover:text-indigo-700">📋</button>
                            </td>
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

  const ProductsSection = () => (
    <div className="space-y-8">
      {/* Formulario Productos (Igual que antes) */}
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
              <option>Gramática</option><option>Vocabulario</option><option>Pedagogía</option><option>Plan de Clase</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500">Archivo (PDF/ZIP)</label>
            <input required type="file" ref={productFileRef} className="w-full p-1 border rounded text-sm"/>
          </div>
          <div className="md:col-span-2">
            <button disabled={isUploading} type="submit" className="w-full py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex justify-center gap-2">
              {isUploading ? <Loader2 className="animate-spin"/> : <UploadCloud/>}
              {isUploading ? 'Subiendo...' : 'Publicar Producto'}
            </button>
          </div>
        </form>
      </div>
      
      {/* Tabla Productos */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="text-slate-500 uppercase text-xs bg-slate-50">
            <tr><th className="p-4">Producto</th><th className="p-4">Categoría</th><th className="p-4">Precio</th><th className="p-4 text-right">Acciones</th></tr>
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
          </tbody>
        </table>
      </div>
    </div>
  )

  const SettingsSection = () => (
    <div className="max-w-2xl space-y-6">
      <div className="bg-white p-8 rounded-lg shadow">
        <h3 className="font-bold text-xl mb-6 flex items-center gap-2"><Settings className="w-5 h-5"/> Configuración General</h3>
        <div className="mb-6">
          <label className="block text-sm font-bold mb-2 text-slate-600">Comisión de Plataforma (%)</label>
          <div className="flex gap-4">
            <input type="number" value={config.platformFee} onChange={(e) => setConfig({...config, platformFee: Number(e.target.value)})} className="border p-2 rounded w-32 font-bold text-center"/>
            <button className="bg-indigo-600 text-white px-6 py-2 rounded font-bold hover:bg-indigo-700">Guardar Cambios</button>
          </div>
        </div>
      </div>

      <div className="bg-white p-8 rounded-lg shadow border-l-4 border-red-500">
        <h3 className="font-bold text-xl mb-4 flex items-center gap-2 text-red-600"><AlertTriangle className="w-6 h-6"/> Zona de Peligro</h3>
        
        <div className="flex items-center justify-between py-4 border-b border-slate-100">
            <div>
                <h4 className="font-bold text-slate-800">Modo Mantenimiento</h4>
                <p className="text-xs text-slate-500">Desactiva el acceso a la plataforma para estudiantes y maestros.</p>
            </div>
            <button onClick={() => setConfig({...config, maintenanceMode: !config.maintenanceMode})} className={`px-4 py-2 rounded-full font-bold text-xs transition-colors ${config.maintenanceMode ? 'bg-red-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                {config.maintenanceMode ? 'ACTIVADO' : 'DESACTIVADO'}
            </button>
        </div>

        <div className="py-4">
            <label className="block font-bold text-slate-800 mb-2 flex items-center gap-2"><Megaphone className="w-4 h-4"/> Anuncio Global</label>
            <div className="flex gap-2">
                <input 
                    type="text" 
                    placeholder="Ej: Mantenimiento programado para el Sábado..." 
                    className="flex-1 p-2 border rounded text-sm"
                    value={config.globalAnnouncement}
                    onChange={(e) => setConfig({...config, globalAnnouncement: e.target.value})}
                />
                <button className="bg-slate-900 text-white px-4 py-2 rounded font-bold text-xs">Publicar</button>
            </div>
        </div>
      </div>
    </div>
  )

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600 w-10 h-10"/></div>

  return (
    <div className="flex min-h-screen bg-slate-100 font-sans text-slate-900">
      {/* SIDEBAR */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col fixed h-full z-10">
        <div className="p-6 font-bold text-xl tracking-tight">Tutorio<span className="text-indigo-400">Admin</span></div>
        <nav className="flex-1 px-4 space-y-2 mt-4">
          <button onClick={() => setSection('overview')} className={`w-full flex items-center gap-3 px-4 py-3 rounded text-sm font-medium ${section==='overview' ? 'bg-indigo-600' : 'hover:bg-slate-800'}`}><BarChart3 size={18}/> Resumen</button>
          <button onClick={() => setSection('users')} className={`w-full flex items-center gap-3 px-4 py-3 rounded text-sm font-medium ${section==='users' ? 'bg-indigo-600' : 'hover:bg-slate-800'}`}><Users size={18}/> Usuarios</button>
          <button onClick={() => setSection('finance')} className={`w-full flex items-center gap-3 px-4 py-3 rounded text-sm font-medium ${section==='finance' ? 'bg-indigo-600' : 'hover:bg-slate-800'}`}><DollarSign size={18}/> Finanzas</button>
          <button onClick={() => setSection('products')} className={`w-full flex items-center gap-3 px-4 py-3 rounded text-sm font-medium ${section==='products' ? 'bg-indigo-600' : 'hover:bg-slate-800'}`}><ShoppingBag size={18}/> Productos Premium</button>
          <button onClick={() => setSection('settings')} className={`w-full flex items-center gap-3 px-4 py-3 rounded text-sm font-medium ${section==='settings' ? 'bg-indigo-600' : 'hover:bg-slate-800'}`}><Settings size={18}/> Configuración</button>
        </nav>
        <div className="p-4 border-t border-slate-800">
          <button onClick={() => { supabase.auth.signOut(); router.push('/') }} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm"><LogOut size={16}/> Salir</button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 ml-64 p-8">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-slate-800">
            {section === 'overview' && 'Visión General'}
            {section === 'users' && 'Gestión de Usuarios'}
            {section === 'finance' && 'Control Financiero'}
            {section === 'products' && 'Gestión de Tienda Premium'}
            {section === 'settings' && 'Ajustes del Sistema'}
          </h1>
        </header>

        {section === 'overview' && <OverviewSection />}
        {section === 'users' && <UsersSection />}
        {section === 'finance' && <FinanceSection />}
        {section === 'products' && <ProductsSection />}
        {section === 'settings' && <SettingsSection />}
      </main>

      {/* MODAL DE EDICIÓN DE USUARIO */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-lg">Administrar Usuario</h3>
                    <button onClick={() => setEditingUser(null)}><XCircle className="w-6 h-6 text-slate-400 hover:text-slate-600"/></button>
                </div>
                <div className="p-6 space-y-6">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center text-2xl font-bold text-slate-500">
                            {editingUser.first_name?.[0] || 'U'}
                        </div>
                        <div>
                            <h4 className="font-bold text-xl">{editingUser.first_name} {editingUser.last_name}</h4>
                            <p className="text-slate-500 text-sm">{editingUser.email}</p>
                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${editingUser.role === 'teacher' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{editingUser.role}</span>
                            {editingUser.status === 'banned' && <span className="ml-2 text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-red-100 text-red-700">BLOQUEADO</span>}
                        </div>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <p className="text-xs font-bold text-slate-400 uppercase mb-1">Saldo Actual en Billetera</p>
                        <p className="text-3xl font-black text-slate-900">${editBalance.toFixed(2)}</p>
                        
                        <div className="mt-4 pt-4 border-t border-slate-200">
                            <label className="text-xs font-bold text-slate-500 mb-2 block">Ajuste Manual (+ Agregar / - Quitar)</label>
                            <div className="flex gap-2">
                                <input 
                                    type="number" 
                                    placeholder="Monto (ej: 50)" 
                                    className="flex-1 p-2 border rounded font-bold"
                                    value={adjustmentAmount}
                                    onChange={(e) => setAdjustmentAmount(e.target.value)}
                                />
                                <button onClick={() => handleAdjustBalance('add')} className="bg-green-600 text-white px-3 rounded font-bold text-xl hover:bg-green-700">+</button>
                                <button onClick={() => handleAdjustBalance('subtract')} className="bg-red-500 text-white px-3 rounded font-bold text-xl hover:bg-red-600">-</button>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button onClick={handleToggleBan} className={`flex-1 py-3 rounded-lg font-bold border flex items-center justify-center gap-2 ${editingUser.status === 'banned' ? 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100' : 'border-slate-200 hover:bg-slate-50 text-slate-700'}`}>
                            {editingUser.status === 'banned' ? <Unlock className="w-4 h-4"/> : <Lock className="w-4 h-4"/>}
                            {editingUser.status === 'banned' ? 'Desbloquear Acceso' : 'Bloquear Acceso'}
                        </button>
                        <button onClick={handleDeleteUser} className="px-4 py-3 rounded-lg font-bold bg-red-50 text-red-600 hover:bg-red-100 border border-red-100 flex items-center gap-2">
                            <Trash2 className="w-4 h-4"/> Eliminar
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  )
}