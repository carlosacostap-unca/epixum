'use client'

import { useState, useEffect } from 'react'
import { createTeam, deleteTeam, assignStudentToTeam, removeStudentFromTeam, getTeams } from '@/app/actions/teams'
import { getCourseStudentsForTeacher } from '@/app/actions/courses'
import TeamChat from './TeamChat'

type Team = {
    id: string
    name: string
    course_id: string
}

type Student = {
    email: string
    first_name?: string
    last_name?: string
    team_id: string | null
    dni?: string
    phone?: string
    birth_date?: string
    avatar_url?: string
}

export default function TeamManagement({ 
    courseId, 
    initialTeams = [], 
    initialStudents = [],
    currentUserEmail
}: { 
    courseId: string, 
    initialTeams?: Team[],
    initialStudents?: Student[],
    currentUserEmail: string
}) {
    const [teams, setTeams] = useState<Team[]>(initialTeams)
    const [students, setStudents] = useState<Student[]>(initialStudents)
    const [isCreating, setIsCreating] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [isAddingMember, setIsAddingMember] = useState<string | null>(null) // teamId
    const [selectedTeamForDetail, setSelectedTeamForDetail] = useState<Team | null>(null)
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)

    useEffect(() => {
        if (initialTeams.length === 0 || initialStudents.length === 0) {
            refreshData()
        }
    }, [])

    async function refreshData() {
        const [teamsResult, studentsResult] = await Promise.all([
            getTeams(courseId),
            getCourseStudentsForTeacher(courseId)
        ])
        
        if (teamsResult.success && teamsResult.data) {
            setTeams(teamsResult.data)
        }
        if (studentsResult.success && studentsResult.data) {
            setStudents(studentsResult.data)
        }
    }

    async function handleCreateTeam(formData: FormData) {
        setIsLoading(true)
        const result = await createTeam(formData)
        setIsLoading(false)
        if (result.success) {
            setIsCreating(false)
            refreshData()
        } else {
            alert(result.error)
        }
    }

    async function handleDeleteTeam(teamId: string) {
        if (!confirm('¿Estás seguro de eliminar este equipo?')) return
        const result = await deleteTeam(teamId, courseId)
        if (result.success) {
            refreshData()
        } else {
            alert(result.error)
        }
    }

    async function handleAddMember(teamId: string, email: string) {
        const result = await assignStudentToTeam(courseId, email, teamId)
        if (result.success) {
            setIsAddingMember(null)
            refreshData()
        } else {
            alert(result.error)
        }
    }

    async function handleRemoveMember(email: string) {
        if (!confirm('¿Quitar estudiante del equipo?')) return
        const result = await removeStudentFromTeam(courseId, email)
        if (result.success) {
            refreshData()
        } else {
            alert(result.error)
        }
    }

    const unassignedStudents = students.filter(s => !s.team_id)

    return (
        <div className="w-full space-y-8">
            {selectedTeamForChat && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-neutral-900 border border-neutral-800 rounded-lg w-full max-w-2xl flex flex-col max-h-[90vh] shadow-2xl">
                        <div className="p-4 border-b border-neutral-800 flex justify-between items-center bg-neutral-900 rounded-t-lg">
                            <h3 className="font-bold text-gray-100 flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-indigo-400">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                                </svg>
                                Chat: {selectedTeamForChat.name}
                            </h3>
                            <button onClick={() => setSelectedTeamForChat(null)} className="text-gray-500 hover:text-white transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="flex-1 overflow-hidden p-1">
                            <TeamChat 
                                teamId={selectedTeamForChat.id} 
                                currentUserEmail={currentUserEmail}
                                members={students.filter(s => s.team_id === selectedTeamForChat.id)}
                            />
                        </div>
                    </div>
                </div>
            )}

            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-100">Gestión de Equipos</h2>
                <button 
                    onClick={() => setIsCreating(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                    + Nuevo Equipo
                </button>
            </div>

            {isCreating && (
                <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
                    <h3 className="text-lg font-bold text-gray-100 mb-4">Crear Nuevo Equipo</h3>
                    <form action={handleCreateTeam} className="flex flex-col gap-4">
                        <input type="hidden" name="courseId" value={courseId} />
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Nombre del Equipo</label>
                            <input 
                                name="name"
                                placeholder="Ej: Equipo Alpha"
                                className="bg-neutral-950 border border-neutral-700 rounded px-3 py-2 text-sm text-white w-full focus:outline-none focus:border-indigo-500"
                                required
                            />
                        </div>
                        <div className="flex gap-2">
                            <button 
                                type="submit"
                                disabled={isLoading}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold py-2 px-4 rounded disabled:opacity-50"
                            >
                                {isLoading ? 'Creando...' : 'Crear'}
                            </button>
                            <button 
                                type="button"
                                onClick={() => setIsCreating(false)}
                                className="bg-neutral-700 hover:bg-neutral-600 text-gray-300 text-sm font-bold py-2 px-4 rounded"
                            >
                                Cancelar
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {teams.map(team => {
                    const members = students.filter(s => s.team_id === team.id)
                    return (
                        <div key={team.id} className="bg-neutral-900 border border-neutral-800 rounded-lg p-6 flex flex-col gap-4">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-3">
                                    <h3 className="text-lg font-bold text-gray-100">{team.name}</h3>
                                    <button
                                        onClick={() => setSelectedTeamForDetail(team)}
                                        className="text-indigo-400 hover:text-indigo-300 p-1.5 rounded hover:bg-indigo-900/30 transition-colors flex items-center gap-1 text-xs font-medium border border-indigo-500/30"
                                        title="Ver integrantes y chat"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        Ver Equipo
                                    </button>
                                </div>
                                <button 
                                    onClick={() => handleDeleteTeam(team.id)}
                                    className="text-gray-500 hover:text-red-400 p-1 rounded hover:bg-neutral-800 transition-colors"
                                    title="Eliminar Equipo"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                    </svg>
                                </button>
                            </div>

                            <div className="space-y-2">
                                <h4 className="text-xs text-gray-500 font-medium uppercase tracking-wider">Miembros</h4>
                                {members.length === 0 ? (
                                    <p className="text-sm text-gray-600 italic">Sin miembros</p>
                                ) : (
                                    <ul className="space-y-2">
                                        {members.map(member => (
                                            <li key={member.email} className="flex justify-between items-center bg-neutral-950 p-2 rounded border border-neutral-800">
                                                <span 
                                                    className="text-sm font-medium text-gray-200 cursor-pointer hover:text-indigo-400 transition-colors"
                                                    onClick={() => setSelectedStudent(member)}
                                                >
                                                    {member.first_name || member.last_name 
                                                        ? `${member.last_name || ''}, ${member.first_name || ''}`.trim().replace(/^, /, '').replace(/, $/, '')
                                                        : member.email}
                                                </span>
                                                <button 
                                                    onClick={() => handleRemoveMember(member.email)}
                                                    className="text-gray-600 hover:text-red-400"
                                                    title="Quitar del equipo"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>

                            <div className="mt-auto pt-4 border-t border-neutral-800">
                                {isAddingMember === team.id ? (
                                    <div className="space-y-2">
                                        <select 
                                            className="w-full bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-indigo-500"
                                            onChange={(e) => {
                                                if (e.target.value) handleAddMember(team.id, e.target.value)
                                            }}
                                            defaultValue=""
                                        >
                                            <option value="" disabled>Seleccionar estudiante...</option>
                                            {unassignedStudents.map(s => (
                                                <option key={s.email} value={s.email}>
                                                    {s.first_name || s.last_name 
                                                        ? `${s.last_name || ''}, ${s.first_name || ''} (${s.email})`
                                                        : s.email}
                                                </option>
                                            ))}
                                        </select>
                                        <button 
                                            onClick={() => setIsAddingMember(null)}
                                            className="text-xs text-gray-500 hover:text-gray-300 w-full text-center"
                                        >
                                            Cancelar
                                        </button>
                                    </div>
                                ) : (
                                    <button 
                                        onClick={() => setIsAddingMember(team.id)}
                                        className="w-full py-2 border border-dashed border-neutral-700 rounded text-sm text-gray-400 hover:text-white hover:border-gray-500 transition-colors"
                                    >
                                        + Añadir Miembro
                                    </button>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>

            {teams.length === 0 && !isCreating && (
                <div className="text-center py-12 text-gray-500 bg-neutral-900/50 rounded-lg border border-neutral-800 border-dashed">
                    No hay equipos creados aún.
                </div>
            )}

            {selectedStudent && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={() => setSelectedStudent(null)}>
                    <div className="bg-neutral-900 border border-neutral-800 rounded-lg w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-neutral-800 flex justify-between items-center bg-neutral-900">
                            <h3 className="font-bold text-gray-100">Detalles del Estudiante</h3>
                            <button onClick={() => setSelectedStudent(null)} className="text-gray-500 hover:text-white transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-16 h-16 rounded-full bg-neutral-800 flex items-center justify-center overflow-hidden border border-neutral-700 shrink-0">
                                    {selectedStudent.avatar_url ? (
                                        <img src={selectedStudent.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-2xl font-bold text-gray-500">
                                            {(selectedStudent.first_name?.[0] || selectedStudent.email[0]).toUpperCase()}
                                        </span>
                                    )}
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-white">
                                        {selectedStudent.first_name} {selectedStudent.last_name}
                                    </h2>
                                    <p className="text-indigo-400 text-sm">{selectedStudent.email}</p>
                                </div>
                            </div>
                            
                            <div className="space-y-3">
                                <div className="bg-neutral-950 p-3 rounded border border-neutral-800">
                                    <label className="text-xs text-gray-500 block mb-1">DNI</label>
                                    <p className="text-gray-200">{selectedStudent.dni || 'No registrado'}</p>
                                </div>
                                <div className="bg-neutral-950 p-3 rounded border border-neutral-800">
                                    <label className="text-xs text-gray-500 block mb-1">Teléfono</label>
                                    <p className="text-gray-200">{selectedStudent.phone || 'No registrado'}</p>
                                </div>
                                <div className="bg-neutral-950 p-3 rounded border border-neutral-800">
                                    <label className="text-xs text-gray-500 block mb-1">Fecha de Nacimiento</label>
                                    <p className="text-gray-200">
                                        {selectedStudent.birth_date 
                                            ? new Date(selectedStudent.birth_date).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })
                                            : 'No registrada'}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 border-t border-neutral-800 bg-neutral-900/50 flex justify-end">
                            <button 
                                onClick={() => setSelectedStudent(null)}
                                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded text-sm font-medium transition-colors"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
