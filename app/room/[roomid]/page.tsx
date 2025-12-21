'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { useWebRTC } from '@/hooks/useWebRTC' 
import { Whiteboard } from '@/components/whiteboard'
import { Mic, MicOff, Video, VideoOff, Send, Languages, Loader2, X, Image as ImageIcon, CheckCircle, ZoomIn, ZoomOut, RotateCw, RotateCcw, Trash2, Volume2, ChevronDown } from 'lucide-react'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
// TU API KEY DE GOOGLE (Pégala aquí si no usas .env)
const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_TRANSLATE_API_KEY || 'PEGA_TU_API_KEY_AQUI';

interface Message {
    sender: string;
    text: string;
    isTranslation?: boolean;
}

declare global {
    interface Window {
        SpeechRecognition: any;
        webkitSpeechRecognition: any;
    }
}

// --- CONFIGURACIÓN DE IDIOMAS ---
const SUPPORTED_LANGUAGES = [
    { code: 'es', name: 'Español', flag: '🇪🇸', speechCode: 'es-ES' },
    { code: 'en', name: 'Inglés', flag: '🇺🇸', speechCode: 'en-US' },
    { code: 'fr', name: 'Francés', flag: '🇫🇷', speechCode: 'fr-FR' },
    { code: 'pt', name: 'Portugués', flag: '🇧🇷', speechCode: 'pt-BR' }
];

