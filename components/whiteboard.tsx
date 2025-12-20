'use client'

import { useEffect, useRef, useState } from 'react'
import { Eraser, Pen, Download, Trash2, Undo, Redo, Image as ImageIcon, ZoomIn, ZoomOut, Move } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

// Tipos para los trazos
interface Point { x: number, y: number }
interface DrawPath {
  points: Point[]
  color: string
  width: number
  tool: 'pen' | 'eraser'
}

interface WhiteboardProps {
  roomId: string
  userRole: 'teacher' | 'student'
  socket: any
  // Prop nueva opcional para recibir imagen externa desde la Sala
  externalImage?: string | null 
}

export default function Whiteboard({ roomId, userRole, socket, externalImage }: WhiteboardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Estados de Herramientas
  const [color, setColor] = useState('#000000')
  const [lineWidth, setLineWidth] = useState(2)
  const [tool, setTool] = useState<'pen' | 'eraser' | 'move'>('pen')
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  
  // Historial y Estado
  const [paths, setPaths] = useState<DrawPath[]>([])
  const [redoStack, setRedoStack] = useState<DrawPath[]>([])
  const [isDrawing, setIsDrawing] = useState(false)
  
  // Imagen de Fondo
  const [backgroundImage, setBackgroundImage] = useState<HTMLImageElement | null>(null)

  // Referencias para evitar re-renders en loops de dibujo
  const currentPath = useRef<Point[]>([])

  // Efecto para cargar imagen externa si llega (desde la biblioteca del maestro)
  useEffect(() => {
    if (externalImage) {
        const img = new Image()
        img.src = externalImage
        img.crossOrigin = "Anonymous"
        img.onload = () => {
            setBackgroundImage(img)
            // Centrar imagen
            if (canvasRef.current) {
               redrawCanvas(paths, img) // Redibujar con la nueva imagen
            }
        }
    }
  }, [externalImage])


  // INICIALIZACIÓN DEL CANVAS Y SOCKETS
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Ajustar tamaño al contenedor
    const resizeCanvas = () => {
       if (containerRef.current && canvas) {
         canvas.width = containerRef.current.clientWidth
         canvas.height = containerRef.current.clientHeight
         redrawCanvas(paths, backgroundImage)
       }
    }
    
    window.addEventListener('resize', resizeCanvas)
    resizeCanvas()

    // EVENTOS DE SOCKET (Recibir dibujos de otros)
    if (socket) {
      socket.on('draw-start', (data: any) => {
         // Lógica opcional para mostrar cursor del otro usuario
      })

      socket.on('draw', (data: { path: DrawPath }) => {
         setPaths(prev => {
            const newPaths = [...prev, data.path]
            redrawCanvas(newPaths, backgroundImage)
            return newPaths
         })
      })

      socket.on('clear-canvas', () => {
         setPaths([])
         setRedoStack([])
         // CORRECCIÓN: Limpiar visualmente inmediato
         const ctx = canvasRef.current?.getContext('2d')
         if(ctx) {
             ctx.clearRect(0, 0, canvas.width, canvas.height)
             // Si hay imagen de fondo, la volvemos a poner (limpiar solo trazos)
             if(backgroundImage) {
                 redrawCanvas([], backgroundImage)
             }
         }
      })

      socket.on('background-image', (imgUrl: string) => {
         const img = new Image()
         img.src = imgUrl
         img.onload = () => {
            setBackgroundImage(img)
            redrawCanvas(paths, img)
         }
      })
    }

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      socket?.off('draw')
      socket?.off('clear-canvas')
    }
  }, [socket, backgroundImage]) // Dependencia backgroundImage importante para redibujar bien


  // FUNCIÓN PRINCIPAL DE DIBUJADO (CORREGIDA PARA SOPORTAR IMÁGENES DE FONDO)
  const redrawCanvas = (pathsToDraw: DrawPath[], bgImg: HTMLImageElement | null = backgroundImage) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      // 1. Limpiar todo
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      ctx.save()
      
      // 2. Aplicar Zoom y Pan
      ctx.translate(pan.x, pan.y)
      ctx.scale(zoom, zoom)

      // 3. DIBUJAR IMAGEN DE FONDO (Primero, para que quede atrás)
      if (bgImg) {
          // Centrar imagen o ajustarla (lógica simple: fit contain)
          const ratio = Math.min(canvas.width / bgImg.width, canvas.height / bgImg.height)
          const w = bgImg.width * ratio * 0.8 // 80% del tamaño
          const h = bgImg.height * ratio * 0.8
          const x = (canvas.width - w) / 2
          const y = (canvas.height - h) / 2
          ctx.drawImage(bgImg, x, y, w, h)
      }

      // 4. DIBUJAR TRAZOS
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      pathsToDraw.forEach(path => {
          if (path.points.length < 1) return
          
          ctx.beginPath()
          ctx.moveTo(path.points[0].x, path.points[0].y)
          
          path.points.forEach(p => ctx.lineTo(p.x, p.y))
          
          ctx.strokeStyle = path.tool === 'eraser' ? '#ffffff' : path.color
          // Si es borrador y hay imagen, debería ser "transparente" o color de fondo?
          // Por simplicidad, el borrador pinta blanco. (Para borrar real sobre imagen se requiere 'destination-out')
          if (path.tool === 'eraser' && bgImg) {
              ctx.globalCompositeOperation = 'destination-out' // Borra mostrando la imagen? No, borra todo. 
              // Si queremos borrar SOLO trazos, pintamos blanco, pero tapará la imagen.
              // Mejor dejémoslo simple: Borrador = Pinta Blanco.
              // Si quieres borrar trazos sin borrar imagen, es más complejo (capas).
              ctx.strokeStyle = 'rgba(255,255,255,1)' 
          } else {
              ctx.globalCompositeOperation = 'source-over'
          }

          ctx.lineWidth = path.width
          ctx.stroke()
      })

      ctx.restore()
  }

  // MANEJO DEL MOUSE / TOUCH
  const getCoords = (e: any) => {
      const canvas = canvasRef.current
      if (!canvas) return { x: 0, y: 0 }
      const rect = canvas.getBoundingClientRect()
      const clientX = e.touches ? e.touches[0].clientX : e.clientX
      const clientY = e.touches ? e.touches[0].clientY : e.clientY
      
      // Ajustar coordenadas considerando el Zoom y Pan inverso
      return {
          x: (clientX - rect.left - pan.x) / zoom,
          y: (clientY - rect.top - pan.y) / zoom
      }
  }

  const startDrawing = (e: any) => {
      if (tool === 'move') return
      setIsDrawing(true)
      const coords = getCoords(e)
      currentPath.current = [coords]
  }

  const draw = (e: any) => {
      if (!isDrawing || tool === 'move') return
      e.preventDefault() // Evitar scroll en touch

      const coords = getCoords(e)
      currentPath.current.push(coords)

      // Dibujado Optimista (Rápido)
      const canvas = canvasRef.current
      const ctx = canvas?.getContext('2d')
      if (ctx && canvas) {
          ctx.save()
          ctx.translate(pan.x, pan.y)
          ctx.scale(zoom, zoom)
          
          ctx.beginPath()
          const prev = currentPath.current[currentPath.current.length - 2]
          ctx.moveTo(prev.x, prev.y)
          ctx.lineTo(coords.x, coords.y)
          
          ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color
          ctx.lineWidth = lineWidth
          ctx.lineCap = 'round'
          ctx.stroke()
          
          ctx.restore()
      }
  }

  const stopDrawing = () => {
      if (!isDrawing || tool === 'move') return
      setIsDrawing(false)

      if (currentPath.current.length > 0) {
          const newPath: DrawPath = {
              points: currentPath.current,
              color: color,
              width: lineWidth,
              tool: tool === 'eraser' ? 'eraser' : 'pen'
          }
          
          // Actualizar estado local
          const newPaths = [...paths, newPath]
          setPaths(newPaths)
          setRedoStack([]) // Limpiar redo al hacer nueva acción

          // Emitir a otros usuarios
          if (socket) {
              socket.emit('draw', { roomId, path: newPath })
          }
          
          // Redibujar limpio (para asegurar capas)
          redrawCanvas(newPaths, backgroundImage)
      }
      currentPath.current = []
  }

  // ACCIONES DE BARRA DE HERRAMIENTAS
  const clearBoard = () => {
      if(!confirm("¿Borrar toda la pizarra?")) return
      setPaths([])
      setRedoStack([])
      if (socket) socket.emit('clear-canvas', { roomId })
      
      // Limpiar visualmente manteniendo fondo
      redrawCanvas([], backgroundImage)
  }

  const undo = () => {
      if (paths.length === 0) return
      const last = paths[paths.length - 1]
      const newPaths = paths.slice(0, -1)
      setPaths(newPaths)
      setRedoStack([last, ...redoStack])
      redrawCanvas(newPaths, backgroundImage)
      // Nota: Undo/Redo sincronizado por sockets es complejo, 
      // por ahora es local o requiere emitir el estado completo.
  }

  const redo = () => {
      if (redoStack.length === 0) return
      const next = redoStack[0]
      const newRedo = redoStack.slice(1)
      const newPaths = [...paths, next]
      setPaths(newPaths)
      setRedoStack(newRedo)
      redrawCanvas(newPaths, backgroundImage)
  }

  // SUBIDA DE IMAGEN LOCAL (Desde el dispositivo)
  const handleImageUpload = (e: any) => {
      const file = e.target.files[0]
      if (!file) return
      
      const reader = new FileReader()
      reader.onload = (evt) => {
          const img = new Image()
          img.src = evt.target?.result as string
          img.onload = () => {
              setBackgroundImage(img)
              redrawCanvas(paths, img)
              
              // Emitir imagen a otros
              if(socket) {
                  socket.emit('background-image', { roomId, imgUrl: img.src })
              }
          }
      }
      reader.readAsDataURL(file)
  }

  return (
    <div className="relative w-full h-full bg-white rounded-xl shadow-inner overflow-hidden border border-slate-200" ref={containerRef}>
        
        <canvas
            ref={canvasRef}
            className={`w-full h-full touch-none ${tool === 'move' ? 'cursor-grab' : 'cursor-crosshair'}`}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
        />

        {/* BARRA DE HERRAMIENTAS FLOTANTE */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur shadow-lg rounded-2xl p-2 flex items-center gap-2 border border-slate-200">
            
            {/* Colores */}
            <div className="flex gap-1 pr-2 border-r border-slate-200">
                {['#000000', '#ef4444', '#22c55e', '#3b82f6'].map(c => (
                    <button 
                        key={c}
                        onClick={() => { setColor(c); setTool('pen') }}
                        className={`w-6 h-6 rounded-full border-2 transition-transform ${color === c && tool === 'pen' ? 'border-slate-800 scale-110' : 'border-transparent hover:scale-105'}`}
                        style={{ backgroundColor: c }}
                    />
                ))}
            </div>

            {/* Herramientas Principales */}
            <div className="flex gap-1">
                <button 
                    onClick={() => setTool('pen')} 
                    className={`p-2 rounded-lg ${tool === 'pen' ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-slate-100'}`}
                    title="Lápiz"
                >
                    <Pen size={18} />
                </button>
                <button 
                    onClick={() => setTool('eraser')} 
                    className={`p-2 rounded-lg ${tool === 'eraser' ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-slate-100'}`}
                    title="Borrador"
                >
                    <Eraser size={18} />
                </button>
                 <button 
                    onClick={() => setTool('move')} 
                    className={`p-2 rounded-lg ${tool === 'move' ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-slate-100'}`}
                    title="Mover/Pan"
                >
                    <Move size={18} />
                </button>
            </div>

            <div className="w-px h-6 bg-slate-200 mx-1"></div>

            {/* Acciones */}
            <div className="flex gap-1">
                <button onClick={undo} className="p-2 hover:bg-slate-100 rounded-lg disabled:opacity-30" disabled={paths.length === 0} title="Deshacer">
                    <Undo size={18}/>
                </button>
                <button onClick={redo} className="p-2 hover:bg-slate-100 rounded-lg disabled:opacity-30" disabled={redoStack.length === 0} title="Rehacer">
                    <Redo size={18}/>
                </button>
                <button onClick={clearBoard} className="p-2 hover:bg-red-50 text-red-500 rounded-lg" title="Limpiar Todo">
                    <Trash2 size={18}/>
                </button>
            </div>

            <div className="w-px h-6 bg-slate-200 mx-1"></div>

             {/* Imagen Local (Input oculto) */}
             <label className="p-2 hover:bg-slate-100 rounded-lg cursor-pointer text-slate-600" title="Subir Fondo">
                <ImageIcon size={18}/>
                <input type="file" hidden accept="image/*" onChange={handleImageUpload}/>
             </label>

        </div>
    </div>
  )
}
