import { Injectable, signal } from '@angular/core';

const CLE = 'tontine-sidebar-replie';

/**
 * État de la barre latérale.
 * - `replie` : barre réduite en rail d'icônes sur ordinateur (retenu d'une visite à l'autre).
 * - `menuMobileOuvert` : tiroir ouvert par-dessus le contenu sur petit écran (non mémorisé).
 */
@Injectable({ providedIn: 'root' })
export class LayoutStore {
  /** Barre repliée en rail d'icônes (ordinateur). Mémorisé dans le navigateur. */
  readonly replie = signal(localStorage.getItem(CLE) === '1');

  /** Tiroir de navigation ouvert par-dessus le contenu (petit écran). */
  readonly menuMobileOuvert = signal(false);

  /** Bascule replié / déployé sur ordinateur et retient le choix. */
  basculerReplie(): void {
    const valeur = !this.replie();
    this.replie.set(valeur);
    localStorage.setItem(CLE, valeur ? '1' : '0');
  }

  ouvrirMobile(): void {
    this.menuMobileOuvert.set(true);
  }

  fermerMobile(): void {
    this.menuMobileOuvert.set(false);
  }
}
