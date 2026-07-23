import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputNumber } from 'primeng/inputnumber';
import { Select } from 'primeng/select';

import { CaisseService } from '../../core/graphql/caisse.service';
import { CycleStore } from '../../core/state/cycle-store';
import { MOIS, SimEpargne, SimPret } from '../../core/domain/caisse.models';

@Component({
  selector: 'app-simulation',
  imports: [FormsModule, InputNumber, Select],
  templateUrl: './simulation.html',
  styleUrl: './simulation.scss',
})
export class Simulation {
  private readonly caisse = inject(CaisseService);
  private readonly cycleStore = inject(CycleStore);

  protected readonly MOIS = MOIS;
  protected readonly optMoisDepot = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((mi) => ({
    label: MOIS[mi],
    value: mi,
  }));
  private readonly moisTous = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  // Volet Épargne
  protected readonly epMontant = signal<number | null>(null);
  protected readonly epMois = signal(1);
  protected readonly epResultat = signal<SimEpargne | null>(null);

  // Volet Prêt
  protected readonly prMontant = signal<number | null>(null);
  protected readonly prMois = signal(1);
  protected readonly prRemb = signal(12);
  protected readonly prResultat = signal<SimPret | null>(null);

  /** Mois de remboursement possibles (après le mois du prêt). */
  protected optMoisRemb(): { label: string; value: number }[] {
    return this.moisTous
      .filter((mi) => mi > this.prMois())
      .map((mi) => ({ label: MOIS[mi], value: mi }));
  }

  calculerEpargne(): void {
    const m = this.epMontant();
    if (!m || m <= 0) {
      this.epResultat.set(null);
      return;
    }
    this.caisse.simulerEpargne(this.cycleStore.cycleId(), m, this.epMois()).subscribe({
      next: (r) => this.epResultat.set(r),
      error: () => this.epResultat.set(null),
    });
  }

  calculerPret(): void {
    const m = this.prMontant();
    if (!m || m <= 0) {
      this.prResultat.set(null);
      return;
    }
    if (this.prRemb() <= this.prMois()) {
      this.prRemb.set(this.prMois() + 1);
    }
    this.caisse.simulerPret(this.cycleStore.cycleId(), m, this.prMois(), this.prRemb()).subscribe({
      next: (r) => this.prResultat.set(r),
      error: () => this.prResultat.set(null),
    });
  }

  protected pct(taux: string): string {
    return `${Math.round(Number(taux) * 100)} %`;
  }
  protected fmt(v: string | number): string {
    return Number(v).toLocaleString('fr-FR');
  }
}
