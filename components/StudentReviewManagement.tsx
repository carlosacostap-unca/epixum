'use client'

import { useState, useEffect } from 'react'
import { getSprintReviews, bookReviewSlot, cancelReviewBooking } from '@/app/actions/sprint-reviews'

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

export default function StudentReviewManagement({ 
    courseId, 
    currentUserEmail,
    sprints
}: { 
    courseId: string, 
    currentUserEmail: string,
    sprints: Sprint[]
}) {
    const [reviews, setReviews] = useState<Review[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [selectedSprint, setSelectedSprint] = useState<string>('')

    useEffect(() => {
        loadReviews()
    }, [courseId])

    async function loadReviews() {
        const result = await getSprintReviews(courseId)
        if (result.success && result.data) {
            setReviews(result.data)
        }
    }

    async function handleBook(reviewId: string) {
        if (!confirm('¿Confirmas la reserva de este turno?')) return

        setIsLoading(true)
        const result = await bookReviewSlot(courseId, reviewId)
        setIsLoading(false)

        if (result.success) {
            loadReviews()
        } else {
            alert(result.error)
        }
    }

    async function handleCancel(reviewId: string) {
        if (!confirm('¿Estás seguro de cancelar tu reserva?')) return

        setIsLoading(true)
        const result = await cancelReviewBooking(courseId, reviewId)
        setIsLoading(false)

        if (result.success) {
            loadReviews()
        } else {
            alert(result.error)
        }
    }

    // Filter reviews
    const filteredReviews = selectedSprint 
        ? reviews.filter(r => r.sprint_id === selectedSprint)
        : reviews

    return (
        <div className="w-full">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h2 className="text-xl font-bold text-gray-100">Turnos de Revisión</h2>
                <select 
                    value={selectedSprint}
                    onChange={(e) => setSelectedSprint(e.target.value)}
                    className="w-full md:w-auto bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                    <option value="">Todos los Sprints</option>
                    {sprints.map(s => (
                        <option key={s.id} value={s.id}>{s.title}</option>
                    ))}
                </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredReviews.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-gray-500 bg-neutral-900/30 rounded-lg border border-neutral-800 border-dashed">
                        No hay turnos de revisión disponibles
                    </div>
                ) : (
                    filteredReviews.map(review => {
                        const isMyBooking = review.student_email === currentUserEmail
                        const isBooked = !!review.student_email && !isMyBooking
                        const isAvailable = !review.student_email
                        
                        // Check if user has ANY booking for this specific sprint
                        const hasBookingInThisSprint = reviews.some(r => 
                            r.sprint_id === review.sprint_id && 
                            r.student_email === currentUserEmail
                        )

                        return (
                            <div key={review.id} className={`border rounded-lg p-4 transition-colors ${
                                isMyBooking 
                                    ? 'bg-indigo-900/20 border-indigo-500/50' 
                                    : isBooked
                                        ? 'bg-neutral-900 border-neutral-800 opacity-60'
                                        : 'bg-neutral-900 border-green-900/30 hover:border-green-500/50'
                            }`}>
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-xs font-medium text-gray-400 bg-neutral-800 px-2 py-0.5 rounded">
                                        {review.sprints?.title}
                                    </span>
                                    {isMyBooking && (
                                        <span className="text-xs font-bold text-indigo-400 bg-indigo-900/30 px-2 py-0.5 rounded">
                                            Tu Reserva
                                        </span>
                                    )}
                                </div>
                                
                                <div className="mb-4">
                                    <div className="text-lg font-bold text-gray-100">
                                        {new Date(review.start_date).toLocaleDateString(undefined, {
                                            weekday: 'short', 
                                            day: 'numeric', 
                                            month: 'short'
                                        })}
                                    </div>
                                    <div className="text-sm text-gray-400 flex items-center gap-1">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <circle cx="12" cy="12" r="10"></circle>
                                            <polyline points="12 6 12 12 16 14"></polyline>
                                        </svg>
                                        {new Date(review.start_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {new Date(review.end_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </div>
                                </div>

                                {isMyBooking && (review.result || review.comments) && (
                                    <div className="mb-4 pt-3 border-t border-indigo-500/20">
                                        {review.result && (
                                            <div className="mb-2">
                                                <span className={`text-xs font-bold px-2 py-1 rounded capitalize ${
                                                    review.result === 'aprobado' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'
                                                }`}>
                                                    {review.result}
                                                </span>
                                            </div>
                                        )}
                                        {review.comments && (
                                            <p className="text-sm text-gray-300 italic">
                                                "{review.comments}"
                                            </p>
                                        )}
                                    </div>
                                )}

                                <div className="mt-2">
                                    {isAvailable && !hasBookingInThisSprint && (
                                        <button 
                                            onClick={() => handleBook(review.id)}
                                            disabled={isLoading}
                                            className="w-full py-2 px-4 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-medium transition-colors"
                                        >
                                            Reservar
                                        </button>
                                    )}
                                    {isAvailable && hasBookingInThisSprint && (
                                        <button 
                                            disabled
                                            className="w-full py-2 px-4 bg-neutral-800 text-gray-500 rounded text-sm font-medium cursor-not-allowed border border-neutral-700"
                                            title="Ya tienes una reserva para este sprint"
                                        >
                                            Disponible
                                        </button>
                                    )}
                                    {isMyBooking && (
                                        <button 
                                            onClick={() => handleCancel(review.id)}
                                            disabled={isLoading}
                                            className="w-full py-2 px-4 bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-900/50 rounded text-sm font-medium transition-colors"
                                        >
                                            Cancelar Reserva
                                        </button>
                                    )}
                                    {isBooked && (
                                        <button 
                                            disabled
                                            className="w-full py-2 px-4 bg-neutral-800 text-gray-500 rounded text-sm font-medium cursor-not-allowed"
                                        >
                                            Ocupado
                                        </button>
                                    )}
                                </div>
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    )
}
