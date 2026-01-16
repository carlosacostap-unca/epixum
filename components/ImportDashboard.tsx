'use client'

import { useState, useEffect } from 'react'
import { getInstitutions } from '@/app/actions/institutions'
import { getCourses, getCourseStudents } from '@/app/actions/courses'
import { getClasses, createClass } from '@/app/actions/classes'
import { getClassResources, createResource, updateResource, deleteResource, getSignedUploadUrl } from '@/app/actions/resources'
import { getAssignments, createAssignment, deleteAssignment, getAssignmentResources, createAssignmentResource, deleteAssignmentResource, getAllCourseSubmissions, setStudentGrade, bulkUpdateGrades } from '@/app/actions/assignments'
import { extractResourcesFromText, extractAssignmentFromText } from '@/app/actions/ai'
import CourseStudentManagement from './CourseStudentManagement'
import Link from 'next/link'
import { formatDateForDisplay } from '@/utils/date'

const resourceTypeLabels: Record<string, string> = {
    link: 'ENLACE',
    video: 'VIDEO',
    file: 'ARCHIVO',
    doc: 'ARCHIVO'
}

export default function ImportDashboard() {
    const [activeTab, setActiveTab] = useState('classes')
    
    // Classes Tab State
    const [institutions, setInstitutions] = useState<any[]>([])
    const [courses, setCourses] = useState<any[]>([])
    const [classes, setClasses] = useState<any[]>([])
    
    const [selectedInstitution, setSelectedInstitution] = useState<string>('')
    const [selectedCourse, setSelectedCourse] = useState<string>('')
    
    const [loading, setLoading] = useState(false)

    // Resources State
    const [selectedClassId, setSelectedClassId] = useState<string | null>(null)
    const [resources, setResources] = useState<any[]>([])
    const [loadingResources, setLoadingResources] = useState(false)
    const [resourceError, setResourceError] = useState<string | null>(null)
    
    // Import Resources State
    const [isImporting, setIsImporting] = useState(false)
    const [importText, setImportText] = useState('')
    const [processingImport, setProcessingImport] = useState(false)
    const [proposedResources, setProposedResources] = useState<any[]>([])
    
    // New/Edit Resource State
    const [editingResource, setEditingResource] = useState<any | null>(null)
    const [isResourceModalOpen, setIsResourceModalOpen] = useState(false)
    const [resourceTitle, setResourceTitle] = useState('')
    const [resourceType, setResourceType] = useState('link')
    const [resourceUrl, setResourceUrl] = useState('')
    const [resourceFile, setResourceFile] = useState<File | null>(null)
    const [savingResource, setSavingResource] = useState(false)

    // New Class Form State
    const [newClassTitle, setNewClassTitle] = useState('')
    const [newClassDescription, setNewClassDescription] = useState('')
    const [newClassDate, setNewClassDate] = useState('')
    const [creatingClass, setCreatingClass] = useState(false)
    const [createError, setCreateError] = useState<string | null>(null)

    // Assignments State
    const [assignments, setAssignments] = useState<any[]>([])
    const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null)
    const [assignmentResources, setAssignmentResources] = useState<any[]>([])

    // Students State
    const [students, setStudents] = useState<any[]>([])
    
    // Import Assignment State
    const [isImportingAssignment, setIsImportingAssignment] = useState(false)
    const [importAssignmentText, setImportAssignmentText] = useState('')
    const [processingAssignmentImport, setProcessingAssignmentImport] = useState(false)
    const [proposedAssignment, setProposedAssignment] = useState<any | null>(null)

    // Evaluations State
    const [submissions, setSubmissions] = useState<any[]>([])
    const [loadingSubmissions, setLoadingSubmissions] = useState(false)
    const [isImportingGrades, setIsImportingGrades] = useState(false)
    const [importGradesText, setImportGradesText] = useState('')
    const [processingGradesImport, setProcessingGradesImport] = useState(false)
    const [importGradesError, setImportGradesError] = useState<string | null>(null)

    useEffect(() => {
        if (activeTab === 'classes' || activeTab === 'students' || activeTab === 'assignments' || activeTab === 'evaluations') {
            loadInstitutions()
        }
    }, [activeTab])

    useEffect(() => {
        if (selectedCourse) {
            if (activeTab === 'assignments') {
                loadAssignments(selectedCourse)
            } else if (activeTab === 'students') {
                loadStudents(selectedCourse)
            } else if (activeTab === 'classes') {
                loadClasses(selectedCourse)
            } else if (activeTab === 'evaluations') {
                loadStudents(selectedCourse)
                loadAssignments(selectedCourse)
                loadSubmissions(selectedCourse)
            }
        }
    }, [activeTab, selectedCourse])

    useEffect(() => {
        if (selectedAssignmentId) {
            loadAssignmentResources(selectedAssignmentId)
        } else {
            setAssignmentResources([])
        }
    }, [selectedAssignmentId])

    async function loadStudents(courseId: string) {
        setLoading(true)
        const res = await getCourseStudents(courseId)
        if (res.success && res.data) {
            setStudents(res.data)
        }
        setLoading(false)
    }

    async function loadAssignments(courseId: string) {
        setLoading(true)
        const res = await getAssignments(courseId)
        if (res.success && res.data) {
            setAssignments(res.data)
        }
        setLoading(false)
    }

    async function loadAssignmentResources(assignmentId: string) {
        setLoadingResources(true)
        setResourceError(null)
        const res = await getAssignmentResources(assignmentId)
        if (res.success && res.data) {
            setAssignmentResources(res.data)
        } else {
            setResourceError(res.error || 'Error al cargar recursos del TP')
        }
        setLoadingResources(false)
    }

    async function loadSubmissions(courseId: string) {
        setLoadingSubmissions(true)
        const res = await getAllCourseSubmissions(courseId)
        if (res.success && res.data) {
            setSubmissions(res.data)
        }
        setLoadingSubmissions(false)
    }

    async function handleGradeChange(assignmentId: string, studentEmail: string, grade: string) {
        // Optimistic update
        const updatedSubmissions = [...submissions]
        const existingIndex = updatedSubmissions.findIndex(s => 
            s.assignment_id === assignmentId && 
            s.student_email?.toLowerCase() === studentEmail.toLowerCase()
        )

        if (existingIndex >= 0) {
            updatedSubmissions[existingIndex] = { ...updatedSubmissions[existingIndex], grade }
        } else {
            updatedSubmissions.push({
                assignment_id: assignmentId,
                student_email: studentEmail,
                grade
            })
        }
        setSubmissions(updatedSubmissions)
    }

    async function handleSaveGrade(assignmentId: string, studentEmail: string, grade: string) {
        // API Call
        const res = await setStudentGrade(assignmentId, studentEmail, grade)
        if (!res.success) {
            alert(res.error || 'Error al calificar')
            // Revert on error
            loadSubmissions(selectedCourse)
        }
    }

    async function handleBulkEvaluationImport() {
        if (!importGradesText.trim() || !selectedCourse) return
        setProcessingGradesImport(true)
        setImportGradesError(null)

        try {
            const lines = importGradesText.trim().split('\n')
            const updates: { assignmentId: string, studentEmail: string, grade: string }[] = []
            
            // Assume assignments are sorted by due_date (as loaded by getAssignments)
            // This matches the columns in the text
            
            lines.forEach(line => {
                // Determine separator: try tab first, then comma
                let parts = line.split('\t').map(p => p.trim())
                
                // If single part and line has commas, try splitting by comma
                if (parts.length === 1 && line.includes(',')) {
                    parts = line.split(',').map(p => p.trim())
                }

                const email = parts[0]
                
                // Validate email (simple check)
                if (!email || !email.includes('@')) return

                // Iterate over grades
                for (let i = 1; i < parts.length; i++) {
                    const grade = parts[i]
                    if (grade && (grade === 'Aprobado' || grade === 'Corregir y reenviar')) {
                        const assignmentIndex = i - 1
                        if (assignmentIndex < assignments.length) {
                            updates.push({
                                assignmentId: assignments[assignmentIndex].id,
                                studentEmail: email,
                                grade
                            })
                        }
                    }
                }
            })

            if (updates.length === 0) {
                setImportGradesError('No se encontraron calificaciones válidas para importar. Asegúrate de usar el formato correcto (Email [separador] Nota1 [separador] Nota2...). Las notas deben ser "Aprobado" o "Corregir y reenviar".')
                setProcessingGradesImport(false)
                return
            }

            const res = await bulkUpdateGrades(selectedCourse, updates)
            
            if (res.success) {
                setImportGradesText('')
                setIsImportingGrades(false)
                loadSubmissions(selectedCourse)
                alert(`Se importaron ${updates.length} calificaciones correctamente.`)
            } else {
                setImportGradesError(res.error || 'Error al importar calificaciones')
            }

        } catch (error: any) {
            setImportGradesError(error.message || 'Error inesperado')
        } finally {
            setProcessingGradesImport(false)
        }
    }

    async function handleProcessAssignmentImport() {
        if (!importAssignmentText.trim()) return
        setProcessingAssignmentImport(true)
        setResourceError(null)
        
        const res = await extractAssignmentFromText(importAssignmentText)
        if (res.success && res.data) {
            setProposedAssignment(res.data)
        } else {
            setResourceError(res.error || 'Error al procesar el texto')
        }
        setProcessingAssignmentImport(false)
    }

    async function handleConfirmAssignmentImport() {
        if (!proposedAssignment || !selectedCourse) return
        setProcessingAssignmentImport(true)
        
        try {
            // 1. Create Assignment
            const assignRes = await createAssignment(
                selectedCourse, 
                proposedAssignment.title, 
                proposedAssignment.description || '', 
                proposedAssignment.due_date
            )

            if (!assignRes.success || !assignRes.data) {
                throw new Error(assignRes.error || 'Error al crear el TP')
            }

            const newAssignmentId = assignRes.data.id

            // 2. Add resources
            let errorCount = 0
            if (proposedAssignment.resources && proposedAssignment.resources.length > 0) {
                for (const resource of proposedAssignment.resources) {
                    const res = await createAssignmentResource(newAssignmentId, resource.title, resource.url, resource.type)
                    if (!res.success) errorCount++
                }
            }

            setProcessingAssignmentImport(false)
            setIsImportingAssignment(false)
            setProposedAssignment(null)
            setImportAssignmentText('')
            loadAssignments(selectedCourse)
            
            if (errorCount > 0) {
                alert(`El TP se creó pero hubo ${errorCount} errores al añadir recursos.`)
            }

        } catch (error: any) {
            setResourceError(error.message)
            setProcessingAssignmentImport(false)
        }
    }

    async function handleDeleteAssignment(assignmentId: string) {
        if (!confirm('¿Estás seguro de eliminar este TP?')) return

        const res = await deleteAssignment(assignmentId, selectedCourse)
        if (res.success) {
            loadAssignments(selectedCourse)
            if (selectedAssignmentId === assignmentId) {
                setSelectedAssignmentId(null)
            }
        } else {
            alert(res.error || 'Error al eliminar TP')
        }
    }

    async function handleDeleteAssignmentResource(resourceId: string) {
        if (!confirm('¿Estás seguro de eliminar este recurso?')) return

        const res = await deleteAssignmentResource(resourceId)
        if (res.success && selectedAssignmentId) {
            loadAssignmentResources(selectedAssignmentId)
        } else {
            alert(res.error || 'Error al eliminar recurso')
        }
    }

    useEffect(() => {
        if (selectedClassId) {
            loadResources(selectedClassId)
        } else {
            setResources([])
        }
    }, [selectedClassId])

    async function loadResources(classId: string) {
        setLoadingResources(true)
        setResourceError(null)
        const res = await getClassResources(classId)
        if (res.success && res.data) {
            setResources(res.data)
        } else {
            setResourceError(res.error || 'Error al cargar recursos')
        }
        setLoadingResources(false)
    }

    async function loadInstitutions() {
        setLoading(true)
        const res = await getInstitutions()
        if (res.success && res.data) {
            setInstitutions(res.data)
        }
        setLoading(false)
    }

    async function handleInstitutionChange(instId: string) {
        setSelectedInstitution(instId)
        setSelectedCourse('')
        setClasses([])
        setAssignments([])
        setStudents([])
        setCourses([])
        setSelectedClassId(null)
        setSelectedAssignmentId(null)
        
        if (instId) {
            setLoading(true)
            const res = await getCourses(instId)
            if (res.success && res.data) {
                setCourses(res.data)
            }
            setLoading(false)
        }
    }

    async function handleCourseChange(courseId: string) {
        setSelectedCourse(courseId)
        setClasses([])
        setAssignments([])
        setStudents([])
        setCreateError(null)
        setSelectedClassId(null)
        setSelectedAssignmentId(null)
    }

    async function loadClasses(courseId: string) {
        setLoading(true)
        const res = await getClasses(courseId)
        if (res.success && res.data) {
            setClasses(res.data)
        }
        setLoading(false)
    }

    async function handleCreateClass(e: React.FormEvent) {
        e.preventDefault()
        if (!selectedCourse) return

        setCreatingClass(true)
        setCreateError(null)

        try {
            const res = await createClass(
                selectedCourse,
                newClassTitle,
                newClassDescription,
                newClassDate
            )

            if (res?.error) {
                setCreateError(res.error || 'Error al crear la clase')
            } else {
                // Success: clear form and reload classes
                setNewClassTitle('')
                setNewClassDescription('')
                setNewClassDate('')
                
                // Reload classes
                const classesRes = await getClasses(selectedCourse)
                if (classesRes.success && classesRes.data) {
                    setClasses(classesRes.data)
                }
            }
        } catch (error: any) {
            setCreateError(error.message || 'Error inesperado')
        } finally {
            setCreatingClass(false)
        }
    }

    function openResourceModal(resource?: any) {
        setResourceError(null)
        if (resource) {
            setEditingResource(resource)
            setResourceTitle(resource.title)
            setResourceType(resource.type)
            setResourceUrl(resource.url)
            setResourceFile(null)
        } else {
            setEditingResource(null)
            setResourceTitle('')
            setResourceType('link')
            setResourceUrl('')
            setResourceFile(null)
        }
        setIsResourceModalOpen(true)
    }

    async function handleSaveResource(e: React.FormEvent) {
        e.preventDefault()
        if (!selectedClassId) return

        setSavingResource(true)
        setResourceError(null)

        try {
            let finalUrl = resourceUrl

            // Handle file upload if needed
            if (resourceType === 'file' || resourceType === 'video') {
                if (resourceFile) {
                    // Upload new file
                    const uploadRes = await getSignedUploadUrl(
                        selectedClassId, 
                        resourceFile.name
                    )

                    if (!uploadRes.success || !uploadRes.data?.signedUrl) {
                        throw new Error(uploadRes.error || 'Error al obtener URL de subida')
                    }

                    const upload = await fetch(uploadRes.data.signedUrl, {
                        method: 'PUT',
                        body: resourceFile,
                        headers: {
                            'Content-Type': resourceFile.type
                        }
                    })

                    if (!upload.ok) {
                        throw new Error('Error al subir el archivo')
                    }

                    finalUrl = uploadRes.data.publicUrl!
                } else if (!editingResource) {
                    throw new Error('Debes seleccionar un archivo')
                }
            }

            let res
            if (editingResource) {
                res = await updateResource(editingResource.id, resourceTitle, finalUrl, resourceType)
            } else {
                res = await createResource(selectedClassId, resourceTitle, finalUrl, resourceType)
            }

            if (res.success) {
                setIsResourceModalOpen(false)
                loadResources(selectedClassId)
                
                // Update class list to refresh resource count
                if (selectedCourse) {
                    const classesRes = await getClasses(selectedCourse)
                    if (classesRes.success && classesRes.data) {
                        setClasses(classesRes.data)
                    }
                }
            } else {
                setResourceError(res.error || 'Error al guardar recurso')
            }

        } catch (error: any) {
            setResourceError(error.message || 'Error inesperado')
        } finally {
            setSavingResource(false)
        }
    }

    async function handleDeleteResource(resourceId: string) {
        if (!confirm('¿Estás seguro de eliminar este recurso?')) return

        const res = await deleteResource(resourceId)
        if (res.success && selectedClassId) {
            loadResources(selectedClassId)
            
            // Update class list to refresh resource count
            if (selectedCourse) {
                const classesRes = await getClasses(selectedCourse)
                if (classesRes.success && classesRes.data) {
                    setClasses(classesRes.data)
                }
            }
        } else {
            alert(res.error || 'Error al eliminar recurso')
        }
    }

    async function handleProcessImport() {
        if (!importText.trim()) return
        setProcessingImport(true)
        setResourceError(null)
        
        const res = await extractResourcesFromText(importText)
        if (res.success && res.data) {
            setProposedResources(res.data)
        } else {
            setResourceError(res.error || 'Error al procesar el texto')
        }
        setProcessingImport(false)
    }

    async function handleConfirmImport() {
        if (proposedResources.length === 0 || !selectedClassId) return
        setProcessingImport(true)
        
        let errorCount = 0
        for (const resource of proposedResources) {
            const res = await createResource(selectedClassId, resource.title, resource.url, resource.type)
            if (!res.success) errorCount++
        }
        
        setProcessingImport(false)
        setIsImporting(false)
        setProposedResources([])
        setImportText('')
        loadResources(selectedClassId)
        
        // Update class list to refresh resource count
        if (selectedCourse) {
            const classesRes = await getClasses(selectedCourse)
            if (classesRes.success && classesRes.data) {
                setClasses(classesRes.data)
            }
        }
        
        if (errorCount > 0) {
            alert(`Se importaron los recursos con ${errorCount} errores.`)
        }
    }

    function updateProposedResource(index: number, field: string, value: string) {
        const updated = [...proposedResources]
        updated[index] = { ...updated[index], [field]: value }
        setProposedResources(updated)
    }

    function removeProposedResource(index: number) {
        const updated = [...proposedResources]
        updated.splice(index, 1)
        setProposedResources(updated)
    }

    return (
        <div className="w-full">
            <div className="flex border-b border-neutral-800 mb-6">
                <button
                    onClick={() => setActiveTab('classes')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === 'classes'
                            ? 'border-indigo-500 text-indigo-400'
                            : 'border-transparent text-gray-400 hover:text-gray-200'
                    }`}
                >
                    Clases
                </button>
                <button
                    onClick={() => setActiveTab('assignments')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === 'assignments'
                            ? 'border-indigo-500 text-indigo-400'
                            : 'border-transparent text-gray-400 hover:text-gray-200'
                    }`}
                >
                    Trabajos Prácticos
                </button>
                <button
                    onClick={() => setActiveTab('evaluations')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === 'evaluations'
                            ? 'border-indigo-500 text-indigo-400'
                            : 'border-transparent text-gray-400 hover:text-gray-200'
                    }`}
                >
                    Evaluaciones
                </button>
                <button
                    onClick={() => setActiveTab('students')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === 'students'
                            ? 'border-indigo-500 text-indigo-400'
                            : 'border-transparent text-gray-400 hover:text-gray-200'
                    }`}
                >
                    Estudiantes
                </button>
                <button
                    onClick={() => setActiveTab('users')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === 'users'
                            ? 'border-indigo-500 text-indigo-400'
                            : 'border-transparent text-gray-400 hover:text-gray-200'
                    }`}
                >
                    Usuarios
                </button>
                <button
                    onClick={() => setActiveTab('institutions')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === 'institutions'
                            ? 'border-indigo-500 text-indigo-400'
                            : 'border-transparent text-gray-400 hover:text-gray-200'
                    }`}
                >
                    Instituciones
                </button>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
                {activeTab === 'students' && (
                    <div className="flex flex-col gap-6">
                         <h3 className="text-lg font-medium text-gray-200">Gestión de Estudiantes</h3>
                         
                         {/* Selectors */}
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Institución</label>
                                <select 
                                    className="w-full bg-neutral-800 border border-neutral-700 rounded p-2 text-gray-200 focus:outline-none focus:border-indigo-500"
                                    value={selectedInstitution}
                                    onChange={(e) => handleInstitutionChange(e.target.value)}
                                    disabled={loading}
                                >
                                    <option value="">Seleccionar Institución</option>
                                    {institutions.map(inst => (
                                        <option key={inst.id} value={inst.id}>{inst.nombre}</option>
                                    ))}
                                </select>
                             </div>
                             
                             <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Curso</label>
                                <select 
                                    className="w-full bg-neutral-800 border border-neutral-700 rounded p-2 text-gray-200 focus:outline-none focus:border-indigo-500"
                                    value={selectedCourse}
                                    onChange={(e) => handleCourseChange(e.target.value)}
                                    disabled={!selectedInstitution || loading}
                                >
                                    <option value="">Seleccionar Curso</option>
                                    {courses.map(course => (
                                        <option key={course.id} value={course.id}>
                                            {course.name} 
                                            {(course.start_date || course.end_date) && ` (${formatDateForDisplay(course.start_date, 'dd/MM/yyyy') || '?'} - ${formatDateForDisplay(course.end_date, 'dd/MM/yyyy') || '?'})`}
                                        </option>
                                    ))}
                                </select>
                             </div>
                         </div>

                        {selectedCourse && (
                            <CourseStudentManagement
                                initialStudents={students}
                                courseId={selectedCourse}
                                institutionId={selectedInstitution}
                                onUpdate={() => loadStudents(selectedCourse)}
                            />
                        )}
                        {/* Modal removed from Students tab */}
                    </div>
                )}
                
                {activeTab === 'users' && (
                    <div className="flex flex-col gap-4 items-center py-8">
                        <h3 className="text-lg font-medium text-gray-200">Gestión de Usuarios</h3>
                        <p className="text-gray-400 text-sm text-center max-w-md">
                            Para administrar la lista de usuarios, roles y accesos, por favor dirígete a la sección dedicada de Gestión de Usuarios.
                        </p>
                        <Link 
                            href="/admin/users" 
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded transition-colors mt-2"
                        >
                            Ir a Gestionar Usuarios
                        </Link>
                    </div>
                )}
                
                {activeTab === 'classes' && (
                    <div className="flex flex-col gap-6">
                         <h3 className="text-lg font-medium text-gray-200">Gestión de Clases</h3>
                         
                         {/* Selectors */}
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Institución</label>
                                <select 
                                    className="w-full bg-neutral-800 border border-neutral-700 rounded p-2 text-gray-200 focus:outline-none focus:border-indigo-500"
                                    value={selectedInstitution}
                                    onChange={(e) => handleInstitutionChange(e.target.value)}
                                    disabled={loading}
                                >
                                    <option value="">Seleccionar Institución</option>
                                    {institutions.map(inst => (
                                        <option key={inst.id} value={inst.id}>{inst.nombre}</option>
                                    ))}
                                </select>
                             </div>
                             
                             <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Curso</label>
                                <select 
                                    className="w-full bg-neutral-800 border border-neutral-700 rounded p-2 text-gray-200 focus:outline-none focus:border-indigo-500"
                                    value={selectedCourse}
                                    onChange={(e) => handleCourseChange(e.target.value)}
                                    disabled={!selectedInstitution || loading}
                                >
                                    <option value="">Seleccionar Curso</option>
                                    {courses.map(course => (
                                        <option key={course.id} value={course.id}>
                                            {course.name} 
                                            {(course.start_date || course.end_date) && ` (${formatDateForDisplay(course.start_date, 'dd/MM/yyyy') || '?'} - ${formatDateForDisplay(course.end_date, 'dd/MM/yyyy') || '?'})`}
                                        </option>
                                    ))}
                                </select>
                             </div>
                         </div>

                         {/* Classes List */}
                        {selectedCourse && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div className="bg-neutral-800 rounded border border-neutral-700 overflow-hidden">
                                    <div className="p-4 border-b border-neutral-700 bg-neutral-800/50 flex justify-between items-center">
                                       <h4 className="font-medium text-gray-300">Clases Existentes ({classes.length})</h4>
                                       {loading && <span className="text-xs text-indigo-400">Cargando...</span>}
                                    </div>
                                    <div className="max-h-96 overflow-y-auto">
                                       {classes.length === 0 ? (
                                           <div className="p-4 text-gray-500 text-center text-sm">No hay clases registradas en este curso.</div>
                                       ) : (
                                           <table className="w-full text-sm text-left">
                                               <thead className="text-xs text-gray-400 uppercase bg-neutral-900/50 sticky top-0">
                                                   <tr>
                                                       <th className="px-4 py-3">Clase</th>
                                                       <th className="px-4 py-3 text-right">Acciones</th>
                                                   </tr>
                                               </thead>
                                               <tbody className="divide-y divide-neutral-700">
                                                   {classes.map(cls => (
                                                       <tr 
                                                           key={cls.id} 
                                                           className={`hover:bg-neutral-700/50 cursor-pointer ${selectedClassId === cls.id ? 'bg-neutral-700/50' : ''}`}
                                                           onClick={() => setSelectedClassId(cls.id)}
                                                       >
                                                           <td className="px-4 py-3">
                                                               <div className="font-medium text-gray-200">{cls.title}</div>
                                                               <div className="text-xs text-gray-400">{new Date(cls.date).toLocaleDateString()}</div>
                                                           </td>
                                                           <td className="px-4 py-3 text-right">
                                                               <button 
                                                                    onClick={(e) => {
                                                                        e.stopPropagation()
                                                                        setSelectedClassId(cls.id)
                                                                    }}
                                                                    className="text-indigo-400 hover:text-indigo-300 text-xs font-medium"
                                                               >
                                                                   Ver Recursos {cls.class_resources?.[0]?.count !== undefined ? `(${cls.class_resources[0].count})` : ''}
                                                               </button>
                                                           </td>
                                                       </tr>
                                                   ))}
                                               </tbody>
                                           </table>
                                       )}
                                    </div>
                                </div>

                                {/* Resources List */}
                                {selectedClassId && (
                                    <div className="bg-neutral-800 rounded border border-neutral-700 overflow-hidden flex flex-col">
                                        <div className="p-4 border-b border-neutral-700 bg-neutral-800/50 flex justify-between items-center">
                                            <h4 className="font-medium text-gray-300">
                                                Recursos: {classes.find(c => c.id === selectedClassId)?.title}
                                            </h4>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => setIsImporting(!isImporting)}
                                                    className={`px-3 py-1 rounded text-xs transition-colors border ${
                                                        isImporting 
                                                            ? 'bg-indigo-900/50 border-indigo-500 text-indigo-300' 
                                                            : 'bg-neutral-700 hover:bg-neutral-600 border-neutral-600 text-gray-300'
                                                    }`}
                                                >
                                                    Importar Recursos
                                                </button>
                                                <button
                                                    onClick={() => openResourceModal()}
                                                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded text-xs transition-colors"
                                                >
                                                    + Nuevo Recurso
                                                </button>
                                            </div>
                                        </div>
                                        
                                        {/* Import Section */}
                                        {isImporting && (
                                            <div className="p-4 border-b border-neutral-700 bg-neutral-900/30">
                                                {!proposedResources.length ? (
                                                    <div className="flex flex-col gap-3">
                                                        <label className="text-xs text-gray-400">
                                                            Pega el texto con los recursos para procesar con IA:
                                                        </label>
                                                        <textarea
                                                            value={importText}
                                                            onChange={(e) => setImportText(e.target.value)}
                                                            className="w-full h-32 bg-neutral-800 border border-neutral-700 rounded p-3 text-sm text-gray-200 focus:outline-none focus:border-indigo-500 font-mono"
                                                            placeholder="Clase 1...&#10;Video: https://...&#10;PDF: https://..."
                                                        />
                                                        <div className="flex justify-end">
                                                            <button
                                                                onClick={handleProcessImport}
                                                                disabled={!importText.trim() || processingImport}
                                                                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded text-xs transition-colors flex items-center gap-2"
                                                            >
                                                                {processingImport ? (
                                                                    <>
                                                                        <span className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full"></span>
                                                                        Procesando...
                                                                    </>
                                                                ) : (
                                                                    'Procesar con IA'
                                                                )}
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col gap-4">
                                                        <div className="flex justify-between items-center">
                                                            <h5 className="text-sm font-medium text-indigo-400">Recursos Detectados ({proposedResources.length})</h5>
                                                            <button 
                                                                onClick={() => setProposedResources([])}
                                                                className="text-xs text-gray-500 hover:text-gray-300 underline"
                                                            >
                                                                Volver al texto
                                                            </button>
                                                        </div>
                                                        <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                                                            {proposedResources.map((resource, idx) => (
                                                                <div key={idx} className="bg-neutral-800 p-3 rounded border border-neutral-700 flex gap-3 items-start">
                                                                    <div className="flex-1 grid gap-2">
                                                                        <input
                                                                            type="text"
                                                                            value={resource.title}
                                                                            onChange={(e) => updateProposedResource(idx, 'title', e.target.value)}
                                                                            className="bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-xs text-gray-200 focus:border-indigo-500 outline-none"
                                                                            placeholder="Título"
                                                                        />
                                                                        <input
                                                                            type="text"
                                                                            value={resource.url}
                                                                            onChange={(e) => updateProposedResource(idx, 'url', e.target.value)}
                                                                            className="bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-xs text-gray-400 focus:border-indigo-500 outline-none font-mono"
                                                                            placeholder="URL"
                                                                        />
                                                                    </div>
                                                                    <div className="flex flex-col gap-2">
                                                                        <select
                                                                            value={resource.type}
                                                                            onChange={(e) => updateProposedResource(idx, 'type', e.target.value)}
                                                                            className="bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-[10px] text-gray-300 focus:border-indigo-500 outline-none uppercase"
                                                                        >
                                                                            <option value="link">ENLACE</option>
                                                                            <option value="video">VIDEO</option>
                                                                            <option value="file">ARCHIVO</option>
                                                                        </select>
                                                                        <button
                                                                            onClick={() => removeProposedResource(idx)}
                                                                            className="text-red-400 hover:text-red-300 text-[10px] self-end"
                                                                        >
                                                                            Eliminar
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                        <div className="flex justify-end gap-2 pt-2 border-t border-neutral-700">
                                                            <button
                                                                onClick={() => {
                                                                    setIsImporting(false)
                                                                    setProposedResources([])
                                                                    setImportText('')
                                                                }}
                                                                className="px-3 py-1.5 rounded text-xs text-gray-400 hover:text-white"
                                                            >
                                                                Cancelar
                                                            </button>
                                                            <button
                                                                onClick={handleConfirmImport}
                                                                disabled={processingImport}
                                                                className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-4 py-1.5 rounded text-xs transition-colors font-medium"
                                                            >
                                                                {processingImport ? 'Guardando...' : 'Confirmar Importación'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        
                                        <div className="p-4 flex-1 overflow-y-auto max-h-96">
                                            {loadingResources ? (
                                                <div className="text-center py-4 text-gray-400 text-sm">Cargando recursos...</div>
                                            ) : resources.length === 0 ? (
                                                <div className="text-center py-8 text-gray-500 text-sm">
                                                    No hay recursos para esta clase.
                                                    <br />
                                                    ¡Agrega uno nuevo!
                                                </div>
                                            ) : (
                                                <div className="space-y-3">
                                                    {resources.map(resource => (
                                                        <div key={resource.id} className="bg-neutral-900/50 p-3 rounded border border-neutral-700/50 flex justify-between items-center group">
                                                            <div className="flex-1 min-w-0 mr-4">
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded border ${
                                                                        resource.type === 'video' ? 'border-red-500/30 text-red-400 bg-red-500/10' :
                                                                        resource.type === 'file' ? 'border-blue-500/30 text-blue-400 bg-blue-500/10' :
                                                                        'border-green-500/30 text-green-400 bg-green-500/10'
                                                                    }`}>
                                                                        {resourceTypeLabels[resource.type] || resource.type}
                                                                    </span>
                                                                    <h5 className="font-medium text-gray-200 truncate" title={resource.title}>{resource.title}</h5>
                                                                </div>
                                                                <a 
                                                                    href={resource.url} 
                                                                    target="_blank" 
                                                                    rel="noopener noreferrer"
                                                                    className="text-xs text-gray-500 hover:text-indigo-400 truncate block"
                                                                >
                                                                    {resource.url}
                                                                </a>
                                                            </div>
                                                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <button
                                                                    onClick={() => openResourceModal(resource)}
                                                                    className="text-gray-400 hover:text-white p-1"
                                                                    title="Editar"
                                                                >
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteResource(resource.id)}
                                                                    className="text-gray-400 hover:text-red-400 p-1"
                                                                    title="Eliminar"
                                                                >
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                             </div>
                         )}

                        {/* Modal moved to Evaluations tab */}
                     </div>
                 )}

                        {/* Resource Modal */}
                        {isResourceModalOpen && (
                            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                                <div className="bg-neutral-900 border border-neutral-700 rounded-lg w-full max-w-md p-6 relative">
                                    <button 
                                        onClick={() => setIsResourceModalOpen(false)}
                                        className="absolute top-4 right-4 text-gray-400 hover:text-white"
                                    >
                                        ✕
                                    </button>
                                    
                                    <h3 className="text-lg font-medium text-white mb-4">
                                        {editingResource ? 'Editar Recurso' : 'Nuevo Recurso'}
                                    </h3>
                                    
                                    {resourceError && (
                                        <div className="mb-4 p-3 bg-red-900/30 border border-red-800 text-red-300 rounded text-sm">
                                            {resourceError}
                                        </div>
                                    )}

                                    <form onSubmit={handleSaveResource} className="flex flex-col gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-400 mb-1">Título</label>
                                            <input
                                                type="text"
                                                required
                                                value={resourceTitle}
                                                onChange={(e) => setResourceTitle(e.target.value)}
                                                className="w-full bg-neutral-800 border border-neutral-700 rounded p-2 text-gray-200 focus:outline-none focus:border-indigo-500"
                                                placeholder="Ej: Material de lectura"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-medium text-gray-400 mb-1">Tipo</label>
                                            <select
                                                value={resourceType}
                                                onChange={(e) => setResourceType(e.target.value)}
                                                className="w-full bg-neutral-800 border border-neutral-700 rounded p-2 text-gray-200 focus:outline-none focus:border-indigo-500"
                                            >
                                                <option value="link">Enlace Externo</option>
                                                <option value="file">Archivo (PDF, Doc, etc)</option>
                                                <option value="video">Video</option>
                                            </select>
                                        </div>

                                        {resourceType === 'link' ? (
                                            <div>
                                                <label className="block text-xs font-medium text-gray-400 mb-1">URL</label>
                                                <input
                                                    type="url"
                                                    required
                                                    value={resourceUrl}
                                                    onChange={(e) => setResourceUrl(e.target.value)}
                                                    className="w-full bg-neutral-800 border border-neutral-700 rounded p-2 text-gray-200 focus:outline-none focus:border-indigo-500"
                                                    placeholder="https://..."
                                                />
                                            </div>
                                        ) : (
                                            <div>
                                                <label className="block text-xs font-medium text-gray-400 mb-1">
                                                    {editingResource ? 'Reemplazar Archivo (Opcional)' : 'Seleccionar Archivo'}
                                                </label>
                                                <input
                                                    type="file"
                                                    required={!editingResource}
                                                    onChange={(e) => setResourceFile(e.target.files?.[0] || null)}
                                                    className="w-full bg-neutral-800 border border-neutral-700 rounded p-2 text-gray-200 focus:outline-none focus:border-indigo-500 text-sm"
                                                />
                                                {editingResource && (
                                                    <div className="mt-1 text-xs text-gray-500 truncate">
                                                        Actual: {editingResource.url}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        <div className="flex justify-end gap-2 mt-2">
                                            <button
                                                type="button"
                                                onClick={() => setIsResourceModalOpen(false)}
                                                className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                                            >
                                                Cancelar
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={savingResource}
                                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded transition-colors disabled:opacity-50 text-sm font-medium"
                                            >
                                                {savingResource ? 'Guardando...' : 'Guardar'}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        )}

                        {/* Create Class Form */}
                        {selectedCourse && (
                            <div className="border-t border-neutral-800 pt-6">
                                <h4 className="text-md font-medium text-gray-300 mb-4">Agregar Nueva Clase</h4>
                                {createError && (
                                    <div className="mb-4 p-3 bg-red-900/30 border border-red-800 text-red-300 rounded text-sm">
                                        {createError}
                                    </div>
                                )}
                                <form onSubmit={handleCreateClass} className="flex flex-col gap-4 bg-neutral-800/50 p-6 rounded border border-neutral-800">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-400 mb-1">Título</label>
                                            <input
                                                type="text"
                                                required
                                                value={newClassTitle}
                                                onChange={(e) => setNewClassTitle(e.target.value)}
                                                className="w-full bg-neutral-800 border border-neutral-700 rounded p-2 text-gray-200 focus:outline-none focus:border-indigo-500"
                                                placeholder="Ej: Introducción a React"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-400 mb-1">Fecha</label>
                                            <input
                                                type="datetime-local"
                                                required
                                                value={newClassDate}
                                                onChange={(e) => setNewClassDate(e.target.value)}
                                                className="w-full bg-neutral-800 border border-neutral-700 rounded p-2 text-gray-200 focus:outline-none focus:border-indigo-500"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-400 mb-1">Descripción</label>
                                        <textarea
                                            value={newClassDescription}
                                            onChange={(e) => setNewClassDescription(e.target.value)}
                                            className="w-full bg-neutral-800 border border-neutral-700 rounded p-2 text-gray-200 focus:outline-none focus:border-indigo-500 h-20"
                                            placeholder="Detalles de la clase..."
                                        />
                                    </div>
                                    <div className="flex justify-end">
                                        <button
                                            type="submit"
                                            disabled={creatingClass}
                                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded transition-colors disabled:opacity-50 text-sm font-medium"
                                        >
                                            {creatingClass ? 'Creando...' : 'Crear Clase'}
                                        </button>
                                    </div>
                                </form>
                             </div>
                         )}
                    </div>
                )}

                {activeTab === 'assignments' && (
                    <div className="flex flex-col gap-6">
                         <h3 className="text-lg font-medium text-gray-200">Gestión de Trabajos Prácticos</h3>
                         
                         {/* Selectors */}
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Institución</label>
                                <select 
                                    className="w-full bg-neutral-800 border border-neutral-700 rounded p-2 text-gray-200 focus:outline-none focus:border-indigo-500"
                                    value={selectedInstitution}
                                    onChange={(e) => handleInstitutionChange(e.target.value)}
                                    disabled={loading}
                                >
                                    <option value="">Seleccionar Institución</option>
                                    {institutions.map(inst => (
                                        <option key={inst.id} value={inst.id}>{inst.nombre}</option>
                                    ))}
                                </select>
                             </div>
                             
                             <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Curso</label>
                                <select 
                                    className="w-full bg-neutral-800 border border-neutral-700 rounded p-2 text-gray-200 focus:outline-none focus:border-indigo-500"
                                    value={selectedCourse}
                                    onChange={(e) => handleCourseChange(e.target.value)}
                                    disabled={!selectedInstitution || loading}
                                >
                                    <option value="">Seleccionar Curso</option>
                                    {courses.map(course => (
                                        <option key={course.id} value={course.id}>
                                            {course.name} 
                                            {(course.start_date || course.end_date) && ` (${formatDateForDisplay(course.start_date, 'dd/MM/yyyy') || '?'} - ${formatDateForDisplay(course.end_date, 'dd/MM/yyyy') || '?'})`}
                                        </option>
                                    ))}
                                </select>
                             </div>
                         </div>

                        {selectedCourse && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Assignments List */}
                                <div className="bg-neutral-800 rounded border border-neutral-700 overflow-hidden">
                                    <div className="p-4 border-b border-neutral-700 bg-neutral-800/50 flex justify-between items-center">
                                       <h4 className="font-medium text-gray-300">TPs Existentes ({assignments.length})</h4>
                                       {loading && <span className="text-xs text-indigo-400">Cargando...</span>}
                                    </div>
                                    <div className="max-h-96 overflow-y-auto">
                                       {assignments.length === 0 ? (
                                           <div className="p-4 text-gray-500 text-center text-sm">No hay trabajos prácticos registrados.</div>
                                       ) : (
                                           <table className="w-full text-sm text-left">
                                               <thead className="text-xs text-gray-400 uppercase bg-neutral-900/50 sticky top-0">
                                                   <tr>
                                                       <th className="px-4 py-3">Título</th>
                                                       <th className="px-4 py-3 text-right">Acciones</th>
                                                   </tr>
                                               </thead>
                                               <tbody className="divide-y divide-neutral-700">
                                                   {assignments.map(assign => (
                                                       <tr 
                                                           key={assign.id} 
                                                           className={`hover:bg-neutral-700/50 cursor-pointer ${selectedAssignmentId === assign.id ? 'bg-neutral-700/50' : ''}`}
                                                           onClick={() => setSelectedAssignmentId(assign.id)}
                                                       >
                                                           <td className="px-4 py-3">
                                                               <div className="font-medium text-gray-200">{assign.title}</div>
                                                               <div className="text-xs text-gray-400">Vence: {formatDateForDisplay(assign.due_date, 'dd/MM/yyyy HH:mm')}</div>
                                                           </td>
                                                           <td className="px-4 py-3 text-right">
                                                               <button 
                                                                    onClick={(e) => {
                                                                        e.stopPropagation()
                                                                        handleDeleteAssignment(assign.id)
                                                                    }}
                                                                    className="text-red-400 hover:text-red-300 text-xs font-medium"
                                                               >
                                                                   Eliminar
                                                               </button>
                                                           </td>
                                                       </tr>
                                                   ))}
                                               </tbody>
                                           </table>
                                       )}
                                    </div>
                                </div>

                                {/* Import/Details Panel */}
                                <div className="bg-neutral-800 rounded border border-neutral-700 overflow-hidden flex flex-col">
                                    <div className="p-4 border-b border-neutral-700 bg-neutral-800/50 flex justify-between items-center">
                                        <h4 className="font-medium text-gray-300">
                                            {selectedAssignmentId 
                                                ? `Recursos: ${assignments.find(a => a.id === selectedAssignmentId)?.title}`
                                                : 'Importar / Crear TP'}
                                        </h4>
                                        <div className="flex gap-2">
                                            {!selectedAssignmentId && (
                                                <button
                                                    onClick={() => setIsImportingAssignment(!isImportingAssignment)}
                                                    className={`px-3 py-1 rounded text-xs transition-colors border ${
                                                        isImportingAssignment 
                                                            ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10' 
                                                            : 'border-neutral-600 text-gray-400 hover:border-gray-400'
                                                    }`}
                                                >
                                                    {isImportingAssignment ? 'Cancelar Importación' : 'Importar con IA'}
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="p-4 flex-1 overflow-y-auto min-h-[300px]">
                                        {selectedAssignmentId ? (
                                            /* Resources List for Selected Assignment */
                                            <div className="flex flex-col gap-3">
                                                {loadingResources ? (
                                                    <div className="text-center py-8 text-gray-500">Cargando recursos...</div>
                                                ) : assignmentResources.length === 0 ? (
                                                    <div className="text-center py-8 text-gray-500">No hay recursos asociados a este TP.</div>
                                                ) : (
                                                    assignmentResources.map(res => (
                                                        <div key={res.id} className="flex items-center justify-between p-3 bg-neutral-900/50 rounded border border-neutral-700 group hover:border-neutral-600 transition-colors">
                                                            <div className="flex items-center gap-3 overflow-hidden">
                                                                <span className={`text-[10px] px-1.5 py-0.5 rounded border uppercase tracking-wider ${
                                                                    res.type === 'video' ? 'border-red-500/30 text-red-400 bg-red-500/10' :
                                                                    res.type === 'file' ? 'border-blue-500/30 text-blue-400 bg-blue-500/10' :
                                                                    'border-green-500/30 text-green-400 bg-green-500/10'
                                                                }`}>
                                                                    {resourceTypeLabels[res.type] || res.type}
                                                                </span>
                                                                <div className="flex flex-col overflow-hidden">
                                                                    <span className="text-sm text-gray-200 truncate font-medium" title={res.title}>{res.title}</span>
                                                                    <a href={res.url} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-500 truncate hover:text-indigo-400 transition-colors">{res.url}</a>
                                                                </div>
                                                            </div>
                                                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <button 
                                                                    onClick={() => handleDeleteAssignmentResource(res.id)}
                                                                    className="p-1.5 text-red-400 hover:bg-red-500/10 rounded"
                                                                    title="Eliminar"
                                                                >
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                                <button 
                                                    onClick={() => setSelectedAssignmentId(null)}
                                                    className="mt-4 text-sm text-indigo-400 hover:text-indigo-300 self-center"
                                                >
                                                    ← Volver a crear TP
                                                </button>
                                            </div>
                                        ) : (
                                            /* Import / Create Form */
                                            isImportingAssignment ? (
                                                <div className="flex flex-col gap-4 h-full">
                                                    {!proposedAssignment ? (
                                                        <>
                                                            <div className="text-sm text-gray-400">
                                                                Pega el texto con la información del trabajo práctico para procesar con IA:
                                                            </div>
                                                            <textarea
                                                                className="flex-1 bg-neutral-900 border border-neutral-700 rounded p-3 text-sm text-gray-200 focus:outline-none focus:border-indigo-500 resize-none font-mono"
                                                                placeholder={`Trabajo Práctico 1...\nFecha límite: ...\nEnunciado: https://...\nFormulario: https://...`}
                                                                value={importAssignmentText}
                                                                onChange={(e) => setImportAssignmentText(e.target.value)}
                                                            ></textarea>
                                                            <button
                                                                onClick={handleProcessAssignmentImport}
                                                                disabled={processingAssignmentImport || !importAssignmentText.trim()}
                                                                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-600/50 disabled:cursor-not-allowed text-white py-2 rounded font-medium transition-colors flex justify-center items-center gap-2"
                                                            >
                                                                {processingAssignmentImport ? (
                                                                    <>
                                                                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                                        </svg>
                                                                        Procesando...
                                                                    </>
                                                                ) : 'Procesar con IA'}
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <div className="flex flex-col gap-4 h-full overflow-y-auto">
                                                            <div className="flex justify-between items-center">
                                                                <h5 className="font-medium text-gray-200">Resultado del Análisis</h5>
                                                                <button onClick={() => setProposedAssignment(null)} className="text-xs text-gray-400 hover:text-white">Reintentar</button>
                                                            </div>
                                                            
                                                            <div className="space-y-3">
                                                                <div>
                                                                    <label className="text-xs text-gray-500 uppercase">Título</label>
                                                                    <input 
                                                                        type="text" 
                                                                        value={proposedAssignment.title} 
                                                                        onChange={(e) => setProposedAssignment({...proposedAssignment, title: e.target.value})}
                                                                        className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-sm text-gray-200"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="text-xs text-gray-500 uppercase">Vencimiento</label>
                                                                    <input 
                                                                        type="datetime-local" 
                                                                        value={proposedAssignment.due_date ? proposedAssignment.due_date.slice(0, 16) : ''} 
                                                                        onChange={(e) => setProposedAssignment({...proposedAssignment, due_date: e.target.value})}
                                                                        className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-sm text-gray-200"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="text-xs text-gray-500 uppercase">Recursos Detectados ({proposedAssignment.resources?.length || 0})</label>
                                                                    <div className="space-y-2 mt-1 max-h-40 overflow-y-auto">
                                                                        {proposedAssignment.resources?.map((res: any, idx: number) => (
                                                                            <div key={idx} className="flex gap-2 items-start text-xs bg-neutral-900 p-2 rounded border border-neutral-800">
                                                                                <span className="uppercase text-indigo-400 shrink-0">{res.type}</span>
                                                                                <div className="flex-1 min-w-0">
                                                                                    <div className="truncate text-gray-300">{res.title}</div>
                                                                                    <div className="truncate text-gray-500">{res.url}</div>
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="mt-auto pt-4 flex gap-2">
                                                                <button
                                                                    onClick={() => {
                                                                        setProposedAssignment(null)
                                                                        setIsImportingAssignment(false)
                                                                    }}
                                                                    className="flex-1 border border-neutral-700 hover:bg-neutral-800 text-gray-300 py-2 rounded text-sm transition-colors"
                                                                >
                                                                    Cancelar
                                                                </button>
                                                                <button
                                                                    onClick={handleConfirmAssignmentImport}
                                                                    disabled={processingAssignmentImport}
                                                                    className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded text-sm font-medium transition-colors"
                                                                >
                                                                    {processingAssignmentImport ? 'Guardando...' : 'Confirmar Importación'}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-2">
                                                    <p>Selecciona "Importar con IA" para crear un nuevo TP desde texto.</p>
                                                    <p className="text-xs opacity-60">(O selecciona un TP existente para ver sus recursos)</p>
                                                </div>
                                            )
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'evaluations' && (
                    <div className="flex flex-col gap-6">
                         <div className="flex justify-between items-center">
                            <h3 className="text-lg font-medium text-gray-200">Gestión de Evaluaciones</h3>
                            {selectedCourse && (
                                <button
                                    onClick={() => setIsImportingGrades(true)}
                                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-sm transition-colors"
                                >
                                    Importar Calificaciones
                                </button>
                            )}
                         </div>
                         
                         {/* Selectors */}
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Institución</label>
                                <select 
                                    className="w-full bg-neutral-800 border border-neutral-700 rounded p-2 text-gray-200 focus:outline-none focus:border-indigo-500"
                                    value={selectedInstitution}
                                    onChange={(e) => handleInstitutionChange(e.target.value)}
                                    disabled={loading}
                                >
                                    <option value="">Seleccionar Institución</option>
                                    {institutions.map(inst => (
                                        <option key={inst.id} value={inst.id}>{inst.nombre}</option>
                                    ))}
                                </select>
                             </div>
                             
                             <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Curso</label>
                                <select 
                                    className="w-full bg-neutral-800 border border-neutral-700 rounded p-2 text-gray-200 focus:outline-none focus:border-indigo-500"
                                    value={selectedCourse}
                                    onChange={(e) => handleCourseChange(e.target.value)}
                                    disabled={!selectedInstitution || loading}
                                >
                                    <option value="">Seleccionar Curso</option>
                                    {courses.map(course => (
                                        <option key={course.id} value={course.id}>
                                            {course.name} 
                                            {(course.start_date || course.end_date) && ` (${formatDateForDisplay(course.start_date, 'dd/MM/yyyy') || '?'} - ${formatDateForDisplay(course.end_date, 'dd/MM/yyyy') || '?'})`}
                                        </option>
                                    ))}
                                </select>
                             </div>
                         </div>

                        {selectedCourse && (
                            <div className="bg-neutral-800 rounded border border-neutral-700 overflow-hidden">
                                <div className="p-4 border-b border-neutral-700 bg-neutral-800/50 flex justify-between items-center">
                                   <h4 className="font-medium text-gray-300">Planilla de Calificaciones</h4>
                                   {loadingSubmissions && <span className="text-xs text-indigo-400">Cargando notas...</span>}
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left border-collapse">
                                        <thead className="text-xs text-gray-400 uppercase bg-neutral-900/50 sticky top-0 z-10">
                                            <tr>
                                                <th className="px-4 py-3 sticky left-0 bg-neutral-900 border-r border-neutral-700 min-w-[200px]">Estudiante</th>
                                                {assignments.map(assign => (
                                                    <th key={assign.id} className="px-4 py-3 min-w-[120px] text-center border-r border-neutral-700/50">
                                                        <div className="truncate max-w-[150px]" title={assign.title}>{assign.title}</div>
                                                        <div className="text-[10px] normal-case opacity-60">{formatDateForDisplay(assign.due_date, 'dd/MM')}</div>
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-neutral-700">
                                            {[...students].sort((a, b) => {
                                                const nameA = a.last_name && a.first_name 
                                                    ? `${a.last_name}, ${a.first_name}` 
                                                    : a.email
                                                const nameB = b.last_name && b.first_name 
                                                    ? `${b.last_name}, ${b.first_name}` 
                                                    : b.email
                                                return nameA.localeCompare(nameB, undefined, { sensitivity: 'base' })
                                            }).map(student => {
                                                const studentName = student.last_name && student.first_name 
                                                    ? `${student.last_name}, ${student.first_name}` 
                                                    : student.email
                                                
                                                return (
                                                    <tr key={student.email} className="hover:bg-neutral-700/30">
                                                        <td className="px-4 py-2 sticky left-0 bg-neutral-800 border-r border-neutral-700 font-medium text-gray-300">
                                                            <div className="truncate max-w-[200px]" title={studentName}>{studentName}</div>
                                                            <div className="text-xs text-gray-500 truncate">{student.email}</div>
                                                        </td>
                                                        {assignments.map(assign => {
                                                            const submission = submissions.find(s => 
                                                                s.assignment_id === assign.id && 
                                                                s.student_email?.toLowerCase() === student.email.toLowerCase()
                                                            )
                                                            const grade = submission?.grade || ''
                                                            
                                                            return (
                                                                <td key={`${student.email}-${assign.id}`} className="px-2 py-2 border-r border-neutral-700/50 text-center">
                                                                    <input 
                                                                        type="text" 
                                                                        value={grade}
                                                                        onChange={(e) => handleGradeChange(assign.id, student.email, e.target.value)}
                                                                        onBlur={(e) => handleSaveGrade(assign.id, student.email, e.target.value)}
                                                                        className={`w-full text-center bg-transparent border-b border-transparent focus:border-indigo-500 focus:outline-none transition-colors ${
                                                                            grade ? 'text-gray-200' : 'text-gray-600'
                                                                        }`}
                                                                        placeholder="-"
                                                                    />
                                                                </td>
                                                            )
                                                        })}
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {isImportingGrades && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
                                <div className="bg-neutral-900 border border-neutral-700 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6">
                                    <h3 className="text-xl font-bold text-white mb-4">Importar Calificaciones</h3>
                                    
                                    <div className="mb-4 text-sm text-gray-400">
                                        <p>Pega el contenido de tu hoja de cálculo aquí.</p>
                                        <p className="mt-1">Formato esperado: <code>Email [tab] Nota TP1 [tab] Nota TP2...</code></p>
                                        <p className="mt-1">Las columnas de notas deben coincidir con el orden de los trabajos prácticos en el sistema.</p>
                                        <p className="mt-1">Solo se importarán las notas: "Aprobado" y "Corregir y reenviar". Las celdas vacías se ignorarán.</p>
                                    </div>

                                    <textarea
                                        value={importGradesText}
                                        onChange={(e) => setImportGradesText(e.target.value)}
                                        placeholder={`ejemplo@email.com\tAprobado\t\tCorregir y reenviar\notro@email.com\t\tAprobado`}
                                        className="w-full h-64 bg-neutral-800 border border-neutral-700 rounded p-4 text-sm text-gray-300 font-mono focus:outline-none focus:border-indigo-500 mb-4"
                                    />

                                    {importGradesError && (
                                        <div className="mb-4 p-3 bg-red-900/30 border border-red-800 text-red-200 rounded text-sm">
                                            {importGradesError}
                                        </div>
                                    )}

                                    <div className="flex justify-end gap-3">
                                        <button
                                            onClick={() => setIsImportingGrades(false)}
                                            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                                            disabled={processingGradesImport}
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            onClick={handleBulkEvaluationImport}
                                            disabled={processingGradesImport || !importGradesText.trim()}
                                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                        >
                                            {processingGradesImport ? (
                                                <>
                                                    <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                                                    Procesando...
                                                </>
                                            ) : (
                                                'Importar'
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
                
                {activeTab === 'institutions' && (
                    <div className="flex flex-col gap-4 items-center py-8">
                         <h3 className="text-lg font-medium text-gray-200">Gestión de Instituciones</h3>
                         <p className="text-gray-400 text-sm text-center max-w-md">
                             Para administrar instituciones y sus configuraciones, dirígete a la sección dedicada.
                         </p>
                         <Link 
                            href="/admin/institutions" 
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded transition-colors mt-2"
                        >
                            Ir a Gestionar Instituciones
                        </Link>
                    </div>
                )}
            </div>
        </div>
    )
}