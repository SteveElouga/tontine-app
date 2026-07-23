import { Injectable, signal } from '@angular/core';

const CLE = 'tontine-theme';

/**
 * Thème clair / sombre. Ajoute la classe `.app-dark` sur `<html>` (nos variables de
 * couleur et PrimeNG basculent en conséquence) et retient le choix d'une visite à l'autre.
 */
@Injectable({ providedIn: 'root' })
export class ThemeStore {
  readonly sombre = signal(false);

  constructor() {
    this.appliquer(localStorage.getItem(CLE) === 'sombre');
  }

  basculer(sombre: boolean): void {
    this.appliquer(sombre);
    localStorage.setItem(CLE, sombre ? 'sombre' : 'clair');
  }

  private appliquer(sombre: boolean): void {
    this.sombre.set(sombre);
    document.documentElement.classList.toggle('app-dark', sombre);
  }
}
