'use client'

import { useState } from 'react'
import Link from 'next/link'
import ProfileManager from '@/components/ProfileManager'

interface Course {
    id: string
    name: string
    description: string
    institution_name: string
    status?: string
}

interface TeacherDashboardProps {
    courses: Course[]
    userEmail: string
    profile?: any
    hasMultipleRoles?: boolean
}

export default function TeacherDashboard({ courses, userEmail, profile, hasMultipleRoles = false }: TeacherDashboardProps) {
    const [searchQuery, setSearchQuery] = useState('')

    const filteredCourses = courses.filter(course => 
        course.name.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const groupedCourses = {
        'Borrador': filteredCourses.filter(c => !c.status || c.status === 'Borrador'),
        'Activo': filteredCourses.filter(c => c.status === 'Activo'),
        'Finalizado': filteredCourses.filter(c => c.status === 'Finalizado')
    }

    const renderCourseCard = (course: Course) => (
        <Link href={`/teacher/courses/${course.id}`} key={course.id} className="block group">
            <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6 hover:bg-neutral-800 transition-all h-full flex flex-col justify-between">
                <div>
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-medium text-indigo-400 bg-indigo-900/30 px-2 py-1 rounded">
                                    {course.institution_name || 'Institución'}
                                </span>
                                <span className={`text-[10px] px-2 py-0.5 rounded border uppercase font-bold tracking-wider ${
                                    course.status === 'Activo' ? 'bg-green-900/30 text-green-400 border-green-800' :
                                    course.status === 'Finalizado' ? 'bg-blue-900/30 text-blue-400 border-blue-800' :
                                    'bg-gray-800 text-gray-400 border-gray-700'
                                }`}>
                                    {course.status || 'Borrador'}
                                </span>
                            </div>
                            <h3 className="text-xl font-bold text-gray-100 mt-2 group-hover:text-indigo-400 transition-colors">
                                {course.name}
                            </h3>
                        </div>
                    </div>
                    <p className="text-gray-400 text-sm mb-6 line-clamp-2">
                        {course.description || 'Sin descripción'}
                    </p>
                </div>
            </div>
        </Link>
    )

    return (
        <div className="flex min-h-screen flex-col items-center p-8 bg-black font-[family-name:var(--font-geist-sans)]">
            <main className="w-full max-w-4xl flex flex-col gap-8 items-start">
                <div className="flex justify-between w-full items-center bg-neutral-900 p-6 rounded-lg shadow-sm border border-neutral-800">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-100">Panel Docente</h1>
                        <p className="text-gray-400 mt-1">
                            Usuario: <span className="font-medium text-gray-200">{userEmail}</span>
                            <span className="mx-2 text-gray-600">|</span>
                            Rol: <span className="text-indigo-400 font-semibold">Docente</span>
                        </p>
                    </div>
                    <div className="flex gap-4 items-center">
                        {profile && <ProfileManager initialProfile={profile} hasMultipleRoles={hasMultipleRoles} />}
                    </div>
                </div>

                <div className="w-full space-y-8">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <h2 className="text-2xl font-bold text-gray-100">Mis Cursos Asignados</h2>
                        <div className="relative w-full md:w-64">
                            <input
                                type="text"
                                placeholder="Buscar curso por título..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg pl-4 pr-4 py-2 text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
                            />
                        </div>
                    </div>
                    
                    {courses.length === 0 ? (
                        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-12 text-center text-gray-500">
                            No tienes cursos asignados actualmente.
                        </div>
                    ) : (
                        <>
                            {/* Borrador Section */}
                            {(groupedCourses['Borrador'].length > 0) && (
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-400 mb-4 flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-gray-500"></span>
                                        Borradores
                                        <span className="text-xs bg-neutral-800 px-2 py-0.5 rounded text-gray-500">{groupedCourses['Borrador'].length}</span>
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {groupedCourses['Borrador'].map(renderCourseCard)}
                                    </div>
                                </div>
                            )}

                            {/* Activo Section */}
                            {(groupedCourses['Activo'].length > 0 || searchQuery) && (
                                <div>
                                    <h3 className="text-lg font-semibold text-green-400 mb-4 flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                        Activos
                                        <span className="text-xs bg-green-900/30 border border-green-900 px-2 py-0.5 rounded text-green-500">{groupedCourses['Activo'].length}</span>
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {groupedCourses['Activo'].length > 0 ? (
                                            groupedCourses['Activo'].map(renderCourseCard)
                                        ) : (
                                            <p className="text-gray-500 text-sm italic col-span-2">No hay cursos activos que coincidan con la búsqueda.</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Finalizado Section */}
                            {(groupedCourses['Finalizado'].length > 0 || searchQuery) && (
                                <div>
                                    <h3 className="text-lg font-semibold text-blue-400 mb-4 flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                        Finalizados
                                        <span className="text-xs bg-blue-900/30 border border-blue-900 px-2 py-0.5 rounded text-blue-500">{groupedCourses['Finalizado'].length}</span>
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {groupedCourses['Finalizado'].length > 0 ? (
                                            groupedCourses['Finalizado'].map(renderCourseCard)
                                        ) : (
                                            <p className="text-gray-500 text-sm italic col-span-2">No hay cursos finalizados que coincidan con la búsqueda.</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </main>
        </div>
    )
}