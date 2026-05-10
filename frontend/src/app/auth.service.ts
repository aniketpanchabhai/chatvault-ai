// ============================================================
// auth.service.ts - Clerk Authentication Service
// ============================================================
// This service wraps Clerk's JS SDK to provide:
//   - Sign in / sign up via Clerk's hosted modal
//   - Sign out
//   - Getting the current JWT token to send to the backend
//   - Observing auth state changes
//
// HOW CLERK WORKS IN ANGULAR:
//   Clerk is framework-agnostic vanilla JS. We load the SDK
//   via CDN in index.html, then wrap it here in a service
//   that Angular components can inject.
// ============================================================

import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

declare const Clerk: any;  // Clerk is loaded from CDN in index.html

export interface ClerkUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  emailAddress: string;
  imageUrl: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {

  private _user = new BehaviorSubject<ClerkUser | null>(null);
  private _isLoaded = new BehaviorSubject<boolean>(false);

  user$ = this._user.asObservable();
  isLoaded$ = this._isLoaded.asObservable();

  constructor(private ngZone: NgZone) {}

  /**
   * Call this once in AppComponent.ngOnInit()
   * Waits for Clerk to finish loading, then sets up auth state.
   */
  async initialize(): Promise<void> {
    // Wait for Clerk to be available on window
    await this.waitForClerk();

    // Load Clerk with your publishable key
    await Clerk.load();

    // Set initial state
    this.ngZone.run(() => {
      this._isLoaded.next(true);
      this.syncUser();
    });

    // Listen for auth state changes (sign in / sign out)
    Clerk.addListener(({ user }: any) => {
      this.ngZone.run(() => {
        this.syncUser();
      });
    });
  }

  private syncUser(): void {
    const clerkUser = Clerk.user;
    if (clerkUser) {
      this._user.next({
        id: clerkUser.id,
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
        emailAddress: clerkUser.primaryEmailAddress?.emailAddress || '',
        imageUrl: clerkUser.imageUrl,
      });
    } else {
      this._user.next(null);
    }
  }

  private waitForClerk(): Promise<void> {
    return new Promise((resolve) => {
      if (typeof Clerk !== 'undefined') {
        resolve();
        return;
      }
      // Poll until Clerk script has loaded
      const interval = setInterval(() => {
        if (typeof Clerk !== 'undefined') {
          clearInterval(interval);
          resolve();
        }
      }, 100);
    });
  }

  /**
   * Open Clerk's sign-in modal.
   * After sign-in, Clerk fires the listener and syncUser() runs.
   */
  openSignIn(): void {
    Clerk.redirectToSignIn({
      afterSignInUrl: window.location.href,
      afterSignUpUrl: window.location.href,
    });
  }

  /**
   * Sign out the current user.
   */
  async signOut(): Promise<void> {
    await Clerk.signOut();
    this.ngZone.run(() => {
      this._user.next(null);
    });
  }

  /**
   * Get the current session JWT to send as Authorization: Bearer <token>
   * Returns null if user is not signed in.
   */
  async getToken(): Promise<string | null> {
    try {
      if (!Clerk.session) return null;
      return await Clerk.session.getToken();
    } catch {
      return null;
    }
  }

  get currentUser(): ClerkUser | null {
    return this._user.getValue();
  }

  get isSignedIn(): boolean {
    return this._user.getValue() !== null;
  }
}
