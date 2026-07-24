import { Component, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { UndoStore } from '../../core/state/undo-store';

/** Barre « snackbar » d'annulation, affichée en bas d'écran après une action. */
@Component({
  selector: 'app-undo-banner',
  imports: [TranslatePipe],
  templateUrl: './undo-banner.html',
  styleUrl: './undo-banner.scss',
})
export class UndoBanner {
  protected readonly undo = inject(UndoStore);
}
