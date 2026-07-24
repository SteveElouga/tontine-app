import { Injectable, inject } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { map, Observable } from 'rxjs';

import {
  FicheMembre,
  InfosCloture,
  Membre,
  MembreMontant,
  MontantMois,
  Operation,
  ParametresCycle,
  Pret,
  RecapMembre,
  SimEpargne,
  SimPret,
} from '../domain/caisse.models';
import {
  AJOUTER_DEPOT,
  AJOUTER_MEMBRE,
  AJOUTER_PRET,
  CLOTURER_CYCLE,
  CREER_CYCLE,
  RENOMMER_CAISSE,
  DEPOTS_MEMBRE,
  DEPOTS_MOIS,
  FICHE_MEMBRE,
  HISTORIQUE,
  INFOS_CLOTURE,
  MEMBRES,
  MODIFIER_CYCLE,
  PARAMETRES_CYCLE,
  PRETS_CYCLE,
  RECAP_CYCLE,
  REMBOURSER_PRET,
  AJOUTER_REMBOURSEMENT,
  RENOMMER_MEMBRE,
  RETIRER_MEMBRE,
  SIMULER_EPARGNE,
  SIMULER_PRET,
} from './caisse.queries';

@Injectable({ providedIn: 'root' })
export class CaisseService {
  private readonly apollo = inject(Apollo);

  /** Récapitulatif des membres, selon le mode de répartition des intérêts à la clôture. */
  recapCycle(cycleId: string, mode = 'complet', nMois = 0): Observable<RecapMembre[]> {
    return this.apollo
      .query<{ recapCycle: RecapMembre[] }>({
        query: RECAP_CYCLE,
        variables: { cycleId, mode, nMois },
        fetchPolicy: 'network-only',
      })
      .pipe(map((res) => (res.data?.recapCycle ?? []) as RecapMembre[]));
  }

