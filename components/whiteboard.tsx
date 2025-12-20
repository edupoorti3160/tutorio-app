'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { 
  Pencil, Eraser, Trash2, Undo, Redo, 
  Square, Circle, Minus, Type, Grid, MousePointer2, 
  Highlighter, Triangle, Star, ArrowRight, Image as ImageIcon,
  AlignJustify, Hash, ZoomIn, ZoomOut
} from 'lucide-react'

// AHORA ACEPTAMOS 'role' COMO PROP
interface WhiteboardProps {
  roomId: string
  role: 'teacher' | 'student' // Nueva prop obligatoria
}

type Tool = 'pen' | 'highlighter' | 'eraser' | 'laser' | 'text' | 'line' | 'arrow' | 'rect' | 'circle' | 'triangle' | 'star' | 'diamond'
type BackgroundType = 'white' | 'grid' | 'lines' | 'dots'

export function Whiteboard({ roomId, role }: WhiteboardProps) {
  const supabase = createClient()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null)
  
  // --- CONFIGURACIÓN ---
  const [tool, setTool] = useState<Tool>('pen')
  const [color, setColor] = useState('#000000')
  const [fillShape, setFillShape] = useState(false)
  const [lineWidth, setLineWidth] = useState(2)
  const [background, setBackground] = useState<BackgroundType>('white')

  // NUEVO: zoom global del canvas
  const [zoom, setZoom] = useState(1) // 1 = 100%
  
  // --- ESTADOS INTERNOS ---
  const [isDrawing, setIsDrawing] = useState(false)
  const [startPos, setStartPos] = useState({ x: 0, y: 0 })
  const [snapshot, setSnapshot] = useState<ImageData | null>(null)
  const [history, setHistory] = useState<ImageData[]>([])
  const [historyStep, setHistoryStep] = useState(-1)
  
  // --- TEXTO ---
  const [isTyping, setIsTyping] = useState(false)
  const [textPos, setTextPos] = useState({ x: 0, y: 0 })
  const [textInput, setTextInput] = useState('')

  // Referencia para trazos libres
  const currentPathRef = useRef<{x: number, y: number}[]>([])

  // --- DICCIONARIO DE IDIOMAS ---
  const LABELS = {
      teacher: {
          undo: "Deshacer", redo: "Rehacer", clear: "Limpiar",
          bgWhite: "Blanco", bgGrid: "Cuadrícula", bgLines: "Líneas", bgDots: "Puntos",
          pen: "Lápiz", highlighter: "Resaltador", eraser: "Borrador", text: "Texto",
          arrow: "Flecha", line: "Línea", rect: "Cuadrado", circle: "Círculo", triangle: "Triángulo", star: "Estrella",
          fill: "Relleno", stroke: "Borde",
          upload: "Subir Imagen", laser: "Puntero Láser",
          placeholder: "Escribe..."
      },
      student: {
          undo: "Undo", redo: "Redo", clear: "Clear",
          bgWhite: "White", bgGrid: "Grid", bgLines: "Lines", bgDots: "Dots",
          pen: "Pen", highlighter: "Highlighter", eraser: "Eraser", text: "Text",
          arrow: "Arrow", line: "Line", rect: "Rectangle", circle: "Circle", triangle: "Triangle", star: "Star",
          fill: "Fill", stroke: "Outline",
          upload: "Upload Image", laser: "Laser Pointer",
          placeholder: "Type here..."
      }
  }

  // Seleccionar textos según el rol
  const t = role === 'teacher' ? LABELS.teacher : LABELS.student;

  // --- 1. SETUP RESPONSIVO ---
  useEffect(() => {
    const initCanvas = () => {
        const canvas = canvasRef.current
        const container = containerRef.current
        if (!canvas || !container) return

        // Guardar contenido si ya existe
        let savedData: ImageData | null = null
        if (ctx) {
            try { savedData = ctx.getImageData(0,0, canvas.width, canvas.height) } catch(e){}
        }

        canvas.width = container.clientWidth
        canvas.height = container.clientHeight
        
        const context = canvas.getContext('2d', { willReadFrequently: true })
        if (context) {
            context.lineCap = 'round'
            context.lineJoin = 'round'
            context.fillStyle = '#ffffff00' 
            context.clearRect(0, 0, canvas.width, canvas.height)
            if (savedData) {
                context.putImageData(savedData, 0, 0)
            }
            setCtx(context)
            if (history.length === 0) saveHistory(context)
        }
    }

    initCanvas()
    window.addEventListener('resize', initCanvas)
    
    const channel = supabase.channel(`room-${roomId}`)
      .on('broadcast', { event: 'draw_path' }, ({ payload }) => drawRemotePath(payload))
      .on('broadcast', { event: 'draw_shape' }, ({ payload }) => drawRemoteShape(payload))
      .on('broadcast', { event: 'draw_text' }, ({ payload }) => drawRemoteText(payload))
      .on('broadcast', { event: 'draw_image' }, ({ payload }) => drawRemoteImage(payload))
      .on('broadcast', { event: 'clear' }, () => clearLocal())
      .subscribe()

    return () => { 
        window.removeEventListener('resize', initCanvas)
        supabase.removeChannel(channel) 
    }
  }, [roomId])

  // --- 2. MOTOR DE DIBUJO ---
  const getCoords = (e: any) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY

    // Ajustar por zoom
    const x = (clientX - rect.left) / zoom
    const y = (clientY - rect.top) / zoom

    return { x, y }
  }

  const startDrawing = (e: any) => {
    if (!ctx || isTyping) return
    const { x, y } = getCoords(e)

    if (tool === 'text') {
        setIsTyping(true); setTextPos({ x, y }); return
    }
    
    if (tool === 'pen' || tool === 'highlighter' || tool === 'eraser' || tool === 'laser') {
        ctx.beginPath()
        ctx.moveTo(x, y)
        currentPathRef.current = [{ x, y }]
    } else {
        setSnapshot(ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height))
    }

    setIsDrawing(true)
    setStartPos({ x, y })
  }

  const draw = (e: any) => {
    if (!isDrawing || !ctx) return
    const { x, y } = getCoords(e)

    ctx.strokeStyle = color
    ctx.lineWidth = lineWidth
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'source-over'

    if (tool === 'highlighter') {
        ctx.globalAlpha = 0.3
        ctx.lineWidth = lineWidth * 2
        ctx.strokeStyle = color
    } else if (tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out'
        ctx.lineWidth = lineWidth
    } else if (tool === 'laser') {
        ctx.strokeStyle = '#ff0000'
        ctx.lineWidth = 5
        ctx.shadowBlur = 10
        ctx.shadowColor = '#ff0000'
    }

    if (['pen', 'highlighter', 'eraser', 'laser'].includes(tool)) {
        ctx.lineTo(x, y)
        ctx.stroke()
        currentPathRef.current.push({ x, y })
    } else {
        if (snapshot) ctx.putImageData(snapshot, 0, 0)
        drawShape(ctx, tool, startPos, { x, y }, fillShape)
    }
  }

  const stopDrawing = async (e: any) => {
    if (!isDrawing || !ctx) return
    setIsDrawing(false)
    const { x, y } = getCoords(e)

    if (tool !== 'laser') {
        saveHistory(ctx)
    }

    if (['pen', 'highlighter', 'eraser'].includes(tool)) {
        if (currentPathRef.current.length > 0) {
            await supabase.channel(`room-${roomId}`).send({
                type: 'broadcast', event: 'draw_path',
                payload: { points: currentPathRef.current, tool, color, width: lineWidth }
            })
        }
    } else if (tool !== 'text' && tool !== 'laser') {
        await supabase.channel(`room-${roomId}`).send({
            type: 'broadcast', event: 'draw_shape',
            payload: { start: startPos, end: { x, y }, tool, color, width: lineWidth, fill: fillShape }
        })
    }
    
    ctx.shadowBlur = 0 
  }

  // --- 3. LÓGICA DE FORMAS ---
  const drawShape = (c: CanvasRenderingContext2D, type: Tool, s: {x:number, y:number}, e: {x:number, y:number}, fill: boolean) => {
      c.beginPath()
      c.strokeStyle = color
      c.fillStyle = color
      c.lineWidth = lineWidth
      
      const w = e.x - s.x
      const h = e.y - s.y

      if (type === 'rect') c.rect(s.x, s.y, w, h)
      else if (type === 'circle') { const r = Math.sqrt(w*w + h*h); c.arc(s.x, s.y, r, 0, 2*Math.PI) }
      else if (type === 'line') { c.moveTo(s.x, s.y); c.lineTo(e.x, e.y) }
      else if (type === 'arrow') drawArrow(c, s.x, s.y, e.x, e.y)
      else if (type === 'triangle') {
          c.moveTo(s.x + w/2, s.y)
          c.lineTo(s.x, s.y + h)
          c.lineTo(s.x + w, s.y + h)
          c.closePath()
      } else if (type === 'star') {
          drawStar(c, s.x + w/2, s.y + h/2, 5, Math.max(Math.abs(w), Math.abs(h))/2, Math.max(Math.abs(w), Math.abs(h))/4)
      } else if (type === 'diamond') {
          c.moveTo(s.x + w/2, s.y)
          c.lineTo(s.x + w, s.y + h/2)
          c.lineTo(s.x + w/2, s.y + h)
          c.lineTo(s.x, s.y + h/2)
          c.closePath()
      }

      if (fill && type !== 'line' && type !== 'arrow') {
          c.globalAlpha = 0.5 
          c.fill()
          c.globalAlpha = 1
      }
      c.stroke()
  }

  const drawArrow = (c: CanvasRenderingContext2D, fromx: number, fromy: number, tox: number, toy: number) => {
      const headlen = 15 
      const dx = tox - fromx
      const dy = toy - fromy
      const angle = Math.atan2(dy, dx)
      c.moveTo(fromx, fromy)
      c.lineTo(tox, toy)
      c.lineTo(tox - headlen * Math.cos(angle - Math.PI / 6), toy - headlen * Math.sin(angle - Math.PI / 6))
      c.moveTo(tox, toy)
      c.lineTo(tox - headlen * Math.cos(angle + Math.PI / 6), toy - headlen * Math.sin(angle + Math.PI / 6))
  }

  const drawStar = (c: CanvasRenderingContext2D, cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number) => {
      let rot = Math.PI / 2 * 3
      let x = cx
      let y = cy
      let step = Math.PI / spikes
      c.moveTo(cx, cy - outerRadius)
      for (let i = 0; i < spikes; i++) {
        x = cx + Math.cos(rot) * outerRadius; y = cy + Math.sin(rot) * outerRadius
        c.lineTo(x, y)
        rot += step
        x = cx + Math.cos(rot) * innerRadius; y = cy + Math.sin(rot) * innerRadius
        c.lineTo(x, y)
        rot += step
      }
      c.lineTo(cx, cy - outerRadius)
      c.closePath()
  }

  // --- 4. FUNCIONES REMOTAS ---
  const drawRemotePath = (data: any) => {
      if(!ctx) return
      const { points, tool: rTool, color: rColor, width: rWidth } = data
      ctx.beginPath()
      ctx.lineWidth = rTool === 'highlighter' ? (rWidth || 20) * 2 : (rWidth || 2)
      ctx.strokeStyle = rColor
      ctx.globalAlpha = rTool === 'highlighter' ? 0.3 : 1
      ctx.globalCompositeOperation = rTool === 'eraser' ? 'destination-out' : 'source-over'
      
      ctx.moveTo(points[0].x, points[0].y)
      points.forEach((p:any) => ctx.lineTo(p.x, p.y))
      ctx.stroke()
      ctx.globalAlpha = 1
      ctx.globalCompositeOperation = 'source-over'
      saveHistory(ctx)
  }

  const drawRemoteShape = (data: any) => {
      if(!ctx) return
      const { start, end, tool: rTool, color: rColor, width: rWidth, fill } = data
      const prevColor = color; const prevWidth = lineWidth
      setColor(rColor); setLineWidth(rWidth)
      drawShape(ctx, rTool, start, end, fill)
      setColor(prevColor); setLineWidth(prevWidth)
      saveHistory(ctx)
  }

  const drawRemoteText = (data: any) => {
      if(!ctx) return
      const { x, y, text, color, size } = data
      ctx.font = `${size}px Arial`
      ctx.fillStyle = color
      ctx.fillText(text, x, y)
      saveHistory(ctx)
  }

  const drawRemoteImage = (data: any) => {
      if(!ctx) return
      const img = new Image()
      img.onload = () => {
          ctx.drawImage(img, data.x, data.y, 200, 200 * (img.height/img.width)) 
          saveHistory(ctx)
      }
      img.src = data.url
  }

  // --- 5. TEXTO & IMAGEN ---
  const handleTextComplete = async () => {
      if (!ctx || !textInput.trim()) { setIsTyping(false); setTextInput(''); return }
      const fontSize = lineWidth * 5 + 12
      ctx.font = `${fontSize}px Arial`
      ctx.fillStyle = color
      ctx.fillText(textInput, textPos.x, textPos.y + 10)
      saveHistory(ctx)
      await supabase.channel(`room-${roomId}`).send({
          type: 'broadcast', event: 'draw_text',
          payload: { x: textPos.x, y: textPos.y + 10, text: textInput, color, size: fontSize }
      })
      setIsTyping(false); setTextInput('')
  }

  const handleImageUpload = (e: any) => {
      const file = e.target.files[0]
      if(!file || !ctx) return
      const reader = new FileReader()
      reader.onload = async (event) => {
          const img = new Image()
          img.onload = async () => {
              const x = ctx.canvas.width / 2 - 100
              const y = ctx.canvas.height / 2 - 100
              ctx.drawImage(img, x, y, 200, 200 * (img.height/img.width))
              saveHistory(ctx)
              
              await supabase.channel(`room-${roomId}`).send({
                  type: 'broadcast', event: 'draw_image',
                  payload: { x, y, url: img.src } 
              })
          }
          img.src = event.target?.result as string
      }
      reader.readAsDataURL(file)
  }

  // --- 6. UTILS ---
  const saveHistory = (c: CanvasRenderingContext2D) => {
      if(!canvasRef.current) return
      const data = c.getImageData(0,0, canvasRef.current.width, canvasRef.current.height)
      const newH = history.slice(0, historyStep + 1)
      newH.push(data)
      setHistory(newH)
      setHistoryStep(newH.length - 1)
  }
  const undo = () => { if(historyStep > 0 && ctx) { ctx.putImageData(history[historyStep-1],0,0); setHistoryStep(s=>s-1) }}
  const redo = () => { if(historyStep < history.length-1 && ctx) { ctx.putImageData(history[historyStep+1],0,0); setHistoryStep(s=>s+1) }}
  const clearLocal = () => { if(ctx) { ctx.clearRect(0,0, ctx.canvas.width, ctx.canvas.height); saveHistory(ctx) }}
  const clearAll = async () => { clearLocal(); await supabase.channel(`room-${roomId}`).send({type:'broadcast', event:'clear', payload:{}}) }

  // helpers de zoom
  const handleZoomIn = () => setZoom(z => Math.min(3, parseFloat((z + 0.25).toFixed(2))))
  const handleZoomOut = () => setZoom(z => Math.max(0.5, parseFloat((z - 0.25).toFixed(2))))

  // --- RENDER ---
  return (
    <div className="w-full h-full relative overflow-hidden bg-slate-100 flex flex-col">
       
       {/* 1. BARRA SUPERIOR */}
       <div className="h-12 bg-white border-b border-slate-200 flex items-center justify-between px-4 z-50 shadow-sm">
            <div className="flex gap-2 items-center">
                <button onClick={undo} className="p-2 hover:bg-slate-100 rounded text-slate-600" title={t.undo}><Undo size={18}/></button>
                <button onClick={redo} className="p-2 hover:bg-slate-100 rounded text-slate-600" title={t.redo}><Redo size={18}/></button>
                <div className="w-px h-6 bg-slate-300 mx-2"></div>
                <button onClick={clearAll} className="p-2 hover:bg-red-50 text-red-500 rounded flex gap-2 text-sm font-bold items-center"><Trash2 size={16}/> {t.clear}</button>
            </div>
            
            <div className="flex items-center gap-3">
              {/* CONTROLES DE ZOOM */}
              <div className="flex items-center bg-slate-100 rounded-lg px-2 py-1 gap-1">
                <button onClick={handleZoomOut} className="p-1.5 rounded hover:bg-slate-200" title="Zoom out">
                  <ZoomOut size={16} />
                </button>
                <span className="text-xs font-semibold text-slate-600 w-12 text-center">
                  {Math.round(zoom * 100)}%
                </span>
                <button onClick={handleZoomIn} className="p-1.5 rounded hover:bg-slate-200" title="Zoom in">
                  <ZoomIn size={16} />
                </button>
              </div>

              <div className="flex bg-slate-100 rounded-lg p-1 gap-1">
                  <button onClick={()=>setBackground('white')} className={`p-1.5 rounded ${background==='white'?'bg-white shadow':''}`} title={t.bgWhite}><Square size={14}/></button>
                  <button onClick={()=>setBackground('grid')} className={`p-1.5 rounded ${background==='grid'?'bg-white shadow':''}`} title={t.bgGrid}><Grid size={14}/></button>
                  <button onClick={()=>setBackground('lines')} className={`p-1.5 rounded ${background==='lines'?'bg-white shadow':''}`} title={t.bgLines}><AlignJustify size={14}/></button>
                  <button onClick={()=>setBackground('dots')} className={`p-1.5 rounded ${background==='dots'?'bg-white shadow':''}`} title={t.bgDots}><Hash size={14}/></button>
              </div>
            </div>
       </div>

       {/* 2. ÁREA DE DIBUJO */}
       <div className="flex-1 relative" ref={containerRef}>
            <div className={`absolute inset-0 pointer-events-none ${
                background === 'grid' ? 'bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:20px_20px]' :
                background === 'lines' ? 'bg-[linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:100%_40px]' :
                background === 'dots' ? 'bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] bg-[size:20px_20px]' : 'bg-white'
            }`}/>

            <div
              style={{
                position: 'absolute',
                inset: 0,
                transform: `scale(${zoom})`,
                transformOrigin: 'center center'
              }}
            >
              <canvas
                  ref={canvasRef}
                  onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing}
                  className="w-full h-full touch-none cursor-crosshair"
              />
            </div>
            
            {isTyping && (
                <input
                  autoFocus
                  value={textInput}
                  onChange={e=>setTextInput(e.target.value)}
                  onBlur={handleTextComplete}
                  onKeyDown={e=>e.key==='Enter'&&handleTextComplete()}
                  style={{
                    position:'absolute',
                    left:textPos.x * zoom,
                    top:textPos.y * zoom - 10,
                    fontSize:`${lineWidth*5+12}px`,
                    color,
                    background:'transparent',
                    border:'1px dashed blue',
                    zIndex:50,
                    outline:'none'
                  }}
                  placeholder={t.placeholder}
                />
            )}
       </div>

       {/* 3. BARRA LATERAL */}
       <div className="absolute left-4 top-16 bg-white shadow-2xl border border-slate-200 rounded-xl p-2 flex flex-col gap-3 z-50 max-h-[80vh] overflow-y-auto w-20 items-center">
            
            {/* BÁSICOS */}
            <div className="flex flex-col gap-1 w-full border-b pb-2">
                <ToolBtn active={tool==='pen'} icon={<Pencil size={20}/>} onClick={()=>setTool('pen')} title={t.pen}/>
                {/* botones de grosor para lápiz */}
                <div className="flex justify-center gap-1 py-1">
                  <button
                    onClick={() => setLineWidth(2)}
                    className={`w-2 h-2 rounded-full ${lineWidth===2 ? 'bg-indigo-600' : 'bg-slate-300'}`}
                    title={role === 'teacher' ? 'Línea delgada' : 'Thin line'}
                  />
                  <button
                    onClick={() => setLineWidth(6)}
                    className={`w-2 h-2 rounded-full ${lineWidth===6 ? 'bg-indigo-600' : 'bg-slate-300'}`}
                    title={role === 'teacher' ? 'Línea media' : 'Medium line'}
                  />
                  <button
                    onClick={() => setLineWidth(12)}
                    className={`w-2 h-2 rounded-full ${lineWidth===12 ? 'bg-indigo-600' : 'bg-slate-300'}`}
                    title={role === 'teacher' ? 'Línea gruesa' : 'Thick line'}
                  />
                </div>

                <ToolBtn active={tool==='highlighter'} icon={<Highlighter size={20}/>} onClick={()=>setTool('highlighter')} title={t.highlighter}/>
                <ToolBtn active={tool==='eraser'} icon={<Eraser size={20}/>} onClick={()=>setTool('eraser')} title={t.eraser}/>
                {/* botones de grosor para borrador */}
                <div className="flex justify-center gap-1 py-1">
                  <button
                    onClick={() => setLineWidth(4)}
                    className={`w-2 h-2 rounded-full border ${lineWidth===4 ? 'bg-red-500 border-red-500' : 'bg-slate-100 border-slate-300'}`}
                    title={role === 'teacher' ? 'Borrador delgado' : 'Thin eraser'}
                  />
                  <button
                    onClick={() => setLineWidth(10)}
                    className={`w-2 h-2 rounded-full border ${lineWidth===10 ? 'bg-red-500 border-red-500' : 'bg-slate-100 border-slate-300'}`}
                    title={role === 'teacher' ? 'Borrador medio' : 'Medium eraser'}
                  />
                  <button
                    onClick={() => setLineWidth(18)}
                    className={`w-2 h-2 rounded-full border ${lineWidth===18 ? 'bg-red-500 border-red-500' : 'bg-slate-100 border-slate-300'}`}
                    title={role === 'teacher' ? 'Borrador grueso' : 'Thick eraser'}
                  />
                </div>

                <ToolBtn active={tool==='text'} icon={<Type size={20}/>} onClick={()=>setTool('text')} title={t.text}/>
            </div>

            {/* FORMAS */}
            <div className="flex flex-col gap-1 w-full border-b pb-2">
                <ToolBtn active={tool==='arrow'} icon={<ArrowRight size={20}/>} onClick={()=>setTool('arrow')} title={t.arrow}/>
                <ToolBtn active={tool==='line'} icon={<Minus size={20}/>} onClick={()=>setTool('line')} title={t.line}/>
                <ToolBtn active={tool==='rect'} icon={<Square size={20}/>} onClick={()=>setTool('rect')} title={t.rect}/>
                <ToolBtn active={tool==='circle'} icon={<Circle size={20}/>} onClick={()=>setTool('circle')} title={t.circle}/>
                <ToolBtn active={tool==='triangle'} icon={<Triangle size={20}/>} onClick={()=>setTool('triangle')} title={t.triangle}/>
                <ToolBtn active={tool==='star'} icon={<Star size={20}/>} onClick={()=>setTool('star')} title={t.star}/>
                <div className="px-1 pt-1">
                    <button onClick={()=>setFillShape(!fillShape)} className={`w-full p-1 rounded text-[10px] font-bold ${fillShape?'bg-indigo-100 text-indigo-700':'bg-slate-100 text-slate-500'}`}>
                        {fillShape ? t.fill : t.stroke}
                    </button>
                </div>
            </div>

            {/* EXTRA */}
            <div className="flex flex-col gap-1 w-full border-b pb-2">
                <label className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 cursor-pointer flex justify-center" title={t.upload}>
                    <ImageIcon size={20}/>
                    <input type="file" hidden accept="image/*" onChange={handleImageUpload}/>
                </label>
                <ToolBtn active={tool==='laser'} icon={<MousePointer2 size={20}/>} onClick={()=>setTool('laser')} title={t.laser}/>
            </div>

            {/* ESTILO */}
            <div className="flex flex-col gap-2 w-full items-center pt-1">
                <input type="color" value={color} onChange={e=>setColor(e.target.value)} className="w-8 h-8 rounded-full overflow-hidden border-0 cursor-pointer"/>
                <div className="h-px w-full bg-slate-200"></div>
                <input type="range" min="1" max="20" value={lineWidth} onChange={e=>setLineWidth(Number(e.target.value))} className="w-24 h-1 bg-slate-300 rounded-lg -rotate-90 my-8"/>
            </div>
       </div>
    </div>
  )
}

const ToolBtn = ({active, icon, onClick, title}: any) => (
    <button onClick={onClick} title={title} className={`p-2.5 rounded-xl transition-all w-full flex justify-center ${active ? 'bg-indigo-600 text-white shadow-lg scale-105' : 'text-slate-500 hover:bg-slate-100'}`}>
        {icon}
    </button>
)
