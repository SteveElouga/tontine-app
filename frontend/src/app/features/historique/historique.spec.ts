import { TestBed } from '@angular/core/testing';

import { Historique } from './historique';
import { providersDeTest } from '../../../testing/providers';

interface HistoriqueInterne {
  operations: { set: (v: unknown[]) => void };
  recherche: { set: (v: string) => void };
  typeFiltre: { set: (v: string) => void };
  operationsFiltrees: () => unknown[];
}

describe('Historique', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ imports: [Historique], providers: providersDeTest() });
  });

  it('se crée', () => {
    expect(TestBed.createComponent(Historique).componentInstance).toBeTruthy();
  });

  it('filtre par nom et par type', () => {
    const c = TestBed.createComponent(Historique).componentInstance as unknown as HistoriqueInterne;
    c.operations.set([
      { type: 'depot', date: '2026-01-01', membreNom: 'Awa', montant: '100', mois: 1, rembourse: false, moisRemboursement: null },
      { type: 'pret', date: '2026-02-01', membreNom: 'Béa', montant: '500', mois: 2, rembourse: false, moisRemboursement: null },
    ]);
    expect(c.operationsFiltrees().length).toBe(2);

    c.typeFiltre.set('depot');
    expect(c.operationsFiltrees().length).toBe(1);

    c.typeFiltre.set('tout');
    c.recherche.set('béa');
    expect(c.operationsFiltrees().length).toBe(1);
  });
});
