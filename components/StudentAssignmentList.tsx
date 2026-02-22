'use client'

import { useState, useEffect } from 'react'
import { submitAssignment, getAssignmentResources } from '@/app/actions/assignments'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'

interface Assignment {
    id: string
    title: string
    description: string
    due_date: string
}

interface Submission {
    id: string
    assignment_id: string
    content: string
    file_url: string
    grade: string
    feedback: string
    submitted_at: string
}

interface Resource {
    id: string
    title: string
    url: string
    type: string
}

interface StudentAssignmentListProps {
    courseId: string
    assignments: Assignment[]
    initialSubmissions: Submission[]
    hasSprints?: boolean
}

export default function StudentAssignmentList({ courseId, assignments, initialSubmissions, hasSprints = false }: StudentAssignmentListProps) {
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [submissions, setSubmissions] = useState<Submission[]>(initialSubmissions)
    
    return (
        <div className="space-y-4">
            {assignments.length === 0 ? (
                <div className="text-center py-12 text-gray-500 bg-neutral-900/50 rounded-lg border border-neutral-800/50">
                    No hay trabajos prácticos asignados.
                </div>
            ) : (
                assignments.map(assignment => {
                    const submission = submissions.find(s => s.assignment_id === assignment.id)
                    return (
                        <AssignmentItem 
                            key={assignment.id} 
                            courseId={courseId}
                            assignment={assignment} 
                            submission={submission}
                            isExpanded={expandedId === assignment.id}
                            onToggle={() => setExpandedId(expandedId === assignment.id ? null : assignment.id)}
                            onSubmitted={(sub) => {
                                setSubmissions(prev => {
                                    const filtered = prev.filter(p => p.assignment_id !== sub.assignment_id)
                                    return [...filtered, sub]
                                })
                            }}
                            hasSprints={hasSprints}
                        />
                    )
                })
            )}
        </div>
    )
}

