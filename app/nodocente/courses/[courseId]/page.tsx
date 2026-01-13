import { notFound, redirect } from 'next/navigation'
import { 
    getCourseForNodocente, 
    getCourseStudentsForNodocente,
    getCourseTeachersForNodocente,
    getCourseStaffForNodocente
} from '@/app/actions/courses'
import NonTeachingStaffCourseView from '@/components/NonTeachingStaffCourseView'

export default async function NonTeachingCoursePage({ 
    params 
}: { 
    params: Promise<{ courseId: string }> 
}) {
    const { courseId } = await params

    const [courseResult, studentsResult, teachersResult, staffResult] = await Promise.all([
        getCourseForNodocente(courseId),
        getCourseStudentsForNodocente(courseId),
        getCourseTeachersForNodocente(courseId),
        getCourseStaffForNodocente(courseId)
    ])

    if (!courseResult.success || !courseResult.data) {
        // If error is "No autorizado", maybe redirect? But for now notFound or error page.
        // If it's auth error, middleware might have handled it, but here we check specifically for nodocente role.
        if (courseResult.error?.includes('No autenticado')) {
            redirect('/auth/signin')
        }
        if (courseResult.error?.includes('No autorizado')) {
             // Maybe redirect to dashboard
             redirect('/nodocente/dashboard')
        }
        notFound()
    }

    const students = studentsResult.success && studentsResult.data ? studentsResult.data : []
    const teachers = teachersResult.success && teachersResult.data ? teachersResult.data : []
    const staff = staffResult.success && staffResult.data ? staffResult.data : []

    return (
        <NonTeachingStaffCourseView 
            course={courseResult.data} 
            students={students} 
            teachers={teachers}
            staff={staff}
        />
    )
}
