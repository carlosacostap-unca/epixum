'use client'

import TeamChat from './TeamChat'

interface Member {
    email: string
    first_name?: string
    last_name?: string
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
        <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 flex flex-col gap-6">
                    <div className="bg-neutral-900 rounded-lg p-6 border border-neutral-800">
                        <h2 className="text-2xl font-bold text-indigo-400 mb-1">{team.name}</h2>
                        <p className="text-gray-500 text-sm">Tu equipo asignado</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {team.members.map((member) => (
                            <div key={member.email} className="bg-neutral-900 p-4 rounded-lg border border-neutral-800 flex items-center gap-4">
                                <div className="h-10 w-10 rounded-full bg-indigo-900/50 flex items-center justify-center text-indigo-300 font-bold border border-indigo-500/30">
                                    {(member.first_name?.[0] || member.email[0]).toUpperCase()}
                                </div>
                                <div className="overflow-hidden">
                                    <h4 className="font-medium text-gray-200 truncate">
                                        {member.first_name && member.last_name 
                                            ? `${member.first_name} ${member.last_name}`
                                            : member.email.split('@')[0]
                                        }
                                    </h4>
                                    <p className="text-xs text-gray-500 truncate">{member.email}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="lg:col-span-1">
                    <TeamChat teamId={team.id} currentUserEmail={currentUserEmail} />
                </div>
            </div>
        </div>
    )
}
