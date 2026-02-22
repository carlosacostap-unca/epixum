'use client'

import { useState, useEffect } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { createTeam, deleteTeam, assignStudentToTeam, removeStudentFromTeam } from '@/app/actions/teams'
import { useRouter } from 'next/navigation'

interface Team {
    id: string
    name: string
    course_id: string
}

interface Student {
    email: string
    first_name?: string
    last_name?: string
    team_id?: string | null
}

interface TeamManagementDragDropProps {
    courseId: string
    initialTeams: Team[]
    initialStudents: Student[]
}

export default function TeamManagementDragDrop({ 
    courseId, 
    initialTeams, 
    initialStudents 
}: TeamManagementDragDropProps) {
    const router = useRouter()
    const [teams, setTeams] = useState<Team[]>(initialTeams)
    const [students, setStudents] = useState<Student[]>(initialStudents)
    const [newTeamName, setNewTeamName] = useState('')
    const [isCreating, setIsCreating] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        setTeams(initialTeams)
    }, [initialTeams])

    useEffect(() => {
        setStudents(initialStudents)
    }, [initialStudents])

    const getStudentsByTeam = (teamId: string | null) => {
        return students.filter(s => s.team_id === teamId)
    }

    const handleCreateTeam = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newTeamName.trim()) return

        setIsCreating(true)
        setError(null)

        const formData = new FormData()
        formData.append('courseId', courseId)
        formData.append('name', newTeamName)

        const result = await createTeam(formData)

        if (result.success && result.data) {
            setTeams([...teams, result.data])
            setNewTeamName('')
            router.refresh()
        } else {
            setError(result.error || 'Error al crear el equipo')
        }
        setIsCreating(false)
    }

    const handleDeleteTeam = async (teamId: string) => {
        if (!confirm('¿Estás seguro de eliminar este equipo? Los estudiantes quedarán sin asignar.')) return

        const result = await deleteTeam(teamId, courseId)
        
        if (result.success) {
            setTeams(teams.filter(t => t.id !== teamId))
            // Update local state: move students to unassigned
            setStudents(students.map(s => s.team_id === teamId ? { ...s, team_id: null } : s))
            router.refresh()
        } else {
            setError(result.error || 'Error al eliminar el equipo')
        }
    }

    const onDragEnd = async (result: DropResult) => {
        const { source, destination, draggableId } = result

        // Dropped outside the list
        if (!destination) return

        // Dropped in the same list (reordering - optional, maybe not needed for this requirement)
        if (source.droppableId === destination.droppableId) return

        const studentEmail = draggableId
        const newTeamId = destination.droppableId === 'unassigned' ? null : destination.droppableId
        
        // Optimistic update
        const updatedStudents = students.map(s => 
            s.email === studentEmail ? { ...s, team_id: newTeamId } : s
        )
        setStudents(updatedStudents)

        // Server action
        let actionResult
        if (newTeamId) {
            actionResult = await assignStudentToTeam(studentEmail, newTeamId, courseId)
        } else {
            actionResult = await removeStudentFromTeam(studentEmail, courseId)
        }

        if (!actionResult.success) {
            // Revert on error
            setStudents(students)
            setError(actionResult.error || 'Error al mover el estudiante')
        } else {
            router.refresh()
        }
    }

    return (
        <div className="space-y-8">
            {error && (
                <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-md">
                    {error}
                </div>
            )}

            {/* Create Team Form */}
            <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
                <h3 className="text-lg font-medium text-white mb-4">Crear Nuevo Equipo</h3>
                <form onSubmit={handleCreateTeam} className="flex gap-4">
                    <input
                        type="text"
                        value={newTeamName}
                        onChange={(e) => setNewTeamName(e.target.value)}
                        placeholder="Nombre del equipo"
                        className="flex-1 bg-neutral-800 border border-neutral-700 rounded-md px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        disabled={isCreating}
                    />
                    <button
                        type="submit"
                        disabled={isCreating || !newTeamName.trim()}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isCreating ? 'Creando...' : 'Crear Equipo'}
                    </button>
                </form>
            </div>

            <DragDropContext onDragEnd={onDragEnd}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-start overflow-x-auto pb-4">
                    
                    {/* Unassigned Students Column */}
                    <div className="bg-neutral-900 rounded-lg border border-neutral-800 flex flex-col h-[500px] min-w-[280px]">
                        <div className="p-4 border-b border-neutral-800 bg-neutral-800/50">
                            <h3 className="font-medium text-gray-300">Sin Equipo</h3>
                            <span className="text-xs text-gray-500">{getStudentsByTeam(null).length} estudiantes</span>
                        </div>
                        <Droppable droppableId="unassigned">
                            {(provided, snapshot) => (
                                <div
                                    ref={provided.innerRef}
                                    {...provided.droppableProps}
                                    className={`flex-1 p-3 overflow-y-auto transition-colors ${snapshot.isDraggingOver ? 'bg-neutral-800/30' : ''}`}
                                >
                                    {getStudentsByTeam(null).map((student, index) => (
                                        <Draggable key={student.email} draggableId={student.email} index={index}>
                                            {(provided, snapshot) => (
                                                <div
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    {...provided.dragHandleProps}
                                                    className={`bg-neutral-800 border border-neutral-700 p-3 rounded mb-2 shadow-sm hover:border-indigo-500/50 transition-colors ${snapshot.isDragging ? 'opacity-50 ring-2 ring-indigo-500' : ''}`}
                                                >
                                                    <p className="text-sm font-medium text-gray-200">
                                                        {student.first_name || student.last_name 
                                                            ? `${student.last_name || ''}, ${student.first_name || ''}`.trim().replace(/^, /, '').replace(/, $/, '')
                                                            : student.email}
                                                    </p>
                                                </div>
                                            )}
                                        </Draggable>
                                    ))}
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>
                    </div>

                    {/* Team Columns */}
                    {teams.map((team) => (
                        <div key={team.id} className="bg-neutral-900 rounded-lg border border-neutral-800 flex flex-col h-[500px] min-w-[280px]">
                            <div className="p-4 border-b border-neutral-800 bg-neutral-800/50 flex justify-between items-center">
                                <div>
                                    <h3 className="font-medium text-white">{team.name}</h3>
                                    <span className="text-xs text-gray-500">{getStudentsByTeam(team.id).length} miembros</span>
                                </div>
                                <button 
                                    onClick={() => handleDeleteTeam(team.id)}
                                    className="text-gray-500 hover:text-red-400 transition-colors"
                                    title="Eliminar equipo"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </div>
                            <Droppable droppableId={team.id}>
                                {(provided, snapshot) => (
                                    <div
                                        ref={provided.innerRef}
                                        {...provided.droppableProps}
                                        className={`flex-1 p-3 overflow-y-auto transition-colors ${snapshot.isDraggingOver ? 'bg-neutral-800/30' : ''}`}
                                    >
                                        {getStudentsByTeam(team.id).map((student, index) => (
                                            <Draggable key={student.email} draggableId={student.email} index={index}>
                                                {(provided, snapshot) => (
                                                    <div
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        {...provided.dragHandleProps}
                                                        className={`bg-neutral-800 border border-neutral-700 p-3 rounded mb-2 shadow-sm hover:border-indigo-500/50 transition-colors ${snapshot.isDragging ? 'opacity-50 ring-2 ring-indigo-500' : ''}`}
                                                    >
                                                        <p className="text-sm font-medium text-gray-200">
                                                            {student.first_name || student.last_name 
                                                                ? `${student.last_name || ''}, ${student.first_name || ''}`.trim().replace(/^, /, '').replace(/, $/, '')
                                                                : student.email}
                                                        </p>
                                                    </div>
                                                )}
                                            </Draggable>
                                        ))}
                                        {provided.placeholder}
                                    </div>
                                )}
                            </Droppable>
                        </div>
                    ))}
                </div>
            </DragDropContext>
        </div>
    )
}