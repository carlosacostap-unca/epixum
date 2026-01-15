# Crear Tabla de Estudiantes en Borrador

Ejecuta este script en el **SQL Editor** de Supabase para crear la tabla de estudiantes en borrador.

```sql
-- 1. Crear tabla draft_students
CREATE TABLE IF NOT EXISTS public.draft_students (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  last_name text,
  first_name text,
  dni text,
  birth_date date,
  phone text,
  email text,
  processed_text text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- 2. Habilitar RLS
ALTER TABLE public.draft_students ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de Seguridad (RLS)

-- POLICY: Institution Admins can manage draft students
DROP POLICY IF EXISTS "Institution Admins can manage draft students" ON public.draft_students;
CREATE POLICY "Institution Admins can manage draft students" ON public.draft_students
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.courses
    JOIN public.institution_roles ON courses.institution_id = institution_roles.institution_id
    WHERE courses.id = draft_students.course_id
    AND institution_roles.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    AND institution_roles.role = 'admin-institucion'
  )
);
```
