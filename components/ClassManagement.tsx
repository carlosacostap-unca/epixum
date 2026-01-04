'use client'

import { useState, useEffect } from 'react'
import { createClass, deleteClass } from '@/app/actions/classes'
import { getSprints } from '@/app/actions/sprints'

interface ClassItem {
    id: string
    title: string
    description: string
    date: string
    sprint_id?: string | null
}

interface Sprint {
    id: string
    title: string
    start_date: string
    end_date: string
}

interface ClassManagementProps {
    courseId: string
    initialClasses: ClassItem[]
}

import ResourceList from './ResourceList'

export default function ClassManagement({ courseId, initialClasses }: ClassManagementProps) {
    const [classes, setClasses] = useState<ClassItem[]>(initialClasses)
    const [sprints, setSprints] = useState<Sprint[]>([])
    const [isAdding, setIsAdding] = useState(false)
    const [loading, setLoading] = useState(false)
    
    // Form states
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [date, setDate] = useState('')
    const [selectedSprintId, setSelectedSprintId] = useState('')

    useEffect(() => {
        async function loadSprints() {
            const result = await getSprints(courseId)
            if (result.success && result.data) {
                setSprints(result.data)
            }
        }
        loadSprints()
    }, [courseId])

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)

        try {
            // Ensure date is in ISO format or acceptable by Postgres
            const dateObj = new Date(date)
            const isoDate = dateObj.toISOString()

            const result = await createClass(courseId, title, description, isoDate, selectedSprintId || null)
            
            if (result.success) {
                // Reset form and reload
                setTitle('')
                setDescription('')
                setDate('')
                setSelectedSprintId('')
                setIsAdding(false)
                window.location.reload()
            } else {
                alert(result.error || 'Error al crear la clase')
            }
        } catch (error) {
            alert('Error inesperado')
        } finally {
            setLoading(false)
        }
    }

    async function handleDelete(classId: string) {
        if (!confirm('¿Está seguro de eliminar esta clase?')) return

        try {
            const result = await deleteClass(classId, courseId)
            if (result.success) {
                window.location.reload()
            } else {
                alert(result.error || 'Error al eliminar')
            }
        } catch (error) {
            alert('Error inesperado')
        }
    }

    // Helper to find sprint title
    const getSprintTitle = (sprintId: string | null | undefined) => {
        if (!sprintId) return null
        const sprint = sprints.find(s => s.id === sprintId)
        return sprint ? sprint.title : null
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-200">Clases del Curso</h2>
                <button 
                    onClick={() => setIsAdding(true)}
                    className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition-colors text-sm font-medium"
                >
                    + Nueva Clase
                </button>
            </div>

            {isAdding && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-lg w-full max-w-md">
                        <h3 className="text-xl font-bold text-gray-100 mb-4">Crear Nueva Clase</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Título</label>
                                <input 
                                    type="text" 
                                    required
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full bg-black border border-neutral-700 rounded p-2 text-gray-100 focus:border-indigo-500 focus:outline-none"
                                />
                            </div>
                            
                            {sprints.length > 0 && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Asignar a Sprint (Opcional)</label>
                                    <select
                                        value={selectedSprintId}
                                        onChange={(e) => setSelectedSprintId(e.target.value)}
                                        className="w-full bg-black border border-neutral-700 rounded p-2 text-gray-100 focus:border-indigo-500 focus:outline-none"
                                    >
                                        <option value="">-- Sin Sprint --</option>
                                        {sprints.map(sprint => (
                                            <option key={sprint.id} value={sprint.id}>
                                                {sprint.title}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Descripción</label>
                                <textarea 
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full bg-black border border-neutral-700 rounded p-2 text-gray-100 focus:border-indigo-500 focus:outline-none h-24 resize-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Fecha y Hora</label>
                                <input 
                                    type="datetime-local" 
                                    required
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    className="w-full bg-black border border-neutral-700 rounded p-2 text-gray-100 focus:border-indigo-500 focus:outline-none [color-scheme:dark]"
                                />
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
                                    className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
                                >
                                    {loading ? 'Guardando...' : 'Guardar Clase'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="grid gap-4">
                {classes.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 bg-neutral-900/50 rounded-lg border border-neutral-800/50">
                        No hay clases programadas para este curso.
                    </div>
                ) : (
                    classes.map((item) => {
                        const sprintTitle = getSprintTitle(item.sprint_id)
                        
                        return (
                            <div 
                                key={item.id} 
                                className="bg-neutral-900 border border-neutral-800 p-4 rounded-lg hover:border-neutral-700 transition-colors flex justify-between items-start group"
                            >
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="text-lg font-bold text-gray-100">{item.title}</h3>
                                        {sprintTitle && (
                                            <span className="text-xs bg-indigo-900/50 text-indigo-300 px-2 py-0.5 rounded border border-indigo-800">
                                                {sprintTitle}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-indigo-400 mb-2">
                                        {new Date(item.date).toLocaleString()}
                                    </p>
                                    <p className="text-gray-400 text-sm">{item.description}</p>
                                    
                                    <ResourceList classId={item.id} />
                                </div>
                                
                                <button 
                                    onClick={() => handleDelete(item.id)}
                                    className="text-red-500 opacity-0 group-hover:opacity-100 hover:text-red-400 text-sm px-3 py-1 transition-opacity"
                                >
                                    Eliminar
                                </button>
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    )
}
