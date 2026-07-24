import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService, ConfirmationService } from 'primeng/api';
import { InputNumber } from 'primeng/inputnumber';
import { Button } from 'primeng/button';
import { Select } from 'primeng/select';
import { Tooltip } from 'primeng/tooltip';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { CaisseService } from '../../core/graphql/caisse.service';
import { CycleStore } from '../../core/state/cycle-store';
import { LangStore } from '../../core/state/lang-store';
import { UndoStore } from '../../core/state/undo-store';
import { MoisNomPipe, moisAnnee } from '../../core/i18n/mois.pipe';
import { Membre, Pret, PartRepartition, RemboursementDetail } from '../../core/domain/caisse.models';

@Component({
  selector: 'app-prets',
  imports: [FormsModule, InputNumber, Button, Select, TranslatePipe, MoisNomPipe, Tooltip, ConfirmDialog],
  providers: [ConfirmationService],
  templateUrl: './prets.html',
  styleUrl: './prets.scss',
})
export class Prets implements OnInit {
  private readonly caisse = inject(CaisseService);
  private readonly cycleStore = inject(CycleStore);
  private readonly toast = inject(MessageService);
  private readonly i18n = inject(TranslateService);
  private readonly lang = inject(LangStore);
  private readonly undo = inject(UndoStore);
  private readonly confirmation = inject(ConfirmationService);

  protected readonly optMoisPret = computed(() => {
    this.lang.langue();
    const debut = this.cycleStore.moisDebut();
    const duree = this.cycleStore.dureeDepot();
    const annee = this.cycleStore.anneeDebut();
    // Un prêt se contracte pendant les mois de dépôt : positions 1..duree_depot.
    return Array.from({ length: duree }, (_, i) => i + 1).map((mi) => ({
      label: moisAnnee(this.i18n, mi, debut, annee),
      value: mi,
    }));
  });

