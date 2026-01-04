'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { enrollStudentByNodocente, removeStudentByNodocente } from '@/app/actions/courses'

interface Student {
    id: string
    email: string
    created_at: string
}

interface Course {
    id: string
    name: string
    description: string
    institution_id: string
    instituciones: {
        nombre: string
    }
}

export default function NonTeachingStaffCourseView({ 
    course,
    students = []
}: { 
    course: Course
    students?: Student[]
}) {
    const [isPending, startTransition] = useTransition()
    const [email, setEmail] = useState('')
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
    const router = useRouter()

    const handleEnroll = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!email) return

        setMessage(null)
        
        startTransition(async () => {
            const result = await enrollStudentByNodocente(course.id, email)
            if (result.success) {
                setMessage({ type: 'success', text: 'Estudiante matriculado correctamente' })
                setEmail('')
                router.refresh()
            } else {
                setMessage({ type: 'error', text: result.error || 'Error al matricular estudiante' })
            }
        })
    }

    const handleRemove = async (studentEmail: string) => {
        if (!confirm('¿Estás seguro de que deseas eliminar a este estudiante del curso?')) return

        startTransition(async () => {
            const result = await removeStudentByNodocente(course.id, studentEmail)
            if (result.success) {
                setMessage({ type: 'success', text: 'Estudiante eliminado correctamente' })
                router.refresh()
            } else {
                setMessage({ type: 'error', text: result.error || 'Error al eliminar estudiante' })
            }
        })
    }

    return (
        <div className="flex min-h-screen flex-col items-center p-8 font-[family-name:var(--font-geist-sans)] bg-black text-gray-200">
            <main className="w-full max-w-4xl flex flex-col gap-8 items-start">
                
                {/* Header / Breadcrumb */}
                <div className="w-full">
                    <Link href="/" className="text-indigo-400 hover:text-indigo-300 text-sm flex items-center gap-1 mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="m15 18-6-6 6-6"/>
                        </svg>
                        Volver al Dashboard
                    </Link>
                    
                    <div className="bg-neutral-900 p-6 rounded-lg shadow-sm border border-neutral-800 w-full">
                        <div className="flex justify-between items-start">
                            <div>
                                <h1 className="text-3xl font-bold text-gray-100">{course.name}</h1>
                                <p className="text-gray-400 mt-2">{course.description}</p>
                                <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
                                    <span className="bg-neutral-800 px-2 py-1 rounded border border-neutral-700">
                                        {course.instituciones?.nombre}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Manage Students Section */}
                <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* Add Student Form */}
                    <div className="lg:col-span-1">
                        <div className="bg-neutral-900 p-6 rounded-lg shadow-md border border-neutral-800 sticky top-8">
                            <h2 className="text-xl font-bold mb-4 text-white flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                                    <circle cx="8.5" cy="7" r="4"/>
                                    <line x1="20" x2="20" y1="8" y2="14"/>
                                    <line x1="23" x2="17" y1="11" y2="11"/>
                                </svg>
                                Matricular Estudiante
                            </h2>
                            <form onSubmit={handleEnroll} className="flex flex-col gap-4">
                                <div>
                                    <label htmlFor="email" className="block text-sm font-medium text-gray-400 mb-1">
                                        Email del Estudiante
                                    </label>
                                    <input
                                        type="email"
                                        id="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="estudiante@ejemplo.com"
                                        className="w-full bg-neutral-800 border border-neutral-700 rounded p-2 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                                        required
                                    />
                                </div>
                                
                                {message && (
                                    <div className={`p-3 rounded text-sm ${message.type === 'success' ? 'bg-green-900/30 text-green-400 border border-green-900' : 'bg-red-900/30 text-red-400 border border-red-900'}`}>
                                        {message.text}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={isPending}
                                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                                >
                                    {isPending ? (
                                        <>
                                            <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                                            Procesando...
                                        </>
                                    ) : (
                                        'Matricular'
                                    )}
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Students List */}
                    <div className="lg:col-span-2">
                        <div className="bg-neutral-900 p-6 rounded-lg shadow-md border border-neutral-800">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                                        <circle cx="9" cy="7" r="4"/>
                                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                                        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                                    </svg>
                                    Estudiantes Matriculados
                                    <span className="bg-neutral-800 text-gray-400 text-sm px-2 py-0.5 rounded-full ml-2">
                                        {students.length}
                                    </span>
                                </h2>
                            </div>

                            {students.length === 0 ? (
                                <div className="text-center py-8 text-gray-500 bg-neutral-800/30 rounded border border-neutral-800 border-dashed">
                                    No hay estudiantes matriculados en este curso.
                                </div>
                            ) : (
                                <div className="overflow-hidden rounded-lg border border-neutral-800">
                                    <table className="min-w-full divide-y divide-neutral-800">
                                        <thead className="bg-neutral-800">
                                            <tr>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                                    Email
                                                </th>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                                    Fecha Inscripción
                                                </th>
                                                <th scope="col" className="relative px-6 py-3">
                                                    <span className="sr-only">Acciones</span>
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-neutral-900 divide-y divide-neutral-800">
                                            {students.map((student) => (
                                                <tr key={student.email} className="hover:bg-neutral-800/50 transition-colors">
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                                        {student.email}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {new Date(student.created_at).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                        <button
                                                            onClick={() => handleRemove(student.email)}
                                                            disabled={isPending}
                                                            className="text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
                                                            title="Eliminar estudiante"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <path d="M3 6h18"/>
                                                                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                                                                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                                                                <line x1="10" x2="10" y1="11" y2="17"/>
                                                                <line x1="14" x2="14" y1="11" y2="17"/>
                                                            </svg>
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
