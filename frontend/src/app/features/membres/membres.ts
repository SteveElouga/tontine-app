import { Component, OnInit, inject, signal } from '@angular/core';
import { Button } from 'primeng/button';
import { MessageService } from 'primeng/api';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { CaisseService } from '../../core/graphql/caisse.service';
import { CycleStore } from '../../core/state/cycle-store';
import { Membre } from '../../core/domain/caisse.models';

@Component({
  selector: 'app-membres',
  imports: [Button, TranslatePipe],
  templateUrl: './membres.html',
  styleUrl: './membres.scss',
})
export class Membres implements OnInit {
  private readonly caisse = inject(CaisseService);
  private readonly cycleStore = inject(CycleStore);
  private readonly toast = inject(MessageService);
  private readonly i18n = inject(TranslateService);

  protected readonly membres = signal<Membre[]>([]);
  protected readonly chargement = signal(true);

  ngOnInit(): void {
    this.charger();
  }

  ajouter(nom: string, telephone: string): void {
    const n = nom.trim();
    if (!n) return;
    this.caisse.ajouterMembre(this.cycleStore.cycleId(), n, telephone.trim()).subscribe({
      next: (m) => {
        this.membres.update((l) => [...l, m]);
        this.toast.add({
          severity: 'success',
          summary: this.i18n.instant('membres.okAjoute'),
          detail: m.nom,
          life: 2500,
        });
      },
      error: () => this.erreur(),
    });
  }

  renommer(m: Membre, nom: string): void {
    const n = nom.trim();
    if (!n || n === m.nom) return;
    this.caisse.renommerMembre(m.id, n).subscribe({
      next: () => {
        m.nom = n;
        this.toast.add({
          severity: 'success',
          summary: this.i18n.instant('membres.okNom'),
          detail: n,
          life: 2000,
        });
      },
      error: () => this.erreur(),
    });
  }

  retirer(m: Membre): void {
    if (!confirm(this.i18n.instant('membres.confirmRetirer', { nom: m.nom }))) return;
    this.caisse.retirerMembre(m.id).subscribe({
      next: () => {
        this.membres.update((l) => l.filter((x) => x.id !== m.id));
        this.toast.add({
          severity: 'success',
          summary: this.i18n.instant('membres.okRetire'),
          detail: m.nom,
          life: 2500,
        });
      },
      error: () => this.erreur(),
    });
  }

  private charger(): void {
    this.chargement.set(true);
    this.caisse.membres(this.cycleStore.cycleId()).subscribe({
      next: (rows) => {
        this.membres.set(rows);
        this.chargement.set(false);
      },
      error: () => {
        this.chargement.set(false);
        this.erreur();
      },
    });
  }

  private erreur(): void {
    this.toast.add({
      severity: 'error',
      summary: this.i18n.instant('membres.errTitre'),
      detail: this.i18n.instant('membres.reessayez'),
    });
  }
}
