'use server'

import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

async function checkTeacherAccess(courseId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || !user.email) throw new Error('No autenticado')

    const adminClient = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    )

    // Check if user is enrolled as docente in this course using Admin Client
    const { data: enrollment, error } = await adminClient
        .from('course_enrollments')
        .select('role')
        .eq('course_id', courseId)
        .eq('email', user.email)
        .eq('role', 'docente')
        .single()

    if (error || !enrollment) {
        throw new Error('No autorizado: No es docente de este curso')
    }
    
    return { supabase: adminClient, user }
}

async function checkStudentAccess(courseId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || !user.email) throw new Error('No autenticado')

    // Check if user is enrolled as student in this course
    const { data: enrollment, error } = await supabase
        .from('course_enrollments')
        .select('role')
        .eq('course_id', courseId)
        .eq('email', user.email)
        .in('role', ['estudiante', 'alumno'])
        .single()

    if (error || !enrollment) {
        throw new Error('No autorizado: No es estudiante de este curso')
    }
    
    return { supabase, user }
}

export async function createReviewSlots(formData: FormData) {
    const courseId = formData.get('courseId') as string
    const sprintId = formData.get('sprintId') as string
    const startTimeStr = formData.get('startTime') as string
    const countStr = formData.get('count') as string
    const durationStr = formData.get('duration') as string

    if (!courseId || !sprintId || !startTimeStr || !countStr || !durationStr) {
        return { success: false, error: 'Faltan campos requeridos' }
    }

    const count = parseInt(countStr)
    const duration = parseInt(durationStr)
    const startTime = new Date(startTimeStr)

    if (isNaN(count) || isNaN(duration)) {
        return { success: false, error: 'Valores numéricos inválidos' }
    }

    try {
        const { supabase } = await checkTeacherAccess(courseId)
        
        const slots = []
        for (let i = 0; i < count; i++) {
            const slotStart = new Date(startTime.getTime() + i * duration * 60000)
            const slotEnd = new Date(slotStart.getTime() + duration * 60000)
            
            slots.push({
                sprint_id: sprintId,
                student_email: null, // Open slot
                start_date: slotStart.toISOString(),
                end_date: slotEnd.toISOString()
            })
        }

        const { error } = await supabase
            .from('sprint_reviews')
            .insert(slots)

        if (error) throw error
        
        revalidatePath(`/teacher/courses/${courseId}`)
        return { success: true }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}

export async function getSprintReviews(courseId: string) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user || !user.email) throw new Error('No autenticado')

        // Use admin client to bypass RLS if needed, or just normal client if RLS is set up correctly.
        // Since we are fetching cross-table with sprints, let's use Admin Client for robust checking of enrollment first.
        const adminClient = createAdminClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        )

        // Check enrollment (Teacher OR Student)
        const { data: enrollment } = await adminClient
            .from('course_enrollments')
            .select('role')
            .eq('course_id', courseId)
            .eq('email', user.email)
            .limit(1)
            .maybeSingle()

        let authorized = !!enrollment;

        // If not enrolled, check if Admin
        if (!authorized) {
            const { data: adminRole } = await adminClient
                .from('institution_roles')
                .select('role')
                .eq('email', user.email)
                .eq('role', 'admin-institucion')
                // We also need to check if the course belongs to this institution
                // But getting institution_id requires fetching course first.
                // Let's optimize: fetch course's institution_id
                .single()
            
            if (adminRole) {
                 // Check if course belongs to admin's institution
                 const { data: course } = await adminClient
                    .from('courses')
                    .select('institution_id')
                    .eq('id', courseId)
                    .single()
                 
                 if (course) {
                      const { data: correctAdmin } = await adminClient
                        .from('institution_roles')
                        .select('role')
                        .eq('email', user.email)
                        .eq('role', 'admin-institucion')
                        .eq('institution_id', course.institution_id)
                        .single()
                      
                      if (correctAdmin) authorized = true
                 }
            }
        }

        if (!authorized) {
            return { success: false, error: 'No autorizado' }
        }

        // Get all reviews for sprints in this course
        // 1. Get sprints for this course
        const { data: sprintsData, error: sprintsError } = await adminClient
            .from('sprints')
            .select('id, title')
            .eq('course_id', courseId)
        
        if (sprintsError) throw sprintsError
        
        if (!sprintsData || sprintsData.length === 0) {
            return { success: true, data: [] }
        }

        const sprintIds = sprintsData.map(s => s.id)

        // 2. Get reviews for these sprints
        const { data: reviewsData, error: reviewsError } = await adminClient
            .from('sprint_reviews')
            .select('*')
            .in('sprint_id', sprintIds)
            .order('start_date', { ascending: true })

        if (reviewsError) throw reviewsError

        // 3. Attach sprint info manually
        const data = reviewsData.map(review => ({
            ...review,
            sprints: sprintsData.find(s => s.id === review.sprint_id)
        }))

        return { success: true, data }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}

