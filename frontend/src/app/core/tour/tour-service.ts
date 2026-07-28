import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { driver } from 'driver.js';

const CLE_VU = 'tontine.tourVu';

/** Seuil du tiroir mobile — même valeur que la media query de `app.scss`. */
const SEUIL_MOBILE = 768;

/** Écran d'accueil : la visite s'y déroule, c'est là que vivent ses cibles mobiles. */
const ROUTE_ACCUEIL = '/tableau-de-bord';

/** Laisse la route s'afficher avant de lancer la visite (rendu + fondu d'entrée). */
const DELAI_RENDU_MS = 450;

/** Visite guidée (Driver.js) : présentée à la première connexion, rejouable depuis l'Aide. */
@Injectable({ providedIn: 'root' })
export class TourService {
  private readonly i18n = inject(TranslateService);
  private readonly router = inject(Router);

  /**
   * Vrai quand la barre latérale est un tiroir fermé (petit écran).
   *
   * C'est ce qui départage les deux visites : sur ordinateur le menu est toujours à
   * l'écran, sur téléphone il est escamoté derrière le hamburger. Une seule et même
   * visite ne peut pas convenir aux deux — voir `etapes()`.
   */
  private estMobile(): boolean {
    return typeof window !== 'undefined' && window.innerWidth <= SEUIL_MOBILE;
  }

  /**
   * Étapes de la visite, selon la place disponible.
   *
   * Sur **ordinateur**, on parcourt la barre latérale : elle est visible en permanence,
   * chaque entrée peut être désignée.
   *
   * Sur **téléphone**, ces mêmes entrées vivent dans un tiroir fermé
   * (`transform: translateX(-100%)`) : leur rectangle est hors écran, à gauche. Les
   * désigner revenait à pointer le vide — le projecteur se découpait en dehors de
   * l'écran et les bulles se collaient au bord. On ne montre donc pas le menu, on
   * apprend **où il se cache**, puis on s'appuie sur ce qui est réellement affiché :
   * l'état du cycle et les deux raccourcis. Cinq étapes au lieu de douze, ce qui vaut
   * mieux de toute façon pour une première prise en main sur un petit écran.
   */
  private etapes(etape: (cle: string, sel?: string) => object): object[] {
    if (this.estMobile()) {
      // Pas d'étape « aide » séparée ici : sur téléphone son entrée est dans le tiroir
      // fermé, donc impossible à désigner. Une bulle sans cible flotte au milieu de
      // l'écran en disant « tout est expliqué ici » sans pointer nulle part. L'aide est
      // donc citée dans l'étape du menu, là où elle se trouve réellement.
      return [
        etape('bienvenue'),
        etape('menu', '[data-tour="menu"]'),
        etape('etat', '[data-tour="etat"]'),
        etape('raccourcis', '[data-tour="raccourcis"]'),
      ];
    }
    return [
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
    ];
  }

  /* v8 ignore start -- lancement de Driver.js (manipule le DOM), non testable unitairement */
  private construire() {
    const t = (k: string): string => this.i18n.instant(k);
    const etape = (cle: string, sel?: string) => ({
      ...(sel ? { element: sel } : {}),
      popover: { title: t(`tour.${cle}Titre`), description: t(`tour.${cle}Texte`) },
    });
    // Filet de sécurité : on écarte toute étape dont la cible est absente du DOM. Sans lui,
    // Driver.js centre une bulle orpheline au milieu d'un écran non concerné — c'est ce qui
    // arrivait en relançant la visite depuis l'Aide. Utile aussi pour la carte « état du
    // cycle », rendue seulement une fois la requête revenue.
    const presente = (e: { element?: string }) => !e.element || !!document.querySelector(e.element);
    return driver({
      showProgress: true,
      progressText: '{{current}} / {{total}}',
      popoverClass: 'tontine-tour',
      nextBtnText: t('tour.suivant'),
      prevBtnText: t('tour.precedent'),
      doneBtnText: t('tour.terminer'),
      steps: this.etapes(etape).filter(presente),
    });
  }

  /**
   * Lance la visite depuis l'écran d'accueil.
   *
   * Elle est aussi rejouable depuis l'Aide (`aide.ts`) : sans ce détour, les étapes qui
   * désignent le tableau de bord tomberaient dans le vide, l'Aide n'ayant évidemment pas
   * ces éléments. On revient donc à l'accueil d'abord — ce qui est de toute façon le bon
   * point de départ d'une visite.
   */
  demarrer(): void {
    if (this.router.url.startsWith(ROUTE_ACCUEIL)) {
      this.construire().drive();
      return;
    }
    void this.router.navigate([ROUTE_ACCUEIL]).then(() => {
      setTimeout(() => this.construire().drive(), DELAI_RENDU_MS);
    });
  }
  /* v8 ignore stop */

  /** Lance la visite une seule fois (première connexion). */
  demarrerSiPremiereFois(): void {
    if (localStorage.getItem(CLE_VU)) return;
    localStorage.setItem(CLE_VU, '1');
    this.demarrer();
  }
}
