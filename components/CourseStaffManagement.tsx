'use client'

import { useState } from 'react'
import { enrollNodocente, removeNodocenteFromCourse } from '@/app/actions/courses'

interface StaffMember {
    id: string
    email: string
    role: string
    created_at: string
}

interface CourseStaffManagementProps {
    initialStaff: StaffMember[]
    courseId: string
    institutionId: string
}

export default function CourseStaffManagement({ 
    initialStaff, 
    courseId, 
    institutionId 
}: CourseStaffManagementProps) {
    const [staff, setStaff] = useState<StaffMember[]>(initialStaff)
    const [isAdding, setIsAdding] = useState(false)
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)

    async function handleAdd(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        
        try {
            const result = await enrollNodocente(courseId, email)
            
            if (result.success) {
                setEmail('')
                setIsAdding(false)
                // Reload to get fresh data (simplest way to sync with server actions)
                window.location.reload()
            } else {
                alert(result.error || 'Error al asignar nodocente')
            }
        } catch (error) {
            alert('Error inesperado')
        } finally {
            setLoading(false)
        }
    }

    async function handleRemove(emailToRemove: string) {
        if (!confirm(`¿Está seguro de quitar a ${emailToRemove} de este curso?`)) return

        try {
            const result = await removeNodocenteFromCourse(courseId, emailToRemove)
            if (result.success) {
                window.location.reload()
            } else {
                alert(result.error || 'Error al eliminar')
            }
        } catch (error) {
            alert('Error inesperado')
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-neutral-900 p-4 rounded-lg border border-neutral-800">
                <h2 className="text-xl font-semibold text-gray-200">Personal Nodocente Asignado</h2>
                <button 
                    onClick={() => setIsAdding(true)}
                    className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition-colors text-sm font-medium"
                >
                    + Asignar Nodocente
                </button>
            </div>

            {isAdding && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-lg w-full max-w-md">
                        <h3 className="text-xl font-bold text-gray-100 mb-4">Asignar Nodocente</h3>
                        <form onSubmit={handleAdd} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">
                                    Correo Electrónico
                                </label>
                                <input 
                                    type="email" 
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-black border border-neutral-700 rounded p-2 text-gray-100 focus:border-indigo-500 focus:outline-none"
                                    placeholder="usuario@ejemplo.com"
                                />
                                <p className="text-xs text-gray-500 mt-2">
                                    Si el usuario no existe, será creado automáticamente.
                                </p>
                            </div>
                            
                            <div className="flex justify-end gap-3 mt-6">
                                <button 
                                    type="button"
                                    onClick={() => setIsAdding(false)}
                                    className="text-gray-400 hover:text-white px-3 py-2"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    type="submit"
                                    disabled={loading}
                                    className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? 'Asignando...' : 'Asignar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="grid gap-4">
                {staff.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 bg-neutral-900/50 rounded-lg border border-neutral-800/50">
                        No hay personal nodocente asignado a este curso.
                    </div>
                ) : (
                    staff.map((member) => (
                        <div 
                            key={member.id} 
                            className="flex justify-between items-center bg-neutral-900 border border-neutral-800 p-4 rounded-lg hover:border-neutral-700 transition-colors"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-indigo-900/30 flex items-center justify-center text-indigo-400 font-bold">
                                    {member.email.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <p className="text-gray-200 font-medium">{member.email}</p>
                                    <p className="text-xs text-gray-500">Asignado el {new Date(member.created_at).toLocaleDateString()}</p>
                                </div>
                            </div>
                            
                            <button 
                                onClick={() => handleRemove(member.email)}
                                className="text-red-500 hover:text-red-400 text-sm hover:underline px-3 py-1"
                            >
                                Quitar
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
