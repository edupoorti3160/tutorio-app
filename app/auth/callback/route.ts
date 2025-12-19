import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  
  // --- CORRECCIÓN DE SEGURIDAD PARA LOCAL ---
  // Si el origen detectado es 0.0.0.0, lo cambiamos a localhost 
  // para que el navegador pueda procesar el redireccionamiento.
  const safeOrigin = origin.includes('0.0.0.0') 
    ? 'http://localhost:3000' 
    : origin

  const code = searchParams.get('code')
  
  // Buscamos a dónde quería ir el usuario originalmente
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    
    // Intercambiamos el código por una sesión real
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Usamos safeOrigin en lugar de origin
      return NextResponse.redirect(`${safeOrigin}${next}`)
    }
  }

  // En caso de error, también usamos el origen seguro
  return NextResponse.redirect(`${safeOrigin}/login?error=Authentication failed`)
}