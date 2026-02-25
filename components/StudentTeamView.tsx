'use client'

import TeamChat from './TeamChat'

import Link from 'next/link'

interface ProgressItem {
    assignment_id: string
    assignment_title: string
    status: string
    grade?: string
    submitted_at?: string
}

interface Member {
    id: string
    email: string
    first_name?: string
    last_name?: string
    avatar_url?: string
    progress?: ProgressItem[]
}

interface Team {
    id: string
    name: string
    members: Member[]
}

interface StudentTeamViewProps {
    courseId: string
    team: Team | null
    currentUserEmail: string
    subtitle?: string
    disableLinks?: boolean
}

export default function StudentTeamView({ 
    courseId, 
    team, 
    currentUserEmail,
    subtitle = "Tu equipo asignado",
    disableLinks = false
}: StudentTeamViewProps) {
    if (!team) {
        return (
            <div className="bg-neutral-900 rounded-lg p-8 border border-neutral-800 text-center">
                <div className="text-neutral-500 mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                </div>
                <h3 className="text-xl font-medium text-gray-300">Sin Equipo</h3>
                <p className="text-gray-500 mt-2">Aún no has sido asignado a ningún equipo en este curso.</p>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-8">
            {/* Header */}
            <div className="bg-neutral-900 rounded-lg p-4 md:p-6 border border-neutral-800">
                <h2 className="text-2xl font-bold text-indigo-400 mb-1">{team.name}</h2>
                <p className="text-gray-500 text-sm">{subtitle}</p>
            </div>

            {/* Members Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...team.members].sort((a, b) => {
                    if (a.email === currentUserEmail) return -1
                    if (b.email === currentUserEmail) return 1
                    return 0
                }).map((member) => {
                    const content = (
                        <div className="bg-neutral-900 rounded-lg border border-neutral-800 overflow-hidden flex items-center p-6 gap-4 hover:border-indigo-500/50 transition-colors h-full cursor-pointer">
                            <div className="h-16 w-16 rounded-full bg-indigo-900/50 flex items-center justify-center text-indigo-300 font-bold border border-indigo-500/30 text-2xl flex-shrink-0 overflow-hidden">
                                {member.avatar_url ? (
                                    <img src={member.avatar_url} alt={member.first_name || ''} className="h-full w-full object-cover" />
                                ) : (
                                    (member.first_name?.[0] || member.email[0]).toUpperCase()
                                )}
                            </div>
                            <div className="overflow-hidden">
                                <h4 className="font-bold text-gray-200 truncate text-lg">
                                    {member.first_name && member.last_name 
                                        ? `${member.first_name} ${member.last_name}`
                                        : member.email.split('@')[0]
                                    }
                                    {member.email === currentUserEmail && (
                                        <span className="ml-2 text-sm font-normal text-gray-500">(Tú)</span>
                                    )}
                                </h4>
                            </div>
                        </div>
                    )

                    if (disableLinks) {
                        return <div key={member.id || member.email} className="block h-full">{content}</div>
                    }

                    return (
                        <Link 
                            key={member.id || member.email} 
                            href={`/student/courses/${courseId}/team/${member.id}`}
                            className="block h-full transition-transform hover:scale-[1.02]"
                        >
                            {content}
                        </Link>
                    )
                })}
            </div>
            
            {/* Chat Section */}
            <div className="mt-8">
                <h3 className="text-xl font-bold text-gray-200 mb-4">Chat del Equipo</h3>
                <TeamChat 
                    teamId={team.id} 
                    currentUserEmail={currentUserEmail}
                    members={team.members}
                />
            </div>
        </div>
    )
}
