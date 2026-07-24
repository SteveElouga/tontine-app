import { TestBed } from '@angular/core/testing';

import { Saisie } from './saisie';
import { providersDeTest } from '../../../testing/providers';

interface SaisieInterne {
  lignes: { set: (v: unknown[]) => void };
  total: () => number;
  nbEnregistres: () => number;
}

describe('Saisie', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ imports: [Saisie], providers: providersDeTest() });
  });

  it('se crée', () => {
    expect(TestBed.createComponent(Saisie).componentInstance).toBeTruthy();
  });

  it('somme les montants et compte les enregistrés', () => {
    const c = TestBed.createComponent(Saisie).componentInstance as unknown as SaisieInterne;
    c.lignes.set([
      { label: 'A', memberId: '1', moisIndex: 2, montant: 100, enregistre: true },
      { label: 'B', memberId: '2', moisIndex: 2, montant: 50, enregistre: false },
      { label: 'C', memberId: '3', moisIndex: 2, montant: null, enregistre: false },
    ]);
    expect(c.total()).toBe(150);
    expect(c.nbEnregistres()).toBe(1);
  });
});
