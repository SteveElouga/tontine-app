import { Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-aide',
  imports: [TranslatePipe],
  templateUrl: './aide.html',
  styleUrl: './aide.scss',
})
export class Aide {
  protected readonly ecrans = [
    { icon: 'pi pi-home', nomKey: 'nav.tableau', descKey: 'aide.e1' },
    { icon: 'pi pi-pencil', nomKey: 'nav.saisie', descKey: 'aide.e2' },
    { icon: 'pi pi-money-bill', nomKey: 'nav.prets', descKey: 'aide.e3' },
    { icon: 'pi pi-list', nomKey: 'nav.recap', descKey: 'aide.e4' },
    { icon: 'pi pi-users', nomKey: 'nav.membres', descKey: 'aide.e5' },
    { icon: 'pi pi-calculator', nomKey: 'nav.simulation', descKey: 'aide.e6' },
    { icon: 'pi pi-history', nomKey: 'nav.historique', descKey: 'aide.e7' },
  ];
}
