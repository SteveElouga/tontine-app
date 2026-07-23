import { TestBed } from '@angular/core/testing';

import { ThemeStore } from './theme-store';

describe('ThemeStore', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('app-dark');
    TestBed.configureTestingModule({});
  });

  afterEach(() => document.documentElement.classList.remove('app-dark'));

  it('clair par défaut', () => {
    const store = TestBed.inject(ThemeStore);
    expect(store.sombre()).toBe(false);
    expect(document.documentElement.classList.contains('app-dark')).toBe(false);
  });

  it('bascule en sombre, applique la classe et persiste', () => {
    const store = TestBed.inject(ThemeStore);
    store.basculer(true);
    expect(store.sombre()).toBe(true);
    expect(document.documentElement.classList.contains('app-dark')).toBe(true);
    expect(localStorage.getItem('tontine-theme')).toBe('sombre');
  });

  it('relit le choix mémorisé au démarrage', () => {
    localStorage.setItem('tontine-theme', 'sombre');
    const store = TestBed.inject(ThemeStore);
    expect(store.sombre()).toBe(true);
    expect(document.documentElement.classList.contains('app-dark')).toBe(true);
  });

  it('bascule en clair, retire la classe et persiste', () => {
    localStorage.setItem('tontine-theme', 'sombre');
    const store = TestBed.inject(ThemeStore);
    expect(store.sombre()).toBe(true);

    store.basculer(false);
    expect(store.sombre()).toBe(false);
    expect(document.documentElement.classList.contains('app-dark')).toBe(false);
    expect(localStorage.getItem('tontine-theme')).toBe('clair');
  });
});
