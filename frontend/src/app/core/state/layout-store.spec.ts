import { TestBed } from '@angular/core/testing';

import { LayoutStore } from './layout-store';

describe('LayoutStore', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
  });

  it('déployée et tiroir fermé par défaut', () => {
    const store = TestBed.inject(LayoutStore);
    expect(store.replie()).toBe(false);
    expect(store.menuMobileOuvert()).toBe(false);
  });

  it('bascule en rail et persiste, puis redéploie', () => {
    const store = TestBed.inject(LayoutStore);

    store.basculerReplie();
    expect(store.replie()).toBe(true);
    expect(localStorage.getItem('tontine-sidebar-replie')).toBe('1');

    store.basculerReplie();
    expect(store.replie()).toBe(false);
    expect(localStorage.getItem('tontine-sidebar-replie')).toBe('0');
  });

  it('relit l’état replié mémorisé au démarrage', () => {
    localStorage.setItem('tontine-sidebar-replie', '1');
    const store = TestBed.inject(LayoutStore);
    expect(store.replie()).toBe(true);
  });

  it('ouvre puis ferme le tiroir mobile', () => {
    const store = TestBed.inject(LayoutStore);

    store.ouvrirMobile();
    expect(store.menuMobileOuvert()).toBe(true);

    store.fermerMobile();
    expect(store.menuMobileOuvert()).toBe(false);
  });
});
