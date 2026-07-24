import { TestBed } from '@angular/core/testing';

import { Aide } from './aide';
import { providersDeTest } from '../../../testing/providers';

interface AideInterne {
  infos: () => { taux: number; tauxMajo: number; tauxPremier: number };
}

describe('Aide', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ imports: [Aide], providers: providersDeTest() });
  });

  it('se crée', () => {
    expect(TestBed.createComponent(Aide).componentInstance).toBeTruthy();
  });

  it('donne les valeurs par défaut du cycle pilote', () => {
    const c = TestBed.createComponent(Aide).componentInstance as unknown as AideInterne;
    const i = c.infos();
    expect(i.taux).toBe(5);
    expect(i.tauxMajo).toBe(5);
    expect(i.tauxPremier).toBe(45); // 5 % × 9 mois de dépôt
  });
});
