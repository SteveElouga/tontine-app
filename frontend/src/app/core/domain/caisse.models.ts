/**
 * Types du domaine « caisse mutuelle » — miroir des types exposés par l'API GraphQL.
 * Aucune logique de calcul ici : les intérêts et majorations sont calculés côté serveur.
 * Les montants arrivent en chaînes (Strawberry sérialise les Decimal en texte) ;
 * utiliser Number(x) uniquement pour l'affichage.
 */

export type MoisIndex = number; // 1 = septembre … 9 = mai … 12 = août

export const MOIS: Record<number, string> = {
  1: 'Septembre', 2: 'Octobre', 3: 'Novembre', 4: 'Décembre', 5: 'Janvier',
  6: 'Février', 7: 'Mars', 8: 'Avril', 9: 'Mai', 10: 'Juin', 11: 'Juillet', 12: 'Août',
};

/** Un cycle de caisse (pour le sélecteur de cycle courant). */
export interface CycleInfo {
  id: string;
  libelle: string;
  caisseNom: string;
  statut: string;
}

export interface RecapMembre {
  id: string;
  nom: string;
  totalDepose: string;
  interets: string;
  epargnePlusInterets: string;
  dettes: string;
  positionNette: string;
}

/** Contexte de clôture (pour le sélecteur de mode de répartition des intérêts). */
export interface InfosCloture {
  gains: string;
  totalPromis: string;
  reductionSuggeree: number;
}

export interface MembreMontant {
  id: string;
  nom: string;
  montant: string;
}

export interface MontantMois {
  moisIndex: number;
  montant: string;
}

export interface Membre {
  id: string;
  nom: string;
  telephone: string;
  actif: boolean;
}

export interface DepotDetail {
  moisIndex: number;
  montant: string;
  taux: string;
  interet: string;
}

export interface PretDetail {
  montant: string;
  moisPret: number;
  moisRemboursement: number | null;
  moisDeDette: number;
  majoration: string;
  totalARembourser: string;
}

export interface FicheMembre {
  id: string;
  nom: string;
  depots: DepotDetail[];
  prets: PretDetail[];
  totalDepose: string;
  interets: string;
  epargnePlusInterets: string;
  dettes: string;
  positionNette: string;
}

/** Une ligne de prêt du cycle (vue « Prêts »). */
export interface Pret {
  id: string;
  membreId: string;
  nom: string;
  montant: string;
  moisPret: number;
  moisRemboursement: number | null;
  moisDeDette: number;
  majoration: string;
  totalARembourser: string;
  rembourse: boolean;
}

/** Une opération du journal (dépôt ou prêt). */
export interface Operation {
  type: 'depot' | 'pret';
  date: string;
  membreNom: string;
  montant: string;
  mois: number;
  rembourse: boolean;
  moisRemboursement: number | null;
}

/** Résultat d'une simulation d'épargne. */
export interface SimEpargne {
  taux: string;
  interet: string;
  total: string;
}

/** Résultat d'une simulation de prêt. */
export interface SimPret {
  moisDeDette: number;
  majoration: string;
  total: string;
}
