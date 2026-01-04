# Solución al Error de Login "Database error saving new user"

El error ocurre porque el **Trigger** de base de datos que crea automáticamente el perfil del usuario está intentando insertar en una columna antigua (`role`) que probablemente ya no existe o ha sido reemplazada por `roles` (array).

Para solucionar esto, ejecuta el siguiente script SQL en tu editor de Supabase:

```sql
-- 1. Actualizar la función del trigger para que sea compatible con la columna 'roles' (Array)
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, roles)
  VALUES (new.id, new.email, ARRAY['estudiante']);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Explicación Técnica
Cuando un usuario nuevo inicia sesión con Google:
1. Supabase intenta crear el usuario en `auth.users`.
2. Se dispara el trigger `on_auth_user_created`.
3. Este trigger llama a la función `handle_new_user`.
4. La versión anterior de la función intentaba hacer `INSERT INTO profiles (..., role)`.
5. Como ahora usamos `roles` (array) en lugar de `role` (texto), la operación fallaba, cancelando toda la creación del usuario.
