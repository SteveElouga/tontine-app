import { TestBed } from '@angular/core/testing';

import { Dashboard } from './dashboard';
import { providersDeTest } from '../../../testing/providers';

interface DashboardInterne {
  membres: { set: (v: unknown[]) => void };
  nbMembres: () => number;
  epargne: () => number;
  interets: () => number;
  aReverser: () => number;
  pretsEnCours: () => number;
}

describe('Dashboard', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ imports: [Dashboard], providers: providersDeTest() });
  });

  it('se crée', () => {
    expect(TestBed.createComponent(Dashboard).componentInstance).toBeTruthy();
  });

  it('agrège les totaux des membres', () => {
    const c = TestBed.createComponent(Dashboard).componentInstance as unknown as DashboardInterne;
    c.membres.set([
      { id: '1', nom: 'A', totalDepose: '100', interets: '10', epargnePlusInterets: '110', dettes: '0', positionNette: '110' },
      { id: '2', nom: 'B', totalDepose: '200', interets: '20', epargnePlusInterets: '220', dettes: '30', positionNette: '190' },
    ]);
    expect(c.nbMembres()).toBe(2);
    expect(c.epargne()).toBe(300);
    expect(c.interets()).toBe(30);
    expect(c.aReverser()).toBe(300);
    expect(c.pretsEnCours()).toBe(1);
  });
});
