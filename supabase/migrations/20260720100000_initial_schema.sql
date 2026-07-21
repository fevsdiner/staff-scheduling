-- Fev's Diner Schedule — initial schema

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE RESTRICT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX employees_team_id_idx ON employees(team_id);

CREATE TABLE weekly_template_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  version_label TEXT NOT NULL,
  effective_from DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX weekly_template_versions_team_effective_idx
  ON weekly_template_versions(team_id, effective_from DESC);

CREATE TABLE weekly_template_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL REFERENCES weekly_template_versions(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  is_off BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(version_id, day_of_week, employee_id)
);

CREATE TABLE weekly_template_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_shift_id UUID NOT NULL REFERENCES weekly_template_shifts(id) ON DELETE CASCADE,
  sort_order SMALLINT NOT NULL CHECK (sort_order BETWEEN 1 AND 3),
  time_in TIME NOT NULL,
  time_out TIME NOT NULL,
  UNIQUE(template_shift_id, sort_order)
);

CREATE TABLE daily_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_date DATE NOT NULL,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  part_time_name TEXT,
  is_part_time BOOLEAN NOT NULL DEFAULT false,
  is_off BOOLEAN NOT NULL DEFAULT false,
  source TEXT NOT NULL DEFAULT 'template' CHECK (source IN ('template', 'manual')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT daily_schedules_part_time_check CHECK (
    employee_id IS NOT NULL
    AND (
      (is_part_time = true)
      OR (is_part_time = false AND part_time_name IS NULL)
    )
  )
);

CREATE UNIQUE INDEX daily_schedules_employee_unique
  ON daily_schedules(schedule_date, team_id, employee_id)
  WHERE employee_id IS NOT NULL;

CREATE INDEX daily_schedules_date_team_idx ON daily_schedules(schedule_date, team_id);

CREATE TABLE daily_schedule_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_schedule_id UUID NOT NULL REFERENCES daily_schedules(id) ON DELETE CASCADE,
  sort_order SMALLINT NOT NULL CHECK (sort_order BETWEEN 1 AND 3),
  time_in TIME NOT NULL,
  time_out TIME NOT NULL,
  UNIQUE(daily_schedule_id, sort_order)
);

-- Public read access for schedule viewing (no auth in step 1-2)
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_schedule_segments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read teams"
  ON teams FOR SELECT
  USING (true);

CREATE POLICY "Public can read active employees"
  ON employees FOR SELECT
  USING (active = true);

CREATE POLICY "Public can read daily schedules"
  ON daily_schedules FOR SELECT
  USING (true);

CREATE POLICY "Public can read daily schedule segments"
  ON daily_schedule_segments FOR SELECT
  USING (true);