  /** Nom calendaire du dernier mois de remboursement (délai) — pour l'astuce. */
  protected readonly delaiNom = computed(() => {
    this.lang.langue();
    return moisAnnee(
      this.i18n,
      this.cycleStore.moisDelai(),
      this.cycleStore.moisDebut(),
      this.cycleStore.anneeDebut(),
    );
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

  // Édition d'un prêt en ligne (id du prêt en cours)
  protected readonly editionDe = signal<string | null>(null);
  protected readonly eMontant = signal<number | null>(null);
  protected readonly eMois = signal<number | null>(null);

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
        this.undo.proposer(
          this.i18n.instant('prets.undoPret', { nom: p.nom, montant: this.format(p.montant) }),
          () => this.retirerPret(p.id),
        );
      },
      error: () => this.erreur(this.i18n.instant('prets.errAjout')),
    });
  }

  /** Supprime un prêt après confirmation (popup) — correction à tout moment. */
  supprimer(p: Pret): void {
    this.confirmation.confirm({
      header: this.i18n.instant('prets.confirmTitre'),
      message: this.i18n.instant('prets.confirmSuppr', {
        nom: p.nom,
        montant: this.format(p.montant),
      }),
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.i18n.instant('commun.supprimer'),
      rejectLabel: this.i18n.instant('commun.retour'),
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-text',
      accept: () => this.executerSuppression(p),
    });
  }

  private executerSuppression(p: Pret): void {
    this.caisse.supprimerPret(p.id).subscribe({
      next: () => {
        this.prets.update((l) => l.filter((x) => x.id !== p.id));
        this.toast.add({
          severity: 'success',
          summary: this.i18n.instant('prets.okSuppr'),
          detail: p.nom,
          life: 2000,
        });
      },
      error: () => this.erreur(this.i18n.instant('prets.errSuppr')),
    });
  }

  /** Retire un prêt de la liste (utilisé par l'annulation d'un ajout). */
  private retirerPret(pretId: string): void {
    this.caisse.supprimerPret(pretId).subscribe({
      next: () => this.prets.update((l) => l.filter((x) => x.id !== pretId)),
      error: () => this.erreur(this.i18n.instant('prets.errSuppr')),
    });
  }

  /** Supprime un remboursement après confirmation (popup) ; met le prêt à jour. */
  supprimerUnRemboursement(remb: RemboursementDetail): void {
    this.confirmation.confirm({
      header: this.i18n.instant('prets.confirmTitreRemb'),
      message: this.i18n.instant('prets.confirmSupprRemb', { montant: this.format(remb.montant) }),
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.i18n.instant('commun.supprimer'),
      rejectLabel: this.i18n.instant('commun.retour'),
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-text',
      accept: () => this.annulerRemboursement(remb.id),
    });
  }

  /** Supprime un remboursement (sans confirmation) ; sert aussi à l'annulation. */
  private annulerRemboursement(remboursementId: string): void {
    this.caisse.supprimerRemboursement(remboursementId).subscribe({
      next: () => this.rechargerListe(),
      error: () => this.erreur(this.i18n.instant('prets.errRemb')),
    });
  }

  /** Recharge la liste des prêts depuis le serveur — source de vérité après une écriture. */
  private rechargerListe(): void {
    this.caisse.pretsCycle(this.cycleStore.cycleId()).subscribe({
      next: (p) => this.prets.set(p),
      error: () => undefined,
    });
  }

  ouvrirRemboursement(p: Pret): void {
    // 1re réunion après le prêt, sans dépasser le délai de remboursement (septembre).
    this.rembReunion.set(Math.min(p.moisPret + 1, this.cycleStore.moisDelai()));
    this.rembMontant.set(null);
    this.remboursementDe.set(p.id);
  }

  /** Ouvre le formulaire d'édition d'un prêt (montant + mois). */
  ouvrirEdition(p: Pret): void {
    this.remboursementDe.set(null);
    this.eMontant.set(this.n(p.montant));
    this.eMois.set(p.moisPret);
    this.editionDe.set(p.id);
  }

  annulerEdition(): void {
    this.editionDe.set(null);
  }

  validerEdition(p: Pret): void {
    const montant = this.eMontant();
    const mois = this.eMois();
    if (!montant || montant <= 0 || mois == null) {
      this.erreur(this.i18n.instant('prets.errChamps'));
      return;
    }
    const avantMontant = this.n(p.montant);
    const avantMois = p.moisPret;
    this.caisse.modifierPret(p.id, montant, mois).subscribe({
      next: (maj) => {
        this.prets.update((l) => l.map((x) => (x.id === maj.id ? maj : x)));
        this.editionDe.set(null);
        this.undo.proposer(this.i18n.instant('prets.undoModif', { nom: maj.nom }), () =>
          this.restaurerPret(maj.id, avantMontant, avantMois),
        );
      },
      error: () => this.erreur(this.i18n.instant('prets.errModif')),
    });
  }

  private restaurerPret(pretId: string, montant: number, moisPret: number): void {
    this.caisse.modifierPret(pretId, montant, moisPret).subscribe({
      next: (maj) => this.prets.update((l) => l.map((x) => (x.id === maj.id ? maj : x))),
      error: () => this.erreur(this.i18n.instant('prets.errModif')),
    });
  }

  annuler(): void {
    this.remboursementDe.set(null);
  }

  /**
   * Réunions possibles pour un remboursement : du mois suivant le prêt jusqu'au délai (septembre).
   * L'intérêt s'arrête à la clôture (juin) ; de juillet à septembre restent ouverts au remboursement.
   */
  optReunions(moisPret: number): { label: string; value: number }[] {
    const debut = this.cycleStore.moisDebut();
    const annee = this.cycleStore.anneeDebut();
    const fin = this.cycleStore.moisDelai();
    const r: { label: string; value: number }[] = [];
    for (let mi = moisPret + 1; mi <= fin; mi++) {
      r.push({ label: moisAnnee(this.i18n, mi, debut, annee), value: mi });
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
    const cycleId = this.cycleStore.cycleId();
    const memberId = p.membreId;
    this.caisse.ajouterRemboursement(p.id, mois, montant).subscribe({
      next: (res) => {
        this.remplacerPrets(res.prets);
        this.remboursementDe.set(null);
        this.notifierRepartition(res.repartition);
        this.undo.proposer(
          this.i18n.instant('prets.undoRemb', { nom: p.nom, montant: this.format(montant) }),
          () => this.annulerRepartition(cycleId, memberId, res.repartition),
        );
      },
      error: () => this.erreur(this.i18n.instant('prets.errRemb')),
    });
  }

  /** Remplace dans la liste les prêts renvoyés à jour (par id). */
  private remplacerPrets(majs: Pret[]): void {
    const parId = new Map(majs.map((m) => [m.id, m]));
    this.prets.update((l) => l.map((x) => parId.get(x.id) ?? x));
  }

  /** Toast récapitulatif quand un versement a été réparti (autre prêt / épargne). */
  private notifierRepartition(repartition: PartRepartition[]): void {
    const reparti = repartition.length > 1 || repartition.some((r) => r.type === 'epargne');
    if (!reparti) return;
    const parts = repartition.map((r) =>
      r.type === 'epargne'
        ? this.i18n.instant('prets.partEpargne', { montant: this.format(this.n(r.montant)) })
        : this.i18n.instant('prets.partPret', {
            mois: this.moisNomDe(r.moisCible),
            montant: this.format(this.n(r.montant)),
          }),
    );
    this.toast.add({
      severity: 'info',
      summary: this.i18n.instant('prets.repartiTitre'),
      detail: parts.join(' · '),
      life: 6000,
    });
  }

  /** Annule un versement réparti : inverse chaque part (remboursements supprimés, épargne retirée). */
  private annulerRepartition(
    cycleId: string,
    memberId: string,
    repartition: PartRepartition[],
  ): void {
    for (const r of repartition) {
      if (r.type === 'pret' && r.remboursementId) {
        this.caisse.supprimerRemboursement(r.remboursementId).subscribe({
          next: (maj) => this.prets.update((l) => l.map((x) => (x.id === maj.id ? maj : x))),
          error: () => this.erreur(this.i18n.instant('prets.errRemb')),
        });
      } else if (r.type === 'epargne') {
        this.caisse.retirerEpargne(cycleId, memberId, r.moisCible, this.n(r.montant)).subscribe({
          next: () => undefined,
          error: () => undefined,
        });
      }
    }
  }

  private moisNomDe(pos: number): string {
    return moisAnnee(this.i18n, pos, this.cycleStore.moisDebut(), this.cycleStore.anneeDebut());
  }

  private erreur(detail: string): void {
    this.toast.add({ severity: 'error', summary: this.i18n.instant('prets.errTitre'), detail });
  }

  protected readonly n = (v: string | number): number => Number(v);
  protected readonly format = (v: string | number): string => Number(v).toLocaleString('fr-FR');
}
