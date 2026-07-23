import { Pipe, PipeTransform, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

import { CycleStore } from '../state/cycle-store';
import { moisCalendaire } from '../domain/caisse.models';

/**
 * Affiche le nom (localisé) du mois calendaire correspondant à une position dans le cycle,
 * selon le mois d'ouverture du cycle courant. Impur : se réévalue au changement de langue
 * ou de cycle.
 */
@Pipe({ name: 'moisNom', standalone: true, pure: false })
export class MoisNomPipe implements PipeTransform {
  private readonly i18n = inject(TranslateService);
  private readonly cycleStore = inject(CycleStore);

  transform(position: number | null | undefined): string {
    if (position == null) return '';
    return this.i18n.instant('mois.' + moisCalendaire(position, this.cycleStore.moisDebut()));
  }
}
