'use server'

import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

export async function getQueries(courseId: string, contextType: 'general' | 'class' | 'assignment', contextId?: string) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user || !user.email) throw new Error('No autenticado')

        // Check if supervisor to bypass RLS
        const { data: profile } = await supabase
            .from('profiles')
            .select('roles')
            .eq('email', user.email)
            .single()
        
        const isSupervisor = profile?.roles?.includes('supervisor')

        let client: any = supabase
        if (isSupervisor) {
             client = createAdminClient(
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

        let query = client
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

        // Check if supervisor to bypass RLS
        const { data: profile } = await supabase
            .from('profiles')
            .select('roles')
            .eq('email', user.email)
            .single()
        
        const isSupervisor = profile?.roles?.includes('supervisor')

        let client: any = supabase
        if (isSupervisor) {
             client = createAdminClient(
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

        const from = (page - 1) * limit
        const to = from + limit - 1

        let query = client
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
            const { data: profilesData } = await supabase
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

        // Check if supervisor to bypass RLS
        const { data: profile } = await supabase
            .from('profiles')
            .select('roles')
            .eq('email', user.email)
            .single()
        
        const isSupervisor = profile?.roles?.includes('supervisor')

        let client: any = supabase
        if (isSupervisor) {
             client = createAdminClient(
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

        const { data, error } = await client
            .from('query_responses')
            .select('*')
            .eq('query_id', queryId)
            .order('created_at', { ascending: true })

        if (error) throw error

        // Fetch profiles for response authors
        const userEmails = [...new Set(data.map((r: any) => r.user_email))]
        let profiles: any[] = []

        if (userEmails.length > 0) {
            const { data: profilesData } = await supabase
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

        // Check if supervisor to bypass RLS
        const { data: profile } = await supabase
            .from('profiles')
            .select('roles')
            .eq('email', user.email)
            .single()
        
        const isSupervisor = profile?.roles?.includes('supervisor')

        let client: any = supabase
        if (isSupervisor) {
             client = createAdminClient(
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

        // Fetch queries with response count instead of full responses
        const { data, error } = await client
            .from('queries')
            .select(`
                *,
                query_responses (count)
            `, { count: 'exact' })
            .eq('course_id', courseId)
            .order('created_at', { ascending: false })

        if (error) throw error

        // Fetch profiles for the query authors
        const queryEmails = data.map((q: any) => q.user_email)
        const userEmails = [...new Set(queryEmails)]
        
        let profiles: any[] = []
        
        if (userEmails.length > 0) {
            const { data: profilesData } = await supabase
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

        // 1. Search in queries content
        const { data: queriesMatching, error: queriesError } = await supabase
            .from('queries')
            .select('id')
            .eq('course_id', courseId)
            .ilike('content', `%${term}%`)

        if (queriesError) throw queriesError

        // 2. Search in responses content (linked to this course)
        // We use !inner to filter by the related query's course_id
        const { data: responsesMatching, error: responsesError } = await supabase
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
        const { data, error } = await supabase
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
            const { data: profilesData } = await supabase
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

        // Determine role (teacher or student)
        const { data: enrollment } = await supabase
            .from('course_enrollments')
            .select('role')
            .eq('course_id', courseId)
            .eq('email', user.email)
            .single()

        const role = enrollment?.role || 'estudiante'

        const { error } = await supabase
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

        // Check if user is creator or teacher
        const { data: query } = await supabase
            .from('queries')
            .select('user_email, is_resolved')
            .eq('id', queryId)
            .single()

        if (!query) throw new Error('Consulta no encontrada')

        const { data: enrollment } = await supabase
            .from('course_enrollments')
            .select('role')
            .eq('course_id', courseId)
            .eq('email', user.email)
            .single()

        const isTeacher = enrollment?.role === 'docente'
        const isCreator = query.user_email === user.email

        if (!isTeacher && !isCreator) {
            throw new Error('No tienes permiso para modificar esta consulta')
        }

        const { error } = await supabase
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

        // Permissions handled by RLS, but we can double check or just try delete
        const { error } = await supabase
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
