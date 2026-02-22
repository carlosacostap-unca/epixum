import Link from 'next/link'
import { getTeamMemberDetails } from '@/app/actions/teams'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { getStudentCourseDetails } from '@/app/actions/classes'

export default async function TeamMemberPage(props: { params: Promise<{ courseId: string; memberId: string }> }) {
    const params = await props.params;
    const { courseId, memberId } = params

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || !user.email) {
        redirect('/login')
    }

    // Fetch course details for the header
    const courseResult = await getStudentCourseDetails(courseId)
    if (!courseResult.success || !courseResult.data) {
        redirect('/')
    }
    const course = courseResult.data

    // Fetch member details
    const memberResult = await getTeamMemberDetails(courseId, memberId)
    
    if (!memberResult.success || !memberResult.data) {
        return (
            <div className="flex min-h-screen flex-col items-center p-8 bg-black text-gray-200 font-[family-name:var(--font-geist-sans)]">
                <div className="w-full max-w-4xl">
                     <div className="bg-red-900/20 text-red-400 p-8 rounded-lg border border-red-900/50 text-center">
                        <h2 className="text-xl font-bold mb-2">Error</h2>
                        <p>{memberResult.error || 'No se pudo cargar la información del compañero'}</p>
                        <Link href={`/student/courses/${courseId}?tab=teams`} className="mt-4 inline-block text-indigo-400 hover:underline">
                            Volver al curso
                        </Link>
                    </div>
                </div>
            </div>
        )
    }

    const { profile, progress, has_sprints } = memberResult.data

    return (
        <div className="flex min-h-screen flex-col items-center p-8 bg-black text-gray-200 font-[family-name:var(--font-geist-sans)]">
            <div className="w-full max-w-4xl">
                {/* Header - consistent with Course Page */}
                <div className="mb-8 flex flex-col gap-2">
                    <div className="flex justify-between items-center bg-neutral-900 p-6 rounded-lg border border-neutral-800">
                        <div>
                            <span className="text-xs font-medium text-indigo-400 bg-indigo-900/30 px-2 py-1 rounded mb-2 inline-block">
                                {course.institution_name || 'Institución'}
                            </span>
                            <h1 className="text-3xl font-bold text-gray-100">{course.name}</h1>
                            <div className="flex items-center gap-2 mt-2">
                                <span className="text-gray-400">Equipo / </span>
                                <span className="text-gray-200 font-medium">{profile.first_name} {profile.last_name}</span>
                            </div>
                        </div>
                        <Link 
                            href={`/student/courses/${courseId}?tab=teams`} 
                            className="text-gray-400 hover:text-white text-sm bg-neutral-800 px-3 py-2 rounded hover:bg-neutral-700 transition-colors"
                        >
                            ← Volver al Curso
                        </Link>
                    </div>
                </div>

                {/* Profile Card */}
                <div className="bg-neutral-900 rounded-lg p-8 border border-neutral-800 mb-8 flex flex-col md:flex-row items-center md:items-start gap-8">
                    <div className="h-32 w-32 rounded-full bg-indigo-900/50 flex items-center justify-center text-indigo-300 font-bold border border-indigo-500/30 text-4xl flex-shrink-0 overflow-hidden">
                        {profile.avatar_url ? (
                            <img src={profile.avatar_url} alt={profile.first_name || ''} className="h-full w-full object-cover" />
                        ) : (
                            (profile.first_name?.[0] || profile.email[0]).toUpperCase()
                        )}
                    </div>
                    <div className="text-center md:text-left flex-1">
                        <h2 className="text-3xl font-bold text-white mb-2">
                            {profile.first_name} {profile.last_name}
                        </h2>
                        <div className="flex flex-col gap-1 mb-4 text-gray-400">
                            <p>{profile.email}</p>
                            {profile.phone && <p>{profile.phone}</p>}
                        </div>
                        
                        <div className={`grid grid-cols-1 ${!has_sprints ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-4 mt-6`}>
                            <div className="bg-neutral-800/50 p-4 rounded-lg border border-neutral-800">
                                <span className="text-xs text-gray-500 uppercase tracking-wider block mb-1">Entregas</span>
                                <span className="text-2xl font-bold text-indigo-400">
                                    {progress.filter(p => p.status !== 'Pendiente').length}
                                </span>
                            </div>
                            {!has_sprints && (
                                <div className="bg-neutral-800/50 p-4 rounded-lg border border-neutral-800">
                                    <span className="text-xs text-gray-500 uppercase tracking-wider block mb-1">Calificados</span>
                                    <span className="text-2xl font-bold text-green-400">
                                        {progress.filter(p => p.status === 'Calificado').length}
                                    </span>
                                </div>
                            )}
                             <div className="bg-neutral-800/50 p-4 rounded-lg border border-neutral-800">
                                <span className="text-xs text-gray-500 uppercase tracking-wider block mb-1">Pendientes</span>
                                <span className="text-2xl font-bold text-yellow-500/80">
                                    {progress.filter(p => p.status === 'Pendiente').length}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Progress List */}
                <div className="bg-neutral-900 rounded-lg border border-neutral-800 overflow-hidden">
                    <div className="p-6 border-b border-neutral-800">
                        <h3 className="text-xl font-bold text-white">Progreso Académico</h3>
                        <p className="text-gray-500 text-sm">Estado de los trabajos prácticos</p>
                    </div>
                    
                    <div className="divide-y divide-neutral-800">
                        {progress.length > 0 ? (
                            progress.map((item) => (
                                <div key={item.assignment_id} className="p-4 hover:bg-neutral-800/30 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="flex-1">
                                        <h4 className="font-medium text-gray-200">{item.assignment_title}</h4>
                                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{item.assignment_description}</p>
                                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                            <span>Vence: {new Date(item.due_date).toLocaleDateString()}</span>
                                            {item.submitted_at && (
                                                <span>Entregado: {new Date(item.submitted_at).toLocaleDateString()}</span>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-4 flex-shrink-0">
                                        <div className={`px-3 py-1 rounded text-xs font-medium border whitespace-nowrap ${
                                            item.status === 'Calificado' 
                                                ? 'bg-green-900/30 text-green-400 border-green-900'
                                                : item.status === 'Entregado'
                                                    ? 'bg-indigo-900/30 text-indigo-400 border-indigo-900'
                                                    : 'bg-neutral-800 text-gray-500 border-neutral-700'
                                        }`}>
                                            {item.status} {item.grade && !has_sprints && <span className="ml-1 font-bold">({item.grade})</span>}
                                        </div>
                                        
                                        {item.file_url ? (
                                            <a 
                                                href={item.file_url} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="p-2 bg-neutral-800 text-indigo-400 rounded hover:bg-neutral-700 hover:text-indigo-300 transition-colors border border-neutral-700"
                                                title="Ver entrega"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                </svg>
                                            </a>
                                        ) : (
                                            <div className="w-9 h-9"></div> // Spacer
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-8 text-center text-gray-500">
                                No hay trabajos prácticos asignados.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
