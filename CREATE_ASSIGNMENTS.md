-- Create Assignments Table
CREATE TABLE IF NOT EXISTS public.assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    due_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Submissions Table
CREATE TABLE IF NOT EXISTS public.assignment_submissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    assignment_id UUID REFERENCES public.assignments(id) ON DELETE CASCADE,
    student_email TEXT NOT NULL,
    content TEXT, -- URL or text content
    file_url TEXT, -- Path in storage
    grade TEXT,
    feedback TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(assignment_id, student_email)
);

-- RLS Policies for Assignments

ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

-- Teachers can view assignments for their courses
DROP POLICY IF EXISTS "Teachers can view assignments" ON public.assignments;
CREATE POLICY "Teachers can view assignments" ON public.assignments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.course_enrollments ce
    WHERE ce.course_id = assignments.course_id
    AND ce.email = (auth.jwt() ->> 'email')
    AND ce.role = 'docente'
  )
);

-- Teachers can insert assignments
DROP POLICY IF EXISTS "Teachers can insert assignments" ON public.assignments;
CREATE POLICY "Teachers can insert assignments" ON public.assignments
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.course_enrollments ce
    WHERE ce.course_id = assignments.course_id
    AND ce.email = (auth.jwt() ->> 'email')
    AND ce.role = 'docente'
  )
);

-- Teachers can update assignments
DROP POLICY IF EXISTS "Teachers can update assignments" ON public.assignments;
CREATE POLICY "Teachers can update assignments" ON public.assignments
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.course_enrollments ce
    WHERE ce.course_id = assignments.course_id
    AND ce.email = (auth.jwt() ->> 'email')
    AND ce.role = 'docente'
  )
);

-- Teachers can delete assignments
DROP POLICY IF EXISTS "Teachers can delete assignments" ON public.assignments;
CREATE POLICY "Teachers can delete assignments" ON public.assignments
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.course_enrollments ce
    WHERE ce.course_id = assignments.course_id
    AND ce.email = (auth.jwt() ->> 'email')
    AND ce.role = 'docente'
  )
);

-- Students can view assignments for their courses
DROP POLICY IF EXISTS "Students can view assignments" ON public.assignments;
CREATE POLICY "Students can view assignments" ON public.assignments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.course_enrollments ce
    WHERE ce.course_id = assignments.course_id
    AND ce.email = (auth.jwt() ->> 'email')
    AND ce.role = 'alumno'
  )
);

-- RLS Policies for Submissions

ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;

-- Teachers can view submissions for their courses
DROP POLICY IF EXISTS "Teachers can view submissions" ON public.assignment_submissions;
CREATE POLICY "Teachers can view submissions" ON public.assignment_submissions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.assignments a
    JOIN public.course_enrollments ce ON a.course_id = ce.course_id
    WHERE a.id = assignment_submissions.assignment_id
    AND ce.email = (auth.jwt() ->> 'email')
    AND ce.role = 'docente'
  )
);

-- Teachers can update submissions (grade)
DROP POLICY IF EXISTS "Teachers can update submissions" ON public.assignment_submissions;
CREATE POLICY "Teachers can update submissions" ON public.assignment_submissions
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.assignments a
    JOIN public.course_enrollments ce ON a.course_id = ce.course_id
    WHERE a.id = assignment_submissions.assignment_id
    AND ce.email = (auth.jwt() ->> 'email')
    AND ce.role = 'docente'
  )
);

-- Students can view their own submissions
DROP POLICY IF EXISTS "Students can view own submissions" ON public.assignment_submissions;
CREATE POLICY "Students can view own submissions" ON public.assignment_submissions
FOR SELECT
USING (
  student_email = (auth.jwt() ->> 'email')
);

-- Students can insert their own submissions
DROP POLICY IF EXISTS "Students can insert submissions" ON public.assignment_submissions;
CREATE POLICY "Students can insert submissions" ON public.assignment_submissions
FOR INSERT
WITH CHECK (
  student_email = (auth.jwt() ->> 'email')
  AND EXISTS (
    SELECT 1 FROM public.assignments a
    JOIN public.course_enrollments ce ON a.course_id = ce.course_id
    WHERE a.id = assignment_submissions.assignment_id
    AND ce.email = (auth.jwt() ->> 'email')
    AND ce.role = 'alumno'
  )
);

-- Students can update their own submissions
DROP POLICY IF EXISTS "Students can update own submissions" ON public.assignment_submissions;
CREATE POLICY "Students can update own submissions" ON public.assignment_submissions
FOR UPDATE
USING (
  student_email = (auth.jwt() ->> 'email')
);


