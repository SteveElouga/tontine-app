import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';

/** Base de l'API REST (mêmes hôte/port que GraphQL). À sortir en environnement avant la prod. */
const API_BASE = 'http://localhost:8000';
const CLE_ACCESS = 'tontine.access';
const CLE_REFRESH = 'tontine.refresh';
const CLE_USER = 'tontine.user';

/** Vrai si le jeton JWT est bien formé et non expiré (lecture du champ `exp`). */
function jetonValide(token: string): boolean {
  try {
    const part = token.split('.')[1];
    const base64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const pad = base64.length % 4 ? '='.repeat(4 - (base64.length % 4)) : '';
    const payload = JSON.parse(atob(base64 + pad));
    return typeof payload.exp === 'number' && payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

/**
 * Connexion de la trésorière : conserve le jeton JWT (persisté), l'expose à Apollo
 * (en-tête Authorization) et aux gardes de route.
 */
@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly http = inject(HttpClient);

  readonly accessToken = signal<string | null>(localStorage.getItem(CLE_ACCESS));
  private readonly refreshToken = signal<string | null>(localStorage.getItem(CLE_REFRESH));
  /** Identifiant de connexion, pour l'affichage (écran Profil). */
  readonly username = signal<string | null>(localStorage.getItem(CLE_USER));

  /** Vrai si un jeton d'accès valide (non expiré) est présent. */
  readonly connecte = computed(() => {
    const t = this.accessToken();
    return t !== null && jetonValide(t);
  });

  /** Demande un jeton au backend et le conserve. */
  seConnecter(username: string, password: string): Observable<void> {
    return this.http
      .post<{ access: string; refresh: string }>(`${API_BASE}/api/auth/token/`, {
        username,
        password,
      })
      .pipe(
        tap((r) => {
          this.accessToken.set(r.access);
          this.refreshToken.set(r.refresh);
          this.username.set(username);
          localStorage.setItem(CLE_ACCESS, r.access);
          localStorage.setItem(CLE_REFRESH, r.refresh);
          localStorage.setItem(CLE_USER, username);
        }),
        map(() => undefined),
      );
  }

  /** Change le mot de passe de la trésorière connectée (jeton envoyé manuellement). */
  changerMotDePasse(ancien: string, nouveau: string): Observable<void> {
    const token = this.accessToken();
    return this.http
      .post(
        `${API_BASE}/api/auth/mot-de-passe/`,
        { ancien, nouveau },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} },
      )
      .pipe(map(() => undefined));
  }

  deconnecter(): void {
    this.accessToken.set(null);
    this.refreshToken.set(null);
    this.username.set(null);
    localStorage.removeItem(CLE_ACCESS);
    localStorage.removeItem(CLE_REFRESH);
    localStorage.removeItem(CLE_USER);
  }
}
