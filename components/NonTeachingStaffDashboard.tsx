'use client'

import Link from 'next/link'
import ProfileManager from '@/components/ProfileManager'

interface Course {
    id: string
    name: string
    description: string
    institution_id: string
    institution_name: string
}

export default function NonTeachingStaffDashboard({ 
    userEmail,
    courses = [],
    profile,
    hasMultipleRoles = false
}: { 
    userEmail: string 
    courses?: Course[]
    profile?: any
    hasMultipleRoles?: boolean
}) {
  
  // Group courses by institution
  const groupedCourses = courses.reduce((acc, course) => {
      const instName = course.institution_name || 'Otras Instituciones'
      if (!acc[instName]) {
          acc[instName] = []
      }
      acc[instName].push(course)
      return acc
  }, {} as Record<string, Course[]>)

  return (
    <div className="flex min-h-screen flex-col items-center p-8 font-[family-name:var(--font-geist-sans)] bg-black">
      <main className="w-full max-w-4xl flex flex-col gap-8 items-start">
        <div className="flex justify-between w-full items-center bg-neutral-900 p-6 rounded-lg shadow-sm border border-neutral-800">
             <div>
                <h1 className="text-3xl font-bold text-gray-100">Bienvenido, Personal No Docente</h1>
                <p className="text-gray-400 mt-1">
                    Usuario: <span className="font-medium text-gray-200">{userEmail}</span>
                </p>
             </div>
             <div className="flex gap-4 items-center">
                 {profile && <ProfileManager initialProfile={profile} hasMultipleRoles={hasMultipleRoles} />}
             </div>
        </div>
        
        <div className="w-full bg-neutral-900 p-6 rounded-lg shadow-md border border-neutral-800">
            <h2 className="text-2xl font-bold mb-4 text-white">Mis Cursos Asignados</h2>
            <div className="text-gray-400 mb-6">
                Listado de cursos organizados por institución educativa.
            </div>

            {Object.keys(groupedCourses).length === 0 ? (
                 <div className="text-gray-500 italic p-4 bg-neutral-800/50 rounded border border-neutral-800 text-center">
                    No tienes cursos asignados actualmente.
                 </div>
            ) : (
                <div className="space-y-8">
                    {Object.entries(groupedCourses).map(([institutionName, institutionCourses]) => (
                        <div key={institutionName}>
                            <h3 className="text-xl font-bold text-indigo-400 mb-4 pb-2 border-b border-neutral-800 flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M3 21h18"/>
                                    <path d="M5 21V7l8-4 8 4v14"/>
                                    <path d="M17 21v-8.5a1.5 1.5 0 0 0-1.5-1.5h-7a1.5 1.5 0 0 0-1.5 1.5V21"/>
                                </svg>
                                {institutionName}
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {institutionCourses.map(course => (
                                    <Link href={`/nodocente/courses/${course.id}`} key={course.id} className="block group">
                                        <div className="bg-neutral-800 p-5 rounded border border-neutral-700 hover:border-indigo-500 transition-colors h-full">
                                            <h4 className="text-lg font-semibold text-gray-200 group-hover:text-indigo-300 transition-colors mb-2">
                                                {course.name}
                                            </h4>
                                            <p className="text-sm text-gray-500 line-clamp-3">
                                                {course.description || 'Sin descripción disponible.'}
                                            </p>
                                        </div>
                                    </Link>
                                ))}
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
