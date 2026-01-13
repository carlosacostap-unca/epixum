'use client'

import Link from 'next/link'
import ProfileManager from '@/components/ProfileManager'

type Institution = {
    id: string
    nombre: string
    created_at: string
}

export default function InstitutionAdminDashboard({ 
    institutions, 
    userEmail,
    profile,
    hasMultipleRoles = false
}: { 
    institutions: Institution[], 
    userEmail: string 
    profile?: any
    hasMultipleRoles?: boolean
}) {
  return (
    <div className="flex min-h-screen flex-col items-center p-8 font-[family-name:var(--font-geist-sans)] bg-black">
      <main className="w-full max-w-4xl flex flex-col gap-8 items-start">
        <div className="flex justify-between w-full items-center bg-neutral-900 p-6 rounded-lg shadow-sm border border-neutral-800">
             <div>
                <h1 className="text-3xl font-bold text-gray-100">Bienvenido, Admin de Institución</h1>
                <p className="text-gray-400 mt-1">
                    Usuario: <span className="font-medium text-gray-200">{userEmail}</span>
                </p>
             </div>
             <div className="flex gap-4 items-center">
                 {profile && <ProfileManager initialProfile={profile} hasMultipleRoles={hasMultipleRoles} />}
             </div>
        </div>
        
        <div className="w-full bg-neutral-900 p-6 rounded-lg shadow-md border border-neutral-800">
            <h2 className="text-2xl font-bold mb-4 text-white">Mis Instituciones Asignadas</h2>
            
            {institutions.length === 0 ? (
                <div className="text-gray-500 italic p-4 bg-neutral-800/30 rounded border border-neutral-800">
                    No tienes instituciones asignadas actualmente.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {institutions.map(inst => (
                        <Link 
                            key={inst.id} 
                            href={`/institution/${inst.id}/courses`}
                            className="block"
                        >
                            <div className="bg-neutral-800 p-5 rounded border border-neutral-700 hover:border-indigo-500 transition-colors group h-full flex flex-col justify-center min-h-[120px]">
                                <h3 className="text-xl font-semibold text-gray-200 group-hover:text-white transition-colors">{inst.nombre}</h3>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>

      </main>
    </div>
  )
}
