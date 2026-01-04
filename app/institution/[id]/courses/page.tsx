import { checkInstitutionAdmin } from '@/app/actions/institutions'
import { getCourses } from '@/app/actions/courses'
import CourseManagement from '@/components/CourseManagement'
import { redirect } from 'next/navigation'

export default async function InstitutionCoursesPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const institutionId = params.id
    
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

    const coursesResult = await getCourses(institutionId)
    const courses = coursesResult.success && coursesResult.data ? coursesResult.data : []

    return (
        <div className="flex min-h-screen flex-col items-center p-8 font-[family-name:var(--font-geist-sans)] bg-black text-gray-200">
            <div className="w-full max-w-6xl">
                <div className="mb-8 flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                        <h1 className="text-3xl font-bold text-gray-100">Cursos de {institutionName}</h1>
                        <a href="/?role=admin-institucion" className="text-indigo-400 hover:text-indigo-300 hover:underline text-sm">
                            ← Volver al Panel
                        </a>
                    </div>
                    <p className="text-gray-500">Gestione los cursos académicos y sus inscripciones.</p>
                </div>

                <CourseManagement 
                    initialCourses={courses} 
                    institutionId={institutionId}
                    institutionName={institutionName}
                />
            </div>
        </div>
    )
}
