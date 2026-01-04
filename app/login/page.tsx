'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState, useCallback } from 'react'
import Script from 'next/script'

// Declare google global type
declare global {
    interface Window {
      google: any;
    }
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const errorParam = searchParams.get('error')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (errorParam === 'unauthorized_role') {
        setError('No tienes permisos de administrador para acceder.')
    }
  }, [errorParam])

  const handleGoogleCallback = useCallback(async (response: { credential: string }) => {
    setLoading(true)
    setError(null)
    
    try {
        // Enviar el token ID al servidor para validación y creación de sesión
        const res = await fetch('/auth/google', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token: response.credential }),
        })

        const data = await res.json()

        if (!res.ok) {
            if (data.error === 'unauthorized_whitelist') {
                router.push('/unauthorized')
            } else if (data.error === 'unauthorized_role') {
                setError('No tienes permisos de administrador.')
                setLoading(false)
            } else {
                throw new Error(data.error || 'Error al iniciar sesión')
            }
            return
        }
        
        // Login exitoso, redirigir
        // Usamos window.location.href para asegurar una navegación completa y que las cookies se actualicen correctamente
        window.location.href = '/'
        
    } catch (err: unknown) {
        console.error("Login error:", err)
        setError((err as Error).message || 'Ocurrió un error inesperado.')
        setLoading(false)
    }
  }, [router])

  useEffect(() => {
    // Inicializar botón de Google cuando el script cargue
    const initializeGoogleBtn = () => {
        if (window.google) {
            window.google.accounts.id.initialize({
                client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
                callback: handleGoogleCallback,
                auto_select: false, // No auto-seleccionar para dar control al usuario
                cancel_on_tap_outside: false
            });
            
            // Renderizar el botón
            const parent = document.getElementById('google-btn-wrapper');
            if(parent) {
                 window.google.accounts.id.renderButton(parent, {
                    theme: 'outline',
                    size: 'large',
                    text: 'continue_with' // Texto "Continuar con Google"
                });
            }
        }
    }
    
    // Pequeño delay para asegurar que el div existe y script cargó
    const timer = setTimeout(initializeGoogleBtn, 500)
    return () => clearTimeout(timer)
  }, [handleGoogleCallback])


  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black p-4">
      {/* Cargar script de Google Identity Services */}
      <Script src="https://accounts.google.com/gsi/client" strategy="lazyOnload" />

      <div className="w-full max-w-md space-y-8 rounded-2xl bg-neutral-900 p-8 shadow-xl border border-neutral-800">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Epixum Admin
          </h1>
          <p className="mt-2 text-sm text-gray-400">
            Inicia sesión para acceder a la plataforma
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-red-900/20 p-4 text-sm text-red-400 border border-red-900/50">
            {error}
          </div>
        )}

        <div className="mt-8 space-y-6">
            {/* Contenedor donde Google inyectará su botón */}
            <div id="google-btn-wrapper" className="w-full h-[40px] flex justify-center"></div>
            
            {!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && (
                <p className="text-xs text-red-400 text-center">
                    Falta configurar NEXT_PUBLIC_GOOGLE_CLIENT_ID
                </p>
            )}

            {loading && (
                <div className="flex justify-center mt-4">
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-neutral-700 border-t-indigo-500" />
                </div>
            )}
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <LoginForm />
    </Suspense>
  )
}
