import { TestBed } from '@angular/core/testing';

import { Simulation } from './simulation';
import { providersDeTest } from '../../../testing/providers';

interface SimulationInterne {
  pct: (taux: string) => string;
}

describe('Simulation', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ imports: [Simulation], providers: providersDeTest() });
  });

  it('se crée', () => {
    expect(TestBed.createComponent(Simulation).componentInstance).toBeTruthy();
  });

  it('formate un taux en pourcentage', () => {
    const c = TestBed.createComponent(Simulation).componentInstance as unknown as SimulationInterne;
    expect(c.pct('0.45')).toBe('45 %');
    expect(c.pct('0.05')).toBe('5 %');
  });
});
