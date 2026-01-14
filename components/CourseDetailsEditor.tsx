'use client'

import { useState } from 'react'
import { updateCourseDetails } from '@/app/actions/courses'
import CourseStatusSelector from './CourseStatusSelector'
import { toLocalISOString, formatDateForDisplay, toUTC, toLocalDateInputValue } from '@/utils/date'

interface Course {
    id: string
    name: string
    description: string | null
    status?: string
    start_date?: string | null
    end_date?: string | null
}

export default function CourseDetailsEditor({ course }: { course: Course }) {
    const [isEditing, setIsEditing] = useState(false)
    const [name, setName] = useState(course.name)
    const [description, setDescription] = useState(course.description || '')
    const [startDate, setStartDate] = useState(toLocalDateInputValue(course.start_date))
    const [endDate, setEndDate] = useState(toLocalDateInputValue(course.end_date))
    const [isSaving, setIsSaving] = useState(false)

    const handleSave = async () => {
        if (!startDate || !endDate) {
            alert('Las fechas de inicio y fin son obligatorias')
            return
        }
        setIsSaving(true)
        const result = await updateCourseDetails(course.id, { 
            name, 
            description,
            start_date: toUTC(startDate + 'T00:00'),
            end_date: toUTC(endDate + 'T23:59:59')
        })
        setIsSaving(false)
        if (result.success) {
            setIsEditing(false)
        } else {
            alert('Error al actualizar el curso: ' + result.error)
        }
    }

    if (isEditing) {
        return (
            <div className="flex flex-col gap-3 max-w-2xl">
                <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-500 uppercase">Nombre del Curso</label>
                    <input 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="bg-neutral-800 border border-neutral-700 rounded p-2 text-white text-xl font-bold focus:border-indigo-500 outline-none"
                    />
                </div>
                <div className="flex gap-4">
                    <div className="flex-1 flex flex-col gap-1">
                        <label className="text-xs text-gray-500 uppercase">Fecha Inicio</label>
                        <input 
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="bg-neutral-800 border border-neutral-700 rounded p-2 text-white focus:border-indigo-500 outline-none"
                        />
                    </div>
                    <div className="flex-1 flex flex-col gap-1">
                        <label className="text-xs text-gray-500 uppercase">Fecha Fin</label>
                        <input 
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="bg-neutral-800 border border-neutral-700 rounded p-2 text-white focus:border-indigo-500 outline-none"
                        />
                    </div>
                </div>
                <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-500 uppercase">Descripción</label>
                    <textarea 
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="bg-neutral-800 border border-neutral-700 rounded p-2 text-gray-300 focus:border-indigo-500 outline-none resize-none h-24"
                    />
                </div>
                <div className="flex gap-2 mt-2">
                    <button 
                        onClick={handleSave}
                        disabled={isSaving}
                        className="bg-indigo-600 text-white px-4 py-1.5 rounded text-sm hover:bg-indigo-700 disabled:opacity-50"
                    >
                        {isSaving ? 'Guardando...' : 'Guardar'}
                    </button>
                    <button 
                        onClick={() => {
                            setIsEditing(false)
                            setName(course.name)
                            setDescription(course.description || '')
                            setStartDate(toLocalDateInputValue(course.start_date))
                            setEndDate(toLocalDateInputValue(course.end_date))
                        }}
                        disabled={isSaving}
                        className="bg-neutral-800 text-gray-300 px-4 py-1.5 rounded text-sm hover:bg-neutral-700 border border-neutral-700"
                    >
                        Cancelar
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div>
            <div className="flex items-center gap-3 group">
                <h1 className="text-3xl font-bold text-gray-100">{course.name}</h1>
                <CourseStatusSelector courseId={course.id} initialStatus={course.status || 'Borrador'} />
                <button 
                    onClick={() => setIsEditing(true)}
                    className="text-gray-500 hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Editar curso"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                    </svg>
                </button>
            </div>
            <div className="flex gap-4 text-xs text-gray-400 mt-2">
                <div>
                    <span className="font-semibold text-gray-500 uppercase mr-2">Inicio:</span>
                    {formatDateForDisplay(course.start_date, 'dd/MM/yyyy')}
                </div>
                <div>
                    <span className="font-semibold text-gray-500 uppercase mr-2">Fin:</span>
                    {formatDateForDisplay(course.end_date, 'dd/MM/yyyy')}
                </div>
            </div>
            <p className="text-gray-500 mt-1">{course.description || 'Sin descripción'}</p>
        </div>
    )
}
