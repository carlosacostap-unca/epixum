-- Habilitar RLS en la tabla assignments
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

-- Política para que los docentes puedan crear trabajos prácticos
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

-- Política para que los docentes puedan actualizar trabajos prácticos
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

-- Política para que los docentes puedan eliminar trabajos prácticos
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

-- Política para que los docentes puedan ver todos los trabajos prácticos de sus cursos
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
