'use client'

import { useState, useEffect } from 'react'
import { createQuery, createResponse, toggleResolved, deleteQuery, getAllCourseQueries, getCourseQueries, getQueryResponses, searchCourseQueries } from '@/app/actions/queries'

interface Query {
    id: string
    course_id: string
    context_type: 'general' | 'class' | 'assignment'
    context_id: string | null
    content: string
    user_email: string
    first_name?: string
    last_name?: string
    created_at: string
    is_resolved: boolean
    response_count?: number
    query_responses: Response[]
}

interface Response {
    id: string
    content: string
    user_email: string
    first_name?: string
    last_name?: string
    user_role: string
    created_at: string
}

function formatDate(dateString: string) {
    const date = new Date(dateString)
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
    const dayName = days[date.getDay()]
    const day = date.getDate().toString().padStart(2, '0')
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const year = date.getFullYear()
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    
    return `${dayName} ${day}/${month}/${year}, ${hours}:${minutes} horas`
}

interface Props {
    courseId: string
    classes: any[]
    assignments: any[]
    currentUserEmail: string
    isTeacher: boolean
}

export default function CourseQueriesTab({ courseId, classes, assignments, currentUserEmail, isTeacher }: Props) {
    // Tabs state
    const [activeTab, setActiveTab] = useState<'recent' | 'topics'>('recent')

    // Data state
    const [recentQueries, setRecentQueries] = useState<Query[]>([])
    const [treeQueries, setTreeQueries] = useState<Query[]>([])
    
    // Loading state
    const [loadingRecent, setLoadingRecent] = useState(true)
    const [loadingTree, setLoadingTree] = useState(false)
    const [loadingMore, setLoadingMore] = useState(false)
    
    // Pagination state
    const [page, setPage] = useState(1)
    const [hasMore, setHasMore] = useState(true)
    
    // Filter state
    const [filter, setFilter] = useState<'all' | 'unresolved' | 'resolved'>('all')
    
    // Create form state
    const [isCreating, setIsCreating] = useState(false)
    const [newQueryContent, setNewQueryContent] = useState('')
    const [newQueryType, setNewQueryType] = useState<'general' | 'class' | 'assignment'>('general')
    const [newQueryContextId, setNewQueryContextId] = useState<string>('')

    // Search state
    const [searchTerm, setSearchTerm] = useState('')
    const [searchResults, setSearchResults] = useState<Query[]>([])
    const [isSearching, setIsSearching] = useState(false)
    const [searching, setSearching] = useState(false)

    // Initial load
    useEffect(() => {
        loadRecentQueries(1, true)
    }, [courseId])

    // Search effect
    useEffect(() => {
        const delaySearch = setTimeout(async () => {
            if (searchTerm.trim().length > 2) {
                setSearching(true)
                const result = await searchCourseQueries(courseId, searchTerm)
                if (result.success && result.data) {
                    setSearchResults(result.data)
                }
                setSearching(false)
                setIsSearching(true)
            } else if (searchTerm.trim().length === 0) {
                setSearchResults([])
                setIsSearching(false)
            }
        }, 500)

        return () => clearTimeout(delaySearch)
    }, [searchTerm, courseId])

    // Load tree data when switching to topics tab for the first time
    useEffect(() => {
        if (activeTab === 'topics' && treeQueries.length === 0) {
            loadTreeQueries()
        }
    }, [activeTab])

    async function loadRecentQueries(pageNum: number, reset: boolean = false) {
        if (reset) {
            setLoadingRecent(true)
            setPage(1)
        } else {
            setLoadingMore(true)
        }

        const result = await getCourseQueries(courseId, pageNum, 20)
        
        if (result.success && result.data) {
            if (reset) {
                setRecentQueries(result.data)
            } else {
                setRecentQueries(prev => [...prev, ...result.data])
            }
            setHasMore(result.hasMore ?? false)
            setPage(pageNum)
        }
        
        if (reset) setLoadingRecent(false)
        else setLoadingMore(false)
    }

    async function loadTreeQueries() {
        setLoadingTree(true)
        const result = await getAllCourseQueries(courseId)
        if (result.success && result.data) {
            setTreeQueries(result.data)
        }
        setLoadingTree(false)
    }

    function handleLoadMore() {
        loadRecentQueries(page + 1)
    }

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault()
        if (!newQueryContent.trim()) return

        const result = await createQuery(
            courseId, 
            newQueryType, 
            newQueryContextId || null, 
            newQueryContent
        )

        if (result.success) {
            setNewQueryContent('')
            setIsCreating(false)
            // Reload both lists to be safe, or just the active one
            loadRecentQueries(1, true)
            if (treeQueries.length > 0) loadTreeQueries()
        } else {
            alert('Error al crear consulta: ' + result.error)
        }
    }

    function handleQueryUpdate() {
        // Refresh current view
        if (activeTab === 'recent') {
            // Ideally we just update the specific item, but reloading page 1 is safer for consistency
            // Or we could reload the whole list if we want to be correct about sorting
            // For now, let's reload the first page to see the update
            // Wait, if I'm on page 3 and I update an item, reloading page 1 might lose my context.
            // Better: QueryItem handles its own internal state updates. 
            // We only need to reload if we delete or resolve (which might affect filters).
            // Let's reload the current list gently or just re-fetch everything?
            // "Recientes" is a flat list. Re-fetching page 1 resets the view.
            // Let's just re-fetch the current data or leave it to local state if possible.
            // But if I delete, I must remove it.
            // Let's do a reload for now.
            loadRecentQueries(1, true)
        } else {
            loadTreeQueries()
        }
    }

    // Filter logic
    // For "Recent", we filter locally or should we filter on server?
    // getCourseQueries doesn't support filter by status yet. 
    // Let's filter locally for now, but that breaks pagination if all items on page 1 are filtered out.
    // However, the previous implementation filtered locally.
    // For "Recent" tab (paginated), local filtering is bad UX (page could be empty).
    // BUT, implementing server-side filtering for status is a separate task.
    // For now, I will apply the filter to the rendered list.
    const filteredRecent = recentQueries.filter(q => {
        if (filter === 'unresolved' && q.is_resolved) return false
        if (filter === 'resolved' && !q.is_resolved) return false
        return true
    })

    const filteredTree = treeQueries.filter(q => {
        if (filter === 'unresolved' && q.is_resolved) return false
        if (filter === 'resolved' && !q.is_resolved) return false
        return true
    })

    // Grouping for Topics Tab
    const groupedData = {
        general: filteredTree.filter(q => q.context_type === 'general'),
        classes: classes
            .map(cls => ({
                id: cls.id,
                title: cls.title,
                date: cls.date,
                queries: filteredTree.filter(q => q.context_type === 'class' && q.context_id === cls.id)
            }))
            .filter(group => group.queries.length > 0)
            .sort((a, b) => {
                const dateA = a.date ? new Date(a.date).getTime() : 0
                const dateB = b.date ? new Date(b.date).getTime() : 0
                return dateA - dateB
            }),
        assignments: assignments
            .map(ass => ({
                id: ass.id,
                title: ass.title,
                queries: filteredTree.filter(q => q.context_type === 'assignment' && q.context_id === ass.id)
            }))
            .filter(group => group.queries.length > 0)
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex flex-wrap items-center gap-4">
                        {/* View Tabs */}
                        <div className="flex bg-neutral-900 p-1 rounded-lg border border-neutral-800">
                            <button
                                onClick={() => setActiveTab('recent')}
                                className={`px-4 py-1.5 text-sm font-medium rounded transition-colors ${
                                    activeTab === 'recent' 
                                        ? 'bg-neutral-800 text-white shadow-sm' 
                                        : 'text-gray-400 hover:text-white'
                                }`}
                            >
                                Actividad Reciente
                            </button>
                            <button
                                onClick={() => setActiveTab('topics')}
                                className={`px-4 py-1.5 text-sm font-medium rounded transition-colors ${
                                    activeTab === 'topics' 
                                        ? 'bg-neutral-800 text-white shadow-sm' 
                                        : 'text-gray-400 hover:text-white'
                                }`}
                            >
                                Por Temas
                            </button>
                        </div>

                        {/* Filters */}
                        <div className="h-6 w-px bg-neutral-800 mx-2 hidden md:block"></div>
                        
                        <div className="flex gap-2 bg-neutral-900 p-1 rounded-lg border border-neutral-800">
                            <button 
                                onClick={() => setFilter('all')}
                                className={`px-3 py-1 text-xs rounded transition-colors ${filter === 'all' ? 'bg-indigo-900 text-indigo-100' : 'text-gray-400 hover:text-white'}`}
                            >
                                Todas
                            </button>
                            <button 
                                onClick={() => setFilter('unresolved')}
                                className={`px-3 py-1 text-xs rounded transition-colors ${filter === 'unresolved' ? 'bg-indigo-900 text-indigo-100' : 'text-gray-400 hover:text-white'}`}
                            >
                                Pendientes
                            </button>
                            <button 
                                onClick={() => setFilter('resolved')}
                                className={`px-3 py-1 text-xs rounded transition-colors ${filter === 'resolved' ? 'bg-indigo-900 text-indigo-100' : 'text-gray-400 hover:text-white'}`}
                            >
                                Resueltas
                            </button>
                        </div>
                    </div>

                    <div className="flex gap-2 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                            <input 
                                type="text" 
                                placeholder="Buscar..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg py-1.5 px-3 pl-9 text-sm text-gray-200 focus:outline-none focus:border-indigo-500 placeholder-gray-600"
                            />
                            {searchTerm && (
                                <button 
                                    onClick={() => setSearchTerm('')}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-300"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            )}
                        </div>
                        <button 
                            onClick={() => setIsCreating(true)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-1.5 rounded transition-colors whitespace-nowrap"
                        >
                            Nueva Consulta
                        </button>
                    </div>
                </div>
            </div>

            {isCreating && (
                <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6 animate-in fade-in slide-in-from-top-4">
                    <h3 className="text-lg font-bold text-white mb-4">Nueva Consulta</h3>
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Tipo</label>
                                <select 
                                    value={newQueryType}
                                    onChange={(e) => {
                                        setNewQueryType(e.target.value as any)
                                        setNewQueryContextId('')
                                    }}
                                    className="w-full bg-black border border-neutral-700 rounded p-2 text-gray-200 text-sm"
                                >
                                    <option value="general">General</option>
                                    <option value="class">Clase</option>
                                    <option value="assignment">Trabajo Práctico</option>
                                </select>
                            </div>
                            
                            {newQueryType !== 'general' && (
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">
                                        {newQueryType === 'class' ? 'Seleccionar Clase' : 'Seleccionar TP'}
                                    </label>
                                    <select 
                                        value={newQueryContextId}
                                        onChange={(e) => setNewQueryContextId(e.target.value)}
                                        required
                                        className="w-full bg-black border border-neutral-700 rounded p-2 text-gray-200 text-sm"
                                    >
                                        <option value="">Seleccionar...</option>
                                        {newQueryType === 'class' && classes.map(c => {
                                            const date = c.date ? new Date(c.date).toLocaleDateString() : ''
                                            return (
                                                <option key={c.id} value={c.id}>
                                                    {c.title} {date ? `(${date})` : ''}
                                                </option>
                                            )
                                        })}
                                        {newQueryType === 'assignment' && assignments.map(a => (
                                            <option key={a.id} value={a.id}>{a.title}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Consulta</label>
                            <textarea 
                                value={newQueryContent}
                                onChange={(e) => setNewQueryContent(e.target.value)}
                                placeholder="Escribe tu consulta aquí..."
                                className="w-full bg-black border border-neutral-700 rounded p-3 text-gray-200 text-sm h-32 focus:outline-none focus:border-indigo-500"
                                required
                            />
                        </div>

                        <div className="flex justify-end gap-2">
                            <button 
                                type="button"
                                onClick={() => setIsCreating(false)}
                                className="text-gray-400 hover:text-white px-4 py-2 text-sm"
                            >
                                Cancelar
                            </button>
                            <button 
                                type="submit"
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded text-sm font-medium"
                            >
                                Publicar Consulta
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Search Results & Tabs Content */}
            {isSearching ? (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                     <div className="flex justify-between items-center pb-2 border-b border-neutral-800">
                        <h3 className="text-sm font-medium text-gray-300">
                            Resultados de búsqueda: "{searchTerm}"
                        </h3>
                        <span className="text-xs text-gray-500">
                            {searchResults.length} {searchResults.length === 1 ? 'resultado' : 'resultados'}
                        </span>
                     </div>
                     
                     {searching ? (
                        <div className="text-center py-12 text-gray-500">Buscando...</div>
                     ) : searchResults.length === 0 ? (
                        <div className="text-center py-12 bg-neutral-900/50 rounded-lg border border-neutral-800/50">
                            <p className="text-gray-400">No se encontraron resultados para "{searchTerm}"</p>
                            <button onClick={() => setSearchTerm('')} className="text-indigo-400 hover:underline text-sm mt-2">
                                Limpiar búsqueda
                            </button>
                        </div>
                     ) : (
                        <div className="space-y-6">
                            {searchResults.map(query => (
                                <QueryItem 
                                    key={query.id} 
                                    query={query} 
                                    courseId={courseId}
                                    currentUserEmail={currentUserEmail}
                                    isTeacher={isTeacher}
                                    contextLabel={getQueryContextLabel(query, classes, assignments)}
                                    onUpdate={handleQueryUpdate}
                                />
                            ))}
                        </div>
                     )}
                </div>
            ) : (
                <>
                    {/* Recent Queries Tab Content */}
                    {activeTab === 'recent' && (
                        <div className="space-y-4">
                            {loadingRecent ? (
                                <div className="text-center py-12 text-gray-500">Cargando actividad reciente...</div>
                            ) : filteredRecent.length === 0 ? (
                                <div className="text-center py-12 bg-neutral-900/50 rounded-lg border border-neutral-800/50">
                                    <p className="text-gray-400 mb-2">No hay consultas recientes.</p>
                                    <button onClick={() => setIsCreating(true)} className="text-indigo-400 hover:underline text-sm">
                                        Haz una consulta
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div className="space-y-6">
                                        {filteredRecent.map(query => (
                                            <QueryItem 
                                                key={query.id} 
                                                query={query} 
                                                courseId={courseId}
                                                currentUserEmail={currentUserEmail}
                                                isTeacher={isTeacher}
                                                contextLabel={getQueryContextLabel(query, classes, assignments)}
                                                onUpdate={handleQueryUpdate}
                                            />
                                        ))}
                                    </div>
                                    
                                    {hasMore && (
                                        <div className="text-center pt-4">
                                            <button
                                                onClick={handleLoadMore}
                                                disabled={loadingMore}
                                                className="text-indigo-400 hover:text-indigo-300 text-sm disabled:opacity-50"
                                            >
                                                {loadingMore ? 'Cargando...' : 'Cargar más consultas'}
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {/* Topics Tab Content */}
                    {activeTab === 'topics' && (
                        <div className="space-y-4">
                             {loadingTree ? (
                                <div className="text-center py-12 text-gray-500">Cargando temas...</div>
                            ) : filteredTree.length === 0 ? (
                                <div className="text-center py-12 bg-neutral-900/50 rounded-lg border border-neutral-800/50">
                                    <p className="text-gray-400 mb-2">No hay consultas que coincidan con los filtros.</p>
                                </div>
                            ) : (
                                <div className="space-y-8">
                                    {/* General Section */}
                                    {groupedData.general.length > 0 && (
                                        <Section title="Generales" defaultExpanded>
                                            <div className="space-y-4">
                                                {groupedData.general.map(query => (
                                                    <QueryItem 
                                                        key={query.id} 
                                                        query={query} 
                                                        courseId={courseId}
                                                        currentUserEmail={currentUserEmail}
                                                        isTeacher={isTeacher}
                                                        contextLabel=""
                                                        onUpdate={handleQueryUpdate}
                                                    />
                                                ))}
                                            </div>
                                        </Section>
                                    )}

                                    {/* Classes Section */}
                                    {groupedData.classes.length > 0 && (
                                        <Section title="Clases" defaultExpanded>
                                            <div className="space-y-6 ml-4 border-l border-neutral-800 pl-4">
                                                {groupedData.classes.map(group => (
                                                    <Section 
                                                        key={group.id} 
                                                        title={`${group.title}${group.date ? ` (${new Date(group.date).toLocaleDateString()})` : ''}`}
                                                        defaultExpanded
                                                    >
                                                        <div className="space-y-4">
                                                            {group.queries.map(query => (
                                                                <QueryItem 
                                                                    key={query.id} 
                                                                    query={query} 
                                                                    courseId={courseId}
                                                                    currentUserEmail={currentUserEmail}
                                                                    isTeacher={isTeacher}
                                                                    contextLabel=""
                                                                    onUpdate={handleQueryUpdate}
                                                                />
                                                            ))}
                                                        </div>
                                                    </Section>
                                                ))}
                                            </div>
                                        </Section>
                                    )}

                                    {/* Assignments Section */}
                                    {groupedData.assignments.length > 0 && (
                                        <Section title="Trabajos Prácticos" defaultExpanded>
                                            <div className="space-y-6 ml-4 border-l border-neutral-800 pl-4">
                                                {groupedData.assignments.map(group => (
                                                    <Section 
                                                        key={group.id} 
                                                        title={group.title}
                                                        defaultExpanded
                                                    >
                                                        <div className="space-y-4">
                                                            {group.queries.map(query => (
                                                                <QueryItem 
                                                                    key={query.id} 
                                                                    query={query} 
                                                                    courseId={courseId}
                                                                    currentUserEmail={currentUserEmail}
                                                                    isTeacher={isTeacher}
                                                                    contextLabel=""
                                                                    onUpdate={handleQueryUpdate}
                                                                />
                                                            ))}
                                                        </div>
                                                    </Section>
                                                ))}
                                            </div>
                                        </Section>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    )
}

function Section({ title, children, defaultExpanded = false }: { title: string, children: React.ReactNode, defaultExpanded?: boolean }) {
    const [expanded, setExpanded] = useState(defaultExpanded)

    return (
        <div className="space-y-4">
            <button 
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-2 text-lg font-semibold text-indigo-400 hover:text-indigo-300 transition-colors w-full text-left"
            >
                {expanded ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                )}
                {title}
            </button>
            
            {expanded && (
                <div className="animate-in fade-in slide-in-from-top-2">
                    {children}
                </div>
            )}
        </div>
    )
}

function getQueryContextLabel(query: Query, classes: any[], assignments: any[]) {
    if (query.context_type === 'general') return 'General'
    if (query.context_type === 'class') {
        const cls = classes.find(c => c.id === query.context_id)
        return cls ? `Clase: ${cls.title}` : 'Clase'
    }
    if (query.context_type === 'assignment') {
        const ass = assignments.find(a => a.id === query.context_id)
        return ass ? `TP: ${ass.title}` : 'TP'
    }
    return ''
}

function QueryItem({ query, courseId, currentUserEmail, isTeacher, contextLabel, onUpdate }: { 
    query: Query, 
    courseId: string, 
    currentUserEmail: string, 
    isTeacher: boolean,
    contextLabel: string,
    onUpdate: () => void
}) {
    const [expanded, setExpanded] = useState(false)
    const [replyContent, setReplyContent] = useState('')
    const [isReplying, setIsReplying] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    // Lazy loading state
    const [responses, setResponses] = useState<Response[]>(query.query_responses || [])
    const [loadingResponses, setLoadingResponses] = useState(false)
    const [responsesLoaded, setResponsesLoaded] = useState(query.query_responses?.length > 0)
    const [responseCount, setResponseCount] = useState(query.response_count || query.query_responses?.length || 0)

    // Fetch responses when expanded if not already loaded and there are responses to show
    useEffect(() => {
        if (expanded && !responsesLoaded && responseCount > 0) {
            loadResponses()
        }
    }, [expanded])

    async function loadResponses() {
        setLoadingResponses(true)
        const result = await getQueryResponses(query.id)
        if (result.success && result.data) {
            setResponses(result.data)
            setResponsesLoaded(true)
        }
        setLoadingResponses(false)
    }

    async function handleReply(e: React.FormEvent) {
        e.preventDefault()
        if (!replyContent.trim()) return

        setSubmitting(true)
        const result = await createResponse(query.id, replyContent, courseId)
        
        if (result.success) {
            setReplyContent('')
            setIsReplying(false)
            
            // If responses are already loaded, we can append locally
            if (responsesLoaded) {
                 // We don't have the full response object from createResponse, so we reload
                 // But for better UX we could fetch just the new one or reload all
                 loadResponses()
            } else {
                 // If not loaded, just reload responses (which will set loaded to true)
                 loadResponses()
            }
            setResponseCount(prev => prev + 1)
            onUpdate() // Optional: to refresh parent list metadata if needed
        } else {
            alert('Error: ' + result.error)
        }
        setSubmitting(false)
    }

    async function handleToggleResolved() {
        if (!confirm(query.is_resolved ? '¿Marcar como no resuelta?' : '¿Marcar como resuelta?')) return
        await toggleResolved(query.id, courseId)
        onUpdate()
    }

    async function handleDelete() {
        if (!confirm('¿Eliminar esta consulta y todas sus respuestas?')) return
        await deleteQuery(query.id, courseId)
        onUpdate()
    }

    const canDelete = isTeacher || query.user_email === currentUserEmail
    const canResolve = isTeacher || query.user_email === currentUserEmail

    const authorName = query.last_name && query.first_name
        ? `${query.last_name}, ${query.first_name}`
        : query.user_email

    return (
        <div className={`bg-neutral-900 border rounded-lg overflow-hidden transition-all ${query.is_resolved ? 'border-green-900/30' : 'border-neutral-800'}`}>
            <div className="p-4 cursor-pointer hover:bg-neutral-800/30 transition-colors" onClick={() => setExpanded(!expanded)}>
                <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${
                                query.is_resolved ? 'bg-green-900/30 text-green-400' : 'bg-yellow-900/30 text-yellow-500'
                            }`}>
                                {query.is_resolved ? 'Resuelta' : 'Pendiente'}
                            </span>
                            {contextLabel && (
                                <span className="text-xs text-indigo-400 bg-indigo-900/20 px-2 py-0.5 rounded border border-indigo-900/30 whitespace-nowrap">
                                    {contextLabel}
                                </span>
                            )}
                            <span className="text-xs text-gray-500 whitespace-nowrap">
                                {formatDate(query.created_at)}
                            </span>
                        </div>
                        <h4 className="text-gray-200 font-medium text-lg leading-snug">{query.content}</h4>
                        <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                            <span>Por: {authorName}</span>
                            <span>•</span>
                            <span>{responseCount} respuestas</span>
                        </div>
                    </div>
                    <div className="text-gray-500">
                        {expanded ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                        )}
                    </div>
                </div>
            </div>

            {expanded && (
                <div className="bg-black/20 border-t border-neutral-800 p-4 animate-in fade-in slide-in-from-top-2">
                    <div className="space-y-4">
                        {/* Responses List */}
                        {loadingResponses ? (
                            <div className="text-center py-4 text-gray-500 text-xs">Cargando respuestas...</div>
                        ) : responses.length > 0 ? (
                            <div className="space-y-3">
                                {responses.map(response => (
                                    <div key={response.id} className={`p-3 rounded-lg border ${
                                        response.user_role === 'docente' 
                                            ? 'bg-indigo-900/10 border-indigo-900/30' 
                                            : 'bg-neutral-800/30 border-neutral-800'
                                    }`}>
                                        <div className="flex justify-between items-start mb-1">
                                            <span className={`text-xs font-medium ${
                                                response.user_role === 'docente' ? 'text-indigo-400' : 'text-gray-400'
                                            }`}>
                                                {response.last_name && response.first_name 
                                                    ? `${response.last_name}, ${response.first_name}`
                                                    : response.user_email
                                                }
                                                {response.user_role === 'docente' && ' (Docente)'}
                                            </span>
                                            <span className="text-[10px] text-gray-600">
                                                {formatDate(response.created_at)}
                                            </span>
                                        </div>
                                        <p className="text-gray-300 text-sm">{response.content}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-center text-gray-500 text-sm py-2">No hay respuestas aún.</p>
                        )}

                        {/* Reply Form */}
                        {isReplying ? (
                            <form onSubmit={handleReply} className="mt-4">
                                <textarea
                                    value={replyContent}
                                    onChange={(e) => setReplyContent(e.target.value)}
                                    placeholder="Escribe tu respuesta..."
                                    className="w-full bg-black border border-neutral-700 rounded p-3 text-gray-200 text-sm h-24 focus:outline-none focus:border-indigo-500 mb-2"
                                    autoFocus
                                />
                                <div className="flex justify-end gap-2">
                                    <button 
                                        type="button"
                                        onClick={() => setIsReplying(false)}
                                        className="text-gray-400 hover:text-white px-3 py-1.5 text-xs"
                                    >
                                        Cancelar
                                    </button>
                                    <button 
                                        type="submit"
                                        disabled={submitting}
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded text-xs font-medium disabled:opacity-50"
                                    >
                                        {submitting ? 'Enviando...' : 'Enviar Respuesta'}
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <div className="flex justify-between items-center pt-2">
                                <button 
                                    onClick={() => setIsReplying(true)}
                                    className="text-indigo-400 hover:text-indigo-300 text-sm font-medium flex items-center gap-1"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                                    Responder
                                </button>
                                
                                <div className="flex gap-2">
                                    {canResolve && (
                                        <button 
                                            onClick={handleToggleResolved}
                                            className="text-gray-500 hover:text-green-500 text-xs transition-colors"
                                            title={query.is_resolved ? "Marcar como no resuelta" : "Marcar como resuelta"}
                                        >
                                            {query.is_resolved ? (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                            ) : (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
                                            )}
                                        </button>
                                    )}
                                    
                                    {canDelete && (
                                        <button 
                                            onClick={handleDelete}
                                            className="text-gray-500 hover:text-red-500 text-xs transition-colors"
                                            title="Eliminar consulta"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
