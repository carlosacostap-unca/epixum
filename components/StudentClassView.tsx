'use client'

import StudentResourceList from './StudentResourceList'

interface ClassItem {
    id: string
    title: string
    description: string
    date: string
    sprint_id?: string | null
}

interface Sprint {
    id: string
    title: string
}

interface StudentClassViewProps {
    courseId: string
    classes: ClassItem[]
    sprints?: Sprint[]
}

export default function StudentClassView({ courseId, classes, sprints = [] }: StudentClassViewProps) {
    if (classes.length === 0) {
        return (
            <div className="text-center py-12 text-gray-500 bg-neutral-900/50 rounded-lg border border-neutral-800/50">
                No hay clases publicadas en este curso.
            </div>
        )
    }

    const getSprintTitle = (sprintId?: string | null) => {
        if (!sprintId) return null
        const sprint = sprints.find(s => s.id === sprintId)
        return sprint ? sprint.title : null
    }

    return (
        <div className="space-y-6">
            {classes.map((cls) => {
                const sprintTitle = getSprintTitle(cls.sprint_id)
                return (
                    <div key={cls.id} className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-medium text-indigo-400 bg-indigo-900/30 px-2 py-1 rounded">
                                        Clase
                                    </span>
                                    {sprintTitle && (
                                        <span className="text-xs font-medium text-indigo-300 bg-indigo-900/50 px-2 py-1 rounded border border-indigo-800">
                                            {sprintTitle}
                                        </span>
                                    )}
                                    <span className="text-xs text-gray-500">
                                        {new Date(cls.date).toLocaleDateString()}
                                    </span>
                                </div>
                                <h3 className="text-xl font-bold text-gray-100">{cls.title}</h3>
                            </div>
                        </div>
                        
                        <div className="prose prose-invert max-w-none mb-6 text-gray-400 text-sm">
                            <p className="whitespace-pre-wrap">{cls.description}</p>
                        </div>

                        <StudentResourceList classId={cls.id} />
                    </div>
                )
            })}
        </div>
    )
}
