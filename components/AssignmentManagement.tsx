'use client'

import { useState, useEffect } from 'react'
import { createAssignment, deleteAssignment, updateAssignment } from '@/app/actions/assignments'
import SubmissionList from './SubmissionList'
import AssignmentResourceList from './AssignmentResourceList'

interface Sprint {
    id: string
    title: string
}

interface Assignment {
    id: string
    title: string
    description: string
    due_date: string
    sprint_id?: string | null
}

interface AssignmentManagementProps {
    courseId: string
    initialAssignments: Assignment[]
    sprints?: Sprint[]
}

export default function AssignmentManagement({ courseId, initialAssignments, sprints = [] }: AssignmentManagementProps) {
    const [assignments, setAssignments] = useState<Assignment[]>(initialAssignments)
    const [selectedSprintId, setSelectedSprintId] = useState<string | null>(null)
    const [isAdding, setIsAdding] = useState(false)
    const [loading, setLoading] = useState(false)
    const [expandedAssignmentId, setExpandedAssignmentId] = useState<string | null>(null)
    const [expandedResourcesId, setExpandedResourcesId] = useState<string | null>(null)
    
    // Form states
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [dueDate, setDueDate] = useState('')
    const [formSprintId, setFormSprintId] = useState<string>('')

    // Edit states
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editTitle, setEditTitle] = useState('')
    const [editDescription, setEditDescription] = useState('')
    const [editDueDate, setEditDueDate] = useState('')
    const [editSprintId, setEditSprintId] = useState<string>('')

    useEffect(() => {
        if (isAdding && selectedSprintId) {
            setFormSprintId(selectedSprintId)
        } else if (isAdding && !selectedSprintId) {
            setFormSprintId('')
        }
    }, [isAdding, selectedSprintId])

    const filteredAssignments = selectedSprintId 
        ? assignments.filter(a => a.sprint_id === selectedSprintId)
        : assignments.filter(a => !a.sprint_id)

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)

        try {
            const dateObj = new Date(dueDate)
            const isoDate = dateObj.toISOString()

            const result = await createAssignment(courseId, title, description, isoDate, formSprintId || null)
            
            if (result.success) {
                setTitle('')
                setDescription('')
                setDueDate('')
                setFormSprintId('')
                setIsAdding(false)
                window.location.reload()
            } else {
                alert(result.error || 'Error al crear el trabajo práctico')
            }
        } catch (error) {
            alert('Error inesperado')
        } finally {
            setLoading(false)
        }
    }

    async function handleDelete(id: string) {
        if (!confirm('¿Está seguro de eliminar este trabajo práctico?')) return

        try {
            const result = await deleteAssignment(id, courseId)
            if (result.success) {
                window.location.reload()
            } else {
                alert(result.error || 'Error al eliminar')
            }
        } catch (error) {
            alert('Error inesperado')
        }
    }

    const startEditing = (assignment: Assignment) => {
        setEditingId(assignment.id)
        setEditTitle(assignment.title)
        setEditDescription(assignment.description)
        // Convert to datetime-local format: YYYY-MM-DDThh:mm
        // Note: Using new Date(assignment.due_date) might convert to local time, which is desired for the input
        const d = new Date(assignment.due_date)
        // Adjust to local ISO string for input[type="datetime-local"]
        // The simplistic toISOString() returns UTC. We need local time string.
        const offset = d.getTimezoneOffset()
        const localDate = new Date(d.getTime() - (offset * 60 * 1000))
        const formattedDate = localDate.toISOString().slice(0, 16)
        
        setEditDueDate(formattedDate)
        setEditSprintId(assignment.sprint_id || '')
    }

    const cancelEditing = () => {
        setEditingId(null)
        setEditTitle('')
        setEditDescription('')
        setEditDueDate('')
        setEditSprintId('')
    }

    async function handleUpdate(e: React.FormEvent) {
        e.preventDefault()
        if (!editingId) return
        
        setLoading(true)
        try {
             if (!editDueDate) throw new Error('La fecha de entrega es requerida')
             
             const dateObj = new Date(editDueDate)
             if (isNaN(dateObj.getTime())) throw new Error('Fecha inválida')
             
             const isoDate = dateObj.toISOString()

             const result = await updateAssignment(editingId, editTitle, editDescription, isoDate, editSprintId || null)
             
             if (result.success) {
                 cancelEditing()
                 window.location.reload()
             } else {
                 alert(result.error || 'Error al actualizar el trabajo práctico')
             }
        } catch (error) {
            console.error(error)
            alert('Error: ' + (error instanceof Error ? error.message : 'Error desconocido'))
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-200">Trabajos Prácticos</h2>
                <button 
                    onClick={() => setIsAdding(true)}
                    className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition-colors text-sm font-medium"
                >
                    + Nuevo TP
                </button>
            </div>

            {/* Sprint Tabs */}
            {sprints.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-4 border-b border-neutral-800 scrollbar-thin scrollbar-thumb-neutral-700">
                    <button
                        onClick={() => setSelectedSprintId(null)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                            selectedSprintId === null
                                ? 'bg-indigo-600 text-white'
                                : 'bg-neutral-900 text-gray-400 hover:text-gray-200 hover:bg-neutral-800'
                        }`}
                    >
                        General
                    </button>
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

            {isAdding && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-lg w-full max-w-md">
                        <h3 className="text-xl font-bold text-gray-100 mb-4">Crear Trabajo Práctico</h3>
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
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Descripción / Consigna</label>
                                <textarea 
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full bg-black border border-neutral-700 rounded p-2 text-gray-100 focus:border-indigo-500 focus:outline-none h-32 resize-none"
                                />
                            </div>
                            {sprints.length > 0 && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Sprint (Opcional)</label>
                                    <select
                                        value={formSprintId}
                                        onChange={(e) => setFormSprintId(e.target.value)}
                                        className="w-full bg-black border border-neutral-700 rounded p-2 text-gray-100 focus:border-indigo-500 focus:outline-none"
                                    >
                                        <option value="">General (Sin Sprint)</option>
                                        {sprints.map(sprint => (
                                            <option key={sprint.id} value={sprint.id}>
                                                {sprint.title}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Fecha de Entrega</label>
                                <input 
                                    type="datetime-local" 
                                    required
                                    value={dueDate}
                                    onChange={(e) => setDueDate(e.target.value)}
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
                                    {loading ? 'Guardando...' : 'Crear TP'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="grid gap-4">
                {filteredAssignments.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 bg-neutral-900/50 rounded-lg border border-neutral-800/50">
                        {selectedSprintId 
                            ? 'No hay trabajos prácticos en este sprint.' 
                            : 'No hay trabajos prácticos generales.'}
                    </div>
                ) : (
                    filteredAssignments.map((item) => {
                        if (editingId === item.id) {
                            return (
                                <div key={item.id} className="bg-neutral-900 border border-neutral-800 p-6 rounded-lg">
                                    <h3 className="text-xl font-bold text-gray-100 mb-4">Editar Trabajo Práctico</h3>
                                    <form onSubmit={handleUpdate} className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-400 mb-1">Título</label>
                                            <input 
                                                type="text" 
                                                required
                                                value={editTitle}
                                                onChange={(e) => setEditTitle(e.target.value)}
                                                className="w-full bg-black border border-neutral-700 rounded p-2 text-gray-100 focus:border-indigo-500 focus:outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-400 mb-1">Descripción / Consigna</label>
                                            <textarea 
                                                value={editDescription}
                                                onChange={(e) => setEditDescription(e.target.value)}
                                                className="w-full bg-black border border-neutral-700 rounded p-2 text-gray-100 focus:border-indigo-500 focus:outline-none h-32 resize-none"
                                            />
                                        </div>
                                        {sprints.length > 0 && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-400 mb-1">Sprint (Opcional)</label>
                                                <select
                                                    value={editSprintId}
                                                    onChange={(e) => setEditSprintId(e.target.value)}
                                                    className="w-full bg-black border border-neutral-700 rounded p-2 text-gray-100 focus:border-indigo-500 focus:outline-none"
                                                >
                                                    <option value="">General (Sin Sprint)</option>
                                                    {sprints.map(sprint => (
                                                        <option key={sprint.id} value={sprint.id}>
                                                            {sprint.title}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-400 mb-1">Fecha de Entrega</label>
                                            <input 
                                                type="datetime-local" 
                                                required
                                                value={editDueDate}
                                                onChange={(e) => setEditDueDate(e.target.value)}
                                                className="w-full bg-black border border-neutral-700 rounded p-2 text-gray-100 focus:border-indigo-500 focus:outline-none [color-scheme:dark]"
                                            />
                                        </div>
                                        
                                        <div className="flex justify-end gap-3 mt-6">
                                            <button 
                                                type="button"
                                                onClick={cancelEditing}
                                                className="text-gray-400 hover:text-white px-3 py-2"
                                            >
                                                Cancelar
                                            </button>
                                            <button 
                                                type="submit"
                                                disabled={loading}
                                                className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
                                            >
                                                {loading ? 'Guardando...' : 'Guardar Cambios'}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            )
                        }

                        return (
                        <div 
                            key={item.id} 
                            className="bg-neutral-900 border border-neutral-800 p-4 rounded-lg hover:border-neutral-700 transition-colors flex flex-col group"
                        >
                            <div className="flex justify-between items-start w-full">
                                <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                        <h3 className="text-lg font-bold text-gray-100">{item.title}</h3>
                                        <span className="text-xs text-indigo-400 bg-indigo-900/20 px-2 py-1 rounded border border-indigo-900/50">
                                            Vence: {new Date(item.due_date).toLocaleString()}
                                        </span>
                                    </div>
                                    <p className="text-gray-400 text-sm mt-2 whitespace-pre-wrap">{item.description}</p>
                                    
                                    <div className="mt-4 pt-4 border-t border-neutral-800 flex gap-4">
                                        <button 
                                            onClick={() => setExpandedAssignmentId(expandedAssignmentId === item.id ? null : item.id)}
                                            className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1"
                                        >
                                            {expandedAssignmentId === item.id ? 'Ocultar Entregas' : 'Ver Entregas'}
                                        </button>
                                        <button 
                                            onClick={() => setExpandedResourcesId(expandedResourcesId === item.id ? null : item.id)}
                                            className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1"
                                        >
                                            {expandedResourcesId === item.id ? 'Ocultar Recursos' : 'Gestionar Recursos'}
                                        </button>
                                    </div>
                                </div>
                                
                                <div className="flex flex-col gap-2 ml-4">
                                    <button 
                                        onClick={() => startEditing(item)}
                                        className="text-gray-400 hover:text-indigo-400 text-sm px-3 py-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        Editar
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(item.id)}
                                        className="text-red-500 hover:text-red-400 text-sm px-3 py-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        Eliminar
                                    </button>
                                </div>
                            </div>

                            {expandedResourcesId === item.id && (
                                <div className="mb-4">
                                    <AssignmentResourceList assignmentId={item.id} />
                                </div>
                            )}

                            {expandedAssignmentId === item.id && (
                                <SubmissionList assignmentId={item.id} />
                            )}
                        </div>
                    )})
                )}
            </div>
        </div>
    )
}
