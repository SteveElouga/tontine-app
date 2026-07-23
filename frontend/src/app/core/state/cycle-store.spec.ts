import { TestBed } from '@angular/core/testing';
import { ApolloTestingController, ApolloTestingModule } from 'apollo-angular/testing';

import { CycleStore } from './cycle-store';
import { CycleInfo } from '../domain/caisse.models';
import { CYCLES } from '../graphql/caisse.queries';

describe('CycleStore', () => {
  let store: CycleStore;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ApolloTestingModule] });
    store = TestBed.inject(CycleStore);
  });

  it('moisDebut vaut 9 (septembre) par défaut', () => {
    expect(store.moisDebut()).toBe(9);
  });

  it('moisDebut suit le mois d’ouverture du cycle courant', () => {
    const cycles: CycleInfo[] = [
      { id: 'a', libelle: '2025-2026', caisseNom: 'C', statut: 'ouvert', moisDebut: 10 },
      { id: 'b', libelle: '2024-2025', caisseNom: 'C', statut: 'cloture', moisDebut: 3 },
    ];
    store.cycles.set(cycles);

    store.cycleId.set('b');
    expect(store.moisDebut()).toBe(3);

    store.cycleId.set('a');
    expect(store.moisDebut()).toBe(10);
  });

  it('choisir change le cycle courant', () => {
    store.choisir('xyz');
    expect(store.cycleId()).toBe('xyz');
  });

  it('charger récupère les cycles et cale le cycle courant', async () => {
    const ctrl = TestBed.inject(ApolloTestingController);
    store.charger();

    const op = ctrl.expectOne(CYCLES);
    op.flush({
      data: {
        cycles: [
          {
            __typename: 'CycleInfo',
            id: 'x',
            libelle: '2025-2026',
            caisseNom: 'C',
            statut: 'ouvert',
            moisDebut: 9,
          },
        ],
      },
    });
    await new Promise((r) => setTimeout(r)); // l'émission Apollo est asynchrone

    expect(store.cycles().length).toBe(1);
    expect(store.cycleId()).toBe('x');
    ctrl.verify();
  });

  it('charger ne réinitialise pas le cycle courant s’il est déjà dans la liste', async () => {
    const ctrl = TestBed.inject(ApolloTestingController);
    const pilote = store.cycleId();
    store.charger();

    ctrl.expectOne(CYCLES).flush({
      data: {
        cycles: [
          {
            __typename: 'CycleInfo',
            id: pilote,
            libelle: '2025-2026',
            caisseNom: 'C',
            statut: 'ouvert',
            moisDebut: 9,
          },
        ],
      },
    });
    await new Promise((r) => setTimeout(r));

    expect(store.cycleId()).toBe(pilote);
    ctrl.verify();
  });

  it('charger avec une liste vide ne change pas le cycle courant', async () => {
    const ctrl = TestBed.inject(ApolloTestingController);
    const avant = store.cycleId();
    store.charger();

    ctrl.expectOne(CYCLES).flush({ data: { cycles: [] } });
    await new Promise((r) => setTimeout(r));

    expect(store.cycles().length).toBe(0);
    expect(store.cycleId()).toBe(avant);
    ctrl.verify();
  });
});
