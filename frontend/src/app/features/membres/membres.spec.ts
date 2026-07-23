import { TestBed } from '@angular/core/testing';

import { Membres } from './membres';
import { providersDeTest } from '../../../testing/providers';

describe('Membres', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ imports: [Membres], providers: providersDeTest() });
  });

  it('se crée', () => {
    expect(TestBed.createComponent(Membres).componentInstance).toBeTruthy();
  });
});
