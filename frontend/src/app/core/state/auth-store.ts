import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, finalize, map, shareReplay, tap, throwError } from 'rxjs';

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

  /** Vrai si un refresh token valide permet de rafraîchir silencieusement l'accès. */
  readonly peutRafraichir = computed(() => {
    const r = this.refreshToken();
    return r !== null && jetonValide(r);
  });

  /** Session ouverte : accès valide OU rafraîchissable. Sert au shell et à la garde de route. */
  readonly sessionActive = computed(() => this.connecte() || this.peutRafraichir());

  /** Refresh partagé : si plusieurs requêtes tombent en 401 en même temps, un seul appel réseau. */
  private rafraichissement: Observable<string> | null = null;

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

  /**
   * Rafraîchit silencieusement le jeton d'accès à partir du refresh token.
   * Refresh absent/expiré ou refusé par le serveur → déconnexion.
   * Les appels concurrents partagent la même requête (pas de rafale de refresh).
   */
  rafraichir(): Observable<string> {
    if (this.rafraichissement) return this.rafraichissement;
    const refresh = this.refreshToken();
    if (!refresh || !jetonValide(refresh)) {
      this.deconnecter();
      return throwError(() => new Error('Refresh token absent ou expiré.'));
    }
    this.rafraichissement = this.http
      .post<{ access: string }>(`${API_BASE}/api/auth/token/refresh/`, { refresh })
      .pipe(
        tap((r) => {
          this.accessToken.set(r.access);
          localStorage.setItem(CLE_ACCESS, r.access);
        }),
        map((r) => r.access),
        catchError((err) => {
          this.deconnecter(); // refresh refusé (expiré côté serveur, blacklisté…) → on sort
          return throwError(() => err);
        }),
        finalize(() => (this.rafraichissement = null)),
        shareReplay(1),
      );
    return this.rafraichissement;
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
