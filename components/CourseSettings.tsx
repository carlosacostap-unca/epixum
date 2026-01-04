'use client'

import { useState } from 'react'
import { updateCourseSettings } from '@/app/actions/courses'

export default function CourseSettings({ 
    courseId, 
    initialHasClasses, 
    initialHasSprints,
    initialHasTeams
}: { 
    courseId: string, 
    initialHasClasses: boolean, 
    initialHasSprints: boolean,
    initialHasTeams: boolean
}) {
    const [structureType, setStructureType] = useState<'classes' | 'sprints'>(
        initialHasSprints ? 'sprints' : 'classes'
    )
    const [hasTeams, setHasTeams] = useState(initialHasTeams)
    const [isSaving, setIsSaving] = useState(false)

    async function handleSave() {
        setIsSaving(true)
        const result = await updateCourseSettings(
            courseId, 
            structureType === 'classes', 
            structureType === 'sprints',
            hasTeams
        )
        setIsSaving(false)
        if (!result.success) {
            alert('Error al guardar configuración: ' + result.error)
        } else {
            alert('Configuración guardada exitosamente')
        }
    }

    return (
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6 mt-8">
            <h2 className="text-xl font-bold text-gray-100 mb-4">Configuración del Curso</h2>
            <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                    <label className="text-xs text-gray-500 font-medium uppercase tracking-wider">Estructura Principal</label>
                    <label className={`flex items-center gap-3 p-3 bg-neutral-950 rounded border cursor-pointer transition-colors ${structureType === 'classes' ? 'border-indigo-500 bg-neutral-900' : 'border-neutral-800 hover:border-neutral-700'}`}>
                        <input 
                            type="radio" 
                            name="structure_type"
                            value="classes"
                            checked={structureType === 'classes'}
                            onChange={() => setStructureType('classes')}
                            className="w-5 h-5 border-neutral-700 bg-neutral-900 text-indigo-500 focus:ring-indigo-500"
                        />
                        <div>
                            <span className="text-gray-200 font-medium block">Por Clases</span>
                            <span className="text-sm text-gray-500">Permite crear y visualizar clases cronológicas. Ideal para cursos tradicionales.</span>
                        </div>
                    </label>

                    <label className={`flex items-center gap-3 p-3 bg-neutral-950 rounded border cursor-pointer transition-colors ${structureType === 'sprints' ? 'border-indigo-500 bg-neutral-900' : 'border-neutral-800 hover:border-neutral-700'}`}>
                        <input 
                            type="radio" 
                            name="structure_type"
                            value="sprints"
                            checked={structureType === 'sprints'}
                            onChange={() => setStructureType('sprints')}
                            className="w-5 h-5 border-neutral-700 bg-neutral-900 text-indigo-500 focus:ring-indigo-500"
                        />
                        <div>
                            <span className="text-gray-200 font-medium block">Por Sprints</span>
                            <span className="text-sm text-gray-500">Permite organizar el curso en sprints de trabajo. Ideal para aprendizaje basado en proyectos.</span>
                        </div>
                    </label>
                </div>

                <div className="flex flex-col gap-2 mt-2">
                    <label className="text-xs text-gray-500 font-medium uppercase tracking-wider">Funcionalidades Adicionales</label>
                    <label className={`flex items-center gap-3 p-3 bg-neutral-950 rounded border cursor-pointer transition-colors ${hasTeams ? 'border-indigo-500 bg-neutral-900' : 'border-neutral-800 hover:border-neutral-700'}`}>
                        <input 
                            type="checkbox" 
                            checked={hasTeams}
                            onChange={(e) => setHasTeams(e.target.checked)}
                            className="w-5 h-5 rounded border-neutral-700 bg-neutral-900 text-indigo-500 focus:ring-indigo-500"
                        />
                        <div>
                            <span className="text-gray-200 font-medium block">Habilitar Equipos</span>
                            <span className="text-sm text-gray-500">Permite agrupar a los estudiantes en equipos. Ideal para trabajos grupales.</span>
                        </div>
                    </label>
                </div>

                <div className="flex justify-end mt-2">
                    <button 
                        onClick={handleSave}
                        disabled={isSaving}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSaving ? 'Guardando...' : 'Guardar Configuración'}
                    </button>
                </div>
            </div>
        </div>
    )
}