function AssignmentItem({ 
    courseId, 
    assignment, 
    submission, 
    isExpanded, 
    onToggle,
    onSubmitted,
    hasSprints
}: { 
    courseId: string
    assignment: Assignment
    submission?: Submission
    isExpanded: boolean
    onToggle: () => void
    onSubmitted: (sub: Submission) => void
    hasSprints: boolean
}) {
    const [resources, setResources] = useState<Resource[]>([])
    const [loadingResources, setLoadingResources] = useState(false)
    const [content, setContent] = useState(submission?.content || '')
    const [file, setFile] = useState<File | null>(null)
    const [urlInput, setUrlInput] = useState(submission?.file_url || '')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isEditing, setIsEditing] = useState(false)

    useEffect(() => {
        if (isExpanded) {
            loadResources()
        }
    }, [isExpanded])

    async function loadResources() {
        setLoadingResources(true)
        const res = await getAssignmentResources(assignment.id)
        if (res.success && res.data) {
            setResources(res.data)
        }
        setLoadingResources(false)
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setIsSubmitting(true)

        try {
            let fileUrl = submission?.file_url || ''

            if (hasSprints) {
                // If sprints enabled, use URL input directly
                if (!urlInput.trim()) throw new Error('Debes ingresar una URL válida')
                fileUrl = urlInput.trim()
            } else {
                // Original file upload logic
                if (file) {
                    const supabase = createClient()
                    const { data: { user } } = await supabase.auth.getUser()
                    if (!user || !user.email) throw new Error('Usuario no identificado')

                    const fileExt = file.name.split('.').pop()
                    // Sanitize email and title for filename (alphanumeric, dots, dashes, underscores)
                    const safeEmail = user.email.replace(/[^a-z0-9@._-]/gi, '_')
                    const safeTitle = assignment.title.replace(/[^a-z0-9_-]/gi, '_')
                    const fileName = `${safeEmail}_${safeTitle}.${fileExt}`
                    const filePath = `${courseId}/${assignment.id}/${user.email}/${fileName}`

                    const { error: uploadError } = await supabase.storage
                        .from('assignment-submissions')
                        .upload(filePath, file)

                    if (uploadError) throw uploadError

                    const { data: { publicUrl } } = supabase.storage
                        .from('assignment-submissions')
                        .getPublicUrl(filePath)
                    
                    fileUrl = publicUrl
                }
            }

            const result = await submitAssignment(assignment.id, content, fileUrl)
            
            if (result.success) {
                setIsEditing(false)
                // Mock update local state
                onSubmitted({
                    id: submission?.id || 'temp',
                    assignment_id: assignment.id,
                    content,
                    file_url: fileUrl,
                    grade: submission?.grade || '',
                    feedback: submission?.feedback || '',
                    submitted_at: new Date().toISOString()
                })
            } else {
                alert('Error al entregar: ' + result.error)
            }
        } catch (error) {
            console.error(error)
            alert(error instanceof Error ? error.message : 'Error al subir entrega')
        } finally {
            setIsSubmitting(false)
        }
    }

    const isLate = new Date() > new Date(assignment.due_date)
    
    let status = 'Pendiente'
    if (submission) {
        status = hasSprints ? 'Entregado' : (submission.grade ? 'Calificado' : 'Entregado')
    } else {
        if (!hasSprints && isLate) {
            status = 'Vencido'
        }
    }
    
    const statusColor = {
        'Calificado': 'bg-green-900/30 text-green-400 border-green-900',
        'Entregado': 'bg-indigo-900/30 text-indigo-400 border-indigo-900',
        'Vencido': 'bg-red-900/30 text-red-400 border-red-900',
        'Pendiente': 'bg-gray-800 text-gray-400 border-gray-700'
    }[status]

    return (
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
            <div 
                onClick={onToggle}
                className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between cursor-pointer hover:bg-neutral-800/50 transition-colors gap-3 md:gap-0"
            >
                <div className="w-full md:w-auto">
                    <h3 className="text-lg font-bold text-gray-100">{assignment.title}</h3>
                    <div className="flex flex-wrap gap-2 text-xs mt-1">
                        <span className="text-gray-500">Vence: {new Date(assignment.due_date).toLocaleString()}</span>
                        {isLate && !submission && <span className="text-red-500 font-bold">¡Vencido!</span>}
                    </div>
                </div>
                <div className={`px-3 py-1 rounded text-xs border self-start md:self-auto ${statusColor}`}>
                    {status} {submission?.grade && !hasSprints && `(${submission.grade})`}
                </div>
            </div>

            {isExpanded && (
                <div className="p-4 border-t border-neutral-800 bg-black/20">
                    <p className="text-gray-300 text-sm whitespace-pre-wrap mb-4">{assignment.description}</p>

                    {hasSprints && (
                        <div className="mb-6">
                            <Link
                                href={`/student/courses/${courseId}/assignments/${assignment.id}/peer-submissions`}
                                className="flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 hover:underline transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="9" cy="7" r="4"></circle>
                                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                                </svg>
                                Ver entregas de compañeros
                            </Link>
                        </div>
                    )}

                    {/* Resources */}
                    <div className="mb-6">
                        <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Recursos Adjuntos</h4>
                        {loadingResources ? (
                            <div className="text-xs text-gray-600">Cargando...</div>
                        ) : resources.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {resources.map(res => (
                                    <a 
                                        key={res.id} 
                                        href={res.url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-indigo-400 text-xs px-3 py-2 rounded flex items-center gap-2 transition-colors"
                                    >
                                        <span className="uppercase text-[10px] text-gray-500">{res.type}</span>
                                        {res.title}
                                    </a>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-gray-600 italic">No hay recursos adjuntos.</p>
                        )}
                    </div>

                    {/* Submission Form / Details */}
                    <div className="bg-neutral-950 border border-neutral-800 rounded p-4">
                        <h4 className="text-sm font-semibold text-gray-300 mb-3">Tu Entrega</h4>
                        
                        {submission?.grade && !hasSprints ? (
                            <div className="mb-4 bg-green-900/10 border border-green-900/30 p-3 rounded">
                                <p className="text-sm text-green-400 font-bold mb-1">Nota: {submission.grade}</p>
                                {submission.feedback && (
                                    <p className="text-sm text-gray-300">Devolución: {submission.feedback}</p>
                                )}
                            </div>
                        ) : null}

                        {(!submission || isEditing) ? (
                            <form onSubmit={handleSubmit} className="space-y-3">
                                {!hasSprints && (
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Comentario / Respuesta (Texto)</label>
                                        <textarea 
                                            className="w-full bg-black border border-neutral-700 rounded p-2 text-sm text-gray-200 h-24 focus:border-indigo-500 outline-none"
                                            value={content}
                                            onChange={e => setContent(e.target.value)}
                                            placeholder="Escribe aquí tu respuesta..."
                                            disabled={!hasSprints && !!submission?.grade}
                                        />
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">
                                        {hasSprints ? 'URL del Repositorio' : 'Archivo Adjunto'}
                                    </label>
                                    {submission?.file_url && (
                                        <div className="mb-2">
                                            <a href={submission.file_url} target="_blank" className="text-indigo-400 text-sm hover:underline">
                                                Ver {hasSprints ? 'repositorio' : 'archivo'} entregado actualmente
                                            </a>
                                        </div>
                                    )}
                                    {(hasSprints || !submission?.grade) && (
                                        hasSprints ? (
                                            <input
                                                type="url"
                                                value={urlInput}
                                                onChange={e => setUrlInput(e.target.value)}
                                                placeholder="https://..."
                                                className="w-full bg-black border border-neutral-700 rounded p-2 text-sm text-gray-200 focus:border-indigo-500 outline-none"
                                                required
                                            />
                                        ) : (
                                            <input 
                                                type="file" 
                                                onChange={e => setFile(e.target.files?.[0] || null)}
                                                className="block w-full text-sm text-gray-400
                                                    file:mr-4 file:py-2 file:px-4
                                                    file:rounded file:border-0
                                                    file:text-xs file:font-semibold
                                                    file:bg-neutral-800 file:text-indigo-400
                                                    hover:file:bg-neutral-700"
                                            />
                                        )
                                    )}
                                </div>

                                {!submission?.grade && (
                                    <div className="flex gap-2">
                                        <button 
                                            type="submit" 
                                            disabled={isSubmitting}
                                            className="bg-indigo-600 text-white text-sm px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50 w-full sm:w-auto"
                                        >
                                            {isSubmitting ? 'Enviando...' : (submission ? 'Actualizar Entrega' : 'Entregar')}
                                        </button>
                                        {submission && (
                                            <button 
                                                type="button" 
                                                onClick={() => setIsEditing(false)}
                                                className="bg-neutral-800 text-white text-sm px-4 py-2 rounded hover:bg-neutral-700 w-full sm:w-auto border border-neutral-700"
                                            >
                                                Cancelar
                                            </button>
                                        )}
                                    </div>
                                )}
                            </form>
                        ) : (
                            <div className="space-y-4">
                                {submission.content && (
                                    <div>
                                        <h5 className="text-xs text-gray-500 mb-1">Comentario / Respuesta</h5>
                                        <p className="text-sm text-gray-300 whitespace-pre-wrap bg-black/50 p-3 rounded border border-neutral-800">{submission.content}</p>
                                    </div>
                                )}

                                {submission.file_url && (
                                    <div>
                                        <h5 className="text-xs text-gray-500 mb-1">{hasSprints ? 'URL del Repositorio' : 'Archivo Adjunto'}</h5>
                                        <a 
                                            href={submission.file_url} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="text-indigo-400 text-sm hover:underline inline-flex items-center gap-1"
                                        >
                                            Ver {hasSprints ? 'repositorio' : 'archivo'} entregado
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                        </a>
                                    </div>
                                )}

                                {!submission.grade && (
                                    <button 
                                        onClick={() => setIsEditing(true)}
                                        className="bg-neutral-800 text-white text-sm px-4 py-2 rounded hover:bg-neutral-700 border border-neutral-700 transition-colors"
                                    >
                                        Modificar Entrega
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
