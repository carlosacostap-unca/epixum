-- 1. Asegurar que la función handle_new_user sea segura y no sobrescriba datos
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  -- Si el perfil ya existe, NO hacer nada. Esto protege los datos existentes ante cualquier ejecución accidental.
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = new.id) THEN
    RETURN new;
  END IF;

  -- Si no existe, crear uno nuevo con rol estudiante por defecto
  INSERT INTO public.profiles (id, email, roles)
  VALUES (new.id, new.email, ARRAY['estudiante']);
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Asegurar que el trigger solo se ejecute en INSERT (creación de usuario), no en UPDATE (login)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 3. Eliminar cualquier otro trigger sospechoso que pudiera estar ejecutándose en UPDATE
-- (A veces se crean triggers duplicados con otros nombres)
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;

-- 4. Re-verificar permisos (por si acaso)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.profiles TO authenticated;
GRANT ALL ON TABLE public.profiles TO service_role;
