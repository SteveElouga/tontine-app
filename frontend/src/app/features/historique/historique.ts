import { Component, OnInit, inject, signal } from '@angular/core';

import { CaisseService } from '../../core/graphql/caisse.service';
import { CycleStore } from '../../core/state/cycle-store';
import { MOIS, Operation } from '../../core/domain/caisse.models';

@Component({
  selector: 'app-historique',
  imports: [],
  templateUrl: './historique.html',
  styleUrl: './historique.scss',
})
export class Historique implements OnInit {
  private readonly caisse = inject(CaisseService);
  private readonly cycleStore = inject(CycleStore);

  protected readonly MOIS = MOIS;
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
    return new Date(iso).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }
}
