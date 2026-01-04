'use client'

import { useState } from 'react'

interface StudentStats {
    email: string
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

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-neutral-900 p-4 rounded-lg border border-neutral-800">
                <h2 className="text-xl font-semibold text-gray-200">Seguimiento de Estudiantes</h2>
                {/* Removed Add/Remove buttons per requirements */}
                <div className="text-sm text-gray-500">
                    Total: {students.length} estudiantes
                </div>
            </div>

            <div className="grid gap-4">
                {students.length === 0 ? (
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
                                {students.map((student) => {
                                    const submissionRate = student.totalAssignments > 0 
                                        ? Math.round((student.submitted / student.totalAssignments) * 100) 
                                        : 0
                                    
                                    const approvalRate = student.totalAssignments > 0
                                        ? Math.round((student.approved / student.totalAssignments) * 100)
                                        : 0

                                    return (
                                        <tr key={student.email} className="hover:bg-neutral-800/30 transition-colors">
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-indigo-900/30 flex items-center justify-center text-indigo-400 font-bold text-xs">
                                                        {student.email.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="text-gray-200 font-medium">{student.email}</p>
                                                        <p className="text-xs text-gray-500">
                                                            Matriculado el {new Date(student.joined_at).toLocaleDateString()}
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
        </div>
    )
}