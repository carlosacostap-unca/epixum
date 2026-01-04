'use client'

import { useState, useEffect } from 'react'
import { createSprint, getSprints, deleteSprint } from '@/app/actions/sprints'

type Sprint = {
    id: string
    title: string
    description: string | null
    start_date: string
    end_date: string
}

export default function SprintManagement({ courseId, initialSprints = [] }: { courseId: string, initialSprints?: Sprint[] }) {
    const [sprints, setSprints] = useState<Sprint[]>(initialSprints)
    const [isCreating, setIsCreating] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    // Fallback fetch if initialSprints is empty/stale (though usually passed from server)
    useEffect(() => {
        if (initialSprints.length === 0) {
            loadSprints()
        } else {
            setSprints(initialSprints)
        }
    }, [initialSprints])

    async function loadSprints() {
        const result = await getSprints(courseId)
        if (result.success && result.data) {
            setSprints(result.data)
        }
    }

    async function handleCreate(formData: FormData) {
        setIsLoading(true)
        const result = await createSprint(formData)
        setIsLoading(false)

        if (result.success) {
            setIsCreating(false)
            loadSprints() // Refresh list
        } else {
            alert(result.error)
        }
    }

    async function handleDelete(sprintId: string) {
        if (!confirm('¿Estás seguro de eliminar este sprint?')) return

        const result = await deleteSprint(sprintId, courseId)
        if (result.success) {
            loadSprints()
        } else {
            alert(result.error)
        }
    }

    return (
        <div className="w-full">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-100">Sprints</h2>
                {!isCreating && (
                    <button 
                        onClick={() => setIsCreating(true)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                        + Nuevo Sprint
                    </button>
                )}
            </div>

            {isCreating && (
                <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6 mb-6">
                    <h3 className="text-lg font-bold text-gray-100 mb-4">Crear Nuevo Sprint</h3>
                    <form action={handleCreate} className="flex flex-col gap-4">
                        <input type="hidden" name="courseId" value={courseId} />
                        
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Título</label>
                            <input 
                                name="title"
                                placeholder="Ej: Sprint 1 - Fundamentos"
                                className="bg-neutral-950 border border-neutral-700 rounded px-3 py-2 text-sm text-white w-full focus:outline-none focus:border-indigo-500"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Descripción</label>
                            <textarea 
                                name="description"
                                placeholder="Objetivos y alcance del sprint..."
                                className="bg-neutral-950 border border-neutral-700 rounded px-3 py-2 text-sm text-white w-full focus:outline-none focus:border-indigo-500 resize-none"
                                rows={3}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Fecha Inicio</label>
                                <input 
                                    type="date"
                                    name="startDate"
                                    className="bg-neutral-950 border border-neutral-700 rounded px-3 py-2 text-sm text-white w-full focus:outline-none focus:border-indigo-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Fecha Fin</label>
                                <input 
                                    type="date"
                                    name="endDate"
                                    className="bg-neutral-950 border border-neutral-700 rounded px-3 py-2 text-sm text-white w-full focus:outline-none focus:border-indigo-500"
                                    required
                                />
                            </div>
                        </div>

                        <div className="flex gap-2 mt-2">
                            <button 
                                type="submit"
                                disabled={isLoading}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold py-2 px-4 rounded disabled:opacity-50"
                            >
                                {isLoading ? 'Creando...' : 'Crear Sprint'}
                            </button>
                            <button 
                                type="button"
                                onClick={() => setIsCreating(false)}
                                className="bg-neutral-700 hover:bg-neutral-600 text-gray-300 text-sm font-bold py-2 px-4 rounded"
                            >
                                Cancelar
                            </button>
                        </div>
                    </form>
                </div>
            )}
            
            <div className="space-y-4">
                {sprints.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 bg-neutral-900/50 rounded-lg border border-neutral-800 border-dashed">
                        No hay sprints creados aún.
                    </div>
                ) : (
                    sprints.map(sprint => (
                        <div key={sprint.id} className="bg-neutral-900 border border-neutral-800 rounded-lg p-5 flex justify-between items-start hover:border-neutral-700 transition-colors">
                            <div>
                                <h3 className="text-lg font-bold text-gray-100">{sprint.title}</h3>
                                {sprint.description && (
                                    <p className="text-sm text-gray-400 mt-1 mb-3">{sprint.description}</p>
                                )}
                                <div className="flex gap-4 text-xs text-gray-500 font-mono">
                                    <span className="flex items-center gap-1">
                                        <span className="w-2 h-2 rounded-full bg-green-500/50"></span>
                                        Inicio: {sprint.start_date.split('-').reverse().join('/')}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <span className="w-2 h-2 rounded-full bg-red-500/50"></span>
                                        Fin: {sprint.end_date.split('-').reverse().join('/')}
                                    </span>
                                </div>
                            </div>
                            <button 
                                onClick={() => handleDelete(sprint.id)}
                                className="text-gray-500 hover:text-red-400 p-2 rounded hover:bg-neutral-800 transition-colors"
                                title="Eliminar Sprint"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                </svg>
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
