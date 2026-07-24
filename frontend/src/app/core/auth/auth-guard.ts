import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthStore } from '../state/auth-store';

/**
 * Autorise l'accès si la session est ouverte — jeton d'accès valide OU refresh encore
 * valable (le rafraîchissement silencieux se fera au premier appel). Sinon → /login.
 */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthStore);
  const router = inject(Router);
  return auth.sessionActive() ? true : router.createUrlTree(['/login']);
};
