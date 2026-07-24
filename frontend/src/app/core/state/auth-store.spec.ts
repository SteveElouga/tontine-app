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

  it('sessionActive reste vrai si le refresh est valide même avec un access expiré', () => {
    localStorage.setItem('tontine.access', jwt(ilYaDixSecondes()));
    localStorage.setItem('tontine.refresh', jwt(dansUneHeure()));
    const store = TestBed.inject(AuthStore);
    expect(store.connecte()).toBe(false);
    expect(store.peutRafraichir()).toBe(true);
    expect(store.sessionActive()).toBe(true);
  });

  it('rafraichir échange le refresh contre un nouvel access', () => {
    const refresh = jwt(dansUneHeure());
    localStorage.setItem('tontine.access', jwt(ilYaDixSecondes()));
    localStorage.setItem('tontine.refresh', refresh);
    const store = TestBed.inject(AuthStore);
    const http = TestBed.inject(HttpTestingController);
    const nouveau = jwt(dansUneHeure() + 100);

    let recu: string | undefined;
    store.rafraichir().subscribe((t) => (recu = t));

    const req = http.expectOne('http://localhost:8000/api/auth/token/refresh/');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ refresh });
    req.flush({ access: nouveau });

    expect(recu).toBe(nouveau);
    expect(store.accessToken()).toBe(nouveau);
    expect(store.connecte()).toBe(true);
    expect(localStorage.getItem('tontine.access')).toBe(nouveau);
    http.verify();
  });

  it('rafraichir avec un refresh expiré déconnecte sans appel réseau', () => {
    localStorage.setItem('tontine.access', jwt(ilYaDixSecondes()));
    localStorage.setItem('tontine.refresh', jwt(ilYaDixSecondes()));
    const store = TestBed.inject(AuthStore);
    const http = TestBed.inject(HttpTestingController);
    expect(store.peutRafraichir()).toBe(false);

    let erreur = false;
    store.rafraichir().subscribe({ error: () => (erreur = true) });

    expect(erreur).toBe(true);
    expect(store.accessToken()).toBeNull();
    http.expectNone('http://localhost:8000/api/auth/token/refresh/');
    http.verify();
  });

  it('rafraichir refusé par le serveur (401) déconnecte', () => {
    const refresh = jwt(dansUneHeure());
    localStorage.setItem('tontine.access', jwt(ilYaDixSecondes()));
    localStorage.setItem('tontine.refresh', refresh);
    const store = TestBed.inject(AuthStore);
    const http = TestBed.inject(HttpTestingController);

    let erreur = false;
    store.rafraichir().subscribe({ error: () => (erreur = true) });

    const req = http.expectOne('http://localhost:8000/api/auth/token/refresh/');
    req.flush({ detail: 'invalide' }, { status: 401, statusText: 'Unauthorized' });

    expect(erreur).toBe(true);
    expect(store.accessToken()).toBeNull();
    expect(store.connecte()).toBe(false);
    http.verify();
  });
});
