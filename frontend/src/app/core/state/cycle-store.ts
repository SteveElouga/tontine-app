import { Injectable, computed, inject, signal } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { map } from 'rxjs';

import { CycleInfo } from '../domain/caisse.models';
import { CYCLES } from '../graphql/caisse.queries';

// Cycle pilote (dev) : valeur par défaut tant que la liste n'est pas chargée.
const CYCLE_PILOTE = '8e7323b1-1277-47dd-b358-ee0354d52b3d';

/**
 * Source unique du « cycle courant » de l'application.
 * Les écrans lisent `cycleId()` au lieu d'un identifiant codé en dur.
 */
@Injectable({ providedIn: 'root' })
export class CycleStore {
  private readonly apollo = inject(Apollo);

  /** Cycles disponibles (pour le menu). */
  readonly cycles = signal<CycleInfo[]>([]);

  /** Cycle actuellement sélectionné. */
  readonly cycleId = signal<string>(CYCLE_PILOTE);

  /** Mois d'ouverture (calendaire) du cycle courant ; 9 = septembre par défaut. */
  readonly moisDebut = computed(() => {
    const cur = this.cycles().find((c) => c.id === this.cycleId());
    return cur?.moisDebut ?? 9;
  });

  /** Charge la liste des cycles ; garde la sélection valide. */
  charger(): void {
    this.apollo
      .query<{ cycles: CycleInfo[] }>({ query: CYCLES, fetchPolicy: 'network-only' })
      .pipe(map((r) => (r.data?.cycles ?? []) as CycleInfo[]))
      .subscribe((cs) => {
        this.cycles.set(cs);
        if (cs.length && !cs.some((c) => c.id === this.cycleId())) {
          this.cycleId.set(cs[0].id);
        }
      });
  }

  choisir(id: string): void {
    this.cycleId.set(id);
  }
}
