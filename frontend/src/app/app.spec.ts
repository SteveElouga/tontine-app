import { TestBed } from '@angular/core/testing';

import { App } from './app';
import { providersDeTest } from '../testing/providers';

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ imports: [App], providers: providersDeTest() });
  });

  afterEach(() => localStorage.clear());

  it('se crée (non connectée : pas de barre latérale)', () => {
    expect(TestBed.createComponent(App).componentInstance).toBeTruthy();
  });
});
