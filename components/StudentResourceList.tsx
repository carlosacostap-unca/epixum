'use client'

import { useState, useEffect } from 'react'
import { getStudentClassResources } from '@/app/actions/resources'

interface Resource {
    id: string
    title: string
    url: string
    type: string
}

interface StudentResourceListProps {
    classId: string
}

export default function StudentResourceList({ classId }: StudentResourceListProps) {
    const [resources, setResources] = useState<Resource[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadResources()
    }, [classId])

    async function loadResources() {
        const result = await getStudentClassResources(classId)
        if (result.success && result.data) {
            setResources(result.data)
        }
        setLoading(false)
    }

    if (loading) return <div className="text-xs text-gray-500">Cargando recursos...</div>

    if (resources.length === 0) {
        return <p className="text-xs text-gray-600 italic mt-2">No hay recursos disponibles.</p>
    }

    return (
        <div className="mt-4 pt-4 border-t border-neutral-800">
            <h4 className="text-sm font-semibold text-gray-300 mb-3">Recursos ({resources.length})</h4>
            <div className="space-y-2">
                {resources.map(res => (
                    <div key={res.id} className="flex justify-between items-center group/res bg-black/30 p-2 rounded hover:bg-black/50 transition-colors">
                        <a href={res.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 overflow-hidden w-full">
                            <span className="text-xs bg-neutral-800 text-gray-400 px-1 rounded uppercase tracking-wider scale-90 origin-left shrink-0">
                                {res.type}
                            </span>
                            <span className="text-sm text-indigo-400 hover:underline truncate">
                                {res.title}
                            </span>
                        </a>
                    </div>
                ))}
            </div>
        </div>
    )
}
