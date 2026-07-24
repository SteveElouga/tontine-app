import { Injectable, signal } from '@angular/core';

/** Une action récemment effectuée, annulable pendant quelques secondes. */
interface ActionAnnulable {
  label: string; // texte déjà localisé décrivant ce qui a été fait
  undo: () => void;
}

/**
 * Barre d'annulation « snackbar » partagée : après une action (dépôt, prêt,
 * remboursement, suppression…), on propose de l'annuler pendant ~6 s.
 */
@Injectable({ providedIn: 'root' })
export class UndoStore {
  private timer: ReturnType<typeof setTimeout> | null = null;
  readonly action = signal<ActionAnnulable | null>(null);

  /** Propose d'annuler la dernière action pendant ~6 secondes. */
  proposer(label: string, undo: () => void): void {
    this.stopTimer();
    this.action.set({ label, undo });
    this.timer = setTimeout(() => this.ignorer(), 6000);
  }

  /** L'utilisateur clique « Annuler » : exécute l'annulation et referme la barre. */
  annuler(): void {
    const a = this.action();
    this.ignorer();
    a?.undo();
  }

  /** Referme la barre sans annuler (temps écoulé ou fermeture manuelle). */
  ignorer(): void {
    this.stopTimer();
    this.action.set(null);
  }

  private stopTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
