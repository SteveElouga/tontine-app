import { gql } from 'apollo-angular';

/** Liste des cycles (pour le sélecteur de cycle courant). */
export const CYCLES = gql`
  query Cycles {
    cycles {
      id
      libelle
      caisseNom
      statut
      moisDebut
      dureeDepot
      moisDelai
    }
  }
`;

/** Règles complètes d'un cycle (écran Paramètres). */
export const PARAMETRES_CYCLE = gql`
  query ParametresCycle($cycleId: ID!) {
    parametresCycle(cycleId: $cycleId) {
      id
      libelle
      statut
      caisseNom
      moisDebut
      dureeDepot
      moisDelai
      tauxEpargne
      tauxMajoration
    }
  }
`;

export const MODIFIER_CYCLE = gql`
  mutation ModifierCycle(
    $cycleId: ID!
    $libelle: String!
    $moisDebut: Int!
    $dureeDepot: Int!
    $moisDelai: Int!
    $tauxEpargne: Decimal!
    $tauxMajoration: Decimal!
  ) {
    modifierCycle(
      cycleId: $cycleId
      libelle: $libelle
      moisDebut: $moisDebut
      dureeDepot: $dureeDepot
      moisDelai: $moisDelai
      tauxEpargne: $tauxEpargne
      tauxMajoration: $tauxMajoration
    ) {
      id
      libelle
      statut
      caisseNom
      moisDebut
      dureeDepot
      moisDelai
      tauxEpargne
      tauxMajoration
    }
  }
`;

export const CREER_CYCLE = gql`
  mutation CreerCycle($cycleReferenceId: ID!, $libelle: String!) {
    creerCycle(cycleReferenceId: $cycleReferenceId, libelle: $libelle) {
      id
      libelle
      statut
    }
  }
`;

export const CLOTURER_CYCLE = gql`
  mutation CloturerCycle($cycleId: ID!) {
    cloturerCycle(cycleId: $cycleId) {
      id
      statut
    }
  }
`;

export const RENOMMER_CAISSE = gql`
  mutation RenommerCaisse($cycleId: ID!, $nom: String!) {
    renommerCaisse(cycleId: $cycleId, nom: $nom) {
      id
      caisseNom
    }
  }
`;

/** Récapitulatif des membres d'un cycle, selon le mode de répartition des intérêts. */
export const RECAP_CYCLE = gql`
  query RecapCycle($cycleId: ID!, $mode: String, $nMois: Int) {
    recapCycle(cycleId: $cycleId, mode: $mode, nMois: $nMois) {
      id
      nom
      totalDepose
      interets
      epargnePlusInterets
      dettes
      positionNette
    }
  }
`;

/** Contexte de clôture : gains encaissés, intérêts promis, réduction suggérée. */
export const INFOS_CLOTURE = gql`
  query InfosCloture($cycleId: ID!) {
    infosCloture(cycleId: $cycleId) {
      gains
      totalPromis
      reductionSuggeree
    }
  }
`;

/** Enregistre (ou met à jour) un dépôt, et renvoie le récap à jour du membre. */
export const AJOUTER_DEPOT = gql`
  mutation AjouterDepot($cycleId: ID!, $memberId: ID!, $moisIndex: Int!, $montant: Decimal!) {
    ajouterDepot(
      cycleId: $cycleId
      memberId: $memberId
      moisIndex: $moisIndex
      montant: $montant
    ) {
      id
      nom
      totalDepose
      interets
      epargnePlusInterets
      positionNette
    }
  }
`;

/** Montant déposé par chaque membre pour un mois donné (pré-remplissage « Par mois »). */
export const DEPOTS_MOIS = gql`
  query DepotsMois($cycleId: ID!, $moisIndex: Int!) {
    depotsMois(cycleId: $cycleId, moisIndex: $moisIndex) {
      id
      nom
      montant
    }
  }
`;

