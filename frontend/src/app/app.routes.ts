import { Routes } from '@angular/router';
import { Dashboard } from './features/dashboard/dashboard';
import { Saisie } from './features/saisie/saisie';
import { Recap } from './features/recap/recap';
import { Membres } from './features/membres/membres';
import { Prets } from './features/prets/prets';
import { Historique } from './features/historique/historique';
import { Simulation } from './features/simulation/simulation';
import { Aide } from './features/aide/aide';
import { Parametres } from './features/parametres/parametres';
import { FicheMembrePage } from './features/fiche-membre/fiche-membre';

export const routes: Routes = [
  { path: '', redirectTo: 'tableau-de-bord', pathMatch: 'full' },
  { path: 'tableau-de-bord', component: Dashboard },
  { path: 'saisie', component: Saisie },
  { path: 'prets', component: Prets },
  { path: 'membres', component: Membres },
  { path: 'recapitulatif', component: Recap },
  { path: 'historique', component: Historique },
  { path: 'simulation', component: Simulation },
  { path: 'aide', component: Aide },
  { path: 'parametres', component: Parametres },
  { path: 'membre/:id', component: FicheMembrePage },
];
