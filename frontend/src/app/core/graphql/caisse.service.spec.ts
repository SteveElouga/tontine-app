import { TestBed } from '@angular/core/testing';
import { ApolloTestingController, ApolloTestingModule } from 'apollo-angular/testing';

import { CaisseService } from './caisse.service';
import {
  AJOUTER_DEPOT,
  AJOUTER_MEMBRE,
  AJOUTER_PRET,
  CLOTURER_CYCLE,
  CREER_CYCLE,
  RENOMMER_CAISSE,
  DEPOTS_MEMBRE,
  DEPOTS_MOIS,
  FICHE_MEMBRE,
  HISTORIQUE,
  INFOS_CLOTURE,
  MEMBRES,
  MODIFIER_CYCLE,
  PARAMETRES_CYCLE,
  PRETS_CYCLE,
  RECAP_CYCLE,
  REMBOURSER_PRET,
  RENOMMER_MEMBRE,
  RETIRER_MEMBRE,
  SIMULER_EPARGNE,
  SIMULER_PRET,
} from './caisse.queries';

/** L'émission d'apollo-angular après un flush est asynchrone (Promise). */
const tick = () => new Promise<void>((r) => setTimeout(r));

describe('CaisseService', () => {
  let service: CaisseService;
  let ctrl: ApolloTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ApolloTestingModule] });
    service = TestBed.inject(CaisseService);
    ctrl = TestBed.inject(ApolloTestingController);
  });

  afterEach(() => ctrl.verify());

  // --- Requêtes qui renvoient une liste ---
  it('recapCycle renvoie la liste', async () => {
    let out: unknown[] | undefined;
    service.recapCycle('c1').subscribe((r) => (out = r));
    ctrl.expectOne(RECAP_CYCLE).flush({ data: { recapCycle: [] } });
    await tick();
    expect(out).toEqual([]);
  });

  it('depotsMois renvoie la liste', async () => {
    let out: unknown[] | undefined;
    service.depotsMois('c1', 2).subscribe((r) => (out = r));
    ctrl.expectOne(DEPOTS_MOIS).flush({ data: { depotsMois: [] } });
    await tick();
    expect(out).toEqual([]);
  });

  it('depotsMembre renvoie la liste', async () => {
    let out: unknown[] | undefined;
    service.depotsMembre('c1', 'm1').subscribe((r) => (out = r));
    ctrl.expectOne(DEPOTS_MEMBRE).flush({ data: { depotsMembre: [] } });
    await tick();
    expect(out).toEqual([]);
  });

  it('membres renvoie la liste', async () => {
    let out: unknown[] | undefined;
    service.membres('c1').subscribe((r) => (out = r));
    ctrl.expectOne(MEMBRES).flush({ data: { membres: [] } });
    await tick();
    expect(out).toEqual([]);
  });

  it('pretsCycle renvoie la liste', async () => {
    let out: unknown[] | undefined;
    service.pretsCycle('c1').subscribe((r) => (out = r));
    ctrl.expectOne(PRETS_CYCLE).flush({ data: { pretsCycle: [] } });
    await tick();
    expect(out).toEqual([]);
  });

  it('historique renvoie la liste', async () => {
    let out: unknown[] | undefined;
    service.historique('c1').subscribe((r) => (out = r));
    ctrl.expectOne(HISTORIQUE).flush({ data: { historique: [] } });
    await tick();
    expect(out).toEqual([]);
  });

  // --- Requêtes qui renvoient un objet ---
  it('infosCloture renvoie l’objet', async () => {
    let out: unknown;
    service.infosCloture('c1').subscribe((r) => (out = r));
    ctrl
      .expectOne(INFOS_CLOTURE)
      .flush({ data: { infosCloture: { gains: '0', totalPromis: '0', reductionSuggeree: 0 } } });
    await tick();
    expect(out).toBeDefined();
  });

  it('ficheMembre renvoie l’objet', async () => {
    let out: unknown;
    service.ficheMembre('c1', 'm1').subscribe((r) => (out = r));
    ctrl.expectOne(FICHE_MEMBRE).flush({ data: { ficheMembre: { __typename: 'FicheMembre', id: 'm1' } } });
    await tick();
    expect(out).toBeDefined();
  });

  it('simulerEpargne renvoie l’objet', async () => {
    let out: unknown;
    service.simulerEpargne('c1', 1000, 1).subscribe((r) => (out = r));
    ctrl
      .expectOne(SIMULER_EPARGNE)
      .flush({ data: { simulerEpargne: { taux: '0.45', interet: '450', total: '1450' } } });
    await tick();
    expect(out).toBeDefined();
  });

  it('simulerPret renvoie l’objet', async () => {
    let out: unknown;
    service.simulerPret('c1', 1000, 1).subscribe((r) => (out = r));
    ctrl
      .expectOne(SIMULER_PRET)
      .flush({ data: { simulerPret: { moisDeDette: 11, majoration: '550', total: '1550' } } });
    await tick();
    expect(out).toBeDefined();
  });

  it('parametresCycle renvoie l’objet', async () => {
    let out: unknown;
    service.parametresCycle('c1').subscribe((r) => (out = r));
    ctrl
      .expectOne(PARAMETRES_CYCLE)
      .flush({ data: { parametresCycle: { __typename: 'ParametresCycle', id: 'c1' } } });
    await tick();
    expect(out).toBeDefined();
  });

  // --- Mutations ---
  it('ajouterMembre renvoie le membre', async () => {
    let out: unknown;
    service.ajouterMembre('c1', 'Awa', '').subscribe((r) => (out = r));
    ctrl
      .expectOne(AJOUTER_MEMBRE)
      .flush({ data: { ajouterMembre: { __typename: 'Membre', id: 'm1', nom: 'Awa' } } });
    await tick();
    expect(out).toBeDefined();
  });

  it('renommerMembre renvoie le membre', async () => {
    let out: unknown;
    service.renommerMembre('m1', 'Béa').subscribe((r) => (out = r));
    ctrl
      .expectOne(RENOMMER_MEMBRE)
      .flush({ data: { renommerMembre: { __typename: 'Membre', id: 'm1', nom: 'Béa' } } });
    await tick();
    expect(out).toBeDefined();
  });

  it('retirerMembre renvoie un booléen', async () => {
    let out: boolean | undefined;
    service.retirerMembre('m1').subscribe((r) => (out = r));
    ctrl.expectOne(RETIRER_MEMBRE).flush({ data: { retirerMembre: true } });
    await tick();
    expect(out).toBe(true);
  });

  it('ajouterPret renvoie le prêt', async () => {
    let out: unknown;
    service.ajouterPret('c1', 'm1', 5000, 3).subscribe((r) => (out = r));
    ctrl.expectOne(AJOUTER_PRET).flush({ data: { ajouterPret: { __typename: 'Pret', id: 'p1' } } });
    await tick();
    expect(out).toBeDefined();
  });

  it('rembourserPret renvoie le prêt', async () => {
    let out: unknown;
    service.rembourserPret('p1', 11).subscribe((r) => (out = r));
    ctrl.expectOne(REMBOURSER_PRET).flush({ data: { rembourserPret: { __typename: 'Pret', id: 'p1' } } });
    await tick();
    expect(out).toBeDefined();
  });

  it('modifierCycle renvoie les paramètres', async () => {
    let out: unknown;
    service.modifierCycle('c1', '2025-2026', 9, 9, 12, 0.05, 0.05).subscribe((r) => (out = r));
    ctrl
      .expectOne(MODIFIER_CYCLE)
      .flush({ data: { modifierCycle: { __typename: 'ParametresCycle', id: 'c1' } } });
    await tick();
    expect(out).toBeDefined();
  });

  it('creerCycle renvoie les paramètres', async () => {
    let out: unknown;
    service.creerCycle('c1', '2026-2027').subscribe((r) => (out = r));
    ctrl.expectOne(CREER_CYCLE).flush({ data: { creerCycle: { __typename: 'ParametresCycle', id: 'c2' } } });
    await tick();
    expect(out).toBeDefined();
  });

  it('cloturerCycle renvoie les paramètres', async () => {
    let out: unknown;
    service.cloturerCycle('c1').subscribe((r) => (out = r));
    ctrl
      .expectOne(CLOTURER_CYCLE)
      .flush({ data: { cloturerCycle: { __typename: 'ParametresCycle', id: 'c1' } } });
    await tick();
    expect(out).toBeDefined();
  });

  it('renommerCaisse renvoie les paramètres', async () => {
    let out: unknown;
    service.renommerCaisse('c1', 'Caisse X').subscribe((r) => (out = r));
    ctrl
      .expectOne(RENOMMER_CAISSE)
      .flush({ data: { renommerCaisse: { __typename: 'ParametresCycle', id: 'c1' } } });
    await tick();
    expect(out).toBeDefined();
  });

  it('ajouterDepot renvoie le récap et déclenche le refetch', async () => {
    let out: unknown;
    service.ajouterDepot('c1', 'm1', 2, 100).subscribe((r) => (out = r));
    ctrl.expectOne(AJOUTER_DEPOT).flush({
      data: {
        ajouterDepot: {
          __typename: 'RecapMembre',
          id: 'm1',
          nom: 'Awa',
          totalDepose: '100',
          interets: '0',
          epargnePlusInterets: '100',
          dettes: '0',
          positionNette: '100',
        },
      },
    });
    await tick();
    // La mutation déclenche un refetch de RECAP_CYCLE.
    ctrl.expectOne(RECAP_CYCLE).flush({ data: { recapCycle: [] } });
    await tick();
    expect(out).toBeDefined();
  });
});
