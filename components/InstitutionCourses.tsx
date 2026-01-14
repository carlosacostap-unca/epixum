'use client'

import { useState, useEffect } from 'react'
import { getCourses, createCourse, getNodocenteUsers, enrollNodocente, getCourseNodocentes, removeNodocenteFromCourse } from '@/app/actions/courses'

interface Course {
    id: string
    name: string
    description: string
    created_at: string
    start_date?: string | null
    end_date?: string | null
}

interface User {
    id: string
    email: string
    first_name?: string
    last_name?: string
    roles?: string[]
}

interface Enrollment {
    id: string
    email: string
    role: string
    created_at: string
}

export default function InstitutionCourses({ institutionId, institutionName, onBack }: { institutionId: string, institutionName: string, onBack: () => void }) {
    const [courses, setCourses] = useState<Course[]>([])
    const [loading, setLoading] = useState(true)
    const [creating, setCreating] = useState(false)
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
    
    // Enrollment state
    const [enrollments, setEnrollments] = useState<Enrollment[]>([])
    const [availableUsers, setAvailableUsers] = useState<User[]>([])
    const [loadingEnrollments, setLoadingEnrollments] = useState(false)
    const [enrolling, setEnrolling] = useState<string | null>(null) // email of user being enrolled

    useEffect(() => {
        loadCourses()
    }, [institutionId])

    async function loadCourses() {
        setLoading(true)
        const res = await getCourses(institutionId)
        if (res.success && res.data) {
            setCourses(res.data)
        }
        setLoading(false)
    }

    async function handleCreateCourse(formData: FormData) {
        setCreating(true)
        formData.append('institutionId', institutionId)
        const res = await createCourse(formData)
        setCreating(false)
        if (res.success) {
            loadCourses()
            // Reset form?
            const form = document.getElementById('create-course-form') as HTMLFormElement
            form?.reset()
        } else {
            alert(res.error)
        }
    }

    async function handleSelectCourse(course: Course) {
        setSelectedCourse(course)
        setLoadingEnrollments(true)
        
        // Load enrollments and available users in parallel
        const [enrollRes, usersRes] = await Promise.all([
            getCourseNodocentes(course.id),
            getNodocenteUsers()
        ])
        
        if (enrollRes.success && enrollRes.data) {
            setEnrollments(enrollRes.data)
        }
        
        if (usersRes.success && usersRes.data) {
            setAvailableUsers(usersRes.data)
        }
        
        setLoadingEnrollments(false)
    }

    async function handleEnroll(email: string) {
        if (!selectedCourse) return
        setEnrolling(email)
        const res = await enrollNodocente(selectedCourse.id, email)
        setEnrolling(null)
        
        if (res.success) {
            // Refresh enrollments
            const enrollRes = await getCourseNodocentes(selectedCourse.id)
            if (enrollRes.success && enrollRes.data) {
                setEnrollments(enrollRes.data)
            }
        } else {
            alert(res.error)
        }
    }

    async function handleRemoveEnrollment(email: string) {
        if (!selectedCourse) return
        if (!confirm('¿Estás seguro de quitar este usuario del curso?')) return
        
        const res = await removeNodocenteFromCourse(selectedCourse.id, email)
        if (res.success) {
             const enrollRes = await getCourseNodocentes(selectedCourse.id)
            if (enrollRes.success && enrollRes.data) {
                setEnrollments(enrollRes.data)
            }
        } else {
            alert(res.error)
        }
    }

    // Filter users not already enrolled
    const enrolledEmails = new Set(enrollments.map(e => e.email))
    const usersToEnroll = availableUsers.filter(u => !enrolledEmails.has(u.email))

    if (selectedCourse) {
        return (
            <div className="w-full bg-neutral-900 p-6 rounded-lg shadow-md border border-neutral-800">
                <div className="flex items-center gap-4 mb-6">
                    <button onClick={() => setSelectedCourse(null)} className="text-gray-400 hover:text-white">
                        ← Volver
                    </button>
                    <h2 className="text-2xl font-bold text-white">Gestionar Curso: {selectedCourse.name}</h2>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* List of Enrolled Users */}
                    <div>
                        <h3 className="text-lg font-semibold text-gray-200 mb-4">Usuarios Asignados (Nodocente)</h3>
                        {loadingEnrollments ? (
                            <p className="text-gray-500">Cargando...</p>
                        ) : enrollments.length === 0 ? (
                            <p className="text-gray-500 italic">No hay usuarios asignados.</p>
                        ) : (
                            <ul className="space-y-2">
                                {enrollments.map(enrollment => (
                                    <li key={enrollment.id} className="flex justify-between items-center bg-neutral-800 p-3 rounded border border-neutral-700">
                                        <span className="text-gray-300">{enrollment.email}</span>
                                        <button 
                                            onClick={() => handleRemoveEnrollment(enrollment.email)}
                                            className="text-red-400 hover:text-red-300 text-sm"
                                        >
                                            Quitar
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {/* Add User */}
                    <div>
                        <h3 className="text-lg font-semibold text-gray-200 mb-4">Asignar Nodocente</h3>
                        {loadingEnrollments ? (
                            <p className="text-gray-500">Cargando...</p>
                        ) : usersToEnroll.length === 0 ? (
                            <p className="text-gray-500 italic">No hay usuarios nodocentes disponibles para asignar.</p>
                        ) : (
                            <ul className="space-y-2 max-h-96 overflow-y-auto">
                                {usersToEnroll.map(user => (
                                    <li key={user.id} className="flex justify-between items-center bg-neutral-800 p-3 rounded border border-neutral-700">
                                        <div>
                                            <div className="text-gray-200 font-medium">{user.first_name} {user.last_name}</div>
                                            <div className="text-gray-400 text-sm">{user.email}</div>
                                        </div>
                                        <button 
                                            onClick={() => handleEnroll(user.email)}
                                            disabled={enrolling === user.email}
                                            className="bg-indigo-600 text-white px-3 py-1 rounded text-sm hover:bg-indigo-700 disabled:opacity-50"
                                        >
                                            {enrolling === user.email ? 'Asignando...' : 'Asignar'}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="w-full bg-neutral-900 p-6 rounded-lg shadow-md border border-neutral-800">
            <div className="flex items-center gap-4 mb-6">
                <button onClick={onBack} className="text-gray-400 hover:text-white">
                    ← Volver a Instituciones
                </button>
                <h2 className="text-2xl font-bold text-white">Cursos de {institutionName}</h2>
            </div>

            {/* Create Course */}
            <form id="create-course-form" action={handleCreateCourse} className="mb-8 p-4 bg-neutral-800/50 rounded border border-neutral-700">
                <h3 className="text-lg font-medium text-gray-200 mb-4">Crear Nuevo Curso</h3>
                <div className="flex flex-col md:flex-row gap-4">
                    <input 
                        name="name" 
                        type="text" 
                        placeholder="Nombre del curso" 
                        required 
                        className="flex-1 bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                    />
                    <input 
                        name="description" 
                        type="text" 
                        placeholder="Descripción (opcional)" 
                        className="flex-1 bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                    />
                    <button 
                        type="submit" 
                        disabled={creating}
                        className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
                    >
                        {creating ? 'Creando...' : 'Crear'}
                    </button>
                </div>
            </form>

            {/* List Courses */}
            {loading ? (
                <p className="text-gray-500">Cargando cursos...</p>
            ) : courses.length === 0 ? (
                <p className="text-gray-500 italic">No hay cursos creados en esta institución.</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {courses.map(course => (
                        <div key={course.id} className="bg-neutral-800 p-5 rounded border border-neutral-700 hover:border-indigo-500 transition-colors">
                            <h3 className="text-xl font-semibold text-gray-200">{course.name}</h3>
                            <p className="text-gray-400 text-sm mt-1">{course.description}</p>
                            {(course.start_date || course.end_date) && (
                                <p className="text-xs text-gray-500 mt-1">
                                    {course.start_date && new Date(course.start_date).toLocaleDateString()} 
                                    {course.start_date && course.end_date && ' - '}
                                    {course.end_date && new Date(course.end_date).toLocaleDateString()}
                                </p>
                            )}
                            <div className="mt-4 pt-4 border-t border-neutral-700">
                                <button 
                                    onClick={() => handleSelectCourse(course)}
                                    className="text-indigo-400 hover:text-indigo-300 text-sm font-medium flex items-center gap-1"
                                >
                                    Gestionar Asignaciones →
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
