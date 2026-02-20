'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import ProfileManager from '@/components/ProfileManager'
import { formatDateForDisplay } from '@/utils/date'

interface Course {
    id: string
    name: string
    description: string
    institution_name: string
    status?: string
    start_date?: string
    end_date?: string
}

interface StudentDashboardProps {
    courses: Course[]
    userEmail: string
    profile?: any
    hasMultipleRoles?: boolean
}

export default function StudentDashboard({ courses, userEmail, profile, hasMultipleRoles = false }: StudentDashboardProps) {
    const [imageError, setImageError] = useState(false)
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => {
            document.removeEventListener("mousedown", handleClickOutside)
        }
    }, [])

    return (
        <div className="flex min-h-screen flex-col items-center p-4 md:p-8 bg-black font-[family-name:var(--font-geist-sans)]">
            <main className="w-full max-w-4xl flex flex-col gap-8 items-start">
                <div className="flex justify-between w-full items-center bg-neutral-900 p-4 md:p-6 rounded-lg shadow-sm border border-neutral-800 gap-4">
                    <div className="flex items-center gap-3">
                        <Image 
                            src="/epixum-logo.png" 
                            alt="Epixum Logo" 
                            width={40} 
                            height={40}
                            className="object-contain"
                        />
                        <span className="text-xl md:text-2xl font-bold text-white tracking-tight">Epixum</span>
                    </div>
                    <div className="relative" ref={menuRef}>
                        {profile && (
                            <>
                                <button 
                                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                                    className="flex items-center gap-3 text-gray-200 hover:text-indigo-400 font-medium transition-colors group focus:outline-none"
                                >
                                    <div className="relative w-8 h-8 md:w-9 md:h-9 rounded-full overflow-hidden border border-gray-700 group-hover:border-indigo-500/50 transition-colors bg-neutral-800 flex-shrink-0">
                                        <Image 
                                            src={profile.avatar_url && !imageError ? profile.avatar_url : "/epixum-logo.png"} 
                                            alt={`${profile.first_name} ${profile.last_name}`}
                                            fill
                                            className="object-cover"
                                            onError={() => setImageError(true)}
                                            sizes="36px"
                                        />
                                    </div>
                                    <span className="text-sm md:text-base max-w-[120px] md:max-w-none truncate">{profile.first_name} {profile.last_name}</span>
                                    <svg 
                                        className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isMenuOpen ? 'rotate-180' : ''}`} 
                                        fill="none" 
                                        stroke="currentColor" 
                                        viewBox="0 0 24 24"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                                    </svg>
                                </button>

                                {isMenuOpen && (
                                    <div className="absolute right-0 mt-2 w-48 bg-neutral-900 border border-neutral-800 rounded-lg shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                                        <div className="px-4 py-3 border-b border-neutral-800 sm:hidden">
                                            <p className="text-sm font-medium text-white">{profile.first_name} {profile.last_name}</p>
                                            <p className="text-xs text-gray-500 truncate">{userEmail}</p>
                                        </div>
                                        <Link 
                                            href="/student/profile" 
                                            className="flex items-center gap-2 px-4 py-3 text-sm text-gray-300 hover:bg-neutral-800 hover:text-white transition-colors border-b border-neutral-800"
                                            onClick={() => setIsMenuOpen(false)}
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                                            Ver Perfil
                                        </Link>
                                        <form action="/auth/signout" method="post" className="w-full">
                                            <button 
                                                type="submit"
                                                className="w-full text-left flex items-center gap-2 px-4 py-3 text-sm text-red-400 hover:bg-neutral-800 hover:text-red-300 transition-colors"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                                                Cerrar sesión
                                            </button>
                                        </form>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>

                <div className="w-full">
                    <h2 className="text-2xl font-bold text-gray-100 mb-6">Mis Cursos Matriculados</h2>
                    
                    {courses.length === 0 ? (
                        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-12 text-center text-gray-500">
                            No estás matriculado en ningún curso actualmente.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {courses.map(course => (
                                <Link href={`/student/courses/${course.id}`} key={course.id} className="block group">
                                    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6 hover:bg-neutral-800 transition-all h-full flex flex-col justify-between">
                                        <div>
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-xs font-medium text-indigo-400 bg-indigo-900/30 px-2 py-1 rounded">
                                                            {course.institution_name || 'Institución'}
                                                        </span>
                                                        {course.status && (
                                                            <span className={`text-[10px] px-2 py-0.5 rounded border uppercase font-bold tracking-wider ${
                                                                course.status === 'Activo' ? 'bg-green-900/30 text-green-400 border-green-800' :
                                                                course.status === 'En Prueba' ? 'bg-yellow-900/30 text-yellow-400 border-yellow-800' :
                                                                course.status === 'Finalizado' ? 'bg-blue-900/30 text-blue-400 border-blue-800' :
                                                                'bg-gray-800 text-gray-400 border-gray-700'
                                                            }`}>
                                                                {course.status}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <h3 className="text-xl font-bold text-gray-100 mt-2 group-hover:text-indigo-400 transition-colors">
                                                        {course.name}
                                                    </h3>
                                                </div>
                                            </div>
                                            <p className="text-gray-400 text-sm mb-6 line-clamp-2">
                                                {course.description || 'Sin descripción'}
                                            </p>
                                            <div className="flex gap-4 text-xs text-gray-500 mt-1 mb-4">
                                                <div>
                                                    <span className="font-semibold text-gray-600 uppercase mr-1">Inicio:</span>
                                                    {course.start_date ? formatDateForDisplay(course.start_date, 'dd/MM/yyyy') : 'Sin fecha'}
                                                </div>
                                                <div>
                                                    <span className="font-semibold text-gray-600 uppercase mr-1">Fin:</span>
                                                    {course.end_date ? formatDateForDisplay(course.end_date, 'dd/MM/yyyy') : 'Sin fecha'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}
