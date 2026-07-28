import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import { CaisseService } from '../../core/graphql/caisse.service';
import { CycleStore } from '../../core/state/cycle-store';
import { MoisNomPipe } from '../../core/i18n/mois.pipe';
import { FicheMembre } from '../../core/domain/caisse.models';

@Component({
  selector: 'app-fiche-membre',
  imports: [RouterLink, TranslatePipe, MoisNomPipe],
  templateUrl: './fiche-membre.html',
  styleUrl: './fiche-membre.scss',
})
export class FicheMembrePage implements OnInit {
  private readonly caisse = inject(CaisseService);
  private readonly cycleStore = inject(CycleStore);
  private readonly route = inject(ActivatedRoute);

  protected readonly fiche = signal<FicheMembre | null>(null);
  protected readonly chargement = signal(true);

  /** Cycle réellement ouvert — le sous-titre le nommait en dur (« 2025-2026 »). */
  protected readonly cycleLibelle = computed(() => this.cycleStore.libelle());

  /** Initiales pour l'avatar (« Membre 03 » → « M0 »). */
  protected readonly initiales = computed(() => {
    const parts = (this.fiche()?.nom ?? '').trim().split(/\s+/);
    return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.chargement.set(false);
      return;
    }
    this.caisse.ficheMembre(this.cycleStore.cycleId(), id).subscribe({
      next: (f) => {
        this.fiche.set(f);
        this.chargement.set(false);
      },
      error: () => this.chargement.set(false),
    });
  }

  /** Taux serveur « 0.400 » → affichage « 40 % ». */
  protected pct(taux: string): string {
    return `${Math.round(Number(taux) * 100)} %`;
  }

  /** Montant serveur « 135000 » → affichage « 135 000 ». */
  protected fmt(v: string | number): string {
    return Number(v).toLocaleString('fr-FR', { maximumFractionDigits: 1 });
  }

  protected n(v: string | number): number {
    return Number(v);
  }
}
