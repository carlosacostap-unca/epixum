'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createCourse } from '@/app/actions/courses'
import { formatDateForDisplay, toUTC } from '@/utils/date'

type Course = {
    id: string
    name: string
    description: string | null
    institution_id: string
    status: string | null
    start_date: string | null
    end_date: string | null
}

function getStatusColor(status: string | null) {
    switch (status) {
        case 'Activo':
            return 'bg-green-500/20 text-green-400 border-green-500/30'
        case 'En Prueba':
            return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
        case 'Finalizado':
            return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
        default: // Borrador
            return 'bg-neutral-700 text-gray-400 border-neutral-600'
    }
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
    const [searchQuery, setSearchQuery] = useState('')
    const [isCreating, setIsCreating] = useState(false)
    const router = useRouter()

    async function handleCreateCourse(formData: FormData) {
        const result = await createCourse(formData)
        if (result.success) {
            setIsCreating(false)
            window.location.reload()
        } else {
            alert(result.error)
        }
    }

    const filteredCourses = courses.filter(course => 
        course.name.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const groupedCourses = {
        'Borrador': filteredCourses.filter(c => !c.status || c.status === 'Borrador'),
        'En Prueba': filteredCourses.filter(c => c.status === 'En Prueba'),
        'Activo': filteredCourses.filter(c => c.status === 'Activo'),
        'Finalizado': filteredCourses.filter(c => c.status === 'Finalizado')
    }

    const renderCourseCard = (course: Course) => (
        <div 
            key={course.id} 
            onClick={() => router.push(`/institution/${institutionId}/courses/${course.id}`)}
            className="bg-neutral-900 border border-neutral-800 rounded-lg p-6 flex flex-col justify-between hover:bg-neutral-800 transition-colors cursor-pointer group"
        >
            <div>
                <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xl font-bold text-gray-100 group-hover:text-indigo-400 transition-colors">{course.name}</h3>
                    <div className="relative">
                        <span className={`text-[10px] px-2 py-0.5 rounded border ${getStatusColor(course.status)} uppercase font-bold tracking-wider`}>
                            {course.status || 'Borrador'}
                        </span>
                    </div>
                </div>
                <p className="text-sm text-gray-400 line-clamp-3">
                    {course.description || 'Sin descripción'}
                </p>
                <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                    </svg>
                    {course.start_date ? (
                        <span>{formatDateForDisplay(course.start_date, 'dd/MM/yyyy')}</span>
                    ) : (
                        <span className="italic text-gray-600">Sin inicio</span>
                    )}
                    <span>-</span>
                    {course.end_date ? (
                        <span>{formatDateForDisplay(course.end_date, 'dd/MM/yyyy')}</span>
                    ) : (
                        <span className="italic text-gray-600">Sin fin</span>
                    )}
                </div>
            </div>
        </div>
    )

    const CreateCourseModal = () => {
        async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
            e.preventDefault()
            const formData = new FormData(e.currentTarget)
            
            const startDate = formData.get('start_date') as string
            const endDate = formData.get('end_date') as string
            
            if (startDate) formData.set('start_date', toUTC(startDate + 'T00:00'))
            if (endDate) formData.set('end_date', toUTC(endDate + 'T23:59:59'))
            
            await handleCreateCourse(formData)
        }

        return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-bold text-gray-100 mb-6">Nuevo Curso</h3>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <input type="hidden" name="institutionId" value={institutionId} />
                    
                    <div className="flex flex-col gap-1">
                        <label className="text-xs text-gray-500 font-medium uppercase tracking-wider">Nombre</label>
                        <input 
                            name="name"
                            placeholder="Nombre del curso"
                            className="bg-neutral-950 border border-neutral-700 rounded px-3 py-2 text-sm text-white w-full focus:outline-none focus:border-indigo-500"
                            required
                        />
                    </div>
                    
                    <div className="flex flex-col gap-1">
                        <label className="text-xs text-gray-500 font-medium uppercase tracking-wider">Descripción</label>
                        <textarea 
                            name="description"
                            placeholder="Descripción (opcional)"
                            className="bg-neutral-950 border border-neutral-700 rounded px-3 py-2 text-sm text-white w-full focus:outline-none focus:border-indigo-500 resize-none"
                            rows={3}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1">
                            <label className="text-xs text-gray-500 font-medium uppercase tracking-wider">Fecha Inicio</label>
                            <input 
                                type="date" 
                                name="start_date"
                                required
                                className="bg-neutral-950 border border-neutral-700 rounded px-3 py-2 text-sm text-white w-full focus:outline-none focus:border-indigo-500"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-xs text-gray-500 font-medium uppercase tracking-wider">Fecha Fin</label>
                            <input 
                                type="date" 
                                name="end_date"
                                required
                                className="bg-neutral-950 border border-neutral-700 rounded px-3 py-2 text-sm text-white w-full focus:outline-none focus:border-indigo-500"
                            />
                        </div>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                        <label className="text-xs text-gray-500 font-medium uppercase tracking-wider">Estructura</label>
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

                    <div className="flex items-center gap-2">
                        <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer hover:text-white transition-colors">
                            <input 
                                type="checkbox" 
                                name="has_teams" 
                                className="rounded text-indigo-500 focus:ring-indigo-500 bg-neutral-900 border-neutral-700"
                            />
                            Habilitar Equipos
                        </label>
                    </div>

                    <div className="flex gap-3 mt-4">
                        <button 
                            type="button"
                            onClick={() => setIsCreating(false)}
                            className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-gray-300 text-sm font-bold py-2.5 px-4 rounded transition-colors"
                        >
                            Cancelar
                        </button>
                        <button 
                            type="submit"
                            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold py-2.5 px-4 rounded transition-colors"
                        >
                            Crear
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
    }

    return (
        <div className="space-y-8">
            {isCreating && <CreateCourseModal />}

            {/* Search Filter & Add Button */}
            <div className="mb-8 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative flex-1 w-full">
                    <input
                        type="text"
                        placeholder="Buscar curso por título..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-lg pl-4 pr-4 py-3 text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                    />
                </div>
                <button 
                    onClick={() => setIsCreating(true)}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-lg font-bold transition-colors whitespace-nowrap"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    Nuevo Curso
                </button>
            </div>

            {/* Sections */}
            
            {/* Borrador Section */}
            {(groupedCourses['Borrador'].length > 0) && (
                <div>
                    <h2 className="text-lg font-semibold text-gray-400 mb-4 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-gray-500"></span>
                        Borradores
                        <span className="text-xs bg-neutral-800 px-2 py-0.5 rounded text-gray-500">{groupedCourses['Borrador'].length}</span>
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {groupedCourses['Borrador'].map(renderCourseCard)}
                    </div>
                </div>
            )}

            {/* En Prueba Section */}
            {(groupedCourses['En Prueba'].length > 0) && (
                <div>
                    <h2 className="text-lg font-semibold text-yellow-400 mb-4 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                        En Prueba
                        <span className="text-xs bg-yellow-900/30 border border-yellow-900 px-2 py-0.5 rounded text-yellow-500">{groupedCourses['En Prueba'].length}</span>
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {groupedCourses['En Prueba'].map(renderCourseCard)}
                    </div>
                </div>
            )}

            {/* Activo Section */}
            {(groupedCourses['Activo'].length > 0 || searchQuery) && (
                <div>
                    <h2 className="text-lg font-semibold text-green-400 mb-4 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                        Activos
                        <span className="text-xs bg-green-900/30 border border-green-900 px-2 py-0.5 rounded text-green-500">{groupedCourses['Activo'].length}</span>
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {groupedCourses['Activo'].length > 0 ? (
                            groupedCourses['Activo'].map(renderCourseCard)
                        ) : (
                            <p className="text-gray-500 text-sm italic">No hay cursos activos.</p>
                        )}
                    </div>
                </div>
            )}

            {/* Finalizado Section */}
            {(groupedCourses['Finalizado'].length > 0 || searchQuery) && (
                <div>
                    <h2 className="text-lg font-semibold text-blue-400 mb-4 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                        Finalizados
                        <span className="text-xs bg-blue-900/30 border border-blue-900 px-2 py-0.5 rounded text-blue-500">{groupedCourses['Finalizado'].length}</span>
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {groupedCourses['Finalizado'].length > 0 ? (
                            groupedCourses['Finalizado'].map(renderCourseCard)
                        ) : (
                            <p className="text-gray-500 text-sm italic">No hay cursos finalizados.</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}