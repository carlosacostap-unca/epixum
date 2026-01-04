'use client'

import { useState } from 'react'
import ClassManagement from './ClassManagement'
import AssignmentManagement from './AssignmentManagement'
import TeacherStudentManagement from './TeacherStudentManagement'
import SprintManagement from './SprintManagement'
import SprintReviewManagement from './SprintReviewManagement'
import TeamManagement from './TeamManagement'

interface TeacherCourseViewProps {
    courseId: string
    initialClasses: any[]
    initialAssignments: any[]
    initialStudents: any[]
    initialSprints?: any[]
    initialTeams?: any[]
    initialTeamStudents?: any[]
    hasClasses?: boolean
    hasSprints?: boolean
    hasTeams?: boolean
    currentUserEmail: string
}

export default function TeacherCourseView({ 
    courseId, 
    initialClasses, 
    initialAssignments, 
    initialStudents,
    initialSprints = [],
    initialTeams = [],
    initialTeamStudents = [],
    hasClasses = true,
    hasSprints = false,
    hasTeams = false,
    currentUserEmail
}: TeacherCourseViewProps) {
    // Determine default active tab
    const defaultTab = hasClasses ? 'classes' : (hasSprints ? 'sprints' : (hasTeams ? 'teams' : 'assignments'))
    const [activeTab, setActiveTab] = useState<string>(defaultTab)

    return (
        <div className="w-full">
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
                        Equipos
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
                <button
                    onClick={() => setActiveTab('students')}
                    className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
                        activeTab === 'students' 
                            ? 'border-indigo-500 text-indigo-400' 
                            : 'border-transparent text-gray-400 hover:text-gray-200'
                    }`}
                >
                    Estudiantes
                </button>
            </div>

            {activeTab === 'classes' && hasClasses && (
                <ClassManagement 
                    courseId={courseId}
                    initialClasses={initialClasses}
                />
            )}
            
            {activeTab === 'sprints' && hasSprints && (
                <SprintManagement
                    courseId={courseId}
                    initialSprints={initialSprints}
                />
            )}

            {activeTab === 'reviews' && hasSprints && (
                <SprintReviewManagement
                    courseId={courseId}
                    sprints={initialSprints}
                    students={initialTeamStudents}
                />
            )}

            {activeTab === 'teams' && hasTeams && (
                <TeamManagement 
                    courseId={courseId} 
                    initialTeams={initialTeams} 
                    initialStudents={initialTeamStudents}
                    currentUserEmail={currentUserEmail}
                />
            )}

            {activeTab === 'assignments' && (
                <AssignmentManagement 
                    courseId={courseId}
                    initialAssignments={initialAssignments}
                />
            )}
            
            {activeTab === 'students' && (
                <TeacherStudentManagement
                    courseId={courseId}
                    initialStudents={initialStudents}
                />
            )}
        </div>
    )
}
