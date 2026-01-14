'use client'

import { useState, useEffect } from 'react'
import { getAssignmentResources, createAssignmentResource, deleteAssignmentResource, updateAssignmentResource } from '@/app/actions/assignments'
import { createClient } from '@/utils/supabase/client'

interface Resource {
    id: string
    title: string
    url: string
    type: string
}

interface AssignmentResourceListProps {
    assignmentId: string
}

const resourceTypeLabels: Record<string, string> = {
    link: 'ENLACE',
    video: 'VIDEO',
    file: 'ARCHIVO',
    doc: 'ARCHIVO'
}

export default function AssignmentResourceList({ assignmentId }: AssignmentResourceListProps) {
    const [resources, setResources] = useState<Resource[]>([])
    const [loading, setLoading] = useState(true)
    const [isAdding, setIsAdding] = useState(false)
    
    // Form
    const [title, setTitle] = useState('')
    const [url, setUrl] = useState('')
    const [type, setType] = useState('link')
    
    // Upload logic
    const [mode, setMode] = useState<'url' | 'file'>('url')
    const [file, setFile] = useState<File | null>(null)
    const [isUploading, setIsUploading] = useState(false)

    // Editing logic
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editTitle, setEditTitle] = useState('')
    const [editUrl, setEditUrl] = useState('')
    const [editType, setEditType] = useState('link')
    const [editMode, setEditMode] = useState<'url' | 'file'>('url')
    const [editFile, setEditFile] = useState<File | null>(null)
    const [isUpdating, setIsUpdating] = useState(false)

    useEffect(() => {
        loadResources()
    }, [assignmentId])

    async function loadResources() {
        const result = await getAssignmentResources(assignmentId)
        if (result.success && result.data) {
            setResources(result.data)
        }
        setLoading(false)
    }

    async function handleAdd(e: React.FormEvent) {
        e.preventDefault()
        if (!title) return
        if (mode === 'url' && !url) return
        if (mode === 'file' && !file) return

        setIsUploading(true)
        let finalUrl = url
        let finalType = type

        try {
            if (mode === 'file' && file) {
                const supabase = createClient()
                const fileExt = file.name.split('.').pop()
                const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
                const filePath = `${assignmentId}/${fileName}`

                const { error: uploadError } = await supabase.storage
                    .from('class-resources')
                    .upload(filePath, file)

                if (uploadError) throw uploadError

                const { data: { publicUrl } } = supabase.storage
                    .from('class-resources')
                    .getPublicUrl(filePath)
                
                finalUrl = publicUrl
                finalType = 'doc' // Default to doc for uploads
            }

            const result = await createAssignmentResource(assignmentId, title, finalUrl, finalType)
            if (result.success) {
                setTitle('')
                setUrl('')
                setFile(null)
                setIsAdding(false)
                loadResources() // Reload list
            } else {
                alert('Error al crear recurso')
            }
        } catch (error) {
            console.error(error)
            alert('Error al subir el recurso: ' + (error as Error).message)
        } finally {
            setIsUploading(false)
        }
    }

    const startEditing = (resource: Resource) => {
        setEditingId(resource.id)
        setEditTitle(resource.title)
        setEditUrl(resource.url)
        setEditType(resource.type)
        // Check if url is likely a file upload (contains storage/v1/object/public) to set mode
        // But simplified: user can choose to replace with URL or new File
        setEditMode('url') 
        setEditFile(null)
    }

    const cancelEditing = () => {
        setEditingId(null)
        setEditTitle('')
        setEditUrl('')
        setEditType('link')
        setEditFile(null)
    }

    async function handleUpdate(e: React.FormEvent) {
        e.preventDefault()
        if (!editingId) return
        
        setIsUpdating(true)
        let finalUrl = editUrl
        let finalType = editType

        try {
            if (editMode === 'file' && editFile) {
                const supabase = createClient()
                const fileExt = editFile.name.split('.').pop()
                const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
                const filePath = `${assignmentId}/${fileName}`

                const { error: uploadError } = await supabase.storage
                    .from('class-resources')
                    .upload(filePath, editFile)

                if (uploadError) throw uploadError

                const { data: { publicUrl } } = supabase.storage
                    .from('class-resources')
                    .getPublicUrl(filePath)
                
                finalUrl = publicUrl
                finalType = 'doc'
            }

            const result = await updateAssignmentResource(editingId, editTitle, finalUrl, finalType)

            if (result.success) {
                cancelEditing()
                loadResources()
            } else {
                alert(result.error || 'Error al actualizar recurso')
            }
        } catch (error) {
            console.error(error)
            alert('Error inesperado al actualizar')
        } finally {
            setIsUpdating(false)
        }
    }

    async function handleDelete(id: string) {
        if (!confirm('¿Eliminar este recurso?')) return
        const result = await deleteAssignmentResource(id)
        if (result.success) {
            loadResources()
        }
    }

    if (loading) return <div className="text-xs text-gray-500">Cargando recursos...</div>

    return (
        <div className="mt-4 pt-4 border-t border-neutral-800">
            <div className="flex justify-between items-center mb-3">
                <h4 className="text-sm font-semibold text-gray-300">Recursos ({resources.length})</h4>
                <button 
                    onClick={() => setIsAdding(!isAdding)}
                    className="text-xs text-indigo-400 hover:text-indigo-300 hover:underline"
                >
                    {isAdding ? 'Cancelar' : '+ Agregar Recurso'}
                </button>
            </div>

            {isAdding && (
                <form onSubmit={handleAdd} className="bg-neutral-950 p-3 rounded border border-neutral-800 mb-3 space-y-2">
                    <input 
                        type="text" 
                        placeholder="Título del recurso"
                        className="w-full bg-black border border-neutral-700 rounded p-1 text-sm text-gray-200"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        required
                    />
                    
                    <div className="flex gap-2 mb-2">
                        <button
                            type="button"
                            onClick={() => setMode('url')}
                            className={`flex-1 text-xs py-1 rounded ${mode === 'url' ? 'bg-indigo-900 text-white' : 'bg-neutral-900 text-gray-400'}`}
                        >
                            Enlace Externo
                        </button>
                        <button
                            type="button"
                            onClick={() => setMode('file')}
                            className={`flex-1 text-xs py-1 rounded ${mode === 'file' ? 'bg-indigo-900 text-white' : 'bg-neutral-900 text-gray-400'}`}
                        >
                            Subir Archivo
                        </button>
                    </div>

                    {mode === 'url' ? (
                        <div className="flex gap-2">
                            <input 
                                key="url-input"
                                type="url" 
                                placeholder="URL (https://...)"
                                className="flex-1 bg-black border border-neutral-700 rounded p-1 text-sm text-gray-200"
                                value={url || ''}
                                onChange={e => setUrl(e.target.value)}
                                required={mode === 'url'}
                            />
                            <select 
                                className="bg-black border border-neutral-700 rounded p-1 text-sm text-gray-200 w-24"
                                value={type}
                                onChange={e => setType(e.target.value)}
                            >
                                <option value="link">ENLACE</option>
                                <option value="video">VIDEO</option>
                                <option value="doc">ARCHIVO</option>
                            </select>
                        </div>
                    ) : (
                        <div className="flex gap-2">
                            <input 
                                key="file-input"
                                type="file" 
                                className="flex-1 bg-black border border-neutral-700 rounded p-1 text-sm text-gray-200 file:bg-neutral-800 file:text-gray-300 file:border-0 file:rounded file:px-2 file:py-1 file:mr-2 file:text-xs"
                                onChange={e => setFile(e.target.files?.[0] || null)}
                                required={mode === 'file'}
                            />
                        </div>
                    )}

                    <button 
                        type="submit"
                        disabled={isUploading}
                        className="w-full bg-indigo-900/50 hover:bg-indigo-900 text-indigo-200 text-xs py-1 rounded transition-colors disabled:opacity-50"
                    >
                        {isUploading ? 'Subiendo...' : 'Guardar Recurso'}
                    </button>
                </form>
            )}

            <div className="space-y-2">
                {resources.length === 0 && !isAdding && (
                    <p className="text-xs text-gray-600 italic">No hay recursos asignados.</p>
                )}
                {resources.map(res => (
                    <div key={res.id} className="bg-black/30 p-2 rounded hover:bg-black/50 transition-colors">
                        {editingId === res.id ? (
                             <form onSubmit={handleUpdate} className="space-y-2">
                                <input 
                                    type="text" 
                                    placeholder="Título del recurso"
                                    className="w-full bg-black border border-neutral-700 rounded p-1 text-sm text-gray-200"
                                    value={editTitle}
                                    onChange={e => setEditTitle(e.target.value)}
                                    required
                                />
                                
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setEditMode('url')}
                                        className={`flex-1 text-xs py-1 rounded ${editMode === 'url' ? 'bg-indigo-900 text-white' : 'bg-neutral-900 text-gray-400'}`}
                                    >
                                        Enlace Externo
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setEditMode('file')}
                                        className={`flex-1 text-xs py-1 rounded ${editMode === 'file' ? 'bg-indigo-900 text-white' : 'bg-neutral-900 text-gray-400'}`}
                                    >
                                        Subir Archivo
                                    </button>
                                </div>

                                {editMode === 'url' ? (
                                    <div className="flex gap-2">
                                        <input 
                                            type="url" 
                                            placeholder="URL (https://...)"
                                            className="flex-1 bg-black border border-neutral-700 rounded p-1 text-sm text-gray-200"
                                            value={editUrl || ''}
                                            onChange={e => setEditUrl(e.target.value)}
                                            required={editMode === 'url'}
                                        />
                                        <select 
                                            className="bg-black border border-neutral-700 rounded p-1 text-sm text-gray-200 w-24"
                                            value={editType}
                                            onChange={e => setEditType(e.target.value)}
                                        >
                                            <option value="link">ENLACE</option>
                                            <option value="video">VIDEO</option>
                                            <option value="doc">ARCHIVO</option>
                                        </select>
                                    </div>
                                ) : (
                                    <div className="flex gap-2">
                                        <input 
                                            type="file" 
                                            className="flex-1 bg-black border border-neutral-700 rounded p-1 text-sm text-gray-200 file:bg-neutral-800 file:text-gray-300 file:border-0 file:rounded file:px-2 file:py-1 file:mr-2 file:text-xs"
                                            onChange={e => setEditFile(e.target.files?.[0] || null)}
                                            required={editMode === 'file'}
                                        />
                                    </div>
                                )}

                                <div className="flex gap-2 justify-end">
                                    <button 
                                        type="button"
                                        onClick={cancelEditing}
                                        className="text-xs text-gray-400 hover:text-white px-2 py-1"
                                    >
                                        Cancelar
                                    </button>
                                    <button 
                                        type="submit"
                                        disabled={isUpdating}
                                        className="bg-indigo-900/50 hover:bg-indigo-900 text-indigo-200 text-xs px-3 py-1 rounded transition-colors disabled:opacity-50"
                                    >
                                        {isUpdating ? 'Guardando...' : 'Guardar Cambios'}
                                    </button>
                                </div>
                             </form>
                        ) : (
                            <div className="flex justify-between items-center group/res">
                                <a href={res.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 overflow-hidden flex-1">
                                    <span className="text-xs bg-neutral-800 text-gray-400 px-1 rounded uppercase tracking-wider scale-90 origin-left">
                                        {resourceTypeLabels[res.type] || res.type}
                                    </span>
                                    <span className="text-sm text-indigo-400 hover:underline truncate">
                                        {res.title}
                                    </span>
                                </a>
                                <div className="flex gap-2 opacity-0 group-hover/res:opacity-100 transition-opacity">
                                    <button 
                                        onClick={() => startEditing(res)}
                                        className="text-xs text-blue-400 hover:text-blue-300"
                                    >
                                        Editar
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(res.id)}
                                        className="text-xs text-red-900 hover:text-red-500"
                                    >
                                        Eliminar
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}
