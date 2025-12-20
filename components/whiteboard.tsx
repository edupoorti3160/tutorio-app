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
  ChevronRight
} from 'lucide-react'

// Tipos
interface Point { x: number; y: number }

type Tool = 'pen' | 'eraser' | 'move' | 'arrow' | 'laser'

interface DrawPath {
  points: Point[]
  color: string
  width: number
  tool: Tool
  // Para arrow y laser (opcional)
  createdAt?: number
}

interface WhiteboardProps {
  roomId: string
  userRole: 'teacher' | 'student'
  socket: any

  // Imagen que viene desde la sala (biblioteca / pdf renderizado a imagen)
  externalImage?: string | null

  // Controles PDF (opcional, para que los conectes a tu lógica externa)
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
  onPdfClose
}: WhiteboardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Herramientas
  const [tool, setTool] = useState<Tool>('pen')
  const [color, setColor] = useState('#000000')
  const [lineWidth, setLineWidth] = useState(2)

  // Zoom / Pan
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })

  // Estado de dibujo
  const [paths, setPaths] = useState<DrawPath[]>([])
  const [redoStack, setRedoStack] = useState<DrawPath[]>([])
  const [isDrawing, setIsDrawing] = useState(false)

  // Imagen de fondo (imagen suelta o render del PDF)
  const [backgroundImage, setBackgroundImage] = useState<HTMLImageElement | null>(null)

  // Path actual
  const currentPath = useRef<Point[]>([])

  // TIMER para limpiar trazos tipo láser
  const LASER_DURATION = 2000 // ms

  // 1) Cargar imagen externa (ej: página de PDF como imagen)
  useEffect(() => {
    if (!externalImage) return
    const img = new Image()
    img.src = externalImage
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      setBackgroundImage(img)
      if (canvasRef.current) {
        redrawCanvas(paths, img)
      }
    }
  }, [externalImage])

  // 2) Resize + sockets
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resizeCanvas = () => {
      if (!containerRef.current || !canvas) return
      canvas.width = containerRef.current.clientWidth
      canvas.height = containerRef.current.clientHeight
      redrawCanvas(paths, backgroundImage)
    }

    window.addEventListener('resize', resizeCanvas)
    resizeCanvas()

    if (socket) {
      // Recibir trazos de otros usuarios
      socket.on('draw', (data: { path: DrawPath }) => {
        const incomingPath = data.path

        setPaths(prev => {
          const updated = [...prev, incomingPath]
          redrawCanvas(updated, backgroundImage)
          return updated
        })

        // Si el trazo es laser, lo limpiamos solo después de LASER_DURATION
        if (incomingPath.tool === 'laser') {
          setTimeout(() => {
            setPaths(prev => {
              const filtered = prev.filter(p => p !== incomingPath)
              redrawCanvas(filtered, backgroundImage)
              return filtered
            })
          }, LASER_DURATION)
        }
      })

      // Limpiar pizarra remota
      socket.on('clear-canvas', () => {
        setPaths([])
        setRedoStack([])
        const ctx = canvasRef.current?.getContext('2d')
        if (ctx && canvasRef.current) {
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
          if (backgroundImage) redrawCanvas([], backgroundImage)
        }
      })

      // Fondo remoto (imagen)
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

  // 3) Función central de dibujado
  const redrawCanvas = (pathsToDraw: DrawPath[], bgImg: HTMLImageElement | null = backgroundImage) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    ctx.save()
    ctx.translate(pan.x, pan.y)
    ctx.scale(zoom, zoom)

    // Fondo (imagen / pdf)
    if (bgImg) {
      const ratio = Math.min(canvas.width / bgImg.width, canvas.height / bgImg.height)
      const w = bgImg.width * ratio * 0.9
      const h = bgImg.height * ratio * 0.9
      const x = (canvas.width - w) / 2
      const y = (canvas.height - h) / 2
      ctx.drawImage(bgImg, x, y, w, h)
    }

    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    pathsToDraw.forEach(path => {
      if (path.tool === 'laser') {
        // El láser es solo visual y se eliminará con timeout
        ctx.globalAlpha = 0.8
      } else {
        ctx.globalAlpha = 1
      }

      if (path.points.length === 0) return

      if (path.tool === 'arrow') {
        // Flecha: línea recta + punta
        const start = path.points[0]
        const end = path.points[path.points.length - 1]

        // Línea principal
        ctx.beginPath()
        ctx.strokeStyle = path.color
        ctx.lineWidth = path.width
        ctx.moveTo(start.x, start.y)
        ctx.lineTo(end.x, end.y)
        ctx.stroke()

        // Flecha: punta
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

      // Pen / Eraser / Laser (de tipo trazo)
      ctx.beginPath()
      ctx.moveTo(path.points[0].x, path.points[0].y)
      path.points.forEach(p => ctx.lineTo(p.x, p.y))

      if (path.tool === 'eraser') {
        // Efecto tipo "liquid paper"
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = path.width * 2
      } else if (path.tool === 'laser') {
        ctx.strokeStyle = '#ef4444'
        ctx.lineWidth = path.width * 2
      } else {
        ctx.strokeStyle = path.color
        ctx.lineWidth = path.width
      }

      ctx.stroke()
    })

    ctx.restore()
  }

  // 4) Coordenadas transformadas
  const getCoords = (e: any): Point => {
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

  // 5) Eventos de dibujo
  const startDrawing = (e: any) => {
    if (tool === 'move') return
    setIsDrawing(true)
    const coords = getCoords(e)
    currentPath.current = [coords]
  }

  const draw = (e: any) => {
    // Mover lienzo
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

    // Dibujado rápido (optimista)
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    ctx.save()
    ctx.translate(pan.x, pan.y)
    ctx.scale(zoom, zoom)

    if (tool === 'arrow') {
      // Para flecha, redibujar desde el principio de la flecha a la posición actual
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

  const stopDrawing = () => {
    if (!isDrawing || tool === 'move') return
    setIsDrawing(false)

    if (currentPath.current.length === 0) return

    const path: DrawPath = {
      points: [...currentPath.current],
      color,
      width: lineWidth,
      tool,
      createdAt: Date.now()
    }

    const newPaths = [...paths, path]
    setPaths(newPaths)
    setRedoStack([])

    if (socket) {
      socket.emit('draw', { roomId, path })
    }

    redrawCanvas(newPaths, backgroundImage)

    // Si es laser, eliminarlo después de un tiempo
    if (tool === 'laser') {
      setTimeout(() => {
        setPaths(prev => {
          const filtered = prev.filter(p => p !== path)
          redrawCanvas(filtered, backgroundImage)
          return filtered
        })
      }, LASER_DURATION)
    }

    currentPath.current = []
  }

  // 6) Acciones de barra
  const clearBoard = () => {
    if (!confirm('¿Borrar toda la pizarra?')) return
    setPaths([])
    setRedoStack([])
    redrawCanvas([], backgroundImage)
    if (socket) socket.emit('clear-canvas', { roomId })
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
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = evt => {
      const img = new Image()
      img.src = evt.target?.result as string
      img.onload = () => {
        setBackgroundImage(img)
        redrawCanvas(paths, img)
        if (socket) {
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

  const handleZoomChange = (delta: number) => {
    setZoom(prev => {
      const next = Math.max(0.5, Math.min(3, prev + delta))
      return next
    })
    // Redibujo pequeño delay
    setTimeout(() => {
      redrawCanvas(paths, backgroundImage)
    }, 10)
  }

  const isPdfActive = pdfTotalPages && pdfTotalPages > 0 && pdfCurrentPage !== null

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-white rounded-xl shadow-inner overflow-hidden border border-slate-200"
    >
      {/* Barra PDF arriba (solo si hay PDF activo) */}
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

      {/* Indicador de zoom */}
      <div className="absolute top-2 right-2 bg-black/50 text-white text-[10px] px-2 py-1 rounded-full pointer-events-none z-10">
        {Math.round(zoom * 100)}%
      </div>

      <canvas
        ref={canvasRef}
        className={`w-full h-full touch-none ${
          tool === 'move' ? 'cursor-grab active:cursor-grabbing' : 'cursor-crosshair'
        }`}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
      />

      {/* Barra de herramientas abajo */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur shadow-2xl rounded-2xl p-2 flex items-center gap-2 border border-slate-200 z-20">
        {/* Colores */}
        <div className="flex gap-1 pr-2 border-r border-slate-200 items-center">
          {['#000000', '#ef4444', '#22c55e', '#3b82f6', '#eab308'].map(c => (
            <button
              key={c}
              onClick={() => {
                setColor(c)
                if (tool === 'eraser' || tool === 'move') setTool('pen')
              }}
              className={`w-5 h-5 rounded-full border border-slate-300 transition-transform ${
                color === c && tool !== 'eraser' && tool !== 'move'
                  ? 'ring-2 ring-indigo-500 scale-110'
                  : 'hover:scale-105'
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>

        {/* Grosor */}
        <div className="flex items-center gap-1 pr-2 border-r border-slate-200">
          <button
            onClick={() => setLineWidth(2)}
            className={`p-1.5 rounded hover:bg-slate-100 ${lineWidth === 2 ? 'bg-slate-200' : ''}`}
          >
            <div className="w-1 h-1 bg-black rounded-full" />
          </button>
          <button
            onClick={() => setLineWidth(4)}
            className={`p-1.5 rounded hover:bg-slate-100 ${lineWidth === 4 ? 'bg-slate-200' : ''}`}
          >
            <div className="w-2 h-2 bg-black rounded-full" />
          </button>
          <button
            onClick={() => setLineWidth(8)}
            className={`p-1.5 rounded hover:bg-slate-100 ${lineWidth === 8 ? 'bg-slate-200' : ''}`}
          >
            <div className="w-3 h-3 bg-black rounded-full" />
          </button>
        </div>

        {/* Herramientas principales */}
        <div className="flex gap-1">
          <button
            onClick={() => setTool('pen')}
            className={`p-2 rounded-lg ${
              tool === 'pen' ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-slate-100 text-slate-600'
            }`}
            title="Lápiz"
          >
            <Pen size={18} />
          </button>

          <button
            onClick={() => setTool('eraser')}
            className={`p-2 rounded-lg ${
              tool === 'eraser' ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-slate-100 text-slate-600'
            }`}
            title="Borrador"
          >
            <Eraser size={18} />
          </button>

          <button
            onClick={() => setTool('arrow')}
            className={`p-2 rounded-lg ${
              tool === 'arrow' ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-slate-100 text-slate-600'
            }`}
            title="Flecha"
          >
            <ArrowRight size={18} />
          </button>

          <button
            onClick={() => setTool('laser')}
            className={`p-2 rounded-lg ${
              tool === 'laser' ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-slate-100 text-slate-600'
            }`}
            title="Puntero láser"
          >
            <Pointer size={18} />
          </button>

          <button
            onClick={() => setTool('move')}
            className={`p-2 rounded-lg ${
              tool === 'move' ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-slate-100 text-slate-600'
            }`}
            title="Mover lienzo"
          >
            <Move size={18} />
          </button>
        </div>

        <div className="w-px h-6 bg-slate-200 mx-1" />

        {/* Zoom */}
        <div className="flex gap-1">
          <button
            onClick={() => handleZoomChange(-0.2)}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-600"
            title="Alejar"
          >
            <ZoomOut size={18} />
          </button>
          <button
            onClick={() => handleZoomChange(0.2)}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-600"
            title="Acercar"
          >
            <ZoomIn size={18} />
          </button>
        </div>

        <div className="w-px h-6 bg-slate-200 mx-1" />

        {/* Acciones */}
        <div className="flex gap-1">
          <button
            onClick={undo}
            disabled={paths.length === 0}
            className="p-2 hover:bg-slate-100 rounded-lg disabled:opacity-30 text-slate-600"
            title="Deshacer"
          >
            <Undo size={18} />
          </button>
          <button
            onClick={redo}
            disabled={redoStack.length === 0}
            className="p-2 hover:bg-slate-100 rounded-lg disabled:opacity-30 text-slate-600"
            title="Rehacer"
          >
            <Redo size={18} />
          </button>
          <button
            onClick={handleDownload}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-600"
            title="Descargar"
          >
            <Download size={18} />
          </button>
          <button
            onClick={clearBoard}
            className="p-2 hover:bg-red-50 text-red-500 rounded-lg"
            title="Limpiar todo"
          >
            <Trash2 size={18} />
          </button>
        </div>

        {/* Subir imagen */}
        <label
          className="p-2 hover:bg-slate-100 rounded-lg cursor-pointer text-indigo-600 ml-1"
          title="Subir imagen"
        >
          <ImageIcon size={18} />
          <input type="file" hidden accept="image/*" onChange={handleImageUpload} />
        </label>
      </div>
    </div>
  )
}