  /** Contexte de clôture : gains encaissés, intérêts promis, réduction suggérée. */
  infosCloture(cycleId: string): Observable<InfosCloture> {
    return this.apollo
      .query<{ infosCloture: InfosCloture }>({
        query: INFOS_CLOTURE,
        variables: { cycleId },
        fetchPolicy: 'network-only',
      })
      .pipe(map((r) => r.data!.infosCloture as InfosCloture));
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

  /** Détail complet d'un membre : d'où vient chaque franc de son montant à la clôture. */
  ficheMembre(cycleId: string, memberId: string): Observable<FicheMembre> {
    return this.apollo
      .query<{ ficheMembre: FicheMembre }>({
        query: FICHE_MEMBRE,
        variables: { cycleId, memberId },
        fetchPolicy: 'network-only',
      })
      .pipe(map((r) => r.data!.ficheMembre as FicheMembre));
  }

  /** Tous les prêts d'un cycle (montant, majoration, total, statut). */
  pretsCycle(cycleId: string): Observable<Pret[]> {
    return this.apollo
      .query<{ pretsCycle: Pret[] }>({
        query: PRETS_CYCLE,
        variables: { cycleId },
        fetchPolicy: 'network-only',
      })
      .pipe(map((r) => (r.data?.pretsCycle ?? []) as Pret[]));
  }

  /** Enregistre un prêt accordé à un membre. */
  ajouterPret(
    cycleId: string,
    memberId: string,
    montant: number,
    moisPret: number,
  ): Observable<Pret> {
    return this.apollo
      .mutate<{ ajouterPret: Pret }>({
        mutation: AJOUTER_PRET,
        variables: { cycleId, memberId, montant, moisPret },
      })
      .pipe(map((r) => r.data!.ajouterPret as Pret));
  }

  /** Marque un prêt remboursé (mois indiqué ; null = au délai d'août). */
  rembourserPret(pretId: string, moisRemboursement: number | null): Observable<Pret> {
    return this.apollo
      .mutate<{ rembourserPret: Pret }>({
        mutation: REMBOURSER_PRET,
        variables: { pretId, moisRemboursement },
      })
      .pipe(map((r) => r.data!.rembourserPret as Pret));
  }

  /** Enregistre un remboursement partiel d'un prêt (registre composé v2). */
  ajouterRemboursement(pretId: string, mois: number, montant: number): Observable<Pret> {
    return this.apollo
      .mutate<{ ajouterRemboursement: Pret }>({
        mutation: AJOUTER_REMBOURSEMENT,
        variables: { pretId, mois, montant },
      })
      .pipe(map((r) => r.data!.ajouterRemboursement as Pret));
  }

  /** Journal chronologique des opérations du cycle (dépôts + prêts). */
  historique(cycleId: string): Observable<Operation[]> {
    return this.apollo
      .query<{ historique: Operation[] }>({
        query: HISTORIQUE,
        variables: { cycleId },
        fetchPolicy: 'network-only',
      })
      .pipe(map((r) => (r.data?.historique ?? []) as Operation[]));
  }

  /** Simule un dépôt hypothétique (taux, intérêt, total à la clôture). */
  simulerEpargne(cycleId: string, montant: number, moisIndex: number): Observable<SimEpargne> {
    return this.apollo
      .query<{ simulerEpargne: SimEpargne }>({
        query: SIMULER_EPARGNE,
        variables: { cycleId, montant, moisIndex },
        fetchPolicy: 'network-only',
      })
      .pipe(map((r) => r.data!.simulerEpargne as SimEpargne));
  }

  /** Simule un prêt hypothétique (mois de dette, majoration, total à rembourser). */
  simulerPret(cycleId: string, montant: number, moisPret: number): Observable<SimPret> {
    return this.apollo
      .query<{ simulerPret: SimPret }>({
        query: SIMULER_PRET,
        variables: { cycleId, montant, moisPret },
        fetchPolicy: 'network-only',
      })
      .pipe(map((r) => r.data!.simulerPret as SimPret));
  }

  /** Règles complètes d'un cycle. */
  parametresCycle(cycleId: string): Observable<ParametresCycle> {
    return this.apollo
      .query<{ parametresCycle: ParametresCycle }>({
        query: PARAMETRES_CYCLE,
        variables: { cycleId },
        fetchPolicy: 'network-only',
      })
      .pipe(map((r) => r.data!.parametresCycle as ParametresCycle));
  }

  /** Modifie les règles d'un cycle (recalcule les montants existants). */
  modifierCycle(
    cycleId: string,
    libelle: string,
    moisDebut: number,
    dureeDepot: number,
    moisDelai: number,
    tauxEpargne: number,
    tauxMajoration: number,
  ): Observable<ParametresCycle> {
    return this.apollo
      .mutate<{ modifierCycle: ParametresCycle }>({
        mutation: MODIFIER_CYCLE,
        variables: { cycleId, libelle, moisDebut, dureeDepot, moisDelai, tauxEpargne, tauxMajoration },
      })
      .pipe(map((r) => r.data!.modifierCycle as ParametresCycle));
  }

  /** Crée une nouvelle année (reprend les règles du cycle de référence). */
  creerCycle(cycleReferenceId: string, libelle: string): Observable<ParametresCycle> {
    return this.apollo
      .mutate<{ creerCycle: ParametresCycle }>({
        mutation: CREER_CYCLE,
        variables: { cycleReferenceId, libelle },
      })
      .pipe(map((r) => r.data!.creerCycle as ParametresCycle));
  }

  /** Clôture un cycle. */
  cloturerCycle(cycleId: string): Observable<ParametresCycle> {
    return this.apollo
      .mutate<{ cloturerCycle: ParametresCycle }>({
        mutation: CLOTURER_CYCLE,
        variables: { cycleId },
      })
      .pipe(map((r) => r.data!.cloturerCycle as ParametresCycle));
  }

  /** Renomme la caisse du cycle. */
  renommerCaisse(cycleId: string, nom: string): Observable<ParametresCycle> {
    return this.apollo
      .mutate<{ renommerCaisse: ParametresCycle }>({
        mutation: RENOMMER_CAISSE,
        variables: { cycleId, nom },
      })
      .pipe(map((r) => r.data!.renommerCaisse as ParametresCycle));
  }
}
