import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.token()) {
    return router.parseUrl('/login');
  }

  const requiredRoles = route.data['roles'] as Array<string>;
  const user = authService.user();

  if (requiredRoles && user && !requiredRoles.includes(user.role)) {
    return router.parseUrl('/');
  }

  return true;
};
