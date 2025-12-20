'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Eraser,
  Pen,
  Download,
  Trash2,
  Undo,
  Redo,
  Image as ImageIcon,
  ZoomIn,
  ZoomOut,
  Move,
  ArrowRight,
  Pointer,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

// Tipos para los trazos
interface Point { x: number, y: number }

type Tool = 'pen' | 'eraser' | 'move' | 'arrow' | 'laser'

interface DrawPath {
  points: Point[]
  color: string
  width: number
  tool: Tool
  createdAt?: number
}

interface WhiteboardProps {
  roomId: string
  userRole: 'teacher' | 'student'
  socket: any
  // Prop nueva opcional para recibir imagen externa desde la Sala
  externalImage?: string | null

  // Controles PDF OPCIONALES (tú los conectas desde la página)
  pdfTotalPages?: number | null
  pdfCurrentPage?: number | null
  onPdfPrevPage?: () => void
  onPdfNextPage?: () => void
  onPdfClose?: () => void
}

export default function Whiteboard({
  roomId,
  userRole,
  socket,
  externalImage,
  pdfTotalPages = null,
  pdfCurrentPage = null,
  onPdfPrevPage,
  onPdfNextPage,
  onPdfClose,
}: WhiteboardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Estados de Herramientas
  const [color, setColor] = useState('#000000')
  const [lineWidth, setLineWidth] = useState(2)
  const [tool, setTool] = useState<Tool>('pen')
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

  const LASER_DURATION = 2000
  const isPdfActive = pdfTotalPages && pdfTotalPages > 0 && pdfCurrentPage !== null

  // Efecto para cargar imagen externa si llega (desde la biblioteca del maestro)
  useEffect(() => {
    if (externalImage) {
      const img = new Image()
      img.src = externalImage
      img.crossOrigin = "Anonymous"
      img.onload = () => {
        setBackgroundImage(img)
        if (canvasRef.current) {
          redrawCanvas(paths, img)
        }
      }
    }
  }, [externalImage])

  // INICIALIZACIÓN DEL CANVAS Y SOCKETS
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

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
        // cursor remoto opcional
      })

      socket.on('draw', (data: { path: DrawPath }) => {
        const incoming = data.path
        setPaths(prev => {
          const newPaths = [...prev, incoming]
          redrawCanvas(newPaths, backgroundImage)
          return newPaths
        })

        if (incoming.tool === 'laser') {
          setTimeout(() => {
            setPaths(prev => {
              const filtered = prev.filter(p => p !== incoming)
              redrawCanvas(filtered, backgroundImage)
              return filtered
            })
          }, LASER_DURATION)
        }
      })

      socket.on('clear-canvas', () => {
        setPaths([])
        setRedoStack([])
        const ctx = canvasRef.current?.getContext('2d')
        if(ctx && canvas) {
          ctx.clearRect(0, 0, canvas.width, canvas.height)
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
      socket?.off('background-image')
    }
  }, [socket, backgroundImage, zoom, pan, paths])

  // FUNCIÓN PRINCIPAL DE DIBUJADO
  const redrawCanvas = (pathsToDraw: DrawPath[], bgImg: HTMLImageElement | null = backgroundImage) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    ctx.save()
    
    ctx.translate(pan.x, pan.y)
    ctx.scale(zoom, zoom)

    // FONDO
    if (bgImg) {
      const ratio = Math.min(canvas.width / bgImg.width, canvas.height / bgImg.height)
      const w = bgImg.width * ratio * 0.8
      const h = bgImg.height * ratio * 0.8
      const x = (canvas.width - w) / 2
      const y = (canvas.height - h) / 2
      ctx.drawImage(bgImg, x, y, w, h)
    }

    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    pathsToDraw.forEach(path => {
      if (path.points.length < 1) return

      ctx.globalAlpha = path.tool === 'laser' ? 0.85 : 1

      if (path.tool === 'arrow') {
        const start = path.points[0]
        const end = path.points[path.points.length - 1]

        ctx.beginPath()
        ctx.strokeStyle = path.color
        ctx.lineWidth = path.width
        ctx.moveTo(start.x, start.y)
        ctx.lineTo(end.x, end.y)
        ctx.stroke()

        const headLength = 10 + path.width * 2
        const angle = Math.atan2(end.y - start.y, end.x - start.x)
        ctx.beginPath()
        ctx.moveTo(end.x, end.y)
        ctx.lineTo(
          end.x - headLength * Math.cos(angle - Math.PI / 6),
          end.y - headLength * Math.sin(angle - Math.PI / 6)
        )
        ctx.lineTo(
          end.x - headLength * Math.cos(angle + Math.PI / 6),
          end.y - headLength * Math.sin(angle + Math.PI / 6)
        )
        ctx.lineTo(end.x, end.y)
        ctx.fillStyle = path.color
        ctx.fill()
        return
      }

      ctx.beginPath()
      ctx.moveTo(path.points[0].x, path.points[0].y)
      path.points.forEach(p => ctx.lineTo(p.x, p.y))

      if (path.tool === 'eraser') {
        ctx.globalCompositeOperation = 'source-over'
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = path.width * 2
      } else if (path.tool === 'laser') {
        ctx.globalCompositeOperation = 'source-over'
        ctx.strokeStyle = '#ef4444'
        ctx.lineWidth = path.width * 2
      } else {
        ctx.globalCompositeOperation = 'source-over'
        ctx.strokeStyle = path.color
        ctx.lineWidth = path.width
      }

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
    if (tool === 'move' && e.buttons === 1) {
      const movementX = e.movementX || 0
      const movementY = e.movementY || 0
      setPan(prev => ({ x: prev.x + movementX, y: prev.y + movementY }))
      redrawCanvas(paths, backgroundImage)
      return
    }

    if (!isDrawing || tool === 'move') return
    e.preventDefault()

    const coords = getCoords(e)
    currentPath.current.push(coords)

    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (ctx && canvas) {
      ctx.save()
      ctx.translate(pan.x, pan.y)
      ctx.scale(zoom, zoom)
      
      if (tool === 'arrow') {
        redrawCanvas(paths, backgroundImage)
        const start = currentPath.current[0]
        const end = coords

        ctx.beginPath()
        ctx.strokeStyle = color
        ctx.lineWidth = lineWidth
        ctx.moveTo(start.x, start.y)
        ctx.lineTo(end.x, end.y)
        ctx.stroke()

        const headLength = 10 + lineWidth * 2
        const angle = Math.atan2(end.y - start.y, end.x - start.x)
        ctx.beginPath()
        ctx.moveTo(end.x, end.y)
        ctx.lineTo(
          end.x - headLength * Math.cos(angle - Math.PI / 6),
          end.y - headLength * Math.sin(angle - Math.PI / 6)
        )
        ctx.lineTo(
          end.x - headLength * Math.cos(angle + Math.PI / 6),
          end.y - headLength * Math.sin(angle + Math.PI / 6)
        )
        ctx.lineTo(end.x, end.y)
        ctx.fillStyle = color
        ctx.fill()
      } else {
        ctx.beginPath()
        const prev = currentPath.current[currentPath.current.length - 2]
        ctx.moveTo(prev.x, prev.y)
        ctx.lineTo(coords.x, coords.y)
        
        if (tool === 'eraser') {
          ctx.strokeStyle = '#ffffff'
          ctx.lineWidth = lineWidth * 2
        } else if (tool === 'laser') {
          ctx.strokeStyle = '#ef4444'
          ctx.lineWidth = lineWidth * 2
        } else {
          ctx.strokeStyle = color
          ctx.lineWidth = lineWidth
        }
        ctx.lineCap = 'round'
        ctx.stroke()
      }
      
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
        tool: tool,
        createdAt: Date.now(),
      }
      
      const newPaths = [...paths, newPath]
      setPaths(newPaths)
      setRedoStack([])

      if (socket) {
        socket.emit('draw', { roomId, path: newPath })
      }
      
      redrawCanvas(newPaths, backgroundImage)

      if (tool === 'laser') {
        setTimeout(() => {
          setPaths(prev => {
            const filtered = prev.filter(p => p !== newPath)
            redrawCanvas(filtered, backgroundImage)
            return filtered
          })
        }, LASER_DURATION)
      }
    }
    currentPath.current = []
  }

  const clearBoard = () => {
    if(!confirm("¿Borrar toda la pizarra?")) return
    setPaths([])
    setRedoStack([])
    if (socket) socket.emit('clear-canvas', { roomId })
    redrawCanvas([], backgroundImage)
  }

  const undo = () => {
    if (paths.length === 0) return
    const last = paths[paths.length - 1]
    const newPaths = paths.slice(0, -1)
    setPaths(newPaths)
    setRedoStack([last, ...redoStack])
    redrawCanvas(newPaths, backgroundImage)
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
        if(socket) {
          socket.emit('background-image', { roomId, imgUrl: img.src })
        }
      }
    }
    reader.readAsDataURL(file)
  }

  const handleDownload = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `whiteboard-${roomId}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  const handleZoom = (delta: number) => {
    setZoom(prev => {
      const next = Math.max(0.5, Math.min(3, prev + delta))
      return next
    })
    setTimeout(() => redrawCanvas(paths, backgroundImage), 10)
  }

  return (
    <div className="relative w-full h-full bg-white rounded-xl shadow-inner overflow-hidden border border-slate-200" ref={containerRef}>
      
      {/* Barra PDF superior */}
      {isPdfActive && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 bg-white/95 border border-slate-200 shadow-md rounded-full px-3 py-1 flex items-center gap-3">
          <button
            onClick={onPdfPrevPage}
            disabled={pdfCurrentPage! <= 1}
            className="p-1 rounded-full hover:bg-slate-100 disabled:opacity-40"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-xs text-slate-700">
            Página {pdfCurrentPage} de {pdfTotalPages}
          </span>
          <button
            onClick={onPdfNextPage}
            disabled={pdfCurrentPage! >= pdfTotalPages!}
            className="p-1 rounded-full hover:bg-slate-100 disabled:opacity-40"
          >
            <ChevronRight size={16} />
          </button>
          {onPdfClose && (
            <button
              onClick={onPdfClose}
              className="ml-1 p-1 rounded-full hover:bg-red-50 text-red-500"
              title="Cerrar PDF"
            >
              <X size={14} />
            </button>
          )}
        </div>
      )}

      {/* Indicador Zoom */}
      <div className="absolute top-2 right-2 bg-black/50 text-white text-[10px] px-2 py-1 rounded-full pointer-events-none z-10">
        {Math.round(zoom * 100)}%
      </div>
      
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
          {['#000000', '#ef4444', '#22c55e', '#3b82f6', '#eab308'].map(c => (
            <button 
              key={c}
              onClick={() => { setColor(c); if (tool === 'eraser' || tool === 'move') setTool('pen') }}
              className={`w-6 h-6 rounded-full border-2 transition-transform ${color === c && tool === 'pen' ? 'border-slate-800 scale-110' : 'border-transparent hover:scale-105'}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>

        {/* Grosor */}
        <div className="flex items-center gap-1 pr-2 border-r border-slate-200">
          <button onClick={() => setLineWidth(2)} className={`p-1.5 rounded ${lineWidth === 2 ? 'bg-slate-200' : 'hover:bg-slate-100'}`}>
            <div className="w-1 h-1 bg-black rounded-full" />
          </button>
          <button onClick={() => setLineWidth(4)} className={`p-1.5 rounded ${lineWidth === 4 ? 'bg-slate-200' : 'hover:bg-slate-100'}`}>
            <div className="w-2 h-2 bg-black rounded-full" />
          </button>
          <button onClick={() => setLineWidth(8)} className={`p-1.5 rounded ${lineWidth === 8 ? 'bg-slate-200' : 'hover:bg-slate-100'}`}>
            <div className="w-3 h-3 bg-black rounded-full" />
          </button>
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
            onClick={() => setTool('arrow')} 
            className={`p-2 rounded-lg ${tool === 'arrow' ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-slate-100'}`}
            title="Flecha"
          >
            <ArrowRight size={18} />
          </button>
          <button 
            onClick={() => setTool('laser')} 
            className={`p-2 rounded-lg ${tool === 'laser' ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-slate-100'}`}
            title="Puntero láser"
          >
            <Pointer size={18} />
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

        {/* Zoom */}
        <div className="flex gap-1">
          <button onClick={() => handleZoom(-0.2)} className="p-2 hover:bg-slate-100 rounded-lg" title="Alejar">
            <ZoomOut size={18} />
          </button>
          <button onClick={() => handleZoom(0.2)} className="p-2 hover:bg-slate-100 rounded-lg" title="Acercar">
            <ZoomIn size={18} />
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
          <button onClick={handleDownload} className="p-2 hover:bg-slate-100 rounded-lg" title="Descargar">
            <Download size={18} />
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
