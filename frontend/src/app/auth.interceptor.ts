// ============================================================
// auth.interceptor.ts - HTTP Interceptor for Clerk JWT
// ============================================================
// Automatically attaches the Clerk JWT to every outgoing
// HTTP request as: Authorization: Bearer <token>
//
// This means you don't need to manually add the token in
// every component - just inject HttpClient and it works.
// ============================================================

import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
} from '@angular/common/http';
import { Observable, from, switchMap } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  constructor(private authService: AuthService) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Only attach token to backend API calls
    if (!request.url.includes('localhost:3000') && !request.url.includes('/api/')) {
      return next.handle(request);
    }

    // Get the token asynchronously, then clone the request with the auth header
    return from(this.authService.getToken()).pipe(
      switchMap(token => {
        if (token) {
          const authRequest = request.clone({
            setHeaders: {
              Authorization: `Bearer ${token}`
            }
          });
          return next.handle(authRequest);
        }
        // No token (user not signed in) - send request without auth
        // The backend will return 401 which the component can handle
        return next.handle(request);
      })
    );
  }
}
