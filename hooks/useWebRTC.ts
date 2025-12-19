import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import SimplePeer from 'simple-peer'

export const useWebRTC = (roomId: string, userId: string, isInitiator: boolean) => {
  const [supabase] = useState(() => createClient())
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  
  const peerRef = useRef<SimplePeer.Instance | null>(null)
  const channelRef = useRef<any>(null)

  useEffect(() => {
    if (!roomId || !userId) return;

    // CONFIGURACIÓN SUPER HD 1080P CON PROCESADO DE IMAGEN
    const constraints = {
        video: { 
            width: { min: 1280, ideal: 1920, max: 1920 },
            height: { min: 720, ideal: 1080, max: 1080 },
            frameRate: { ideal: 30 },
            facingMode: "user"
        },
        audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true // Ayuda a nivelar el audio
        }
    };

    navigator.mediaDevices.getUserMedia(constraints)
      .then((currentStream) => {
        // Aplicar ajustes de brillo si el navegador lo permite
        const videoTrack = currentStream.getVideoTracks()[0];
        const capabilities = videoTrack.getCapabilities() as any;
        
        // Si la cámara permite ajustes automáticos de brillo, los forzamos
        if (capabilities.exposureMode) {
            videoTrack.applyConstraints({
                advanced: [{ exposureMode: 'continuous' }]
            } as any).catch(e => console.log("Ajuste de exposición no soportado"));
        }

        setStream(currentStream)
        initializePeer(currentStream)
      })
      .catch((err) => {
        console.error("Error cámara:", err)
        setError("Error de hardware de video.")
      })

    return () => {
      peerRef.current?.destroy()
      if (channelRef.current) supabase.removeChannel(channelRef.current)
    }
  }, [roomId, userId]) 

  const initializePeer = (localStream: MediaStream) => {
    const peer = new SimplePeer({
      initiator: isInitiator,
      trickle: false,
      stream: localStream,
      config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }
    })

    peer.on('signal', (data: any) => {
      channelRef.current?.send({
        type: 'broadcast',
        event: 'signal',
        payload: { userId, signal: data }
      })
    })

    peer.on('stream', (remoteStream: any) => {
      setRemoteStream(remoteStream)
      setIsConnected(true)
    })

    peer.on('error', (err: any) => {
      console.error('Peer error:', err)
      setIsConnected(false)
    })
    
    peer.on('close', () => setIsConnected(false))
    peerRef.current = peer
    subscribeToSignaling()
  }

  const subscribeToSignaling = () => {
    const channel = supabase.channel(`room-${roomId}`)
    channel
      .on('broadcast', { event: 'signal' }, ({ payload }: { payload: any }) => {
        if (payload.userId === userId) return
        if (peerRef.current) peerRef.current.signal(payload.signal)
      })
      .subscribe()
    channelRef.current = channel
  }

  return { localStream: stream, remoteStream, isConnected, error }
}