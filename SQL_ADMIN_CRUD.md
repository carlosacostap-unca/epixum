# Configuración de Permisos para CRUD de Usuarios

Para que el panel de administración funcione y puedas agregar/eliminar usuarios desde la interfaz, necesitas ejecutar este script SQL en Supabase.

Esto le dará permiso a los usuarios con rol `admin-plataforma` para modificar la tabla `whitelist`.

## Script SQL

Ejecuta esto en el **SQL Editor** de Supabase:

```sql
-- 1. Habilitar políticas para INSERT, UPDATE, DELETE en whitelist para admins

-- Política para Insertar
create policy "Admins can insert whitelist" on public.whitelist
for insert
with check (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
    and profiles.role = 'admin-plataforma'
  )
);

-- Política para Actualizar
create policy "Admins can update whitelist" on public.whitelist
for update
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
    and profiles.role = 'admin-plataforma'
  )
);

-- Política para Eliminar
create policy "Admins can delete whitelist" on public.whitelist
for delete
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
    and profiles.role = 'admin-plataforma'
  )
);
```

## Verificación

1. Asegúrate de que tu usuario actual tenga el rol `admin-plataforma` en la tabla `profiles`.
2. Recarga la página del dashboard.
3. Intenta agregar un nuevo correo a la lista.
