import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { InputNumber } from 'primeng/inputnumber';
import { Button } from 'primeng/button';
import { Select } from 'primeng/select';

import { CaisseService } from '../../core/graphql/caisse.service';
import { CycleStore } from '../../core/state/cycle-store';
import { MOIS, Membre, Pret } from '../../core/domain/caisse.models';

@Component({
  selector: 'app-prets',
  imports: [FormsModule, InputNumber, Button, Select],
  templateUrl: './prets.html',
  styleUrl: './prets.scss',
})
export class Prets implements OnInit {
  private readonly caisse = inject(CaisseService);
  private readonly cycleStore = inject(CycleStore);
  private readonly toast = inject(MessageService);

  protected readonly MOIS = MOIS;
  private readonly moisRembTous = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  protected readonly optMoisPret = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((mi) => ({
    label: MOIS[mi],
    value: mi,
  }));

  protected readonly prets = signal<Pret[]>([]);
  protected readonly membres = signal<Membre[]>([]);
  protected readonly optMembres = computed(() =>
    this.membres().map((m) => ({ label: m.nom, value: m.id })),
  );
  protected readonly chargement = signal(true);

  // Formulaire « nouveau prêt »
  protected readonly nMembre = signal('');
  protected readonly nMontant = signal<number | null>(null);
  protected readonly nMois = signal<number | null>(null); // choisi consciemment ; conservé d'un prêt au suivant

  // Remboursement en ligne (id du prêt en cours d'édition)
  protected readonly remboursementDe = signal<string | null>(null);
  protected readonly moisRemb = signal(11); // Juillet par défaut

  protected readonly totalPrete = computed(() =>
    this.prets().reduce((s, p) => s + Number(p.montant), 0),
  );
  protected readonly totalMajoration = computed(() =>
    this.prets().reduce((s, p) => s + Number(p.majoration), 0),
  );
  protected readonly totalRembourser = computed(() =>
    this.prets().reduce((s, p) => s + Number(p.totalARembourser), 0),
  );

  ngOnInit(): void {
    this.caisse.membres(this.cycleStore.cycleId()).subscribe({
      next: (m) => this.membres.set(m),
      error: () => this.erreur('Chargement des membres impossible.'),
    });
    this.caisse.pretsCycle(this.cycleStore.cycleId()).subscribe({
      next: (p) => {
        this.prets.set(p);
        this.chargement.set(false);
      },
      error: () => {
        this.chargement.set(false);
        this.erreur('Chargement des prêts impossible.');
      },
    });
  }

  ajouter(): void {
    const membreId = this.nMembre();
    const montant = this.nMontant();
    const mois = this.nMois();
    if (!membreId || !montant || montant <= 0 || mois == null) {
      this.erreur('Choisis un membre, un montant et un mois.');
      return;
    }
    this.caisse.ajouterPret(this.cycleStore.cycleId(), membreId, montant, mois).subscribe({
      next: (p) => {
        this.prets.update((l) => [...l, p].sort((a, b) => a.nom.localeCompare(b.nom, 'fr')));
        this.nMembre.set('');
        this.nMontant.set(null);
        this.toast.add({
          severity: 'success',
          summary: 'Prêt enregistré',
          detail: `${p.nom} — ${this.format(p.montant)} FCFA`,
          life: 2500,
        });
      },
      error: () => this.erreur('Enregistrement impossible.'),
    });
  }

  ouvrirRemboursement(p: Pret): void {
    this.moisRemb.set(Math.max(p.moisPret, 11));
    this.remboursementDe.set(p.id);
  }

  annuler(): void {
    this.remboursementDe.set(null);
  }

  /** Mois de remboursement possibles pour un prêt (≥ son mois du prêt). */
  optMoisRemb(moisPret: number): { label: string; value: number }[] {
    return this.moisRembTous
      .filter((mi) => mi >= moisPret)
      .map((mi) => ({ label: MOIS[mi], value: mi }));
  }

  valider(p: Pret): void {
    const mois = this.moisRemb();
    if (mois < p.moisPret) {
      this.erreur('Le remboursement ne peut pas précéder le prêt.');
      return;
    }
    this.caisse.rembourserPret(p.id, mois).subscribe({
      next: (maj) => {
        this.prets.update((l) => l.map((x) => (x.id === maj.id ? maj : x)));
        this.remboursementDe.set(null);
        this.toast.add({
          severity: 'success',
          summary: 'Remboursement enregistré',
          detail: `${maj.nom} — ${MOIS[mois]}`,
          life: 2500,
        });
      },
      error: () => this.erreur('Enregistrement du remboursement impossible.'),
    });
  }

  private erreur(detail: string): void {
    this.toast.add({ severity: 'error', summary: 'Action impossible', detail });
  }

  protected readonly format = (v: string | number): string => Number(v).toLocaleString('fr-FR');
}
