-- 1. Add course_id column to team_messages
ALTER TABLE team_messages 
ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES courses(id) ON DELETE CASCADE;

-- 2. Populate course_id for existing messages
UPDATE team_messages tm
SET course_id = t.course_id
FROM teams t
WHERE tm.team_id = t.id
AND tm.course_id IS NULL;

-- 3. Make course_id NOT NULL (ensure all rows are updated first)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM team_messages WHERE course_id IS NULL) THEN
        RAISE NOTICE 'There are still messages with NULL course_id. NOT NULL constraint was NOT applied.';
    ELSE
        ALTER TABLE team_messages ALTER COLUMN course_id SET NOT NULL;
    END IF;
END $$;

-- 4. Create index for performance
CREATE INDEX IF NOT EXISTS idx_team_messages_course_id ON team_messages(course_id);

-- 5. Drop old heavy policies (that used JOINs)
DROP POLICY IF EXISTS "Team members and teachers can view messages" ON team_messages;
DROP POLICY IF EXISTS "Team members and teachers can insert messages" ON team_messages;

-- 6. Create new optimized policies (No JOINs needed with teams table)
--    Now we only check course_enrollments directly using the stored course_id

CREATE POLICY "Team members and teachers can view messages" ON team_messages
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 
            FROM course_enrollments ce 
            WHERE ce.course_id = team_messages.course_id 
            AND ce.email ILIKE (auth.jwt() ->> 'email')
            AND (
                -- Allow if user is teacher/admin in this course
                ce.role IN ('docente', 'nodocente', 'admin-institucion')
                OR 
                -- Allow if user is student AND belongs to this team
                (ce.role IN ('estudiante', 'alumno') AND ce.team_id = team_messages.team_id)
            )
        )
    );

CREATE POLICY "Team members and teachers can insert messages" ON team_messages
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 
            FROM course_enrollments ce 
            WHERE ce.course_id = team_messages.course_id 
            AND ce.email ILIKE (auth.jwt() ->> 'email')
            AND (
                -- Allow if user is teacher/admin in this course
                ce.role IN ('docente', 'nodocente', 'admin-institucion')
                OR 
                -- Allow if user is student AND belongs to this team
                (ce.role IN ('estudiante', 'alumno') AND ce.team_id = team_messages.team_id)
            )
        )
    );
