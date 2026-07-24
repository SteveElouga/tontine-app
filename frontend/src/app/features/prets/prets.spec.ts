import { TestBed } from '@angular/core/testing';

import { Prets } from './prets';
import { providersDeTest } from '../../../testing/providers';

interface PretsInterne {
  prets: { set: (v: unknown[]) => void };
  totalPrete: () => number;
  totalRembourse: () => number;
  totalSolde: () => number;
}

describe('Prets', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ imports: [Prets], providers: providersDeTest() });
  });

  it('se crée', () => {
    expect(TestBed.createComponent(Prets).componentInstance).toBeTruthy();
  });

  it('calcule les totaux des prêts (prêté, remboursé, solde composé)', () => {
    const c = TestBed.createComponent(Prets).componentInstance as unknown as PretsInterne;
    c.prets.set([
      { id: 'p1', nom: 'A', montant: '10000', solde: '8000', totalRembourse: '3000', moisPret: 3 },
      { id: 'p2', nom: 'B', montant: '20000', solde: '21000', totalRembourse: '0', moisPret: 4 },
    ]);
    expect(c.totalPrete()).toBe(30000);
    expect(c.totalRembourse()).toBe(3000);
    expect(c.totalSolde()).toBe(29000);
  });
});
