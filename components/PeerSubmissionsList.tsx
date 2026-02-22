'use client'

import { useState, useEffect } from 'react'
import { getAssignmentPeerSubmissions } from '@/app/actions/assignments'

interface PeerSubmissionsListProps {
    courseId: string
    assignmentId: string
}

interface PeerSubmission {
    email: string
    first_name: string
    last_name: string
    avatar_url: string | null
    status: string
    repo_url: string | null
}

export default function PeerSubmissionsList({ courseId, assignmentId }: PeerSubmissionsListProps) {
    const [peers, setPeers] = useState<PeerSubmission[]>([])
    const [filteredPeers, setFilteredPeers] = useState<PeerSubmission[]>([])
    const [searchTerm, setSearchTerm] = useState('')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let isMounted = true
        async function fetchPeers() {
            try {
                const res = await getAssignmentPeerSubmissions(courseId, assignmentId)
                if (isMounted) {
                    if (res.success && res.data) {
                        // Cast data to PeerSubmission[]
                        const data = res.data as PeerSubmission[]
                        setPeers(data)
                        setFilteredPeers(data)
                    } else {
                        setError(res.error || 'Error al cargar compañeros')
                    }
                    setLoading(false)
                }
            } catch (err) {
                if (isMounted) {
                    setError('Error de conexión')
                    setLoading(false)
                }
            }
        }
        fetchPeers()
        return () => { isMounted = false }
    }, [courseId, assignmentId])

    useEffect(() => {
        if (!searchTerm.trim()) {
            setFilteredPeers(peers)
            return
        }

        const lowerTerm = searchTerm.toLowerCase()
        const filtered = peers.filter(peer => 
            (peer.first_name?.toLowerCase().includes(lowerTerm) || '') ||
            (peer.last_name?.toLowerCase().includes(lowerTerm) || '')
        )
        setFilteredPeers(filtered)
    }, [searchTerm, peers])

    const getStatusBadge = (status: string) => {
        let colorClass = "bg-gray-800 text-gray-400 border-gray-700"
        
        if (status === 'Aprobado') {
            colorClass = "bg-green-900/30 text-green-400 border-green-900"
        } else if (status === 'Corregir y reenviar') {
            colorClass = "bg-orange-900/30 text-orange-400 border-orange-900"
        } else if (status === 'Enviado' || status === 'Enviado y todavía no evaluado') {
            colorClass = "bg-indigo-900/30 text-indigo-400 border-indigo-900"
        }

        return (
            <span className={`px-2 py-1 rounded text-xs border ${colorClass} whitespace-nowrap`}>
                {status}
            </span>
        )
    }

    return (
        <div className="bg-neutral-900 border border-neutral-800 w-full rounded-xl flex flex-col shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="p-4 border-b border-neutral-800 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="relative w-full md:w-64">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <input
                        type="text"
                        placeholder="Buscar por nombre o apellido..."
                        className="bg-black border border-neutral-800 text-gray-300 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 p-2.5 placeholder-gray-600"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="flex-1 overflow-auto p-4 custom-scrollbar">
                {loading ? (
                    <div className="flex justify-center items-center h-64 text-gray-500 animate-pulse">
                        Cargando listado de estudiantes...
                    </div>
                ) : error ? (
                    <div className="flex flex-col justify-center items-center h-64 text-red-400 gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="opacity-50">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="8" x2="12" y2="12"></line>
                            <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                        <p>{error}</p>
                    </div>
                ) : filteredPeers.length === 0 ? (
                    <div className="flex justify-center items-center h-64 text-gray-500 italic">
                        {searchTerm ? 'No se encontraron estudiantes con ese nombre.' : 'No hay estudiantes matriculados en este curso.'}
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-lg border border-neutral-800">
                        <table className="w-full text-left text-sm">
                            <thead className="text-xs uppercase text-gray-500 bg-neutral-950 font-semibold sticky top-0 z-10">
                                <tr>
                                    <th className="px-4 py-3 bg-neutral-950">Estudiante</th>
                                    <th className="px-4 py-3 bg-neutral-950 text-center">Estado</th>
                                    <th className="px-4 py-3 bg-neutral-950 text-right">Repositorio</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-800 bg-neutral-900/50">
                                {filteredPeers.map((peer) => (
                                    <tr key={peer.email} className="hover:bg-neutral-800/50 transition-colors group">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center overflow-hidden border border-neutral-700 text-xs font-bold text-indigo-400 shrink-0">
                                                    {peer.avatar_url ? (
                                                        <img src={peer.avatar_url} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span>{peer.first_name?.[0]?.toUpperCase()}{peer.last_name?.[0]?.toUpperCase()}</span>
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="font-medium text-gray-200 truncate max-w-[150px] md:max-w-[300px]">
                                                        {peer.last_name}, {peer.first_name}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {getStatusBadge(peer.status)}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {peer.repo_url ? (
                                                <a 
                                                    href={peer.repo_url} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 hover:underline text-xs bg-indigo-900/10 hover:bg-indigo-900/20 px-2 py-1 rounded transition-colors"
                                                >
                                                    <span>Ver Repo</span>
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                                        <polyline points="15 3 21 3 21 9"></polyline>
                                                        <line x1="10" y1="14" x2="21" y2="3"></line>
                                                    </svg>
                                                </a>
                                            ) : (
                                                <span className="text-gray-600 text-xs">-</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}
