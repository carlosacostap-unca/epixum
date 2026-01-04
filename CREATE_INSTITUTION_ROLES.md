# Crear Tabla de Roles de Institución

Ejecuta este script en el **SQL Editor** de Supabase para crear la tabla que relaciona usuarios con instituciones y sus roles específicos.

```sql
-- 1. Crear tabla institution_roles
CREATE TABLE public.institution_roles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  institution_id uuid NOT NULL REFERENCES public.instituciones(id) ON DELETE CASCADE,
  email text NOT NULL REFERENCES public.whitelist(email) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('admin-institucion', 'docente', 'estudiante')), -- Se puede expandir
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(institution_id, email, role)
);

-- 2. Habilitar RLS
ALTER TABLE public.institution_roles ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de Seguridad (Solo admin-plataforma puede gestionar esto por ahora)

-- Lectura
CREATE POLICY "Admins can view institution roles" ON public.institution_roles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND 'admin-plataforma' = ANY(profiles.roles)
  )
);

-- Inserción
CREATE POLICY "Admins can insert institution roles" ON public.institution_roles
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND 'admin-plataforma' = ANY(profiles.roles)
  )
);

-- Eliminación
CREATE POLICY "Admins can delete institution roles" ON public.institution_roles
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND 'admin-plataforma' = ANY(profiles.roles)
  )
);
```
