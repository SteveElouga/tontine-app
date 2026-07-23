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
    const etape = (cle: string, sel?: string) => ({
      ...(sel ? { element: sel } : {}),
      popover: { title: t(`tour.${cle}Titre`), description: t(`tour.${cle}Texte`) },
    });
    return driver({
      showProgress: true,
      progressText: '{{current}} / {{total}}',
      popoverClass: 'tontine-tour',
      nextBtnText: t('tour.suivant'),
      prevBtnText: t('tour.precedent'),
      doneBtnText: t('tour.terminer'),
      steps: [
        etape('bienvenue'),
        etape('cycle', '[data-tour="cycle"]'),
        etape('tableau', '[data-tour="tableau"]'),
        etape('saisie', '[data-tour="saisie"]'),
        etape('prets', '[data-tour="prets"]'),
        etape('recap', '[data-tour="recap"]'),
        etape('membres', '[data-tour="membres"]'),
        etape('simulation', '[data-tour="simulation"]'),
        etape('historique', '[data-tour="historique"]'),
        etape('aide', '[data-tour="aide"]'),
        etape('parametres', '[data-tour="parametres"]'),
        etape('profil', '[data-tour="profil"]'),
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
