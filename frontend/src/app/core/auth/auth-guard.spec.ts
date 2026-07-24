import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Router, UrlTree, provideRouter } from '@angular/router';

import { authGuard } from './auth-guard';
import { AuthStore } from '../state/auth-store';

function executer() {
  return TestBed.runInInjectionContext(() => authGuard({} as never, {} as never));
}

describe('authGuard', () => {
  it('laisse passer si connectée', () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthStore, useValue: { sessionActive: signal(true) } }],
    });
    expect(executer()).toBe(true);
  });

  it('redirige vers /login si non connectée', () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthStore, useValue: { sessionActive: signal(false) } }],
    });
    const resultat = executer();
    expect(resultat instanceof UrlTree).toBe(true);
    expect(TestBed.inject(Router).serializeUrl(resultat as UrlTree)).toBe('/login');
  });
});
