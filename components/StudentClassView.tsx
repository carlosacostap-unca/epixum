'use client'

import { useState } from 'react'
import StudentResourceList from './StudentResourceList'

interface ClassItem {
    id: string
    title: string
    description: string
    date: string
    sprint_id?: string | null
}

interface Sprint {
    id: string
    title: string
}

interface StudentClassViewProps {
    courseId: string
    classes: ClassItem[]
    sprints?: Sprint[]
}

export default function StudentClassView({ courseId, classes, sprints = [] }: StudentClassViewProps) {
    const [expandedClasses, setExpandedClasses] = useState<Record<string, boolean>>({})

    const toggleClass = (id: string) => {
        setExpandedClasses(prev => ({
            ...prev,
            [id]: !prev[id]
        }))
    }

    if (classes.length === 0) {
        return (
            <div className="text-center py-12 text-gray-500 bg-neutral-900/50 rounded-lg border border-neutral-800/50">
                No hay clases publicadas en este curso.
            </div>
        )
    }

    const getSprintTitle = (sprintId?: string | null) => {
        if (!sprintId) return null
        const sprint = sprints.find(s => s.id === sprintId)
        return sprint ? sprint.title : null
    }

    const formatDate = (dateString: string) => {
        const dateObj = new Date(dateString)
        const dayName = new Intl.DateTimeFormat('es-ES', { weekday: 'long' }).format(dateObj)
        const dayNameCapitalized = dayName.charAt(0).toUpperCase() + dayName.slice(1)
        
        const day = dateObj.getDate().toString().padStart(2, '0')
        const month = (dateObj.getMonth() + 1).toString().padStart(2, '0')
        const year = dateObj.getFullYear()
        const hours = dateObj.getHours().toString().padStart(2, '0')
        const minutes = dateObj.getMinutes().toString().padStart(2, '0')
        
        return `${dayNameCapitalized} ${day}/${month}/${year} a las ${hours}:${minutes} horas`
    }

    return (
        <div className="space-y-6">
            {classes.map((cls) => {
                const sprintTitle = getSprintTitle(cls.sprint_id)
                const isExpanded = expandedClasses[cls.id]

                return (
                    <div key={cls.id} className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
                        <div 
                            onClick={() => toggleClass(cls.id)}
                            className="p-4 md:p-6 cursor-pointer hover:bg-neutral-800/50 transition-colors flex justify-between items-start gap-4"
                        >
                            <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                    <span className="text-xs font-medium text-indigo-400 bg-indigo-900/30 px-2 py-1 rounded">
                                        Clase
                                    </span>
                                    {sprintTitle && (
                                        <span className="text-xs font-medium text-indigo-300 bg-indigo-900/50 px-2 py-1 rounded border border-indigo-800">
                                            {sprintTitle}
                                        </span>
                                    )}
                                    <span className="text-xs text-gray-500 whitespace-nowrap">
                                        {formatDate(cls.date)}
                                    </span>
                                </div>
                                <h3 className="text-lg md:text-xl font-bold text-gray-100 break-words">{cls.title}</h3>
                            </div>
                            <div className="text-gray-400 ml-0 md:ml-4 mt-1 flex-shrink-0">
                                {isExpanded ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                                )}
                            </div>
                        </div>
                        
                        {isExpanded && (
                            <div className={`px-6 pb-6 animate-in fade-in slide-in-from-top-2 duration-200 ${cls.description && cls.description.trim() !== '' ? 'border-t border-neutral-800 pt-6' : ''}`}>
                                {cls.description && cls.description.trim() !== '' && (
                                    <div className="prose prose-invert max-w-none mb-6 text-gray-400 text-sm">
                                        <p className="whitespace-pre-wrap">{cls.description}</p>
                                    </div>
                                )}

                                <StudentResourceList classId={cls.id} compact={!cls.description || cls.description.trim() === ''} />
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
    )
}
