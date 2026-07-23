import { moisCalendaire } from './caisse.models';

describe('moisCalendaire', () => {
  it('ouverture en septembre (9) : position 1 → septembre (9)', () => {
    expect(moisCalendaire(1, 9)).toBe(9);
  });

  it('ouverture en septembre : position 9 → mai (5)', () => {
    expect(moisCalendaire(9, 9)).toBe(5);
  });

  it('ouverture en septembre : position 12 → août (8)', () => {
    expect(moisCalendaire(12, 9)).toBe(8);
  });

  it('ouverture en janvier (1) : position 1 → janvier (1)', () => {
    expect(moisCalendaire(1, 1)).toBe(1);
  });

  it('ouverture en octobre (10) : position 4 → janvier (1)', () => {
    expect(moisCalendaire(4, 10)).toBe(1);
  });

  it('reste toujours dans 1..12', () => {
    for (let debut = 1; debut <= 12; debut++) {
      for (let pos = 1; pos <= 12; pos++) {
        const m = moisCalendaire(pos, debut);
        expect(m).toBeGreaterThanOrEqual(1);
        expect(m).toBeLessThanOrEqual(12);
      }
    }
  });
});
