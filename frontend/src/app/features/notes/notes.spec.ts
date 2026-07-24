import { TestBed } from '@angular/core/testing';

import { Notes } from './notes';
import { providersDeTest } from '../../../testing/providers';

describe('Notes', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ imports: [Notes], providers: providersDeTest() });
  });

  it('se crée', () => {
    expect(TestBed.createComponent(Notes).componentInstance).toBeTruthy();
  });
});
