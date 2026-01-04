# Asignar Rol de Admin

Ejecuta este script en el **SQL Editor** de Supabase para darle permisos de administrador al usuario `carlosacostap@gmail.com`.

Este script hace dos cosas:
1. Asegura que el usuario esté en la `whitelist` con el rol `admin-plataforma`.
2. Actualiza su perfil existente (si ya se ha logueado antes) para que el cambio sea inmediato.

```sql
-- 1. Actualizar o Insertar en Whitelist
INSERT INTO public.whitelist (email, roles)
VALUES ('carlosacostap@gmail.com', ARRAY['admin-plataforma', 'estudiante'])
ON CONFLICT (email)
DO UPDATE SET 
  roles = array_append(whitelist.roles, 'admin-plataforma')
WHERE NOT ('admin-plataforma' = ANY(whitelist.roles));

-- 2. Actualizar Perfil (si ya existe el usuario)
UPDATE public.profiles
SET roles = array_append(roles, 'admin-plataforma')
WHERE email = 'carlosacostap@gmail.com'
AND NOT ('admin-plataforma' = ANY(roles));
```
