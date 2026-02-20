'use client'

import { useState } from 'react'
import { processAdmissionRequest } from '@/app/actions/nodocente'
import { useRouter } from 'next/navigation'

export default function NodocenteAdmissionsView({ requests }: { requests: any[] }) {
    const router = useRouter()
    const [processingId, setProcessingId] = useState<string | null>(null)

    const handleProcess = async (userId: string) => {
        if (!confirm('¿Estás seguro de marcar esta solicitud como procesada?')) return

        setProcessingId(userId)
        const result = await processAdmissionRequest(userId)
        
        if (result.success) {
            router.refresh()
        } else {
            alert('Error al procesar la solicitud: ' + result.error)
        }
        setProcessingId(null)
    }

    return (
        <div className="flex min-h-screen flex-col items-center p-8 font-[family-name:var(--font-geist-sans)] bg-black text-white">
            <main className="w-full max-w-6xl flex flex-col gap-8 items-start">
                <div className="flex justify-between w-full items-center bg-neutral-900 p-6 rounded-lg shadow-sm border border-neutral-800">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-100">Solicitudes de Admisión</h1>
                        <p className="text-gray-400 mt-1">
                            Gestión de nuevos usuarios y solicitudes de inscripción.
                        </p>
                    </div>
                    <button 
                        onClick={() => router.back()}
                        className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded text-sm transition-colors"
                    >
                        Volver al Panel
                    </button>
                </div>

                <div className="w-full bg-neutral-900 p-6 rounded-lg shadow-md border border-neutral-800">
                    {requests.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            No hay solicitudes pendientes.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-neutral-700 text-gray-400 text-sm uppercase">
                                        <th className="py-3 px-4">Usuario</th>
                                        <th className="py-3 px-4">DNI / Teléfono</th>
                                        <th className="py-3 px-4">Interés (Curso)</th>
                                        <th className="py-3 px-4">Fecha Registro</th>
                                        <th className="py-3 px-4 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-800">
                                    {requests.map((req) => (
                                        <tr key={req.id} className="hover:bg-neutral-800/50 transition-colors">
                                            <td className="py-4 px-4">
                                                <div className="font-medium text-white">{req.last_name}, {req.first_name}</div>
                                                <div className="text-xs text-gray-500">{req.email}</div>
                                            </td>
                                            <td className="py-4 px-4 text-sm text-gray-300">
                                                <div>DNI: {req.dni || '-'}</div>
                                                <div className="text-xs text-gray-500">{req.phone || '-'}</div>
                                            </td>
                                            <td className="py-4 px-4 text-sm font-medium text-indigo-400">
                                                {req.course_interest || <span className="text-gray-600 italic">No especificado</span>}
                                            </td>
                                            <td className="py-4 px-4 text-sm text-gray-500">
                                                {new Date(req.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="py-4 px-4 text-right">
                                                <button
                                                    onClick={() => handleProcess(req.id)}
                                                    disabled={processingId === req.id}
                                                    className="px-3 py-1 bg-green-900/30 text-green-400 border border-green-800 hover:bg-green-900/50 rounded text-xs font-medium transition-colors disabled:opacity-50"
                                                >
                                                    {processingId === req.id ? 'Procesando...' : 'Marcar Procesado'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}
