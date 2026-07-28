import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';

import { TourService } from './tour-service';

describe('TourService', () => {
  let service: TourService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        { provide: TranslateService, useValue: { instant: (cle: string) => cle } },
        // La visite revient à l'accueil avant de démarrer : un routeur factice suffit ici,
        // les tests ne portent que sur le choix des étapes.
        { provide: Router, useValue: { url: '/tableau-de-bord', navigate: () => Promise.resolve(true) } },
      ],
    });
    service = TestBed.inject(TourService);
  });

  afterEach(() => localStorage.clear());

  it('demarrerSiPremiereFois lance la visite une seule fois et mémorise le passage', () => {
    // On neutralise le vrai lancement (Driver.js manipule le DOM) pour tester la logique.
    const spy = vi.spyOn(service, 'demarrer').mockImplementation(() => undefined);

    service.demarrerSiPremiereFois();
    expect(spy).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('tontine.tourVu')).toBe('1');

    service.demarrerSiPremiereFois();
    expect(spy).toHaveBeenCalledTimes(1); // déjà vu : pas rejoué
  });

  it('demarrerSiPremiereFois ne relance pas si déjà vu', () => {
    localStorage.setItem('tontine.tourVu', '1');
    const spy = vi.spyOn(service, 'demarrer').mockImplementation(() => undefined);

    service.demarrerSiPremiereFois();
    expect(spy).not.toHaveBeenCalled();
  });

  /**
   * Ces cibles vivent dans le tiroir, qui est fermé et hors écran sur téléphone
   * (`transform: translateX(-100%)`). Les inclure revenait à découper le projecteur de
   * Driver.js en dehors de l'écran : c'est le bug que ces tests verrouillent.
   */
  const CIBLES_TIROIR = ['cycle', 'tableau', 'saisie', 'prets', 'recap', 'membres'];

  /** Accès à la méthode privée : c'est la logique de sélection qu'on veut couvrir. */
  const etapesPour = (largeur: number): { element?: string }[] => {
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(largeur);
    const etape = (cle: string, sel?: string) => ({ ...(sel ? { element: sel } : {}), cle });
    return (service as unknown as { etapes: (e: typeof etape) => { element?: string }[] }).etapes(
      etape,
    );
  };

  afterEach(() => vi.restoreAllMocks());

  it('sur téléphone, ne désigne aucune cible du tiroir fermé', () => {
    const cibles = etapesPour(390)
      .map((e) => e.element)
      .filter((s): s is string => !!s);

    for (const nom of CIBLES_TIROIR) {
      expect(cibles).not.toContain(`[data-tour="${nom}"]`);
    }
    expect(cibles).toContain('[data-tour="menu"]'); // le hamburger, lui, est visible
  });

  it('sur téléphone, la visite reste courte ; sur ordinateur elle parcourt le menu', () => {
    const mobile = etapesPour(390);
    const bureau = etapesPour(1280);

    expect(mobile).toHaveLength(4);
    expect(bureau).toHaveLength(12);
    expect(bureau.map((e) => e.element)).toContain('[data-tour="cycle"]');
  });

  it('au seuil exact (768 px), on est encore en tiroir donc en visite mobile', () => {
    expect(etapesPour(768)).toHaveLength(4);
    expect(etapesPour(769)).toHaveLength(12);
  });

  /**
   * Une bulle sans cible flotte au milieu de l'écran. Acceptable pour l'accueil, pas pour
   * une étape qui dit « c'est ici » : sur téléphone, une seule étape a le droit d'être
   * sans ancrage, la première.
   */
  it('sur téléphone, seule la première étape est sans cible', () => {
    const sansCible = etapesPour(390)
      .map((e, i) => ({ i, orpheline: !e.element }))
      .filter((x) => x.orpheline);

    expect(sansCible.map((x) => x.i)).toEqual([0]);
  });
});
