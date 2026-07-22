/** Service d'accès aux données de la caisse (sur Apollo GraphQL). */
import { Injectable } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { map, Observable } from 'rxjs';

import { RecapMembre } from '../domain/caisse.models';
import { AJOUTER_DEPOT, RECAP_CYCLE } from './caisse.queries';

@Injectable({ providedIn: 'root' })
export class CaisseService {
  constructor(private readonly apollo: Apollo) {}

  /** Récapitulatif de tous les membres d'un cycle (épargne, intérêts, dettes, net). */
  recapCycle(cycleId: string): Observable<RecapMembre[]> {
    return this.apollo
      .watchQuery<{ recapCycle: RecapMembre[] }>({
        query: RECAP_CYCLE,
        variables: { cycleId },
      })
      .valueChanges.pipe(map((res) => res.data.recapCycle));
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
        // rafraîchit le récap du cycle après écriture
        refetchQueries: [{ query: RECAP_CYCLE, variables: { cycleId } }],
      })
      .pipe(map((res) => res.data!.ajouterDepot));
  }
}
