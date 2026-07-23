import { Injectable, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

const CLE = 'tontine-lang';
export type Langue = 'fr' | 'en';

/**
 * Langue de l'application (français / anglais). Retient le choix d'une visite à
 * l'autre, comme le thème, et l'applique via ngx-translate.
 */
@Injectable({ providedIn: 'root' })
export class LangStore {
  private readonly translate = inject(TranslateService);
  readonly langue = signal<Langue>(localStorage.getItem(CLE) === 'en' ? 'en' : 'fr');

  /** Appelé au démarrage : charge la langue mémorisée. */
  init() {
    return this.translate.use(this.langue());
  }

  changer(l: Langue): void {
    this.langue.set(l);
    this.translate.use(l);
    localStorage.setItem(CLE, l);
  }
}
