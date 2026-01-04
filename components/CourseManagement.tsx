'use client'

import { useState } from 'react'
import { createCourse } from '@/app/actions/courses'

type Course = {
    id: string
    name: string
    description: string | null
    institution_id: string
}

export default function CourseManagement({ 
    initialCourses, 
    institutionId,
    institutionName
}: { 
    initialCourses: Course[], 
    institutionId: string,
    institutionName: string
}) {
    const [courses, setCourses] = useState(initialCourses)
    const [isCreating, setIsCreating] = useState(false)

    async function handleCreateCourse(formData: FormData) {
        const result = await createCourse(formData)
        if (result.success) {
            // In a real app we might re-fetch or use optimist UI.
            // For now, let's reload or trust revalidatePath
            setIsCreating(false)
            // Ideally we would update local state or use router.refresh()
            window.location.reload()
        } else {
            alert(result.error)
        }
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Create New Course Card */}
            <div className="bg-neutral-900 border-2 border-dashed border-neutral-800 rounded-lg p-6 flex flex-col items-center justify-center text-center hover:border-indigo-500/50 hover:bg-neutral-800/50 transition-all cursor-pointer min-h-[200px]"
                 onClick={() => setIsCreating(true)}
            >
                {isCreating ? (
                    <div className="w-full" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold text-gray-100 mb-4">Nuevo Curso</h3>
                        <form action={handleCreateCourse} className="flex flex-col gap-3">
                            <input type="hidden" name="institutionId" value={institutionId} />
                            <input 
                                name="name"
                                placeholder="Nombre del curso"
                                className="bg-neutral-950 border border-neutral-700 rounded px-3 py-2 text-sm text-white w-full focus:outline-none focus:border-indigo-500"
                                required
                            />
                            <textarea 
                                name="description"
                                placeholder="Descripción (opcional)"
                                className="bg-neutral-950 border border-neutral-700 rounded px-3 py-2 text-sm text-white w-full focus:outline-none focus:border-indigo-500 resize-none"
                                rows={2}
                            />
                            
                            <div className="flex flex-col gap-2 mt-2">
                                <label className="text-xs text-gray-500 font-medium uppercase tracking-wider">Estructura del Curso</label>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer hover:text-white transition-colors">
                                        <input 
                                            type="radio" 
                                            name="structure_type" 
                                            value="classes"
                                            defaultChecked 
                                            className="text-indigo-500 focus:ring-indigo-500 bg-neutral-900 border-neutral-700"
                                        />
                                        Por Clases
                                    </label>
                                    <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer hover:text-white transition-colors">
                                        <input 
                                            type="radio" 
                                            name="structure_type" 
                                            value="sprints"
                                            className="text-indigo-500 focus:ring-indigo-500 bg-neutral-900 border-neutral-700"
                                        />
                                        Por Sprints
                                    </label>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 mt-2">
                                <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer hover:text-white transition-colors">
                                    <input 
                                        type="checkbox" 
                                        name="has_teams" 
                                        className="rounded text-indigo-500 focus:ring-indigo-500 bg-neutral-900 border-neutral-700"
                                    />
                                    Habilitar Equipos
                                </label>
                            </div>

                            <div className="flex gap-2 mt-2">
                                <button 
                                    type="submit"
                                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2 px-4 rounded"
                                >
                                    Crear
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => setIsCreating(false)}
                                    className="flex-1 bg-neutral-700 hover:bg-neutral-600 text-gray-300 text-xs font-bold py-2 px-4 rounded"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </form>
                    </div>
                ) : (
                    <>
                        <div className="w-12 h-12 rounded-full bg-neutral-800 flex items-center justify-center mb-3 text-indigo-400">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-medium text-gray-300">Añadir Curso</h3>
                        <p className="text-sm text-gray-500 mt-1">Crear un nuevo curso para esta institución</p>
                    </>
                )}
            </div>

            {/* Course List */}
            {courses.map(course => (
                <div key={course.id} className="bg-neutral-900 border border-neutral-800 rounded-lg p-6 flex flex-col justify-between hover:border-neutral-700 transition-colors">
                    <div>
                        <h3 className="text-xl font-bold text-gray-100 mb-2">{course.name}</h3>
                        <p className="text-sm text-gray-400 line-clamp-3">
                            {course.description || 'Sin descripción'}
                        </p>
                    </div>
                    <div className="mt-6 pt-4 border-t border-neutral-800 flex justify-between items-center">
                        <span className="text-xs text-gray-600 font-mono">ID: {course.id.slice(0,8)}...</span>
                        <a href={`/institution/${institutionId}/courses/${course.id}`} className="text-xs text-indigo-400 hover:text-indigo-300 hover:underline">
                            Ver Detalles →
                        </a>
                    </div>
                </div>
            ))}
        </div>
    )
}
