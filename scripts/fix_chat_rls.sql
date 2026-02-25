-- Fix RLS policies for teams and team_messages to support case-insensitive email matching for teachers

-- 1. Fix policies for teams table
DROP POLICY IF EXISTS "Teachers can manage teams" ON teams;
CREATE POLICY "Teachers can manage teams" ON teams
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM course_enrollments ce
            WHERE ce.course_id = teams.course_id
            AND ce.email ILIKE (auth.jwt() ->> 'email')
            AND ce.role IN ('docente', 'nodocente', 'admin-institucion')
        )
    );

-- 2. Fix policies for team_messages table
DROP POLICY IF EXISTS "Team members and teachers can view messages" ON team_messages;
CREATE POLICY "Team members and teachers can view messages" ON team_messages
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 
            FROM teams t
            JOIN course_enrollments ce ON t.course_id = ce.course_id
            WHERE t.id = team_messages.team_id
            AND ce.email ILIKE (auth.jwt() ->> 'email')
            AND (
                -- Allow if user is teacher/admin
                ce.role IN ('docente', 'nodocente', 'admin-institucion')
                OR 
                -- Allow if user is student AND belongs to this team
                (ce.role IN ('estudiante', 'alumno') AND ce.team_id = team_messages.team_id)
            )
        )
    );

DROP POLICY IF EXISTS "Team members and teachers can insert messages" ON team_messages;
CREATE POLICY "Team members and teachers can insert messages" ON team_messages
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 
            FROM teams t
            JOIN course_enrollments ce ON t.course_id = ce.course_id
            WHERE t.id = team_messages.team_id
            AND ce.email ILIKE (auth.jwt() ->> 'email')
            AND (
                -- Allow if user is teacher/admin
                ce.role IN ('docente', 'nodocente', 'admin-institucion')
                OR 
                -- Allow if user is student AND belongs to this team
                (ce.role IN ('estudiante', 'alumno') AND ce.team_id = team_messages.team_id)
            )
        )
    );
