// ============================================================
// app.config.ts - Angular Application Configuration
// ============================================================

import { ApplicationConfig } from '@angular/core';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideMarkdown } from 'ngx-markdown';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { AuthInterceptor } from './auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    // HttpClient with interceptor support (for auth token injection)
    provideHttpClient(withInterceptorsFromDi()),
    provideMarkdown(),
    // Register the Clerk JWT interceptor
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true,
    },
  ]
};
