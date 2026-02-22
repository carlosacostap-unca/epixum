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

export async function createAssignment(courseId: string, title: string, description: string, dueDate: string, sprintId?: string | null) {
    try {
        const { supabase } = await checkAuth()
        
        const { data, error } = await supabase
            .from('assignments')
            .insert({
                course_id: courseId,
                title,
                description,
                due_date: dueDate,
                sprint_id: sprintId
            })
            .select()
            .single()

        if (error) throw error
        
        revalidatePath('/courses/[id]')
        return { success: true, data }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}

export async function updateAssignment(id: string, title: string, description: string, dueDate: string, sprintId?: string | null) {
    try {
        const { supabase } = await checkAuth()
        
        const { error } = await supabase
            .from('assignments')
            .update({
                title,
                description,
                due_date: dueDate,
                sprint_id: sprintId
            })
            .eq('id', id)

        if (error) throw error
        
        revalidatePath('/courses/[id]')
        return { success: true }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}

export async function deleteAssignment(id: string, courseId?: string) {
    try {
        const { supabase } = await checkAuth()
        
        const { error } = await supabase
            .from('assignments')
            .delete()
            .eq('id', id)

        if (error) throw error
        
        revalidatePath('/courses/[id]')
        return { success: true }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}

export async function getAssignments(courseId: string) {
    try {
        const { user } = await checkAuth()
        const adminClient = getAdminClient()

        // Check if guest (invitado)
        const { data: profile } = await adminClient
            .from('profiles')
            .select('roles')
            .eq('email', user.email!)
            .single()
        
        const isGuest = profile?.roles?.includes('invitado')

        // Try admin client for teacher check
        const { data: teacherEnrollment } = await adminClient
            .from('course_enrollments')
            .select('id')
            .eq('course_id', courseId)
            .ilike('email', user.email!)
            .eq('role', 'docente')
            .single()
            
        if (teacherEnrollment || isGuest) {
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

        if (!teacherEnrollment) {
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

export async function submitAssignment(assignmentId: string, content: string, fileUrl: string) {
    try {
        const { supabase, user } = await checkAuth()
        
        // Check if already submitted
        const { data: existing } = await supabase
            .from('assignment_submissions')
            .select('id')
            .eq('assignment_id', assignmentId)
            .eq('student_email', user.email!)
            .single()

        if (existing) {
            const { error } = await supabase
                .from('assignment_submissions')
                .update({
                    content,
                    file_url: fileUrl,
                    submitted_at: new Date().toISOString()
                })
                .eq('id', existing.id)
            
            if (error) throw error
        } else {
            const { error } = await supabase
                .from('assignment_submissions')
                .insert({
                    assignment_id: assignmentId,
                    student_email: user.email!,
                    content,
                    file_url: fileUrl
                })
            
            if (error) throw error
        }

        revalidatePath('/courses/[id]')
        return { success: true }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}

export async function getAssignmentResources(assignmentId: string) {
    try {
        const { user } = await checkAuth()
        const adminClient = getAdminClient()
        
        // 1. Get assignment to check course
        const { data: assignment, error: assignError } = await adminClient
            .from('assignments')
            .select('course_id')
            .eq('id', assignmentId)
            .single()

        if (assignError || !assignment) throw new Error('Trabajo práctico no encontrado')

        // 2. Check if user is enrolled in the course (or is admin/guest)
        // Check guest first
        const { data: profile } = await adminClient
            .from('profiles')
            .select('roles')
            .eq('email', user.email!)
            .single()
        
        const isGuest = profile?.roles?.includes('invitado')
        
        if (!isGuest) {
            const { data: enrollments, error: enrollError } = await adminClient
                .from('course_enrollments')
                .select('role')
                .eq('course_id', assignment.course_id)
                .ilike('email', user.email!)

            if (enrollError || !enrollments || enrollments.length === 0) {
                 throw new Error('No tienes acceso a este curso')
            }
        }

        // 3. Get resources
        const { data, error } = await adminClient
            .from('assignment_resources')
            .select('*')
            .eq('assignment_id', assignmentId)

        if (error) throw error
        return { success: true, data }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}

export async function createAssignmentResource(assignmentId: string, title: string, url: string, type: string) {
    try {
        const { supabase } = await checkAuth()
        
        const { data, error } = await supabase
            .from('assignment_resources')
            .insert({
                assignment_id: assignmentId,
                title,
                url,
                type
            })
            .select()
            .single()

        if (error) throw error
        
        return { success: true, data }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}

export async function updateAssignmentResource(id: string, title: string, url: string, type: string) {
    try {
        const { supabase } = await checkAuth()
        
        const { error } = await supabase
            .from('assignment_resources')
            .update({
                title,
                url,
                type
            })
            .eq('id', id)

        if (error) throw error
        
        return { success: true }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}

export async function deleteAssignmentResource(id: string) {
    try {
        const { supabase } = await checkAuth()
        
        const { error } = await supabase
            .from('assignment_resources')
            .delete()
            .eq('id', id)

        if (error) throw error
        
        return { success: true }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}

export async function getAssignmentPeerSubmissions(courseId: string, assignmentId: string) {
    try {
        const { user } = await checkAuth()
        const adminClient = getAdminClient()

        // Check if guest
        const { data: profile } = await adminClient
            .from('profiles')
            .select('roles')
            .eq('email', user.email!)
            .single()
        
        const isGuest = profile?.roles?.includes('invitado')
        
        if (!isGuest) {
            // Check if user is enrolled in the course
            const { data: enrollments } = await adminClient
                .from('course_enrollments')
                .select('role')
                .eq('course_id', courseId)
                .ilike('email', user.email!)
                .limit(1)

            if (!enrollments || enrollments.length === 0) {
                 throw new Error('No estás matriculado en este curso')
            }
        }

        // 1. Get all students enrolled in the course
        const { data: students, error: studentsError } = await adminClient
            .from('course_enrollments')
            .select('email')
            .eq('course_id', courseId)
            .in('role', ['estudiante', 'alumno'])

        if (studentsError) throw studentsError

        if (!students || students.length === 0) {
            return { success: true, data: [] }
        }

        // 2. Get profiles for these students
        const emails = students.map(s => s.email)
        const { data: profiles, error: profilesError } = await adminClient
            .from('profiles')
            .select('email, first_name, last_name, avatar_url')
            .in('email', emails)
            .order('last_name', { ascending: true })

        if (profilesError) throw profilesError

        // 3. Get submissions for this assignment
        const { data: submissions, error: submissionsError } = await adminClient
            .from('assignment_submissions')
            .select('student_email, grade, file_url, submitted_at')
            .eq('assignment_id', assignmentId)
        
        if (submissionsError) throw submissionsError

        // 4. Combine data
        const result = profiles.map(profile => {
            const submission = submissions.find(s => s.student_email === profile.email)
            
            let status = 'No enviado'
            if (submission) {
                if (submission.grade) {
                    // Logic to determine status based on grade text
                    const grade = submission.grade.toLowerCase()
                    if (grade.includes('aprobado') || grade === 'aprobado' || grade === 'a' || grade === 'excelente' || grade === 'muy bien') {
                        status = 'Aprobado'
                    } else if (grade.includes('corregir') || grade.includes('reenviar') || grade.includes('rehacer') || grade === 'desaprobado' || grade === 'd') {
                        status = 'Corregir y reenviar'
                    } else {
                        // Default to Approved if it has a grade that is not explicitly "Corregir"
                        // Or maybe we should just show the grade text? 
                        // The user asked for specific statuses.
                        // Let's check if it's a numeric grade >= 6
                        const gradeNum = parseFloat(grade)
                        if (!isNaN(gradeNum)) {
                            status = gradeNum >= 6 ? 'Aprobado' : 'Corregir y reenviar'
                        } else {
                            // If we can't parse it and it's not in our keywords, let's assume evaluated but maybe just show "Evaluado" or map to one of the requested.
                            // Let's stick to "Aprobado" as default positive if not negative.
                             status = 'Aprobado'
                        }
                    }
                } else {
                    status = 'Enviado'
                }
            }

            return {
                email: profile.email,
                first_name: profile.first_name,
                last_name: profile.last_name,
                avatar_url: profile.avatar_url,
                status: status,
                repo_url: submission?.file_url || null
            }
        })

        return { success: true, data: result }

    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}

export async function getAssignmentSubmissions(assignmentId: string) {
    try {
        const { user } = await checkAuth()
        const adminClient = getAdminClient()

        // Get courseId for permission check
        const { data: assignment } = await adminClient
            .from('assignments')
            .select('course_id')
            .eq('id', assignmentId)
            .single()

        if (!assignment) throw new Error('Trabajo práctico no encontrado')

        // Check if guest or teacher
        const { data: profile } = await adminClient
            .from('profiles')
            .select('roles')
            .eq('email', user.email!)
            .single()
        
        const isGuest = profile?.roles?.includes('invitado')

        const { data: teacherEnrollment } = await adminClient
            .from('course_enrollments')
            .select('id')
            .eq('course_id', assignment.course_id)
            .ilike('email', user.email!)
            .eq('role', 'docente')
            .single()
            
        if (!teacherEnrollment && !isGuest) {
             throw new Error('No tienes permisos para ver las entregas')
        }

        const { data, error } = await adminClient
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
        const { supabase } = await checkAuth()
        
        const { error } = await supabase
            .from('assignment_submissions')
            .update({ grade })
            .eq('id', submissionId)

        if (error) throw error
        return { success: true }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}

export async function deleteSubmission(submissionId: string) {
    try {
        const { supabase } = await checkAuth()
        
        const { error } = await supabase
            .from('assignment_submissions')
            .delete()
            .eq('id', submissionId)

        if (error) throw error
        return { success: true }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}

export async function updateSubmissionContent(submissionId: string, content: string, fileUrl: string | null) {
    try {
        const { supabase } = await checkAuth()
        
        const { error } = await supabase
            .from('assignment_submissions')
            .update({ 
                content,
                file_url: fileUrl
            })
            .eq('id', submissionId)

        if (error) throw error
        return { success: true }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}

export async function getStudentAssignments(courseId: string) {
    try {
        const { supabase, user } = await checkAuth()
        const adminClient = getAdminClient()

        // Check if guest
        const { data: profile } = await adminClient
            .from('profiles')
            .select('roles')
            .eq('email', user.email!)
            .single()
        
        const isGuest = profile?.roles?.includes('invitado')

        if (!isGuest) {
            // Verify enrollment (allow multiple roles, just check existence)
            const { data: enrollments } = await adminClient
                .from('course_enrollments')
                .select('id')
                .eq('course_id', courseId)
                .ilike('email', user.email!)
                .limit(1)

            if (!enrollments || enrollments.length === 0) {
                throw new Error('No estás matriculado en este curso')
            }
        }

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

export async function getMyCourseSubmissions(courseId: string) {
    try {
        const { supabase, user } = await checkAuth()

        const { data, error } = await supabase
            .from('assignment_submissions')
            .select('*, assignments!inner(course_id)')
            .eq('assignments.course_id', courseId)
            .ilike('student_email', user.email!)

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

        // Get assignment to verify course and existence
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
            
        // Check for admin/guest as well if needed, similar to other functions
        const { data: profile } = await adminClient
            .from('profiles')
            .select('roles')
            .eq('email', user.email!)
            .single()
        
        const isGuest = profile?.roles?.includes('invitado')
        const isAdmin = profile?.roles?.includes('admin-plataforma') || profile?.roles?.includes('admin-institucion')

        if (!teacherEnrollment && !isGuest && !isAdmin) {
             throw new Error('No tienes permisos para calificar en este curso')
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
                .update({ 
                    grade,
                    // Optionally update submitted_at if not present? No, preserve it.
                })
                .eq('id', existing.id)
            
            if (error) throw error
        } else {
            // Create new submission with grade
            const { error } = await adminClient
                .from('assignment_submissions')
                .insert({
                    assignment_id: assignmentId,
                    student_email: studentEmail,
                    grade,
                    submitted_at: new Date().toISOString() // Mark as submitted
                })
            
            if (error) throw error
        }

        revalidatePath(`/courses/${assignment.course_id}`)
        return { success: true }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}

export async function bulkUpdateGrades(courseId: string, updates: { assignmentId: string, studentEmail: string, grade: string }[]) {
    try {
        const { user } = await checkAuth()
        const adminClient = getAdminClient()

        // Verify permissions for the course
        const { data: teacherEnrollment } = await adminClient
            .from('course_enrollments')
            .select('id')
            .eq('course_id', courseId)
            .ilike('email', user.email!)
            .eq('role', 'docente')
            .single()

        const { data: profile } = await adminClient
            .from('profiles')
            .select('roles')
            .eq('email', user.email!)
            .single()
        
        const isGuest = profile?.roles?.includes('invitado')
        const isAdmin = profile?.roles?.includes('admin-plataforma') || profile?.roles?.includes('admin-institucion')

        if (!teacherEnrollment && !isGuest && !isAdmin) {
             throw new Error('No tienes permisos para calificar en este curso')
        }

        // Process updates
        const results = await Promise.all(updates.map(async (update) => {
            try {
                // Check if submission exists
                const { data: existing } = await adminClient
                    .from('assignment_submissions')
                    .select('id')
                    .eq('assignment_id', update.assignmentId)
                    .ilike('student_email', update.studentEmail)
                    .single()

                if (existing) {
                    const { error } = await adminClient
                        .from('assignment_submissions')
                        .update({ grade: update.grade })
                        .eq('id', existing.id)
                    if (error) throw error
                } else {
                    const { error } = await adminClient
                        .from('assignment_submissions')
                        .insert({
                            assignment_id: update.assignmentId,
                            student_email: update.studentEmail,
                            grade: update.grade,
                            submitted_at: new Date().toISOString()
                        })
                    if (error) throw error
                }
                return { success: true }
            } catch (err) {
                console.error(`Error updating grade for ${update.studentEmail} in assignment ${update.assignmentId}:`, err)
                return { success: false, error: err }
            }
        }))

        // Check if any failed?
        const failures = results.filter(r => !r.success)
        if (failures.length > 0) {
            console.warn(`Bulk update had ${failures.length} failures out of ${updates.length}`)
        }

        revalidatePath(`/courses/${courseId}`)
        return { success: true, processed: results.length, failures: failures.length }

    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}
