export type UserRole = 'admin' | 'supervisor';

export interface AppUser {
  id: string;
  username: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface Section {
  id: string;
  name: string;
  section_type: 'CNO' | 'VCO';
  cage_count: number;
  buttons_per_cage: number;
  is_active: boolean;
  display_order: number;
}

export interface ProductionSession {
  id: string;
  supervisor_id: string;
  section_id: string;
  filling_type: 'full' | 'additional';
  shift: 'day' | 'night';
  production_date: string;
  is_submitted: boolean;
  submitted_at?: string;
  created_at: string;
}

export interface CageRecord {
  id: string;
  session_id: string;
  cage_number: number;
  employee_name: string;
  contractor_name: string;
  raw_weight?: number;
  coconut_type?: 'Red' | 'Black' | 'Small';
  final_weight?: number;
  coconut_count: number;
  buttons_completed: number;
  is_completed: boolean;
  production_date: string;
  section_id: string;
  filling_type: 'full' | 'additional';
  shift: string;
  supervisor_id: string;
}
