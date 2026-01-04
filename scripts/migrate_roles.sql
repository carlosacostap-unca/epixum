-- =================================================================
-- MIGRACIÓN DE ROLES: 'alumno' -> 'estudiante'
-- =================================================================
-- Ejecuta este script en el SQL Editor de Supabase.

BEGIN;

-- 1. Actualizar course_enrollments (Tabla con restricción CHECK)
-- Primero eliminamos la restricción para poder modificar los datos
ALTER TABLE public.course_enrollments DROP CONSTRAINT IF EXISTS course_enrollments_role_check;

-- Actualizamos los registros
UPDATE public.course_enrollments 
SET role = 'estudiante' 
WHERE role = 'alumno';

-- Volvemos a agregar la restricción con el nuevo valor permitido
ALTER TABLE public.course_enrollments 
ADD CONSTRAINT course_enrollments_role_check 
CHECK (role IN ('admin-plataforma', 'admin-institucion', 'docente', 'nodocente', 'estudiante'));


-- 2. Actualizar whitelist (Tabla con columna roles tipo text[])
-- Reemplazamos 'alumno' por 'estudiante' en el array de roles
UPDATE public.whitelist
SET roles = array_replace(roles, 'alumno', 'estudiante')
WHERE 'alumno' = ANY(roles);


-- 3. Actualizar profiles (Tabla con columna roles tipo text[])
-- Reemplazamos 'alumno' por 'estudiante' en el array de roles
UPDATE public.profiles
SET roles = array_replace(roles, 'alumno', 'estudiante')
WHERE 'alumno' = ANY(roles);


-- =================================================================
-- 4. ACTUALIZAR POLÍTICAS RLS (Seguridad)
-- =================================================================
-- Las políticas existentes buscan 'alumno', por lo que dejarían de funcionar.
-- Debemos recrearlas buscando 'estudiante'.

-- 4.0 Tabla course_enrollments (Permitir a estudiantes ver sus inscripciones)
DROP POLICY IF EXISTS "Students can view own enrollments" ON public.course_enrollments;
CREATE POLICY "Students can view own enrollments" ON public.course_enrollments
FOR SELECT
USING (
  email = (select auth.jwt() ->> 'email')
  AND role = 'estudiante'
);

-- 4.1 Tabla classes
DROP POLICY IF EXISTS "Students can view classes" ON public.classes;
CREATE POLICY "Students can view classes" ON public.classes
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.course_enrollments
    WHERE course_enrollments.course_id = classes.course_id
    AND course_enrollments.email = (select auth.jwt() ->> 'email')
    AND course_enrollments.role = 'estudiante'
  )
);

-- 4.2 Tabla class_resources
DROP POLICY IF EXISTS "Students can view resources" ON public.class_resources;
CREATE POLICY "Students can view resources" ON public.class_resources
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.classes
    JOIN public.course_enrollments ON classes.course_id = course_enrollments.course_id
    WHERE classes.id = class_resources.class_id
    AND course_enrollments.email = (select auth.jwt() ->> 'email')
    AND course_enrollments.role = 'estudiante'
  )
);

-- 4.3 Tabla assignments
DROP POLICY IF EXISTS "Students can view assignments" ON public.assignments;
CREATE POLICY "Students can view assignments" ON public.assignments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.course_enrollments ce
    WHERE ce.course_id = assignments.course_id
    AND ce.email = (auth.jwt() ->> 'email')
    AND ce.role = 'estudiante'
  )
);

-- 4.4 Tabla assignment_submissions
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
    AND ce.role = 'estudiante'
  )
);

-- 4.5 Tabla assignment_resources
DROP POLICY IF EXISTS "Students can view assignment resources" ON public.assignment_resources;
CREATE POLICY "Students can view assignment resources" ON public.assignment_resources
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.assignments a
    JOIN public.course_enrollments ce ON a.course_id = ce.course_id
    WHERE a.id = assignment_resources.assignment_id
    AND ce.email = (auth.jwt() ->> 'email')
    AND ce.role = 'estudiante'
  )
);

-- 4.6 Storage Objects (Solo si usas storage para tareas)
-- Nota: Supabase Storage policies a veces son tricky con los nombres, verificamos el nombre usado en CREATE_ASSIGNMENTS.md
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
    AND ce.role = 'estudiante'
    AND ce.course_id::text = (storage.foldername(name))[1]
  )
);


-- =================================================================
-- 5. HABILITAR RLS (Asegurarse de que esté activo)
-- =================================================================
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_resources ENABLE ROW LEVEL SECURITY;

COMMIT;

-- Verificación
SELECT count(*) as alumnos_restantes_enrollments FROM course_enrollments WHERE role = 'alumno';
SELECT count(*) as alumnos_restantes_whitelist FROM whitelist WHERE 'alumno' = ANY(roles);
SELECT count(*) as alumnos_restantes_profiles FROM profiles WHERE 'alumno' = ANY(roles);
