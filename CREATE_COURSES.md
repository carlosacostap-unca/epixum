# Crear Tablas para Cursos y Asignaciones

Ejecuta este script en el **SQL Editor** de Supabase. Este script es seguro de ejecutar múltiples veces (idempotente).

```sql
-- 1. Crear tabla courses (si no existe)
CREATE TABLE IF NOT EXISTS public.courses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  institution_id uuid NOT NULL REFERENCES public.instituciones(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- 2. Crear tabla course_enrollments (si no existe)
CREATE TABLE IF NOT EXISTS public.course_enrollments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('nodocente', 'docente', 'alumno')),
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(course_id, email, role)
);

-- 3. Habilitar RLS (seguro de ejecutar si ya está habilitado)
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;

-- 4. Políticas de Seguridad para Courses
-- Primero borramos las existentes para evitar errores de "policy already exists"

DROP POLICY IF EXISTS "Institution Admins can view own courses" ON public.courses;
CREATE POLICY "Institution Admins can view own courses" ON public.courses
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.institution_roles
    WHERE institution_roles.institution_id = courses.institution_id
    AND institution_roles.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    AND institution_roles.role = 'admin-institucion'
  )
);

DROP POLICY IF EXISTS "Institution Admins can insert own courses" ON public.courses;
CREATE POLICY "Institution Admins can insert own courses" ON public.courses
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.institution_roles
    WHERE institution_roles.institution_id = institution_id
    AND institution_roles.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    AND institution_roles.role = 'admin-institucion'
  )
);

DROP POLICY IF EXISTS "Institution Admins can update own courses" ON public.courses;
CREATE POLICY "Institution Admins can update own courses" ON public.courses
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.institution_roles
    WHERE institution_roles.institution_id = courses.institution_id
    AND institution_roles.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    AND institution_roles.role = 'admin-institucion'
  )
);

DROP POLICY IF EXISTS "Institution Admins can delete own courses" ON public.courses;
CREATE POLICY "Institution Admins can delete own courses" ON public.courses
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.institution_roles
    WHERE institution_roles.institution_id = courses.institution_id
    AND institution_roles.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    AND institution_roles.role = 'admin-institucion'
  )
);

-- 5. Políticas de Seguridad para Course Enrollments

DROP POLICY IF EXISTS "Institution Admins can view enrollments" ON public.course_enrollments;
CREATE POLICY "Institution Admins can view enrollments" ON public.course_enrollments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.courses
    JOIN public.institution_roles ON courses.institution_id = institution_roles.institution_id
    WHERE courses.id = course_enrollments.course_id
    AND institution_roles.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    AND institution_roles.role = 'admin-institucion'
  )
);

DROP POLICY IF EXISTS "Institution Admins can insert enrollments" ON public.course_enrollments;
CREATE POLICY "Institution Admins can insert enrollments" ON public.course_enrollments
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.courses
    JOIN public.institution_roles ON courses.institution_id = institution_roles.institution_id
    WHERE courses.id = course_id
    AND institution_roles.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    AND institution_roles.role = 'admin-institucion'
  )
);

DROP POLICY IF EXISTS "Institution Admins can delete enrollments" ON public.course_enrollments;
CREATE POLICY "Institution Admins can delete enrollments" ON public.course_enrollments
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.courses
    JOIN public.institution_roles ON courses.institution_id = institution_roles.institution_id
    WHERE courses.id = course_enrollments.course_id
    AND institution_roles.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    AND institution_roles.role = 'admin-institucion'
  )
);

-- 6. Política para ver perfiles (Necesario para buscar nodocentes)

DROP POLICY IF EXISTS "Institution Admins can view profiles" ON public.profiles;
CREATE POLICY "Institution Admins can view profiles" ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.institution_roles
    WHERE institution_roles.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    AND institution_roles.role = 'admin-institucion'
  )
);
```
