import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';

import { TourService } from './tour-service';

describe('TourService', () => {
  let service: TourService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [{ provide: TranslateService, useValue: { instant: (cle: string) => cle } }],
    });
    service = TestBed.inject(TourService);
  });

  afterEach(() => localStorage.clear());

  it('demarrerSiPremiereFois lance la visite une seule fois et mémorise le passage', () => {
    // On neutralise le vrai lancement (Driver.js manipule le DOM) pour tester la logique.
    const spy = vi.spyOn(service, 'demarrer').mockImplementation(() => undefined);

    service.demarrerSiPremiereFois();
    expect(spy).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('tontine.tourVu')).toBe('1');

    service.demarrerSiPremiereFois();
    expect(spy).toHaveBeenCalledTimes(1); // déjà vu : pas rejoué
  });

  it('demarrerSiPremiereFois ne relance pas si déjà vu', () => {
    localStorage.setItem('tontine.tourVu', '1');
    const spy = vi.spyOn(service, 'demarrer').mockImplementation(() => undefined);

    service.demarrerSiPremiereFois();
    expect(spy).not.toHaveBeenCalled();
  });
});
