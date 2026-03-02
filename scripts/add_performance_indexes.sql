-- Create indexes to optimize RLS policies and joins

-- 1. Indexes for course_enrollments (Heavily used in RLS)
CREATE INDEX IF NOT EXISTS idx_course_enrollments_course_id ON course_enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_email ON course_enrollments(email);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_team_id ON course_enrollments(team_id);
-- For case-insensitive search (ILIKE) in RLS
CREATE INDEX IF NOT EXISTS idx_course_enrollments_email_lower ON course_enrollments(lower(email));

-- 2. Indexes for teams
CREATE INDEX IF NOT EXISTS idx_teams_course_id ON teams(course_id);

-- 3. Indexes for team_messages
CREATE INDEX IF NOT EXISTS idx_team_messages_team_id ON team_messages(team_id);

-- 4. Indexes for other foreign keys often used
CREATE INDEX IF NOT EXISTS idx_classes_course_id ON classes(course_id);
CREATE INDEX IF NOT EXISTS idx_assignments_course_id ON assignments(course_id);
CREATE INDEX IF NOT EXISTS idx_sprints_course_id ON sprints(course_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_assignment_id ON assignment_submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_student_email ON assignment_submissions(student_email);
