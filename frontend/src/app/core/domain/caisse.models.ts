/**
 * Types du domaine « caisse mutuelle » — miroir des types exposés par l'API GraphQL.
 * Aucune logique de calcul ici : les intérêts et majorations sont calculés côté serveur.
 * Les montants arrivent en chaînes (Strawberry sérialise les Decimal en texte) ;
 * utiliser Number(x) uniquement pour l'affichage.
 */

export type MoisIndex = number; // position dans le cycle : 1 = 1er mois de dépôt … duree_depot = dernier

/**
 * Convertit une position dans le cycle (1..12) en numéro de mois calendaire
 * (1 = janvier … 12 = décembre), selon le mois d'ouverture du cycle.
 * Ex. ouverture en septembre (moisDebut = 9) : position 1 → 9 (septembre), position 5 → 1 (janvier).
 */
export function moisCalendaire(position: number, moisDebut: number): number {
  return ((moisDebut - 1 + (position - 1)) % 12) + 1;
}

/**
 * Année calendaire d'une position du cycle, selon le mois d'ouverture et l'année de début.
 * Ex. cycle ouvert en septembre 2025 : position 1 → 2025, position 5 (janvier) → 2026,
 * position 13 (septembre suivant) → 2026.
 */
export function anneeDe(position: number, moisDebut: number, anneeDebut: number): number {
  return anneeDebut + Math.floor((moisDebut - 1 + (position - 1)) / 12);
}

/** Un cycle de caisse (pour le sélecteur de cycle courant). */
export interface CycleInfo {
  id: string;
  libelle: string;
  caisseNom: string;
  statut: string;
  moisDebut: number;
  dureeDepot: number;
  moisDelai: number;
}

/** Règles complètes d'un cycle (écran Paramètres). */
export interface ParametresCycle {
  id: string;
  libelle: string;
  statut: string;
  caisseNom: string;
  moisDebut: number;
  dureeDepot: number;
  moisDelai: number;
  tauxEpargne: string;
  tauxMajoration: string;
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
  date?: string | null; // ISO du jour de la saisie (null si aucun dépôt)
}

export interface MontantMois {
  moisIndex: number;
  montant: string;
  date?: string | null; // ISO du jour de la saisie (null si aucun dépôt)
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

/** Une réunion dans la vie d'un prêt composé (échéancier de la fiche). */
export interface LigneEcheance {
  mois: number;
  interet: string;
  paiement: string;
  solde: string;
}

export interface PretDetail {
  montant: string;
  moisPret: number;
  solde: string;
  totalRembourse: string;
  totalInterets: string;
  echeancier: LigneEcheance[];
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
  solde: string; // dette composée restante (v2)
  totalRembourse: string;
}

/** Une opération du journal (dépôt ou prêt). */
export interface Operation {
  type: 'depot' | 'pret' | 'remboursement';
  date: string;
  membreNom: string;
  montant: string;
  mois: number;
}

/** Une note de séance (cahier de la trésorière). */
export interface NoteSeance {
  mois: number;
  texte: string;
  modifieLe: string;
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
