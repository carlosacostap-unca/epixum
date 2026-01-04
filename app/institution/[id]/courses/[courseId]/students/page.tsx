import { checkInstitutionAdmin } from '@/app/actions/institutions'
import { getCourse, getCourseStudents } from '@/app/actions/courses'
import { redirect } from 'next/navigation'
import CourseStudentManagement from '@/components/CourseStudentManagement'

export default async function CourseStudentsPage(props: { params: Promise<{ id: string, courseId: string }> }) {
    const params = await props.params;
    const institutionId = params.id
    const courseId = params.courseId
    
    // Security check
    try {
        const { supabase, profile } = await checkInstitutionAdmin()
        const { data: relData, error: relError } = await supabase
            .from('institution_roles')
            .select('institution_id')
            .eq('email', profile.email)
            .eq('role', 'admin-institucion')
            .eq('institution_id', institutionId)
            .single()

        if (relError || !relData) throw new Error('No autorizado')
    } catch (error) {
        redirect('/unauthorized')
    }

    const courseResult = await getCourse(courseId)
    const course = courseResult.success && courseResult.data ? courseResult.data : { name: 'Curso' }

    const studentsResult = await getCourseStudents(courseId)
    const students = studentsResult.success && studentsResult.data ? studentsResult.data : []

    return (
        <div className="flex min-h-screen flex-col items-center p-8 bg-black text-gray-200">
            <div className="w-full max-w-6xl">
                <div className="mb-8 flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-100">Gestión de Alumnos</h1>
                            <p className="text-gray-500 mt-1">{course.name}</p>
                        </div>
                        <a href={`/institution/${institutionId}/courses/${courseId}`} className="text-indigo-400 hover:underline text-sm">
                            ← Volver al Curso
                        </a>
                    </div>
                </div>
                
                <CourseStudentManagement 
                    initialStudents={students}
                    courseId={courseId}
                    institutionId={institutionId}
                />
            </div>
        </div>
    )
}
