export const Roles = ['guest', 'developer', 'researcher', 'organization', 'admin'] as const;
export type Role = (typeof Roles)[number];

export const RoleLabelBG: Record<Role, string> = {
  guest: 'Гост',
  developer: 'Разработчик',
  researcher: 'Изследовател',
  organization: 'Организация',
  admin: 'Администратор',
};

export type Resource =
  | 'calculator'
  | 'history'
  | 'compare'
  | 'reports'
  | 'dashboard'
  | 'admin'
  | 'admin.users'
  | 'admin.hardware'
  | 'profile';
