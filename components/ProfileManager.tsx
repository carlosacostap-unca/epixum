'use client'

import { useState } from 'react'
import { updateMyProfile } from '@/app/actions/profile'

interface Profile {
    id: string
    email: string
    first_name?: string
    last_name?: string
    dni?: string
    birth_date?: string
    phone?: string
    roles?: string[]
    avatar_url?: string
}

export default function ProfileManager({ 
    initialProfile, 
    hasMultipleRoles = false 
}: { 
    initialProfile: Profile
    hasMultipleRoles?: boolean 
}) {
    const [isOpen, setIsOpen] = useState(false)
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    async function handleSubmit(formData: FormData) {
        setIsSaving(true)
        setError(null)
        const res = await updateMyProfile(formData)
        setIsSaving(false)
        if (res.success) {
            setIsOpen(false)
        } else {
            setError(res.error || 'Error al actualizar perfil')
        }
    }

    // Toggle menu
    const toggleMenu = () => setIsMenuOpen(!isMenuOpen)

    // Close menu when clicking profile option
    const openProfileModal = () => {
        setIsMenuOpen(false)
        setIsOpen(true)
    }

    const displayName = initialProfile.first_name 
        ? `${initialProfile.first_name} ${initialProfile.last_name || ''}`
        : initialProfile.email

    return (
        <div className="relative">
            <button 
                onClick={toggleMenu}
                className="flex items-center gap-3 bg-neutral-800/50 hover:bg-neutral-800 px-3 py-2 rounded-lg border border-neutral-700 transition-colors group"
            >
                <div className="relative w-8 h-8 rounded-full overflow-hidden border border-neutral-600 group-hover:border-neutral-500">
                    {initialProfile.avatar_url ? (
                        <img 
                            src={initialProfile.avatar_url} 
                            alt="Avatar" 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.nextElementSibling?.classList.remove('hidden');
                            }}
                        />
                    ) : null}
                    <div className={`w-full h-full flex items-center justify-center bg-neutral-700 text-gray-400 ${initialProfile.avatar_url ? 'hidden' : ''}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                            <circle cx="12" cy="7" r="4"></circle>
                        </svg>
                    </div>
                </div>
                
                <div className="flex flex-col items-start">
                    <span className="text-sm font-medium text-gray-200 group-hover:text-white max-w-[150px] truncate">
                        {displayName}
                    </span>
                </div>

                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`text-gray-400 transition-transform duration-200 ${isMenuOpen ? 'rotate-180' : ''}`}>
                    <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
            </button>

            {/* Dropdown Menu */}
            {isMenuOpen && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsMenuOpen(false)}></div>
                    <div className="absolute right-0 mt-2 w-56 bg-neutral-900 border border-neutral-800 rounded-lg shadow-xl z-20 overflow-hidden py-1">
                        <button 
                            onClick={openProfileModal}
                            className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-neutral-800 flex items-center gap-2 transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                <circle cx="12" cy="7" r="4"></circle>
                            </svg>
                            Mi Perfil
                        </button>

                        {hasMultipleRoles && (
                            <a 
                                href="/" 
                                className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-neutral-800 flex items-center gap-2 transition-colors border-t border-neutral-800"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="9" cy="7" r="4"></circle>
                                    <polyline points="16 3.13 16 9 20 7"></polyline>
                                </svg>
                                Cambiar Rol
                            </a>
                        )}

                        <div className="border-t border-neutral-800 mt-1 pt-1">
                            <form action="/auth/signout" method="post">
                                <button 
                                    type="submit"
                                    className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-neutral-800 flex items-center gap-2 transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                                        <polyline points="16 17 21 12 16 7"></polyline>
                                        <line x1="21" y1="12" x2="9" y2="12"></line>
                                    </svg>
                                    Cerrar Sesión
                                </button>
                            </form>
                        </div>
                    </div>
                </>
            )}

            {/* Profile Modal */}
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-neutral-800 flex justify-between items-center sticky top-0 bg-neutral-900 z-10">
                            <h2 className="text-xl font-bold text-white flex items-center gap-3">
                                {initialProfile.avatar_url && (
                                    <img 
                                        src={initialProfile.avatar_url} 
                                        alt="Avatar" 
                                        className="w-8 h-8 rounded-full object-cover border border-neutral-700"
                                        referrerPolicy="no-referrer"
                                    />
                                )}
                                Editar Perfil
                            </h2>
                            <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-gray-300">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </div>
                        
                        <form action={handleSubmit} className="p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Email</label>
                                    <input 
                                        type="text" 
                                        value={initialProfile.email} 
                                        disabled 
                                        className="w-full bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-gray-500 cursor-not-allowed"
                                    />
                                    <p className="text-xs text-gray-600 mt-1">El email no se puede modificar.</p>
                                </div>

                                <div>
                                    <label htmlFor="first_name" className="block text-sm font-medium text-gray-400 mb-1">Nombres</label>
                                    <input 
                                        type="text" 
                                        name="first_name"
                                        id="first_name"
                                        defaultValue={initialProfile.first_name || ''}
                                        className="w-full bg-black border border-neutral-700 rounded-md px-3 py-2 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="last_name" className="block text-sm font-medium text-gray-400 mb-1">Apellidos</label>
                                    <input 
                                        type="text" 
                                        name="last_name"
                                        id="last_name"
                                        defaultValue={initialProfile.last_name || ''}
                                        className="w-full bg-black border border-neutral-700 rounded-md px-3 py-2 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="dni" className="block text-sm font-medium text-gray-400 mb-1">DNI</label>
                                    <input 
                                        type="text" 
                                        name="dni"
                                        id="dni"
                                        defaultValue={initialProfile.dni || ''}
                                        className="w-full bg-black border border-neutral-700 rounded-md px-3 py-2 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="birth_date" className="block text-sm font-medium text-gray-400 mb-1">Fecha de Nacimiento</label>
                                    <input 
                                        type="date" 
                                        name="birth_date"
                                        id="birth_date"
                                        defaultValue={initialProfile.birth_date || ''}
                                        className="w-full bg-black border border-neutral-700 rounded-md px-3 py-2 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="phone" className="block text-sm font-medium text-gray-400 mb-1">Teléfono</label>
                                    <input 
                                        type="tel" 
                                        name="phone"
                                        id="phone"
                                        defaultValue={initialProfile.phone || ''}
                                        className="w-full bg-black border border-neutral-700 rounded-md px-3 py-2 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="text-red-400 text-sm bg-red-900/20 p-2 rounded border border-red-900">
                                    {error}
                                </div>
                            )}

                            <div className="pt-4 flex justify-end gap-3 border-t border-neutral-800">
                                <button 
                                    type="button"
                                    onClick={() => setIsOpen(false)}
                                    className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={isSaving}
                                    className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-500 text-white rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
