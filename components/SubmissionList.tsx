'use client'

import { useState, useEffect } from 'react'
import { getAssignmentSubmissions, updateSubmissionGrade } from '@/app/actions/assignments'

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
}

export default function SubmissionList({ assignmentId }: SubmissionListProps) {
    const [submissions, setSubmissions] = useState<Submission[]>([])
    const [loading, setLoading] = useState(true)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [tempGrade, setTempGrade] = useState('')

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
                                {sub.file_url ? (
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
                                {editingId === sub.id ? (
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => handleGradeUpdate(sub.id)}
                                            className="text-indigo-400 hover:text-indigo-300 text-xs"
                                        >
                                            Guardar
                                        </button>
                                        <button 
                                            onClick={() => setEditingId(null)}
                                            className="text-gray-500 hover:text-gray-400 text-xs"
                                        >
                                            Cancelar
                                        </button>
                                    </div>
                                ) : (
                                    <button 
                                        onClick={() => {
                                            setEditingId(sub.id)
                                            setTempGrade(sub.grade || '')
                                        }}
                                        className="text-gray-500 hover:text-white text-xs transition-colors"
                                    >
                                        Calificar
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}
