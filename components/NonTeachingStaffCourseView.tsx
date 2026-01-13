'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { enrollStudentByNodocente, removeStudentByNodocente, searchUsersForEnrollment, updateStudentProfileByNodocente } from '@/app/actions/courses'

interface Student {
    id: string
    email: string
    created_at: string
    first_name?: string
    last_name?: string
    dni?: string
    phone?: string
    birth_date?: string
    avatar_url?: string
    is_verified?: boolean
}

interface Course {
    id: string
    name: string
    description: string
    status?: string
    institution_id: string
    instituciones: {
        nombre: string
    }
}

export default function NonTeachingStaffCourseView({ 
    course,
    students = [],
    teachers = [],
    staff = []
}: { 
    course: Course
    students?: Student[]
    teachers?: any[]
    staff?: any[]
}) {
    const [isPending, startTransition] = useTransition()
    const [showEnrollForm, setShowEnrollForm] = useState(false)
    const [searchTerm, setSearchTerm] = useState('') // Filter for enrolled students list
    
    // Collapsible sections
    const [isStudentsExpanded, setIsStudentsExpanded] = useState(true)
    const [isTeachersExpanded, setIsTeachersExpanded] = useState(false)
    const [isStaffExpanded, setIsStaffExpanded] = useState(false)
    
    // Enrollment Flow States
    const [enrollmentStep, setEnrollmentStep] = useState<'search' | 'results' | 'form' | 'confirm'>('search')
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState<any[]>([])
    const [isSearchingUser, setIsSearchingUser] = useState(false)
    const [selectedUser, setSelectedUser] = useState<any>(null)
    
    // Edit states
    const [showEditForm, setShowEditForm] = useState(false)
    const [editingStudent, setEditingStudent] = useState<Student | null>(null)
    const [editFirstName, setEditFirstName] = useState('')
    const [editLastName, setEditLastName] = useState('')
    const [editDni, setEditDni] = useState('')
    const [editPhone, setEditPhone] = useState('')
    const [editBirthDate, setEditBirthDate] = useState('')

    // Form states for new user
    const [email, setEmail] = useState('')
    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [dni, setDni] = useState('')
    const [phone, setPhone] = useState('')
    const [birthDate, setBirthDate] = useState('')
    
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
    const router = useRouter()

    const resetEnrollmentState = () => {
        setEnrollmentStep('search')
        setSearchQuery('')
        setSearchResults([])
        setSelectedUser(null)
        setEmail('')
        setFirstName('')
        setLastName('')
        setDni('')
        setPhone('')
        setBirthDate('')
        setMessage(null)
    }

    const toggleEnrollForm = () => {
        if (showEnrollForm) {
            setShowEnrollForm(false)
            resetEnrollmentState()
        } else {
            setShowEnrollForm(true)
        }
    }

    const handleSearch = async (e?: React.FormEvent) => {
        e?.preventDefault()
        if (searchQuery.length < 2) return
        
        setIsSearchingUser(true)
        const result = await searchUsersForEnrollment(course.id, searchQuery)
        if (result.success && result.data) {
            setSearchResults(result.data)
            setEnrollmentStep('results')
        }
        setIsSearchingUser(false)
    }

    const handleSelectUser = (user: any) => {
        setSelectedUser(user)
        setEmail(user.email)
        setFirstName(user.first_name || '')
        setLastName(user.last_name || '')
        setDni(user.dni || '')
        setPhone(user.phone || '')
        setBirthDate(user.birth_date || '')
        setEnrollmentStep('confirm')
    }

    const handleCreateNewUser = () => {
        setSelectedUser(null)
        setEmail(searchQuery.includes('@') ? searchQuery : '')
        setFirstName('')
        setLastName('')
        setDni('')
        setPhone('')
        setBirthDate('')
        setEnrollmentStep('form')
    }

    const handleEnroll = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!email) return

        setMessage(null)
        
        startTransition(async () => {
            const profileData = {
                first_name: firstName,
                last_name: lastName,
                dni,
                phone,
                birth_date: birthDate
            }
            
            const result = await enrollStudentByNodocente(course.id, email, profileData)
            if (result.success) {
                setMessage({ type: 'success', text: 'Estudiante matriculado correctamente' })
                setTimeout(() => {
                    toggleEnrollForm()
                    router.refresh()
                }, 1500)
            } else {
                setMessage({ type: 'error', text: result.error || 'Error al matricular estudiante' })
            }
        })
    }

    const handleRemove = async (studentEmail: string) => {
        if (!confirm('¿Estás seguro de que deseas eliminar a este estudiante del curso?')) return

        startTransition(async () => {
            const result = await removeStudentByNodocente(course.id, studentEmail)
            if (result.success) {
                router.refresh()
            } else {
                alert(result.error || 'Error al eliminar estudiante')
            }
        })
    }

    const handleEditStart = (student: Student) => {
        setEditingStudent(student)
        setEditFirstName(student.first_name || '')
        setEditLastName(student.last_name || '')
        setEditDni(student.dni || '')
        setEditPhone(student.phone || '')
        setEditBirthDate(student.birth_date || '')
        setShowEditForm(true)
        setMessage(null)
    }

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!editingStudent) return

        startTransition(async () => {
            const profileData = {
                first_name: editFirstName,
                last_name: editLastName,
                dni: editDni,
                phone: editPhone,
                birth_date: editBirthDate
            }
            
            const result = await updateStudentProfileByNodocente(course.id, editingStudent.email, profileData)
            if (result.success) {
                setMessage({ type: 'success', text: 'Perfil actualizado correctamente' })
                setTimeout(() => {
                    setShowEditForm(false)
                    setEditingStudent(null)
                    router.refresh()
                }, 1500)
            } else {
                setMessage({ type: 'error', text: result.error || 'Error al actualizar perfil' })
            }
        })
    }

    const filteredStudents = students.filter(student => {
        // ... existing filter logic
        const term = searchTerm.toLowerCase()
        return (
            student.email.toLowerCase().includes(term) ||
            (student.first_name?.toLowerCase().includes(term) || false) ||
            (student.last_name?.toLowerCase().includes(term) || false) ||
            (student.dni?.includes(term) || false)
        )
    })

    return (
        <div className="flex min-h-screen flex-col items-center p-8 font-[family-name:var(--font-geist-sans)] bg-black text-gray-200">
            <main className="w-full max-w-6xl flex flex-col gap-8 items-start">
                
                {/* Header / Breadcrumb */}
                <div className="w-full">
                    <Link href="/" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 px-3 py-2 rounded-md transition-all mb-6 group">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:-translate-x-0.5 transition-transform">
                            <path d="m15 18-6-6 6-6"/>
                        </svg>
                        Volver al Dashboard
                    </Link>
                    
                    <div className="bg-neutral-900 p-8 rounded-xl shadow-lg border border-neutral-800 w-full relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-6 opacity-10">
                            <svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>
                            </svg>
                        </div>
                        
                        <div className="relative z-10">
                            <div className="flex flex-wrap items-center gap-3 mb-4">
                                <span className="text-xs font-bold text-indigo-400 bg-indigo-900/30 border border-indigo-900/50 px-2.5 py-1 rounded-full uppercase tracking-wide">
                                    {course.instituciones?.nombre || 'Institución'}
                                </span>
                                
                                <span className={`text-[10px] px-2.5 py-1 rounded-full border uppercase font-bold tracking-wider ${
                                    course.status === 'Activo' ? 'bg-green-900/20 text-green-400 border-green-900/50' :
                                    course.status === 'Finalizado' ? 'bg-blue-900/20 text-blue-400 border-blue-900/50' :
                                    'bg-gray-800/50 text-gray-400 border-gray-700/50'
                                }`}>
                                    {course.status || 'Borrador'}
                                </span>
                            </div>
                            
                            <h1 className="text-4xl font-bold text-white mb-3 tracking-tight">{course.name}</h1>
                            <p className="text-gray-400 text-lg max-w-3xl leading-relaxed">{course.description}</p>
                        </div>
                    </div>
                </div>



                {/* Edit Student Modal/Form */}
                {showEditForm && editingStudent && (
                    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                        <div className="w-full max-w-2xl bg-neutral-900 rounded-lg shadow-2xl border border-neutral-800 flex flex-col max-h-[90vh]">
                            <div className="p-6 border-b border-neutral-800 flex justify-between items-center">
                                <h2 className="text-xl font-bold text-white">Editar Estudiante</h2>
                                <button onClick={() => setShowEditForm(false)} className="text-gray-400 hover:text-white">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                                </button>
                            </div>
                            
                            <div className="p-6 overflow-y-auto">
                                <div className="flex items-center gap-4 mb-6 p-4 bg-neutral-800 rounded-lg border border-neutral-700">
                                    {editingStudent.avatar_url ? (
                                        <img src={editingStudent.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover" />
                                    ) : (
                                        <div className="w-12 h-12 rounded-full bg-indigo-900/50 flex items-center justify-center text-sm font-bold text-indigo-300">
                                            {(editingStudent.first_name?.[0] || editingStudent.email[0]).toUpperCase()}
                                        </div>
                                    )}
                                    <div>
                                        <div className="font-bold text-white">{editingStudent.email}</div>
                                        <div className="text-sm text-gray-400">Editando información de perfil</div>
                                    </div>
                                </div>

                                <form onSubmit={handleUpdateProfile} className="flex flex-col gap-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-400 mb-1">Nombre</label>
                                            <input type="text" value={editFirstName} onChange={(e) => setEditFirstName(e.target.value)} className="w-full bg-neutral-800 border border-neutral-700 rounded p-2.5 text-white focus:ring-2 focus:ring-indigo-500 outline-none" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-400 mb-1">Apellido</label>
                                            <input type="text" value={editLastName} onChange={(e) => setEditLastName(e.target.value)} className="w-full bg-neutral-800 border border-neutral-700 rounded p-2.5 text-white focus:ring-2 focus:ring-indigo-500 outline-none" />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-1">DNI</label>
                                        <input type="text" value={editDni} onChange={(e) => setEditDni(e.target.value)} className="w-full bg-neutral-800 border border-neutral-700 rounded p-2.5 text-white focus:ring-2 focus:ring-indigo-500 outline-none" />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-1">Teléfono</label>
                                        <input type="tel" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className="w-full bg-neutral-800 border border-neutral-700 rounded p-2.5 text-white focus:ring-2 focus:ring-indigo-500 outline-none" />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-1">Fecha de Nacimiento</label>
                                        <input type="date" value={editBirthDate} onChange={(e) => setEditBirthDate(e.target.value)} className="w-full bg-neutral-800 border border-neutral-700 rounded p-2.5 text-white focus:ring-2 focus:ring-indigo-500 outline-none [color-scheme:dark]" />
                                    </div>

                                    {message && (
                                        <div className={`p-4 rounded-md text-sm border flex items-center gap-2 ${message.type === 'success' ? 'bg-green-900/20 text-green-400 border-green-900/50' : 'bg-red-900/20 text-red-400 border-red-900/50'}`}>
                                            {message.text}
                                        </div>
                                    )}

                                    <div className="flex justify-end gap-3 pt-4 border-t border-neutral-800">
                                        <button type="button" onClick={() => setShowEditForm(false)} className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-md font-medium transition-colors border border-neutral-700">Cancelar</button>
                                        <button type="submit" disabled={isPending} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md font-medium transition-colors disabled:opacity-50">
                                            {isPending ? 'Guardando...' : 'Guardar Cambios'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}

                {/* Teachers Section */}
                <div className="w-full">
                    <button 
                        onClick={() => setIsTeachersExpanded(!isTeachersExpanded)}
                        className="w-full flex items-center justify-between p-4 bg-neutral-900 border border-neutral-800 rounded-lg hover:bg-neutral-800/50 transition-colors mb-6 group"
                    >
                        <div className="flex items-center gap-3">
                             <div className={`p-2 rounded-lg bg-neutral-800 text-indigo-400 group-hover:bg-indigo-900/20 group-hover:text-indigo-300 transition-colors`}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M2 21a8 8 0 0 1 13.292-6"/>
                                    <circle cx="10" cy="8" r="5"/>
                                    <path d="M22 19a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2 7 7 0 0 1 4.43-6.49"/>
                                </svg>
                             </div>
                             <div className="text-left">
                                <h2 className="text-xl font-bold text-white">Docentes Asignados</h2>
                                <p className="text-sm text-gray-500">Listado de docentes del curso</p>
                             </div>
                        </div>
                        <div className="flex items-center gap-4">
                             <span className="bg-neutral-800 text-gray-400 text-sm px-2 py-0.5 rounded-full">
                                {teachers.length}
                            </span>
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`text-gray-500 transition-transform duration-200 ${isTeachersExpanded ? 'rotate-180' : ''}`}>
                                <path d="m6 9 6 6 6-6"/>
                            </svg>
                        </div>
                    </button>
                    
                    {isTeachersExpanded && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12 animate-in slide-in-from-top-2 duration-200">
                             {teachers.length === 0 ? (
                                <div className="col-span-full text-center py-8 text-gray-500 bg-neutral-900/50 rounded-xl border border-neutral-800 border-dashed">
                                    No hay docentes asignados.
                                </div>
                             ) : (
                                teachers.map((teacher, idx) => (
                                    <div key={teacher.id || idx} className="bg-neutral-900 rounded-xl border border-neutral-800 p-5 hover:border-neutral-700 transition-all group relative overflow-hidden">
                                        <div className="flex items-start justify-between mb-4 relative z-10">
                                            <div className="flex items-center gap-3">
                                                {teacher.avatar_url ? (
                                                    <img src={teacher.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover ring-2 ring-neutral-800" />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-full bg-indigo-900/30 flex items-center justify-center text-xs font-bold text-indigo-400 ring-2 ring-neutral-800">
                                                        {(teacher.first_name?.[0] || teacher.email[0]).toUpperCase()}
                                                    </div>
                                                )}
                                                <div>
                                                    <h3 className="text-lg font-bold text-gray-100 line-clamp-1">
                                                        {(teacher.last_name && teacher.first_name) 
                                                            ? `${teacher.last_name}, ${teacher.first_name}` 
                                                            : (teacher.last_name || teacher.first_name || teacher.email || '').trim()}
                                                    </h3>
                                                    <p className="text-xs text-gray-500 truncate max-w-[150px]">{teacher.email}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                             )}
                        </div>
                    )}
                </div>

                {/* Staff Section */}
                <div className="w-full">
                    <button 
                        onClick={() => setIsStaffExpanded(!isStaffExpanded)}
                        className="w-full flex items-center justify-between p-4 bg-neutral-900 border border-neutral-800 rounded-lg hover:bg-neutral-800/50 transition-colors mb-6 group"
                    >
                        <div className="flex items-center gap-3">
                             <div className={`p-2 rounded-lg bg-neutral-800 text-indigo-400 group-hover:bg-indigo-900/20 group-hover:text-indigo-300 transition-colors`}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                                    <circle cx="9" cy="7" r="4"/>
                                    <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                                </svg>
                             </div>
                             <div className="text-left">
                                <h2 className="text-xl font-bold text-white">Nodocentes Asignados</h2>
                                <p className="text-sm text-gray-500">Listado de personal nodocente</p>
                             </div>
                        </div>
                        <div className="flex items-center gap-4">
                             <span className="bg-neutral-800 text-gray-400 text-sm px-2 py-0.5 rounded-full">
                                {staff.length}
                            </span>
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`text-gray-500 transition-transform duration-200 ${isStaffExpanded ? 'rotate-180' : ''}`}>
                                <path d="m6 9 6 6 6-6"/>
                            </svg>
                        </div>
                    </button>
                    
                    {isStaffExpanded && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12 animate-in slide-in-from-top-2 duration-200">
                             {staff.length === 0 ? (
                                <div className="col-span-full text-center py-8 text-gray-500 bg-neutral-900/50 rounded-xl border border-neutral-800 border-dashed">
                                    No hay personal nodocente asignado.
                                </div>
                             ) : (
                                staff.map((member, idx) => (
                                    <div key={member.id || idx} className="bg-neutral-900 rounded-xl border border-neutral-800 p-5 hover:border-neutral-700 transition-all group relative overflow-hidden">
                                        <div className="flex items-start justify-between mb-4 relative z-10">
                                            <div className="flex items-center gap-3">
                                                {member.avatar_url ? (
                                                    <img src={member.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover ring-2 ring-neutral-800" />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-full bg-indigo-900/30 flex items-center justify-center text-xs font-bold text-indigo-400 ring-2 ring-neutral-800">
                                                        {(member.first_name?.[0] || member.email[0]).toUpperCase()}
                                                    </div>
                                                )}
                                                <div>
                                                    <h3 className="text-lg font-bold text-gray-100 line-clamp-1">
                                                        {(member.last_name && member.first_name) 
                                                            ? `${member.last_name}, ${member.first_name}` 
                                                            : (member.last_name || member.first_name || member.email || '').trim()}
                                                    </h3>
                                                    <p className="text-xs text-gray-500 truncate max-w-[150px]">{member.email}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                             )}
                        </div>
                    )}
                </div>

                {/* Students Section */}
                <div className="w-full">
                    <button 
                        onClick={() => setIsStudentsExpanded(!isStudentsExpanded)}
                        className="w-full flex items-center justify-between p-4 bg-neutral-900 border border-neutral-800 rounded-lg hover:bg-neutral-800/50 transition-colors mb-6 group"
                    >
                        <div className="flex items-center gap-3">
                             <div className={`p-2 rounded-lg bg-neutral-800 text-indigo-400 group-hover:bg-indigo-900/20 group-hover:text-indigo-300 transition-colors`}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                                    <circle cx="9" cy="7" r="4"/>
                                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                                </svg>
                             </div>
                             <div className="text-left">
                                <h2 className="text-xl font-bold text-white">Estudiantes Matriculados</h2>
                                <p className="text-sm text-gray-500">Gestión de estudiantes del curso</p>
                             </div>
                        </div>
                        <div className="flex items-center gap-4">
                             <span className="bg-neutral-800 text-gray-400 text-sm px-2 py-0.5 rounded-full">
                                {students.length}
                            </span>
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`text-gray-500 transition-transform duration-200 ${isStudentsExpanded ? 'rotate-180' : ''}`}>
                                <path d="m6 9 6 6 6-6"/>
                            </svg>
                        </div>
                    </button>

                    {isStudentsExpanded && (
                        <div className="animate-in slide-in-from-top-2 duration-200">
                            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                                <div className="w-full relative">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                                        <circle cx="11" cy="11" r="8"/>
                                        <path d="m21 21-4.3-4.3"/>
                                    </svg>
                                    <input 
                                        type="text" 
                                        placeholder="Filtrar por nombre, email o DNI..." 
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full bg-neutral-900 border border-neutral-800 rounded-md pl-10 pr-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>
                                <button 
                                    onClick={toggleEnrollForm}
                                    className={`w-full md:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-md font-medium transition-all shrink-0 ${
                                        showEnrollForm 
                                            ? 'bg-neutral-800 text-gray-300 hover:bg-neutral-700 border border-neutral-700' 
                                            : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-900/20'
                                    }`}
                                >
                                    {showEnrollForm ? (
                                        <>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M18 6 6 18"/>
                                                <path d="m6 6 12 12"/>
                                            </svg>
                                            Cancelar
                                        </>
                                    ) : (
                                        <>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                                                <circle cx="8.5" cy="7" r="4"/>
                                                <line x1="20" x2="20" y1="8" y2="14"/>
                                                <line x1="23" x2="17" y1="11" y2="11"/>
                                            </svg>
                                            Matricular Estudiante
                                        </>
                                    )}
                                </button>
                            </div>

                            {/* Enrollment Form Collapsible */}
                            {showEnrollForm && (
                                <div className="w-full bg-neutral-900 p-6 rounded-lg shadow-xl border border-neutral-800 animate-in fade-in slide-in-from-top-4 duration-200 mb-6">
                                    <h2 className="text-xl font-bold mb-6 text-white border-b border-neutral-800 pb-2">
                                        {enrollmentStep === 'search' && 'Buscar Usuario'}
                                        {enrollmentStep === 'results' && 'Resultados de Búsqueda'}
                                        {enrollmentStep === 'confirm' && 'Confirmar Matriculación'}
                                        {enrollmentStep === 'form' && 'Matricular Nuevo Usuario'}
                                    </h2>

                                    {/* STEP: SEARCH */}
                                    {enrollmentStep === 'search' && (
                                        <div className="space-y-4">
                                            <form onSubmit={handleSearch} className="flex gap-4">
                                                <div className="flex-1 relative">
                                                    <input
                                                        type="text"
                                                        value={searchQuery}
                                                        onChange={(e) => setSearchQuery(e.target.value)}
                                                        placeholder="Buscar por nombre, DNI o email..."
                                                        className="w-full bg-neutral-800 border border-neutral-700 rounded-md pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                                                        autoFocus
                                                    />
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                                                        <circle cx="11" cy="11" r="8"/>
                                                        <path d="m21 21-4.3-4.3"/>
                                                    </svg>
                                                </div>
                                                <button 
                                                    type="submit"
                                                    disabled={isSearchingUser || searchQuery.length < 2}
                                                    className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                                >
                                                    {isSearchingUser ? (
                                                        <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                                                    ) : (
                                                        'Buscar'
                                                    )}
                                                </button>
                                            </form>

                                            <div className="flex items-center gap-4 py-2">
                                                <div className="h-px bg-neutral-800 flex-1"></div>
                                                <span className="text-gray-500 text-sm">o</span>
                                                <div className="h-px bg-neutral-800 flex-1"></div>
                                            </div>

                                            <button
                                                onClick={handleCreateNewUser}
                                                className="w-full py-3 bg-neutral-800 hover:bg-neutral-700 text-gray-300 hover:text-white rounded-md font-medium transition-colors border border-neutral-700 border-dashed flex items-center justify-center gap-2"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                                                    <circle cx="8.5" cy="7" r="4"/>
                                                    <line x1="20" x2="20" y1="8" y2="14"/>
                                                    <line x1="23" x2="17" y1="11" y2="11"/>
                                                </svg>
                                                Ingresar estudiante no registrado
                                            </button>
                                        </div>
                                    )}

                                    {/* STEP: RESULTS */}
                                    {enrollmentStep === 'results' && (
                                        <div className="space-y-4">
                                            {searchResults.length === 0 ? (
                                                <div className="text-center py-8 text-gray-400">
                                                    No se encontraron usuarios con ese criterio.
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-1 gap-3">
                                                    {searchResults.map((user) => (
                                                        <div key={user.email} className={`flex items-center justify-between p-4 rounded-lg border ${user.is_enrolled ? 'bg-neutral-800/50 border-neutral-800 opacity-60' : 'bg-neutral-800 border-neutral-700'}`}>
                                                            <div className="flex items-center gap-4">
                                                                {user.avatar_url ? (
                                                                    <img src={user.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                                                                ) : (
                                                                    <div className="w-10 h-10 rounded-full bg-indigo-900/50 flex items-center justify-center text-xs font-bold text-indigo-300">
                                                                        {(user.first_name?.[0] || user.email[0]).toUpperCase()}
                                                                    </div>
                                                                )}
                                                                <div>
                                                                    <div className="font-medium text-white">
                                                                        {user.first_name} {user.last_name}
                                                                    </div>
                                                                    <div className="text-sm text-gray-400">
                                                                        {user.email} • {user.dni || 'Sin DNI'}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div>
                                                                {user.is_enrolled ? (
                                                                    <span className="px-3 py-1 bg-neutral-700 text-gray-400 rounded-full text-xs font-medium">
                                                                        Ya matriculado
                                                                    </span>
                                                                ) : (
                                                                    <button
                                                                        onClick={() => handleSelectUser(user)}
                                                                        className="px-4 py-1.5 bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/30 border border-indigo-600/30 rounded-md text-sm font-medium transition-colors"
                                                                    >
                                                                        Seleccionar
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            
                                            <div className="flex justify-between items-center pt-4 border-t border-neutral-800 mt-4">
                                                <button
                                                    onClick={() => setEnrollmentStep('search')}
                                                    className="text-gray-400 hover:text-white text-sm font-medium"
                                                >
                                                    ← Volver a buscar
                                                </button>
                                                <button
                                                    onClick={handleCreateNewUser}
                                                    className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-md text-sm font-medium transition-colors border border-neutral-700"
                                                >
                                                    No encuentro al usuario, crear uno nuevo
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* STEP: CONFIRM EXISTING USER */}
                                    {enrollmentStep === 'confirm' && selectedUser && (
                                        <div className="space-y-6">
                                            <div className="bg-neutral-800 p-6 rounded-lg border border-neutral-700 flex items-center gap-6">
                                                {selectedUser.avatar_url ? (
                                                    <img src={selectedUser.avatar_url} alt="" className="w-16 h-16 rounded-full object-cover" />
                                                ) : (
                                                    <div className="w-16 h-16 rounded-full bg-indigo-900/50 flex items-center justify-center text-xl font-bold text-indigo-300">
                                                        {(selectedUser.first_name?.[0] || selectedUser.email[0]).toUpperCase()}
                                                    </div>
                                                )}
                                                <div>
                                                    <h3 className="text-xl font-bold text-white">
                                                        {selectedUser.first_name} {selectedUser.last_name}
                                                    </h3>
                                                    <p className="text-gray-400">{selectedUser.email}</p>
                                                    <div className="flex gap-4 mt-2 text-sm text-gray-500">
                                                        <span>DNI: {selectedUser.dni || '-'}</span>
                                                        <span>Tel: {selectedUser.phone || '-'}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex justify-end gap-3">
                                                <button
                                                    onClick={() => setEnrollmentStep('results')}
                                                    className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-md font-medium transition-colors border border-neutral-700"
                                                >
                                                    Cancelar
                                                </button>
                                                <button
                                                    onClick={handleEnroll}
                                                    disabled={isPending}
                                                    className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md font-medium transition-colors disabled:opacity-50"
                                                >
                                                    {isPending ? 'Matriculando...' : 'Confirmar Matriculación'}
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* STEP: CREATE NEW USER FORM */}
                                    {enrollmentStep === 'form' && (
                                        <form onSubmit={handleEnroll} className="flex flex-col gap-6">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div>
                                                    <label htmlFor="email" className="block text-sm font-medium text-gray-400 mb-1">
                                                        Email <span className="text-red-500">*</span>
                                                    </label>
                                                    <input
                                                        type="email"
                                                        id="email"
                                                        value={email}
                                                        onChange={(e) => setEmail(e.target.value)}
                                                        placeholder="estudiante@ejemplo.com"
                                                        className="w-full bg-neutral-800 border border-neutral-700 rounded p-2.5 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                                                        required
                                                    />
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label htmlFor="firstName" className="block text-sm font-medium text-gray-400 mb-1">
                                                            Nombre
                                                        </label>
                                                        <input
                                                            type="text"
                                                            id="firstName"
                                                            value={firstName}
                                                            onChange={(e) => setFirstName(e.target.value)}
                                                            className="w-full bg-neutral-800 border border-neutral-700 rounded p-2.5 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label htmlFor="lastName" className="block text-sm font-medium text-gray-400 mb-1">
                                                            Apellido
                                                        </label>
                                                        <input
                                                            type="text"
                                                            id="lastName"
                                                            value={lastName}
                                                            onChange={(e) => setLastName(e.target.value)}
                                                            className="w-full bg-neutral-800 border border-neutral-700 rounded p-2.5 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                                                        />
                                                    </div>
                                                </div>

                                                <div>
                                                    <label htmlFor="dni" className="block text-sm font-medium text-gray-400 mb-1">
                                                        DNI
                                                    </label>
                                                    <input
                                                        type="text"
                                                        id="dni"
                                                        value={dni}
                                                        onChange={(e) => setDni(e.target.value)}
                                                        className="w-full bg-neutral-800 border border-neutral-700 rounded p-2.5 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                                                    />
                                                </div>

                                                <div>
                                                    <label htmlFor="phone" className="block text-sm font-medium text-gray-400 mb-1">
                                                        Teléfono
                                                    </label>
                                                    <input
                                                        type="tel"
                                                        id="phone"
                                                        value={phone}
                                                        onChange={(e) => setPhone(e.target.value)}
                                                        className="w-full bg-neutral-800 border border-neutral-700 rounded p-2.5 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                                                    />
                                                </div>

                                                <div>
                                                    <label htmlFor="birthDate" className="block text-sm font-medium text-gray-400 mb-1">
                                                        Fecha de Nacimiento
                                                    </label>
                                                    <input
                                                        type="date"
                                                        id="birthDate"
                                                        value={birthDate}
                                                        onChange={(e) => setBirthDate(e.target.value)}
                                                        className="w-full bg-neutral-800 border border-neutral-700 rounded p-2.5 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none [color-scheme:dark]"
                                                    />
                                                </div>
                                            </div>
                                            
                                            {message && (
                                                <div className={`p-4 rounded-md text-sm border flex items-center gap-2 ${message.type === 'success' ? 'bg-green-900/20 text-green-400 border-green-900/50' : 'bg-red-900/20 text-red-400 border-red-900/50'}`}>
                                                    {message.type === 'success' ? (
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                                                    ) : (
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
                                                    )}
                                                    {message.text}
                                                </div>
                                            )}

                                            <div className="flex justify-between items-center pt-4 border-t border-neutral-800">
                                                <button
                                                    type="button"
                                                    onClick={() => setEnrollmentStep('results')}
                                                    className="text-gray-400 hover:text-white text-sm font-medium"
                                                >
                                                    ← Volver
                                                </button>
                                                <button
                                                    type="submit"
                                                    disabled={isPending}
                                                    className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                                                >
                                                    {isPending ? 'Procesando...' : 'Crear y Matricular'}
                                                </button>
                                            </div>
                                        </form>
                                    )}
                                </div>
                            )}

                            {filteredStudents.length === 0 ? (
                                <div className="text-center py-16 text-gray-500 bg-neutral-900/50 rounded-xl border border-neutral-800 border-dashed">
                                    {searchTerm ? 'No se encontraron estudiantes con ese criterio.' : 'No hay estudiantes matriculados en este curso.'}
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {filteredStudents.map((student) => (
                                        <div key={student.email} className={`bg-neutral-900 rounded-xl border border-neutral-800 p-6 flex flex-col justify-between transition-colors group relative overflow-hidden ${!student.is_verified ? 'opacity-60' : 'hover:border-neutral-700'}`}>
                                            
                                            {!student.is_verified && (
                                                <div className="absolute top-3 left-4 z-10">
                                                    <span className="px-2 py-0.5 bg-yellow-500/10 text-yellow-500 text-[10px] uppercase font-bold tracking-wider rounded border border-yellow-500/20">
                                                        No Logueado
                                                    </span>
                                                </div>
                                            )}
        
                                            <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity z-20 flex gap-2">
                                                <button
                                                    onClick={() => handleEditStart(student)}
                                                    disabled={isPending}
                                                    className="text-gray-500 hover:text-indigo-400 transition-colors p-2 hover:bg-indigo-900/10 rounded-full"
                                                    title="Editar estudiante"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                                                </button>
                                                <button
                                                    onClick={() => handleRemove(student.email)}
                                                    disabled={isPending}
                                                    className="text-gray-500 hover:text-red-400 transition-colors p-2 hover:bg-red-900/10 rounded-full"
                                                    title="Eliminar estudiante"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M3 6h18"/>
                                                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                                                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                                                        <line x1="10" x2="10" y1="11" y2="17"/>
                                                        <line x1="14" x2="14" y1="11" y2="17"/>
                                                    </svg>
                                                </button>
                                            </div>
        
                                            <div>
                                                <div className="flex items-start gap-4 mb-4">
                                                    {student.avatar_url ? (
                                                        <img 
                                                            src={student.avatar_url} 
                                                            alt={(student.last_name || student.first_name) ? `${student.last_name || ''} ${student.first_name || ''}`.trim() : student.email}
                                                            className="w-12 h-12 rounded-full object-cover border border-neutral-700"
                                                        />
                                                    ) : (
                                                        <div className="w-12 h-12 rounded-full bg-indigo-900/30 text-indigo-400 flex items-center justify-center font-bold text-lg border border-indigo-900/50">
                                                            {(student.first_name?.[0] || student.email[0]).toUpperCase()}
                                                            {(student.last_name?.[0] || '').toUpperCase()}
                                                        </div>
                                                    )}
                                                    <div>
                                                        <h3 className="text-lg font-bold text-gray-100 line-clamp-1">
                                                            {(student.last_name && student.first_name) 
                                                                ? `${student.last_name}, ${student.first_name}` 
                                                                : (student.last_name || student.first_name || student.email || '').trim()}
                                                        </h3>
                                                        <p className="text-sm text-gray-400 line-clamp-1" title={student.email}>
                                                            {student.email}
                                                        </p>
                                                    </div>
                                                </div>
        
                                                <div className="space-y-2 text-sm text-gray-500 mt-2">
                                                    {student.dni && (
                                                        <div className="flex items-center gap-2">
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-70"><rect width="18" height="12" x="3" y="6" rx="2"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M6 12h.01"/><path d="M6 15h.01"/></svg>
                                                            <span>DNI: {student.dni}</span>
                                                        </div>
                                                    )}
                                                    {student.phone && (
                                                        <div className="flex items-center gap-2">
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-70"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                                                            <span>{student.phone}</span>
                                                        </div>
                                                    )}
                                                    <div className="flex items-center gap-2">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-70"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                                                        <span>Inscripción: {new Date(student.created_at).toLocaleDateString()}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}
