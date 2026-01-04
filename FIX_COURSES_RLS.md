# Corregir Permisos de Creación de Cursos

El error `permission denied for table users` ocurre porque las políticas de seguridad intentaban leer la tabla interna de usuarios (`auth.users`), lo cual está restringido por seguridad en versiones recientes de Supabase.

Este script actualiza las políticas para usar el email directamente del token de sesión (JWT), que es más seguro y rápido.

Ejecuta este script en el **SQL Editor** de Supabase:

```sql
-- 1. Políticas de Seguridad para Courses (Corregidas)

DROP POLICY IF EXISTS "Institution Admins can view own courses" ON public.courses;
CREATE POLICY "Institution Admins can view own courses" ON public.courses
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.institution_roles
    WHERE institution_roles.institution_id = courses.institution_id
    AND institution_roles.email = (select auth.jwt() ->> 'email')
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
    AND institution_roles.email = (select auth.jwt() ->> 'email')
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
    AND institution_roles.email = (select auth.jwt() ->> 'email')
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
    AND institution_roles.email = (select auth.jwt() ->> 'email')
    AND institution_roles.role = 'admin-institucion'
  )
);

-- 2. Políticas de Seguridad para Course Enrollments (Corregidas)

DROP POLICY IF EXISTS "Institution Admins can view enrollments" ON public.course_enrollments;
CREATE POLICY "Institution Admins can view enrollments" ON public.course_enrollments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.courses
    JOIN public.institution_roles ON courses.institution_id = institution_roles.institution_id
    WHERE courses.id = course_enrollments.course_id
    AND institution_roles.email = (select auth.jwt() ->> 'email')
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
    AND institution_roles.email = (select auth.jwt() ->> 'email')
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
    AND institution_roles.email = (select auth.jwt() ->> 'email')
    AND institution_roles.role = 'admin-institucion'
  )
);
```
