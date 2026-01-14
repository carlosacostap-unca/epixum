'use client'

import { useState, useEffect } from 'react'
import { createClass, deleteClass, updateClass, createClassWithResources } from '@/app/actions/classes'
import { getSprints } from '@/app/actions/sprints'
import { getClassResources } from '@/app/actions/resources'

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
    const [isEditing, setIsEditing] = useState(false)
    const [editingClassId, setEditingClassId] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [expandedClasses, setExpandedClasses] = useState<Record<string, boolean>>({})
    
    // Form states
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [date, setDate] = useState('')
    const [selectedSprintId, setSelectedSprintId] = useState('')
    
    // Template states
    const [creationMode, setCreationMode] = useState<'scratch' | 'template'>('scratch')
    const [selectedTemplateId, setSelectedTemplateId] = useState('')
    const [draftResources, setDraftResources] = useState<{ title: string, url: string, type: string }[]>([])

    useEffect(() => {
        async function loadSprints() {
            const result = await getSprints(courseId)
            if (result.success && result.data) {
                setSprints(result.data)
            }
        }
        loadSprints()
    }, [courseId])

    const resetForm = () => {
        setTitle('')
        setDescription('')
        setDate('')
        setSelectedSprintId('')
        setCreationMode('scratch')
        setSelectedTemplateId('')
        setDraftResources([])
        setIsAdding(false)
        setIsEditing(false)
        setEditingClassId(null)
    }

    const handleEditClick = (item: ClassItem) => {
        setTitle(item.title)
        setDescription(item.description)
        // Convert ISO date to datetime-local format (YYYY-MM-DDThh:mm)
        const dateObj = new Date(item.date)
        // Adjust for timezone offset to display local time correctly in input
        const localDate = new Date(dateObj.getTime() - (dateObj.getTimezoneOffset() * 60000)).toISOString().slice(0, 16)
        setDate(localDate)
        setSelectedSprintId(item.sprint_id || '')
        setEditingClassId(item.id)
        setIsEditing(true)
        setIsAdding(true) // Reuse the modal
    }

    const handleTemplateChange = async (templateId: string) => {
        setSelectedTemplateId(templateId)
        if (!templateId) {
            setTitle('')
            setDescription('')
            setDraftResources([])
            return
        }

        const templateClass = classes.find(c => c.id === templateId)
        if (templateClass) {
            setTitle(templateClass.title)
            setDescription(templateClass.description)
            // We don't copy date, usually new class implies new date, but user can set it.
            // We'll leave date empty or current date? Let's leave it empty to force user to choose.
        }

        // Fetch resources
        const resResult = await getClassResources(templateId)
        if (resResult.success && resResult.data) {
            setDraftResources(resResult.data.map((r: any) => ({
                title: r.title,
                url: r.url,
                type: r.type
            })))
        }
    }

    const updateDraftResource = (index: number, field: 'title' | 'url', value: string) => {
        const newResources = [...draftResources]
        newResources[index] = { ...newResources[index], [field]: value }
        setDraftResources(newResources)
    }

    const removeDraftResource = (index: number) => {
        const newResources = [...draftResources]
        newResources.splice(index, 1)
        setDraftResources(newResources)
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)

        try {
            // Ensure date is in ISO format or acceptable by Postgres
            const dateObj = new Date(date)
            const isoDate = dateObj.toISOString()

            let result;
            if (isEditing && editingClassId) {
                result = await updateClass(editingClassId, courseId, title, description, isoDate, selectedSprintId || null)
            } else {
                // New class (scratch or template)
                if (draftResources.length > 0) {
                     result = await createClassWithResources(courseId, title, description, isoDate, selectedSprintId || null, draftResources)
                } else {
                     result = await createClass(courseId, title, description, isoDate, selectedSprintId || null)
                }
            }
            
            if (result.success) {
                resetForm()
                window.location.reload()
            } else {
                alert(result.error || (isEditing ? 'Error al actualizar la clase' : 'Error al crear la clase'))
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

    // Helper to format date
    const formatDate = (dateString: string) => {
        const dateObj = new Date(dateString)
        const dayName = new Intl.DateTimeFormat('es-ES', { weekday: 'long' }).format(dateObj)
        const dayNameCapitalized = dayName.charAt(0).toUpperCase() + dayName.slice(1)
        
        const day = dateObj.getDate().toString().padStart(2, '0')
        const month = (dateObj.getMonth() + 1).toString().padStart(2, '0')
        const year = dateObj.getFullYear()
        const hours = dateObj.getHours().toString().padStart(2, '0')
        const minutes = dateObj.getMinutes().toString().padStart(2, '0')
        
        return `${dayNameCapitalized} ${day}/${month}/${year} a las ${hours}:${minutes} horas`
    }

    const toggleClass = (id: string) => {
        setExpandedClasses(prev => ({
            ...prev,
            [id]: !prev[id]
        }))
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-200">Clases del Curso</h2>
                <button 
                    onClick={() => {
                        resetForm()
                        setIsAdding(true)
                    }}
                    className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition-colors text-sm font-medium"
                >
                    + Nueva Clase
                </button>
            </div>

            {isAdding && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-lg w-full max-w-md">
                        <h3 className="text-xl font-bold text-gray-100 mb-4">
                            {isEditing ? 'Editar Clase' : 'Crear Nueva Clase'}
                        </h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            
                            {!isEditing && (
                                <div className="space-y-3 p-3 bg-neutral-800/50 rounded border border-neutral-700 mb-4">
                                    <label className="block text-sm font-medium text-gray-300">Modo de Creación</label>
                                    <div className="flex gap-4">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input 
                                                type="radio" 
                                                name="creationMode"
                                                value="scratch"
                                                checked={creationMode === 'scratch'}
                                                onChange={(e) => setCreationMode(e.target.value as 'scratch' | 'template')}
                                                className="text-indigo-600 focus:ring-indigo-500 bg-black border-gray-600"
                                            />
                                            <span className="text-sm text-gray-300">Desde cero</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input 
                                                type="radio" 
                                                name="creationMode"
                                                value="template"
                                                checked={creationMode === 'template'}
                                                onChange={(e) => setCreationMode(e.target.value as 'scratch' | 'template')}
                                                className="text-indigo-600 focus:ring-indigo-500 bg-black border-gray-600"
                                            />
                                            <span className="text-sm text-gray-300">Usar plantilla</span>
                                        </label>
                                    </div>

                                    {creationMode === 'template' && (
                                        <div className="mt-3">
                                            <label className="block text-sm font-medium text-gray-400 mb-1">Seleccionar Clase Plantilla</label>
                                            <select
                                                value={selectedTemplateId}
                                                onChange={(e) => handleTemplateChange(e.target.value)}
                                                className="w-full bg-black border border-neutral-700 rounded p-2 text-gray-100 focus:border-indigo-500 focus:outline-none"
                                            >
                                                <option value="">-- Seleccionar una clase --</option>
                                                {[...classes].reverse().map(cls => (
                                                    <option key={cls.id} value={cls.id}>
                                                        {cls.title} ({formatDate(cls.date)})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </div>
                            )}

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

                            {draftResources.length > 0 && (
                                <div className="mt-4 border-t border-neutral-700 pt-4">
                                    <label className="block text-sm font-medium text-gray-300 mb-2">Recursos de la Plantilla</label>
                                    <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                                        {draftResources.map((resource, index) => (
                                            <div key={index} className="flex gap-2 items-start bg-neutral-800/30 p-2 rounded">
                                                <div className="flex-1 space-y-2">
                                                    <input 
                                                        type="text"
                                                        value={resource.title}
                                                        onChange={(e) => updateDraftResource(index, 'title', e.target.value)}
                                                        placeholder="Título del recurso"
                                                        className="w-full bg-black border border-neutral-700 rounded p-1 text-xs text-gray-100 focus:border-indigo-500"
                                                    />
                                                    <input 
                                                        type="text"
                                                        value={resource.url}
                                                        onChange={(e) => updateDraftResource(index, 'url', e.target.value)}
                                                        placeholder="URL del recurso"
                                                        className="w-full bg-black border border-neutral-700 rounded p-1 text-xs text-gray-100 focus:border-indigo-500"
                                                    />
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => removeDraftResource(index)}
                                                    className="text-red-400 hover:text-red-300 p-1"
                                                    title="Eliminar recurso"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            
                            <div className="flex justify-end gap-3 mt-6">
                                <button 
                                    type="button"
                                    onClick={resetForm}
                                    className="text-gray-400 hover:text-white px-3 py-2"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    type="submit"
                                    disabled={loading}
                                    className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
                                >
                                    {loading ? 'Guardando...' : (isEditing ? 'Actualizar Clase' : 'Guardar Clase')}
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
                        const isExpanded = expandedClasses[item.id]
                        
                        return (
                            <div 
                                key={item.id} 
                                className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden group"
                            >
                                <div 
                                    onClick={() => toggleClass(item.id)}
                                    className="p-4 cursor-pointer hover:bg-neutral-800/50 transition-colors flex justify-between items-start"
                                >
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="text-lg font-bold text-gray-100">{item.title}</h3>
                                            {sprintTitle && (
                                                <span className="text-xs bg-indigo-900/50 text-indigo-300 px-2 py-0.5 rounded border border-indigo-800">
                                                    {sprintTitle}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-indigo-400 font-medium">
                                            {formatDate(item.date)}
                                        </p>
                                    </div>
                                    
                                    <div className="flex items-center gap-4 ml-4">
                                        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                                            <button 
                                                onClick={() => handleEditClick(item)}
                                                className="text-indigo-400 hover:text-indigo-300 text-sm px-3 py-1 transition-colors"
                                            >
                                                Editar
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(item.id)}
                                                className="text-red-500 opacity-0 group-hover:opacity-100 hover:text-red-400 text-sm px-3 py-1 transition-opacity"
                                            >
                                                Eliminar
                                            </button>
                                        </div>
                                        <div className="text-gray-400">
                                            {isExpanded ? (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>
                                            ) : (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                
                                {isExpanded && (
                                    <div className="px-4 pb-4 border-t border-neutral-800 pt-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                        <p className="text-gray-400 text-sm mb-4">{item.description}</p>
                                        
                                        <ResourceList classId={item.id} />
                                    </div>
                                )}
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    )
}
