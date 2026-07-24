import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';

import { AuthStore } from '../state/auth-store';

/**
 * Sur 401 d'une requête protégée (GraphQL) : rafraîchit silencieusement le jeton d'accès
 * à partir du refresh token, puis rejoue la requête avec le nouveau jeton.
 * Si le refresh est absent/expiré/refusé → déconnexion + retour au login.
 *
 * Les endpoints « /api/auth/ » (connexion, refresh) gèrent leurs propres erreurs et ne
 * passent donc PAS par cette logique — ce qui évite toute boucle sur l'appel de refresh.
 */
export const authRefreshInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthStore);
  const router = inject(Router);

  return next(req).pipe(
    catchError((err: unknown) => {
      const est401 = err instanceof HttpErrorResponse && err.status === 401;
      if (!est401 || req.url.includes('/api/auth/')) {
        return throwError(() => err);
      }

      // Refresh mort ou absent → on sort proprement.
      if (!auth.peutRafraichir()) {
        auth.deconnecter();
        router.navigate(['/login']);
        return throwError(() => err);
      }

      // Refresh silencieux, puis rejeu de la requête avec le nouveau jeton.
      return auth.rafraichir().pipe(
        switchMap((token) =>
          next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })),
        ),
        catchError((e: unknown) => {
          auth.deconnecter();
          router.navigate(['/login']);
          return throwError(() => e);
        }),
      );
    }),
  );
};
