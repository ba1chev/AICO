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
  it('Guest има достъп само до калкулатора', () => {
    const g = new Guest();
    expect(g.canAccess('calculator')).toBe(true);
    expect(g.canAccess('history')).toBe(false);
    expect(g.canAccess('admin')).toBe(false);
    expect(g.isAuthenticated()).toBe(false);
  });

  it('Developer има достъп до history/compare/reports, но не до dashboard и admin', () => {
    const d = new Developer('1', 'a@b.bg', 'Алекс', date, creds);
    expect(d.canAccess('history')).toBe(true);
    expect(d.canAccess('reports')).toBe(true);
    expect(d.canAccess('dashboard')).toBe(false);
    expect(d.canAccess('admin')).toBe(false);
    expect(d.isAuthenticated()).toBe(true);
  });

  it('Researcher наследява Developer и добавя dashboard', () => {
    const r = new Researcher('2', 'r@b.bg', 'Рая', date, creds, 'ФМИ СУ');
    expect(r).toBeInstanceOf(Developer);
    expect(r.canAccess('history')).toBe(true);
    expect(r.canAccess('dashboard')).toBe(true);
    expect(r.canAccess('admin')).toBe(false);
  });

  it('Organization има достъп до dashboard и reports', () => {
    const o = new Organization('3', 'o@b.bg', 'Орг', date, creds, 'ACME');
    expect(o.canAccess('dashboard')).toBe(true);
    expect(o.canAccess('reports')).toBe(true);
    expect(o.canAccess('admin')).toBe(false);
  });

  it('Admin има достъп до всичко', () => {
    const a = new Admin('4', 'admin@b.bg', 'Админ', date, creds);
    expect(a.canAccess('admin')).toBe(true);
    expect(a.canAccess('admin.users')).toBe(true);
    expect(a.canAccess('admin.hardware')).toBe(true);
    expect(a.canAccess('dashboard')).toBe(true);
    expect(a.isAdmin()).toBe(true);
  });
});
