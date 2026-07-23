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
import { Login } from './features/login/login';
import { Profil } from './features/profil/profil';
import { authGuard } from './core/auth/auth-guard';

export const routes: Routes = [
  { path: 'login', component: Login },
  { path: '', redirectTo: 'tableau-de-bord', pathMatch: 'full' },
  { path: 'tableau-de-bord', component: Dashboard, canActivate: [authGuard] },
  { path: 'saisie', component: Saisie, canActivate: [authGuard] },
  { path: 'prets', component: Prets, canActivate: [authGuard] },
  { path: 'membres', component: Membres, canActivate: [authGuard] },
  { path: 'recapitulatif', component: Recap, canActivate: [authGuard] },
  { path: 'historique', component: Historique, canActivate: [authGuard] },
  { path: 'simulation', component: Simulation, canActivate: [authGuard] },
  { path: 'aide', component: Aide, canActivate: [authGuard] },
  { path: 'parametres', component: Parametres, canActivate: [authGuard] },
  { path: 'profil', component: Profil, canActivate: [authGuard] },
  { path: 'membre/:id', component: FicheMembrePage, canActivate: [authGuard] },
];
