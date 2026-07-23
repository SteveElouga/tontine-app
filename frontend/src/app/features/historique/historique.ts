import { Component, OnInit, inject, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { CaisseService } from '../../core/graphql/caisse.service';
import { CycleStore } from '../../core/state/cycle-store';
import { LangStore } from '../../core/state/lang-store';
import { Operation } from '../../core/domain/caisse.models';

@Component({
  selector: 'app-historique',
  imports: [TranslatePipe],
  templateUrl: './historique.html',
  styleUrl: './historique.scss',
})
export class Historique implements OnInit {
  private readonly caisse = inject(CaisseService);
  private readonly cycleStore = inject(CycleStore);
  private readonly lang = inject(LangStore);

  protected readonly operations = signal<Operation[]>([]);
  protected readonly chargement = signal(true);

  ngOnInit(): void {
    this.caisse.historique(this.cycleStore.cycleId()).subscribe({
      next: (ops) => {
        this.operations.set(ops);
        this.chargement.set(false);
      },
      error: () => this.chargement.set(false),
    });
  }

  protected fmt(v: string | number): string {
    return Number(v).toLocaleString('fr-FR');
  }

  /** ISO → « 12 févr. 2026 ». */
  protected date(iso: string): string {
    const locale = this.lang.langue() === 'en' ? 'en-GB' : 'fr-FR';
    return new Date(iso).toLocaleDateString(locale, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }
}
