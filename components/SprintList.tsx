'use client'

import { useState, useEffect } from 'react'
import { getSprints } from '@/app/actions/sprints'
import StudentClassView from './StudentClassView'

type Sprint = {
    id: string
    title: string
    description: string | null
    start_date: string
    end_date: string
}

interface ClassItem {
    id: string
    title: string
    description: string
    date: string
    sprint_id?: string | null
}

export default function SprintList({ 
    courseId, 
    initialSprints = [], 
    classes = [] 
}: { 
    courseId: string, 
    initialSprints?: Sprint[],
    classes?: ClassItem[]
}) {
    const [sprints, setSprints] = useState<Sprint[]>(initialSprints)
    const [selectedSprintId, setSelectedSprintId] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        if (initialSprints.length === 0) {
            loadSprints()
        } else {
            setSprints(initialSprints)
            // Select first sprint by default if none selected and sprints exist
            if (initialSprints.length > 0 && !selectedSprintId) {
                setSelectedSprintId(initialSprints[0].id)
            }
        }
    }, [initialSprints])

    async function loadSprints() {
        setIsLoading(true)
        const result = await getSprints(courseId)
        if (result.success && result.data) {
            setSprints(result.data)
            if (result.data.length > 0 && !selectedSprintId) {
                setSelectedSprintId(result.data[0].id)
            }
        }
        setIsLoading(false)
    }

    const selectedSprint = sprints.find(s => s.id === selectedSprintId)
    const filteredClasses = selectedSprint ? classes.filter(c => c.sprint_id === selectedSprint.id) : []

    // Format dates for display (YYYY-MM-DD -> DD/MM/YYYY)
    const formatDate = (dateStr: string) => {
        if (!dateStr) return ''
        const [year, month, day] = dateStr.split('-')
        return `${day}/${month}/${year}`
    }

    return (
        <div className="w-full">
            <h2 className="text-xl font-bold text-gray-100 mb-6">Sprints</h2>
            
            {sprints.length === 0 ? (
                <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-8 text-center">
                    <div className="w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-600">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2v4"></path>
                            <path d="M12 18v4"></path>
                            <path d="M4.93 4.93l2.83 2.83"></path>
                            <path d="M16.24 16.24l2.83 2.83"></path>
                            <path d="M2 12h4"></path>
                            <path d="M18 12h4"></path>
                            <path d="M4.93 19.07l2.83-2.83"></path>
                            <path d="M16.24 7.76l2.83-2.83"></path>
                        </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-300 mb-2">Sprints del Curso</h3>
                    <p className="text-gray-500 max-w-md mx-auto">
                        No hay sprints publicados actualmente.
                    </p>
                </div>
            ) : (
                <>
                    {/* Sprint Tabs */}
                    <div className="flex gap-2 overflow-x-auto pb-4 mb-6 border-b border-neutral-800 scrollbar-thin scrollbar-thumb-neutral-700">
                        {sprints.map(sprint => (
                            <button
                                key={sprint.id}
                                onClick={() => setSelectedSprintId(sprint.id)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                                    selectedSprintId === sprint.id
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-neutral-900 text-gray-400 hover:text-gray-200 hover:bg-neutral-800'
                                }`}
                            >
                                {sprint.title}
                            </button>
                        ))}
                    </div>

                    {/* Selected Sprint Content */}
                    {selectedSprint && (
                        <div className="space-y-6">
                            <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 md:p-6">
                                <h3 className="text-xl md:text-2xl font-bold text-white mb-2">{selectedSprint.title}</h3>
                                {selectedSprint.description && (
                                    <p className="text-gray-400 mb-4 text-sm md:text-base">{selectedSprint.description}</p>
                                )}
                                
                                <div className="flex flex-col sm:flex-row gap-3 sm:gap-6 text-sm text-gray-500 font-mono bg-black/20 p-3 rounded-md border border-neutral-800/50 w-full sm:w-auto">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                                        <span>Inicio: {formatDate(selectedSprint.start_date)}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                                        <span>Fin: {formatDate(selectedSprint.end_date)}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4">
                                <h4 className="text-lg font-semibold text-gray-200 mb-4">Clases y Recursos</h4>
                                {filteredClasses.length > 0 ? (
                                    <StudentClassView courseId={courseId} classes={filteredClasses} sprints={sprints} />
                                ) : (
                                    <div className="text-center py-12 text-gray-500 bg-neutral-900/50 rounded-lg border border-neutral-800/50">
                                        No hay clases publicadas en este sprint.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
