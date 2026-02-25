'use server'

import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

export async function getQueries(courseId: string, contextType: 'general' | 'class' | 'assignment', contextId?: string) {
    try {
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

        // Check permissions manually to bypass RLS and handle case sensitivity
        // 1. Check if admin or guest
        const { data: profile } = await adminClient
            .from('profiles')
            .select('roles')
            .eq('email', user.email)
            .single()
        
        const isAdmin = profile?.roles?.some((r: string) => ['admin-plataforma', 'admin-institucion'].includes(r))
        const isGuest = profile?.roles?.includes('invitado')

        let hasAccess = isAdmin || isGuest

        if (!hasAccess) {
            // 2. Check enrollment with ilike
            const { data: enrollment } = await adminClient
                .from('course_enrollments')
                .select('role')
                .eq('course_id', courseId)
                .ilike('email', user.email)
                .single()
            
            if (enrollment) {
                hasAccess = true
            }
        }

        if (!hasAccess) {
             throw new Error('No tienes acceso a este curso')
        }

        let query = adminClient
            .from('queries')
            .select(`
                *,
                query_responses (
                    id,
                    content,
                    user_email,
                    user_role,
                    created_at
                )
            `)
            .eq('course_id', courseId)
            .eq('context_type', contextType)
            .order('created_at', { ascending: false })

        if (contextId) {
            query = query.eq('context_id', contextId)
        }

        const { data, error } = await query

        if (error) throw error

        // Sort responses by date
        const queries = data.map((q: any) => ({
            ...q,
            query_responses: q.query_responses.sort((a: any, b: any) => 
                new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            )
        }))

        return { success: true, data: queries }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}

export async function getCourseQueries(
    courseId: string, 
    page: number = 1, 
    limit: number = 20,
    contextType?: 'general' | 'class' | 'assignment',
    contextId?: string
) {
    try {
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

        // Check permissions manually to bypass RLS and handle case sensitivity
        // 1. Check if admin or guest
        const { data: profile } = await adminClient
            .from('profiles')
            .select('roles')
            .eq('email', user.email)
            .single()
        
        const isAdmin = profile?.roles?.some((r: string) => ['admin-plataforma', 'admin-institucion'].includes(r))
        const isGuest = profile?.roles?.includes('invitado')

        let hasAccess = isAdmin || isGuest

        if (!hasAccess) {
            // 2. Check enrollment with ilike
            const { data: enrollment } = await adminClient
                .from('course_enrollments')
                .select('role')
                .eq('course_id', courseId)
                .ilike('email', user.email)
                .single()
            
            if (enrollment) {
                hasAccess = true
            }
        }

        if (!hasAccess) {
             throw new Error('No tienes acceso a este curso')
        }

        const from = (page - 1) * limit
        const to = from + limit - 1

        let query = adminClient
            .from('queries')
            .select(`
                *,
                query_responses (count)
            `, { count: 'exact' })
            .eq('course_id', courseId)
            .order('created_at', { ascending: false })
            .range(from, to)

        if (contextType) {
            query = query.eq('context_type', contextType)
        }
        
        if (contextId) {
            query = query.eq('context_id', contextId)
        }

        const { data, error, count } = await query

        if (error) throw error

        // Fetch profiles for the query authors
        const queryEmails = data.map((q: any) => q.user_email)
        const userEmails = [...new Set(queryEmails)]
        
        let profiles: any[] = []
        
        if (userEmails.length > 0) {
            const { data: profilesData } = await adminClient
                .from('profiles')
                .select('email, first_name, last_name')
                .in('email', userEmails)
            
            if (profilesData) {
                profiles = profilesData
            }
        }

        // Attach profile info and format response count
        const queries = data.map((q: any) => {
            const profile = profiles.find(p => p.email === q.user_email)
            return {
                ...q,
                first_name: profile?.first_name || '',
                last_name: profile?.last_name || '',
                response_count: q.query_responses[0]?.count || 0,
                query_responses: [] // Don't return responses initially
            }
        })

        return { 
            success: true, 
            data: queries,
            hasMore: count ? (from + queries.length) < count : false,
            total: count
        }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}

export async function getQueryResponses(queryId: string) {
    try {
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

        // Need courseId to check enrollment
        // Get query to find course_id
        const { data: query } = await adminClient
            .from('queries')
            .select('course_id')
            .eq('id', queryId)
            .single()

        if (!query) throw new Error('Consulta no encontrada')

        // Check permissions manually to bypass RLS and handle case sensitivity
        // 1. Check if admin or guest
        const { data: profile } = await adminClient
            .from('profiles')
            .select('roles')
            .eq('email', user.email)
            .single()
        
        const isAdmin = profile?.roles?.some((r: string) => ['admin-plataforma', 'admin-institucion'].includes(r))
        const isGuest = profile?.roles?.includes('invitado')

        let hasAccess = isAdmin || isGuest

        if (!hasAccess) {
            // 2. Check enrollment with ilike
            const { data: enrollment } = await adminClient
                .from('course_enrollments')
                .select('role')
                .eq('course_id', query.course_id)
                .ilike('email', user.email)
                .single()
            
            if (enrollment) {
                hasAccess = true
            }
        }

        if (!hasAccess) {
             throw new Error('No tienes acceso a esta consulta')
        }

        const { data, error } = await adminClient
            .from('query_responses')
            .select('*')
            .eq('query_id', queryId)
            .order('created_at', { ascending: true })

        if (error) throw error

        // Fetch profiles for response authors
        const userEmails = [...new Set(data.map((r: any) => r.user_email))]
        let profiles: any[] = []

        if (userEmails.length > 0) {
            const { data: profilesData } = await adminClient
                .from('profiles')
                .select('email, first_name, last_name')
                .in('email', userEmails)
            
            if (profilesData) {
                profiles = profilesData
            }
        }

        const responses = data.map((r: any) => {
            const profile = profiles.find(p => p.email === r.user_email)
            return {
                ...r,
                first_name: profile?.first_name || '',
                last_name: profile?.last_name || ''
            }
        })

        return { success: true, data: responses }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}

export async function getAllCourseQueries(courseId: string) {
    try {
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

        // Check permissions manually to bypass RLS and handle case sensitivity
        // 1. Check if admin or guest
        const { data: profile } = await adminClient
            .from('profiles')
            .select('roles')
            .eq('email', user.email)
            .single()
        
        const isAdmin = profile?.roles?.some((r: string) => ['admin-plataforma', 'admin-institucion'].includes(r))
        const isGuest = profile?.roles?.includes('invitado')

        let hasAccess = isAdmin || isGuest

        if (!hasAccess) {
            // 2. Check enrollment with ilike
            const { data: enrollment } = await adminClient
                .from('course_enrollments')
                .select('role')
                .eq('course_id', courseId)
                .ilike('email', user.email)
                .single()
            
            if (enrollment) {
                hasAccess = true
            }
        }

        if (!hasAccess) {
             throw new Error('No tienes acceso a este curso')
        }

        const { data, error } = await adminClient
            .from('queries')
            .select(`
                *,
                query_responses (
                    id,
                    content,
                    user_email,
                    user_role,
                    created_at
                )
            `)
            .eq('course_id', courseId)
            .order('created_at', { ascending: false })

        if (error) throw error

        // Fetch profiles for the query authors
        const queryEmails = data.map((q: any) => q.user_email)
        const userEmails = [...new Set(queryEmails)]
        
        let profiles: any[] = []
        
        if (userEmails.length > 0) {
            const { data: profilesData } = await adminClient
                .from('profiles')
                .select('email, first_name, last_name')
                .in('email', userEmails)
            
            if (profilesData) {
                profiles = profilesData
            }
        }

        // Sort responses by date and attach profile info
        const queries = data.map((q: any) => {
            const profile = profiles.find(p => p.email === q.user_email)
            return {
                ...q,
                first_name: profile?.first_name || '',
                last_name: profile?.last_name || '',
                query_responses: q.query_responses.sort((a: any, b: any) => 
                    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                )
            }
        })

        return { success: true, data: queries }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}

export async function createQuery(
    courseId: string, 
    contextType: 'general' | 'class' | 'assignment', 
    contextId: string | null, 
    content: string
) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user || !user.email) throw new Error('No autenticado')

        const { error } = await supabase
            .from('queries')
            .insert({
                course_id: courseId,
                context_type: contextType,
                context_id: contextId,
                content,
                user_email: user.email
            })

        if (error) throw error

        revalidatePath(`/teacher/courses/${courseId}`)
        revalidatePath(`/student/courses/${courseId}`)
        return { success: true }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}

export async function searchCourseQueries(courseId: string, term: string) {
    try {
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

        // Check permissions manually to bypass RLS and handle case sensitivity
        // 1. Check if admin or guest
        const { data: profile } = await adminClient
            .from('profiles')
            .select('roles')
            .eq('email', user.email)
            .single()
        
        const isAdmin = profile?.roles?.some((r: string) => ['admin-plataforma', 'admin-institucion'].includes(r))
        const isGuest = profile?.roles?.includes('invitado')

        let hasAccess = isAdmin || isGuest

        if (!hasAccess) {
            // 2. Check enrollment with ilike
            const { data: enrollment } = await adminClient
                .from('course_enrollments')
                .select('role')
                .eq('course_id', courseId)
                .ilike('email', user.email)
                .single()
            
            if (enrollment) {
                hasAccess = true
            }
        }

        if (!hasAccess) {
             throw new Error('No tienes acceso a este curso')
        }

        // 1. Search in queries content
        const { data: queriesMatching, error: queriesError } = await adminClient
            .from('queries')
            .select('id')
            .eq('course_id', courseId)
            .ilike('content', `%${term}%`)

        if (queriesError) throw queriesError

        // 2. Search in responses content (linked to this course)
        // We use !inner to filter by the related query's course_id
        const { data: responsesMatching, error: responsesError } = await adminClient
            .from('query_responses')
            .select('query_id, queries!inner(course_id)')
            .eq('queries.course_id', courseId)
            .ilike('content', `%${term}%`)

        if (responsesError) throw responsesError

        // 3. Combine IDs
        const idsFromQueries = queriesMatching?.map(q => q.id) || []
        const idsFromResponses = responsesMatching?.map(r => r.query_id) || []
        const uniqueIds = [...new Set([...idsFromQueries, ...idsFromResponses])]

        if (uniqueIds.length === 0) {
            return { success: true, data: [] }
        }

        // 4. Fetch full details for these queries
        const { data, error } = await adminClient
            .from('queries')
            .select(`
                *,
                query_responses (count)
            `, { count: 'exact' })
            .in('id', uniqueIds)
            .order('created_at', { ascending: false })

        if (error) throw error

        // 5. Fetch profiles
        const queryEmails = data.map(q => q.user_email)
        const userEmails = [...new Set(queryEmails)]
        
        let profiles: any[] = []
        
        if (userEmails.length > 0) {
            const { data: profilesData } = await adminClient
                .from('profiles')
                .select('email, first_name, last_name')
                .in('email', userEmails)
            
            if (profilesData) {
                profiles = profilesData
            }
        }

        // 6. Format results
        const queries = data.map(q => {
            const profile = profiles.find(p => p.email === q.user_email)
            return {
                ...q,
                first_name: profile?.first_name || '',
                last_name: profile?.last_name || '',
                response_count: q.query_responses[0]?.count || 0,
                query_responses: [] // Lazy load responses
            }
        })

        return { success: true, data: queries }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}

export async function createResponse(queryId: string, content: string, courseId: string) {
    try {
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

        // Determine role (teacher or student)
        // Check permissions using admin client to bypass RLS and handle case sensitivity
        let role = 'estudiante'
        
        // Check if admin
        const { data: profile } = await adminClient
            .from('profiles')
            .select('roles')
            .eq('email', user.email)
            .single()
        
        const isAdmin = profile?.roles?.some((r: string) => ['admin-plataforma', 'admin-institucion'].includes(r))
        
        if (isAdmin) {
            role = 'docente' // Admins act as teachers
        } else {
            const { data: enrollment } = await adminClient
                .from('course_enrollments')
                .select('role')
                .eq('course_id', courseId)
                .ilike('email', user.email) // Case insensitive check
                .single()

            if (!enrollment) {
                 throw new Error('No estás inscrito en este curso')
            }
            role = enrollment.role
        }

        const { error } = await adminClient
            .from('query_responses')
            .insert({
                query_id: queryId,
                content,
                user_email: user.email,
                user_role: role
            })

        if (error) throw error

        revalidatePath(`/teacher/courses/${courseId}`)
        revalidatePath(`/student/courses/${courseId}`)
        return { success: true }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}

export async function toggleResolved(queryId: string, courseId: string) {
    try {
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

        // Check if user is creator or teacher
        const { data: query } = await adminClient
            .from('queries')
            .select('user_email, is_resolved')
            .eq('id', queryId)
            .single()

        if (!query) throw new Error('Consulta no encontrada')

        // Check enrollment or admin
        let isTeacher = false
        
        // Check if admin
        const { data: profile } = await adminClient
            .from('profiles')
            .select('roles')
            .eq('email', user.email)
            .single()
        
        const isAdmin = profile?.roles?.some((r: string) => ['admin-plataforma', 'admin-institucion'].includes(r))

        if (isAdmin) {
            isTeacher = true
        } else {
            const { data: enrollment } = await adminClient
                .from('course_enrollments')
                .select('role')
                .eq('course_id', courseId)
                .ilike('email', user.email)
                .single()
            
            isTeacher = enrollment?.role === 'docente'
        }

        const isCreator = query.user_email === user.email // user.email is from auth, query.user_email is from DB. might need case insensitive check here too?
        // Ideally query.user_email is stored as lowercase or consistent. But let's assume strict equality for now or use lowerCase if needed.
        // Actually, let's be safe and use lowerCase comparison
        const isCreatorCaseInsensitive = query.user_email.toLowerCase() === user.email.toLowerCase()

        if (!isTeacher && !isCreatorCaseInsensitive) {
            throw new Error('No tienes permiso para modificar esta consulta')
        }

        const { error } = await adminClient
            .from('queries')
            .update({ is_resolved: !query.is_resolved })
            .eq('id', queryId)

        if (error) throw error

        revalidatePath(`/teacher/courses/${courseId}`)
        revalidatePath(`/student/courses/${courseId}`)
        return { success: true }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}

export async function deleteQuery(queryId: string, courseId: string) {
    try {
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

        // Get query to check owner
        const { data: query } = await adminClient
            .from('queries')
            .select('user_email')
            .eq('id', queryId)
            .single()

        if (!query) throw new Error('Consulta no encontrada')

        // Check permissions
        let isTeacher = false
        
        // Check if admin
        const { data: profile } = await adminClient
            .from('profiles')
            .select('roles')
            .eq('email', user.email)
            .single()
        
        const isAdmin = profile?.roles?.some((r: string) => ['admin-plataforma', 'admin-institucion'].includes(r))

        if (isAdmin) {
            isTeacher = true
        } else {
            const { data: enrollment } = await adminClient
                .from('course_enrollments')
                .select('role')
                .eq('course_id', courseId)
                .ilike('email', user.email)
                .single()
            
            isTeacher = enrollment?.role === 'docente'
        }

        const isCreatorCaseInsensitive = query.user_email.toLowerCase() === user.email.toLowerCase()

        if (!isTeacher && !isCreatorCaseInsensitive) {
            throw new Error('No tienes permiso para eliminar esta consulta')
        }

        const { error } = await adminClient
            .from('queries')
            .delete()
            .eq('id', queryId)

        if (error) throw error

        revalidatePath(`/teacher/courses/${courseId}`)
        revalidatePath(`/student/courses/${courseId}`)
        return { success: true }
    } catch (error: unknown) {
        return { success: false, error: (error as Error).message }
    }
}
