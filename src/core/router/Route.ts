import type { View } from '../view/View';
import type { Container } from '../di/Container';

export type ViewConstructor = new (
  container: Container,
  params: Record<string, string>,
) => View;

export interface RouteGuard {
  canActivate(): boolean | Promise<boolean>;
  onDenied?(): void;
}

export interface RouteDefinition {
  path: string;
  view: ViewConstructor | (() => Promise<{ default: ViewConstructor }>);
  guards?: RouteGuard[];
  title?: string;
}
