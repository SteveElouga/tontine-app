import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';

import { LangStore } from './lang-store';

describe('LangStore', () => {
  let appliquees: string[];

  beforeEach(() => {
    localStorage.clear();
    appliquees = [];
    TestBed.configureTestingModule({
      providers: [{ provide: TranslateService, useValue: { use: (l: string) => appliquees.push(l) } }],
    });
  });

  afterEach(() => localStorage.clear());

  it('français par défaut', () => {
    const store = TestBed.inject(LangStore);
    expect(store.langue()).toBe('fr');
  });

  it('changer met à jour la langue, l’applique et la persiste', () => {
    const store = TestBed.inject(LangStore);
    store.changer('en');
    expect(store.langue()).toBe('en');
    expect(appliquees).toContain('en');
    expect(localStorage.getItem('tontine-lang')).toBe('en');
  });

  it('relit la langue mémorisée au démarrage', () => {
    localStorage.setItem('tontine-lang', 'en');
    const store = TestBed.inject(LangStore);
    expect(store.langue()).toBe('en');
  });

  it('init applique la langue courante', () => {
    const store = TestBed.inject(LangStore);
    store.init();
    expect(appliquees).toContain('fr');
  });
});
