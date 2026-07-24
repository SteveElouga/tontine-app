import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { InputNumber } from 'primeng/inputnumber';
import { Button } from 'primeng/button';
import { Select } from 'primeng/select';
import { Tooltip } from 'primeng/tooltip';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { CaisseService } from '../../core/graphql/caisse.service';
import { CycleStore } from '../../core/state/cycle-store';
import { LangStore } from '../../core/state/lang-store';
import { MoisNomPipe } from '../../core/i18n/mois.pipe';
import { Membre, Pret, moisCalendaire } from '../../core/domain/caisse.models';

@Component({
  selector: 'app-prets',
  imports: [FormsModule, InputNumber, Button, Select, TranslatePipe, MoisNomPipe, Tooltip],
  templateUrl: './prets.html',
  styleUrl: './prets.scss',
})
export class Prets implements OnInit {
  private readonly caisse = inject(CaisseService);
  private readonly cycleStore = inject(CycleStore);
  private readonly toast = inject(MessageService);
  private readonly i18n = inject(TranslateService);
  private readonly lang = inject(LangStore);

  protected readonly optMoisPret = computed(() => {
    this.lang.langue();
    const debut = this.cycleStore.moisDebut();
    return [1, 2, 3, 4, 5, 6, 7, 8, 9].map((mi) => ({
      label: this.i18n.instant('mois.' + moisCalendaire(mi, debut)),
      value: mi,
    }));
  });

  protected readonly prets = signal<Pret[]>([]);
  protected readonly membres = signal<Membre[]>([]);
  protected readonly optMembres = computed(() =>
    this.membres().map((m) => ({ label: m.nom, value: m.id })),
  );
  protected readonly chargement = signal(true);

  // Formulaire « nouveau prêt »
  protected readonly nMembre = signal('');
  protected readonly nMontant = signal<number | null>(null);
  protected readonly nMois = signal<number | null>(null); // conservé d'un prêt au suivant

  // Remboursement partiel en ligne (id du prêt en cours)
  protected readonly remboursementDe = signal<string | null>(null);
  protected readonly rembReunion = signal<number | null>(null);
  protected readonly rembMontant = signal<number | null>(null);

  protected readonly totalPrete = computed(() =>
    this.prets().reduce((s, p) => s + Number(p.montant), 0),
  );
  protected readonly totalRembourse = computed(() =>
    this.prets().reduce((s, p) => s + Number(p.totalRembourse), 0),
  );
  protected readonly totalSolde = computed(() =>
    this.prets().reduce((s, p) => s + Number(p.solde), 0),
  );

  ngOnInit(): void {
    this.caisse.membres(this.cycleStore.cycleId()).subscribe({
      next: (m) => this.membres.set(m),
      error: () => this.erreur(this.i18n.instant('prets.errChargeMembres')),
    });
    this.caisse.pretsCycle(this.cycleStore.cycleId()).subscribe({
      next: (p) => {
        this.prets.set(p);
        this.chargement.set(false);
      },
      error: () => {
        this.chargement.set(false);
        this.erreur(this.i18n.instant('prets.errChargePrets'));
      },
    });
  }

  ajouter(): void {
    const membreId = this.nMembre();
    const montant = this.nMontant();
    const mois = this.nMois();
    if (!membreId || !montant || montant <= 0 || mois == null) {
      this.erreur(this.i18n.instant('prets.errChamps'));
      return;
    }
    this.caisse.ajouterPret(this.cycleStore.cycleId(), membreId, montant, mois).subscribe({
      next: (p) => {
        this.prets.update((l) => [...l, p].sort((a, b) => a.nom.localeCompare(b.nom, 'fr')));
        this.nMembre.set('');
        this.nMontant.set(null);
        this.toast.add({
          severity: 'success',
          summary: this.i18n.instant('prets.okPret'),
          detail: `${p.nom}, ${this.format(p.montant)} FCFA`,
          life: 2500,
        });
      },
      error: () => this.erreur(this.i18n.instant('prets.errAjout')),
    });
  }

  ouvrirRemboursement(p: Pret): void {
    this.rembReunion.set(Math.min(p.moisPret + 1, 10)); // 1re réunion après le prêt (max juin)
    this.rembMontant.set(null);
    this.remboursementDe.set(p.id);
  }

  annuler(): void {
    this.remboursementDe.set(null);
  }

  /** Réunions possibles pour un remboursement : du mois suivant le prêt jusqu'à juin (10). */
  optReunions(moisPret: number): { label: string; value: number }[] {
    const debut = this.cycleStore.moisDebut();
    const r: { label: string; value: number }[] = [];
    for (let mi = moisPret + 1; mi <= 10; mi++) {
      r.push({ label: this.i18n.instant('mois.' + moisCalendaire(mi, debut)), value: mi });
    }
    return r;
  }

  valider(p: Pret): void {
    const mois = this.rembReunion();
    const montant = this.rembMontant();
    if (mois == null || !montant || montant <= 0) {
      this.erreur(this.i18n.instant('prets.errRembChamps'));
      return;
    }
    this.caisse.ajouterRemboursement(p.id, mois, montant).subscribe({
      next: (maj) => {
        this.prets.update((l) => l.map((x) => (x.id === maj.id ? maj : x)));
        this.remboursementDe.set(null);
        this.toast.add({
          severity: 'success',
          summary: this.i18n.instant('prets.okRemb'),
          detail: `${maj.nom}, ${this.format(montant)} FCFA`,
          life: 2500,
        });
      },
      error: () => this.erreur(this.i18n.instant('prets.errRemb')),
    });
  }

  private erreur(detail: string): void {
    this.toast.add({ severity: 'error', summary: this.i18n.instant('prets.errTitre'), detail });
  }

  protected readonly n = (v: string | number): number => Number(v);
  protected readonly format = (v: string | number): string => Number(v).toLocaleString('fr-FR');
}
