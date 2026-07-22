import { Routes } from '@angular/router';
import { Saisie } from './features/saisie/saisie';
import { Recap } from './features/recap/recap';

export const routes: Routes = [
  { path: '', redirectTo: 'saisie', pathMatch: 'full' },
  { path: 'saisie', component: Saisie },
  { path: 'recapitulatif', component: Recap },
];
