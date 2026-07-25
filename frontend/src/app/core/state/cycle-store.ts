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

  /** Cycles disponibles (toutes caisses). */
  readonly cycles = signal<CycleInfo[]>([]);

  /** Cycle actuellement sélectionné. */
  readonly cycleId = signal<string>(CYCLE_PILOTE);

  /** Cycle courant (objet complet), s'il est chargé. */
  private readonly cycleCourant = computed(() =>
    this.cycles().find((c) => c.id === this.cycleId()),
  );

  /** Tontines (caisses) déduites des cycles, sans doublon. */
  readonly caisses = computed(() => {
    const vues = new Map<string, string>();
    for (const c of this.cycles()) if (!vues.has(c.caisseId)) vues.set(c.caisseId, c.caisseNom);
    return [...vues].map(([id, nom]) => ({ id, nom }));
  });

  /** Caisse (tontine) du cycle courant. */
  readonly caisseId = computed(() => this.cycleCourant()?.caisseId ?? '');

  /** Cycles de la caisse courante (pour le sélecteur d'année). */
  readonly cyclesCaisse = computed(() =>
    this.cycles().filter((c) => c.caisseId === this.caisseId()),
  );

  /** Mois d'ouverture (calendaire) du cycle courant ; 9 = septembre par défaut. */
  readonly moisDebut = computed(() => this.cycleCourant()?.moisDebut ?? 9);

  /** Nombre de mois de dépôt ; 9 par défaut (dernier mois où un prêt peut être contracté). */
  readonly dureeDepot = computed(() => this.cycleCourant()?.dureeDepot ?? 9);

  /** Dernière réunion de remboursement (position dans le cycle) ; 12 = août par défaut. */
  readonly moisDelai = computed(() => this.cycleCourant()?.moisDelai ?? 12);

  /** Année d'ouverture du cycle (lue dans le libellé « 2025-2026 ») ; défaut = année courante. */
  readonly anneeDebut = computed(() => {
    const m = this.cycleCourant()?.libelle?.match(/\d{4}/);
    return m ? Number(m[0]) : new Date().getFullYear();
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

  /** Sélectionne une tontine : bascule sur son cycle ouvert, sinon le plus récent. */
  choisirCaisse(caisseId: string): void {
    const dsc = this.cycles().filter((c) => c.caisseId === caisseId);
    if (!dsc.length) return;
    const cible = dsc.find((c) => c.statut === 'ouvert') ?? dsc[dsc.length - 1];
    this.cycleId.set(cible.id);
  }
}
