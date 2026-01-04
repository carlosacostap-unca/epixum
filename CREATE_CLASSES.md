# Crear Tabla de Clases y Políticas RLS

Ejecuta este script en el **SQL Editor** de Supabase para habilitar la gestión de clases por parte de los docentes.

```sql
-- 1. Crear tabla classes
CREATE TABLE IF NOT EXISTS public.classes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  date timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- 2. Habilitar RLS
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de Seguridad (RLS)

-- POLICY: Teachers can select classes (Ver clases de sus cursos)
DROP POLICY IF EXISTS "Teachers can select classes" ON public.classes;
CREATE POLICY "Teachers can select classes" ON public.classes
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.course_enrollments
    WHERE course_enrollments.course_id = classes.course_id
    AND course_enrollments.email = (select auth.jwt() ->> 'email')
    AND course_enrollments.role = 'docente'
  )
);

-- POLICY: Teachers can insert classes (Crear clases en sus cursos)
DROP POLICY IF EXISTS "Teachers can insert classes" ON public.classes;
CREATE POLICY "Teachers can insert classes" ON public.classes
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.course_enrollments
    WHERE course_enrollments.course_id = course_id
    AND course_enrollments.email = (select auth.jwt() ->> 'email')
    AND course_enrollments.role = 'docente'
  )
);

-- POLICY: Teachers can update classes (Editar clases de sus cursos)
DROP POLICY IF EXISTS "Teachers can update classes" ON public.classes;
CREATE POLICY "Teachers can update classes" ON public.classes
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.course_enrollments
    WHERE course_enrollments.course_id = classes.course_id
    AND course_enrollments.email = (select auth.jwt() ->> 'email')
    AND course_enrollments.role = 'docente'
  )
);

-- POLICY: Teachers can delete classes (Eliminar clases de sus cursos)
DROP POLICY IF EXISTS "Teachers can delete classes" ON public.classes;
CREATE POLICY "Teachers can delete classes" ON public.classes
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.course_enrollments
    WHERE course_enrollments.course_id = classes.course_id
    AND course_enrollments.email = (select auth.jwt() ->> 'email')
    AND course_enrollments.role = 'docente'
  )
);

-- POLICY: Students can view classes (Alumnos pueden ver las clases)
DROP POLICY IF EXISTS "Students can view classes" ON public.classes;
CREATE POLICY "Students can view classes" ON public.classes
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.course_enrollments
    WHERE course_enrollments.course_id = classes.course_id
    AND course_enrollments.email = (select auth.jwt() ->> 'email')
    AND course_enrollments.role = 'alumno'
  )
);

-- POLICY: Institution Admins can view classes
DROP POLICY IF EXISTS "Institution Admins can view classes" ON public.classes;
CREATE POLICY "Institution Admins can view classes" ON public.classes
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.courses
    JOIN public.institution_roles ON courses.institution_id = institution_roles.institution_id
    WHERE courses.id = classes.course_id
    AND institution_roles.email = (select auth.jwt() ->> 'email')
    AND institution_roles.role = 'admin-institucion'
  )
);
```
