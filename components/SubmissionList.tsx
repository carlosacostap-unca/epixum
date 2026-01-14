'use client'

import { useState, useEffect } from 'react'
import { getAssignmentSubmissions, updateSubmissionGrade, deleteSubmission, updateSubmissionContent } from '@/app/actions/assignments'
import { createClient } from '@/utils/supabase/client'

interface Submission {
    id: string
    student_email: string
    content: string
    file_url: string | null
    grade: string | null
    feedback: string | null
    submitted_at: string
}

interface SubmissionListProps {
    assignmentId: string
    courseId: string
}

export default function SubmissionList({ assignmentId, courseId }: SubmissionListProps) {
    const [submissions, setSubmissions] = useState<Submission[]>([])
    const [loading, setLoading] = useState(true)
    const [editingId, setEditingId] = useState<string | null>(null) // For grading
    const [tempGrade, setTempGrade] = useState('')
    
    // For editing submission content/file
    const [editingContentId, setEditingContentId] = useState<string | null>(null)
    const [editContent, setEditContent] = useState('')
    const [editFile, setEditFile] = useState<File | null>(null)
    const [isUpdating, setIsUpdating] = useState(false)

    useEffect(() => {
        loadSubmissions()
    }, [assignmentId])

    async function loadSubmissions() {
        const result = await getAssignmentSubmissions(assignmentId)
        if (result.success && result.data) {
            setSubmissions(result.data)
        }
        setLoading(false)
    }

    async function handleGradeUpdate(submissionId: string) {
        if (!tempGrade.trim()) return
        const result = await updateSubmissionGrade(submissionId, tempGrade)
        if (result.success) {
            setSubmissions(prev => prev.map(s => s.id === submissionId ? { ...s, grade: tempGrade } : s))
            setEditingId(null)
            setTempGrade('')
        } else {
            alert('Error al actualizar nota')
        }
    }

    async function handleDelete(submissionId: string) {
        if (!confirm('¿Estás seguro de eliminar esta entrega? Esta acción no se puede deshacer y borrará el archivo asociado.')) return

        const result = await deleteSubmission(submissionId)
        if (result.success) {
            setSubmissions(prev => prev.filter(s => s.id !== submissionId))
        } else {
            alert('Error al eliminar entrega: ' + result.error)
        }
    }

    async function handleContentUpdate(submission: Submission) {
        setIsUpdating(true)
        try {
            let fileUrl = submission.file_url

            if (editFile) {
                const supabase = createClient()
                const fileExt = editFile.name.split('.').pop()
                const safeEmail = submission.student_email.replace(/[^a-z0-9@._-]/gi, '_')
                // Note: We don't have assignment title here easily, but we can use ID or fetch it. 
                // To keep it consistent with student upload, we should try to match the pattern, 
                // but using assignmentId is safer than title if title isn't available.
                // Or we can just use a generic name since we are editing.
                // Let's use assignmentId for the "title" part if we can't get the title.
                // Actually, existing files are named with title.
                // It's better to preserve the pattern: courseId/assignmentId/email/filename
                
                const fileName = `${safeEmail}_${Date.now()}.${fileExt}` // Use timestamp to avoid cache/conflict
                const filePath = `${courseId}/${assignmentId}/${submission.student_email}/${fileName}`

                const { error: uploadError } = await supabase.storage
                    .from('assignment-submissions')
                    .upload(filePath, editFile)

                if (uploadError) throw uploadError

                const { data: { publicUrl } } = supabase.storage
                    .from('assignment-submissions')
                    .getPublicUrl(filePath)
                
                fileUrl = publicUrl
            }

            const result = await updateSubmissionContent(submission.id, editContent, fileUrl)
            
            if (result.success) {
                setSubmissions(prev => prev.map(s => s.id === submission.id ? { 
                    ...s, 
                    content: editContent, 
                    file_url: fileUrl 
                } : s))
                setEditingContentId(null)
                setEditFile(null)
                setEditContent('')
            } else {
                alert('Error al actualizar entrega: ' + result.error)
            }
        } catch (error) {
            console.error(error)
            alert('Error al actualizar entrega')
        } finally {
            setIsUpdating(false)
        }
    }

    if (loading) return <div className="text-xs text-gray-500 p-4">Cargando entregas...</div>

    if (submissions.length === 0) {
        return <div className="text-xs text-gray-500 italic p-4">No hay entregas registradas.</div>
    }

    return (
        <div className="bg-neutral-950 rounded border border-neutral-800 mt-2 overflow-hidden">
            <table className="w-full text-left text-sm text-gray-400">
                <thead className="bg-neutral-900 text-gray-200 font-medium">
                    <tr>
                        <th className="p-3">Alumno</th>
                        <th className="p-3">Fecha</th>
                        <th className="p-3">Entrega</th>
                        <th className="p-3">Calificación</th>
                        <th className="p-3">Acciones</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800">
                    {submissions.map((sub) => (
                        <tr key={sub.id} className="hover:bg-neutral-900/50">
                            <td className="p-3">{sub.student_email}</td>
                            <td className="p-3">{new Date(sub.submitted_at).toLocaleString()}</td>
                            <td className="p-3">
                                {editingContentId === sub.id ? (
                                    <div className="space-y-2 min-w-[200px]">
                                        <textarea
                                            className="w-full bg-black border border-neutral-700 rounded p-1 text-xs text-gray-200 focus:border-indigo-500 outline-none"
                                            value={editContent}
                                            onChange={e => setEditContent(e.target.value)}
                                            placeholder="Contenido"
                                            rows={2}
                                        />
                                        <input 
                                            type="file" 
                                            onChange={e => setEditFile(e.target.files?.[0] || null)}
                                            className="block w-full text-xs text-gray-400"
                                        />
                                        <div className="text-[10px] text-gray-500">
                                            {sub.file_url ? 'Tiene archivo adjunto (subir otro para reemplazar)' : 'Sin archivo adjunto'}
                                        </div>
                                    </div>
                                ) : (
                                    sub.file_url ? (
                                        <a 
                                            href={sub.file_url} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="text-indigo-400 hover:underline"
                                        >
                                            Ver Archivo
                                        </a>
                                    ) : (
                                        <span className="truncate max-w-xs block" title={sub.content}>
                                            {sub.content}
                                        </span>
                                    )
                                )}
                            </td>
                            <td className="p-3">
                                {editingId === sub.id ? (
                                    <input 
                                        type="text" 
                                        className="bg-black border border-neutral-700 rounded p-1 w-20 text-xs text-white"
                                        value={tempGrade}
                                        onChange={e => setTempGrade(e.target.value)}
                                        placeholder="Nota"
                                    />
                                ) : (
                                    sub.grade ? (
                                        <span className="text-green-400 font-medium">{sub.grade}</span>
                                    ) : (
                                        <span className="text-gray-600 italic">Pendiente</span>
                                    )
                                )}
                            </td>
                            <td className="p-3">
                                <div className="flex flex-col gap-2">
                                    {/* Grade Actions */}
                                    {editingId === sub.id ? (
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => handleGradeUpdate(sub.id)}
                                                className="text-indigo-400 hover:text-indigo-300 text-xs"
                                            >
                                                Guardar Nota
                                            </button>
                                            <button 
                                                onClick={() => setEditingId(null)}
                                                className="text-gray-500 hover:text-gray-400 text-xs"
                                            >
                                                Cancelar
                                            </button>
                                        </div>
                                    ) : !editingContentId && (
                                        <button 
                                            onClick={() => {
                                                setEditingId(sub.id)
                                                setTempGrade(sub.grade || '')
                                                setEditingContentId(null)
                                            }}
                                            className="text-gray-500 hover:text-white text-xs transition-colors text-left"
                                        >
                                            Calificar
                                        </button>
                                    )}

                                    {/* Edit Content Actions */}
                                    {editingContentId === sub.id ? (
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => handleContentUpdate(sub)}
                                                disabled={isUpdating}
                                                className="text-indigo-400 hover:text-indigo-300 text-xs disabled:opacity-50"
                                            >
                                                {isUpdating ? 'Guardando...' : 'Guardar Cambios'}
                                            </button>
                                            <button 
                                                onClick={() => {
                                                    setEditingContentId(null)
                                                    setEditFile(null)
                                                    setEditContent('')
                                                }}
                                                disabled={isUpdating}
                                                className="text-gray-500 hover:text-gray-400 text-xs"
                                            >
                                                Cancelar
                                            </button>
                                        </div>
                                    ) : !editingId && (
                                        <>
                                            <button 
                                                onClick={() => {
                                                    setEditingContentId(sub.id)
                                                    setEditContent(sub.content || '')
                                                    setEditFile(null)
                                                    setEditingId(null)
                                                }}
                                                className="text-blue-500 hover:text-blue-400 text-xs transition-colors text-left"
                                            >
                                                Editar Entrega
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(sub.id)}
                                                className="text-red-500 hover:text-red-400 text-xs transition-colors text-left"
                                            >
                                                Eliminar
                                            </button>
                                        </>
                                    )}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}
