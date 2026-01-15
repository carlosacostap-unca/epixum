-- DROP existing policies to be safe
DROP POLICY IF EXISTS "Institution Admins can manage draft students" ON public.draft_students;
DROP POLICY IF EXISTS "Platform Admins can manage draft students" ON public.draft_students;

-- POLICY: Institution Admins can manage draft students
-- Fixed to use auth.jwt() ->> 'email' instead of auth.users table
CREATE POLICY "Institution Admins can manage draft students" ON public.draft_students
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.courses
    JOIN public.institution_roles ON courses.institution_id = institution_roles.institution_id
    WHERE courses.id = draft_students.course_id
    AND institution_roles.email = (auth.jwt() ->> 'email')
    AND institution_roles.role = 'admin-institucion'
  )
);

-- POLICY: Platform Admins can manage draft students
-- Added to allow platform admins to manage drafts as well
CREATE POLICY "Platform Admins can manage draft students" ON public.draft_students
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND 'admin-plataforma' = ANY(profiles.roles)
  )
);
