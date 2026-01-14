'use client'

import { useState, useEffect } from 'react'
import { getClassResources, createResource, deleteResource, getSignedUploadUrl, updateResource } from '@/app/actions/resources'
import { createClient } from '@/utils/supabase/client'

interface Resource {
    id: string
    title: string
    url: string
    type: string
}

interface ResourceListProps {
    classId: string
}

const resourceTypeLabels: Record<string, string> = {
    link: 'ENLACE',
    video: 'VIDEO',
    file: 'ARCHIVO',
    doc: 'ARCHIVO'
}

export default function ResourceList({ classId }: ResourceListProps) {
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

    useEffect(() => {
        loadResources()
    }, [classId])

    async function loadResources() {
        const result = await getClassResources(classId)
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
                
                // 1. Get Signed URL from server (bypassing RLS)
                const signedResult = await getSignedUploadUrl(classId, fileName)
                if (!signedResult.success || !signedResult.data) {
                    throw new Error(signedResult.error || 'No se pudo obtener URL de subida')
                }

                const { signedUrl, path, token } = signedResult.data

                // 2. Upload to Signed URL
                const { error: uploadError } = await supabase.storage
                    .from('class-resources')
                    .uploadToSignedUrl(path, token, file)

                if (uploadError) throw uploadError

                // 3. Get Public URL
                const { data: { publicUrl } } = supabase.storage
                    .from('class-resources')
                    .getPublicUrl(path)
                
                finalUrl = publicUrl
                finalType = 'doc' // Default to doc for uploads
            }

            const result = await createResource(classId, title, finalUrl, finalType)
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
        const result = await deleteResource(id)
        if (result.success) {
            loadResources()
        }
    }

    const startEditing = (res: Resource) => {
        setEditingId(res.id)
        setEditTitle(res.title)
        setEditUrl(res.url)
        setEditType(res.type)
    }

    const cancelEditing = () => {
        setEditingId(null)
        setEditTitle('')
        setEditUrl('')
        setEditType('link')
    }

    async function handleUpdate(e: React.FormEvent) {
        e.preventDefault()
        if (!editingId || !editTitle || !editUrl) return

        const result = await updateResource(editingId, editTitle, editUrl, editType)
        if (result.success) {
            cancelEditing()
            loadResources()
        } else {
            alert(result.error || 'Error al actualizar el recurso')
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
                {resources.map(res => {
                    if (editingId === res.id) {
                        return (
                            <form key={res.id} onSubmit={handleUpdate} className="bg-neutral-950 p-2 rounded border border-neutral-800 space-y-2">
                                <input 
                                    type="text" 
                                    placeholder="Título del recurso"
                                    className="w-full bg-black border border-neutral-700 rounded p-1 text-sm text-gray-200"
                                    value={editTitle}
                                    onChange={e => setEditTitle(e.target.value)}
                                    required
                                />
                                <div className="flex gap-2">
                                    <input 
                                        type="text" 
                                        placeholder="URL"
                                        className="flex-1 bg-black border border-neutral-700 rounded p-1 text-sm text-gray-200"
                                        value={editUrl}
                                        onChange={e => setEditUrl(e.target.value)}
                                        required
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
                                <div className="flex justify-end gap-2">
                                    <button 
                                        type="button"
                                        onClick={cancelEditing}
                                        className="text-xs text-gray-400 hover:text-white px-2 py-1"
                                    >
                                        Cancelar
                                    </button>
                                    <button 
                                        type="submit"
                                        className="bg-indigo-600 text-white text-xs px-3 py-1 rounded hover:bg-indigo-700"
                                    >
                                        Guardar
                                    </button>
                                </div>
                            </form>
                        )
                    }

                    return (
                        <div key={res.id} className="flex justify-between items-center group/res bg-black/30 p-2 rounded hover:bg-black/50 transition-colors">
                            <a href={res.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 overflow-hidden flex-1">
                                <span className="text-xs bg-neutral-800 text-gray-400 px-1 rounded uppercase tracking-wider scale-90 origin-left">
                                    {resourceTypeLabels[res.type] || res.type}
                                </span>
                                <span className="text-sm text-indigo-400 hover:underline truncate">
                                    {res.title}
                                </span>
                            </a>
                            <div className="flex gap-2 opacity-0 group-hover/res:opacity-100 transition-all">
                                <button 
                                    onClick={() => startEditing(res)}
                                    className="text-gray-400 hover:text-indigo-400 text-xs px-1"
                                    title="Editar"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                                </button>
                                <button 
                                    onClick={() => handleDelete(res.id)}
                                    className="text-red-900 hover:text-red-500 text-xs px-1"
                                    title="Eliminar"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                                </button>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
