'use client'

import { useState, useEffect } from 'react'
import { createSprint, getSprints, deleteSprint } from '@/app/actions/sprints'
import { createClass, deleteClass } from '@/app/actions/classes'
import ResourceList from './ResourceList'

type Sprint = {
    id: string
    title: string
    description: string | null
    start_date: string
    end_date: string
}

type ClassItem = {
    id: string
    title: string
    description: string
    date: string
    sprint_id?: string | null
}

export default function SprintManagement({ 
    courseId, 
    initialSprints = [], 
    initialClasses = [] 
}: { 
    courseId: string, 
    initialSprints?: Sprint[],
    initialClasses?: ClassItem[] 
}) {
    const [sprints, setSprints] = useState<Sprint[]>(initialSprints)
    const [classes, setClasses] = useState<ClassItem[]>(initialClasses)
    const [selectedSprintId, setSelectedSprintId] = useState<string | null>(null)
    const [isCreating, setIsCreating] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    // Class creation state
    const [addingClassToSprintId, setAddingClassToSprintId] = useState<string | null>(null)
    const [classTitle, setClassTitle] = useState('')
    const [classDescription, setClassDescription] = useState('')
    const [classDate, setClassDate] = useState('')
    const [isCreatingClass, setIsCreatingClass] = useState(false)

    // Fallback fetch if initialSprints is empty/stale (though usually passed from server)
    useEffect(() => {
        if (initialSprints.length === 0) {
            loadSprints()
        } else {
            setSprints(initialSprints)
            // Select first sprint by default if none selected
            if (initialSprints.length > 0 && !selectedSprintId) {
                setSelectedSprintId(initialSprints[0].id)
            }
        }
    }, [initialSprints])

    // Update classes if initialClasses changes
    useEffect(() => {
        setClasses(initialClasses)
    }, [initialClasses])

    async function loadSprints() {
        const result = await getSprints(courseId)
        if (result.success && result.data) {
            setSprints(result.data)
            if (result.data.length > 0 && !selectedSprintId) {
                setSelectedSprintId(result.data[0].id)
            }
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

    async function handleCreateClass(e: React.FormEvent) {
        e.preventDefault()
        if (!addingClassToSprintId) return

        setIsCreatingClass(true)
        try {
            const dateObj = new Date(classDate)
            const isoDate = dateObj.toISOString()

            const result = await createClass(courseId, classTitle, classDescription, isoDate, addingClassToSprintId)
            
            if (result.success) {
                // We need to reload classes somehow. 
                // Since createClass calls revalidatePath, reloading the page is the easiest way to sync state completely.
                // Or we can assume success and append to local state if we had the ID.
                // For simplicity and correctness with server actions, window.location.reload() is robust here.
                window.location.reload()
            } else {
                alert(result.error || 'Error al crear la clase')
            }
        } catch (error) {
            alert('Error inesperado')
        } finally {
            setIsCreatingClass(false)
        }
    }

    async function handleDeleteClass(classId: string) {
        if (!confirm('¿Está seguro de eliminar esta clase del sprint?')) return

        try {
            const result = await deleteClass(classId, courseId)
            if (result.success) {
                window.location.reload()
            } else {
                alert(result.error || 'Error al eliminar la clase')
            }
        } catch (error) {
            alert('Error inesperado')
        }
    }

    // Helper to get selected sprint
    const selectedSprint = sprints.find(s => s.id === selectedSprintId)
    const selectedSprintClasses = selectedSprint ? classes.filter(c => c.sprint_id === selectedSprint.id) : []

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

            {/* Sprint Tabs */}
            {sprints.length > 0 && !isCreating && (
                <div className="flex gap-2 overflow-x-auto pb-4 mb-2 border-b border-neutral-800 scrollbar-thin scrollbar-thumb-neutral-700">
                    {sprints.map(sprint => (
                        <button
                            key={sprint.id}
                            onClick={() => setSelectedSprintId(sprint.id)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                                selectedSprintId === sprint.id
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-neutral-900 text-gray-400 hover:text-gray-200 hover:bg-neutral-800'
                            }`}
                        >
                            {sprint.title}
                        </button>
                    ))}
                </div>
            )}

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
            
            {/* Add Class Modal */}
            {addingClassToSprintId && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-lg w-full max-w-md">
                        <h3 className="text-xl font-bold text-gray-100 mb-4">Agregar Clase al Sprint</h3>
                        <form onSubmit={handleCreateClass} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Título</label>
                                <input 
                                    type="text" 
                                    required
                                    value={classTitle}
                                    onChange={(e) => setClassTitle(e.target.value)}
                                    className="w-full bg-black border border-neutral-700 rounded p-2 text-gray-100 focus:border-indigo-500 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Descripción</label>
                                <textarea 
                                    value={classDescription}
                                    onChange={(e) => setClassDescription(e.target.value)}
                                    className="w-full bg-black border border-neutral-700 rounded p-2 text-gray-100 focus:border-indigo-500 focus:outline-none h-24 resize-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Fecha y Hora</label>
                                <input 
                                    type="datetime-local" 
                                    required
                                    value={classDate}
                                    onChange={(e) => setClassDate(e.target.value)}
                                    className="w-full bg-black border border-neutral-700 rounded p-2 text-gray-100 focus:border-indigo-500 focus:outline-none [color-scheme:dark]"
                                />
                            </div>
                            
                            <div className="flex justify-end gap-3 mt-6">
                                <button 
                                    type="button"
                                    onClick={() => {
                                        setAddingClassToSprintId(null)
                                        setClassTitle('')
                                        setClassDescription('')
                                        setClassDate('')
                                    }}
                                    className="text-gray-400 hover:text-white px-3 py-2"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    type="submit"
                                    disabled={isCreatingClass}
                                    className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
                                >
                                    {isCreatingClass ? 'Guardando...' : 'Guardar Clase'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="space-y-4">
                {sprints.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 bg-neutral-900/50 rounded-lg border border-neutral-800 border-dashed">
                        No hay sprints creados aún.
                    </div>
                ) : selectedSprint ? (
                    <div key={selectedSprint.id} className="bg-neutral-900 border border-neutral-800 rounded-lg p-5">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-lg font-bold text-gray-100">{selectedSprint.title}</h3>
                                {selectedSprint.description && (
                                    <p className="text-sm text-gray-400 mt-1 mb-3">{selectedSprint.description}</p>
                                )}
                                <div className="flex gap-4 text-xs text-gray-500 font-mono">
                                    <span className="flex items-center gap-1">
                                        <span className="w-2 h-2 rounded-full bg-green-500/50"></span>
                                        Inicio: {selectedSprint.start_date.split('-').reverse().join('/')}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <span className="w-2 h-2 rounded-full bg-red-500/50"></span>
                                        Fin: {selectedSprint.end_date.split('-').reverse().join('/')}
                                    </span>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => setAddingClassToSprintId(selectedSprint.id)}
                                    className="text-indigo-400 hover:text-indigo-300 text-sm px-3 py-1 bg-indigo-900/20 hover:bg-indigo-900/40 rounded transition-colors"
                                >
                                    + Agregar Clase
                                </button>
                                <button 
                                    onClick={() => handleDelete(selectedSprint.id)}
                                    className="text-gray-500 hover:text-red-400 p-2 rounded hover:bg-neutral-800 transition-colors"
                                    title="Eliminar Sprint"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Classes List within Sprint */}
                        {selectedSprintClasses.length > 0 ? (
                            <div className="mt-4 pl-4 border-l-2 border-neutral-800 space-y-3">
                                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Clases del Sprint</h4>
                                {selectedSprintClasses.map(cls => (
                                    <div key={cls.id} className="bg-black/40 p-3 rounded border border-neutral-800 group">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <h5 className="text-sm font-medium text-gray-200">{cls.title}</h5>
                                                <p className="text-xs text-gray-500">
                                                    {new Date(cls.date).toLocaleString()}
                                                </p>
                                            </div>
                                            <button 
                                                onClick={() => handleDeleteClass(cls.id)}
                                                className="text-red-500 opacity-0 group-hover:opacity-100 hover:text-red-400 text-xs px-2 py-1 transition-opacity"
                                            >
                                                Eliminar
                                            </button>
                                        </div>
                                        
                                        <div className="mt-2 pt-2 border-t border-neutral-800/50">
                                            <ResourceList classId={cls.id} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="mt-8 text-center py-8 bg-black/20 rounded border border-neutral-800/50 border-dashed">
                                <p className="text-sm text-gray-500">No hay clases en este sprint.</p>
                                <button 
                                    onClick={() => setAddingClassToSprintId(selectedSprint.id)}
                                    className="mt-2 text-indigo-400 hover:text-indigo-300 text-sm hover:underline"
                                >
                                    Agregar la primera clase
                                </button>
                            </div>
                        )}
                    </div>
                ) : null}
            </div>
        </div>
    )

}
