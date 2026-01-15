'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { enrollStudent, removeStudentFromCourse } from '@/app/actions/courses'
import { matchStudentsWithAI, extractStudentsFromText } from '@/app/actions/ai'
import { saveDraftStudents, checkDraftStudentsByEmail, batchEnrollStudents } from '@/app/actions/draft-students'

interface StaffMember {
    id: string
    email: string
    role: string
    created_at: string
    first_name?: string
    last_name?: string
}

interface CourseStudentManagementProps {
    initialStudents: StaffMember[]
    courseId: string
    institutionId: string
    onUpdate?: () => void
}

export default function CourseStudentManagement({ 
    initialStudents: students, 
    courseId, 
    institutionId,
    onUpdate
}: CourseStudentManagementProps) {
    const router = useRouter()
    const [isAdding, setIsAdding] = useState(false)
    const [isExpanded, setIsExpanded] = useState(true)
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)

    const refreshData = () => {
        if (onUpdate) {
            onUpdate()
        } else {
            router.refresh()
        }
    }

    // Name Processing State
    const [isNamesSectionExpanded, setIsNamesSectionExpanded] = useState(false)
    const [namesInput, setNamesInput] = useState('')
    const [fullDataInput, setFullDataInput] = useState('')
    const [proposedStudents, setProposedStudents] = useState<{ first_name: string, last_name: string, email?: string, original: string }[]>([])
    const [matchingResults, setMatchingResults] = useState<{ found: any[], notFound: any[] } | null>(null)
    const [isProcessingAI, setIsProcessingAI] = useState(false)

    // Draft Students State
    const [draftInput, setDraftInput] = useState('')
    const [draftStudents, setDraftStudents] = useState<any[]>([])
    const [isProcessingDraft, setIsProcessingDraft] = useState(false)
    const [isSavingDraft, setIsSavingDraft] = useState(false)
    const [processingStatus, setProcessingStatus] = useState('')
    const abortProcessingRef = useRef(false)

    // Batch Enrollment State
    const [isBatchSectionExpanded, setIsBatchSectionExpanded] = useState(false)
    const [batchEmailsInput, setBatchEmailsInput] = useState('')
    const [batchResults, setBatchResults] = useState<{ found: any[], notFound: string[] } | null>(null)
    const [isCheckingBatch, setIsCheckingBatch] = useState(false)
    const [isEnrollingBatch, setIsEnrollingBatch] = useState(false)
    const [enrollmentErrors, setEnrollmentErrors] = useState<{ email: string, error: string }[] | null>(null)

    async function handleParseNames() {
        setMatchingResults(null)
        if (!namesInput.trim()) return

        const lines = namesInput.split('\n').filter(line => line.trim())
        const parsed = lines.map(line => {
            let cleanLine = line.trim()
            let email = ''

            // Extract email if present
            const emailMatch = cleanLine.match(/[\w.-]+@[\w.-]+\.\w+/)
            if (emailMatch) {
                email = emailMatch[0]
                cleanLine = cleanLine.replace(email, '').trim()
            }

            // Remove tabs and multiple spaces
            cleanLine = cleanLine.replace(/\s+/g, ' ')

            // Check for comma format "Last, First"
            if (cleanLine.includes(',')) {
                const parts = cleanLine.split(',')
                return {
                    last_name: parts[0].trim(),
                    first_name: parts.slice(1).join(' ').trim(),
                    email,
                    original: line
                }
            }
            
            // Assume "Last First"
            const parts = cleanLine.split(' ')
            if (parts.length >= 2) {
                // Heuristic: First part is surname, rest is name
                // "Apellidos y Nombres" -> "Perez Juan". 
                return {
                    last_name: parts[0],
                    first_name: parts.slice(1).join(' '),
                    email,
                    original: line
                }
            }

            return {
                last_name: cleanLine,
                first_name: '',
                email,
                original: line
            }
        })

        setProposedStudents(parsed)
    }

    async function handleParseFullData() {
        if (!fullDataInput.trim()) return

        let students: any[] = []

        // Check if it's JSON
        if (fullDataInput.trim().startsWith('[') || fullDataInput.trim().startsWith('{')) {
            try {
                const parsed = JSON.parse(fullDataInput)
                if (Array.isArray(parsed)) {
                    students = parsed.map((item: any) => ({
                        first_name: item.first_name || item.nombres || '',
                        last_name: item.last_name || item.apellidos || '',
                        email: item.email || item.correo || '',
                        original: JSON.stringify(item)
                    }))
                }
            } catch (e) {
                console.log('Not a valid JSON, trying text parsing')
            }
        }

        if (students.length === 0) {
             // Text Parsing Logic for copy-paste from Excel/Table
             const lines = fullDataInput.split('\n').map(l => l.trim()).filter(l => l)
             
             // Remove header lines
             const headers = ['Apellido/s', 'Nombre/s', 'DNI/Pasaporte', 'Fecha de Nacim.', 'Teléfono', 'Correo Electrónico']
             const cleanLines = lines.filter(l => !headers.includes(l))
     
             // We assume blocks of 6 lines per student
             for (let i = 0; i < cleanLines.length; i += 6) {
                 if (i + 5 < cleanLines.length) {
                     students.push({
                         last_name: cleanLines[i],
                         first_name: cleanLines[i+1],
                         email: cleanLines[i+5],
                         original: `${cleanLines[i]} ${cleanLines[i+1]} (${cleanLines[i+5]})`
                     })
                 }
             }
        }

        if (students.length > 0) {
            // If we have existing proposed students (List 1), try to match them
            if (proposedStudents.length > 0) {
                setIsProcessingAI(true)
                try {
                    const result = await matchStudentsWithAI(proposedStudents, students)
                    
                    if (result.success && result.data) {
                        setMatchingResults({
                            found: result.data.found || [],
                            notFound: result.data.notFound || []
                        })
                    } else {
                        alert(`Error al procesar con IA: ${result.error}`)
                    }
                } catch (error) {
                    alert('Error inesperado al conectar con IA')
                    console.error(error)
                } finally {
                    setIsProcessingAI(false)
                }
            } else {
                setProposedStudents(students)
            }
        } else {
            alert('No se pudieron detectar estudiantes. Asegúrese de copiar las 6 columnas en orden vertical.')
        }
    }

    async function handleProcessDraft() {
        if (!draftInput.trim()) return

        setIsProcessingDraft(true)
        setDraftStudents([])
        setProcessingStatus('Iniciando procesamiento...')
        abortProcessingRef.current = false

        try {
            const lines = draftInput.split('\n')
            const BATCH_SIZE = 60 // Process ~60 lines at a time
            let totalFound = 0

            for (let i = 0; i < lines.length; i += BATCH_SIZE) {
                if (abortProcessingRef.current) {
                    setProcessingStatus('Procesamiento cancelado por el usuario.')
                    break
                }

                const chunk = lines.slice(i, i + BATCH_SIZE).join('\n')
                const progress = Math.round(((i) / lines.length) * 100)
                setProcessingStatus(`Analizando texto... ${progress}% completado. (Estudiantes encontrados: ${totalFound})`)
                
                const result = await extractStudentsFromText(chunk)
                
                if (result.success && result.data) {
                    const newStudents = result.data
                    if (newStudents.length > 0) {
                        setDraftStudents(prev => [...prev, ...newStudents])
                        totalFound += newStudents.length
                    }
                } else {
                    console.error(`Error processing chunk ${i}:`, result.error)
                }
            }

            if (!abortProcessingRef.current) {
                setProcessingStatus(`Procesamiento completado. Se encontraron ${totalFound} estudiantes.`)
            }
        } catch (error) {
            console.error(error)
            alert('Error al conectar con el servicio de IA')
            setProcessingStatus('Error durante el procesamiento.')
        } finally {
            setIsProcessingDraft(false)
        }
    }

    function handleCancelProcessing() {
        abortProcessingRef.current = true
        setIsProcessingDraft(false) // Force UI unlock
        setProcessingStatus('Cancelando...')
    }

    async function handleSaveDraft() {
        if (draftStudents.length === 0) return

        setIsSavingDraft(true)
        try {
            const result = await saveDraftStudents(courseId, draftStudents)
            if (result.success) {
                alert('Estudiantes guardados en borrador correctamente')
                setDraftStudents([])
                setDraftInput('')
                setIsNamesSectionExpanded(false)
            } else {
                alert(`Error al guardar: ${result.error}`)
            }
        } catch (error) {
            console.error(error)
            alert('Error inesperado al guardar')
        } finally {
            setIsSavingDraft(false)
        }
    }

    const handleBatchCheck = async () => {
        if (!courseId) return

        setIsCheckingBatch(true)
        setBatchResults(null)
        setEnrollmentErrors(null)

        try {
            // Clean and parse emails
            const cleanEmail = (email: string) => {
                return email
                    .replace(/[^\x20-\x7E]/g, '') // Remove non-printable ASCII
                    .replace(/\s+/g, '') // Remove all whitespace
                    .toLowerCase();
            }

            const emails = batchEmailsInput
                .split(/[\n,]+/)
                .map(email => cleanEmail(email))
                .filter(email => email.includes('@'))

            if (emails.length === 0) {
                alert('No se encontraron correos electrónicos válidos')
                return
            }

            const result = await checkDraftStudentsByEmail(courseId, emails)

            if (result.success && result.data) {
                setBatchResults(result.data)
            } else {
                console.error('Error checking batch:', result.error)
                alert('Error al verificar correos: ' + result.error)
            }
        } catch (error) {
            console.error('Error in batch check:', error)
            alert('Ocurrió un error al procesar la solicitud')
        } finally {
            setIsCheckingBatch(false)
        }
    }

    async function handleAdd(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        
        try {
            const result = await enrollStudent(courseId, email)
            
            if (result.success) {
                setEmail('')
                setIsAdding(false)
                refreshData()
            } else {
                alert(result.error || 'Error al asignar alumno')
            }
        } catch (error) {
            alert('Error inesperado')
        } finally {
            setLoading(false)
        }
    }

    async function handleRemove(emailToRemove: string) {
        if (!confirm(`¿Está seguro de quitar a ${emailToRemove} de este curso?`)) return

        try {
            const result = await removeStudentFromCourse(courseId, emailToRemove)
            if (result.success) {
                refreshData()
            } else {
                alert(result.error || 'Error al eliminar')
            }
        } catch (error) {
            alert('Error inesperado')
        }
    }

    const handleBatchEnroll = async () => {
        if (!batchResults || batchResults.found.length === 0) return

        // Filter out already enrolled students
        const studentsToEnroll = batchResults.found.filter((s: any) => !s.is_enrolled)

        if (studentsToEnroll.length === 0) {
            alert('Todos los estudiantes encontrados ya están matriculados.')
            return
        }

        setIsEnrollingBatch(true)
        setEnrollmentErrors(null)
        try {
            const result = await batchEnrollStudents(courseId, studentsToEnroll)
            if (result.success && result.data) {
                const successCount = result.data.success.length
                const failedCount = result.data.failed.length
                
                let message = `Proceso finalizado.\nMatriculados exitosamente: ${successCount}`
                if (failedCount > 0) {
                    message += `\nFallidos: ${failedCount}`
                    setEnrollmentErrors(result.data.failed)
                }
                alert(message)
                // Refresh batch check to update status
                handleBatchCheck() 
                refreshData()
            } else {
                alert(`Error al matricular: ${result.error}`)
            }
        } catch (error) {
            alert('Ocurrió un error inesperado')
            console.error(error)
        } finally {
            setIsEnrollingBatch(false)
        }
    }

    const sortedStudents = [...students].sort((a, b) => {
        const nameA = a.last_name && a.first_name 
            ? `${a.last_name}, ${a.first_name}` 
            : a.email.split('@')[0]
        const nameB = b.last_name && b.first_name 
            ? `${b.last_name}, ${b.first_name}` 
            : b.email.split('@')[0]
        return nameA.localeCompare(nameB, undefined, { sensitivity: 'base' })
    })

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-neutral-900 p-4 rounded-lg border border-neutral-800">
                <button 
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="flex items-center gap-2 text-xl font-semibold text-gray-200 hover:text-white transition-colors focus:outline-none"
                >
                    <svg 
                        className={`w-5 h-5 transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    Estudiantes Matriculados ({students.length})
                </button>
                <button 
                    onClick={() => setIsAdding(true)}
                    className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition-colors text-sm font-medium"
                >
                    + Asignar Estudiante
                </button>
            </div>

            {isAdding && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-lg w-full max-w-md">
                        <h3 className="text-xl font-bold text-gray-100 mb-4">Asignar Estudiante</h3>
                        <form onSubmit={handleAdd} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">
                                    Correo Electrónico
                                </label>
                                <input 
                                    type="email" 
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-black border border-neutral-700 rounded p-2 text-gray-100 focus:border-indigo-500 focus:outline-none"
                                    placeholder="alumno@ejemplo.com"
                                />
                                <p className="text-xs text-gray-500 mt-2">
                                    Si el usuario no existe, será creado automáticamente.
                                </p>
                            </div>
                            
                            <div className="flex justify-end gap-3 mt-6">
                                <button 
                                    type="button"
                                    onClick={() => setIsAdding(false)}
                                    className="text-gray-400 hover:text-white px-3 py-2"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    type="submit"
                                    disabled={loading}
                                    className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? 'Asignando...' : 'Asignar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isExpanded && (
                <div className="grid gap-4">
                    {sortedStudents.length === 0 ? (
                        <div className="text-center py-12 text-gray-500 bg-neutral-900/50 rounded-lg border border-neutral-800/50">
                            No hay estudiantes asignados a este curso.
                        </div>
                    ) : (
                        sortedStudents.map((member) => (
                            <div 
                                key={member.id} 
                                className="flex justify-between items-center bg-neutral-900 border border-neutral-800 p-4 rounded-lg hover:border-neutral-700 transition-colors"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-indigo-900/30 flex items-center justify-center text-indigo-400 font-bold">
                                        {(member.last_name || member.email).charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="text-gray-200 font-medium">
                                            {member.last_name && member.first_name 
                                                ? `${member.last_name}, ${member.first_name}`
                                                : member.email.split('@')[0]}
                                        </p>
                                        <p className="text-sm text-gray-500">{member.email}</p>
                                    </div>
                                </div>
                                
                                <button 
                                    onClick={() => handleRemove(member.email)}
                                    className="text-red-500 hover:text-red-400 text-sm hover:underline px-3 py-1"
                                >
                                    Quitar
                                </button>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Names Processing Section */}
            <div className="bg-neutral-900 rounded-lg border border-neutral-800 overflow-hidden">
                <button 
                    onClick={() => setIsNamesSectionExpanded(!isNamesSectionExpanded)}
                    className="w-full flex justify-between items-center p-4 text-left hover:bg-neutral-800/50 transition-colors focus:outline-none"
                >
                    <div className="flex items-center gap-2">
                         <svg 
                            className={`w-5 h-5 transform transition-transform duration-200 ${isNamesSectionExpanded ? 'rotate-180' : ''}`} 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    <h3 className="text-lg font-semibold text-gray-200">Importar Estudiantes en Borrador</h3>
                </div>
                {proposedStudents.length > 0 && (
                        <span className="text-sm text-indigo-400 bg-indigo-900/20 px-2 py-1 rounded">
                            {proposedStudents.length} detectados
                        </span>
                    )}
                </button>

                {isNamesSectionExpanded && (
                    <div className="p-4 border-t border-neutral-800 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">
                                Pegar datos de planilla (Apellido/s, Nombre/s, DNI, Fecha Nac., Teléfono, Email)
                            </label>
                            <textarea
                                value={draftInput}
                                onChange={(e) => setDraftInput(e.target.value)}
                                className="w-full bg-black border border-neutral-700 rounded p-3 text-gray-100 focus:border-indigo-500 focus:outline-none font-mono text-sm h-48"
                                placeholder={`Ejemplo:\nAcevedo Pereyra \t Javier Exequiel \t 26804864 \t 8/9/1978 \t 3834946976 \t acevedojavierbien@gmail.com\n...`}
                            />
                        </div>

                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-400 italic">
                                {processingStatus}
                            </span>
                            <div className="flex gap-2">
                                {isProcessingDraft && (
                                    <button
                                        onClick={handleCancelProcessing}
                                        className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 text-sm font-medium"
                                    >
                                        Cancelar
                                    </button>
                                )}
                                <button
                                    onClick={handleProcessDraft}
                                    disabled={isProcessingDraft || !draftInput.trim()}
                                    className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {isProcessingDraft ? (
                                        <>
                                            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Procesando...
                                        </>
                                    ) : (
                                        'Procesar Texto'
                                    )}
                                </button>
                            </div>
                        </div>

                        {draftStudents.length > 0 && (
                            <div className="space-y-4 pt-4 border-t border-neutral-800">
                                <div className="flex justify-between items-center">
                                    <h4 className="text-sm font-medium text-gray-300">Vista Previa ({draftStudents.length})</h4>
                                    <button
                                        onClick={handleSaveDraft}
                                        disabled={isSavingDraft}
                                        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                                    >
                                        {isSavingDraft ? 'Guardando...' : 'Guardar en Borradores'}
                                    </button>
                                </div>
                                
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm text-gray-400">
                                        <thead className="bg-neutral-800 text-gray-200">
                                            <tr>
                                                <th className="p-2">Apellido</th>
                                                <th className="p-2">Nombre</th>
                                                <th className="p-2">DNI</th>
                                                <th className="p-2">Fecha Nac.</th>
                                                <th className="p-2">Teléfono</th>
                                                <th className="p-2">Email</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-neutral-800">
                                            {draftStudents.map((student, idx) => (
                                                <tr key={idx} className="hover:bg-neutral-800/30">
                                                    <td className="p-2">{student.last_name}</td>
                                                    <td className="p-2">{student.first_name}</td>
                                                    <td className="p-2">{student.dni}</td>
                                                    <td className="p-2">{student.birth_date}</td>
                                                    <td className="p-2">{student.phone}</td>
                                                    <td className="p-2">{student.email}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {enrollmentErrors && (
                            <div className="mt-4 p-4 bg-red-900/20 border border-red-900 rounded-lg">
                                <h4 className="text-sm font-medium text-red-400 mb-2 flex items-center gap-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Errores de Matriculación ({enrollmentErrors.length})
                                </h4>
                                <ul className="space-y-1 text-xs text-red-300">
                                    {enrollmentErrors.map((err, idx) => (
                                        <li key={idx} className="flex gap-2">
                                            <span className="font-mono">{err.email}:</span>
                                            <span>{err.error}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Batch Enrollment Section */}
            <div className="bg-neutral-900 rounded-lg border border-neutral-800 overflow-hidden">
                <button 
                    onClick={() => setIsBatchSectionExpanded(!isBatchSectionExpanded)}
                    className="w-full flex justify-between items-center p-4 text-left hover:bg-neutral-800/50 transition-colors focus:outline-none"
                >
                    <div className="flex items-center gap-2">
                         <svg 
                            className={`w-5 h-5 transform transition-transform duration-200 ${isBatchSectionExpanded ? 'rotate-180' : ''}`} 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    <h3 className="text-lg font-semibold text-gray-200">Matricular Estudiantes por Lote</h3>
                </div>
                </button>

                {isBatchSectionExpanded && (
                    <div className="p-4 border-t border-neutral-800 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">
                                Pegar lista de correos electrónicos (uno por línea o separados por comas)
                            </label>
                            <textarea
                                value={batchEmailsInput}
                                onChange={(e) => setBatchEmailsInput(e.target.value)}
                                className="w-full bg-black border border-neutral-700 rounded p-3 text-gray-100 focus:border-indigo-500 focus:outline-none font-mono text-sm h-48"
                                placeholder={`student1@example.com\nstudent2@example.com\n...`}
                            />
                        </div>

                        <div className="flex justify-end">
                            <button
                                onClick={handleBatchCheck}
                                disabled={isCheckingBatch || !batchEmailsInput.trim()}
                                className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {isCheckingBatch ? 'Verificando...' : 'Buscar en Borradores'}
                            </button>
                        </div>

                        {batchResults && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-neutral-800">
                                {/* Found Students */}
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <h4 className="text-sm font-medium text-green-400 flex items-center gap-2">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        Encontrados ({batchResults.found.length})
                                    </h4>
                                    {batchResults.found.length > 0 && (
                                        <button
                                            onClick={handleBatchEnroll}
                                            disabled={isEnrollingBatch || batchResults.found.every((s: any) => s.is_enrolled)}
                                            className="bg-green-600 text-white text-xs px-3 py-1 rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                                        >
                                            {isEnrollingBatch ? (
                                                <>
                                                    <svg className="animate-spin h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                    </svg>
                                                    Matriculando...
                                                </>
                                            ) : `Matricular Nuevos (${batchResults.found.filter((s: any) => !s.is_enrolled).length})`}
                                        </button>
                                    )}
                                </div>
                                <div className="bg-black border border-green-900/30 rounded-lg overflow-hidden max-h-96 overflow-y-auto">
                                        {batchResults.found.length === 0 ? (
                                            <div className="p-4 text-sm text-gray-500 text-center">No se encontraron estudiantes</div>
                                        ) : (
                                            <table className="w-full text-left text-xs text-gray-400">
                                                <thead className="bg-green-900/10 text-green-100 sticky top-0">
                                                    <tr>
                                                        <th className="p-2">Estudiante</th>
                                                        <th className="p-2">DNI</th>
                                                        <th className="p-2">Email</th>
                                                        <th className="p-2 w-24 text-center">Estado</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-neutral-800">
                                                    {batchResults.found.map((student: any) => (
                                                        <tr key={student.id} className={`hover:bg-neutral-800/30 ${student.is_enrolled ? 'opacity-50' : ''}`}>
                                                            <td className="p-2">
                                                                <div className="font-medium text-gray-300">{student.last_name}, {student.first_name}</div>
                                                            </td>
                                                            <td className="p-2">{student.dni}</td>
                                                            <td className="p-2">{student.email}</td>
                                                            <td className="p-2 text-center">
                                                                {student.is_enrolled ? (
                                                                    <span className="inline-block px-2 py-0.5 rounded-full bg-blue-900/30 text-blue-400 text-[10px] border border-blue-800">
                                                                        Inscrito
                                                                    </span>
                                                                ) : (
                                                                    <span className="inline-block px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400 text-[10px] border border-neutral-700">
                                                                        Pendiente
                                                                    </span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        )}
                                    </div>
                                </div>

                                {/* Not Found Emails */}
                                <div className="space-y-3">
                                    <h4 className="text-sm font-medium text-red-400 flex items-center gap-2">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                        No Encontrados ({batchResults.notFound.length})
                                    </h4>
                                    <div className="bg-black border border-red-900/30 rounded-lg overflow-hidden max-h-96 overflow-y-auto">
                                        {batchResults.notFound.length === 0 ? (
                                            <div className="p-4 text-sm text-gray-500 text-center">Todos los correos fueron encontrados</div>
                                        ) : (
                                            <ul className="divide-y divide-neutral-800">
                                                {batchResults.notFound.map((email, idx) => (
                                                    <li key={idx} className="p-2 text-xs text-red-300/80 hover:bg-neutral-800/30 font-mono">
                                                        {email}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
