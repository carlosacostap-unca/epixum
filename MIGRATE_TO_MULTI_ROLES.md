# Migración a Múltiples Roles (Corregido)

Este script soluciona el error de dependencia de políticas (RLS) eliminando primero las políticas antiguas, migrando las columnas a arrays, y luego recreando las políticas adaptadas para verificar arrays.

Ejecuta todo este bloque en el **SQL Editor** de Supabase:

```sql
-- =================================================================
-- 1. ELIMINAR POLÍTICAS EXISTENTES (DEPENDENCIAS)
-- =================================================================
-- Es necesario eliminar las políticas que dependen de la columna "role" antes de cambiar su tipo.

DROP POLICY IF EXISTS "Admins can insert whitelist" ON public.whitelist;
DROP POLICY IF EXISTS "Admins can update whitelist" ON public.whitelist;
DROP POLICY IF EXISTS "Admins can delete whitelist" ON public.whitelist;

-- =================================================================
-- 2. MIGRAR TABLA WHITELIST
-- =================================================================

-- Eliminar valor por defecto antiguo para evitar conflictos de tipo
ALTER TABLE public.whitelist ALTER COLUMN role DROP DEFAULT;

-- Convertir la columna 'role' (texto) a 'roles' (array de texto)
-- Se usa USING para convertir el valor único existente en un array de un solo elemento.
ALTER TABLE public.whitelist
  ALTER COLUMN role TYPE text[] USING CASE WHEN role IS NULL THEN NULL ELSE ARRAY[role] END;

-- Renombrar la columna para reflejar que es plural
ALTER TABLE public.whitelist RENAME COLUMN role TO roles;

-- Establecer el nuevo valor por defecto (array con 'estudiante')
ALTER TABLE public.whitelist ALTER COLUMN roles SET DEFAULT ARRAY['estudiante'];


-- =================================================================
-- 3. MIGRAR TABLA PROFILES
-- =================================================================

-- Eliminar valor por defecto antiguo
ALTER TABLE public.profiles ALTER COLUMN role DROP DEFAULT;

-- Convertir la columna 'role' (texto) a 'roles' (array de texto)
ALTER TABLE public.profiles
  ALTER COLUMN role TYPE text[] USING CASE WHEN role IS NULL THEN NULL ELSE ARRAY[role] END;

-- Renombrar la columna
ALTER TABLE public.profiles RENAME COLUMN role TO roles;

-- Establecer el nuevo valor por defecto
ALTER TABLE public.profiles ALTER COLUMN roles SET DEFAULT ARRAY['estudiante'];


-- =================================================================
-- 4. RECREAR POLÍTICAS (ADAPTADAS A ARRAYS)
-- =================================================================
-- Ahora usamos el operador ANY() o @> para verificar si 'admin-plataforma' está en el array.

-- Política para Insertar
CREATE POLICY "Admins can insert whitelist" ON public.whitelist
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND 'admin-plataforma' = ANY(profiles.roles)
  )
);

-- Política para Actualizar
CREATE POLICY "Admins can update whitelist" ON public.whitelist
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND 'admin-plataforma' = ANY(profiles.roles)
  )
);

-- Política para Eliminar
CREATE POLICY "Admins can delete whitelist" ON public.whitelist
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND 'admin-plataforma' = ANY(profiles.roles)
  )
);
```

## Verificación

1. Después de ejecutar el script, ve a **Table Editor** en Supabase.
2. Verifica que en `whitelist` y `profiles` la columna se llame `roles` y el tipo sea `text[]` (array).
3. Verifica que los datos existentes se vean como `["admin-plataforma"]` o `["estudiante"]`.
