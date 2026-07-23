import { Injectable } from '@angular/core';
import { TranslateLoader } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';

/**
 * Traductions intégrées (aucun fichier à charger). On les complète progressivement,
 * écran par écran. Étape 1 : le menu et le sélecteur de Paramètres.
 */
export const FR = {
  nav: {
    tableau: 'Tableau de bord',
    saisie: 'Saisie des dépôts',
    prets: 'Prêts',
    recap: 'Récapitulatif',
    membres: 'Membres',
    simulation: 'Simulation',
    historique: 'Historique',
    aide: 'Aide',
    parametres: 'Paramètres',
    profil: 'Profil',
    cycle: 'Cycle',
  },
  param: {
    langue: 'Langue',
  },
};

export const EN = {
  nav: {
    tableau: 'Dashboard',
    saisie: 'Deposits',
    prets: 'Loans',
    recap: 'Summary',
    membres: 'Members',
    simulation: 'Simulation',
    historique: 'History',
    aide: 'Help',
    parametres: 'Settings',
    profil: 'Profile',
    cycle: 'Cycle',
  },
  param: {
    langue: 'Language',
  },
};

/** Chargeur qui renvoie le dictionnaire intégré, sans requête réseau. */
@Injectable()
export class InlineTranslateLoader implements TranslateLoader {
  getTranslation(lang: string): Observable<any> {
    return of(lang === 'en' ? EN : FR);
  }
}
