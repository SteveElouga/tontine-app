import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { driver } from 'driver.js';

const CLE_VU = 'tontine.tourVu';

/** Visite guidée (Driver.js) : présentée à la première connexion, rejouable depuis l'Aide. */
@Injectable({ providedIn: 'root' })
export class TourService {
  private readonly i18n = inject(TranslateService);

  private construire() {
    const t = (k: string): string => this.i18n.instant(k);
    return driver({
      showProgress: true,
      nextBtnText: t('tour.suivant'),
      prevBtnText: t('tour.precedent'),
      doneBtnText: t('tour.terminer'),
      steps: [
        { popover: { title: t('tour.bienvenueTitre'), description: t('tour.bienvenueTexte') } },
        {
          element: '[data-tour="cycle"]',
          popover: { title: t('tour.cycleTitre'), description: t('tour.cycleTexte') },
        },
        {
          element: '[data-tour="saisie"]',
          popover: { title: t('tour.saisieTitre'), description: t('tour.saisieTexte') },
        },
        {
          element: '[data-tour="recap"]',
          popover: { title: t('tour.recapTitre'), description: t('tour.recapTexte') },
        },
        {
          element: '[data-tour="aide"]',
          popover: { title: t('tour.aideTitre'), description: t('tour.aideTexte') },
        },
      ],
    });
  }

  /** Lance la visite immédiatement. */
  demarrer(): void {
    this.construire().drive();
  }

  /** Lance la visite une seule fois (première connexion). */
  demarrerSiPremiereFois(): void {
    if (localStorage.getItem(CLE_VU)) return;
    localStorage.setItem(CLE_VU, '1');
    this.demarrer();
  }
}
