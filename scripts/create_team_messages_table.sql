-- Fix RLS policy for teams table (was using 'student', should be 'estudiante')
DROP POLICY IF EXISTS "Students can view teams" ON teams;
CREATE POLICY "Students can view teams" ON teams
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM course_enrollments ce
            WHERE ce.course_id = teams.course_id
            AND ce.email = (auth.jwt() ->> 'email')
            AND ce.role IN ('estudiante', 'alumno')
        )
    );

-- Create team_messages table
CREATE TABLE IF NOT EXISTS team_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
    user_email TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE team_messages ENABLE ROW LEVEL SECURITY;

-- Policy for reading messages
-- Docentes del curso o estudiantes del equipo pueden leer
DROP POLICY IF EXISTS "Team members and teachers can view messages" ON team_messages;
CREATE POLICY "Team members and teachers can view messages" ON team_messages
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 
            FROM teams t
            JOIN course_enrollments ce ON t.course_id = ce.course_id
            WHERE t.id = team_messages.team_id
            AND ce.email = (auth.jwt() ->> 'email')
            AND (
                ce.role = 'docente' 
                OR 
                (ce.role IN ('estudiante', 'alumno') AND ce.team_id = team_messages.team_id)
            )
        )
    );

-- Policy for inserting messages
-- Igual que lectura: Docentes del curso o miembros del equipo
DROP POLICY IF EXISTS "Team members and teachers can insert messages" ON team_messages;
CREATE POLICY "Team members and teachers can insert messages" ON team_messages
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 
            FROM teams t
            JOIN course_enrollments ce ON t.course_id = ce.course_id
            WHERE t.id = team_messages.team_id
            AND ce.email = (auth.jwt() ->> 'email')
            AND (
                ce.role = 'docente' 
                OR 
                (ce.role IN ('estudiante', 'alumno') AND ce.team_id = team_messages.team_id)
            )
        )
    );

-- Grant access to authenticated users
GRANT ALL ON team_messages TO authenticated;

-- Enable Realtime
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'team_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE team_messages;
  END IF;
END $$;
