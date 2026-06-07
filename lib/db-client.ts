import { AppUser, Section, ProductionSession, CageRecord } from './types';

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(path, options);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

export const db = {
  users: {
    list: (): Promise<AppUser[]> => apiFetch('/api/data/users'),
  },
  sections: {
    list: (activeOnly = false): Promise<Section[]> =>
      apiFetch(`/api/data/sections${activeOnly ? '?active=true' : ''}`),
    get: (id: string): Promise<Section> => apiFetch(`/api/data/sections/${id}`),
    create: (data: Omit<Section, 'id'>): Promise<Section> =>
      apiFetch('/api/data/sections', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Section>): Promise<void> =>
      apiFetch(`/api/data/sections/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
  },
  sessions: {
    list: (params: {
      supervisor_id?: string;
      section_id?: string;
      filling_type?: string;
      is_submitted?: boolean;
    }): Promise<ProductionSession[]> => {
      const qs = new URLSearchParams();
      if (params.supervisor_id) qs.set('supervisor_id', params.supervisor_id);
      if (params.section_id) qs.set('section_id', params.section_id);
      if (params.filling_type) qs.set('filling_type', params.filling_type);
      if (params.is_submitted !== undefined) qs.set('is_submitted', String(params.is_submitted));
      return apiFetch(`/api/data/sessions?${qs}`);
    },
    create: (data: Omit<ProductionSession, 'id' | 'created_at'>): Promise<ProductionSession> =>
      apiFetch('/api/data/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
    update: (id: string, data: Partial<ProductionSession>): Promise<void> =>
      apiFetch(`/api/data/sessions/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
  },
  cageRecords: {
    list: (params: {
      session_id?: string;
      date_from?: string;
      date_to?: string;
      filling_type?: string;
      section_id?: string;
      employee_name?: string;
      contractor_name?: string;
      cage_number?: string;
    }): Promise<CageRecord[]> => {
      const qs = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => { if (v) qs.set(k, v); });
      return apiFetch(`/api/data/cage-records?${qs}`);
    },
    create: (data: Omit<CageRecord, 'id'>): Promise<CageRecord> =>
      apiFetch('/api/data/cage-records', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
    update: (id: string, data: Partial<CageRecord>): Promise<void> =>
      apiFetch(`/api/data/cage-records/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
  },
};
