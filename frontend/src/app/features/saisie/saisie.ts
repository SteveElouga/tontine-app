import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { InputNumber } from 'primeng/inputnumber';
import { Button } from 'primeng/button';

import { CaisseService } from '../../core/graphql/caisse.service';
import { MOIS } from '../../core/domain/caisse.models';

// Cycle pilote (dev). À remplacer par une vraie sélection de cycle plus tard.
const CYCLE_ID = '8e7323b1-1277-47dd-b358-ee0354d52b3d';
const NB_MOIS = 9;

interface Ligne {
  id: string;
  nom: string;
  montant: number | null;
  enregistre: boolean;
}

@Component({
  selector: 'app-saisie',
  imports: [FormsModule, InputNumber, Button],
  templateUrl: './saisie.html',
  styleUrl: './saisie.scss',
})
export class Saisie implements OnInit {
  private readonly caisse = inject(CaisseService);
  private readonly toast = inject(MessageService);

  protected readonly vue = signal<'mois' | 'membre'>('mois');

  protected readonly moisIndex = signal(2); // Octobre
  protected readonly lignes = signal<Ligne[]>([]);
  protected readonly chargement = signal(true);

  protected readonly moisNom = computed(() => MOIS[this.moisIndex()]);
  protected readonly taux = computed(() => 5 * (NB_MOIS - this.moisIndex() + 1));
  protected readonly total = computed(() =>
    this.lignes().reduce((s, l) => s + (l.montant ?? 0), 0),
  );
  protected readonly nbEnregistres = computed(() =>
    this.lignes().filter((l) => l.enregistre).length,
  );

  ngOnInit(): void {
    this.caisse.recapCycle(CYCLE_ID).subscribe({
      next: (membres) => {
        this.lignes.set(
          membres.map((m) => ({ id: m.id, nom: m.nom, montant: null, enregistre: false })),
        );
        this.chargement.set(false);
      },
      error: () => {
        this.chargement.set(false);
        this.toast.add({
          severity: 'error',
          summary: 'Chargement impossible',
          detail: 'Vérifie que le serveur Django est démarré.',
        });
      },
    });
  }

  moisPrecedent(): void {
    if (this.moisIndex() > 1) {
      this.moisIndex.update((m) => m - 1);
      this.reinitialiser();
    }
  }

  moisSuivant(): void {
    if (this.moisIndex() < NB_MOIS) {
      this.moisIndex.update((m) => m + 1);
      this.reinitialiser();
    }
  }

  setMontant(ligne: Ligne, valeur: number | null): void {
    this.lignes.update((ls) =>
      ls.map((l) => (l.id === ligne.id ? { ...l, montant: valeur } : l)),
    );
  }

  enregistrer(ligne: Ligne): void {
    const courant = this.lignes().find((l) => l.id === ligne.id);
    if (!courant || courant.montant == null) return;
    this.caisse.ajouterDepot(CYCLE_ID, courant.id, this.moisIndex(), courant.montant).subscribe({
      next: () => {
        this.lignes.update((ls) =>
          ls.map((l) => (l.id === courant.id ? { ...l, enregistre: true } : l)),
        );
        this.toast.add({
          severity: 'success',
          summary: 'Dépôt enregistré',
          detail: `${courant.nom} — ${this.moisNom()}`,
          life: 2500,
        });
      },
      error: () =>
        this.toast.add({
          severity: 'error',
          summary: 'Enregistrement impossible',
          detail: 'Réessaie.',
        }),
    });
  }

  terminer(): void {
    this.toast.add({
      severity: 'info',
      summary: `Saisie de ${this.moisNom()} terminée`,
      detail: `${this.nbEnregistres()} membre(s) · total ${this.format(this.total())} FCFA`,
    });
  }

  private reinitialiser(): void {
    this.lignes.update((ls) => ls.map((l) => ({ ...l, montant: null, enregistre: false })));
  }

  protected readonly format = (n: number): string => n.toLocaleString('fr-FR');
}
