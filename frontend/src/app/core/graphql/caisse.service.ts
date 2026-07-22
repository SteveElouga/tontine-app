import { Injectable, inject } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { map, Observable } from 'rxjs';

import { Membre, MembreMontant, MontantMois, RecapMembre } from '../domain/caisse.models';
import {
  AJOUTER_DEPOT,
  AJOUTER_MEMBRE,
  DEPOTS_MEMBRE,
  DEPOTS_MOIS,
  MEMBRES,
  RECAP_CYCLE,
  RENOMMER_MEMBRE,
  RETIRER_MEMBRE,
} from './caisse.queries';

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

  /** Liste des membres actifs. */
  membres(cycleId: string): Observable<Membre[]> {
    return this.apollo
      .query<{ membres: Membre[] }>({
        query: MEMBRES,
        variables: { cycleId },
        fetchPolicy: 'network-only',
      })
      .pipe(map((r) => (r.data?.membres ?? []) as Membre[]));
  }

  /** Ajoute un membre. */
  ajouterMembre(cycleId: string, nom: string, telephone: string): Observable<Membre> {
    return this.apollo
      .mutate<{ ajouterMembre: Membre }>({
        mutation: AJOUTER_MEMBRE,
        variables: { cycleId, nom, telephone },
      })
      .pipe(map((r) => r.data!.ajouterMembre as Membre));
  }

  /** Renomme un membre. */
  renommerMembre(memberId: string, nom: string): Observable<Membre> {
    return this.apollo
      .mutate<{ renommerMembre: Membre }>({
        mutation: RENOMMER_MEMBRE,
        variables: { memberId, nom },
      })
      .pipe(map((r) => r.data!.renommerMembre as Membre));
  }

  /** Désactive un membre (l'historique est conservé). */
  retirerMembre(memberId: string): Observable<boolean> {
    return this.apollo
      .mutate<{ retirerMembre: boolean }>({
        mutation: RETIRER_MEMBRE,
        variables: { memberId },
      })
      .pipe(map((r) => Boolean(r.data?.retirerMembre)));
  }
}
