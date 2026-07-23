import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

import { MoisNomPipe } from './mois.pipe';
import { CycleStore } from '../state/cycle-store';

/** Construit le pipe avec un TranslateService qui renvoie la clé, et un moisDebut donné. */
function pipeAvec(moisDebut: number): MoisNomPipe {
  TestBed.configureTestingModule({
    providers: [
      MoisNomPipe,
      { provide: TranslateService, useValue: { instant: (cle: string) => cle } },
      { provide: CycleStore, useValue: { moisDebut: signal(moisDebut) } },
    ],
  });
  return TestBed.inject(MoisNomPipe);
}

describe('MoisNomPipe', () => {
  it('convertit la position en clé de mois calendaire (ouverture septembre)', () => {
    const pipe = pipeAvec(9);
    expect(pipe.transform(1)).toBe('mois.9'); // septembre
    expect(pipe.transform(9)).toBe('mois.5'); // mai
  });

  it('suit le mois d’ouverture', () => {
    const pipe = pipeAvec(1); // janvier
    expect(pipe.transform(1)).toBe('mois.1');
  });

  it('renvoie une chaîne vide pour une position absente', () => {
    const pipe = pipeAvec(9);
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform(undefined)).toBe('');
  });
});
