# Crear Tabla de Recursos de Clases

Ejecuta este script en el **SQL Editor** de Supabase para habilitar la gestión de recursos dentro de las clases.

```sql
-- 1. Crear tabla class_resources
CREATE TABLE IF NOT EXISTS public.class_resources (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  title text NOT NULL,
  url text NOT NULL,
  type text DEFAULT 'link', -- 'link', 'video', 'document'
  created_at timestamptz DEFAULT now() NOT NULL
);

-- 2. Habilitar RLS
ALTER TABLE public.class_resources ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de Seguridad (RLS)

-- POLICY: Teachers can select resources (Ver recursos de sus clases)
DROP POLICY IF EXISTS "Teachers can select resources" ON public.class_resources;
CREATE POLICY "Teachers can select resources" ON public.class_resources
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.classes
    JOIN public.course_enrollments ON classes.course_id = course_enrollments.course_id
    WHERE classes.id = class_resources.class_id
    AND course_enrollments.email = (select auth.jwt() ->> 'email')
    AND course_enrollments.role = 'docente'
  )
);

-- POLICY: Teachers can insert resources (Crear recursos en sus clases)
DROP POLICY IF EXISTS "Teachers can insert resources" ON public.class_resources;
CREATE POLICY "Teachers can insert resources" ON public.class_resources
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.classes
    JOIN public.course_enrollments ON classes.course_id = course_enrollments.course_id
    WHERE classes.id = class_id
    AND course_enrollments.email = (select auth.jwt() ->> 'email')
    AND course_enrollments.role = 'docente'
  )
);

-- POLICY: Teachers can delete resources
DROP POLICY IF EXISTS "Teachers can delete resources" ON public.class_resources;
CREATE POLICY "Teachers can delete resources" ON public.class_resources
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.classes
    JOIN public.course_enrollments ON classes.course_id = course_enrollments.course_id
    WHERE classes.id = class_resources.class_id
    AND course_enrollments.email = (select auth.jwt() ->> 'email')
    AND course_enrollments.role = 'docente'
  )
);

-- POLICY: Students can view resources
DROP POLICY IF EXISTS "Students can view resources" ON public.class_resources;
CREATE POLICY "Students can view resources" ON public.class_resources
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.classes
    JOIN public.course_enrollments ON classes.course_id = course_enrollments.course_id
    WHERE classes.id = class_resources.class_id
    AND course_enrollments.email = (select auth.jwt() ->> 'email')
    AND course_enrollments.role = 'alumno'
  )
);

-- POLICY: Institution Admins can view resources
DROP POLICY IF EXISTS "Institution Admins can view resources" ON public.class_resources;
CREATE POLICY "Institution Admins can view resources" ON public.class_resources
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.classes
    JOIN public.courses ON classes.course_id = courses.id
    JOIN public.institution_roles ON courses.institution_id = institution_roles.institution_id
    WHERE classes.id = class_resources.class_id
    AND institution_roles.email = (select auth.jwt() ->> 'email')
    AND institution_roles.role = 'admin-institucion'
  )
);
```
