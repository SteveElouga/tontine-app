/**
 * Types du domaine « caisse mutuelle » — miroir des types exposés par l'API GraphQL.
 *
 * IMPORTANT : aucune logique de calcul ici. Les intérêts et majorations sont calculés
 * par le backend (source de vérité). Le frontend ne fait qu'afficher et saisir.
 */

/** Index de mois depuis le début du cycle : 1 = septembre … 9 = mai … 12 = août. */
export type MoisIndex = number;

export const MOIS: Record<number, string> = {
  1: 'Septembre', 2: 'Octobre', 3: 'Novembre', 4: 'Décembre', 5: 'Janvier',
  6: 'Février', 7: 'Mars', 8: 'Avril', 9: 'Mai', 10: 'Juin', 11: 'Juillet', 12: 'Août',
};

export interface Cycle {
  id: string;
  libelle: string;
  moisDebut: number;
  dureeDepot: number;
  moisDelai: number;
  tauxEpargne: number;
  tauxMajoration: number;
  statut: 'ouvert' | 'cloture';
}

export interface Member {
  id: string;
  nom: string;
  telephone?: string;
  actif: boolean;
}

export interface Deposit {
  id: string;
  memberId: string;
  moisIndex: MoisIndex;
  montant: number;
}

export interface Loan {
  id: string;
  memberId: string;
  montant: number;
  moisPret: MoisIndex;
  moisRemboursement?: MoisIndex | null;
}

/** Récapitulatif d'un membre calculé côté serveur (type GraphQL `RecapMembre`). */
export interface RecapMembre {
  id: string;
  nom: string;
  totalDepose: number;
  interets: number;
  epargnePlusInterets: number;
  dettes: number;
  positionNette: number;
}
