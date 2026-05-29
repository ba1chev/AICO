import type { RouteGuard } from '@core/router/Route';
import type { AuthService } from '../services/AuthService';
import type { Router } from '@core/router/Router';
import type { Role, Resource } from '../models/Role';

export class AuthGuard implements RouteGuard {
  constructor(private readonly auth: AuthService, private readonly router: Router) {}

  canActivate(): boolean {
    return this.auth.isAuthenticated();
  }

  onDenied(): void {
    this.router.navigate('/login');
  }
}

export class GuestOnlyGuard implements RouteGuard {
  constructor(private readonly auth: AuthService, private readonly router: Router) {}

  canActivate(): boolean {
    return !this.auth.isAuthenticated();
  }

  onDenied(): void {
    this.router.navigate('/');
  }
}

export class RoleGuard implements RouteGuard {
  constructor(
    private readonly auth: AuthService,
    private readonly router: Router,
    private readonly roles: Role[],
  ) {}

  canActivate(): boolean {
    return this.auth.hasRole(...this.roles);
  }

  onDenied(): void {
    if (!this.auth.isAuthenticated()) this.router.navigate('/login');
    else this.router.navigate('/');
  }
}

export class ResourceGuard implements RouteGuard {
  constructor(
    private readonly auth: AuthService,
    private readonly router: Router,
    private readonly resource: Resource,
  ) {}

  canActivate(): boolean {
    return this.auth.current().canAccess(this.resource);
  }

  onDenied(): void {
    if (!this.auth.isAuthenticated()) this.router.navigate('/login');
    else this.router.navigate('/');
  }
}
