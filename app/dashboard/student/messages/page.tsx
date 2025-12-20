'use client'

import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Send, Search, MessageSquare, Loader2, User, Globe, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'

interface Contact {
  id: string
  name: string
  email: string
  lastMsg: string
  time: string
  avatar_url?: string
}

interface Message {
  id: string
  sender_id: string
  content: string
  translated_content?: string
  created_at: string
  is_mine: boolean
}

// Idiomas soportados por Google Translate
const LANGUAGES = [
    { code: 'en', name: 'Inglés 🇺🇸' },
    { code: 'es', name: 'Español 🇪🇸' },
    { code: 'pt', name: 'Portugués 🇧🇷' },
    { code: 'fr', name: 'Francés 🇫🇷' },
    { code: 'de', name: 'Alemán 🇩🇪' },
    { code: 'it', name: 'Italiano 🇮🇹' },
]

export default function StudentMessages() {
  const [supabase] = useState(() => createClient())
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)
  
  const [activeChatId, setActiveChatId] = useState<string | null>(null)
  const [contacts, setContacts] = useState<Contact[]>([]) 
  const [messages, setMessages] = useState<Message[]>([]) 
  const [msgInput, setMsgInput] = useState("")
  const [sending, setSending] = useState(false)
  
  // PREFERENCIA DE IDIOMA (Por defecto Inglés, pero cambiable)
  const [myLanguage, setMyLanguage] = useState('en')
  const [showLangMenu, setShowLangMenu] = useState(false)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 1. CARGAR DATOS
  useEffect(() => {
    const initData = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        setCurrentUser(user)

        // Cargar contactos reales usando la función SQL corregida
        const { data: myContacts, error } = await supabase.rpc('get_my_contacts', { p_user_id: user.id })

        if (myContacts) {
            setContacts(myContacts.map((c: any) => {
                // LÓGICA DE NOMBRE ROBUSTA:
                // 1. Intenta Nombre + Apellido
                // 2. Si no, intenta la parte del email antes del @
                // 3. Si no, 'Usuario'
                let displayName = 'Usuario';
                if (c.first_name && c.first_name !== 'Sin Nombre' && c.first_name !== 'null') {
                    displayName = `${c.first_name} ${c.last_name || ''}`.trim();
                } else if (c.email) {
                    displayName = c.email.split('@')[0];
                }

                return {
                    id: c.contact_id || c.id,
                    name: displayName,
                    email: 'Maestro',
                    lastMsg: 'Haz click para chatear',
                    time: c.last_interaction ? new Date(c.last_interaction).toLocaleDateString() : '',
                    avatar_url: c.avatar_url
                };
            }))
        }
        setLoading(false)
    }
    initData()
  }, [])

  // 2. CARGAR MENSAJES Y TRADUCIRLOS AL VUELO SI ES NECESARIO
  useEffect(() => {
      if (!activeChatId || !currentUser) return

      const fetchMessages = async () => {
          const { data } = await supabase
              .from('messages')
              .select('*')
              .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${activeChatId}),and(sender_id.eq.${activeChatId},receiver_id.eq.${currentUser.id})`)
              .order('created_at', { ascending: true })
          
          if (data) {
              setMessages(data.map((m: any) => {
                  const translation = m.payload?.translated_text
                  
                  return {
                      id: m.id,
                      sender_id: m.sender_id,
                      content: m.content,
                      // Si soy yo, no necesito traducción. Si es el otro, muestro la traducción si existe.
                      translated_content: m.sender_id !== currentUser.id ? translation : undefined, 
                      created_at: new Date(m.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
                      is_mine: m.sender_id === currentUser.id
                  }
              }))
              setTimeout(scrollToBottom, 100)
          }
      }

      fetchMessages()

      const channel = supabase.channel('chat_room_student')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
            const newMsg = payload.new as any
            if ((newMsg.sender_id === currentUser.id && newMsg.receiver_id === activeChatId) ||
                (newMsg.sender_id === activeChatId && newMsg.receiver_id === currentUser.id)) {
                fetchMessages()
            }
        })
        .subscribe()

      return () => { supabase.removeChannel(channel) }

  }, [activeChatId, currentUser, myLanguage])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  // 3. ENVIAR MENSAJE (TRADUCIENDO AL IDIOMA DEL RECEPTOR)
  const sendMessage = async (e: any) => {
    e.preventDefault();
    if (!msgInput.trim() || !activeChatId || !currentUser) return;

    setSending(true)
    const textToSend = msgInput
    setMsgInput("") 

    let translatedText = ""
    try {
        // Traducimos al idioma CONTRARIO al mío por cortesía
        const targetLang = myLanguage === 'en' ? 'es' : 'en' 
        const res = await fetch('/api/translate', {
            method: 'POST',
            body: JSON.stringify({ text: textToSend, target: targetLang })
        })
        const data = await res.json()
        if(data.translatedText) translatedText = data.translatedText
    } catch (err) { console.error("Error traduciendo (se enviará igual):", err) }

    const { error } = await supabase.from('messages').insert({
        sender_id: currentUser.id,
        receiver_id: activeChatId,
        content: textToSend,
        payload: { translated_text: translatedText, original_lang: myLanguage } 
    })

    setSending(false)
    if (error) {
        alert("Error enviando mensaje. Intenta de nuevo.")
        setMsgInput(textToSend) // Restaurar texto si falla
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
        <h1 className="text-2xl font-bold text-slate-900">Mensajes (Estudiante)</h1>
      </div>

      <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex">
        
        {/* Sidebar */}
        <div className={`w-full md:w-1/3 border-r border-slate-100 bg-slate-50/50 flex flex-col ${activeChatId ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 border-b border-slate-100">
            <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input type="text" placeholder="Buscar..." className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {contacts.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50"/>
                    <p className="text-sm font-medium">No tienes chats.</p>
                </div>
            ) : (
                contacts.map((c) => (
                    <div key={c.id} onClick={() => setActiveChatId(c.id)} className={`p-4 cursor-pointer hover:bg-white transition-colors border-b border-slate-100 ${activeChatId === c.id ? 'bg-white border-l-4 border-l-indigo-600' : ''}`}>
                      <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-indigo-100 overflow-hidden">
                             {c.avatar_url ? <img src={c.avatar_url} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-indigo-600 font-bold">{c.name.charAt(0)}</div>}
                          </div>
                          <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start mb-1">
                                  <span className={`font-bold truncate ${activeChatId === c.id ? 'text-indigo-900' : 'text-slate-700'}`}>{c.name}</span>
                                  <span className="text-[10px] text-slate-400 whitespace-nowrap ml-2">{c.time}</span>
                              </div>
                              <p className="text-xs text-slate-500 truncate">{c.lastMsg}</p>
                          </div>
                      </div>
                    </div>
                ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className={`flex-1 flex-col bg-white ${activeChatId ? 'flex' : 'hidden md:flex'}`}>
            {!activeChatId ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                    <MessageSquare className="w-12 h-12 mb-4 opacity-20"/>
                    <p>Selecciona un chat para empezar.</p>
                </div>
            ) : (
                <>
                    {/* Chat Header con Selector de Idioma */}
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white shadow-sm z-10">
                        <div className="flex items-center gap-3">
                            <button onClick={() => setActiveChatId(null)} className="md:hidden text-slate-500"><ArrowLeft className="w-5 h-5"/></button>
                            <div className="w-10 h-10 rounded-full bg-indigo-100 overflow-hidden">
                                {activeContact?.avatar_url ? <img src={activeContact.avatar_url} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-indigo-700 font-bold">{activeContact?.name.charAt(0)}</div>}
                            </div>
                            <div>
                                <p className="font-bold text-slate-800">{activeContact?.name}</p>
                                <p className="text-xs text-green-600">En línea</p>
                            </div>
                        </div>

                        {/* SELECTOR DE IDIOMA */}
                        <div className="relative">
                            <button onClick={() => setShowLangMenu(!showLangMenu)} className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-full text-xs font-bold text-slate-700 transition-colors">
                                <Globe className="w-3 h-3"/>
                                {LANGUAGES.find(l => l.code === myLanguage)?.name}
                                <ChevronDown className="w-3 h-3"/>
                            </button>
                            
                            {showLangMenu && (
                                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-20">
                                    <div className="p-2 bg-slate-50 text-[10px] uppercase font-bold text-slate-400 tracking-wider border-b border-slate-100">Traducir chats al:</div>
                                    {LANGUAGES.map(lang => (
                                        <button 
                                            key={lang.code}
                                            onClick={() => { setMyLanguage(lang.code); setShowLangMenu(false) }}
                                            className={`w-full text-left px-4 py-3 text-sm hover:bg-indigo-50 transition-colors ${myLanguage === lang.code ? 'text-indigo-600 font-bold bg-indigo-50/50' : 'text-slate-600'}`}
                                        >
                                            {lang.name}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                    
                    {/* Mensajes */}
                    <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-50/30">
                        {messages.map((msg) => (
                             <div key={msg.id} className={`flex ${msg.is_mine ? 'justify-end' : 'justify-start'}`}>
                                 <div className={`px-4 py-3 rounded-2xl text-sm max-w-sm shadow-sm ${
                                     msg.is_mine ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-white border border-slate-200 text-slate-700 rounded-tl-sm'
                                 }`}>
                                     {/* Mensaje Original */}
                                     <p className="text-base">{msg.content}</p>
                                     
                                     {/* Traducción (Solo si no es mío y existe traducción) */}
                                     {msg.translated_content && !msg.is_mine && (
                                         <div className="mt-2 pt-2 border-t border-slate-100/20 text-xs italic opacity-90 flex items-center gap-1">
                                             <Globe className="w-3 h-3"/>
                                             {msg.translated_content}
                                         </div>
                                     )}

                                     <p className={`text-[10px] mt-1 text-right opacity-60`}>{msg.created_at}</p>
                                 </div>
                             </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <form onSubmit={sendMessage} className="p-4 border-t border-slate-100 bg-white">
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                placeholder={`Escribiendo en ${LANGUAGES.find(l => l.code === myLanguage)?.name.split(' ')[0]}...`}
                                value={msgInput}
                                onChange={(e) => setMsgInput(e.target.value)}
                                className="flex-1 border border-slate-200 rounded-lg px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all" 
                            />
                            <button type="submit" disabled={!msgInput.trim() || sending} className="p-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                                {sending ? <Loader2 className="w-5 h-5 animate-spin"/> : <Send className="w-5 h-5"/>}
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
