import { TestBed } from '@angular/core/testing';

import { Profil } from './profil';
import { providersDeTest } from '../../../testing/providers';

describe('Profil', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ imports: [Profil], providers: providersDeTest() });
  });

  it('se crée', () => {
    expect(TestBed.createComponent(Profil).componentInstance).toBeTruthy();
  });
});
