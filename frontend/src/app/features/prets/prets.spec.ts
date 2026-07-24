import { TestBed } from '@angular/core/testing';

import { Prets } from './prets';
import { providersDeTest } from '../../../testing/providers';

interface PretsInterne {
  prets: { set: (v: unknown[]) => void };
  totalPrete: () => number;
  totalMajoration: () => number;
  totalRembourser: () => number;
}

describe('Prets', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ imports: [Prets], providers: providersDeTest() });
  });

  it('se crée', () => {
    expect(TestBed.createComponent(Prets).componentInstance).toBeTruthy();
  });

  it('calcule les totaux des prêts', () => {
    const c = TestBed.createComponent(Prets).componentInstance as unknown as PretsInterne;
    c.prets.set([
      { id: 'p1', nom: 'A', montant: '1000', majoration: '100', totalARembourser: '1100', moisPret: 3, moisDeDette: 2, rembourse: false, moisRemboursement: null },
      { id: 'p2', nom: 'B', montant: '2000', majoration: '200', totalARembourser: '2200', moisPret: 4, moisDeDette: 3, rembourse: false, moisRemboursement: null },
    ]);
    expect(c.totalPrete()).toBe(3000);
    expect(c.totalMajoration()).toBe(300);
    expect(c.totalRembourser()).toBe(3300);
  });
});
