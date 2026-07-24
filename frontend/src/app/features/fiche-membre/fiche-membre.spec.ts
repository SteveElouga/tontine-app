import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';

import { FicheMembrePage } from './fiche-membre';
import { providersDeTest } from '../../../testing/providers';

interface FicheInterne {
  fiche: { set: (v: unknown) => void };
  initiales: () => string;
}

describe('FicheMembrePage', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [FicheMembrePage],
      providers: [
        ...providersDeTest(),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 'm1' } } } },
      ],
    });
  });

  it('se crée', () => {
    expect(TestBed.createComponent(FicheMembrePage).componentInstance).toBeTruthy();
  });

  it('calcule les initiales à partir du nom', () => {
    const c = TestBed.createComponent(FicheMembrePage).componentInstance as unknown as FicheInterne;
    c.fiche.set({
      nom: 'Membre 03',
      positionNette: '0',
      totalDepose: '0',
      interets: '0',
      epargnePlusInterets: '0',
      dettes: '0',
      depots: [],
      prets: [],
    });
    expect(c.initiales()).toBe('M0');
  });
});
