import { getClasses, getCourseDetails } from '@/app/actions/classes'
import { getAssignments } from '@/app/actions/assignments'
import { getCourseStudentStats, getCourseStudentsForTeacher } from '@/app/actions/courses'
import { getSprints } from '@/app/actions/sprints'
import { getTeams } from '@/app/actions/teams'
import TeacherCourseView from '@/components/TeacherCourseView'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export default async function TeacherCoursePage(props: { params: Promise<{ courseId: string }> }) {
    const params = await props.params;
    const { courseId } = params

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || !user.email) {
        redirect('/login')
    }

    // Fetch course details
    const courseResult = await getCourseDetails(courseId)
    if (!courseResult.success || !courseResult.data) {
        redirect('/') // Redirect if course not found or error (likely permissions)
    }
    const course = courseResult.data

    // Fetch classes
    const classesResult = await getClasses(courseId)
    const classes = classesResult.success && classesResult.data ? classesResult.data : []

    // Fetch assignments
    const assignmentsResult = await getAssignments(courseId)
    const assignments = assignmentsResult.success && assignmentsResult.data ? assignmentsResult.data : []

    // Fetch students stats
    const studentsResult = await getCourseStudentStats(courseId)
    const students = studentsResult.success && studentsResult.data ? studentsResult.data : []

    // Fetch sprints
    const sprintsResult = await getSprints(courseId)
    const sprints = sprintsResult.success && sprintsResult.data ? sprintsResult.data : []

    // Fetch teams and team students
    const teamsResult = await getTeams(courseId)
    const teams = teamsResult.success && teamsResult.data ? teamsResult.data : []

    const teamStudentsResult = await getCourseStudentsForTeacher(courseId)
    const teamStudents = teamStudentsResult.success && teamStudentsResult.data ? teamStudentsResult.data : []

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
                
                <TeacherCourseView 
                    courseId={courseId}
                    initialClasses={classes}
                    initialAssignments={assignments}
                    initialStudents={students}
                    initialSprints={sprints}
                    initialTeams={teams}
                    initialTeamStudents={teamStudents}
                    hasClasses={course.has_classes}
                    hasSprints={course.has_sprints}
                    hasTeams={course.has_teams}
                    currentUserEmail={user.email}
                />
            </div>
        </div>
    )
}