export async function deleteSprintReview(reviewId: string, courseId: string) {
    try {
        const { supabase } = await checkTeacherAccess(courseId)
        
        const { error } = await supabase
            .from('sprint_reviews')
            .delete()
            .eq('id', reviewId)

        if (error) throw error
        
        revalidatePath(`/teacher/courses/${courseId}`)
        return { success: true }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}

export async function bookReviewSlot(courseId: string, reviewId: string) {
    try {
        const { supabase, user } = await checkStudentAccess(courseId)

        // Use Admin Client to perform the booking to ensure no race conditions/RLS issues with "null" check update if RLS is tricky
        // Actually, let's try with the user's supabase client first if RLS allows it, but I set up RLS for update.
        // However, updating from NULL to email might be tricky with simple RLS if not carefully crafted.
        // Let's use Admin Client to be safe and simple, verifying logic here.
        
        const adminClient = createAdminClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        // 1. Check if slot is free
        const { data: slot, error: fetchError } = await adminClient
            .from('sprint_reviews')
            .select('*')
            .eq('id', reviewId)
            .single()

        if (fetchError || !slot) throw new Error('Turno no encontrado')
        
        if (slot.student_email) {
            throw new Error('Este turno ya está ocupado')
        }

        // 1.5. Check if user already has a booking for this sprint
        const { data: existingBooking, error: existingBookingError } = await adminClient
            .from('sprint_reviews')
            .select('id')
            .eq('sprint_id', slot.sprint_id)
            .eq('student_email', user.email)
            .maybeSingle()
        
        if (existingBookingError) {
             throw new Error('Error al verificar reservas existentes')
        }

        if (existingBooking) {
            throw new Error('Ya tienes una reserva para este sprint')
        }

        // 2. Book it
        const { error: updateError } = await adminClient
            .from('sprint_reviews')
            .update({ student_email: user.email })
            .eq('id', reviewId)
            .is('student_email', null) // Optimistic concurrency check

        if (updateError) throw updateError

        revalidatePath(`/student/courses/${courseId}`)
        return { success: true }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}

export async function updateReviewDetails(
    courseId: string, 
    reviewId: string, 
    data: { 
        studentEmail: string | null, 
        comments: string | null, 
        result: string | null 
    }
) {
    try {
        await checkTeacherAccess(courseId) // Ensure teacher access

        const adminClient = createAdminClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )
        
        const updateData = {
            comments: data.comments,
            result: data.result,
            student_email: data.studentEmail
        }

        const { error } = await adminClient
            .from('sprint_reviews')
            .update(updateData)
            .eq('id', reviewId)

        if (error) throw error

        revalidatePath(`/teacher/courses/${courseId}`)
        return { success: true }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}

export async function cancelReviewBooking(courseId: string, reviewId: string) {
    try {
        const { supabase, user } = await checkStudentAccess(courseId)
        
        const adminClient = createAdminClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        // 1. Verify it's their booking
        const { data: slot, error: fetchError } = await adminClient
            .from('sprint_reviews')
            .select('*')
            .eq('id', reviewId)
            .single()

        if (fetchError || !slot) throw new Error('Turno no encontrado')
        
        if (slot.student_email !== user.email) {
            throw new Error('No puedes cancelar un turno que no es tuyo')
        }

        // 2. Cancel it
        const { error: updateError } = await adminClient
            .from('sprint_reviews')
            .update({ student_email: null })
            .eq('id', reviewId)

        if (updateError) throw updateError

        revalidatePath(`/student/courses/${courseId}`)
        return { success: true }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}
