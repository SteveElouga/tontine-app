import { TestBed } from '@angular/core/testing';

import { Login } from './login';
import { providersDeTest } from '../../../testing/providers';

describe('Login', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ imports: [Login], providers: providersDeTest() });
  });

  it('se crée', () => {
    expect(TestBed.createComponent(Login).componentInstance).toBeTruthy();
  });
});
