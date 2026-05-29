import { describe, it, expect } from 'vitest';
import { Guest } from '@domains/auth/models/Guest';
import { Developer } from '@domains/auth/models/Developer';
import { Researcher } from '@domains/auth/models/Researcher';
import { Organization } from '@domains/auth/models/Organization';
import { Admin } from '@domains/auth/models/Admin';
import type { UserCredentials } from '@domains/auth/models/User';

const creds: UserCredentials = { passwordHash: 'h', passwordSalt: 's', iterations: 1 };
const date = new Date('2026-01-01');

describe('User hierarchy — canAccess', () => {
  it('Guest can only access the calculator', () => {
    const g = new Guest();
    expect(g.canAccess('calculator')).toBe(true);
    expect(g.canAccess('history')).toBe(false);
    expect(g.canAccess('admin')).toBe(false);
    expect(g.isAuthenticated()).toBe(false);
  });

  it('Developer can access history/compare/reports, but not dashboard or admin', () => {
    const d = new Developer('1', 'a@b.bg', 'Alex', date, creds);
    expect(d.canAccess('history')).toBe(true);
    expect(d.canAccess('reports')).toBe(true);
    expect(d.canAccess('dashboard')).toBe(false);
    expect(d.canAccess('admin')).toBe(false);
    expect(d.isAuthenticated()).toBe(true);
  });

  it('Researcher inherits from Developer and adds dashboard', () => {
    const r = new Researcher('2', 'r@b.bg', 'Raya', date, creds, 'FMI SU');
    expect(r).toBeInstanceOf(Developer);
    expect(r.canAccess('history')).toBe(true);
    expect(r.canAccess('dashboard')).toBe(true);
    expect(r.canAccess('admin')).toBe(false);
  });

  it('Organization can access dashboard and reports', () => {
    const o = new Organization('3', 'o@b.bg', 'Org', date, creds, 'ACME');
    expect(o.canAccess('dashboard')).toBe(true);
    expect(o.canAccess('reports')).toBe(true);
    expect(o.canAccess('admin')).toBe(false);
  });

  it('Admin can access everything', () => {
    const a = new Admin('4', 'admin@b.bg', 'Admin', date, creds);
    expect(a.canAccess('admin')).toBe(true);
    expect(a.canAccess('admin.users')).toBe(true);
    expect(a.canAccess('admin.hardware')).toBe(true);
    expect(a.canAccess('dashboard')).toBe(true);
    expect(a.isAdmin()).toBe(true);
  });
});
