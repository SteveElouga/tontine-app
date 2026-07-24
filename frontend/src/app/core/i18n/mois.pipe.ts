import { Pipe, PipeTransform, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

import { CycleStore } from '../state/cycle-store';
import { anneeDe, moisCalendaire } from '../domain/caisse.models';

/** « Septembre 2025 » : nom du mois localisé + année calendaire, pour une position du cycle. */
export function moisAnnee(
  i18n: TranslateService,
  position: number,
  moisDebut: number,
  anneeDebut: number,
): string {
  const nom = i18n.instant('mois.' + moisCalendaire(position, moisDebut));
  return `${nom} ${anneeDe(position, moisDebut, anneeDebut)}`;
}

/**
 * Affiche « mois + année » du mois calendaire correspondant à une position dans le cycle,
 * selon le mois et l'année d'ouverture du cycle courant. Impur : se réévalue au changement
 * de langue ou de cycle.
 */
@Pipe({ name: 'moisNom', standalone: true, pure: false })
export class MoisNomPipe implements PipeTransform {
  private readonly i18n = inject(TranslateService);
  private readonly cycleStore = inject(CycleStore);

  transform(position: number | null | undefined): string {
    if (position == null) return '';
    return moisAnnee(
      this.i18n,
      position,
      this.cycleStore.moisDebut(),
      this.cycleStore.anneeDebut(),
    );
  }
}
