'use client'

import { useState, useEffect } from 'react'
import { submitAssignment, getAssignmentResources } from '@/app/actions/assignments'
import { createClient } from '@/utils/supabase/client'

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
}

export default function StudentAssignmentList({ courseId, assignments, initialSubmissions }: StudentAssignmentListProps) {
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
    onSubmitted 
}: { 
    courseId: string
    assignment: Assignment
    submission?: Submission
    isExpanded: boolean
    onToggle: () => void
    onSubmitted: (sub: Submission) => void
}) {
    const [resources, setResources] = useState<Resource[]>([])
    const [loadingResources, setLoadingResources] = useState(false)
    const [content, setContent] = useState(submission?.content || '')
    const [file, setFile] = useState<File | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)

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

            const result = await submitAssignment(assignment.id, content, fileUrl)
            
            if (result.success) {
                alert('Entrega realizada correctamente')
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
            alert('Error al subir entrega')
        } finally {
            setIsSubmitting(false)
        }
    }

    const isLate = new Date() > new Date(assignment.due_date)
    const status = submission 
        ? (submission.grade ? 'Calificado' : 'Entregado') 
        : (isLate ? 'Vencido' : 'Pendiente')
    
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
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-neutral-800/50 transition-colors"
            >
                <div>
                    <h3 className="text-lg font-bold text-gray-100">{assignment.title}</h3>
                    <div className="flex gap-2 text-xs mt-1">
                        <span className="text-gray-500">Vence: {new Date(assignment.due_date).toLocaleString()}</span>
                        {isLate && !submission && <span className="text-red-500 font-bold">¡Vencido!</span>}
                    </div>
                </div>
                <div className={`px-3 py-1 rounded text-xs border ${statusColor}`}>
                    {status} {submission?.grade && `(${submission.grade})`}
                </div>
            </div>

            {isExpanded && (
                <div className="p-4 border-t border-neutral-800 bg-black/20">
                    <p className="text-gray-300 text-sm whitespace-pre-wrap mb-4">{assignment.description}</p>

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
                        
                        {submission?.grade ? (
                            <div className="mb-4 bg-green-900/10 border border-green-900/30 p-3 rounded">
                                <p className="text-sm text-green-400 font-bold mb-1">Nota: {submission.grade}</p>
                                {submission.feedback && (
                                    <p className="text-sm text-gray-300">Devolución: {submission.feedback}</p>
                                )}
                            </div>
                        ) : null}

                        <form onSubmit={handleSubmit} className="space-y-3">
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Comentario / Respuesta (Texto)</label>
                                <textarea 
                                    className="w-full bg-black border border-neutral-700 rounded p-2 text-sm text-gray-200 h-24 focus:border-indigo-500 outline-none"
                                    value={content}
                                    onChange={e => setContent(e.target.value)}
                                    placeholder="Escribe aquí tu respuesta..."
                                    disabled={!!submission?.grade}
                                />
                            </div>

                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Archivo Adjunto</label>
                                {submission?.file_url && (
                                    <div className="mb-2">
                                        <a href={submission.file_url} target="_blank" className="text-indigo-400 text-sm hover:underline">
                                            Ver archivo entregado actualmente
                                        </a>
                                    </div>
                                )}
                                {!submission?.grade && (
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
                                )}
                            </div>

                            {!submission?.grade && (
                                <button 
                                    type="submit" 
                                    disabled={isSubmitting}
                                    className="bg-indigo-600 text-white text-sm px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50 w-full sm:w-auto"
                                >
                                    {isSubmitting ? 'Enviando...' : (submission ? 'Actualizar Entrega' : 'Entregar')}
                                </button>
                            )}
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
