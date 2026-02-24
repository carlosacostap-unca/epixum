'use client'

import Image from 'next/image'
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
        if (data.redirectTo) {
            window.location.href = data.redirectTo
        } else {
            window.location.href = '/'
        }
        
    } catch (err: unknown) {
        console.error("Login error:", err)
        setError((err as Error).message || 'Ocurrió un error inesperado.')
        setLoading(false)
    }
  }, [router])

    const initializeGoogleBtn = useCallback(() => {
        if (window.google && document.getElementById('google-btn-wrapper')) {
            try {
                window.google.accounts.id.initialize({
                    client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
                    callback: handleGoogleCallback,
                    auto_select: false,
                    cancel_on_tap_outside: false
                });
                
                const parent = document.getElementById('google-btn-wrapper');
                if(parent) {
                    window.google.accounts.id.renderButton(parent, {
                        theme: 'outline',
                        size: 'large',
                        text: 'continue_with',
                        width: parent.clientWidth // Adaptar ancho
                    });
                }
            } catch (error) {
                console.error("Error rendering Google button:", error);
            }
        }
    }, [handleGoogleCallback]);

    useEffect(() => {
        // Intentar inicializar inmediatamente si ya está cargado
        if (window.google) {
            initializeGoogleBtn();
        }

        // Configurar un intervalo para verificar la carga del script
        const interval = setInterval(() => {
            if (window.google) {
                initializeGoogleBtn();
                clearInterval(interval);
            }
        }, 100);

        // Limpiar intervalo después de 5 segundos para evitar bucles infinitos si falla la red
        const timeout = setTimeout(() => clearInterval(interval), 5000);

        return () => {
            clearInterval(interval);
            clearTimeout(timeout);
        };
    }, [initializeGoogleBtn]);


  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black p-4">
      {/* Cargar script de Google Identity Services con onLoad */}
      <Script 
        src="https://accounts.google.com/gsi/client" 
        strategy="afterInteractive" 
        onLoad={initializeGoogleBtn}
        onError={(e) => console.error("Error loading Google Script", e)}
      />

      <div className="w-full max-w-md space-y-8 rounded-2xl bg-neutral-900 p-8 shadow-xl border border-neutral-800">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <Image 
              src="/epixum-logo.png" 
              alt="Epixum Logo" 
              width={100} 
              height={100}
              className="object-contain"
              priority
            />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Epixum
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
