'use client'

import { useState, useEffect } from 'react'
import { createSprintReview, getSprintReviews, deleteSprintReview } from '@/app/actions/sprint-reviews'

type Review = {
    id: string
    sprint_id: string
    student_email: string
    start_date: string
    end_date: string
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
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        loadReviews()
    }, [courseId])

    async function loadReviews() {
        const result = await getSprintReviews(courseId)
        if (result.success && result.data) {
            setReviews(result.data)
        }
    }

    async function handleCreate(formData: FormData) {
        setIsLoading(true)
        const result = await createSprintReview(formData)
        setIsLoading(false)

        if (result.success) {
            setIsCreating(false)
            loadReviews()
        } else {
            alert(result.error)
        }
    }

    async function handleDelete(reviewId: string) {
        if (!confirm('¿Estás seguro de eliminar esta revisión?')) return

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
                        + Nueva Revisión
                    </button>
                )}
            </div>

            {isCreating && (
                <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6 mb-6">
                    <h3 className="text-lg font-bold text-gray-100 mb-4">Programar Revisión</h3>
                    <form action={handleCreate} className="flex flex-col gap-4">
                        <input type="hidden" name="courseId" value={courseId} />
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
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
                                <label className="block text-xs text-gray-500 mb-1">Estudiante</label>
                                <select 
                                    name="studentEmail"
                                    className="bg-neutral-950 border border-neutral-700 rounded px-3 py-2 text-sm text-white w-full focus:outline-none focus:border-indigo-500"
                                    required
                                >
                                    <option value="">Seleccionar Estudiante</option>
                                    {students.map(s => (
                                        <option key={s.email} value={s.email}>
                                            {s.first_name && s.last_name 
                                                ? `${s.first_name} ${s.last_name} (${s.email})`
                                                : s.email
                                            }
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Inicio</label>
                                <input 
                                    type="datetime-local"
                                    name="startDate"
                                    className="bg-neutral-950 border border-neutral-700 rounded px-3 py-2 text-sm text-white w-full focus:outline-none focus:border-indigo-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Fin</label>
                                <input 
                                    type="datetime-local"
                                    name="endDate"
                                    className="bg-neutral-950 border border-neutral-700 rounded px-3 py-2 text-sm text-white w-full focus:outline-none focus:border-indigo-500"
                                    required
                                />
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
                                {isLoading ? 'Guardando...' : 'Guardar Revisión'}
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
                    reviews.map(review => {
                        const student = students.find(s => s.email === review.student_email)
                        const studentName = student 
                            ? (student.first_name && student.last_name ? `${student.first_name} ${student.last_name}` : student.email)
                            : review.student_email

                        return (
                            <div key={review.id} className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 hover:border-neutral-700 transition-colors">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs font-medium text-indigo-400 bg-indigo-900/30 px-2 py-0.5 rounded">
                                                {review.sprints?.title || 'Sprint desconocido'}
                                            </span>
                                            <span className="text-gray-400 text-sm">•</span>
                                            <span className="text-gray-200 font-medium text-sm">
                                                {studentName}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
                                            <div className="flex items-center gap-1">
                                                <span className="w-2 h-2 rounded-full bg-green-500/50"></span>
                                                Inicio: {new Date(review.start_date).toLocaleString()}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <span className="w-2 h-2 rounded-full bg-red-500/50"></span>
                                                Fin: {new Date(review.end_date).toLocaleString()}
                                            </div>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleDelete(review.id)}
                                        className="text-gray-500 hover:text-red-400 p-1 rounded hover:bg-neutral-800 transition-colors"
                                        title="Eliminar revisión"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    )
}
