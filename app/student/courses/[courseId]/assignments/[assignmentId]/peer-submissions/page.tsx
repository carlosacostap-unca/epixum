import { getStudentAssignments } from '@/app/actions/assignments'
import PeerSubmissionsList from '@/components/PeerSubmissionsList'
import Link from 'next/link'
import { redirect } from 'next/navigation'

export default async function PeerSubmissionsPage(props: { params: Promise<{ courseId: string, assignmentId: string }> }) {
    const params = await props.params;
    const { courseId, assignmentId } = params

    // Fetch assignment details to show title
    const assignmentsResult = await getStudentAssignments(courseId)
    
    if (!assignmentsResult.success || !assignmentsResult.data) {
        // Handle error or redirect
        return (
            <div className="flex min-h-screen flex-col items-center p-8 bg-black text-gray-200">
                <div className="text-red-500">Error al cargar la información del trabajo práctico.</div>
                <Link href={`/student/courses/${courseId}`} className="mt-4 text-indigo-400 hover:underline">
                    Volver al curso
                </Link>
            </div>
        )
    }

    const assignment = assignmentsResult.data.find((a: any) => a.id === assignmentId)

    if (!assignment) {
        return (
            <div className="flex min-h-screen flex-col items-center p-8 bg-black text-gray-200">
                <div className="text-red-500">Trabajo práctico no encontrado.</div>
                <Link href={`/student/courses/${courseId}`} className="mt-4 text-indigo-400 hover:underline">
                    Volver al curso
                </Link>
            </div>
        )
    }

    return (
        <div className="flex min-h-screen flex-col items-center p-8 bg-black text-gray-200 font-[family-name:var(--font-geist-sans)]">
            <div className="w-full max-w-4xl">
                <div className="mb-8 flex flex-col gap-2">
                    <div className="flex justify-between items-center bg-neutral-900 p-6 rounded-lg border border-neutral-800">
                        <div>
                            <span className="text-xs font-medium text-indigo-400 bg-indigo-900/30 px-2 py-1 rounded mb-2 inline-block">
                                Entregas de Compañeros
                            </span>
                            <h1 className="text-3xl font-bold text-gray-100">{assignment.title}</h1>
                            <p className="text-gray-400 mt-2 text-sm">
                                Visualiza y explora los trabajos realizados por tus compañeros.
                            </p>
                        </div>
                        <Link 
                            href={`/student/courses/${courseId}`}
                            className="text-gray-400 hover:text-white text-sm bg-neutral-800 px-3 py-2 rounded hover:bg-neutral-700 transition-colors flex items-center gap-2"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M19 12H5M12 19l-7-7 7-7"/>
                            </svg>
                            Volver al curso
                        </Link>
                    </div>
                </div>

                <PeerSubmissionsList 
                    courseId={courseId} 
                    assignmentId={assignmentId} 
                />
            </div>
        </div>
    )
}
