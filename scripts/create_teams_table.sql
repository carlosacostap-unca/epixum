-- Add configuration flag to courses table
ALTER TABLE courses 
ADD COLUMN IF NOT EXISTS has_teams BOOLEAN DEFAULT FALSE;

-- Create teams table
CREATE TABLE IF NOT EXISTS teams (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add team_id to course_enrollments to link students to teams
ALTER TABLE course_enrollments 
ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE SET NULL;

-- Enable RLS on teams
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- Policies for teams

-- Institution Admins can do everything
CREATE POLICY "Institution Admins can manage teams" ON teams
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM courses c
            JOIN institution_roles ir ON ir.institution_id = c.institution_id
            WHERE c.id = teams.course_id
            AND ir.email = (auth.jwt() ->> 'email')
            AND ir.role = 'admin'
        )
    );

-- Teachers can manage teams for their courses
CREATE POLICY "Teachers can manage teams" ON teams
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM course_enrollments ce
            WHERE ce.course_id = teams.course_id
            AND ce.email = (auth.jwt() ->> 'email')
            AND ce.role = 'docente'
        )
    );

-- Students can view teams in their courses
CREATE POLICY "Students can view teams" ON teams
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM course_enrollments ce
            WHERE ce.course_id = teams.course_id
            AND ce.email = (auth.jwt() ->> 'email')
            AND ce.role = 'student'
        )
    );