-- Storage Bucket for Submissions
INSERT INTO storage.buckets (id, name, public) VALUES ('assignment-submissions', 'assignment-submissions', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies for 'assignment-submissions'
-- Path structure: course_id/assignment_id/student_email/filename

-- Policy: Teachers can view all files in their courses
DROP POLICY IF EXISTS "Teachers can view submission files" ON storage.objects;
CREATE POLICY "Teachers can view submission files" ON storage.objects
FOR SELECT
USING (
  bucket_id = 'assignment-submissions' AND
  auth.role() = 'authenticated' AND
  EXISTS (
    SELECT 1 FROM public.course_enrollments ce
    WHERE ce.email = (auth.jwt() ->> 'email')
    AND ce.role = 'docente'
    AND ce.course_id::text = (storage.foldername(name))[1] 
  )
);

-- Policy: Students can view their own files
DROP POLICY IF EXISTS "Students can view own submission files" ON storage.objects;
CREATE POLICY "Students can view own submission files" ON storage.objects
FOR SELECT
USING (
  bucket_id = 'assignment-submissions' AND
  auth.role() = 'authenticated' AND
  (storage.foldername(name))[3] = (auth.jwt() ->> 'email')
);

-- Policy: Students can upload files to their own folder (and must be enrolled)
DROP POLICY IF EXISTS "Students can upload submission files" ON storage.objects;
CREATE POLICY "Students can upload submission files" ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'assignment-submissions' AND
  auth.role() = 'authenticated' AND
  (storage.foldername(name))[3] = (auth.jwt() ->> 'email') AND
  EXISTS (
    SELECT 1 FROM public.course_enrollments ce
    WHERE ce.email = (auth.jwt() ->> 'email')
    AND ce.role = 'alumno'
    AND ce.course_id::text = (storage.foldername(name))[1]
  )
);

-- Policy: Students can delete/update their own files (optional, for corrections)
DROP POLICY IF EXISTS "Students can update own submission files" ON storage.objects;
CREATE POLICY "Students can update own submission files" ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'assignment-submissions' AND
  auth.role() = 'authenticated' AND
  (storage.foldername(name))[3] = (auth.jwt() ->> 'email')
);

DROP POLICY IF EXISTS "Students can delete own submission files" ON storage.objects;
CREATE POLICY "Students can delete own submission files" ON storage.objects
FOR DELETE
USING (
  bucket_id = 'assignment-submissions' AND
  auth.role() = 'authenticated' AND
  (storage.foldername(name))[3] = (auth.jwt() ->> 'email')
);

-- ============================================================================
-- ASSIGNMENT RESOURCES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.assignment_resources (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    assignment_id UUID REFERENCES public.assignments(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    type TEXT NOT NULL, -- 'link', 'video', 'doc'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.assignment_resources ENABLE ROW LEVEL SECURITY;

-- Teachers can view resources for their assignments
DROP POLICY IF EXISTS "Teachers can view assignment resources" ON public.assignment_resources;
CREATE POLICY "Teachers can view assignment resources" ON public.assignment_resources
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.assignments a
    JOIN public.course_enrollments ce ON a.course_id = ce.course_id
    WHERE a.id = assignment_resources.assignment_id
    AND ce.email = (auth.jwt() ->> 'email')
    AND ce.role = 'docente'
  )
);

-- Teachers can insert resources
DROP POLICY IF EXISTS "Teachers can insert assignment resources" ON public.assignment_resources;
CREATE POLICY "Teachers can insert assignment resources" ON public.assignment_resources
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.assignments a
    JOIN public.course_enrollments ce ON a.course_id = ce.course_id
    WHERE a.id = assignment_resources.assignment_id
    AND ce.email = (auth.jwt() ->> 'email')
    AND ce.role = 'docente'
  )
);

-- Teachers can delete resources
DROP POLICY IF EXISTS "Teachers can delete assignment resources" ON public.assignment_resources;
CREATE POLICY "Teachers can delete assignment resources" ON public.assignment_resources
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.assignments a
    JOIN public.course_enrollments ce ON a.course_id = ce.course_id
    WHERE a.id = assignment_resources.assignment_id
    AND ce.email = (auth.jwt() ->> 'email')
    AND ce.role = 'docente'
  )
);

-- Students can view resources for their assignments
DROP POLICY IF EXISTS "Students can view assignment resources" ON public.assignment_resources;
CREATE POLICY "Students can view assignment resources" ON public.assignment_resources
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.assignments a
    JOIN public.course_enrollments ce ON a.course_id = ce.course_id
    WHERE a.id = assignment_resources.assignment_id
    AND ce.email = (auth.jwt() ->> 'email')
    AND ce.role = 'alumno'
  )
);

-- Storage Policy Update for Class Resources Bucket to support Assignment Resources
-- We reuse 'class-resources' bucket. Structure: assignment_id/filename

-- Policy: Teachers can upload to assignment folders in class-resources
DROP POLICY IF EXISTS "Teachers can upload assignment resources" ON storage.objects;
CREATE POLICY "Teachers can upload assignment resources" ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'class-resources' AND
  auth.role() = 'authenticated' AND
  EXISTS (
    SELECT 1 FROM public.assignments a
    JOIN public.course_enrollments ce ON a.course_id = ce.course_id
    WHERE a.id::text = (storage.foldername(name))[1]
    AND ce.email = (auth.jwt() ->> 'email')
    AND ce.role = 'docente'
  )
);

-- Policy: Teachers can delete from assignment folders
DROP POLICY IF EXISTS "Teachers can delete assignment resources" ON storage.objects;
CREATE POLICY "Teachers can delete assignment resources" ON storage.objects
FOR DELETE
USING (
  bucket_id = 'class-resources' AND
  auth.role() = 'authenticated' AND
  EXISTS (
    SELECT 1 FROM public.assignments a
    JOIN public.course_enrollments ce ON a.course_id = ce.course_id
    WHERE a.id::text = (storage.foldername(name))[1]
    AND ce.email = (auth.jwt() ->> 'email')
    AND ce.role = 'docente'
  )
);
