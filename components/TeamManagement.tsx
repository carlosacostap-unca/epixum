'use client'

import { useState, useEffect } from 'react'
import { createTeam, deleteTeam, assignStudentToTeam, removeStudentFromTeam, getTeams } from '@/app/actions/teams'
import { getCourseStudentsForTeacher } from '@/app/actions/courses'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import TeamChat from './TeamChat'
import StudentTeamView from './StudentTeamView'

type Team = {
    id: string
    name: string
    course_id: string
}

type Student = {
    id: string
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

    const onDragEnd = async (result: DropResult) => {
        const { source, destination, draggableId } = result
        
        // Dropped outside or same position
        if (!destination || (source.droppableId === destination.droppableId && source.index === destination.index)) {
            return
        }

        // Find the student
        const student = students.find(s => s.id === draggableId)
        if (!student) return

        const newTeamId = destination.droppableId
        const oldTeamId = source.droppableId

        // Optimistic update
        setStudents(prev => prev.map(s => {
            if (s.id === draggableId) {
                return { ...s, team_id: newTeamId }
            }
            return s
        }))

        // Call API
        try {
            const resultAction = await assignStudentToTeam(student.email, newTeamId, courseId)
            if (!resultAction.success) {
                // Revert on failure
                setStudents(prev => prev.map(s => {
                    if (s.id === draggableId) {
                        return { ...s, team_id: oldTeamId }
                    }
                    return s
                }))
                alert('Error al mover estudiante: ' + resultAction.error)
            }
        } catch (error) {
            // Revert on failure
            setStudents(prev => prev.map(s => {
                if (s.id === draggableId) {
                    return { ...s, team_id: oldTeamId }
                }
                return s
            }))
            alert('Error al mover estudiante')
        }
    }

    return (
        <DragDropContext onDragEnd={onDragEnd}>
            <div className="w-full space-y-8">
            {selectedTeamForDetail && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-neutral-900 border border-neutral-800 rounded-lg w-full max-w-5xl flex flex-col max-h-[90vh] shadow-2xl">
                        <div className="p-4 border-b border-neutral-800 flex justify-between items-center bg-neutral-900 rounded-t-lg">
                            <h3 className="font-bold text-gray-100 flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-indigo-400">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                                Detalle del Equipo: {selectedTeamForDetail.name}
                            </h3>
                            <button onClick={() => setSelectedTeamForDetail(null)} className="text-gray-500 hover:text-white transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 bg-neutral-950/50">
                            <StudentTeamView 
                                courseId={courseId}
                                team={{
                                    ...selectedTeamForDetail,
                                    members: students.filter(s => s.team_id === selectedTeamForDetail.id)
                                }}
                                currentUserEmail={currentUserEmail}
                                subtitle="Vista de Docente"
                                disableLinks={true}
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
                                <Droppable droppableId={team.id}>
                                    {(provided, snapshot) => (
                                        <div 
                                            ref={provided.innerRef} 
                                            {...provided.droppableProps}
                                            className={`min-h-[50px] transition-colors rounded ${
                                                snapshot.isDraggingOver ? 'bg-indigo-900/20 ring-2 ring-indigo-500/50' : ''
                                            }`}
                                        >
                                            {members.length === 0 && !snapshot.isDraggingOver ? (
                                                <p className="text-sm text-gray-600 italic p-2">Sin miembros</p>
                                            ) : (
                                                <ul className="space-y-2">
                                                    {members.map((member, index) => (
                                                        <Draggable key={member.id} draggableId={member.id} index={index}>
                                                            {(provided, snapshot) => (
                                                                <li 
                                                                    ref={provided.innerRef}
                                                                    {...provided.draggableProps}
                                                                    {...provided.dragHandleProps}
                                                                    className={`flex justify-between items-center bg-neutral-950 p-2 rounded border border-neutral-800 ${
                                                                        snapshot.isDragging ? 'shadow-lg ring-2 ring-indigo-500 rotate-2 bg-neutral-900 z-50' : ''
                                                                    }`}
                                                                    style={{
                                                                        ...provided.draggableProps.style,
                                                                    }}
                                                                >
                                                                    <div className="flex items-center gap-2 overflow-hidden">
                                                                        <div className="w-6 h-6 rounded-full bg-neutral-800 flex items-center justify-center text-xs font-bold text-gray-400 flex-shrink-0">
                                                                            {member.avatar_url ? (
                                                                                <img src={member.avatar_url} alt="" className="w-full h-full object-cover rounded-full" />
                                                                            ) : (
                                                                                (member.first_name?.[0] || member.email[0]).toUpperCase()
                                                                            )}
                                                                        </div>
                                                                        <span 
                                                                            className="text-sm font-medium text-gray-200 cursor-pointer hover:text-indigo-400 transition-colors truncate"
                                                                            onClick={() => setSelectedStudent(member)}
                                                                        >
                                                                            {member.first_name || member.last_name 
                                                                                ? `${member.last_name || ''}, ${member.first_name || ''}`.trim().replace(/^, /, '').replace(/, $/, '')
                                                                                : member.email}
                                                                        </span>
                                                                    </div>
                                                                    <button 
                                                                        onClick={() => handleRemoveMember(member.email)}
                                                                        className="text-gray-600 hover:text-red-400 ml-2 flex-shrink-0"
                                                                        title="Quitar del equipo"
                                                                    >
                                                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                                                        </svg>
                                                                    </button>
                                                                </li>
                                                            )}
                                                        </Draggable>
                                                    ))}
                                                    {provided.placeholder}
                                                </ul>
                                            )}
                                            {members.length === 0 && snapshot.isDraggingOver && (
                                                 <div className="h-[50px]"></div>
                                            )}
                                            {/* Fix placeholder position */}
                                            {members.length === 0 && provided.placeholder} 
                                        </div>
                                    )}
                                </Droppable>
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
