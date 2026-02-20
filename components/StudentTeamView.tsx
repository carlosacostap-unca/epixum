'use client'

import TeamChat from './TeamChat'

interface ProgressItem {
    assignment_id: string
    assignment_title: string
    status: string
    grade?: string
    submitted_at?: string
}

interface Member {
    email: string
    first_name?: string
    last_name?: string
    progress?: ProgressItem[]
}

interface Team {
    id: string
    name: string
    members: Member[]
}

interface StudentTeamViewProps {
    team: Team | null
    currentUserEmail: string
}

export default function StudentTeamView({ team, currentUserEmail }: StudentTeamViewProps) {
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
                <p className="text-gray-500 text-sm">Tu equipo asignado</p>
            </div>

            {/* Members Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {team.members.map((member) => (
                    <div key={member.email} className="bg-neutral-900 rounded-lg border border-neutral-800 overflow-hidden flex flex-col h-full">
                        {/* Member Header */}
                        <div className="p-4 bg-neutral-800/50 border-b border-neutral-800 flex items-center gap-4">
                            <div className="h-12 w-12 rounded-full bg-indigo-900/50 flex items-center justify-center text-indigo-300 font-bold border border-indigo-500/30 text-lg flex-shrink-0">
                                {(member.first_name?.[0] || member.email[0]).toUpperCase()}
                            </div>
                            <div className="overflow-hidden">
                                <h4 className="font-bold text-gray-200 truncate text-lg">
                                    {member.first_name && member.last_name 
                                        ? `${member.first_name} ${member.last_name}`
                                        : member.email.split('@')[0]
                                    }
                                </h4>
                                <p className="text-xs text-gray-500 truncate">{member.email}</p>
                            </div>
                        </div>

                        {/* Progress Section */}
                        <div className="p-4 flex-1">
                            <h5 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Progreso Académico</h5>
                            <div className="space-y-2">
                                {member.progress && member.progress.length > 0 ? (
                                    member.progress.map((item) => (
                                        <div key={item.assignment_id} className="flex justify-between items-center text-sm">
                                            <span className="text-gray-300 truncate pr-2 flex-1" title={item.assignment_title}>
                                                {item.assignment_title}
                                            </span>
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-medium border whitespace-nowrap ${
                                                item.status === 'Calificado' 
                                                    ? 'bg-green-900/30 text-green-400 border-green-900'
                                                    : item.status === 'Entregado'
                                                        ? 'bg-indigo-900/30 text-indigo-400 border-indigo-900'
                                                        : 'bg-neutral-800 text-gray-500 border-neutral-700'
                                            }`}>
                                                {item.status} {item.grade && `(${item.grade})`}
                                            </span>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-gray-600 text-xs italic">Sin trabajos asignados</p>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Chat Section */}
            <div className="w-full">
                <TeamChat teamId={team.id} currentUserEmail={currentUserEmail} />
            </div>
        </div>
    )
}