/** Montant déposé par un membre à chaque mois (vue « Par membre »). */
export const DEPOTS_MEMBRE = gql`
  query DepotsMembre($cycleId: ID!, $memberId: ID!) {
    depotsMembre(cycleId: $cycleId, memberId: $memberId) {
      moisIndex
      montant
    }
  }
`;

/** Liste des membres actifs de la caisse. */
export const MEMBRES = gql`
  query Membres($cycleId: ID!) {
    membres(cycleId: $cycleId) {
      id
      nom
      telephone
      actif
    }
  }
`;

export const AJOUTER_MEMBRE = gql`
  mutation AjouterMembre($cycleId: ID!, $nom: String!, $telephone: String) {
    ajouterMembre(cycleId: $cycleId, nom: $nom, telephone: $telephone) {
      id
      nom
      telephone
      actif
    }
  }
`;

export const RENOMMER_MEMBRE = gql`
  mutation RenommerMembre($memberId: ID!, $nom: String!) {
    renommerMembre(memberId: $memberId, nom: $nom) {
      id
      nom
    }
  }
`;

export const RETIRER_MEMBRE = gql`
  mutation RetirerMembre($memberId: ID!) {
    retirerMembre(memberId: $memberId)
  }
`;

/** Détail complet d'un membre (transparence : d'où vient son montant). */
export const FICHE_MEMBRE = gql`
  query FicheMembre($cycleId: ID!, $memberId: ID!) {
    ficheMembre(cycleId: $cycleId, memberId: $memberId) {
      id
      nom
      depots {
        moisIndex
        montant
        taux
        interet
      }
      prets {
        montant
        moisPret
        solde
        totalRembourse
        totalInterets
        echeancier {
          mois
          interet
          paiement
          solde
        }
      }
      totalDepose
      interets
      epargnePlusInterets
      dettes
      positionNette
    }
  }
`;

/** Tous les prêts d'un cycle (avec majoration, total, statut). */
export const PRETS_CYCLE = gql`
  query PretsCycle($cycleId: ID!) {
    pretsCycle(cycleId: $cycleId) {
      id
      membreId
      nom
      montant
      moisPret
      solde
      totalRembourse
    }
  }
`;

/** Enregistre un prêt accordé à un membre. */
export const AJOUTER_PRET = gql`
  mutation AjouterPret($cycleId: ID!, $memberId: ID!, $montant: Decimal!, $moisPret: Int!) {
    ajouterPret(cycleId: $cycleId, memberId: $memberId, montant: $montant, moisPret: $moisPret) {
      id
      membreId
      nom
      montant
      moisPret
      solde
      totalRembourse
    }
  }
`;

/** Enregistre un remboursement partiel d'un prêt (registre v2, intérêts composés). */
export const AJOUTER_REMBOURSEMENT = gql`
  mutation AjouterRemboursement($pretId: ID!, $mois: Int!, $montant: Decimal!) {
    ajouterRemboursement(pretId: $pretId, mois: $mois, montant: $montant) {
      id
      membreId
      nom
      montant
      moisPret
      solde
      totalRembourse
    }
  }
`;

/** Journal chronologique des opérations du cycle (dépôts + prêts). */
export const HISTORIQUE = gql`
  query Historique($cycleId: ID!) {
    historique(cycleId: $cycleId) {
      type
      date
      membreNom
      montant
      mois
    }
  }
`;

/** Simulation d'un dépôt hypothétique. */
export const SIMULER_EPARGNE = gql`
  query SimulerEpargne($cycleId: ID!, $montant: Decimal!, $moisIndex: Int!) {
    simulerEpargne(cycleId: $cycleId, montant: $montant, moisIndex: $moisIndex) {
      taux
      interet
      total
    }
  }
`;

/** Simulation d'un prêt hypothétique. */
export const SIMULER_PRET = gql`
  query SimulerPret($cycleId: ID!, $montant: Decimal!, $moisPret: Int!) {
    simulerPret(cycleId: $cycleId, montant: $montant, moisPret: $moisPret) {
      moisDeDette
      majoration
      total
    }
  }
`;
