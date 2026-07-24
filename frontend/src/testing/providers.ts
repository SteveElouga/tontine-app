import { EnvironmentProviders, importProvidersFrom, Provider } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { ApolloTestingModule } from 'apollo-angular/testing';
import { provideTranslateService, provideTranslateLoader } from '@ngx-translate/core';
import { MessageService } from 'primeng/api';

import { InlineTranslateLoader } from '../app/core/i18n/translations';

/**
 * Fournisseurs communs pour tester un composant d'écran : API GraphQL et HTTP mockées,
 * i18n intégré, animations, router et toasts PrimeNG.
 */
export function providersDeTest(): (Provider | EnvironmentProviders)[] {
  return [
    provideRouter([]),
    provideHttpClient(),
    provideHttpClientTesting(),
    provideAnimationsAsync(),
    MessageService,
    provideTranslateService({
      fallbackLang: 'fr',
      loader: provideTranslateLoader(InlineTranslateLoader),
    }),
    importProvidersFrom(ApolloTestingModule),
  ];
}
