import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthStore } from '../state/auth-store';

/** Autorise l'accès si la trésorière est connectée, sinon redirige vers /login. */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthStore);
  const router = inject(Router);
  return auth.connecte() ? true : router.createUrlTree(['/login']);
};
