import type { IStorage } from '@core/storage';
import { Session } from '../models/Session';

export class SessionManager {
  private static readonly KEY = 'session';

  constructor(private readonly storage: IStorage) {}

  load(): Session | null {
    const raw = this.storage.get<unknown>(SessionManager.KEY);
    if (!raw) return null;
    try {
      const session = Session.fromJSON(raw);
      if (session.isExpired()) {
        this.clear();
        return null;
      }
      return session;
    } catch {
      this.clear();
      return null;
    }
  }

  save(session: Session): void {
    this.storage.set(SessionManager.KEY, session.toJSON());
  }

  clear(): void {
    this.storage.remove(SessionManager.KEY);
  }
}
