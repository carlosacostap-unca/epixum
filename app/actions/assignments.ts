'use server'

import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

function getAdminClient() {
    return createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    )
}

async function checkAuth() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !user.email) throw new Error('No autenticado')
    return { supabase, user }
}

export async function getAssignments(courseId: string) {
    try {
        const { user } = await checkAuth()

        // Try admin client for teacher check first
        const adminClient = getAdminClient()
        const { data: teacherEnrollment } = await adminClient
            .from('course_enrollments')
            .select('id')
            .eq('course_id', courseId)
            .ilike('email', user.email!)
            .eq('role', 'docente')
            .single()
            
        if (teacherEnrollment) {
             const { data, error } = await adminClient
                .from('assignments')
                .select('*')
                .eq('course_id', courseId)
                .order('due_date', { ascending: true })
             if (error) throw error
             return { success: true, data }
        }

        const { supabase } = await checkAuth()

        const { data, error } = await supabase
            .from('assignments')
            .select('*')
            .eq('course_id', courseId)
            .order('due_date', { ascending: true })

        if (error) throw error
        return { success: true, data }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}

export async function getAllCourseSubmissions(courseId: string) {
    try {
        const { user } = await checkAuth()
        const adminClient = getAdminClient()

        // Verify teacher enrollment
        const { data: teacherEnrollment } = await adminClient
            .from('course_enrollments')
            .select('id')
            .eq('course_id', courseId)
            .ilike('email', user.email!)
            .eq('role', 'docente')
            .single()

        // Check if supervisor
        const { data: profile } = await adminClient
            .from('profiles')
            .select('roles')
            .eq('email', user.email!)
            .single()
        
        const isSupervisor = profile?.roles?.includes('supervisor')

        if (!teacherEnrollment && !isSupervisor) {
            throw new Error('No tienes permisos para ver las entregas de este curso')
        }

        const { data, error } = await adminClient
            .from('assignment_submissions')
            .select('*, assignments!inner(course_id)')
            .eq('assignments.course_id', courseId)

        if (error) throw error
        return { success: true, data }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}

export async function getStudentAssignments(courseId: string) {
    try {
        const { user, supabase } = await checkAuth()
        const adminClient = getAdminClient()

        // Check if supervisor
        const { data: profile } = await supabase
            .from('profiles')
            .select('roles')
            .eq('email', user.email!)
            .single()
        
        const isSupervisor = profile?.roles?.includes('supervisor')

        if (!isSupervisor) {
            // Verify enrollment (check for both 'estudiante' and 'alumno' to support migration states)
            const { data: enrollment, error: enrollmentError } = await adminClient
                .from('course_enrollments')
                .select('id')
                .eq('course_id', courseId)
                .ilike('email', user.email!)
                .in('role', ['estudiante', 'alumno', 'Estudiante', 'Alumno'])
                .single()

            if (enrollmentError || !enrollment) {
                throw new Error('No estás matriculado en este curso')
            }
        }

        const { data, error } = await adminClient
            .from('assignments')
            .select('*')
            .eq('course_id', courseId)
            .order('due_date', { ascending: true })

        if (error) throw error
        return { success: true, data }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}

export async function setStudentGrade(assignmentId: string, studentEmail: string, grade: string) {
    try {
        const { user } = await checkAuth()
        const adminClient = getAdminClient()

        // Get assignment to check course
        const { data: assignment } = await adminClient
            .from('assignments')
            .select('course_id')
            .eq('id', assignmentId)
            .single()

        if (!assignment) throw new Error('Trabajo práctico no encontrado')

        // Verify teacher enrollment
        const { data: teacherEnrollment } = await adminClient
            .from('course_enrollments')
            .select('id')
            .eq('course_id', assignment.course_id)
            .ilike('email', user.email!)
            .eq('role', 'docente')
            .single()

        // Check if supervisor
        const { data: profile } = await adminClient
            .from('profiles')
            .select('roles')
            .eq('email', user.email!)
            .single()
        
        const isSupervisor = profile?.roles?.includes('supervisor')

        if (!teacherEnrollment && !isSupervisor) {
            throw new Error('No tienes permisos de docente en este curso')
        }

        // Check if submission exists
        const { data: existing } = await adminClient
            .from('assignment_submissions')
            .select('id')
            .eq('assignment_id', assignmentId)
            .ilike('student_email', studentEmail)
            .single()
            
        if (existing) {
             const { error } = await adminClient
                .from('assignment_submissions')
                .update({ grade })
                .eq('id', existing.id)
             if (error) throw error
        } else {
             // Create new submission
             const { error } = await adminClient
                .from('assignment_submissions')
                .insert({
                    assignment_id: assignmentId,
                    student_email: studentEmail,
                    grade,
                    content: '',
                    file_url: ''
                })
             if (error) throw error
        }
        
        revalidatePath(`/teacher/courses/${assignment.course_id}`)
        return { success: true }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}

export async function createAssignment(courseId: string, title: string, description: string, dueDate: string, sprintId: string | null = null) {
    try {
        const { user } = await checkAuth()
        const adminClient = getAdminClient()

        // Verify teacher enrollment
        const { data: teacherEnrollment } = await adminClient
            .from('course_enrollments')
            .select('id')
            .eq('course_id', courseId)
            .ilike('email', user.email!)
            .eq('role', 'docente')
            .single()

        if (!teacherEnrollment) {
            throw new Error('No tienes permisos de docente en este curso')
        }

        const { data, error } = await adminClient
            .from('assignments')
            .insert({
                course_id: courseId,
                title,
                description,
                due_date: dueDate,
                sprint_id: sprintId || null
            })
            .select()
            .single()

        if (error) throw error
        
        revalidatePath(`/teacher/courses/${courseId}`)
        return { success: true, data }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}

export async function updateAssignment(assignmentId: string, title: string, description: string, dueDate: string, sprintId: string | null = null) {
    try {
        const { user } = await checkAuth()
        const adminClient = getAdminClient()

        // Get course_id from assignment
        const { data: assignment } = await adminClient
            .from('assignments')
            .select('course_id')
            .eq('id', assignmentId)
            .single()

        if (!assignment) throw new Error('Trabajo práctico no encontrado')

        // Verify teacher enrollment
        const { data: teacherEnrollment } = await adminClient
            .from('course_enrollments')
            .select('id')
            .eq('course_id', assignment.course_id)
            .ilike('email', user.email!)
            .eq('role', 'docente')
            .single()

        if (!teacherEnrollment) {
            throw new Error('No tienes permisos de docente en este curso')
        }

        const { error } = await adminClient
            .from('assignments')
            .update({
                title,
                description,
                due_date: dueDate,
                sprint_id: sprintId || null
            })
            .eq('id', assignmentId)

        if (error) throw error
        
        revalidatePath(`/teacher/courses/${assignment.course_id}`)
        return { success: true }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}

export async function deleteAssignment(assignmentId: string, courseId: string) {
    try {
        const { user } = await checkAuth()
        const adminClient = getAdminClient()

        // Verify teacher enrollment
        const { data: teacherEnrollment } = await adminClient
            .from('course_enrollments')
            .select('id')
            .eq('course_id', courseId)
            .ilike('email', user.email!)
            .eq('role', 'docente')
            .single()

        if (!teacherEnrollment) {
            throw new Error('No tienes permisos de docente en este curso')
        }

        const { error } = await adminClient
            .from('assignments')
            .delete()
            .eq('id', assignmentId)
            .eq('course_id', courseId)

        if (error) throw error
        
        revalidatePath(`/teacher/courses/${courseId}`)
        return { success: true }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}

export async function getAssignmentSubmissions(assignmentId: string) {
    try {
        const { supabase } = await checkAuth()

        const { data, error } = await supabase
            .from('assignment_submissions')
            .select('*')
            .eq('assignment_id', assignmentId)
            .order('submitted_at', { ascending: false })

        if (error) throw error
        return { success: true, data }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}

export async function updateSubmissionGrade(submissionId: string, grade: string) {
    try {
        const { user } = await checkAuth()
        const adminClient = getAdminClient()

        // Get submission info to verify permissions
        const { data: submission } = await adminClient
            .from('assignment_submissions')
            .select('assignment_id')
            .eq('id', submissionId)
            .single()
            
        if (!submission) throw new Error('Entrega no encontrada')

        const { data: assignment } = await adminClient
            .from('assignments')
            .select('course_id')
            .eq('id', submission.assignment_id)
            .single()
            
        if (!assignment) throw new Error('Trabajo práctico no encontrado')

        // Verify teacher enrollment
        const { data: teacherEnrollment } = await adminClient
            .from('course_enrollments')
            .select('id')
            .eq('course_id', assignment.course_id)
            .ilike('email', user.email!)
            .eq('role', 'docente')
            .single()

        if (!teacherEnrollment) {
            throw new Error('No tienes permisos de docente en este curso')
        }

        const { error } = await adminClient
            .from('assignment_submissions')
            .update({ grade })
            .eq('id', submissionId)

        if (error) throw error
        
        return { success: true }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}

export async function bulkUpdateGrades(courseId: string, updates: { assignmentId: string, studentEmail: string, grade: string }[]) {
    try {
        const { user } = await checkAuth()
        const adminClient = getAdminClient()

        // Verify teacher enrollment
        const { data: teacherEnrollment } = await adminClient
            .from('course_enrollments')
            .select('id')
            .eq('course_id', courseId)
            .ilike('email', user.email!)
            .eq('role', 'docente')
            .single()

        // Check if supervisor
        const { data: profile } = await adminClient
            .from('profiles')
            .select('roles')
            .eq('email', user.email!)
            .single()
        
        const isSupervisor = profile?.roles?.includes('supervisor')

        if (!teacherEnrollment && !isSupervisor) {
            throw new Error('No tienes permisos para calificar en este curso')
        }

        // Get valid assignments for this course
        const { data: validAssignments } = await adminClient
            .from('assignments')
            .select('id')
            .eq('course_id', courseId)
        
        const validAssignmentIds = new Set(validAssignments?.map(a => a.id))

        // Filter updates for valid assignments
        const validUpdates = updates.filter(u => validAssignmentIds.has(u.assignmentId))

        if (validUpdates.length === 0) {
            return { success: true, message: 'No updates to apply' }
        }

        // Fetch existing submissions
        const { data: existingSubmissions, error: fetchError } = await adminClient
             .from('assignment_submissions')
             .select('id, assignment_id, student_email, assignments!inner(course_id)')
             .eq('assignments.course_id', courseId)
        
        if (fetchError) throw fetchError

        const existingMap = new Map<string, string>(); 
        existingSubmissions?.forEach(sub => {
            if (sub.student_email) {
                existingMap.set(`${sub.assignment_id}-${sub.student_email.toLowerCase()}`, sub.id)
            }
        })

        const promises = validUpdates.map(async (update) => {
            const key = `${update.assignmentId}-${update.studentEmail.toLowerCase()}`
            const existingId = existingMap.get(key)

            if (existingId) {
                return adminClient
                    .from('assignment_submissions')
                    .update({ grade: update.grade })
                    .eq('id', existingId)
            } else {
                return adminClient
                    .from('assignment_submissions')
                    .insert({
                        assignment_id: update.assignmentId,
                        student_email: update.studentEmail,
                        grade: update.grade,
                        content: '',
                        file_url: ''
                    })
            }
        })

        // Execute in batches
        const BATCH_SIZE = 10;
        for (let i = 0; i < promises.length; i += BATCH_SIZE) {
            await Promise.all(promises.slice(i, i + BATCH_SIZE));
        }

        revalidatePath(`/teacher/courses/${courseId}`)
        return { success: true }

    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}

export async function getMyCourseSubmissions(courseId: string) {
    try {
        const { supabase, user } = await checkAuth()

        const { data, error } = await supabase
            .from('assignment_submissions')
            .select('*, assignments!inner(course_id)')
            .eq('assignments.course_id', courseId)
            .eq('student_email', user.email)

        if (error) throw error
        return { success: true, data }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}

export async function submitAssignment(assignmentId: string, content: string, fileUrl: string) {
    try {
        const { supabase, user } = await checkAuth()

        // Check if exists to update or insert
        const { data: existing } = await supabase
            .from('assignment_submissions')
            .select('id')
            .eq('assignment_id', assignmentId)
            .eq('student_email', user.email)
            .single()

        let error
        if (existing) {
             const result = await supabase
                .from('assignment_submissions')
                .update({
                    content,
                    file_url: fileUrl,
                    updated_at: new Date().toISOString()
                })
                .eq('id', existing.id)
             error = result.error
        } else {
             const result = await supabase
                .from('assignment_submissions')
                .insert({
                    assignment_id: assignmentId,
                    student_email: user.email,
                    content,
                    file_url: fileUrl
                })
             error = result.error
        }

        if (error) throw error
        
        revalidatePath(`/student/courses`) // Revalidate broadly or specific course
        return { success: true }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}

// Assignment Resources Actions

export async function getAssignmentResources(assignmentId: string) {
    try {
        const { supabase } = await checkAuth()

        const { data, error } = await supabase
            .from('assignment_resources')
            .select('*')
            .eq('assignment_id', assignmentId)
            .order('created_at', { ascending: true })

        if (error) throw error
        return { success: true, data }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}

export async function createAssignmentResource(assignmentId: string, title: string, url: string, type: string) {
    try {
        const { user } = await checkAuth()
        const adminClient = getAdminClient()

        // Get course_id from assignment
        const { data: assignment } = await adminClient
            .from('assignments')
            .select('course_id')
            .eq('id', assignmentId)
            .single()
        
        if (!assignment) throw new Error('Trabajo práctico no encontrado')

        // Verify teacher enrollment
        const { data: teacherEnrollment } = await adminClient
            .from('course_enrollments')
            .select('id')
            .eq('course_id', assignment.course_id)
            .ilike('email', user.email!)
            .eq('role', 'docente')
            .single()

        if (!teacherEnrollment) {
            throw new Error('No tienes permisos de docente en este curso')
        }

        const { error } = await adminClient
            .from('assignment_resources')
            .insert({
                assignment_id: assignmentId,
                title,
                url,
                type
            })

        if (error) throw error
        return { success: true }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}

export async function deleteSubmission(submissionId: string) {
    try {
        const { user } = await checkAuth()
        const adminClient = getAdminClient()

        // Get submission to find file_url and verify permissions
        const { data: submission } = await adminClient
            .from('assignment_submissions')
            .select('*, assignments!inner(course_id)')
            .eq('id', submissionId)
            .single()

        if (!submission) throw new Error('Entrega no encontrada')

        // Verify teacher enrollment
        const { data: teacherEnrollment } = await adminClient
            .from('course_enrollments')
            .select('id')
            .eq('course_id', submission.assignments.course_id)
            .ilike('email', user.email!)
            .eq('role', 'docente')
            .single()

        if (!teacherEnrollment) {
            throw new Error('No tienes permisos de docente en este curso')
        }

        // Delete file from storage if exists
        if (submission.file_url) {
            try {
                const bucketName = 'assignment-submissions'
                if (submission.file_url.includes(`/${bucketName}/`)) {
                    const pathParts = submission.file_url.split(`/${bucketName}/`)
                    if (pathParts.length > 1) {
                        const filePath = decodeURIComponent(pathParts[1])
                        const { error: storageError } = await adminClient
                            .storage
                            .from(bucketName)
                            .remove([filePath])
                        
                        if (storageError) {
                            console.error('Error deleting file from storage:', storageError)
                        }
                    }
                }
            } catch (e) {
                console.error('Error processing storage deletion:', e)
            }
        }

        // Delete submission record
        const { error } = await adminClient
            .from('assignment_submissions')
            .delete()
            .eq('id', submissionId)

        if (error) throw error

        revalidatePath(`/teacher/courses/${submission.assignments.course_id}`)
        return { success: true }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}

export async function updateSubmissionContent(submissionId: string, content: string, fileUrl: string | null) {
    try {
        const { user } = await checkAuth()
        const adminClient = getAdminClient()

        // Get submission to find old file_url and verify permissions
        const { data: submission } = await adminClient
            .from('assignment_submissions')
            .select('*, assignments!inner(course_id)')
            .eq('id', submissionId)
            .single()

        if (!submission) throw new Error('Entrega no encontrada')

        // Verify teacher enrollment
        const { data: teacherEnrollment } = await adminClient
            .from('course_enrollments')
            .select('id')
            .eq('course_id', submission.assignments.course_id)
            .ilike('email', user.email!)
            .eq('role', 'docente')
            .single()

        if (!teacherEnrollment) {
            throw new Error('No tienes permisos de docente en este curso')
        }

        // Delete old file from storage if new file is different and old file exists
        if (submission.file_url && fileUrl && submission.file_url !== fileUrl) {
            try {
                const bucketName = 'assignment-submissions'
                if (submission.file_url.includes(`/${bucketName}/`)) {
                    const pathParts = submission.file_url.split(`/${bucketName}/`)
                    if (pathParts.length > 1) {
                        const filePath = decodeURIComponent(pathParts[1])
                        const { error: storageError } = await adminClient
                            .storage
                            .from(bucketName)
                            .remove([filePath])
                        
                        if (storageError) {
                            console.error('Error deleting old file from storage:', storageError)
                        }
                    }
                }
            } catch (e) {
                console.error('Error processing storage deletion:', e)
            }
        }

        // Update submission record
        const { error } = await adminClient
            .from('assignment_submissions')
            .update({
                content,
                file_url: fileUrl,
                updated_at: new Date().toISOString()
            })
            .eq('id', submissionId)

        if (error) throw error

        revalidatePath(`/teacher/courses/${submission.assignments.course_id}`)
        return { success: true }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}

export async function updateAssignmentResource(resourceId: string, title: string, url: string, type: string) {
    try {
        const { user } = await checkAuth()
        const adminClient = getAdminClient()

        // Get assignment and course info through resource
        const { data: resource } = await adminClient
            .from('assignment_resources')
            .select('assignment_id')
            .eq('id', resourceId)
            .single()

        if (!resource) throw new Error('Recurso no encontrado')

        const { data: assignment } = await adminClient
            .from('assignments')
            .select('course_id')
            .eq('id', resource.assignment_id)
            .single()

        if (!assignment) throw new Error('Trabajo práctico no encontrado')

        // Verify teacher enrollment
        const { data: teacherEnrollment } = await adminClient
            .from('course_enrollments')
            .select('id')
            .eq('course_id', assignment.course_id)
            .ilike('email', user.email!)
            .eq('role', 'docente')
            .single()

        if (!teacherEnrollment) {
            throw new Error('No tienes permisos de docente en este curso')
        }

        const { error } = await adminClient
            .from('assignment_resources')
            .update({
                title,
                url,
                type
            })
            .eq('id', resourceId)

        if (error) throw error
        return { success: true }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}

export async function deleteAssignmentResource(resourceId: string) {
    try {
        const { user } = await checkAuth()
        const adminClient = getAdminClient()

        // Get assignment and course info through resource
        // Note: performing two queries to avoid complex join typing issues if not strictly necessary
        const { data: resource } = await adminClient
            .from('assignment_resources')
            .select('assignment_id, url, type')
            .eq('id', resourceId)
            .single()

        if (!resource) throw new Error('Recurso no encontrado')

        const { data: assignment } = await adminClient
            .from('assignments')
            .select('course_id')
            .eq('id', resource.assignment_id)
            .single()

        if (!assignment) throw new Error('Trabajo práctico no encontrado')
        
        // Check permissions
        const { data: teacherEnrollment } = await adminClient
            .from('course_enrollments')
            .select('id')
            .eq('course_id', assignment.course_id)
            .ilike('email', user.email!)
            .eq('role', 'docente')
            .single()

        if (!teacherEnrollment) {
            throw new Error('No tienes permisos de docente en este curso')
        }

        // Delete file from storage if applicable
        if (resource.type === 'doc' && resource.url.includes('/class-resources/')) {
            try {
                // Extract path from URL (after /class-resources/)
                const pathParts = resource.url.split('/class-resources/')
                if (pathParts.length > 1) {
                    const filePath = decodeURIComponent(pathParts[1])
                    const { error: storageError } = await adminClient
                        .storage
                        .from('class-resources')
                        .remove([filePath])
                    
                    if (storageError) {
                        console.error('Error deleting file from storage:', storageError)
                    }
                }
            } catch (e) {
                console.error('Error processing storage deletion:', e)
            }
        }

        const { error } = await adminClient
            .from('assignment_resources')
            .delete()
            .eq('id', resourceId)

        if (error) throw error
        return { success: true }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}
