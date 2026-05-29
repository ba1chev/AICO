import type { Role } from '../models/Role';

export interface SessionDTO {
  userId: string;
  role: Role;
  issuedAt: string;
  expiresAt: string;
}

export class Session {
  private constructor(
    public readonly userId: string,
    public readonly role: Role,
    public readonly issuedAt: Date,
    public readonly expiresAt: Date,
  ) {
    Object.freeze(this);
  }

  static issue(userId: string, role: Role, durationMs = 1000 * 60 * 60 * 24 * 7): Session {
    const now = new Date();
    return new Session(userId, role, now, new Date(now.getTime() + durationMs));
  }

  static fromJSON(raw: unknown): Session {
    const dto = raw as Partial<SessionDTO>;
    if (!dto?.userId || !dto.role || !dto.issuedAt || !dto.expiresAt) {
      throw new Error('Session: invalid JSON.');
    }
    return new Session(dto.userId, dto.role, new Date(dto.issuedAt), new Date(dto.expiresAt));
  }

  toJSON(): SessionDTO {
    return {
      userId: this.userId,
      role: this.role,
      issuedAt: this.issuedAt.toISOString(),
      expiresAt: this.expiresAt.toISOString(),
    };
  }

  isExpired(now: Date = new Date()): boolean {
    return now.getTime() >= this.expiresAt.getTime();
  }
}
