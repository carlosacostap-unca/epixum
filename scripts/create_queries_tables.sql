-- Create queries table
CREATE TABLE IF NOT EXISTS public.queries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    context_type TEXT NOT NULL CHECK (context_type IN ('general', 'class', 'assignment')),
    context_id UUID, -- Nullable if general, otherwise FK to classes or assignments
    content TEXT NOT NULL,
    user_email TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    is_resolved BOOLEAN DEFAULT FALSE
);

-- Create query_responses table
CREATE TABLE IF NOT EXISTS public.query_responses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    query_id UUID NOT NULL REFERENCES public.queries(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    user_email TEXT NOT NULL,
    user_role TEXT, -- 'docente', 'estudiante', etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.query_responses ENABLE ROW LEVEL SECURITY;

-- Policies for queries
CREATE POLICY "Users can view queries for courses they are enrolled in" ON public.queries
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.course_enrollments
            WHERE course_enrollments.course_id = queries.course_id
            AND course_enrollments.email = auth.email()
        )
    );

CREATE POLICY "Users can create queries for courses they are enrolled in" ON public.queries
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.course_enrollments
            WHERE course_enrollments.course_id = queries.course_id
            AND course_enrollments.email = auth.email()
        )
    );

CREATE POLICY "Users can update their own queries or teachers can update any" ON public.queries
    FOR UPDATE USING (
        user_email = auth.email() OR
        EXISTS (
            SELECT 1 FROM public.course_enrollments
            WHERE course_enrollments.course_id = queries.course_id
            AND course_enrollments.email = auth.email()
            AND course_enrollments.role = 'docente'
        )
    );

CREATE POLICY "Users can delete their own queries or teachers can delete any" ON public.queries
    FOR DELETE USING (
        user_email = auth.email() OR
        EXISTS (
            SELECT 1 FROM public.course_enrollments
            WHERE course_enrollments.course_id = queries.course_id
            AND course_enrollments.email = auth.email()
            AND course_enrollments.role = 'docente'
        )
    );

-- Policies for responses
CREATE POLICY "Users can view responses for courses they are enrolled in" ON public.query_responses
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.queries
            JOIN public.course_enrollments ON course_enrollments.course_id = queries.course_id
            WHERE queries.id = query_responses.query_id
            AND course_enrollments.email = auth.email()
        )
    );

CREATE POLICY "Users can create responses for courses they are enrolled in" ON public.query_responses
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.queries
            JOIN public.course_enrollments ON course_enrollments.course_id = queries.course_id
            WHERE queries.id = query_responses.query_id
            AND course_enrollments.email = auth.email()
        )
    );
