import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { InputNumber } from 'primeng/inputnumber';
import { Select } from 'primeng/select';
import { Button } from 'primeng/button';
import { SelectButton } from 'primeng/selectbutton';

import { CaisseService } from '../../core/graphql/caisse.service';
import { CycleStore } from '../../core/state/cycle-store';
import { ThemeStore } from '../../core/state/theme-store';
import { LangStore, Langue } from '../../core/state/lang-store';
import { MOIS, ParametresCycle } from '../../core/domain/caisse.models';

@Component({
  selector: 'app-parametres',
  imports: [FormsModule, InputNumber, Select, Button, SelectButton],
  templateUrl: './parametres.html',
  styleUrl: './parametres.scss',
})
export class Parametres implements OnInit {
  private readonly caisse = inject(CaisseService);
  private readonly cycleStore = inject(CycleStore);
  private readonly toast = inject(MessageService);
  protected readonly theme = inject(ThemeStore);
  protected readonly lang = inject(LangStore);

  protected readonly optLangue: { label: string; value: Langue }[] = [
    { label: 'Français', value: 'fr' },
    { label: 'English', value: 'en' },
  ];

  protected readonly chargement = signal(true);
  protected readonly params = signal<ParametresCycle | null>(null);

  // La caisse
  protected readonly caisseNom = signal('');

  protected readonly optTheme = [
    { label: 'Clair', value: false },
    { label: 'Sombre', value: true },
  ];

  // Règles du cycle
  protected readonly libelle = signal('');
  protected readonly tauxEpargnePct = signal(5);
  protected readonly tauxMajoPct = signal(5);
  protected readonly dureeDepot = signal(9);
  protected readonly moisDelai = signal(12);

  // Nouvelle année
  protected readonly nouveauLibelle = signal('');

  protected readonly optDelai = [
    { label: MOIS[10], value: 10 },
    { label: MOIS[11], value: 11 },
    { label: MOIS[12], value: 12 },
  ];

  ngOnInit(): void {
    this.charger();
  }

  private charger(): void {
    this.chargement.set(true);
    this.caisse.parametresCycle(this.cycleStore.cycleId()).subscribe({
      next: (p) => {
        this.params.set(p);
        this.caisseNom.set(p.caisseNom);
        this.libelle.set(p.libelle);
        this.tauxEpargnePct.set(Math.round(Number(p.tauxEpargne) * 100));
        this.tauxMajoPct.set(Math.round(Number(p.tauxMajoration) * 100));
        this.dureeDepot.set(p.dureeDepot);
        this.moisDelai.set(p.moisDelai);
        this.chargement.set(false);
      },
      error: () => {
        this.chargement.set(false);
        this.erreur('Chargement impossible.');
      },
    });
  }

  enregistrer(): void {
    const lib = this.libelle().trim();
    if (!lib) {
      this.erreur('Le nom du cycle est obligatoire.');
      return;
    }
    this.caisse
      .modifierCycle(
        this.cycleStore.cycleId(),
        lib,
        this.dureeDepot(),
        this.moisDelai(),
        this.tauxEpargnePct() / 100,
        this.tauxMajoPct() / 100,
      )
      .subscribe({
        next: (p) => {
          this.params.set(p);
          this.cycleStore.charger();
          this.toast.add({
            severity: 'success',
            summary: 'Règles enregistrées',
            detail: p.libelle,
            life: 2500,
          });
        },
        error: () => this.erreur('Enregistrement impossible.'),
      });
  }

  creer(): void {
    const lib = this.nouveauLibelle().trim();
    if (!lib) {
      this.erreur('Donnez un nom à la nouvelle année.');
      return;
    }
    this.caisse.creerCycle(this.cycleStore.cycleId(), lib).subscribe({
      next: (p) => {
        this.nouveauLibelle.set('');
        this.cycleStore.charger();
        this.toast.add({
          severity: 'success',
          summary: 'Nouvelle année créée',
          detail: `${p.libelle}. Sélectionnez-la à gauche pour la remplir.`,
          life: 3500,
        });
      },
      error: () => this.erreur("Impossible de créer l'année (ce nom existe peut-être déjà)."),
    });
  }

  cloturer(): void {
    if (!confirm("Clôturer l'année en cours ? Elle sera marquée comme terminée.")) return;
    this.caisse.cloturerCycle(this.cycleStore.cycleId()).subscribe({
      next: (p) => {
        this.params.set(p);
        this.cycleStore.charger();
        this.toast.add({
          severity: 'success',
          summary: 'Année clôturée',
          detail: p.libelle,
          life: 2500,
        });
      },
      error: () => this.erreur('Clôture impossible.'),
    });
  }

  enregistrerCaisse(): void {
    const nom = this.caisseNom().trim();
    if (!nom) {
      this.erreur('Le nom de la caisse est obligatoire.');
      return;
    }
    this.caisse.renommerCaisse(this.cycleStore.cycleId(), nom).subscribe({
      next: (p) => {
        this.params.set(p);
        this.cycleStore.charger();
        this.toast.add({
          severity: 'success',
          summary: 'Caisse renommée',
          detail: p.caisseNom,
          life: 2500,
        });
      },
      error: () => this.erreur('Enregistrement impossible.'),
    });
  }

  private erreur(detail: string): void {
    this.toast.add({ severity: 'error', summary: 'Action impossible', detail });
  }
}
