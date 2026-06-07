
/*
# Coconut Factory Management System - Full Schema

## Overview
Complete database schema for a professional coconut factory production management system.
Supports multi-user authentication with Admin and Supervisor roles, cage-based production tracking,
full filling and additional filling workflows, contractor/employee management, and long-term data retention.

## Tables Created

### 1. `app_users`
Custom user profile table extending Supabase auth.
- `id` (uuid, PK, references auth.users)
- `username` (text, unique)
- `full_name` (text)
- `role` (text: 'admin' | 'supervisor')
- `is_active` (boolean)
- `created_at`, `updated_at` (timestamps)

### 2. `sections`
Factory production sections (e.g., Section 1, Section 2 under CNO).
- `id` (uuid, PK)
- `name` (text)
- `section_type` (text: 'CNO' | 'VCO')
- `cage_count` (int, default 15)
- `buttons_per_cage` (int, default 24)
- `is_active` (boolean)
- `display_order` (int)

### 3. `production_sessions`
A session represents one supervisor's work period (Full Filling or Additional Filling for a section on a date).
- `id` (uuid, PK)
- `supervisor_id` (uuid, FK to app_users)
- `section_id` (uuid, FK to sections)
- `filling_type` (text: 'full' | 'additional')
- `shift` (text: 'day' | 'night')
- `production_date` (date)
- `is_submitted` (boolean)
- `submitted_at` (timestamp)

### 4. `cage_records`
Individual cage data within a session.
- `id` (uuid, PK)
- `session_id` (uuid, FK to production_sessions)
- `cage_number` (int)
- `employee_name` (text)
- `contractor_name` (text)
- `raw_weight` (numeric)
- `coconut_type` (text: 'Red' | 'Black' | 'Small')
- `final_weight` (numeric, auto-calculated)
- `coconut_count` (int)
- `buttons_completed` (int, tracks how many of 24 buttons done)
- `is_completed` (boolean)
- `production_date` (date, denormalized for fast queries)
- `section_id` (uuid, denormalized for fast queries)
- `filling_type` (text, denormalized)
- `shift` (text, denormalized)
- `supervisor_id` (uuid, denormalized)

## Security
- RLS enabled on all tables
- Admins can read/write everything
- Supervisors can read their own data and write cage records
- Service role used for admin operations via server-side calls
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- App users table
CREATE TABLE IF NOT EXISTS app_users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  full_name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'supervisor' CHECK (role IN ('admin', 'supervisor')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "app_users_select" ON app_users;
CREATE POLICY "app_users_select" ON app_users FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "app_users_insert" ON app_users;
CREATE POLICY "app_users_insert" ON app_users FOR INSERT
TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM app_users au WHERE au.id = auth.uid() AND au.role = 'admin')
  OR auth.uid() = id
);

DROP POLICY IF EXISTS "app_users_update" ON app_users;
CREATE POLICY "app_users_update" ON app_users FOR UPDATE
TO authenticated
USING (
  auth.uid() = id
  OR EXISTS (SELECT 1 FROM app_users au WHERE au.id = auth.uid() AND au.role = 'admin')
)
WITH CHECK (
  auth.uid() = id
  OR EXISTS (SELECT 1 FROM app_users au WHERE au.id = auth.uid() AND au.role = 'admin')
);

DROP POLICY IF EXISTS "app_users_delete" ON app_users;
CREATE POLICY "app_users_delete" ON app_users FOR DELETE
TO authenticated
USING (EXISTS (SELECT 1 FROM app_users au WHERE au.id = auth.uid() AND au.role = 'admin'));

-- Sections table
CREATE TABLE IF NOT EXISTS sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  section_type text NOT NULL DEFAULT 'CNO' CHECK (section_type IN ('CNO', 'VCO')),
  cage_count int NOT NULL DEFAULT 15,
  buttons_per_cage int NOT NULL DEFAULT 24,
  is_active boolean NOT NULL DEFAULT true,
  display_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE sections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sections_select" ON sections;
CREATE POLICY "sections_select" ON sections FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "sections_insert" ON sections;
CREATE POLICY "sections_insert" ON sections FOR INSERT
TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM app_users au WHERE au.id = auth.uid() AND au.role = 'admin')
);

DROP POLICY IF EXISTS "sections_update" ON sections;
CREATE POLICY "sections_update" ON sections FOR UPDATE
TO authenticated
USING (EXISTS (SELECT 1 FROM app_users au WHERE au.id = auth.uid() AND au.role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM app_users au WHERE au.id = auth.uid() AND au.role = 'admin'));

DROP POLICY IF EXISTS "sections_delete" ON sections;
CREATE POLICY "sections_delete" ON sections FOR DELETE
TO authenticated
USING (EXISTS (SELECT 1 FROM app_users au WHERE au.id = auth.uid() AND au.role = 'admin'));

-- Production sessions table
CREATE TABLE IF NOT EXISTS production_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supervisor_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  section_id uuid NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  filling_type text NOT NULL CHECK (filling_type IN ('full', 'additional')),
  shift text NOT NULL DEFAULT 'day' CHECK (shift IN ('day', 'night')),
  production_date date NOT NULL,
  is_submitted boolean NOT NULL DEFAULT false,
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sessions_supervisor ON production_sessions(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_sessions_date ON production_sessions(production_date);
CREATE INDEX IF NOT EXISTS idx_sessions_section ON production_sessions(section_id);

ALTER TABLE production_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sessions_select" ON production_sessions;
CREATE POLICY "sessions_select" ON production_sessions FOR SELECT
TO authenticated USING (
  supervisor_id = auth.uid()
  OR EXISTS (SELECT 1 FROM app_users au WHERE au.id = auth.uid() AND au.role = 'admin')
);

DROP POLICY IF EXISTS "sessions_insert" ON production_sessions;
CREATE POLICY "sessions_insert" ON production_sessions FOR INSERT
TO authenticated WITH CHECK (
  supervisor_id = auth.uid()
  OR EXISTS (SELECT 1 FROM app_users au WHERE au.id = auth.uid() AND au.role = 'admin')
);

DROP POLICY IF EXISTS "sessions_update" ON production_sessions;
CREATE POLICY "sessions_update" ON production_sessions FOR UPDATE
TO authenticated
USING (
  supervisor_id = auth.uid()
  OR EXISTS (SELECT 1 FROM app_users au WHERE au.id = auth.uid() AND au.role = 'admin')
)
WITH CHECK (
  supervisor_id = auth.uid()
  OR EXISTS (SELECT 1 FROM app_users au WHERE au.id = auth.uid() AND au.role = 'admin')
);

DROP POLICY IF EXISTS "sessions_delete" ON production_sessions;
CREATE POLICY "sessions_delete" ON production_sessions FOR DELETE
TO authenticated
USING (EXISTS (SELECT 1 FROM app_users au WHERE au.id = auth.uid() AND au.role = 'admin'));

-- Cage records table
CREATE TABLE IF NOT EXISTS cage_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES production_sessions(id) ON DELETE CASCADE,
  cage_number int NOT NULL,
  employee_name text NOT NULL DEFAULT '',
  contractor_name text NOT NULL DEFAULT '',
  raw_weight numeric(10,2),
  coconut_type text CHECK (coconut_type IN ('Red', 'Black', 'Small')),
  final_weight numeric(10,2),
  coconut_count int NOT NULL DEFAULT 0,
  buttons_completed int NOT NULL DEFAULT 0,
  is_completed boolean NOT NULL DEFAULT false,
  production_date date NOT NULL,
  section_id uuid NOT NULL REFERENCES sections(id),
  filling_type text NOT NULL CHECK (filling_type IN ('full', 'additional')),
  shift text NOT NULL DEFAULT 'day',
  supervisor_id uuid NOT NULL REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(session_id, cage_number)
);

CREATE INDEX IF NOT EXISTS idx_cage_records_date ON cage_records(production_date);
CREATE INDEX IF NOT EXISTS idx_cage_records_session ON cage_records(session_id);
CREATE INDEX IF NOT EXISTS idx_cage_records_section ON cage_records(section_id);
CREATE INDEX IF NOT EXISTS idx_cage_records_supervisor ON cage_records(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_cage_records_cage_number ON cage_records(cage_number);
CREATE INDEX IF NOT EXISTS idx_cage_records_employee ON cage_records(employee_name);
CREATE INDEX IF NOT EXISTS idx_cage_records_contractor ON cage_records(contractor_name);

ALTER TABLE cage_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cage_records_select" ON cage_records;
CREATE POLICY "cage_records_select" ON cage_records FOR SELECT
TO authenticated USING (
  supervisor_id = auth.uid()
  OR EXISTS (SELECT 1 FROM app_users au WHERE au.id = auth.uid() AND au.role = 'admin')
);

DROP POLICY IF EXISTS "cage_records_insert" ON cage_records;
CREATE POLICY "cage_records_insert" ON cage_records FOR INSERT
TO authenticated WITH CHECK (
  supervisor_id = auth.uid()
  OR EXISTS (SELECT 1 FROM app_users au WHERE au.id = auth.uid() AND au.role = 'admin')
);

DROP POLICY IF EXISTS "cage_records_update" ON cage_records;
CREATE POLICY "cage_records_update" ON cage_records FOR UPDATE
TO authenticated
USING (
  supervisor_id = auth.uid()
  OR EXISTS (SELECT 1 FROM app_users au WHERE au.id = auth.uid() AND au.role = 'admin')
)
WITH CHECK (
  supervisor_id = auth.uid()
  OR EXISTS (SELECT 1 FROM app_users au WHERE au.id = auth.uid() AND au.role = 'admin')
);

DROP POLICY IF EXISTS "cage_records_delete" ON cage_records;
CREATE POLICY "cage_records_delete" ON cage_records FOR DELETE
TO authenticated
USING (EXISTS (SELECT 1 FROM app_users au WHERE au.id = auth.uid() AND au.role = 'admin'));

-- Seed default sections
INSERT INTO sections (name, section_type, cage_count, buttons_per_cage, is_active, display_order)
VALUES
  ('Section 1', 'CNO', 15, 24, true, 1),
  ('Section 2', 'CNO', 15, 24, true, 2)
ON CONFLICT DO NOTHING;
