'use client'

import { useState, useEffect } from 'react'
import { getSprints } from '@/app/actions/sprints'

type Sprint = {
    id: string
    title: string
    description: string | null
    start_date: string
    end_date: string
}

export default function SprintList({ courseId, initialSprints = [] }: { courseId: string, initialSprints?: Sprint[] }) {
    const [sprints, setSprints] = useState<Sprint[]>(initialSprints)
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        if (initialSprints.length === 0) {
            loadSprints()
        }
    }, [initialSprints])

    async function loadSprints() {
        setIsLoading(true)
        const result = await getSprints(courseId)
        if (result.success && result.data) {
            setSprints(result.data)
        }
        setIsLoading(false)
    }

    return (
        <div className="w-full">
            <h2 className="text-xl font-bold text-gray-100 mb-6">Sprints</h2>
            
            {sprints.length === 0 ? (
                <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-8 text-center">
                    <div className="w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-600">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2v4"></path>
                            <path d="M12 18v4"></path>
                            <path d="M4.93 4.93l2.83 2.83"></path>
                            <path d="M16.24 16.24l2.83 2.83"></path>
                            <path d="M2 12h4"></path>
                            <path d="M18 12h4"></path>
                            <path d="M4.93 19.07l2.83-2.83"></path>
                            <path d="M16.24 7.76l2.83-2.83"></path>
                        </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-300 mb-2">Sprints del Curso</h3>
                    <p className="text-gray-500 max-w-md mx-auto">
                        No hay sprints publicados actualmente.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {sprints.map(sprint => {
                        // Get current date in the configured timezone (YYYY-MM-DD)
                        const timezone = process.env.NEXT_PUBLIC_TIMEZONE || 'UTC'
                        const nowInTz = new Date().toLocaleDateString('en-CA', { timeZone: timezone })
                        
                        const start = sprint.start_date
                        const end = sprint.end_date
                        
                        const isActive = nowInTz >= start && nowInTz <= end
                        const isPast = nowInTz > end
                        const isFuture = nowInTz < start

                        // Format dates for display (YYYY-MM-DD -> DD/MM/YYYY)
                        const formatDate = (dateStr: string) => {
                            const [year, month, day] = dateStr.split('-')
                            return `${day}/${month}/${year}`
                        }

                        return (
                            <div key={sprint.id} className={`bg-neutral-900 border rounded-lg p-6 flex flex-col md:flex-row justify-between gap-4 transition-all ${isActive ? 'border-indigo-500 shadow-lg shadow-indigo-900/20' : 'border-neutral-800 hover:border-neutral-700'}`}>
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className={`text-xl font-bold ${isActive ? 'text-white' : 'text-gray-200'}`}>{sprint.title}</h3>
                                        {isActive && (
                                            <span className="bg-indigo-900/50 text-indigo-300 text-xs px-2 py-1 rounded border border-indigo-700 font-medium">
                                                En curso
                                            </span>
                                        )}
                                        {isFuture && (
                                            <span className="bg-neutral-800 text-gray-400 text-xs px-2 py-1 rounded border border-neutral-700 font-medium">
                                                Próximo
                                            </span>
                                        )}
                                        {isPast && (
                                            <span className="bg-neutral-950 text-gray-500 text-xs px-2 py-1 rounded border border-neutral-800 font-medium">
                                                Finalizado
                                            </span>
                                        )}
                                    </div>
                                    {sprint.description && (
                                        <p className="text-gray-400 text-sm mb-4 leading-relaxed">{sprint.description}</p>
                                    )}
                                    
                                    <div className="flex gap-6 text-sm text-gray-500 font-mono bg-black/20 p-3 rounded-md inline-flex border border-neutral-800/50">
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                                            <span>Inicio: {formatDate(start)}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                                            <span>Fin: {formatDate(end)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
