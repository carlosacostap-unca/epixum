# Solución: Actualizar Políticas de Seguridad (RLS)

El problema es que las políticas de seguridad actuales (Row Level Security) solo permiten ver las instituciones a los usuarios con rol `admin-plataforma`. El usuario `admin-institucion` no tiene permiso para "ver" sus propias asignaciones en la base de datos.

Ejecuta este script en el **SQL Editor** de Supabase para habilitar el acceso:

```sql
-- 1. Permitir que los usuarios vean sus propios roles en 'institution_roles'
CREATE POLICY "Users can view own institution roles" ON public.institution_roles
FOR SELECT
USING (
  email = (select auth.jwt() ->> 'email')
);

-- 2. Permitir que los usuarios vean las instituciones a las que están asignados
-- (Asumiendo que la tabla 'instituciones' tiene RLS habilitado)
CREATE POLICY "Users can view assigned institutions" ON public.instituciones
FOR SELECT
USING (
  id IN (
    SELECT institution_id FROM public.institution_roles
    WHERE email = (select auth.jwt() ->> 'email')
  )
);
```

## Nota Importante
Si la tabla `instituciones` **NO** tiene RLS habilitado, la segunda política dará un error o advertencia, pero es seguro intentarlo. Si ya tienes políticas, esto agregará una nueva regla permisiva.
