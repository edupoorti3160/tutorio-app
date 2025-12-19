import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // 1. Crear una respuesta inicial
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // 2. Configurar el cliente de Supabase para manejar las cookies de sesión
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // 3. Refrescar la sesión si ha expirado (IMPORTANTE para que no te saque)
  const { data: { user } } = await supabase.auth.getUser()

  // 4. PROTECCIÓN BÁSICA SIN BUCLE
  // Solo si NO tienes usuario y tratas de entrar a una ruta protegida (/dashboard)
  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 5. NO AGREGAMOS NINGUNA OTRA REDIRECCIÓN
  // Eliminamos cualquier lógica que diga "Si estás en login, vete a dashboard"
  // para evitar el bucle infinito. Dejamos que la página decida.

  return response
}

export const config = {
  matcher: [
    /*
     * Aplica a todas las rutas excepto estáticas e imágenes para no saturar
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}