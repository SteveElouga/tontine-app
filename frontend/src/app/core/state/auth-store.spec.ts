import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { AuthStore } from './auth-store';

/** Fabrique un JWT factice dont le payload contient `exp` (en secondes). */
function jwt(expSeconds: number): string {
  const payload = btoa(JSON.stringify({ exp: expSeconds }))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `header.${payload}.signature`;
}

const dansUneHeure = () => Math.floor(Date.now() / 1000) + 3600;
const ilYaDixSecondes = () => Math.floor(Date.now() / 1000) - 10;

describe('AuthStore', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
  });

  afterEach(() => localStorage.clear());

  it('déconnecté par défaut', () => {
    const store = TestBed.inject(AuthStore);
    expect(store.connecte()).toBe(false);
    expect(store.accessToken()).toBeNull();
  });

  it('seConnecter enregistre le jeton et l’identifiant', () => {
    const store = TestBed.inject(AuthStore);
    const http = TestBed.inject(HttpTestingController);
    const access = jwt(dansUneHeure());

    let termine = false;
    store.seConnecter('therese', 'secret').subscribe(() => (termine = true));

    const req = http.expectOne('http://localhost:8000/api/auth/token/');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ username: 'therese', password: 'secret' });
    req.flush({ access, refresh: 'refresh-token' });

    expect(termine).toBe(true);
    expect(store.accessToken()).toBe(access);
    expect(store.username()).toBe('therese');
    expect(store.connecte()).toBe(true);
    expect(localStorage.getItem('tontine.user')).toBe('therese');
    http.verify();
  });

  it('un jeton expiré n’est pas considéré comme connecté', () => {
    localStorage.setItem('tontine.access', jwt(ilYaDixSecondes()));
    const store = TestBed.inject(AuthStore);
    expect(store.connecte()).toBe(false);
  });

  it('deconnecter efface le jeton et l’identifiant', () => {
    localStorage.setItem('tontine.access', jwt(dansUneHeure()));
    localStorage.setItem('tontine.user', 'therese');
    const store = TestBed.inject(AuthStore);
    expect(store.connecte()).toBe(true);

    store.deconnecter();
    expect(store.connecte()).toBe(false);
    expect(store.username()).toBeNull();
    expect(localStorage.getItem('tontine.access')).toBeNull();
    expect(localStorage.getItem('tontine.user')).toBeNull();
  });

  it('changerMotDePasse envoie l’ancien et le nouveau avec le jeton', () => {
    localStorage.setItem('tontine.access', jwt(dansUneHeure()));
    const store = TestBed.inject(AuthStore);
    const http = TestBed.inject(HttpTestingController);

    let termine = false;
    store.changerMotDePasse('vieux', 'nouveau').subscribe(() => (termine = true));

    const req = http.expectOne('http://localhost:8000/api/auth/mot-de-passe/');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ ancien: 'vieux', nouveau: 'nouveau' });
    expect(req.request.headers.get('Authorization')).toContain('Bearer ');
    req.flush({ detail: 'ok' });

    expect(termine).toBe(true);
    http.verify();
  });

  it('un jeton mal formé n’est pas considéré comme valide', () => {
    localStorage.setItem('tontine.access', 'pas-un-jwt');
    const store = TestBed.inject(AuthStore);
    expect(store.connecte()).toBe(false);
  });

  it('changerMotDePasse sans jeton n’ajoute pas d’en-tête Authorization', () => {
    const store = TestBed.inject(AuthStore);
    const http = TestBed.inject(HttpTestingController);
    store.changerMotDePasse('a', 'b').subscribe();
    const req = http.expectOne('http://localhost:8000/api/auth/mot-de-passe/');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({ detail: 'ok' });
    http.verify();
  });

  it('un jeton sans exp numérique n’est pas valide', () => {
    const sansExp =
      'header.' +
      btoa(JSON.stringify({ sub: 'x' })).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') +
      '.sig';
    localStorage.setItem('tontine.access', sansExp);
    const store = TestBed.inject(AuthStore);
    expect(store.connecte()).toBe(false);
  });

  it('valide un jeton dont le payload nécessite un remplissage base64', () => {
    localStorage.setItem('tontine.access', jwt(99999999999));
    const store = TestBed.inject(AuthStore);
    expect(store.connecte()).toBe(true);
  });
});
