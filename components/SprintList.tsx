'use client'

import { useState, useEffect } from 'react'
import { getSprints } from '@/app/actions/sprints'
import StudentClassView from './StudentClassView'
import StudentAssignmentList from './StudentAssignmentList'

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

interface Assignment {
    id: string
    title: string
    description: string
    due_date: string
    sprint_id?: string | null
}

interface Submission {
    id: string
    assignment_id: string
    content: string
    file_url: string
    grade: string
    feedback: string
    submitted_at: string
}

export default function SprintList({ 
    courseId, 
    initialSprints = [], 
    classes = [],
    assignments = [],
    initialSubmissions = []
}: { 
    courseId: string, 
    initialSprints?: Sprint[],
    classes?: ClassItem[],
    assignments?: Assignment[],
    initialSubmissions?: Submission[]
}) {
    const [sprints, setSprints] = useState<Sprint[]>(initialSprints)
    const [selectedSprintId, setSelectedSprintId] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<'classes' | 'assignments'>('classes')
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
    const filteredAssignments = selectedSprint ? assignments.filter(a => a.sprint_id === selectedSprint.id) : []

    // Format dates for display (YYYY-MM-DD -> DD/MM/YYYY)
    const formatDate = (dateStr: string) => {
        if (!dateStr) return ''
        const [year, month, day] = dateStr.split('-')
        return `${day}/${month}/${year}`
    }

    return (
        <div className="w-full">
            
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
                                className={`px-4 py-3 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex flex-col items-start gap-1 min-w-[140px] ${
                                    selectedSprintId === sprint.id
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-neutral-900 text-gray-400 hover:text-gray-200 hover:bg-neutral-800'
                                }`}
                            >
                                <span className="font-bold text-base">{sprint.title}</span>
                                <span className={`text-xs ${selectedSprintId === sprint.id ? 'text-indigo-200' : 'text-gray-500'}`}>
                                    {formatDate(sprint.start_date)} - {formatDate(sprint.end_date)}
                                </span>
                            </button>
                        ))}
                    </div>

                    {/* Selected Sprint Content */}
                    {selectedSprint && (
                        <div className="space-y-6">
                            {/* Sub Tabs */}
                            <div className="flex border-b border-neutral-800">
                                <button
                                    onClick={() => setActiveTab('classes')}
                                    className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                                        activeTab === 'classes' 
                                            ? 'border-indigo-500 text-indigo-400' 
                                            : 'border-transparent text-gray-400 hover:text-gray-200'
                                    }`}
                                >
                                    Clases
                                </button>
                                <button
                                    onClick={() => setActiveTab('assignments')}
                                    className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                                        activeTab === 'assignments' 
                                            ? 'border-indigo-500 text-indigo-400' 
                                            : 'border-transparent text-gray-400 hover:text-gray-200'
                                    }`}
                                >
                                    Trabajos Prácticos
                                </button>
                            </div>

                            {/* Tab Content */}
                            {activeTab === 'classes' && (
                                <div className="pt-2">
                                    {filteredClasses.length > 0 ? (
                                        <StudentClassView courseId={courseId} classes={filteredClasses} sprints={sprints} />
                                    ) : (
                                        <div className="text-center py-12 text-gray-500 bg-neutral-900/50 rounded-lg border border-neutral-800/50">
                                            No hay clases publicadas en este sprint.
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'assignments' && (
                                <div className="pt-2">
                                    {filteredAssignments.length > 0 ? (
                                        <StudentAssignmentList 
                                            courseId={courseId} 
                                            assignments={filteredAssignments} 
                                            initialSubmissions={initialSubmissions}
                                            hasSprints={true}
                                        />
                                    ) : (
                                        <div className="text-center py-12 text-gray-500 bg-neutral-900/50 rounded-lg border border-neutral-800/50">
                                            No hay trabajos prácticos asignados en este sprint.
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
