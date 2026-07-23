import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideAppInitializer,
  isDevMode,
  inject,
} from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { ThemeStore } from './core/state/theme-store';
import { provideServiceWorker } from '@angular/service-worker';
import { provideHttpClient } from '@angular/common/http';
import { provideApollo } from 'apollo-angular';
import { HttpLink } from 'apollo-angular/http';
import { InMemoryCache } from '@apollo/client';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import { MessageService } from 'primeng/api';
import Aura from '@primeng/themes/aura';
import { definePreset } from '@primeng/themes';

// Thème PrimeNG aligné sur notre bleu sobre (Aura est en émeraude par défaut).
const TontinePreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#eef4fb',
      100: '#d5e4f5',
      200: '#aecbea',
      300: '#82addd',
      400: '#4d87c9',
      500: '#1d5fa5',
      600: '#1a5490',
      700: '#164674',
      800: '#123a5f',
      900: '#0f3050',
      950: '#0a2036',
    },
  },
});

// URL de l'API GraphQL (backend Django). En dev : le serveur local.
// À déplacer dans un fichier d'environnement avant la production.
const GRAPHQL_URI = 'http://localhost:8000/graphql/';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideAppInitializer(() => {
      inject(ThemeStore);
    }),
    provideAnimationsAsync(),
    providePrimeNG({ theme: { preset: TontinePreset, options: { darkModeSelector: '.app-dark' } } }),
    MessageService,
    provideRouter(routes),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
    provideHttpClient(),
    provideApollo(() => {
      const httpLink = inject(HttpLink);

      return {
        link: httpLink.create({
          uri: GRAPHQL_URI,
        }),
        cache: new InMemoryCache(),
      };
    }),
  ],
};
