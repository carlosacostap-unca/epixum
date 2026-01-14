'use client'

import { useRouter } from 'next/navigation'

interface RoleSelectionScreenProps {
  roles: string[]
  userEmail: string
}

const ROLE_NAMES: Record<string, string> = {
  'admin-plataforma': 'Administrador de Plataforma',
  'admin-institucion': 'Administrador de Institución',
  'docente': 'Docente',
  'nodocente': 'No Docente',
  'estudiante': 'Estudiante',
  'supervisor': 'Supervisor'
}

const ROLE_DESCRIPTIONS: Record<string, string> = {
  'admin-plataforma': 'Gestión completa de usuarios e instituciones del sistema.',
  'admin-institucion': 'Gestión de tu institución asignada y sus recursos.',
  'docente': 'Acceso a cursos, calificaciones y material educativo.',
  'nodocente': 'Funciones administrativas y de soporte.',
  'estudiante': 'Acceso a tus cursos y progreso académico.',
  'supervisor': 'Visualización de cursos como estudiante.'
}

export default function RoleSelectionScreen({ roles, userEmail }: RoleSelectionScreenProps) {
  const router = useRouter()

  const handleRoleSelect = (role: string) => {
    // Navigate to the same page but with the role query param
    router.push(`/?role=${role}`)
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8 bg-black font-[family-name:var(--font-geist-sans)]">
      <main className="w-full max-w-2xl flex flex-col gap-8 items-center">
        
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-white tracking-tight">Selecciona tu Perfil</h1>
          <p className="text-gray-400">
            Hola <span className="text-gray-200 font-medium">{userEmail}</span>, tienes múltiples roles asignados.
            <br />
            Por favor, elige con cuál deseas ingresar hoy.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 w-full">
          {roles.map((role) => (
            <button
              key={role}
              onClick={() => handleRoleSelect(role)}
              className="group relative flex flex-col items-start p-6 bg-neutral-900 border border-neutral-800 rounded-xl hover:border-indigo-500/50 hover:bg-neutral-800 transition-all duration-200 text-left w-full"
            >
              <div className="flex items-center justify-between w-full mb-2">
                <h3 className="text-xl font-semibold text-gray-100 group-hover:text-white transition-colors">
                  {ROLE_NAMES[role] || role}
                </h3>
                <span className="opacity-0 group-hover:opacity-100 transition-opacity text-indigo-400 text-sm font-medium flex items-center gap-1">
                  Ingresar
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14" />
                    <path d="m12 5 7 7-7 7" />
                  </svg>
                </span>
              </div>
              <p className="text-gray-400 text-sm group-hover:text-gray-300 transition-colors">
                {ROLE_DESCRIPTIONS[role] || 'Acceso al panel de control para este rol.'}
              </p>
            </button>
          ))}
        </div>

        <form action="/auth/signout" method="post" className="mt-8">
          <button 
            type="submit"
            className="text-gray-500 hover:text-gray-300 text-sm transition-colors flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" x2="9" y1="12" y2="12" />
            </svg>
            Cerrar Sesión
          </button>
        </form>

      </main>
    </div>
  )
}
