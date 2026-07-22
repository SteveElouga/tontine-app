import { Routes } from '@angular/router';
import { Dashboard } from './features/dashboard/dashboard';
import { Saisie } from './features/saisie/saisie';
import { Recap } from './features/recap/recap';

export const routes: Routes = [
  { path: '', redirectTo: 'tableau-de-bord', pathMatch: 'full' },
  { path: 'tableau-de-bord', component: Dashboard },
  { path: 'saisie', component: Saisie },
  { path: 'recapitulatif', component: Recap },
];
