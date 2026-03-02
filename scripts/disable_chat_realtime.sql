-- 1. Desactivar la publicación de Realtime para la tabla team_messages
-- Esto evita que Supabase gaste CPU vigilando cambios en esta tabla
ALTER PUBLICATION supabase_realtime DROP TABLE team_messages;

-- 2. Asegurarse de que el índice de team_id exista (vital para el Polling)
CREATE INDEX IF NOT EXISTS idx_team_messages_team_id ON team_messages(team_id);

-- 3. (Por si no corriste el script anterior) Asegurar que exista course_id
-- El nuevo código de backend LO REQUIERE para guardar mensajes
ALTER TABLE team_messages 
ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES courses(id) ON DELETE CASCADE;
