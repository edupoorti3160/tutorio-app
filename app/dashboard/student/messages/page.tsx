'use client'

import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Send, Search, MessageSquare, Loader2, User } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'

// Tipos reales basados en Supabase
interface Contact {
  id: string
  name: string
  email: string
  lastMsg: string
  time: string
}

interface Message {
  id: string
  sender_id: string
  content: string
  created_at: string
  is_mine: boolean
}

export default function Messages() {
  const [supabase] = useState(() => createClient())
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)
  
  const [activeChatId, setActiveChatId] = useState<string | null>(null)
  const [contacts, setContacts] = useState<Contact[]>([]) 
  const [messages, setMessages] = useState<Message[]>([]) 
  const [msgInput, setMsgInput] = useState("")
  
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 1. CARGAR USUARIO Y CONTACTOS
  useEffect(() => {
    const initData = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        setCurrentUser(user)

        // Buscar mensajes donde soy emisor O receptor para sacar contactos únicos
        const { data: allMsgs } = await supabase
            .from('messages')
            .select(`
                *,
                sender:profiles!sender_id(first_name, last_name, email),
                receiver:profiles!receiver_id(first_name, last_name, email)
            `)
            .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
            .order('created_at', { ascending: false })

        if (allMsgs) {
            // Procesar contactos únicos
            const uniqueContactsMap = new Map()
            
            allMsgs.forEach((msg: any) => {
                const isMeSender = msg.sender_id === user.id
                const otherId = isMeSender ? msg.receiver_id : msg.sender_id
                const otherProfile = isMeSender ? msg.receiver : msg.sender
                
                if (!uniqueContactsMap.has(otherId)) {
                    uniqueContactsMap.set(otherId, {
                        id: otherId,
                        name: otherProfile ? `${otherProfile.first_name || ''} ${otherProfile.last_name || ''}` : 'Usuario',
                        email: otherProfile?.email || '',
                        lastMsg: msg.content,
                        time: new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                    })
                }
            })
            setContacts(Array.from(uniqueContactsMap.values()))
        }
        setLoading(false)
    }
    initData()
  }, [])

  // 2. CARGAR MENSAJES DEL CHAT ACTIVO (POLLING SIMPLE O SUBSCRIPTION)
  useEffect(() => {
      if (!activeChatId || !currentUser) return

      const fetchMessages = async () => {
          const { data } = await supabase
              .from('messages')
              .select('*')
              .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${activeChatId}),and(sender_id.eq.${activeChatId},receiver_id.eq.${currentUser.id})`)
              .order('created_at', { ascending: true })
          
          if (data) {
              setMessages(data.map((m: any) => ({
                  id: m.id,
                  sender_id: m.sender_id,
                  content: m.content,
                  created_at: new Date(m.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
                  is_mine: m.sender_id === currentUser.id
              })))
              scrollToBottom()
          }
      }

      fetchMessages()
      // Suscripción en tiempo real (Opcional, pero recomendada)
      const channel = supabase.channel('chat_room')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' },payload => {
            fetchMessages() // Recargar si hay nuevo mensaje
        })
        .subscribe()

      return () => { supabase.removeChannel(channel) }

  }, [activeChatId, currentUser])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  // 3. ENVIAR MENSAJE
  const sendMessage = async (e: any) => {
    e.preventDefault();
    if (!msgInput.trim() || !activeChatId || !currentUser) return;

    const textToSend = msgInput
    setMsgInput("") // Limpiar UI rápido

    // Optimistic Update (Mostrarlo antes de confirmar)
    const tempId = Date.now().toString()
    setMessages(prev => [...prev, {
        id: tempId,
        sender_id: currentUser.id,
        content: textToSend,
        created_at: "Now",
        is_mine: true
    }])
    
    // Insertar en BD
    const { error } = await supabase.from('messages').insert({
        sender_id: currentUser.id,
        receiver_id: activeChatId,
        content: textToSend
    })

    if (error) {
        alert("Error enviando mensaje")
        // Aquí deberías revertir el optimistic update si falla
    }
  }

  const activeContact = contacts.find(c => c.id === activeChatId)

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600"/></div>

  return (
    <div className="h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900 flex flex-col">
      
      {/* Header */}
      <div className="flex items-center gap-4 mb-6 shrink-0">
        <Link href="/dashboard/student" className="p-2 bg-white rounded-lg hover:bg-slate-100 border border-slate-200 text-slate-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Mensajes</h1>
      </div>

      {/* Chat Layout */}
      <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex">
        
        {/* Sidebar de Contactos */}
        <div className="w-full md:w-1/3 border-r border-slate-100 bg-slate-50/50 flex flex-col">
          <div className="p-4 border-b border-slate-100">
            <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input type="text" placeholder="Buscar contactos..." className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {contacts.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50"/>
                    <p className="text-sm font-medium">No tienes conversaciones.</p>
                    <p className="text-xs mt-1">Los chats aparecerán aquí cuando hables con alguien.</p>
                </div>
            ) : (
                contacts.map((c) => (
                    <div key={c.id} onClick={() => setActiveChatId(c.id)} className={`p-4 cursor-pointer hover:bg-white transition-colors border-b border-slate-100 ${activeChatId === c.id ? 'bg-white border-l-4 border-l-indigo-600' : ''}`}>
                      <div className="flex justify-between items-start mb-1">
                          <span className={`font-bold ${activeChatId === c.id ? 'text-indigo-900' : 'text-slate-700'}`}>{c.name}</span>
                          <span className="text-[10px] text-slate-400">{c.time}</span>
                      </div>
                      <p className="text-xs text-slate-500 truncate">{c.lastMsg}</p>
                    </div>
                ))
            )}
          </div>
        </div>

        {/* Área de Chat */}
        <div className="hidden md:flex flex-1 flex-col bg-white">
            {!activeChatId ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                    <MessageSquare className="w-12 h-12 mb-4 opacity-20"/>
                    <p className="text-center font-medium">Selecciona un contacto para chatear.</p>
                </div>
            ) : (
                <>
                    {/* Chat Header */}
                    <div className="p-4 border-b border-slate-100 flex items-center gap-3 bg-white shadow-sm z-10">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                            {activeContact?.name.charAt(0) || <User size={20}/>}
                        </div>
                        <div>
                            <p className="font-bold text-slate-800">{activeContact?.name}</p>
                            <p className="text-xs text-slate-500">{activeContact?.email}</p>
                        </div>
                    </div>
                    
                    {/* Contenedor de Mensajes */}
                    <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-50/30">
                        {messages.length === 0 ? (
                            <div className="text-center text-slate-400 pt-10">
                                <p>¡Es el comienzo de algo grande!</p>
                                <p className="text-sm">Envía un mensaje para empezar.</p>
                            </div>
                        ) : (
                             messages.map((msg) => (
                                <div key={msg.id} className={`flex ${msg.is_mine ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`px-4 py-2 rounded-2xl text-sm max-w-xs shadow-sm ${
                                        msg.is_mine ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-white border border-slate-200 text-slate-700 rounded-tl-sm'
                                    }`}>
                                        <p>{msg.content}</p>
                                        <p className={`text-[10px] mt-1 text-right ${msg.is_mine ? 'text-indigo-200' : 'text-slate-400'}`}>{msg.created_at}</p>
                                    </div>
                                </div>
                             ))
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <form onSubmit={sendMessage} className="p-4 border-t border-slate-100 bg-white">
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                placeholder="Escribe un mensaje..." 
                                value={msgInput}
                                onChange={(e) => setMsgInput(e.target.value)}
                                className="flex-1 border border-slate-200 rounded-lg px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all" 
                            />
                            <button type="submit" disabled={!msgInput.trim()} className="p-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                                <Send className="w-5 h-5"/>
                            </button>
                        </div>
                    </form>
                </>
            )}
        </div>

      </div>
    </div>
  )
}
