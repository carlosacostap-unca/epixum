import { checkInstitutionAdmin } from '@/app/actions/institutions'
import { getCourse } from '@/app/actions/courses'
import { redirect } from 'next/navigation'
import CourseSettings from '@/components/CourseSettings'

export default async function CourseDetailsPage(props: { params: Promise<{ id: string, courseId: string }> }) {
    const params = await props.params;
    const institutionId = params.id
    const courseId = params.courseId
    
    // Security check: User must be admin of this institution
    let institutionName = ''
    try {
        const { supabase, profile } = await checkInstitutionAdmin()
        
        // Verify this specific institution belongs to the user
        const { data: relData, error: relError } = await supabase
            .from('institution_roles')
            .select('institution_id')
            .eq('email', profile.email)
            .eq('role', 'admin-institucion')
            .eq('institution_id', institutionId)
            .single()

        if (relError || !relData) {
            throw new Error('No autorizado para esta institución')
        }

        // Get institution details for the title
        const { data: instData } = await supabase
            .from('instituciones')
            .select('nombre')
            .eq('id', institutionId)
            .single()
            
        institutionName = instData?.nombre || 'Institución'

    } catch (error) {
        console.error('Access denied:', error)
        redirect('/unauthorized')
    }

    const courseResult = await getCourse(courseId)
    const course = courseResult.success && courseResult.data ? courseResult.data : null

    if (!course) {
        return (
            <div className="flex min-h-screen flex-col items-center p-8 bg-black text-gray-200">
                <h1 className="text-2xl font-bold text-red-500">Curso no encontrado</h1>
                <a href={`/institution/${institutionId}/courses`} className="mt-4 text-indigo-400 hover:underline">
                    ← Volver al listado
                </a>
            </div>
        )
    }

    const cards = [
        {
            title: 'Gestionar Estudiantes',
            description: 'Inscribir y gestionar estudiantes del curso.',
            href: `/institution/${institutionId}/courses/${courseId}/students`,
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.499 5.221 69.78 69.78 0 00-2.658.814m-15.482 0A50.55 50.55 0 0112 13.489a50.551 50.551 0 016.744-2.9m0 0A11.225 11.225 0 0112 13.489a11.226 11.226 0 01-6.744-2.9" />
                </svg>
            )
        },
        {
            title: 'Gestionar Docentes',
            description: 'Asignar docentes y gestionar el equipo académico.',
            href: `/institution/${institutionId}/courses/${courseId}/teachers`,
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
            )
        },
        {
            title: 'Gestionar Nodocentes',
            description: 'Asignar personal administrativo y de apoyo.',
            href: `/institution/${institutionId}/courses/${courseId}/staff`,
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
                </svg>
            )
        }
    ]

    return (
        <div className="flex min-h-screen flex-col items-center p-8 font-[family-name:var(--font-geist-sans)] bg-black text-gray-200">
            <div className="w-full max-w-6xl">
                <div className="mb-8 flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-100">{course.name}</h1>
                            <p className="text-gray-500 mt-1">{course.description || 'Sin descripción'}</p>
                        </div>
                        <a href={`/institution/${institutionId}/courses`} className="text-indigo-400 hover:text-indigo-300 hover:underline text-sm">
                            ← Volver a Cursos
                        </a>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {cards.map((card, index) => (
                        <a 
                            key={index}
                            href={card.href}
                            className="bg-neutral-900 border border-neutral-800 rounded-lg p-6 flex flex-col items-center text-center hover:border-indigo-500/50 hover:bg-neutral-800/50 transition-all group"
                        >
                            <div className="w-16 h-16 rounded-full bg-neutral-800 flex items-center justify-center mb-4 text-indigo-400 group-hover:scale-110 transition-transform">
                                {card.icon}
                            </div>
                            <h3 className="text-xl font-bold text-gray-100 mb-2">{card.title}</h3>
                            <p className="text-sm text-gray-400">
                                {card.description}
                            </p>
                            <div className="mt-6 text-indigo-400 text-sm font-medium group-hover:translate-x-1 transition-transform">
                                Gestionar →
                            </div>
                        </a>
                    ))}
                </div>

                <CourseSettings 
                    courseId={courseId}
                    initialHasClasses={course.has_classes ?? true}
                    initialHasSprints={course.has_sprints ?? false}
                    initialHasTeams={course.has_teams ?? false}
                />
            </div>
        </div>
    )
}
