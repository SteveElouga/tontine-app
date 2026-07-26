import { Component, OnInit, inject, signal } from '@angular/core';
import { Button } from 'primeng/button';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { CaisseService } from '../../core/graphql/caisse.service';
import { CycleStore } from '../../core/state/cycle-store';
import { Membre } from '../../core/domain/caisse.models';

@Component({
  selector: 'app-membres',
  imports: [Button, TranslatePipe, ConfirmDialog],
  providers: [ConfirmationService],
  templateUrl: './membres.html',
  styleUrl: './membres.scss',
})
export class Membres implements OnInit {
  private readonly caisse = inject(CaisseService);
  private readonly cycleStore = inject(CycleStore);
  private readonly toast = inject(MessageService);
  private readonly i18n = inject(TranslateService);
  private readonly confirmation = inject(ConfirmationService);

  protected readonly membres = signal<Membre[]>([]);
  protected readonly chargement = signal(true);

  ngOnInit(): void {
    this.charger();
  }

  ajouter(nom: string, telephone: string): void {
    const n = nom.trim();
    if (!n) return;
    if (this.dejaUtilise(n)) {
      this.confirmerDoublon(n, () => this.executerAjout(n, telephone.trim()));
      return;
    }
    this.executerAjout(n, telephone.trim());
  }

  private executerAjout(nom: string, telephone: string): void {
    this.caisse.ajouterMembre(this.cycleStore.cycleId(), nom, telephone).subscribe({
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
    if (this.dejaUtilise(n, m.id)) {
      this.confirmerDoublon(n, () => this.executerRenommage(m, n));
      return;
    }
    this.executerRenommage(m, n);
  }

  private executerRenommage(m: Membre, n: string): void {
    this.caisse.renommerMembre(m.id, n).subscribe({
      next: () => {
        this.membres.update((l) => l.map((x) => (x.id === m.id ? { ...x, nom: n } : x)));
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

  /** Popup (pas de confirm() natif) avant d'enregistrer un nom déjà porté par un autre membre. */
  private confirmerDoublon(nom: string, accept: () => void): void {
    this.confirmation.confirm({
      header: this.i18n.instant('membres.confirmDoublonTitre'),
      message: this.i18n.instant('membres.confirmDoublon', { nom }),
      icon: 'pi pi-info-circle',
      acceptLabel: this.i18n.instant('membres.enregistrerQuandMeme'),
      rejectLabel: this.i18n.instant('commun.annuler'),
      rejectButtonStyleClass: 'p-button-text',
      accept,
    });
  }

  retirer(m: Membre): void {
    this.confirmation.confirm({
      header: this.i18n.instant('membres.confirmRetirerTitre'),
      message: this.i18n.instant('membres.confirmRetirer', { nom: m.nom }),
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.i18n.instant('commun.supprimer'),
      rejectLabel: this.i18n.instant('commun.retour'),
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-text',
      accept: () => this.executerRetrait(m),
    });
  }

  private executerRetrait(m: Membre): void {
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

  /** Vrai si un autre membre porte déjà ce nom (insensible à la casse/aux espaces). Ne bloque
   * pas : deux personnes peuvent réellement s'appeler pareil, mais on demande confirmation
   * pour éviter les doublons de saisie (ex. la même personne ajoutée deux fois). */
  private dejaUtilise(nom: string, exclureId?: string): boolean {
    const cible = nom.trim().toLowerCase().replace(/\s+/g, ' ');
    return this.membres().some(
      (m) => m.id !== exclureId && m.nom.trim().toLowerCase().replace(/\s+/g, ' ') === cible,
    );
  }

  private erreur(): void {
    this.toast.add({
      severity: 'error',
      summary: this.i18n.instant('membres.errTitre'),
      detail: this.i18n.instant('membres.reessayez'),
    });
  }
}
