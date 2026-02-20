import Link from 'next/link'
import { getStudentClasses, getStudentCourseDetails } from '@/app/actions/classes'
import { getStudentAssignments, getMyCourseSubmissions } from '@/app/actions/assignments'
import { getSprints } from '@/app/actions/sprints'
import { getStudentTeam } from '@/app/actions/teams'
import StudentCourseView from '@/components/StudentCourseView'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export default async function StudentCoursePage(props: { params: Promise<{ courseId: string }> }) {
    const params = await props.params;
    const { courseId } = params

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || !user.email) {
        redirect('/login')
    }

    // Fetch course details
    const courseResult = await getStudentCourseDetails(courseId)
    if (!courseResult.success || !courseResult.data) {
        redirect('/') // Redirect if course not found or error (likely permissions)
    }
    const course = courseResult.data

    // Fetch classes
    const classesResult = await getStudentClasses(courseId)
    const classes = classesResult.success && classesResult.data ? classesResult.data : []

    // Fetch assignments
    const assignmentsResult = await getStudentAssignments(courseId)
    const assignments = assignmentsResult.success && assignmentsResult.data ? assignmentsResult.data : []
    const assignmentsError = !assignmentsResult.success ? assignmentsResult.error : null

    // Fetch submissions
    const submissionsResult = await getMyCourseSubmissions(courseId)
    const submissions = submissionsResult.success && submissionsResult.data ? submissionsResult.data : []

    // Fetch sprints
    const sprintsResult = await getSprints(courseId)
    const sprints = sprintsResult.success && sprintsResult.data ? sprintsResult.data : []

    // Fetch team
    const teamResult = await getStudentTeam(courseId)
    const team = teamResult.success && teamResult.data ? teamResult.data : null

    return (
        <div className="flex min-h-screen flex-col items-center p-8 bg-black text-gray-200 font-[family-name:var(--font-geist-sans)]">
            <div className="w-full max-w-4xl">
                <div className="mb-8 flex flex-col gap-2">
                    <div className="flex justify-between items-center bg-neutral-900 p-6 rounded-lg border border-neutral-800">
                        <div>
                            <span className="text-xs font-medium text-indigo-400 bg-indigo-900/30 px-2 py-1 rounded mb-2 inline-block">
                                {course.institution_name || 'Institución'}
                            </span>
                            <h1 className="text-3xl font-bold text-gray-100">{course.name}</h1>
                            <p className="text-gray-400 mt-2">{course.description}</p>
                        </div>
                        <a 
                            href="/" 
                            className="text-gray-400 hover:text-white text-sm bg-neutral-800 px-3 py-2 rounded hover:bg-neutral-700 transition-colors"
                        >
                            ← Volver al Panel
                        </a>
                    </div>
                </div>
                
                {assignmentsError && (
                    <div className="bg-red-900/20 text-red-400 p-4 rounded-lg mb-6 border border-red-900/50">
                        <p className="font-semibold">Error cargando trabajos prácticos:</p>
                        <p>{assignmentsError}</p>
                    </div>
                )}

                <StudentCourseView 
                    courseId={courseId}
                    classes={classes}
                    assignments={assignments}
                    initialSubmissions={submissions}
                    initialSprints={sprints}
                    initialTeam={team}
                    hasClasses={course.has_classes}
                    hasSprints={course.has_sprints}
                    hasTeams={course.has_teams}
                    currentUserEmail={user.email}
                />
            </div>
        </div>
    )
}
