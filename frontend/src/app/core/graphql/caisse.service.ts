import { Injectable, inject } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { map, Observable } from 'rxjs';

import { MembreMontant, MontantMois, RecapMembre } from '../domain/caisse.models';
import { AJOUTER_DEPOT, DEPOTS_MEMBRE, DEPOTS_MOIS, RECAP_CYCLE } from './caisse.queries';

@Injectable({ providedIn: 'root' })
export class CaisseService {
  private readonly apollo = inject(Apollo);

  /** Récapitulatif de tous les membres d'un cycle (épargne, intérêts, dettes, net). */
  recapCycle(cycleId: string): Observable<RecapMembre[]> {
    return this.apollo
      .watchQuery<{ recapCycle: RecapMembre[] }>({
        query: RECAP_CYCLE,
        variables: { cycleId },
      })
      .valueChanges.pipe(map((res) => (res.data?.recapCycle ?? []) as RecapMembre[]));
  }

  /** Saisit un dépôt et renvoie le récap à jour du membre. */
  ajouterDepot(
    cycleId: string,
    memberId: string,
    moisIndex: number,
    montant: number,
  ): Observable<RecapMembre> {
    return this.apollo
      .mutate<{ ajouterDepot: RecapMembre }>({
        mutation: AJOUTER_DEPOT,
        variables: { cycleId, memberId, moisIndex, montant },
        refetchQueries: [{ query: RECAP_CYCLE, variables: { cycleId } }],
      })
      .pipe(map((res) => res.data!.ajouterDepot as RecapMembre));
  }

  /** Montant déposé par chaque membre pour un mois donné. */
  depotsMois(cycleId: string, moisIndex: number): Observable<MembreMontant[]> {
    return this.apollo
      .query<{ depotsMois: MembreMontant[] }>({
        query: DEPOTS_MOIS,
        variables: { cycleId, moisIndex },
        fetchPolicy: 'network-only',
      })
      .pipe(map((r) => (r.data?.depotsMois ?? []) as MembreMontant[]));
  }

  /** Montant déposé par un membre à chaque mois du cycle. */
  depotsMembre(cycleId: string, memberId: string): Observable<MontantMois[]> {
    return this.apollo
      .query<{ depotsMembre: MontantMois[] }>({
        query: DEPOTS_MEMBRE,
        variables: { cycleId, memberId },
        fetchPolicy: 'network-only',
      })
      .pipe(map((r) => (r.data?.depotsMembre ?? []) as MontantMois[]));
  }
}
