import { TestBed } from '@angular/core/testing';

import { Parametres } from './parametres';
import { providersDeTest } from '../../../testing/providers';

interface ParametresInterne {
  optMoisDebut: () => unknown[];
}

describe('Parametres', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ imports: [Parametres], providers: providersDeTest() });
  });

  it('se crée', () => {
    expect(TestBed.createComponent(Parametres).componentInstance).toBeTruthy();
  });

  it('propose les 12 mois d’ouverture', () => {
    const c = TestBed.createComponent(Parametres).componentInstance as unknown as ParametresInterne;
    expect(c.optMoisDebut().length).toBe(12);
  });
});