export default function Classroom() {
    const params = useParams()
    const router = useRouter()
    const roomId = params.roomid
    const [supabase] = useState(() => createClient())
    const [autoJoin, setAutoJoin] = useState(false)

    useEffect(() => {
        if (typeof window === 'undefined') return
        const searchParams = new URLSearchParams(window.location.search)
        const auto = searchParams.get('autoJoin') === '1'
        if (auto) {
            setAutoJoin(true)
        }
    }, [])


    // --- ESTADOS ---
    const [userRole, setUserRole] = useState<'teacher' | 'student' | null>(null)
    const [userId, setUserId] = useState<string | null>(null)
    const [isRoleLoading, setIsRoleLoading] = useState(true)
    
    const [hasJoined, setHasJoined] = useState(false)
    useEffect(() => {
        if (autoJoin && !hasJoined) {
            setHasJoined(true)
        }
    }, [autoJoin, hasJoined])
    const [micOn, setMicOn] = useState(true)
    const [cameraOn, setCameraOn] = useState(true)

    // Chat
    const [messages, setMessages] = useState<Message[]>([])
    const [messageInput, setMessageInput] = useState('')
    
    // --- TRADUCTOR ---
    const [isVoiceActive, setIsVoiceActive] = useState(false);
    const isVoiceActiveRef = useRef(false); // Ref para callbacks
    const [isSpeaking, setIsSpeaking] = useState(false);
    
    // IDIOMAS (Default ES -> EN)
    const [targetLang, setTargetLang] = useState('en');
    const [sourceLang, setSourceLang] = useState('es');
    
    // SUBTÍTULOS
    const [subtitle, setSubtitle] = useState('');
    const [interimSubtitle, setInterimSubtitle] = useState('');

    // Recursos
    const [showResources, setShowResources] = useState(false)
    const [resources, setResources] = useState<any[]>([])
    const [activeResource, setActiveResource] = useState<any>(null)
    const [resourceScale, setResourceScale] = useState(1);
    const [resourceRotation, setResourceRotation] = useState(0);
    const [resourcePosition, setResourcePosition] = useState({ x: 0, y: 0 });

    // --- NUEVO ESTADO PARA LA IMAGEN DE LA PIZARRA ---
    const [whiteboardImage, setWhiteboardImage] = useState<string | null>(null)

    // Cobro
    const [bookingDetails, setBookingDetails] = useState<any>(null)
    const [isFinishing, setIsFinishing] = useState(false)

    // Refs
    const localVideoRef = useRef<HTMLVideoElement>(null)
    const remoteVideoRef = useRef<HTMLVideoElement>(null)
    const lobbyStreamRef = useRef<MediaStream | null>(null) 
    const recognitionRef = useRef<any>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null)

    // WebRTC - CORREGIDO: Solo se activa cuando el rol y el ID están definidos para evitar desincronización
    const isInitiator = userRole === 'teacher';
    const { localStream, remoteStream, isConnected } = useWebRTC(
        (hasJoined && !isRoleLoading && userId) ? (roomId as string) : '', 
        userId || '', 
        isInitiator
    );

    const TEXTS = {
        teacher: { joinBtn: 'Iniciar Clase', labelRemote: 'Estudiante', labelLocal: 'Tú', placeholder: 'Escribe...', translateBtn: 'ACTIVAR VOZ', translatingBtn: 'ESCUCHANDO...', exit: 'SALIR', resourcesTitle: 'Biblioteca' },
        student: { joinBtn: 'Join Class', labelRemote: 'Tutor', labelLocal: 'You', placeholder: 'Type...', translateBtn: 'ACTIVATE VOICE', translatingBtn: 'LISTENING...', exit: 'LEAVE', resourcesTitle: 'Library' }
    }

    // --- 1. ROL Y DATOS ---
    useEffect(() => {
        const fetchUserRoleAndBooking = async () => {
            setIsRoleLoading(true);
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    setUserRole('student');
                } else {
                    setUserId(user.id);
                    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
                    const role = (profile?.role || 'student') as 'teacher' | 'student';
                    setUserRole(role);

                    // Configurar idiomas por defecto según rol
                    if (role === 'teacher') {
                        setSourceLang('es'); setTargetLang('en');
                        const { data: booking } = await supabase.from('bookings').select('*').eq('teacher_id', user.id).eq('status', 'confirmed').order('time', { ascending: true }).limit(1).single()
                        if (booking) setBookingDetails(booking)
                    } else {
                        setSourceLang('en'); setTargetLang('es');
                    }
                }
            } catch (error) { console.error("Error:", error); } 
            finally { setIsRoleLoading(false); }
        }
        fetchUserRoleAndBooking()
    }, [supabase, router])

    // --- 2. RECURSOS ---
    useEffect(() => {
        if (userRole === 'teacher' && userId) {
            const fetchResources = async () => {
                const { data } = await supabase.from('resources').select('*').eq('teacher_id', userId).order('created_at', { ascending: false });
                if (data) setResources(data);
            };
            fetchResources();
        }
    }, [userRole, userId, supabase]);

    const t = userRole === 'teacher' ? TEXTS.teacher : TEXTS.student;

    // --- 3. VIDEO ---
    useEffect(() => {
        const initLobby = async () => {
            if (!hasJoined && !lobbyStreamRef.current) {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 }, audio: true });
                    lobbyStreamRef.current = stream;
                    if (localVideoRef.current) {
                        localVideoRef.current.srcObject = stream;
                        localVideoRef.current.muted = true;
                    }
                } catch (e) { console.error("Error Lobby", e) }
            }
        };
        if (!hasJoined) initLobby();
        return () => { if (hasJoined && lobbyStreamRef.current) lobbyStreamRef.current.getTracks().forEach(t => t.stop()); }
    }, [hasJoined]);

    useEffect(() => {
        if (hasJoined && localStream && localVideoRef.current) {
            localVideoRef.current.srcObject = localStream;
            localVideoRef.current.muted = true;
            localVideoRef.current.play().catch(e => console.log("Autoplay:", e));
        }
    }, [localStream, hasJoined]);

    useEffect(() => {
        if (remoteStream && remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
            remoteVideoRef.current.play().catch(e => console.log("Remote Autoplay:", e));
        }
    }, [remoteStream]);

    useEffect(() => {
        const activeStream = hasJoined ? localStream : lobbyStreamRef.current;
        if (activeStream) {
            activeStream.getAudioTracks().forEach(t => t.enabled = micOn);
            activeStream.getVideoTracks().forEach(t => t.enabled = cameraOn);
        }
    }, [micOn, cameraOn, localStream, hasJoined]);

    // =========================================================
    // 🧠 TRADUCTOR (GOOGLE API)
    // =========================================================
    
    const translateText = async (text: string, source: string, target: string) => {
        if (!text.trim() || source === target) return text;
        try {
            const url = `https://translation.googleapis.com/language/translate/v2?key=${GOOGLE_API_KEY}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ q: text, source: source, target: target, format: 'text' })
            });

            const data = await response.json();
            if (data.error || !data.data) {
                console.warn("Google API Error, fallback...", data);
                const fbRes = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${source}|${target}`);
                const fbData = await fbRes.json();
                return fbData.responseData.translatedText || text;
            }
            return data.data.translations[0].translatedText;
        } catch (error) { 
            return text; 
        }
    };

    // A. Escuchar voz del otro
    useEffect(() => {
        if (!hasJoined) return;
        const channel = supabase.channel(`room-voice-${roomId}`)
            .on('broadcast', { event: 'voice_translation' }, ({ payload }) => {
                const langObj = SUPPORTED_LANGUAGES.find(l => l.code === sourceLang);
                playAudio(payload.text, langObj?.speechCode || 'es-ES'); 
                setSubtitle(`${t.labelRemote}: ${payload.text}`);
                setTimeout(() => setSubtitle(''), 6000);
            })
            .subscribe();
        return () => { supabase.removeChannel(channel) }
    }, [roomId, hasJoined, sourceLang, userId]);

    // B. Text-to-Speech
    const playAudio = (text: string, lang: string) => {
        if (!window.speechSynthesis) return;
        setIsSpeaking(true);
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        utterance.rate = 1; 
        utterance.onend = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
    };

    // C. Speech-to-Text (Auto-Restart)
    const startRecognition = useCallback(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) return;

        if (recognitionRef.current) try { recognitionRef.current.stop(); } catch(e){}

        const recognition = new SpeechRecognition();
        recognition.continuous = true; 
        recognition.interimResults = true;
        
        const langObj = SUPPORTED_LANGUAGES.find(l => l.code === sourceLang);
        recognition.lang = langObj?.speechCode || 'es-ES';
        
        recognition.onstart = () => { setInterimSubtitle('Escuchando...'); };
        recognition.onend = () => { 
            if (isVoiceActiveRef.current) {
                setTimeout(() => { if (isVoiceActiveRef.current) recognition.start(); }, 200);
            } else {
                setInterimSubtitle('');
            }
        };
        
        recognition.onresult = async (event: any) => {
            const result = event.results[event.results.length - 1];
            const transcript = result[0].transcript;
            
            if (!result.isFinal) {
                setInterimSubtitle(transcript);
            } else {
                if (!transcript.trim()) return;
                setInterimSubtitle('Traduciendo...');

                const translated = await translateText(transcript, sourceLang, targetLang);
                
                await supabase.channel(`room-voice-${roomId}`).send({
                    type: 'broadcast', event: 'voice_translation',
                    payload: { text: translated, sender: userId }
                });

                setSubtitle(`${t.labelLocal}: ${translated}`);
                setInterimSubtitle('');
                setTimeout(() => setSubtitle(''), 5000);
            }
        };

        recognitionRef.current = recognition;
        recognition.start();

    }, [sourceLang, targetLang, userId, roomId]);

    const toggleVoiceTranslator = () => {
        if (isVoiceActive) {
            setIsVoiceActive(false);
            isVoiceActiveRef.current = false;
            if (recognitionRef.current) recognitionRef.current.stop();
        } else {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (!SpeechRecognition) { alert("Navegador no compatible. Usa Chrome."); return; }
            setIsVoiceActive(true);
            isVoiceActiveRef.current = true;
            startRecognition();
        }
    };

    useEffect(() => {
        if (isVoiceActive) startRecognition();
    }, [sourceLang, startRecognition]);

    // --- INTERFAZ ---
    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault(); if (!messageInput.trim()) return;
        const originalText = messageInput;
        
        // 1. Mostrar mensaje
        setMessages(prev => [...prev, { sender: t.labelLocal, text: originalText }]);
        setMessageInput('');

        // 2. Traducir
        try {
            const translatedText = await translateText(originalText, sourceLang, targetLang);
            if (translatedText && translatedText.toLowerCase() !== originalText.toLowerCase()) {
                setMessages(prev => [...prev, { 
                    sender: "Traductor", 
                    text: translatedText, 
                    isTranslation: true 
                }]);
            }
        } catch (e) { console.error(e); }
    }

    const handleFinishClass = async () => {
        if (!bookingDetails) return alert("No hay reserva activa.");
        if (!confirm(`¿Terminar clase?`)) return;
        setIsFinishing(true);
        try {
            const total = Number(bookingDetails.price_paid || 0);
            const earn = total * 0.80; 
            await supabase.from('bookings').update({ status: 'completed' }).eq('id', bookingDetails.id);
            const { data: wallet } = await supabase.from('wallets').select('balance').eq('user_id', userId).single();
            await supabase.from('wallets').update({ balance: (Number(wallet?.balance || 0) + earn) }).eq('user_id', userId);
            alert(`✅ Clase terminada.`);
            router.push('/dashboard/teacher');
        } catch (error: any) { alert("Error: " + error.message); } 
        finally { setIsFinishing(false); }
    }

    // --- FUNCIÓN CLAVE (PARA CONECTAR CON PIZARRA) ---
    const handleShareResource = async (resource: any) => {
        // DETECCIÓN: Si es imagen, dibujarla en la pizarra (canvas) para poder escribir encima
        if (resource.file_type === 'image' || resource.file_url?.match(/\.(jpeg|jpg|gif|png|webp)$/i)) {
            setWhiteboardImage(resource.file_url);
            setActiveResource(null);

            // Enviar evento a la pizarra (todos los clientes en room-${roomId})
            await supabase.channel(`room-${roomId}`).send({
                type: 'broadcast',
                event: 'draw_image',
                payload: {
                    // Coordenadas aproximadas al centro; el Whiteboard las usa tal cual
                    x: 200,
                    y: 150,
                    url: resource.file_url
                }
            });
        } else {
            // Si no es imagen (texto/pdf), usar el overlay
            setActiveResource(resource);
            setWhiteboardImage(null);
        }
        setShowResources(false);
        setResourceScale(1); setResourceRotation(0); setResourcePosition({x:0, y:0});
    }

    if (isRoleLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-indigo-600 w-10 h-10" /></div>

    if (!hasJoined) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
                <div className="w-full max-w-lg bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
                    <div className="h-64 bg-black relative">
                        <video ref={localVideoRef} autoPlay muted playsInline className={`w-full h-full object-cover transform scale-x-[-1] ${!cameraOn && 'hidden'}`} />
                        <div className="absolute bottom-4 flex justify-center w-full gap-4">
                            <button onClick={() => setMicOn(!micOn)} className={`p-3 rounded-full ${micOn ? 'bg-slate-700' : 'bg-red-500'} text-white`}>{micOn ? <Mic size={20} /> : <MicOff size={20} />}</button>
                            <button onClick={() => setCameraOn(!cameraOn)} className={`p-3 rounded-full ${cameraOn ? 'bg-slate-700' : 'bg-red-500'} text-white`}>{cameraOn ? <Video size={20} /> : <VideoOff size={20} />}</button>
                        </div>
                    </div>
                    <div className="p-8 text-center">
                        <button onClick={() => setHasJoined(true)} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl font-bold transition-all">ENTRAR</button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="h-screen bg-slate-100 flex flex-col font-sans overflow-hidden">
            {/* HEADER MEJORADO */}
            <header className="h-16 bg-white border-b border-slate-200 flex items_center justify-between px-6 shrink-0 z-10 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-amber-500 animate-pulse'}`}/>
                    
                    {/* AQUI ARREGLAMOS EL TITULO PARA QUE DIGA SOLO AULA */}
                    <span className="font-bold text-slate-800 text-lg">AULA</span>
                </div>
                
                <div className="flex gap-4 items-center">
                    {/* BOTÓN MICROFONO */}
                    <button 
                        onClick={toggleVoiceTranslator}
                        className={`flex items-center gap-3 px-5 py-2 rounded-full border-2 transition-all shadow-sm ${
                            isVoiceActive 
                            ? 'bg-red-50 border-red-500 text-red-600 ring-2 ring-red-100' 
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                    >
                        {isSpeaking && <Volume2 className="w-5 h-5 animate-bounce text-indigo-600"/>}
                        <span className="font-bold text-sm tracking-wide">
                            {isVoiceActive ? t.translatingBtn : t.translateBtn}
                        </span>
                        {isVoiceActive ? <Mic size={18} className="animate-pulse" /> : <MicOff size={18} />}
                    </button>

                    {/* SELECTOR DE IDIOMAS */}
                    <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border-2 border-slate-200 shadow-sm">
                        <Languages className="w-5 h-5 text-indigo-500 mr-1"/>
                        <div className="relative group">
                            <select value={sourceLang} onChange={(e) => setSourceLang(e.target.value)} className="appearance-none bg-transparent font-bold text-slate-700 outline-none cursor-pointer text-sm pr-6 hover:text-indigo-600">
                                {SUPPORTED_LANGUAGES.map(lang => (
                                    <option key={`src-${lang.code}`} value={lang.code}>{lang.flag} {lang.code.toUpperCase()}</option>
                                ))}
                            </select>
                            <ChevronDown className="w-3 h-3 absolute right-0 top-1.5 text-slate-400 pointer-events-none"/>
                        </div>
                        <span className="text-slate-300 font-light mx-1">➜</span>
                        <div className="relative group">
                            <select value={targetLang} onChange={(e) => setTargetLang(e.target.value)} className="appearance-none bg-transparent font-bold text-indigo-600 outline_none cursor-pointer text-sm pr-6 hover:text-indigo-800">
                                {SUPPORTED_LANGUAGES.map(lang => (
                                    <option key={`tgt-${lang.code}`} value={lang.code}>{lang.flag} {lang.code.toUpperCase()}</option>
                                ))}
                            </select>
                            <ChevronDown className="w-3 h-3 absolute right-0 top-1.5 text-indigo-300 pointer-events-none"/>
                        </div>
                    </div>
                </div>
            </header>

            {/* AREA PRINCIPAL */}
            <div className="flex-1 flex overflow-hidden relative">
                <div className="flex-1 bg-slate-100 relative flex flex-col items-center justify-center p-4">
                    <div className="w-full h-full border border-slate-300 rounded-2xl overflow-hidden shadow-lg bg-white relative">
                        
                        {/* WHITEBOARD con props correctas */}
                        <Whiteboard
                            roomId={roomId as string}
                            role={(userRole || 'student') as 'teacher' | 'student'}
                        />

                        {activeResource && (
                            <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-0"
                                style={{ transform: `translate(${resourcePosition.x}px, ${resourcePosition.y}px) scale(${resourceScale}) rotate(${resourceRotation}deg)`, transition: 'transform 0.1s linear', transformOrigin: 'center center' }}>
                                {activeResource.file_format === 'IA-DOC' ? (
                                    <div className="bg-white p-8 shadow-2xl border border-slate-200 rounded-xl max-w-2xl max-h-[80%] overflow-y-auto pointer-events-auto prose prose-sm">
                                        <h3 className="text-xl font-bold mb-4 text-indigo-700">{activeResource.title}</h3>
                                        <div className="whitespace-pre-wrap">{activeResource.content_text}</div>
                                    </div>
                                ) : ( 
                                    activeResource.file_url ? <img src={activeResource.file_url} className="w-full h-full object-contain" alt="Recurso" /> : null 
                                )}
                                <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-[50] pointer-events-auto">
                                    <button onClick={() => { setActiveResource(null); setResourceScale(1); }} className="bg-white shadow-lg text-red-600 hover:bg-red-50 p-2 rounded-full border border-slate-200"><Trash2 size={20}/></button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* SIDEBAR DERECHA */}
                <div className="w-[320px] bg-white border-l border-slate-200 flex flex-col shrink-0 shadow-xl z-30">
                    <div className="bg-slate-900 p-2 flex flex-col gap-2 shrink-0 h-[300px]">
                        <div className="flex-1 bg-slate-800 rounded-lg overflow-hidden relative border border-slate-700">
                            <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
                        </div>
                        <div className="h-28 bg-black rounded-lg overflow-hidden relative border border-slate-700 shadow-lg">
                            <video ref={localVideoRef} autoPlay muted playsInline className={`w-full h-full object-cover transform scale-x-[-1] ${!cameraOn && 'opacity-0'}`} />
                        </div>
                    </div>
                    
                    <div className="flex-1 flex flex-col min-h-0 bg-slate-50 border-t border-slate-200">
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {messages.map((msg, i) => (
                                <div key={i} className={`flex flex-col ${msg.sender === t.labelLocal ? 'items-end' : 'items-start'}`}>
                                    <div className={`px-4 py-2.5 rounded-2xl text-xs max-w-[90%] shadow-sm ${msg.isTranslation ? 'bg-amber-50 text-amber-900 border border-amber-200 italic' : (msg.sender === t.labelLocal ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white border border-slate-200 rounded-bl-none')}`}>{msg.text}</div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>
                        <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-slate-200 flex gap-2">
                            <input value={messageInput} onChange={(e) => setMessageInput(e.target.value)} placeholder={t.placeholder} className="flex-1 bg-slate-100 text-sm px-4 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 transition-all" />
                            <button type="submit" disabled={!messageInput.trim()} className="bg-indigo-600 hover:bg-indigo-700 text-white p-2.5 rounded-xl transition-colors"><Send size={18} /></button>
                        </form>
                    </div>
                </div>

                {/* MODAL RECURSOS */}
                {showResources && userRole === 'teacher' && (
                    <div className="absolute left-0 top-0 bottom-0 w-64 bg-white border-r border-slate-200 shadow-2xl z-40 flex flex-col animate-in slide-in-from-left duration-200">
                        <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-slate-800 text-sm">{t.resourcesTitle}</h3>
                            <button onClick={() => setShowResources(false)}><X className="w-4 h-4 text-slate-400"/></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-2">
                             {resources.map(res => (
                                <div key={res.id} onClick={() => handleShareResource(res)} className="p-3 bg-white rounded-lg border border-slate-100 hover:border-indigo-400 cursor-pointer text-xs truncate shadow-sm transition-all hover:shadow-md">
                                    {res.title}
                                </div>
                             ))}
                        </div>
                    </div>
                )}
            </div>

            {/* FOOTER */}
            <footer className="h-16 bg-white border-t border-slate-200 flex items-center px-6 shrink-0 z-40 relative shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                <div className="flex gap-3 w-1/4">
                    <button onClick={() => setMicOn(!micOn)} className={`p-3 rounded-xl transition-all ${micOn ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>{micOn ? <Mic size={20}/> : <MicOff size={20}/>}</button>
                    <button onClick={() => setCameraOn(!cameraOn)} className={`p-3 rounded-xl transition-all ${cameraOn ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>{cameraOn ? <Video size={20}/> : <VideoOff size={20}/>}</button>
                </div>
                
                {/* SUBTÍTULOS FLOTANTES */}
                <div className="flex-1 flex justify-center px-4 relative">
                   { (subtitle || interimSubtitle) && (
                      <div className="absolute bottom-2 bg-slate-900/95 text-white px-8 py-4 rounded-2xl text-sm font-medium shadow-2xl backdrop-blur-md max-w-2xl w-full text-center border border-slate-700/50 animate-in slide-in-from-bottom-4 duration-300 pointer-events-none z-50">
                         <div className="flex flex-col gap-1">
                            <span className="text-indigo-400 font-bold text-[10px] uppercase tracking-widest">{interimSubtitle ? 'ESCUCHANDO...' : 'TRADUCCIÓN'}</span>
                            <span className="text-lg leading-snug">{subtitle || interimSubtitle}</span>
                         </div>
                      </div>
                   )}
                </div>

                <div className="flex gap-3 w-1/4 justify-end">
                    {userRole === 'teacher' && (
                        <>
                            <button onClick={() => setShowResources(!showResources)} className="px-5 py-2.5 rounded-xl text-xs font-bold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors">Recursos</button>
                            <button onClick={handleFinishClass} disabled={isFinishing} className="px-5 py-2.5 bg-green-600 text-white hover:bg-green-700 text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm shadow-green-200 transition-all">{isFinishing ? <Loader2 className="w-4 h-4 animate-spin"/> : <CheckCircle className="w-4 h-4"/>} Cobrar</button>
                        </>
                    )}
                    <button onClick={() => router.push('/')} className="px-5 py-2.5 bg-red-50 text-red-600 hover:bg-red-100 border border-red-100 rounded-xl text-xs font-bold transition-colors">{t.exit}</button>
                </div>
            </footer>
        </div>
    )
}