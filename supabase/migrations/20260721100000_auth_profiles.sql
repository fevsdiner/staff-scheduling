-- Auth profiles + supervisor team assignments

CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('manager', 'supervisor')),
  auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE supervisor_teams (
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  PRIMARY KEY (profile_id, team_id)
);

CREATE INDEX supervisor_teams_team_id_idx ON supervisor_teams(team_id);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE supervisor_teams ENABLE ROW LEVEL SECURITY;

-- Managers can read all profiles; supervisors read their own
CREATE POLICY "Authenticated users can read profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read supervisor_teams"
  ON supervisor_teams FOR SELECT
  TO authenticated
  USING (true);
