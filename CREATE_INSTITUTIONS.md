# Crear Tabla Instituciones

Ejecuta este script en el **SQL Editor** de Supabase para crear la tabla de instituciones y configurar los permisos necesarios para los administradores.

```sql
-- 1. Crear la tabla instituciones
CREATE TABLE public.instituciones (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- 2. Habilitar Row Level Security (RLS)
ALTER TABLE public.instituciones ENABLE ROW LEVEL SECURITY;

-- 3. Crear Políticas de Seguridad (RLS)

-- Política de LECTURA: Permitir a 'admin-plataforma' ver todas las instituciones
CREATE POLICY "Admins can view institutions" ON public.instituciones
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND 'admin-plataforma' = ANY(profiles.roles)
  )
);

-- Política de INSERCIÓN: Permitir a 'admin-plataforma' crear instituciones
CREATE POLICY "Admins can insert institutions" ON public.instituciones
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND 'admin-plataforma' = ANY(profiles.roles)
  )
);

-- Política de ACTUALIZACIÓN: Permitir a 'admin-plataforma' editar instituciones
CREATE POLICY "Admins can update institutions" ON public.instituciones
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND 'admin-plataforma' = ANY(profiles.roles)
  )
);

-- Política de ELIMINACIÓN: Permitir a 'admin-plataforma' borrar instituciones
CREATE POLICY "Admins can delete institutions" ON public.instituciones
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND 'admin-plataforma' = ANY(profiles.roles)
  )
);
```
