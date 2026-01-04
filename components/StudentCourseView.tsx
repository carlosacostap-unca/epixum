'use client'

import { useState } from 'react'
import StudentClassView from './StudentClassView'
import StudentAssignmentList from './StudentAssignmentList'
import SprintList from './SprintList'
import StudentTeamView from './StudentTeamView'

interface ClassItem {
    id: string
    title: string
    description: string
    date: string
}

interface Assignment {
    id: string
    title: string
    description: string
    due_date: string
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

interface StudentCourseViewProps {
    courseId: string
    classes: ClassItem[]
    assignments: Assignment[]
    initialSubmissions: Submission[]
    initialSprints?: any[]
    initialTeam?: any
    hasClasses?: boolean
    hasSprints?: boolean
    hasTeams?: boolean
    currentUserEmail: string
}

export default function StudentCourseView({ 
    courseId, 
    classes, 
    assignments, 
    initialSubmissions,
    initialSprints = [],
    initialTeam = null,
    hasClasses = true,
    hasSprints = false,
    hasTeams = false,
    currentUserEmail
}: StudentCourseViewProps) {
    // Determine default active tab
    const defaultTab = hasClasses ? 'classes' : (hasSprints ? 'sprints' : 'assignments')
    const [activeTab, setActiveTab] = useState<string>(defaultTab)

    return (
        <div>
            <div className="flex border-b border-neutral-800 mb-6 overflow-x-auto">
                {hasClasses && (
                    <button
                        onClick={() => setActiveTab('classes')}
                        className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
                            activeTab === 'classes' 
                                ? 'border-indigo-500 text-indigo-400' 
                                : 'border-transparent text-gray-400 hover:text-gray-200'
                        }`}
                    >
                        Clases
                    </button>
                )}
                {hasSprints && (
                    <button
                        onClick={() => setActiveTab('sprints')}
                        className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
                            activeTab === 'sprints' 
                                ? 'border-indigo-500 text-indigo-400' 
                                : 'border-transparent text-gray-400 hover:text-gray-200'
                        }`}
                    >
                        Sprints
                    </button>
                )}
                {hasTeams && (
                    <button
                        onClick={() => setActiveTab('teams')}
                        className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
                            activeTab === 'teams' 
                                ? 'border-indigo-500 text-indigo-400' 
                                : 'border-transparent text-gray-400 hover:text-gray-200'
                        }`}
                    >
                        Equipo
                    </button>
                )}
                <button
                    onClick={() => setActiveTab('assignments')}
                    className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
                        activeTab === 'assignments' 
                            ? 'border-indigo-500 text-indigo-400' 
                            : 'border-transparent text-gray-400 hover:text-gray-200'
                    }`}
                >
                    Trabajos Prácticos
                </button>
            </div>

            {activeTab === 'classes' && hasClasses && (
                <StudentClassView courseId={courseId} classes={classes} />
            )}
            
            {activeTab === 'sprints' && hasSprints && (
                <SprintList courseId={courseId} initialSprints={initialSprints} />
            )}

            {activeTab === 'teams' && hasTeams && (
                <StudentTeamView team={initialTeam} currentUserEmail={currentUserEmail} />
            )}

            {activeTab === 'assignments' && (
                <StudentAssignmentList 
                    courseId={courseId} 
                    assignments={assignments} 
                    initialSubmissions={initialSubmissions}
                />
            )}
        </div>
    )
}
