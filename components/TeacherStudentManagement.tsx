'use client'

import { useState } from 'react'

interface StudentStats {
    email: string
    first_name?: string
    last_name?: string
    dni?: string
    phone?: string
    birth_date?: string
    avatar_url?: string
    team_name?: string
    joined_at: string
    totalAssignments: number
    submitted: number
    approved: number
}

interface TeacherStudentManagementProps {
    initialStudents: StudentStats[]
    courseId: string
}

export default function TeacherStudentManagement({ 
    initialStudents, 
    courseId
}: TeacherStudentManagementProps) {
    // We don't need much state now as it's read-only
    const [students] = useState<StudentStats[]>(initialStudents)
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedStudent, setSelectedStudent] = useState<StudentStats | null>(null)

    const filteredStudents = students
        .filter(student => {
            const fullName = `${student.first_name || ''} ${student.last_name || ''}`.toLowerCase()
            const email = student.email.toLowerCase()
            const term = searchTerm.toLowerCase()
            return fullName.includes(term) || email.includes(term) || (student.team_name && student.team_name.toLowerCase().includes(term))
        })
        .sort((a, b) => {
            const nameA = a.last_name && a.first_name ? `${a.last_name}, ${a.first_name}` : a.email
            const nameB = b.last_name && b.first_name ? `${b.last_name}, ${b.first_name}` : b.email
            return nameA.localeCompare(nameB)
        })

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-neutral-900 p-4 rounded-lg border border-neutral-800 gap-4">
                <h2 className="text-xl font-semibold text-gray-200">Seguimiento de Estudiantes</h2>
                <div className="flex items-center gap-4 w-full sm:w-auto">
                    <input
                        type="text"
                        placeholder="Buscar por nombre, email o equipo..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-neutral-950 border border-neutral-800 rounded px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-indigo-500 w-full sm:w-64"
                    />
                    <div className="text-sm text-gray-500 whitespace-nowrap">
                        Total: {filteredStudents.length}
                    </div>
                </div>
            </div>

            <div className="grid gap-4">
                {filteredStudents.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 bg-neutral-900/50 rounded-lg border border-neutral-800/50">
                        No hay estudiantes asignados a este curso.
                    </div>
                ) : (
                    <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
                        <table className="w-full text-left text-sm text-gray-400">
                            <thead className="bg-neutral-950 text-gray-200 font-medium border-b border-neutral-800">
                                <tr>
                                    <th className="p-4">Estudiante</th>
                                    <th className="p-4 text-center">Entregados</th>
                                    <th className="p-4 text-center">Aprobados</th>
                                    <th className="p-4 text-right">Progreso</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-800">
                                {filteredStudents.map((student) => {
                                    const submissionRate = student.totalAssignments > 0 
                                        ? Math.round((student.submitted / student.totalAssignments) * 100) 
                                        : 0
                                    
                                    const approvalRate = student.totalAssignments > 0
                                        ? Math.round((student.approved / student.totalAssignments) * 100)
                                        : 0

                                    const displayName = student.last_name && student.first_name
                                        ? `${student.last_name}, ${student.first_name}`
                                        : (student.last_name || student.first_name || student.email)

                                    return (
                                        <tr key={student.email} className="hover:bg-neutral-800/30 transition-colors">
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-indigo-900/30 flex items-center justify-center text-indigo-400 font-bold text-xs overflow-hidden border border-indigo-900/50">
                                                        {student.avatar_url ? (
                                                            <img src={student.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                                                        ) : (
                                                            displayName.charAt(0).toUpperCase()
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p 
                                                            className="text-gray-200 font-medium cursor-pointer hover:text-indigo-400 transition-colors"
                                                            onClick={() => setSelectedStudent(student)}
                                                        >
                                                            {displayName}
                                                        </p>
                                                        {displayName !== student.email && (
                                                            <p className="text-xs text-gray-500">{student.email}</p>
                                                        )}
                                                        <p className="text-xs text-gray-500">
                                                            {student.team_name ? `Equipo: ${student.team_name}` : `Matriculado el ${new Date(student.joined_at).toLocaleDateString()}`}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4 text-center">
                                                <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                                                    student.submitted === student.totalAssignments && student.totalAssignments > 0
                                                        ? 'bg-green-900/30 text-green-400'
                                                        : student.submitted > 0
                                                            ? 'bg-blue-900/30 text-blue-400'
                                                            : 'bg-neutral-800 text-gray-500'
                                                }`}>
                                                    {student.submitted} / {student.totalAssignments}
                                                </span>
                                            </td>
                                            <td className="p-4 text-center">
                                                <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                                                    student.approved > 0 
                                                        ? 'bg-indigo-900/30 text-indigo-400'
                                                        : 'bg-neutral-800 text-gray-500'
                                                }`}>
                                                    {student.approved}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex flex-col items-end gap-1">
                                                    <div className="w-24 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                                                        <div 
                                                            className="h-full bg-green-500 rounded-full"
                                                            style={{ width: `${submissionRate}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-xs text-gray-500">{submissionRate}% completado</span>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

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
                                {selectedStudent.team_name && (
                                    <div className="bg-neutral-950 p-3 rounded border border-neutral-800">
                                        <label className="text-xs text-gray-500 block mb-1">Equipo</label>
                                        <p className="text-gray-200 font-medium">{selectedStudent.team_name}</p>
                                    </div>
                                )}
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
                                <div className="bg-neutral-950 p-3 rounded border border-neutral-800">
                                    <label className="text-xs text-gray-500 block mb-1">Progreso General</label>
                                    <div className="flex justify-between items-center mt-1">
                                        <span className="text-gray-300 text-sm">Entregados: {selectedStudent.submitted}/{selectedStudent.totalAssignments}</span>
                                        <span className="text-gray-300 text-sm">Aprobados: {selectedStudent.approved}/{selectedStudent.totalAssignments}</span>
                                    </div>
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