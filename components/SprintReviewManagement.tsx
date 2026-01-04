'use client'

import { useState, useEffect } from 'react'
import { createReviewSlots, getSprintReviews, deleteSprintReview, updateReviewDetails } from '@/app/actions/sprint-reviews'

type Review = {
    id: string
    sprint_id: string
    student_email: string | null
    start_date: string
    end_date: string
    comments?: string | null
    result?: string | null
    sprints?: {
        title: string
    }
}

type Sprint = {
    id: string
    title: string
}

type Student = {
    email: string
    first_name?: string
    last_name?: string
}

export default function SprintReviewManagement({ 
    courseId, 
    sprints, 
    students 
}: { 
    courseId: string, 
    sprints: Sprint[], 
    students: Student[] 
}) {
    const [reviews, setReviews] = useState<Review[]>([])
    const [isCreating, setIsCreating] = useState(false)
    const [selectedReview, setSelectedReview] = useState<Review | null>(null)
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        loadReviews()
    }, [courseId])

    async function loadReviews() {
        const result = await getSprintReviews(courseId)
        if (result.success && result.data) {
            setReviews(result.data)
        } else if (!result.success) {
            console.error('Error fetching reviews:', result.error)
            alert('Error al cargar las revisiones: ' + result.error)
        }
    }

    async function handleCreate(formData: FormData) {
        setIsLoading(true)
        const result = await createReviewSlots(formData)
        setIsLoading(false)

        if (result.success) {
            setIsCreating(false)
            loadReviews()
        } else {
            alert(result.error)
        }
    }

    async function handleUpdate(formData: FormData) {
        if (!selectedReview) return

        setIsLoading(true)
        const studentEmail = formData.get('studentEmail') as string
        const comments = formData.get('comments') as string
        const result = formData.get('result') as string
        
        const res = await updateReviewDetails(courseId, selectedReview.id, {
            studentEmail: studentEmail || null,
            comments: comments || null,
            result: result || null
        })
        
        setIsLoading(false)
        if (res.success) {
            setSelectedReview(null)
            loadReviews()
        } else {
            alert(res.error)
        }
    }

    async function handleDelete(reviewId: string) {
        if (!confirm('¿Estás seguro de eliminar este turno de revisión?')) return

        const result = await deleteSprintReview(reviewId, courseId)
        if (result.success) {
            loadReviews()
        } else {
            alert(result.error)
        }
    }

    return (
        <div className="w-full">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-100">Revisiones de Sprints</h2>
                {!isCreating && (
                    <button 
                        onClick={() => setIsCreating(true)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                        + Nuevos Turnos
                    </button>
                )}
            </div>

            {isCreating && (
                <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6 mb-6">
                    <h3 className="text-lg font-bold text-gray-100 mb-4">Generar Turnos de Revisión</h3>
                    <form action={handleCreate} className="flex flex-col gap-4">
                        <input type="hidden" name="courseId" value={courseId} />
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-xs text-gray-500 mb-1">Sprint</label>
                                <select 
                                    name="sprintId"
                                    className="bg-neutral-950 border border-neutral-700 rounded px-3 py-2 text-sm text-white w-full focus:outline-none focus:border-indigo-500"
                                    required
                                >
                                    <option value="">Seleccionar Sprint</option>
                                    {sprints.map(s => (
                                        <option key={s.id} value={s.id}>{s.title}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Fecha y Hora de Inicio</label>
                                <input 
                                    type="datetime-local"
                                    name="startTime"
                                    className="bg-neutral-950 border border-neutral-700 rounded px-3 py-2 text-sm text-white w-full focus:outline-none focus:border-indigo-500"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">Cant. Turnos</label>
                                    <input 
                                        type="number"
                                        name="count"
                                        min="1"
                                        defaultValue="1"
                                        className="bg-neutral-950 border border-neutral-700 rounded px-3 py-2 text-sm text-white w-full focus:outline-none focus:border-indigo-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">Duración (min)</label>
                                    <input 
                                        type="number"
                                        name="duration"
                                        min="5"
                                        step="5"
                                        defaultValue="15"
                                        className="bg-neutral-950 border border-neutral-700 rounded px-3 py-2 text-sm text-white w-full focus:outline-none focus:border-indigo-500"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 mt-2">
                            <button 
                                type="button"
                                onClick={() => setIsCreating(false)}
                                className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                            >
                                Cancelar
                            </button>
                            <button 
                                type="submit"
                                disabled={isLoading}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors disabled:opacity-50"
                            >
                                {isLoading ? 'Generando...' : 'Generar Turnos'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="space-y-4">
                {reviews.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 bg-neutral-900/30 rounded-lg border border-neutral-800 border-dashed">
                        No hay revisiones programadas
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {reviews.map(review => {
                            const isBooked = !!review.student_email
                            const student = isBooked ? students.find(s => s.email === review.student_email) : null
                            const studentName = student 
                                ? (student.first_name && student.last_name ? `${student.first_name} ${student.last_name}` : student.email)
                                : (review.student_email || 'Disponible')

                            return (
                                <div 
                                    key={review.id} 
                                    onClick={() => setSelectedReview(review)}
                                    className={`border rounded-lg p-3 transition-colors cursor-pointer relative group ${
                                        isBooked 
                                            ? 'bg-neutral-900 border-indigo-900/30 hover:border-indigo-500/50' 
                                            : 'bg-neutral-900/50 border-neutral-800 border-dashed hover:border-neutral-600'
                                    }`}
                                >
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            handleDelete(review.id)
                                        }}
                                        className="absolute top-2 right-2 text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="Eliminar turno"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M3 6h18"></path>
                                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                                        </svg>
                                    </button>

                                    <div className="flex justify-between items-start mb-2">
                                        <div className="text-xs text-gray-500 font-medium bg-neutral-950 px-2 py-1 rounded">
                                            {new Date(review.start_date).toLocaleDateString()}
                                        </div>
                                        {review.result && (
                                            <div className={`text-xs px-2 py-1 rounded capitalize ${
                                                review.result === 'aprobado' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'
                                            }`}>
                                                {review.result}
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className="mb-3">
                                        <div className="text-sm font-medium text-gray-200 mb-1">
                                            {new Date(review.start_date).toLocaleDateString()}
                                        </div>
                                        <div className="text-xs text-gray-400 flex items-center gap-1">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <circle cx="12" cy="12" r="10"></circle>
                                                <polyline points="12 6 12 12 16 14"></polyline>
                                            </svg>
                                            {new Date(review.start_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {new Date(review.end_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                        </div>
                                    </div>

                                    <div className={`text-sm px-3 py-2 rounded flex items-center gap-2 ${
                                        isBooked ? 'bg-indigo-950/30 text-indigo-200' : 'bg-neutral-800 text-gray-500'
                                    }`}>
                                        <div className={`w-2 h-2 rounded-full ${isBooked ? 'bg-indigo-500' : 'bg-green-500'}`}></div>
                                        <span className="truncate" title={studentName || ''}>
                                            {studentName}
                                        </span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* Edit Modal */}
            {selectedReview && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-neutral-900 border border-neutral-800 rounded-lg w-full max-w-md p-6">
                        <h3 className="text-lg font-medium text-white mb-4">Detalles de la Revisión</h3>
                        
                        <form action={handleUpdate} className="space-y-4">
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Estudiante</label>
                                <select 
                                    name="studentEmail" 
                                    defaultValue={selectedReview.student_email || ''}
                                    className="bg-neutral-950 border border-neutral-700 rounded px-3 py-2 text-sm text-white w-full focus:outline-none focus:border-indigo-500"
                                >
                                    <option value="">-- Sin Asignar --</option>
                                    {students.map(s => (
                                        <option key={s.email} value={s.email}>
                                            {s.first_name} {s.last_name} ({s.email})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Resultado</label>
                                <select 
                                    name="result" 
                                    defaultValue={selectedReview.result || ''}
                                    className="bg-neutral-950 border border-neutral-700 rounded px-3 py-2 text-sm text-white w-full focus:outline-none focus:border-indigo-500"
                                >
                                    <option value="">-- Pendiente --</option>
                                    <option value="aprobado">Aprobado</option>
                                    <option value="reprobado">Reprobado</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Comentarios</label>
                                <textarea 
                                    name="comments" 
                                    defaultValue={selectedReview.comments || ''}
                                    rows={4}
                                    className="bg-neutral-950 border border-neutral-700 rounded px-3 py-2 text-sm text-white w-full focus:outline-none focus:border-indigo-500"
                                    placeholder="Comentarios sobre la revisión..."
                                />
                            </div>

                            <div className="flex gap-2 justify-end pt-2">
                                <button 
                                    type="button" 
                                    onClick={() => setSelectedReview(null)}
                                    className="px-4 py-2 text-sm text-gray-400 hover:text-white"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={isLoading}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded"
                                >
                                    {isLoading ? 'Guardando...' : 'Guardar Cambios'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
