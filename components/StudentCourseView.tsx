'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import StudentClassView from './StudentClassView'
import StudentAssignmentList from './StudentAssignmentList'
import SprintList from './SprintList'
import StudentTeamView from './StudentTeamView'
import StudentReviewManagement from './StudentReviewManagement'
import CourseQueriesTab from './CourseQueriesTab'

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
    const searchParams = useSearchParams()
    const router = useRouter()
    const pathname = usePathname()
    const tabParam = searchParams.get('tab')
    
    const defaultTab = tabParam || (hasSprints ? 'sprints' : (hasClasses ? 'classes' : 'assignments'))
    const [activeTab, setActiveTab] = useState<string>(defaultTab)

    const handleTabChange = (tab: string) => {
        setActiveTab(tab)
        const params = new URLSearchParams(searchParams.toString())
        params.set('tab', tab)
        // Update URL without reloading the page
        router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    }

    return (
        <div>
            <div className="flex border-b border-neutral-800 mb-6 overflow-x-auto">
                {hasSprints ? (
                    <>
                        <button
                            onClick={() => handleTabChange('sprints')}
                            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
                                activeTab === 'sprints' 
                                    ? 'border-indigo-500 text-indigo-400' 
                                    : 'border-transparent text-gray-400 hover:text-gray-200'
                            }`}
                        >
                            Sprints
                        </button>

                        {hasTeams && (
                            <button
                                onClick={() => handleTabChange('teams')}
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
                            onClick={() => handleTabChange('reviews')}
                            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
                                activeTab === 'reviews' 
                                    ? 'border-indigo-500 text-indigo-400' 
                                    : 'border-transparent text-gray-400 hover:text-gray-200'
                            }`}
                        >
                            Revisiones
                        </button>
                    </>
                ) : (
                    <>
                        {hasClasses && (
                            <button
                                onClick={() => handleTabChange('classes')}
                                className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
                                    activeTab === 'classes' 
                                        ? 'border-indigo-500 text-indigo-400' 
                                        : 'border-transparent text-gray-400 hover:text-gray-200'
                                }`}
                            >
                                Clases
                            </button>
                        )}
                        
                        {hasTeams && (
                            <button
                                onClick={() => handleTabChange('teams')}
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
                            onClick={() => handleTabChange('assignments')}
                            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
                                activeTab === 'assignments' 
                                    ? 'border-indigo-500 text-indigo-400' 
                                    : 'border-transparent text-gray-400 hover:text-gray-200'
                            }`}
                        >
                            Trabajos Prácticos
                        </button>
                    </>
                )}

                <button
                    onClick={() => handleTabChange('queries')}
                    className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
                        activeTab === 'queries' 
                            ? 'border-indigo-500 text-indigo-400' 
                            : 'border-transparent text-gray-400 hover:text-gray-200'
                    }`}
                >
                    Consultas
                </button>
            </div>

            {activeTab === 'classes' && hasClasses && !hasSprints && (
                <StudentClassView courseId={courseId} classes={classes} sprints={initialSprints} />
            )}
            
            {activeTab === 'sprints' && hasSprints && (
                <SprintList 
                    courseId={courseId} 
                    initialSprints={initialSprints} 
                    classes={classes}
                    assignments={assignments}
                    initialSubmissions={initialSubmissions}
                />
            )}

            {activeTab === 'reviews' && hasSprints && (
                <StudentReviewManagement 
                    courseId={courseId} 
                    currentUserEmail={currentUserEmail}
                    sprints={initialSprints}
                />
            )}

            {activeTab === 'teams' && hasTeams && (
                <StudentTeamView 
                    courseId={courseId}
                    team={initialTeam} 
                    currentUserEmail={currentUserEmail} 
                />
            )}

            {activeTab === 'assignments' && !hasSprints && (
                <StudentAssignmentList 
                    courseId={courseId} 
                    assignments={assignments} 
                    initialSubmissions={initialSubmissions}
                    hasSprints={hasSprints}
                />
            )}

            {activeTab === 'queries' && (
                <CourseQueriesTab
                    courseId={courseId}
                    classes={classes}
                    assignments={assignments}
                    currentUserEmail={currentUserEmail}
                    isTeacher={false}
                />
            )}
        </div>
    )
}
