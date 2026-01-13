'use client'

import { useState } from 'react'
import { updateCourseStatus } from '@/app/actions/courses'

export default function CourseStatusSelector({ 
    courseId, 
    initialStatus 
}: { 
    courseId: string, 
    initialStatus: string 
}) {
    const [status, setStatus] = useState(initialStatus || 'Borrador')
    const [isLoading, setIsLoading] = useState(false)
    const [isOpen, setIsOpen] = useState(false)

    async function handleStatusChange(newStatus: string) {
        setStatus(newStatus)
        setIsOpen(false)
        setIsLoading(true)
        
        const result = await updateCourseStatus(courseId, newStatus)
        
        if (!result.success) {
            alert('Error al actualizar estado: ' + result.error)
            // Revert
            setStatus(initialStatus)
        }
        setIsLoading(false)
    }

    const getStatusColor = (s: string) => {
        switch(s) {
            case 'Activo': return 'bg-green-900/30 text-green-400 border-green-800'
            case 'Finalizado': return 'bg-blue-900/30 text-blue-400 border-blue-800'
            default: return 'bg-neutral-800 text-gray-400 border-neutral-700'
        }
    }

    return (
        <div className="relative">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded border ${getStatusColor(status)} text-xs font-bold uppercase tracking-wider hover:brightness-110 transition-all`}
                disabled={isLoading}
            >
                {isLoading ? '...' : status}
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-40 bg-neutral-900 border border-neutral-700 rounded-lg shadow-xl overflow-hidden z-50">
                    {['Borrador', 'Activo', 'Finalizado'].map((s) => (
                        <button
                            key={s}
                            onClick={() => handleStatusChange(s)}
                            className={`w-full text-left px-4 py-2.5 text-sm hover:bg-neutral-800 transition-colors ${status === s ? 'text-white font-medium bg-neutral-800' : 'text-gray-400'}`}
                        >
                            {s}
                        </button>
                    ))}
                </div>
            )}
            
            {isOpen && (
                <div 
                    className="fixed inset-0 z-40 bg-transparent" 
                    onClick={() => setIsOpen(false)}
                />
            )}
        </div>
    )
}
