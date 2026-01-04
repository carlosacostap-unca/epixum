'use client'

import { useState, useEffect } from 'react'
import { getAssignmentResources, createAssignmentResource, deleteAssignmentResource } from '@/app/actions/assignments'
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
                                <option value="link">Link</option>
                                <option value="video">Video</option>
                                <option value="doc">Doc</option>
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
                    <div key={res.id} className="flex justify-between items-center group/res bg-black/30 p-2 rounded hover:bg-black/50 transition-colors">
                        <a href={res.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 overflow-hidden">
                            <span className="text-xs bg-neutral-800 text-gray-400 px-1 rounded uppercase tracking-wider scale-90 origin-left">
                                {res.type}
                            </span>
                            <span className="text-sm text-indigo-400 hover:underline truncate">
                                {res.title}
                            </span>
                        </a>
                        <button 
                            onClick={() => handleDelete(res.id)}
                            className="text-xs text-red-900 hover:text-red-500 opacity-0 group-hover/res:opacity-100 transition-opacity"
                        >
                            Eliminar
                        </button>
                    </div>
                ))}
            </div>
        </div>
    )
}
