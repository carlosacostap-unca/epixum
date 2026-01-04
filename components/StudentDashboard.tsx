'use client'

import ProfileManager from '@/components/ProfileManager'

interface Course {
    id: string
    name: string
    description: string
    institution_name: string
}

interface StudentDashboardProps {
    courses: Course[]
    userEmail: string
    profile?: any
}

export default function StudentDashboard({ courses, userEmail, profile }: StudentDashboardProps) {
    return (
        <div className="flex min-h-screen flex-col items-center p-8 bg-black font-[family-name:var(--font-geist-sans)]">
            <main className="w-full max-w-4xl flex flex-col gap-8 items-start">
                <div className="flex justify-between w-full items-center bg-neutral-900 p-6 rounded-lg shadow-sm border border-neutral-800">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-100">Panel del Estudiante</h1>
                        <p className="text-gray-400 mt-1">
                            Usuario: <span className="font-medium text-gray-200">{userEmail}</span>
                            <span className="mx-2 text-gray-600">|</span>
                            Rol: <span className="text-indigo-400 font-semibold">Estudiante</span>
                        </p>
                    </div>
                    <div className="flex gap-4 items-center">
                        {profile && <ProfileManager initialProfile={profile} />}
                        <form action="/auth/signout" method="post">
                            <button 
                                className="bg-neutral-800 text-gray-200 border border-neutral-700 px-4 py-2 rounded-md hover:bg-neutral-700 transition-colors text-sm font-medium"
                                type="submit"
                            >
                                Cerrar Sesión
                            </button>
                        </form>
                    </div>
                </div>

                <div className="w-full">
                    <h2 className="text-2xl font-bold text-gray-100 mb-6">Mis Cursos Matriculados</h2>
                    
                    {courses.length === 0 ? (
                        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-12 text-center text-gray-500">
                            No estás matriculado en ningún curso actualmente.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {courses.map(course => (
                                <div key={course.id} className="bg-neutral-900 border border-neutral-800 rounded-lg p-6 hover:bg-neutral-800 transition-all group">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <span className="text-xs font-medium text-indigo-400 bg-indigo-900/30 px-2 py-1 rounded">
                                                {course.institution_name || 'Institución'}
                                            </span>
                                            <h3 className="text-xl font-bold text-gray-100 mt-2 group-hover:text-indigo-400 transition-colors">
                                                {course.name}
                                            </h3>
                                        </div>
                                    </div>
                                    <p className="text-gray-400 text-sm mb-6 line-clamp-2">
                                        {course.description || 'Sin descripción'}
                                    </p>
                                    <div className="border-t border-neutral-800 pt-4 flex justify-end">
                                        <a href={`/student/courses/${course.id}`} className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
                                            Ver Curso →
                                        </a>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}
