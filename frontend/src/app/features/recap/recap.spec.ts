import { TestBed } from '@angular/core/testing';

import { Recap } from './recap';
import { providersDeTest } from '../../../testing/providers';

/** Accès typé aux membres protégés du composant, pour tester sa logique. */
interface RecapInterne {
  membres: { set: (v: unknown[]) => void };
  recherche: { set: (v: string) => void };
  totalDepose: () => number;
  totalInterets: () => number;
  totalDettes: () => number;
  totalRecevoir: () => number;
  membresFiltres: () => unknown[];
}

describe('Recap', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [Recap],
      providers: providersDeTest(),
    });
  });

  it('se crée', () => {
    const fixture = TestBed.createComponent(Recap);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('calcule les totaux et filtre par nom', () => {
    const fixture = TestBed.createComponent(Recap);
    const c = fixture.componentInstance as unknown as RecapInterne;

    c.membres.set([
      {
        id: '1',
        nom: 'Awa',
        totalDepose: '100',
        interets: '10',
        epargnePlusInterets: '110',
        dettes: '0',
        positionNette: '110',
      },
      {
        id: '2',
        nom: 'Béa',
        totalDepose: '200',
        interets: '20',
        epargnePlusInterets: '220',
        dettes: '50',
        positionNette: '170',
      },
    ]);

    expect(c.totalDepose()).toBe(300);
    expect(c.totalInterets()).toBe(30);
    expect(c.totalDettes()).toBe(50);
    expect(c.totalRecevoir()).toBe(280);

    c.recherche.set('awa');
    expect(c.membresFiltres().length).toBe(1);
  });
});
